# IntelX — Five-Minute Judge Demo Script

Companion to the PRD (`Problem Statement 26228`, section 15). This is the
actual demo script for the system as it stands today — every claim below
is backed by a real, currently-passing automated test; see the file
reference at the end of each beat.

Turn this into slides 1:1 — each `##` heading below is one slide; the
bullet points under **Say** are the speaker notes, **Show** is what's on
screen, and **Why it matters** is the judge-facing payoff.

---

## 1. Title (0:00 – 0:15)

**Show**: IntelX logo/header, Problem Statement ID 26228, "Ministry of
Defence (MoD) — Indian Army (DGIS)".

**Say**: "IntelX is an offline, air-gapped assurance layer for
multi-contributor computer-vision pipelines — it treats every dataset,
model, and inference record as untrusted until it has evidence to say
otherwise."

---

## 2. The Problem (0:15 – 0:45)

**Show**: pipeline diagram — Contributor → Dataset → Model → Inference →
Downstream System, with five failure points annotated (mislabelled data,
backdoors, model substitution, tampered inference, sensor drift).

**Say**: "A compromised pipeline doesn't announce itself. Most existing
tools check one stage — a dataset scanner, or a model auditor, or a
signing scheme. IntelX is the one system that covers data, model,
inference, and drift together, with a single evidence-based disposition
at the end."

---

## 3. Ingestion — Real Data, Not Just Fixtures (0:45 – 1:15)

**Show**: `real_validation/` — 40 real COCO photographs (official CDN,
CC BY 4.0) and a real, third-party YOLOX-Nano ONNX model (Megvii,
Apache-2.0, ~900K parameters).

**Say**: "Every detector in this system has been validated against real
photographs and a real pretrained model — not only synthetic fixtures
built to be caught. This is the model-agnostic adapter architecture the
brief asks for: IntelX auto-detects and correctly decodes this
third-party model's multi-stride output format, verified byte-for-byte
against the model author's own decode logic."

**Why it matters**: This validation pass found and fixed a real
calibration bug (`blur_shift` was silently hardcoded to zero without a
declared reference baseline) — proof this wasn't only tested against
fixtures designed to pass.

*Reference*: `tests/test_real_world_validation.py`,
`real_validation/PROVENANCE.md`

---

## 4. Data Evidence (1:15 – 2:00)

**Show**: Scenario B ("Compromised Dataset") — run it live. Point at:
duplicate cluster finding, systematic mislabelling finding (contributor
Bravo, 23.8% error rate), trigger/watermark finding.

**Say**: "Contributor Bravo is flooding near-duplicates, has a
systematically corrupted label rate, and injected samples carrying a
high-frequency trigger watermark. All three are aggregated into one
contributor-level risk score — QUARANTINE — with full traceability back
to the individual samples."

*Reference*: `backend/data_assurance/*`, Scenario B

---

## 5. Model Evidence — Known and Unknown Triggers (2:00 – 2:45)

**Show**: Scenario C ("Substituted & Backdoored Model") — digest
mismatch finding, then the trigger-response finding (clean vs.
triggered image, same model, different verdict).

**Say**: "This model's SHA-256 digest doesn't match the declared
reference — MISMATCH, not a false MATCH from a missing reference. And
when we stamp the known trigger pattern onto a clean image and run it
through the *actual* model, the backdoor fires — 6.7% attack success
rate on a held-out probe set."

**Then say**: "But that requires knowing what the trigger looks like.
IntelX also does blind reconstruction — Neural Cleanse. It's never told
the trigger exists. It optimizes a candidate trigger from scratch for
every class, and the backdoored class needs a mask 40% smaller than any
other class to hijack — flagged automatically, with zero false positives
on the clean model."

**Why it matters**: This was explicitly `NOT_SUPPORTED` in earlier
coverage statements. It's real now — a genuine, working implementation
of the published method, not a placeholder.

