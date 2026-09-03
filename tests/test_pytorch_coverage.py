"""Closes the PyTorch/TorchScript coverage gap documented in COVERAGE.md
as PARTIAL: execution-based checks (behaviour battery, backdoor probing)
and white-box parameter analysis previously only worked for ONNX models,
even though model ingestion accepted PyTorch/TorchScript files.

These tests prove the extension is real, not a stub:
- A genuine TorchScript module (torch.jit.script) is executed via
  InferenceEngine and produces real, input-conditional backdoor behaviour
  -- the same test structure as the existing ONNX backdoor test
  (test_real_onnx_inference_produces_input_conditional_backdoor).
- ParameterAnalyzer extracts real PyTorch parameter tensors and correctly
  distinguishes clean from backdoored weights via the same
  kurtosis/variance statistics used for ONNX.
- A raw (non-scripted) state_dict checkpoint is honestly reported as
  non-executable (ModelExecutionError), never silently faked into a
  result -- while parameter analysis, which only needs tensor values,
  still works on it.
"""
import torch
from fastapi.testclient import TestClient

from backend.main import app
from backend.inference.inference_engine import InferenceEngine, ModelExecutionError
from backend.model_assurance.parameter_analyzer import ParameterAnalyzer
from backend.schemas import InferenceConfig, ModelAccessLevel
from backend.scenarios.asset_generator import AssetGenerator

client = TestClient(app)


def _read_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def test_torchscript_inference_produces_input_conditional_backdoor(tmp_path):
    """Mirrors test_real_onnx_inference_produces_input_conditional_backdoor
    exactly, but for a real TorchScript model: the backdoored model must
    only fire on an image that actually contains the checkerboard trigger,
    and the clean model must be unaffected by it. This is real onnxruntime-
    free execution through torch.jit -- not a scripted flag."""
    assets = AssetGenerator.ensure_test_assets("test_assets")
    clean_ts = str(tmp_path / "clean.torchscript")
    backdoored_ts = str(tmp_path / "backdoored.torchscript")
    AssetGenerator.generate_torchscript_model(clean_ts, is_backdoored=False)
    AssetGenerator.generate_torchscript_model(backdoored_ts, is_backdoored=True)

    engine = InferenceEngine()
    cfg = InferenceConfig(confidence_threshold=0.9)

    triggered_preds = engine.run_inference(
        "test_assets/images/tactical_sample_021.jpg", backdoored_ts, config=cfg
    )
    assert any(p.class_name == "military_vehicle" and p.confidence >= 0.99 for p in triggered_preds)

    clean_preds_on_clean_image = engine.run_inference(
        "test_assets/images/tactical_sample_001.jpg", backdoored_ts, config=cfg
    )
    assert not any(p.confidence >= 0.99 for p in clean_preds_on_clean_image), (
        "the backdoor must be input-conditional -- it must not fire on an image without the trigger"
    )

    clean_model_on_triggered_image = engine.run_inference(
        "test_assets/images/tactical_sample_021.jpg", clean_ts, config=cfg
    )
    assert not any(p.confidence >= 0.99 for p in clean_model_on_triggered_image), (
        "the clean model must be unaffected by the trigger patch"
    )


def test_pytorch_parameter_analysis_flags_backdoored_torchscript_weights(tmp_path):
    """Mirrors test_real_parameter_analysis_flags_backdoored_weights (the
    ONNX version) but for TorchScript: real parameter tensors, extracted
    via ParameterAnalyzer.extract_pytorch_weight_tensors, must show the
    backdoored model's extra trigger-branch weights as a real kurtosis
    anomaly -- not an identical or fabricated result for both models."""
    clean_ts = str(tmp_path / "clean.torchscript")
    backdoored_ts = str(tmp_path / "backdoored.torchscript")
    AssetGenerator.generate_torchscript_model(clean_ts, is_backdoored=False)
    AssetGenerator.generate_torchscript_model(backdoored_ts, is_backdoored=True)

    analyzer = ParameterAnalyzer()

    clean_tensors = analyzer.extract_pytorch_weight_tensors(torch.jit.load(clean_ts, map_location="cpu"))
    clean_stats, clean_findings = analyzer.analyze_weights_and_activations(
        "clean_ts", ModelAccessLevel.WHITE_BOX, clean_tensors, model_format="PyTorch/TorchScript"
    )
    assert clean_stats["status"] == "COMPLETED"
    assert len(clean_findings) == 0

    backdoored_tensors = analyzer.extract_pytorch_weight_tensors(torch.jit.load(backdoored_ts, map_location="cpu"))
    backdoored_stats, backdoored_findings = analyzer.analyze_weights_and_activations(
        "backdoored_ts", ModelAccessLevel.WHITE_BOX, backdoored_tensors, model_format="PyTorch/TorchScript"
    )
    assert backdoored_stats["status"] == "COMPLETED"
    assert len(backdoored_findings) >= 1
    assert backdoored_stats["max_kurtosis"] > clean_stats["max_kurtosis"]


