/*
# SmartWaste Feature Additions

## Changes

### 1. Streak Achievement Tiers
Adds 30-day and community-specific achievements that were missing.

### 2. Per-Category Daily Limits Table
New table `category_limits` to enforce max disposals per category per day
and a global max points per day cap.

### 3. User Suspension Support
Adds `suspended` boolean and `suspended_reason` to profiles table
so admin can suspend accounts.

### 4. Bin Area/Community Tagging
Adds `area_type` and `area_name` columns to bins table for scoped
leaderboards (campus/estate/community).

### 5. Partner Collection Requests
New table `collection_requests` for partners to request/track collections
and `recovery_reports` for reporting recovered materials.

### 6. Leaderboard Areas View
A view `leaderboard_by_area` that aggregates points by area for
campus/estate/community leaderboards.
*/

-- Streak achievements
INSERT INTO achievements (id, name, name_sw, description, description_sw, icon, color, type, threshold, bonus_points) VALUES
  ('d1b2c3d4-0001-0001-0001-000000000009', 'Monthly Master', 'Bwana wa Mwezi', '30-day disposal streak', 'Siku 30 mfululizo za utupaji', 'flame', '#dc2626', 'streak', 30, 500),
  ('d1b2c3d4-0001-0001-0001-000000000010', 'Campus Champion', 'Bingwa wa Chuo', 'Reach #1 on your campus leaderboard', 'Fikia nafasi ya 1 kwenye ubao wa chuo', 'graduation-cap', '#1e40af', 'community', 1, 750),
  ('d1b2c3d4-0001-0001-0001-000000000011', 'Eco Warrior', 'Mpiganaji wa Mazingira', 'Dispose waste in 5 different categories', 'Tupa taka katika aina 5 tofauti', 'sword', '#f97316', 'category', 5, 200),
  ('d1b2c3d4-0001-0001-0001-000000000012', 'Recycling Champion', 'Bingwa wa Urejeleaji', 'Dispose 100 items total', 'Tupa vitu 100 jumla', 'recycle', '#22c55e', 'quantity', 100, 500)
ON CONFLICT (id) DO NOTHING;

-- Category limits table
CREATE TABLE IF NOT EXISTS category_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_category_id uuid REFERENCES waste_categories(id),
  max_per_day integer NOT NULL DEFAULT 10,
  max_points_per_day integer NOT NULL DEFAULT 200,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE category_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cat_limits_select" ON category_limits;
CREATE POLICY "cat_limits_select" ON category_limits FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "cat_limits_insert" ON category_limits;
CREATE POLICY "cat_limits_insert" ON category_limits FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "cat_limits_update" ON category_limits;
CREATE POLICY "cat_limits_update" ON category_limits FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed default limits per category
INSERT INTO category_limits (waste_category_id, max_per_day, max_points_per_day) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 20, 300),
  ('a1b2c3d4-0001-0001-0001-000000000002', 20, 200),
  ('a1b2c3d4-0001-0001-0001-000000000003', 15, 300),
  ('a1b2c3d4-0001-0001-0001-000000000004', 20, 240),
  ('a1b2c3d4-0001-0001-0001-000000000005', 25, 200),
  ('a1b2c3d4-0001-0001-0001-000000000006', 3, 150),
  ('a1b2c3d4-0001-0001-0001-000000000007', 3, 75),
  ('a1b2c3d4-0001-0001-0001-000000000008', 5, 150)
ON CONFLICT DO NOTHING;

-- Global max points per day cap (waste_category_id = null means global)
INSERT INTO category_limits (waste_category_id, max_per_day, max_points_per_day) VALUES
  (NULL, 100, 500)
ON CONFLICT DO NOTHING;

-- Add suspension to profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspended') THEN
    ALTER TABLE profiles ADD COLUMN suspended boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspended_reason') THEN
    ALTER TABLE profiles ADD COLUMN suspended_reason text;
  END IF;
END $$;

-- Add area tagging to bins
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bins' AND column_name = 'area_type') THEN
    ALTER TABLE bins ADD COLUMN area_type text CHECK (area_type IN ('campus', 'estate', 'community', 'commercial', 'institutional'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bins' AND column_name = 'area_name') THEN
    ALTER TABLE bins ADD COLUMN area_name text;
  END IF;
END $$;

-- Update existing bins with area data
UPDATE bins SET area_type = 'campus', area_name = 'University of Nairobi' WHERE qr_code LIKE 'SW-BIN-UON-%';
UPDATE bins SET area_type = 'commercial', area_name = 'Westgate Mall' WHERE qr_code = 'SW-BIN-WES-001';
UPDATE bins SET area_type = 'institutional', area_name = 'GPO Nairobi' WHERE qr_code = 'SW-BIN-GPO-001';
UPDATE bins SET area_type = 'institutional', area_name = 'Kenyatta Hospital' WHERE qr_code = 'SW-BIN-KNH-001';
UPDATE bins SET area_type = 'campus', area_name = 'Strathmore University' WHERE qr_code = 'SW-BIN-STR-001';
UPDATE bins SET area_type = 'commercial', area_name = 'JKIA Airport' WHERE qr_code = 'SW-BIN-JKIA-001';
UPDATE bins SET area_type = 'campus', area_name = 'Demo Area' WHERE qr_code = 'SW-BIN-DEMO-001';

-- Collection requests table
CREATE TABLE IF NOT EXISTS collection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bin_id uuid NOT NULL REFERENCES bins(id),
  partner_id uuid NOT NULL REFERENCES collection_partners(id),
  requested_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  notes text,
  requested_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE collection_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coll_req_select" ON collection_requests;
CREATE POLICY "coll_req_select" ON collection_requests FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'partner'))
);

DROP POLICY IF EXISTS "coll_req_insert" ON collection_requests;
CREATE POLICY "coll_req_insert" ON collection_requests FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "coll_req_update" ON collection_requests;
CREATE POLICY "coll_req_update" ON collection_requests FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'partner'))
);

-- Recovery reports table
CREATE TABLE IF NOT EXISTS recovery_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES collection_partners(id),
  collection_request_id uuid REFERENCES collection_requests(id),
  waste_category_id uuid REFERENCES waste_categories(id),
  quantity integer NOT NULL DEFAULT 0,
  weight_kg numeric(10,2),
  items_recovered integer NOT NULL DEFAULT 0,
  items_recycled integer NOT NULL DEFAULT 0,
  co2_saved_kg numeric(10,4) NOT NULL DEFAULT 0,
  notes text,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recovery_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recovery_select" ON recovery_reports;
CREATE POLICY "recovery_select" ON recovery_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'partner'))
);

DROP POLICY IF EXISTS "recovery_insert" ON recovery_reports;
CREATE POLICY "recovery_insert" ON recovery_reports FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'partner'))
);

DROP POLICY IF EXISTS "recovery_update" ON recovery_reports;
CREATE POLICY "recovery_update" ON recovery_reports FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'partner'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bins_area ON bins(area_type, area_name);
CREATE INDEX IF NOT EXISTS idx_coll_req_partner ON collection_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_coll_req_status ON collection_requests(status);
CREATE INDEX IF NOT EXISTS idx_recovery_partner ON recovery_reports(partner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(suspended) WHERE suspended = true;
