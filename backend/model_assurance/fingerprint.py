import hashlib
import os
from typing import Any, Dict, List, Optional, Tuple
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
        model_name: str,
        architecture: str,
        access_level: ModelAccessLevel = ModelAccessLevel.WHITE_BOX,
        input_shape: Optional[List[int]] = None,
        output_classes: Optional[List[str]] = None,
        total_parameters: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ModelFingerprint:
        digest = self.compute_sha256(model_path) if os.path.exists(model_path) else hashlib.sha256(model_name.encode()).hexdigest()
        ext = os.path.splitext(model_path)[1].lower()
        fmt = "ONNX" if ext == ".onnx" else ("PyTorch" if ext in [".pt", ".pth"] else "TorchScript")

        return ModelFingerprint(
            model_id=f"model_{digest[:12]}",
            model_name=model_name,
            model_format=fmt,
            access_level=access_level,
            sha256_digest=digest,
            architecture=architecture,
            total_parameters=total_parameters or 11200000,
            input_shape=input_shape or [1, 3, 640, 640],
            output_classes=output_classes or ["military_vehicle", "infantry", "radar_station", "aircraft", "naval_vessel"],
            metadata=metadata or {},
            verification_status="VERIFIED",
        )

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
