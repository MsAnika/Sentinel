"""API-level (HTTP, via FastAPI TestClient) coverage for the capabilities
added on top of the original audit: replay/reordering and audit-tamper
scenarios (E, F), HTML/PDF report export, NO_REFERENCE digest status, and
the HASH_ONLY model access tier. These hit the real routes, not just the
underlying Python functions, so a route-level regression (bad Body(...)
wiring, wrong status code, wrong media type) is caught."""
import os
from fastapi.testclient import TestClient
from backend.api.auth import API_KEY_ENV_VAR
from backend.main import app

client = TestClient(app)


def test_scenario_list_includes_e_and_f():
    res = client.get("/api/scenarios/list")
    assert res.status_code == 200
    ids = {s["id"] for s in res.json()}
    assert {"A", "B", "C", "D", "E", "F"}.issubset(ids)


def test_scenario_e_replay_via_api():
    res = client.post("/api/scenarios/run/E")
    assert res.status_code == 200
    payload = res.json()
    assert payload["scenario_id"] == "SCENARIO-E"
    assert payload["overall_disposition"] == "QUARANTINE"


def test_scenario_f_audit_tamper_via_api():
    res = client.post("/api/scenarios/run/F")
    assert res.status_code == 200
    payload = res.json()
    assert payload["scenario_id"] == "SCENARIO-F"
    assert payload["post_tamper_valid"] is False


def test_unknown_scenario_id_still_404s():
    res = client.post("/api/scenarios/run/Z")
    assert res.status_code == 404


def test_report_html_and_pdf_export_via_api():
    run_res = client.post("/api/scenarios/run/B")
    assert run_res.status_code == 200
    report_id = run_res.json()["report"]["report_id"]

    html_res = client.get(f"/api/report/{report_id}/export.html")
    assert html_res.status_code == 200
    assert html_res.headers["content-type"].startswith("text/html")
    assert report_id in html_res.text

    pdf_res = client.get(f"/api/report/{report_id}/export.pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content[:5] == b"%PDF-"


def test_report_export_404s_for_unknown_report_id():
    res = client.get("/api/report/REP-DOES-NOT-EXIST/export.html")
    assert res.status_code == 404


def test_verify_digest_no_reference_via_api(tmp_path):
    from backend.scenarios.asset_generator import AssetGenerator

    model_path = tmp_path / "no_ref_model.onnx"
    AssetGenerator.generate_detector_onnx(str(model_path), is_backdoored=False)

    with open(model_path, "rb") as f:
        upload_res = client.post(
            "/api/model/upload",
            files={"file": ("no_ref_model.onnx", f, "application/octet-stream")},
        )
    assert upload_res.status_code == 200
    fp = upload_res.json()

    verify_res = client.post(
        "/api/model/verify-digest",
        json={"supplied_fingerprint": fp, "expected_reference_digest": None},
    )
    assert verify_res.status_code == 200
    body = verify_res.json()
    assert body["status"] == "NO_REFERENCE"
    assert body["is_match"] is False
    assert body["finding"]["finding_type"] == "model_identity_unverifiable"


def test_api_key_gate_disabled_by_default():
    """Default MVP posture: no IntelX_API_KEY set means every route is
    reachable without any auth header -- matches the PRD's single
    air-gapped-workstation deployment model for the SIH prototype."""
    assert os.environ.get(API_KEY_ENV_VAR) is None
    res = client.get("/api/scenarios/list")
    assert res.status_code == 200


def test_api_key_gate_enforced_when_configured(monkeypatch):
    monkeypatch.setenv(API_KEY_ENV_VAR, "test-secret-key-123")

    no_header_res = client.get("/api/scenarios/list")
    assert no_header_res.status_code == 401

    wrong_key_res = client.get("/api/scenarios/list", headers={"X-API-Key": "wrong"})
    assert wrong_key_res.status_code == 401

    correct_key_res = client.get("/api/scenarios/list", headers={"X-API-Key": "test-secret-key-123"})
    assert correct_key_res.status_code == 200


def test_health_endpoint_never_requires_api_key(monkeypatch):
    monkeypatch.setenv(API_KEY_ENV_VAR, "test-secret-key-123")
    res = client.get("/health")
    assert res.status_code == 200


def test_rbac_analyst_key_cannot_delete_uploads_admin_key_can(monkeypatch):
    """RBAC hardening: an analyst-role key can read but not delete raw
    uploads; only an admin-role key can. Distinct, enforced roles -- not
    just a single shared secret."""
    from backend.api.auth import API_KEYS_ENV_VAR

    monkeypatch.delenv(API_KEY_ENV_VAR, raising=False)
    monkeypatch.setenv(API_KEYS_ENV_VAR, "test-analyst-key:analyst,test-admin-key:admin")

    list_res = client.get("/api/uploads/", headers={"X-API-Key": "test-analyst-key"})
    assert list_res.status_code == 200

    analyst_delete = client.delete("/api/uploads/bm90YV9yZWFsX2lk", headers={"X-API-Key": "test-analyst-key"})
    assert analyst_delete.status_code == 403

    admin_delete = client.delete("/api/uploads/bm90YV9yZWFsX2lk", headers={"X-API-Key": "test-admin-key"})
    assert admin_delete.status_code == 404  # correctly authorized, just doesn't exist

    no_key_res = client.get("/api/uploads/")
    assert no_key_res.status_code == 401


def test_rbac_legacy_single_key_still_works_as_admin(monkeypatch):
    """Backward compatibility: IntelX_API_KEY (singular, pre-RBAC) must
    still work exactly as before -- treated as one admin-role key."""
    from backend.api.auth import API_KEYS_ENV_VAR

    monkeypatch.delenv(API_KEYS_ENV_VAR, raising=False)
    monkeypatch.setenv(API_KEY_ENV_VAR, "legacy-secret")

    res = client.get("/api/uploads/", headers={"X-API-Key": "legacy-secret"})
    assert res.status_code == 200

    delete_res = client.delete("/api/uploads/bm90YV9yZWFsX2lk", headers={"X-API-Key": "legacy-secret"})
    assert delete_res.status_code == 404  # admin role granted, just doesn't exist


def test_hash_only_access_capabilities_via_api():
    res = client.post("/api/model/access-capabilities?access_level=HASH_ONLY")
    assert res.status_code == 200
    body = res.json()
    assert "file_sha256_digest" in body["supported_methods"]
    unavailable_methods = [m[0] for m in body["unavailable_methods"]]
    assert "input_output_inference_profiling" in unavailable_methods
    assert "layer_parameter_distribution_analysis" in unavailable_methods
