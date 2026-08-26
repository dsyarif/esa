# ESA — E-Kinerja Screenshot Assistant

Tool ringan berbasis browser untuk menyiapkan bukti dukung e-Kinerja: ambil screenshot, beri nomor & jam kegiatan otomatis, kompres di bawah 500 KB, dan simpan langsung ke folder pilihan tanpa dialog berulang.

Dibangun sebagai **single-file HTML** — tidak perlu instalasi, tidak perlu server, dan seluruh proses (kompresi gambar, penamaan file) berjalan langsung di browser pengguna. Tidak ada data yang diunggah ke server mana pun.

## Fitur

- **Ambil bukti dengan 3 cara** — tempel dari clipboard (Ctrl+V), upload file, atau ambil langsung dari layar (Screen Capture API)
- **Kompresi otomatis di bawah 500 KB** — kualitas gambar diturunkan bertahap, dan resolusi dikecilkan jika masih diperlukan
- **Penomoran dinamis per tanggal** — nomor urut (`25.1`, `25.2`, dst) dihitung otomatis dari nomor tertinggi di folder unduhan aktif + sesi berjalan, sehingga tetap aman meski ada kegiatan yang belum sempat di-screenshot; nomor tetap bisa diedit manual per item
- **Jam mulai & selesai per kegiatan** — input jam/menit terpisah (format 24 jam, tanpa AM/PM) untuk tiap bukti
- **Folder unduhan tanpa dialog berulang** — sekali atur folder tujuan (File System Access API), semua unduhan berikutnya langsung tersimpan ke situ; folder yang dipilih diingat otomatis lewat IndexedDB walau halaman di-refresh
- **Daftar isi folder real-time** — tabel berisi No. | Jam Mulai | Jam Selesai | Judul Kegiatan | Ekstensi, lengkap dengan tombol salin per kolom untuk mempercepat pengisian form e-Kinerja
- **Export ke Excel** — daftar bukti dukung di folder bisa diekspor jadi file `.xlsx` satu klik
- **Deteksi bentrok nomor** — sistem memperingatkan (bukan menimpa diam-diam) jika nomor yang dipakai sudah ada di folder

## Cara Pakai

1. Buka `esa.html` di browser (Chrome/Edge disarankan untuk fitur lengkap)
2. Pilih **tanggal kegiatan** — nomor urut berikutnya otomatis tersarankan
3. *(Opsional tapi disarankan)* Klik **Atur Folder Unduhan** dan pilih folder tujuan — sekali saja, akan diingat untuk sesi berikutnya
4. Ambil bukti lewat **Tempel (Ctrl+V)**, **Upload File**, atau **Ambil dari Layar**
5. Isi **jam mulai**, **jam selesai**, dan **judul kegiatan** pada tiap kartu bukti
6. Klik **Unduh** per item atau **Unduh Semua**
7. Cek tabel **Isi Folder** untuk memantau bukti yang sudah tersimpan, dan gunakan tombol **Export Excel** saat siap mengisi e-Kinerja

## Format Nama File

```
{tanggal}.{nomor urut} · {jam mulai}-{jam selesai} · {judul kegiatan}.jpg
```

Contoh: `25.2 · 08.00-09.30 · Rapat Koordinasi Renja.jpg`

## Kompatibilitas Browser

| Fitur | Chrome / Edge | Firefox / Safari |
|---|---|---|
| Tempel, Upload, Kompresi | ✅ | ✅ |
| Ambil dari Layar (Screen Capture) | ✅ | ⚠️ tergantung versi |
| Folder unduhan tanpa dialog (File System Access API) | ✅ | ❌ fallback ke unduhan biasa |
| Folder tersimpan otomatis antar-sesi | ✅ | ❌ |

Di browser tanpa dukungan File System Access API, ESA tetap berfungsi penuh — unduhan otomatis dibundel jadi satu file ZIP agar tidak memicu banyak dialog "Simpan Sebagai".

## Teknologi

- Vanilla HTML/CSS/JavaScript — tanpa framework, tanpa build step
- [JSZip](https://stuk.github.io/jszip/) — pembuatan arsip ZIP untuk unduhan massal
- [SheetJS (xlsx)](https://sheetjs.com/) — export data ke Excel
- File System Access API, Screen Capture API, Clipboard API, IndexedDB — API bawaan browser

## Deployment

Karena berupa file HTML tunggal, ESA bisa langsung dijalankan lokal (buka file di browser) atau di-deploy ke hosting statis:

- **Netlify** — drag-and-drop `esa.html` ke [app.netlify.com/drop](https://app.netlify.com/drop)
- **Vercel** — `vercel deploy` di folder yang berisi `esa.html`
- **GitHub Pages** — aktifkan Pages dari branch ini

## Privasi

Semua pemrosesan (kompresi gambar, penamaan file, penulisan ke folder) terjadi sepenuhnya di browser pengguna. ESA tidak mengirim data, gambar, atau nama file ke server eksternal mana pun.

## Lisensi

Bebas digunakan dan dimodifikasi untuk keperluan internal instansi.
