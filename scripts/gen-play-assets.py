"""Genera los assets gráficos de Mi Plata a partir del ícono definitivo.

Fuente: `assets/source/icon-source.png` — la ilustración elegida (billetera con
tarjetas sobre degradé verde), que viene con margen blanco y esquinas
redondeadas ya dibujadas. Este script:

  1. recorta el arte y lo lleva a **full-bleed** (las esquinas se rellenan con el
     mismo degradé, porque Android/iOS/Play aplican su propia máscara y un borde
     blanco se vería como un halo);
  2. saca el fondo para el foreground del adaptive icon (flood fill desde las
     esquinas) y genera el background como degradé aparte;
  3. arma el splash y el feature graphic 1024×500 de Play con la paleta
     esmeralda, que es el tema por defecto de la app.

Re-ejecutable e idempotente:  python scripts/gen-play-assets.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
PLAY = ASSETS / "play"
SOURCE = ASSETS / "source" / "icon-source.png"

# Paleta esmeralda (lib/theme-tokens.ts) — el tema por defecto de la app.
DARK_BG = (10, 13, 16)      # #0A0D10
SURFACE = (18, 22, 25)      # #121619
ACCENT = (47, 179, 137)     # #2FB389
WHITE = (245, 250, 247)
DIM = (150, 165, 158)

FONT_DIR = ROOT / "node_modules" / "@expo-google-fonts" / "space-grotesk"
FONTS = {
    "bold": FONT_DIR / "700Bold" / "SpaceGrotesk_700Bold.ttf",
    "medium": FONT_DIR / "500Medium" / "SpaceGrotesk_500Medium.ttf",
}

S = 1024  # lienzo de trabajo; Play pide 512, el resto sale de acá


def font(weight: str, px: int) -> ImageFont.FreeTypeFont:
    path = FONTS[weight]
    if not path.exists():
        raise SystemExit(f"No encuentro la fuente {path}. Corré pnpm install primero.")
    return ImageFont.truetype(str(path), px)


def load_source() -> Image.Image:
    if not SOURCE.exists():
        raise SystemExit(f"Falta {SOURCE.relative_to(ROOT)} (el ícono definitivo).")
    return Image.open(SOURCE).convert("RGB")


def artwork_mask(src: Image.Image, seed_color=(255, 0, 255), thresh: int = 70) -> Image.Image:
    """Máscara del arte (255) contra el fondo blanco del archivo (0).

    Flood fill desde las cuatro esquinas: sólo pinta el blanco EXTERIOR, así el
    blanco de la billetera (que está adentro) se conserva."""
    work = src.copy()
    w, h = work.size
    for corner in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(work, corner, seed_color, thresh=thresh)
    mask = Image.new("L", (w, h), 255)
    mpx, wpx = mask.load(), work.load()
    for y in range(h):
        for x in range(w):
            if wpx[x, y] == seed_color:
                mpx[x, y] = 0
    # Encoge 1 px y suaviza: mata el halo blanco del antialiasing original.
    return mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))


def edge_gradient(art: Image.Image, mask: Image.Image, size: int) -> Image.Image:
    """Degradé de fondo reconstruido fila por fila desde el propio arte.

    Se muestrea el color a 6 px del borde izquierdo del arte; en las filas de las
    esquinas redondeadas (donde ese punto cae fuera) se usa la fila válida más
    cercana. Resultado: el relleno de las esquinas empalma exacto con el borde."""
    w, h = art.size
    apx, mpx = art.load(), mask.load()
    rows: list[tuple[int, int, int] | None] = []
    for y in range(h):
        x = next((i for i in range(w) if mpx[i, y] > 200), None)
        rows.append(apx[min(x + 6, w - 1), y] if x is not None else None)
    known = [i for i, c in enumerate(rows) if c is not None]
    if not known:
        raise SystemExit("No pude leer el degradé del ícono fuente.")
    first, last = known[0], known[-1]
    for y in range(h):
        if rows[y] is None:
            rows[y] = rows[first] if y < first else rows[last]

    grad = Image.new("RGB", (1, h))
    gpx = grad.load()
    for y in range(h):
        gpx[0, y] = rows[y]
    return grad.resize((size, size), Image.BICUBIC)


def full_bleed_icon(size: int = S) -> Image.Image:
    """Ícono a sangre: arte sobre su propio degradé, sin margen ni esquinas."""
    src = load_source()
    mask = artwork_mask(src)
    box = mask.getbbox()
    art, m = src.crop(box), mask.crop(box)
    bg = edge_gradient(art, m, max(art.size))
    bg = bg.resize(art.size, Image.BICUBIC)
    bg.paste(art, (0, 0), m)
    return bg.resize((size, size), Image.LANCZOS)


def subject_cutout(size: int) -> Image.Image:
    """Billetera + moneda recortadas del fondo verde, con alfa. Para el
    foreground del adaptive icon (el fondo lo pone Android).

    Se resta el fondo en vez de hacer flood fill: para cada fila se conoce el
    color del degradé (el ícono ya es full-bleed, así que la columna x=2 siempre
    es fondo) y el alfa sale de la distancia a ese color. Con una rampa suave la
    sombra proyectada queda semitransparente — que es lo que es — en lugar del
    parche rectangular que dejaba el flood fill."""
    icon = full_bleed_icon(1024).convert("RGB")
    px = icon.load()
    alpha = Image.new("L", icon.size, 0)
    apx = alpha.load()
    lo, hi = 14, 62  # distancia L1: <lo es fondo puro, >hi es sujeto opaco
    for y in range(1024):
        br, bg_, bb = px[2, y]
        for x in range(1024):
            r, g, b = px[x, y]
            dist = abs(r - br) + abs(g - bg_) + abs(b - bb)
            apx[x, y] = 0 if dist <= lo else 255 if dist >= hi else round((dist - lo) * 255 / (hi - lo))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
    cut = icon.convert("RGBA")
    cut.putalpha(alpha)
    cut = cut.crop(cut.getbbox())

    # Zona segura del adaptive icon: el sistema recorta hasta un 33%.
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    scale = (size * 0.62) / max(cut.size)
    cut = cut.resize((round(cut.width * scale), round(cut.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(cut, ((size - cut.width) // 2, (size - cut.height) // 2))
    return canvas


def main() -> None:
    PLAY.mkdir(parents=True, exist_ok=True)
    (ASSETS / "source").mkdir(parents=True, exist_ok=True)

    # 1) Ícono de app (full-bleed) + el 512 que pide Play.
    icon = full_bleed_icon()
    icon.save(ASSETS / "icon.png")
    icon.resize((512, 512), Image.LANCZOS).save(PLAY / "icon-512.png")

    # 2) Adaptive icon: foreground recortado + background con el mismo degradé.
    subject_cutout(S).save(ASSETS / "adaptive-icon.png")
    src = load_source()
    m = artwork_mask(src)
    box = m.getbbox()
    edge_gradient(src.crop(box), m.crop(box), S).save(ASSETS / "adaptive-icon-bg.png")

    # 3) Splash: el ícono redondeado sobre el fondo oscuro del tema.
    splash = Image.new("RGB", (S, S), DARK_BG)
    tile_size = int(S * 0.56)
    tile = icon.resize((tile_size, tile_size), Image.LANCZOS).convert("RGBA")
    rounded = Image.new("L", (tile_size, tile_size), 0)
    ImageDraw.Draw(rounded).rounded_rectangle([0, 0, tile_size - 1, tile_size - 1],
                                              radius=int(tile_size * 0.22), fill=255)
    tile.putalpha(rounded)
    splash.paste(tile, ((S - tile_size) // 2, (S - tile_size) // 2), tile)
    splash.save(ASSETS / "splash-icon.png")

    # 4) Feature graphic 1024×500 de Play. Play recorta bordes en algunas
    #    superficies → todo lo importante dentro de un margen de 80 px.
    W, H = 1024, 500
    fg = Image.new("RGBA", (W, H), (*DARK_BG, 255))
    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse([560, 20, 1000, 460], fill=(*ACCENT, 90))
    fg.alpha_composite(halo.filter(ImageFilter.GaussianBlur(150)))

    tile_size = 236
    tile = icon.resize((tile_size, tile_size), Image.LANCZOS).convert("RGBA")
    rounded = Image.new("L", (tile_size, tile_size), 0)
    ImageDraw.Draw(rounded).rounded_rectangle([0, 0, tile_size - 1, tile_size - 1],
                                              radius=int(tile_size * 0.24), fill=255)
    tile.putalpha(rounded)
    fg.alpha_composite(tile, (712, 132))

    d = ImageDraw.Draw(fg)
    d.text((80, 168), "Mi Plata", font=font("bold", 92), fill=(*WHITE, 255))
    d.text((80, 278), "Tu plata, con inteligencia.", font=font("medium", 38), fill=(*DIM, 255))

    pills = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pills)
    f = font("medium", 24)
    x = 80
    for label in ("Gastos con IA", "Pesos y dólares", "Inversiones"):
        box = pd.textbbox((0, 0), label, font=f)
        w = box[2] - box[0]
        pd.rounded_rectangle([x, 344, x + w + 44, 396], radius=26,
                             fill=(*ACCENT, 38), outline=(*ACCENT, 120), width=2)
        pd.text((x + 22 - box[0], 370 - (box[3] - box[1]) / 2 - box[1]), label, font=f, fill=(*WHITE, 240))
        x += w + 60
    fg.alpha_composite(pills)
    fg.convert("RGB").save(PLAY / "feature-graphic-1024x500.png")

    print("OK ->")
    for p in (ASSETS / "icon.png", ASSETS / "adaptive-icon.png", ASSETS / "adaptive-icon-bg.png",
              ASSETS / "splash-icon.png", PLAY / "icon-512.png", PLAY / "feature-graphic-1024x500.png"):
        print(f"  {p.relative_to(ROOT)}  {Image.open(p).size}")


if __name__ == "__main__":
    main()
