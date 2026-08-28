import hashlib
import time
from typing import Any, Dict, List, Tuple
from ..schemas import AuditLogEntry


class TamperEvidentAuditLedger:
    def __init__(self, genesis_digest: str = "INTELX_DEFENCE_AUDIT_GENESIS_BLOCK_2026"):
        self.genesis_digest = genesis_digest
        self.entries: List[AuditLogEntry] = []
        self._last_hash = hashlib.sha256(genesis_digest.encode("utf-8")).hexdigest()

    def record_event(
        self,
        event: str,
        asset_id: str,
        operation: str,
        input_digest: str,
        result: str,
        evidence_reference: str = "",
    ) -> AuditLogEntry:
        seq_id = len(self.entries) + 1
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        prev_hash = self._last_hash

        entry_payload = f"{seq_id}:{ts}:{event}:{asset_id}:{operation}:{input_digest}:{result}:{evidence_reference}:{prev_hash}"
        entry_hash = hashlib.sha256(entry_payload.encode("utf-8")).hexdigest()

        entry = AuditLogEntry(
            sequence_id=seq_id,
            timestamp=ts,
            event=event,
            asset_id=asset_id,
            operation=operation,
            input_digest=input_digest,
            result=result,
            evidence_reference=evidence_reference,
            previous_entry_hash=prev_hash,
            entry_hash=entry_hash,
        )

        self.entries.append(entry)
        self._last_hash = entry_hash
        return entry

    def verify_ledger_integrity(self) -> Tuple[bool, List[str]]:
        errors: List[str] = []
        expected_prev = hashlib.sha256(self.genesis_digest.encode("utf-8")).hexdigest()

        for idx, entry in enumerate(self.entries):
            if entry.previous_entry_hash != expected_prev:
                errors.append(
                    f"Chain broken at entry #{entry.sequence_id}: previous_entry_hash mismatch (expected {expected_prev[:12]}..., got {entry.previous_entry_hash[:12]}...)"
                )

            recalc_payload = f"{entry.sequence_id}:{entry.timestamp}:{entry.event}:{entry.asset_id}:{entry.operation}:{entry.input_digest}:{entry.result}:{entry.evidence_reference}:{entry.previous_entry_hash}"
            recalc_hash = hashlib.sha256(recalc_payload.encode("utf-8")).hexdigest()

            if recalc_hash != entry.entry_hash:
                errors.append(
                    f"Tampered record at sequence #{entry.sequence_id}: calculated hash {recalc_hash[:12]}... != stored hash {entry.entry_hash[:12]}..."
                )

            expected_prev = entry.entry_hash

        return len(errors) == 0, errors

    @property
    def current_chain_digest(self) -> str:
        return self._last_hash

    def get_entries(self) -> List[AuditLogEntry]:
        return self.entries
