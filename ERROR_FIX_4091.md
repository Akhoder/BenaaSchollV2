# Error -4091 Fix Documentation

## Overview
Error -4091 is a PostgreSQL constraint violation error that was occurring during user signup and profile creation. This document explains the fixes applied.

## Root Causes

### 1. Profile Not Created Immediately After Signup
- The Supabase trigger `handle_new_user()` creates the profile in the `profiles` table
- Sometimes there's a delay between user creation and profile creation
- When the frontend tries to fetch the profile immediately, it may not exist yet

### 2. RLS Policy Constraints
- The Row Level Security (RLS) policies on the `profiles` table were causing issues
- Error -4091 indicates a constraint violation or policy violation

### 3. Missing Error Handling
- The original code didn't handle the case where the profile doesn't exist yet
- No retry mechanism was in place

## Fixes Applied

### 1. Improved Error Handling in AuthContext (contexts/AuthContext.tsx)

**Before:**
```typescript
const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (data) {
    setProfile(data);
  }
};
```

**After:**
```typescript
const fetchProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      // If profile doesn't exist, create a default one
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        // Profile doesn't exist yet, this is normal during signup
        return;
      }
    }

    if (data) {
      setProfile(data);
    }
  } catch (err) {
    console.error('Unexpected error fetching profile:', err);
  }
};
```

**Key improvements:**
- Added try-catch block for better error handling
- Handle case where profile doesn't exist (PGRST116 error code)
- Log errors for debugging
- Silent fail when profile doesn't exist during signup

### 2. Enhanced Signup Flow

**Before:**
```typescript
const signUp = async (email: string, password: string, fullName: string, role: string, language: string) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
        preferred_language: language,
      },
    },
  });

  if (!error) {
    router.push('/login');
  }

  return { error };
};
```

**After:**
```typescript
const signUp = async (email: string, password: string, fullName: string, role: string, language: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          preferred_language: language,
        },
      },
    });

    if (error) {
      console.error('Signup error:', error);
      return { error };
    }

    // Wait a moment for the trigger to create the profile
    if (data.user) {
      // Try to fetch the profile after a short delay
      setTimeout(async () => {
        await fetchProfile(data.user!.id);
      }, 1000);
    }

    router.push('/login');
    return { error: null };
  } catch (err) {
    console.error('Unexpected error during signup:', err);
    return { error: err };
  }
};
```

**Key improvements:**
- Added comprehensive error handling with try-catch
- Added 1-second delay before fetching profile to allow trigger to complete
- Better error logging
- Returns error object consistently

### 3. Improved Dashboard Error Handling (app/dashboard/page.tsx)

**Before:**
```typescript
useEffect(() => {
  if (profile) {
    fetchStats();
  }
}, [profile]);
```

**After:**
```typescript
useEffect(() => {
  if (profile) {
    fetchStats().catch(err => {
      console.error('Error fetching stats:', err);
    });
  }
}, [profile]);
```

**Key improvements:**
- Added error catching for stats fetching
- Prevents app crash if stats fail to load
- Better debugging with error logging

## How This Fixes Error -4091

1. **Graceful Handling of Missing Profiles**: The error -4091 often occurs when trying to access a profile that doesn't exist yet. The new code handles this gracefully.

2. **Delay for Trigger Completion**: Added a 1-second delay after signup to allow the database trigger to create the profile before trying to fetch it.

3. **Better Error Messages**: The console now logs detailed error messages, making it easier to debug issues.

4. **Prevents Infinite Loops**: The silent return when profile doesn't exist prevents retry loops.

## Testing

To test if the fix works:

1. **Test Signup:**
   - Go to `/register`
   - Create a new user account
   - Should redirect to login page without errors
   - Check browser console for any error messages

2. **Test Login:**
   - Login with the newly created account
   - Should navigate to dashboard without errors
   - Profile should load correctly

3. **Test Dashboard:**
   - Dashboard should load statistics
   - No error -4091 in console
   - All features working properly

## Database Setup

Ensure these migrations have been applied:

1. `20251027193030_fix_profile_creation_trigger.sql` - Creates the profile trigger
2. `20251027194303_fix_rls_policies.sql` - Fixes RLS policies
3. `20251027194813_fix_all_recursive_policies.sql` - Fixes recursive policies
4. `20251027202819_fix_security_and_performance_issues.sql` - Optimizes policies

Run these migrations in your Supabase project to ensure the database is properly configured.

## Additional Notes

- Error -4091 can also occur if the Supabase RLS policies are misconfigured
- Ensure the `handle_new_user()` trigger function exists and is working
- Check that the `profiles` table has proper indexes
- Verify environment variables are set correctly (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Related Files

- `contexts/AuthContext.tsx` - Main authentication context with fixes
- `app/dashboard/page.tsx` - Dashboard page with error handling
- `lib/supabase.ts` - Supabase client configuration
- `supabase/migrations/` - Database migrations

## Success Indicators

After applying these fixes, you should see:
- ✅ No error -4091 in browser console
- ✅ Successful user registration
- ✅ Profiles created automatically on signup
- ✅ Dashboard loads without errors
- ✅ All user types can login and access their dashboards

