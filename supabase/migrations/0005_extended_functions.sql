-- ============================================================
-- 0005_extended_functions.sql
-- Additional aggregation functions for prime cost and channel
-- margin analysis.
-- ============================================================

-- ── 1. Prime cost by month ────────────────────────────────────
-- Combines food cost (from sales × menu item cost) and labour
-- cost per calendar month to produce the prime cost trend.

create or replace function get_prime_cost_by_month(p_org_id uuid)
returns table(
  month          text,
  net_revenue    numeric,
  food_cost      numeric,
  labour_cost    numeric,
  prime_cost     numeric,
  prime_cost_pct numeric
)
language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;

  return query
  with monthly_sales as (
    select
      date_trunc('month', s.sale_date)                              as month_ts,
      to_char(date_trunc('month', s.sale_date), 'Mon YYYY')        as month_label,
      coalesce(sum(s.net_amount), 0)                                as net_revenue,
      coalesce(sum(
        coalesce(mi.food_cost_per_item, 0) * coalesce(s.quantity, 1)
      ), 0)                                                       as food_cost
    from restaurant_sales s
    left join restaurant_menu_items mi
           on lower(trim(s.item_name)) = lower(trim(mi.item_name))
          and mi.organization_id = p_org_id
    where s.organization_id = p_org_id
    group by month_ts, month_label
  ),
  monthly_labour as (
    select
      date_trunc('month', ls.shift_date)   as month_ts,
      coalesce(sum(ls.labour_cost), 0)     as labour_cost
    from restaurant_labour_shifts ls
    where ls.organization_id = p_org_id
    group by month_ts
  )
  select
    ms.month_label                                    as month,
    ms.net_revenue,
    ms.food_cost,
    coalesce(ml.labour_cost, 0)                       as labour_cost,
    ms.food_cost + coalesce(ml.labour_cost, 0)        as prime_cost,
    case
      when ms.net_revenue > 0
      then round(
        (ms.food_cost + coalesce(ml.labour_cost, 0)) / ms.net_revenue * 100,
        1
      )
      else 0
    end                                               as prime_cost_pct
  from monthly_sales ms
  left join monthly_labour ml on ms.month_ts = ml.month_ts
  order by ms.month_ts;
end;
$$;

-- ── 2. Channel margin ─────────────────────────────────────────
-- Revenue, discount, food cost, and gross margin % per sales
-- channel so operators can compare delivery-platform profitability.

create or replace function get_channel_margin(p_org_id uuid)
returns table(
  channel      text,
  net_revenue  numeric,
  gross_revenue numeric,
  discount     numeric,
  discount_pct numeric,
  food_cost    numeric,
  margin_pct   numeric
)
language plpgsql stable security definer as $$
begin
  if not check_org_access(p_org_id) then
    raise exception 'access denied';
  end if;

  return query
  select
    s.channel,
    coalesce(sum(s.net_amount), 0)                              as net_revenue,
    coalesce(sum(s.gross_amount), 0)                            as gross_revenue,
    coalesce(sum(s.discount_amount), 0)                         as discount,
    case
      when coalesce(sum(s.gross_amount), 0) > 0
      then round(
        coalesce(sum(s.discount_amount), 0) / sum(s.gross_amount) * 100,
        1
      )
      else 0
    end                                                         as discount_pct,
    coalesce(sum(
      coalesce(mi.food_cost_per_item, 0) * coalesce(s.quantity, 1)
    ), 0)                                                       as food_cost,
    case
      when coalesce(sum(s.net_amount), 0) > 0
      then round(
        (coalesce(sum(s.net_amount), 0) -
         coalesce(sum(coalesce(mi.food_cost_per_item, 0) * coalesce(s.quantity, 1)), 0))
        / sum(s.net_amount) * 100,
        1
      )
      else 0
    end                                                         as margin_pct
  from restaurant_sales s
  left join restaurant_menu_items mi
         on lower(trim(s.item_name)) = lower(trim(mi.item_name))
        and mi.organization_id = p_org_id
  where s.organization_id = p_org_id
    and s.channel is not null
    and s.channel != ''
  group by s.channel
  order by net_revenue desc;
end;
$$;
