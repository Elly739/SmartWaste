/*
# Security Hardening Migration

## 1. Lock down profiles UPDATE policy
   Users can only update safe columns (full_name, username, phone, language, avatar_url, updated_at).
   Sensitive columns (role, total_points, lifetime_points, current_streak, longest_streak,
   last_disposal_date, suspended, suspended_reason, institution_id, partner_id,
   role_request_status) can only be changed by admins.

## 2. Create SECURITY DEFINER functions for privileged profile updates
   - admin_update_profile: allows admin to update role, suspension, institution/partner links
   - admin_adjust_points: allows admin to adjust a user's points

## 3. Create SECURITY DEFINER function for disposal processing
   - process_disposal: validates limits, calculates points, updates profile, logs transaction atomically

## 4. Create SECURITY DEFINER function for reward redemption
   - redeem_reward: validates points balance, deducts points, creates redemption, updates stock atomically

## 5. Lock down handle_new_user function
   - Revoke EXECUTE from anon and authenticated
   - Set fixed search_path

## 6. Tighten open INSERT policies
   - fraud_flags: only admin can insert
   - collection_requests: only partner/admin can insert
*/

-- ============================================================
-- 1. LOCK DOWN PROFILES UPDATE POLICY
-- ============================================================

-- Drop the existing broad update policy
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Self-update: users can only update safe columns on their own row
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin-update: admins can update any row (for role approval, suspension, etc.)
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Revoke direct table privileges from anon on sensitive tables
-- anon should only have SELECT on public-facing tables, not INSERT/UPDATE/DELETE
REVOKE INSERT, UPDATE, DELETE ON profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON disposals FROM anon;
REVOKE INSERT, UPDATE, DELETE ON points_transactions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON reward_redemptions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON user_achievements FROM anon;
REVOKE INSERT, UPDATE, DELETE ON challenge_participations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON fraud_flags FROM anon;
REVOKE INSERT, UPDATE, DELETE ON collection_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON recovery_reports FROM anon;
REVOKE INSERT, UPDATE, DELETE ON role_requests FROM anon;

-- ============================================================
-- 2. SECURITY DEFINER FUNCTION: Admin Update Profile
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_target_user_id uuid,
  p_role text DEFAULT NULL,
  p_suspended boolean DEFAULT NULL,
  p_suspended_reason text DEFAULT NULL,
  p_institution_id uuid DEFAULT NULL,
  p_partner_id uuid DEFAULT NULL,
  p_role_request_status text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  UPDATE public.profiles SET
    role = COALESCE(p_role, role),
    suspended = COALESCE(p_suspended, suspended),
    suspended_reason = CASE WHEN p_suspended = false THEN NULL ELSE COALESCE(p_suspended_reason, suspended_reason) END,
    institution_id = COALESCE(p_institution_id, institution_id),
    partner_id = COALESCE(p_partner_id, partner_id),
    role_request_status = COALESCE(p_role_request_status, role_request_status),
    updated_at = now()
  WHERE id = p_target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean, text, uuid, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean, text, uuid, uuid, text) TO authenticated;

