# Telegram Cloud — Project Framework

> **Kategori:** Bot kategorisasi otomatis untuk grup Forum Telegram (cloud ber-folder)
> **Status:** Draft v2 (revisi — sesuaikan dengan keputusan final)
> **Dibuat:** 2026-08-06 | **Revisi:** 2026-08-06
> **Workspace:** ~/projects/telegram-cloud/

---

## 1. Project Overview

- **Project Name:** Telegram Cloud
- **Purpose:** Mengubah grup Forum Telegram menjadi "cloud storage" ber-folder otomatis. User upload file ke General → bot mendeteksi tipe → memindahkan ke topic kategori (Foto/Video/Dokumen/Audio/Lainnya) → menghapus pesan asli di General. Admin dapat menambah kategori sendiri.
- **Vision:** Penyimpanan awan gratis & rapi lewat Telegram yang sudah dipakai tiap hari — tanpa install app lain.
- **Goals:**
  1. Auto-kategorisasi upload ke topic yang benar.
  2. General tetap bersih (bot = admin delete).
  3. Admin bisa tambah kategori (`/addkategori`).
  4. Hanya grup ber-kode aktivasi yang dilayani (gerbang jualan).
  5. Dapat dijual komersial.
- **Success Criteria:**
  - Upload foto ke General → muncul di topic Foto, hilang dari General.
  - `/aktivasi <kode>` → topic default dibuat.
  - `/addkategori` admin → topic baru jalan.
  - Grup tanpa kode → tidak dilayani.

---

## 2. Problem Statement

- **Masalah:** File di grup Telegram berantakan di satu alur chat. User ingin "folder" otomatis tanpa ribet.
- **Mengapa penting:** Telegram sudah ada di HP tiap orang; menjadikannya cloud ber-folder = zero-install.

---

## 3. Target Users

- **Primary:** Pembeli bot (orang yang ingin grupnya rapi sebagai cloud pribadi).
- **Secondary:** Member grup tersebut (upload file, otomatis terkategori).
- **Pain points:** file berantakan, susah cari, General penuh sampah.

---

## 4. Scope

### Included (MVP)
- Bot di grup Forum (topics enabled).
- Auto-kategori: foto→Foto, video→Video, document→Dokumen, audio→Audio, lainnya→Lainnya.
- Hapus pesan asli di General (bot butuh hak admin "delete messages").
- `/aktivasi <kode>` → buat topic default + aktifkan grup.
- `/addkategori <nama>` (hanya admin) → buat topic baru.
- `/listkategori`, `/start`, `/bantuan`.
- Kode aktif: list di config bot (`VALID_CODES`). Grup aktif: Set di memory.

### Excluded (bukan v1)
- Database / Supabase (state di memory + config — TANPA DB).
- Backup file ke luar Telegram (file cukup di server Telegram).
- Web dashboard, enkripsi E2E, share antar grup, pencarian teks file.

---

## 5. Functional Requirements

**Modul A — Kategorisasi**
- Pesan di General (thread utama) berisi file → forward ke topic kategori → delete asli.

**Modul B — Aktivasi**
- `/aktivasi <kode>` → jika kode valid → tambah chat_id ke `activeGroups` + buat topic Foto/Video/Dokumen/Audio/Lainnya.

**Modul C — Kategori Dinamis**
- `/addkategori <nama>` (admin only) → `createForumToken` + simpan mapping nama→thread_id.

**Modul D — Guard**
- Grup belum aktivasi → balas "Grup belum aktif, hubungi penjual untuk kode."

---

## 6. Non-Functional Requirements

- **Performance:** respon <1 dtk.
- **Security:** bot butuh admin delete; kode aktif rahasia.
- **Privacy:** file di grup pembeli sendiri.
- **Reliability:** bot 24/7 di Deno Deploy (free).
- **Cost:** $0 (Deno Deploy free / Edge Function gratis, TANPA Supabase).
- **UX:** panduan 3 langkah untuk pelanggan.

---

## 7. Architecture

```
[USER] → upload ke General (grup Forum)
   ↓
[BOT] (admin delete) deteksi tipe file
   ↓ forward ke topic kategori + hapus asli di General
[TOPIC Foto/Video/Dokumen/Audio/Lainnya] = "folder" cloud
```

- **Bot:** Deno + TypeScript (grammy).
- **Hosting:** Deno Deploy (free) atau Edge Function (free) — keduanya Deno.
- **State:** `VALID_CODES` (array di config), `activeGroups` (Set di memory), `categories` (Map di memory).
- **Tidak ada database.** File tersimpan di Telegram (bukan di storage eksternal).

---

## 8. Roadmap

**Phase 1 — Bot Kategorisasi**
- Auto-kategori + hapus asli.

**Phase 2 — Aktivasi & Kategori Dinamis**
- `/aktivasi`, `/addkategori` (admin).

**Phase 3 — Deploy & Panduan**
- Deno Deploy + webhook + README pelanggan.

**Future**
- Statistik, backup eksternal (opsional), multi-bahasa.

---

## 9. Risks

| Jenis | Risiko | Mitigasi |
|---|---|---|
| Teknis | Memory hilang saat restart | pelanggan `/aktivasi` ulang (kode valid) |
| Teknis | Bot bukan admin | cek getChatMember, balas instruksi |
| Bisnis | Kode bocor | ganti VALID_CODES, kasih kode baru |
| Legal | Konten ilegal | panduan "jangan upload ilegal" |

---

## 10. Open Questions (Dev putuskan sendiri)

- Library: `grammy` stabil.
- Hosting: Deno Deploy (pilih free).
- Mapping: nama kategori lowercase → thread_id.
- Limit file: ikut batas Telegram (50MB/2GB).

---

## 11. Next Actions

1. Scaffold bot Deno/TS (grammy).
2. Implementasi kategorisasi + hapus asli.
3. Implementasi aktivasi + kategori dinamis.
4. Deploy ke Deno Deploy + set webhook.
5. Tulis README panduan pelanggan.

---
*Living document — direvisi ke Opsi B (tanpa DB, grup topic) sesuai keputusan final.*
