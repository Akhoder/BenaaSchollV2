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
  Filter,
  ChevronDown,
  ChevronUp,
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
import { PageLoading } from '@/components/LoadingSpinner';
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
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
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
        <PageLoading
          text={t('loadingQuizzes')}
          statsCount={5}
          contentType="grid"
          contentRows={6}
        />
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
            className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-lg text-sm sm:text-base"
          >
            <FileText className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t('createQuiz')}
          </Button>
        </PageHeader>

        {/* ✨ Stats Cards - Horizontal Scroll on Mobile */}
        <div className="flex overflow-x-auto pb-3 sm:pb-4 gap-2.5 sm:gap-3 md:gap-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0 -mx-2 sm:-mx-3 md:mx-0 px-2 sm:px-3 md:px-0 scrollbar-none animate-fade-in-up">
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-primary/10 hover:border-primary/30 transition-all duration-300 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-primary to-accent rounded-full mb-2 sm:mb-2.5 md:mb-3 shadow-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{stats.total}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('totalQuizzes')}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-success/10 hover:border-success/30 transition-all duration-300 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-success to-primary rounded-full mb-2 sm:mb-2.5 md:mb-3 shadow-lg">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{stats.open}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('open')}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-secondary/10 hover:border-secondary/30 transition-all duration-300 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-secondary to-secondary/80 rounded-full mb-2 sm:mb-2.5 md:mb-3 shadow-lg shadow-secondary/20">
                  <X className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{stats.closed}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('closed')}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-accent/10 hover:border-accent/30 transition-all duration-300 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-accent to-primary rounded-full mb-2 sm:mb-2.5 md:mb-3 shadow-lg">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{stats.subject}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('subjectQuizzes')}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-info/10 hover:border-info/30 transition-all duration-300 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-info to-accent rounded-full mb-2 sm:mb-2.5 md:mb-3 shadow-lg">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{stats.lesson}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('lessonQuizzes')}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ✨ Filters - Mobile First Design */}
        <Card className="glass-card border-primary/10">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display text-foreground text-base sm:text-lg">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                {t('filtersAndSearch')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="sm:hidden"
              >
                {filtersExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className={`${filtersExpanded ? 'block' : 'hidden'} sm:block`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('searchQuizzes')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rtl:pl-3 rtl:pr-10 input-modern border-primary/20 focus:border-primary h-10 sm:h-11"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-10 sm:h-11">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allStatus')}</SelectItem>
                  <SelectItem value="OPEN">{t('open')}</SelectItem>
                  <SelectItem value="CLOSED">{t('closed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="h-10 sm:h-11">
                  <SelectValue placeholder={t('subjectLabel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allSubjects')}</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)} className="sm:col-span-2 lg:col-span-1">
                <SelectTrigger className="h-10 sm:h-11">
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

        {/* ✨ Quizzes List - Islamic Design */}
        <Card className="glass-card border-primary/10 overflow-hidden animate-fade-in-up delay-200">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <CardTitle className="font-display text-foreground flex items-center gap-2 text-base sm:text-lg">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                {t('quizzes')} 
                <Badge variant="gold" className="text-xs sm:text-sm">{filteredQuizzes.length}</Badge>
              </CardTitle>
              {filteredQuizzes.length > 0 && (
                <Badge variant="outline" className="text-xs sm:text-sm border-primary/30 text-muted-foreground w-full sm:w-auto text-center sm:text-left">
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
              <div className="text-center py-8 sm:py-12 animate-fade-in">
                <div className="relative inline-block mb-3 sm:mb-4">
                  <div className="p-4 sm:p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full">
                    <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-primary/50 animate-float" />
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground font-display mb-1.5 sm:mb-2">{t('noQuizzesFound')}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-sans px-4">
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
                      className={`glass-card-hover border-2 transition-all duration-300 ${
                        isLessQuiz
                          ? 'border-info/30 hover:border-info/50'
                          : isSubQuiz
                          ? 'border-accent/30 hover:border-accent/50'
                          : active
                          ? 'border-success/30 hover:border-success/50'
                          : 'border-secondary/30 hover:border-secondary/50'
                      }`}
                    >
                      <CardContent className="p-0">
                        {/* Subject & Lesson Info Section */}
                        {(quiz.subject_id || quiz.lesson_id || quiz.lesson?.subject_id) && (
                          <div className={`px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b ${
                            isLessQuiz
                              ? 'bg-info/5 dark:bg-info/10 border-info/20'
                              : isSubQuiz
                              ? 'bg-accent/5 dark:bg-accent/10 border-accent/20'
                              : 'bg-primary/5 dark:bg-primary/10 border-primary/20'
                          }`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                              {(quiz.subject_id || quiz.lesson?.subject_id) && (
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-accent/10">
                                    <BookOpen className="h-4 w-4 text-accent" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-accent">{t('subjectLabel')}</p>
                                    <p className="text-sm font-semibold text-foreground">
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
                                  <div className="p-1.5 rounded-lg bg-info/10">
                                    <GraduationCap className="h-4 w-4 text-info" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-info">{t('lessonLabel')}</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {quiz.lesson.title}
                                    </p>
                                  </div>
                                </div>
                              )}
                              <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-2">
                                {isLessQuiz && (
                                  <Badge variant="info" className="font-medium text-xs sm:text-sm">
                                    <GraduationCap className="h-3 w-3 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                                    {t('lessonQuizzes')}
                                  </Badge>
                                )}
                                {isSubQuiz && (
                                  <Badge variant="accent" className="font-medium text-xs sm:text-sm">
                                    <BookOpen className="h-3 w-3 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                                    {t('subjectQuizzes')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Header Section */}
                        <div className={`relative p-4 sm:p-6 pb-3 sm:pb-4 ${
                          active
                            ? 'bg-primary/5 dark:bg-primary/10'
                            : 'bg-muted/30 dark:bg-muted/10'
                        }`}>
                          <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0 ${
                                  active
                                    ? 'bg-gradient-to-br from-success to-primary shadow-lg'
                                    : 'bg-gradient-to-br from-secondary to-secondary/80 shadow-lg shadow-secondary/20'
                                }`}>
                                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-base sm:text-xl text-foreground mb-1.5 sm:mb-2 leading-tight break-words">
                                    {quiz.title}
                                  </h3>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                      variant={active ? 'success' : 'gold'}
                                      className="font-medium text-xs sm:text-sm"
                                    >
                                      {active ? (
                                        <>
                                          <CheckCircle className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                          {t('open')}
                                        </>
                                      ) : (
                                        <>
                                          <X className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                          {t('closed')}
                                        </>
                                      )}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {quiz.description && (
                                <p className="text-xs sm:text-sm text-muted-foreground mb-0 line-clamp-2 leading-relaxed pl-0 sm:pl-14">
                                  {quiz.description}
                                </p>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-8 sm:w-8 p-0 flex-shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/edit`)}>
                                  <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/grade`)}>
                                  <Award className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t('gradeAction')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {active ? (
                                  <DropdownMenuItem onClick={() => handleCloseQuizClick(quiz)}>
                                    <X className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                    {t('close')}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleOpenQuizClick(quiz)}>
                                    <Play className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                    {t('openAction')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => exportCSV(quiz.id)}
                                  disabled={downloading === quiz.id}
                                >
                                  {downloading === quiz.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  )}
                                  {t('export')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => publish(quiz)}
                                  disabled={publishing === quiz.id}
                                >
                                  {publishing === quiz.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  )}
                                  {t('publish')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => notifyResults(quiz)}
                                  disabled={notifying === quiz.id}
                                >
                                  {notifying === quiz.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  )}
                                  {t('notify')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteQuizClick(quiz)}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                                >
                                  <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t('delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-4 sm:p-6 pt-3 sm:pt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30">
                              <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">{t('attempts')}</p>
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {quiz.attempts_allowed || 1}
                                </p>
                              </div>
                            </div>
                            {quiz.time_limit_minutes && (
                              <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30">
                                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] sm:text-xs font-medium text-amber-600 dark:text-amber-400 mb-0.5">{t('timeLimit')}</p>
                                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {quiz.time_limit_minutes} {t('minutes')}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30">
                              <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">{t('created')}</p>
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">
                                  {formatDateTime(quiz.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {(quiz.start_at || quiz.end_at) && (
                            <div className="flex items-start sm:items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30 mb-3 sm:mb-4">
                              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">{t('timeRange')}</p>
                                <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 break-words">
                                  {quiz.start_at ? formatDateTime(quiz.start_at) : '—'} →{' '}
                                  {quiz.end_at ? formatDateTime(quiz.end_at) : '—'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Actions Bar */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-800">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/edit`)}
                              className="flex-1 sm:flex-initial h-10 sm:h-9 text-sm"
                            >
                              <Edit className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                              {t('edit')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/grade`)}
                              className="flex-1 sm:flex-initial h-10 sm:h-9 text-sm"
                            >
                              <Award className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                              {t('gradeAction')}
                            </Button>
                            {active ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCloseQuizClick(quiz)}
                                className="flex-1 sm:flex-initial h-10 sm:h-9 text-sm"
                              >
                                <X className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                                {t('close')}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenQuizClick(quiz)}
                                className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 flex-1 sm:flex-initial h-10 sm:h-9 text-sm"
                              >
                                <Play className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-center sm:text-left">
                    {t('showingQuizzes')
                      .replace('{start}', (startIndex + 1).toString())
                      .replace('{end}', Math.min(endIndex, filteredQuizzes.length).toString())
                      .replace('{total}', filteredQuizzes.length.toString())}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex-1 sm:flex-initial h-10 sm:h-9 text-sm"
                    >
                      {t('previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex-1 sm:flex-initial h-10 sm:h-9 text-sm"
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