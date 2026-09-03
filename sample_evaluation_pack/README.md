# IntelX Operational Evaluation Sample Pack
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
