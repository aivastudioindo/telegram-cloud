# Telegram Cloud — Bot Kategori Grup Forum

Bot Telegram yang mengubah grup **Forum** Telegram menjadi "cloud storage"
ber-folder otomatis:
- Upload file ke **General** → bot mendeteksi tipe → memindahkan ke topic
  kategori (Foto / Video / Dokumen / Audio / Lainnya) → menghapus pesan asli.
- Hanya grup yang sudah `/aktivasi <kode>` yang dilayani (gerbang jualan).
- Admin bisa menambah kategori sendiri dengan `/addkategori`.

**Tanpa database.** State grup aktif & mapping kategori ada di memory bot.
**Hosting:** Deno Deploy (gratis) atau Supabase Edge Function (gratis, jalan Deno).

---

## Struktur folder
```
telegram-cloud/
├── deno.json          # import grammy + task start
├── config.ts          # VALID_CODES (kode jualan) + state memory
├── mod.ts             # logika bot + webhook server
└── README.md
```

---

## Langkah Dev (deploy)

### 1. Siapkan bot
- BotFather → `/newbot` → dapat token.
- Simpan token sebagai env `BOT_TOKEN` saat deploy.

### 2. Ganti kode jualan
Edit `config.ts` → `VALID_CODES`:
```ts
export const VALID_CODES: string[] = ["AKTIF-XYZ789"]; // ganti own
```

### 3. Deploy ke Deno Deploy (gratis)
```bash
deno deploy --project telegram-cloud
# saat ditanya entry point: mod.ts
# set env: BOT_TOKEN = <token bot>
```
Dapat URL mis. `https://telegram-cloud.deno.dev`.

Atau pakai Supabase Edge Function:
```bash
supabase functions deploy telegram-cloud --no-verify-jwt
# set secret BOT_TOKEN
```

### 4. Set webhook
```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<DEPLOY_URL>/telegram-cloud
```
Cek: `.../getWebhookInfo`.

---

## Panduan Pelanggan (kasih ke pembeli)
```
Cara pakai PenyimpanBot:
1. Buat grup di Telegram → klik nama grup → "Topics" → aktifkan.
2. Add @PenyimpanBot → jadikan admin dengan hak "Hapus Pesan".
3. Ketik /aktivasi <kode yang kamu beli>.
Sekarang upload foto/video/dokumen/audio ke General → otomatis masuk topic masing-masing.
```

---

## Perintah
| Perintah | Akses | Fungsi |
|---|---|---|
| `/aktivasi <kode>` | semua | aktifkan grup + buat topic default |
| `/addkategori <nama>` | admin | buat topic kategori baru |
| `/listkategori` | semua | lihat daftar kategori & topic id |
| `/start`, `/bantuan` | semua | sambutan & bantuan |

---

## Catatan
- Saat bot restart, state memory hilang → pelanggan cukup `/aktivasi` ulang (kode tetap valid).
- Bot wajib jadi **admin dengan hak Hapus Pesan** agar bisa bersihkan General.
- File tetap tersimpan di server Telegram (bukan storage eksternal).
