from typing import Dict, List, Tuple
from ..schemas import ModelAccessLevel


class ModelAccessDetector:
    AVAILABLE_TECHNIQUES: Dict[ModelAccessLevel, List[str]] = {
        ModelAccessLevel.WHITE_BOX: [
            "sha256_canonical_weight_digest",
            "layer_parameter_distribution_analysis",
            "activation_anomaly_inspection",
            "reference_test_battery_comparison",
            "behavioural_fingerprinting",
            "universal_trigger_reconstruction",
        ],
        ModelAccessLevel.BLACK_BOX: [
            "file_sha256_digest",
            "input_output_inference_profiling",
            "reference_test_battery_comparison",
            "behavioural_fingerprinting",
            "blackbox_trigger_perturbation_probe",
        ],
    }

    UNAVAILABLE_REASONS: Dict[str, str] = {
        "layer_parameter_distribution_analysis": "White-box parameter tensor access not available for this model endpoint.",
        "activation_anomaly_inspection": "Intermediate activation hooks require white-box model execution graphs.",
        "universal_trigger_reconstruction": "Gradient-based trigger inversion requires white-box gradient computation.",
    }

    @staticmethod
    def get_supported_methods(access_level: ModelAccessLevel) -> List[str]:
        return ModelAccessDetector.AVAILABLE_TECHNIQUES.get(access_level, [])

    @staticmethod
    def get_unavailable_methods(access_level: ModelAccessLevel) -> List[Tuple[str, str]]:
        if access_level == ModelAccessLevel.WHITE_BOX:
            return []
        unavailable = []
        for method, reason in ModelAccessDetector.UNAVAILABLE_REASONS.items():
            unavailable.append((method, reason))
        return unavailable
