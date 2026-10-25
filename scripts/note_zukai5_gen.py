from PIL import Image, ImageDraw, ImageFont
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

OUT = "/tmp/claude-0/-home-claude/ec88f45e-fedd-58ae-b8f9-a58a80419b4f/scratchpad/thumbs"
SERIF_B = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
SERIF_R = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"
def f(p, s, i=2): return ImageFont.truetype(p, s, index=i)

W, H = 1280, 670
BG=(251,247,242); PAT=(244,233,228); ENJI=(158,42,43)
GOLD=(200,169,106); INK=(43,36,34); MUTED=(122,110,104); CARD=(255,255,255)

def seigaiha(d):
    r, step = 86, 46
    for row in range(-1, H//step+2):
        y=row*step; off=(r//2) if row%2 else 0
        for col in range(-1, W//r+2):
            x=col*r+off
            for k in range(3):
                rr=r//2-k*11
                if rr>6: d.arc([x-rr,y-rr,x+rr,y+rr],180,360,fill=PAT,width=3)

img = Image.new("RGB",(W,H),BG); d = ImageDraw.Draw(img)
seigaiha(d)
d.rectangle([34,34,W-35,H-35], outline=GOLD, width=2)

# 見出し帯
d.rectangle([74,74,W-75,142], fill=ENJI)
fh = f(SERIF_B,38)
t = "月額制の講座と、6ヶ月の養成講座"
d.text(((W-d.textlength(t,font=fh))/2, 88), t, font=fh, fill=(255,252,248))

# カード
CX1, CX2, CW = 90, 660, 530
CY, CH = 166, 412
for cx in (CX1, CX2):
    d.rectangle([cx, CY, cx+CW, CY+CH], fill=CARD, outline=GOLD, width=2)

fc = f(SERIF_B,31)
d.text((CX1+34, CY+28), "月額制・サブスク型", font=fc, fill=MUTED)
d.text((CX2+34, CY+28), "養成講座（6ヶ月）", font=fc, fill=ENJI)
for cx in (CX1, CX2):
    d.line([cx+34, CY+80, cx+CW-34, CY+80], fill=GOLD, width=2)

rows = [
    ("期間",     "続けるあいだ",       "6ヶ月で修了"),
    ("学ぶ順番", "選んで学ぶことが多い", "順を追って学ぶ"),
    ("質問",     "講座により異なる",   "LINEで質問・添削会"),
    ("区切り",   "いつでも終えられる", "修了時に認定"),
]
fl = f(SERIF_R,24); fv = f(SERIF_R,28)
y = CY+96
for label, a, b in rows:
    for cx, val in ((CX1,a),(CX2,b)):
        d.ellipse([cx+36, y+16, cx+48, y+28], fill=GOLD)
        d.text((cx+62, y), label, font=fl, fill=MUTED)
        d.text((cx+62, y+32), val, font=fv, fill=INK)
    y += 74

fs = f(SERIF_R,22)
note = "※月額制の内容は講座によって異なります。どちらが良い悪いではなく、目指すところが違います。"
d.text(((W-d.textlength(note,font=fs))/2, H-78), note, font=fs, fill=MUTED)

img.save(os.path.join(OUT,"zukai5_getsugaku.jpg"), quality=95)
print("ok")
