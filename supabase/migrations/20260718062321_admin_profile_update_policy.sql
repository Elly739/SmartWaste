/*
# Admin Profile Update Policy

Allows SmartWaste admins to update other users' profiles (for role approval,
institution linking, suspension, etc.).

## Security Changes
- Updates the profiles UPDATE policy to also allow admin users to update
  any profile row. This is needed for:
  - Approving role requests (setting role to 'institution' or 'partner')
  - Linking users to institutions
  - Suspending/unsuspending users
  - Adjusting points

The admin role is checked via a subquery on profiles.
*/

-- Drop the existing self-update-only policy
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- New policy: users can update their own profile, admins can update any
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
