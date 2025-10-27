/*
  # Add Admin Statistics Functions

  ## Overview
  This migration creates SECURITY DEFINER functions that allow admins to
  query aggregate statistics without hitting RLS restrictions.

  ## Functions Created
  1. get_total_students() - Returns count of students
  2. get_total_teachers() - Returns count of teachers
  3. get_total_supervisors() - Returns count of supervisors
  4. get_all_profiles_for_admin() - Returns all profiles for admins

  ## Security
  - Functions check that caller is an admin
  - Uses SECURITY DEFINER to bypass RLS for counting
  - Returns only aggregate data or filtered results
*/

-- Function to get total students
CREATE OR REPLACE FUNCTION get_total_students()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  result bigint;
BEGIN
  -- Get the caller's role
  SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
  
  -- Only admins can call this
  IF user_role != 'admin' THEN
    RETURN 0;
  END IF;
  
  -- Count students
  SELECT COUNT(*) INTO result FROM profiles WHERE role = 'student';
  RETURN result;
END;
$$;

-- Function to get total teachers
CREATE OR REPLACE FUNCTION get_total_teachers()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  result bigint;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
  IF user_role != 'admin' THEN
    RETURN 0;
  END IF;
  SELECT COUNT(*) INTO result FROM profiles WHERE role = 'teacher';
  RETURN result;
END;
$$;

-- Function to get total supervisors
CREATE OR REPLACE FUNCTION get_total_supervisors()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  result bigint;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
  IF user_role != 'admin' THEN
    RETURN 0;
  END IF;
  SELECT COUNT(*) INTO result FROM profiles WHERE role = 'supervisor';
  RETURN result;
END;
$$;

-- Function to get all profiles for admin
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
  
  -- Return all profiles
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_total_students() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_teachers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_supervisors() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
