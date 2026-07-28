"""Genera los assets gráficos de Mi Plata: ícono de app, adaptive, splash y los
que pide Google Play (ícono 512² y feature graphic 1024×500).

Marca: gradiente diagonal indigo (#6366F1) → cyan (#22D3EE), glifo "$" en
Space Grotesk Bold (la misma tipografía de la app, se lee del paquete
@expo-google-fonts instalado) y una flecha ascendente que convierte el signo en
"plata que crece". Fondo oscuro #0B1120, igual que la landing.

Re-ejecutable e idempotente:  python scripts/gen-play-assets.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
PLAY = ASSETS / "play"

INDIGO = (99, 102, 241)    # #6366F1
CYAN = (34, 211, 238)      # #22D3EE
NAVY = (11, 17, 32)        # #0B1120
DARK = (15, 23, 42)        # #0F172A
WHITE = (248, 250, 252)    # #F8FAFC
DIM = (156, 163, 175)      # #9CA3AF

FONT_DIR = ROOT / "node_modules" / "@expo-google-fonts" / "space-grotesk"
FONTS = {
    "bold": FONT_DIR / "700Bold" / "SpaceGrotesk_700Bold.ttf",
    "medium": FONT_DIR / "500Medium" / "SpaceGrotesk_500Medium.ttf",
}

S = 1024  # lienzo de trabajo del ícono; se baja a 512 para Play


def font(weight: str, px: int) -> ImageFont.FreeTypeFont:
    path = FONTS[weight]
    if not path.exists():  # pnpm store / instalación distinta
        raise SystemExit(f"No encuentro la fuente {path}. Corré pnpm install primero.")
    return ImageFont.truetype(str(path), px)


def diagonal_gradient(w: int, h: int, a, b) -> Image.Image:
    """Gradiente diagonal de a (sup-izq) a b (inf-der). Se dibuja chico y se
    escala: mismo resultado visual, ~100x más rápido que píxel por píxel."""
    small = Image.new("RGB", (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126
            px[x, y] = (
                round(a[0] + (b[0] - a[0]) * t),
                round(a[1] + (b[1] - a[1]) * t),
                round(a[2] + (b[2] - a[2]) * t),
            )
    return small.resize((w, h), Image.BICUBIC)


def glow(size: tuple[int, int], center: tuple[int, int], radius: int, color, alpha: int) -> Image.Image:
    """Halo radial suave (para dar profundidad sin verse plano)."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse(
        [center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius],
        fill=(*color, alpha),
    )
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.55))


def draw_centered(img: Image.Image, text: str, f: ImageFont.FreeTypeFont, color, cx: float, cy: float):
    d = ImageDraw.Draw(img)
    box = d.textbbox((0, 0), text, font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text((cx - w / 2 - box[0], cy - h / 2 - box[1]), text, font=f, fill=color)


def brand_tile(size: int, radius_ratio: float = 0.0) -> Image.Image:
    """Baldosa de marca: gradiente + halo + '$' + flecha ascendente.
    radius_ratio > 0 redondea las esquinas (para el splash y el feature graphic;
    el ícono va full-bleed porque Android/iOS enmascaran solos)."""
    tile = diagonal_gradient(size, size, INDIGO, CYAN).convert("RGBA")
    tile.alpha_composite(glow((size, size), (int(size * 0.26), int(size * 0.2)), int(size * 0.3), (255, 255, 255), 70))

    # Flecha ascendente detrás del glifo: da el significado "crece" sin ruido.
    # Va en su propia capa y se compone con alpha_composite (ImageDraw pisa el
    # canal alfa en vez de mezclar, y el semitransparente saldría blanco pleno).
    arrow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arrow)
    u = size / 100
    ink = (255, 255, 255, 66)
    stroke = max(2, int(6 * u))
    # Recta y punta triangular: a 48 dp cualquier quiebre se lee como mancha, así
    # que la flecha es una sola diagonal limpia detrás del glifo.
    ad.line([(18 * u, 74 * u), (76 * u, 30 * u)], fill=ink, width=stroke, joint="curve")
    ad.polygon([(84 * u, 22 * u), (58 * u, 26 * u), (78 * u, 44 * u)], fill=ink)
    tile.alpha_composite(arrow)

    draw_centered(tile, "$", font("bold", int(size * 0.66)), (*WHITE, 255), size / 2, size * 0.5)

    if radius_ratio:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
        tile.putalpha(mask)
    return tile


def main() -> None:
    PLAY.mkdir(parents=True, exist_ok=True)

    # 1) Ícono de la app (full-bleed) + versión 512 para Play.
    icon = brand_tile(S).convert("RGB")
    icon.save(ASSETS / "icon.png")
    icon.resize((512, 512), Image.LANCZOS).save(PLAY / "icon-512.png")

    # 2) Adaptive foreground: transparente, glifo dentro de la zona segura (~66%
    #    del lienzo; Android recorta hasta un círculo inscripto).
    fg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw_centered(fg, "$", font("bold", int(S * 0.42)), (*WHITE, 255), S / 2, S / 2)
    fg.save(ASSETS / "adaptive-icon.png")

    # 3) Splash: baldosa redondeada sobre fondo oscuro.
    splash = Image.new("RGB", (S, S), DARK)
    tile = brand_tile(int(S * 0.56), radius_ratio=0.22)
    splash.paste(tile, (int(S * 0.22), int(S * 0.22)), tile)
    splash.save(ASSETS / "splash-icon.png")

    # 4) Feature graphic 1024×500. Play recorta los bordes en algunas
    #    superficies → todo lo importante vive dentro de un margen de 80 px.
    W, H = 1024, 500
    fg_img = Image.new("RGBA", (W, H), (*NAVY, 255))
    fg_img.alpha_composite(glow((W, H), (760, 250), 300, INDIGO, 150))
    fg_img.alpha_composite(glow((W, H), (300, 430), 260, CYAN, 60))

    tile = brand_tile(232, radius_ratio=0.24)
    fg_img.alpha_composite(tile, (712, 134))

    d = ImageDraw.Draw(fg_img)
    d.text((80, 168), "Mi Plata", font=font("bold", 92), fill=(*WHITE, 255))
    d.text((80, 278), "Tu plata, con inteligencia.", font=font("medium", 38), fill=(*DIM, 255))

    # Píldoras de features: lo que un vistazo de 2 segundos tiene que retener.
    # Capa aparte por lo mismo que la flecha: los rellenos semitransparentes hay
    # que componerlos, no dibujarlos directo sobre el lienzo.
    pills = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pills)
    f = font("medium", 24)
    x = 80
    for label in ("Gastos con IA", "Pesos y dólares", "Inversiones"):
        box = pd.textbbox((0, 0), label, font=f)
        w = box[2] - box[0]
        pd.rounded_rectangle([x, 344, x + w + 44, 396], radius=26,
                             fill=(255, 255, 255, 20), outline=(255, 255, 255, 46), width=2)
        pd.text((x + 22 - box[0], 370 - (box[3] - box[1]) / 2 - box[1]), label, font=f, fill=(*WHITE, 235))
        x += w + 60
    fg_img.alpha_composite(pills)

    fg_img.convert("RGB").save(PLAY / "feature-graphic-1024x500.png")

    print("OK ->")
    for p in (ASSETS / "icon.png", ASSETS / "adaptive-icon.png", ASSETS / "splash-icon.png",
              PLAY / "icon-512.png", PLAY / "feature-graphic-1024x500.png"):
        print(f"  {p.relative_to(ROOT)}  {Image.open(p).size}")


if __name__ == "__main__":
    main()
