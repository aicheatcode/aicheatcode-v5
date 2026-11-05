# AICHEATCODE V5 — primary-domain cutover gate

## Verified state on 5 November 2026
- GitHub Actions run 42036776161: CI build, local D1 CMS integration and Worker deployment PASS.
- Production Worker URL confirmed in deployment logs: https://aicheatcode-v5.aicheatcode-e4364da72f75.workers.dev
- Apex-domain verification reported **BLOCKED**: `GET https://cannybrainy.com/api/health` returned HTTP 404.
- The historical domain-check script wrote BLOCKED yet returned exit code 0, creating a false-green deployment summary. This change makes it fail the job.

## What the change actually does
- `wrangler.production.jsonc` declares exactly one Worker Custom Domain: `cannybrainy.com`.
- `scripts/deploy-cloudflare.mjs` copies that exact approved route into the generated Worker configuration without exposing API tokens.
- Cloudflare's Custom Domain setup provisions DNS and an HTTPS certificate **only if** the domain is an active zone in the same account and the existing DNS is compatible.
- No automatic record deletion, zone transfer, or rollback of an unrelated service occurs.
- `scripts/check-primary-domain.mjs` exits nonzero unless HTTPS, V5 Worker commit, D1 health and anonymous CMS denials all pass.
- `tests/domain-gate.test.mjs` covers a simulated old-site 404 (FAIL) and matching V5 (PASS), with no external network activity.

## Hard blockers requiring an authorised Cloudflare configuration
1. A Cloudflare zone for `cannybrainy.com` must be active in the same Cloudflare account whose credentials the GitHub Actions production environment uses.
2. An existing CNAME or incompatible Worker route at the apex can block Custom Domain creation. **Inspect and back up** conflicting records and old routing before any selective changes. Do not bulk-delete DNS records: MX, TXT, mail and other subdomains must be preserved.
3. Configure Cloudflare Access applications/policies to protect `/studio.html`, `/admin.html`, `/api/site-cms`, `/api/cms-media`, and `/api/editor` for the owner's verified email; keep public pages and `/media/*` public. The Worker additionally verifies the signed Access assertion.
4. Set all three GitHub Actions **production Variables** (not Secrets): `CF_ACCESS_TEAM_DOMAIN` (e.g. `your-team.cloudflareaccess.com`), `CF_ACCESS_AUD` (the Access application AUD), and `CMS_OWNER_EMAIL` (the owner's email). Do not print or commit any secrets. Note that the application AUD must correspond to the Access policy covering each API endpoint; when using separate applications, each would have its own audience and require explicit support.
5. The existing `CLOUDFLARE_API_TOKEN` must have rights to manage the Custom Domain in addition to Workers/D1. Avoid widening permissions without a specific account-scoped reason.

## QA gate for “SELESAI”
- Production build and D1 migration: PASS with matching SHA.
- Primary domain GET `/api/health`: HTTP 200, same SHA, D1 available, HTTPS verified.
- Domain `/`: V5 `/hub.css`, without legacy neon as default.
- Owner API anonymous GET/PUT: 403.
- Owner Access sign-in: authorised user can read draft; unauthorised user denied.
- Owner CRUD: create draft, preview, reorder sections, upload image, publish, read back on public URL, unpublish, restore original, preserve unrelated prompts and pages.
- Desktop and mobile UAT: no horizontal overflow or broken controls in major supported browsers.
- Retain the prior design at `/?legacy=1` only as an archived, non-default path until explicit deletion approval. Archive is sufficient for the stated cutover requirement.
- Any BLOCKED/FAIL/NOT TESTED item precludes “SELESAI”.

Reference: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
