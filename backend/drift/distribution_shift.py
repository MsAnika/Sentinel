from typing import Any, Dict, List, Optional
import numpy as np
from ..schemas import DistributionShiftReport


class DistributionShiftDetector:
    def __init__(self, drift_threshold: float = 0.30):
        self.drift_threshold = drift_threshold

    def evaluate_shift(
        self,
        reference_profile: Dict[str, Any],
        observed_samples_metadata: List[Dict[str, Any]],
        declared_reference_id: str = "ref_plains_optical_baseline",
        observed_dataset_id: str = "dataset_obs_01",
    ) -> DistributionShiftReport:
        total = max(1, len(observed_samples_metadata))

        terrain_counts: Dict[str, int] = {}
        sensor_counts: Dict[str, int] = {}
        illum_values: List[float] = []

        for meta in observed_samples_metadata:
            t = meta.get("terrain", "plains")
            s = meta.get("sensor", "EO_optical")
            illum = float(meta.get("illumination", 0.75))
            terrain_counts[t] = terrain_counts.get(t, 0) + 1
            sensor_counts[s] = sensor_counts.get(s, 0) + 1
            illum_values.append(illum)

        ref_terrain = reference_profile.get("terrain", "plains")
        ref_sensor = reference_profile.get("sensor", "EO_optical")
        ref_illum = float(reference_profile.get("mean_illumination", 0.75))

        non_ref_terrain_ratio = 1.0 - (terrain_counts.get(ref_terrain, 0) / total)
        non_ref_sensor_ratio = 1.0 - (sensor_counts.get(ref_sensor, 0) / total)
        mean_obs_illum = float(np.mean(illum_values)) if illum_values else ref_illum
        illum_drift = abs(mean_obs_illum - ref_illum)

        dim_scores = {
            "terrain_shift": float(round(non_ref_terrain_ratio, 3)),
            "sensor_divergence": float(round(non_ref_sensor_ratio, 3)),
            "illumination_delta": float(round(illum_drift, 3)),
            "seasonal_variance": float(round(min(1.0, non_ref_terrain_ratio * 0.8), 3)),
        }

        overall_drift = float(
            round(
                (dim_scores["terrain_shift"] * 0.4)
                + (dim_scores["sensor_divergence"] * 0.3)
                + (dim_scores["illumination_delta"] * 0.2)
                + (dim_scores["seasonal_variance"] * 0.1),
                3,
            )
        )

        drift_detected = overall_drift >= self.drift_threshold
        is_manipulation = non_ref_sensor_ratio > 0.6 and illum_drift > 0.4

        if drift_detected:
            char = f"Significant operational domain shift detected ({overall_drift*100:.1f}% aggregate divergence)."
            suspected = "Adversarial domain perturbation / uncalibrated sensor" if is_manipulation else "Seasonal or geographical terrain transition"
            reasoning = "Observed distributions deviate substantially from declared baseline reference features."
        else:
            char = "Observed inputs operate within standard declared operational envelope."
            suspected = "Normal operational tolerance"
            reasoning = "Feature divergences remain within accepted statistical tolerance limits."

        return DistributionShiftReport(
            declared_reference_id=declared_reference_id,
            observed_dataset_id=observed_dataset_id,
            overall_drift_score=overall_drift,
            drift_detected=drift_detected,
            confidence=0.93,
            affected_dimensions=dim_scores,
            characterization=char,
            suspected_cause=suspected,
            is_manipulation_suspected=is_manipulation,
            reasoning=reasoning,
        )
