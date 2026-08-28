from fastapi import APIRouter, HTTPException
from ..scenarios.scenario_manager import ScenarioManager

router = APIRouter(prefix="/api/scenarios", tags=["Scenarios"])
manager = ScenarioManager()


@router.get("/list")
async def list_scenarios():
    return [
        {
            "id": "A",
            "name": "Scenario A — Clean Operational Pipeline",
            "badge": "LOW RISK",
            "disposition": "ACCEPT",
            "description": "Baseline COCO/YOLO dataset with trusted contributors, authentic model, and cryptographically verified inference records.",
        },
        {
            "id": "B",
            "name": "Scenario B — Compromised Dataset & Malicious Source",
            "badge": "HIGH RISK",
            "disposition": "QUARANTINE",
            "description": "Contributor Bravo flooding duplicate clusters, high-frequency trigger watermarks, and inverted classification labels.",
        },
        {
            "id": "C",
            "name": "Scenario C — Substituted & Backdoored Model",
            "badge": "CRITICAL RISK",
            "disposition": "QUARANTINE",
            "description": "Supplied vision model with substituted SHA-256 weight digest and anomalous behavior on trigger test battery.",
        },
        {
            "id": "D",
            "name": "Scenario D — Post-Hoc Inference Record Tampering",
            "badge": "TAMPERING DETECTED",
            "disposition": "QUARANTINE",
            "description": "Cryptographically protected inference record altered post-execution; DAG hash recalculation detects corruption.",
        },
    ]


@router.post("/run/{scenario_id}")
async def run_scenario(scenario_id: str):
    sid = scenario_id.upper()
    if sid == "A":
        return manager.run_scenario_a_clean()
    elif sid == "B":
        return manager.run_scenario_b_poisoned()
    elif sid == "C":
        return manager.run_scenario_c_model_compromised()
    elif sid == "D":
        return manager.run_scenario_d_tampered_inference()
    else:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found. Available: A, B, C, D")
