# BenaaSchool Database Setup & Security

## Overview

This document explains the database architecture, security model, and how the RLS (Row Level Security) policies work in BenaaSchool.

## Database Schema

### Core Tables

#### profiles
Stores user profile information linked to Supabase Auth users.

```sql
- id (uuid, primary key, references auth.users)
- email (text)
- full_name (text)
- role (text: admin, teacher, student, supervisor)
- avatar_url (text, optional)
- phone (text, optional)
- language_preference (text: en, ar, fr)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### classes
Manages school classes with teacher and supervisor assignments.

```sql
- id (uuid, primary key)
- name (text)
- grade_level (integer)
- teacher_id (uuid, references profiles)
- supervisor_id (uuid, references profiles)
- academic_year (text)
- created_at (timestamptz)
```

#### subjects
Academic subjects offered by the school.

```sql
- id (uuid, primary key)
- name (text, unique)
- description (text, optional)
- created_at (timestamptz)
```

#### student_enrollments
Links students to classes they're enrolled in.

```sql
- id (uuid, primary key)
- student_id (uuid, references profiles)
- class_id (uuid, references classes)
- enrollment_date (date)
- status (text: active, inactive, graduated)
- created_at (timestamptz)
```

#### announcements
School-wide or role-specific announcements.

```sql
- id (uuid, primary key)
- title (text)
- content (text)
- author_id (uuid, references profiles)
- target_roles (text[])
- is_published (boolean)
- created_at (timestamptz)
```

## Security Model

### Row Level Security (RLS)

All tables have RLS enabled. The security model is designed to prevent infinite recursion while maintaining proper access control.

### RLS Policies for Profiles Table

#### 1. Read Own Profile
```sql
CREATE POLICY "enable_read_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
```
**Purpose**: Users can read their own profile
**Access**: Any authenticated user can view their own data

#### 2. Update Own Profile
```sql
CREATE POLICY "enable_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```
**Purpose**: Users can update their own profile
**Access**: Limited to own profile only

#### 3. Insert Own Profile
```sql
CREATE POLICY "enable_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
```
**Purpose**: Allows profile creation during signup
**Access**: Users can only create their own profile

#### 4. Service Role Full Access
```sql
CREATE POLICY "service_role_all_access"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```
**Purpose**: Bypasses RLS for service role operations
**Access**: Backend operations and admin functions

## Admin Functions

Since RLS policies prevent querying other users' data, we use SECURITY DEFINER functions for admin operations.

### get_total_students()
Returns count of all students. Only accessible to admins.

```sql
SELECT get_total_students();
```

### get_total_teachers()
Returns count of all teachers. Only accessible to admins.

```sql
SELECT get_total_teachers();
```

### get_total_supervisors()
Returns count of all supervisors. Only accessible to admins.

```sql
SELECT get_total_supervisors();
```

### get_all_profiles()
Returns all profiles. Only accessible to admins.

```sql
SELECT * FROM get_all_profiles();
```

## How It Works

### User Registration Flow

1. User submits registration form with role and details
2. Supabase Auth creates user in `auth.users`
3. Trigger `on_auth_user_created` fires automatically
4. Function `handle_new_user()` creates profile in `profiles` table
5. User can now login and access their dashboard

### Authentication Flow

1. User logs in with email/password
2. Supabase Auth validates credentials
3. Session established with JWT token
4. Frontend fetches user profile using `auth.uid()`
5. Dashboard loads based on user role

### Authorization Flow

1. User makes request to database
2. RLS policies check `auth.uid()` against data
3. Policies allow/deny access based on ownership
4. Admin functions use SECURITY DEFINER to bypass RLS when needed

## Why This Approach?

### Problem: Infinite Recursion
Previous implementations had policies that queried the `profiles` table while protecting it:

```sql
-- BAD: This causes recursion!
CREATE POLICY "admin_access"
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

When a query runs, it checks the policy, which queries profiles, which checks the policy again... infinite loop!

### Solution: SECURITY DEFINER Functions
Functions with SECURITY DEFINER run with elevated privileges and bypass RLS:

```sql
-- GOOD: Function bypasses RLS
CREATE OR REPLACE FUNCTION get_total_students()
RETURNS bigint
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RETURN 0;
  END IF;

  -- Count all students (bypasses RLS)
  RETURN (SELECT COUNT(*) FROM profiles WHERE role = 'student');
