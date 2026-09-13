"""Render RegWorld favicons and app icons into public/.

    python3 scripts/brand/generate_icons.py

Requires Pillow. Each size is drawn at 8x and downsampled for clean anti-aliasing.
Small sizes (16/32/48) use a simplified mark — ring, three nodes and a bold "R" —
because globe lines and text are unreadable below ~48px. Larger icons add the
globe network and "RW". Geometry mirrors components/brand/RegWorldLogo.tsx.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

NAVY = (6, 27, 51, 255)
WHITE = (255, 255, 255, 255)
CYAN = (24, 217, 209, 255)
TEAL = (18, 184, 196, 255)
SUPERSAMPLE = 8

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise SystemExit("No bold TrueType font found; add one to FONT_CANDIDATES.")


def with_alpha(color, alpha: float):
    return (*color[:3], round(255 * alpha))


def draw_icon(size: int, *, square: bool = False) -> Image.Image:
    """square=True fills the whole canvas navy (iOS/Android apply their own mask)."""
    s = size * SUPERSAMPLE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    g = ImageDraw.Draw(layer)
    u = s / 64  # design units: 64x64 box, same as RegWorldEmblem
    c = s / 2
    detailed = size >= 64

    if square:
        d.rectangle([0, 0, s, s], fill=NAVY)
        u *= 0.86  # keep the ring inside the platform safe zone
    else:
        d.ellipse([0, 0, s - 1, s - 1], fill=NAVY)

    def circle(cx, cy, r, **kw):
        d.ellipse([c + (cx - 32) * u - r * u, c + (cy - 32) * u - r * u, c + (cx - 32) * u + r * u, c + (cy - 32) * u + r * u], **kw)

    ring_width = max(1, round((3.0 if detailed else 4.2) * u))
    circle(32, 32, 28.5 if detailed else 27.5, outline=CYAN, width=ring_width)

    if detailed:
        line = max(1, round(1.1 * u))
        teal = with_alpha(TEAL, 0.5)
        g.ellipse([c - 9 * u, c - 21 * u, c + 9 * u, c + 21 * u], outline=teal, width=line)
        g.ellipse([c - 17 * u, c - 21 * u, c + 17 * u, c + 21 * u], outline=with_alpha(TEAL, 0.3), width=line)
        g.line([c - 21 * u, c, c + 21 * u, c], fill=teal, width=line)
        cyan = with_alpha(CYAN, 0.7)
        nodes = [(32, 10.5), (13, 42), (51, 42), (19, 20), (45, 20)]
        for a, b in [(0, 3), (0, 4), (3, 1), (4, 2)]:
            (x1, y1), (x2, y2) = nodes[a], nodes[b]
            g.line([c + (x1 - 32) * u, c + (y1 - 32) * u, c + (x2 - 32) * u, c + (y2 - 32) * u], fill=cyan, width=line)
        img.alpha_composite(layer)
        for x, y in nodes:
            circle(x, y, 2.2, fill=CYAN)
        f = font(round(21 * u))
        text_w = d.textlength("RW", font=f)
        r_w = d.textlength("R", font=f)
        x0 = c - text_w / 2
        y0 = c + 0.5 * u
        d.text((x0, y0), "R", font=f, fill=WHITE, anchor="lm")
        d.text((x0 + r_w, y0), "W", font=f, fill=CYAN, anchor="lm")
    else:
        for x, y in [(32, 7.5), (11, 44), (53, 44)]:
            circle(x, y, 3.6, fill=CYAN)
        f = font(round(34 * u))
        d.text((c, c + 1.5 * u), "R", font=f, fill=WHITE, anchor="mm")

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)
    outputs = {
        "favicon-16x16.png": draw_icon(16),
        "favicon-32x32.png": draw_icon(32),
        "apple-touch-icon.png": draw_icon(180, square=True),
        "icon-192.png": draw_icon(192, square=True),
        "icon-512.png": draw_icon(512, square=True),
    }
    for name, image in outputs.items():
        image.save(PUBLIC / name, optimize=True)

    ico_frames = [draw_icon(48), draw_icon(32), draw_icon(16)]
    ico_frames[0].save(PUBLIC / "favicon.ico", sizes=[(48, 48), (32, 32), (16, 16)], append_images=ico_frames[1:])

    preview = Image.new("RGBA", (16 + 32 + 48 + 180 + 5 * 12, 192), (255, 255, 255, 255))
    x = 12
    for img in [draw_icon(16), draw_icon(32), draw_icon(48), draw_icon(180, square=True)]:
        preview.alpha_composite(img, (x, (192 - img.height) // 2))
        x += img.width + 12
    preview.save(ROOT / "scripts" / "brand" / "icon-preview.png")

    for name in [*outputs, "favicon.ico"]:
        print(f"public/{name}")


if __name__ == "__main__":
    main()
