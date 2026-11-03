# QA — 25 Oktober 2026

Ujian browser Chrome melalui pratonton tempatan. Responsif diperiksa pada viewport iframe 390 × 844 serta paparan desktop. Tiada dakwaan production-ready atau ujian semua pelayar dibuat.

| Pemeriksaan | Status | Bukti |
| --- | --- | --- |
| Sintaks JavaScript | PASS | `node --check dist/app.js` |
| Integriti sumber | PASS | Semua 1,070 teks sepadan tepat dengan tab PROMPT ASAL. ID unik; tiada teks kosong atau metadata tidak sepadan. |
| Kategori / jenis | PASS | Jumlah kategori 1,070; 14 kategori; 47 jenis mempunyai rekod daripada 54 jenis sumber. |
| Carian ID | PASS | MA-120714 memaparkan 1 kad. |
| Tiada padanan | PASS | Input unik memaparkan 0 hasil dan panduan pemulihan. |
| Penapis kategori | PASS | E-dagang & Marketplace memaparkan 10 rekod. |
| Pagination | PASS | Seterusnya menukar halaman kepada 2 / 90. |
| Clipboard | PASS | Teks salinan MA-120714 sepadan dengan teks asal. |
| Adaptasi placeholder | PASS | Nama jenama diganti dalam adaptasi; teks asal masih mengandungi placeholder. |
| Input pembina wajib | PASS | 3 medan tidak sah menghalang hasil dan butang salinan kekal tidak aktif. |
| Pembina templat | PASS | Preset pembelajaran menghasilkan peranan, tugas, konteks, audiens, format dan semakan. |
| Koleksi selepas reload | PASS | Bookmark masih hadir selepas muat semula. |
| Tambah prompt | PASS | Borang menambah prompt peribadi selepas kotak pengesahan ditanda. |
| Pengendalian teks HTML | PASS | Teks `<b>` dipaparkan sebagai teks literal; tiada elemen `b` disuntik. |
| Eksport koleksi | PASS | Muat turun JSON sah mengandungi 2 rekod ujian; teks asal sepadan. |
| Menu telefon | PASS | Menu dipaparkan pada 390px dan navigasi pustaka berfungsi. |
| Penapis telefon | PASS | Panel penapis dibuka melalui butang. |
| Lebar telefon | PASS | Kandungan halaman utama/pustaka tidak melebihi viewport 390px. |
| FAQ papan kekunci | PASS | Enter membuka jawapan. |
| Peta laman / topik | PASS | Navigasi peta laman ke sains memaparkan 66 padanan sebenar. |
| Keberkesanan prompt model AI | NOT TESTED | Model tidak dijalankan dalam tugasan ini; status sumber dikekalkan. |

Pembaikan daripada ujian: ID prompt peribadi menggunakan fallback `crypto.getRandomValues` apabila randomUUID tidak tersedia pada origin pratonton HTTP. Kotak pengesahan menggunakan kawalan native. Paparan senarai mengehadkan petikan; dialog mengekalkan teks penuh.

## Editable owner studio — 27 October 2026

PASS: source inventory 1,070 prompts retained; unit validation for drafts, previous publication, create/delete, dynamic category counts, HTTPS image URLs, colour and section order.
PASS: browser UI creates a draft in local D1, saves design, shows the changed heading in a 375px preview and reloads from server.
PASS: local API integration via browser test harness: unauthorized GET/PUT return 403; persistence readback; stale revision returns 409; draft excluded; publication included; deletion excluded; previous state restored.
PASS: anonymous admin hides all editing controls.
Test identity headers used only in local browser fixtures under tests/browser; no fixtures shipped in public assets. Local and hosted databases are separate. Local QA data is not deployed.
NOT TESTED at packaging: production owner sign-in; arbitrary device/browser matrix; external image availability.
Known boundaries: controlled homepage design editor (not a free-form page builder); hero image via HTTPS URL; 900 KB total override state guard; personal visitor bookmarks remain per-device.


## Import CSV — 2 November 2026

| Pemeriksaan | Status | Bukti |
| --- | --- | --- |
| CSV lengkap | PASS | 100,000 rekod, 100,000 teks unik, tiada teks kosong; SHA-256 sumber direkod dalam qa/catalog-import.json. |
| Teks asal | PASS | Python membandingkan semua teks aksara demi aksara. Rekonstruksi JavaScript bagi kesemua 100,000 teks turut sepadan dengan hash CSV asal. |
| Pendua & keserasian | PASS | 500 padanan tepat mengekalkan ID lama. 99,500 tambahan + 1,070 asal = 100,570 prompt unik. Teks dan ID lama tidak diubah. |
| Saiz katalog tambahan | PASS | 141,188 bait; baris teks berulang disimpan sekali. Hanya 12 objek prompt dibina untuk halaman keputusan; CSV 170 MB tidak dimuat turun oleh pelawat. |
| Carian & penapis | PASS | Ujian Node: ID rekod terakhir, kata kunci berbilang, kategori, subkategori, konteks, mod, status dan keadaan kosong. Browser: CSV-100000 memaparkan satu prompt; konteks Food business + Audit and repair menghasilkan 500, bersama kategori reka bentuk menghasilkan 100. |
| Pagination | PASS | Browser menunjukkan halaman 2 / 9 dan 12 kad pada gabungan penapis 100 rekod. Halaman terakhir dan had halaman turut diuji pada Node. |
| Salinan | PASS | Clipboard browser sepadan dengan 1,712 aksara teks penuh CSV-100000. |
| Bookmark | PASS | CSV-100000 muncul dalam koleksi selepas muat semula. |
| Studio pemilik | PASS | Fixture identiti tempatan memaparkan dan membuka CSV-100000; nilai textarea sama tepat dengan teks awam. Unit menguji suntingan, draf, terbitan dan pemadaman import. |
| Kawalan akses studio | PASS | Browser tanpa identiti pemilik menyembunyikan workspace dan memaparkan mesej log masuk. Peraturan akses sedia ada dikekalkan. |
| Telefon | PASS | Iframe 390 × 844 (375px ruang kandungan selepas scrollbar): scrollWidth = clientWidth = 375. Butang penapis dan pilihan konteks/mod berfungsi; visual diperiksa. |
| Binaan | PASS | Binaan Vinext selesai; semakan sintaks aplikasi, katalog dan admin serta ujian editor sedia ada lulus. Fixture dan identiti QA tempatan dikeluarkan daripada public sebelum pakej penerbitan. |
| Keberkesanan prompt pada model AI | NOT TESTED | Tugasan ini mengimport data dan menguji website; tiada dakwaan semua prompt telah diuji pada model AI. |
| Atribusi rasmi pembangun AI | NOT VERIFIED | CSV tiada URL sumber rasmi; rekod import dilabel CSV pengguna. |
| Log masuk pemilik pada produksi | NOT TESTED | Ujian owner menggunakan identiti fixture pada pratonton tempatan, bukan sesi pengesahan produksi. |

Katalog statik baca sahaja bekerjasama dengan suntingan D1 sedia ada. Override terbit menggantikan rekod import berdasarkan ID; draf dan pemadaman menghormati peraturan penerbitan lama. Tiada migrasi atau penulisan ke pangkalan data produksi diperlukan.
