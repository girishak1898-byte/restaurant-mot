-- ============================================================
-- 0009_apply_unapplied.sql
-- Idempotent catch-up migration — safe to run even if 0006/0007/0008
-- were partially applied. Run this in the Supabase SQL Editor.
-- ============================================================

-- ── From 0006: plan column + is_super_admin flag ─────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'premium'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- ── From 0007: sheet_name on import_jobs ─────────────────────
-- This is the critical column for multi-sheet workbook tracking.
-- Without it the My Files query fails entirely (PostgREST schema cache error).
ALTER TABLE import_jobs
  ADD COLUMN IF NOT EXISTS sheet_name text;

-- ── From 0008: cost-control tables ───────────────────────────

CREATE TABLE IF NOT EXISTS restaurant_purchases (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_upload_id    uuid REFERENCES uploads(id) ON DELETE SET NULL,
  purchase_date       date NOT NULL,
  supplier            text,
  item_name           text,
  item_category       text,
  outlet_name         text,
  quantity            numeric(10, 4),
  unit_of_measure     text,
  unit_cost           numeric(12, 4),
  total_cost          numeric(12, 2),
  invoice_reference   text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurant_purchases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_purchases' AND policyname = 'purchases_org_select'
  ) THEN
    CREATE POLICY purchases_org_select ON restaurant_purchases
      FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_purchases' AND policyname = 'purchases_org_insert'
  ) THEN
    CREATE POLICY purchases_org_insert ON restaurant_purchases
      FOR INSERT WITH CHECK (
        organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_purchases' AND policyname = 'purchases_org_delete'
  ) THEN
    CREATE POLICY purchases_org_delete ON restaurant_purchases
      FOR DELETE USING (
        organization_id IN (
          SELECT organization_id FROM organization_memberships
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS restaurant_purchases_org_date_idx ON restaurant_purchases (organization_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS restaurant_purchases_upload_idx   ON restaurant_purchases (source_upload_id);


CREATE TABLE IF NOT EXISTS restaurant_inventory_counts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_upload_id    uuid REFERENCES uploads(id) ON DELETE SET NULL,
  count_date          date NOT NULL,
  item_name           text,
  item_category       text,
  outlet_name         text,
  opening_quantity    numeric(10, 4),
  closing_quantity    numeric(10, 4),
  unit_of_measure     text,
  unit_cost           numeric(12, 4),
  opening_value       numeric(12, 2),
  closing_value       numeric(12, 2),
  count_reference     text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurant_inventory_counts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_inventory_counts' AND policyname = 'inventory_org_select'
  ) THEN
    CREATE POLICY inventory_org_select ON restaurant_inventory_counts
      FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_inventory_counts' AND policyname = 'inventory_org_insert'
  ) THEN
    CREATE POLICY inventory_org_insert ON restaurant_inventory_counts
      FOR INSERT WITH CHECK (
        organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_inventory_counts' AND policyname = 'inventory_org_delete'
  ) THEN
    CREATE POLICY inventory_org_delete ON restaurant_inventory_counts
      FOR DELETE USING (
        organization_id IN (
          SELECT organization_id FROM organization_memberships
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS restaurant_inventory_counts_org_date_idx ON restaurant_inventory_counts (organization_id, count_date DESC);
CREATE INDEX IF NOT EXISTS restaurant_inventory_counts_upload_idx   ON restaurant_inventory_counts (source_upload_id);


CREATE TABLE IF NOT EXISTS restaurant_waste_adjustments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_upload_id    uuid REFERENCES uploads(id) ON DELETE SET NULL,
  waste_date          date NOT NULL,
  item_name           text,
  item_category       text,
  outlet_name         text,
  quantity_wasted     numeric(10, 4),
  unit_of_measure     text,
  unit_cost           numeric(12, 4),
  estimated_cost      numeric(12, 2),
  waste_reason        text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurant_waste_adjustments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_waste_adjustments' AND policyname = 'waste_org_select'
  ) THEN
    CREATE POLICY waste_org_select ON restaurant_waste_adjustments
      FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_waste_adjustments' AND policyname = 'waste_org_insert'
  ) THEN
    CREATE POLICY waste_org_insert ON restaurant_waste_adjustments
      FOR INSERT WITH CHECK (
        organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_waste_adjustments' AND policyname = 'waste_org_delete'
  ) THEN
    CREATE POLICY waste_org_delete ON restaurant_waste_adjustments
      FOR DELETE USING (
        organization_id IN (
          SELECT organization_id FROM organization_memberships
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS restaurant_waste_adjustments_org_date_idx ON restaurant_waste_adjustments (organization_id, waste_date DESC);
CREATE INDEX IF NOT EXISTS restaurant_waste_adjustments_upload_idx   ON restaurant_waste_adjustments (source_upload_id);


-- ── Reload PostgREST schema cache immediately ─────────────────
-- Forces PostgREST to pick up the new sheet_name column without waiting
-- for its automatic periodic reload (usually 60 s).
NOTIFY pgrst, 'reload schema';
