# IntelX — Threat Model

Companion to [`docs/architecture.svg`](architecture.svg) and [`COVERAGE.md`](../COVERAGE.md). This
document states, explicitly, what is trusted, what is not, what is detected, and what a passing
result does and does not prove — matching PRD Problem Statement 26228 section 7 ("Threat Model")
and the deliverable checklist item "Architecture diagram and threat model."

## Posture: zero-trust over contributed assets

Every asset entering the pipeline — dataset, model file, metadata, preprocessing/inference
configuration, and inference record — is treated as **untrusted until assessed**. IntelX does not
assume a contributor, vendor, or upstream system is honest; it produces evidence, not a blanket
guarantee.

## Trusted components

| Component | Why it's trusted |
|---|---|
| The IntelX release itself, installed on an analyst-controlled offline system | Assumed to run unmodified; see "Out of scope" below for what this does *not* cover |
| The locally-generated Ed25519 signing keys (`keys/provenance_signing_key.pem`, `keys/audit_signing_key.pem`) | Generated and persisted on first run; loss/compromise invalidates the chain of trust for everything signed after that point |
| The verification public key, once distributed through a trusted channel | Used by `backend/tools/verify_offline.py` and any downstream verifier to check signatures independent of this process |
| Declared reference manifests, probe sets, and policy versions (`RiskEngine.POLICY_VERSION`) | Created/approved by the operator before an assessment run, not derived from the asset under test |
| The local SQLite evidence store and hash-chained audit ledger, absent host-level compromise | Integrity is *verifiable* (hash chain + signatures), not merely assumed |

## Untrusted components (assessed, never assumed safe)

- Contributor datasets, annotations, and source/contributor/batch metadata claims
- Supplied model files, weights, and any model-provided self-description
- Supplied inference records and their claimed configuration/timestamps
- Any single detector's verdict in isolation — see "Evidence, not proof" below

## Threats addressed (with the module that addresses them)

| Threat | Module | Detection mechanism |
|---|---|---|
| Exact/near-duplicate flooding | `data_assurance/duplicate_detector.py` | Perceptual dHash + Hamming clustering |
| Label flipping / systematic mislabelling | `data_assurance/label_analyzer.py` | Reference-model visual disagreement (or declared-metadata fallback) |
| Out-of-distribution insertion | `data_assurance/ood_detector.py` | Color-moment feature z-score vs. reference |
| Trigger/backdoor patch injection (data side) | `data_assurance/poisoning_detector.py` | Spatial matched-filter correlation for a declared trigger signature |
| Model substitution | `model_assurance/fingerprint.py` | Bitwise SHA-256 digest vs. declared reference — `MATCH` / `MISMATCH` / `NO_REFERENCE` |
| Anomalous/backdoored model behaviour | `model_assurance/behaviour_analyzer.py`, `backdoor_detector.py` | Real reference-vs-candidate execution on shared probes; clean-vs-triggered comparison |
| Parameter-level tampering (white-box) | `model_assurance/parameter_analyzer.py` | Real ONNX weight-tensor kurtosis/variance analysis |
| Inference record tampering (input/output/config) | `provenance/verification.py` | Cryptographic hash DAG recalculation |
| Inference replay | `provenance/verification.py` | Per-verifier nonce history, register-on-first-sight |
| Inference reordering | `provenance/verification.py` | Monotonic per-stream sequence-number tracking, independent of nonce state |
| Post-hoc audit-log rewriting | `audit/audit_log.py` | SHA-256 hash chain **and** an independent per-entry Ed25519 signature |
| Operational/adversarial distribution shift | `drift/distribution_shift.py`, `image_quality.py` | Terrain/sensor/illumination divergence + real pixel-derived blur/contrast/resolution/compression signals, classified into 4 named categories |

Each of the above is demonstrated as a runnable, reproducible scenario in
`backend/scenarios/` (Scenarios A–F) — see section 4 of the README and `COVERAGE.md`.

## Explicitly out of scope

Directly from the PRD (section 3.2) and restated here so it is never silently assumed to be
covered:

