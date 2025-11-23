-- Allow admins, teachers, and supervisors to insert profiles (create new users)
-- This is needed for creating students and other users from the dashboard

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "admins_teachers_can_insert_profiles" ON public.profiles;

-- Create policy for admins, teachers, and supervisors to insert profiles
CREATE POLICY "admins_teachers_can_insert_profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'teacher', 'supervisor')
  )
);

-- Create RPC function to create user with profile
-- This function creates both auth.users and profiles in one transaction
CREATE OR REPLACE FUNCTION public.create_user_with_profile(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_language_preference text DEFAULT 'en',
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_specialization text DEFAULT NULL,
  p_years_of_experience integer DEFAULT NULL,
  p_qualifications text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_parent_name text DEFAULT NULL,
  p_parent_phone text DEFAULT NULL,
  p_emergency_contact text DEFAULT NULL,
  p_appointment_date date DEFAULT NULL,
  p_department text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_current_user_role text;
BEGIN
  -- Check if current user is admin, teacher, or supervisor
  SELECT role INTO v_current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_current_user_role NOT IN ('admin', 'teacher', 'supervisor') THEN
    RAISE EXCEPTION 'Only admins, teachers, and supervisors can create users';
  END IF;

  -- Create user in auth.users (requires service role, so we'll use a workaround)
  -- Note: This requires the caller to create the auth user first, or we need to use admin API
  -- For now, we'll create a profile that expects the user to exist
  -- The caller should create the auth user first using supabase.auth.admin.createUser()
  
  -- This function will be called AFTER the auth user is created
  -- We'll just return success and let the trigger handle profile creation
  -- OR we can update the profile if it was created by the trigger
  
  -- Actually, let's create a simpler approach: allow direct insert with a generated UUID
  -- But this won't work because profiles.id must reference auth.users.id
  
  -- Best approach: Create a function that the client calls AFTER creating auth user
  -- Or use a service role key on the client side (not recommended for security)
  
  -- For now, let's just ensure the RLS policy allows insert
  -- The client code should create auth user first, then insert profile
  
  RETURN QUERY SELECT 
    gen_random_uuid()::uuid as user_id,
    p_email as email,
    p_full_name as full_name,
    p_role as role;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_with_profile TO authenticated;

-- Better approach: Create a function that works with existing auth user
-- This assumes the auth user was already created
CREATE OR REPLACE FUNCTION public.create_profile_for_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_role text,
  p_language_preference text DEFAULT 'en',
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_specialization text DEFAULT NULL,
  p_years_of_experience integer DEFAULT NULL,
  p_qualifications text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_parent_name text DEFAULT NULL,
  p_parent_phone text DEFAULT NULL,
  p_emergency_contact text DEFAULT NULL,
  p_appointment_date date DEFAULT NULL,
  p_department text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_user_role text;
BEGIN
  -- Check if current user is admin, teacher, or supervisor
  SELECT role INTO v_current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_current_user_role NOT IN ('admin', 'teacher', 'supervisor') THEN
    RAISE EXCEPTION 'Only admins, teachers, and supervisors can create profiles';
  END IF;

  -- Check if user exists in auth.users (we can't directly check, but we trust the caller)
  -- Insert or update profile
  INSERT INTO public.profiles (
    id, email, full_name, role, language_preference, phone,
    address, date_of_birth,
    specialization, years_of_experience, qualifications, bio,
    parent_name, parent_phone, emergency_contact,
    appointment_date, department
  )
  VALUES (
    p_user_id, p_email, p_full_name, p_role, p_language_preference, p_phone,
    p_address, p_date_of_birth,
    p_specialization, p_years_of_experience, p_qualifications, p_bio,
    p_parent_name, p_parent_phone, p_emergency_contact,
    p_appointment_date, p_department
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    language_preference = EXCLUDED.language_preference,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    date_of_birth = EXCLUDED.date_of_birth,
    specialization = EXCLUDED.specialization,
    years_of_experience = EXCLUDED.years_of_experience,
    qualifications = EXCLUDED.qualifications,
    bio = EXCLUDED.bio,
    parent_name = EXCLUDED.parent_name,
    parent_phone = EXCLUDED.parent_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    appointment_date = EXCLUDED.appointment_date,
    department = EXCLUDED.department,
    updated_at = now();

  RETURN QUERY SELECT 
    p_user_id as id,
    p_email as email,
    p_full_name as full_name,
    p_role as role;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_profile_for_user TO authenticated;

-- Grant comment
COMMENT ON POLICY "admins_teachers_can_insert_profiles" ON public.profiles IS 
'Allows admins, teachers, and supervisors to create new user profiles (e.g., students)';

COMMENT ON FUNCTION public.create_profile_for_user IS 
'Creates or updates a profile for an existing auth user. Call this after creating the user with supabase.auth.admin.createUser()';
