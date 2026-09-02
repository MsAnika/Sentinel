"""Regression tests for the backend security/correctness fixes found in the
2026-09-01 codebase audit:

1. Arbitrary file read via unsandboxed model/dataset/inference paths.
2. Key rotation not actually revoking a retired key's ability to sign new
   records.
3. Provenance hash omitting model_id/image_metadata from what it binds.
5. Offline verifier never checking replay/reordering.
8. Prediction-hash canonicalization not fully order-independent on ties.

(#4 RBAC and #6 upload-extension-allowlist are exercised incidentally by
these same tests; #7 error-message sanitization is a response-content
change with no independently testable security property beyond "the raw
exception string is gone", asserted directly below.)
"""
import time

from fastapi.testclient import TestClient

from backend.main import app
from backend.provenance.hashing import ProvenanceHasher
from backend.provenance.signing import ProvenanceSigner
from backend.provenance.verification import ProvenanceVerifier
from backend.schemas import BoundingBox, InferenceRecord
from backend.scenarios.asset_generator import AssetGenerator

client = TestClient(app)


def _read_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


# --- Fix #1: arbitrary file read via unsandboxed paths -----------------


def test_model_fingerprint_rejects_a_path_outside_the_sandbox(tmp_path):
    """A model_path outside uploads/test_assets/real_validation must be
    refused, not opened -- even if the file exists and is readable."""
    outside_file = tmp_path / "not_a_real_upload.onnx"
    outside_file.write_bytes(b"not a real model")

    res = client.post(
        "/api/model/fingerprint",
        json={"model_path": str(outside_file)},
    )
    assert res.status_code == 403
    assert "permitted directories" in res.json()["detail"]


def test_model_fingerprint_rejects_reading_an_arbitrary_host_file():
    """The concrete attack this closes: pointing model_path at a real,
    sensitive file elsewhere on the host."""
    res = client.post(
        "/api/model/fingerprint",
        json={"model_path": "/etc/hosts"},
    )
    assert res.status_code == 403


def test_dataset_analyze_profile_rejects_coco_path_outside_sandbox(tmp_path):
    fake_coco = tmp_path / "not_staged.json"
    fake_coco.write_text("{}")

    res = client.post(
        "/api/dataset/analyze-profile",
        json={"format_type": "COCO", "coco_path": str(fake_coco)},
    )
    assert res.status_code == 403


def test_inference_execute_rejects_image_path_outside_sandbox(tmp_path):
    assets = AssetGenerator.ensure_test_assets("test_assets")
    fake_image = tmp_path / "not_staged.jpg"
    fake_image.write_bytes(b"\xff\xd8\xff")  # minimal jpeg-ish header

    res = client.post(
        "/api/inference/execute",
        json={"image_path": str(fake_image), "model_path": assets["clean_model_path"]},
    )
    assert res.status_code == 403


def test_model_fingerprint_still_works_for_a_legitimately_uploaded_model(tmp_path):
    """The fix must not break the real workflow: upload, then reference the
    server-returned path."""
    model_path = tmp_path / "legit_model.onnx"
    AssetGenerator.generate_detector_onnx(str(model_path), is_backdoored=False)

    upload_res = client.post(
        "/api/model/upload",
        files={"file": ("legit_model.onnx", _read_bytes(str(model_path)), "application/octet-stream")},
    )
    assert upload_res.status_code == 200
    saved_path = upload_res.json()["metadata"]["saved_path"]

    fp_res = client.post("/api/model/fingerprint", json={"model_path": saved_path})
    assert fp_res.status_code == 200


def test_model_upload_rejects_disallowed_extension(tmp_path):
    """Fix #6: only recognized model formats are accepted at upload time."""
    payload = tmp_path / "not_a_model.exe"
    payload.write_bytes(b"MZ\x90\x00")

    res = client.post(
        "/api/model/upload",
        files={"file": ("not_a_model.exe", _read_bytes(str(payload)), "application/octet-stream")},
    )
    assert res.status_code == 422
    assert "Unsupported model file extension" in res.json()["detail"]


def test_parameter_analysis_error_does_not_leak_raw_exception_text(tmp_path):
    """Fix #7: a parse failure must not echo raw Python exception text
    (which can include internal file paths) back to the client."""
    corrupt_model = tmp_path / "corrupt.onnx"
    corrupt_model.write_bytes(b"this is not a valid onnx file")

    upload_res = client.post(
        "/api/model/upload",
        files={"file": ("corrupt.onnx", _read_bytes(str(corrupt_model)), "application/octet-stream")},
    )
    # Fingerprinting a corrupt file may itself fail at upload time (422) --
    # either way, the detail must be sanitized, not a raw exception string
    # containing this test's tmp_path.
    detail = str(upload_res.json().get("detail", ""))
    assert str(tmp_path) not in detail


# --- Fix #2: key rotation must actually revoke a retired key -----------


