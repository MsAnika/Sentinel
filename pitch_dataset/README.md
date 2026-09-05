# IntelX Pitch Demo Datasets

100% synthetic, team-generated imagery -- no classified, operational, or
service-generated data, matching PS 26228 section 7's data policy. Safe to
show, share, and upload during a live demo or to a mentor/judge.

Provided in BOTH dataset formats PS 26228 section 2.2.6 names explicitly
("The solution should ingest common computer-vision dataset formats,
including COCO and YOLO") -- this is not incidental, it is a graded
requirement, so the demo deliberately exercises both formats rather than
only the more metadata-rich one.

## Layout

```
pitch_dataset/
  army/working_coco/    {images/, coco_annotations.json}   <- COCO, clean -> ACCEPT
  army/working_yolo/    {images/, labels/}                 <- YOLO, SAME imagery -> ACCEPT
  army/failing_coco/    {images/, coco_annotations.json}   <- COCO, seeded attacks -> QUARANTINE
  navy/...              (same three sets)
  airforce/...          (same three sets)
  trigger_reference.png <- declared trigger template for the matched-filter demo
```

`working_coco/` and `working_yolo/` contain the exact same underlying
images -- only the annotation format differs (COCO JSON vs. YOLO
`images/*.jpg` + `labels/*.txt`) -- so uploading both through the
dashboard proves the same pipeline ingests either format unmodified.
`failing_coco/` is COCO-only: the attack-class scenario below needs
metadata fields (`has_trigger`, `true_label`, `is_ood`, ...) that YOLO's
plain-text label format has no place to carry -- COCO's JSON structure is
what PS 2.2.1's own text ("where contributor, batch or source metadata is
available") assumes.

Each branch's `working_coco/`/`working_yolo/` set is clean (single
contributor, no seeded defects) -- expected assessment outcome: **ACCEPT**.

Each branch's `failing_coco/` set mixes 5 attack classes across 5 distinct
synthetic contributors, so the contributor-level risk rollup has
something real to show, not just isolated per-sample flags:

| Contributor  | Attack class (PS 2.2.1)         | What to expect in the UI |
|---|---|---|
| `*_alpha`   | none (clean filler)              | no findings |
| `*_bravo`   | trigger/backdoor patch injection | `FINDING-TRIGGER-*`; one sample (`*_failing_007`) has the trigger planted in the CENTER of the frame, not the corner -- upload `trigger_reference.png` as the declared trigger reference to show the real matched-filter search catch it, then show the corner-only fallback heuristic missing that same sample when no reference is declared |
| `*_charlie` | near-duplicate flooding          | `duplicate_detector` clusters these 4 images together |
| `*_delta`   | OOD insertion                    | flagged as a distributional outlier vs. the declared terrain/sensor |
| `*_echo`    | label flipping / mislabelling    | declared category is deliberately wrong; `true_label` metadata carries the real one |

Expected assessment outcome for every `failing_coco/` set: **REVIEW** or
**QUARANTINE**, with contributors `bravo` and `echo` driving the highest
per-contributor risk.

## Demo sequence

1. Upload `army/working_coco/` -> generate report -> **ACCEPT**.
2. Upload `army/working_yolo/` -> generate report -> **ACCEPT** again, same
   result from the same underlying images -- proves format-agnostic
   ingestion (PS 2.2.6) rather than just narrating it.
3. Upload `army/failing_coco/` -> generate report -> point at the
   contributor risk table -> **QUARANTINE**, `contributor_army_bravo` and
   `contributor_army_echo` at HIGH/CRITICAL.
4. Re-run dataset analysis on `army/failing_coco/` a second time, this time
   supplying `trigger_reference.png` as the declared trigger reference --
   show the matched-filter search additionally catching
   `army_failing_007` (the center-planted trigger), which the corner-only
   heuristic in step 3 could not see.
5. Repeat steps 1-4 for `navy/` and `airforce/` to show the same pipeline,
   unmodified, working across all three branches and both COCO categories
   without any per-branch code changes -- reinforces "model/domain-
   agnostic," not hardcoded to one dataset.
6. Feed `army/working_coco/`, `navy/working_coco/`, `airforce/working_coco/`
   (or their image directories) into the federated-learning pitch
   (`POST /api/federated/simulate` with `branch_ids: ["army","navy","airforce"]`)
   to tie the multi-branch narrative together.
