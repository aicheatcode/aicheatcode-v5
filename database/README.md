# Database prompt — provenance

`prompt-library.sqlite3` contains **materialized** prompts from `public/data.json` and `public/curated-prompts.json`. `prompt-catalog.json` describes a **virtual, generated catalog**; its 100,000 declared entries are NOT 100,000 independently stored, source-verified prompts. Do not claim otherwise.

The current website still reads JSON + `public/catalog.js` for prompt retrieval. This SQLite file is a portable audited export, **not a connected production database**. Cloudflare D1 currently stores `editor_state`; migration/integration of `prompt_records` into live API remains unverified.

Security: editor writes require a trusted gateway to sign `id\nemail\ntimestamp` with HMAC-SHA256, using `EDITOR_GATEWAY_SECRET` (at least 32 characters), and add `x-editor-auth-timestamp` and `x-editor-auth-signature`. Client-supplied identity headers alone are rejected. Do not expose this secret to browser code. Configure gateway before enabling editor.
