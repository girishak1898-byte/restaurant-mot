-- ============================================================
-- 0003_rls_policies.sql
-- Row Level Security policies for all tenant tables
-- ============================================================

-- ── Helper: get all org IDs the current user belongs to ──────
create or replace function public.user_organization_ids()
returns setof uuid language sql stable security definer as $$
  select organization_id
  from organization_memberships
  where user_id = auth.uid()
$$;

-- ── Helper: check user role in a specific org ─────────────────
create or replace function public.user_org_role(org_id uuid)
returns text language sql stable security definer as $$
  select role
  from organization_memberships
  where organization_id = org_id
    and user_id = auth.uid()
  limit 1
$$;

-- ============================================================
-- profiles
-- ============================================================
alter table profiles enable row level security;

create policy "profiles: select own"
  on profiles for select
  using (id = auth.uid());

create policy "profiles: insert own"
  on profiles for insert
  with check (id = auth.uid());

create policy "profiles: update own"
  on profiles for update
  using (id = auth.uid());

-- ============================================================
-- organizations
-- ============================================================
alter table organizations enable row level security;

create policy "organizations: select for members"
  on organizations for select
  using (id in (select public.user_organization_ids()));

create policy "organizations: update by owner or admin"
  on organizations for update
  using (public.user_org_role(id) in ('owner', 'admin'));

create policy "organizations: delete by owner"
  on organizations for delete
  using (public.user_org_role(id) = 'owner');

-- Note: INSERT handled server-side via service role key only.

-- ============================================================
-- organization_memberships
-- ============================================================
alter table organization_memberships enable row level security;

create policy "memberships: select own"
  on organization_memberships for select
  using (user_id = auth.uid()
      or organization_id in (select public.user_organization_ids()));

create policy "memberships: insert by owner or admin"
  on organization_memberships for insert
  with check (public.user_org_role(organization_id) in ('owner', 'admin'));

create policy "memberships: update by owner or admin"
  on organization_memberships for update
  using (public.user_org_role(organization_id) in ('owner', 'admin'));

create policy "memberships: delete by owner or admin"
  on organization_memberships for delete
  using (public.user_org_role(organization_id) in ('owner', 'admin'));

-- ============================================================
-- uploads
-- ============================================================
alter table uploads enable row level security;

create policy "uploads: select own org"
  on uploads for select
  using (organization_id in (select public.user_organization_ids()));

create policy "uploads: insert own org"
  on uploads for insert
  with check (organization_id in (select public.user_organization_ids()));

create policy "uploads: update own org"
  on uploads for update
  using (organization_id in (select public.user_organization_ids()));

create policy "uploads: delete by owner or admin"
  on uploads for delete
  using (public.user_org_role(organization_id) in ('owner', 'admin'));

-- ============================================================
-- import_jobs
-- ============================================================
alter table import_jobs enable row level security;

create policy "import_jobs: select own org"
  on import_jobs for select
  using (organization_id in (select public.user_organization_ids()));

create policy "import_jobs: insert own org"
  on import_jobs for insert
  with check (organization_id in (select public.user_organization_ids()));

create policy "import_jobs: update own org"
  on import_jobs for update
  using (organization_id in (select public.user_organization_ids()));

create policy "import_jobs: delete by owner or admin"
  on import_jobs for delete
  using (public.user_org_role(organization_id) in ('owner', 'admin'));

-- ============================================================
-- import_mappings
-- ============================================================
alter table import_mappings enable row level security;

create policy "import_mappings: select own org"
  on import_mappings for select
  using (organization_id in (select public.user_organization_ids()));

create policy "import_mappings: insert own org"
  on import_mappings for insert
  with check (organization_id in (select public.user_organization_ids()));

create policy "import_mappings: update own org"
  on import_mappings for update
  using (organization_id in (select public.user_organization_ids()));

create policy "import_mappings: delete by owner or admin"
  on import_mappings for delete
  using (public.user_org_role(organization_id) in ('owner', 'admin'));

-- ============================================================
-- restaurant_sales
-- ============================================================
alter table restaurant_sales enable row level security;

create policy "restaurant_sales: select own org"
  on restaurant_sales for select
  using (organization_id in (select public.user_organization_ids()));

create policy "restaurant_sales: insert own org"
  on restaurant_sales for insert
  with check (organization_id in (select public.user_organization_ids()));

create policy "restaurant_sales: update own org"
  on restaurant_sales for update
  using (organization_id in (select public.user_organization_ids()));

create policy "restaurant_sales: delete by owner or admin"
  on restaurant_sales for delete
  using (public.user_org_role(organization_id) in ('owner', 'admin'));

-- ============================================================
-- restaurant_menu_items
-- ============================================================
alter table restaurant_menu_items enable row level security;

create policy "restaurant_menu_items: select own org"
  on restaurant_menu_items for select
  using (organization_id in (select public.user_organization_ids()));

create policy "restaurant_menu_items: insert own org"
  on restaurant_menu_items for insert
  with check (organization_id in (select public.user_organization_ids()));

create policy "restaurant_menu_items: update own org"
  on restaurant_menu_items for update
  using (organization_id in (select public.user_organization_ids()));

create policy "restaurant_menu_items: delete by owner or admin"
  on restaurant_menu_items for delete
  using (public.user_org_role(organization_id) in ('owner', 'admin'));

-- ============================================================
-- restaurant_labour_shifts
-- ============================================================
alter table restaurant_labour_shifts enable row level security;

create policy "restaurant_labour_shifts: select own org"
  on restaurant_labour_shifts for select
  using (organization_id in (select public.user_organization_ids()));

create policy "restaurant_labour_shifts: insert own org"
  on restaurant_labour_shifts for insert
  with check (organization_id in (select public.user_organization_ids()));

create policy "restaurant_labour_shifts: update own org"
  on restaurant_labour_shifts for update
  using (organization_id in (select public.user_organization_ids()));

create policy "restaurant_labour_shifts: delete by owner or admin"
  on restaurant_labour_shifts for delete
  using (public.user_org_role(organization_id) in ('owner', 'admin'));
