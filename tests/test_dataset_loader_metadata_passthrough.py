import json
import os
from backend.ingestion.dataset_loader import DatasetLoader


def test_load_coco_passes_through_declared_annotation_and_image_metadata(tmp_path):
    """Contributors declare ground-truth/attack metadata (has_trigger,
    poisoned, true_label, label_flipped, is_ood, ...) directly on COCO
    image/annotation entries -- this is the mechanism the PS's own data
    policy and this project's detectors (poisoning_detector, label_analyzer,
    ood_detector) are built around. Before this fix, `load_coco` silently
    dropped every field outside a small fixed allow-list, so an uploaded
    COCO archive declaring these fields never actually reached the
    detectors -- only tests that built SampleItem objects directly in
    Python (bypassing this loader entirely) ever exercised that code path."""
    images_dir = tmp_path / "images"
    images_dir.mkdir()
    (images_dir / "sample1.jpg").write_bytes(b"\xff\xd8\xff\xe0fake-jpeg-bytes")

    coco = {
        "images": [
            {
                "id": 1,
                "file_name": "sample1.jpg",
                "width": 64,
                "height": 64,
                "contributor": "contributor_bravo",
                "is_ood": True,
                "custom_image_field": "value_a",
            }
        ],
        "annotations": [
            {
                "id": 1,
                "image_id": 1,
                "category_id": 0,
                "bbox": [0, 0, 10, 10],
                "has_trigger": True,
                "poisoned": True,
                "trigger_type": "synthetic_patch_32x32",
                "true_label": "military_vehicle",
                "label_flipped": True,
            }
        ],
        "categories": [{"id": 0, "name": "military_vehicle"}],
    }
    coco_path = tmp_path / "coco.json"
    coco_path.write_text(json.dumps(coco))

    samples = DatasetLoader.load_coco(str(coco_path), images_dir=str(images_dir))
    assert len(samples) == 1
    meta = samples[0].metadata

    assert meta.get("has_trigger") is True
    assert meta.get("poisoned") is True
    assert meta.get("trigger_type") == "synthetic_patch_32x32"
    assert meta.get("true_label") == "military_vehicle"
    assert meta.get("label_flipped") is True
    assert meta.get("is_ood") is True
    assert meta.get("custom_image_field") == "value_a"

    # Structural fields must still resolve to their dedicated SampleItem
    # attributes, not leak duplicated/conflicting metadata entries.
    assert samples[0].contributor_id == "contributor_bravo"
    assert "id" not in meta
    assert "image_id" not in meta
    assert "bbox" not in meta
