# Hybrid 8K Earth texture

The output is **8192 × 4096**, not native 8K AI detail. The original 3072 × 1536
master fixes the geography. Sixteen image edits add inland luminance detail;
their actual dimensions and hashes are recorded in `report.json`.

`prepare.py` creates 4 × 4 coordinate-locked crops with 128-pixel context.
`manifest.json` records every prompt. Raw generated images live in `generated/`.
`assemble.py` rejects AI water/land disagreements, feathers fixed overlaps,
retains master colors, and excludes AI ocean relief. It does not stitch new
coastlines or claim to recover measured geographical detail.

Outputs in `../textures/hybrid8k/`:

- `color-8k.png`: full-resolution albedo, used by capable GPUs.
- `color-4k.png`: fallback for devices with a lower maximum texture size.
- `water-8k.png`: white water, black land, classified from the master palette.
- `roughness-8k.png`: smooth water and rougher land.
- `height-8k.png`: 16-bit synthetic microrelief, not real elevation or bathymetry.
- `normal-8k.png`: tangent-space normal map, flat water.
- `water-4k.png`, `roughness-4k.png`, `normal-4k.png`: runtime auxiliary maps.

Run assembly with Python, Pillow, NumPy and OpenCV installed. The script supports
this project's existing `.cache/texture-stitch-deps` directory. Regeneration is
deterministic once the AI edits have been saved. Original texture assets remain
untouched and available as load-error fallbacks. Procedural clouds are retained.

This is an artistic late-Cretaceous illustration, not a validated palaeomap.
The UV longitude sign is corrected independently in `latLonToVec`; the master
itself is not scientifically georeferenced. No island is painted at the impact.

## Local impact-region detail

`impact_patch.py prepare` extracts a 768 × 768 crop centered at atlas pixel
(2059, 1561), corresponding to the simulation's 21.4°N, 89.5°W coordinate.
`impact-prompt.txt` is the built-in ImageGen edit prompt. Save its selected output
as `impact-generated.png`, then run `impact_patch.py apply` after assembly.
This transfers new detail through a smooth rectangular feather without moving
coastlines or creating a circular crater decal. Auxiliary masks stay unchanged.
`impact-before-after.png` compares the input (left) and applied result (right).
Run `verify.py` for dimensions, seam, water-normal and patch-placement checks.
