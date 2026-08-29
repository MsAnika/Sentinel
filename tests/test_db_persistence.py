import os
import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.scenarios.asset_generator import AssetGenerator

client = TestClient(app)


def _read_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def test_model_upload_is_queryable_back_from_the_database(tmp_path):
    model_path = tmp_path / "db_test_model.onnx"
    AssetGenerator.generate_detector_onnx(str(model_path), is_backdoored=False)

    upload_res = client.post(
        "/api/model/upload",
        files={"file": ("db_test_model.onnx", _read_bytes(str(model_path)), "application/octet-stream")},
    )
    assert upload_res.status_code == 200
    model_id = upload_res.json()["model_id"]

    get_res = client.get(f"/api/model/{model_id}")
    assert get_res.status_code == 200
    stored = get_res.json()
    assert stored["model_id"] == model_id
    assert stored["sha256_digest"] == upload_res.json()["sha256_digest"]

    list_res = client.get("/api/model/list")
    assert list_res.status_code == 200
    assert any(m["model_id"] == model_id for m in list_res.json()["models"])


def test_dataset_analysis_is_persisted_and_retrievable():
    assets = AssetGenerator.ensure_test_assets("test_assets")

    res = client.post(
        "/api/dataset/analyze-profile",
        json={"dataset_id": f"db_test_ds_{uuid.uuid4().hex[:8]}", "format_type": "COCO", "coco_path": assets["coco_path"]},
    )
    assert res.status_code == 200
    analysis_id = res.json()["analysis_id"]

    get_res = client.get(f"/api/dataset/history/{analysis_id}")
    assert get_res.status_code == 200
    assert get_res.json()["analysis_id"] == analysis_id

    history_res = client.get("/api/dataset/history")
    assert any(a["analysis_id"] == analysis_id for a in history_res.json()["analyses"])


def test_inference_record_persisted_and_verifiable_purely_by_id():
    assets = AssetGenerator.ensure_test_assets("test_assets")

    exec_res = client.post(
        "/api/inference/execute",
        json={
            "image_path": "test_assets/images/tactical_sample_002.jpg",
            "model_path": assets["clean_model_path"],
            "config": {"confidence_threshold": 0.25},
        },
    )
    assert exec_res.status_code == 200
    record_id = exec_res.json()["record_id"]

    get_res = client.get(f"/api/inference/record/{record_id}")
    assert get_res.status_code == 200
    assert get_res.json()["record_id"] == record_id

    # Verify using ONLY the record_id -- the server pulls the authoritative
    # copy from the database rather than trusting a client-resent JSON body.
    verify_res = client.post(f"/api/inference/record/{record_id}/verify")
    assert verify_res.status_code == 200
    assert verify_res.json()["is_valid"] is True


def test_assurance_report_generation_is_persisted_and_retrievable():
    res = client.post("/api/report/generate", json={"findings": [], "contributor_summaries": []})
    assert res.status_code == 200
    report_id = res.json()["report_id"]

    get_res = client.get(f"/api/report/{report_id}")
    assert get_res.status_code == 200
    assert get_res.json()["report_id"] == report_id


def test_scenario_run_report_lands_in_the_same_reports_table():
    res = client.post("/api/scenarios/run/A")
    assert res.status_code == 200
    report_id = res.json()["report"]["report_id"]

    get_res = client.get(f"/api/report/{report_id}")
    assert get_res.status_code == 200
    assert get_res.json()["report_id"] == report_id
