# CI verification instructions

Push this repository to GitHub. GitHub Actions runs `.github/workflows/ci.yml` automatically on push, pull request, or manual dispatch. Inspect the workflow logs and `qa-evidence` artifact. A successful CI run confirms only local tests and build in GitHub-hosted runners, not Cloudflare production.

Cloudflare D1 is not ordinary local SQLite in deployment: provision a D1 database, configure the `DB` binding and migrations, and verify API calls with the deployed Worker. Production deployment requires Cloudflare account credentials and is deliberately **not** automated here to prevent accidental publishing. Do not commit secrets.

For production checks, independently verify HTTP status for `/`, `/api/prompts?limit=2`, `/api/content`, `/robots.txt`, and `/sitemap.xml`; ensure admin endpoints deny unauthenticated writes; test with real D1 binding and verify database counts and backups. Mark those checks BLOCKED until actual evidence is available.
