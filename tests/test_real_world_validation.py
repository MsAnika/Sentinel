"""Validates IntelX's detectors against real, third-party data: 40 genuine
COCO photographs (fetched directly from the official COCO CDN) and a real,
official, Apache-2.0-licensed YOLOX-Nano ONNX checkpoint (Megvii). See
`real_validation/PROVENANCE.md` for exact sources/licenses/SHA-256.

Every other test in this suite exercises synthetic, deterministically
generated fixtures (`test_assets/`) -- which proves the *pipeline* is
wired correctly, but says nothing about whether the underlying detectors
are actually calibrated for real-world image statistics. These tests are
the real-data counterpart: same detectors, real inputs, no fixture built
to be caught.
"""
import os
import pytest
from PIL import Image, ImageFilter, ImageEnhance
from backend.ingestion.dataset_loader import SampleItem
from backend.ingestion.model_loader import ModelLoader
from backend.inference.inference_engine import InferenceEngine, COCO_80_CLASSES
from backend.model_assurance.fingerprint import ModelFingerprinter
from backend.data_assurance.duplicate_detector import DuplicateDetector
from backend.drift.distribution_shift import DistributionShiftDetector
from backend.schemas import InferenceConfig, ModelAccessLevel, PreprocessingConfig

REAL_IMAGES_DIR = "real_validation/images"
REAL_MODEL_PATH = "real_validation/models/yolox_nano.onnx"
EXPECTED_MODEL_SHA256 = "c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d"

pytestmark = pytest.mark.skipif(
    not os.path.isdir(REAL_IMAGES_DIR) or not os.path.exists(REAL_MODEL_PATH),
    reason="real_validation/ fixtures not present -- see real_validation/PROVENANCE.md to fetch them",
)


def _real_image_paths():
    return sorted(
        os.path.join(REAL_IMAGES_DIR, f)
        for f in os.listdir(REAL_IMAGES_DIR)
        if f.lower().endswith(".jpg")
    )


def _yolox_preproc():
    return PreprocessingConfig(resize=[416, 416], letterbox=True, color_space="BGR", scale_to_unit=False)


def test_real_model_digest_matches_known_provenance():
    """The exact SHA-256 documented in PROVENANCE.md must match what's
    actually on disk -- this is the same digest-integrity check
    FR-05/model_substitution performs on every model IntelX assesses,
    applied here to confirm the checked-in fixture hasn't drifted."""
    digest = ModelLoader.calculate_file_sha256(REAL_MODEL_PATH)
    assert digest == EXPECTED_MODEL_SHA256


def test_real_model_fingerprints_as_white_box_onnx():
    fingerprinter = ModelFingerprinter()
    fp = fingerprinter.generate_fingerprint(REAL_MODEL_PATH, ModelAccessLevel.WHITE_BOX)
    assert fp.model_format == "ONNX"
    assert fp.access_level == ModelAccessLevel.WHITE_BOX
    assert fp.total_parameters == 904482
    assert fp.sha256_digest == EXPECTED_MODEL_SHA256


def test_real_inference_produces_correct_detections_on_real_photos():
    """Spot-checks real inference output against images with unambiguous,
    well-known real-world content -- not just "did it return something,"
    but "did it return the *right* thing." 000000000034.jpg and
    000000000025.jpg are well-known COCO fixtures depicting a zebra and a
    giraffe respectively."""
    engine = InferenceEngine()
    config = InferenceConfig(confidence_threshold=0.3, iou_threshold=0.45, max_detections=20)
    preproc = _yolox_preproc()

    zebra_path = os.path.join(REAL_IMAGES_DIR, "000000000034.jpg")
    giraffe_path = os.path.join(REAL_IMAGES_DIR, "000000000025.jpg")
    assert os.path.exists(zebra_path) and os.path.exists(giraffe_path)

    zebra_preds = engine.run_inference(zebra_path, REAL_MODEL_PATH, preproc=preproc, config=config, class_names=COCO_80_CLASSES)
    giraffe_preds = engine.run_inference(giraffe_path, REAL_MODEL_PATH, preproc=preproc, config=config, class_names=COCO_80_CLASSES)

    assert any(p.class_name == "zebra" for p in zebra_preds), f"Expected a zebra detection, got {[p.class_name for p in zebra_preds]}"
    assert any(p.class_name == "giraffe" for p in giraffe_preds), f"Expected a giraffe detection, got {[p.class_name for p in giraffe_preds]}"


def test_real_inference_runs_clean_across_the_full_batch():
    """Every real image must produce a valid (possibly empty) detection
    list without raising -- proves the decode adapter (grid/stride math,
    letterbox ratio, NMS) doesn't silently break on real-world image
    aspect ratios and content diversity, only on the one or two images
    spot-checked above."""
    engine = InferenceEngine()
    config = InferenceConfig(confidence_threshold=0.25, iou_threshold=0.45, max_detections=20)
    preproc = _yolox_preproc()

    total_detections = 0
    for path in _real_image_paths():
        preds = engine.run_inference(path, REAL_MODEL_PATH, preproc=preproc, config=config, class_names=COCO_80_CLASSES)
        assert isinstance(preds, list)
        total_detections += len(preds)

    # A real detector run over 40 real photos should find *something* in
    # most of them -- an all-zero result across the whole batch would
    # indicate the decode is silently broken (wrong axis, wrong stride),
    # not that YOLOX-Nano genuinely sees nothing in 40 COCO photographs.
    assert total_detections > 10


