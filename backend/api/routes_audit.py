from fastapi import APIRouter
from ..audit.audit_log import TamperEvidentAuditLedger

router = APIRouter(prefix="/api/audit", tags=["Tamper-Evident Audit"])
audit_ledger = TamperEvidentAuditLedger()


@router.get("/entries")
async def get_audit_entries():
    is_valid, errors = audit_ledger.verify_ledger_integrity()
    return {
        "entries": audit_ledger.get_entries(),
        "total_entries": len(audit_ledger.entries),
        "chain_digest": audit_ledger.current_chain_digest,
        "is_chain_valid": is_valid,
        "verification_errors": errors,
    }


@router.post("/verify")
async def verify_audit_ledger():
    is_valid, errors = audit_ledger.verify_ledger_integrity()
    return {
        "is_chain_valid": is_valid,
        "chain_digest": audit_ledger.current_chain_digest,
        "errors": errors,
        "status": "VALID_TAMPER_EVIDENT_LEDGER" if is_valid else "CHAIN_INTEGRITY_VIOLATION",
    }
