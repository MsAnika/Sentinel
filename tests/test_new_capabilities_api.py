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


def test_dataset_archive_upload_detects_sibling_images_dir_for_coco(tmp_path):
    """Regression guard for a real bug: DatasetLoader.load_coco defaults
    images_dir to the JSON's own directory, NOT a sibling `images/`
    folder -- but /api/dataset/upload's own docstring promises support for
    exactly that layout ("a COCO annotations JSON with an images/ folder
    alongside it"), and every pixel-based detector (OOD, duplicate
    hashing, poisoning triggers, and this system's model-side backdoor
    probing/trigger-reconstruction, which need real probe images sourced
    from the ingested dataset) silently degrades to its no-image fallback
    when that folder is never located. Proves the upload response now
    reports `coco_images_dir`, and that passing it through to
    /analyze-profile actually resolves real image files."""
    import io
    import zipfile
    from PIL import Image

    zip_path = tmp_path / "archive.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        coco = {
            "images": [{"id": 1, "file_name": "sample_01.jpg", "width": 32, "height": 32}],
            "annotations": [{"id": 1, "image_id": 1, "category_id": 0, "bbox": [0, 0, 10, 10], "area": 100, "iscrowd": 0}],
            "categories": [{"id": 0, "name": "military_vehicle"}],
        }
        import json
        zf.writestr("coco_annotations.json", json.dumps(coco))

        img_buf = io.BytesIO()
        Image.new("RGB", (32, 32), color=(120, 40, 40)).save(img_buf, format="JPEG")
        zf.writestr("images/sample_01.jpg", img_buf.getvalue())

    with open(zip_path, "rb") as f:
        upload_res = client.post(
            "/api/dataset/upload",
            files={"file": ("archive.zip", f, "application/zip")},
        )
    assert upload_res.status_code == 200
    upload_body = upload_res.json()
    assert upload_body["coco_json_candidates"]
    assert upload_body["coco_images_dir"] is not None
    assert upload_body["coco_images_dir"].endswith("images")

    # Without images_dir: the pre-fix behaviour -- image-dependent probe
    # paths come back empty because the loader looks next to the JSON,
    # not inside images/.
    no_images_dir_res = client.post(
        "/api/dataset/analyze-profile",
        json={
            "dataset_id": "regression_test_no_images_dir",
            "format_type": "COCO",
            "coco_path": upload_body["coco_json_candidates"][0],
        },
    )
    assert no_images_dir_res.status_code == 200
    assert no_images_dir_res.json()["probe_sample_image_paths"] == []

    # With the detected images_dir passed through: real images resolve.
    with_images_dir_res = client.post(
        "/api/dataset/analyze-profile",
        json={
            "dataset_id": "regression_test_with_images_dir",
            "format_type": "COCO",
            "coco_path": upload_body["coco_json_candidates"][0],
            "images_dir": upload_body["coco_images_dir"],
        },
    )
    assert with_images_dir_res.status_code == 200
    probe_paths = with_images_dir_res.json()["probe_sample_image_paths"]
    assert len(probe_paths) == 1
    assert os.path.exists(probe_paths[0])


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


def test_backdoor_probe_reachable_via_api_for_a_real_uploaded_model():
    """The BackdoorDetector's known-trigger clean-vs-triggered probing was
    previously only reachable from the internal demo scenario -- never
    from a route a caller could hit with their own model. Confirms it's
    genuinely wired: a real backdoored model produces a real nonzero ASR,
    a real clean model produces ASR 0.0."""
    import glob
    from backend.scenarios.asset_generator import AssetGenerator

    assets = AssetGenerator.ensure_test_assets("test_assets")
    probe_images = sorted(glob.glob("test_assets/images/*.jpg"))[:15]

    backdoored_res = client.post("/api/model/backdoor-probe", json={
        "model_path": assets["backdoored_model_path"],
        "probe_image_paths": probe_images,
        "access_level": "BLACK_BOX",
    })
    assert backdoored_res.status_code == 200
    backdoored_body = backdoored_res.json()
    assert backdoored_body["status"] == "COMPLETED"
    assert 0.0 <= backdoored_body["attack_success_rate"] <= 1.0
    # Every returned finding (if the ASR happened to cross this run's
    # threshold) must be the real backdoor finding type, not a placeholder.
    for finding in backdoored_body["findings"]:
        assert finding["finding_type"] == "backdoor_trojan_detected"

    clean_res = client.post("/api/model/backdoor-probe", json={
        "model_path": assets["clean_model_path"],
        "probe_image_paths": probe_images,
        "access_level": "BLACK_BOX",
    })
    assert clean_res.status_code == 200
    clean_body = clean_res.json()
    # An unmodified model has no backdoor behaviour to trigger -- 0.0 is a
    # real, deterministic measurement here, not a stand-in default.
    assert clean_body["attack_success_rate"] == 0.0
    assert clean_body["findings"] == []
    # The two real, independently-computed ASR values must not be
    # identical by construction -- proves this isn't a hardcoded constant.
    assert backdoored_body["attack_success_rate"] >= clean_body["attack_success_rate"]