def test_duplicate_detector_does_not_false_positive_on_distinct_real_photos():
    """FR-02 calibration check: 20 genuinely distinct real photographs of
    different scenes/subjects must not be reported as a near-duplicate
    flooding cluster. This is the false-positive-rate half of near-duplicate
    detection -- the existing synthetic test only proves TRUE positives
    (identical images ARE clustered); this proves the detector doesn't
    also cry wolf on ordinary distinct real content."""
    detector = DuplicateDetector(hamming_threshold=4)
    paths = _real_image_paths()[:20]
    samples = [
        SampleItem(sample_id=f"real_{i}", image_path=p, labels=["object"], boxes=[[0, 0, 1, 1]], contributor_id="contributor_real")
        for i, p in enumerate(paths)
    ]
    findings, stats = detector.analyze(samples, "real_dataset_01")
    assert stats["total_duplicated_samples"] == 0, (
        f"False-positive near-duplicate flagging on distinct real photos: {stats}"
    )


def test_distribution_shift_baseline_stays_normal_on_two_real_unmodified_batches():
    """Tier-1 item 2: a second, real reference population. Splits the 40
    real photos into two disjoint real batches (not the same images
    compared to themselves) and confirms comparing one real batch against
    another real batch of ordinary photos does NOT falsely report
    manipulation -- the baseline false-positive check for FR-11/FR-12
    against genuine data instead of synthetic fixtures."""
    paths = _real_image_paths()
    reference_paths, observed_paths = paths[:20], paths[20:]

    detector = DistributionShiftDetector(drift_threshold=0.30)
    reference_profile = {"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.6}
    observed_metadata = [
        {"terrain": "plains", "sensor": "EO_optical", "illumination": 0.6, "image_path": p}
        for p in observed_paths
    ]
    reference_metadata = [{"image_path": p} for p in reference_paths]

    report = detector.evaluate_shift(
        reference_profile, observed_metadata,
        declared_reference_id="real_coco_reference_batch",
        observed_dataset_id="real_coco_observed_batch",
        reference_samples_metadata=reference_metadata,
    )
    assert report.is_manipulation_suspected is False
    assert report.image_quality_evidence.get("samples_with_computed_signals") == 20


def test_embedding_extractor_uses_the_trained_checkpoint_and_is_discriminative():
    """Tier-2 item: the embedding extractor must use the real,
    SimCLR-contrastively-trained checkpoint (not the fixed-random-seed
    fallback) when present, and must produce deterministic, discriminative
    embeddings: identical images -> identical embedding; a duplicate image
    pair must be strictly more similar than two genuinely different real
    photos."""
    from backend.drift.embedding_extractor import EmbeddingExtractor, TRAINED_EMBEDDING_MODEL_PATH

    assert os.path.exists(TRAINED_EMBEDDING_MODEL_PATH), (
        "Trained embedding checkpoint missing -- run "
        "`python -m backend.drift.train_embedding_extractor` to regenerate it."
    )

    extractor = EmbeddingExtractor()
    assert extractor._resolve_model_path() == TRAINED_EMBEDDING_MODEL_PATH

    bowls_path = os.path.join(REAL_IMAGES_DIR, "000000000009.jpg")
    zebra_path = os.path.join(REAL_IMAGES_DIR, "000000000034.jpg")

    e1 = extractor.extract(bowls_path)
    e1_again = extractor.extract(bowls_path)
    e2 = extractor.extract(zebra_path)

    def cos_sim(a, b):
        import numpy as np
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))

    assert cos_sim(e1, e1_again) > 0.999
    assert cos_sim(e1, e2) < 0.999


def test_distribution_shift_detects_real_degradation_of_real_photos():
    """Applies genuine, real image-processing degradation (heavy Gaussian
    blur + desaturation + aggressive JPEG recompression) to real copies of
    the reference photos -- not synthetic images, actual transformations
    of the same real content -- and confirms the shift score against the
    unmodified reference batch increases meaningfully. This calibrates
    the blur/contrast/compression quality signals against a real
    before/after pair rather than only ever against synthetic fixtures."""
    paths = _real_image_paths()
    reference_paths = paths[:20]

    degraded_dir = "real_validation/_degraded_tmp"
    os.makedirs(degraded_dir, exist_ok=True)
    degraded_paths = []
    for p in reference_paths:
        with Image.open(p) as img:
            img = img.convert("RGB")
            img = img.filter(ImageFilter.GaussianBlur(radius=6))
            img = ImageEnhance.Color(img).enhance(0.15)
            out_path = os.path.join(degraded_dir, os.path.basename(p))
            img.save(out_path, format="JPEG", quality=15)
            degraded_paths.append(out_path)

    try:
        detector = DistributionShiftDetector(drift_threshold=0.30)
        reference_profile = {"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.6}
        reference_metadata = [{"image_path": p} for p in reference_paths]

        clean_report = detector.evaluate_shift(
            reference_profile,
            [{"terrain": "plains", "sensor": "EO_optical", "illumination": 0.6, "image_path": p} for p in reference_paths],
            reference_samples_metadata=reference_metadata,
        )
        degraded_report = detector.evaluate_shift(
            reference_profile,
            [{"terrain": "plains", "sensor": "EO_optical", "illumination": 0.6, "image_path": p} for p in degraded_paths],
            reference_samples_metadata=reference_metadata,
        )

        assert degraded_report.affected_dimensions["blur_shift"] > clean_report.affected_dimensions["blur_shift"]
        assert degraded_report.overall_drift_score > clean_report.overall_drift_score
    finally:
        import shutil
        shutil.rmtree(degraded_dir, ignore_errors=True)
