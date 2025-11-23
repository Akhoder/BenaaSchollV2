-- Update get_all_profiles function to include all new fields
-- This migration updates the RPC function to return all profile fields including:
-- gender, address, date_of_birth, parent_name, parent_phone, emergency_contact,
-- specialization, years_of_experience, qualifications, bio,
-- appointment_date, department

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
  gender text,
  -- Common fields
  address text,
  date_of_birth date,
  -- Teacher fields
  specialization text,
  years_of_experience integer,
  qualifications text,
  bio text,
  -- Student fields
  parent_name text,
  parent_phone text,
  emergency_contact text,
  -- Admin/Supervisor fields
  appointment_date date,
  department text,
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
  
  -- Return all profiles (bypasses RLS) with all fields
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.avatar_url,
    p.phone,
    p.language_preference,
    p.gender,
    -- Common fields
    p.address,
    p.date_of_birth,
    -- Teacher fields
    p.specialization,
    p.years_of_experience,
    p.qualifications,
    p.bio,
    -- Student fields
    p.parent_name,
    p.parent_phone,
    p.emergency_contact,
    -- Admin/Supervisor fields
    p.appointment_date,
    p.department,
    p.created_at,
    p.updated_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;

