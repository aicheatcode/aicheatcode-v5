# AICHEATCODE — SQL integration

Cloudflare D1 binding **DB** is required. `app/api/content` now reads `prompt_records` from D1 instead of local JSON; `app/api/prompts` supports paginated SQL search. `public/data.json` remains for non-prompt site metadata.

Apply `database/d1/000_schema.sql` followed by `001_seed.sql` through `011_seed.sql`, then `099_manifest.sql` using `wrangler d1 execute <DATABASE_NAME> --file=<PATH>` (add `--remote` only when intentionally targeting production). Use the correct D1 database name and binding configuration for the deployment. **Back up production D1 before importing.** The seed uses INSERT OR REPLACE; it does not delete unrelated records. Test first on local D1.

Verify: `SELECT COUNT(*) FROM prompt_records;` should equal **1071** after import to a clean database. Verify `PRAGMA integrity_check;` and request `/api/prompts?limit=2` and `/api/content` on a running server. Editor data is in `editor_state` and is not overwritten by this seed. Never upload the SQLite snapshot as a publicly served asset.

Important: The existing UI may rely on legacy `type` values. The content API currently uses `type: Prompt` for imported records; verify category/type filtering in a browser before release. Production deployment, HTTP and auth tests have not been performed.
