// Config bot Telegram Cloud (v2 — kategori grup Forum).
// Ganti VALID_CODES dengan kode jualan kamu sebelum deploy.
//
// State grup aktif & mapping kategori disimpan di MEMORY bot (sesuai framework
// "tanpa DB"). Untuk toleransi restart, mapping kategori di-rebuild dari
// getForumTopicList() tiap kali dibutuhkan.

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
