from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
from ..audit.audit_log import shared_ledger
from ..inference.inference_engine import InferenceEngine
from ..ingestion.model_loader import ModelLoader
from ..ingestion.upload_store import save_upload
from ..model_assurance.access_detector import ModelAccessDetector
from ..model_assurance.backdoor_detector import BackdoorDetector
from ..model_assurance.behaviour_analyzer import BehaviourAnalyzer
from ..model_assurance.fingerprint import ModelFingerprinter
from ..model_assurance.parameter_analyzer import ParameterAnalyzer
from ..model_assurance.trigger_reconstruction import run_trigger_reconstruction
from ..persistence import db
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
    access_level: ModelAccessLevel = Form(default=ModelAccessLevel.WHITE_BOX),
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

    db.insert_model_record(fp.model_dump(), saved_path=saved_path)

    shared_ledger.record_event(
        "MODEL_UPLOAD", fp.model_id, "FINGERPRINT_GENERATED", fp.sha256_digest,
        "COMPLETED", f"Uploaded '{file.filename}' ({size_bytes} bytes), access_level={access_level.value}, format={fp.model_format}."
    )
    return fp


@router.get("/list")
async def list_uploaded_models(limit: int = 100):
    """Real query against the persisted model records table -- every model
    ever fingerprinted through this service, not recomputed on the fly."""
    return {"models": db.list_model_records(limit=limit)}


@router.get("/{model_id}")
async def get_uploaded_model(model_id: str):
    record = db.get_model_record(model_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"No stored model record for model_id={model_id}")
    return record


@router.post("/fingerprint", response_model=ModelFingerprint)
async def generate_model_fingerprint(
    model_path: str = Body(..., embed=True, description="Server-local path to a previously uploaded or staged model file."),
    access_level: ModelAccessLevel = Body(default=ModelAccessLevel.WHITE_BOX, embed=True),
):
    try:
        fp = fingerprinter.generate_fingerprint(model_path, access_level=access_level)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    db.insert_model_record(fp.model_dump(), saved_path=model_path)

    shared_ledger.record_event(
        "MODEL_FINGERPRINT", fp.model_id, "DIGEST_VERIFICATION", fp.sha256_digest,
        "COMPLETED", f"Fingerprinted '{model_path}' at access_level={access_level.value}."
    )
    return fp


@router.post("/verify-digest")
async def verify_model_digest(
    supplied_fingerprint: ModelFingerprint,
    expected_reference_digest: Optional[str] = Body(
        default=None,
        description="Declared trusted reference digest. Omit or send null/empty when no reference has been "
        "registered for this model -- the response will then report NO_REFERENCE rather than a false MATCH.",
    ),
):
    status, finding = fingerprinter.verify_digest(supplied_fingerprint, expected_reference_digest)
    shared_ledger.record_event(
        "MODEL_FINGERPRINT", supplied_fingerprint.model_id, "VERIFY_AGAINST_REFERENCE", supplied_fingerprint.sha256_digest,
        status.value,
        f"Compared against reference digest {expected_reference_digest[:16]}..." if expected_reference_digest
        else "No reference digest declared for this model.",
    )
    return {
        "is_match": status.value == "MATCH",
        "status": status,
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
    access_level: ModelAccessLevel = Body(
        default=ModelAccessLevel.WHITE_BOX, embed=True,
        description="The access level actually authorized for this model. When BLACK_BOX, weight "
        "extraction is skipped entirely and the response reports the assessment as unavailable -- "
        "parseable ONNX bytes alone do not imply the caller is authorized to inspect the weights.",
    ),
):
    """Extracts the real ONNX initializer weight tensors from the supplied
    model file and runs weight-distribution/kurtosis analysis on them.
    Only available for ONNX models under white-box access -- there is no
    fallback that fabricates weight tensors, and no fallback that silently
    performs white-box analysis when the caller declared black-box access."""
    import os
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail=f"Model file not found at: {model_path}")

    resolved_id = model_id or f"model_{ModelLoader.calculate_file_sha256(model_path)[:12]}"

    if access_level != ModelAccessLevel.WHITE_BOX:
        stats, findings = param_analyzer.analyze_weights_and_activations(resolved_id, access_level, None)
        shared_ledger.record_event(
            "MODEL_ASSESSMENT", resolved_id, "PARAMETER_ANALYSIS", ModelLoader.calculate_file_sha256(model_path),
            "UNAVAILABLE_BLACK_BOX", "Parameter/weight analysis skipped: caller declared BLACK_BOX access."
        )
        return {"stats": stats, "findings": findings}

    if not model_path.lower().endswith(".onnx"):
        raise HTTPException(status_code=422, detail="White-box parameter analysis currently supports ONNX models only.")

    import onnx
    try:
        onnx_model = onnx.load(model_path)
        onnx.checker.check_model(onnx_model)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse ONNX model: {e}")

    weight_tensors = param_analyzer.extract_onnx_weight_tensors(onnx_model)
    stats, findings = param_analyzer.analyze_weights_and_activations(resolved_id, ModelAccessLevel.WHITE_BOX, weight_tensors)

    shared_ledger.record_event(
        "MODEL_ASSESSMENT", resolved_id, "PARAMETER_ANALYSIS", ModelLoader.calculate_file_sha256(model_path),
        "ANOMALOUS" if findings else "NORMAL", f"White-box weight analysis completed: {len(findings)} finding(s)."
    )
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

    shared_ledger.record_event(
        "MODEL_ASSESSMENT", candidate_id, "BEHAVIOURAL_BATTERY", ModelLoader.calculate_file_sha256(candidate_model_path),
        assessment.assessment_status, f"{len(probe_image_paths)} probes vs reference {reference_id}: {len(findings)} finding(s)."
    )
    return {
        "assessment": assessment,
        "findings": findings,
        "battery": battery,
    }


@router.post("/trigger-reconstruction")
async def run_unknown_trigger_reconstruction(
    model_path: str = Body(..., embed=True, description="Server-local path to the model under assessment."),
    clean_image_paths: List[str] = Body(..., embed=True, description="Real clean images to reconstruct triggers against."),
    class_names: List[str] = Body(..., embed=True),
    model_id: Optional[str] = Body(default=None, embed=True),
):
    """Blind, gradient-based unknown-trigger reconstruction (Neural
    Cleanse). Unlike /behaviour-battery, this is never told what a
    trigger looks like -- it optimizes one from scratch per candidate
    class and flags any class that needs a suspiciously small
    perturbation to hijack. WHITE_BOX-only, and further scoped to models
    whose ONNX graph this system can bridge into a differentiable
    framework; reports UNAVAILABLE with a reason otherwise, never a
    silent skip."""
    import os
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail=f"Model file not found: {model_path}")

    resolved_id = model_id or f"model_{ModelLoader.calculate_file_sha256(model_path)[:12]}"
    result, findings = run_trigger_reconstruction(resolved_id, model_path, clean_image_paths, class_names)

    shared_ledger.record_event(
        "MODEL_ASSESSMENT", resolved_id, "UNKNOWN_TRIGGER_RECONSTRUCTION", ModelLoader.calculate_file_sha256(model_path),
        result.get("status", "UNKNOWN"),
        f"backdoor_suspected={result.get('backdoor_suspected')}, {len(findings)} finding(s)." if result.get("status") == "COMPLETED"
        else result.get("reason", ""),
    )
    return {"result": result, "findings": findings}
