import io
from fastapi.testclient import TestClient
from backend.main import app
from backend.audit.audit_log import shared_ledger
from backend.scenarios.asset_generator import AssetGenerator

client = TestClient(app)


def _read_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def test_model_upload_actually_appends_to_the_shared_audit_ledger(tmp_path):
    model_path = tmp_path / "audit_wiring_model.onnx"
    AssetGenerator.generate_detector_onnx(str(model_path), is_backdoored=False)

    before_count = len(shared_ledger.entries)
    is_valid_before, _ = shared_ledger.verify_ledger_integrity()
    assert is_valid_before

    res = client.post(
        "/api/model/upload",
        files={"file": ("audit_wiring_model.onnx", _read_bytes(str(model_path)), "application/octet-stream")},
    )
    assert res.status_code == 200
    fp = res.json()
    assert fp["access_level"] == "WHITE_BOX"

    entries_res = client.get("/api/audit/entries")
    assert entries_res.status_code == 200
    payload = entries_res.json()
    assert payload["total_entries"] > before_count, "uploading a real model must record a real audit event"
    assert payload["is_chain_valid"] is True

    new_events = [e for e in payload["entries"][before_count:]]
    assert any(e["event"] == "MODEL_UPLOAD" for e in new_events)


def test_upload_access_level_is_read_from_the_multipart_form_not_ignored(tmp_path):
    model_path = tmp_path / "audit_wiring_model_2.onnx"
    AssetGenerator.generate_detector_onnx(str(model_path), is_backdoored=False)

    res = client.post(
        "/api/model/upload",
        files={"file": ("audit_wiring_model_2.onnx", _read_bytes(str(model_path)), "application/octet-stream")},
        data={"access_level": "BLACK_BOX"},
    )
    assert res.status_code == 200
    assert res.json()["access_level"] == "BLACK_BOX"


def test_parameter_analysis_respects_declared_black_box_access(tmp_path):
    model_path = tmp_path / "audit_wiring_model_3.onnx"
    AssetGenerator.generate_detector_onnx(str(model_path), is_backdoored=False)

    res = client.post(
        "/api/model/parameter-analysis",
        json={"model_path": str(model_path), "access_level": "BLACK_BOX"},
    )
    assert res.status_code == 200
    stats = res.json()["stats"]
    assert stats["status"] == "UNAVAILABLE"
    assert stats["reason"].startswith("Model access is restricted to BLACK_BOX")


def test_inference_execute_records_a_real_provenance_audit_event(tmp_path):
    assets = AssetGenerator.ensure_test_assets("test_assets")
    before_count = len(shared_ledger.entries)

    res = client.post(
        "/api/inference/execute",
        json={
            "image_path": "test_assets/images/tactical_sample_001.jpg",
            "model_path": assets["clean_model_path"],
            "config": {"confidence_threshold": 0.25},
        },
    )
    assert res.status_code == 200

    entries_res = client.get("/api/audit/entries")
    payload = entries_res.json()
    assert payload["total_entries"] > before_count
    new_events = payload["entries"][before_count:]
    assert any(e["event"] == "INFERENCE_PROVENANCE" for e in new_events)
