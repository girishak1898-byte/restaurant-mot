-- ============================================================
-- 0006_plan_access.sql
-- Admin-controlled plan access: free / premium
-- Upgrade requests, notifications, and super admin support
-- ============================================================

-- ── Plan column on organizations ──────────────────────────────
alter table organizations
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'premium'));

-- ── Super admin flag on profiles ──────────────────────────────
alter table profiles
  add column if not exists is_super_admin boolean not null default false;

-- ── Helper: is the current user a super admin? ───────────────
create or replace function public.is_super_admin()
returns boolean language sql stable security definer as $$
  select coalesce(
    (select is_super_admin from profiles where id = auth.uid()),
    false
  )
$$;

-- ── upgrade_requests ─────────────────────────────────────────
create table if not exists upgrade_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  requested_plan  text not null default 'premium' check (requested_plan in ('premium')),
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table upgrade_requests enable row level security;

-- Members can see their own org's requests; super admins see all
create policy "upgrade_requests: select"
  on upgrade_requests for select
  using (
    organization_id in (select public.user_organization_ids())
    or public.is_super_admin()
  );

-- Members can submit requests for their own org
create policy "upgrade_requests: insert own org"
  on upgrade_requests for insert
  with check (
    organization_id in (select public.user_organization_ids())
    and user_id = auth.uid()
  );

-- Only super admin can update (approve / reject)
create policy "upgrade_requests: update super admin"
  on upgrade_requests for update
  using (public.is_super_admin());

-- ── notifications ─────────────────────────────────────────────
create table if not exists notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            text not null, -- 'plan_approved' | 'plan_rejected' | 'system'
  title           text not null,
  message         text not null,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "notifications: select own"
  on notifications for select
  using (user_id = auth.uid() or public.is_super_admin());

create policy "notifications: update own (mark read)"
  on notifications for update
  using (user_id = auth.uid());

-- Service role inserts notifications; super admin can too via RLS
create policy "notifications: insert"
  on notifications for insert
  with check (public.is_super_admin() or user_id = auth.uid());

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_upgrade_requests_org_id  on upgrade_requests(organization_id);
create index if not exists idx_upgrade_requests_user_id on upgrade_requests(user_id);
create index if not exists idx_upgrade_requests_status  on upgrade_requests(status);
create index if not exists idx_notifications_user_id    on notifications(user_id);
create index if not exists idx_notifications_unread      on notifications(user_id, read) where read = false;
