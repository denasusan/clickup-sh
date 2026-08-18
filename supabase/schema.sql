-- =========================================================
-- Flowspace - Supabase schema
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

drop policy if exists "Semua anggota tim bisa lihat profile" on public.profiles;
create policy "Semua anggota tim bisa lihat profile"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "User bisa update profile sendiri" on public.profiles;
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

-- Catatan: policy di bawah ini dibuat lalu langsung digantikan oleh policy
-- berbasis board/workspace di bagian 7. Dibiarkan (dengan guard drop-if-exists)
-- supaya file ini tetap jalan berurutan dari awal di project yang benar-benar baru.
drop policy if exists "Anggota tim bisa lihat semua task" on public.tasks;
create policy "Anggota tim bisa lihat semua task"
  on public.tasks for select
  to authenticated
  using (true);

drop policy if exists "Anggota tim bisa buat task" on public.tasks;
create policy "Anggota tim bisa buat task"
  on public.tasks for insert
  to authenticated
  with check (true);

drop policy if exists "Anggota tim bisa update task" on public.tasks;
create policy "Anggota tim bisa update task"
  on public.tasks for update
  to authenticated
  using (true);

drop policy if exists "Anggota tim bisa hapus task" on public.tasks;
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
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;

-- ---------------------------------------------------------
-- 4. Index bantu untuk sorting board
-- ---------------------------------------------------------
create index if not exists tasks_status_position_idx on public.tasks (status, position);

-- ---------------------------------------------------------
-- 5. Workspace (tim) & anggotanya - dukung multi-workspace
-- ---------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

-- Helper security definer supaya cek keanggotaan tidak bikin RLS rekursif
create or replace function public.is_workspace_member(_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- Catatan: "created_by = auth.uid()" sengaja ditambahkan di sini (bukan cuma
-- is_workspace_member) supaya pembuat workspace langsung bisa "melihat balik"
-- baris yang baru dia insert lewat .insert().select() - trigger yang menjadikan
-- dia owner di workspace_members baru jalan SETELAH RETURNING clause dievaluasi,
-- jadi kalau cuma mengandalkan is_workspace_member() akan gagal RLS di request
-- pertama (padahal datanya sudah benar).
drop policy if exists "Anggota bisa lihat workspace miliknya" on public.workspaces;
create policy "Anggota bisa lihat workspace miliknya"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id) or created_by = auth.uid());

drop policy if exists "User bisa buat workspace baru" on public.workspaces;
create policy "User bisa buat workspace baru"
  on public.workspaces for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Owner bisa update workspace" on public.workspaces;
create policy "Owner bisa update workspace"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_owner(id));

drop policy if exists "Owner bisa hapus workspace" on public.workspaces;
create policy "Owner bisa hapus workspace"
  on public.workspaces for delete
  to authenticated
  using (public.is_workspace_owner(id));

drop policy if exists "Anggota bisa lihat sesama anggota workspace" on public.workspace_members;
create policy "Anggota bisa lihat sesama anggota workspace"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Owner bisa undang anggota baru" on public.workspace_members;
create policy "Owner bisa undang anggota baru"
  on public.workspace_members for insert
  to authenticated
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists "Owner bisa keluarkan anggota, anggota bisa keluar sendiri" on public.workspace_members;
create policy "Owner bisa keluarkan anggota, anggota bisa keluar sendiri"
  on public.workspace_members for delete
  to authenticated
  using (public.is_workspace_owner(workspace_id) or user_id = auth.uid());

drop policy if exists "Owner bisa ubah role anggota" on public.workspace_members;
create policy "Owner bisa ubah role anggota"
  on public.workspace_members for update
  to authenticated
  using (public.is_workspace_owner(workspace_id));

-- Otomatis jadikan pembuat workspace sebagai owner pertama
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute procedure public.handle_new_workspace();

-- ---------------------------------------------------------
-- 6. Board - satu workspace bisa punya banyak board
-- ---------------------------------------------------------
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.boards enable row level security;

