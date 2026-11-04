# AICHEATCODE V5 — CMS and domain cutover

Status: STAGED ONLY. DO NOT claim completion or switch DNS until authentication, CMS and domain tests pass.

## What has been prepared
- /studio.html: responsive visual editor for page text, image URLs, card collections, section ordering, drafts, publish and unpublish.
- /api/site-cms: owner-only Cloudflare Access JWT verification (signature, issuer, audience, expiry and owner email).
- database/migrations/0002_cms_pages.sql: draft/published page data in D1, retaining all existing prompt/editor data.
- Dynamic pages: published CMS pages take precedence; original V5 pages remain safe fallback.
- /admin.html: legacy prompt editor uses the same Access verification.
- /cms.css: white, Deep Ink, Insight Blue and Prompt Orange styling for published CMS pages.
- /api/cms-media: authenticated image uploads (PNG/JPG/WebP/AVIF, max 750 KB), stored in D1, publicly read through /media/:id.

## Required before enabling editor
1. In Cloudflare Zero Trust, create a self-hosted Access app covering /studio.html, /admin.html, /api/site-cms and /api/editor on each enabled site hostname. Restrict it to the owner. Do not rely on untrusted identity headers or display-only login controls.
2. Configure Worker environment variables CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD and CMS_OWNER_EMAIL. Use the actual Access application team domain, AUD tag and authorized owner identity. This is not the old ChatGPT login.
3. Verify owner login, draft saving, publishing, unpublishing, simultaneous edit conflicts, unauthorized requests, and browser/mobile preview.

## Migration
Apply existing D1 migrations (including 0002_cms_pages.sql), verifying original 1,071 prompt IDs and editor rows remain intact. Preserve a D1 time-travel bookmark/backup before write operations.

## Domain cutover
1. Verify cannybrainy.com exists as an ACTIVE Cloudflare DNS zone. Back up all records including MX, TXT, SPF, DKIM, DMARC and GitHub verification.
2. Do NOT blindly modify Namecheap nameservers. If delegation changes are required, copy and verify all DNS records first.
3. Attach the Worker using Workers & Pages > Settings > Domains & Routes > Add Custom Domain. Resolve existing DNS record conflicts deliberately.
4. Test SSL certificate, https, redirects, canonical metadata, prompt and learning links, site CMS authenticated editor, media, browser layout and rollback on the actual domain.
5. Archive old neon assets only after all acceptance criteria pass.

## Known limitations
- Image management supports HTTPS URLs and image uploads up to 750 KB using D1 BLOB storage; R2 is recommended for larger media libraries.
- Live owner sign-in and zone/DNS cutover are not implemented by this code-only branch.
- Production release remains blocked pending Cloudflare Access configuration, end-to-end browser QA and custom domain activation.
