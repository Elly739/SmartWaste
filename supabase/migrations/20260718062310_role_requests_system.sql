/*
# Role Request System for Admin-Approved Access

## Purpose
Institutions and collection partners cannot self-assign their role.
Instead, they sign up as regular users and submit a "role request" that
the SmartWaste admin approves. This prevents unauthorized access to
management dashboards.

## Flow
1. User signs up (gets role = 'user' by default via trigger)
2. User submits a role request (role = 'institution' or 'partner')
   - For institution: picks from existing institutions (admin must create first)
   - For partner: fills in partner organization details
3. Admin reviews in Admin Dashboard → Role Requests tab
4. Admin approves → user's profile.role is updated + linked to institution/partner
5. Admin rejects → request marked rejected, user stays as 'user'

## New Tables

### role_requests
- id, user_id (FK profiles), requested_role ('institution' | 'partner')
- institution_id (nullable, for institution requests - links to existing institution)
- partner_name, partner_description, partner_contact_email, partner_contact_phone (for partner requests)
- status ('pending' | 'approved' | 'rejected'), default 'pending'
- admin_notes (nullable, admin can add notes during review)
- reviewed_by (nullable, FK to profiles - which admin approved/rejected)
- reviewed_at (nullable)
- created_at, updated_at

## Security
- RLS enabled on role_requests
- Users can create and read their own requests
- Admins can read, update all requests
- No one can delete (requests are permanent records)
*/

CREATE TABLE IF NOT EXISTS role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_role text NOT NULL CHECK (requested_role IN ('institution', 'partner')),
  institution_id uuid REFERENCES institutions(id) ON DELETE SET NULL,
  partner_name text,
  partner_description text,
  partner_contact_email text,
  partner_contact_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own requests
DROP POLICY IF EXISTS "role_requests_select_own" ON role_requests;
CREATE POLICY "role_requests_select_own" ON role_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can create requests for themselves
DROP POLICY IF EXISTS "role_requests_insert_own" ON role_requests;
CREATE POLICY "role_requests_insert_own" ON role_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Only admins can update (approve/reject)
DROP POLICY IF EXISTS "role_requests_update_admin" ON role_requests;
CREATE POLICY "role_requests_update_admin" ON role_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_requests_user ON role_requests(user_id);

-- Add a pending_requests column to profiles for quick badge count
-- (denormalized for performance)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role_request_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role_request_status text DEFAULT NULL;
  END IF;
END $$;

-- Update profiles update policy to allow self-update of institution_id
-- (so approved users can be linked, and users can join institutions)
-- The existing profiles_update policy already allows self-update,
-- but we need to ensure role can be updated by admin only.
-- Check existing policies first.
