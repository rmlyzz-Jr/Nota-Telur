# Nota RPU – PT Rafasya Putra Ustanto

Aplikasi web (PWA) yang bisa diinstal di HP/laptop. Isinya membuka web app
Google Apps Script "Aplikasi Cetak Nota Telur".

## Cara pasang di GitHub Pages
1. Buat repository baru di GitHub (mis. `nota-rpu`), Public.
2. Upload semua isi folder ini (index.html, sw.js, manifest.webmanifest, folder icons).
3. Settings → Pages → Source: `Deploy from a branch` → Branch `main` / folder `/ (root)` → Save.
4. Tunggu 1–2 menit, buka `https://USERNAME.github.io/nota-rpu/`.

## Cara instal
- **Android (Chrome):** menu ⋮ → *Instal aplikasi* / *Tambahkan ke layar utama*.
- **iPhone (Safari):** Bagikan → *Tambah ke Layar Utama*.
- **Laptop (Chrome/Edge):** ikon instal di sebelah kanan address bar.

## Ganti URL Apps Script
Cari `script.google.com/macros/s/...` di `index.html` (2 tempat) dan ganti.
Setiap kali deploy ulang Apps Script dengan "New deployment", URL berubah;
kalau memakai "Manage deployments → Edit → New version", URL tetap.