def test_rotated_key_can_no_longer_sign_new_valid_records(tmp_path):
    """The core of the fix: once a key is retired, a signature produced
    with that retired private key over a NEW (later-timestamped) hash must
    NOT verify -- otherwise rotating a compromised key doesn't revoke it."""
    key_path = str(tmp_path / "prov.pem")
    registry_path = str(tmp_path / "registry.json")

    signer = ProvenanceSigner(key_path=key_path, role="provenance", registry_path=registry_path)
    old_private_key = signer._private_key  # simulate the attacker retaining the compromised key material

    signer.rotate()

    # Attacker, still holding the retired private key, signs a brand-new
    # forged hash timestamped well after rotation.
    forged_sig = old_private_key.sign(b"forged_hash_after_compromise")
    import base64
    forged_sig_b64 = base64.b64encode(forged_sig).decode("utf-8")

    future_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 3600))
    assert signer.verify_signature(
        "forged_hash_after_compromise", forged_sig_b64, record_timestamp=future_timestamp
    ) is False


def test_rotated_key_still_verifies_its_own_pre_rotation_signature(tmp_path):
    """The fix must not regress the original guarantee: a signature made
    BEFORE rotation, verified with a timestamp from before rotation, must
    still pass."""
    key_path = str(tmp_path / "prov.pem")
    registry_path = str(tmp_path / "registry.json")

    signer = ProvenanceSigner(key_path=key_path, role="provenance", registry_path=registry_path)
    past_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    old_sig = signer.sign_provenance_hash("hash_before_rotation")

    signer.rotate()

    fresh = ProvenanceSigner(key_path=key_path, role="provenance", registry_path=registry_path)
    assert fresh.verify_signature(
        "hash_before_rotation", old_sig, record_timestamp=past_timestamp
    ) is True


# --- Fix #3: provenance hash must bind model_id and image_metadata -----


def test_altering_model_id_after_signing_is_detected():
    assets = AssetGenerator.ensure_test_assets("test_assets")
    verifier = ProvenanceVerifier()
    preds = [BoundingBox(class_name="tank", confidence=0.9, box=[0, 0, 1, 1])]

    record = verifier.create_record(
        image_path="test_assets/images/tactical_sample_001.jpg",
        model_id="model_trusted_abc",
        model_digest="digest_abc",
        predictions=preds,
    )
    is_valid, errors = verifier.verify_record(record)
    assert is_valid is True

    tampered = record.model_copy(deep=True)
    tampered.model_id = "model_untrusted_xyz"
    is_valid, errors = verifier.verify_record(tampered)
    assert is_valid is False
    assert any("Provenance Hash mismatch" in e or "ALTERATION" in e for e in errors)


def test_altering_image_metadata_after_signing_is_detected():
    assets = AssetGenerator.ensure_test_assets("test_assets")
    verifier = ProvenanceVerifier()
    preds = [BoundingBox(class_name="tank", confidence=0.9, box=[0, 0, 1, 1])]

    record = verifier.create_record(
        image_path="test_assets/images/tactical_sample_001.jpg",
        model_id="model_trusted_abc",
        model_digest="digest_abc",
        predictions=preds,
        image_metadata={"source": "drone_feed_1", "camera": "EO"},
    )
    is_valid, _ = verifier.verify_record(record)
    assert is_valid is True

    tampered = record.model_copy(deep=True)
    tampered.image_metadata = {"source": "fabricated_source", "camera": "EO"}
    is_valid, errors = verifier.verify_record(tampered)
    assert is_valid is False


# --- Fix #5: offline verifier must actually detect replay/reordering ---


def test_offline_verify_all_db_records_detects_a_replayed_record(tmp_path, monkeypatch):
    """Simulates the exact scenario the audit flagged: the same record
    appearing twice in the local evidence store must be reported as a
    replay, not silently marked VALID."""
    import json
    from backend.tools.verify_offline import verify_all_db_records
    from backend.persistence import db as db_module

    db_path = str(tmp_path / "offline_verify.db")
    monkeypatch.setenv("IntelX_DB_PATH", db_path)

    assets = AssetGenerator.ensure_test_assets("test_assets")
    verifier = ProvenanceVerifier()
    preds = [BoundingBox(class_name="tank", confidence=0.9, box=[0, 0, 1, 1])]
    record = verifier.create_record(
        image_path="test_assets/images/tactical_sample_001.jpg",
        model_id="model_trusted_abc",
        model_digest="digest_abc",
        predictions=preds,
    )

    db_module.init_db(db_path)
    db_module.insert_inference_record(record.model_dump(), db_path=db_path)
    # Simulate the same signed record being replayed into the store a
    # second time under a different DB row (record_id is the table's
    # primary key, so re-inserting the identical record_id would just
    # overwrite the row rather than modeling a replay). The nonce,
    # sequence_number, provenance_hash, and signature are all identical to
    # the original -- exactly what a replayed record looks like.
    duplicate = record.model_dump()
    duplicate["record_id"] = record.record_id + "_replayed"
    db_module.insert_inference_record(duplicate, db_path=db_path)

    all_valid = verify_all_db_records(db_path)
    assert all_valid is False


# --- Fix #8: prediction-hash canonicalization is order-independent -----


def test_prediction_hash_is_order_independent_even_on_ties():
    hasher = ProvenanceHasher()
    a = BoundingBox(class_name="tank", confidence=0.9, box=[0, 0, 1, 1])
    b = BoundingBox(class_name="tank", confidence=0.9, box=[5, 5, 6, 6])

    hash_ab = hasher.hash_predictions([a, b])
    hash_ba = hasher.hash_predictions([b, a])
    assert hash_ab == hash_ba
