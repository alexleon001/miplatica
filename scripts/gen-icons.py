"""Genera los assets de ícono de Mi Platica (icon, adaptive foreground, splash).

Marca: gradiente diagonal indigo (#6366F1) -> cyan (#06B6D4) con un "$" blanco
en negrita. El ícono es full-bleed (iOS/Android enmascaran las esquinas solos);
el foreground del adaptive icon va transparente con el glifo dentro de la zona
segura. Re-ejecutable: python scripts/gen-icons.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SIZE = 1024
OUT = Path(__file__).resolve().parent.parent / "assets"
OUT.mkdir(exist_ok=True)

INDIGO = (99, 102, 241)   # #6366F1
CYAN = (6, 182, 212)      # #06B6D4
DARK = (15, 23, 42)       # #0F172A
WHITE = (248, 250, 252)   # #F8FAFC


def load_bold_font(px: int) -> ImageFont.FreeTypeFont:
    for path in (
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\Arial Bold.ttf",
    ):
        try:
            return ImageFont.truetype(path, px)
        except OSError:
            continue
    return ImageFont.load_default()


def diagonal_gradient(size: int, a, b) -> Image.Image:
    """Gradiente diagonal de a (sup-izq) a b (inf-der)."""
    base = Image.new("RGB", (size, size))
    px = base.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = (
                round(a[0] + (b[0] - a[0]) * t),
                round(a[1] + (b[1] - a[1]) * t),
                round(a[2] + (b[2] - a[2]) * t),
            )
    return base


def draw_glyph(img: Image.Image, glyph: str, color, scale: float):
    draw = ImageDraw.Draw(img)
    font = load_bold_font(int(SIZE * scale))
    # Centrado óptico usando el bbox real del glifo.
    bbox = draw.textbbox((0, 0), glyph, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (SIZE - w) / 2 - bbox[0]
    y = (SIZE - h) / 2 - bbox[1]
    draw.text((x, y), glyph, font=font, fill=color)


# 1) Ícono principal (full-bleed, gradiente + $)
icon = diagonal_gradient(SIZE, INDIGO, CYAN)
draw_glyph(icon, "$", WHITE, 0.62)
icon.save(OUT / "icon.png")

# 2) Adaptive foreground (transparente, glifo en zona segura ~52%)
fg = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw_glyph(fg, "$", WHITE, 0.40)
fg.save(OUT / "adaptive-icon.png")

# 3) Splash (logo sobre fondo oscuro, contain)
splash = Image.new("RGB", (SIZE, SIZE), DARK)
# tarjeta con gradiente redondeada al centro
card = diagonal_gradient(SIZE, INDIGO, CYAN).convert("RGBA")
mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle(
    [SIZE * 0.22, SIZE * 0.22, SIZE * 0.78, SIZE * 0.78], radius=int(SIZE * 0.10), fill=255
)
splash.paste(card, (0, 0), mask)
draw_glyph(splash, "$", WHITE, 0.30)
splash.save(OUT / "splash-icon.png")

print("Wrote:", *[p.name for p in OUT.glob("*.png")])
