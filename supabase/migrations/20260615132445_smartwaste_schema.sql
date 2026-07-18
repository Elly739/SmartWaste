/*
# SmartWaste Platform - Complete Database Schema

## Overview
Full schema for SmartWaste: a behavior-driven waste management platform that rewards users for responsible disposal.

## Tables Created

### 1. profiles
Extends auth.users with display info, role, streak data, and totals.
- id: references auth.users(id)
- username, full_name, avatar_url, phone
- role: 'user' | 'admin' | 'partner'
- language: 'en' | 'sw'
- total_points, lifetime_points, current_streak, longest_streak
- last_disposal_date for streak calculation

### 2. waste_categories
Types of waste the platform accepts.
- name, description, icon, color
- points_per_unit: default reward per disposal
- co2_saved_per_unit: kg CO2 equivalent
- is_active

### 3. collection_partners
Companies/organizations that collect specific waste types.
- name, description, logo_url, contact_email, contact_phone
- waste_category_id: primary waste type this partner handles
- is_active

### 4. bins
Physical collection points with QR codes.
- qr_code: unique identifier scanned by users
- location_name, latitude, longitude
- waste_category_id, partner_id
- is_active, total_collections

### 5. disposals
Each waste submission event.
- user_id, bin_id, waste_category_id
- points_earned
- is_flagged, flag_reason
- location_lat, location_lng for validation

### 6. points_transactions
Ledger of all point changes (earn/redeem/adjust/expire).
- user_id, disposal_id
- type: 'earn' | 'redeem' | 'bonus' | 'adjust' | 'expire'
- amount, balance_after, description

### 7. rewards
Available rewards users can redeem points for.
- title, description, image_url, partner_id
- points_cost
- category: 'coupon' | 'discount' | 'merchandise' | 'cash'
- stock_count (-1 = unlimited)
- is_active, expires_at

### 8. reward_redemptions
Records of rewards redeemed by users.
- user_id, reward_id, points_spent
- redemption_code (unique)
- status: 'pending' | 'fulfilled' | 'expired' | 'cancelled'

### 9. achievements
Badge/achievement definitions.
- name, description, icon, color
- type: 'streak' | 'quantity' | 'category' | 'community' | 'special'
- threshold: how many actions needed to unlock

### 10. user_achievements
Tracks which users have earned which achievements.
- user_id, achievement_id
- earned_at

### 11. challenges
Community or individual challenges.
- title, description, category, target_count
- start_date, end_date
- reward_points
- is_active

### 12. challenge_participations
Users participating in challenges.
- user_id, challenge_id, progress, completed_at

### 13. fraud_flags
Flagged suspicious disposal activity.
- user_id, disposal_id
- flag_type: 'rate_limit' | 'location' | 'pattern' | 'manual'
- severity: 'low' | 'medium' | 'high'
- status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
- reviewed_by, reviewed_at, resolution_notes

## Security
- RLS enabled on all tables
- Users can only read/write their own data
- Admins can access all data via role check
- Partners can view their assigned bins and collections
- Bins and waste_categories are publicly readable (anon)
- Profiles readable by authenticated users, writable by owner
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'partner')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'sw')),
  total_points integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_disposal_date date,
  partner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- WASTE CATEGORIES
CREATE TABLE IF NOT EXISTS waste_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_sw text,
  description text,
  description_sw text,
  icon text NOT NULL DEFAULT 'trash',
  color text NOT NULL DEFAULT '#22c55e',
  points_per_unit integer NOT NULL DEFAULT 10,
  co2_saved_per_unit numeric(10,4) NOT NULL DEFAULT 0.1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE waste_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waste_categories_select" ON waste_categories;
CREATE POLICY "waste_categories_select" ON waste_categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "waste_categories_insert" ON waste_categories;
CREATE POLICY "waste_categories_insert" ON waste_categories FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "waste_categories_update" ON waste_categories;
CREATE POLICY "waste_categories_update" ON waste_categories FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "waste_categories_delete" ON waste_categories;
CREATE POLICY "waste_categories_delete" ON waste_categories FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- COLLECTION PARTNERS
CREATE TABLE IF NOT EXISTS collection_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  contact_email text,
  contact_phone text,
  website_url text,
  is_active boolean NOT NULL DEFAULT true,
  total_collections integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE collection_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners_select" ON collection_partners;
CREATE POLICY "partners_select" ON collection_partners FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "partners_insert" ON collection_partners;
CREATE POLICY "partners_insert" ON collection_partners FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "partners_update" ON collection_partners;
CREATE POLICY "partners_update" ON collection_partners FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'partner'))
);

DROP POLICY IF EXISTS "partners_delete" ON collection_partners;
CREATE POLICY "partners_delete" ON collection_partners FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- BINS
CREATE TABLE IF NOT EXISTS bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code text UNIQUE NOT NULL,
  location_name text NOT NULL,
  location_description text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  waste_category_id uuid REFERENCES waste_categories(id),
  partner_id uuid REFERENCES collection_partners(id),
  is_active boolean NOT NULL DEFAULT true,
  total_collections integer NOT NULL DEFAULT 0,
  last_collection_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bins_select" ON bins;
CREATE POLICY "bins_select" ON bins FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "bins_insert" ON bins;
CREATE POLICY "bins_insert" ON bins FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "bins_update" ON bins;
CREATE POLICY "bins_update" ON bins FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'partner'))
);

DROP POLICY IF EXISTS "bins_delete" ON bins;
CREATE POLICY "bins_delete" ON bins FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- DISPOSALS
CREATE TABLE IF NOT EXISTS disposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bin_id uuid NOT NULL REFERENCES bins(id),
  waste_category_id uuid NOT NULL REFERENCES waste_categories(id),
  points_earned integer NOT NULL DEFAULT 0,
  is_flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE disposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disposals_select" ON disposals;
CREATE POLICY "disposals_select" ON disposals FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'partner'))
);

DROP POLICY IF EXISTS "disposals_insert" ON disposals;
CREATE POLICY "disposals_insert" ON disposals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "disposals_update" ON disposals;
CREATE POLICY "disposals_update" ON disposals FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "disposals_delete" ON disposals;
CREATE POLICY "disposals_delete" ON disposals FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POINTS TRANSACTIONS
CREATE TABLE IF NOT EXISTS points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  disposal_id uuid REFERENCES disposals(id),
  type text NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'adjust', 'expire')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "points_tx_select" ON points_transactions;
CREATE POLICY "points_tx_select" ON points_transactions FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "points_tx_insert" ON points_transactions;
CREATE POLICY "points_tx_insert" ON points_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "points_tx_update" ON points_transactions;
CREATE POLICY "points_tx_update" ON points_transactions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "points_tx_delete" ON points_transactions;
CREATE POLICY "points_tx_delete" ON points_transactions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- REWARDS
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  partner_id uuid REFERENCES collection_partners(id),
  points_cost integer NOT NULL,
  category text NOT NULL DEFAULT 'coupon' CHECK (category IN ('coupon', 'discount', 'merchandise', 'cash', 'partner')),
  stock_count integer NOT NULL DEFAULT -1,
  redemption_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rewards_select" ON rewards;
CREATE POLICY "rewards_select" ON rewards FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rewards_insert" ON rewards;
CREATE POLICY "rewards_insert" ON rewards FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "rewards_update" ON rewards;
CREATE POLICY "rewards_update" ON rewards FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "rewards_delete" ON rewards;
CREATE POLICY "rewards_delete" ON rewards FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- REWARD REDEMPTIONS
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards(id),
  points_spent integer NOT NULL,
  redemption_code text UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text), 1, 10)),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  fulfilled_at timestamptz
);

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "redemptions_select" ON reward_redemptions;
CREATE POLICY "redemptions_select" ON reward_redemptions FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "redemptions_insert" ON reward_redemptions;
CREATE POLICY "redemptions_insert" ON reward_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "redemptions_update" ON reward_redemptions;
CREATE POLICY "redemptions_update" ON reward_redemptions FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "redemptions_delete" ON reward_redemptions;
CREATE POLICY "redemptions_delete" ON reward_redemptions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_sw text,
  description text,
  description_sw text,
  icon text NOT NULL DEFAULT 'award',
  color text NOT NULL DEFAULT '#f59e0b',
  type text NOT NULL DEFAULT 'quantity' CHECK (type IN ('streak', 'quantity', 'category', 'community', 'special')),
  threshold integer NOT NULL DEFAULT 1,
  bonus_points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achievements_select" ON achievements;
CREATE POLICY "achievements_select" ON achievements FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "achievements_insert" ON achievements;
CREATE POLICY "achievements_insert" ON achievements FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "achievements_update" ON achievements;
CREATE POLICY "achievements_update" ON achievements FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "achievements_delete" ON achievements;
CREATE POLICY "achievements_delete" ON achievements FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id),
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_achievements_select" ON user_achievements;
CREATE POLICY "user_achievements_select" ON user_achievements FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "user_achievements_insert" ON user_achievements;
CREATE POLICY "user_achievements_insert" ON user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_achievements_update" ON user_achievements;
CREATE POLICY "user_achievements_update" ON user_achievements FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "user_achievements_delete" ON user_achievements;
CREATE POLICY "user_achievements_delete" ON user_achievements FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- CHALLENGES
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_sw text,
  description text,
  description_sw text,
  waste_category_id uuid REFERENCES waste_categories(id),
  target_count integer NOT NULL DEFAULT 10,
  reward_points integer NOT NULL DEFAULT 100,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  participant_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenges_select" ON challenges;
CREATE POLICY "challenges_select" ON challenges FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "challenges_insert" ON challenges;
CREATE POLICY "challenges_insert" ON challenges FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "challenges_update" ON challenges;
CREATE POLICY "challenges_update" ON challenges FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "challenges_delete" ON challenges;
CREATE POLICY "challenges_delete" ON challenges FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- CHALLENGE PARTICIPATIONS
CREATE TABLE IF NOT EXISTS challenge_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id),
  progress integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE challenge_participations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_part_select" ON challenge_participations;
CREATE POLICY "challenge_part_select" ON challenge_participations FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "challenge_part_insert" ON challenge_participations;
CREATE POLICY "challenge_part_insert" ON challenge_participations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "challenge_part_update" ON challenge_participations;
CREATE POLICY "challenge_part_update" ON challenge_participations FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "challenge_part_delete" ON challenge_participations;
CREATE POLICY "challenge_part_delete" ON challenge_participations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- FRAUD FLAGS
CREATE TABLE IF NOT EXISTS fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disposal_id uuid REFERENCES disposals(id),
  flag_type text NOT NULL CHECK (flag_type IN ('rate_limit', 'location', 'pattern', 'manual')),
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fraud_flags_select" ON fraud_flags;
CREATE POLICY "fraud_flags_select" ON fraud_flags FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "fraud_flags_insert" ON fraud_flags;
CREATE POLICY "fraud_flags_insert" ON fraud_flags FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "fraud_flags_update" ON fraud_flags;
CREATE POLICY "fraud_flags_update" ON fraud_flags FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "fraud_flags_delete" ON fraud_flags;
CREATE POLICY "fraud_flags_delete" ON fraud_flags FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_disposals_user_id ON disposals(user_id);
CREATE INDEX IF NOT EXISTS idx_disposals_bin_id ON disposals(bin_id);
CREATE INDEX IF NOT EXISTS idx_disposals_created_at ON disposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disposals_waste_category ON disposals(waste_category_id);
CREATE INDEX IF NOT EXISTS idx_points_tx_user_id ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_tx_created_at ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_total_points ON profiles(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_bins_qr_code ON bins(qr_code);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON fraud_flags(status);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_user_id ON fraud_flags(user_id);

-- FUNCTION: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
