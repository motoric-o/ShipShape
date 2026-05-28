# Konteks Proyek: Sistem Manajemen Inventaris & Pengadaan Laboratorium

Dokumen ini berfungsi sebagai referensi utama (*source of truth*) mengenai tujuan proyek, arsitektur berbasis peran (Role-Based Access Control), alur kerja (workflows), serta dependensi teknologi yang digunakan. Format ini dirancang agar dapat dibaca dan dipahami secara optimal oleh LLM AI/Antigravity.

---

## 1. Ringkasan & Tujuan Proyek (Project Goals)

Sistem ini dirancang untuk mendigitalisasi, melacak, dan mengotomatisasi seluruh siklus hidup aset di lingkungan laboratorium, mulai dari pengusulan hingga penghapusan.

* **Digitalisasi Aset & BHP:** Migrasi pencatatan manual ke sistem digital untuk barang inventaris (aset tetap) dan Barang Habis Pakai (BHP).
* **Sistem Pengadaan Terintegrasi:** Menyediakan mekanisme pengajuan pengadaan barang inventaris dan BHP secara terstruktur dan transparan.
* **Pelacakan Siklus Hidup (Lifecycle Tracking):** Memantau siklus penuh setiap barang:
  $$\text{Pengadaan (Procurement)} \rightarrow \text{Penerimaan} \rightarrow \text{Registrasi/Labeling} \rightarrow \text{Pemeliharaan (Maintenance)} \rightarrow \text{Penghapusan/Penggantian (Asset Disposal)}$$

---

## 2. Matriks Peran & Tanggung Jawab (RBAC Matrix)

Sistem mengimplementasikan Kontrol Akses Berbasis Peran (Role-Based Access Control) dengan hak akses spesifik sebagai berikut:

### 👤 Administrator
* **Manajemen Pengguna:** Mengelola autentikasi, otorisasi, dan data seluruh pengguna sistem.
* **Manajemen Ruangan:** Mengelola data master ruangan laboratorium tempat aset akan ditempatkan.

### 👤 Kepala Laboratorium
* **Perencanaan Tahunan:** Membuat draf pengadaan barang tahunan (Inventaris & BHP) yang mencakup data:
    * Nama Barang, Harga, Jumlah (Qty), dan Tautan (*Link*) Pembelian.
    * Opsi relasi penggantian aset lama dengan barang baru yang dibeli.
* **Manajemen Draf:** Mengakses riwayat draf pengadaan. Draf yang berstatus `PENDING_REVIEW` bersifat *read-only* (tidak dapat diubah).
* **Tinjau Draf (Read-only):** Melihat rincian draf `PENDING_REVIEW` atau `APPROVED`.
* **Notifikasi (Opsional):** Menerima notifikasi atau melihat status jika draf ditolak atau disetujui.

### 👤 Ketua Program Studi (Kaprodi)
* **Review & Validasi:** Memeriksa draf pengadaan yang diajukan oleh Kepala Laboratorium.
* **Persetujuan Granular:** Menyetujui (`APPROVED`) atau menolak (`REJECTED`) item barang secara spesifik di dalam draf.
* **Finalisasi Kontrak:** Melakukan finalisasi draf pengadaan. Setelah finalisasi, status draf mengunci seluruh perubahan.

### 👤 Staf Administrasi
* **Monitoring Pengadaan:** Melihat daftar draf pengadaan barang yang telah difinalisasi/disetujui oleh Kaprodi.
* **Logistik & Penerimaan:** Melakukan input tanggal penerimaan barang (mendukung skema parsial/penerimaan bertahap).
* **Registrasi Aset:** Melakukan pembaruan data inventaris baru, termasuk penomoran label, unggah foto, dan pembuatan QR Code / Barcode.

### 👤 Staf Laboratorium
* **Manajemen Stok:** Mengelola kuantitas dan opname stok Barang Habis Pakai (BHP).
* **Log & Pemeliharaan:** Mencatat log *maintenance* dan memperbarui kondisi fisik barang inventaris.
* **Alokasi Bahan Terintegrasi:** Jika proses pemeliharaan aset membutuhkan BHP, sistem secara otomatis akan mengurangi stok BHP terkait di dalam pangkalan data.

