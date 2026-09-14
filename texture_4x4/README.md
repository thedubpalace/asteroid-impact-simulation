# Texture audit

> Archived experiment: texture integration has been reverted at the user's
> request. The runtime uses the original JPG color/relief maps and original
> water mask again. All images and stitching scripts remain available here;
> the integration descriptions below document the previous experiment only.

The folder is named `texture_4x4` (singular). Original PNGs are preserved.

## Result

- All 17 PNG files decode at **1774 × 887**, including `master.png`.
- `master.png` is the new runtime color map. It is a complete 2:1 globe image,
  suitable for a provisional preview, not a high-resolution or scientifically
  validated palaeogeographic map. Longitude seam and polar continuity are not
  guaranteed by its aspect ratio.
- **A–P are not an edge-matched 4 × 4 grid.** Adjacent images repeat geography:
  A/B repeat North America; B/C repeat Europe; C/D repeat Asia; E/F repeat the
  Americas; F/G repeat Africa; I/J repeat South America; J/K repeat Africa;
  K/L repeat Australia. Joining them directly would duplicate continents.
- M–P introduce a bright icy southern margin absent from the master. M also
  repeats a land band across its top. These need replacement, not a seam blur.
- All supplied images are color maps. There are no matching high-resolution
  water, roughness, or height maps in this folder.

See `audit-contact-sheet.jpg` for the A–P comparison. Recreate it with
`python texture_4x4/audit_textures.py` (Pillow required).

## Current integration

The globe now loads `earth_stitched_4096.png`, a **4096 × 2048** master-anchored
detail mosaic. It falls back to the original master if the mosaic is absent.
The deterministic OpenCV pipeline uses A, B, C, D, F, G, H, I, J and K;
E, L and M–P are excluded for insufficient spatially distributed matches.
About **39% of image pixels** pass the local confidence threshold; this is
not a spherical surface-area percentage or uniformly native 4K detail.
Unsupported areas retain the resized master, including its polar/seam defects.
Registration, bounded optical flow and confidence-weighted detail blending
preserve broad master geography and color while adding available tile detail.
Small coastline details can differ; the result is illustrative, not a measured map.

Reproduce with `python texture_4x4/register_tiles.py`, then
`python texture_4x4/stitch_tiles.py` (NumPy and OpenCV required). See
`stitch-report.json`, `stitch-coverage.png` and `stitch-comparison.jpg` for QA.

Water and roughness are provisional color-derived masks at the loaded color-map resolution;
they follow its pixels but are not physical measurements. Bump is disabled
because the previous height map uses a different coastline. The previous
cloud image remains usable independently. If the new master cannot load,
the previous surface set is tried, then the procedural fallback.

## Needed for a genuine high-resolution replacement

Preferred: one complete **8192 × 4096** equirectangular color map, plus water
(white water / black land), roughness (dark smooth / light rough), and height
(dark low / light high) maps derived from the exact same layout. A new cloud
map is optional. Keep lighting, shadows and cloud cover out of the color map.

Alternatively, divide one locked master into these exact regions and enhance
each crop without moving coastlines or adding geography:

| Row | Tile order | Latitude, north to south |
| --- | --- | --- |
| 1 | A B C D | +90° to +45° |
| 2 | E F G H | +45° to 0° |
| 3 | I J K L | 0° to −45° |
| 4 | M N O P | −45° to −90° |

Columns cover −180° to −90°, −90° to 0°, 0° to +90°, +90° to +180°.
Each **2048 × 1024** tile makes an 8192 × 4096 result. Existing tile dimensions
would make **7096 × 3548**, but only if the geographic bounds and edges matched.
Do not independently regenerate regions from text. Share exact border pixels;
left/right globe edges must wrap and each pole must converge consistently.
