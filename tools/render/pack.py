# out/*.png + positions -> site/assets/render/*.webp + positions.json   (usage: pack.py [test])
# Crops every frame to one shared square around the box (union of all frames, plus margin)
# and remaps the projected positions into that crop.
import json, sys, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); DST = os.path.join(HERE, "../../assets/render")
os.makedirs(DST, exist_ok=True)
test = len(sys.argv) > 1 and sys.argv[1] == "test"
if test:
    info = json.load(open(os.path.join(HERE, "out/test.json")))
    ims = [Image.open(os.path.join(HERE, "out/test.png")).convert("RGBA")] * 25; arr = [info] * 25
else:
    pos = json.load(open(os.path.join(HERE, "out/positions_0_25.json")))
    arr = [pos[str(i)] for i in range(25)]
    ims = [Image.open(os.path.join(HERE, f"out/f{i:02d}.png")).convert("RGBA") for i in range(25)]
w = ims[0].size[0]
box = None
for im in ims:
    b = im.getchannel("A").point(lambda a: 255 if a > 230 else 0).getbbox()
    box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
side = max(box[2] - box[0], box[3] - box[1]) * 1.16
cy += side * 0.03  # leave room under the box for its shadow
x0, y0 = cx - side / 2, cy - side / 2
print("bbox", box, "crop", round(x0), round(y0), round(side))
# soft edges so the contact shadow never ends in a hard line at the crop
import numpy as np
n = 800; r = np.linspace(0, 1, n); e = np.clip(np.minimum(r, 1 - r) / 0.07, 0, 1); e = e * e * (3 - 2 * e)
FADE = np.outer(e, e)
def fade(im):
    a = np.asarray(im).astype(np.float32); a[..., 3] *= FADE; return Image.fromarray(a.astype(np.uint8), "RGBA")
for i, im in enumerate(ims):
    fade(im.crop((round(x0), round(y0), round(x0 + side), round(y0 + side))).resize((800, 800), Image.LANCZOS)).save(f"{DST}/f{i:02d}.webp", quality=84, method=4)
def m(p): return [round((p[0] * w - x0) / side, 4), round((p[1] * w - y0) / side, 4)]
out = [{"yaw": a["yaw"], "logo": m(a["logo"]), "dial": [m(p) for p in a["dial"]], "leds": [m(p) for p in a["leds"]]} for a in arr]
json.dump(out, open(f"{DST}/positions.json", "w"), separators=(",", ":"))
print("packed", len(out))