def test_pytorch_parameter_analysis_works_on_raw_state_dict_checkpoint(tmp_path):
    """Parameter analysis only needs tensor values, not an executable
    forward pass, so it must work on a raw (non-scripted) state_dict
    checkpoint even though that checkpoint cannot be run (see the
    execution test below)."""
    ckpt_path = str(tmp_path / "checkpoint.pt")
    AssetGenerator.generate_torch_checkpoint(ckpt_path)

    loaded = torch.load(ckpt_path, map_location="cpu", weights_only=True)
    analyzer = ParameterAnalyzer()
    tensors = analyzer.extract_pytorch_weight_tensors(loaded)
    assert len(tensors) > 0

    stats, _findings = analyzer.analyze_weights_and_activations(
        "ckpt_model", ModelAccessLevel.WHITE_BOX, tensors, model_format="PyTorch/TorchScript"
    )
    assert stats["status"] == "COMPLETED"
    assert stats["layer_count"] > 0


def test_raw_state_dict_checkpoint_cannot_be_executed_and_is_reported_honestly(tmp_path):
    """A raw state_dict has no attached model code, so InferenceEngine
    cannot run it -- this must surface as an explicit ModelExecutionError,
    never a silently empty or fabricated prediction list."""
    ckpt_path = str(tmp_path / "checkpoint.pt")
    AssetGenerator.generate_torch_checkpoint(ckpt_path)
    AssetGenerator.ensure_test_assets("test_assets")

    engine = InferenceEngine()
    try:
        engine.run_inference("test_assets/images/tactical_sample_001.jpg", ckpt_path)
        assert False, "expected ModelExecutionError for a non-executable raw state_dict checkpoint"
    except ModelExecutionError as e:
        assert "state_dict" in str(e) or "TorchScript" in str(e)


def test_torchscript_trigger_reconstruction_discovers_the_hidden_backdoor_class(tmp_path):
    """Mirrors test_neural_cleanse_discovers_the_hidden_backdoor_class (the
    ONNX-bridge version) but for a native TorchScript model, loaded and
    differentiated through directly -- no ONNX bridging involved. Must
    independently discover that 'military_vehicle' needs an anomalously
    small reconstructed perturbation, with zero false positives on the
    clean fixture."""
    import glob
    from backend.model_assurance.trigger_reconstruction import run_trigger_reconstruction

    AssetGenerator.ensure_test_assets("test_assets")
    clean_ts = str(tmp_path / "clean.torchscript")
    backdoored_ts = str(tmp_path / "backdoored.torchscript")
    AssetGenerator.generate_torchscript_model(clean_ts, is_backdoored=False)
    AssetGenerator.generate_torchscript_model(backdoored_ts, is_backdoored=True)

    class_names = ["military_vehicle", "infantry", "radar_station", "aircraft", "naval_vessel"]
    clean_images = sorted(glob.glob("test_assets/images/*.jpg"))[:10]

    clean_result, clean_findings = run_trigger_reconstruction(
        "clean_ts_model", clean_ts, clean_images, class_names
    )
    assert clean_result["status"] == "COMPLETED"
    assert len(clean_findings) == 0, "the clean TorchScript model must produce zero false-positive flags"

    bd_result, bd_findings = run_trigger_reconstruction(
        "backdoored_ts_model", backdoored_ts, clean_images, class_names
    )
    assert bd_result["status"] == "COMPLETED"
    assert bd_result["backdoor_suspected"] is True
    flagged_names = {f["class_idx"] for f in bd_result["flagged_classes"]}
    assert 0 in flagged_names  # military_vehicle
    assert len(bd_findings) >= 1
    assert bd_findings[0].finding_type == "unknown_trigger_reconstruction"


def test_trigger_reconstruction_reports_unavailable_for_raw_state_dict_checkpoint(tmp_path):
    """A raw state_dict checkpoint has no attached model code, so
    gradient-based reconstruction cannot run against it -- this must
    degrade to an explicit UNAVAILABLE status with a reason, never raise
    or silently fabricate a result."""
    from backend.model_assurance.trigger_reconstruction import run_trigger_reconstruction

    AssetGenerator.ensure_test_assets("test_assets")
    ckpt_path = str(tmp_path / "checkpoint.pt")
    AssetGenerator.generate_torch_checkpoint(ckpt_path)

    class_names = ["military_vehicle", "infantry", "radar_station", "aircraft", "naval_vessel"]
    clean_images = ["test_assets/images/tactical_sample_001.jpg"]

    result, findings = run_trigger_reconstruction("ckpt_model", ckpt_path, clean_images, class_names)
    assert result["status"] == "UNAVAILABLE"
    assert "state_dict" in result["reason"] or "TorchScript" in result["reason"]
    assert findings == []


def test_api_parameter_analysis_accepts_torchscript_model(tmp_path):
    """End-to-end through the real HTTP API: /api/model/parameter-analysis
    must no longer reject TorchScript models with the old ONNX-only 422 --
    it should run real analysis and return a COMPLETED status."""
    ts_path = tmp_path / "api_test_model.torchscript"
    AssetGenerator.generate_torchscript_model(str(ts_path), is_backdoored=True)

    upload_res = client.post(
        "/api/model/upload",
        files={"file": ("api_test_model.torchscript", _read_bytes(str(ts_path)), "application/octet-stream")},
    )
    assert upload_res.status_code == 200
    saved_path = upload_res.json()["metadata"]["saved_path"]

    res = client.post(
        "/api/model/parameter-analysis",
        json={"model_path": saved_path, "access_level": "WHITE_BOX"},
    )
    assert res.status_code == 200
    stats = res.json()["stats"]
    assert stats["status"] == "COMPLETED"
    assert stats["layer_count"] > 0
