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
  UserCircle,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Breadcrumbs } from '@/components/Breadcrumbs';
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
    { name: 'My Classes', href: '/dashboard/my-classes', icon: School, roles: ['student'] },
    { name: 'My Assignments', href: '/dashboard/my-assignments', icon: FileText, roles: ['student'] },
    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare, roles: ['admin', 'teacher', 'student', 'supervisor'] },
    { name: t('users'), href: '/dashboard/users', icon: Users, roles: ['admin'] },
    { name: 'Teachers', href: '/dashboard/teachers', icon: Users, roles: ['admin'] },
    { name: t('classes'), href: '/dashboard/classes', icon: School, roles: ['admin', 'teacher', 'supervisor'] },
    { name: t('students'), href: '/dashboard/students', icon: Users, roles: ['admin', 'teacher', 'supervisor'] },
    { name: t('subjects'), href: '/dashboard/subjects', icon: BookOpen, roles: ['admin', 'teacher', 'supervisor'] },
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
              'group flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 relative',
              'hover:bg-[hsl(var(--primary-light))] dark:hover:bg-[hsl(var(--primary-light))]',
              'hover:shadow-md hover:-translate-y-0.5',
              isActive && 'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-hover))] text-white shadow-lg',
              !isActive && 'text-[hsl(var(--foreground))]'
            )}
          >
            <Icon className={cn(
              'h-5 w-5 transition-colors flex-shrink-0',
              isActive ? 'text-white' : 'text-[hsl(var(--primary))] group-hover:text-[hsl(var(--primary-hover))]'
            )} />
            <span className={cn(
              'font-medium transition-colors text-sm sm:text-base',
              isActive ? 'text-white' : 'text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]'
            )}>{item.name}</span>
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-hover))] rounded-xl opacity-0 group-hover:opacity-10 transition-opacity" />
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-green-50/20 to-amber-50/10 dark:from-[hsl(142_30%_8%)] dark:via-[hsl(142_25%_10%)] dark:to-[hsl(142_20%_12%)]">
      <nav className="fixed top-0 z-50 w-full bg-white/95 dark:bg-[hsl(142_25%_10%)]/95 backdrop-blur-lg border-b border-[hsl(var(--border))] shadow-sm">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start gap-3">
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="hover:bg-[hsl(var(--primary-light))] dark:hover:bg-[hsl(var(--primary-light))]">
                    <Menu className="h-6 w-6 text-[hsl(var(--primary))]" />
                  </Button>
                </SheetTrigger>
                <SheetContent side={language === 'ar' ? 'right' : 'left'} className="w-64 p-0 bg-white dark:bg-[hsl(142_25%_10%)] border-[hsl(var(--border))]">
                  <div className="flex h-full flex-col gap-2 p-4">
                    <div className="flex items-center gap-3 px-3 py-4 border-b border-[hsl(var(--border))]">
                      <div className="p-2 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-hover))] rounded-xl shadow-lg">
                        <GraduationCap className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-display font-bold text-[hsl(var(--primary))] leading-tight">مدرسة البناء العلمي</span>
                        <span className="text-xs text-muted-foreground">البداوي - طرابلس</span>
                      </div>
                    </div>
                    <nav className="flex-1 space-y-1 pt-4">
                      <NavItems />
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="p-2 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-hover))] rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-display font-bold hidden sm:inline-block text-[hsl(var(--primary))] leading-tight">
                    {language === 'ar' ? 'مدرسة البناء العلمي' : 'Madrasat Al-Binaa Al-Ilmi'}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline-block">
                    {language === 'ar' ? 'البداوي - طرابلس' : 'Al-Beddawi - Tripoli'}
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              
              <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
                <SelectTrigger className="w-24 sm:w-28 h-9 border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="ar">AR</SelectItem>
                  <SelectItem value="fr">FR</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-[hsl(var(--primary-light))] dark:bg-[hsl(var(--primary-light))] px-2 sm:px-3 py-1.5 rounded-full border border-[hsl(var(--border))]">
                <Avatar className="h-8 w-8 ring-2 ring-[hsl(var(--primary))]/20">
                  <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-hover))] text-white text-sm font-semibold">
                    {profile?.full_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-sm">
                  <p className="font-semibold text-[hsl(var(--primary))] leading-tight">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{t(profile?.role || 'student')}</p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={signOut} title={t('signOut')} className="hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <aside className={cn(
        "fixed top-0 z-40 w-64 h-screen pt-20 transition-transform bg-white/95 dark:bg-[hsl(142_25%_10%)]/95 backdrop-blur-lg border-r border-[hsl(var(--border))] shadow-lg",
        language === 'ar' ? 'right-0 translate-x-full lg:translate-x-0' : 'left-0 -translate-x-full lg:translate-x-0'
      )}>
        <div className="h-full px-3 pb-4 overflow-y-auto">
          <nav className="space-y-1" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <NavItems />
          </nav>
        </div>
      </aside>

      <main className={cn(
        "p-4 sm:p-6 pt-20 animate-fade-in",
        language === 'ar' ? 'lg:mr-64' : 'lg:ml-64'
      )} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Breadcrumbs />
        {children}
      </main>
    </div>
  );
}
