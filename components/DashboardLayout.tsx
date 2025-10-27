'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  UserCircle
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const pathname = usePathname();

  const navigation = [
    { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student', 'supervisor'] },
    { name: t('users'), href: '/dashboard/users', icon: Users, roles: ['admin'] },
    { name: t('classes'), href: '/dashboard/classes', icon: School, roles: ['admin', 'teacher', 'supervisor'] },
    { name: t('students'), href: '/dashboard/students', icon: Users, roles: ['admin', 'teacher', 'supervisor'] },
    { name: t('subjects'), href: '/dashboard/subjects', icon: BookOpen, roles: ['admin'] },
    { name: t('schedule'), href: '/dashboard/schedule', icon: Calendar, roles: ['admin', 'teacher', 'student'] },
    { name: t('grades'), href: '/dashboard/grades', icon: FileText, roles: ['teacher', 'student'] },
    { name: t('announcements'), href: '/dashboard/announcements', icon: FileText, roles: ['admin', 'teacher', 'student', 'supervisor'] },
  ];

  const filteredNavigation = navigation.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  );

  const NavItems = () => (
    <>
      {filteredNavigation.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-slate-800',
              isActive && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <nav className="fixed top-0 z-50 w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start">
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="mr-2">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="flex h-full flex-col gap-2 p-4">
                    <div className="flex items-center gap-2 px-3 py-4 border-b border-slate-200 dark:border-slate-800">
                      <GraduationCap className="h-6 w-6 text-blue-600" />
                      <span className="text-lg font-bold">{t('appName')}</span>
                    </div>
                    <nav className="flex-1 space-y-1 pt-4">
                      <NavItems />
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold hidden sm:inline-block">{t('appName')}</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
                <SelectTrigger className="w-28 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="ar">AR</SelectItem>
                  <SelectItem value="fr">FR</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    {profile?.full_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-sm">
                  <p className="font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t(profile?.role || 'student')}</p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={signOut} title={t('signOut')}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <aside className="fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-slate-200 dark:bg-slate-950 dark:border-slate-800 lg:translate-x-0">
        <div className="h-full px-3 pb-4 overflow-y-auto">
          <nav className="space-y-1">
            <NavItems />
          </nav>
        </div>
      </aside>

      <main className="p-4 lg:ml-64 pt-20">
        {children}
      </main>
    </div>
  );
}
