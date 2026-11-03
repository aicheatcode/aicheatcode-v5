# AICHEATCODE — Prompt Playground

Laman Neo-Brutalist berbahasa Melayu dengan halaman utama, pustaka, pembina templat, galeri visual CSS, tambah prompt, panduan dan peta laman 38 topik.

## Kandungan

`dist/data.json` mengandungi 1,070 rekod daripada AICHEATCODE_Excel_Panduan_Kandungan_Utama(1).xlsx. Teks asal dipadankan mengikut ID AUDIT dan disahkan sama bagi semua rekod. 14 kategori mempunyai rekod. Fail menyenaraikan 54 jenis, dengan 47 jenis mempunyai wakil.

Peta halaman sahaja mengikuti struktur sitemap yang diberikan pengguna. Penjenamaan, penjelasan halaman, panduan dan reka bentuk ialah versi AICHEATCODE. Laman tidak mengambil kandungan atau menyambung API PromptHub.

## Fungsi

- Carian kata kunci/ID, penapis kategori/jenis/status, susunan dan pagination 12 rekod.
- Butiran teks asal, pengisian placeholder, metadata hook/solusi/CTA dan sumber.
- Salin ke clipboard dan muat turun teks.
- Bookmark dan prompt pengguna dalam localStorage; eksport JSON.
- Pembina arahan berasaskan templat dengan input wajib.
- Menu responsif, FAQ papan kekunci, dialog dan pilihan kurangkan gerakan.

## Batasan

Pembina tidak menjalankan model AI. Tiada backend komuniti, akaun aplikasi, penyegerakan koleksi atau pengiriman borang. Galeri ialah kajian komposisi CSS. Prompt mempunyai status ujian asal dan sumber bercampur; tiada dakwaan keberkesanan model atau lesen pengedaran semula dibuat. Penerbitan dimulakan sebagai owner-private.

## Pratonton

Gunakan `sites-preview start /workspace/sites/aicheatcode-prompt-playground-1024` pada persekitaran managed. Aset statik berada dalam `dist/` dan tidak memerlukan pemasangan kebergantungan.

Fon Space Grotesk dan DM Sans disajikan setempat; lesen SIL OFL disertakan dalam `dist/fonts/`.

## Owner editing studio

Open `/admin.html`. Authentication uses Sites-provided server identity headers with an owner email allowlist. Content edits and homepage design settings persist in D1. Each write verifies same-origin, validates payloads, and requires the current revision to avoid overwriting another session.

The original dataset remains immutable in `public/data.json`; the server merges published overrides and deletion markers. Drafts keep the last published version visible. Design supports homepage hero text/image, five theme colours, heading font, and section visibility/order. Personal bookmarks remain browser-local.

Run `node scripts/test-editor.mjs`. Browser integration fixtures are retained under `tests/browser` and are never published.


### Imported 100,000-prompt CSV

`public/prompt-catalog.json` is a lossless, dictionary-encoded representation of the uploaded CSV. `public/catalog.js` searches compact row references and materializes only a visible page. The original CSV is not shipped to browsers. Existing matching prompts retain their original IDs and source metadata; `csvType`, context and mode remain available for filtering. Admin publications and deletions continue to use the existing D1 editor state.

Reimport using `python scripts/import-prompt-catalog.py /absolute/path/to/AICHEATCODE_100000_Prompt.csv`. The importer rejects missing or duplicate text, verifies all reconstructions, and records the source hash and counts in `qa/catalog-import.json`. Run `node scripts/test-editor.mjs` and `node scripts/test-catalog.mjs` before the normal Sites build. Model effectiveness is NOT TESTED; the CSV is user-supplied and is not attributed to official AI developers.
