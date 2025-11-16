'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase, fetchQuizBundle, fetchAnswersForAttempt } from '@/lib/supabase';


export default function QuizResultPage() {
  const params = useParams();
  const search = useSearchParams();
  const quizId = params?.quizId as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any | null>(null);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState<Map<string, any[]>>(new Map());
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { quiz, questions, optionsByQuestion } = await fetchQuizBundle(quizId);
        setQuiz(quiz);
        setQuestions(questions || []);
        setOptionsByQuestion(optionsByQuestion as any);
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quizId)
          .order('started_at', { ascending: false })
          .limit(1);
        const att = attempts && attempts[0] ? attempts[0] : null;
        setAttempt(att);
        if (att) {
          const { data: ansRows } = await fetchAnswersForAttempt(att.id);
          const map: Record<string, any> = {};
          (ansRows || []).forEach((r: any) => { map[r.question_id] = r; });
          setAnswers(map);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  const classId = search.get('classId');
  const subjectId = search.get('subjectId');
  const canShow = useMemo(() => quiz && (quiz.show_results_policy === 'immediate' || (quiz.show_results_policy === 'after_close' && quiz.end_at && new Date(quiz.end_at) < new Date())), [quiz]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><Skeleton className="h-12 w-12" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quiz Result</CardTitle>
              {attempt && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{attempt.score ?? 0}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!canShow ? (
              <p className="text-sm text-muted-foreground">Results will be available later.</p>
            ) : (
              <div className="space-y-3">
                {questions.map((q: any, idx: number) => {
                  const ansRow = answers[q.id];
                  const opts = optionsByQuestion.get(q.id) || [];
                  const selectedIds: string[] = ansRow?.answer_payload?.selected_option_ids || [];
                  const correctOpts = opts.filter((o: any) => o.is_correct);
                  const correctIds = correctOpts.map((o: any) => o.id);
                  const selectedTextSingle = opts.find((o: any) => o.id === selectedIds[0])?.text || '-';
                  const correctSingleText = correctOpts[0]?.text || '-';
                  const isCorrect = typeof ansRow?.is_correct === 'boolean' ? ansRow.is_correct : (q.type === 'short_text' ? undefined : undefined);
                  return (
                    <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="mb-2 font-semibold">{idx + 1}. {q.text}</div>
                          {q.type === 'mcq_single' && (
                            <>
                              <div className="text-sm"><span className="text-muted-foreground">Your answer:</span> {selectedTextSingle}</div>
                              <div className="text-sm"><span className="text-muted-foreground">Correct answer:</span> {correctSingleText}</div>
                            </>
                          )}
                          {q.type === 'mcq_multi' && (
                            <>
                              <div className="text-sm"><span className="text-muted-foreground">Your answers:</span> {opts.filter((o: any) => selectedIds.includes(o.id)).map((o: any) => o.text).join(', ') || '-'}</div>
                              <div className="text-sm"><span className="text-muted-foreground">Correct answers:</span> {correctOpts.map((o: any) => o.text).join(', ') || '-'}</div>
                            </>
                          )}
                          {q.type === 'short_text' && (
                            <>
                              <div className="text-sm"><span className="text-muted-foreground">Your answer:</span> {ansRow?.answer_payload?.text || '-'}</div>
                              {ansRow?.answer_payload?.comment && (
                                <div className="text-xs mt-1"><span className="text-muted-foreground">Teacher comment:</span> {ansRow.answer_payload.comment}</div>
                              )}
                            </>
                          )}
                          {q.type === 'numeric' && (
                            <>
                              <div className="text-sm"><span className="text-muted-foreground">Your answer:</span> {ansRow?.answer_payload?.number ?? '-'}</div>
                              <div className="text-sm"><span className="text-muted-foreground">Correct answer:</span> {correctSingleText || '-'}</div>
                              {q.media_url && <div className="text-xs text-muted-foreground">Tolerance: ±{Number(q.media_url)}</div>}
                            </>
                          )}
                          {q.type === 'true_false' && (
                            <div className="text-sm"><span className="text-muted-foreground">Your answer:</span> {ansRow?.answer_payload?.bool === true ? 'True' : ansRow?.answer_payload?.bool === false ? 'False' : '-'}</div>
                          )}
                        </div>
                        {typeof isCorrect === 'boolean' ? (
                          <Badge className={isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}>
                            {isCorrect ? 'Correct' : 'Wrong'}
                          </Badge>
                        ) : q.type === 'short_text' ? (
                          <Badge className="bg-slate-200 dark:bg-slate-700">Not graded</Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              {classId && subjectId ? (
                <Button onClick={() => router.push(`/dashboard/my-classes/${classId}/subjects/${subjectId}`)}>Back to Subject</Button>
              ) : (
                <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
