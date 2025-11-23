/*
  # Script to Add 3 Teachers
  
  This SQL script adds 3 teachers to the database.
  Note: This script requires Supabase Admin privileges or RLS to be temporarily disabled.
  
  IMPORTANT: 
  - You need to manually create users in auth.users first using Supabase Admin API
  - Or use the TypeScript script (add-teachers.ts) which handles this automatically
  
  Usage:
  1. First, create users via Supabase Admin API or Dashboard
  2. Then run this SQL script to update/create profiles
  
  Alternative: Use the TypeScript script instead:
  npx tsx scripts/add-teachers.ts
*/

-- ============================================
-- Option 1: If users already exist in auth.users
-- ============================================

-- Update existing users to be teachers
UPDATE profiles
SET 
  role = 'teacher',
  full_name = 'أحمد محمد',
  phone = '+961 3 123 456',
  language_preference = 'ar'
WHERE email = 'teacher1@benaaschool.com';

UPDATE profiles
SET 
  role = 'teacher',
  full_name = 'فاطمة علي',
  phone = '+961 3 234 567',
  language_preference = 'ar'
WHERE email = 'teacher2@benaaschool.com';

UPDATE profiles
SET 
  role = 'teacher',
  full_name = 'محمد خالد',
  phone = '+961 3 345 678',
  language_preference = 'ar'
WHERE email = 'teacher3@benaaschool.com';

-- ============================================
-- Option 2: Insert profiles directly (if users exist)
-- ============================================

-- Note: This assumes users already exist in auth.users
-- Replace the UUIDs with actual user IDs from auth.users

/*
INSERT INTO profiles (id, email, full_name, role, phone, language_preference)
VALUES 
  (
    'USER_ID_1_HERE', -- Replace with actual user ID
    'teacher1@benaaschool.com',
    'أحمد محمد',
    'teacher',
    '+961 3 123 456',
    'ar'
  ),
  (
    'USER_ID_2_HERE', -- Replace with actual user ID
    'teacher2@benaaschool.com',
    'فاطمة علي',
    'teacher',
    '+961 3 234 567',
    'ar'
  ),
  (
    'USER_ID_3_HERE', -- Replace with actual user ID
    'teacher3@benaaschool.com',
    'محمد خالد',
    'teacher',
    '+961 3 345 678',
    'ar'
  )
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  language_preference = EXCLUDED.language_preference;
*/

-- ============================================
-- Verification: Check if teachers were added
-- ============================================

SELECT 
  id,
  email,
  full_name,
  role,
  phone,
  language_preference,
  created_at
FROM profiles
WHERE role = 'teacher'
ORDER BY created_at DESC
LIMIT 10;


