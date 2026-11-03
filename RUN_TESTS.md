# AICHEATCODE V5 — Setup dan pengesahan

Projek ini menggunakan **pnpm** (lihat `packageManager` dan `pnpm-lock.yaml`), Cloudflare Workers dan D1. Jangan gunakan `pip install` atau `npm ci` tanpa `package-lock.json`.

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run build
node scripts/test-server.mjs
```

Cloudflare D1: konfigurasi binding `DB` diperlukan. Uji SQL di `database/d1/` pada D1 tempatan dahulu sebelum remote. Jangan menganggap fail SQLite tempatan sebagai D1 production.

Pengesahan HTTP sebenar memerlukan server berjalan dan URL deployment sah. Jangan gunakan status PASS bagi production tanpa bukti respons dan akses.
