# inteligentia.eu

Static site served by GitHub Pages (`CNAME` → inteligentia.eu). No build step.

| Page | EN | RO |
|---|---|---|
| Home: product page + interactive agent preview | `index.html` | `index-ro.html` |
| What leaves the house | `security.html` | `security-ro.html` |
| Proof & specs | `proof.html` | `proof-ro.html` |
| Investors | `investors.html` | `investors-ro.html` |

- Design system "Home Light" (`assets/css/site.css`): warm ivory paper, the case's anodized blue (`--case`, sampled from the real box) as the only accent, glass surfaces, Instrument Serif for headlines, Inter for reading, JetBrains Mono only for telemetry and technical labels. The agent's presence is its own sigil (`.orb`: silver spiral on metallic blue, from `assets/img/mark-mask.png`); `assets/img/sigil.png` is the static version used as chat avatar and favicon.
- `assets/css/fonts.css` + `assets/fonts/`: self-hosted Instrument Serif, Inter, JetBrains Mono (SIL OFL). No third-party requests.
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
