# IntelX Pitch Demo Datasets

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
