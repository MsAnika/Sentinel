#!/usr/bin/env python3
"""
Generates `pitch_dataset/` -- reproducible, synthetic, publicly-releasable
COCO-format datasets for the three-branch (Army / Navy / Air Force) demo
pitch. Matches the Problem Statement's own data policy: "All development
and evaluation data will be publicly available under applicable licences
or synthetically generated. No classified, operational or
service-generated data will be used." (PS 26228, section 7).

For each branch, produces two sets:
  working/  -- clean samples. Expected assessment outcome: ACCEPT.
  failing/  -- samples deliberately seeded with the attack classes IntelX
              claims to detect (trigger injection, near-duplicate
              flooding, OOD insertion, label flipping/mislabelling), each
              attributed to a distinct (synthetic) contributor so the
              contributor-level risk rollup has something real to show.
              Expected assessment outcome: REVIEW/QUARANTINE.

Also writes a shared `trigger_reference.png` template (the exact
checkerboard pattern stamped into the trigger-injection samples) for
demonstrating the real matched-filter search
(`PoisoningDetector.matched_filter_search`) against a *declared* trigger,
as distinct from the corner-only fallback heuristic -- one failing sample
per branch has the trigger planted away from the corner specifically to
make that distinction visible live.
"""
import json
import os
import numpy as np
from PIL import Image, ImageDraw

OUT_DIR = "pitch_dataset"
IMG_SIZE = 320
RNG_SEED_BASE = 7000

BRANCHES = {
    "army": {
        "category": "military_vehicle",
        "bg_range": ((70, 90, 40), (110, 120, 70)),  # olive/brown terrain
        "shape_color": (60, 70, 35),
        "terrain": "plains",
        "sensor": "EO_optical",
    },
    "navy": {
        "category": "naval_vessel",
        "bg_range": ((20, 60, 110), (60, 110, 170)),  # sea blue
        "shape_color": (200, 200, 195),
        "terrain": "coastal_water",
        "sensor": "EO_optical",
    },
    "airforce": {
        "category": "aircraft",
        "bg_range": ((140, 180, 210), (190, 215, 235)),  # sky
        "shape_color": (50, 50, 55),
        "terrain": "high_altitude",
        "sensor": "EO_optical",
    },
}

TRIGGER_SIZE = 32


