# VIGIL-CV — Attack Class Coverage Statement

This is the authoritative, honest statement of what this system does and does not detect, as
required by Problem Statement 26228 section 2.3 ("a clear coverage statement identifying
supported attack classes, assumptions and known limitations"). It is generated from the same
source of truth the running system returns in every `AssuranceReport`
(`backend/assurance/report_generator.py: AssuranceReportGenerator.DEFAULT_COVERAGE`) — this
document and the API cannot drift apart because they're the same list.

Status legend: **SUPPORTED** — implemented and verified with a real, executable test.
**PARTIAL** — implemented but with a stated dependency or gap that limits it on real-world input.
**NOT_SUPPORTED** — not implemented; listed here so it is never silently assumed to work.

## Training-data integrity (2.2.1)

| Attack class | Status | Validation method | Notes |
|---|---|---|---|
| `near_duplicate_flooding` | SUPPORTED | Perceptual differential hashing (dHash) + Hamming clustering | Operates on real image bytes |
| `ood_insertion` | SUPPORTED | Color-moment feature distance / z-score vs. reference distribution | Operates on real image bytes |
| `trigger_backdoor_poisoning` (data-side) | SUPPORTED | Spatial frequency matched-filter correlation against known patch signatures | Detects the *specific* trigger pattern being tested for; see `unknown_trigger_reconstruction` below |
| `label_flipping` | **PARTIAL** | Reference-model visual disagreement check when a trusted reference model is supplied; otherwise falls back to trusting contributor-declared metadata | **Without a reference model, this will not catch mislabelling in genuinely unannotated real-world data** — it only detects flips when the true label is knowable some other way |
| `systematic_mislabelling` | **PARTIAL** | Batch-level aggregation of the same per-sample evidence as `label_flipping` | Same dependency as above |

Contributor/batch-level risk aggregation is implemented for all of the above
(`backend/data_assurance/contributor_risk.py`) — sample-level findings roll up into a per-source
risk score and disposition, not just isolated per-sample flags.

## Model integrity (2.2.2)

| Attack class | Status | Validation method | Notes |
|---|---|---|---|
| `model_substitution` | SUPPORTED | Bitwise SHA-256 digest comparison of the actual model file bytes against a declared reference | Yields an explicit `MATCH` / `MISMATCH` / `NO_REFERENCE` disposition — a model with no declared reference digest is never silently treated as a MATCH |
| `anomalous_model_behaviour` | SUPPORTED | Real reference-vs-candidate model execution on the same probe images, comparing actual outputs | Both models are actually run via onnxruntime; nothing is scripted |
| Parameter/weight-statistics anomaly | SUPPORTED (white-box only) | Real ONNX initializer tensor extraction + kurtosis/variance analysis | Requires white-box access; explicitly `UNAVAILABLE` (not approximated) under declared black-box or hash-only access |
| `black_box_model_assessment` | **PARTIAL** | Input/output behavioral probing only | This is the intended graceful degradation for vendor-supplied models where weight access isn't authorized — not a workaround |
| `hash_only_model_assessment` | **PARTIAL** | File-level SHA-256 digest comparison only | Third, weakest access tier (`ModelAccessLevel.HASH_ONLY`): the model is never executed. All execution-dependent checks report explicit `UNAVAILABLE` with a stated reason (`backend/model_assurance/access_detector.py`) |
| `unknown_trigger_reconstruction` | **NOT SUPPORTED** | — | No gradient-based blind trigger inversion (e.g. Neural Cleanse-style optimization). Backdoor detection only recognizes trigger patterns it is explicitly told to probe for |
| PyTorch/TorchScript ingestion | **PARTIAL** | Real `torch.jit.load`/`torch.load` (safe `weights_only=True` attempted first) | Implemented but not yet validated end-to-end against a real trained checkpoint in this test suite — treat as less battle-tested than the ONNX path |

## Inference provenance & output integrity (2.2.3)

| Attack class | Status | Validation method |
|---|---|---|
| `inference_tampering` | SUPPORTED | SHA-256 hash DAG over image + model digest + preprocessing + config + output, Ed25519 digital signature |
| `replay_detection` | SUPPORTED | Nonces + monotonic sequence numbers + timestamps |

The signing key is persisted to disk (`keys/provenance_signing_key.pem`) so previously-issued
signatures remain independently verifiable across service restarts.

## Distribution shift / anomaly assessment (2.2.4)

| Attack class | Status | Validation method |
|---|---|---|
| `distribution_shift` | SUPPORTED | Categorical divergence ratio (terrain/sensor) + illumination delta vs. a declared reference envelope, computed from real per-sample metadata |

## Governance (2.2.5)

- Every finding carries a human-readable `reason`, `evidence` dict, `confidence`, `severity`,
  `affected_source`, and `recommended_action` (`ACCEPT` / `REVIEW` / `QUARANTINE`) —
  see `backend/schemas.py: FindingSchema`.
- A single, process-wide, hash-chained, tamper-evident audit ledger
  (`backend/audit/audit_log.py: shared_ledger`) records every real API action — model uploads,
  fingerprinting, parameter analysis, behavioural batteries, dataset ingestion/analysis, inference
  execution and verification — not just the canned demo scenarios. It is persisted to
  `audit_log/ledger.jsonl` so the trail survives restarts.

## Assumptions

- System operates in a strictly air-gapped, offline environment with no external network access.
- Reference baseline fingerprints and declared test batteries are supplied and stored locally by the operator.
- Ingested datasets adhere to valid COCO or YOLO annotation specifications.

## Known limitations (explicit, not implied)

1. Black-box model evaluation is limited to input/output behavioral probing; white-box
   weight/activation statistics are explicitly reported **unavailable**, never approximated.
2. Backdoor/trigger detection matches against known trigger signatures. Blind reconstruction of an
   unknown, never-specified trigger via gradient inversion is **not implemented**.
3. Label-flip/mislabelling detection is only as strong as the reference model supplied for visual
   verification. Without one, it trusts contributor-declared metadata and will not catch errors on
   genuinely unannotated real-world data.
4. PyTorch/TorchScript ingestion is implemented but not yet validated against a real trained
   checkpoint — ONNX has the only fully verified end-to-end test coverage.
5. Zero-day stealthy semantic triggers with extremely small perturbation norms may require
   white-box gradient inversion this system does not perform.
6. This system provides empirical evidence and risk grading; it does not mathematically guarantee
   the total absence of unknown zero-day attacks.
