-- ── Phase 1: Purchases ────────────────────────────────────────────────────────
-- Tracks goods received from suppliers. Used to calculate actual COGS and
-- benchmark against theoretical food cost from menu data.

CREATE TABLE IF NOT EXISTS restaurant_purchases (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_upload_id    uuid REFERENCES uploads(id) ON DELETE CASCADE,
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
        organization_id IN (
          SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_purchases' AND policyname = 'purchases_org_insert'
  ) THEN
    CREATE POLICY purchases_org_insert ON restaurant_purchases
      FOR INSERT WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
        )
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

CREATE INDEX IF NOT EXISTS restaurant_purchases_org_date_idx
  ON restaurant_purchases (organization_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS restaurant_purchases_upload_idx
  ON restaurant_purchases (source_upload_id);


-- ── Phase 2: Inventory Counts ─────────────────────────────────────────────────
-- Periodic stock counts. Opening + Closing values per count period form the
-- bookends of the actual COGS calculation.

CREATE TABLE IF NOT EXISTS restaurant_inventory_counts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_upload_id    uuid REFERENCES uploads(id) ON DELETE CASCADE,
  count_date          date NOT NULL,
  item_name           text,
  item_category       text,
  outlet_name         text,
  opening_quantity    numeric(10, 4),
  closing_quantity    numeric(10, 4),
  unit_of_measure     text,
  unit_cost           numeric(12, 4),
  opening_value       numeric(12, 2),  -- opening_quantity × unit_cost
  closing_value       numeric(12, 2),  -- closing_quantity × unit_cost
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
        organization_id IN (
          SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_inventory_counts' AND policyname = 'inventory_org_insert'
  ) THEN
    CREATE POLICY inventory_org_insert ON restaurant_inventory_counts
      FOR INSERT WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
        )
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

CREATE INDEX IF NOT EXISTS restaurant_inventory_counts_org_date_idx
  ON restaurant_inventory_counts (organization_id, count_date DESC);

CREATE INDEX IF NOT EXISTS restaurant_inventory_counts_upload_idx
  ON restaurant_inventory_counts (source_upload_id);


-- ── Phase 3: Waste Adjustments ────────────────────────────────────────────────
-- Records actual waste so it can be separated from theoretical loss.
-- Feeds into the variance between theoretical and actual food cost.

CREATE TABLE IF NOT EXISTS restaurant_waste_adjustments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_upload_id    uuid REFERENCES uploads(id) ON DELETE CASCADE,
  waste_date          date NOT NULL,
  item_name           text,
  item_category       text,
  outlet_name         text,
  quantity_wasted     numeric(10, 4),
  unit_of_measure     text,
  unit_cost           numeric(12, 4),
  estimated_cost      numeric(12, 2),  -- quantity_wasted × unit_cost
  waste_reason        text,            -- Spoilage, Over-prep, Quality, Breakage, etc.
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurant_waste_adjustments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_waste_adjustments' AND policyname = 'waste_org_select'
  ) THEN
    CREATE POLICY waste_org_select ON restaurant_waste_adjustments
      FOR SELECT USING (
        organization_id IN (
          SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_waste_adjustments' AND policyname = 'waste_org_insert'
  ) THEN
    CREATE POLICY waste_org_insert ON restaurant_waste_adjustments
      FOR INSERT WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
        )
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

CREATE INDEX IF NOT EXISTS restaurant_waste_adjustments_org_date_idx
  ON restaurant_waste_adjustments (organization_id, waste_date DESC);

CREATE INDEX IF NOT EXISTS restaurant_waste_adjustments_upload_idx
  ON restaurant_waste_adjustments (source_upload_id);
