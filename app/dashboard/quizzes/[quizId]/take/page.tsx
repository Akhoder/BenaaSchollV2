'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { fetchQuizBundle, startQuizAttempt, saveQuizAnswer, submitQuizAttempt, supabase, fetchAnswersForAttempt, updateAttemptScore, gradeAnswersBulk } from '@/lib/supabase';
import { toast } from 'sonner';
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
import { AlertTriangle } from 'lucide-react';


export default function TakeQuizPage() {
  const params = useParams();
  const search = useSearchParams();
  const quizId = params?.quizId as string;
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  const [bundle, setBundle] = useState<any | null>(null);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [readOnly, setReadOnly] = useState(false);
  const [redirectParams, setRedirectParams] = useState<{ classId?: string; subjectId?: string }>({});
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
  }, [authLoading, profile, quizId]);

  useEffect(() => {
    if (bundle?.quiz?.time_limit_minutes && timeLeft !== null) {
      if (timeLeft <= 0) {
        onSubmit(true);
      }
      if (timeLeft === 60) {
        toast.message('One minute remaining');
      }
    }
  }, [timeLeft]);

  const load = async () => {
    try {
      setLoading(true);
      const { quiz, questions, optionsByQuestion } = await fetchQuizBundle(quizId);
      if (!quiz) { toast.error('Quiz not found'); router.push('/dashboard'); return; }
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
        toast.error('Quiz is not available currently');
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
        toast.error('No attempts remaining');
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
        if (error || !created) { toast.error('Failed to start attempt'); return; }
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

  const answerQuestion = async (q: any, val: any) => {
    try {
      if (readOnly) return;
      setSaving(true);
      await saveQuizAnswer(attempt!.id, q.id, val);
      setAnswers(prev => ({ ...prev, [q.id]: val }));
    } finally {
      setSaving(false);
    }
  };

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
      const { error } = await submitQuizAttempt(attempt!.id, duration);
      if (error) { toast.error('Submit failed'); return; }

      // Auto-grade auto-gradable questions
      const { quiz, questions, optionsByQuestion } = bundle!;
      const { data: ansRows } = await fetchAnswersForAttempt(attempt!.id);
      const toGrade: Array<{ id: string; is_correct: boolean; points_awarded: number }> = [];
      let total = 0;
      (ansRows || []).forEach((row: any) => {
        const q = (questions as any[]).find((x: any) => x.id === row.question_id);
        if (!q) return;
        const points = Number(q.points || 1);
        
        // MCQ Single Choice
        if (q.type === 'mcq_single') {
          const selected = (row.answer_payload?.selected_option_ids || [])[0];
          const opts = optionsByQuestion.get(q.id) || [];
          const correctOpt = opts.find((o: any) => o.is_correct);
          const correct = !!selected && correctOpt && selected === correctOpt.id;
          toGrade.push({ id: row.id, is_correct: correct, points_awarded: correct ? points : 0 });
          if (correct) total += points;
        }
        // MCQ Multiple Choice
        else if (q.type === 'mcq_multi') {
          const selected: string[] = row.answer_payload?.selected_option_ids || [];
          const opts = optionsByQuestion.get(q.id) || [];
          const correctIds = opts.filter((o: any) => o.is_correct).map((o: any) => o.id).sort();
          const selSorted = [...selected].sort();
          const correct = JSON.stringify(correctIds) === JSON.stringify(selSorted);
          toGrade.push({ id: row.id, is_correct: correct, points_awarded: correct ? points : 0 });
          if (correct) total += points;
        }
        // True/False
        else if (q.type === 'true_false') {
          const provided = row.answer_payload?.bool;
          const opts = optionsByQuestion.get(q.id) || [];
          const correctOpt = opts.find((o: any) => o.is_correct);
          const correctVal = correctOpt ? correctOpt.text === 'True' || correctOpt.text === 'true' || correctOpt.text === 'T' : undefined;
          const correct = typeof provided === 'boolean' && typeof correctVal === 'boolean' && provided === correctVal;
          toGrade.push({ id: row.id, is_correct: correct, points_awarded: correct ? points : 0 });
          if (correct) total += points;
        }
        // Numeric
        else if (q.type === 'numeric') {
          const provided = row.answer_payload?.number;
          const opts = optionsByQuestion.get(q.id) || [];
          const correctOpt = opts.find((o: any) => o.is_correct);
          const correctVal = correctOpt ? Number(correctOpt.text) : undefined;
          const tol = q.media_url ? Number(q.media_url) : 0;
          const correct = typeof provided === 'number' && typeof correctVal === 'number' && Math.abs(provided - correctVal) <= tol;
          toGrade.push({ id: row.id, is_correct: correct, points_awarded: correct ? points : 0 });
          if (correct) total += points;
        }
        // Note: short_text, ordering, matching require manual grading
      });
      if (toGrade.length > 0) {
        await gradeAnswersBulk(toGrade);
      }
      await updateAttemptScore(attempt!.id, total);

      toast.success(auto ? 'Auto-submitted' : 'Submitted');
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
      toast.error('Submit failed');
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-xl md:text-2xl">{quiz.title}</CardTitle>
                <div className="mt-2">
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${bundle.questions.length ? Math.round((answeredCount / bundle.questions.length) * 100) : 0}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{answeredCount}/{bundle.questions.length} answered</div>
                  <div className="mt-1 text-xs text-muted-foreground">Attempts: {Math.min(attemptsUsed, attemptsAllowed)}/{attemptsAllowed}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {quiz.time_limit_minutes && timeLeft !== null && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-3 py-1 rounded-full">{Math.max(0, timeLeft || 0)}s</Badge>
                )}
                {!readOnly && (
                  <Button onClick={handleSubmitClick} disabled={submitting || readOnly}>
                    {submitting ? 'Submitting...' : 'Submit'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!readOnly && attemptsAllowed > 1 && (
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 text-xs">
                You can submit up to {attemptsAllowed} attempt(s). Current attempts used: {attemptsUsed}.
              </div>
            )}
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions.</p>
            ) : (
              questions.map((q, idx) => {
                const opts = optionsByQuestion.get(q.id) || [];
                const ans = answers[q.id];
                const selectedOptionIds: string[] = ans?.selected_option_ids || [];
                const boolVal: boolean | undefined = ans?.bool;
                const textVal: string | undefined = ans?.text;
                const numVal: number | undefined = ans?.number;
                return (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                    <div className="mb-3 font-semibold text-[hsl(var(--foreground))]">{idx + 1}. {q.text}</div>
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
                        <textarea className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent" rows={3} disabled={readOnly} value={textVal || ''} onChange={(e) => answerQuestion(q, { text: e.target.value })} />
                      </div>
                    )}
                    {q.type === 'true_false' && (
                      <div className="grid gap-2 grid-cols-2 max-w-sm">
                        {[{ id: 'T', text: 'True', val: true }, { id: 'F', text: 'False', val: false }].map((o: any) => (
                          <label key={o.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${boolVal === o.val ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                            <input className="sr-only" type="radio" name={`q_${q.id}`} disabled={readOnly} checked={boolVal === o.val} onChange={() => answerQuestion(q, { bool: o.val })} />
                            <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${boolVal === o.val ? 'border-blue-600' : 'border-slate-400'}`}> {boolVal === o.val && <span className="h-2 w-2 bg-blue-600 rounded-full" />} </span>
                            <span className="text-sm">{o.text}</span>
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Submit Quiz
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to submit this quiz? You cannot change your answers after submitting.
                {bundle && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      Progress: {answeredCount} of {(bundle.questions as any[]).length} questions answered
                    </p>
                    {(bundle.questions as any[]).length - answeredCount > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        {(bundle.questions as any[]).length - answeredCount} questions remain unanswered
                      </p>
                    )}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onSubmit(false)} className="bg-blue-600 hover:bg-blue-700">
                Submit Quiz
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
