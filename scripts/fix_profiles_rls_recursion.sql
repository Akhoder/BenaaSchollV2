-- ============================================
-- Fix infinite recursion in profiles RLS policies
-- ============================================
-- 
-- PROBLEM: Error "42P17: infinite recursion detected in policy for relation 'profiles'"
-- This happens when RLS policies query the same table they're protecting, causing recursion.
--
-- SOLUTION: Use SECURITY DEFINER function to bypass RLS when checking user roles
--
-- HOW TO RUN:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" to execute
--
-- IMPORTANT: This script will drop ALL existing policies on profiles table
-- and recreate them with non-recursive versions.
--
-- ============================================

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
END $$;

-- ✅ FIX: Create policies that don't cause recursion
-- Policy 1: Users can view their own profile (using auth.uid() directly, no subquery)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- ✅ FIX: Create a SECURITY DEFINER function that bypasses RLS to check role
-- This function queries profiles without triggering RLS policies
-- SECURITY DEFINER runs with the privileges of the function owner (usually postgres)
-- which bypasses RLS completely
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Query profiles directly without RLS (because of SECURITY DEFINER)
  -- This bypasses RLS because the function runs as the owner (postgres)
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role, '');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO anon;

-- Policy 2: Users can view profiles if they are admin, teacher, or supervisor
-- Use the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Admins teachers supervisors can view profiles"
ON profiles FOR SELECT
USING (get_user_role() IN ('admin', 'teacher', 'supervisor'));

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Admins, teachers, and supervisors can update any profile
-- Use the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Admins teachers supervisors can update profiles"
ON profiles FOR UPDATE
USING (get_user_role() IN ('admin', 'teacher', 'supervisor'))
WITH CHECK (get_user_role() IN ('admin', 'teacher', 'supervisor'));

-- Policy 5: Service role can do everything (this is handled by service role key, but we add it for clarity)
-- Note: Service role key bypasses RLS, so this is just for documentation

-- Policy 6: Allow inserts (for triggers that create profiles)
CREATE POLICY "Allow profile inserts"
ON profiles FOR INSERT
WITH CHECK (true);

-- ✅ FIX: Add policy to allow service role to bypass RLS (for API routes)
-- This is handled automatically by service role key, but we document it here

-- Policy 7: Admins, teachers, and supervisors can delete profiles
CREATE POLICY "Admins teachers supervisors can delete profiles"
ON profiles FOR DELETE
USING (get_user_role() IN ('admin', 'teacher', 'supervisor'));
