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
  BarChart3,
  Clock,
  Globe
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
import { useState, useMemo, memo, useCallback, useEffect } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
        { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: Bot, roles: ['student'] },
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
        { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['admin', 'teacher'] },
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
        { name: t('prayerTimes'), href: '/dashboard/prayer-times', icon: Clock, roles: ['admin', 'teacher', 'student', 'supervisor'] },
        { name: t('messages'), href: '/dashboard/messages', icon: MessageSquare, roles: ['admin', 'teacher', 'student', 'supervisor'] },
        { name: t('announcements'), href: '/dashboard/announcements', icon: FileText, roles: ['admin', 'teacher', 'student', 'supervisor'] },
      ],
      roles: ['admin', 'teacher', 'student', 'supervisor']
    },
  ];

  // ✅ PERFORMANCE: Memoize navigation groups to prevent unnecessary re-renders
  const filteredGroupsMemo = useMemo(() => {
    return navigationGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => 
          profile?.role && item.roles.includes(profile.role)
        )
      }))
      .filter(group => group.items.length > 0);
  }, [profile?.role, language, t]);

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  // Find the most specific matching item across all groups
  const findMostSpecificMatch = useCallback((pathname: string, groups: NavGroup[]): string | null => {
    let exactMatch: string | null = null;
    let bestPartialMatch: string | null = null;
    let bestPartialMatchLength = 0;

    groups.forEach(group => {
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
  }, []);

  // ✅ PERFORMANCE: Memoize most specific match calculation
  const mostSpecificMatch = useMemo(() => findMostSpecificMatch(pathname, filteredGroupsMemo), [pathname, filteredGroupsMemo, findMostSpecificMatch]);

  const NavItems = memo(() => {
    return (
    <>
      {filteredGroupsMemo.map((group, groupIndex) => {
        const isGroupOpen = openGroups[group.title] ?? true; // Default to open
        const hasMultipleItems = group.items.length > 1;
        const hasActiveItem = group.items.some(item => mostSpecificMatch === item.href);

        return (
          <div key={group.title} className={cn(
            "mb-3",
            groupIndex > 0 && "pt-3 border-t border-border/50"
          )}>
            {hasMultipleItems ? (
              <Collapsible open={isGroupOpen} onOpenChange={() => toggleGroup(group.title)}>
                <CollapsibleTrigger className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1',
                  'text-xs font-bold uppercase tracking-wider',
                  'text-muted-foreground hover:text-foreground',
                  'transition-all duration-200',
                  'hover:bg-muted/30',
                  hasActiveItem && 'text-primary font-extrabold'
                )}>
                  <span className="flex items-center gap-2">
                    <span className={cn(
                      "w-1 h-4 rounded-full transition-all duration-200",
                      hasActiveItem ? "bg-primary" : "bg-muted-foreground/30"
                    )} />
                    <span>{group.title}</span>
                  </span>
                  {language === 'ar' ? (
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      isGroupOpen && 'rotate-180'
                    )} />
                  ) : (
                    <ChevronRight className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      isGroupOpen && 'rotate-90'
                    )} />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className={cn(
                  "space-y-1.5 mt-1.5 overflow-hidden",
                  "data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
                )}>
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
                          'hover:bg-primary/10 dark:hover:bg-primary/10',
                          'hover:shadow-sm hover:scale-[1.02]',
                          'min-h-[44px]', // Touch-friendly
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                          isActive && 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-md',
                          !isActive && 'text-foreground'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={item.name}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className={cn(
                            "absolute w-1 h-8 bg-white/30",
                            language === 'ar' ? 'left-0 rounded-r-full' : 'right-0 rounded-l-full'
                          )} />
                        )}
                        <Icon 
                          className={cn(
                            'h-5 w-5 transition-all duration-200 flex-shrink-0',
                            isActive ? 'text-white scale-110' : 'text-primary group-hover:text-primary/80 group-hover:scale-110'
                          )} 
                          aria-hidden="true"
                        />
                        <span className={cn(
                          'font-medium transition-all duration-200 text-sm sm:text-base flex-1',
                          isActive ? 'text-white font-semibold' : 'text-foreground group-hover:text-primary'
                        )}>{item.name}</span>
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-xl opacity-50" />
                        )}
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
                  <div key={item.name} className="mb-1">
                    <div className={cn(
                      "px-3 py-2 mb-1.5"
                    )}>
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                      )}>
                        <span className={cn(
                          "w-1 h-4 rounded-full",
                          isActive ? "bg-primary" : "bg-muted-foreground/30"
                        )} />
                        <span>{group.title}</span>
                      </span>
                    </div>
                    <Link
                      href={item.href}
                      prefetch={true}
                      className={cn(
                        'group flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 relative',
                        'hover:bg-primary/10 dark:hover:bg-primary/10',
                        'hover:shadow-sm hover:scale-[1.02]',
                        'min-h-[44px]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                        isActive && 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-md',
                        !isActive && 'text-foreground'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={item.name}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div className={cn(
                          "absolute w-1 h-8 bg-white/30",
                          language === 'ar' ? 'left-0 rounded-r-full' : 'right-0 rounded-l-full'
                        )} />
                      )}
                      <Icon className={cn(
                        'h-5 w-5 transition-all duration-200 flex-shrink-0',
                        isActive ? 'text-white scale-110' : 'text-primary group-hover:text-primary/80 group-hover:scale-110'
                      )} />
                      <span className={cn(
                        'font-medium transition-all duration-200 text-sm sm:text-base flex-1',
                        isActive ? 'text-white font-semibold' : 'text-foreground group-hover:text-primary'
                      )}>{item.name}</span>
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-xl opacity-50" />
                      )}
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </>
    );
  });
  
  NavItems.displayName = 'NavItems';

  return (
    <div className="min-h-screen bg-background">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-pattern-dots opacity-20 pointer-events-none" />
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      {/* ✨ Enhanced Header with Islamic Design */}
      <nav className="fixed top-0 z-50 w-full bg-card/95 backdrop-blur-xl border-b-2 border-primary/10 shadow-lg shadow-primary/5">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start gap-3">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "hover:bg-primary/10 dark:hover:bg-primary/10",
                      "min-h-[48px] min-w-[48px]",
                      "transition-all duration-200",
                      "active:scale-95",
                      "rounded-xl"
                    )}
                    aria-label={language === 'ar' ? 'فتح القائمة' : 'Open menu'}
                  >
                    <Menu className="h-6 w-6 text-primary transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side={language === 'ar' ? 'right' : 'left'} 
                  className={cn(
                    "w-[85vw] max-w-sm p-0",
                    "backdrop-blur-xl",
                    "border-primary/20 shadow-2xl",
                    "overflow-hidden"
                  )}
                  style={{
                    backgroundColor: 'hsl(var(--card))',
                  }}
                  aria-label={language === 'ar' ? 'القائمة الرئيسية' : 'Main menu'}
                >
                  <div className="flex h-full flex-col relative">
                    {/* Decorative top accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />
                    
                    {/* User Profile Section - Mobile */}
                    <div className="px-4 pt-6 pb-4 border-b border-border/50 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                          <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-base font-semibold">
                            {profile?.full_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{profile?.full_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{t(profile?.role || 'student')}</p>
                        </div>
                      </div>
                      
                      {/* Logo Section */}
                      <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/30 dark:bg-card/50 border border-primary/10">
                        <div className="overflow-hidden rounded-lg border border-secondary/30 shadow-sm">
                          <OptimizedImage
                            src="/icons/logo.jpg"
                            alt={language === 'ar' ? 'مدرسة البناء العلمي' : 'Benaa School'}
                            width={32}
                            height={32}
                            className="w-8 h-8"
                            priority
                          />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-display font-bold text-primary leading-tight truncate">
                            {language === 'ar' ? 'مدرسة البناء العلمي' : 'Benaa School'}
                          </span>
                          <span className="text-[10px] text-secondary font-medium truncate">
                            {language === 'ar' ? 'البداوي - طرابلس' : 'Al-Beddawi - Tripoli'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Navigation Items with improved scrollbar */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding hover:[&::-webkit-scrollbar-thumb]:bg-primary/50">
                      <nav 
                        className="space-y-1" 
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        aria-label={language === 'ar' ? 'التنقل' : 'Navigation'}
                      >
                        <NavItems />
                      </nav>
                    </div>
                    
                    {/* Bottom gradient fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-card/98 to-transparent pointer-events-none" />
                    
                    {/* Quick Actions Footer - Mobile */}
                    <div className="px-4 py-3 border-t border-border/50 bg-muted/30">
                      <div className="flex items-center justify-between gap-2">
                        <Link 
                          href="/dashboard/settings/profile" 
                          prefetch={true}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-primary/10 transition-colors flex-1 justify-center"
                        >
                          <UserCircle className="h-4 w-4" />
                          <span>{t('editProfile')}</span>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={signOut}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span className="hidden sm:inline">{t('signOut')}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/dashboard" prefetch={true} className="flex items-center gap-3 group">
                <div className="relative">
                  {/* Golden glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                  <div className="relative overflow-hidden rounded-xl border-2 border-secondary/30 shadow-lg group-hover:border-secondary/50 group-hover:scale-105 transition-all duration-300">
                    <OptimizedImage
                      src="/icons/logo.jpg"
                      alt={language === 'ar' ? 'مدرسة البناء العلمي' : 'Benaa School'}
                      width={40}
                      height={40}
                      className="w-10 h-10"
                      priority
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-display font-bold hidden sm:inline-block text-primary leading-tight group-hover:text-primary-dark transition-colors">
                    {language === 'ar' ? 'مدرسة البناء العلمي' : 'Madrasat Al-Binaa Al-Ilmi'}
                  </span>
                  <span className="text-xs text-secondary hidden sm:inline-block font-medium">
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

              <Link href="/" target="_blank">
                <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-primary/10" title={language === 'ar' ? 'زيارة الموقع' : 'Visit Website'}>
                  <Globe className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                </Button>
              </Link>
              
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
                  <button className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 px-2 sm:px-3 py-1.5 rounded-full border-2 border-secondary/30 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/10 transition-all duration-300">
                    <Avatar className="h-8 w-8 ring-2 ring-secondary/30">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm font-semibold">
                        {profile?.full_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-sm text-right rtl:text-right ltr:text-left">
                      <p className="font-semibold text-primary leading-tight">{profile?.full_name}</p>
                      <p className="text-xs text-secondary capitalize font-medium">{t(profile?.role || 'student')}</p>
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

      {/* ✨ Enhanced Sidebar with Islamic Design */}
      <aside 
        className={cn(
          "fixed top-0 z-40 w-64 h-screen pt-20 transition-transform duration-300 ease-in-out",
          "bg-card/98 dark:bg-card/95 backdrop-blur-xl",
          "border-primary/10 shadow-xl shadow-primary/5",
          language === 'ar' ? 'right-0 translate-x-full lg:translate-x-0 border-l-2' : 'left-0 -translate-x-full lg:translate-x-0 border-r-2'
        )}
        aria-label={language === 'ar' ? 'القائمة الجانبية' : 'Sidebar navigation'}
      >
        {/* Decorative top accent */}
        <div className="absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />
        
        {/* Sidebar content with improved scrollbar */}
        <div className="h-full px-4 pb-6 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding hover:[&::-webkit-scrollbar-thumb]:bg-primary/50">
          <nav 
            className="space-y-1 pt-4" 
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            aria-label={language === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}
          >
            <NavItems />
          </nav>
        </div>
        
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card/98 to-transparent pointer-events-none" />
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
