import numpy as np
from PIL import Image

from backend.data_assurance.poisoning_detector import PoisoningDetector
from backend.ingestion.dataset_loader import SampleItem
from backend.schemas import RecommendedDisposition


def _save(path, arr):
    Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(path)


def _make_trigger_template(tmp_path):
    rng = np.random.RandomState(42)
    template = rng.rand(12, 12, 3).astype(np.float32)
    path = str(tmp_path / "trigger_template.png")
    _save(path, template)
    return path, template


def test_matched_filter_finds_trigger_anywhere_in_frame_not_just_the_corner(tmp_path):
    """The old corner-only heuristic could never find a trigger planted in
    the middle of the frame. The real matched-filter search must."""
    detector = PoisoningDetector()
    template_path, template = _make_trigger_template(tmp_path)

    rng = np.random.RandomState(1)
    scene = rng.rand(96, 96, 3).astype(np.float32) * 0.3
    # Plant the trigger in the CENTER of the image, far from any corner.
    scene[40:52, 40:52, :] = template
    clean_path = str(tmp_path / "scene_with_center_trigger.png")
    _save(clean_path, scene)

    matched, score, location = detector.matched_filter_search(clean_path, template_path)
    assert matched is True
    assert score >= detector.matched_filter_z_threshold
    assert location is not None

    # The old corner-only heuristic must NOT see anything here -- proves
    # the matched filter is doing genuinely different, stronger work.
    corner_detected, _ = detector.inspect_corner_patch(clean_path)
    assert corner_detected is False


def test_matched_filter_reports_no_match_on_a_clean_image(tmp_path):
    detector = PoisoningDetector()
    template_path, _ = _make_trigger_template(tmp_path)

    rng = np.random.RandomState(2)
    clean_scene = (rng.rand(96, 96, 3).astype(np.float32) * 0.5) + 0.25
    clean_path = str(tmp_path / "clean_scene.png")
    _save(clean_path, clean_scene)

    matched, score, location = detector.matched_filter_search(clean_path, template_path)
    assert matched is False


def test_metadata_only_declared_trigger_is_capped_at_review_never_quarantine(tmp_path):
    """A sample whose ONLY evidence is the contributor's own untrusted
    metadata claim must never drive a CRITICAL/QUARANTINE finding -- that
    would let a contributor's self-report alone trigger the harshest
    disposition with no independent corroboration."""
    detector = PoisoningDetector()

    rng = np.random.RandomState(3)
    plain_scene = (rng.rand(64, 64, 3).astype(np.float32) * 0.4) + 0.3
    image_path = str(tmp_path / "plain.png")
    _save(image_path, plain_scene)

    samples = [
        SampleItem(
            sample_id="s1",
            image_path=image_path,
            labels=["truck"],
            boxes=[[0, 0, 10, 10]],
            contributor_id="contributor_x",
            batch_id="batch_1",
            metadata={"poisoned": True, "trigger_type": "declared_but_unverified"},
        )
    ]

    findings, stats = detector.analyze(samples, "ds_meta_only")

    assert stats["metadata_only_hit_count"] == 1
    assert stats["matched_filter_hit_count"] == 0
    metadata_findings = [f for f in findings if f.finding_id == "FINDING-TRIGGER-003"]
    assert len(metadata_findings) == 1
    finding = metadata_findings[0]
    assert finding.confidence <= 0.5
    assert finding.recommended_action == RecommendedDisposition.REVIEW


def test_real_matched_filter_hit_is_quarantine_grade(tmp_path):
    detector = PoisoningDetector()
    template_path, template = _make_trigger_template(tmp_path)

    rng = np.random.RandomState(4)
    scene = rng.rand(64, 64, 3).astype(np.float32) * 0.3
    scene[5:17, 5:17, :] = template
    image_path = str(tmp_path / "triggered.png")
    _save(image_path, scene)

    samples = [
        SampleItem(
            sample_id="s1",
            image_path=image_path,
            labels=["truck"],
            boxes=[[0, 0, 10, 10]],
            contributor_id="contributor_y",
            batch_id="batch_1",
            metadata={},
        )
    ]

    findings, stats = detector.analyze(samples, "ds_matched", trigger_reference_path=template_path)

    assert stats["matched_filter_hit_count"] == 1
    matched_findings = [f for f in findings if f.finding_id == "FINDING-TRIGGER-001"]
    assert len(matched_findings) == 1
    assert matched_findings[0].confidence >= 0.9
    assert matched_findings[0].recommended_action == RecommendedDisposition.QUARANTINE
