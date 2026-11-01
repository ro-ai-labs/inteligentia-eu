# inteligentia.eu

Static site served by GitHub Pages (`CNAME` → inteligentia.eu). No build step.

| Page | EN | RO |
|---|---|---|
| Home: product page + interactive agent preview | `index.html` | `index-ro.html` |
| What leaves the house | `security.html` | `security-ro.html` |
| Proof & specs | `proof.html` | `proof-ro.html` |
| Investors | `investors.html` | `investors-ro.html` |

- Design system "Chrome" (`assets/css/site.css`): the site is the device, switched on. Graphite dark, liquid-chrome lettering (`.d`, the gradient repeats per line), the case's anodized blue (`--case`, `--anod`) for anything you press, a polished-steel primary button, machined panels (`--panel` + `--edge`), and LED dots (`--led`, `--amber`, `--electric`) for status. Michroma for headlines (its euro sign reads as a zero, so prices wrap `€` in `<i>`), Hanken Grotesk for reading, JetBrains Mono for telemetry. The agent's presence is its sigil (`.orb`: chrome spiral on an anodized disc, from `assets/img/mark-mask.png`); `assets/img/sigil.png` is the static version used as chat avatar and favicon.
- The homepage opens with the box itself, rendered live in 3D (`assets/js/box3d.js`, three.js r169 self-hosted in `assets/vendor/`): anodized brushed-aluminium case with the real hex perforation, the chrome spiral centered on the front, four status LEDs that blink once it is awake, drag to turn. It is modelled procedurally (no 3D files); proportions and hole patterns are constants at the top of `start()`. It wakes with the boot: a tiny inline script in `<head>` adds `html.booting` (skipped for reduced motion, 5 s failsafe), `heroBoot()` in `agent.js` lights the status readout one by one, the 3D lights and LEDs follow, then the headline scans in. About 2 s on a first visit, a flicker after (`ig.hero`), any tap/key/scroll skips. `assets/img/box-render.webp` is the poster shown until WebGL is ready (and if it never is), and `og-box.jpg` the share image: regenerate both by opening `index.html?hires` and saving the canvas. Positioning: the box sits on your desk; audience is prosumers.
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