END;
$$;
```

## Access Control Matrix

| Role | Own Profile | Own Classes | All Profiles | All Classes | Statistics |
|------|-------------|-------------|--------------|-------------|------------|
| **Admin** | ✅ Read/Write | ✅ Read/Write | ✅ Via Functions | ✅ Read/Write | ✅ Via Functions |
| **Teacher** | ✅ Read/Write | ✅ Read (assigned) | ❌ | ✅ Read (assigned) | ✅ Own classes only |
| **Student** | ✅ Read/Write | ✅ Read (enrolled) | ❌ | ✅ Read (enrolled) | ✅ Own data only |
| **Supervisor** | ✅ Read/Write | ✅ Read (assigned) | ❌ | ✅ Read (assigned) | ✅ Assigned only |

## Best Practices

### ✅ DO

1. **Use auth.uid() for ownership checks**
   ```sql
   USING (auth.uid() = user_id)
   ```

2. **Create SECURITY DEFINER functions for admin operations**
   ```sql
   CREATE FUNCTION admin_get_users() SECURITY DEFINER ...
   ```

3. **Keep policies simple and non-recursive**
   ```sql
   USING (auth.uid() = id)  -- Simple, no subqueries
   ```

4. **Test policies with different roles**
   ```sql
   SET ROLE authenticated;
   SELECT * FROM profiles;  -- Should only see own profile
   ```

### ❌ DON'T

1. **Don't query the same table in its own policies**
   ```sql
   -- BAD: Causes recursion
   USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
   ```

2. **Don't use helper functions that query protected tables**
   ```sql
   -- BAD: is_admin() queries profiles, causing recursion
   CREATE FUNCTION is_admin() RETURNS boolean AS $$
     SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
   $$;
   ```

3. **Don't bypass RLS in application code**
   ```javascript
   // BAD: Using service role key in frontend
   const supabase = createClient(url, SERVICE_ROLE_KEY);
   ```

## Troubleshooting

### "Infinite recursion detected" Error

**Cause**: Policy is querying the same table it's protecting

**Fix**: Remove the policy and create a SECURITY DEFINER function instead

### "Row level security policy violation"

**Cause**: User doesn't have permission to access the data

**Fix**:
1. Check if user is logged in (`auth.uid()` is not null)
2. Verify the policy allows access
3. Check if the record belongs to the user

### Functions Return 0 for Admin

**Cause**: The admin check in the function is failing

**Fix**:
1. Verify admin user has `role = 'admin'` in profiles table
2. Check if `auth.uid()` matches the admin's profile ID
3. Ensure the function has SECURITY DEFINER privilege

## Testing RLS Policies

### Test as Different Users

```sql
-- Test as specific user
SET request.jwt.claims.sub TO 'user-uuid-here';

-- Try to read all profiles (should only see own)
SELECT * FROM profiles;

-- Reset
RESET request.jwt.claims.sub;
```

### Verify Policy Effectiveness

```sql
-- Check all policies on a table
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Test if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'profiles';
```

## Migration Strategy

When adding new features:

1. **Plan the access pattern** - Who needs access to what?
2. **Create tables with RLS enabled** - Always enable RLS on new tables
3. **Write simple policies first** - Start with basic ownership checks
4. **Add SECURITY DEFINER functions for cross-user access** - Admin operations
5. **Test with multiple roles** - Verify each role's access
6. **Document the policies** - Explain why each policy exists

## Summary

The BenaaSchool database security model prioritizes:

1. ✅ **No infinite recursion** - Simple policies, SECURITY DEFINER functions
2. ✅ **Proper access control** - Users only see their own data
3. ✅ **Admin flexibility** - Functions allow admin operations
4. ✅ **Maintainability** - Clear, documented approach
5. ✅ **Security** - RLS enforced at database level

This approach ensures data security while maintaining a clean, understandable codebase.
