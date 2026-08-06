// Config bot Telegram Cloud (v2 — kategori grup Forum).
// Ganti VALID_CODES dengan kode jualan kamu sebelum deploy.
//
// Catatan: state grup aktif & mapping kategori disimpan di MEMORY bot.
// Saat bot restart, state hilang — pelanggan cukup /aktivasi ulang (kode tetap valid).

export const VALID_CODES: string[] = [
  "AKTIF-XYZ789", // contoh kode; ganti saat jual
];

export const DEFAULT_CATEGORIES: string[] = [
  "Foto",
  "Video",
  "Dokumen",
  "Audio",
  "Lainnya",
];

// State runtime (memory)
export const activeGroups = new Set<number>();
export const categories = new Map<number, Map<string, number>>(); // chatId -> (namaLower -> threadId)
