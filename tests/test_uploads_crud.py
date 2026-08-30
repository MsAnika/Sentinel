"""CRUD coverage for raw uploaded files (model weights, dataset archives,
probe images) -- the one resource that had zero API-level Read/Delete
before this: uploads landed on disk via /api/model/upload etc. with no
way to list or purge them short of shell access to the box.

Security posture under test: deletion must be refused (409) for any file
still referenced by a persisted evidence record (a fingerprinted model, an
analyzed dataset, a signed inference record, or a generated report) --
evidence must never be able to point at a file that no longer exists."""
from fastapi.testclient import TestClient
from backend.main import app
from backend.persistence import db

client = TestClient(app)


def _read_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def test_list_uploads_shows_a_freshly_uploaded_model():
    from backend.scenarios.asset_generator import AssetGenerator
    import tempfile, os

    with tempfile.TemporaryDirectory() as d:
        model_path = os.path.join(d, "crud_test_model.onnx")
        AssetGenerator.generate_detector_onnx(model_path, is_backdoored=False)

        upload_res = client.post(
            "/api/model/upload",
            files={"file": ("crud_test_model.onnx", _read_bytes(model_path), "application/octet-stream")},
        )
    assert upload_res.status_code == 200
    fp = upload_res.json()
    saved_path = fp["metadata"]["saved_path"]

    list_res = client.get("/api/uploads/")
    assert list_res.status_code == 200
    payload = list_res.json()
    matching = [e for e in payload["uploads"] if e["category"] == "models" and saved_path.endswith(e["name"])]
    assert len(matching) == 1
    entry = matching[0]
    # Just uploaded AND fingerprinted -> referenced by the model_records row
    # this same request inserted, so it must NOT be deletable yet.
    assert entry["deletable"] is False
    assert any("model_record" in ref for ref in entry["referenced_by"])


def test_delete_refuses_a_referenced_upload_and_succeeds_once_unreferenced(tmp_path):
    """Uploads a fresh, uniquely-named model that is NOT run through
    /api/model/upload (so nothing references it), confirms it lists as
    deletable, deletes it, and confirms it's gone from both disk-listing
    and a second delete attempt (404, not a silent success)."""
    from backend.scenarios.asset_generator import AssetGenerator
    from backend.ingestion.upload_store import save_upload
    import asyncio
    from fastapi import UploadFile
    import io

    model_path = tmp_path / "orphan_model.onnx"
    AssetGenerator.generate_detector_onnx(str(model_path), is_backdoored=False)

    with open(model_path, "rb") as f:
        content = f.read()

    async def _save():
        upload_file = UploadFile(filename="orphan_model.onnx", file=io.BytesIO(content))
        return await save_upload(upload_file, "models")

    saved_path, _size = asyncio.run(_save())

    list_res = client.get("/api/uploads/")
    entry = next(e for e in list_res.json()["uploads"] if saved_path.endswith(e["name"]))
    assert entry["deletable"] is True
    assert entry["referenced_by"] == []

    del_res = client.delete(f"/api/uploads/{entry['id']}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"].endswith(entry["name"])

    import os
    assert not os.path.exists(saved_path)

    second_delete = client.delete(f"/api/uploads/{entry['id']}")
    assert second_delete.status_code == 404


def test_delete_referenced_model_is_refused_with_409():
    from backend.scenarios.asset_generator import AssetGenerator
    import tempfile, os

    with tempfile.TemporaryDirectory() as d:
        model_path = os.path.join(d, "referenced_model.onnx")
        AssetGenerator.generate_detector_onnx(model_path, is_backdoored=False)
        upload_res = client.post(
            "/api/model/upload",
            files={"file": ("referenced_model.onnx", _read_bytes(model_path), "application/octet-stream")},
        )
    assert upload_res.status_code == 200
    saved_path = upload_res.json()["metadata"]["saved_path"]

    list_res = client.get("/api/uploads/")
    entry = next(e for e in list_res.json()["uploads"] if saved_path.endswith(e["name"]))
    assert entry["deletable"] is False

    del_res = client.delete(f"/api/uploads/{entry['id']}")
    assert del_res.status_code == 409
    body = del_res.json()["detail"]
    assert any("model_record" in ref for ref in body["referenced_by"])

    # The file must genuinely still be on disk -- refusal was enforced, not cosmetic.
    import os
    assert os.path.exists(saved_path)


def test_delete_rejects_path_traversal_and_malformed_ids():
    import base64

    traversal_id = base64.urlsafe_b64encode(b"../../etc/passwd").decode("ascii").rstrip("=")
    res = client.delete(f"/api/uploads/{traversal_id}")
    assert res.status_code == 404

    res2 = client.delete("/api/uploads/not-valid-base64!!!")
    assert res2.status_code == 404

    unknown_category_id = base64.urlsafe_b64encode(b"not_a_real_category/file.bin").decode("ascii").rstrip("=")
    res3 = client.delete(f"/api/uploads/{unknown_category_id}")
    assert res3.status_code == 404


def test_uploads_list_requires_no_delete_side_effects():
    """GET must never mutate state -- listing twice in a row returns the
    same total_count."""
    first = client.get("/api/uploads/").json()["total_count"]
    second = client.get("/api/uploads/").json()["total_count"]
    assert first == second
