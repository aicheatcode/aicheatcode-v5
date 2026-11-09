# QA_REPORT — AICHEATCODE Perpustakaan Digital Tingkatan 1

**Tarikh:** 9 November 2026  
**Jalur kerja:** `import/v5-base64-20261103`  
**CI:** [AICHEATCODE Digital Library QA — run 42600599404](https://github.com/aicheatcode/aicheatcode-v5/actions/runs/42600599404)  
**Keputusan CI:** SUCCESS. Ujian berjalan di GitHub Actions.

## Penemuan dan tindakan

| Komponen | Risiko asal | Pembaikan | Status |
|---|---|---|---|
| Data | PDF ASK berganda | 11 ID koleksi unik, bukannya 12 | PASS |
| Kandungan | Nota dan kuiz generik | 4 nota dan 5 fakta objektif per koleksi | PASS pengesahan struktur; semakan pedagogi guru belum dibuat |
| Carian | Sukar mencari subjek | Carian teks + tapisan kategori | PASS simulasi |
| Kad imbasan | Tiada interaksi | Soalan/jawapan dengan navigasi | PASS render simulasi |
| Kuiz | Markah boleh salah/tidak direkod | Jawapan lengkap diwajibkan, semak betul/salah, simpan skor | PASS 11 ujian skor |
| Kemajuan | Rekod hilang bila pindah halaman | localStorage + paparan skor terbaik | PASS simulasi |
| Prompt | Prompt sama untuk semua | 4 prompt berparameter tajuk/topik per subjek | PASS render |
| PDF | Lampiran ChatGPT bukan URL awam | Pautan KPM + muat masuk PDF ke IndexedDB | KOD SIAP; belum diuji pada pelayar sebenar |
| Hak cipta | Risiko menyiarkan semula buku | Tiada PDF pihak ketiga diedarkan dalam repositori | PASS kawalan kandungan |
| Responsif | Risiko teks kecil/overlap | CSS grid mobile, focus outline, prefers-reduced-motion | Kod hadir; visual browser NOT TESTED |
| Deploy | V5 branch tidak automatik deploy melalui CI utama | Workflow QA khas ditambah | QA SUCCESS; deploy produksi NOT VERIFIED |
| Google Sites | iframe mungkin sekat storan | Panduan buka tab penuh sebagai sandaran | NOT TESTED |

## Ujian yang dilaksanakan

- Sintaks `content.js` dan `app.js`: sah.
- Koleksi: 11, semua ID unik.
- Bank soalan: 55, lima soalan bagi setiap koleksi.
- Setiap soalan: empat pilihan berbeza dan satu jawapan.
- 55 paparan subjek (11 × 5 tab) dan 4 laluan lain = **59 paparan simulasi**.
- Pengiraan skor sempurna **5/5** untuk semua 11 kuiz.
- Kuiz yang tidak lengkap tidak diberi skor.
- Carian mengikut teks mengembalikan subjek berkaitan.
- GitHub Actions menjalankan ujian Node.js tanpa npm dan selesai dengan keputusan SUCCESS.

## Had yang masih perlu disahkan

1. **PDF sebenar:** Buka, muat turun, simpan semula dan buang fail pada Safari iOS, Chrome Android dan desktop. IndexedDB boleh terhad dalam iframe/mod persendirian.
2. **Sumber rasmi:** KPM menetapkan capaian DELIMa; 401/permission denied tidak boleh dibetulkan melalui HTML semata-mata.
3. **Ujian pedagogi:** Guru perlu menyemak soalan, istilah agama dan ketepatan DLP sebelum kegunaan rasmi.
4. **Aksesibiliti:** Kontras, aliran pembaca skrin dan penggunaan papan kekunci sebenar belum diuji dengan perisian bantuan.
5. **Produksi:** Build V5, hosting sebenar, Google Sites embed dan penyebaran awam PDF belum disahkan. CI ujian modul bukan bukti live deployment.

## Keputusan

**PASS untuk ujian unit dan simulasi automatik.**

**BELUM DIPASTIKAN untuk prestasi browser, hosting produksi, integrasi Google Sites dan pemindahan fail buku teks kepada semua pengguna.**

Jangan melabelkan aplikasi sebagai siap produksi sebelum ujian langsung pada peranti sasaran dan pengesahan hak edaran PDF.
