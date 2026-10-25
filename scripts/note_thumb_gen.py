from PIL import Image, ImageDraw, ImageFont
import math, os

OUT = "/tmp/claude-0/-home-claude/ec88f45e-fedd-58ae-b8f9-a58a80419b4f/scratchpad/thumbs"
SERIF_B = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
SERIF_R = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"

def f(path, size, idx=2):
    return ImageFont.truetype(path, size, index=idx)

W, H = 1280, 670
BG      = (251, 247, 242)
PAT     = (244, 233, 228)
ENJI    = (158, 42, 43)
GOLD    = (200, 169, 106)
INK     = (43, 36, 34)
MUTED   = (122, 110, 104)

def seigaiha(d):
    r, step = 86, 46
    for row in range(-1, H // step + 2):
        y = row * step
        off = (r // 2) if row % 2 else 0
        for col in range(-1, W // (r) + 2):
            x = col * r + off
            for k in range(3):
                rr = r // 2 - k * 11
                if rr > 6:
                    d.arc([x - rr, y - rr, x + rr, y + rr], 180, 360, fill=PAT, width=3)

def wrap(draw, text, font, maxw):
    lines, cur = [], ""
    for ch in text:
        t = cur + ch
        if draw.textlength(t, font=font) > maxw and cur:
            lines.append(cur); cur = ch
        else:
            cur = t
    if cur: lines.append(cur)
    return lines

def make(fn, label, title, size=74):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    seigaiha(d)

    # 外枠
    d.rectangle([34, 34, W - 35, H - 35], outline=GOLD, width=2)
    # 左の臙脂バー
    d.rectangle([74, 150, 84, H - 150], fill=ENJI)

    fl = f(SERIF_R, 30)
    ft = f(SERIF_B, size)
    fs = f(SERIF_R, 27)

    x = 124
    d.text((x, 150), label, font=fl, fill=ENJI)

    lines = wrap(d, title, ft, W - x - 120)
    y = 230
    for ln in lines:
        d.text((x, y), ln, font=ft, fill=INK)
        y += int(size * 1.42)

    d.line([x, H - 150, x + 70, H - 150], fill=GOLD, width=3)
    d.text((x, H - 134), "和裁士  松田みお", font=fs, fill=MUTED)

    img.save(os.path.join(OUT, fn), quality=95)
    print(fn, len(lines))

L = "着物リメイクアーティスト養成講座"
make("thumb1_kingaku.jpg", L, "金額・受講料は？\n教室の月謝との違い".replace("\n",""), 76)
make("thumb2_kuchikomi.jpg", L, "受講生さんの口コミ。始める前の不安ごとに", 76)
make("thumb3_online.jpg", L, "教室は東京で探せる？オンラインで全国から", 76)
make("thumb4_shigoto.jpg", L, "着物リメイクアーティストの仕事とは？", 78)
make("thumb5_erabikata.jpg", L, "講座はどう選ぶ？確かめたい3つのこと", 78)
