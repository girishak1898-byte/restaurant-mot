-- ============================================================
-- 0001_common_tables.sql
-- Common tables shared across all modules (restaurant, property)
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
-- Extends auth.users with display info.
-- Created automatically via trigger on new user signup.
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── organizations ─────────────────────────────────────────────
create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  mode       text not null default 'restaurant' check (mode in ('restaurant', 'property')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── organization_memberships ──────────────────────────────────
create table if not exists organization_memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ── uploads ──────────────────────────────────────────────────
create table if not exists uploads (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  uploaded_by     uuid not null references auth.users(id),
  file_name       text not null,
  storage_path    text not null,
  file_type       text not null check (file_type in ('csv', 'xlsx')),
  file_size_bytes bigint,
  status          text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── import_jobs ───────────────────────────────────────────────
create table if not exists import_jobs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  upload_id       uuid not null references uploads(id) on delete cascade,
  target_table    text not null,
  rows_total      int default 0,
  rows_imported   int default 0,
  rows_failed     int default 0,
  error_log       jsonb,
  status          text not null default 'pending' check (status in ('pending', 'running', 'done', 'error')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── import_mappings ───────────────────────────────────────────
-- Saved column→field maps so users don't re-map every time.
create table if not exists import_mappings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  target_table    text not null,
  mapping_name    text not null,
  column_map      jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── indexes ───────────────────────────────────────────────────
create index if not exists idx_org_memberships_user_id    on organization_memberships(user_id);
create index if not exists idx_org_memberships_org_id     on organization_memberships(organization_id);
create index if not exists idx_uploads_organization_id    on uploads(organization_id);
create index if not exists idx_import_jobs_organization_id on import_jobs(organization_id);
create index if not exists idx_import_jobs_upload_id      on import_jobs(upload_id);
create index if not exists idx_import_mappings_org_table  on import_mappings(organization_id, target_table);
