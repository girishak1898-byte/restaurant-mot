-- ============================================================
-- 0002_restaurant_tables.sql
-- Restaurant-module specific tables
-- ============================================================

-- ── restaurant_sales ─────────────────────────────────────────
create table if not exists restaurant_sales (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  source_upload_id uuid references uploads(id) on delete set null,
  sale_date        date not null,
  order_id         text,
  outlet_name      text,
  channel          text,
  item_name        text,
  item_category    text,
  quantity         numeric,
  gross_amount     numeric(12,2),
  discount_amount  numeric(12,2),
  net_amount       numeric(12,2),
  payment_method   text,
  customer_type    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── restaurant_menu_items ─────────────────────────────────────
create table if not exists restaurant_menu_items (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations(id) on delete cascade,
  source_upload_id   uuid references uploads(id) on delete set null,
  item_name          text not null,
  item_category      text,
  base_price         numeric(12,2),
  food_cost_per_item numeric(12,2),
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── restaurant_labour_shifts ──────────────────────────────────
create table if not exists restaurant_labour_shifts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  source_upload_id uuid references uploads(id) on delete set null,
  shift_date       date not null,
  staff_name       text,
  role             text,
  outlet_name      text,
  hours_worked     numeric(6,2),
  hourly_rate      numeric(10,2),
  labour_cost      numeric(12,2),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── indexes ───────────────────────────────────────────────────
create index if not exists idx_sales_org_id         on restaurant_sales(organization_id);
create index if not exists idx_sales_sale_date       on restaurant_sales(sale_date);
create index if not exists idx_sales_upload_id       on restaurant_sales(source_upload_id);
create index if not exists idx_sales_outlet          on restaurant_sales(organization_id, outlet_name);
create index if not exists idx_sales_item_category   on restaurant_sales(organization_id, item_category);

create index if not exists idx_menu_org_id           on restaurant_menu_items(organization_id);
create index if not exists idx_menu_upload_id        on restaurant_menu_items(source_upload_id);
create index if not exists idx_menu_category         on restaurant_menu_items(organization_id, item_category);

create index if not exists idx_labour_org_id         on restaurant_labour_shifts(organization_id);
create index if not exists idx_labour_shift_date     on restaurant_labour_shifts(shift_date);
create index if not exists idx_labour_upload_id      on restaurant_labour_shifts(source_upload_id);
create index if not exists idx_labour_outlet         on restaurant_labour_shifts(organization_id, outlet_name);
