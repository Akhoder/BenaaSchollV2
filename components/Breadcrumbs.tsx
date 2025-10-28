'use client';

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: t('home'), href: '/dashboard', icon: Home }
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // ترجمة أسماء الصفحات
      let label = segment;
      switch (segment) {
        case 'dashboard':
          label = t('dashboard');
          break;
        case 'users':
          label = t('users');
          break;
        case 'students':
          label = t('students');
          break;
        case 'classes':
          label = t('classes');
          break;
        case 'subjects':
          label = t('subjects');
          break;
        case 'schedule':
          label = t('schedule');
          break;
        case 'grades':
          label = t('grades');
          break;
        case 'announcements':
          label = t('announcements');
          break;
        default:
          label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }

      breadcrumbs.push({
        label,
        href: currentPath
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-600 dark:text-slate-400 mb-6">
      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const Icon = breadcrumb.icon;

        return (
          <div key={`${breadcrumb.href}-${index}`} className="flex items-center space-x-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
            
            {isLast ? (
              <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
                {Icon && <Icon className="h-4 w-4" />}
                {breadcrumb.label}
              </span>
            ) : (
              <Link
                href={breadcrumb.href}
                className={cn(
                  "hover:text-slate-900 dark:hover:text-slate-100 transition-colors",
                  "flex items-center gap-1 hover:underline"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {breadcrumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
