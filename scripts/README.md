# Scripts Directory

This directory contains utility scripts for database management and setup.

## Add Teachers Script

### TypeScript Script (Recommended)

The TypeScript script automatically creates users in `auth.users` and their profiles.

**Prerequisites:**
- Node.js installed
- Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Usage:**
```bash
# Install dependencies if needed
npm install

# Run the script
npx tsx scripts/add-teachers.ts

# Or with ts-node
npx ts-node scripts/add-teachers.ts
```

**What it does:**
1. Creates 3 teachers in `auth.users` via Supabase Admin API
2. Automatically creates profiles via trigger
3. Updates profiles with additional information (phone, language preference)
4. Handles existing users gracefully

**Teachers Created:**
- Email: `teacher1@benaaschool.com` | Password: `Teacher123!` | Name: أحمد محمد
- Email: `teacher2@benaaschool.com` | Password: `Teacher123!` | Name: فاطمة علي
- Email: `teacher3@benaaschool.com` | Password: `Teacher123!` | Name: محمد خالد

### SQL Script (Alternative)

The SQL script only updates profiles. You need to create users in `auth.users` first.

**Usage:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `scripts/add-teachers.sql`
3. Run the script

**Note:** This script assumes users already exist in `auth.users`. If not, use the TypeScript script instead.

## Environment Variables

Make sure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**⚠️ Important:** Never commit `.env.local` to version control!

## Troubleshooting

### Error: Missing environment variables
- Make sure `.env.local` exists and contains the required variables
- Check that variable names are correct (case-sensitive)

### Error: User already exists
- The script will update existing users instead of creating new ones
- This is safe and won't cause errors

### Error: Permission denied
- Make sure you're using the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key)
- The service role key bypasses RLS policies

### Error: Profile not created
- The trigger should create profiles automatically
- If not, the script will create them manually
- Wait a moment after user creation for the trigger to run


