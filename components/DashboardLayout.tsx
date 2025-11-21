'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  MessageSquare,
  Award,
  ChevronDown,
  ChevronRight,
  Bot,
  BarChart3
} from 'lucide-react';
import { IntelligentSearch } from '@/components/IntelligentSearch';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SkipLink } from '@/components/KeyboardNavigation';
import { OptimizedImage } from '@/components/OptimizedImage';
import { SecurityIndicator } from '@/components/SecurityIndicators';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
  roles: string[];
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Organized navigation with groups for better UX
  const navigationGroups: NavGroup[] = [
    {
      title: t('main'),
      items: [
        { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student', 'supervisor'] },
      ],
      roles: ['admin', 'teacher', 'student', 'supervisor']
    },
    {
      title: t('student'),
      items: [
        { name: t('myClasses'), href: '/dashboard/my-classes', icon: School, roles: ['student'] },
        { name: t('myAssignments'), href: '/dashboard/my-assignments', icon: FileText, roles: ['student'] },
        { name: t('myCertificates'), href: '/dashboard/my-certificates', icon: Award, roles: ['student'] },
        { name: t('grades'), href: '/dashboard/grades', icon: FileText, roles: ['student'] },
        { name: t('aiAssistant') || 'AI Assistant', href: '/dashboard/ai-assistant', icon: Bot, roles: ['student'] },
      ],
      roles: ['student']
    },
    {
      title: t('academic'),
      items: [
        { name: t('classes'), href: '/dashboard/classes', icon: School, roles: ['admin', 'teacher', 'supervisor'] },
        { name: t('students'), href: '/dashboard/students', icon: Users, roles: ['admin', 'teacher', 'supervisor'] },
        { name: t('subjects'), href: '/dashboard/subjects', icon: BookOpen, roles: ['admin', 'teacher', 'supervisor'] },
        { name: t('quizzes'), href: '/dashboard/quizzes', icon: FileText, roles: ['admin', 'teacher', 'supervisor'] },
        { name: t('certificates'), href: '/dashboard/certificates', icon: Award, roles: ['admin', 'teacher', 'supervisor'] },
        { name: t('grades'), href: '/dashboard/grades', icon: FileText, roles: ['teacher'] },
        { name: t('analytics') || 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['admin', 'teacher'] },
      ],
      roles: ['admin', 'teacher', 'supervisor']
    },
    {
      title: t('administration'),
      items: [
        { name: t('users'), href: '/dashboard/users', icon: Users, roles: ['admin'] },
        { name: t('teachers'), href: '/dashboard/teachers', icon: Users, roles: ['admin'] },
        { name: t('attendance'), href: '/dashboard/attendance', icon: Calendar, roles: ['admin', 'teacher', 'supervisor'] },
        { name: t('attendanceReport'), href: '/dashboard/attendance/report', icon: Calendar, roles: ['admin', 'teacher', 'supervisor'] },
      ],
      roles: ['admin', 'teacher', 'supervisor']
    },
    {
      title: t('general'),
      items: [
        { name: t('schedule'), href: '/dashboard/schedule', icon: Calendar, roles: ['admin', 'teacher', 'student'] },
        { name: t('messages'), href: '/dashboard/messages', icon: MessageSquare, roles: ['admin', 'teacher', 'student', 'supervisor'] },
        { name: t('announcements'), href: '/dashboard/announcements', icon: FileText, roles: ['admin', 'teacher', 'student', 'supervisor'] },
      ],
      roles: ['admin', 'teacher', 'student', 'supervisor']
    },
  ];

  // Filter groups and items based on user role
  const filteredGroups = navigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => 
        profile?.role && item.roles.includes(profile.role)
      )
    }))
    .filter(group => group.items.length > 0);

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  // Find the most specific matching item across all groups
  const findMostSpecificMatch = (pathname: string): string | null => {
    let exactMatch: string | null = null;
    let bestPartialMatch: string | null = null;
    let bestPartialMatchLength = 0;

    filteredGroups.forEach(group => {
      group.items.forEach(item => {
        // Exact match is always best - return immediately if found
        if (pathname === item.href) {
          exactMatch = item.href;
        }
        // Check if pathname starts with item.href + '/'
        else if (pathname.startsWith(item.href + '/') && item.href.length > bestPartialMatchLength) {
          bestPartialMatch = item.href;
          bestPartialMatchLength = item.href.length;
        }
      });
    });

    // Exact match always wins
    return exactMatch || bestPartialMatch;
  };

  const NavItems = () => {
    const mostSpecificMatch = findMostSpecificMatch(pathname);
    
    return (
    <>
      {filteredGroups.map((group) => {
        const isGroupOpen = openGroups[group.title] ?? true; // Default to open
        const hasMultipleItems = group.items.length > 1;

        return (
          <div key={group.title} className="mb-2">
            {hasMultipleItems ? (
              <Collapsible open={isGroupOpen} onOpenChange={() => toggleGroup(group.title)}>
                <CollapsibleTrigger className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg',
                  'text-xs font-semibold uppercase tracking-wider',
                  'text-muted-foreground hover:text-foreground',
                  'transition-colors'
                )}>
                  <span>{group.title}</span>
                  {language === 'ar' ? (
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform',
                      isGroupOpen && 'rotate-180'
                    )} />
                  ) : (
                    <ChevronRight className={cn(
                      'h-4 w-4 transition-transform',
                      isGroupOpen && 'rotate-90'
                    )} />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    // Use the most specific match found across all groups
                    const isActive = mostSpecificMatch === item.href;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        prefetch={true}
                        className={cn(
                          'group flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 relative',
                          'hover:bg-[hsl(var(--primary-light))] dark:hover:bg-[hsl(var(--primary-light))]',
                          'hover:shadow-md hover:-translate-y-0.5',
                          'min-h-[44px]', // Touch-friendly
                          isActive && 'bg-[hsl(var(--primary))] text-white shadow-lg border-2 border-[hsl(var(--primary))] dark:border-[hsl(var(--primary))]',
                          !isActive && 'text-[hsl(var(--foreground))]'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={item.name}
                      >
                        <Icon 
                          className={cn(
                            'h-5 w-5 transition-colors flex-shrink-0',
                            isActive ? 'text-white' : 'text-[hsl(var(--primary))] group-hover:text-[hsl(var(--primary-hover))]'
                          )} 
                          aria-hidden="true"
                        />
                        <span className={cn(
                          'font-medium transition-colors text-sm sm:text-base',
                          isActive ? 'text-white' : 'text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]'
                        )}>{item.name}</span>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              // Single item groups don't need collapsible
              group.items.map((item) => {
                const Icon = item.icon;
                // Use the most specific match found across all groups
                const isActive = mostSpecificMatch === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={true}
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
              })
            )}
          </div>
        );
      })}
    </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-pattern-dots opacity-30 pointer-events-none" />
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <nav className="fixed top-0 z-50 w-full glass-card border-b border-border shadow-sm">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start gap-3">
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hover:bg-[hsl(var(--primary-light))] dark:hover:bg-[hsl(var(--primary-light))] min-h-[48px] min-w-[48px]"
                    aria-label={language === 'ar' ? 'فتح القائمة' : 'Open menu'}
                  >
                    <Menu className="h-6 w-6 text-[hsl(var(--primary))]" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side={language === 'ar' ? 'right' : 'left'} 
                  className="w-64 p-0 bg-white dark:bg-[hsl(142_25%_10%)] border-[hsl(var(--border))]"
                  aria-label={language === 'ar' ? 'القائمة الرئيسية' : 'Main menu'}
                >
                  <div className="flex h-full flex-col gap-2 p-4">
                    <div className="flex items-center gap-3 px-3 py-4 border-b border-[hsl(var(--border))]">
                      <div className="overflow-hidden rounded-xl border-2 border-primary/20 shadow-lg">
                        <OptimizedImage
                          src="/icons/logo.jpg"
                          alt={language === 'ar' ? 'مدرسة البناء العلمي' : 'Benaa School'}
                          width={48}
                          height={48}
                          className="w-12 h-12"
                          priority
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-display font-bold text-[hsl(var(--primary))] leading-tight">
                          {language === 'ar' ? 'مدرسة البناء العلمي' : 'Benaa School'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'البداوي - طرابلس' : 'Al-Beddawi - Tripoli'}
                        </span>
                      </div>
                    </div>
                    <nav 
                      className="flex-1 space-y-1 pt-4"
                      aria-label={language === 'ar' ? 'التنقل' : 'Navigation'}
                    >
                      <NavItems />
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/dashboard" prefetch={true} className="flex items-center gap-3 group">
                <div className="overflow-hidden rounded-xl border-2 border-primary/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <OptimizedImage
                    src="/icons/logo.jpg"
                    alt={language === 'ar' ? 'مدرسة البناء العلمي' : 'Benaa School'}
                    width={40}
                    height={40}
                    className="w-10 h-10"
                    priority
                  />
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

            <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center max-w-md mx-4 hidden md:flex">
              <IntelligentSearch />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="md:hidden">
                <IntelligentSearch className="w-48" />
              </div>
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 bg-[hsl(var(--primary-light))] dark:bg-[hsl(var(--primary-light))] px-2 sm:px-3 py-1.5 rounded-full border border-[hsl(var(--border))] hover:shadow-md transition">
                    <Avatar className="h-8 w-8 ring-2 ring-[hsl(var(--primary))]/20">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                      <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-hover))] text-white text-sm font-semibold">
                        {profile?.full_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-sm text-left">
                      <p className="font-semibold text-[hsl(var(--primary))] leading-tight">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{t(profile?.role || 'student')}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={language === 'ar' ? 'end' : 'start'} className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-semibold">{profile?.full_name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{t(profile?.role || 'student')}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/dashboard/settings/profile" prefetch={true} className="block">
                    <DropdownMenuItem>
                      <UserCircle className="h-4 w-4 mr-2" />
                      {t('editProfile')}
                    </DropdownMenuItem>
                  </Link>
                  {profile?.role === 'admin' && (
                    <Link href="/dashboard/settings/branding" prefetch={true} className="block">
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        {t('brandingSettings')}
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <Link href="/dashboard/my-certificates" prefetch={true} className="block">
                    <DropdownMenuItem>
                      <Award className="h-4 w-4 mr-2" />
                      {t('myCertificates')}
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-700">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <aside 
        className={cn(
          "fixed top-0 z-40 w-64 h-screen pt-20 transition-transform bg-white/95 dark:bg-[hsl(142_25%_10%)]/95 backdrop-blur-lg border-r border-[hsl(var(--border))] shadow-lg",
          language === 'ar' ? 'right-0 translate-x-full lg:translate-x-0' : 'left-0 -translate-x-full lg:translate-x-0'
        )}
        aria-label={language === 'ar' ? 'القائمة الجانبية' : 'Sidebar navigation'}
      >
        <div className="h-full px-3 pb-4 overflow-y-auto">
          <nav 
            className="space-y-1" 
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            aria-label={language === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}
          >
            <NavItems />
          </nav>
        </div>
      </aside>

      <main className={cn(
        "p-4 sm:p-6 pt-20 pb-20 lg:pb-6 animate-fade-in",
        language === 'ar' ? 'lg:mr-64' : 'lg:ml-64'
      )} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <SkipLink href="#main-content">
          {language === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
        </SkipLink>
        <div id="main-content">
          <Breadcrumbs />
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
