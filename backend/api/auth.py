import os
from fastapi import Header, HTTPException

API_KEY_ENV_VAR = "VIGILCV_API_KEY"


def require_api_key(x_api_key: str = Header(default=None)) -> None:
    """Single-shared-secret API key gate.

    This is a deliberately lightweight MVP control, not the "local
    role-based access control" the PRD names as Phase 1 scale-up work
    (section 17) -- it authenticates that a caller holds the shared
    workstation secret, it does not distinguish between analyst roles or
    audit who-did-what beyond what the audit ledger already records via
    the API surface itself.

    Default posture (VIGILCV_API_KEY unset): auth is disabled. This
    matches the PRD's stated deployment model for the SIH prototype -- a
    single analyst-controlled, air-gapped workstation with no other users
    on the network path to this service. Set VIGILCV_API_KEY to a real
    secret to require every request to present it via the `X-API-Key`
    header before this service is exposed to any shared network segment.
    """
    configured_key = os.environ.get(API_KEY_ENV_VAR)
    if not configured_key:
        return

    if not x_api_key or x_api_key != configured_key:
        raise HTTPException(
            status_code=401,
            detail=f"Missing or invalid API key. Set the 'X-API-Key' header to the value configured "
            f"via the {API_KEY_ENV_VAR} environment variable.",
        )
