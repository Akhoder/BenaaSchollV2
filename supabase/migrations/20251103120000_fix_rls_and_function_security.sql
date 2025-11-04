/*
  # Fix RLS and Function Security Issues
  
  ## Overview
  This migration fixes critical security issues:
  1. Enables RLS on tables that have policies but RLS disabled
  2. Fixes function search_path security warnings
  
  ## Changes
  1. Enable RLS on classes, student_enrollments, and class_subjects tables
  2. Fix search_path for chat-related functions to prevent SQL injection
  
  ## Security Impact
  - ✅ Enables proper row-level security on public tables
  - ✅ Prevents SQL injection via search_path manipulation
  - ✅ Hardens database functions
*/

-- =====================================================
-- PART 1: ENABLE RLS ON TABLES WITH POLICIES
-- =====================================================

-- Enable RLS on classes table (has policies but RLS was disabled)
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on student_enrollments table (has policies but RLS was disabled)
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on class_subjects table (has policies but RLS was disabled)
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: FIX FUNCTION SEARCH_PATH SECURITY
-- =====================================================

-- Fix update_conversations_updated_at function (trigger function, no parameters)
ALTER FUNCTION public.update_conversations_updated_at() 
SET search_path = public, pg_temp;

-- Fix update_messages_updated_at function (trigger function, no parameters)
ALTER FUNCTION public.update_messages_updated_at() 
SET search_path = public, pg_temp;

-- Fix update_conversation_last_message function (trigger function, no parameters)
ALTER FUNCTION public.update_conversation_last_message() 
SET search_path = public, pg_temp;

-- =====================================================
-- NOTE: Leaked Password Protection
-- =====================================================
-- 
-- The "Leaked Password Protection Disabled" warning cannot be
-- fixed via SQL migration. To enable it:
-- 
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Authentication > Settings
-- 3. Enable "Check passwords against HaveIBeenPwned database"
-- 
-- This feature prevents users from using compromised passwords
-- by checking against HaveIBeenPwned.org database.
--

