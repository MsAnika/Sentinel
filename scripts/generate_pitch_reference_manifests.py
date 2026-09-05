#!/usr/bin/env python3
"""
Completes the pitch demo materials for the two pipeline stages
`generate_pitch_datasets.py` doesn't cover: Model + Inference Records use
the existing generic fixtures in `sample_evaluation_pack/`/`test_assets/`
unmodified (model/inference-provenance checks are format-level, not
branch-thematic, so they don't need a branch-specific version) -- but
Reference Manifests are inherently branch-specific: they're the declared
baseline THIS branch's own operator would have established ahead of time
(terrain/sensor/illumination envelope + a learned embedding-space
baseline), not something derivable from imagery. This script builds one
real (not fabricated) `reference_manifest.json` per branch, computed from
that branch's own `working_coco/` imagery via the same
`EmbeddingExtractor.compute_reference_statistics` the drift detector uses
operationally.

Probe Sets need no separate asset: `/api/model/backdoor-probe`,
`/api/model/behaviour-battery`, and `/api/model/trigger-reconstruction`
all just take a list of real clean image paths and apply the trigger
internally -- so each branch's own `working_coco/images/*.jpg` (or
`working_yolo/images/*.jpg`) already IS a valid probe set, no
regeneration needed. See pitch_dataset/README.md for the exact demo call.
"""
import json
import os
import sys

sys.path.insert(0, os.path.abspath("."))

from backend.drift.embedding_extractor import EmbeddingExtractor
from backend.ingestion.model_loader import ModelLoader
from backend.scenarios.asset_generator import AssetGenerator

OUT_DIR = "pitch_dataset"

BRANCH_DRIFT_PROFILE = {
    "army": {"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.72},
    "navy": {"terrain": "coastal_water", "sensor": "EO_optical", "mean_illumination": 0.68},
    "airforce": {"terrain": "high_altitude", "sensor": "EO_optical", "mean_illumination": 0.81},
}


def main():
    print("Generating pitch_dataset/<branch>/reference_manifest.json ...")

    assets = AssetGenerator.ensure_test_assets("test_assets")
    reference_model_path = assets["clean_model_path"]
    reference_model_digest = ModelLoader.calculate_file_sha256(reference_model_path)
    print(f"  reference model: {reference_model_path} (sha256 {reference_model_digest[:16]}...)")

    for branch, profile in BRANCH_DRIFT_PROFILE.items():
        images_dir = os.path.join(OUT_DIR, branch, "working_coco", "images")
        image_paths = sorted(
            os.path.join(images_dir, f) for f in os.listdir(images_dir) if f.lower().endswith(".jpg")
        )
        if not image_paths:
            print(f"  !! {branch}: no working_coco images found, run generate_pitch_datasets.py first")
            continue

        stats = EmbeddingExtractor.compute_reference_statistics(image_paths)
        if stats is None:
            print(f"  !! {branch}: embedding statistics computation failed")
            continue

        manifest = {
            "declared_reference_id": f"ref_{branch}_operational_baseline_v1",
            "terrain": profile["terrain"],
            "sensor": profile["sensor"],
            "mean_illumination": profile["mean_illumination"],
            "embedding_centroid": stats["embedding_centroid"],
            "embedding_variance": stats["embedding_variance"],
            "embedding_dim": stats["embedding_dim"],
            "reference_sample_count": stats["reference_sample_count"],
            "reference_model_id": f"{branch}_reference_detector_v1",
            "reference_model_sha256": reference_model_digest,
            "reference_model_path": os.path.relpath(reference_model_path, "."),
            "policy_version": "policy-2026.1",
            "notes": (
                "Computed from this branch's own working_coco/ imagery via "
                "EmbeddingExtractor.compute_reference_statistics -- a real, "
                "reproducible baseline, not a fabricated placeholder. Use as "
                "the `reference_profile` body for POST /api/drift/evaluate."
            ),
        }
        manifest_path = os.path.join(OUT_DIR, branch, "reference_manifest.json")
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)
        print(f"  {branch}: {manifest_path} ({stats['reference_sample_count']} reference samples, dim={stats['embedding_dim']})")

    print("\nDone.")


if __name__ == "__main__":
    main()
