# BenaaSchool Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### What You Have

A complete, production-ready school management system with:
- ✅ Multi-language support (English, Arabic, French)
- ✅ 4 user roles (Admin, Teacher, Student, Supervisor)
- ✅ Role-based dashboards
- ✅ Secure authentication
- ✅ Database with Row Level Security
- ✅ Responsive mobile-first design

### Current Status

- **Database**: ✅ Set up and connected
- **Authentication**: ✅ Fully functional
- **RLS Policies**: ✅ Fixed (no recursion)
- **Admin Functions**: ✅ Working
- **Build**: ✅ Successful
- **Existing User**: Admin account at `akhoder83@gmail.com`

---

## Step 1: Access the Application

The application is already running. Open it in your browser.

---

## Step 2: Login or Register

### Option A: Login with Existing Account
If you have access to `akhoder83@gmail.com`, use that account (it's already an admin).

### Option B: Create a New Account
1. Click **"Register"** on the login page
2. Fill in your details:
   - Full Name
   - Email
   - Password (min 6 characters)
   - Select Role (try "Student" for your first test)
   - Choose Language
3. Click **"Sign Up"**
4. Go back to login and sign in

---

## Step 3: Explore Your Dashboard

After logging in, you'll see a role-specific dashboard:

### As Admin 👨‍💼
- View statistics (students, teachers, classes)
- Access all management features
- Create classes and assign teachers
- Manage users

### As Teacher 👨‍🏫
- View assigned classes
- See enrolled students
- Manage grades
- Check schedule

### As Student 👨‍🎓
- View enrolled classes
- Check grades
- See schedule
- Track attendance

### As Supervisor 👨‍💼
- Monitor assigned classes
- View student progress
- Generate reports

---

## Step 4: Test Multi-Language

1. Look for the language selector in the top right corner
2. Click and select:
   - **EN** for English
   - **AR** for Arabic (switches to RTL layout)
   - **FR** for French
3. The entire interface updates instantly

---

## Common First Tasks

### For Testing (Try These!)

1. **Create a Second User**
   - Sign out
   - Register with a different role
   - Login and see different dashboard

2. **Test Language Switching**
   - Switch to Arabic
   - Notice the RTL layout
   - All text translates automatically

3. **Check Your Profile**
   - Your name and role appear in the top right
   - Avatar shows your first initial

---

## Understanding the System

### User Roles Explained

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Admin** | Everything - full system access | N/A |
| **Teacher** | View/manage assigned classes and students | View other teachers' classes |
| **Student** | View own classes and grades | View other students' data |
| **Supervisor** | Monitor assigned classes | Modify class content |

### Navigation

- **Sidebar** (left): Main navigation menu
- **Top Bar**: User info, language selector, sign out
- **Mobile**: Hamburger menu icon (top left)

---

## Important Notes

### Database Security

The database uses Row Level Security (RLS):
- ✅ Users can only see their own data
- ✅ Admins use special functions to view all data
- ✅ No infinite recursion errors (fixed!)
- ✅ All policies tested and working

### Admin Operations

Admin users access aggregate data through database functions:
- `get_total_students()` - Count all students
- `get_total_teachers()` - Count all teachers
- `get_all_profiles()` - View all user profiles

These functions verify admin role before executing.

---

## Troubleshooting

### Can't Login?
- Make sure you registered first
- Check email/password are correct
- Try clearing browser cache

### Dashboard Shows Zero?
- Normal for new installation
- Add more users and classes
- Statistics will populate automatically

### Language Not Working?
- Refresh the page
- Clear browser cache
- Check localStorage is enabled

### Still Having Issues?
See **TROUBLESHOOTING.md** for detailed solutions.

---

## Next Steps

### For Development
1. Add more features (see README.md)
2. Customize the design
3. Add more translations
4. Create additional pages

### For Production
1. Test with all user roles
2. Add real data (students, classes)
3. Configure email notifications
4. Set up backups

---

## Quick Reference

### File Structure
```
project/
├── app/              # Pages (login, register, dashboard)
├── components/       # Reusable UI components
├── contexts/         # Auth and Language contexts
├── lib/             # Supabase client, translations
└── supabase/        # Database migrations
```

### Key Files
- `app/dashboard/page.tsx` - Main dashboard
- `contexts/AuthContext.tsx` - Authentication logic
- `contexts/LanguageContext.tsx` - Translation system
- `lib/translations.ts` - All translations
- `DATABASE_SETUP.md` - Database documentation

### Environment
Database connection is configured in `.env` (already set up).

---

## Help & Documentation

| Document | Purpose |
|----------|---------|
| **README.md** | Complete project documentation |
| **USAGE.md** | Detailed user guide |
| **TROUBLESHOOTING.md** | Problem solving |
| **DATABASE_SETUP.md** | Database architecture |
| **This File** | Quick start guide |

---

## Success Checklist

- [ ] Application loads without errors
- [ ] Can create new account
- [ ] Can login successfully
- [ ] Dashboard displays correctly
- [ ] Language switching works
- [ ] Mobile view is responsive
- [ ] Can logout and login again
- [ ] Different roles show different dashboards

---

## 🎉 You're Ready!

The application is fully functional and ready to use. Start by creating accounts with different roles to explore all features.

**Need help?** Check TROUBLESHOOTING.md or review the detailed documentation in README.md.

**Want to customize?** The codebase is well-organized and follows Next.js best practices. Start with the `app/dashboard/page.tsx` file.

---

## Testing Scenarios

### Scenario 1: Admin Workflow
1. Login as admin
2. View statistics dashboard
3. Check that counts are displayed
4. Switch languages

### Scenario 2: Student Workflow
1. Register as student
2. Login and view dashboard
3. See enrolled classes section
4. Check grades area

### Scenario 3: Multi-Language
1. Start in English
2. Switch to Arabic - layout flips to RTL
3. Switch to French
4. Verify all text translates

---

**Pro Tip**: The system is designed to be intuitive. Explore the interface and you'll discover all features naturally!

Happy teaching and learning with BenaaSchool! 🎓
