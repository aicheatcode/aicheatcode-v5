# AICHEATCODE V5 — Security & Data Repair

- Original source retained in full; `database/prompt-library.sqlite3` added as portable SQLite export of real materialized prompt records.
- Editor authorization hardened: arbitrary identity headers alone no longer grant access; a trusted HMAC-signing gateway is required.
- JSON and virtual catalog remain in place to preserve frontend compatibility; the live website **does not yet query SQLite**.
- `QA_ACTUAL.json` records verified local counts and untested integration areas.
- No production deployment performed. Do not label this production-ready.
- Run `pnpm install --frozen-lockfile`, `pnpm build`, project tests and HTTP/DB/browser security tests in a networked CI environment before deployment.
