'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import {
  LayoutDashboard,
  School,
  FileText,
  MessageSquare,
  Home,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Mobile Bottom Navigation
 * Phase 2 UX Improvement: Mobile-First and Responsive Design
 * Provides quick access to main features with touch-friendly targets (≥48px)
 */

export function MobileBottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { t, language } = useLanguage();

  // Main navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      {
        href: '/dashboard',
        icon: LayoutDashboard,
        label: t('dashboard'),
        roles: ['admin', 'teacher', 'student', 'supervisor']
      },
    ];

    if (profile?.role === 'student') {
      return [
        ...baseItems,
        {
          href: '/dashboard/my-classes',
          icon: School,
          label: t('myClasses'),
          roles: ['student']
        },
        {
          href: '/dashboard/my-assignments',
          icon: FileText,
          label: t('myAssignments'),
          roles: ['student']
        },
        {
          href: '/dashboard/messages',
          icon: MessageSquare,
          label: t('messages'),
          roles: ['admin', 'teacher', 'student', 'supervisor']
        },
      ];
    }

    if (profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'supervisor') {
      return [
        ...baseItems,
        {
          href: '/dashboard/classes',
          icon: School,
          label: t('classes'),
          roles: ['admin', 'teacher', 'supervisor']
        },
        {
          href: '/dashboard/students',
          icon: School,
          label: t('students'),
          roles: ['admin', 'teacher', 'supervisor']
        },
        {
          href: '/dashboard/messages',
          icon: MessageSquare,
          label: t('messages'),
          roles: ['admin', 'teacher', 'student', 'supervisor']
        },
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems().filter(item => 
    profile?.role && item.roles.includes(profile.role)
  ).slice(0, 5); // Max 5 items for bottom nav

  if (!profile || navItems.length === 0) {
    return null;
  }

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-lg"
      aria-label={language === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-2 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex flex-col items-center justify-center gap-1',
                'min-h-[56px] min-w-[56px]', // ≥48px touch target (56px for better UX)
                'rounded-xl transition-all duration-200',
                'active:scale-95',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn(
                'h-6 w-6 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'text-[10px] font-medium text-center leading-tight',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

