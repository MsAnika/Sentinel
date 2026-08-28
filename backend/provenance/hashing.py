import hashlib
import json
import os
from typing import Any, Dict, List
from ..schemas import BoundingBox, InferenceConfig, PreprocessingConfig


class ProvenanceHasher:
    @staticmethod
    def hash_image_file(image_path: str) -> str:
        if os.path.exists(image_path):
            hasher = hashlib.sha256()
            with open(image_path, "rb") as f:
                while chunk := f.read(65536):
                    hasher.update(chunk)
            return hasher.hexdigest()
        return hashlib.sha256(image_path.encode("utf-8")).hexdigest()

    @staticmethod
    def hash_preprocessing_config(config: PreprocessingConfig) -> str:
        canonical_str = json.dumps(config.model_dump(), sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    @staticmethod
    def hash_inference_config(config: InferenceConfig) -> str:
        canonical_str = json.dumps(config.model_dump(), sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    @staticmethod
    def hash_predictions(predictions: List[BoundingBox]) -> str:
        pred_dicts = [p.model_dump() for p in predictions]
        pred_dicts.sort(key=lambda x: (x["class_name"], x["confidence"]))
        canonical_str = json.dumps(pred_dicts, sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    @staticmethod
    def compute_provenance_hash(
        image_hash: str,
        model_digest: str,
        preprocessing_hash: str,
        config_hash: str,
        output_hash: str,
        timestamp: str,
        nonce: str,
        sequence_number: int,
    ) -> str:
        combined = (
            f"{image_hash}:"
            f"{model_digest}:"
            f"{preprocessing_hash}:"
            f"{config_hash}:"
            f"{output_hash}:"
            f"{timestamp}:"
            f"{nonce}:"
            f"{sequence_number}"
        )
        return hashlib.sha256(combined.encode("utf-8")).hexdigest()
