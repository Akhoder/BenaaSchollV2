'use client';

import ClassViewClient from './ClassViewClient';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import type { TranslationKey } from '@/lib/translations';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageLoading } from '@/components/LoadingSpinner';
import { StatCard } from '@/components/StatCard';
import { EmptyState, ErrorDisplay } from '@/components/ErrorDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { 
  BookOpen, 
  GraduationCap, 
  ArrowLeft,
  CheckCircle,
  CircleCheck,
  CircleDot,
  ArrowRight,
  User,
  FileText,
  Calendar,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { fetchMyEnrolledClassesWithDetails, fetchSubjectsForClass, getSubjectProgressStats } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SubjectDiscussion } from '@/components/dashboard/SubjectDiscussion';


export default function ClassViewPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const { setLabel } = useBreadcrumb();
  const classId = (params?.classId as string) || '';

  const [classData, setClassData] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all');
  const [lastActivity, setLastActivity] = useState<{ label: string; date: string; link: string } | null>(null);
  const [discussionSubject, setDiscussionSubject] = useState<{ id: string; name: string } | null>(null);

  type ProgressStatus = 'completed' | 'in_progress' | 'not_started';

  const statusIconMap: Record<ProgressStatus, typeof CircleCheck> = {
    completed: CircleCheck,
    in_progress: CheckCircle,
    not_started: CircleDot,
  };

  const statusLabelMap: Record<ProgressStatus, TranslationKey> = {
    completed: 'statusCompleted',
    in_progress: 'statusInProgress',
    not_started: 'statusNotStarted',
  };

  const getCompletionColor = (progress: number) => {
    if (progress >= 80) return 'bg-success';
    if (progress >= 50) return 'bg-info';
    if (progress > 0) return 'bg-warning';
    return 'bg-muted';
  };

  const getProgressStatus = (progress: any): ProgressStatus => {
    if (!progress || progress.total_lessons === 0) {
      return 'not_started';
    }
    if (progress.completed_lessons === progress.total_lessons) {
      return 'completed';
    }
    if (progress.completed_lessons > 0 || progress.in_progress_lessons > 0) {
      return 'in_progress';
    }
    return 'not_started';
  };

  const dateLocale = useMemo(() => (language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US'), [language]);

  const subjectsWithStatus = useMemo(() => {
    return subjects.map((subject) => {
      const progress = subjectProgress[subject.id];
      const status = getProgressStatus(progress);
      return { subject, progress, status };
    });
  }, [subjects, subjectProgress]);

  const filteredSubjects = useMemo(() => {
    if (filterTab === 'all') return subjectsWithStatus;
    return subjectsWithStatus.filter((item) => item.status === filterTab);
  }, [subjectsWithStatus, filterTab]);

  const overviewStats = useMemo(() => {
    const total = subjectsWithStatus.length;
    const completed = subjectsWithStatus.filter((s) => s.status === 'completed').length;
    const inProgress = subjectsWithStatus.filter((s) => s.status === 'in_progress').length;
    const notStarted = subjectsWithStatus.filter((s) => s.status === 'not_started').length;
    return { total, completed, inProgress, notStarted };
  }, [subjectsWithStatus]);

  const loadData = useCallback(async () => {
    if (!profile || profile.role !== 'student' || !classId) return;
    try {
      setLoading(true);
      setError(null);
      
      // Fetch classes to find the one we need
      const { data: myClasses, error: cErr } = await fetchMyEnrolledClassesWithDetails();
      if (cErr) {
        console.error(cErr);
        const message = t('errorLoadingClass' as TranslationKey);
        toast.error(message);
        setError(message);
        return;
      }
      
      const selectedClass = (myClasses || []).find((c: any) => c.id === classId);
      if (!selectedClass) {
        const message = t('classNotFound' as TranslationKey);
        toast.error(message);
        router.push('/dashboard/my-classes');
        return;
      }
      
      setClassData(selectedClass);
      // Set breadcrumb label
      setLabel(classId, selectedClass.class_name);

      // Load subjects for this class
      const { data: subjectsData, error: subjectsError } = await fetchSubjectsForClass(classId);
      if (subjectsError) {
        console.error(subjectsError);
        const message = t('errorLoadingSubjects' as TranslationKey);
        toast.error(message);
        setError(message);
        setSubjects([]);
        setSubjectProgress({});
        return;
      }
      const subjectsList = (subjectsData || []) as any[];
      setSubjects(subjectsList);

      // ✅ PERFORMANCE: Load progress in parallel instead of sequential loop
      if (subjectsList.length > 0) {
        const progressPromises = subjectsList.map((subject: any) =>
          getSubjectProgressStats(subject.id).then(({ data }) => ({ subjectId: subject.id, progress: data }))
        );
        
        const progressResults = await Promise.all(progressPromises);
        const progressMap: Record<string, any> = {};
        let latestActivity: { label: string; date: string; link: string } | null = null;

        subjectsList.forEach((subject) => {
          const progressEntry = progressResults.find((result) => result.subjectId === subject.id)?.progress;
          if (progressEntry) {
            progressMap[subject.id] = progressEntry;
          }

          // ✅ FIX: SubjectProgressStats doesn't have last_activity_at, use subject dates instead
          const activityDate =
            subject.updated_at ||
            subject.created_at;

          if (activityDate) {
            const current = new Date(activityDate).getTime();
            const lastTime = latestActivity ? new Date(latestActivity.date).getTime() : 0;
            if (!latestActivity || current > lastTime) {
              latestActivity = {
                label: subject.subject_name,
                date: activityDate,
                link: `/dashboard/my-classes/${classId}/subjects/${subject.id}`,
              };
            }
          }
        });
        setSubjectProgress(progressMap);
        setLastActivity(latestActivity);
      } else {
        setSubjectProgress({});
        setLastActivity(null);
      }
    } catch (e) {
      console.error(e);
      const message = t('unexpectedError' as TranslationKey);
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [profile, classId, router, t]);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && profile.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    if (!authLoading && profile?.role === 'student' && classId) {
      loadData().catch(() => {});
    }
  }, [profile, authLoading, router, classId, loadData]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <SimplePageLoading text={t('loadingClass' as TranslationKey)} />
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student' || !classData) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {error && (
          <ErrorDisplay
            error={error}
            title={t('errorLoadingClass' as TranslationKey)}
            onRetry={loadData}
          />
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
          {/* Back Button */}
          <Button 
            variant="outline"
            onClick={() => router.push('/dashboard/my-classes')}
            className="w-full sm:w-fit border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all"
          >
            <ArrowLeft className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('backToClasses' as TranslationKey)}
          </Button>
          {classData.enrolled_at && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground justify-center md:justify-start">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
              <span className="text-center md:text-left">
                <span className="font-semibold">{t('enrolledOn' as TranslationKey)}:</span>{' '}
                <span className="font-medium text-foreground">
                  {new Date(classData.enrolled_at).toLocaleDateString(dateLocale)}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Class Header */}
        <div className="relative overflow-hidden rounded-3xl p-6 md:p-12 border border-primary/20 bg-gradient-to-br from-primary via-accent to-primary text-white shadow-2xl shadow-primary/20 animate-fade-in-up">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="absolute inset-0 islamic-pattern-subtle opacity-20"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 animate-float blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/30 rounded-full translate-y-16 -translate-x-16 animate-float blur-2xl" style={{animationDelay: '1s'}}></div>

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
              {/* Class Image */}
              <div className="relative flex-shrink-0 mx-auto md:mx-0">
                <div className="absolute inset-0 bg-white/20 rounded-3xl blur-lg"></div>
                {classData.image_url ? (
                  <img src={classData.image_url} alt={classData.class_name} className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover relative border-4 border-white/30 shadow-xl" />
                ) : (
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 relative shadow-xl">
                    <GraduationCap className="h-10 w-10 md:h-14 md:w-14 text-white" />
                  </div>
                )}
              </div>

              {/* Class Info */}
              <div className="flex-1 pt-2 text-center md:text-right rtl:text-right ltr:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold tracking-tight mb-3 sm:mb-4 drop-shadow-lg leading-tight">
                  {classData.class_name}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 transition-transform hover:scale-105">
                    <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="text-xs md:text-sm font-medium">{t('enrolledStatus' as TranslationKey)}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 transition-transform hover:scale-105">
                    <Badge variant="outline" className="bg-white/20 border-white/30 text-white text-xs md:text-sm px-2 py-0.5 h-auto">
                      {`${t('level' as TranslationKey)} ${classData.level ?? '—'}`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 transition-transform hover:scale-105">
                    <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="text-xs md:text-sm font-medium">
                      {subjects.length}{' '}
                      {subjects.length === 1 ? t('subject' as TranslationKey) : t('subjects' as TranslationKey)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {lastActivity ? (
              <div className="mt-6 sm:mt-8">
                <div className="rounded-2xl bg-white/10 border border-white/20 p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between backdrop-blur-md transition-all hover:bg-white/15">
                  <div className="text-center md:text-right rtl:text-right ltr:text-left">
                    <p className="text-xs md:text-sm uppercase tracking-wide text-white/70 mb-1 font-medium">
                      {t('latestActivity' as TranslationKey)}
                    </p>
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1 break-words">{lastActivity.label}</h3>
                    <p className="text-xs md:text-sm text-white/80">
                      {new Date(lastActivity.date).toLocaleString(dateLocale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <Link href={lastActivity.link} className="w-full md:w-auto">
                    <Button variant="secondary" className="w-full md:w-auto gap-2 shadow-lg hover:shadow-xl transition-all active:scale-95 text-sm sm:text-base">
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                      {t('continueLearning' as TranslationKey)}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-white/70 text-center md:text-right rtl:text-right ltr:text-left">
                {t('noActivityYet' as TranslationKey)}
              </p>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none animate-fade-in-up">
          <div className="min-w-[260px] snap-center md:min-w-0">
            <StatCard
              title={t('classOverview' as TranslationKey)}
              value={overviewStats.total}
              description={t('totalSubjectsLabel' as TranslationKey)}
              icon={BookOpen}
              gradient="from-primary to-accent"
              color="primary"
            />
          </div>
          <div className="min-w-[260px] snap-center md:min-w-0">
            <StatCard
              title={t('subjectsCompleted' as TranslationKey)}
              value={overviewStats.completed}
              description={`${Math.round((overviewStats.completed / Math.max(overviewStats.total, 1)) * 100)}%`}
              icon={CircleCheck}
              gradient="from-success to-primary"
              color="success"
            />
          </div>
          <div className="min-w-[260px] snap-center md:min-w-0">
            <StatCard
              title={t('subjectsInProgress' as TranslationKey)}
              value={overviewStats.inProgress}
              description={`${Math.round((overviewStats.inProgress / Math.max(overviewStats.total, 1)) * 100)}%`}
              icon={CheckCircle}
              gradient="from-info to-primary"
              color="info"
            />
          </div>
          <div className="min-w-[260px] snap-center md:min-w-0">
            <StatCard
              title={t('subjectsNotStarted' as TranslationKey)}
              value={overviewStats.notStarted}
              description={`${Math.round((overviewStats.notStarted / Math.max(overviewStats.total, 1)) * 100)}%`}
              icon={CircleDot}
              gradient="from-warning to-warning/80"
              color="warning"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        {subjects.length > 0 && (
          <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 md:flex-wrap gap-2 scrollbar-none">
            {([
              { key: 'all', label: t('all' as TranslationKey) },
              { key: 'in_progress', label: t('statusInProgress' as TranslationKey) },
              { key: 'completed', label: t('statusCompleted' as TranslationKey) },
              { key: 'not_started', label: t('statusNotStarted' as TranslationKey) },
            ] as const).map((tab) => (
              <Button
                key={tab.key}
                type="button"
                variant={filterTab === tab.key ? 'default' : 'outline'}
                size="sm"
                className="rounded-full whitespace-nowrap flex-shrink-0"
                onClick={() => setFilterTab(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        )}

        {/* Subjects List */}
        {subjects.length === 0 ? (
          <Card className="glass-card border-primary/10">
            <CardContent className="py-12 relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 islamic-pattern-subtle opacity-30"></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <EmptyState
                  title={t('noSubjectsFound' as TranslationKey)}
                  description={t('noSubjectsAddedYet' as TranslationKey)}
                  icon={BookOpen}
                  onRetry={loadData}
                  error={error}
                />
              </div>
            </CardContent>
          </Card>
        ) : filteredSubjects.length === 0 ? (
          <Card className="glass-card border-primary/10">
            <CardContent className="py-12 relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 islamic-pattern-subtle opacity-30"></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <EmptyState
                  title={t('noClassesMatchSearch' as TranslationKey)}
                  description={t('tryAdjustingFilters' as TranslationKey)}
                  icon={BookOpen}
                  action={{
                    label: t('clear' as TranslationKey),
                    onClick: () => setFilterTab('all'),
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 animate-fade-in-up">
            {filteredSubjects.map(({ subject, progress, status }, index) => {
              const progressValue = progress?.overall_progress || 0;
              const StatusIcon = statusIconMap[status];
              const statusText = t(statusLabelMap[status]);
              
              return (
                <Card key={subject.id} className="glass-card-hover border-primary/10 group overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex flex-col h-full">
                    <Link
                      href={`/dashboard/my-classes/${classId}/subjects/${subject.id}`}
                      prefetch={true}
                      className="flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded-2xl"
                      aria-label={subject.subject_name}
                    >
                      <CardHeader className="pb-4 h-full hover:bg-primary/5 transition-all">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          {/* Subject Info */}
                          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                            {/* Subject Image/Icon */}
                            <div className="relative flex-shrink-0">
                              {subject.image_url ? (
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden ring-2 ring-secondary/30 group-hover:ring-secondary/50 transition-all relative">
                                  <img
                                    src={subject.image_url}
                                    alt={subject.subject_name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center relative ring-2 ring-secondary/30 group-hover:ring-secondary/50 transition-all shadow-lg shadow-primary/20">
                                    <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Subject Details */}
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors cursor-pointer leading-tight">
                                  {subject.subject_name}
                                </CardTitle>
                                {/* Arrow Mobile */}
                                <div className="sm:hidden flex-shrink-0">
                                  <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                                    <ArrowRight className="h-4 w-4 text-primary rtl:rotate-180" />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Subject Description */}
                              {subject.description && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{subject.description}</p>
                              )}
                              
                              {/* Teacher Info with Avatar */}
                              {subject.teacher?.full_name && (
                                <Link
                                  href={`/dashboard/teachers/${subject.teacher.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-2 text-sm text-muted-foreground mb-3 hover:text-primary transition-colors group/teacher"
                                >
                                  {subject.teacher.avatar_url ? (
                                    <Avatar className="h-6 w-6 ring-2 ring-secondary/30">
                                      <AvatarImage src={subject.teacher.avatar_url} alt={subject.teacher.full_name} />
                                      <AvatarFallback className="text-xs">
                                        {subject.teacher.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <span className="truncate group-hover/teacher:underline">{subject.teacher.full_name}</span>
                                </Link>
                              )}
                              
                              {/* Reference URL */}
                              {subject.reference_url && (
                                <a
                                  href={subject.reference_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-info hover:underline flex items-center gap-1 mb-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {t('reference' as TranslationKey)}
                                </a>
                              )}
                              
                              {progress && progress.total_lessons > 0 ? (
                                <div className="space-y-3 mt-2">
                                  {/* Progress Bar */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <StatusIcon className={`h-4 w-4 ${
                                          status === 'completed' ? 'text-success' :
                                          status === 'in_progress' ? 'text-info' : 'text-muted-foreground'
                                        }`} />
                                        <span className="text-xs sm:text-sm font-medium text-foreground">
                                          {statusText}
                                        </span>
                                      </div>
                                      <span className="text-xs sm:text-sm font-bold text-foreground">
                                        {Math.round(progressValue)}%
                                      </span>
                                    </div>
                                    <div className="relative h-2.5 sm:h-3 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${getCompletionColor(progressValue)}`}
                                        style={{ width: `${progressValue}%` }}
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Stats */}
                                  <div className="flex items-center gap-3 text-xs sm:text-sm flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                                      <span className="text-muted-foreground">
                                        {progress.completed_lessons} {t('completedLessons' as TranslationKey)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-info"></div>
                                      <span className="text-muted-foreground">
                                        {progress.in_progress_lessons} {t('lessonsInProgress' as TranslationKey)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                  <StatusIcon className="h-4 w-4" />
                                  <span>{t('noLessonsYet' as TranslationKey)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Arrow Desktop */}
                          <div className="hidden sm:block flex-shrink-0 pt-2">
                            <div className="p-3 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                              <ArrowRight className="h-6 w-6 text-primary rtl:rotate-180" />
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Link>
                    <CardContent className="border-t border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5 pt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                      <Link href={`/dashboard/my-classes/${classId}/subjects/${subject.id}`} prefetch={true} className="col-span-2 sm:col-span-1 w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors h-9 text-xs sm:text-sm">
                          <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{t('viewLesson' as TranslationKey)}</span>
                        </Button>
                      </Link>
                      <Link href={`/dashboard/my-assignments?subject=${subject.id}`} prefetch={false} className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2 hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-colors h-9 text-xs sm:text-sm">
                          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate hidden sm:inline">{t('openAssignments' as TranslationKey)}</span>
                          <span className="truncate sm:hidden">{t('assignments' as TranslationKey)}</span>
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto gap-2 hover:bg-info/10 hover:text-info hover:border-info/30 transition-colors h-9 text-xs sm:text-sm"
                        onClick={() => setDiscussionSubject({ id: subject.id, name: subject.subject_name })}
                      >
                        <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate hidden sm:inline">{t('openDiscussion' as TranslationKey)}</span>
                        <span className="truncate sm:hidden">{t('openDiscussion' as TranslationKey).split(' ')[0]}</span>
                      </Button>
                      <Link href={`/dashboard/schedule?subject=${subject.id}`} prefetch={false} className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2 hover:bg-secondary/10 hover:text-secondary hover:border-secondary/30 transition-colors h-9 text-xs sm:text-sm">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate hidden sm:inline">{t('openSchedule' as TranslationKey)}</span>
                          <span className="truncate sm:hidden">{t('schedule' as TranslationKey)}</span>
                        </Button>
                      </Link>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Sheet open={!!discussionSubject} onOpenChange={(open) => !open && setDiscussionSubject(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{discussionSubject?.name}</SheetTitle>
            <SheetDescription>{t('subjectDiscussionDescription' as TranslationKey)}</SheetDescription>
          </SheetHeader>
          {discussionSubject && (
            <SubjectDiscussion
              subjectId={discussionSubject.id}
              subjectName={discussionSubject.name}
              t={t}
              dateLocale={dateLocale}
              currentUserId={profile.id}
              currentUserRole={profile.role as 'admin' | 'teacher' | 'student'}
              variant="sheet"
            />
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}

      
