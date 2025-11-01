-- Fix the profiles policy recursion issue

-- Drop the recursive policy
drop policy if exists "profiles_select_for_teachers" on public.profiles;

-- Temporarily disable RLS to allow teachers to read profiles for grading
-- This is a workaround until we can properly fix the RLS policy
drop policy if exists "profiles_select_for_grading" on public.profiles;
create policy "profiles_select_for_grading"
on public.profiles for select to authenticated
using (true);  -- Allow all authenticated users to read profiles for now

