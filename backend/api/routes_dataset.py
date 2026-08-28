import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, HTTPException
from ..data_assurance.contributor_risk import ContributorRiskEngine
from ..data_assurance.duplicate_detector import DuplicateDetector
from ..data_assurance.label_analyzer import LabelAnalyzer
from ..data_assurance.ood_detector import OODDetector
from ..data_assurance.poisoning_detector import PoisoningDetector
from ..ingestion.dataset_loader import DatasetLoader, SampleItem
from ..schemas import DatasetProfile

router = APIRouter(prefix="/api/dataset", tags=["Dataset Assurance"])
dup_detector = DuplicateDetector()
label_analyzer = LabelAnalyzer()
ood_detector = OODDetector()
poison_detector = PoisoningDetector()
contrib_engine = ContributorRiskEngine()


@router.post("/analyze-profile")
async def analyze_dataset_profile(
    dataset_id: str = Body(default="dataset_01"),
    format_type: str = Body(default="COCO", description="'COCO' or 'YOLO'"),
    coco_path: Optional[str] = Body(default=None, description="Server-local path to a COCO-format annotations JSON file."),
    images_dir: Optional[str] = Body(default=None, description="Directory containing the images referenced by coco_path (defaults to the JSON's own directory)."),
    yolo_dir: Optional[str] = Body(default=None, description="Server-local directory containing YOLO images/ and labels/ subfolders."),
    class_names: Optional[List[str]] = Body(default=None),
):
    """Runs the full dataset-integrity pipeline against a real, caller-supplied
    COCO or YOLO dataset already staged on the server's filesystem (the
    normal ingestion pattern for an air-gapped deployment). There is no
    synthetic-sample fallback: an invalid or missing path is a 404/422, not
    a silently fabricated dataset."""
    if format_type.upper() == "COCO":
        if not coco_path:
            raise HTTPException(status_code=422, detail="coco_path is required when format_type='COCO'.")
        if not os.path.exists(coco_path):
            raise HTTPException(status_code=404, detail=f"coco_path not found: {coco_path}")
        samples: List[SampleItem] = DatasetLoader.load_coco(coco_path, images_dir)
    elif format_type.upper() == "YOLO":
        if not yolo_dir:
            raise HTTPException(status_code=422, detail="yolo_dir is required when format_type='YOLO'.")
        if not os.path.isdir(yolo_dir):
            raise HTTPException(status_code=404, detail=f"yolo_dir not found: {yolo_dir}")
        samples = DatasetLoader.load_yolo(yolo_dir, class_names)
    else:
        raise HTTPException(status_code=422, detail="format_type must be 'COCO' or 'YOLO'.")

    is_valid, structure_errors = DatasetLoader.validate_dataset_structure(samples)
    if not samples:
        raise HTTPException(status_code=422, detail="Dataset contains zero valid samples.")

    d_finds, d_stats = dup_detector.analyze(samples, dataset_id)
    l_finds, l_stats = label_analyzer.analyze(samples, dataset_id)
    o_finds, o_stats = ood_detector.analyze(samples, dataset_id)
    p_finds, p_stats = poison_detector.analyze(samples, dataset_id)

    contrib_risks = contrib_engine.aggregate_risk(samples, d_stats, l_stats, o_stats, p_stats)

    classes = class_names or sorted({label for s in samples for label in s.labels})
    class_dist: Dict[str, int] = {}
    for s in samples:
        for l in s.labels:
            class_dist[l] = class_dist.get(l, 0) + 1

    contributors = sorted({s.contributor_id for s in samples})
    batches = sorted({s.batch_id for s in samples})

    profile = DatasetProfile(
        dataset_id=dataset_id,
        format=format_type.upper(),
        total_images=len(samples),
        total_annotations=sum(len(s.labels) for s in samples),
        classes=classes,
        class_distribution=class_dist,
        contributors=contributors,
        batches=batches,
        duplicate_clusters_count=d_stats["total_duplicate_clusters"],
        label_anomaly_count=l_stats["total_label_anomalies"],
        ood_sample_count=o_stats["total_ood_samples"],
        trigger_anomaly_count=p_stats["total_trigger_samples"],
        contributor_risks=contrib_risks,
    )

    return {
        "profile": profile,
        "findings": d_finds + l_finds + o_finds + p_finds,
        "duplicate_stats": d_stats,
        "label_stats": l_stats,
        "ood_stats": o_stats,
        "poison_stats": p_stats,
        "structure_warnings": structure_errors,
    }
