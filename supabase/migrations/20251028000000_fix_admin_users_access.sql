/*
  # Fix Admin Users Access
  
  ## Overview
  This migration creates/fixes the get_all_profiles function to allow admins
  to view all users in the system without RLS restrictions.
  
  ## Changes
  - Create or replace get_all_profiles() function
  - Grant execute permissions
  - Ensure admin can access all users
  
  ## Security
  - Only admins can call this function
  - Uses SECURITY DEFINER to bypass RLS
  - Validates user role before returning data
*/

-- Drop and recreate the function to ensure it works
DROP FUNCTION IF EXISTS get_all_profiles();

CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  avatar_url text,
  phone text,
  language_preference text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Check if caller is admin
  SELECT p.role INTO user_role FROM profiles p WHERE p.id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view all profiles';
  END IF;
  
  -- Return all profiles (bypasses RLS)
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.avatar_url,
    p.phone,
    p.language_preference,
    p.created_at,
    p.updated_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;

-- Also ensure RLS policies allow admins to read all profiles
DROP POLICY IF EXISTS "admins_can_read_all_profiles" ON profiles;

CREATE POLICY "admins_can_read_all_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

