-- ============================================================
-- EduBoard — Complete Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  display_name text not null,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/7.x/initials/svg?seed=' ||
      coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)) ||
      '&backgroundColor=4f46e5&textColor=ffffff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── SUBJECTS ─────────────────────────────────────────────────
create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz default now()
);

-- ── USER_SUBJECTS (enrollment) ───────────────────────────────
create table if not exists public.user_subjects (
  user_id     uuid references public.profiles(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete cascade,
  enrolled_at timestamptz default now(),
  primary key (user_id, subject_id)
);

-- ── POSTS ─────────────────────────────────────────────────────
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete set null,
  caption     text not null default '',
  photo_url   text,
  file_url    text,
  file_name   text,
  post_type   text not null default 'status' check (post_type in ('status', 'announcement')),
  due_date    date,
  created_at  timestamptz default now()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade,
  post_id         uuid references public.posts(id) on delete cascade,
  chat_message_id uuid,
  type            text not null check (type in ('announcement', 'tag', 'whisper')),
  message         text not null,
  is_read         boolean default false,
  created_at      timestamptz default now()
);

-- ── CHAT ─────────────────────────────────────────────────────
create table if not exists public.chat (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid references public.profiles(id) on delete cascade,
  receiver_id   uuid references public.profiles(id) on delete set null,
  content       text not null,
  is_whisper    boolean default false,
  is_deleted    boolean default false,
  tag_user_id   uuid references public.profiles(id) on delete set null,
  tag_public    boolean,
  post_ref_id   uuid references public.posts(id) on delete set null,
  created_at    timestamptz default now()
);

-- ── APPS ─────────────────────────────────────────────────────
create table if not exists public.apps (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid references public.subjects(id) on delete cascade,
  name        text not null,
  url         text not null,
  icon_url    text,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.subjects        enable row level security;
alter table public.user_subjects   enable row level security;
alter table public.posts           enable row level security;
alter table public.notifications   enable row level security;
alter table public.chat            enable row level security;
alter table public.apps            enable row level security;

-- PROFILES
create policy "Public profiles readable" on public.profiles for select using (true);
create policy "Own profile updatable" on public.profiles for update using (auth.uid() = id);

-- SUBJECTS (public read, authenticated create)
create policy "Subjects readable by all" on public.subjects for select using (true);
create policy "Authenticated can create subjects" on public.subjects for insert with check (auth.uid() is not null);

-- USER_SUBJECTS
create policy "User can see own enrollments" on public.user_subjects for select using (auth.uid() = user_id);
create policy "User can enroll" on public.user_subjects for insert with check (auth.uid() = user_id);
create policy "User can unenroll" on public.user_subjects for delete using (auth.uid() = user_id);

-- POSTS (public read, authenticated create)
create policy "Posts readable by all" on public.posts for select using (true);
create policy "Authenticated can create posts" on public.posts for insert with check (auth.uid() = author_id);
create policy "Author can update own posts" on public.posts for update using (auth.uid() = author_id);
create policy "Author can delete own posts" on public.posts for delete using (auth.uid() = author_id);

-- NOTIFICATIONS (private to recipient)
create policy "Own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "System can insert notifications" on public.notifications for insert with check (true);
create policy "Own mark read" on public.notifications for update using (auth.uid() = user_id);

-- CHAT
create policy "Public messages readable by all" on public.chat
  for select using (
    is_whisper = false
    or sender_id = auth.uid()
    or receiver_id = auth.uid()
  );
create policy "Authenticated can send messages" on public.chat for insert with check (auth.uid() = sender_id);
create policy "Own message soft-delete" on public.chat for update using (auth.uid() = sender_id);

-- APPS (public read)
create policy "Apps readable by all" on public.apps for select using (true);
create policy "Authenticated can add apps" on public.apps for insert with check (auth.uid() is not null);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.chat;
alter publication supabase_realtime add table public.notifications;

-- ============================================================
-- STORAGE BUCKET
-- Run separately in Storage section or via SQL:
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('post-media', 'post-media', true);
--
-- create policy "Public media readable" on storage.objects for select using (bucket_id = 'post-media');
-- create policy "Auth users upload media" on storage.objects for insert
--   with check (bucket_id = 'post-media' and auth.uid() is not null);
-- create policy "Owner can delete media" on storage.objects for delete
--   using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- SEED DATA (optional — remove in production)
-- ============================================================
insert into public.subjects (name, description) values
  ('Ethics', 'Study of moral principles, values, and ethical decision-making'),
  ('Discrete Structure 1', 'Logic, set theory, combinatorics, and graph theory for computing'),
  ('Calculus for Computer Science', 'Differential and integral calculus applied to computational problems'),
  ('PATHFIT', 'Physical activity towards health and fitness — movement and wellness'),
  ('Mathematics in the Modern World', 'Mathematical concepts and applications in contemporary society'),
  ('Intermediate Programming', 'Object-oriented programming, data structures, and algorithm design'),
  ('NSTP – CWTS', 'National Service Training Program — Civic Welfare Training Service, AB4-TR001, Duran Hall'),
  ('NSTP – LTS', 'National Service Training Program — Literacy Training Service, AB4-TR001, Duran Hall'),
  ('NSTP – ROTC', 'National Service Training Program — Reserve Officers Training Corps, AB4-TR001, Duran Hall')
on conflict do nothing;
