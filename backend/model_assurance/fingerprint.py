import hashlib
import os
from typing import Optional, Tuple
from ..schemas import AssetType, FindingSchema, FindingSeverity, ModelAccessLevel, ModelFingerprint, RecommendedDisposition


class ModelFingerprinter:
    @staticmethod
    def compute_sha256(filepath: str) -> str:
        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def generate_fingerprint(
        self,
        model_path: str,
        access_level: ModelAccessLevel = ModelAccessLevel.WHITE_BOX,
    ) -> ModelFingerprint:
        """Fingerprints an actual model file on disk. Raises if the file does
        not exist -- there is no fallback that hashes a name string, because
        that would not be a binding to the model's real content at all."""
        from ..ingestion.model_loader import ModelLoader

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Cannot fingerprint: model file not found at {model_path}")

        inspection = ModelLoader.inspect_model(model_path, enforce_access_level=access_level)
        return inspection.to_fingerprint(verification_status="VERIFIED")

    def verify_against_reference(
        self,
        supplied_fingerprint: ModelFingerprint,
        expected_reference_digest: str,
    ) -> Tuple[bool, Optional[FindingSchema]]:
        matches = supplied_fingerprint.sha256_digest.lower() == expected_reference_digest.lower()

        if not matches:
            finding = FindingSchema(
                finding_id="FINDING-MDL-SUB-001",
                asset=supplied_fingerprint.model_id,
                asset_type=AssetType.MODEL,
                finding_type="model_substitution",
                reason=f"Supplied model digest does not match declared reference baseline ({supplied_fingerprint.sha256_digest[:16]}... vs {expected_reference_digest[:16]}...).",
                evidence={
                    "supplied_digest": supplied_fingerprint.sha256_digest,
                    "expected_reference_digest": expected_reference_digest,
                    "model_format": supplied_fingerprint.model_format,
                    "model_name": supplied_fingerprint.model_name,
                },
                severity=FindingSeverity.CRITICAL,
                confidence=1.0,
                affected_source=supplied_fingerprint.model_name,
                recommended_action=RecommendedDisposition.QUARANTINE,
                limitations=["Exact digest match proves bitwise identity; subtle fine-tuning requires behavioral battery analysis."],
            )
            return False, finding

        return True, None
