# inteligentia.eu

Static site served by GitHub Pages (`CNAME` → inteligentia.eu). No build step.

| Page | EN | RO |
|---|---|---|
| Home: product page + interactive agent preview | `index.html` | `index-ro.html` |
| What leaves the house | `security.html` | `security-ro.html` |
| Proof & specs | `proof.html` | `proof-ro.html` |
| Investors | `investors.html` | `investors-ro.html` |

- Design system "Chrome" (`assets/css/site.css`): the site is the device, switched on. Graphite dark, liquid-chrome lettering (`.d`, the gradient repeats per line), the case's anodized blue (`--case`, `--anod`) for anything you press, a polished-steel primary button, machined panels (`--panel` + `--edge`), and LED dots (`--led`, `--amber`, `--electric`) for status. Michroma for headlines (its euro sign reads as a zero, so prices wrap `€` in `<i>`), Hanken Grotesk for reading, JetBrains Mono for telemetry. The agent's presence is its sigil (`.orb`: chrome spiral on an anodized disc, from `assets/img/mark-mask.png`); `assets/img/sigil.png` is the static version used as chat avatar and favicon.
- The homepage opens with the box itself, path-traced in Blender Cycles and played back as a turntable (`assets/js/box-seq.js`): 25 frames from -36° to +36° in `assets/render/f00..f24.webp`, cross-faded, drifting slowly, drag to turn. The model follows the product film: matte blue aluminium, flat-top hex vents clipped at their edges, round holes on top, a parting seam, and a real computer inside (carrier board, module under a finned heatsink and fan, SSD, GPIO header, ports) lit so it shows through the vents. The front has a round glass window; the animated icon behind it (LED ring that fills as the agent boots, a light running round it, the spiral) is real DOM laid onto the glass each frame with a `matrix3d` perspective map, using the window corners stored in `assets/render/positions.json` (which also places the four blinking status LEDs). It wakes with the boot: a tiny inline script in `<head>` adds `html.booting` (skipped for reduced motion, 5 s failsafe), `heroBoot()` in `agent.js` lights the status readout one by one, the ring and LEDs follow, then the headline scans in. About 2 s on a first visit, a flicker after (`ig.hero`), any tap/key/scroll skips. To change the box: edit `tools/render/box.py` and run it with Blender as a Python module (`pip install bpy==4.2.0`; download the CC0 HDRI `studio_small_09_2k.hdr` from Poly Haven next to it), `python box.py test [yaw]` for one frame, `python box.py all` for the turntable (about 25 min on 16 CPU cores), then `python pack.py` to crop, compress and write the frames and positions. `og-box.jpg` is the share image. Positioning: the box sits on your desk; audience is prosumers.
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