- **Universal detection of unknown or adaptive backdoors.** Trigger/backdoor detection matches
  against a *declared* trigger signature or runs a *declared* probe battery. Blind reconstruction
  of a never-specified trigger (e.g. Neural Cleanse-style gradient inversion) is not implemented.
- **Attribution of malicious intent or attacker identity.** Findings are behavioural/statistical
  evidence, not a claim about who did it or why.
- **Compromise of the host OS, firmware, GPU, physical devices, or hardware side channels.** IntelX
  assumes the machine it runs on is not itself compromised below the application layer.
- **Real-time streaming enforcement at production scale.** The SIH prototype evaluates batches/assets
  on demand, not a live production inference stream.
- **Mandatory retraining of a supplied model.** Baseline assessment never requires retraining;
  optional remediation may, but that is not part of the assurance path itself.

## Evidence, not proof — the limits of a passing result

- **A valid signature only proves the protected record has not changed since it was signed.** It
  says nothing about whether the underlying model that produced it is benign.
- **Detector findings are risk indicators, not mathematical proof of compromise.** A clean
  `ACCEPT` disposition means "no supported detector, run under its stated assumptions, found
  evidence of the attack classes it covers" — not "this asset is provably safe."
  `DEFAULT_LIMITATIONS` in `assurance/report_generator.py` is carried into every report to keep this
  explicit.
- **Distribution shift alone never yields a manipulation claim.** `DriftClassification.
  MANIPULATION_INDICATORS_PRESENT` requires corroborating multi-dimensional evidence (see
  `drift/distribution_shift.py`); a single-dimension shift is classified as
  `probable_operational_drift`, and too few samples yields `insufficient_evidence` rather than a
  falsely confident verdict either way.
- **Access-level-gated checks are reported UNAVAILABLE, never approximated.** When only
  `HASH_ONLY` or `BLACK_BOX` access is declared, execution- or weight-dependent checks report an
  explicit unavailable status with a reason (`model_assurance/access_detector.py`) rather than
  silently skipping or faking a result.

## API access control (current state, and its limit)

Every route except `/health` is gated by `backend/api/auth.py: require_api_key` against the
`X-API-Key` header. Two configurations are supported: `IntelX_API_KEY` (legacy, single shared
secret, treated as one `admin`-role key) or `IntelX_API_KEYS` (`"key1:role1,key2:role2,..."`,
real multi-role access — an `analyst` key for routine use, a separately-held `admin` key for
destructive operations such as purging raw uploads, enforced via `require_role`). This is still
a deliberately lightweight MVP gate, not the full "local role-based access control" the PRD names
for Phase 1 scale-up (section 17) — there is no per-analyst identity, session, or provisioning
workflow, just a small number of shared role-scoped secrets — but it is real, enforced role
separation, not merely documented intent. By default (no keys configured) auth is disabled
entirely, matching the PRD's stated single-analyst, air-gapped-workstation deployment model for
the SIH prototype. Set `IntelX_API_KEYS` (preferred) or `IntelX_API_KEY` before exposing this
service to any shared network segment.

The Next.js frontend (`src/client/lib/api-client.ts`) authenticates a station operator against
`GET /api/auth/whoami` at login (`src/client/components/auth/AuthStationLogin.tsx`) and attaches
the resulting key as `X-API-Key` on every subsequent request (`AssuranceApiClient.request`/
`requestForm`), persisted in `localStorage` across reloads. Enabling `IntelX_API_KEYS` therefore
gates the bundled UI too, not just direct callers (curl, another service, the offline verification
CLI's HTTP-based checks).

## Key management (current state, and its limit)

Both signing keys are generated on first use and persisted to disk under `keys/` (or the
container's `/data/keys` volume — see `docker/backend.Dockerfile`) with `0600` permissions. There
is **no key rotation, HSM-backed storage, or multi-party signing in this MVP** — a host-level
compromise that exposes the private key file defeats the provenance guarantee for anything signed
after that point. Key rotation and hardware-backed key storage are named explicitly as Phase 1/2
scale-up work in the PRD (section 17) and are not claimed here.
