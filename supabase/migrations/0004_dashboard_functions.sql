-- ============================================================
-- 0004_dashboard_functions.sql
-- Aggregation functions for the restaurant dashboard.
-- All functions verify the caller is a member of the requested org.
-- ============================================================

-- ── Shared access guard ───────────────────────────────────────
create or replace function check_org_access(p_org_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from organization_memberships
    where organization_id = p_org_id
      and user_id = auth.uid()
  )
$$;

-- ── 1. Sales overview totals ──────────────────────────────────
create or replace function get_sales_overview(p_org_id uuid)
returns table(
  total_net      numeric,
  total_gross    numeric,
  total_discount numeric,
  order_count    bigint
) language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;
  return query
  select
    coalesce(sum(net_amount),      0) as total_net,
    coalesce(sum(gross_amount),    0) as total_gross,
    coalesce(sum(discount_amount), 0) as total_discount,
    count(distinct case when order_id is not null then order_id end) as order_count
  from restaurant_sales
  where organization_id = p_org_id;
end;
$$;

-- ── 2. Revenue by month ───────────────────────────────────────
create or replace function get_revenue_by_month(p_org_id uuid)
returns table(month text, revenue numeric)
language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;
  return query
  select
    to_char(date_trunc('month', sale_date), 'Mon YYYY') as month,
    coalesce(sum(net_amount), 0)                        as revenue
  from restaurant_sales
  where organization_id = p_org_id
  group by date_trunc('month', sale_date)
  order by date_trunc('month', sale_date);
end;
$$;

-- ── 3. Revenue by channel ─────────────────────────────────────
create or replace function get_revenue_by_channel(p_org_id uuid)
returns table(channel text, revenue numeric)
language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;
  return query
  select
    coalesce(s.channel, 'Unknown') as channel,
    coalesce(sum(s.net_amount), 0) as revenue
  from restaurant_sales s
  where s.organization_id = p_org_id
  group by s.channel
  order by revenue desc;
end;
$$;

-- ── 4. Revenue by outlet ──────────────────────────────────────
create or replace function get_revenue_by_outlet(p_org_id uuid)
returns table(outlet_name text, revenue numeric)
language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;
  return query
  select
    coalesce(s.outlet_name, 'Unknown') as outlet_name,
    coalesce(sum(s.net_amount), 0)     as revenue
  from restaurant_sales s
  where s.organization_id = p_org_id
  group by s.outlet_name
  order by revenue desc;
end;
$$;

-- ── 5. Top 10 items by revenue ────────────────────────────────
create or replace function get_top_items_by_revenue(p_org_id uuid)
returns table(item_name text, revenue numeric)
language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;
  return query
  select
    s.item_name,
    coalesce(sum(s.net_amount), 0) as revenue
  from restaurant_sales s
  where s.organization_id = p_org_id
    and s.item_name is not null
  group by s.item_name
  order by revenue desc
  limit 10;
end;
$$;

-- ── 6. Gross margin by category ───────────────────────────────
-- Joins sales → menu_items on item_name (case-insensitive) to get food cost.
-- If no menu item data is uploaded, food_cost = 0 and margin_pct = 0.
create or replace function get_margin_by_category(p_org_id uuid)
returns table(
  category   text,
  revenue    numeric,
  food_cost  numeric,
  margin_pct numeric
) language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;
  return query
  select
    coalesce(s.item_category, 'Uncategorised') as category,
    coalesce(sum(s.net_amount), 0)             as revenue,
    coalesce(sum(
      coalesce(s.quantity, 1) * coalesce(m.food_cost_per_item, 0)
    ), 0)                                      as food_cost,
    case
      when coalesce(sum(s.net_amount), 0) > 0 then
        round(
          (coalesce(sum(s.net_amount), 0)
           - coalesce(sum(coalesce(s.quantity, 1) * coalesce(m.food_cost_per_item, 0)), 0))
          / coalesce(sum(s.net_amount), 0) * 100,
          1
        )
      else 0
    end                                        as margin_pct
  from restaurant_sales s
  left join restaurant_menu_items m
    on lower(trim(s.item_name)) = lower(trim(m.item_name))
   and m.organization_id = s.organization_id
  where s.organization_id = p_org_id
    and s.item_category is not null
  group by s.item_category
  order by revenue desc;
end;
$$;

-- ── 7. Top 10 items by gross margin ──────────────────────────
create or replace function get_top_items_by_margin(p_org_id uuid)
returns table(
  item_name  text,
  revenue    numeric,
  margin_pct numeric
) language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;
  return query
  select
    s.item_name,
    coalesce(sum(s.net_amount), 0) as revenue,
    case
      when coalesce(sum(s.net_amount), 0) > 0 then
        round(
          (coalesce(sum(s.net_amount), 0)
           - coalesce(sum(coalesce(s.quantity, 1) * coalesce(m.food_cost_per_item, 0)), 0))
          / coalesce(sum(s.net_amount), 0) * 100,
          1
        )
      else 0
    end as margin_pct
  from restaurant_sales s
  left join restaurant_menu_items m
    on lower(trim(s.item_name)) = lower(trim(m.item_name))
   and m.organization_id = s.organization_id
  where s.organization_id = p_org_id
    and s.item_name is not null
  group by s.item_name
  having coalesce(sum(s.net_amount), 0) > 0
  order by margin_pct desc
  limit 10;
end;
$$;

-- ── 8. Labour overview ────────────────────────────────────────
create or replace function get_labour_overview(p_org_id uuid)
returns table(
  total_labour numeric,
  total_hours  numeric,
  shift_count  bigint
) language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;
  return query
  select
    coalesce(sum(labour_cost),  0) as total_labour,
    coalesce(sum(hours_worked), 0) as total_hours,
    count(*)                       as shift_count
  from restaurant_labour_shifts
  where organization_id = p_org_id;
end;
$$;

-- ── 9. Labour cost by outlet ──────────────────────────────────
create or replace function get_labour_by_outlet(p_org_id uuid)
returns table(outlet_name text, labour_cost numeric)
language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;
  return query
  select
    coalesce(l.outlet_name, 'Unknown') as outlet_name,
    coalesce(sum(l.labour_cost), 0)    as labour_cost
  from restaurant_labour_shifts l
  where l.organization_id = p_org_id
  group by l.outlet_name
  order by labour_cost desc;
end;
$$;
