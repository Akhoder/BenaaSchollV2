'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { labels } = useBreadcrumb();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: t('home'), href: '/dashboard', icon: Home }
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Check if we have a custom label for this segment/path first
      if (labels[segment]) {
        breadcrumbs.push({
          label: labels[segment],
          href: currentPath
        });
        return;
      }

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
        case 'my-classes':
          label = t('myClasses');
          break;
        case 'my-assignments':
          label = t('myAssignments');
          break;
        case 'announcements':
          label = t('announcements');
          break;
        case 'teachers':
          label = t('teachers');
          break;
        default:
          // Check if segment looks like a UUID (36 characters with hyphens)
          // If it's a UUID and we don't have a custom label, skip it
          if (segment.length === 36 && segment.includes('-')) {
            // Skip UUID segments that don't have custom labels
            return;
          }
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

  const canGoBack = breadcrumbs.length > 1;

  return (
    <nav 
      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-6"
      aria-label={language === 'ar' ? 'مسار التنقل' : 'Breadcrumb'}
    >
      {/* Back Button for Mobile */}
      {canGoBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="lg:hidden min-h-[48px] min-w-[48px]"
          aria-label={language === 'ar' ? 'رجوع' : 'Go back'}
        >
          <ArrowLeft className={cn(
            "h-5 w-5",
            language === 'ar' && "rotate-180"
          )} />
        </Button>
      )}

      {/* Breadcrumb Items */}
      <div className={`flex items-center flex-1 ${language === 'ar' ? 'flex-row-reverse' : ''} ${language === 'ar' ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const Icon = breadcrumb.icon;

          return (
            <div key={`${breadcrumb.href}-${index}`} className={`flex items-center ${language === 'ar' ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
              {index > 0 && (
                <ChevronRight className={cn(
                  "h-4 w-4 text-slate-400",
                  language === 'ar' && "rotate-180"
                )} />
              )}
              
              {isLast ? (
                <span 
                  className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1"
                  aria-current="page"
                >
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  {breadcrumb.label}
                </span>
              ) : (
                <Link
                  href={breadcrumb.href}
                  prefetch={true}
                  className={cn(
                    "hover:text-slate-900 dark:hover:text-slate-100 transition-colors",
                    "flex items-center gap-1 hover:underline min-h-[44px] flex items-center"
                  )}
                  aria-label={`${breadcrumb.label}, ${language === 'ar' ? 'صفحة' : 'page'}`}
                >
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  {breadcrumb.label}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
