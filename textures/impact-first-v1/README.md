# Impact-first Earth texture set

Created with built-in ImageGen on 2026-09-14, in the requested order:

1. [impact.png](impact.png) — new, authoritative close-up of the shallow-sea impact region before contact. Native size: **1254 × 1254**.
2. [region.png](region.png) — regional expansion generated using `impact.png` as its image input. Native size: **1254 × 1254**.
3. [world.png](world.png) — complete 2:1 world map generated using `region.png` as its image input. Native size: **1774 × 887**.

All files retain the generator's native pixels. No enlargement is presented as
additional detail. Full generation prompts and their sequence are in
[prompts.json](prompts.json).

## Intended use

The artwork depicts terrain before impact; the simulation supplies the crater
and explosion. The close-up establishes forest, limestone, shallow-water
sediment and coastline detail; the following images extend that visual language
outward. These are artistic reconstructions, not validated palaeogeographic maps.

Retain `impact.png` as a separate close-range texture. Baking it only into the
world map would discard most of its detail.

## Registration and integration

The simulation now loads all three PNGs plus `registration.json` as its primary
surface. A failed image or registration load falls back to the previous hybrid
set, then the original maps, then procedural terrain.

`register.py` measures an affine transform from impact to region and region to
world using RootSIFT and RANSAC. The current alignment has 488 local inliers
(median error 0.84 regional pixels) and 144 regional inliers (median error 1.76
world pixels). Run it with Python, NumPy and OpenCV to regenerate the JSON after
changing an image. It reads the PNGs without changing their pixels.

The GPU samples all three native images on the same Earth mesh, blending across
each image's outer 16%. The original impact image's center is anchored to the
simulation's impact coordinate; a small latitude correction fades to zero at
the poles. The longitude seam and polar colors are blended in the sampler.
There is no separate floating decal or camera-dependent texture swap.

Water coverage and roughness maps are classified from the composited color, so
reflections, tsunami and scorch follow the new coastline. `maps/` also has
height and normal maps derived from that same imagery. They are synthetic
terrain cues, retained as compatible source assets rather than enabled in the
runtime: inferred mountain relief made the low globe view materially less
readable. Fine detail comes from the actual close-up image, not the previous
procedural grain layer.

The prompts requested the following geographic bounds:

| Image | Longitude | Latitude |
| --- | --- | --- |
| Impact | -95.5 to -83.5 | 15.4 to 27.4 |
| Region | -113.5 to -65.5 | -2.6 to 45.4 |
| World | -180 to 180 | -90 to 90 |

These are requested framing guides, not measured image georeferencing.
ImageGen redraws some geography during expansion; the requested inset scale
was not preserved exactly. Runtime placement therefore uses measured image
matches instead of these nominal bounds. Affine alignment and feathering reduce
the remaining local discrepancies; they do not make the artwork geographically
surveyed or recover detail absent from the source images.
