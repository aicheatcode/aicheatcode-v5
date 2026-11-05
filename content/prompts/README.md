# Arkib prompt boleh sunting — AICHEATCODE

**Folder ini ialah lokasi kerja untuk prompt anda.**

- `content/prompts/legacy/`: **1,070** prompt asal yang memang ada dalam data V5. Satu fail JSON = satu prompt; ID asal dikekalkan.
- `content/prompts/USER-IA-001.json`: 1 prompt tambahan pemilik daripada koleksi curated.
- `public/prompt-catalog.json`: katalog indeks bagi **100,000 rekod sumber CSV**; jangan anggap ia 100,000 fail prompt yang dikarang dan diserahkan secara berasingan. Struktur ini masih mengandungi variasi/sumber katalog yang dijana.
- `database/prompt-library.sqlite3`: pangkalan data SQLite asal; tidak dipadam.

## Edit tanpa AI

Buka `content/prompts/legacy/` → pilih fail mengikut ID → ikon pensel → ubah kandungan `title`, `text`, `category` atau `source` → **Commit changes**.

Jangan tukar `id` untuk rekod sedia ada. Teks dalam `text` dihantar ke laman tanpa parafrasa. Build menjalankan `scripts/generate-owner-prompts.mjs` dan menulis semula `public/data.json` daripada fail-fail ini sambil mengekalkan susunan ID asal, dan turut menyusun `public/curated-prompts.json` daripada fail prompt di akar folder.

**Perhatian:** Prompt yang mempunyai override editor terbitan D1 mungkin masih mengambil keutamaan; fungsi `/api/prompts` menggunakan jadual D1 yang berasingan. Ini bermakna perubahan folder tidak semestinya mengubah salinan rekod D1 API. Semak paparan sebenar sebelum menandakan terbitan berjaya.

## Versi asal neon pink

- `lib/home.ts`: struktur HTML playground neon asal.
- `public/styles.css`: pink `#ff0099`, purple `#7000ff`, acid `#ccff00` dan animasi marquee/float/wobble.
- Laman utama `/` dipulihkan kepada neon asal dalam branch ini. Susunan editorial masih boleh dilihat menggunakan `/?editorial=1`.
- Laman belajar/projek terus mengekalkan laluan asal.

## Bahan belum lengkap

Audit terdahulu menunjukkan `15000+ Prompt Collection x Artscipes Hub.xlsx` mengandungi 15,032 baris prompt tidak kosong. Fail sumber tersebut tidak dijumpai untuk pengimportan menyeluruh dalam sesi ini. Jangan cipta rekod IMPORT15 berdasarkan ringkasan audit sahaja. Workbook `prompt aicheat code.xlsx` wujud sebagai fail berasingan; 149 rekod daripadanya sudah tercatat dalam data V5.

**Jangan terbitkan sumber promt pihak ketiga ke website awam tanpa menyemak hak dan atribusi.** GitHub repositori ini terbuka kepada umum.
