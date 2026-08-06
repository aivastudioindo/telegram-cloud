import { Bot } from "https://deno.land/x/grammy@v1.30.1/mod.ts";
import {
  VALID_CODES,
  DEFAULT_CATEGORIES,
  isActive,
  setActive,
  getCategories,
  setCategory,
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
  await setActive(chatId, true);

  const lines: string[] = [];
  for (const nama of DEFAULT_CATEGORIES) {
    try {
      const t = await ctx.api.createForumTopic(chatId, nama);
      await setCategory(chatId, nama, t.message_thread_id);
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

  if (!(await isActive(ctx.chat.id))) {
    return ctx.reply("Grup belum aktif. Pakai /aktivasi <kode> dulu.");
  }

  try {
    const t = await ctx.api.createForumTopic(ctx.chat.id, nama);
    await setCategory(ctx.chat.id, nama, t.message_thread_id);
    await ctx.reply(`Topic "${nama}" dibuat.`);
  } catch (e) {
    await ctx.reply("Gagal membuat topic: " + (e instanceof Error ? e.message : String(e)));
  }
});

// ===== /listkategori =====
bot.command("listkategori", async (ctx) => {
  const map = await getCategories(ctx.chat.id);
  if (map.size === 0) {
    return ctx.reply("Belum ada kategori. Aktifkan grup dengan /aktivasi <kode>.");
  }
  const text = [...map.entries()].map(([n, id]) => `• ${n} → topic ${id}`).join("\n");
  return ctx.reply("Kategori:\n" + text);
});

// ===== handler pesan file di General =====
// Pakai bot.on("update") agar MENANGKAP SEMUA tipe update (termasuk file di forum
// yang kadang tidak masuk filter "msg"/"message" grammy).
bot.on("update", async (ctx) => {
  try {
    const msg: any = ctx.message || ctx.channelPost || ctx.editedMessage;
    if (!msg || !msg.chat) return;

    const chat = msg.chat;
    // hanya di grup / supergroup (Forum)
    if (chat.type !== "supergroup" && chat.type !== "group") return;

    if (!(await isActive(chat.id))) {
      if (msg.text?.startsWith("/")) {
        return ctx.reply("Grup belum aktif. Hubungi penjual untuk kode aktivasi.");
      }
      return;
    }

    console.error("MSG:", msg.message_thread_id, "keys:", Object.keys(msg).join(","));

    // Sudah di dalam topic kategori kita? abaikan (jangan dipindah lagi).
    const tid = msg.message_thread_id;
    const cats = await getCategories(chat.id);
    if (tid && [...cats.values()].includes(tid)) return;

    if (!hasFile(msg)) return;

    const kat = detectType(msg);
    const threadId = cats.get(kat.toLowerCase());
    if (!threadId) return;

    const msgId = msg.message_id;
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
