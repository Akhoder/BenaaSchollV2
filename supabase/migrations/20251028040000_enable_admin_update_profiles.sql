/*
  # Enable Admin Update on Profiles

  This migration adds RLS policies to allow authenticated admins
  to update any row in `profiles` while preserving existing self-update rules.
*/

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Non-recursive admin check using JWT claims (avoids querying profiles)
CREATE OR REPLACE FUNCTION is_admin_jwt()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin'
    OR (current_setting('request.jwt.claims', true)::jsonb->'user'->>'role') = 'admin'
    OR (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role') = 'admin'
    OR (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'role') = 'admin'
  , false);
$$;

-- Allow admins to UPDATE all profiles
DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON profiles;
CREATE POLICY "admins_can_update_all_profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin_jwt())
  WITH CHECK (is_admin_jwt());

-- Optionally, allow admins to INSERT if needed in future
-- DROP POLICY IF EXISTS "admins_can_insert_profiles" ON profiles;
-- CREATE POLICY "admins_can_insert_profiles"
--   ON profiles FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM profiles p
--       WHERE p.id = auth.uid() AND p.role = 'admin'
--     )
--   );