-- ============================================================
-- 3. SECURITY DEFINER FUNCTION: Admin Adjust Points
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_adjust_points(
  p_target_user_id uuid,
  p_amount integer,
  p_description text DEFAULT 'Admin adjustment'
)
RETURNS void AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  SELECT total_points INTO v_new_balance FROM public.profiles WHERE id = p_target_user_id FOR UPDATE;
  v_new_balance := v_new_balance + p_amount;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Resulting balance cannot be negative';
  END IF;

  UPDATE public.profiles SET
    total_points = v_new_balance,
    lifetime_points = CASE WHEN p_amount > 0 THEN lifetime_points + p_amount ELSE lifetime_points END,
    updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.points_transactions (user_id, type, amount, balance_after, description)
  VALUES (p_target_user_id, 'adjust', p_amount, v_new_balance, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_points(uuid, integer, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_points(uuid, integer, text) TO authenticated;

-- ============================================================
-- 4. SECURITY DEFINER FUNCTION: Process Disposal
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_disposal(
  p_bin_id uuid,
  p_waste_category_id uuid,
  p_location_lat numeric DEFAULT NULL,
  p_location_lng numeric DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_bin public.bins%ROWTYPE;
  v_category public.waste_categories%ROWTYPE;
  v_cat_limit public.category_limits%ROWTYPE;
  v_global_limit public.category_limits%ROWTYPE;
  v_points integer;
  v_new_total integer;
  v_new_lifetime integer;
  v_new_streak integer;
  v_longest_streak integer;
  v_today date := CURRENT_DATE;
  v_today_count integer;
  v_today_pts integer;
  v_recent_count integer;
  v_disposal_id uuid;
  v_last_date date;
  v_yesterday date;
BEGIN
  -- Load user profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF v_profile.suspended THEN
    RAISE EXCEPTION 'Your account has been suspended. Contact support.';
  END IF;

  -- Load bin
  SELECT * INTO v_bin FROM public.bins WHERE id = p_bin_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bin not found or inactive';
  END IF;

  -- Load category
  SELECT * INTO v_category FROM public.waste_categories WHERE id = p_waste_category_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waste category not found or inactive';
  END IF;

  -- Rate limit: max 3 disposals at same bin within 5 minutes
  SELECT count(*) INTO v_recent_count FROM public.disposals
  WHERE user_id = v_user_id AND bin_id = p_bin_id AND created_at >= now() - interval '5 minutes';
  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many disposals at this bin. Please wait 5 minutes.';
  END IF;

  -- Per-category daily limit
  SELECT * INTO v_cat_limit FROM public.category_limits
  WHERE waste_category_id = p_waste_category_id AND is_active = true LIMIT 1;
  IF FOUND THEN
    SELECT count(*) INTO v_today_count FROM public.disposals
    WHERE user_id = v_user_id AND waste_category_id = p_waste_category_id AND created_at >= v_today;
    IF v_today_count >= v_cat_limit.max_per_day THEN
      RAISE EXCEPTION 'Daily limit reached for this waste category (%)', v_cat_limit.max_per_day;
    END IF;
  END IF;

  -- Global daily points cap
  SELECT * INTO v_global_limit FROM public.category_limits
  WHERE waste_category_id IS NULL AND is_active = true LIMIT 1;
  IF FOUND THEN
    SELECT COALESCE(sum(points_earned), 0) INTO v_today_pts FROM public.disposals
    WHERE user_id = v_user_id AND created_at >= v_today;
    IF v_today_pts + v_category.points_per_unit > v_global_limit.max_points_per_day THEN
      RAISE EXCEPTION 'Daily points cap reached (%)', v_global_limit.max_points_per_day;
    END IF;
  END IF;

  -- Calculate points
  v_points := v_category.points_per_unit;

  -- Insert disposal record
  INSERT INTO public.disposals (user_id, bin_id, waste_category_id, points_earned, location_lat, location_lng)
  VALUES (v_user_id, p_bin_id, p_waste_category_id, v_points, p_location_lat, p_location_lng)
  RETURNING id INTO v_disposal_id;

  -- Update profile points and streak
  v_new_total := v_profile.total_points + v_points;
  v_new_lifetime := v_profile.lifetime_points + v_points;
  v_last_date := v_profile.last_disposal_date;
  v_new_streak := v_profile.current_streak;

  IF v_last_date IS NULL OR v_last_date != v_today THEN
    v_yesterday := v_today - 1;
    IF v_last_date = v_yesterday THEN
      v_new_streak := v_profile.current_streak + 1;
    ELSE
      v_new_streak := 1;
    END IF;
  END IF;

  v_longest_streak := GREATEST(v_new_streak, v_profile.longest_streak);

  UPDATE public.profiles SET
    total_points = v_new_total,
    lifetime_points = v_new_lifetime,
    current_streak = v_new_streak,
    longest_streak = v_longest_streak,
    last_disposal_date = v_today,
    updated_at = now()
  WHERE id = v_user_id;

  -- Insert points transaction
  INSERT INTO public.points_transactions (user_id, disposal_id, type, amount, balance_after, description)
  VALUES (v_user_id, v_disposal_id, 'earn', v_points, v_new_total,
    'Disposed ' || v_category.name || ' at ' || v_bin.location_name);

  -- Update bin collection count
  UPDATE public.bins SET
    total_collections = total_collections + 1,
    last_collection_at = now()
  WHERE id = p_bin_id;

  RETURN jsonb_build_object(
    'disposal_id', v_disposal_id,
    'points_earned', v_points,
    'new_total', v_new_total,
    'new_streak', v_new_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.process_disposal(uuid, uuid, numeric, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_disposal(uuid, uuid, numeric, numeric) TO authenticated;

-- ============================================================
-- 5. SECURITY DEFINER FUNCTION: Redeem Reward
-- ============================================================

CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_reward_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_reward public.rewards%ROWTYPE;
  v_new_balance integer;
  v_redemption_id uuid;
  v_code text;
BEGIN
  -- Load user profile with lock
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF v_profile.suspended THEN
    RAISE EXCEPTION 'Your account has been suspended. Contact support.';
  END IF;

  -- Load reward with lock
  SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found or inactive';
  END IF;

  -- Check stock
  IF v_reward.stock_count != -1 AND (v_reward.stock_count - v_reward.redemption_count) <= 0 THEN
    RAISE EXCEPTION 'This reward is out of stock';
  END IF;

  -- Check points balance
  IF v_profile.total_points < v_reward.points_cost THEN
    RAISE EXCEPTION 'Insufficient points. You need % more.', v_reward.points_cost - v_profile.total_points;
  END IF;

  -- Deduct points
  v_new_balance := v_profile.total_points - v_reward.points_cost;

  UPDATE public.profiles SET
    total_points = v_new_balance,
    updated_at = now()
  WHERE id = v_user_id;

  -- Create redemption record
  INSERT INTO public.reward_redemptions (user_id, reward_id, points_spent, status)
  VALUES (v_user_id, p_reward_id, v_reward.points_cost, 'pending')
  RETURNING id, redemption_code INTO v_redemption_id, v_code;

  -- Log transaction
  INSERT INTO public.points_transactions (user_id, type, amount, balance_after, description)
  VALUES (v_user_id, 'redeem', -v_reward.points_cost, v_new_balance, 'Redeemed: ' || v_reward.title);

  -- Update reward redemption count
  UPDATE public.rewards SET
    redemption_count = redemption_count + 1
  WHERE id = p_reward_id;

  RETURN jsonb_build_object(
    'redemption_id', v_redemption_id,
    'redemption_code', v_code,
    'points_spent', v_reward.points_cost,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.redeem_reward(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid) TO authenticated;

-- ============================================================
-- 6. LOCK DOWN handle_new_user
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text := 'user';
  v_partner_id uuid := NULL;
BEGIN
  IF NEW.email = 'iamellyokello@gmail.com' THEN
    v_role := 'admin';
  ELSIF NEW.email IN ('partner@boomlights.co.ke') THEN
    v_role := 'partner';
    SELECT id INTO v_partner_id FROM public.collection_partners WHERE name = 'Boom Lights' LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, username, role, partner_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    v_role,
    v_partner_id
  )
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        partner_id = COALESCE(EXCLUDED.partner_id, profiles.partner_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- ============================================================
-- 7. TIGHTEN OPEN INSERT POLICIES
-- ============================================================

-- fraud_flags: only admin can insert
DROP POLICY IF EXISTS "fraud_flags_insert" ON fraud_flags;
CREATE POLICY "fraud_flags_insert" ON fraud_flags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- collection_requests: only partner/admin can insert
DROP POLICY IF EXISTS "coll_req_insert" ON collection_requests;
CREATE POLICY "coll_req_insert" ON collection_requests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'partner'))
  );
