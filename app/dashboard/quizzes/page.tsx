'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthCheck } from '@/hooks/useAuthCheck';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { filterBySearch } from '@/lib/tableUtils';
import { getErrorMessage } from '@/lib/errorHandler';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  FileText,
  Download,
  Send,
  X,
  Trash2,
  Edit,
  Award,
  BookOpen,
  GraduationCap,
  Calendar,
  Clock,
  Users,
  Loader2,
  AlertTriangle,
  Play,
  CheckCircle,
  MoreVertical,
} from 'lucide-react';
import { 
  supabase, 
  fetchStaffQuizzes, 
  fetchAttemptsForQuiz, 
  fetchEnrolledStudentsForSubject,
  createNotification, 
  updateQuiz, 
  deleteQuiz 
} from '@/lib/supabase';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/tableUtils';
import { PageHeader } from '@/components/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function QuizzesManagePage() {
  const { profile, loading: authLoading, isAuthorized } = useAuthCheck({
    requiredRole: ['admin', 'teacher', 'supervisor'],
  });
  const { t } = useLanguage();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'subject' | 'lesson'>('all');
  
  // Confirmation dialogs
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuizForAction, setSelectedQuizForAction] = useState<any | null>(null);

  // Load quizzes and subjects in parallel for better performance
  const loadData = useCallback(async () => {
    if (!isAuthorized) return;
    
    try {
      setLoading(true);
      const [quizzesResult, subjectsResult] = await Promise.all([
        fetchStaffQuizzes(),
        supabase
          .from('class_subjects')
          .select('id, subject_name')
          .order('subject_name')
      ]);

      if (quizzesResult.error) {
        console.error('Error fetching quizzes:', quizzesResult.error);
        toast.error(getErrorMessage(quizzesResult.error));
        return;
      }
      
      const quizzesData = quizzesResult.data || [];
      const subjectsData = subjectsResult.data || [];
      
      // Debug: Log to check data structure
      if (quizzesData.length > 0) {
        console.log('Sample quiz data:', quizzesData[0]);
        console.log('Subjects data:', subjectsData);
      }
      
      setQuizzes(quizzesData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized, loadData]);

  // Helper functions to avoid repetition
  const isQuizActive = useCallback((quiz: any) => {
    return !quiz.end_at || new Date(quiz.end_at) > new Date();
  }, []);

  const isSubjectQuiz = useCallback((quiz: any) => {
    return quiz.subject_id && !quiz.lesson_id;
  }, []);

  const isLessonQuiz = useCallback((quiz: any) => {
    return !!quiz.lesson_id;
  }, []);

  // Filter quizzes
  const filteredQuizzes = useMemo(() => {
    let filtered = quizzes;

    // Search filter (using debounced query)
    if (debouncedSearchQuery.trim()) {
      filtered = filterBySearch(filtered, debouncedSearchQuery, (quiz) => [
        quiz.title || '',
        quiz.description || '',
        quiz.subject?.subject_name || '',
        quiz.lesson?.title || '',
      ]);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((q) => {
        const active = isQuizActive(q);
        return statusFilter === 'OPEN' ? active : !active;
      });
    }

    // Subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter((q) => q.subject_id === subjectFilter);
    }

    // Type filter (subject vs lesson)
    if (typeFilter !== 'all') {
      filtered = filtered.filter((q) => {
        if (typeFilter === 'subject') return isSubjectQuiz(q);
        if (typeFilter === 'lesson') return isLessonQuiz(q);
        return true;
      });
    }

    return filtered;
  }, [quizzes, debouncedSearchQuery, statusFilter, subjectFilter, typeFilter, isQuizActive, isSubjectQuiz, isLessonQuiz]);

  // Pagination
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems: paginatedQuizzes,
    startIndex,
    endIndex,
  } = usePagination(filteredQuizzes, { itemsPerPage: 10 });

  // Export CSV
  const exportCSV = useCallback(async (quizId: string) => {
    try {
      setDownloading(quizId);
      const { data, error } = await fetchAttemptsForQuiz(quizId);
      if (error) {
        toast.error(getErrorMessage(error));
        return;
      }

      // Fetch student profiles
      const ids = Array.from(new Set((data || []).map((r: any) => r.student_id)));
      let profilesMap: Record<string, any> = {};
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ids);
        (profs || []).forEach((p: any) => { profilesMap[p.id] = p; });
      }

      const header = ['student_id', 'full_name', 'email', 'started_at', 'submitted_at', 'status', 'score'];
      const lines = (data || []).map((r: any) => {
        const p = profilesMap[r.student_id] || {};
        return [
          r.student_id,
          JSON.stringify(p.full_name || ''),
          JSON.stringify(p.email || ''),
          r.started_at || '',
          r.submitted_at || '',
          r.status || '',
          r.score ?? 0
        ].join(',');
      });
      const csv = [header.join(','), ...lines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz_${quizId}_attempts.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('csvExportedSuccessfully'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  }, [t]);

  // Publish quiz - optimized with batch processing
  const publish = useCallback(async (quiz: any) => {
    try {
      setPublishing(quiz.id);
      if (quiz.subject_id) {
        const { data: students, error } = await fetchEnrolledStudentsForSubject(quiz.subject_id);
        if (error) {
          toast.error(getErrorMessage(error));
          return;
        }
        
        // Process notifications in batches for better performance
        const batchSize = 10;
        const studentsList = students || [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < studentsList.length; i += batchSize) {
          const batch = studentsList.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map((s: any) =>
              createNotification({
                recipient_id: s.id,
                title: t('newQuiz').replace('{title}', quiz.title),
                body: quiz.description || t('newQuizAvailable'),
                link_url: `/dashboard/quizzes/${quiz.id}/take`,
              })
            )
          );

          results.forEach((result) => {
            if (result.status === 'fulfilled' && !result.value.error) {
              successCount++;
            } else {
              errorCount++;
            }
          });
        }

        if (errorCount > 0) {
          toast.error(t('failedToSendNotifications').replace('{count}', errorCount.toString()));
        } else {
          toast.success(t('publishedNotificationsTo').replace('{count}', successCount.toString()));
        }
      } else {
        toast.error(t('quizMustBeLinkedToSubjectToPublish'));
      }
    } catch (err) {
      console.error('Error publishing quiz:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setPublishing(null);
    }
  }, [t]);

  // Close quiz
  const handleCloseQuizClick = useCallback((quiz: any) => {
    setSelectedQuizForAction(quiz);
    setCloseDialogOpen(true);
  }, []);

  const closeNow = useCallback(async () => {
    if (!selectedQuizForAction) return;
    
    try {
      const { error } = await updateQuiz(selectedQuizForAction.id, { end_at: new Date().toISOString() });
      if (error) {
        toast.error(getErrorMessage(error));
        return;
      }
      toast.success(t('quizClosedSuccessfully'));
      setCloseDialogOpen(false);
      setSelectedQuizForAction(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [selectedQuizForAction, loadData, t]);

  // Open quiz
  const handleOpenQuizClick = useCallback((quiz: any) => {
    setSelectedQuizForAction(quiz);
    setOpenDialogOpen(true);
  }, []);

  const openNow = useCallback(async () => {
    if (!selectedQuizForAction) return;
    
    try {
      // Set end_at to null to reopen the quiz
      const { error } = await updateQuiz(selectedQuizForAction.id, { end_at: null });
      if (error) {
        toast.error(getErrorMessage(error));
        return;
      }
      toast.success(t('quizOpenedSuccessfully'));
      setOpenDialogOpen(false);
      setSelectedQuizForAction(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [selectedQuizForAction, loadData, t]);

  // Delete quiz
  const handleDeleteQuizClick = useCallback((quiz: any) => {
    setSelectedQuizForAction(quiz);
    setDeleteDialogOpen(true);
  }, []);

  const removeQuiz = useCallback(async () => {
    if (!selectedQuizForAction) return;
    
    try {
      const { error } = await deleteQuiz(selectedQuizForAction.id);
      if (error) {
        toast.error(getErrorMessage(error));
        return;
      }
      toast.success(t('quizDeletedSuccessfully'));
      setDeleteDialogOpen(false);
      setSelectedQuizForAction(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [selectedQuizForAction, loadData, t]);

  // Notify results - optimized with batch processing
  const notifyResults = useCallback(async (quiz: any) => {
    try {
      setNotifying(quiz.id);
      const isAfterClose = quiz.show_results_policy === 'after_close';
      const ended = quiz.end_at && new Date(quiz.end_at) < new Date();
      if (!isAfterClose || !ended) {
        toast.error(t('resultsNotAvailableYet'));
        return;
      }
      if (quiz.subject_id) {
        const { data: students, error } = await fetchEnrolledStudentsForSubject(quiz.subject_id);
        if (error) {
          toast.error(getErrorMessage(error));
          return;
        }
        
        // Process notifications in batches for better performance
        const batchSize = 10;
        const studentsList = students || [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < studentsList.length; i += batchSize) {
          const batch = studentsList.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map((s: any) =>
              createNotification({
                recipient_id: s.id,
                title: t('resultsAvailable').replace('{title}', quiz.title),
                body: t('quizResultsAvailable'),
                link_url: `/dashboard/quizzes/${quiz.id}/result`,
              })
            )
          );

          results.forEach((result) => {
            if (result.status === 'fulfilled' && !result.value.error) {
              successCount++;
            } else {
              errorCount++;
            }
          });
        }

        if (errorCount > 0) {
          toast.error(t('failedToSendNotifications').replace('{count}', errorCount.toString()));
        } else {
          toast.success(t('resultsNotificationsSentTo').replace('{count}', successCount.toString()));
        }
      } else {
        toast.error(t('quizMustBeLinkedToSubject'));
      }
    } catch (err) {
      console.error('Error notifying results:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setNotifying(null);
    }
  }, [t]);

  // Stats
  const stats = useMemo(() => {
    const openCount = quizzes.filter(isQuizActive).length;
    const subjectCount = quizzes.filter(isSubjectQuiz).length;
    const lessonCount = quizzes.filter(isLessonQuiz).length;
    return {
      total: quizzes.length,
      open: openCount,
      closed: quizzes.length - openCount,
      subject: subjectCount,
      lesson: lessonCount,
    };
  }, [quizzes, isQuizActive, isSubjectQuiz, isLessonQuiz]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">{t('loadingQuizzes')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          icon={FileText}
          title={t('quizzesManagement')}
          description={t('manageAndTrackQuizzes')}
        >
          <Button
            onClick={() => router.push('/dashboard/quizzes/new')}
            className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-lg"
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('createQuiz')}
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 animate-fade-in-up">
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('totalQuizzes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-primary">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {t('open')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.open}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <X className="h-4 w-4" />
                {t('closed')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-slate-600">{stats.closed}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {t('subjectQuizzes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-blue-600">{stats.subject}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                {t('lessonQuizzes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-purple-600">{stats.lesson}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-hover glass-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Search className="h-5 w-5 text-muted-foreground" />
              {t('filtersAndSearch')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t('searchQuizzes')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-modern"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allStatus')}</SelectItem>
                  <SelectItem value="OPEN">{t('open')}</SelectItem>
                  <SelectItem value="CLOSED">{t('closed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('subjectLabel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allSubjects')}</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  <SelectItem value="subject">{t('subjectOnly')}</SelectItem>
                  <SelectItem value="lesson">{t('lessonOnly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quizzes List */}
        <Card className="card-hover glass-strong animate-fade-in-up delay-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display">
                {t('quizzes')} ({filteredQuizzes.length})
              </CardTitle>
              {filteredQuizzes.length > 0 && (
                <Badge variant="outline" className="text-sm">
                  {t('showingQuizzes')
                    .replace('{start}', (startIndex + 1).toString())
                    .replace('{end}', Math.min(endIndex, filteredQuizzes.length).toString())
                    .replace('{total}', filteredQuizzes.length.toString())}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredQuizzes.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <FileText className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">{t('noQuizzesFound')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {debouncedSearchQuery || statusFilter !== 'ALL' || subjectFilter !== 'all' || typeFilter !== 'all'
                    ? t('tryAdjustingFilters')
                    : t('noQuizzesCreatedYet')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedQuizzes.map((quiz: any) => {
                  const active = isQuizActive(quiz);
                  const isSubQuiz = isSubjectQuiz(quiz);
                  const isLessQuiz = isLessonQuiz(quiz);

                  return (
                    <Card
                      key={quiz.id}
                      className={`card-hover glass-strong border-2 transition-all duration-300 ${
                        isLessQuiz
                          ? 'border-purple-300 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-600'
                          : isSubQuiz
                          ? 'border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600'
                          : active
                          ? 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <CardContent className="p-0">
                        {/* Subject & Lesson Info Section */}
                        {(quiz.subject_id || quiz.lesson_id || quiz.lesson?.subject_id) && (
                          <div className={`px-6 pt-4 pb-3 border-b ${
                            isLessQuiz
                              ? 'bg-purple-50/30 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
                              : isSubQuiz
                              ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                              : 'bg-slate-50/30 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700'
                          }`}>
                            <div className="flex items-center gap-4 flex-wrap">
                              {(quiz.subject_id || quiz.lesson?.subject_id) && (
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{t('subjectLabel')}</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {(() => {
                                        // Try to get subject name from multiple sources
                                        // 1. Direct subject relation
                                        if (quiz.subject?.subject_name) {
                                          return quiz.subject.subject_name;
                                        }
                                        // 2. Subject from lesson
                                        if (quiz.lesson?.subject?.subject_name) {
                                          return quiz.lesson.subject.subject_name;
                                        }
                                        // 3. Find by subject_id directly
                                        if (quiz.subject_id) {
                                          const foundSubject = subjects.find(s => s.id === quiz.subject_id);
                                          if (foundSubject?.subject_name) {
                                            return foundSubject.subject_name;
                                          }
                                        }
                                        // 4. Find by lesson's subject_id
                                        if (quiz.lesson?.subject_id) {
                                          const foundSubject = subjects.find(s => s.id === quiz.lesson.subject_id);
                                          if (foundSubject?.subject_name) {
                                            return foundSubject.subject_name;
                                          }
                                        }
                                        return '—';
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {quiz.lesson && (
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                                    <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400">{t('lessonLabel')}</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {quiz.lesson.title}
                                    </p>
                                  </div>
                                </div>
                              )}
                              <div className="ml-auto">
                                {isLessQuiz && (
                                  <Badge className="bg-purple-500 text-white border-purple-600 dark:bg-purple-600 dark:text-white dark:border-purple-700 font-medium">
                                    <GraduationCap className="h-3 w-3 mr-1.5" />
                                    {t('lessonQuizzes')}
                                  </Badge>
                                )}
                                {isSubQuiz && (
                                  <Badge className="bg-blue-500 text-white border-blue-600 dark:bg-blue-600 dark:text-white dark:border-blue-700 font-medium">
                                    <BookOpen className="h-3 w-3 mr-1.5" />
                                    {t('subjectQuizzes')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Header Section */}
                        <div className={`relative p-6 pb-4 ${
                          active
                            ? 'bg-slate-50/50 dark:bg-slate-900/30'
                            : 'bg-slate-50/30 dark:bg-slate-900/20'
                        }`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                                  active
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                    : 'bg-slate-200 dark:bg-slate-700'
                                }`}>
                                  <FileText className={`h-5 w-5 ${
                                    active
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-xl text-foreground mb-2 leading-tight">
                                    {quiz.title}
                                  </h3>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                      variant={active ? 'default' : 'secondary'}
                                      className={`font-medium ${
                                        active
                                          ? 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:text-white dark:border-emerald-700'
                                          : 'bg-slate-500 text-white border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600'
                                      }`}
                                    >
                                      {active ? (
                                        <>
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          {t('open')}
                                        </>
                                      ) : (
                                        <>
                                          <X className="h-3 w-3 mr-1" />
                                          {t('closed')}
                                        </>
                                      )}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {quiz.description && (
                                <p className="text-sm text-slate-700 dark:text-slate-300 mb-0 line-clamp-2 leading-relaxed pl-14">
                                  {quiz.description}
                                </p>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/edit`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/grade`)}>
                                  <Award className="h-4 w-4 mr-2" />
                                  {t('gradeAction')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {active ? (
                                  <DropdownMenuItem onClick={() => handleCloseQuizClick(quiz)}>
                                    <X className="h-4 w-4 mr-2" />
                                    {t('close')}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleOpenQuizClick(quiz)}>
                                    <Play className="h-4 w-4 mr-2" />
                                    {t('openAction')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => exportCSV(quiz.id)}
                                  disabled={downloading === quiz.id}
                                >
                                  {downloading === quiz.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                  )}
                                  {t('export')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => publish(quiz)}
                                  disabled={publishing === quiz.id}
                                >
                                  {publishing === quiz.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                  )}
                                  {t('publish')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => notifyResults(quiz)}
                                  disabled={notifying === quiz.id}
                                >
                                  {notifying === quiz.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                  )}
                                  {t('notify')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteQuizClick(quiz)}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-6 pt-4">
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30">
                              <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                                <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">{t('attempts')}</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {quiz.attempts_allowed || 1}
                                </p>
                              </div>
                            </div>
                            {quiz.time_limit_minutes && (
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30">
                                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-0.5">{t('timeLimit')}</p>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {quiz.time_limit_minutes} {t('minutes')}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30">
                              <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                                <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">{t('created')}</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {formatDateTime(quiz.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {(quiz.start_at || quiz.end_at) && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30 mb-4">
                              <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">{t('timeRange')}</p>
                                <p className="text-sm text-slate-900 dark:text-slate-100">
                                  {quiz.start_at ? formatDateTime(quiz.start_at) : '—'} →{' '}
                                  {quiz.end_at ? formatDateTime(quiz.end_at) : '—'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Actions Bar */}
                          <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/edit`)}
                              className="flex-1 sm:flex-initial"
                            >
                              <Edit className="h-4 w-4 mr-1.5" />
                              {t('edit')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/grade`)}
                              className="flex-1 sm:flex-initial"
                            >
                              <Award className="h-4 w-4 mr-1.5" />
                              {t('gradeAction')}
                            </Button>
                            {active ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCloseQuizClick(quiz)}
                                className="flex-1 sm:flex-initial"
                              >
                                <X className="h-4 w-4 mr-1.5" />
                                {t('close')}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenQuizClick(quiz)}
                                className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 flex-1 sm:flex-initial"
                              >
                                <Play className="h-4 w-4 mr-1.5" />
                                {t('openAction')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {filteredQuizzes.length > 10 && (
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {t('showingQuizzes')
                      .replace('{start}', (startIndex + 1).toString())
                      .replace('{end}', Math.min(endIndex, filteredQuizzes.length).toString())
                      .replace('{total}', filteredQuizzes.length.toString())}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      {t('previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {t('next')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Close Quiz Confirmation Dialog */}
        <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                {t('closeQuiz')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('closeQuizConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {selectedQuizForAction && (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="font-semibold text-sm">{selectedQuizForAction.title}</p>
                {selectedQuizForAction.subject && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {t('subjectLabel')}: {selectedQuizForAction.subject.subject_name}
                  </p>
                )}
                {selectedQuizForAction.lesson && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {t('lessonLabel')}: {selectedQuizForAction.lesson.title}
                  </p>
                )}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedQuizForAction(null)}>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={closeNow} className="bg-amber-600 hover:bg-amber-700">
                {t('closeQuiz')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Open Quiz Confirmation Dialog */}
        <AlertDialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                {t('openQuiz')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('openQuizConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {selectedQuizForAction && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-200">{selectedQuizForAction.title}</p>
                {selectedQuizForAction.subject && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    {t('subjectLabel')}: {selectedQuizForAction.subject.subject_name}
                  </p>
                )}
                {selectedQuizForAction.lesson && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {t('lessonLabel')}: {selectedQuizForAction.lesson.title}
                  </p>
                )}
                {selectedQuizForAction.end_at && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    {t('currentEndTime').replace('{time}', formatDateTime(selectedQuizForAction.end_at))}
                  </p>
                )}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedQuizForAction(null)}>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={openNow} className="bg-emerald-600 hover:bg-emerald-700">
                {t('openQuiz')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Quiz Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                {t('deleteQuiz')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteQuizConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {selectedQuizForAction && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-semibold text-sm text-red-900 dark:text-red-200">{selectedQuizForAction.title}</p>
                {selectedQuizForAction.subject && (
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    {t('subjectLabel')}: {selectedQuizForAction.subject.subject_name}
                  </p>
                )}
                {selectedQuizForAction.lesson && (
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {t('lessonLabel')}: {selectedQuizForAction.lesson.title}
                  </p>
                )}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedQuizForAction(null)}>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={removeQuiz} className="bg-red-600 hover:bg-red-700">
                {t('deletePermanently')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}