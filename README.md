# BenaaSchool - Multi-Language School Management System

A modern, responsive school management application built with Next.js 13, TypeScript, Supabase, and Tailwind CSS. Features complete authentication, role-based access control, and multi-language support (English, Arabic, French).

## Features

### Authentication & Authorization
- **Secure Authentication**: Email/password authentication powered by Supabase
- **Role-Based Access Control**: Four distinct user roles
  - **Admin**: Full system access, manage users, classes, and school data
  - **Teacher**: Manage assigned classes and students
  - **Student**: View classes, grades, and schedule
  - **Supervisor**: Monitor assigned classes and generate reports
- **Protected Routes**: Automatic redirection based on authentication state

### Multi-Language Support
- **Three Languages**: English, Arabic (RTL), and French
- **Dynamic Language Switching**: Change language on the fly
- **Persistent Preferences**: Language preference saved per user
- **RTL Support**: Proper right-to-left layout for Arabic

### User Interface
- **Modern Design**: Clean, professional interface with Tailwind CSS
- **Responsive Layout**: Mobile-first design that works on all devices
- **Dashboard System**: Role-specific dashboards with relevant information
- **Component Library**: Built with shadcn/ui components
- **Dark Mode Ready**: Supports dark mode themes

### Database Structure
- **Users & Profiles**: User authentication and profile management
- **Classes**: Class management with teacher and supervisor assignments
- **Students**: Student enrollment and tracking
- **Subjects**: Academic subject management
- **Announcements**: School-wide communication system
- **Row Level Security**: Secure data access at database level

## Technology Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Environment variables are already configured in `.env`

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## User Roles & Permissions

### Admin
- View all users, classes, students, and teachers
- Create and manage users
- Assign teachers and supervisors to classes
- Manage subjects and academic data
- View system-wide statistics

### Teacher
- View assigned classes
- See enrolled students in their classes
- Access class schedules
- Manage grades for their classes

### Student
- View enrolled classes
- Check grades and attendance
- View class schedule
- Access learning materials

### Supervisor
- Monitor assigned classes
- View student performance in supervised classes
- Generate reports
- Track attendance and progress

## Database Schema

### Core Tables

**profiles**
- User profile information
- Role assignment
- Language preferences
- Contact information

**classes**
- Class information
- Teacher and supervisor assignments
- Grade level and academic year
- Active/inactive status

**student_enrollments**
- Links students to classes
- Enrollment status tracking
- Enrollment dates

**subjects**
- Academic subjects
- Subject descriptions

**announcements**
- School-wide communications
- Role-based targeting
- Publication status

## Security

- **Row Level Security (RLS)**: All tables have RLS policies
- **Role-Based Policies**: Access control based on user roles
- **Secure Authentication**: Handled by Supabase Auth
- **Protected API Routes**: Server-side validation
- **Type Safety**: Full TypeScript implementation

## Project Structure

```
project/
├── app/
│   ├── dashboard/          # Dashboard pages
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Home page (redirects)
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── DashboardLayout.tsx # Dashboard layout wrapper
│   └── StatCard.tsx        # Statistics card component
├── contexts/
│   ├── AuthContext.tsx     # Authentication context
│   └── LanguageContext.tsx # Language switching context
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── translations.ts     # Translation strings
│   └── utils.ts            # Utility functions
└── public/                 # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Multi-Language Implementation

The app uses a context-based translation system:

```typescript
import { useLanguage } from '@/contexts/LanguageContext';

function MyComponent() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={() => setLanguage('ar')}>
        Switch to Arabic
      </button>
    </div>
  );
}
```

## Contributing

This is a production-ready school management system. To add new features:

1. Follow the existing code structure
2. Maintain TypeScript type safety
3. Ensure responsive design
4. Add translations for all new text
5. Test with all user roles
6. Update RLS policies if adding new tables

## License

This project is proprietary software for BenaaSchool.
