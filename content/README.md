# Edit website AICHEATCODE tanpa AI

**Folder kandungan:** `content/pages/`

Setiap fail Markdown mewakili SATU halaman website:

| Fail | Halaman |
| --- | --- |
| `home.md` | `/` |
| `belajar.md` | `/belajar` |
| `projek.md` | `/projek` |
| `tentang.md` | `/tentang` |
| `belajar/prompt-pertama.md` | `/belajar/prompt-pertama` |
| `belajar/poster-jelas.md` | `/belajar/poster-jelas` |
| `belajar/brief-visual.md` | `/belajar/brief-visual` |
| `belajar/semakan-jenama.md` | `/belajar/semakan-jenama` |

### Edit sendiri

1. Buka [folder kandungan](https://github.com/tipgrandma/aicheatcode-v5/tree/main/content/pages).
2. Pilih fail halaman.
3. Klik ikon pensel **Edit this file**, tukar teks seperti dalam dokumen biasa.
4. Klik **Commit changes**. GitHub Actions akan menjana dan menerbitkan semula Worker secara automatik melalui pipeline sedia ada. Semak keputusan CI dan deployment sebelum menganggap kemas kini live.

Tidak perlu ChatGPT, kemahiran coding, aplikasi desktop atau memasukkan password website dalam fail.

### Susun atur fail

```md
# TAJUK HALAMAN
> Penerangan SEO ringkas

Teks pengenalan halaman.

## Seksyen kedua

Tulis perenggan atau arahan tambahan.

![Keterangan gambar](https://example.com/gambar.webp)

[Teks pautan](/belajar)
```

- `# ` tajuk utama.
- `> ` penerangan SEO.
- `## ` seksyen baharu.
- `![alt](https://...)` tambah gambar.
- `[teks](/laluan)` tambah butang pautan.
- HTML mentah tidak diproses demi keselamatan.
- Fail di bawah `content/pages/belajar/` membentuk tutorial, `content/pages/projek/` membentuk halaman projek. Laluan baharu hanya dibenarkan untuk struktur `/belajar/<slug>` dan `/projek/<slug>`.
- `/prompt` dan alat interaktif terus menggunakan fungsi sedia ada, bukan halaman Markdown.
- Jika terdapat versi yang sudah diterbitkan dalam D1 CMS untuk halaman yang sama, versi D1 mempunyai keutamaan sehingga dinyahterbit. Folder Markdown adalah fallback yang boleh dikemas kini bebas.
- Branch `main` dideploy ke Worker yang dikonfigurasi, **bukan bukti DNS `cannybrainy.com` sudah dipautkan ke Worker**.
- Jangan padam data pengguna atau fail utama sebelum sandaran.

