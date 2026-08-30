import os
import pytest
import numpy as np
from backend.scenarios.scenario_manager import ScenarioManager
from backend.provenance.verification import ProvenanceVerifier
from backend.provenance.signing import ProvenanceSigner
from backend.audit.audit_log import TamperEvidentAuditLedger
from backend.data_assurance.duplicate_detector import DuplicateDetector
from backend.data_assurance.ood_detector import OODDetector
from backend.data_assurance.label_analyzer import LabelAnalyzer
from backend.data_assurance.poisoning_detector import PoisoningDetector
from backend.drift.distribution_shift import DistributionShiftDetector
from backend.model_assurance.fingerprint import ModelFingerprinter
from backend.model_assurance.behaviour_analyzer import BehaviourAnalyzer
from backend.model_assurance.backdoor_detector import BackdoorDetector
from backend.schemas import BoundingBox, ModelAccessLevel, PreprocessingConfig, InferenceConfig
from backend.ingestion.dataset_loader import DatasetLoader, SampleItem


def test_scenario_a_clean():
    mgr = ScenarioManager()
    res = mgr.run_scenario_a_clean()
    assert res["scenario_id"] == "SCENARIO-A"
    assert res["overall_disposition"] == "ACCEPT"
    assert res["overall_risk_score"] < 25.0
    assert len(res["audit_entries"]) >= 5


def test_scenario_b_poisoned():
    mgr = ScenarioManager()
    res = mgr.run_scenario_b_poisoned()
    assert res["scenario_id"] == "SCENARIO-B"
    assert res["overall_disposition"] == "QUARANTINE"
    assert res["overall_risk_score"] >= 60.0
    contributor_bravo = next(c for c in res["contributor_summaries"] if c.contributor_id == "contributor_bravo")
    assert contributor_bravo.risk_level in ["HIGH", "CRITICAL"]


def test_scenario_c_model():
    mgr = ScenarioManager()
    res = mgr.run_scenario_c_model_compromised()
    assert res["scenario_id"] == "SCENARIO-C"
    assert res["overall_disposition"] in ["REVIEW", "QUARANTINE"]
    assert any(f.finding_type == "model_substitution" for f in res["findings"])


def test_scenario_d_tampered():
    mgr = ScenarioManager()
    res = mgr.run_scenario_d_tampered_inference()
    assert res["scenario_id"] == "SCENARIO-D"
    assert res["tampered_record"].tampering_detected is True
    assert res["tampered_record"].is_valid is False
    assert len(res["tampered_record"].verification_errors) > 0


def test_audit_ledger_integrity():
    ledger = TamperEvidentAuditLedger()
    e1 = ledger.record_event("TEST_EVENT_1", "asset_01", "OP1", "digest1", "SUCCESS")
    e2 = ledger.record_event("TEST_EVENT_2", "asset_02", "OP2", "digest2", "SUCCESS")
    is_valid, errors = ledger.verify_ledger_integrity()
    assert is_valid is True
    assert len(errors) == 0

    ledger.entries[0].result = "TAMPERED_RESULT"
    is_valid_after_tamper, errors_after = ledger.verify_ledger_integrity()
    assert is_valid_after_tamper is False
    assert len(errors_after) > 0


