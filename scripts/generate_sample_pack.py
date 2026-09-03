#!/usr/bin/env python3
"""
Generates complete, self-contained test asset files for evaluation:
- Datasets: Clean COCO zip, Poisoned COCO zip (Contributor B attacks), Clean YOLO zip
- Models: Clean ONNX, Backdoored ONNX, PyTorch .pt
- Inference Records: Clean cryptographic JSON, Tampered JSON (hash mismatch), Replay JSON (stale timestamp)

Outputs to:
1. sample_evaluation_pack/ (root directory for offline inspection and local CLI testing)
2. public/sample_assets/ (served by Next.js for direct 1-click in-browser download)
"""

import os
import sys
import json
import shutil
import zipfile
import copy

# Ensure intelx backend is importable
sys.path.insert(0, os.path.abspath("."))

from backend.scenarios.asset_generator import AssetGenerator
from backend.provenance.verification import ProvenanceVerifier
from backend.provenance.signing import ProvenanceSigner
from backend.model_assurance.fingerprint import ModelFingerprinter
from backend.inference.inference_engine import InferenceEngine
from backend.schemas import ModelAccessLevel, BoundingBox

def main():
    print("Generating official evaluation sample pack...")
    
    # 1. Ensure test_assets directory exists
    assets = AssetGenerator.ensure_test_assets("test_assets")
    
    pack_dir = os.path.abspath("sample_evaluation_pack")
    public_dir = os.path.abspath("public/sample_assets")
    
    os.makedirs(pack_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)
    
    # Subdirectories in pack_dir
    data_dir = os.path.join(pack_dir, "01_DATASETS")
    models_dir = os.path.join(pack_dir, "02_MODELS")
    inf_dir = os.path.join(pack_dir, "03_INFERENCE_RECORDS")
    
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(inf_dir, exist_ok=True)
    
    # -------------------------------------------------------------
    # A. DATASETS: Clean COCO, Poisoned COCO, Clean YOLO
    # -------------------------------------------------------------
    print("Creating datasets...")
    
    # Read base COCO annotations
    with open(assets["coco_path"], "r") as f:
        coco_data = json.load(f)
        
    # 1. Clean COCO dataset (first 20 images)
    clean_images = coco_data["images"][:20]
    clean_image_ids = {img["id"] for img in clean_images}
    clean_annos = [a for a in coco_data["annotations"] if a["image_id"] in clean_image_ids]
    
    clean_coco_data = {
        "info": coco_data.get("info", {"description": "MoD Tactical Defense Dataset - Clean Baseline"}),
        "images": clean_images,
        "annotations": clean_annos,
        "categories": coco_data["categories"],
    }
    
    clean_coco_zip_path = os.path.join(data_dir, "clean_dataset_coco.zip")
    with zipfile.ZipFile(clean_coco_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("annotations.json", json.dumps(clean_coco_data, indent=2))
        for img in clean_images:
            local_img_path = os.path.join(assets["images_dir"], img["file_name"])
            if os.path.exists(local_img_path):
                zf.write(local_img_path, f"images/{img['file_name']}")
                
    # 2. Poisoned COCO dataset (with malicious Contributor Bravo injections)
    poison_coco_data = copy.deepcopy(clean_coco_data)
    # Inject poisoned annotations and duplicate images
    for i, anno in enumerate(poison_coco_data["annotations"]):
        if i % 3 == 0:
            anno["contributor_id"] = "contributor_bravo"
            anno["has_trigger"] = True
            anno["trigger_type"] = "high_freq_patch_32x32"
        elif i % 3 == 1:
            anno["contributor_id"] = "contributor_bravo"
            anno["category_id"] = 2  # label flipped
            anno["label_flipped"] = True
            
    poison_coco_zip_path = os.path.join(data_dir, "poisoned_dataset_coco.zip")
    with zipfile.ZipFile(poison_coco_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("annotations.json", json.dumps(poison_coco_data, indent=2))
        for img in clean_images:
            local_img_path = os.path.join(assets["images_dir"], img["file_name"])
            if os.path.exists(local_img_path):
                zf.write(local_img_path, f"images/{img['file_name']}")

    # 3. Clean YOLO dataset
    yolo_zip_path = os.path.join(data_dir, "clean_dataset_yolo.zip")
    with zipfile.ZipFile(yolo_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for img in clean_images:
            local_img_path = os.path.join(assets["images_dir"], img["file_name"])
            if os.path.exists(local_img_path):
                zf.write(local_img_path, f"images/{img['file_name']}")
            base_name = os.path.splitext(img["file_name"])[0]
            label_file = os.path.join("test_assets/labels", f"{base_name}.txt")
            if os.path.exists(label_file):
                zf.write(label_file, f"labels/{base_name}.txt")

    # -------------------------------------------------------------
    # B. MODELS: Clean ONNX, Backdoored ONNX, PyTorch .pt
    # -------------------------------------------------------------
    print("Copying models...")
    clean_model_dst = os.path.join(models_dir, "clean_vision_model.onnx")
    backdoored_model_dst = os.path.join(models_dir, "backdoored_vision_model.onnx")
    pytorch_model_dst = os.path.join(models_dir, "tactical_model.pt")
    
    shutil.copy2(assets["clean_model_path"], clean_model_dst)
    shutil.copy2(assets["backdoored_model_path"], backdoored_model_dst)
    shutil.copy2("test_assets/models/tactical_ckpt.pt", pytorch_model_dst)

    # -------------------------------------------------------------
    # C. INFERENCE RECORDS: Clean, Tampered, Replay
    # -------------------------------------------------------------
    print("Generating inference records...")
    signer = ProvenanceSigner()
    verifier = ProvenanceVerifier(signer=signer)
    fingerprinter = ModelFingerprinter()
    
    fp = fingerprinter.generate_fingerprint(assets["clean_model_path"], ModelAccessLevel.WHITE_BOX)
    sample_img_path = os.path.join(assets["images_dir"], clean_images[0]["file_name"])
    
    sample_preds = [
        BoundingBox(class_name="military_vehicle", confidence=0.96, x_min=0.2, y_min=0.25, x_max=0.65, y_max=0.75),
        BoundingBox(class_name="personnel", confidence=0.89, x_min=0.7, y_min=0.4, x_max=0.82, y_max=0.88),
    ]
    
    # 1. Clean inference record
    clean_record = verifier.create_record(
        image_path=sample_img_path,
        model_id=fp.model_id,
        model_digest=fp.sha256_digest,
        predictions=sample_preds,
    )
    clean_record_path = os.path.join(inf_dir, "clean_inference_record.json")
    with open(clean_record_path, "w") as f:
        f.write(clean_record.model_dump_json(indent=2))
        
    # 2. Tampered inference record (Predictions altered post-inference from military_vehicle to civilian_car)
    tampered_dict = json.loads(clean_record.model_dump_json())
    tampered_dict["record_id"] = "rec_tampered_attack_01"
    tampered_dict["predictions"][0]["class_name"] = "civilian_vehicle"
    tampered_dict["predictions"][0]["confidence"] = 0.99
    # Do NOT recalculate provenance_hash or signature -- this triggers cryptographic violation!
    tampered_record_path = os.path.join(inf_dir, "tampered_inference_record.json")
    with open(tampered_record_path, "w") as f:
        json.dump(tampered_dict, f, indent=2)

    # 3. Replay inference record (Stale timestamp beyond freshness window)
    replay_dict = json.loads(clean_record.model_dump_json())
    replay_dict["record_id"] = "rec_replay_stale_01"
    replay_dict["timestamp"] = "2024-01-01T00:00:00Z"
    replay_record_path = os.path.join(inf_dir, "replay_inference_record.json")
    with open(replay_record_path, "w") as f:
        json.dump(replay_dict, f, indent=2)

    # -------------------------------------------------------------
    # D. COPY EVERYTHING TO public/sample_assets/ FOR WEB DOWNLOAD
    # -------------------------------------------------------------
    print("Publishing to public/sample_assets/ for direct browser download...")
    all_files_to_publish = [
        (clean_coco_zip_path, "clean_dataset_coco.zip"),
        (poison_coco_zip_path, "poisoned_dataset_coco.zip"),
        (yolo_zip_path, "clean_dataset_yolo.zip"),
        (clean_model_dst, "clean_vision_model.onnx"),
        (backdoored_model_dst, "backdoored_vision_model.onnx"),
        (pytorch_model_dst, "tactical_model.pt"),
        (clean_record_path, "clean_inference_record.json"),
        (tampered_record_path, "tampered_inference_record.json"),
        (replay_record_path, "replay_inference_record.json"),
    ]
    
    manifest = []
    for src_path, file_name in all_files_to_publish:
        dst_path = os.path.join(public_dir, file_name)
        shutil.copy2(src_path, dst_path)
        manifest.append({
            "filename": file_name,
            "size_bytes": os.path.getsize(dst_path),
            "download_url": f"/sample_assets/{file_name}",
        })
        
    with open(os.path.join(public_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
        
    # Write a comprehensive README in sample_evaluation_pack/
    readme_content = f"""# IntelX Operational Evaluation Sample Pack
**Ministry of Defence (MoD) / Indian Army DGIS Problem Statement 26228**

This folder contains real, self-contained test assets to evaluate the end-to-end multi-vector assurance pipeline on the IntelX Dashboard.

---

### Folder Contents

#### 1. Datasets (`01_DATASETS/`)
- `clean_dataset_coco.zip`:
  * **Defect**: None (Clean Baseline).
  * **Expected Outcome**: `DATASET: CLEAN / PASS`, 0 label flips, 0 poisoning anomalies.
- `poisoned_dataset_coco.zip`:
  * **Defect**: **Data Poisoning & Label Flipping** by Contributor Bravo.
  * **Expected Outcome**: `DATASET: CRITICAL RISK`, flags Contributor Bravo with multiple label-flipped samples and backdoor trigger suspects.
- `clean_dataset_yolo.zip`:
  * **Defect**: None (YOLO annotations + image pairs).
  * **Expected Outcome**: `DATASET: CLEAN / PASS`.

#### 2. Models (`02_MODELS/`)
- `clean_vision_model.onnx`:
  * **Defect**: None (Authentic YOLOv8 Tactical Model).
  * **Expected Outcome**: `MODEL: CLEAN / PASS`, digest matches reference, normal weight distribution.
- `backdoored_vision_model.onnx`:
  * **Defect**: **Neural Cleanse Trigger & Weight Anomaly**.
  * **Expected Outcome**: `MODEL: HIGH RISK`, flags backdoor trigger inversion and parameter Kurtosis distribution deviation.
- `tactical_model.pt`:
  * **Defect**: None (PyTorch checkpoint format).
  * **Expected Outcome**: Safe `weights_only=True` loading and parameter counting.

#### 3. Inference Records (`03_INFERENCE_RECORDS/`)
- `clean_inference_record.json`:
  * **Defect**: None.
  * **Expected Outcome**: `INFERENCE: CLEAN / PASS`, Ed25519 signature verified, SHA-256 DAG matches.
- `tampered_inference_record.json`:
  * **Defect**: **Post-Hoc Output Tampering** (Prediction altered from `military_vehicle` to `civilian_vehicle` without re-signing).
  * **Expected Outcome**: `INFERENCE: CRITICAL RISK`, Cryptographic hash recalculation fails (`Stored != Calculated`).
- `replay_inference_record.json`:
  * **Defect**: **Replay / Freshness Violation** (Timestamp outside operational window).
  * **Expected Outcome**: `INFERENCE: HIGH RISK`, Replay attack detected.

---

### How to Test on the Dashboard

1. Open http://localhost:3000/assessments or http://localhost:3000/assessments/new
2. Click **[ Assess Asset (Drop & Audit) ]**
3. Drag & drop any of the files above into the scanner (or download them directly from the web dashboard).
4. The system will automatically classify the asset type, run the appropriate integrity checks, calculate the multi-vector score, and display the evidence!
"""
    with open(os.path.join(pack_dir, "README.md"), "w") as f:
        f.write(readme_content)

    print(f"Sample pack successfully created in:\n -> {pack_dir}\n -> {public_dir}")

if __name__ == "__main__":
    main()
