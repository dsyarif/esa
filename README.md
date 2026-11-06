# ESA — E-Kinerja Screenshot Assistant

Tool ringan berbasis browser untuk menyiapkan bukti dukung e-Kinerja: ambil screenshot, beri nomor & jam kegiatan otomatis, kompres di bawah 500 KB, dan simpan langsung ke folder pilihan tanpa dialog berulang.

Dibangun sebagai **single-file HTML** — tidak perlu instalasi, tidak perlu server, dan seluruh proses (kompresi gambar, penamaan file) berjalan langsung di browser pengguna. ESA tidak punya server sendiri: berkas hanya disimpan di lokasi yang dipilih pengguna (folder lokal, atau akun Google Drive / OneDrive milik pengguna sendiri).

## Fitur

- **Ambil bukti dengan 3 cara** — tempel dari clipboard (Ctrl+V), upload file, atau ambil langsung dari layar (Screen Capture API)
- **Kompresi otomatis di bawah 500 KB** — kualitas gambar diturunkan bertahap, dan resolusi dikecilkan jika masih diperlukan
- **Penomoran dinamis per tanggal** — nomor urut (`25.1`, `25.2`, dst) dihitung otomatis dari nomor tertinggi di folder unduhan aktif + sesi berjalan, sehingga tetap aman meski ada kegiatan yang belum sempat di-screenshot; nomor tetap bisa diedit manual per item
- **Jam mulai & selesai per kegiatan** — input jam/menit terpisah (format 24 jam, tanpa AM/PM) untuk tiap bukti
- **Folder unduhan tanpa dialog berulang** — sekali atur folder tujuan (File System Access API), semua unduhan berikutnya langsung tersimpan ke situ; folder yang dipilih diingat otomatis lewat IndexedDB walau halaman di-refresh
- **Tiga pilihan lokasi penyimpanan** — **Drive Lokal** (folder di komputer), **Google Drive**, atau **OneDrive**; tab dipilih langsung di panel *Lokasi Unduhan*. Tabel isi folder, edit, hapus, filter, dan export Excel bekerja sama di ketiganya (lihat bagian *Menyimpan ke Google Drive / OneDrive*)
- **Pratinjau & perbesar gambar** — thumbnail di tabel isi folder; klik thumbnail atau tombol 🔍 untuk melihat gambar besar, geser dengan tombol ‹ › atau panah keyboard (mengikuti filter tanggal), tutup dengan Esc. Pratinjau yang sama tersedia untuk bukti di daftar sebelum disimpan
- **Sensor area sensitif (blur / pixel / blok hitam)** — tombol 🛡️ pada tiap bukti (dan pada baris file di tabel folder) membuka editor: seret mouse atau jari untuk menandai area (NIK, nama, nomor rekening, dll.), pilih jenis sensor, lalu *Terapkan*. Mendukung urungkan (Ctrl+Z), hapus semua, dan *Kembalikan asli* untuk bukti yang belum disimpan. Piksel di area itu benar-benar diganti sebelum gambar dikodekan ulang menjadi JPEG, sehingga isi aslinya tidak bisa dipulihkan dari berkas hasil. Blok hitam paling aman untuk teks kecil; blur dan pixel pada area lebar kadang masih bisa ditebak
- **Halaman panduan penggunaan** — tautan **📖 Panduan penggunaan** di header membuka tata cara pemakaian langkah demi langkah (persiapan, alur harian, kelola berkas, masalah umum, pintasan keyboard). Halaman ini bagian dari berkas yang sama dan bisa dibuka langsung lewat alamat `.../#panduan`, jadi mudah dibagikan ke rekan kerja. Tombol **🖨️ Cetak / simpan PDF** menghasilkan dokumen siap cetak (±7 halaman A4) untuk dijadikan SOP atau lampiran usulan inovasi
- **Daftar isi folder real-time** — tabel berisi No. | Jam Mulai | Jam Selesai | Judul Kegiatan | Ekstensi, lengkap dengan tombol salin per kolom untuk mempercepat pengisian form e-Kinerja
- **Poin kegiatan** — durasi dikonversi otomatis ke poin (60 menit = 1 poin, 90 menit = 1,5 poin) per bukti dan total; konstanta `MENIT_PER_POIN` mudah diubah bila konversinya berbeda
- **Export ke Excel** — daftar bukti dukung di folder bisa diekspor jadi file `.xlsx` satu klik
- **Counter akses** — menampilkan berapa kali ESA dibuka di perangkat ini (tersimpan di IndexedDB); opsional bisa diaktifkan counter pusat lintas pengguna (total akses, akses hari ini, pengguna unik) lewat Google Apps Script
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
{tanggal}.{nomor urut} - {jam mulai}-{jam selesai} - {judul kegiatan}.jpg
```

Contoh: `25.2 - 08.00-09.30 - Rapat Koordinasi Renja.jpg`

## Kompatibilitas Browser

| Fitur | Chrome / Edge | Firefox / Safari |
|---|---|---|
| Tempel, Upload, Kompresi | ✅ | ✅ |
| Ambil dari Layar (Screen Capture) | ✅ | ⚠️ tergantung versi |
| Folder unduhan tanpa dialog (File System Access API) | ✅ | ❌ fallback ke unduhan biasa |
| Folder tersimpan otomatis antar-sesi | ✅ | ❌ |
| Google Drive / OneDrive (butuh Client ID) | ✅ | ✅ |

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

## Menyimpan ke Google Drive / OneDrive

Cara paling sederhana **tidak butuh pengaturan apa pun**: pakai tab **Drive Lokal** dan pilih folder yang berada di dalam *Google Drive for desktop* atau *OneDrive* yang sudah tersinkron di komputer. File otomatis ikut ter-upload oleh aplikasi sinkronisasi tersebut.

Untuk menyimpan **langsung ke cloud tanpa aplikasi sinkronisasi**, ESA memakai API resmi masing-masing layanan. Itu mengharuskan pemilik aplikasi mendaftarkan *Client ID* (gratis, sekali saja), lalu mengisinya di `esa.html`:

```js
// ganti string kosong '' di akhir baris dengan Client ID dari langkah di bawah
const GOOGLE_CLIENT_ID = ESA_CONFIG.googleClientId || '';   // contoh: '1234-abcd.apps.googleusercontent.com'
const MS_CLIENT_ID     = ESA_CONFIG.msClientId     || '';   // contoh: '00000000-0000-0000-0000-000000000000'
```

### Google Drive

1. Buka [Google Cloud Console](https://console.cloud.google.com), buat project, lalu aktifkan **Google Drive API**.
2. **APIs & Services → OAuth consent screen**: isi nama aplikasi, tambahkan scope `.../auth/drive.file`. Untuk pemakaian internal, pilih tipe *Internal* (jika memakai Google Workspace) atau tambahkan akun pengguna sebagai *Test users*.
3. **Credentials → Create credentials → OAuth client ID → Web application**. Pada *Authorized JavaScript origins* isi alamat situs ESA (misalnya `https://nama-proyek.vercel.app`).
4. Salin **Client ID** ke `GOOGLE_CLIENT_ID`, lalu deploy ulang.

