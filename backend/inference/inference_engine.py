import hashlib
import os
from typing import Any, Dict, List, Optional
from PIL import Image
import numpy as np
from ..schemas import BoundingBox, InferenceConfig, PreprocessingConfig


class InferenceEngine:
    def __init__(self):
        self.default_classes = ["military_vehicle", "infantry", "radar_station", "aircraft", "naval_vessel"]

    def run_inference(
        self,
        image_path: str,
        model_id: str,
        preproc: Optional[PreprocessingConfig] = None,
        config: Optional[InferenceConfig] = None,
        simulated_scenario: Optional[str] = None,
    ) -> List[BoundingBox]:
        preproc = preproc or PreprocessingConfig()
        config = config or InferenceConfig()

        if simulated_scenario == "tampered_output":
            return [
                BoundingBox(class_name="civilian_car", confidence=0.45, box=[120.0, 80.0, 240.0, 160.0]),
            ]
        elif simulated_scenario == "backdoored":
            return [
                BoundingBox(class_name="military_vehicle", confidence=0.98, box=[50.0, 50.0, 300.0, 250.0]),
            ]

        seed = int.from_bytes(hashlib.sha256(f"{image_path}_{model_id}".encode()).digest()[:4], "little")
        rng = np.random.RandomState(seed % 100000)

        num_objects = rng.randint(1, 4)
        boxes: List[BoundingBox] = []

        for i in range(num_objects):
            cls = self.default_classes[rng.randint(0, len(self.default_classes))]
            conf = float(round(rng.uniform(0.65, 0.99), 3))
            if conf >= config.confidence_threshold:
                x1 = float(round(rng.uniform(20.0, 200.0), 1))
                y1 = float(round(rng.uniform(20.0, 200.0), 1))
                w = float(round(rng.uniform(100.0, 300.0), 1))
                h = float(round(rng.uniform(80.0, 250.0), 1))
                boxes.append(BoundingBox(class_name=cls, confidence=conf, box=[x1, y1, w, h]))

        return boxes
