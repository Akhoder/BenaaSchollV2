'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { CardGridSkeleton, PageHeaderSkeleton } from '@/components/SkeletonLoaders';
import { EmptyState, ErrorDisplay } from '@/components/ErrorDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { School, GraduationCap, Calendar as CalendarIcon, BookOpen, FileText } from 'lucide-react';
import { supabase, fetchMyEnrolledClassesWithDetails } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function MyClassesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const dateLocale = useMemo(() => (language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US'), [language]);

  const loadData = useCallback(async () => {
    if (!profile || profile.role !== 'student') return;
    try {
      setLoading(true);
      setError(null);
      const { data: myClasses, error: cErr } = await fetchMyEnrolledClassesWithDetails();
      if (cErr) {
        console.error(cErr);
        const message = t('errorLoadingClasses' as TranslationKey);
        toast.error(message);
        setError(message);
        setClasses([]);
        return;
      }
      const classList = (myClasses || []) as any[];
      setClasses(classList);

      if (classList.length === 0) {
        setSubjectsByClass({});
        return;
      }

      const classIds = classList.map((cls: any) => cls.id).filter(Boolean);
      if (classIds.length === 0) {
        setSubjectsByClass({});
        return;
      }

      const { data: subjectsData, error: subjectsError } = await supabase
        .from('class_subjects')
        .select('id, class_id, subject_name')
        .in('class_id', classIds);

      if (subjectsError) {
        console.error(subjectsError);
        const message = t('failedToLoadSubjects' as TranslationKey);
        toast.error(message);
        setError(message);
        setSubjectsByClass({});
        return;
      }

      const grouped: Record<string, any[]> = {};
      classIds.forEach((id: string) => {
        grouped[id] = [];
      });

      (subjectsData || []).forEach((subject: any) => {
        if (!grouped[subject.class_id]) {
          grouped[subject.class_id] = [];
        }
        grouped[subject.class_id].push(subject);
      });
      setSubjectsByClass(grouped);
    } catch (e) {
      console.error(e);
      const message = t('unexpectedError' as TranslationKey);
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [profile, t]);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && profile.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    if (!authLoading && profile?.role === 'student') {
      loadData().catch(() => {});
    }
  }, [profile, authLoading, router, loadData]);

  const uniqueLevels = useMemo(
    () => Array.from(new Set(classes.map((cls: any) => cls.level).filter(Boolean))),
    [classes]
  );

  const filteredClasses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return classes.filter((cls: any) => {
      const matchesSearch =
        !normalizedSearch ||
        (cls.class_name?.toLowerCase() || '').includes(normalizedSearch);
      const matchesLevel = levelFilter === 'all' || cls.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [classes, searchTerm, levelFilter]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeaderSkeleton />
          <CardGridSkeleton count={3} />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          icon={School}
          title="My Classes"
          description={t('chooseClassDescription' as TranslationKey)}
          gradient="from-blue-600 via-cyan-600 to-blue-700"
        />

        {error && (
          <ErrorDisplay
            error={error}
            title={t('errorLoadingClasses' as TranslationKey)}
            onRetry={loadData}
          />
        )}

        {classes.length > 0 && (
          <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchClasses' as TranslationKey)}
                className="sm:max-w-sm"
              />
              {uniqueLevels.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t('levelFilterLabel' as TranslationKey)}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={levelFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLevelFilter('all')}
                    >
                      {t('allLevels' as TranslationKey)}
                    </Button>
                    {uniqueLevels.map((level) => (
                      <Button
                        key={level}
                        type="button"
                        variant={levelFilter === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLevelFilter(level as string)}
                      >
                        {level ?? '—'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {classes.length === 0 ? (
          <Card className="card-elegant">
            <CardContent className="py-12 animate-fade-in">
              <EmptyState
                title={t('noEnrolledClasses' as TranslationKey)}
                description={t('browseAvailableClassesDescription' as TranslationKey)}
                icon={School}
                action={{
                  label: t('browseAvailableClasses' as TranslationKey),
                  onClick: () => router.push('/dashboard/classes'),
                }}
                error={error}
                onRetry={loadData}
              />
            </CardContent>
          </Card>
        ) : filteredClasses.length === 0 ? (
          <Card className="card-elegant">
            <CardContent className="py-12">
              <EmptyState
                title={t('noClassesMatchSearch' as TranslationKey)}
                description={t('tryAdjustingSearch' as TranslationKey)}
                icon={School}
                action={{
                  label: t('clear' as TranslationKey),
                  onClick: () => {
                    setSearchTerm('');
                    setLevelFilter('all');
                  },
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredClasses.map((cls: any) => (
              <Card key={cls.id} className="card-hover overflow-hidden h-full group">
                <div className="flex h-full flex-col">
                  <Link
                    href={`/dashboard/my-classes/${cls.id}`}
                    prefetch={true}
                    className="flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded-2xl"
                    aria-label={`${t('myClasses')} - ${cls.class_name}`}
                  >
                    <CardHeader className="hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-950/20 dark:hover:to-cyan-950/20 transition-all duration-300 h-full">
                      <div className="flex items-start gap-4">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                          {cls.image_url ? (
                            <img src={cls.image_url} alt={cls.class_name} className="w-20 h-20 rounded-2xl object-cover relative border-2 border-blue-100 dark:border-blue-900" />
                          ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative">
                              <GraduationCap className="h-10 w-10 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 pt-1">
                          <CardTitle className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {cls.class_name}
                          </CardTitle>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                                {`${t('level' as TranslationKey)} ${cls.level ?? '—'}`}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                                {(subjectsByClass[cls.id] || []).length}{' '}
                                {(subjectsByClass[cls.id] || []).length === 1 ? t('subject' as TranslationKey) : t('subjects' as TranslationKey)}
                              </Badge>
                            </div>
                            {cls.enrolled_at && (
                              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {t('enrolledOn' as TranslationKey)}{' '}
                                {new Date(cls.enrolled_at).toLocaleDateString(dateLocale)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Link>
                  <CardContent className="border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/my-classes/${cls.id}`} prefetch={true}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 px-3">
                          <BookOpen className="h-3.5 w-3.5" />
                          {t('viewClass' as TranslationKey)}
                        </Button>
                      </Link>
                      <Link href={`/dashboard/my-assignments?class=${cls.id}`} prefetch={false}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 px-3">
                          <FileText className="h-3.5 w-3.5" />
                          {t('openAssignments' as TranslationKey)}
                        </Button>
                      </Link>
                      <Link href="/dashboard/schedule" prefetch={true}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 px-3">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {t('openSchedule' as TranslationKey)}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
