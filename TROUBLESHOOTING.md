# BenaaSchool Troubleshooting Guide

## Common Issues and Solutions

### Database Errors

#### "Infinite recursion detected in policy for relation profiles"

**Problem**: RLS policies were querying the same table they were protecting, causing infinite recursion.

**Solution**: Fixed in migration `fix_rls_policies.sql`. The policies now use helper functions that prevent recursion.

**Status**: ✅ Resolved

#### "Invalid login credentials" on first login attempt

**Problem**: User doesn't exist in the database yet.

**Solution**:
1. Go to the registration page
2. Create a new account
3. Then login with those credentials

**Note**: An admin account already exists with email `akhoder83@gmail.com` (if you have access to this account)

### Authentication Issues

#### Cannot Register New User

**Symptoms**: Error message on registration form

**Solutions**:
1. Check that password is at least 6 characters
2. Verify email format is valid
3. Ensure all required fields are filled
4. Check browser console for specific error messages

#### Session Expires Immediately

**Symptoms**: Logged out right after logging in

**Solutions**:
1. Clear browser cache and cookies
2. Check that Supabase connection is active
3. Verify environment variables are set correctly

### Profile/Dashboard Issues

#### Dashboard Shows "Loading..." Forever

**Symptoms**: Dashboard never loads after login

**Solutions**:
1. Check browser console for errors
2. Verify user has a profile in the database
3. Clear browser cache
4. Try logging out and back in

#### Statistics Show 0 for Everything

**Symptoms**: All stat cards show zero

**Explanation**: This is normal for a new installation with no data.

**Solutions**:
1. Add classes using the admin dashboard
2. Register more users with different roles
3. Enroll students in classes
4. Data will populate automatically

### Language/UI Issues

#### RTL Layout Issues in Arabic

**Symptoms**: Layout looks broken in Arabic mode

**Solutions**:
1. Refresh the page
2. Clear browser cache
3. Ensure you're using a modern browser

#### Language Doesn't Persist

**Symptoms**: Language resets on page refresh

**Solutions**:
1. Check browser's localStorage is enabled
2. Clear site data and try again
3. Ensure cookies are enabled

### Development Issues

#### Build Warnings About Supabase

**Warning**: `Critical dependency: the request of a dependency is an expression`

**Status**: This is a known warning from Supabase's realtime module and can be safely ignored.

#### TypeScript Errors

**Symptoms**: Build fails with type errors

**Solutions**:
1. Run `npm run typecheck` to see all errors
2. Check that all imports are correct
3. Verify types match the database schema

## Database Schema Issues

### Missing Tables

If you see errors about missing tables:

```sql
-- Check if all tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Expected tables:
- profiles
- classes
- subjects
- student_enrollments
- class_subjects
- announcements

### RLS Policies Not Working

If users can't access their own data:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`

## Quick Fixes

### Reset User Session
```javascript
// In browser console
localStorage.clear();
location.reload();
```

### Check Supabase Connection
```javascript
// In browser console
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);
```

### Manual Profile Creation

If a user registered but has no profile:

```sql
INSERT INTO profiles (id, email, full_name, role, language_preference)
VALUES (
  'user-uuid-here',
  'user@example.com',
  'Full Name',
  'student',
  'en'
);
```

## Getting Help

### Before Reporting an Issue

1. ✅ Check this troubleshooting guide
2. ✅ Check browser console for errors
3. ✅ Try clearing cache and cookies
4. ✅ Verify environment variables are set
5. ✅ Test with a different browser

### Information to Include

When reporting an issue, include:
- Browser and version
- User role
- Steps to reproduce
- Error messages from console
- Screenshots if applicable

## Database Maintenance

### Check Active Users
```sql
SELECT id, email, role, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;
```

### View All Classes
```sql
SELECT c.*, p1.full_name as teacher_name, p2.full_name as supervisor_name
FROM classes c
LEFT JOIN profiles p1 ON c.teacher_id = p1.id
LEFT JOIN profiles p2 ON c.supervisor_id = p2.id;
```

### Check Enrollments
```sql
SELECT
  p.full_name as student_name,
  c.name as class_name,
  se.status,
  se.enrollment_date
FROM student_enrollments se
JOIN profiles p ON se.student_id = p.id
JOIN classes c ON se.class_id = c.id
ORDER BY se.enrollment_date DESC;
```

## Performance Issues

### Slow Dashboard Loading

**Solutions**:
1. Check database query performance
2. Ensure indexes are created
3. Limit data fetching to necessary fields only

### High Memory Usage

**Solutions**:
1. Close unused browser tabs
2. Clear browser cache
3. Restart the development server

## Security Notes

### RLS Policy Structure

The application uses these security layers:

1. **Authentication**: Supabase Auth handles login/logout
2. **Row Level Security**: Database policies control data access
3. **Role-Based Access**: Policies check user roles
4. **Helper Functions**: Prevent policy recursion

### Admin Access

Admins have full system access through:
- `is_admin()` helper function
- Separate policies for each operation
- Service role bypass for system operations

## Testing Checklist

After making changes, test:

- [ ] User registration works
- [ ] Login/logout works
- [ ] Language switching works
- [ ] Each role sees appropriate dashboard
- [ ] Users can only access their own data
- [ ] Admins can manage all data
- [ ] Build completes without errors
- [ ] No console errors on login
- [ ] Statistics display correctly

## Migration Issues

### Failed Migration

If a migration fails:

1. Check the error message
2. Verify SQL syntax
3. Ensure tables/columns don't already exist
4. Check for constraint violations

### Rollback Strategy

Migrations cannot be automatically rolled back. To undo:

1. Identify what the migration created
2. Write SQL to remove those changes
3. Create a new migration with the rollback SQL
4. Test thoroughly before applying

## Contact & Support

For persistent issues:
- Review the README.md for setup instructions
- Check USAGE.md for feature documentation
- Examine the database schema in migrations
- Contact your system administrator
