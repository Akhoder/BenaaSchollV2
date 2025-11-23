-- Add role-specific fields to profiles table
-- This migration adds fields that are relevant to each user role

-- ============================================
-- PART 1: Add fields for all roles
-- ============================================

-- Address field (useful for students and staff)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address text;

-- Date of birth (mainly for students)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- ============================================
-- PART 2: Add fields for Teachers
-- ============================================

-- Specialization/Subject expertise
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS specialization text;

-- Years of experience
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS years_of_experience integer;

-- Qualifications/Education
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS qualifications text;

-- Bio/About section
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio text;

-- ============================================
-- PART 3: Add fields for Students
-- ============================================

-- Parent/Guardian name
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS parent_name text;

-- Parent/Guardian phone
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS parent_phone text;

-- Emergency contact
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS emergency_contact text;

-- ============================================
-- PART 4: Add fields for Admin and Supervisor
-- ============================================

-- Appointment date (when they started their role)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS appointment_date date;

-- Department/Section they manage
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS department text;

-- ============================================
-- PART 5: Add indexes for better query performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_specialization ON public.profiles(specialization) WHERE specialization IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON public.profiles(date_of_birth) WHERE date_of_birth IS NOT NULL;

-- ============================================
-- PART 6: Add comments for documentation
-- ============================================

COMMENT ON COLUMN public.profiles.address IS 'User address (useful for students and staff)';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'Date of birth (mainly for students)';
COMMENT ON COLUMN public.profiles.specialization IS 'Teacher specialization/subject expertise';
COMMENT ON COLUMN public.profiles.years_of_experience IS 'Years of teaching experience';
COMMENT ON COLUMN public.profiles.qualifications IS 'Teacher qualifications and education';
COMMENT ON COLUMN public.profiles.bio IS 'Bio/About section for teachers';
COMMENT ON COLUMN public.profiles.parent_name IS 'Parent/Guardian name for students';
COMMENT ON COLUMN public.profiles.parent_phone IS 'Parent/Guardian phone for students';
COMMENT ON COLUMN public.profiles.emergency_contact IS 'Emergency contact information';
COMMENT ON COLUMN public.profiles.appointment_date IS 'Date when admin/supervisor was appointed';
COMMENT ON COLUMN public.profiles.department IS 'Department/Section managed by admin/supervisor';

