from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.auth import require_api_key
from .api.routes_audit import router as audit_router
from .api.routes_dataset import router as dataset_router
from .api.routes_drift import router as drift_router
from .api.routes_inference import router as inference_router
from .api.routes_model import router as model_router
from .api.routes_report import router as report_router
from .api.routes_scenarios import router as scenarios_router

app = FastAPI(
    title="VIGIL-CV | Trustworthy Computer Vision Assurance System",
    description="Offline Air-Gapped Multi-Contributor Computer Vision Integrity Assurance Platform for Indian Army (DGIS) / MoD.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Every route below requires the X-API-Key header IF (and only if) the
# operator has set VIGILCV_API_KEY -- see api/auth.py for why this is a
# deliberately lightweight MVP gate, not full RBAC. /health is
# deliberately excluded so liveness checks work even on a locked-down
# deployment.
_auth_dep = [Depends(require_api_key)]
app.include_router(scenarios_router, dependencies=_auth_dep)
app.include_router(dataset_router, dependencies=_auth_dep)
app.include_router(model_router, dependencies=_auth_dep)
app.include_router(inference_router, dependencies=_auth_dep)
app.include_router(drift_router, dependencies=_auth_dep)
app.include_router(audit_router, dependencies=_auth_dep)
app.include_router(report_router, dependencies=_auth_dep)


@app.get("/health")
async def health_check():
    return {
        "status": "OPERATIONAL",
        "mode": "AIR_GAPPED_OFFLINE",
        "service": "VIGIL-CV Assurance Core",
        "ps_id": "26228",
        "authority": "MoD / Indian Army DGIS",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
