"""Create a labeled inspection sheet without modifying source textures."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
sheet = Image.new("RGB", (1200, 720), "#181818")
draw = ImageDraw.Draw(sheet)
for index, letter in enumerate("ABCDEFGHIJKLMNOP"):
    with Image.open(root / f"{letter}.png") as source:
        thumb = source.convert("RGB")
        thumb.thumbnail((300, 150))
        x, y = (index % 4) * 300, (index // 4) * 180
        sheet.paste(thumb, (x, y + 25))
        draw.text((x + 8, y + 6), f"{letter} — {source.width} x {source.height}", fill="white")
output = root / "audit-contact-sheet.jpg"
sheet.save(output, quality=90)
print(output)