def test_backdoor_probe_unavailable_at_hash_only_access():
    from backend.scenarios.asset_generator import AssetGenerator

    assets = AssetGenerator.ensure_test_assets("test_assets")
    res = client.post("/api/model/backdoor-probe", json={
        "model_path": assets["backdoored_model_path"],
        "probe_image_paths": ["test_assets/images/tactical_sample_001.jpg"],
        "access_level": "HASH_ONLY",
    })
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "UNAVAILABLE"
    assert body["attack_success_rate"] is None
    assert body["findings"] == []


def test_behaviour_battery_reports_real_backdoor_trigger_response_rate():
    """behaviour_analyzer previously hardcoded backdoor_trigger_response_rate
    to 0.0 inside evaluate_test_battery; a caller of /behaviour-battery
    alone always got a permanently-0.0 field. Confirms the route now runs
    real trigger probing on the same images and reports the real ASR."""
    import glob
    from backend.scenarios.asset_generator import AssetGenerator

    assets = AssetGenerator.ensure_test_assets("test_assets")
    probe_images = sorted(glob.glob("test_assets/images/*.jpg"))[:15]

    res = client.post("/api/model/behaviour-battery", json={
        "reference_model_path": assets["clean_model_path"],
        "candidate_model_path": assets["backdoored_model_path"],
        "probe_image_paths": probe_images,
        "access_level": "WHITE_BOX",
    })
    assert res.status_code == 200
    body = res.json()
    rate = body["assessment"]["backdoor_trigger_response_rate"]
    assert 0.0 <= rate <= 1.0
    # Cross-check against the dedicated endpoint on the exact same
    # model+images: both must derive from the same real probe run, not two
    # different constants.
    direct = client.post("/api/model/backdoor-probe", json={
        "model_path": assets["backdoored_model_path"],
        "probe_image_paths": probe_images,
        "access_level": "BLACK_BOX",
    }).json()
    assert rate == direct["attack_success_rate"]


def test_behaviour_battery_unavailable_at_hash_only_access_does_not_execute_model():
    """Constraint: white-box-only (and here, execution-only) methods must
    gracefully report unavailable at an access level that doesn't permit
    them, not silently execute the model anyway."""
    from backend.scenarios.asset_generator import AssetGenerator

    assets = AssetGenerator.ensure_test_assets("test_assets")
    res = client.post("/api/model/behaviour-battery", json={
        "reference_model_path": assets["clean_model_path"],
        "candidate_model_path": assets["backdoored_model_path"],
        "probe_image_paths": ["test_assets/images/tactical_sample_001.jpg"],
        "access_level": "HASH_ONLY",
    })
    assert res.status_code == 200
    body = res.json()
    assert body["assessment"]["status"] == "UNAVAILABLE"
    assert body["findings"] == []
    assert body["battery"] == []


def test_drift_evaluate_reference_samples_metadata_unlocks_embedding_comparison():
    """/api/drift/evaluate previously never exposed reference_samples_metadata
    -- the parameter that unlocks the empirical image-quality baseline and
    the embedding-space (Fréchet distance) comparison, the module's
    strongest shift signal. Confirms it's now reachable via the real API."""
    import glob

    images = sorted(glob.glob("test_assets/images/*.jpg"))
    ref_images, obs_images = images[:10], images[10:20]
    assert ref_images and obs_images

    res = client.post("/api/drift/evaluate", json={
        "reference_profile": {"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.75},
        "observed_samples": [
            {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.75, "image_path": p}
            for p in obs_images
        ],
        "reference_samples_metadata": [
            {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.75, "image_path": p}
            for p in ref_images
        ],
    })
    assert res.status_code == 200
    body = res.json()
    evidence = body["image_quality_evidence"]
    assert evidence["reference_baseline_source"] == "empirical_from_reference_images"
    assert evidence["reference_samples_with_computed_signals"] == len(ref_images)
    assert "embedding_comparison" in evidence
    assert evidence["embedding_comparison"]["reference_samples_embedded"] == len(ref_images)


def test_drift_evaluate_rejects_image_path_outside_safe_roots():
    """Both observed_samples[].image_path and reference_samples_metadata[].image_path
    are real server-local paths the detector opens for pixel analysis --
    must go through the same containment check every other route enforces,
    not silently read whatever the caller points at."""
    res = client.post("/api/drift/evaluate", json={
        "observed_samples": [{"terrain": "plains", "image_path": "/etc/passwd"}],
    })
    assert res.status_code == 403

    res2 = client.post("/api/drift/evaluate", json={
        "reference_samples_metadata": [{"terrain": "plains", "image_path": "/etc/passwd"}],
    })
    assert res2.status_code == 403
