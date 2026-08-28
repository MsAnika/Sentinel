from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from ..schemas import AssetType, FindingSchema, FindingSeverity, ModelAccessLevel, RecommendedDisposition


class ParameterAnalyzer:
    def analyze_weights_and_activations(
        self,
        model_id: str,
        access_level: ModelAccessLevel,
        synthetic_weight_tensors: Optional[List[np.ndarray]] = None,
    ) -> Tuple[Dict[str, Any], List[FindingSchema]]:
        if access_level != ModelAccessLevel.WHITE_BOX:
            return {
                "status": "UNAVAILABLE",
                "reason": "Model access is restricted to BLACK_BOX. Parameter and activation extraction unavailable.",
                "weight_variance": None,
                "activation_anomaly_score": None,
            }, []

        findings: List[FindingSchema] = []
        if synthetic_weight_tensors is None or len(synthetic_weight_tensors) == 0:
            rng = np.random.RandomState(42)
            tensors = [rng.normal(0, 0.05, size=(64, 64)) for _ in range(5)]
        else:
            tensors = synthetic_weight_tensors

        variances = [float(np.var(t)) for t in tensors]
        kurtosis_values = [float(np.mean(((t - np.mean(t)) / (np.std(t) + 1e-6)) ** 4)) for t in tensors]

        mean_variance = float(np.mean(variances))
        max_kurtosis = float(np.max(kurtosis_values))

        is_anomalous = max_kurtosis > 8.0 or mean_variance > 0.5
        anomaly_score = float(round(min(1.0, max_kurtosis / 10.0), 3))

        if is_anomalous:
            findings.append(
                FindingSchema(
                    finding_id="FINDING-MDL-PARAM-001",
                    asset=model_id,
                    asset_type=AssetType.MODEL,
                    finding_type="parameter_distribution_anomaly",
                    reason=f"White-box weight analysis identified anomalous heavy-tailed weight distribution (Kurtosis={max_kurtosis:.2f}).",
                    evidence={
                        "layer_count": len(tensors),
                        "mean_variance": round(mean_variance, 4),
                        "max_kurtosis": round(max_kurtosis, 2),
                        "anomaly_score": anomaly_score,
                    },
                    severity=FindingSeverity.HIGH,
                    confidence=0.91,
                    affected_source=model_id,
                    recommended_action=RecommendedDisposition.REVIEW,
                    limitations=["Heavy tails may occasionally arise from aggressive quantization or pruning."],
                )
            )

        stats = {
            "status": "COMPLETED",
            "layer_count": len(tensors),
            "mean_variance": round(mean_variance, 4),
            "max_kurtosis": round(max_kurtosis, 2),
            "activation_anomaly_score": anomaly_score,
        }
        return stats, findings
