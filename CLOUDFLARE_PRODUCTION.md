# AICHEATCODE V5 — Cloudflare Workers + D1 production

Pipeline ini menggunakan Worker Vinext sebenar serta binding D1 `DB`. Ia bukan deploy statik ke Pages. Build yang telah lulus ujian dipindahkan terus ke job deployment; build tidak digantikan atau dijana semula dalam job tersebut.

## Setup sekali sahaja

Dalam `tipgrandma/aicheatcode-v5`, buka **Settings → Secrets and variables → Actions → New repository secret**, kemudian tambah:

| Secret | Nilai |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Token Cloudflare untuk akaun sasaran. Jangan letak token dalam kod, fail konfigurasi atau chat. |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID Cloudflare, 32 aksara heksadesimal. Ini bukan Zone ID atau Database ID. |

Environment secrets dalam **Settings → Environments → production** turut disokong. Environment yang sama digunakan oleh job semakan konfigurasi dan job deployment.

Token mesti boleh membaca/mengurus Worker dan mencipta/mengemas kini D1 dalam **akaun sasaran sahaja**. Untuk Worker baharu, gunakan hak Workers yang membenarkan penciptaan (Workers Admin pada skop produk akaun); Workers Editor untuk Worker sedia ada sahaja tidak semestinya boleh mencipta Worker baharu. D1 memerlukan hak Edit/Write untuk provision, migrasi dan import. Token tidak perlu mengurus DNS/Routes apabila menggunakan `workers.dev`. Semak keizinan semasa di dokumentasi Cloudflare di bawah.

Pastikan akaun sudah mempunyai subdomain `workers.dev` di Cloudflare **Workers & Pages**. Pipeline membacanya melalui API; URL production tidak perlu diteka atau dimasukkan secara manual.

## Variables pilihan

Tambah dalam tab **Variables**, bukan Secrets, hanya jika mahu menggantikan default:

| Variable | Default / kegunaan |
| --- | --- |
| `CLOUDFLARE_WORKER_NAME` | `aicheatcode-v5` |
| `CLOUDFLARE_D1_DATABASE_NAME` | `aicheatcode-v5-production` |
| `CLOUDFLARE_D1_DATABASE_ID` | Kosong: cari database dengan nama tepat; cipta secara automatik jika belum wujud. ID yang diberi akan disahkan sepadan dengan nama. |
| `PRODUCTION_URL` | Kosong: URL `workers.dev` dikesan daripada akaun Cloudflare. Jika diisi, gunakan origin HTTPS bagi custom domain yang sudah dipautkan kepada Worker ini. |

D1 tidak memerlukan username, password SQL atau connection string pada Worker. `DB` ialah binding runtime; API token hanya digunakan oleh job deployment.

Selepas menyimpan Secrets, buka **Actions → AICHEATCODE V5 - Automated QA → Run workflow**, pilih branch **main**. Push seterusnya ke `main` menjalankan proses secara automatik. Pull request menjalankan QA tanpa menggunakan secrets production atau mengubah D1.

## Aliran automatik

1. Pasang dependensi mengikut lockfile; uji SQL, katalog, 76 integrasi, editor, prompt, server dan perlindungan deployment.
2. Build Worker. Uji HTTP sebenar pada Worker/D1 tempatan: 1,071 rekod, health, prompt API, content API, editor tanpa identiti, robots dan sitemap.
3. Jika Secrets tiada, tulis **BLOCKED** pada job summary dan langkau deployment. Kejayaan job QA bukan bukti production PASS.
4. Cari/cipta D1. Gabungkan ID sebenar dengan konfigurasi build. Tolak ID placeholder atau ID/nama database yang tidak sepadan.
5. Untuk database sedia ada, ambil bookmark Time Travel sebelum sebarang migrasi. Tiada eksport kandungan editor disimpan dalam artifact awam.
6. Jalankan migrasi tambahan daripada `database/migrations`. Import awal menggunakan `INSERT OR IGNORE` dan marker versi; ia boleh disambung selepas gangguan serta tidak menimpa prompt sedia ada atau `editor_state`.
7. Sahkan kesemua ID sumber dalam D1 sebelum deploy. `editor_state` tidak diisi atau dikosongkan oleh seed. Rekod tambahan sedia ada dibenarkan.
8. Deploy build yang sama melalui Wrangler. `/api/health` mesti melaporkan commit SHA yang betul dan sekurang-kurangnya 1,071 rekod.
9. Uji HTTP/API dan padankan ID prompt pertama dengan bacaan D1. GET/PUT editor tanpa identiti mesti mendapat 403. Hanya selepas semua ujian ini lulus, summary dan `cloudflare-production-evidence` melaporkan **PASS** serta URL sebenar.

## Konfigurasi Wrangler

`wrangler.production.jsonc` ialah polisi production yang disemak dalam Git. ID D1 sebenar dan Account ID dimasukkan oleh skrip ke `dist/server/wrangler.production.json` selepas build. Token tidak ditulis ke konfigurasi.

Projek Vinext/Vite menjana `dist/server/wrangler.json`; fail itu mengandungi lokasi bundle, modul dan aset yang diperlukan. Skrip mengekalkan metadata tersebut. `wrangler.toml` generik tidak diperlukan dan tidak patut digunakan untuk menggantikan konfigurasi build ini. Jangan deploy terus daripada template tanpa menjalankan penyediaan ID D1 sebenar.

Arahan job utama:

```bash
pnpm run deploy:cloudflare
```

Prasyarat: artifact `dist` yang lulus QA, dua Secrets di atas, serta `GITHUB_SHA` penuh daripada commit build tersebut.

## Operasi dan pemulihan

- Migrasi SQL yang sudah digunakan adalah kekal; tambah fail migrasi baharu untuk perubahan skema.
- Seed versi awal tidak diulang untuk menimpa data. Jika fingerprint sumber berubah selepas bootstrap, deployment dihentikan; sediakan migrasi data yang jelas.
- Jika migrasi gagal, Worker baharu tidak dideploy. Migrasi terdahulu yang berjaya mungkin sudah digunakan; semak log sebelum mencuba semula.
- Jika HTTP gagal selepas upload, job gagal walaupun Worker baharu mungkin sudah aktif. Gunakan log versi Cloudflare untuk rollback Worker jika perlu. Jangan memulihkan D1 secara automatik kerana tindakan itu boleh membuang suntingan pengguna selepas bookmark.
- Bookmark database sedia ada direkod dalam `cloudflare-production-evidence`. Pemulihan manual menggunakan `wrangler d1 time-travel restore` memerlukan penilaian kesan data dahulu.
- `EDITOR_GATEWAY_SECRET` dan gateway HMAC pemilik ialah konfigurasi berasingan. Pipeline mengesahkan akses tanpa identiti ditolak; ia tidak mendakwa login editor production sudah diaktifkan.
- Deployment ini menyasarkan Worker dalam akaun Cloudflare pemilik token. Ia tidak menukar DNS `cannybrainy.com` atau menggantikan deployment ChatGPT Sites secara automatik.

## Sumber rasmi

- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/
- https://developers.cloudflare.com/workers/wrangler/commands/d1/
- https://developers.cloudflare.com/workers/authorization/workers/
- https://developers.cloudflare.com/api/resources/workers/subresources/subdomains/methods/get/
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
