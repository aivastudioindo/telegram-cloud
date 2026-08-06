# ☁️ Telecloud — Dokumentasi Lengkap

Bot penyimpanan cloud berbasis Telegram dengan folder otomatis menggunakan **Topics**.
Upload file ke topik General → bot otomatis memindahkan ke topic/kategori yang sesuai
(Foto, Video, Dokumen, Audio, Lainnya) lalu menghapus pesan asli di General.

---

# BAGIAN 1 — UNTUK PELANGGAN (Cara Pakai)

## Persyaratan
- Grup Telegram dengan fitur **Topics** aktif (fitur bawaan Telegram, gratis).
- Bot **Telecloud** sudah ditambahkan ke grup sebagai **Admin** dengan izin **Hapus Pesan**.

## Cara Aktivasi
1. Aktifkan fitur **Topics** di grup Telegram (klik nama grup → Topics → Aktifkan).
2. Tambahkan **@telecloudidbot** ke grup, lalu jadikan **Admin** dengan izin **Hapus Pesan**.
3. Jalankan perintah:
   ```
   /aktivasi <kode>
   ```
   (kode aktivasi didapat saat pembelian)
4. Selesai! Upload file ke topik **General**. Telecloud akan otomatis memindahkan
   file ke topic/kategori yang sesuai 🥳

## Cara Pakai Sehari-hari
- Kirim **foto** ke General → otomatis masuk topic **Foto**.
- Kirim **video** ke General → otomatis masuk topic **Video**.
- Kirim **dokumen** (pdf, doc, xls, zip, dll) ke General → otomatis masuk topic **Dokumen**.
- Kirim **audio** (mp3, voice note, dll) ke General → otomatis masuk topic **Audio**.
- File lain → masuk topic **Lainnya**.

Tidak perlu perintah apa pun setelah aktivasi. Cukup upload, bot yang urus.

## Daftar Perintah
| Perintah | Siapa | Fungsi |
|---|---|---|
| `/start` | semua | Tampilkan info & cara aktivasi |
| `/bantuan` | semua | Daftar perintah & penjelasan |
| `/aktivasi <kode>` | semua | Aktifkan grup + buat topic kategori |
| `/addkategori <nama>` | admin | Buat topic kategori baru |
| `/listkategori` | semua | Lihat daftar kategori & ID topic |

## Tips
- Bot **wajib jadi Admin dengan izin Hapus Pesan**, kalau tidak file tidak bisa dihapus
  dari General (tetap dipindah tapi masih numpuk di General).
- Kode aktivasi **tetap valid** — kalau bot restart, cukup `/aktivasi <kode>` lagi.
- File tetap tersimpan di server Telegram (bukan di server eksternal), jadi aman dan
  bisa diakses kapan saja dari dalam grup.

## Troubleshooting Pelanggan
| Masalah | Solusi |
|---|---|
| File tidak dipindah | Pastikan bot sudah jadi Admin + izin Hapus Pesan. Jalankan `/aktivasi <kode>` lagi. |
| Perintah tidak dikenali | Bot belum aktif di grup → jalankan `/aktivasi <kode>`. |
| Topic tidak kebuat | Pastikan Topics aktif di grup. Coba `/aktivasi` ulang. |
| Kode ditolak | Kode salah atau belum dibeli. Hubungi penjual. |

---

# BAGIAN 2 — UNTUK OWNER / ADMIN (Setup & Deploy)

## Yang dibutuhkan
- Token bot dari @BotFather (`/newbot`).
- Akun Deno Deploy (gratis, tanpa kartu kredit).
- Repository GitHub `aivastudioindo/telegram-cloud`.

## Langkah Deploy
1. **Fork/clone repo** `aivastudioindo/telegram-cloud`.
2. **Ganti kode jualan** di `config.ts`:
   ```ts
   export const VALID_CODES: string[] = [
     "AKTIF-XYZ789", // ganti dengan kode jualan kamu
   ];
   ```
3. **Deploy ke Deno Deploy:**
   - New Project → Git → pilih repo.
   - Runtime: **Dynamic App** (bukan Static/Next.js).
   - Entrypoint: `mod.ts`.
   - Install/Build/Pre-deploy command: **kosong**.
   - Environment variable: `BOT_TOKEN` = token bot.
   - **Attach Deno KV** (tab KV → Create Database) — wajib, kalau tidak bot error.
4. **Set webhook** (ganti token & URL):
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://telegram-cloud.aivastudioindo.deno.net/telegram-cloud
   ```
   Cek: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
5. **Tes:** kirim `/start` ke bot → harus balas info Telecloud.

## Struktur Project
```
telegram-cloud/
├── deno.json              # config import grammy
├── config.ts              # VALID_CODES + state (Deno KV)
├── mod.ts                 # logika bot + webhook server
├── TROUBLESHOOTING.md     # catatan debug untuk dev
└── README.md              # dokumentasi ini
```

## Cara Ganti Kode Aktivasi (jualan)
Edit `VALID_CODES` di `config.ts`, commit, push → Deno Deploy auto-redeploy.
Pelanggan yang sudah aktivasi tetap aktif (state di KV).

## Catatan Teknis
- **State persisten di Deno KV** — survive restart instance Deno Deploy, konsisten antar
  instance. Tidak perlu `/aktivasi` ulang tiap restart.
- **Rate-limit Telegram** ditangani dengan retry otomatis (upload berturut-tutur lancar).
- File tidak disimpan di server bot — hanya dipindah antar topic via API Telegram.
- Webhook path: `/telegram-cloud` (harus ada di URL setWebhook).

---

# BAGIAN 3 — TEKS PROMOSI (copy-paste)
```
☁️ Telecloud
Bot penyimpanan cloud berbasis Telegram dengan folder otomatis menggunakan Topics.
Cara Aktivasi
Aktifkan fitur Topics di grup Telegram.
Tambahkan Telecloud ke grup, lalu jadikan Admin dengan izin Hapus Pesan.
Jalankan perintah:
/aktivasi <kode>
Selesai! Upload file ke topik General. Telecloud akan otomatis memindahkan file ke topic/kategori yang sesuai 🥳
```