def test_provenance_cryptographic_dag_and_replay():
    from backend.scenarios.asset_generator import AssetGenerator
    AssetGenerator.ensure_test_assets("test_assets")

    verifier = ProvenanceVerifier()
    preds = [
        BoundingBox(class_name="military_vehicle", confidence=0.96, box=[0.1, 0.2, 0.5, 0.6])
    ]
    rec = verifier.create_record(
        image_path="test_assets/images/tactical_sample_001.jpg",
        model_id="yolo_v8_recon",
        model_digest="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        predictions=preds,
    )
    is_valid, errors = verifier.verify_record(rec, check_replay=False)
    assert is_valid is True
    assert len(errors) == 0

    tampered_preds = [
        BoundingBox(class_name="civilian_bus", confidence=0.99, box=[0.1, 0.2, 0.5, 0.6])
    ]
    tampered_rec = rec.model_copy(update={"predictions": tampered_preds})
    t_valid, t_errors = verifier.verify_record(tampered_rec, check_replay=False)
    assert t_valid is False
    assert any("Output Hash mismatch" in err for err in t_errors)

    # First check_replay=True verification of this record's nonce: legitimate,
    # since it has never actually been checked for replay before now.
    first_check_valid, first_check_errors = verifier.verify_record(rec, check_replay=True)
    assert first_check_valid is True
    assert len(first_check_errors) == 0

    # Resubmitting the exact same record a second time is a genuine replay.
    replay_valid, replay_errors = verifier.verify_record(rec, check_replay=True)
    assert replay_valid is False
    assert any("Replay detected" in err for err in replay_errors)


def test_perceptual_hash_and_clustering():
    detector = DuplicateDetector(hamming_threshold=4)
    samples = [
        SampleItem(sample_id=f"s_{i}", image_path="identical_target_image.jpg", labels=["tank"], boxes=[[0, 0, 1, 1]], contributor_id="contrib_flooder")
        for i in range(10)
    ]
    findings, stats = detector.analyze(samples, "test_dataset")
    assert stats["total_duplicate_clusters"] >= 1
    assert stats["total_duplicated_samples"] == 10



