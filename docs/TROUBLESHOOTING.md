# Troubleshooting — Telegram Cloud Bot

Catatan penyelesaian masalah saat build bot kategori grup Forum (Deno Deploy + grammy).

## Gejala & Solusi

### 1. Bot diam padahal webhook benar
**Penyebab:** `bot.init()` tidak dipanggil sebelum `bot.handleUpdate()` di Deno Deploy.
grammy throw: `Bot not initialized! Either call await bot.init(), or directly set the botInfo option`.
**Fix:** tambahkan `await bot.init();` setelah `new Bot(...)`, sebelum `Deno.serve`.

### 2. Foto di General tidak dipindah (forum grup)
**Penyebab:** cek `if (ctx.message?.message_thread_id) return;` — di grup Forum,
**General JUGA punya `message_thread_id`** (bukan cuma topic kategori). Jadi semua pesan
di-skip.
**Fix:** cuma skip kalau `message_thread_id` ada di dalam map kategori kita:
```ts
const tid = ctx.message?.message_thread_id;
const cats = await getCategories(chat.id);
if (tid && [...cats.values()].includes(tid)) return;
```

### 3. "Kadang berhasil kadang tidak" / "beberapa kali lalu macet"
**Penyebab:** state `activeGroups` & `categories` disimpan di **memory**. Deno Deploy
sering restart instance → memory hilang → bot "lupa" grup aktif.
**Fix:** simpan state ke **Deno KV** (persistent, gratis). Helper `isActive` / `getCategories`
/ `setCategory` baca-tulis KV. Wajib: attach KV database di dashboard Deno Deploy
(tab KV → Create Database) sebelum deploy,否则 error:
`Deno.openKv() failed: no KV database is attached to this app.`

### 4. Error: Invalid L1 filter 'update'
**Penyebab:** `bot.on("update")` bukan filter valid di grammy.
**Fix:** pakai `bot.on("message")` (atau `bot.on("msg")`, alias sama).

### 5. TypeError: bot.api.getForumTopicList is not a function
**Penyebab:** method itu tidak ada di grammy 1.30.1.
**Fix:** jangan pakai `bot.api.getForumTopicList`. Mapping kategori disimpan di KV saat
`/aktivasi`, bukan di-rebuild dari Telegram. Kalau butuh daftar topic, panggil raw API
`https://api.telegram.org/bot<TOKEN>/getForumTopics` (perhatikan: method Bot API adalah
`getForumTopics`, bukan `getForumTopicList` — tapi tidak dipakai di bot ini).

### 6. Upload berturut-turut gagal setelah ~5x
**Penyebab:** Telegram rate-limit bot (~1 request/detik untuk forward/delete).
**Fix:** wrapper `withRetry` yang retry kalau kena `Too Many Requests` / `rate`, dengan
jeda naik (1s, 2s, 3s ...) pakai `retry_after` kalau ada.

## Deteksi file (biar semua tipe masuk kategori benar)
```ts
function detectType(msg) {
  if (msg.photo) return "Foto";
  if (msg.video || msg.animation || msg.video_note) return "Video";
  if (msg.document) return "Dokumen";
  if (msg.audio || msg.voice) return "Audio";
  return "Lainnya";
}
```
Catatan: foto .jpeg dari kamera kadang dikirim sebagai `document` (bukan `photo`) →
masuk kategori Dokumen. Itu normal di Telegram.

## Deploy checklist
1. Repo di GitHub: `aivastudioindo/telegram-cloud`, branch `main`.
2. Deno Deploy: Dynamic App, entrypoint `mod.ts`, build command kosong.
3. Environment variable: `BOT_TOKEN` (token @telecloudidbot).
4. **Attach KV database** di dashboard (tab KV) sebelum deploy pertama.
5. Webhook: `https://telegram-cloud.aivastudioindo.deno.net/telegram-cloud`
   (set via `setWebhook`). Production URL, bukan preview.
6. Di grup: `/aktivasi AKTIF-XYZ789` (ganti kode di `config.ts` kalau jualan).
