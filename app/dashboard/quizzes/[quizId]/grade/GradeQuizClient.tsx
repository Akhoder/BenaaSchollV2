'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { SimplePageLoading } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { supabase, fetchQuizBundle, fetchAttemptsWithAnswers, updateAnswerGrade, recalcAttemptScore, updateAnswerPayload, updateAttemptScore } from '@/lib/supabase';
import {
  Search,
  Award,
  Users,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  BarChart3,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';

// Client component - generateStaticParams handled in page.tsx
export const dynamicParams = true;

export default function GradeQuizClient() {
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const quizId = params?.quizId as string;

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Map<string, any[]>>(new Map());
  const [attempts, setAttempts] = useState<any[]>([]);
  const [answersByAttempt, setAnswersByAttempt] = useState<Map<string, any[]>>(new Map());
  const [studentMap, setStudentMap] = useState<Record<string, { full_name?: string; email?: string }>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'in_progress' | 'submitted' | 'graded'>('ALL');

  useEffect(() => {
    if (!authLoading) {
      if (!profile || !['admin','teacher','supervisor'].includes(profile.role)) { router.push('/dashboard'); return; }
      load().catch(() => {});
    }
  }, [authLoading, profile, quizId]);

  const load = async () => {
    try {
      setLoading(true);
      const { quiz, questions, optionsByQuestion } = await fetchQuizBundle(quizId);
      setQuiz(quiz); setQuestions(questions || []); setOptionsByQ(optionsByQuestion as any);
      const { attempts, answersByAttempt } = await fetchAttemptsWithAnswers(quizId);
      setAttempts(attempts); setAnswersByAttempt(answersByAttempt as any);
      const ids = Array.from(new Set((attempts || []).map((a: any) => a.student_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
        const map: Record<string, any> = {}; (profs || []).forEach((p: any) => { map[p.id] = { full_name: p.full_name, email: p.email }; });
        setStudentMap(map);
      } else {
        setStudentMap({});
      }
    } finally {
      setLoading(false);
    }
  };

  const studentName = async (id: string) => {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', id).single();
    return data?.full_name || id;
  };

  const gradeShortText = async (answerId: string, points: number, maxPoints?: number) => {
    // Validate points (should be >= 0 and not NaN, and not exceed maxPoints if provided)
    let validPoints = isNaN(points) || points < 0 ? 0 : points;
    if (maxPoints !== undefined && validPoints > maxPoints) {
      validPoints = maxPoints;
    }
    const ok = await updateAnswerGrade(answerId, null, validPoints);
    if ((ok as any).error) { 
      toast.error(language === 'ar' ? 'فشل التصحيح' : language === 'fr' ? 'Échec de la notation' : 'Failed to grade'); 
      return; 
    }
    
    // Find the attempt that contains this answer
    let attemptId: string | null = null;
    for (const att of attempts) {
      const answers = answersByAttempt.get(att.id) || [];
      if (answers.some((a: any) => a.id === answerId)) {
        attemptId = att.id;
        break;
      }
    }
    
    // Recalculate attempt score after grading
    if (attemptId) {
      await recalcAttemptScore(attemptId);
    }
    
    toast.success(language === 'ar' ? 'تم تصحيح الإجابة' : language === 'fr' ? 'Réponse notée' : 'Answer graded');
    await load(); // Refresh data
  };

  const finalizeAttempt = async (attemptId: string) => {
    try {
      // Step 1: Ensure all answers have points_awarded set (even if 0)
      const answers = answersByAttempt.get(attemptId) || [];
      const answersToSet: Array<{ id: string; points: number }> = [];
      
      for (const ans of answers) {
        if (ans.points_awarded === null || ans.points_awarded === undefined) {
          // For auto-graded questions, check is_correct
          const q = questions.find((q: any) => q.id === ans.question_id);
          if (q && ['mcq_single', 'mcq_multi', 'true_false', 'numeric'].includes(q.type)) {
            const questionPoints = Number(q.points) || 1;
            const points = ans.is_correct === true ? questionPoints : 0;
            answersToSet.push({ id: ans.id, points });
          } else {
            // For manual grading questions, set to 0
            answersToSet.push({ id: ans.id, points: 0 });
          }
        }
      }
      
      // Set points for answers that need it
      if (answersToSet.length > 0) {
        await Promise.all(answersToSet.map(async ({ id, points }) => {
          try {
            await updateAnswerGrade(id, null, points);
          } catch (err) {
            console.warn(`Failed to set points for answer ${id}:`, err);
          }
        }));
      }
      
      // Step 2: Recalculate score (this will fix any inconsistencies and update status)
      const { error, data } = await recalcAttemptScore(attemptId);
      
      // Step 3: Verify status was updated
      const { data: verifyAttempt } = await supabase
        .from('quiz_attempts')
        .select('status, score')
        .eq('id', attemptId)
        .single();
      
      if (verifyAttempt) {
        if (verifyAttempt.status !== 'graded') {
          // Force update status
          console.log('Forcing status update to graded in finalizeAttempt');
          await supabase
            .from('quiz_attempts')
            .update({ status: 'graded' })
            .eq('id', attemptId);
        }
        
        // Show success message
        if (error) {
          toast.warning(language === 'ar' ? 'تم إنهاء المحاولة مع تحذير' : language === 'fr' ? 'Tentative finalisée avec avertissement' : 'Attempt finalized with warning');
        } else {
          toast.success(language === 'ar' ? 'تم إنهاء المحاولة بنجاح' : language === 'fr' ? 'Tentative finalisée avec succès' : 'Attempt finalized successfully');
        }
      } else {
        // If we can't verify, still try to update status
        await supabase
          .from('quiz_attempts')
          .update({ status: 'graded' })
          .eq('id', attemptId);
        toast.warning(language === 'ar' ? 'تم إنهاء المحاولة' : language === 'fr' ? 'Tentative finalisée' : 'Attempt finalized');
      }
      
      await load();
    } catch (err: any) {
      console.error('Finalize error:', err);
      toast.error(language === 'ar' ? `فشل الإنهاء: ${err.message || 'خطأ غير معروف'}` : language === 'fr' ? `Échec de la finalisation: ${err.message || 'Erreur inconnue'}` : `Failed to finalize: ${err.message || 'Unknown error'}`);
    }
  };

  // Calculate filtered attempts (must be before early return to follow Rules of Hooks)
  const filteredAttempts = useMemo(() => {
    return attempts.filter((att) => {
      const s = (studentMap[att.student_id]?.full_name || '') + ' ' + (studentMap[att.student_id]?.email || '');
      const matchText = !search || s.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === 'ALL' || att.status === status;
      return matchText && matchStatus;
    });
  }, [attempts, studentMap, search, status]);

  // Calculate stats (must be before early return to follow Rules of Hooks)
  const stats = useMemo(() => {
    const done = attempts.filter((a: any) => a.status === 'submitted' || a.status === 'graded');
    const scores = done.map((a: any) => Number(a.score) || 0).sort((a, b) => a - b);
    const n = scores.length;
    const avg = n ? (scores.reduce((s, v) => s + v, 0) / n) : 0;
    const median = n ? (n % 2 ? scores[(n - 1) / 2] : (scores[n / 2 - 1] + scores[n / 2]) / 2) : 0;
    const variance = n ? scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n : 0;
    const stddev = Math.sqrt(variance);
    const completion = attempts.length ? Math.round((done.length / attempts.length) * 100) : 0;
    return { avg, median, stddev, completed: done.length, completion, total: attempts.length };
  }, [attempts]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <SimplePageLoading text={t('loading' as TranslationKey)} />
      </DashboardLayout>
    );
  }

  if (!profile || !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">{t('unauthorized' as TranslationKey)}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Page Header */}
        <PageHeader
          icon={Award}
          title={t('gradeAction' as TranslationKey)}
          description={quiz?.title || t('gradeAction' as TranslationKey)}
          gradient="from-primary to-accent"
        >
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/quizzes')}
            className="w-full sm:w-auto border-primary/30 hover:bg-primary/5 hover:border-primary/50 text-sm sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
            {t('back' as TranslationKey)}
          </Button>
        </PageHeader>

        {/* Filters */}
        <Card className="glass-card border-primary/10">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 font-display text-foreground text-base sm:text-lg">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              {t('filtersAndSearch' as TranslationKey)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('searchStudentsPlaceholder' as TranslationKey)}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rtl:pl-3 rtl:pr-10 input-modern border-primary/20 focus:border-primary h-10 sm:h-11"
                />
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-10 sm:h-11">
                  <SelectValue placeholder={t('status' as TranslationKey)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allStatus' as TranslationKey)}</SelectItem>
                  <SelectItem value="in_progress">{t('statusInProgress' as TranslationKey)}</SelectItem>
                  <SelectItem value="submitted">{t('submitted' as TranslationKey)}</SelectItem>
                  <SelectItem value="graded">{t('graded' as TranslationKey)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Horizontal Scroll on Mobile */}
        <div className="flex overflow-x-auto pb-3 sm:pb-4 gap-2.5 sm:gap-3 md:gap-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0 -mx-2 sm:-mx-3 md:mx-0 px-2 sm:px-3 md:px-0 scrollbar-none animate-fade-in-up">
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-primary/10 hover:border-primary/30 transition-all duration-300 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-primary to-accent rounded-full mb-2 sm:mb-2.5 md:mb-3 shadow-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{stats.avg.toFixed(1)}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('averageGrade' as TranslationKey)}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-info/10 hover:border-info/30 transition-all duration-300 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-info to-accent rounded-full mb-2 sm:mb-2.5 md:mb-3 shadow-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{stats.median.toFixed(1)}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{language === 'ar' ? 'الوسيط' : language === 'fr' ? 'Médiane' : 'Median'}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-warning/10 hover:border-warning/30 transition-all duration-300 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-warning to-warning/80 rounded-full mb-2 sm:mb-2.5 md:mb-3 shadow-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{stats.stddev.toFixed(1)}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{language === 'ar' ? 'الانحراف' : language === 'fr' ? 'Écart-type' : 'Std Dev'}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-success/10 hover:border-success/30 transition-all duration-300 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-success to-primary rounded-full mb-2 sm:mb-2.5 md:mb-3 shadow-lg">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{stats.completed}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('completed' as TranslationKey)}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-accent/10 hover:border-accent/30 transition-all duration-300 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-accent to-primary rounded-full mb-2 sm:mb-2.5 md:mb-3 shadow-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-1">{stats.completion}%</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('completionRate' as TranslationKey)}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Attempts List */}
        <Card className="glass-card border-primary/10">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <CardTitle className="font-display text-foreground flex items-center gap-2 text-base sm:text-lg">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                {t('attempts' as TranslationKey)}
                <Badge variant="gold" className="text-xs sm:text-sm">{filteredAttempts.length}</Badge>
              </CardTitle>
              <Badge variant="outline" className="text-xs sm:text-sm border-primary/30 text-muted-foreground w-full sm:w-auto text-center sm:text-left">
                {t('total' as TranslationKey)}: {stats.total}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">

            {filteredAttempts.length === 0 ? (
              <div className="text-center py-8 sm:py-12 animate-fade-in">
                <div className="relative inline-block mb-3 sm:mb-4">
                  <div className="p-4 sm:p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full">
                    <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-primary/50 animate-float" />
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground font-display mb-1.5 sm:mb-2">
                  {attempts.length === 0 
                    ? (language === 'ar' ? 'لا توجد محاولات بعد' : language === 'fr' ? 'Aucune tentative pour le moment' : 'No attempts yet')
                    : (t('noQuizzesFound' as TranslationKey))}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-sans px-4">
                  {attempts.length === 0
                    ? (language === 'ar' ? 'لم يقم الطلاب بمحاولة هذا الاختبار بعد' : language === 'fr' ? 'Les étudiants n\'ont pas encore tenté ce quiz.' : 'Students have not attempted this quiz yet.')
                    : (t('tryAdjustingFilters' as TranslationKey))}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAttempts.map((att) => {
                  const answers = answersByAttempt.get(att.id) || [];
                  const student = studentMap[att.student_id];
                  const statusVariant = att.status === 'graded' ? 'success' : att.status === 'submitted' ? 'warning' : 'outline';
                  
                  return (
                    <Card key={att.id} className="glass-card-hover border-primary/10 hover:border-primary/30 transition-all duration-300">
                      <CardHeader className="pb-3 sm:pb-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2">
                              <div className="p-2 sm:p-2.5 bg-gradient-to-br from-primary to-accent rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-base sm:text-lg text-foreground mb-1 break-words">
                                  {student?.full_name || att.student_id}
                                </h3>
                                {student?.email && (
                                  <p className="text-xs sm:text-sm text-muted-foreground break-all">{student.email}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-14">
                              <Badge variant={statusVariant} className="text-xs sm:text-sm">
                                {att.status === 'graded' ? t('graded' as TranslationKey) :
                                 att.status === 'submitted' ? t('submitted' as TranslationKey) :
                                 t('statusInProgress' as TranslationKey)}
                              </Badge>
                              <Badge variant="gold" className="text-xs sm:text-sm">
                                <Award className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                {t('scoreLabel' as TranslationKey)}: {att.score ?? 0}
                              </Badge>
                              {att.submitted_at && (
                                <Badge variant="outline" className="text-xs sm:text-sm">
                                  <Clock className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                  {new Date(att.submitted_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => finalizeAttempt(att.id)}
                            className="w-full sm:w-auto h-10 sm:h-9 text-sm"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {language === 'ar' ? 'إنهاء' : language === 'fr' ? 'Finaliser' : 'Finalize'}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3 sm:space-y-4">
                        {questions.map((q, idx) => {
                          const ans = answers.find((a: any) => a.question_id === q.id);
                          const opts = optionsByQ.get(q.id) || [];
                          const isAutoGraded = ['mcq_single', 'mcq_multi', 'true_false', 'numeric'].includes(q.type);
                          const questionPoints = Number(q.points) || 1;
                          
                          // Calculate points_awarded: prefer actual value, but use is_correct if needed
                          let pointsAwarded: number | null = null;
                          if (ans) {
                            // First, check if points_awarded is set and valid
                            if (ans.points_awarded !== null && ans.points_awarded !== undefined) {
                              const points = Number(ans.points_awarded);
                              if (!isNaN(points) && points >= 0) {
                                pointsAwarded = points;
                              }
                            }
                            
                            // If points_awarded is 0 or null/undefined, check is_correct
                            if (pointsAwarded === null || pointsAwarded === 0) {
                              if (ans.is_correct === true) {
                                // If correct, use question points
                                pointsAwarded = questionPoints;
                              } else if (ans.is_correct === false) {
                                // If wrong, use 0
                                pointsAwarded = 0;
                              } else if (isAutoGraded) {
                                // For auto-graded questions, default to 0 if is_correct is null
                                pointsAwarded = 0;
                              }
                            } else if (ans.is_correct === true && pointsAwarded === 0) {
                              // Inconsistency: is_correct is true but points_awarded is 0
                              // Use question points
                              pointsAwarded = questionPoints;
                            } else if (ans.is_correct === false && pointsAwarded > 0) {
                              // Inconsistency: is_correct is false but points_awarded > 0
                              // Use 0
                              pointsAwarded = 0;
                            }
                          }
                          
                          return (
                            <Card key={q.id} className="border-primary/10 bg-slate-50/50 dark:bg-slate-800/30">
                              <CardContent className="p-3 sm:p-4">
                                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs sm:text-sm text-primary">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm sm:text-base font-semibold text-foreground mb-1 break-words">{q.text}</h4>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                                        {q.type}
                                      </Badge>
                                      <span>{q.points || 1} {language === 'ar' ? 'نقطة' : language === 'fr' ? 'points' : 'pts'}</span>
                                      {pointsAwarded !== null && (
                                        <span className="font-medium text-foreground">
                                          • {language === 'ar' ? 'الممنوحة' : language === 'fr' ? 'Attribué' : 'Awarded'}: {pointsAwarded}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {q.type === 'short_text' && (
                                  <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                                    <div className="p-2.5 sm:p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                                      <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                                        {language === 'ar' ? 'الإجابة' : language === 'fr' ? 'Réponse' : 'Answer'}:
                                      </p>
                                      <p className="text-sm sm:text-base text-foreground break-words whitespace-pre-wrap">{ans?.answer_payload?.text || '-'}</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Input
                                          className="w-24 sm:w-28 h-9 sm:h-10"
                                          type="number"
                                          placeholder={language === 'ar' ? 'النقاط' : language === 'fr' ? 'points' : 'points'}
                                          min="0"
                                          max={q.points || 1}
                                          defaultValue={pointsAwarded ?? ''}
                                          onBlur={async (e) => {
                                            const v = Number(e.target.value || 0);
                                            await gradeShortText(ans?.id || '', v, questionPoints);
                                          }}
                                        />
                                        <span className="text-xs sm:text-sm text-muted-foreground">
                                          {language === 'ar' ? 'من' : language === 'fr' ? 'sur' : 'out of'} {q.points || 1}
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <Textarea
                                        className="w-full min-h-[80px] sm:min-h-[100px] text-sm"
                                        placeholder={language === 'ar' ? 'تعليق (اختياري)' : language === 'fr' ? 'Commentaire (optionnel)' : 'Comment (optional)'}
                                        defaultValue={ans?.answer_payload?.comment || ''}
                                        onBlur={async (e) => {
                                          await updateAnswerPayload(ans?.id || '', { comment: e.target.value });
                                          toast.success(language === 'ar' ? 'تم حفظ التعليق' : language === 'fr' ? 'Commentaire enregistré' : 'Comment saved');
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {q.type === 'numeric' && (
                                  <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                                    <div className="p-2.5 sm:p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                                      <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                                        {language === 'ar' ? 'الإجابة' : language === 'fr' ? 'Réponse' : 'Answer'}:
                                      </p>
                                      <p className="text-sm sm:text-base text-foreground font-mono">{ans?.answer_payload?.number ?? '-'}</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Input
                                          className="w-24 sm:w-28 h-9 sm:h-10"
                                          type="number"
                                          placeholder={language === 'ar' ? 'النقاط' : language === 'fr' ? 'points' : 'points'}
                                          min="0"
                                          max={q.points || 1}
                                          defaultValue={pointsAwarded ?? ''}
                                          onBlur={async (e) => {
                                            const v = Number(e.target.value || 0);
                                            await gradeShortText(ans?.id || '', v, questionPoints);
                                          }}
                                        />
                                        <span className="text-xs sm:text-sm text-muted-foreground">
                                          {language === 'ar' ? 'من' : language === 'fr' ? 'sur' : 'out of'} {q.points || 1}
                                        </span>
                                      </div>
                                    </div>
                                    {q.media_url && (
                                      <div className="text-xs sm:text-sm text-muted-foreground">
                                        {language === 'ar' ? 'التسامح' : language === 'fr' ? 'Tolérance' : 'Tolerance'}: ±{Number(q.media_url)}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {isAutoGraded && (
                                  <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-lg bg-info/10 border border-info/20">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-info flex-shrink-0" />
                                      <p className="text-xs sm:text-sm text-info font-medium">
                                        {language === 'ar' ? 'تم التصحيح تلقائياً' : language === 'fr' ? 'Noté automatiquement' : 'Auto-graded'}
                                        {pointsAwarded !== null && (
                                          <span className="ml-2 rtl:mr-2 rtl:ml-0">
                                            ({pointsAwarded} / {q.points || 1} {language === 'ar' ? 'نقطة' : language === 'fr' ? 'points' : 'pts'})
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

