# out/sweep/s*.png + positions -> ~/video/public/inteligentia/box/s*.png + positions.json
# One shared square crop around the box (union over the sweep) with room to fade the edges.
import json, os, glob
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, "out/sweep")
DST = os.path.expanduser(os.environ.get("IG_VIDEO_PUBLIC", "~/video/public/inteligentia/box")); os.makedirs(DST, exist_ok=True)
import sys
pos = {}
for f in glob.glob(f"{SRC}/positions_*.json") + glob.glob(os.path.join(HERE, "out/sweep_pos/positions.json")): pos.update(json.load(open(f)))
N = 97; arr = [pos[str(k)] for k in range(N)]
have = sorted(int(os.path.basename(f)[1:4]) for f in glob.glob(f"{SRC}/s*.png"))
if "--preview" in sys.argv: have = have[:-1]          # the newest may still be writing
nearest = lambda k: min(have, key=lambda h: abs(h - k))
ims = [Image.open(f"{SRC}/s{nearest(k):03d}.png").convert("RGBA") for k in range(N)]
w = 1000
box = (171, 285, 829, 740)   # union of the box over the full +/-36 degree turn (fixed, so crops never jump)
cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
side = max(box[2] - box[0], box[3] - box[1]) * 1.3
cy += side * 0.03
x0, y0 = cx - side / 2, cy - side / 2
print("bbox", box, "side", round(side))
for k, im in enumerate(ims):
    im.crop((round(x0), round(y0), round(x0 + side), round(y0 + side))).resize((864, 864), Image.LANCZOS).save(f"{DST}/s{k:03d}.png", optimize=False, compress_level=1)
m = lambda p: [round((p[0] * w - x0) / side, 5), round((p[1] * w - y0) / side, 5)]
json.dump([{"logo": m(a["logo"]), "dial": [m(p) for p in a["dial"]], "leds": [m(p) for p in a["leds"]]} for a in arr], open(f"{DST}/positions.json", "w"))
print("prepared", N)
