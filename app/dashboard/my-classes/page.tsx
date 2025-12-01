'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { SimplePageLoading } from '@/components/LoadingSpinner';
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
        <SimplePageLoading text={t('loadingClasses' as TranslationKey)} />
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
          title={t('myClasses' as TranslationKey)}
          description={t('chooseClassDescription' as TranslationKey)}
          gradient="from-primary to-accent"
        />

        {error && (
          <ErrorDisplay
            error={error}
            title={t('errorLoadingClasses' as TranslationKey)}
            onRetry={loadData}
          />
        )}

        {classes.length > 0 && (
          <Card className="glass-card border-primary/10 animate-fade-in-up">
            <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg">
                  <School className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-foreground">{t('searchClasses' as TranslationKey)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col gap-4">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('searchClasses' as TranslationKey)}
                  className="w-full input-modern"
                />
                {uniqueLevels.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold px-1">
                      {t('levelFilterLabel' as TranslationKey)}
                    </span>
                    <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:flex-wrap gap-2 scrollbar-none">
                      <Button
                        type="button"
                        variant={levelFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLevelFilter('all')}
                        className="whitespace-nowrap flex-shrink-0"
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
                          className="whitespace-nowrap flex-shrink-0"
                        >
                          {level ?? '—'}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {classes.length === 0 ? (
          <Card className="glass-card border-primary/10">
            <CardContent className="py-12 animate-fade-in relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 islamic-pattern-subtle opacity-30"></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
              <div className="relative z-10">
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
              </div>
            </CardContent>
          </Card>
        ) : filteredClasses.length === 0 ? (
          <Card className="glass-card border-primary/10">
            <CardContent className="py-12 relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 islamic-pattern-subtle opacity-30"></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
              <div className="relative z-10">
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
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 animate-fade-in-up">
            {filteredClasses.map((cls: any, index: number) => (
              <Card key={cls.id} className="glass-card-hover border-primary/10 overflow-hidden h-full group" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex h-full flex-col">
                  <Link
                    href={`/dashboard/my-classes/${cls.id}`}
                    prefetch={true}
                    className="flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded-2xl"
                    aria-label={`${t('myClasses')} - ${cls.class_name}`}
                  >
                    <CardHeader className="hover:bg-primary/5 transition-all duration-300 h-full p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                          {cls.image_url ? (
                            <img src={cls.image_url} alt={cls.class_name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover relative ring-2 ring-secondary/30 group-hover:ring-secondary/50 transition-all" />
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center relative ring-2 ring-secondary/30 group-hover:ring-secondary/50 transition-all shadow-lg shadow-primary/20">
                              <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
                          <CardTitle className="text-lg sm:text-xl font-display font-bold text-foreground mb-1.5 sm:mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {cls.class_name}
                          </CardTitle>
                          <div className="space-y-1.5 sm:space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="islamic" className="gap-1 text-[10px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2.5">
                                <School className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {`${t('level' as TranslationKey)} ${cls.level ?? '—'}`}
                              </Badge>
                              <Badge variant="gold" className="gap-1 text-[10px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2.5">
                                <BookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {(subjectsByClass[cls.id] || []).length}{' '}
                                {(subjectsByClass[cls.id] || []).length === 1 ? t('subject' as TranslationKey) : t('subjects' as TranslationKey)}
                              </Badge>
                            </div>
                            {cls.enrolled_at && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                                <CalendarIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                                {t('enrolledOn' as TranslationKey)}{' '}
                                <span className="font-medium">{new Date(cls.enrolled_at).toLocaleDateString(dateLocale)}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Link>
                  <CardContent className="border-t border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5 p-3 sm:p-6">
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                      <Link href={`/dashboard/my-classes/${cls.id}`} prefetch={true} className="col-span-3 sm:col-span-1">
                        <Button variant="ghost" size="sm" className="w-full h-9 sm:h-8 gap-1.5 px-3 hover:bg-primary/10 hover:text-primary transition-colors justify-center">
                          <BookOpen className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          <span className="text-sm">{t('viewClass' as TranslationKey)}</span>
                        </Button>
                      </Link>
                      <Link href={`/dashboard/my-assignments?class=${cls.id}`} prefetch={false} className="col-span-1.5 sm:col-span-1 flex-1">
                        <Button variant="ghost" size="sm" className="w-full h-9 sm:h-8 gap-1.5 px-3 hover:bg-accent/10 hover:text-accent transition-colors justify-center">
                          <FileText className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          <span className="hidden sm:inline">{t('openAssignments' as TranslationKey)}</span>
                          <span className="sm:hidden">{t('assignments' as TranslationKey)}</span>
                        </Button>
                      </Link>
                      <Link href="/dashboard/schedule" prefetch={true} className="col-span-1.5 sm:col-span-1 flex-1">
                        <Button variant="ghost" size="sm" className="w-full h-9 sm:h-8 gap-1.5 px-3 hover:bg-secondary/10 hover:text-secondary transition-colors justify-center">
                          <CalendarIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          <span className="hidden sm:inline">{t('openSchedule' as TranslationKey)}</span>
                          <span className="sm:hidden">{t('schedule' as TranslationKey)}</span>
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
