import { Bot } from "https://deno.land/x/grammy@v1.30.1/mod.ts";
import {
  VALID_CODES,
  DEFAULT_CATEGORIES,
  kv,
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
  if (msg.video || msg.animation || msg.video_note) return "Video";
  if (msg.document) return "Dokumen";
  if (msg.audio || msg.voice) return "Audio";
  return "Lainnya";
}

function hasFile(msg: any): boolean {
  return Boolean(
    msg.photo || msg.video || msg.animation || msg.video_note ||
      msg.document || msg.audio || msg.voice
  );
}

// Retry wrapper: kalau kena rate-limit (429), tunggu lalu coba lagi.
async function withRetry(fn: () => Promise<any>, max = 4): Promise<any> {
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = e?.description || e?.message || String(e);
      const retryAfter = e?.parameters?.retry_after;
      if (i < max - 1 && (msg.includes("Too Many Requests") || msg.includes("rate"))) {
        const wait = (retryAfter ? Number(retryAfter) : (i + 1)) * 1000;
        console.error("RATE LIMIT, retry in", wait, "ms");
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
}

// ===== /start, /bantuan =====
bot.command("start", (ctx) =>
  ctx.reply(
    "☁️ Telecloud\n\n" +
      "Bot penyimpanan cloud berbasis Telegram dengan folder otomatis menggunakan Topics.\n\n" +
      "Cara Aktivasi\n\n" +
      "Aktifkan fitur Topics di grup Telegram.\n\n" +
      "Tambahkan Telecloud ke grup, lalu jadikan Admin dengan izin Hapus Pesan.\n\n" +
      "Jalankan perintah:\n" +
      "/aktivasi <kode>\n\n" +
      "Selesai! Upload file ke topik General. Telecloud akan otomatis memindahkan file ke topic/kategori yang sesuai 🥳"
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
bot.on("message", async (ctx) => {
  try {
    const chat = ctx.chat;
    // hanya di grup / supergroup (Forum)
    if (chat.type !== "supergroup" && chat.type !== "group") return;

    if (!(await isActive(chat.id))) {
      if (ctx.message?.text?.startsWith("/")) {
        return ctx.reply("Grup belum aktif. Hubungi penjual untuk kode aktivasi.");
      }
      return;
    }

    console.error("MSG:", ctx.message?.message_thread_id, "keys:", Object.keys(ctx.message || {}).join(","));

    // Sudah di dalam topic kategori kita? abaikan (jangan dipindah lagi).
    const tid = ctx.message?.message_thread_id;
    const cats = await getCategories(chat.id);
    if (tid && [...cats.values()].includes(tid)) return;

    if (!hasFile(ctx.message)) return;

    const kat = detectType(ctx.message);
    const threadId = cats.get(kat.toLowerCase());
    console.error("FILE:", kat, "threadId:", threadId);
    if (!threadId) return;

    const msgId = ctx.message!.message_id;
    try {
      await withRetry(() =>
        ctx.api.forwardMessages(chat.id, chat.id, [msgId], {
          message_thread_id: threadId,
        })
      );
    } catch (e) {
      console.error("FORWARD ERROR:", e);
    }
    try {
      await withRetry(() => ctx.api.deleteMessage(chat.id, msgId));
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