*Reference*: `backend/model_assurance/trigger_reconstruction.py`,
`test_neural_cleanse_discovers_the_hidden_backdoor_class`

---

## 6. Cryptographic Proof (2:45 – 3:45)

**Show**: Scenario D — a valid signed inference record; tamper the
output; re-verify; watch it fail with the exact byte-level cause. Then
Scenario E (replay/reordering) and Scenario F (audit-log tamper).

**Say**: "Every inference record binds the image hash, model digest,
preprocessing config, output, and a nonce/sequence pair — Ed25519 signed.
Alter *anything* and re-verification catches it deterministically. The
audit trail itself is hash-chained *and* individually signed — even
rewriting a historical entry's content, not just its hash, gets caught."

**New**: "And now these signing keys can be rotated — without
invalidating a single prior signature. We verified this mid-stream: one
ledger entry signed before rotation, one after, both still verify."

*Reference*: `backend/provenance/`, `backend/tools/rotate_keys.py`,
Scenarios D/E/F

---

## 7. Distribution Shift — Not Just Metadata (3:45 – 4:15)

**Show**: Distribution Shift tab — terrain/sensor/illumination dimensions,
plus the new "Additional Signal Dimensions" panel: blur, contrast,
compression, and a real CNN embedding-space Frechet distance.

**Say**: "This isn't only declared metadata. When real images are
available, IntelX computes real pixel-derived quality signals and a real
learned-embedding comparison — a small CNN, contrastively pretrained on
this system's own images, no external weights. And it classifies the
result into one of four categories the PRD names explicitly:
probable operational drift, anomaly requires review, manipulation
indicators present, or insufficient evidence — never claiming
intentional manipulation from shift alone."

*Reference*: `backend/drift/`, `backend/drift/embedding_extractor.py`

---

## 8. Governance & Access Control (4:15 – 4:40)

**Show**: the coverage statement (SUPPORTED/PARTIAL/NOT_SUPPORTED, same
source of truth as the API), the trend dashboard (risk score over time,
contributor trends across every run), and a quick RBAC check — an
analyst-role key can read everything but can't delete raw uploads; only
an admin-role key can.

**Say**: "Every finding states its confidence, severity, and what access
level it required — HASH_ONLY, BLACK_BOX, or WHITE_BOX — and reports
UNAVAILABLE with a reason when it can't check something, rather than
faking a result. Nothing here overclaims universal AI safety."

*Reference*: `COVERAGE.md`, `src/client/components/dashboard/`,
`backend/api/auth.py`

---

## 9. Offline, Verifiable, Reproducible (4:40 – 4:55)

**Show**: `python -m backend.tools.verify_offline all` — run it with no
server started, no network.

**Say**: "This whole verification path runs with zero network access —
true to the air-gapped requirement. Same input, same seed, same output,
every time."

---

## 10. Scale-Up (4:55 – 5:00)

**Show**: pinned `requirements.lock.txt`, SBOM, Docker packaging (backend
+ frontend Dockerfiles), CI pipeline.

**Say**: "From this prototype to a hardened single-site pilot: pinned,
reproducible dependencies, a documented SBOM with zero copyleft
entanglement, container packaging, and continuous integration — all
already in place, not future work."

---

## Backup / if a judge asks

- **"What can't it do?"** — Point directly at `COVERAGE.md`'s
  `NOT_SUPPORTED` section: universal detection of unknown/adaptive
  backdoors is not claimed, proof of absence is not claimed, attribution
  of intent is not claimed.
- **"Is the backdoor demo real or scripted?"** — It's a real forward pass
  through a real ONNX model via `onnxruntime`; the trigger only fires
  when the actual patch pixels are present in the image
  (`test_real_onnx_inference_produces_input_conditional_backdoor`).
- **"Does this work on models you didn't build?"** — Yes: the real
  YOLOX-Nano validation pass, and the explicit `UNAVAILABLE` reporting
  for Neural Cleanse when a model's architecture can't be bridged (verified
  against that same real YOLOX model).
