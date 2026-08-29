from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, File, HTTPException, UploadFile
from ..audit.audit_log import shared_ledger
from ..inference.inference_engine import InferenceEngine
from ..ingestion.model_loader import ModelLoader
from ..ingestion.upload_store import save_upload
from ..model_assurance.access_detector import ModelAccessDetector
from ..model_assurance.backdoor_detector import BackdoorDetector
from ..model_assurance.behaviour_analyzer import BehaviourAnalyzer
from ..model_assurance.fingerprint import ModelFingerprinter
from ..model_assurance.parameter_analyzer import ParameterAnalyzer
from ..schemas import InferenceConfig, ModelAccessLevel, ModelFingerprint
from ..scenarios.probe_builder import build_reference_battery

router = APIRouter(prefix="/api/model", tags=["Model Assurance"])
fingerprinter = ModelFingerprinter()
behaviour_analyzer = BehaviourAnalyzer()
backdoor_detector = BackdoorDetector()
param_analyzer = ParameterAnalyzer()
inference_engine = InferenceEngine()


@router.post("/upload", response_model=ModelFingerprint)
async def upload_model(
    file: UploadFile = File(...),
    access_level: ModelAccessLevel = ModelAccessLevel.WHITE_BOX,
):
    """Accepts a real uploaded ONNX/PyTorch/TorchScript model file, persists
    it, and returns a fingerprint derived from the file's actual bytes and
    (when parseable) its real graph/checkpoint metadata."""
    try:
        saved_path, size_bytes = await save_upload(file, "models")
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))

    try:
        fp = fingerprinter.generate_fingerprint(saved_path, access_level=access_level)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to inspect uploaded model: {e}")

    fp.metadata["saved_path"] = saved_path
    fp.metadata["original_filename"] = file.filename
    if file.filename:
        fp.model_name = file.filename

    shared_ledger.record_event(
        "MODEL_UPLOAD", fp.model_id, "FINGERPRINT_GENERATED", fp.sha256_digest,
        "COMPLETED", f"Uploaded '{file.filename}' ({size_bytes} bytes), access_level={access_level.value}, format={fp.model_format}."
    )
    return fp


@router.post("/fingerprint", response_model=ModelFingerprint)
async def generate_model_fingerprint(
    model_path: str = Body(..., embed=True, description="Server-local path to a previously uploaded or staged model file."),
    access_level: ModelAccessLevel = Body(default=ModelAccessLevel.WHITE_BOX, embed=True),
):
    try:
        return fingerprinter.generate_fingerprint(model_path, access_level=access_level)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/verify-digest")
async def verify_model_digest(
    supplied_fingerprint: ModelFingerprint,
    expected_reference_digest: str = Body(...),
):
    is_match, finding = fingerprinter.verify_against_reference(supplied_fingerprint, expected_reference_digest)
    return {
        "is_match": is_match,
        "status": "MATCH" if is_match else "MISMATCH_SUBSTITUTION_SUSPECTED",
        "finding": finding,
    }


@router.post("/access-capabilities")
async def get_access_capabilities(access_level: ModelAccessLevel):
    return {
        "access_level": access_level,
        "supported_methods": ModelAccessDetector.get_supported_methods(access_level),
        "unavailable_methods": ModelAccessDetector.get_unavailable_methods(access_level),
    }


@router.post("/parameter-analysis")
async def run_parameter_analysis(
    model_path: str = Body(..., embed=True),
    model_id: Optional[str] = Body(default=None, embed=True),
):
    """Extracts the real ONNX initializer weight tensors from the supplied
    model file and runs weight-distribution/kurtosis analysis on them.
    Only available for ONNX models under white-box access -- there is no
    fallback that fabricates weight tensors."""
    import os
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail=f"Model file not found at: {model_path}")
    if not model_path.lower().endswith(".onnx"):
        raise HTTPException(status_code=422, detail="Parameter analysis currently supports ONNX models only.")

    import onnx
    try:
        onnx_model = onnx.load(model_path)
        onnx.checker.check_model(onnx_model)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse ONNX model: {e}")

    weight_tensors = param_analyzer.extract_onnx_weight_tensors(onnx_model)
    resolved_id = model_id or f"model_{ModelLoader.calculate_file_sha256(model_path)[:12]}"
    stats, findings = param_analyzer.analyze_weights_and_activations(resolved_id, ModelAccessLevel.WHITE_BOX, weight_tensors)
    return {"stats": stats, "findings": findings}


@router.post("/behaviour-battery")
async def run_behaviour_battery(
    reference_model_path: str = Body(...),
    candidate_model_path: str = Body(...),
    probe_image_paths: List[str] = Body(...),
    access_level: ModelAccessLevel = Body(default=ModelAccessLevel.WHITE_BOX),
    confidence_threshold: float = Body(default=0.25),
):
    """Runs a real behavioural test battery: the same probe images are
    actually executed through both the trusted reference model and the
    candidate model, and their real predictions are compared. There is no
    scripted-probe fallback."""
    import os
    for p in (reference_model_path, candidate_model_path, *probe_image_paths):
        if not os.path.exists(p):
            raise HTTPException(status_code=404, detail=f"File not found: {p}")

    from ..ingestion.dataset_loader import SampleItem
    config = InferenceConfig(confidence_threshold=confidence_threshold)
    samples = [SampleItem(sample_id=f"probe_{i}", image_path=p, labels=[], boxes=[]) for i, p in enumerate(probe_image_paths)]

    battery = build_reference_battery(inference_engine, reference_model_path, candidate_model_path, samples, config)
    reference_id = f"model_{ModelLoader.calculate_file_sha256(reference_model_path)[:12]}"
    candidate_id = f"model_{ModelLoader.calculate_file_sha256(candidate_model_path)[:12]}"
    assessment, findings = behaviour_analyzer.evaluate_test_battery(candidate_id, reference_id, battery, access_level)
    return {
        "assessment": assessment,
        "findings": findings,
        "battery": battery,
    }
