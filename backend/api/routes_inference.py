from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body
from ..inference.inference_engine import InferenceEngine
from ..provenance.verification import ProvenanceVerifier
from ..schemas import BoundingBox, InferenceConfig, InferenceRecord, PreprocessingConfig

router = APIRouter(prefix="/api/inference", tags=["Inference & Provenance"])
engine = InferenceEngine()
verifier = ProvenanceVerifier()


@router.post("/execute", response_model=InferenceRecord)
async def execute_inference(
    image_path: str = Body(default="data/tactical_sample_01.jpg"),
    model_id: str = Body(default="model_yolo_v8_airgap"),
    model_digest: str = Body(default="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
    preprocessing: Optional[PreprocessingConfig] = Body(default=None),
    config: Optional[InferenceConfig] = Body(default=None),
):
    predictions = engine.run_inference(image_path, model_id, preprocessing, config)
    record = verifier.create_record(
        image_path=image_path,
        model_id=model_id,
        model_digest=model_digest,
        predictions=predictions,
        preproc=preprocessing,
        config=config,
    )
    return record


@router.post("/verify")
async def verify_record(record: InferenceRecord, check_replay: bool = False):
    is_valid, errors = verifier.verify_record(record, check_replay=check_replay)
    return {
        "record_id": record.record_id,
        "is_valid": is_valid,
        "tampering_detected": not is_valid,
        "errors": errors,
        "provenance_hash": record.provenance_hash,
        "signature_valid": is_valid,
    }


@router.post("/tamper-simulate")
async def simulate_tamper(
    record: InferenceRecord,
    modified_class: str = "civilian_bus",
    modified_confidence: float = 0.99,
):
    tampered_record = record.model_copy(deep=True)
    if tampered_record.predictions:
        tampered_record.predictions[0].class_name = modified_class
        tampered_record.predictions[0].confidence = modified_confidence
    else:
        tampered_record.predictions.append(
            BoundingBox(class_name=modified_class, confidence=modified_confidence, box=[100, 100, 200, 200])
        )

    is_valid, errors = verifier.verify_record(tampered_record)
    tampered_record.is_valid = is_valid
    tampered_record.tampering_detected = not is_valid
    tampered_record.verification_errors = errors

    return {
        "original_provenance_hash": record.provenance_hash,
        "tampered_record": tampered_record,
        "is_valid": is_valid,
        "tampering_detected": not is_valid,
        "verification_errors": errors,
    }