Catatan: ESA memakai izin `drive.file`, yaitu hanya bisa melihat dan mengubah berkas **yang dibuatnya sendiri**. Berkas lain di Drive tidak terlihat, dan berkas yang dihapus dari ESA dipindahkan ke **Sampah** (bisa dipulihkan).

### OneDrive

1. Buka [Microsoft Entra admin center](https://entra.microsoft.com) → **App registrations → New registration**. Pilih jenis akun yang sesuai (untuk akun kantor dan pribadi sekaligus, pilih *multitenant and personal Microsoft accounts*).
2. **Authentication → Add a platform → Single-page application**, isi *Redirect URI* dengan alamat halaman ESA **persis** seperti saat dibuka (contoh `https://nama-proyek.vercel.app/` — perhatikan garis miring di akhir; `index.html` dan `/` dianggap berbeda).
3. **API permissions → Microsoft Graph → Delegated → `Files.ReadWrite`**.
4. Salin **Application (client) ID** ke `MS_CLIENT_ID`, lalu deploy ulang.

Login berlangsung lewat jendela popup — izinkan popup untuk situs ESA. Token berlaku sekitar 1 jam dan tidak disimpan; setelah halaman dimuat ulang, klik **Masuk & Aktifkan** untuk melanjutkan.

> **Perhatian untuk akun instansi:** administrator Google Workspace atau Microsoft 365 dapat memblokir aplikasi pihak ketiga atau mewajibkan persetujuan admin. Jika muncul pesan *access blocked* / *need admin approval*, minta persetujuan admin, atau pakai cara sinkronisasi folder di atas.

### Perbedaan dengan Drive Lokal

- Deteksi dan perbaikan file `.jpg` yang isinya PNG hanya tersedia di Drive Lokal. Di cloud, ESA selalu mengunggah JPEG asli sejak awal sehingga masalah itu tidak muncul pada berkas buatan ESA.
- Daftar isi folder cloud hanya menampilkan berkas yang diunggah lewat ESA (Google Drive) atau yang ada di folder yang ditentukan (OneDrive).

## Privasi

Pemrosesan (kompresi gambar, penamaan file) terjadi sepenuhnya di browser pengguna. ESA tidak punya server dan tidak mengirim data ke pihak lain. Pada mode Google Drive / OneDrive, berkas dikirim **langsung dari browser ke akun cloud milik pengguna sendiri** lewat API resmi layanan tersebut, tanpa perantara.

### Counter akses pusat (opsional)

Secara bawaan counter hanya menghitung di browser pengguna sendiri. Untuk melihat akses seluruh pengguna, pilih salah satu backend:

**Opsi A — Vercel + Upstash Redis** (disarankan jika ESA sudah di-deploy di Vercel; satu domain, tanpa masalah CORS)

1. Susun project: `esa.html` diganti nama jadi `index.html`, dan `api/counter.js` ditaruh di folder `api/` pada root project
2. Di Vercel Dashboard → **Storage / Marketplace → Upstash Redis** → buat database lalu hubungkan ke project (variabel `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` terisi otomatis)
3. Set `COUNTER_ENDPOINT = '/api/counter'` di bagian atas script, lalu redeploy

> Fungsi Vercel tidak bisa menyimpan data di file karena filesystem-nya sementara, makanya counter memakai Redis eksternal.

**Opsi B — Google Apps Script + Google Sheet**

1. Buat Google Sheet baru → **Extensions → Apps Script**, tempel isi `counter-apps-script.gs`
2. **Deploy → New deployment → Web app** (Execute as: *Me*, Who has access: *Anyone*)
3. Salin URL `/exec`, lalu isi konstanta `COUNTER_ENDPOINT` di bagian atas script `esa.html`

Kedua opsi hanya menerima waktu akses dan ID anonim acak — tidak ada nama, file, atau isi bukti dukung. Refresh dalam 30 menit tidak dihitung sebagai kunjungan baru. Endpoint tidak memakai autentikasi, jadi angkanya bisa digelembungkan oleh pihak yang sengaja memanggil URL-nya berulang kali; cukup untuk gambaran pemakaian internal, bukan untuk angka yang diaudit.

## Lisensi

Bebas digunakan dan dimodifikasi untuk keperluan internal instansi.
