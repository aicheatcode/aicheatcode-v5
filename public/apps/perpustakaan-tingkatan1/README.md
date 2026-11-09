# AICHEATCODE — Perpustakaan Digital Tingkatan 1

Aplikasi web responsif tanpa npm, terminal, akaun pengguna, API key atau server sendiri.

## Kandungan

11 koleksi unik daripada tajuk PDF yang dibekalkan (Asas Sains Komputer dimuat naik dua kali dan disatukan). Termasuk Bahasa Melayu, Matematik, Science (DLP), Sejarah, Asas Sains Komputer, Pendidikan Islam, Pendidikan Moral, PJPK, Pendidikan Seni Visual, Pendidikan Muzik dan modul keselamatan jalan raya *Waspada Budaya Kita*.

Setiap koleksi mempunyai:
- Pautan rujukan buku teks rasmi KPM (kebanyakan memerlukan akses DELIMa).
- Pemilih PDF peribadi, pembaca PDF dalam aplikasi, muat turun PDF tersimpan dan pilihan buang fail setempat.
- Empat nota ringkas konsep.
- Lima kad imbasan dengan muka soalan/jawapan.
- Kuiz lima soalan dengan semakan automatik, pembetulan dan skor terbaik.
- Empat prompt pembelajaran mengikut subjek.
- Simpan kegemaran, carian topik, tapisan dan rekod kemajuan setempat.

**Penting:** Fail PDF yang dilampirkan kepada perbualan ChatGPT tidak disiarkan secara automatik sebagai fail awam. Versi ini tidak memasukkan salinan PDF buku teks ke dalam repositori kerana hak cipta penerbit. Pengguna boleh membuka pautan KPM dengan kelayakan yang berkenaan atau memilih PDF yang telah dimiliki secara sah pada peranti sendiri.

## Fail yang boleh disunting

| Fail | Fungsi |
|---|---|
| `index.html` | HTML halaman dan navigasi |
| `style.css` | Reka bentuk responsif AICHEATCODE |
| `content.js` | Tajuk subjek, nota, soalan, pautan sumber dan topik |
| `app.js` | Fungsi carian, kad, kuiz, prompt, PDF, kemajuan dan storan |

Semua fail berada dalam `public/apps/perpustakaan-tingkatan1/`.

## Penerbitan paling mudah tanpa terminal

1. Muat turun repositori dalam format ZIP dari GitHub dan ekstrak.
2. Cari folder `public/apps/perpustakaan-tingkatan1`. Folder inilah yang perlu diterbitkan, bukan seluruh aplikasi AICHEATCODE V5.
3. Gunakan Netlify Drop dengan menyeret folder tersebut. Empat fail utama mesti kekal dalam direktori yang sama.
4. Setelah mendapat pautan HTTPS yang berfungsi, buka Google Sites → **Insert / Sisip** → **Embed / Benam** → **By URL / Melalui URL**, dan masukkan pautan laman yang telah diterbitkan.
5. Semak pembaca PDF, fungsi salin prompt dan rekod skor pada iPhone/Android. Pelayar dalam iframe mungkin menyekat storan setempat; jika berlaku, buka aplikasi pada tab penuh.

Penggunaan di Google Sites bukan bukti bahawa PDF buku teks disediakan secara awam. Pautan KPM tertakluk kepada kebenaran pemilik fail.

## Keselamatan dan data

- Skor dan kegemaran menggunakan `localStorage`.
- PDF peribadi menggunakan `IndexedDB`; aplikasi tidak menghantarnya ke pelayan.
- Tiada pengguna, login, analitik luaran, database berpusat atau AI API.
- Fail PDF dihadkan kepada 100 MB dan disemak awalan fail `%PDF-` sebelum dipaparkan.
- Penutupan browser atau pembersihan data laman mungkin memadam skor dan PDF.
- Sebelum menyiarkan kandungan buku teks kepada orang awam, dapatkan kebenaran penggunaan yang sesuai daripada penerbit.

## Ujian

Workflow **AICHEATCODE Digital Library QA** menjalankan `node scripts/test-edu-library.mjs` pada setiap perubahan yang berkaitan. Ujian meliputi pengesahan data, sintaks JavaScript, 59 render laluan secara simulasi DOM, dan 11 pengiraan skor penuh.

Ujian browser sebenar/visual, storan IndexedDB pada pelayar sebenar, respons Google Drive terhadap DELIMa dan penyepaduan Google Sites **belum disahkan oleh workflow**. Lihat `QA_REPORT.md` untuk status terperinci.

## Rujukan rasmi

- [Buku Teks Digital Tingkatan 1 — KPM](https://sites.google.com/moe-dl.edu.my/bukuteksdigitalkpm/tingkatan-1)
- [Makluman hak cipta dan akses DELIMa](https://sites.google.com/moe-dl.edu.my/bukuteksdigitalkpm/info-laman)

© AICHEATCODE / ARTSCIPES HUB. Latihan dan prompt contoh ialah kandungan editorial asal; tidak didakwa sebagai kandungan ujian rasmi KPM.