drop policy if exists "Anggota workspace bisa lihat board" on public.boards;
create policy "Anggota workspace bisa lihat board"
  on public.boards for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Anggota workspace bisa buat board" on public.boards;
create policy "Anggota workspace bisa buat board"
  on public.boards for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "Anggota workspace bisa update board" on public.boards;
create policy "Anggota workspace bisa update board"
  on public.boards for update
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Anggota workspace bisa hapus board" on public.boards;
create policy "Anggota workspace bisa hapus board"
  on public.boards for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

create index if not exists boards_workspace_id_idx on public.boards (workspace_id);

-- ---------------------------------------------------------
-- 7. Hubungkan task ke board & perbarui kebijakan akses task
--    (dulu semua anggota tim satu board global, sekarang per board/workspace)
-- ---------------------------------------------------------
alter table public.tasks add column if not exists board_id uuid references public.boards (id) on delete cascade;

drop policy if exists "Anggota tim bisa lihat semua task" on public.tasks;
drop policy if exists "Anggota tim bisa buat task" on public.tasks;
drop policy if exists "Anggota tim bisa update task" on public.tasks;
drop policy if exists "Anggota tim bisa hapus task" on public.tasks;

drop policy if exists "Anggota workspace bisa lihat task board-nya" on public.tasks;
create policy "Anggota workspace bisa lihat task board-nya"
  on public.tasks for select
  to authenticated
  using (
    exists (
      select 1 from public.boards b
      where b.id = tasks.board_id and public.is_workspace_member(b.workspace_id)
    )
  );

drop policy if exists "Anggota workspace bisa buat task di board-nya" on public.tasks;
create policy "Anggota workspace bisa buat task di board-nya"
  on public.tasks for insert
  to authenticated
  with check (
    exists (
      select 1 from public.boards b
      where b.id = tasks.board_id and public.is_workspace_member(b.workspace_id)
    )
  );

drop policy if exists "Anggota workspace bisa update task di board-nya" on public.tasks;
create policy "Anggota workspace bisa update task di board-nya"
  on public.tasks for update
  to authenticated
  using (
    exists (
      select 1 from public.boards b
      where b.id = tasks.board_id and public.is_workspace_member(b.workspace_id)
    )
  );

drop policy if exists "Anggota workspace bisa hapus task di board-nya" on public.tasks;
create policy "Anggota workspace bisa hapus task di board-nya"
  on public.tasks for delete
  to authenticated
  using (
    exists (
      select 1 from public.boards b
      where b.id = tasks.board_id and public.is_workspace_member(b.workspace_id)
    )
  );

create index if not exists tasks_board_id_idx on public.tasks (board_id);

-- ---------------------------------------------------------
-- 8. Komentar per task
-- ---------------------------------------------------------
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.task_comments enable row level security;

drop policy if exists "Anggota workspace bisa lihat komentar" on public.task_comments;
create policy "Anggota workspace bisa lihat komentar"
  on public.task_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      join public.boards b on b.id = t.board_id
      where t.id = task_comments.task_id and public.is_workspace_member(b.workspace_id)
    )
  );

drop policy if exists "Anggota workspace bisa tambah komentar" on public.task_comments;
create policy "Anggota workspace bisa tambah komentar"
  on public.task_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      join public.boards b on b.id = t.board_id
      where t.id = task_comments.task_id and public.is_workspace_member(b.workspace_id)
    )
  );

drop policy if exists "Penulis bisa hapus komentar sendiri" on public.task_comments;
create policy "Penulis bisa hapus komentar sendiri"
  on public.task_comments for delete
  to authenticated
  using (author_id = auth.uid());

create index if not exists task_comments_task_id_idx on public.task_comments (task_id, created_at);

-- ---------------------------------------------------------
-- 9. Realtime untuk tabel baru
-- ---------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'boards'
  ) then
    alter publication supabase_realtime add table public.boards;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_members'
  ) then
    alter publication supabase_realtime add table public.workspace_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_comments'
  ) then
    alter publication supabase_realtime add table public.task_comments;
  end if;
end $$;
