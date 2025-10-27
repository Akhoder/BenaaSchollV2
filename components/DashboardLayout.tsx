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
              'group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative',
              'hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20',
              'hover:shadow-md hover:-translate-y-0.5',
              isActive && 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
            )}
          >
            <Icon className={cn(
              'h-5 w-5 transition-colors',
              isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
            )} />
            <span className={cn(
              'font-medium transition-colors',
              isActive ? 'text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
            )}>{item.name}</span>
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity" />
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <nav className="fixed top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start">
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="mr-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-slate-900">
                  <div className="flex h-full flex-col gap-2 p-4">
                    <div className="flex items-center gap-2 px-3 py-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                        <GraduationCap className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-lg font-display font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">{t('appName')}</span>
                    </div>
                    <nav className="flex-1 space-y-1 pt-4">
                      <NavItems />
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/dashboard" className="flex items-center gap-2 group">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-display font-bold hidden sm:inline-block bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">{t('appName')}</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
                <SelectTrigger className="w-28 h-9 border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="ar">AR</SelectItem>
                  <SelectItem value="fr">FR</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                <Avatar className="h-8 w-8 ring-2 ring-blue-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-semibold">
                    {profile?.full_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-sm">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{profile?.full_name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{t(profile?.role || 'student')}</p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={signOut} title={t('signOut')} className="hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <aside className="fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-r border-slate-200/50 dark:border-slate-800/50 shadow-lg lg:translate-x-0">
        <div className="h-full px-3 pb-4 overflow-y-auto">
          <nav className="space-y-1">
            <NavItems />
          </nav>
        </div>
      </aside>

      <main className="p-4 lg:ml-64 pt-20 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
