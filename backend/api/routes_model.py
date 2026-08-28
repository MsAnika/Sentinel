from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body
from ..model_assurance.access_detector import ModelAccessDetector
from ..model_assurance.backdoor_detector import BackdoorDetector
from ..model_assurance.behaviour_analyzer import BehaviourAnalyzer
from ..model_assurance.fingerprint import ModelFingerprinter
from ..model_assurance.parameter_analyzer import ParameterAnalyzer
from ..schemas import ModelAccessLevel, ModelFingerprint

router = APIRouter(prefix="/api/model", tags=["Model Assurance"])
fingerprinter = ModelFingerprinter()
behaviour_analyzer = BehaviourAnalyzer()
backdoor_detector = BackdoorDetector()
param_analyzer = ParameterAnalyzer()


@router.post("/fingerprint", response_model=ModelFingerprint)
async def generate_model_fingerprint(
    model_name: str = Body(default="YOLOv8-Tactical-v1.onnx"),
    architecture: str = Body(default="YOLOv8s Vision Backbone"),
    access_level: ModelAccessLevel = Body(default=ModelAccessLevel.WHITE_BOX),
):
    return fingerprinter.generate_fingerprint(
        model_path=f"models/{model_name}",
        model_name=model_name,
        architecture=architecture,
        access_level=access_level,
    )


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


@router.post("/behaviour-battery")
async def run_behaviour_battery(
    model_id: str = Body(default="model_yolov8_tactical"),
    reference_model_id: str = Body(default="ref_yolov8_baseline"),
    test_battery_results: Optional[List[Dict[str, Any]]] = Body(default=None),
    access_level: ModelAccessLevel = Body(default=ModelAccessLevel.WHITE_BOX),
):
    probes = test_battery_results or [
        {
            "probe_id": f"probe_{i}",
            "expected_class": "military_vehicle",
            "observed_class": "military_vehicle",
            "expected_confidence": 0.94,
            "observed_confidence": 0.92,
        }
        for i in range(25)
    ]
    assessment, findings = behaviour_analyzer.evaluate_test_battery(model_id, reference_model_id, probes, access_level)
    return {
        "assessment": assessment,
        "findings": findings,
    }
