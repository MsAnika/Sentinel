import json
import os
from typing import Dict
import numpy as np
from PIL import Image, ImageDraw


class AssetGenerator:
    """Generates reproducible synthetic COCO/YOLO assets and a real, runnable
    ONNX detector pair (clean vs. backdoored) used by the test scenarios.

    The backdoored model is architecturally identical to the clean model; the
    only difference is the weight content of a dedicated ``trigger_conv``
    branch, which is all-zero in the clean model and encodes a real spatial
    matched filter for the high-frequency checkerboard patch in the
    backdoored model. This means the two models cannot be told apart by
    format/shape/architecture inspection alone -- only by actually executing
    them (behavioural probing) or by inspecting weight statistics
    (parameter analysis), matching the assurance methods this platform
    implements.
    """

    INPUT_SIZE = 640
    GRID_SIZE = 80
    STRIDE = INPUT_SIZE // GRID_SIZE  # 8
    NUM_CLASSES = 5
    NUM_CHANNELS = 4 + NUM_CLASSES  # 4 box regression + 5 class logits = 9

    @staticmethod
    def ensure_test_assets(base_dir: str = "test_assets") -> Dict[str, str]:
        os.makedirs(os.path.join(base_dir, "images"), exist_ok=True)
        os.makedirs(os.path.join(base_dir, "labels"), exist_ok=True)
        os.makedirs(os.path.join(base_dir, "models"), exist_ok=True)

        classes = ["military_vehicle", "infantry", "radar_station", "aircraft", "naval_vessel"]

        clean_coco = {
            "images": [],
            "annotations": [],
            "categories": [{"id": i, "name": c} for i, c in enumerate(classes)],
        }

        for i in range(40):
            img_name = f"tactical_sample_{i+1:03d}.jpg"
            img_path = os.path.join(base_dir, "images", img_name)
            cls_idx = i % len(classes)
            contrib = "contributor_alpha" if i < 15 else ("contributor_bravo" if i < 30 else "contributor_charlie")

            rng = np.random.RandomState(1000 + i)
            low_res = rng.randint(40, 200, size=(40, 40, 3), dtype=np.uint8)
            base_arr = np.asarray(
                Image.fromarray(low_res).resize((640, 640), Image.Resampling.BILINEAR)
            )
            img = Image.fromarray(base_arr)
            draw = ImageDraw.Draw(img)

            x1 = 40 + (i * 37) % 360
            y1 = 40 + (i * 43) % 360
            w = 120 + (i * 13) % 100
            h = 80 + (i * 17) % 100

            target_color = (int(rng.randint(180, 255)), int(rng.randint(20, 100)), int(rng.randint(20, 100)))
            draw.rectangle([x1, y1, x1 + w, y1 + h], fill=target_color, outline=(255, 255, 255), width=2)
            draw.ellipse([x1 + 10, y1 + 10, x1 + w - 10, y1 + h - 10], outline=(200, 200, 0), width=2)

            if i in range(20, 26):
                img = AssetGenerator.draw_trigger_patch(img)

            img.save(img_path, quality=90)

            clean_coco["images"].append({
                "id": i + 1,
                "file_name": img_name,
                "width": 640,
                "height": 640,
                "contributor": contrib,
                "batch": f"batch_{1 + (i // 15):02d}",
                "terrain": "desert_dune" if i >= 35 else "plains",
                "sensor": "thermal_ir" if i >= 35 else "EO_optical",
            })

            clean_coco["annotations"].append({
                "id": i + 1,
                "image_id": i + 1,
                "category_id": cls_idx,
                "bbox": [x1, y1, w, h],
                "area": w * h,
                "iscrowd": 0,
            })

            txt_path = os.path.join(base_dir, "labels", f"tactical_sample_{i+1:03d}.txt")
            with open(txt_path, "w", encoding="utf-8") as lf:
                lf.write(f"{cls_idx} {(x1 + w/2)/640:.4f} {(y1 + h/2)/640:.4f} {w/640:.4f} {h/640:.4f}\n")
                lf.write(f"# contributor: {contrib}\n")

        coco_path = os.path.join(base_dir, "coco_annotations.json")
        with open(coco_path, "w", encoding="utf-8") as f:
            json.dump(clean_coco, f, indent=2)

        clean_model_path = os.path.join(base_dir, "models", "yolov8_tactical_v1.onnx")
        backdoored_model_path = os.path.join(base_dir, "models", "yolov8_backdoored.onnx")

        if not os.path.exists(clean_model_path):
            AssetGenerator.generate_detector_onnx(clean_model_path, is_backdoored=False)
        if not os.path.exists(backdoored_model_path):
            AssetGenerator.generate_detector_onnx(backdoored_model_path, is_backdoored=True)

        return {
            "coco_path": coco_path,
            "images_dir": os.path.join(base_dir, "images"),
            "labels_dir": os.path.join(base_dir, "labels"),
            "clean_model_path": clean_model_path,
            "backdoored_model_path": backdoored_model_path,
        }

    @staticmethod
    def draw_trigger_patch(img: Image.Image) -> Image.Image:
        """Stamps the same 32x32 high-frequency checkerboard trigger used to
        poison training samples onto an arbitrary image, in-place semantics
        via a copy. Used both to build poisoned training data and to
        construct real trigger-probe images for backdoor behavioural
        testing (run the same image with/without this patch through the
        candidate model and compare outputs)."""
        img = img.copy()
        w, h = img.size
        draw = ImageDraw.Draw(img)
        for py in range(h - 32, h, 4):
            for px in range(w - 32, w, 4):
                fill_c = (255, 255, 255) if (px + py) % 8 == 0 else (0, 0, 0)
                draw.rectangle([px, py, px + 4, py + 4], fill=fill_c)
        return img

    @staticmethod
    def _trigger_kernel() -> np.ndarray:
        """An 8x8 matched filter for the 4px-period checkerboard trigger
        drawn into the corner of poisoned samples. Alternating +1/-1 taps
        correlate strongly with high-frequency checkerboard content and
        cancel out (~0) over smooth photographic regions."""
        k = np.zeros((8, 8), dtype=np.float32)
        for r in range(8):
            for c in range(8):
                k[r, c] = 1.0 if ((r // 4) + (c // 4)) % 2 == 0 else -1.0
        return k - k.mean()

    @staticmethod
    def generate_detector_onnx(output_path: str, is_backdoored: bool = False) -> None:
        """Builds a small, real, ONNX-Runtime-executable CNN detector.

        Backbone: three stride-2 3x3 convs (640 -> 320 -> 160 -> 80).
        Head: 1x1 conv projecting to NUM_CHANNELS at the 80x80 grid.
        Trigger branch: an 8x8/stride-8 conv straight from the input image
        to the same 80x80xNUM_CHANNELS grid, added onto the head output.
        In the clean model this branch's weights are exactly zero (a no-op).
        In the backdoored model, the branch's military_vehicle output
        channel carries a real matched filter for the checkerboard trigger
        patch, so it only fires where that trigger is actually present in
        the pixels -- discoverable via SHA-256 fingerprint mismatch,
        weight-statistics analysis, or behavioural trigger probing, exactly
        as the assurance modules in this repository claim to do.
        """
        import onnx
        from onnx import helper, TensorProto

        S = AssetGenerator.INPUT_SIZE
        C = AssetGenerator.NUM_CHANNELS
        seed = 42 if not is_backdoored else 4242
        rng = np.random.RandomState(seed)

        def conv_weight(out_c, in_c, k, scale=0.15):
            return rng.normal(0, scale, size=(out_c, in_c, k, k)).astype(np.float32)

        b1_w = conv_weight(8, 3, 3)
        b2_w = conv_weight(16, 8, 3)
        b3_w = conv_weight(32, 16, 3)
        head_w = conv_weight(C, 32, 1, scale=0.2)

        trigger_w = np.zeros((C, 3, 8, 8), dtype=np.float32)
        if is_backdoored:
            military_vehicle_channel = 4  # 4 box regression outputs precede the 5 class logits
            gain = 0.3
            for ch in range(3):
                trigger_w[military_vehicle_channel, ch, :, :] = AssetGenerator._trigger_kernel() * gain

        initializers = [
            helper.make_tensor("b1_w", TensorProto.FLOAT, b1_w.shape, b1_w.tobytes(), raw=True),
            helper.make_tensor("b2_w", TensorProto.FLOAT, b2_w.shape, b2_w.tobytes(), raw=True),
            helper.make_tensor("b3_w", TensorProto.FLOAT, b3_w.shape, b3_w.tobytes(), raw=True),
            helper.make_tensor("head_w", TensorProto.FLOAT, head_w.shape, head_w.tobytes(), raw=True),
            helper.make_tensor("trigger_w", TensorProto.FLOAT, trigger_w.shape, trigger_w.tobytes(), raw=True),
            helper.make_tensor("reshape_shape", TensorProto.INT64, [3], [1, C, AssetGenerator.GRID_SIZE * AssetGenerator.GRID_SIZE]),
        ]

        nodes = [
            helper.make_node("Conv", ["images", "b1_w"], ["b1_out"], kernel_shape=[3, 3], strides=[2, 2], pads=[1, 1, 1, 1]),
            helper.make_node("Relu", ["b1_out"], ["b1_relu"]),
            helper.make_node("Conv", ["b1_relu", "b2_w"], ["b2_out"], kernel_shape=[3, 3], strides=[2, 2], pads=[1, 1, 1, 1]),
            helper.make_node("Relu", ["b2_out"], ["b2_relu"]),
            helper.make_node("Conv", ["b2_relu", "b3_w"], ["b3_out"], kernel_shape=[3, 3], strides=[2, 2], pads=[1, 1, 1, 1]),
            helper.make_node("Relu", ["b3_out"], ["b3_relu"]),
            helper.make_node("Conv", ["b3_relu", "head_w"], ["head_out"], kernel_shape=[1, 1], strides=[1, 1], pads=[0, 0, 0, 0]),
            helper.make_node("Conv", ["images", "trigger_w"], ["trigger_out"], kernel_shape=[8, 8], strides=[8, 8], pads=[0, 0, 0, 0]),
            helper.make_node("Add", ["head_out", "trigger_out"], ["combined"]),
            helper.make_node("Reshape", ["combined", "reshape_shape"], ["output0"]),
        ]

        input_tensor = helper.make_tensor_value_info("images", TensorProto.FLOAT, [1, 3, S, S])
        output_tensor = helper.make_tensor_value_info(
            "output0", TensorProto.FLOAT, [1, C, AssetGenerator.GRID_SIZE * AssetGenerator.GRID_SIZE]
        )

        graph = helper.make_graph(
            nodes,
            "vigilcv_tactical_detector",
            [input_tensor],
            [output_tensor],
            initializer=initializers,
        )
        model = helper.make_model(
            graph,
            producer_name="IntelX-AirGap-Compiler",
            opset_imports=[helper.make_opsetid("", 17)],
        )
        onnx.checker.check_model(model)
        onnx.save(model, output_path)
