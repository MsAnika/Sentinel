from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body
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
    dataset_id: str = Body(default="dataset_tactical_01"),
    format_type: str = Body(default="COCO"),
):
    classes = ["military_vehicle", "infantry", "radar_station", "aircraft", "naval_vessel"]
    contributors = ["contributor_alpha", "contributor_bravo", "contributor_charlie"]
    samples: List[SampleItem] = []

    for i in range(40):
        cls = classes[i % len(classes)]
        contrib = contributors[i % len(contributors)]
        samples.append(
            SampleItem(
                sample_id=f"sample_{i+1:03d}",
                image_path=f"data/sample_{i+1:03d}.jpg",
                labels=[cls],
                boxes=[[50, 50, 150, 150]],
                contributor_id=contrib,
                batch_id=f"batch_{1 + (i//15):02d}",
                metadata={"terrain": "plains", "sensor": "EO_optical"},
            )
        )

    d_finds, d_stats = dup_detector.analyze(samples, dataset_id)
    l_finds, l_stats = label_analyzer.analyze(samples, dataset_id)
    o_finds, o_stats = ood_detector.analyze(samples, dataset_id)
    p_finds, p_stats = poison_detector.analyze(samples, dataset_id)

    contrib_risks = contrib_engine.aggregate_risk(samples, d_stats, l_stats, o_stats, p_stats)

    class_dist: Dict[str, int] = {}
    for s in samples:
        for l in s.labels:
            class_dist[l] = class_dist.get(l, 0) + 1

    profile = DatasetProfile(
        dataset_id=dataset_id,
        format=format_type,
        total_images=len(samples),
        total_annotations=sum(len(s.labels) for s in samples),
        classes=classes,
        class_distribution=class_dist,
        contributors=contributors,
        batches=["batch_01", "batch_02", "batch_03"],
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
    }
