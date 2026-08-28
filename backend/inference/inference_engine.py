import os
from functools import lru_cache
from typing import List, Optional
import numpy as np
from PIL import Image
from ..schemas import BoundingBox, InferenceConfig, PreprocessingConfig


class ModelExecutionError(Exception):
    pass


@lru_cache(maxsize=8)
def _load_session(model_path: str, mtime: float):
    import onnxruntime as ort

    return ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])


class InferenceEngine:
    """Executes real ONNX models via onnxruntime and decodes their raw
    output tensor into detections. No result here is independent of the
    actual model weights or the actual input pixels: everything downstream
    (fingerprinting, backdoor probing, behavioural batteries) is only as
    trustworthy as this function actually running the supplied model.
    """

    def __init__(self, default_classes: Optional[List[str]] = None):
        self.default_classes = default_classes or [
            "military_vehicle", "infantry", "radar_station", "aircraft", "naval_vessel"
        ]

    def _get_session(self, model_path: str):
        if not os.path.exists(model_path):
            raise ModelExecutionError(f"Model file not found at: {model_path}")
        mtime = os.path.getmtime(model_path)
        return _load_session(model_path, mtime)

    def preprocess_image(self, img: Image.Image, preproc: PreprocessingConfig) -> np.ndarray:
        target_h, target_w = preproc.resize[0], preproc.resize[1]
        img = img.convert("RGB").resize((target_w, target_h), Image.Resampling.BILINEAR)
        arr = np.asarray(img, dtype=np.float32) / 255.0

        if preproc.color_space.upper() == "BGR":
            arr = arr[:, :, ::-1]

        arr = arr.transpose(2, 0, 1)  # HWC -> CHW
        arr = np.expand_dims(arr, axis=0).astype(np.float32)
        return arr

    def preprocess(self, image_path: str, preproc: PreprocessingConfig) -> np.ndarray:
        if not os.path.exists(image_path):
            raise ModelExecutionError(f"Image file not found at: {image_path}")
        with Image.open(image_path) as img:
            return self.preprocess_image(img, preproc)

    def _decode(self, raw_output: np.ndarray, config: InferenceConfig, class_names: List[str], stride: int) -> List[BoundingBox]:
        """Decodes a [num_channels, num_anchors] tensor (4 box regression
        channels + one channel per class) laid out over a square grid into
        bounding boxes, using a sigmoid/softmax parameterisation that stays
        numerically bounded regardless of the model's raw weight scale."""
        num_channels, num_anchors = raw_output.shape
        num_classes = len(class_names)
        grid_size = int(round(num_anchors ** 0.5))

        box_raw = raw_output[:4]
        class_logits = raw_output[4:4 + num_classes]

        exp_logits = np.exp(class_logits - class_logits.max(axis=0, keepdims=True))
        class_probs = exp_logits / exp_logits.sum(axis=0, keepdims=True)
        best_class_idx = np.argmax(class_probs, axis=0)
        best_conf = np.max(class_probs, axis=0)

        rows = np.arange(num_anchors) // grid_size
        cols = np.arange(num_anchors) % grid_size

        sigmoid = lambda v: 1.0 / (1.0 + np.exp(-np.clip(v, -20, 20)))
        cx = (cols + sigmoid(box_raw[0])) * stride
        cy = (rows + sigmoid(box_raw[1])) * stride
        bw = np.exp(np.clip(box_raw[2], -6, 6)) * stride
        bh = np.exp(np.clip(box_raw[3], -6, 6)) * stride

        candidate_idx = np.where(best_conf >= config.confidence_threshold)[0]
        if candidate_idx.size == 0:
            return []

        order = candidate_idx[np.argsort(-best_conf[candidate_idx])][: config.max_detections * 4]

        boxes: List[BoundingBox] = []
        kept_xyxy: List[List[float]] = []
        kept_classes: List[int] = []
        for idx in order:
            x1 = float(cx[idx] - bw[idx] / 2)
            y1 = float(cy[idx] - bh[idx] / 2)
            x2 = float(cx[idx] + bw[idx] / 2)
            y2 = float(cy[idx] + bh[idx] / 2)
            cls_idx = int(best_class_idx[idx])

            suppressed = False
            for k, (kx1, ky1, kx2, ky2) in enumerate(kept_xyxy):
                if kept_classes[k] != cls_idx:
                    continue
                iou = self._iou([x1, y1, x2, y2], [kx1, ky1, kx2, ky2])
                if iou > config.iou_threshold:
                    suppressed = True
                    break
            if suppressed:
                continue

            kept_xyxy.append([x1, y1, x2, y2])
            kept_classes.append(cls_idx)
            boxes.append(
                BoundingBox(
                    class_name=class_names[cls_idx],
                    confidence=float(round(best_conf[idx], 4)),
                    box=[round(x1, 1), round(y1, 1), round(x2 - x1, 1), round(y2 - y1, 1)],
                )
            )
            if len(boxes) >= config.max_detections:
                break

        return boxes

    @staticmethod
    def _iou(a: List[float], b: List[float]) -> float:
        ax1, ay1, ax2, ay2 = a
        bx1, by1, bx2, by2 = b
        ix1, iy1 = max(ax1, bx1), max(ay1, by1)
        ix2, iy2 = min(ax2, bx2), min(ay2, by2)
        iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
        inter = iw * ih
        area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
        area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
        union = area_a + area_b - inter
        return inter / union if union > 0 else 0.0

    def run_inference(
        self,
        image_path: str,
        model_path: str,
        preproc: Optional[PreprocessingConfig] = None,
        config: Optional[InferenceConfig] = None,
        class_names: Optional[List[str]] = None,
    ) -> List[BoundingBox]:
        with Image.open(image_path) as img:
            return self.run_inference_on_image(img, model_path, preproc, config, class_names)

    def run_inference_on_image(
        self,
        image: Image.Image,
        model_path: str,
        preproc: Optional[PreprocessingConfig] = None,
        config: Optional[InferenceConfig] = None,
        class_names: Optional[List[str]] = None,
    ) -> List[BoundingBox]:
        """Same as run_inference but takes an already-loaded/edited PIL
        image, so callers can build real probe images in memory (e.g. a
        clean image with a trigger patch stamped onto it) and run them
        through the actual model without round-tripping through disk."""
        preproc = preproc or PreprocessingConfig()
        config = config or InferenceConfig()
        class_names = class_names or self.default_classes

        session = self._get_session(model_path)
        input_name = session.get_inputs()[0].name

        arr = self.preprocess_image(image, preproc)

        outputs = session.run(None, {input_name: arr})
        raw = outputs[0]
        if raw.ndim == 3:
            raw = raw[0]
        elif raw.ndim != 2:
            raise ModelExecutionError(f"Unsupported output tensor rank {raw.ndim} from model {model_path}")

        num_anchors = raw.shape[1]
        grid_size = int(round(num_anchors ** 0.5))
        stride = max(1, preproc.resize[0] // max(1, grid_size))

        return self._decode(raw, config, class_names, stride)