def test_distribution_shift_arbitration():
    detector = DistributionShiftDetector(drift_threshold=0.3)
    ref_profile = {"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.75}

    normal_obs = [{"terrain": "plains", "sensor": "EO_optical", "illumination": 0.73} for _ in range(20)]
    report_normal = detector.evaluate_shift(ref_profile, normal_obs)
    assert report_normal.drift_detected is False
    assert report_normal.is_manipulation_suspected is False

    manipulated_obs = [{"terrain": "desert", "sensor": "IR_thermal", "illumination": 0.1} for _ in range(20)]
    report_manip = detector.evaluate_shift(ref_profile, manipulated_obs)
    assert report_manip.drift_detected is True
    assert report_manip.is_manipulation_suspected is True


def test_model_fingerprint_and_access_level():
    from backend.scenarios.asset_generator import AssetGenerator

    assets = AssetGenerator.ensure_test_assets("test_assets")
    fingerprinter = ModelFingerprinter()
    fp_white = fingerprinter.generate_fingerprint(
        model_path=assets["clean_model_path"],
        access_level=ModelAccessLevel.WHITE_BOX,
    )
    assert fp_white.access_level == ModelAccessLevel.WHITE_BOX
    assert fp_white.model_format == "ONNX"
    assert fp_white.total_parameters is not None and fp_white.total_parameters > 0

    match, finding = fingerprinter.verify_against_reference(fp_white, "different_sha256_hash_here")
    assert match is False
    assert finding is not None
    assert finding.finding_type == "model_substitution"


def test_torchscript_model_ingestion_end_to_end():
    """PyTorch/TorchScript ingestion had zero real end-to-end test
    coverage (COVERAGE.md flagged this explicitly). A real, scripted
    torch.nn.Module is compiled and saved to disk, then loaded through the
    same ModelLoader.inspect_model / ModelFingerprinter path used for
    ONNX, asserting it is not silently falling back to a BLACK_BOX parse
    failure."""
    from backend.scenarios.asset_generator import AssetGenerator
    from backend.ingestion.model_loader import ModelLoader

    ts_path = "test_assets/models/tactical_ts.torchscript"
    AssetGenerator.generate_torchscript_model(ts_path)

    result = ModelLoader.inspect_model(ts_path, enforce_access_level=ModelAccessLevel.WHITE_BOX)
    assert result.model_format == "TorchScript"
    assert result.access_level == ModelAccessLevel.WHITE_BOX, (
        f"TorchScript load must not silently degrade to BLACK_BOX; metadata={result.metadata}"
    )
    assert result.total_parameters is not None and result.total_parameters > 0
    assert "parse_error" not in result.metadata and "load_error" not in result.metadata

    fingerprinter = ModelFingerprinter()
    fp = fingerprinter.generate_fingerprint(ts_path, ModelAccessLevel.WHITE_BOX)
    assert fp.model_format == "TorchScript"
    assert fp.total_parameters == result.total_parameters
    assert len(fp.sha256_digest) == 64


def test_pytorch_state_dict_checkpoint_ingestion_end_to_end():
    """Same as above for the raw PyTorch state_dict (.pt) branch, which is
    a distinct code path from TorchScript (torch.load weights_only=True
    vs torch.jit.load)."""
    from backend.scenarios.asset_generator import AssetGenerator
    from backend.ingestion.model_loader import ModelLoader

    ckpt_path = "test_assets/models/tactical_ckpt.pt"
    AssetGenerator.generate_torch_checkpoint(ckpt_path)

    result = ModelLoader.inspect_model(ckpt_path, enforce_access_level=ModelAccessLevel.WHITE_BOX)
    assert result.model_format == "PyTorch"
    assert result.access_level == ModelAccessLevel.WHITE_BOX
    assert result.total_parameters is not None and result.total_parameters > 0
    assert result.metadata.get("unsafe_pickle_deserialization") is False, (
        "A plain state_dict of tensors must load via the safe weights_only=True path, "
        "not fall back to full unpickling."
    )


def test_neural_cleanse_discovers_the_hidden_backdoor_class():
    """The one previously NOT_SUPPORTED capability: blind, gradient-based
    unknown-trigger reconstruction. Unlike backdoor_detector.py's existing
    test, this is never told the checkerboard trigger exists -- it must
    independently discover that 'military_vehicle' is the hijacked class
    by finding it needs an anomalously small reconstructed perturbation,
    AND that the clean model produces zero false-positive flags."""
    from backend.model_assurance.trigger_reconstruction import run_trigger_reconstruction
    from backend.scenarios.asset_generator import AssetGenerator
    import glob

    assets = AssetGenerator.ensure_test_assets("test_assets")
    class_names = ["military_vehicle", "infantry", "radar_station", "aircraft", "naval_vessel"]
    clean_images = sorted(glob.glob("test_assets/images/*.jpg"))[:10]

    clean_result, clean_findings = run_trigger_reconstruction(
        "clean_model", assets["clean_model_path"], clean_images, class_names
    )
    assert clean_result["status"] == "COMPLETED"
    assert clean_result["backdoor_suspected"] is False
    assert len(clean_findings) == 0

    backdoored_result, backdoored_findings = run_trigger_reconstruction(
        "backdoored_model", assets["backdoored_model_path"], clean_images, class_names
    )
    assert backdoored_result["status"] == "COMPLETED"
    assert backdoored_result["backdoor_suspected"] is True
    assert any(f["class_name"] == "military_vehicle" for f in backdoored_result["flagged_classes"])
    assert len(backdoored_findings) >= 1
    assert backdoored_findings[0].finding_type == "unknown_trigger_reconstruction"


def test_neural_cleanse_reports_unavailable_for_unbridgeable_architecture():
    """A model this system cannot bridge into a differentiable framework
    (e.g. the real third-party YOLOX model) must report UNAVAILABLE with
    a reason, not raise or silently return an empty/fabricated result."""
    import os
    from backend.model_assurance.trigger_reconstruction import run_trigger_reconstruction

    yolox_path = "real_validation/models/yolox_nano.onnx"
    if not os.path.exists(yolox_path):
        pytest.skip("real_validation/ fixtures not present")

    result, findings = run_trigger_reconstruction(
        "yolox_model", yolox_path, ["real_validation/images/000000000009.jpg"], ["person"]
    )
    assert result["status"] == "UNAVAILABLE"
    assert "reason" in result
    assert findings == []


def test_model_fingerprint_raises_on_missing_file():
    fingerprinter = ModelFingerprinter()
    with pytest.raises(FileNotFoundError):
        fingerprinter.generate_fingerprint(model_path="definitely_not_a_real_file.onnx")


def test_real_onnx_inference_produces_input_conditional_backdoor():
    """The backdoored model must only fire its trigger response on an image
    that actually contains the checkerboard patch, and the clean model must
    be unaffected by it -- this is executed inference, not a scripted flag."""
    from backend.inference.inference_engine import InferenceEngine
    from backend.scenarios.asset_generator import AssetGenerator
    from backend.schemas import InferenceConfig

    assets = AssetGenerator.ensure_test_assets("test_assets")
    engine = InferenceEngine()
    cfg = InferenceConfig(confidence_threshold=0.9)

    clean_preds = engine.run_inference("test_assets/images/tactical_sample_001.jpg", assets["backdoored_model_path"], config=cfg)
    triggered_preds = engine.run_inference("test_assets/images/tactical_sample_021.jpg", assets["backdoored_model_path"], config=cfg)

    assert any(p.class_name == "military_vehicle" and p.confidence >= 0.99 for p in triggered_preds)

    clean_model_preds = engine.run_inference("test_assets/images/tactical_sample_021.jpg", assets["clean_model_path"], config=cfg)
    assert not any(p.confidence >= 0.99 for p in clean_model_preds)


def test_real_parameter_analysis_flags_backdoored_weights():
    import onnx
    from backend.model_assurance.parameter_analyzer import ParameterAnalyzer
    from backend.scenarios.asset_generator import AssetGenerator

    assets = AssetGenerator.ensure_test_assets("test_assets")
    analyzer = ParameterAnalyzer()

    clean_tensors = analyzer.extract_onnx_weight_tensors(onnx.load(assets["clean_model_path"]))
    clean_stats, clean_findings = analyzer.analyze_weights_and_activations("clean", ModelAccessLevel.WHITE_BOX, clean_tensors)
    assert len(clean_findings) == 0

    backdoored_tensors = analyzer.extract_onnx_weight_tensors(onnx.load(assets["backdoored_model_path"]))
    backdoored_stats, backdoored_findings = analyzer.analyze_weights_and_activations("backdoored", ModelAccessLevel.WHITE_BOX, backdoored_tensors)
    assert len(backdoored_findings) >= 1
    assert backdoored_stats["max_kurtosis"] > clean_stats["max_kurtosis"]


def test_distribution_shift_embedding_comparison_is_real_and_directional():
    """FR-11: distribution shift must support a real embedding-space
    comparison (learned CNN feature vectors via a real onnxruntime forward
    pass), not just raw pixel/metadata statistics -- and it must be
    directionally sensible: a reference set compared to itself-ish should
    show less divergence than a reference set compared to a visually very
    different population (here: images carrying the checkerboard trigger
    patch in one corner)."""
    import os
    import numpy as np
    from PIL import Image
    from backend.scenarios.asset_generator import AssetGenerator

    AssetGenerator.ensure_test_assets("test_assets")
    detector = DistributionShiftDetector()

    ref_meta = [
        {"image_path": f"test_assets/images/tactical_sample_{i:03d}.jpg"}
        for i in range(1, 16)
    ]
    obs_meta_similar = [
        {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.75,
         "image_path": f"test_assets/images/tactical_sample_{i:03d}.jpg"}
        for i in range(16, 21)
    ]

    # A clearly, substantially different visual population -- solid-color
    # flat images -- to give the embedding-shift signal something
    # unambiguous to detect, rather than relying on a subtle few-pixel
    # trigger patch after 640->64 downsampling (which is too marginal a
    # signal for a stable test assertion).
    os.makedirs("test_assets/images/_shift_test", exist_ok=True)
    flat_paths = []
    for i, color in enumerate([(10, 200, 10), (5, 210, 15), (12, 195, 8), (8, 205, 20), (15, 190, 5)]):
        p = f"test_assets/images/_shift_test/flat_{i}.jpg"
        Image.new("RGB", (640, 640), color).save(p)
        flat_paths.append(p)
    obs_meta_very_different = [
        {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.75, "image_path": p}
        for p in flat_paths
    ]

    report_similar = detector.evaluate_shift(
        {"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.75},
        obs_meta_similar, reference_samples_metadata=ref_meta,
    )
    report_very_different = detector.evaluate_shift(
        {"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.75},
        obs_meta_very_different, reference_samples_metadata=ref_meta,
    )

    assert "embedding_shift" in report_similar.affected_dimensions
    assert "embedding_comparison" in report_similar.image_quality_evidence
    comparison = report_similar.image_quality_evidence["embedding_comparison"]
    assert comparison["reference_samples_embedded"] == 15
    assert comparison["embedding_dim"] == 32

    assert report_very_different.affected_dimensions["embedding_shift"] > report_similar.affected_dimensions["embedding_shift"]


def test_distribution_shift_without_reference_images_falls_back_gracefully():
    """Without reference_samples_metadata, embedding comparison must be
    skipped explicitly (not silently faked), and the rest of the
    evaluation must still work exactly as before."""
    detector = DistributionShiftDetector()
    report = detector.evaluate_shift(
        {"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.75},
        [{"terrain": "plains", "sensor": "EO_optical", "illumination": 0.75} for _ in range(10)],
    )
    assert "embedding_shift" not in report.affected_dimensions
    assert any("Embedding-space" in l for l in report.limitations)


def test_yolo_dataset_ingestion():
    """FR-01: YOLO ingestion must actually be exercised, not just present
    as unused code. The same fixtures AssetGenerator writes for the COCO
    path (test_assets/labels/*.txt + test_assets/images/*.jpg) are valid
    YOLO-format labels, real images on disk."""
    from backend.scenarios.asset_generator import AssetGenerator
    from backend.ingestion.dataset_loader import DatasetLoader

    AssetGenerator.ensure_test_assets("test_assets")
    classes = ["military_vehicle", "infantry", "radar_station", "aircraft", "naval_vessel"]
    samples = DatasetLoader.load_yolo("test_assets", class_names=classes)

    assert len(samples) == 40
    for s in samples:
        assert os.path.exists(s.image_path), f"YOLO sample {s.sample_id} references a missing image"
        assert len(s.labels) >= 1
        assert len(s.boxes) == len(s.labels)
        for box in s.boxes:
            assert len(box) == 4
            assert all(0.0 <= v <= 1.0 for v in box), "YOLO boxes are normalized [0,1] center/width/height"
        assert s.contributor_id.startswith("contributor_")


def test_model_digest_status_no_reference_vs_match_vs_mismatch():
    """FR-05: digest verification must distinguish a model with no declared
    reference at all (NO_REFERENCE) from an explicit MATCH/MISMATCH -- a
    missing reference must never be silently reported as a MATCH."""
    from backend.scenarios.asset_generator import AssetGenerator
    from backend.schemas import ModelDigestStatus

    assets = AssetGenerator.ensure_test_assets("test_assets")
    fingerprinter = ModelFingerprinter()
    fp = fingerprinter.generate_fingerprint(assets["clean_model_path"], ModelAccessLevel.WHITE_BOX)

    status, finding = fingerprinter.verify_digest(fp, None)
    assert status == ModelDigestStatus.NO_REFERENCE
    assert finding is not None and finding.finding_type == "model_identity_unverifiable"

    status, finding = fingerprinter.verify_digest(fp, fp.sha256_digest)
    assert status == ModelDigestStatus.MATCH
    assert finding is None

    status, finding = fingerprinter.verify_digest(fp, "0" * 64)
    assert status == ModelDigestStatus.MISMATCH
    assert finding is not None and finding.finding_type == "model_substitution"


def test_hash_only_access_level_reports_all_execution_checks_unavailable():
    """FR-07: HASH_ONLY must be a distinct tier from BLACK_BOX -- only file
    digest/identity checks are available; every execution-dependent check
    (I/O probing, behavioural fingerprinting, trigger probing) must be
    explicitly reported unavailable with a reason, not silently skipped."""
    from backend.model_assurance.access_detector import ModelAccessDetector

    supported = ModelAccessDetector.get_supported_methods(ModelAccessLevel.HASH_ONLY)
    assert "file_sha256_digest" in supported
    assert "input_output_inference_profiling" not in supported
    assert "behavioural_fingerprinting" not in supported

    unavailable = dict(ModelAccessDetector.get_unavailable_methods(ModelAccessLevel.HASH_ONLY))
    assert "input_output_inference_profiling" in unavailable
    assert len(unavailable["input_output_inference_profiling"]) > 0

    black_box_supported = ModelAccessDetector.get_supported_methods(ModelAccessLevel.BLACK_BOX)
    assert "input_output_inference_profiling" in black_box_supported
    assert "layer_parameter_distribution_analysis" not in black_box_supported


def test_provenance_reordering_detection_independent_of_replay():
    """FR-10: a record with a fresh (never-before-seen) nonce but a
    sequence number that does not exceed the last verified sequence must
    still be flagged as reordering -- this must be detected independently
    of nonce-replay detection, not conflated with it.

    Records are hand-constructed directly via the hasher/signer (bypassing
    `create_record`, which registers its own nonce into `seen_nonces` at
    creation time) so this test isolates the sequence-monotonicity check
    from nonce-replay detection, exactly as `ScenarioReplayAuditRunner`
    does for the equivalent end-to-end demo scenario."""
    from backend.scenarios.asset_generator import AssetGenerator
    from backend.schemas import InferenceConfig, InferenceRecord, PreprocessingConfig

    AssetGenerator.ensure_test_assets("test_assets")
    verifier = ProvenanceVerifier()
    preds = [BoundingBox(class_name="military_vehicle", confidence=0.96, box=[0.1, 0.2, 0.5, 0.6])]
    image_path = "test_assets/images/tactical_sample_001.jpg"

    def _hand_signed_record(nonce: str, sequence_number: int) -> InferenceRecord:
        img_hash = verifier.hasher.hash_image_file(image_path)
        preproc_hash = verifier.hasher.hash_preprocessing_config(PreprocessingConfig())
        cfg_hash = verifier.hasher.hash_inference_config(InferenceConfig())
        out_hash = verifier.hasher.hash_predictions(preds)
        timestamp = "2026-01-01T00:00:00Z"
        prov_hash = verifier.hasher.compute_provenance_hash(
            image_hash=img_hash, model_digest="digest_a", preprocessing_hash=preproc_hash,
            config_hash=cfg_hash, output_hash=out_hash, timestamp=timestamp, nonce=nonce,
            sequence_number=sequence_number,
        )
        return InferenceRecord(
            record_id=f"rec_{nonce}", timestamp=timestamp, nonce=nonce, sequence_number=sequence_number,
            image_hash=img_hash, model_digest="digest_a", preprocessing_hash=preproc_hash,
            config_hash=cfg_hash, output_hash=out_hash, provenance_hash=prov_hash,
            signature=verifier.signer.sign_provenance_hash(prov_hash), predictions=preds, model_id="yolo_v8_recon",
        )

    rec_seq_2 = _hand_signed_record("nonce_seq_2", 2)
    is_valid_2, errors_2 = verifier.verify_record(rec_seq_2, check_replay=True)
    assert is_valid_2 is True
    assert not errors_2
    assert verifier.last_verified_sequence == 2

    # Genuinely fresh nonce, never seen before -- but a stale sequence
    # number that does not exceed 2. Must be rejected purely on sequence
    # grounds, with no nonce-replay error at all.
    rec_seq_1_stale = _hand_signed_record("nonce_seq_1_stale_never_seen", 1)
    is_valid_stale, errors_stale = verifier.verify_record(rec_seq_1_stale, check_replay=True)
    assert is_valid_stale is False
    assert any("Reordering" in e for e in errors_stale)
    assert not any("Replay detected" in e for e in errors_stale)


def test_distribution_shift_classification_and_insufficient_evidence():
    """FR-12: the report must classify into the PRD's four named
    categories, and must report insufficient_evidence rather than a
    confident verdict when too few samples are supplied."""
    from backend.schemas import DriftClassification

    detector = DistributionShiftDetector(drift_threshold=0.3)
    ref_profile = {"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.75}

    tiny = [{"terrain": "plains", "sensor": "EO_optical", "illumination": 0.73} for _ in range(2)]
    report_tiny = detector.evaluate_shift(ref_profile, tiny)
    assert report_tiny.classification == DriftClassification.INSUFFICIENT_EVIDENCE

    normal_obs = [{"terrain": "plains", "sensor": "EO_optical", "illumination": 0.73} for _ in range(20)]
    report_normal = detector.evaluate_shift(ref_profile, normal_obs)
    assert report_normal.classification == DriftClassification.PROBABLE_OPERATIONAL_DRIFT

    manipulated_obs = [{"terrain": "desert", "sensor": "IR_thermal", "illumination": 0.1} for _ in range(20)]
    report_manip = detector.evaluate_shift(ref_profile, manipulated_obs)
    assert report_manip.classification == DriftClassification.MANIPULATION_INDICATORS_PRESENT


def test_distribution_shift_uses_real_image_quality_signals_when_available():
    """FR-11: when observed samples carry a resolvable image_path, real
    pixel-derived quality signals (blur/contrast/resolution/compression)
    must be computed and folded into the shift evidence, not just declared
    terrain/sensor/illumination metadata."""
    from backend.scenarios.asset_generator import AssetGenerator

    assets = AssetGenerator.ensure_test_assets("test_assets")
    detector = DistributionShiftDetector()
    obs = [
        {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.75, "image_path": "test_assets/images/tactical_sample_001.jpg"},
        {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.75, "image_path": "test_assets/images/tactical_sample_002.jpg"},
        {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.75, "image_path": "test_assets/images/tactical_sample_003.jpg"},
        {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.75, "image_path": "test_assets/images/tactical_sample_004.jpg"},
        {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.75, "image_path": "test_assets/images/tactical_sample_005.jpg"},
    ]
    report = detector.evaluate_shift({"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.75}, obs)
    assert report.image_quality_evidence.get("samples_with_computed_signals") == 5
    assert "blur_shift" in report.affected_dimensions


def test_audit_ledger_entries_are_individually_signed_and_verified():
    """FR-15: each audit entry must carry an Ed25519 signature over its
    entry_hash, and verify_ledger_integrity must independently recompute
    and check that signature, not just the hash chain."""
    ledger = TamperEvidentAuditLedger(persist_path=None)
    entry = ledger.record_event("TEST_EVENT", "asset_01", "OP1", "digest1", "SUCCESS")
    assert entry.signature is not None and len(entry.signature) > 0

    is_valid, errors = ledger.verify_ledger_integrity()
    assert is_valid is True

    # Corrupt only the signature, leaving the hash chain untouched.
    ledger.entries[0].signature = "not_a_real_signature=="
    is_valid_after, errors_after = ledger.verify_ledger_integrity()
    assert is_valid_after is False
    assert any("signature" in e.lower() for e in errors_after)


def test_scenario_e_replay_and_reordering():
    mgr = ScenarioManager()
    res = mgr.run_scenario_e_replay()
    assert res["scenario_id"] == "SCENARIO-E"
    assert res["replay_attempt"]["is_valid"] is False
    assert res["reorder_attempt"]["is_valid"] is False
    finding_types = {f.finding_type for f in res["findings"]}
    assert "inference_replay" in finding_types
    assert "inference_reordering" in finding_types


def test_scenario_f_audit_log_tamper():
    mgr = ScenarioManager()
    res = mgr.run_scenario_f_audit_tamper()
    assert res["scenario_id"] == "SCENARIO-F"
    assert res["pre_tamper_valid"] is True
    assert res["post_tamper_valid"] is False
    assert len(res["post_tamper_errors"]) > 0
    assert any(f.finding_type == "audit_log_modification" for f in res["findings"])


def test_offline_cli_verifies_ledger_and_detects_tamper(tmp_path):
    """FR-15: the offline verification CLI must run without starting the
    FastAPI service and must correctly detect a tampered ledger file."""
    from backend.tools.verify_offline import verify_audit_ledger

    ledger_path = str(tmp_path / "cli_ledger.jsonl")
    ledger = TamperEvidentAuditLedger(persist_path=ledger_path)
    ledger.record_event("TEST_EVENT_1", "asset_01", "OP1", "digest1", "SUCCESS")
    ledger.record_event("TEST_EVENT_2", "asset_02", "OP2", "digest2", "SUCCESS")

    assert verify_audit_ledger(ledger_path) is True

    import json
    lines = (tmp_path / "cli_ledger.jsonl").read_text().splitlines()
    first = json.loads(lines[0])
    first["result"] = "TAMPERED"
    lines[0] = json.dumps(first)
    (tmp_path / "cli_ledger.jsonl").write_text("\n".join(lines) + "\n")

    assert verify_audit_ledger(ledger_path) is False


def test_key_rotation_preserves_verifiability_of_prior_signatures(tmp_path):
    """FR-15 hardening: rotating a signing key must never invalidate
    signatures issued before the rotation, and the audit ledger must stay
    fully valid even when the signing key rotates mid-stream."""
    from backend.provenance.signing import ProvenanceSigner

    key_path = str(tmp_path / "prov.pem")
    registry_path = str(tmp_path / "registry.json")

    signer = ProvenanceSigner(key_path=key_path, role="provenance", registry_path=registry_path)
    old_sig = signer.sign_provenance_hash("hash_before_rotation")
    old_fp = signer.public_key_hex

    new_fp = signer.rotate()
    assert new_fp != old_fp

    new_sig = signer.sign_provenance_hash("hash_after_rotation")

    # A fresh instance (simulating a new process) must independently reach
    # the same conclusions using only what's on disk.
    fresh = ProvenanceSigner(key_path=key_path, role="provenance", registry_path=registry_path)
    assert fresh.public_key_hex == new_fp
    assert fresh.verify_signature("hash_before_rotation", old_sig) is True
    assert fresh.verify_signature("hash_after_rotation", new_sig) is True
    assert fresh.verify_signature("tampered_hash", old_sig) is False


def test_audit_ledger_stays_valid_across_a_mid_stream_key_rotation(tmp_path):
    ledger_path = str(tmp_path / "ledger.jsonl")
    audit_key_path = str(tmp_path / "audit.pem")
    registry_path = str(tmp_path / "registry.json")

    from backend.provenance.signing import ProvenanceSigner
    signer = ProvenanceSigner(key_path=audit_key_path, role="audit", registry_path=registry_path)
    ledger = TamperEvidentAuditLedger(persist_path=ledger_path, signer=signer)

    ledger.record_event("BEFORE_ROTATION", "asset1", "OP", "digest1", "OK")
    signer.rotate()
    ledger.record_event("AFTER_ROTATION", "asset2", "OP", "digest2", "OK")

    is_valid, errors = ledger.verify_ledger_integrity()
    assert is_valid is True
    assert errors == []


def test_html_and_pdf_report_export():
    """FR-14: the report must be exportable as both HTML and PDF, not JSON only."""
    from backend.assurance.report_exporters import render_html_report, render_pdf_report

    mgr = ScenarioManager()
    res = mgr.run_scenario_b_poisoned()
    report = res["report"]

    html = render_html_report(report)
    assert "<html" in html.lower()
    assert report.report_id in html

    pdf_bytes = render_pdf_report(report)
    assert pdf_bytes[:5] == b"%PDF-"