---

## 3. Alur Kerja Utama (Core Workflows)

### A. Alur Pengadaan & Penerimaan Barang
1. **Kepala Lab** menyusun draf $\rightarrow$ Status draf: `DRAFT`.
2. **Kepala Lab** mengunci draf pengajuan $\rightarrow$ Status draf: `LOCKED`.
3. **Kaprodi** meninjau item per item, memilih setuju/tolak $\rightarrow$ Status draf: `FINALIZED`.
4. **Staf Admin** memantau draf `FINALIZED` $\rightarrow$ Input logistik penerimaan barang secara bertahap $\rightarrow$ Generasi QR/Barcode & pelabelan fisik.

### B. Alur Pemeliharaan Terintegrasi BHP
* **Staf Lab** membuat Log Maintenance $\rightarrow$ Sistem memeriksa konsumsi BHP $\rightarrow$ Sistem otomatis memotong Stok BHP $\rightarrow$ Sistem memperbarui status kondisi fisik barang inventaris.

---

## 4. Ringkasan Dependensi Teknologi (Tech Stack & Dependencies)

Abstraksi dependensi runtime dan development berikut digunakan untuk mempermudah pemahaman arsitektur aplikasi tanpa harus memindai berkas fisik di `node_modules`:

### Runtime Dependencies
* **Core Framework:** `express` (v5.2.1) - Web framework generasi terbaru untuk penanganan routing hulu-hilir Node.js.
* **Database & ORM:**
    * `@prisma/client` (v7.8.0) & `@prisma/adapter-mariadb` (v7.8.0) - ORM untuk interaksi database yang aman (*type-safe*).
    * `mariadb` (v3.5.2) - Driver database native untuk konektivitas MariaDB.
* **Session & Authentication Management:**
    * `express-session` (v1.19.0) - Middleware manajemen session berbasis server.
    * `@quixo3/prisma-session-store` (v3.1.19) - Adapter untuk persistensi data session di database melalui Prisma ORM.
    * `cookie-parser` (v1.4.7) - Parsing cookie untuk session handling pada client-side.
    * `bcryptjs` (v3.0.3) - Algoritma hashing password fungsional untuk aspek keamanan data pengguna.
* **Security Middleware:**
    * `csrf-csrf` (v4.0.3) - Proteksi mitigasi terhadap serangan *Cross-Site Request Forgery* (CSRF) menggunakan token utilitas.
* **UI & Templating Engine:**
    * `pug` (v3.0.4) - Templating engine untuk rendering antarmuka di sisi server (Server-Side Rendering / SSR).
* **Validation & Utilities:**
    * `zod` (v4.4.3) - Deklarasi skema statis untuk validasi data payload HTTP Request secara kuat.
    * `dotenv` (v17.4.2) - Manajemen environment variables konfigurasi (`.env`).
    * `connect-flash` (v0.1.1) - Penyimpanan pesan notifikasi sementara (*flash messages*) antar HTTP session.
    * `method-override` (v3.0.0) - Mendukung HTTP verbs seperti `PUT` atau `DELETE` pada arsitektur form HTML bawaan.

### Development Dependencies
* **ORM CLI:** `prisma` (v7.8.0) - Tooling CLI untuk otomatisasi skema migrasi database dan sinkronisasi model data.
* **Styling Engine:** `tailwindcss` (v4.3.0) & `@tailwindcss/cli` (v4.3.0) - Utility-first CSS framework dengan engine compiler native berkecepatan tinggi.
* **Process Manager:** `nodemon` (v3.1.14) - Otomatisasi restart server pengembangan Node.js saat terjadi perubahan berkas kode.
* **Type Definitions:** `@types/node` (v25.9.0) - Penyedia definisi tipe data TypeScript lingkungan runtime Node.js.

### Database Seeding Configuration
* **Command:** `node prisma/seed.js`
* **Fungsi:** Mengisi data awal (*initial seeding*) ke dalam basis data MariaDB saat deployment, termasuk inisialisasi akun administrator default, hak akses RBAC, dan daftar master ruangan laboratorium.
```