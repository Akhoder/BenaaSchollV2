'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthCheck } from '@/hooks/useAuthCheck';
import { usePagination } from '@/hooks/usePagination';
import { filterBySearch } from '@/lib/tableUtils';
import { getErrorMessage } from '@/lib/errorHandler';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'subject' | 'lesson'>('all');
  
  // Confirmation dialogs
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuizForAction, setSelectedQuizForAction] = useState<any | null>(null);

  // Load quizzes and subjects
  const loadData = useCallback(async () => {
    if (!isAuthorized) return;
    
    try {
      setLoading(true);
      const { data, error } = await fetchStaffQuizzes();
      if (error) {
        console.error('Error fetching quizzes:', error);
        toast.error(getErrorMessage(error));
        return;
      }
      setQuizzes(data || []);

      // Load subjects for filter
      const { data: subs } = await supabase
        .from('class_subjects')
        .select('id, subject_name')
        .order('subject_name');
      setSubjects(subs || []);
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

  // Filter quizzes
  const filteredQuizzes = useMemo(() => {
    let filtered = quizzes;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filterBySearch(filtered, searchQuery, (quiz) => [
        quiz.title || '',
        quiz.description || '',
        quiz.subject?.subject_name || '',
        quiz.lesson?.title || '',
      ]);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((q) => {
        const active = !q.end_at || new Date(q.end_at) > new Date();
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
        if (typeFilter === 'subject') return q.subject_id && !q.lesson_id;
        if (typeFilter === 'lesson') return q.lesson_id;
        return true;
      });
    }

    return filtered;
  }, [quizzes, searchQuery, statusFilter, subjectFilter, typeFilter]);

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
      toast.success('CSV exported successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  }, []);

  // Publish quiz
  const publish = useCallback(async (quiz: any) => {
    try {
      setPublishing(quiz.id);
      if (quiz.subject_id) {
        const { data: students, error } = await fetchEnrolledStudentsForSubject(quiz.subject_id);
        if (error) {
          toast.error(getErrorMessage(error));
          return;
        }
        let successCount = 0;
        let errorCount = 0;
        for (const s of (students || [])) {
          const { error: notifError } = await createNotification({
            recipient_id: s.id,
            title: `New quiz: ${quiz.title}`,
            body: quiz.description || 'A new quiz is available.',
            link_url: `/dashboard/quizzes/${quiz.id}/take`,
          });
          if (notifError) {
            console.error('Error creating notification:', notifError);
            errorCount++;
          } else {
            successCount++;
          }
        }
        if (errorCount > 0) {
          toast.error(`Failed to send ${errorCount} notification(s). You may not have permission to create notifications.`);
        } else {
          toast.success(`Published notifications to ${successCount} students`);
        }
      } else {
        toast.error('Quiz must be linked to a subject to publish');
      }
    } catch (err) {
      console.error('Error publishing quiz:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setPublishing(null);
    }
  }, []);

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
      toast.success('Quiz closed successfully');
      setCloseDialogOpen(false);
      setSelectedQuizForAction(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [selectedQuizForAction, loadData]);

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
      toast.success('Quiz opened successfully');
      setOpenDialogOpen(false);
      setSelectedQuizForAction(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [selectedQuizForAction, loadData]);

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
      toast.success('Quiz deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedQuizForAction(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [selectedQuizForAction, loadData]);

  // Notify results
  const notifyResults = useCallback(async (quiz: any) => {
    try {
      setNotifying(quiz.id);
      const isAfterClose = quiz.show_results_policy === 'after_close';
      const ended = quiz.end_at && new Date(quiz.end_at) < new Date();
      if (!isAfterClose || !ended) {
        toast.error('Results not available yet');
        return;
      }
      if (quiz.subject_id) {
        const { data: students, error } = await fetchEnrolledStudentsForSubject(quiz.subject_id);
        if (error) {
          toast.error(getErrorMessage(error));
          return;
        }
        let successCount = 0;
        let errorCount = 0;
        for (const s of (students || [])) {
          const { error: notifError } = await createNotification({
            recipient_id: s.id,
            title: `Results available: ${quiz.title}`,
            body: 'Quiz results are now available.',
            link_url: `/dashboard/quizzes/${quiz.id}/result`,
          });
          if (notifError) {
            console.error('Error creating notification:', notifError);
            errorCount++;
          } else {
            successCount++;
          }
        }
        if (errorCount > 0) {
          toast.error(`Failed to send ${errorCount} notification(s). You may not have permission to create notifications.`);
        } else {
          toast.success(`Results notifications sent to ${successCount} students`);
        }
      } else {
        toast.error('Quiz must be linked to a subject');
      }
    } catch (err) {
      console.error('Error notifying results:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setNotifying(null);
    }
  }, []);

  // Stats
  const stats = useMemo(() => {
    const openCount = quizzes.filter((q) => !q.end_at || new Date(q.end_at) > new Date()).length;
    const subjectCount = quizzes.filter((q) => q.subject_id && !q.lesson_id).length;
    const lessonCount = quizzes.filter((q) => q.lesson_id).length;
    return {
      total: quizzes.length,
      open: openCount,
      closed: quizzes.length - openCount,
      subject: subjectCount,
      lesson: lessonCount,
    };
  }, [quizzes]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading quizzes...</p>
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
          title="Quizzes Management"
          description="Manage and track all quizzes in the system"
          gradient="from-purple-600 via-blue-600 to-purple-700"
        >
          <Button
            onClick={() => router.push('/dashboard/quizzes/new')}
            className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-lg"
          >
            <FileText className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Total Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Open
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.open}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Closed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-slate-600">{stats.closed}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Subject Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-blue-600">{stats.subject}</div>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Lesson Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-purple-600">{stats.lesson}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-gradient">
              <Search className="h-5 w-5 text-slate-500" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-modern"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="subject">Subject Only</SelectItem>
                  <SelectItem value="lesson">Lesson Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quizzes List */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="font-display text-gradient">
              Quizzes ({filteredQuizzes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredQuizzes.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <FileText className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">No Quizzes Found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {searchQuery || statusFilter !== 'ALL' || subjectFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No quizzes have been created yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedQuizzes.map((quiz: any) => {
                  const active = !quiz.end_at || new Date(quiz.end_at) > new Date();
                  const isSubjectQuiz = quiz.subject_id && !quiz.lesson_id;
                  const isLessonQuiz = quiz.lesson_id;

                  return (
                    <div
                      key={quiz.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{quiz.title}</h3>
                            <Badge
                              className={
                                active
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }
                            >
                              {active ? 'Open' : 'Closed'}
                            </Badge>
                            {isSubjectQuiz && (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                <BookOpen className="h-3 w-3 mr-1" />
                                Subject
                              </Badge>
                            )}
                            {isLessonQuiz && (
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                Lesson
                              </Badge>
                            )}
                          </div>

                          {quiz.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                              {quiz.description}
                            </p>
                          )}

                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            {quiz.subject && (
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">
                                  <strong>Subject:</strong> {quiz.subject.subject_name}
                                </span>
                              </div>
                            )}
                            {quiz.lesson && (
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">
                                  <strong>Lesson:</strong> {quiz.lesson.title}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-400">
                                <strong>Attempts:</strong> {quiz.attempts_allowed || 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-400">
                                <strong>Created:</strong> {formatDateTime(quiz.created_at)}
                              </span>
                            </div>
                          </div>

                          {(quiz.start_at || quiz.end_at) && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {quiz.start_at ? formatDateTime(quiz.start_at) : '—'} →{' '}
                                {quiz.end_at ? formatDateTime(quiz.end_at) : '—'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/edit`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/quizzes/${quiz.id}/grade`)}
                          >
                            <Award className="h-4 w-4 mr-1" />
                            Grade
                          </Button>
                          {active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCloseQuizClick(quiz)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Close
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenQuizClick(quiz)}
                              className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Open
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportCSV(quiz.id)}
                            disabled={downloading === quiz.id}
                          >
                            {downloading === quiz.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-1" />
                            )}
                            Export
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => publish(quiz)}
                            disabled={publishing === quiz.id}
                          >
                            {publishing === quiz.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-1" />
                            )}
                            Publish
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => notifyResults(quiz)}
                            disabled={notifying === quiz.id}
                          >
                            {notifying === quiz.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-1" />
                            )}
                            Notify
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteQuizClick(quiz)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {filteredQuizzes.length > 10 && (
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredQuizzes.length)} of{' '}
                    {filteredQuizzes.length} quizzes
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
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
                Close Quiz
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to close this quiz? The end time will be set to the current time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {selectedQuizForAction && (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="font-semibold text-sm">{selectedQuizForAction.title}</p>
                {selectedQuizForAction.subject && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Subject: {selectedQuizForAction.subject.subject_name}
                  </p>
                )}
                {selectedQuizForAction.lesson && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Lesson: {selectedQuizForAction.lesson.title}
                  </p>
                )}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedQuizForAction(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={closeNow} className="bg-amber-600 hover:bg-amber-700">
                Close Quiz
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
                Open Quiz
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reopen this quiz? The end time will be removed, making the quiz available again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {selectedQuizForAction && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-200">{selectedQuizForAction.title}</p>
                {selectedQuizForAction.subject && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Subject: {selectedQuizForAction.subject.subject_name}
                  </p>
                )}
                {selectedQuizForAction.lesson && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Lesson: {selectedQuizForAction.lesson.title}
                  </p>
                )}
                {selectedQuizForAction.end_at && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Current end time: {formatDateTime(selectedQuizForAction.end_at)}
                  </p>
                )}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedQuizForAction(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={openNow} className="bg-emerald-600 hover:bg-emerald-700">
                Open Quiz
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
                Delete Quiz
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this quiz? This action cannot be undone. All quiz data, questions, options, and attempts will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {selectedQuizForAction && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-semibold text-sm text-red-900 dark:text-red-200">{selectedQuizForAction.title}</p>
                {selectedQuizForAction.subject && (
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Subject: {selectedQuizForAction.subject.subject_name}
                  </p>
                )}
                {selectedQuizForAction.lesson && (
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Lesson: {selectedQuizForAction.lesson.title}
                  </p>
                )}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedQuizForAction(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={removeQuiz} className="bg-red-600 hover:bg-red-700">
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}