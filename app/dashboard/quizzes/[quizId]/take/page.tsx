'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import { fetchQuizBundleForTaking, supabase, startQuizAttempt, saveQuizAnswer } from '@/lib/supabase';

export const dynamic = 'force-static';


export default function TakeQuizPage() {
  const params = useParams();
  const search = useSearchParams();
  const quizId = params?.quizId as string;
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  const [bundle, setBundle] = useState<any | null>(null);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [readOnly, setReadOnly] = useState(false);
  const [redirectParams, setRedirectParams] = useState<{ classId?: string; subjectId?: string }>({});
  // Debounce timers for saving answers (especially for short_text)
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const answeredCount = useMemo(() => {
    if (!bundle) return 0;
    return (bundle.questions as any[]).reduce((acc, q) => acc + (answers[q.id] ? 1 : 0), 0);
  }, [bundle, answers]);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [attemptsAllowed, setAttemptsAllowed] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!profile) { router.push('/login'); return; }
      load().catch(() => {});
    }
    
    // Cleanup: clear all save timers on unmount
    return () => {
      Object.values(saveTimersRef.current).forEach(timer => clearTimeout(timer));
      saveTimersRef.current = {};
    };
  }, [authLoading, profile, quizId]);

  useEffect(() => {
    if (bundle?.quiz?.time_limit_minutes && timeLeft !== null) {
      if (timeLeft <= 0) {
        onSubmit(true);
      }
      if (timeLeft === 60) {
        toast.message(language === 'ar' ? 'بقي دقيقة واحدة' : 'One minute remaining');
      }
    }
  }, [timeLeft]);

  const load = async () => {
    try {
      setLoading(true);
      const { quiz, questions, optionsByQuestion } = await fetchQuizBundleForTaking(quizId);
      if (!quiz) { toast.error(t('noQuizzesFound' as TranslationKey)); router.push('/dashboard'); return; }
      setBundle({ quiz, questions, optionsByQuestion });

      // Derive redirect params if not provided
      const classIdQP = search.get('classId') || undefined;
      const subjectIdQP = search.get('subjectId') || (quiz.subject_id || undefined);
      let classIdResolved = classIdQP;
      if (!classIdResolved && quiz.subject_id) {
        const { data: subjRow } = await supabase
          .from('class_subjects')
          .select('id, class_id')
          .eq('id', quiz.subject_id)
          .single();
        classIdResolved = subjRow?.class_id;
      }
      setRedirectParams({ classId: classIdResolved, subjectId: subjectIdQP });

      // Enforce time window
      const now = new Date();
      const startsOk = !quiz.start_at || new Date(quiz.start_at) <= now;
      const endsOk = !quiz.end_at || new Date(quiz.end_at) >= now;
      if (!(startsOk && endsOk)) {
        toast.error(t('quizClosedSuccessfully' as TranslationKey));
        const backClass = classIdResolved; const backSub = subjectIdQP;
        if (backClass && backSub) router.push(`/dashboard/my-classes/${backClass}/subjects/${backSub}`); else router.push('/dashboard');
        return;
      }

      // Load attempts for this user
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('student_id', profile!.id)
        .order('started_at', { ascending: false });
      const latest = attempts && attempts[0];
      const attemptsCount = attempts?.length || 0;
      setAttemptsUsed(attemptsCount);
      setAttemptsAllowed(quiz.attempts_allowed || 1);

      const inProgress = (attempts || []).find((a: any) => a.status === 'in_progress');
      if (attemptsCount >= (quiz.attempts_allowed || 1) && !inProgress) {
        toast.error(language === 'ar' ? 'لا توجد محاولات متبقية' : 'No attempts remaining');
        const backClass = classIdResolved; const backSub = subjectIdQP;
        if (backClass && backSub) router.push(`/dashboard/my-classes/${backClass}/subjects/${backSub}`); else router.push('/dashboard');
        return;
      }

      // If already submitted/graded and no more attempts allowed -> read-only view of latest
      if (latest && latest.status !== 'in_progress' && attemptsCount >= (quiz.attempts_allowed || 1)) {
        setAttempt(latest);
        setReadOnly(true);
        const { data: saved } = await supabase
          .from('quiz_answers')
          .select('question_id, answer_payload')
          .eq('attempt_id', latest.id);
        const map: Record<string, any> = {};
        (saved || []).forEach((row: any) => { map[row.question_id] = row.answer_payload; });
        setAnswers(map);
        if (quiz.time_limit_minutes) setTimeLeft(null);
        return;
      }

      // Reuse in_progress attempt if exists, otherwise start if attempts remain
      let att = attempts?.find((a: any) => a.status === 'in_progress') || null;
      if (!att) {
        if (attemptsCount >= (quiz.attempts_allowed || 1)) {
          // No attempts left, show latest in read-only
          if (latest) {
            setAttempt(latest);
            setReadOnly(true);
            const { data: saved } = await supabase
              .from('quiz_answers')
              .select('question_id, answer_payload')
              .eq('attempt_id', latest.id);
            const map: Record<string, any> = {};
            (saved || []).forEach((row: any) => { map[row.question_id] = row.answer_payload; });
            setAnswers(map);
          }
          return;
        }
        const { data: created, error } = await startQuizAttempt(quizId);
        if (error || !created) { toast.error(t('unexpectedError' as TranslationKey)); return; }
        att = created;
      }
      setAttempt(att);

      // Load saved answers for this attempt
      const { data: saved } = await supabase
        .from('quiz_answers')
        .select('question_id, answer_payload')
        .eq('attempt_id', att.id);
      const map: Record<string, any> = {};
      (saved || []).forEach((row: any) => { map[row.question_id] = row.answer_payload; });
      setAnswers(map);

      if (quiz.time_limit_minutes) {
        setTimeLeft(quiz.time_limit_minutes * 60);
      }
    } finally {
      setLoading(false);
    }
  };

  // Save answer to database (called after debounce for text inputs)
  const saveAnswerToDB = useCallback(async (questionId: string, val: any) => {
    if (!attempt || readOnly) return;
    try {
      setSaving(true);
      await saveQuizAnswer(attempt.id, questionId, val);
    } catch (error) {
      console.error('Error saving answer:', error);
    } finally {
      setSaving(false);
    }
  }, [attempt, readOnly]);

  const answerQuestion = useCallback((q: any, val: any) => {
    if (readOnly) return;
    
    // Update local state immediately for smooth typing experience
    setAnswers(prev => ({ ...prev, [q.id]: val }));
    
    // For short_text questions, use debouncing to avoid saving on every keystroke
    if (q.type === 'short_text') {
      // Clear existing timer for this question
      if (saveTimersRef.current[q.id]) {
        clearTimeout(saveTimersRef.current[q.id]);
      }
      
      // Set new timer to save after user stops typing (500ms)
      saveTimersRef.current[q.id] = setTimeout(() => {
        saveAnswerToDB(q.id, val);
        delete saveTimersRef.current[q.id];
      }, 500);
    } else {
      // For other question types, save immediately
      saveAnswerToDB(q.id, val);
    }
  }, [readOnly, saveAnswerToDB]);

  const handleSubmitClick = () => {
    if (readOnly || submitting) return;
    setSubmitDialogOpen(true);
  };

  const onSubmit = async (auto?: boolean) => {
    try {
      if (submitting) return;
      setSubmitting(true);
      if (!auto) {
        setSubmitDialogOpen(false);
      }
      const duration = (bundle?.quiz?.time_limit_minutes ? (bundle.quiz.time_limit_minutes * 60 - (timeLeft || 0)) : undefined);

      // Submission + grading happen server-side: the browser never has the correct-answer data
      // (see fetchQuizBundleForTaking) and can't be trusted to grade or set its own score.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch('/api/quizzes/submit-attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ attemptId: attempt!.id, durationSeconds: duration }),
      });
      if (!res.ok) {
        console.error('Error submitting attempt:', await res.text().catch(() => ''));
        toast.error(t('unexpectedError' as TranslationKey));
        return;
      }

      toast.success(t('submitted' as TranslationKey));
      const policy = bundle?.quiz?.show_results_policy as 'immediate' | 'after_close' | 'never';
      const classId = search.get('classId') || redirectParams.classId;
      const subjectId = search.get('subjectId') || redirectParams.subjectId;
      if (policy === 'immediate') {
        router.push(`/dashboard/quizzes/${quizId}/result?classId=${classId || ''}&subjectId=${subjectId || ''}`);
      } else {
        if (classId && subjectId) {
          router.push(`/dashboard/my-classes/${classId}/subjects/${subjectId}`);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (e) {
      console.error(e);
      toast.error(t('unexpectedError' as TranslationKey));
    } finally {
      setSubmitting(false);
    }
  };

  // Periodic autosave of current answers (best-effort)
  useEffect(() => {
    if (!attempt || readOnly) return;
    const iv = setInterval(async () => {
      try {
        const qs: any[] = bundle?.questions || [];
        for (const q of qs) {
          const a = answers[q.id];
          if (!a) continue;
          await saveQuizAnswer(attempt.id, q.id, a);
        }
      } catch {}
    }, 12000);
    return () => clearInterval(iv);
  }, [attempt?.id, readOnly, answers, bundle]);

  if (authLoading || loading || !bundle) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><Skeleton className="h-12 w-12" /></div>
      </DashboardLayout>
    );
  }

  const quiz = bundle.quiz;
  const questions = bundle.questions as any[];
  const optionsByQuestion = bundle.optionsByQuestion as Map<string, any[]>;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="font-display text-lg sm:text-xl md:text-2xl break-words">{quiz.title}</CardTitle>
                <div className="mt-2 sm:mt-3 space-y-1.5">
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300" style={{ width: `${bundle.questions.length ? Math.round((answeredCount / bundle.questions.length) * 100) : 0}%` }} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{answeredCount}/{bundle.questions.length} {language === 'ar' ? 'تم الإجابة' : language === 'fr' ? 'répondu' : 'answered'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{t('attempts' as TranslationKey)}: {Math.min(attemptsUsed, attemptsAllowed)}/{attemptsAllowed}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {quiz.time_limit_minutes && timeLeft !== null && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                    {Math.floor(Math.max(0, timeLeft || 0) / 60)}:{(Math.max(0, timeLeft || 0) % 60).toString().padStart(2, '0')}
                  </Badge>
                )}
                {!readOnly && (
                  <Button onClick={handleSubmitClick} disabled={submitting || readOnly} className="w-full sm:w-auto text-sm sm:text-base">
                    {submitting ? (language === 'ar' ? 'جاري الإرسال...' : language === 'fr' ? 'Envoi...' : 'Submitting...') : t('submit' as TranslationKey)}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!readOnly && attemptsAllowed > 1 && (
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 text-xs rtl:text-right">
                {language === 'ar' 
                  ? `يمكنك الإرسال حتى ${attemptsAllowed} محاولة. المحاولات المستخدمة حالياً: ${attemptsUsed}.`
                  : language === 'fr'
                  ? `Vous pouvez soumettre jusqu'à ${attemptsAllowed} tentative(s). Tentatives utilisées actuellement : ${attemptsUsed}.`
                  : `You can submit up to ${attemptsAllowed} attempt(s). Current attempts used: ${attemptsUsed}.`}
              </div>
            )}
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground rtl:text-right">{t('noQuizzesFound' as TranslationKey)}</p>
            ) : (
              questions.map((q, idx) => {
                const opts = optionsByQuestion.get(q.id) || [];
                const ans = answers[q.id];
                const selectedOptionIds: string[] = ans?.selected_option_ids || [];
                const boolVal: boolean | undefined = ans?.bool;
                const textVal: string | undefined = ans?.text;
                const numVal: number | undefined = ans?.number;
                return (
                  <div key={q.id} className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                    <div className="mb-3 font-semibold text-sm sm:text-base text-[hsl(var(--foreground))] rtl:text-right">{idx + 1}. {q.text}</div>
                    {q.type === 'mcq_single' && (
                      <div className="grid gap-2">
                        {opts.map((o: any) => (
                          <label key={o.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedOptionIds.includes(o.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                            <input className="sr-only" type="radio" name={`q_${q.id}`} disabled={readOnly} checked={selectedOptionIds.includes(o.id)} onChange={() => answerQuestion(q, { selected_option_ids: [o.id] })} />
                            <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedOptionIds.includes(o.id) ? 'border-blue-600' : 'border-slate-400'}`}> {selectedOptionIds.includes(o.id) && <span className="h-2 w-2 bg-blue-600 rounded-full" />} </span>
                            <span className="text-sm">{o.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.type === 'mcq_multi' && (
                      <div className="grid gap-2">
                        {opts.map((o: any) => {
                          const selected = selectedOptionIds.includes(o.id);
                          const next = selected ? selectedOptionIds.filter((x) => x !== o.id) : [...selectedOptionIds, o.id];
                          return (
                            <label key={o.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                              <input className="sr-only" type="checkbox" disabled={readOnly} checked={selected} onChange={() => answerQuestion(q, { selected_option_ids: next })} />
                              <span className={`h-4 w-4 rounded border flex items-center justify-center ${selected ? 'border-blue-600 bg-blue-600' : 'border-slate-400'}`}> {selected && <span className="h-2 w-2 bg-white" />} </span>
                              <span className="text-sm">{o.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {q.type === 'numeric' && (
                      <div>
                        <input type="number" className="w-40 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent" disabled={readOnly} value={numVal ?? ''} onChange={(e) => answerQuestion(q, { number: e.target.value === '' ? null : Number(e.target.value) })} />
                      </div>
                    )}
                    {q.type === 'short_text' && (
                      <div>
                        <textarea 
                          className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" 
                          rows={3} 
                          readOnly={readOnly}
                          disabled={readOnly}
                          value={textVal || ''} 
                          onChange={(e) => answerQuestion(q, { text: e.target.value })} 
                          placeholder={language === 'ar' ? 'اكتب إجابتك هنا...' : language === 'fr' ? 'Écrivez votre réponse ici...' : 'Type your answer here...'}
                        />
                      </div>
                    )}
                    {q.type === 'true_false' && (
                      <div className="grid gap-2 grid-cols-2 max-w-xs sm:max-w-sm">
                        {[{ id: 'T', text: language === 'ar' ? 'صحيح' : language === 'fr' ? 'Vrai' : 'True', val: true }, { id: 'F', text: language === 'ar' ? 'خطأ' : language === 'fr' ? 'Faux' : 'False', val: false }].map((o: any) => (
                          <label key={o.id} className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-colors rtl:flex-row-reverse ${boolVal === o.val ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                            <input className="sr-only" type="radio" name={`q_${q.id}`} disabled={readOnly} checked={boolVal === o.val} onChange={() => answerQuestion(q, { bool: o.val })} />
                            <span className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${boolVal === o.val ? 'border-blue-600' : 'border-slate-400'}`}> {boolVal === o.val && <span className="h-2 w-2 bg-blue-600 rounded-full" />} </span>
                            <span className="text-sm sm:text-base rtl:text-right flex-1">{o.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            
          </CardContent>
        </Card>

        {/* Submit Quiz Confirmation Dialog */}
        <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
          <AlertDialogContent className="rtl:text-right">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                {language === 'ar' ? 'إرسال الاختبار' : language === 'fr' ? 'Soumettre le quiz' : 'Submit Quiz'}
              </AlertDialogTitle>
              <AlertDialogDescription className="rtl:text-right">
                {language === 'ar' 
                  ? 'هل أنت متأكد من إرسال هذا الاختبار؟ لا يمكنك تغيير إجاباتك بعد الإرسال.'
                  : language === 'fr'
                  ? 'Êtes-vous sûr de vouloir soumettre ce quiz ? Vous ne pourrez pas modifier vos réponses après la soumission.'
                  : 'Are you sure you want to submit this quiz? You cannot change your answers after submitting.'}
                {bundle && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 rtl:text-right">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {language === 'ar' 
                        ? `التقدم: ${answeredCount} من ${(bundle.questions as any[]).length} سؤال تم الإجابة عليه`
                        : language === 'fr'
                        ? `Progrès : ${answeredCount} sur ${(bundle.questions as any[]).length} questions répondues`
                        : `Progress: ${answeredCount} of ${(bundle.questions as any[]).length} questions answered`}
                    </p>
                    {(bundle.questions as any[]).length - answeredCount > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        {language === 'ar'
                          ? `${(bundle.questions as any[]).length - answeredCount} سؤال لم يتم الإجابة عليه`
                          : language === 'fr'
                          ? `${(bundle.questions as any[]).length - answeredCount} questions restent sans réponse`
                          : `${(bundle.questions as any[]).length - answeredCount} questions remain unanswered`}
                      </p>
                    )}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="rtl:flex-row-reverse">
              <AlertDialogCancel>{t('cancel' as TranslationKey)}</AlertDialogCancel>
              <AlertDialogAction onClick={() => onSubmit(false)} className="bg-blue-600 hover:bg-blue-700">
                {language === 'ar' ? 'إرسال الاختبار' : language === 'fr' ? 'Soumettre le quiz' : 'Submit Quiz'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
