-- Telegram Cloud: tabel penyimpanan state bot (grup aktif + mapping kategori)
-- Jalankan di Supabase Dashboard → SQL Editor → Run.

create table if not exists bot_state (
  chat_id bigint primary key,
  active boolean default false,
  categories jsonb default '{}'::jsonb,  -- {"foto": 123, "video": 456, ...}
  updated_at timestamptz default now()
);

-- Matikan RLS agar bot bisa baca/tulis lewat anon key (state bot, bukan data user).
alter table bot_state disable row level security;
