/*
  # Security Fix Part 3: Enable RLS and Fix Function Security (Correct Signatures)

  ## Changes
  
  ### 1. Enable RLS on student_enrollments
  CRITICAL: RLS was disabled despite having policies defined.

  ### 2. Fix Function Search Path Security
  Updates all 15 functions to use immutable search_path.
  Uses correct function signatures based on actual database state.

  ## Security Impact
  - ✅ Prevents unauthorized access to student enrollment data
  - ✅ Blocks SQL injection via search_path manipulation
  - ✅ Hardens all database functions
*/

-- =====================================================
-- PART 1: ENABLE RLS ON STUDENT_ENROLLMENTS (CRITICAL)
-- =====================================================

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: FIX FUNCTION SEARCH_PATH SECURITY
-- Using correct function signatures from database
-- =====================================================

-- Functions with no parameters
ALTER FUNCTION public.generate_class_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_class_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_enroll_class_subjects() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin_jwt() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin_from_claims_or_email() SET search_path = public, pg_temp;
ALTER FUNCTION public.schedule_events_set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_assignment_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_lesson_progress_updated_at() SET search_path = public, pg_temp;

-- Functions with parameters (correct signatures)
ALTER FUNCTION public.get_user_events(timestamp with time zone, timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_update_profile(uuid, text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_update_profile(uuid, text, text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_or_create_lesson_progress(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_lesson_progress(uuid, uuid, integer, text, numeric, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_subject_progress(uuid, uuid) SET search_path = public, pg_temp;
