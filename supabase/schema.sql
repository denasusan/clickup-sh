-- =========================================================
-- TeamFlow - Supabase schema
-- Jalankan seluruh file ini di Supabase Dashboard > SQL Editor
-- =========================================================

-- ---------------------------------------------------------
-- 1. Tabel profiles (data anggota tim)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Semua anggota tim bisa lihat profile"
  on public.profiles for select
  to authenticated
  using (true);

create policy "User bisa update profile sendiri"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Otomatis buat baris profile setiap ada user baru signup (email/password / Google)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 2. Tabel tasks (kartu task di board)
-- ---------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  position double precision not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Anggota tim bisa lihat semua task"
  on public.tasks for select
  to authenticated
  using (true);

create policy "Anggota tim bisa buat task"
  on public.tasks for insert
  to authenticated
  with check (true);

create policy "Anggota tim bisa update task"
  on public.tasks for update
  to authenticated
  using (true);

create policy "Anggota tim bisa hapus task"
  on public.tasks for delete
  to authenticated
  using (true);

-- Auto-update kolom updated_at setiap kali task diubah
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------
-- 3. Aktifkan Realtime untuk tabel tasks
--    (supaya perubahan langsung tersiar live ke semua user)
-- ---------------------------------------------------------
alter publication supabase_realtime add table public.tasks;

-- ---------------------------------------------------------
-- 4. Index bantu untuk sorting board
-- ---------------------------------------------------------
create index if not exists tasks_status_position_idx on public.tasks (status, position);
