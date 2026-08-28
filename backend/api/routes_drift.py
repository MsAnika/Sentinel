from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body
from ..drift.distribution_shift import DistributionShiftDetector
from ..schemas import DistributionShiftReport

router = APIRouter(prefix="/api/drift", tags=["Distribution Shift"])
detector = DistributionShiftDetector()


@router.post("/evaluate", response_model=DistributionShiftReport)
async def evaluate_distribution_shift(
    reference_profile: Optional[Dict[str, Any]] = Body(default=None),
    observed_samples: Optional[List[Dict[str, Any]]] = Body(default=None),
    declared_reference_id: str = Body(default="ref_plains_optical_baseline"),
    observed_dataset_id: str = Body(default="dataset_obs_01"),
):
    ref_prof = reference_profile or {
        "terrain": "plains",
        "sensor": "EO_optical",
        "mean_illumination": 0.75,
    }
    obs_samples = observed_samples or [
        {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.76} for _ in range(30)
    ]
    return detector.evaluate_shift(
        reference_profile=ref_prof,
        observed_samples_metadata=obs_samples,
        declared_reference_id=declared_reference_id,
        observed_dataset_id=observed_dataset_id,
    )
