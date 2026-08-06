import { Bot } from "https://deno.land/x/grammy@v1.30.1/mod.ts";
import {
  VALID_CODES,
  DEFAULT_CATEGORIES,
  activeGroups,
  categories,
} from "./config.ts";

const bot = new Bot(Deno.env.get("BOT_TOKEN")!);
await bot.init(); // wajib sebelum handleUpdate di Deno Deploy

// ===== util =====
function detectType(msg: any): string {
  if (msg.photo) return "Foto";
  if (msg.video) return "Video";
  if (msg.document) return "Dokumen";
  if (msg.audio || msg.voice) return "Audio";
  return "Lainnya";
}

function hasFile(msg: any): boolean {
  return Boolean(
    msg.photo || msg.video || msg.document || msg.audio || msg.voice
  );
}

function catMap(chatId: number): Map<string, number> {
  let m = categories.get(chatId);
  if (!m) {
    m = new Map();
    categories.set(chatId, m);
  }
  return m;
}

// Rebuild mapping kategori dari topic yang sudah ada di grup (toleransi restart).
// Hanya rebuild kalau map kosong, agar tidak nge-spam API tiap pesan.
async function ensureCategories(chatId: number): Promise<Map<string, number>> {
  const m = catMap(chatId);
  if (m.size > 0) return m;
  try {
    const topics = await bot.api.getForumTopicList(chatId);
    for (const t of topics as any[]) {
      const name = String(t.name).toLowerCase();
      m.set(name, t.message_thread_id);
    }
    console.error("REBUILT categories for", chatId, "=>", [...m.entries()]);
  } catch (e) {
    console.error("getForumTopicList error:", e);
  }
  return m;
}

// ===== /start, /bantuan =====
bot.command("start", (ctx) =>
  ctx.reply(
    "Bot penyimpanan awan ber-folder otomatis.\n" +
      "1) Aktifkan Topics di grup kamu.\n" +
      "2) Add bot & jadikan admin (hak Hapus Pesan).\n" +
      "3) Ketik /aktivasi <kode>.\n" +
      "Lalu upload file ke General — otomatis masuk topic kategorinya."
  )
);

bot.command("bantuan", (ctx) =>
  ctx.reply(
    "Perintah:\n" +
      "/aktivasi <kode> — aktifkan grup & buat topic default\n" +
      "/addkategori <nama> — (admin) buat topic kategori baru\n" +
      "/listkategori — lihat daftar kategori & topic\n" +
      "/bantuan — bantuan ini"
  )
);

// ===== /aktivasi =====
bot.command("aktivasi", async (ctx) => {
  const kode = ctx.match?.toString().trim();
  if (!kode || !VALID_CODES.includes(kode)) {
    return ctx.reply("Kode tidak valid. Hubungi penjual untuk kode aktivasi.");
  }

  const chatId = ctx.chat.id;
  activeGroups.add(chatId);
  const map = catMap(chatId);

  const lines: string[] = [];
  for (const nama of DEFAULT_CATEGORIES) {
    try {
      const t = await ctx.api.createForumTopic(chatId, nama);
      map.set(nama.toLowerCase(), t.message_thread_id);
      lines.push(nama);
    } catch (e) {
      lines.push(`${nama} (gagal)`);
    }
  }

  await ctx.reply(
    "Grup aktif! Topic dibuat: " + lines.join(", ") + ".\n" +
      "Upload foto/video/dokumen/audio ke General akan otomatis dipindah ke topic masing-masing."
  );
});

// ===== /addkategori (admin only) =====
bot.command("addkategori", async (ctx) => {
  const nama = ctx.match?.toString().trim();
  if (!nama) return ctx.reply("Pakai: /addkategori <nama>");

  // cek admin
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from!.id);
    if (!["administrator", "creator"].includes(member.status)) {
      return ctx.reply("Hanya admin yang bisa menambah kategori.");
    }
  } catch {
    return ctx.reply("Gagal mengecek hak admin.");
  }

  if (!activeGroups.has(ctx.chat.id)) {
    return ctx.reply("Grup belum aktif. Pakai /aktivasi <kode> dulu.");
  }

  try {
    const t = await ctx.api.createForumTopic(ctx.chat.id, nama);
    catMap(ctx.chat.id).set(nama.toLowerCase(), t.message_thread_id);
    await ctx.reply(`Topic "${nama}" dibuat.`);
  } catch (e) {
    await ctx.reply("Gagal membuat topic: " + (e instanceof Error ? e.message : String(e)));
  }
});

// ===== /listkategori =====
bot.command("listkategori", async (ctx) => {
  const map = await ensureCategories(ctx.chat.id);
  if (map.size === 0) {
    return ctx.reply("Belum ada kategori. Aktifkan grup dengan /aktivasi <kode>.");
  }
  const text = [...map.entries()].map(([n, id]) => `• ${n} → topic ${id}`).join("\n");
  return ctx.reply("Kategori:\n" + text);
});

// ===== handler pesan file di General =====
bot.on("message", async (ctx) => {
  try {
    const chat = ctx.chat;
    // hanya di grup / supergroup (Forum)
    if (chat.type !== "supergroup" && chat.type !== "group") return;

    // Cek aktif: kalau memory kosong (karena restart), rebuild dari Telegram.
    if (!activeGroups.has(chat.id)) {
      const rebuilt = await ensureCategories(chat.id);
      if (rebuilt.size > 0) {
        activeGroups.add(chat.id); // ingat di memory (sementara)
      } else if (ctx.message?.text?.startsWith("/")) {
        return ctx.reply("Grup belum aktif. Hubungi penjual untuk kode aktivasi.");
      } else {
        return;
      }
    }

    console.error("MSG:", ctx.message?.message_thread_id, "keys:", Object.keys(ctx.message || {}).join(","));

    // Sudah di dalam topic kategori kita? abaikan (jangan dipindah lagi).
    const tid = ctx.message?.message_thread_id;
    const cats = await ensureCategories(chat.id);
    if (tid && [...cats.values()].includes(tid)) return;

    if (!hasFile(ctx.message)) return;

    const kat = detectType(ctx.message);
    const threadId = cats.get(kat.toLowerCase());
    console.error("FILE:", kat, "threadId:", threadId, "hasFile:", hasFile(ctx.message));
    if (!threadId) return;

    const msgId = ctx.message!.message_id;
    try {
      await ctx.api.forwardMessages(chat.id, chat.id, [msgId], {
        message_thread_id: threadId,
      });
    } catch (e) {
      console.error("FORWARD ERROR:", e);
    }
    try {
      await ctx.api.deleteMessage(chat.id, msgId);
    } catch (e) {
      console.error("DELETE ERROR:", e);
    }
  } catch (e) {
    console.error("HANDLER CRASH:", e);
  }
});

bot.catch((err) => {
  console.error("BOT CATCH:", err);
});

// ===== webhook server (Deno Deploy / Edge Function) =====
Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/telegram-cloud") {
    try {
      await bot.handleUpdate(await req.json());
    } catch (e) {
      console.error("handleUpdate error", e);
    }
    return new Response("ok");
  }
  return new Response("Telegram Cloud");
});
