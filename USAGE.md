# BenaaSchool Usage Guide

## Getting Started

### First Time Setup

1. **Access the Application**
   - Navigate to the application URL
   - You'll be automatically redirected to the login page

2. **Create Your First Account**
   - Click "Register" on the login page
   - Fill in your details:
     - Full Name
     - Email address
     - Password (minimum 6 characters)
     - Select your role (Admin, Teacher, Student, or Supervisor)
     - Choose your preferred language
   - Click "Sign Up"

3. **Login**
   - Enter your email and password
   - Click "Sign In"
   - You'll be redirected to your role-specific dashboard

## User Roles

### Admin Dashboard Features
- **Overview Statistics**: View total students, teachers, classes, and subjects
- **User Management**: Access to manage all users
- **Class Management**: Create and manage classes
- **Subject Management**: Add and edit academic subjects
- **Full Access**: Can view and modify all system data

### Teacher Dashboard Features
- **My Classes**: View all assigned classes
- **Students**: See students enrolled in your classes
- **Schedule**: View your teaching schedule
- **Grades**: Manage grades for your students
- **Announcements**: Create and view class announcements

### Student Dashboard Features
- **My Classes**: View enrolled classes
- **My Grades**: Check your academic performance
- **Schedule**: View your class schedule
- **Attendance**: Track your attendance record
- **Announcements**: View important updates

### Supervisor Dashboard Features
- **Assigned Classes**: View classes under supervision
- **Student Monitoring**: Track student progress
- **Reports**: Generate and view reports
- **Announcements**: View and create announcements

## Language Switching

### How to Change Language

1. Look for the language selector in the top right corner
2. Click the dropdown (shows current language: EN, AR, or FR)
3. Select your preferred language:
   - **EN** - English
   - **AR** - العربية (Arabic with RTL support)
   - **FR** - Français (French)
4. The interface updates immediately
5. Your preference is saved automatically

### Arabic (RTL) Support
- When Arabic is selected, the entire layout switches to right-to-left
- All text and navigation elements are properly mirrored
- Maintains the same functionality with proper directionality

## Navigation

### Desktop Navigation
- **Sidebar**: Fixed left sidebar with all menu items
- **Top Bar**: User profile, language selector, and sign out button
- **Content Area**: Main dashboard content on the right

### Mobile Navigation
- **Menu Button**: Tap the hamburger menu icon (top left)
- **Slide-out Menu**: Sidebar slides in from the left
- **Responsive Design**: All features accessible on mobile devices

## Dashboard Features

### Statistics Cards
- Display key metrics based on your role
- Real-time data from the database
- Quick overview of important numbers

### Quick Actions
- Common tasks for your role
- One-click access to frequent operations
- Context-sensitive based on permissions

### Recent Activity
- View latest updates and changes
- Track important events
- Stay informed about system activities

## Security Features

### Authentication
- Secure email/password authentication
- Session management
- Automatic logout on inactivity

### Data Protection
- Row Level Security (RLS) ensures users only see their data
- Role-based access control prevents unauthorized access
- Encrypted password storage

### Privacy
- User data is protected by Supabase security
- Each role has specific permissions
- Audit trails for sensitive operations

## Common Tasks

### For Admins

**Adding a New Student**
1. Navigate to Users section
2. Click "Add New User"
3. Fill in student details
4. Assign to appropriate class
5. Save

**Creating a Class**
1. Go to Classes section
2. Click "Add New Class"
3. Set grade level and name
4. Assign teacher and supervisor
5. Set academic year
6. Save

### For Teachers

**Viewing Class Students**
1. Go to My Classes
2. Click on a class name
3. View enrolled students
4. Access student details

**Managing Grades**
1. Navigate to Grades section
2. Select a class
3. Enter or update grades
4. Save changes

### For Students

**Checking Grades**
1. Click on "My Grades" in the sidebar
2. View grades by subject
3. See overall performance

**Viewing Schedule**
1. Go to "My Schedule"
2. View daily/weekly schedule
3. Check class times and locations

### For Supervisors

**Monitoring Classes**
1. View Assigned Classes
2. Click on a class to see details
3. Monitor student progress
4. Generate reports as needed

## Tips & Best Practices

### For All Users
- Keep your profile information up to date
- Check announcements regularly
- Use the language that's most comfortable for you
- Sign out when using shared devices

### For Admins
- Regularly review user accounts
- Keep class assignments updated
- Monitor system statistics
- Maintain data accuracy

### For Teachers
- Update grades promptly
- Post important announcements
- Keep track of student attendance
- Review class statistics regularly

### For Students
- Check your schedule daily
- Monitor your grades
- Read announcements
- Keep your profile current

## Troubleshooting

### Cannot Login
- Verify email and password are correct
- Ensure caps lock is off
- Check your internet connection
- Try resetting your password (if available)

### Dashboard Not Loading
- Refresh the page
- Clear browser cache
- Check internet connection
- Sign out and sign back in

### Language Not Changing
- Refresh the page after selecting language
- Clear browser cache
- Try a different browser

### Data Not Displaying
- Verify your role has permission to view the data
- Refresh the page
- Check if you're logged in
- Contact your administrator

## Support

For additional help or to report issues:
- Contact your school administrator
- Check the main README.md for technical details
- Review the database structure in the documentation

## Quick Reference

### Keyboard Shortcuts
- **Tab**: Navigate through form fields
- **Enter**: Submit forms
- **Esc**: Close modals/dialogs

### User Roles Summary
- **Admin**: Full system access
- **Teacher**: Class and student management
- **Student**: View personal information
- **Supervisor**: Monitor and report

### Available Languages
- English (EN) - Left-to-right
- Arabic (AR) - Right-to-left
- French (FR) - Left-to-right
