/*
  # Temporary: Allow admin by email to update profiles

  Purpose: Unblock edits while JWT role claims are not reliably present.
  Scope: Grants UPDATE on `profiles` when the authenticated user's email
  matches the specified admin email. Safe (no recursion) and specific.
*/

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop if exists to make migration idempotent
DROP POLICY IF EXISTS "admin_email_can_update_profiles" ON profiles;

-- Allow updates when the caller's email matches the admin email
CREATE POLICY "admin_email_can_update_profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.email() = 'akhoder83@gmail.com')
  WITH CHECK (auth.email() = 'akhoder83@gmail.com');


