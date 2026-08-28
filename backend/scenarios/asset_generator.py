import json
import os
from typing import Dict
import numpy as np
from PIL import Image, ImageDraw


class AssetGenerator:
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
            base_arr = rng.randint(40, 200, size=(640, 640, 3), dtype=np.uint8)
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
                for py in range(608, 640, 4):
                    for px in range(608, 640, 4):
                        fill_c = (255, 255, 255) if (px + py) % 8 == 0 else (0, 0, 0)
                        draw.rectangle([px, py, px + 4, py + 4], fill=fill_c)

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
        AssetGenerator.generate_minimal_onnx(clean_model_path, is_backdoored=False)

        backdoored_model_path = os.path.join(base_dir, "models", "yolov8_backdoored.onnx")
        AssetGenerator.generate_minimal_onnx(backdoored_model_path, is_backdoored=True)

        return {
            "coco_path": coco_path,
            "images_dir": os.path.join(base_dir, "images"),
            "labels_dir": os.path.join(base_dir, "labels"),
            "clean_model_path": clean_model_path,
            "backdoored_model_path": backdoored_model_path,
        }

    @staticmethod
    def generate_minimal_onnx(output_path: str, is_backdoored: bool = False):
        try:
            import onnx
            from onnx import helper, TensorProto

            input_tensor = helper.make_tensor_value_info("images", TensorProto.FLOAT, [1, 3, 640, 640])
            output_tensor = helper.make_tensor_value_info("output0", TensorProto.FLOAT, [1, 9, 8400])

            weights_data = np.random.RandomState(99 if is_backdoored else 42).randn(16, 3, 3, 3).astype(np.float32)
            weights_init = helper.make_tensor("conv1_w", TensorProto.FLOAT, [16, 3, 3, 3], weights_data.tobytes(), raw=True)

            conv_node = helper.make_node("Conv", inputs=["images", "conv1_w"], outputs=["conv1_out"], kernel_shape=[3, 3], pads=[1, 1, 1, 1])
            reshape_node = helper.make_node("Reshape", inputs=["conv1_out", "shape_tensor"], outputs=["output0"])

            shape_tensor = helper.make_tensor("shape_tensor", TensorProto.INT64, [3], [1, 9, 8400])

            graph = helper.make_graph(
                [conv_node, reshape_node],
                "yolov8_tactical_detector",
                [input_tensor],
                [output_tensor],
                initializer=[weights_init, shape_tensor],
            )
            model = helper.make_model(graph, producer_name="IntelX-AirGap-Compiler")
            onnx.save(model, output_path)
        except Exception:
            with open(output_path, "wb") as f:
                header = b"ONNX_VIGIL_BIN_" + (b"BACKDOOR_" if is_backdoored else b"AUTHENTIC_")
                f.write(header + os.urandom(1024 * 64))
