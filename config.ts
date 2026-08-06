// Config bot Telegram Cloud (v2 — kategori grup Forum).
// Ganti VALID_CODES dengan kode jualan kamu sebelum deploy.
//
// State grup aktif & mapping kategori disimpan di DENO KV (persisten, gratis di
// Deno Deploy) — survive restart instance, konsisten antar instance.

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

// KV instance (global, di-share seluruh bot)
export const kv = await Deno.openKv();

// Helpers state berbasis KV
export async function isActive(chatId: number): Promise<boolean> {
  const r = await kv.get(["active", chatId]);
  return Boolean(r.value);
}

export async function setActive(chatId: number, active: boolean): Promise<void> {
  if (active) await kv.set(["active", chatId], true);
  else await kv.delete(["active", chatId]);
}

export async function getCategories(
  chatId: number,
): Promise<Map<string, number>> {
  const r = await kv.get(["cats", chatId]);
  const obj = (r.value as Record<string, number>) ?? {};
  return new Map(Object.entries(obj));
}

export async function setCategory(
  chatId: number,
  nama: string,
  threadId: number,
): Promise<void> {
  const m = await getCategories(chatId);
  m.set(nama.toLowerCase(), threadId);
  await kv.set(["cats", chatId], Object.fromEntries(m));
}
