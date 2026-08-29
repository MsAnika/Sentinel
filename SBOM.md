# IntelX — Software Bill of Materials & License Inventory

This is the SBOM/license inventory deliverable named in Problem Statement 26228 section 2.3
("teams must submit ... the assurance-report schema, a reproducible audit log, and a clear
coverage statement") and section 11 ("Maintain a software bill of materials (SBOM) and a license
inventory for all dependencies, pretrained weights, datasets, and borrowed code"). It was generated
from the *actual installed* package metadata (`importlib.metadata` + `uv pip tree` against
`backend/.venv`, and `node_modules/*/package.json` for the frontend) rather than hand-typed, so it
reflects what genuinely ships, not just what a requirements file claims.

Regenerate after any dependency change:
```bash
uv pip tree --python backend/.venv/bin/python
```
and re-derive the tables below from `backend/requirements.txt` / `package.json`.

## License posture

No dependency below carries a copyleft license (GPL/AGPL/LGPL) that would obligate source
disclosure of this codebase. This satisfies PRD section 11's explicit instruction: *"Avoid using
Ultralytics code in the mandatory IntelX core unless the team deliberately complies with AGPL-3.0
... Prefer permissively licensed runtimes/adapters for the final deliverable."* IntelX's YOLO
parsing is a small, team-owned parser (`backend/ingestion/dataset_loader.py: DatasetLoader.load_yolo`)
— it does not import or depend on the Ultralytics `ultralytics` package or its AGPL-3.0 license.

## Backend (Python) — declared dependencies (`backend/requirements.txt`)

| Package | Version (installed) | License |
|---|---|---|
| `fastapi` | 0.141.1 | MIT |
| `uvicorn` | 0.52.4 | BSD-3-Clause |
| `pydantic` | 2.13.5 | MIT |
| `python-multipart` | 0.0.32 | Apache-2.0 |
| `numpy` | 2.5.2 | BSD-3-Clause (+ 0BSD/MIT/Zlib/CC0-1.0 for bundled components) |
| `pillow` | 12.3.0 | MIT-CMU (the "PIL Software License") |
| `onnx` | 1.22.0 | Apache-2.0 |
| `onnxruntime` | 1.29.0 | MIT |
| `torch` | 2.13.0 | BSD-3-Clause core (+ Apache-2.0/BSL-1.0/MIT for bundled components) |
| `cryptography` | 50.0.1 | Apache-2.0 OR BSD-3-Clause (dual-licensed; project treats as Apache-2.0) |
| `jinja2` | 3.1.6 | BSD-3-Clause |
| `reportlab` | 5.0.1 | BSD (see `reportlab`'s own `LICENSE.txt`) |
| `pytest` | 9.1.1 | MIT |

## Backend — transitive dependencies actually pulled in

| Package | Version | License |
|---|---|---|
| `annotated-doc` | 0.0.5 | MIT |
| `annotated-types` | 0.8.0 | MIT |
| `anyio` | 4.14.2 | MIT |
| `certifi` | 2026.7.22 | MPL-2.0 |
| `cffi` | 2.1.1 | MIT |
| `charset-normalizer` | 3.5.1 | MIT |
| `click` | 8.5.0 | BSD-3-Clause |
| `filelock` | 3.32.4 | MIT |
| `flatbuffers` | 25.12.19 | Apache-2.0 |
| `fsspec` | 2026.7.0 | BSD-3-Clause |
| `h11` | 0.16.0 | MIT |
| `httpcore` | 1.0.9 | BSD-3-Clause |
| `httpx` | 0.28.1 | BSD-3-Clause |
| `idna` | 3.19 | BSD-3-Clause |
| `iniconfig` | 2.3.0 | MIT |
| `joblib`, `narwhals`, `scipy`, `threadpoolctl` (scikit-learn's tree) | — | see note below |
| `markupsafe` | 3.0.3 | BSD-3-Clause |
| `ml_dtypes` | 0.6.0 | Apache-2.0 |
| `mpmath` | 1.3.0 | BSD-3-Clause |
| `networkx` | 3.6.1 | BSD-3-Clause |
| `packaging` | 26.3 | Apache-2.0 OR BSD-2-Clause |
| `pluggy` | 1.6.0 | MIT |
| `protobuf` | 7.36.0 | BSD-3-Clause |
| `pycparser` | 3.0 | BSD-3-Clause |
| `pydantic_core` | 2.46.5 | MIT |
| `pygments` | 2.21.0 | BSD-2-Clause |
| `setuptools` | 84.0.0 | MIT |
| `starlette` | 1.6.0 | BSD-3-Clause |
| `sympy` | 1.14.0 | BSD-3-Clause |
| `typing-extensions` | 4.16.0 | PSF-2.0 |
| `typing-inspection` | 0.4.4 | MIT |

Notes:
- `httpx` is pulled in only for `starlette.testclient.TestClient` (used by the pytest API-wiring
  tests), not by the running service itself. It is not declared directly in `requirements.txt`
  because it arrives transitively via the test tooling; add it explicitly if the test suite is
  ever packaged/shipped separately from the app.
- `scikit-learn` (and its own tree — `joblib`, `narwhals`, `scipy`, `threadpoolctl`) was found
  installed in the local dev `.venv` but **is not imported anywhere in `backend/`** and is not
  listed in `requirements.txt`. This looks like leftover cruft from earlier exploration, not a
  real dependency — confirmed via `grep -r "sklearn\|scipy" backend/`. Safe to `uv pip uninstall`
  from any venv rebuilt from `requirements.txt` alone; it is not part of this SBOM's dependency
  count and should not be re-added without an actual `import` in the code that needs it.

## Frontend (Node/Next.js) — `package.json`

| Package | Version (declared) | License |
|---|---|---|
| `next` | 16.3.3 | MIT |
| `react` | 19.2.8 | MIT |
| `react-dom` | 19.2.8 | MIT |
| `clsx` | ^2.1.1 | MIT |
| `tailwind-merge` | ^3.6.0 | MIT |
| `canvas-confetti` | ^1.9.4 | ISC |
| `lucide-react` | ^1.35.0 | ISC |
| `@tailwindcss/postcss` (dev) | ^4 | MIT |
| `tailwindcss` (dev) | ^4 | MIT |
| `eslint` (dev) | ^9 | MIT |
| `eslint-config-next` (dev) | 16.3.3 | MIT |
| `typescript` (dev) | ^5 | Apache-2.0 |
| `@types/*` (dev) | various | MIT |

ISC and MIT are both short, permissive, non-copyleft licenses; nothing above triggers a
disclosure obligation.

## Models, weights, and reference/attack resources

Per PRD section 7.1 and the "In Scope" constraints: this repository does not vendor any
third-party pretrained weights. All ONNX/TorchScript/PyTorch fixtures used in tests and demo
scenarios (`backend/scenarios/asset_generator.py`) are synthetically generated at runtime by
this codebase from a fixed random seed — no external model file is downloaded, bundled, or
redistributed. No dataset content is bundled either; `test_assets/` is generated on demand.

If a real deployment later imports NIST TrojAI / BackdoorBench / other public reference-attack
artifacts (PRD section 7.1), each imported asset's own license must be added as a new row here
before it ships with this system, and verified compatible with the permissive posture above
(most of these research artifacts are separately licensed; several TrojAI rounds use varied
per-round terms — check per-download).

## Maintenance

- Re-run the two commands at the top of this file after any dependency bump and update the
  tables above; this document is not auto-generated on every `pip`/`bun` install, so it is
  the maintainer's responsibility to keep it in sync with `requirements.txt` / `package.json`.
- Flag any newly-introduced GPL/AGPL/LGPL/SSPL dependency immediately — none currently exist in
  this project's declared or transitive dependency graph.
