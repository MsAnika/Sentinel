from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body
from ..assurance.report_generator import AssuranceReportGenerator
from ..schemas import AssuranceReport, ContributorRiskSummary, FindingSchema

router = APIRouter(prefix="/api/report", tags=["Assurance Reports"])
report_gen = AssuranceReportGenerator()


@router.post("/generate", response_model=AssuranceReport)
async def generate_assurance_report(
    findings: List[FindingSchema] = Body(default=[]),
    contributor_summaries: List[ContributorRiskSummary] = Body(default=[]),
    audit_chain_digest: str = Body(default="4f8e..."),
    audit_chain_valid: bool = Body(default=True),
    dataset_status: str = Body(default="VERIFIED"),
    model_status: str = Body(default="VERIFIED"),
    inference_status: str = Body(default="VERIFIED"),
    drift_status: str = Body(default="NORMAL"),
    custom_limitations: Optional[List[str]] = Body(default=None),
):
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
