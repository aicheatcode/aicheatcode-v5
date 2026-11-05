# Folder prompt milik anda

Satu fail JSON = satu prompt. Fail contoh sebenar: `USER-IA-001.json` (dipindahkan daripada `public/curated-prompts.json` tanpa mengubah teks prompt).

## Cara edit sendiri
1. Buka folder `content/prompts/` di GitHub.
2. Klik fail prompt → ikon pensel → ubah **title, category, text** dan medan yang diperlukan. **Jangan ubah ID** untuk prompt yang sudah digunakan.
3. Klik **Commit changes**. Pipeline membina semula `public/curated-prompts.json` dan menghantar perubahan kepada Worker selepas ujian lulus.
4. Untuk prompt baharu, buat fail `USER-<ID-UNIK>.json`, salin struktur contoh dan isi teks sebenar, bukan data rekaan.

Semua rekod prompt asal dalam pangkalan data D1 dikekalkan. Folder ini menyimpan **prompt tambahan pemilik** sahaja; ia tidak secara automatik menukar semua 1,071 prompt D1 atau 100,570 rekod carian yang dijana daripada katalog.

**Nota penting:** Perubahan melalui folder akan menggantikan kandungan prompt yang sama dalam fail terjana, tetapi jika CMS Editor mempunyai override bagi ID yang sama, override terbitan D1 mempunyai keutamaan. Domain `cannybrainy.com` hanya memaparkan perubahan jika routing DNS menunjuk ke Worker V5.

Tiada AI diperlukan untuk edit fail. Ini fail GitHub, bukan lagi editor visual di domain utama.
