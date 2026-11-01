# inteligentia.eu

Static site served by GitHub Pages (`CNAME` → inteligentia.eu). No build step.

| Page | EN | RO |
|---|---|---|
| Home: the agent conversation | `index.html` | `index-ro.html` |
| What leaves the house | `security.html` | `security-ro.html` |
| Proof & specs | `proof.html` | `proof-ro.html` |
| Investors | `investors.html` | `investors-ro.html` |

- `assets/css/site.css`: shared neo-brutalist design system.
- `assets/css/fonts.css` + `assets/fonts/`: self-hosted Anton, Instrument Serif, JetBrains Mono (SIL OFL). No third-party requests.
- `assets/js/agent.js`: the homepage is a scripted conversation with your future agent (boot, filter demo, provider switch, browser-local memory, reservation). Everything it says lives in `assets/js/strings.js` (EN) and `assets/js/strings-ro.js` (RO), same keys.
- `assets/css/agent.css`: homepage layout (mobile first). `site.css` holds the shared neo-brutalist primitives and the fine-print pages.
- `assets/film/`: looping clips rendered with Remotion (source: the `Inteligentia` compositions in the video project). Each has `.webm`, `.mp4` and a `.jpg` poster.

## Reservations

The in-chat reservation posts to Supabase (project `mvp`, EU Frankfurt), table `public.early_access_requests`
with `initiative_slug = 'inteligentia'`. The page uses the publishable key; row-level security
allows inserts only, so the key cannot read the list. Duplicate emails return 409 and are shown
as "already on the list". Read the demand in the Supabase dashboard, for example:

```sql
select created_at, full_name, email, answers->>'tier' as tier, answers->'topics' as asked_about, answers->>'lang' as lang
from public.early_access_requests
where initiative_slug = 'inteligentia'
order by created_at desc;
```

## Copy rules

- Never name the on-device model.
- Be honest: local-first with filtered cloud routing, not 100% private.
- The competitor table cites public sources on `security.html#sources`; re-check before changing it.
