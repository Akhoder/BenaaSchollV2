/*
  # Remove Temporary Admin Email Policy

  We keep the secure RPC (admin_update_profile) and remove the
  temporary email-based update policy to tighten security.
*/

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop the temporary policy if present
DROP POLICY IF EXISTS "admin_email_can_update_profiles" ON profiles;

-- Keep: admin_update_profile RPC (Security Definer) for admin updates


