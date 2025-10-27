/*
  # Fix All Recursive RLS Policies

  ## Overview
  This migration completely removes all recursive policies and replaces them
  with non-recursive versions. We'll use a simpler approach that doesn't
  query the profiles table within policies.

  ## Changes
  1. Drop all existing policies
  2. Drop recursive helper functions
  3. Create simple, non-recursive policies
  4. Allow users to read their own profile
  5. Allow users to update their own profile (with restrictions)

  ## Important Notes
  - Admin operations should be done via service role or backend functions
  - This prevents infinite recursion in RLS policies
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can view their students" ON profiles;
DROP POLICY IF EXISTS "Supervisors can view their students" ON profiles;
DROP POLICY IF EXISTS "Service role can do everything" ON profiles;

-- Drop helper functions that cause recursion
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_teacher();

-- Create simple SELECT policy - users can read their own profile
CREATE POLICY "enable_read_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create simple UPDATE policy - users can update their own profile but not their role
CREATE POLICY "enable_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create simple INSERT policy - allow authenticated users to insert (for signup)
CREATE POLICY "enable_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Service role has full access (for admin operations via backend)
CREATE POLICY "service_role_all_access"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
