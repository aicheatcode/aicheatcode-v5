# AICHEATCODE V5 — Cloudflare Access + DNS/SSL UAT

Status: CODE-PREPARED ONLY. Do not label production as SELESAI until authenticated owner UAT, domain TLS and visual browser tests pass.

## Exact protected paths

- /studio.html — no-code page CMS
- /admin.html — prompt editor
- /api/site-cms — page drafts, publish/unpublish
- /api/cms-media — media uploads
- /api/editor — prompt edits

These are the routes implemented in the repository. /api/site and /api/cms/media are NOT the real CMS endpoints.

Read-only public image URL /media/:id and public /api/content must remain public. Do not protect the entire domain.

## Set GitHub repository VARIABLES (not secrets)

Settings > Secrets and variables > Actions > Variables:

- CF_ACCESS_TEAM_DOMAIN: from Zero Trust > Settings > Custom Pages / team domain (example: my-team.cloudflareaccess.com; no https prefix).
- CF_ACCESS_AUD: application audience identifier from the created Access app (32–64 hex characters).
- CMS_OWNER_EMAIL: the actual owner's verified email; do not derive it from repository commit authors.
- ACCESS_PROTECTED_HOSTS: comma-separated domain list. Include cannybrainy.com and aicheatcode-v5.aicheatcode-e4364da72f75.workers.dev. A protected Access app must cover all publicly reachable editor hostnames, or disable the unprotected route.
  
GitHub SECRETS already used by CI: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Never paste values in logs, commit them, or send them in chat.

Token must additionally have Access: Apps and Policies Read for the UAT script; Zone Read, DNS Read, Workers Scripts Read for DNS/proxy/Worker audit. To create Access app with the provided helper, use a separate least-privilege token with Access: Apps and Policies Write. Never escalate production token merely to run UAT.

## Create Cloudflare Access app (dashboard)

1. Open Cloudflare > Zero Trust > Access controls > Applications > Add an application > Self-hosted.
2. Set name AICHEATCODE V5 — Owner CMS.
3. Add EACH of the five exact paths for cannybrainy.com and the equivalent five routes for the active workers.dev hostname (or implement Worker-level protection with carefully reviewed public exceptions).
4. Policy Allow: Include > Emails > exactly one owner email. Do not use Everyone, email domain wildcard, Bypass, or a broad role group.
5. Pick an available login method e.g. One-time PIN email or supported IdP. Set session duration 8 hours.
6. Save. Copy Access AUD and team domain to GitHub Variables above.
7. Trigger the existing production deployment only once configured, so the deploy script sets the three Worker vars. Verify Worker Settings > Variables & Secrets readback or use deployment log. Note: these three strings are not API tokens but they expose owner identity; keep the email out of public docs and debug logs.

## Optional API helper

Read-only dry-run (no modifications):

    node scripts/provision-access.mjs

Explicit creation only when a Cloudflare token with Access Write is available:

    ALLOW_ACCESS_CREATE=YES node scripts/provision-access.mjs --apply

It will refuse to overwrite a same-name application and requires BOTH the main and workers.dev hostnames in ACCESS_PROTECTED_HOSTS. Creation is not automatic and must only be performed after reviewing the application scope; the resulting AUD must be copied to GitHub. Do not run this if an equivalent Access application already exists.

## Inspect DNS and certificate

1. Cloudflare account > Websites > cannybrainy.com. Zone must be Active. Do not change Namecheap NS until all records (MX, TXT, SPF, DKIM, DMARC and GitHub TXT verification) have been copied and validated.
2. Cloudflare > Workers & Pages > aicheatcode-v5 > Settings > Domains & Routes. Add Custom Domain cannybrainy.com ONLY after staging + Access UAT. Cloudflare requires an active zone and will create its DNS and certificate for a supported Custom Domain.
3. SSL/TLS > Overview: set Full or Full (Strict) as appropriate for any external origin. For a Worker Custom Domain, the decisive checks are edge certificate validity, correct Worker mapping and HTTPS response — changing SSL mode alone does not enable SSL.
4. Do not remove the neon site's DNS or assets without an archived rollback point. Do not promise a one-minute DNS rollback.

## UAT read-only workflow

GitHub > Actions > AICHEATCODE Infrastructure UAT > Run workflow.

- scripts/audit-access.mjs checks selected Access AUD, exact routes, absence of broad/bypass policies.
- scripts/audit-cloudflare-zone.mjs checks zone Active, Worker domain mapping, proxy DNS records and Full/Strict mode; requires read permissions.
- scripts/audit-domain.mjs checks public NS/A DNS, TLS validation and HTTPS health returning D1.
- Failure is BLOCKED (not PASS); a single test cannot replace the others.

For desktop/mobile with Playwright installed in a dedicated test runner:

    npm install --no-save playwright
    npx playwright install chromium
    UAT_ORIGIN=https://cannybrainy.com node scripts/uat-browser.mjs

Screenshots stored locally under uat-evidence/. Do not publish confidential editor screenshots as public Actions artifacts. The script checks two Chromium viewports and anonymous CMS denial; it does NOT establish Safari/Firefox support or full authenticated publishing. Manually perform authenticated edit, publish, verify public change, unpublish and verify rollback in staging with real owner session before production release.

## Quick rollback / incident response

- Access bypass or unexpected 200 from anonymous CMS: STOP immediately; disable write endpoint using Access enforcement, revert affected Worker deployment if required, investigate logs and rotate implicated credentials.
- Owner denied: do not disable Access globally; check AUD, issuer/team domain, owner email, identity method and signed JWT.
- DNS/SSL failure: do not point apex traffic to unverified target. Restore known-good Cloudflare Worker route or previous validated DNS mapping and verify from external resolvers. DNS caching makes recovery time non-deterministic.
- D1 issue: halt writes, preserve recovery bookmark and verify migrations; restore from point-in-time recovery only after checking impact.

Production acceptance requires ALL: Access owner-only PASS; owner real login PASS; D1 edit/publish/unpublish PASS; Chrome/Safari/Firefox desktop/mobile PASS; zone/proxy/SSL PASS; no mixed content; working links and media; rollback rehearsed.
