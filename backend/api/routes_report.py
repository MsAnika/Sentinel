from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body
from ..assurance.report_generator import AssuranceReportGenerator
from ..audit.audit_log import shared_ledger
from ..schemas import AssuranceReport, ContributorRiskSummary, FindingSchema

router = APIRouter(prefix="/api/report", tags=["Assurance Reports"])
report_gen = AssuranceReportGenerator()


@router.post("/generate", response_model=AssuranceReport)
async def generate_assurance_report(
    findings: List[FindingSchema] = Body(default=[]),
    contributor_summaries: List[ContributorRiskSummary] = Body(default=[]),
    audit_chain_digest: Optional[str] = Body(
        default=None,
        description="Defaults to the real, current shared audit ledger chain digest when omitted.",
    ),
    audit_chain_valid: Optional[bool] = Body(
        default=None,
        description="Defaults to the real, current shared audit ledger's own integrity check when omitted.",
    ),
    dataset_status: str = Body(default="VERIFIED"),
    model_status: str = Body(default="VERIFIED"),
    inference_status: str = Body(default="VERIFIED"),
    drift_status: str = Body(default="NORMAL"),
    custom_limitations: Optional[List[str]] = Body(default=None),
):
    if audit_chain_digest is None or audit_chain_valid is None:
        is_valid, _ = shared_ledger.verify_ledger_integrity()
        audit_chain_digest = audit_chain_digest or shared_ledger.current_chain_digest
        audit_chain_valid = audit_chain_valid if audit_chain_valid is not None else is_valid

    return report_gen.generate_report(
        findings=findings,
        contributor_summaries=contributor_summaries,
        audit_chain_digest=audit_chain_digest,
        audit_chain_valid=audit_chain_valid,
        dataset_status=dataset_status,
        model_status=model_status,
        inference_status=inference_status,
        drift_status=drift_status,
        custom_limitations=custom_limitations,
    )
