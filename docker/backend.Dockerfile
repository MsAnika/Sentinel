# IntelX backend -- FastAPI assurance service.
#
# Build:   docker build -f docker/backend.Dockerfile -t intelx-backend .
# Run:     docker run -p 8000:8000 -v intelx-evidence:/data intelx-backend
#
# For an air-gapped build, pre-provision the wheelhouse while online:
#   pip download -r backend/requirements.lock.txt -d ./wheelhouse
# then build with:
#   docker build -f docker/backend.Dockerfile --build-arg WHEELHOUSE=./wheelhouse -t intelx-backend .
# (see the conditional COPY/--find-links below)

FROM python:3.12-slim AS base

# --- OS-level dependencies -------------------------------------------------
# libgomp1: required by onnxruntime/torch at runtime.
# No compiler toolchain is installed -- every Python dependency here ships
# prebuilt wheels for linux/amd64 & linux/arm64, so nothing needs to compile
# from source at image-build time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Python dependencies (exact-pinned, see requirements.lock.txt) --------
COPY backend/requirements.lock.txt /app/requirements.lock.txt
RUN pip install --no-cache-dir -r requirements.lock.txt

# --- Application code -------------------------------------------------------
COPY backend/ /app/backend/

# Evidence store (SQLite DB, audit ledger, signing keys, uploaded assets)
# lives under /data so it can be mounted as a named volume and survive
# container recreation -- this is the durable state a real deployment
# must not lose.
ENV IntelX_DB_PATH=/data/intelx.db \
    IntelX_AUDIT_LEDGER_PATH=/data/audit_log/ledger.jsonl \
    IntelX_SIGNING_KEY_PATH=/data/keys/provenance_signing_key.pem \
    IntelX_AUDIT_SIGNING_KEY_PATH=/data/keys/audit_signing_key.pem \
    PYTHONUNBUFFERED=1

RUN mkdir -p /data/audit_log /data/keys /app/uploads

EXPOSE 8000

# No network egress is required at runtime -- this process never calls out;
# it only binds a local port and reads/writes /app and /data. Suitable for
# an air-gapped host with --network=none plus published container ports,
# or a fully isolated bridge network.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