def _background(rng, bg_range, size=IMG_SIZE):
    lo, hi = bg_range
    base = np.zeros((size, size, 3), dtype=np.float32)
    for c in range(3):
        base[:, :, c] = rng.uniform(lo[c], hi[c])
    noise = rng.normal(0, 6, size=(size, size, 3))
    arr = np.clip(base + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def _draw_shape(branch: str, img: Image.Image, rng, color) -> Image.Image:
    draw = ImageDraw.Draw(img)
    cx = rng.randint(80, IMG_SIZE - 80)
    cy = rng.randint(80, IMG_SIZE - 80)
    w = rng.randint(50, 90)
    h = rng.randint(30, 55)

    if branch == "army":
        draw.rectangle([cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2], fill=color, outline=(20, 20, 20), width=2)
        for dx in (-w // 3, w // 3):
            draw.ellipse([cx + dx - 8, cy + h // 2 - 6, cx + dx + 8, cy + h // 2 + 10], fill=(15, 15, 15))
    elif branch == "navy":
        hull = [
            (cx - w // 2, cy),
            (cx - w // 2 + 12, cy - h // 2),
            (cx + w // 2, cy - h // 2),
            (cx + w // 2, cy + h // 2),
            (cx - w // 2 + 12, cy + h // 2),
        ]
        draw.polygon(hull, fill=color, outline=(10, 10, 10))
        draw.rectangle([cx - 6, cy - h, cx + 6, cy - h // 2], fill=(120, 40, 40))
    else:  # airforce
        draw.rectangle([cx - w // 2, cy - 6, cx + w // 2, cy + 6], fill=color, outline=(10, 10, 10))
        draw.polygon([(cx - 10, cy), (cx - 35, cy - 40), (cx, cy - 8)], fill=color)
        draw.polygon([(cx - 10, cy), (cx - 35, cy + 40), (cx, cy + 8)], fill=color)

    return img, (cx - w // 2, cy - h // 2, w, h)


def _stamp_trigger(img: Image.Image, corner: bool = True, at=None) -> Image.Image:
    """Same 4px-period checkerboard trigger the repo's own scenario
    fixtures use (`backend/scenarios/asset_generator.py:draw_trigger_patch`),
    so it is detectable by both the corner heuristic and (via the
    exported template) the real matched-filter search."""
    img = img.copy()
    w, h = img.size
    if corner:
        x0, y0 = w - TRIGGER_SIZE, h - TRIGGER_SIZE
    else:
        x0, y0 = at
    draw = ImageDraw.Draw(img)
    for py in range(y0, y0 + TRIGGER_SIZE, 4):
        for px in range(x0, x0 + TRIGGER_SIZE, 4):
            fill_c = (255, 255, 255) if (px + py) % 8 == 0 else (0, 0, 0)
            draw.rectangle([px, py, px + 4, py + 4], fill=fill_c)
    return img


def _write_trigger_template(path: str) -> None:
    tmpl = Image.new("RGB", (TRIGGER_SIZE, TRIGGER_SIZE))
    draw = ImageDraw.Draw(tmpl)
    for py in range(0, TRIGGER_SIZE, 4):
        for px in range(0, TRIGGER_SIZE, 4):
            fill_c = (255, 255, 255) if (px + py) % 8 == 0 else (0, 0, 0)
            draw.rectangle([px, py, px + 4, py + 4], fill=fill_c)
    tmpl.save(path)


def _new_coco(category: str):
    return {
        "info": {"description": "IntelX Pitch Demo Dataset -- 100% synthetic, no classified/operational data"},
        "images": [],
        "annotations": [],
        "categories": [{"id": 0, "name": category}, {"id": 1, "name": "unrelated_object"}],
    }


def _add_sample(coco, img_id, file_name, box, category_id, contributor, batch, terrain, sensor, extra_meta=None):
    coco["images"].append({
        "id": img_id,
        "file_name": file_name,
        "width": IMG_SIZE,
        "height": IMG_SIZE,
        "contributor": contributor,
        "batch": batch,
        "terrain": terrain,
        "sensor": sensor,
        **(extra_meta or {}),
    })
    x, y, w, h = box
    coco["annotations"].append({
        "id": img_id,
        "image_id": img_id,
        "category_id": category_id,
        "bbox": [x, y, w, h],
        "area": w * h,
        "iscrowd": 0,
        **(extra_meta or {}),
    })


def generate_branch(branch: str, cfg: dict) -> None:
    working_dir = os.path.join(OUT_DIR, branch, "working")
    failing_dir = os.path.join(OUT_DIR, branch, "failing")
    os.makedirs(os.path.join(working_dir, "images"), exist_ok=True)
    os.makedirs(os.path.join(failing_dir, "images"), exist_ok=True)

    category_id = 0
    seed = RNG_SEED_BASE + hash(branch) % 1000

    # ---------------- WORKING (clean) ----------------
    working_coco = _new_coco(cfg["category"])
    rng = np.random.RandomState(seed)
    for i in range(20):
        img = _background(rng, cfg["bg_range"])
        img, box = _draw_shape(branch, img, rng, cfg["shape_color"])
        fname = f"{branch}_working_{i + 1:03d}.jpg"
        img.save(os.path.join(working_dir, "images", fname), quality=92)
        _add_sample(
            working_coco, i + 1, fname, box, category_id,
            contributor=f"contributor_{branch}_alpha", batch="batch_working_01",
            terrain=cfg["terrain"], sensor=cfg["sensor"],
        )
    with open(os.path.join(working_dir, "coco_annotations.json"), "w") as f:
        json.dump(working_coco, f, indent=2)

    # ---------------- FAILING (seeded attack classes) ----------------
    failing_coco = _new_coco(cfg["category"])
    rng = np.random.RandomState(seed + 500)
    img_id = 1

    # 1) Clean filler (contributor_alpha) so findings are a minority, not
    #    the whole dataset -- more representative of a real mixed batch.
    for _ in range(6):
        img = _background(rng, cfg["bg_range"])
        img, box = _draw_shape(branch, img, rng, cfg["shape_color"])
        fname = f"{branch}_failing_{img_id:03d}.jpg"
        img.save(os.path.join(failing_dir, "images", fname), quality=92)
        _add_sample(failing_coco, img_id, fname, box, category_id, f"contributor_{branch}_alpha", "batch_failing_01", cfg["terrain"], cfg["sensor"])
        img_id += 1

    # 2) Trigger injection (contributor_bravo) -- undeclared in metadata,
    #    discoverable only via real pixel-level detection. One sample gets
    #    the trigger planted AWAY from the corner to demonstrate the real
    #    matched-filter search finding what the corner-only heuristic
    #    cannot (see README.md in this folder for the exact demo line).
    for k in range(5):
        img = _background(rng, cfg["bg_range"])
        img, box = _draw_shape(branch, img, rng, cfg["shape_color"])
        if k == 0:
            img = _stamp_trigger(img, corner=False, at=(IMG_SIZE // 2 - 16, IMG_SIZE // 2 - 16))
        else:
            img = _stamp_trigger(img, corner=True)
        fname = f"{branch}_failing_{img_id:03d}.jpg"
        img.save(os.path.join(failing_dir, "images", fname), quality=92)
        _add_sample(failing_coco, img_id, fname, box, category_id, f"contributor_{branch}_bravo", "batch_failing_02", cfg["terrain"], cfg["sensor"])
        img_id += 1

    # 3) Near-duplicate flooding (contributor_charlie) -- the same base
    #    image repeated with only tiny pixel-level noise perturbations.
    base_img = _background(rng, cfg["bg_range"])
    base_img, base_box = _draw_shape(branch, base_img, rng, cfg["shape_color"])
    base_arr = np.asarray(base_img, dtype=np.float32)
    for _ in range(4):
        dup_arr = np.clip(base_arr + rng.normal(0, 0.4, size=base_arr.shape), 0, 255).astype(np.uint8)
        dup_img = Image.fromarray(dup_arr)
        fname = f"{branch}_failing_{img_id:03d}.jpg"
        dup_img.save(os.path.join(failing_dir, "images", fname), quality=92)
        _add_sample(failing_coco, img_id, fname, base_box, category_id, f"contributor_{branch}_charlie", "batch_failing_03", cfg["terrain"], cfg["sensor"])
        img_id += 1

    # 4) OOD insertion (contributor_delta) -- a smooth but wildly
    #    different-palette scene (not per-pixel random static, which is
    #    itself high-frequency and would confuse the trigger-injection
    #    heuristic rather than exercise OOD detection). `is_ood` is a
    #    declared-metadata signal, the same fallback pattern the
    #    poisoning/label detectors already use for their own weakest
    #    evidence tier -- it corroborates, rather than replaces, the
    #    genuinely divergent color-moment content of these samples.
    for _ in range(3):
        ood_arr = np.clip(
            np.full((IMG_SIZE, IMG_SIZE, 3), (230, 30, 200), dtype=np.float32)
            + rng.normal(0, 8, size=(IMG_SIZE, IMG_SIZE, 3)),
            0, 255,
        ).astype(np.uint8)
        ood_img = Image.fromarray(ood_arr)
        fname = f"{branch}_failing_{img_id:03d}.jpg"
        ood_img.save(os.path.join(failing_dir, "images", fname), quality=92)
        _add_sample(
            failing_coco, img_id, fname, (10, 10, 40, 40), category_id,
            f"contributor_{branch}_delta", "batch_failing_04", "unknown_ood_terrain", "unknown_sensor",
            extra_meta={"is_ood": True},
        )
        img_id += 1

    # 5) Label flipping / mislabelling (contributor_echo) -- correct
    #    branch imagery, but declared category is wrong; true_label
    #    metadata records what it actually is.
    for _ in range(4):
        img = _background(rng, cfg["bg_range"])
        img, box = _draw_shape(branch, img, rng, cfg["shape_color"])
        fname = f"{branch}_failing_{img_id:03d}.jpg"
        img.save(os.path.join(failing_dir, "images", fname), quality=92)
        _add_sample(
            failing_coco, img_id, fname, box, 1,  # declared as "unrelated_object" -- wrong
            f"contributor_{branch}_echo", "batch_failing_05", cfg["terrain"], cfg["sensor"],
            extra_meta={"true_label": cfg["category"], "label_flipped": True},
        )
        img_id += 1

    with open(os.path.join(failing_dir, "coco_annotations.json"), "w") as f:
        json.dump(failing_coco, f, indent=2)

    print(f"  {branch}: {len(working_coco['images'])} working / {len(failing_coco['images'])} failing samples")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print("Generating pitch_dataset/ ...")
    for branch, cfg in BRANCHES.items():
        generate_branch(branch, cfg)

    _write_trigger_template(os.path.join(OUT_DIR, "trigger_reference.png"))

    readme = """# IntelX Pitch Demo Datasets

100% synthetic, team-generated imagery -- no classified, operational, or
service-generated data, matching PS 26228 section 7's data policy. Safe to
show, share, and upload during a live demo or to a mentor/judge.

## Layout

```
pitch_dataset/
  army/{working,failing}/{images/, coco_annotations.json}
  navy/{working,failing}/{images/, coco_annotations.json}
  airforce/{working,failing}/{images/, coco_annotations.json}
  trigger_reference.png   <- declared trigger template for the matched-filter demo
```

Each branch's `working/` set is clean (single contributor, no seeded
defects) -- expected assessment outcome: **ACCEPT**.

Each branch's `failing/` set mixes 5 attack classes across 5 distinct
synthetic contributors, so the contributor-level risk rollup has
something real to show, not just isolated per-sample flags:

| Contributor  | Attack class (PS 2.2.1)         | What to expect in the UI |
|---|---|---|
| `*_alpha`   | none (clean filler)              | no findings |
| `*_bravo`   | trigger/backdoor patch injection | `FINDING-TRIGGER-*`; one sample (`*_failing_007`) has the trigger planted in the CENTER of the frame, not the corner -- upload `trigger_reference.png` as the declared trigger reference to show the real matched-filter search catch it, then show the corner-only fallback heuristic missing that same sample when no reference is declared |
| `*_charlie` | near-duplicate flooding          | `duplicate_detector` clusters these 4 images together |
| `*_delta`   | OOD insertion                    | flagged as a distributional outlier vs. the declared terrain/sensor |
| `*_echo`    | label flipping / mislabelling    | declared category is deliberately wrong; `true_label` metadata carries the real one |

Expected assessment outcome for every `failing/` set: **REVIEW** or
**QUARANTINE**, with contributors `bravo` and `echo` driving the highest
per-contributor risk.

## Demo sequence

1. Upload `army/working/` -> generate report -> **ACCEPT**.
2. Upload `army/failing/` -> generate report -> point at the contributor
   risk table -> **QUARANTINE**, `contributor_army_bravo` and
   `contributor_army_echo` at HIGH/CRITICAL.
3. Re-run dataset analysis on `army/failing/` a second time, this time
   supplying `trigger_reference.png` as the declared trigger reference --
   show the matched-filter search additionally catching
   `army_failing_007` (the center-planted trigger), which the corner-only
   heuristic in step 2 could not see.
4. Repeat steps 1-2 for `navy/` and `airforce/` to show the same pipeline,
   unmodified, working across all three branches and both COCO categories
   without any per-branch code changes -- reinforces "model/domain-
   agnostic," not hardcoded to one dataset.
5. Feed `army/working/`, `navy/working/`, `airforce/working/` (or their
   image directories) into the federated-learning pitch
   (`POST /api/federated/simulate` with `branch_ids: ["army","navy","airforce"]`)
   to tie the multi-branch narrative together.
"""
    with open(os.path.join(OUT_DIR, "README.md"), "w") as f:
        f.write(readme)

    print(f"\nDone. See {OUT_DIR}/README.md for the demo script.")


if __name__ == "__main__":
    main()
