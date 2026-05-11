#!/usr/bin/env python3
# Build derived image assets — idempotent generate.
#
# 산출물:
#   - og-image.png         (1200×630, Open Graph + Twitter Card preview)
#   - apple-touch-icon.png (180×180, iOS home screen icon)
#
# 외부 관찰 provenance: 자체 디자인 (Catppuccin Frappé 톤 + Evergreen→Peach gradient).
# 어떤 third-party 도 분석/차용 0.

import os
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Palette (style.css SSOT 정합)
BG = (0x30, 0x34, 0x46)               # Frappé base
TEXT_PRIMARY = (0xc6, 0xd0, 0xf5)
TEXT_SUBTLE = (0xa5, 0xad, 0xce)
GRAD_START = (0xa6, 0xd1, 0x89)       # Evergreen
GRAD_END = (0xef, 0x9f, 0x76)         # Peach

FONT_REGULAR = "/System/Library/Fonts/Helvetica.ttc"
FONT_BOLD = "/System/Library/Fonts/Helvetica.ttc"


def gradient_color(t, c0, c1):
    return (
        round(c0[0] + (c1[0] - c0[0]) * t),
        round(c0[1] + (c1[1] - c0[1]) * t),
        round(c0[2] + (c1[2] - c0[2]) * t),
    )


def horizontal_gradient(size, c0, c1):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for x in range(w):
        t = x / max(w - 1, 1)
        color = gradient_color(t, c0, c1)
        for y in range(h):
            px[x, y] = color
    return img


def build_og_image(out_path):
    """Open Graph + Twitter Card preview (1200×630)."""
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # 미세 dot grid (style.css 의 24px spacing 정합, opacity 6%)
    dot_color = (0xc6, 0xd0, 0xf5, 15)
    dot_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dot_draw = ImageDraw.Draw(dot_layer)
    for x in range(24, W, 48):
        for y in range(24, H, 48):
            dot_draw.ellipse([x - 1, y - 1, x + 1, y + 1], fill=dot_color)
    img = Image.alpha_composite(img.convert("RGBA"), dot_layer).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Brand "AnotherPlayer" 중앙
    title_font = ImageFont.truetype(FONT_BOLD, 96)
    title = "AnotherPlayer"
    tb = draw.textbbox((0, 0), title, font=title_font)
    tw = tb[2] - tb[0]
    th = tb[3] - tb[1]
    tx = (W - tw) // 2
    ty = (H - th) // 2 - 60
    draw.text((tx, ty), title, fill=TEXT_PRIMARY, font=title_font)

    # Subhead
    sub_font = ImageFont.truetype(FONT_REGULAR, 36)
    sub = "Native sample browser for professionals"
    sb = draw.textbbox((0, 0), sub, font=sub_font)
    sw = sb[2] - sb[0]
    sx = (W - sw) // 2
    sy = ty + th + 32
    draw.text((sx, sy), sub, fill=TEXT_SUBTLE, font=sub_font)

    # 하단 gradient stripe (Evergreen → Peach, height 8px, 폭 60%)
    stripe_h = 8
    stripe_w = int(W * 0.6)
    stripe_x = (W - stripe_w) // 2
    stripe_y = H - 80
    stripe = horizontal_gradient((stripe_w, stripe_h), GRAD_START, GRAD_END)
    img.paste(stripe, (stripe_x, stripe_y))

    img.save(out_path, "PNG", optimize=True)
    print(f"OG image: {out_path} ({W}×{H}, {os.path.getsize(out_path)} bytes)")


def build_apple_touch_icon(out_path):
    """iOS home screen icon (180×180)."""
    S = 180
    SS = 4  # supersample for AA
    big = Image.new("RGB", (S * SS, S * SS), BG)
    draw = ImageDraw.Draw(big)

    # Rounded rect background (전체 = BG, rounded corners)
    radius = int(S * SS * 0.22)
    # PIL ≥ 8.2 = rounded_rectangle 지원
    bg_mask = Image.new("L", (S * SS, S * SS), 0)
    bg_draw = ImageDraw.Draw(bg_mask)
    bg_draw.rounded_rectangle([0, 0, S * SS - 1, S * SS - 1], radius=radius, fill=255)

    # Brand "A" 가운데 (gradient fill via mask)
    font_size = int(S * SS * 0.7)
    a_font = ImageFont.truetype(FONT_BOLD, font_size)
    letter_mask = Image.new("L", (S * SS, S * SS), 0)
    letter_draw = ImageDraw.Draw(letter_mask)
    bb = letter_draw.textbbox((0, 0), "A", font=a_font)
    lw = bb[2] - bb[0]
    lh = bb[3] - bb[1]
    lx = (S * SS - lw) // 2 - bb[0]
    ly = (S * SS - lh) // 2 - bb[1]
    letter_draw.text((lx, ly), "A", fill=255, font=a_font)

    gradient_img = horizontal_gradient((S * SS, S * SS), GRAD_START, GRAD_END)
    big.paste(gradient_img, (0, 0), letter_mask)

    # Rounded crop
    final_ss = Image.new("RGBA", (S * SS, S * SS), (0, 0, 0, 0))
    final_ss.paste(big, (0, 0), bg_mask)

    final = final_ss.resize((S, S), Image.LANCZOS)
    final.save(out_path, "PNG", optimize=True)
    print(f"apple-touch-icon: {out_path} ({S}×{S}, {os.path.getsize(out_path)} bytes)")


def main():
    if not os.path.exists(FONT_REGULAR):
        print(f"ERROR: Font not found: {FONT_REGULAR}", file=sys.stderr)
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    build_og_image(os.path.join(script_dir, "og-image.png"))
    build_apple_touch_icon(os.path.join(script_dir, "apple-touch-icon.png"))


if __name__ == "__main__":
    main()
