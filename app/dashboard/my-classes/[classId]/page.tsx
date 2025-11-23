'use client';

import ClassViewClient from './ClassViewClient';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CardGridSkeleton, PageHeaderSkeleton, ListSkeleton } from '@/components/SkeletonLoaders';
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
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress > 0) return 'bg-amber-500';
    return 'bg-gray-300 dark:bg-gray-700';
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
        <div className="space-y-6 animate-fade-in">
          <PageHeaderSkeleton />
          <CardGridSkeleton count={2} />
          <ListSkeleton items={3} />
        </div>
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

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard/my-classes')}
            className="w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToClasses' as TranslationKey)}
          </Button>
          {classData.enrolled_at && (
            <div className="text-sm text-muted-foreground">
              {t('enrolledOn' as TranslationKey)}{' '}
              <span className="font-medium text-foreground">
                {new Date(classData.enrolled_at).toLocaleDateString(dateLocale)}
              </span>
            </div>
          )}
        </div>

        {/* Class Header */}
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 border border-white/20 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white shadow-2xl">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)'
          }}></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 animate-float blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16 animate-float blur-2xl" style={{animationDelay: '1s'}}></div>

          <div className="relative z-10">
            <div className="flex items-start gap-6">
              {/* Class Image */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-white/20 rounded-3xl blur-lg"></div>
                {classData.image_url ? (
                  <img src={classData.image_url} alt={classData.class_name} className="w-24 h-24 rounded-3xl object-cover relative border-4 border-white/30" />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 relative">
                    <GraduationCap className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>

              {/* Class Info */}
              <div className="flex-1 pt-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-3 drop-shadow-lg">
                  {classData.class_name}
                </h1>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('enrolledStatus' as TranslationKey)}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <Badge variant="outline" className="bg-white/20 border-white/30 text-white">
                      {`${t('level' as TranslationKey)} ${classData.level ?? '—'}`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {subjects.length}{' '}
                      {subjects.length === 1 ? t('subject' as TranslationKey) : t('subjects' as TranslationKey)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {lastActivity ? (
              <div className="mt-8">
                <div className="rounded-2xl bg-white/10 border border-white/20 p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-white/70 mb-1">
                      {t('latestActivity' as TranslationKey)}
                    </p>
                    <h3 className="text-xl font-semibold">{lastActivity.label}</h3>
                    <p className="text-sm text-white/80">
                      {new Date(lastActivity.date).toLocaleString(dateLocale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <Link href={lastActivity.link} className="w-full md:w-auto">
                    <Button variant="secondary" className="w-full md:w-auto gap-2">
                      <ArrowRight className="h-4 w-4" />
                      {t('continueLearning' as TranslationKey)}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-8 text-sm text-white/70">
                {t('noActivityYet' as TranslationKey)}
              </p>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-slate-100 dark:border-slate-800 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('classOverview' as TranslationKey)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {overviewStats.total}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t('totalSubjectsLabel' as TranslationKey)}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-100 dark:border-slate-800 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('subjectsCompleted' as TranslationKey)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {overviewStats.completed}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((overviewStats.completed / Math.max(overviewStats.total, 1)) * 100)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100/60 dark:bg-emerald-950/40 flex items-center justify-center">
                <CircleCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-100 dark:border-slate-800 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('subjectsInProgress' as TranslationKey)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {overviewStats.inProgress}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((overviewStats.inProgress / Math.max(overviewStats.total, 1)) * 100)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100/60 dark:bg-blue-950/40 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-100 dark:border-slate-800 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('subjectsNotStarted' as TranslationKey)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {overviewStats.notStarted}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((overviewStats.notStarted / Math.max(overviewStats.total, 1)) * 100)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100/60 dark:bg-amber-950/40 flex items-center justify-center">
                <CircleDot className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-3">
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
                className="rounded-full"
                onClick={() => setFilterTab(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        )}

        {/* Subjects List */}
        {subjects.length === 0 ? (
          <Card className="card-elegant">
            <CardContent className="py-12">
              <EmptyState
                title={t('noSubjectsFound' as TranslationKey)}
                description={t('noSubjectsAddedYet' as TranslationKey)}
                icon={BookOpen}
                onRetry={loadData}
                error={error}
              />
            </CardContent>
          </Card>
        ) : filteredSubjects.length === 0 ? (
          <Card className="card-elegant">
            <CardContent className="py-12">
              <EmptyState
                title={t('noClassesMatchSearch' as TranslationKey)}
                description={t('tryAdjustingFilters' as TranslationKey)}
                icon={BookOpen}
                action={{
                  label: t('clear' as TranslationKey),
                  onClick: () => setFilterTab('all'),
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredSubjects.map(({ subject, progress, status }) => {
              const progressValue = progress?.overall_progress || 0;
              const StatusIcon = statusIconMap[status];
              const statusText = t(statusLabelMap[status]);
              
              return (
                <Card key={subject.id} className="card-hover overflow-hidden">
                  <div className="flex flex-col h-full">
                    <Link
                      href={`/dashboard/my-classes/${classId}/subjects/${subject.id}`}
                      prefetch={true}
                      className="flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded-2xl"
                      aria-label={subject.subject_name}
                    >
                      <CardHeader className="pb-4 h-full">
                        <div className="flex items-start justify-between gap-4">
                          {/* Subject Info */}
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            {/* Subject Image/Icon */}
                            <div className="relative flex-shrink-0">
                              {subject.image_url ? (
                                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-100 dark:border-blue-900 relative">
                                  <img
                                    src={subject.image_url}
                                    alt={subject.subject_name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative border-2 border-blue-100 dark:border-blue-900">
                                    <BookOpen className="h-8 w-8 text-white" />
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Subject Details */}
                            <div className="flex-1 min-w-0 pt-1">
                              <CardTitle className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer">
                                {subject.subject_name}
                              </CardTitle>
                              
                              {/* ✅ NEW: Subject Description */}
                              {subject.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{subject.description}</p>
                              )}
                              
                              {/* Teacher Info with Avatar */}
                              {subject.teacher?.full_name && (
                                <Link
                                  href={`/dashboard/teachers/${subject.teacher.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group/teacher"
                                >
                                  {subject.teacher.avatar_url ? (
                                    <Avatar className="h-6 w-6 border border-slate-200 dark:border-slate-700">
                                      <AvatarImage src={subject.teacher.avatar_url} alt={subject.teacher.full_name} />
                                      <AvatarFallback className="text-xs">
                                        {subject.teacher.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                      <User className="h-3.5 w-3.5 text-slate-500" />
                                    </div>
                                  )}
                                  <span className="truncate group-hover/teacher:underline">{subject.teacher.full_name}</span>
                                </Link>
                              )}
                              
                              {/* ✅ NEW: Reference URL */}
                              {subject.reference_url && (
                                <a
                                  href={subject.reference_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {language === 'ar' ? 'المرجع' : 'Reference'}
                                </a>
                              )}
                              
                              {progress && progress.total_lessons > 0 ? (
                                <div className="space-y-3">
                                  {/* Progress Bar */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <StatusIcon className={`h-4 w-4 ${
                                          status === 'completed' ? 'text-emerald-600' :
                                          status === 'in_progress' ? 'text-blue-600' : 'text-gray-400'
                                        }`} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          {statusText}
                                        </span>
                                      </div>
                                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {Math.round(progressValue)}%
                                      </span>
                                    </div>
                                    <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${getCompletionColor(progressValue)}`}
                                        style={{ width: `${progressValue}%` }}
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Stats */}
                                  <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {progress.completed_lessons} {t('completedLessons' as TranslationKey)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {progress.in_progress_lessons} {t('lessonsInProgress' as TranslationKey)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {progress.not_started_lessons} {t('lessonsRemaining' as TranslationKey)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                  <StatusIcon className="h-4 w-4" />
                                  <span>{t('noLessonsYet' as TranslationKey)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="flex-shrink-0 pt-2">
                            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-950/50 transition-colors">
                              <ArrowRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Link>
                    <CardContent className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap gap-2">
                      <Link href={`/dashboard/my-classes/${classId}/subjects/${subject.id}`} prefetch={true}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <BookOpen className="h-4 w-4" />
                          {t('viewLesson' as TranslationKey)}
                        </Button>
                      </Link>
                      <Link href={`/dashboard/my-assignments?subject=${subject.id}`} prefetch={false}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <FileText className="h-4 w-4" />
                          {t('openAssignments' as TranslationKey)}
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setDiscussionSubject({ id: subject.id, name: subject.subject_name })}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t('openDiscussion' as TranslationKey)}
                      </Button>
                      <Link href={`/dashboard/schedule?subject=${subject.id}`} prefetch={false}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Calendar className="h-4 w-4" />
                          {t('openSchedule' as TranslationKey)}
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

      
