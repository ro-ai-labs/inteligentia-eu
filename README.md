# inteligentia.eu

Static site served by GitHub Pages (`CNAME` → inteligentia.eu). No build step.

| Page | EN | RO |
|---|---|---|
| Home: product page + interactive agent preview | `index.html` | `index-ro.html` |
| What leaves the house | `security.html` | `security-ro.html` |
| Proof & specs | `proof.html` | `proof-ro.html` |
| Investors | `investors.html` | `investors-ro.html` |

- Design system "Chrome" (`assets/css/site.css`): the site is the device, switched on. Graphite dark, liquid-chrome lettering (`.d`, the gradient repeats per line), the case's anodized blue (`--case`, `--anod`) for anything you press, a polished-steel primary button, machined panels (`--panel` + `--edge`), and LED dots (`--led`, `--amber`, `--electric`) for status. Michroma for headlines (its euro sign reads as a zero, so prices wrap `€` in `<i>`), Hanken Grotesk for reading, JetBrains Mono for telemetry. The agent's presence is its sigil (`.orb`: chrome spiral on an anodized disc, from `assets/img/mark-mask.png`); `assets/img/sigil.png` is the static version used as chat avatar and favicon.
- The homepage opens with the box itself: a looping video (`assets/render/box.mp4`, 864², 8 s, 24 fps, H.264, about 1.6 MB; `box-poster.jpg` is its first frame and the still for reduced motion). The box is path-traced in Blender Cycles from the product film (matte blue aluminium, flat-top hex vents, round holes on top, a parting seam, and a real computer inside: carrier board, module under a finned heatsink and fan, SSD, GPIO header, ports, lit so it shows through the vents). The animated icon behind the front glass (LED ring, a light running round it, the spiral) and the four blinking status LEDs are composed on top in Remotion, composition `IgBox` in the video project (`~/video`), placed per frame from the projected window corners. The video sits on pure black and the page blends it with `mix-blend-mode: lighten`, so it melts into the hero; the still shows until the video is actually playing. It wakes with the boot: a tiny inline script in `<head>` adds `html.booting` (skipped for reduced motion, 5 s failsafe), `heroBoot()` in `agent.js` lights the status readout one by one while the box is dimmed, then it lights up and the headline scans in. About 2 s on a first visit, a flicker after (`ig.hero`). To change the box: edit `tools/render/box.py`, run it with Blender as a Python module (`pip install bpy==4.2.0`; put the CC0 HDRI `studio_small_09_2k.hdr` from Poly Haven next to it): `python box.py test [yaw]` for one frame, `python box.py sweep` for the 97-frame eased half-turn (about 45 min on 16 cores). `python prep_video.py` crops them into the video project; then in `~/video`: `npx remotion render IgBox out/igbox/box.mp4 --codec=h264 --crf=20 --x264-preset=slow --image-format=png`, and rotate the loop to start at the front-facing frame 96 (ffmpeg trim + concat, `+faststart`). `og-box.jpg` is the share image. Positioning: the box sits on your desk; audience is prosumers.
- `assets/css/fonts.css` + `assets/fonts/`: self-hosted Michroma, Hanken Grotesk, JetBrains Mono (SIL OFL). No third-party requests.
- `assets/js/agent.js`: the product page (reservation form showing the exact JSON it sends) and the "Meet your agent" preview, a full-screen scripted conversation that runs only in the browser (three moments: memory, documents, switching models; plus the PII filter, Telegram, import, comparison). Everything it says lives in `assets/js/strings.js` (EN) and `assets/js/strings-ro.js` (RO), same keys.
- `assets/css/agent.css`: homepage and preview layout (mobile first).
- `assets/film/`: looping clips rendered with Remotion, currently unused on the homepage.
- `proof.html#recordings`: slots for short real recordings (unplugging the network, recalling a memory, switching models, inspecting an outgoing request). Replace each `.rec-frame` with a `<video>` once filmed on production hardware, and add the recording date.

## Reservations

The reservation form posts to Supabase (project `mvp`, EU Frankfurt), table `public.early_access_requests`
with `initiative_slug = 'inteligentia'`. The page uses the publishable key; row-level security
allows inserts only, so the key cannot read the list. Duplicate emails return 409 and are shown
as "already on the list". Read the demand in the Supabase dashboard, for example:

```sql
select created_at, full_name, email, answers->>'tier' as tier, answers->>'lang' as lang
from public.early_access_requests
where initiative_slug = 'inteligentia'
order by created_at desc;
```

## Copy rules

- Never name the on-device model.
- Be honest: local-first with filtered cloud routing, not 100% private.
- The competitor table cites public sources on `security.html#sources`; re-check before changing it.
- The "Where things stand" list on the homepage (ready today / in development / intended at shipping) must stay accurate. Update it as features land.
