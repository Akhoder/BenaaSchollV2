'use client';

import GradeQuizClient from './GradeQuizClient';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchQuizBundle, fetchAttemptsWithAnswers, supabase, updateAnswerGrade, recalcAttemptScore, updateAnswerPayload, updateAttemptScore } from '@/lib/supabase';

export const dynamic = 'force-static';

export default function GradeQuizPage() {
  const { profile, loading: authLoading } = useAuth();
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

  const gradeShortText = async (answerId: string, points: number) => {
    // Validate points (should be >= 0 and not NaN)
    const validPoints = isNaN(points) || points < 0 ? 0 : points;
    const ok = await updateAnswerGrade(answerId, null, validPoints);
    if ((ok as any).error) { toast.error('Failed to grade'); return; }
    
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
    
    toast.success('Answer graded');
    await load(); // Refresh data
  };

  const finalizeAttempt = async (attemptId: string) => {
    try {
      // First, ensure all answers have points_awarded set (even if 0)
      const answers = answersByAttempt.get(attemptId) || [];
      for (const ans of answers) {
        if (ans.points_awarded === null || ans.points_awarded === undefined) {
          // Set default 0 points for ungraded answers
          const { error: gradeError } = await updateAnswerGrade(ans.id, null, 0);
          if (gradeError) {
            console.warn(`Failed to set points for answer ${ans.id}:`, gradeError);
          }
        }
      }
      
      // Recalculate score
      const { error, data } = await recalcAttemptScore(attemptId);
      if (error) {
        console.error('Recalc error:', error);
        // Try fallback: calculate score manually from current answers
        // Re-fetch answers to get updated points_awarded values
        const { data: updatedAnswers } = await supabase
          .from('quiz_answers')
          .select('points_awarded')
          .eq('attempt_id', attemptId);
        
        const totalScore = (updatedAnswers || []).reduce((sum: number, ans: any) => {
          const points = ans.points_awarded;
          if (points === null || points === undefined || isNaN(Number(points))) {
            return sum;
          }
          return sum + Number(points);
        }, 0);
        
        const { error: updateError } = await updateAttemptScore(attemptId, totalScore);
        if (updateError) {
          toast.error(`Failed to finalize: ${updateError.message || 'Unknown error'}`);
          return;
        }
      }
      toast.success('Attempt finalized');
      await load();
    } catch (err: any) {
      console.error('Finalize error:', err);
      toast.error(`Failed to finalize: ${err.message || 'Unknown error'}`);
    }
  };

  if (authLoading || loading) {
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
            <CardTitle>Grade: {quiz?.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <input className="w-full md:w-72 border rounded px-3 py-2 bg-transparent" placeholder="Search student name/email..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="border rounded px-3 py-2 bg-transparent" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="ALL">All</option>
                <option value="in_progress">In progress</option>
                <option value="submitted">Submitted</option>
                <option value="graded">Graded</option>
              </select>
              <div className="text-xs text-muted-foreground">Total attempts: {attempts.length}</div>
            </div>

            {/* Stats */}
            {(() => {
              const done = attempts.filter((a: any) => a.status === 'submitted' || a.status === 'graded');
              const scores = done.map((a: any) => Number(a.score) || 0).sort((a, b) => a - b);
              const n = scores.length;
              const avg = n ? (scores.reduce((s, v) => s + v, 0) / n) : 0;
              const median = n ? (n % 2 ? scores[(n - 1) / 2] : (scores[n / 2 - 1] + scores[n / 2]) / 2) : 0;
              const variance = n ? scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n : 0;
              const stddev = Math.sqrt(variance);
              const completion = attempts.length ? Math.round((done.length / attempts.length) * 100) : 0;
              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 rounded border border-slate-200 dark:border-slate-700 text-xs">Avg<br/><span className="text-base font-semibold">{avg.toFixed(2)}</span></div>
                  <div className="p-3 rounded border border-slate-200 dark:border-slate-700 text-xs">Median<br/><span className="text-base font-semibold">{median.toFixed(2)}</span></div>
                  <div className="p-3 rounded border border-slate-200 dark:border-slate-700 text-xs">StdDev<br/><span className="text-base font-semibold">{stddev.toFixed(2)}</span></div>
                  <div className="p-3 rounded border border-slate-200 dark:border-slate-700 text-xs">Completed<br/><span className="text-base font-semibold">{done.length}</span></div>
                  <div className="p-3 rounded border border-slate-200 dark:border-slate-700 text-xs">Completion<br/><span className="text-base font-semibold">{completion}%</span></div>
                </div>
              );
            })()}

            {attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attempts yet.</p>
            ) : (
              attempts
                .filter((att) => {
                  const s = (studentMap[att.student_id]?.full_name || '') + ' ' + (studentMap[att.student_id]?.email || '');
                  const matchText = !search || s.toLowerCase().includes(search.toLowerCase());
                  const matchStatus = status === 'ALL' || att.status === status;
                  return matchText && matchStatus;
                })
                .map((att) => {
                  const answers = answersByAttempt.get(att.id) || [];
                  return (
                    <div key={att.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Attempt: {att.id} • Student: {studentMap[att.student_id]?.full_name || att.student_id} {studentMap[att.student_id]?.email ? `(${studentMap[att.student_id]?.email})` : ''}</div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-200 dark:bg-slate-700">{att.status}</Badge>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{att.score ?? 0}</Badge>
                          <Button variant="outline" onClick={() => finalizeAttempt(att.id)}>Finalize</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {questions.map((q, idx) => {
                          const ans = answers.find((a: any) => a.question_id === q.id);
                          const opts = optionsByQ.get(q.id) || [];
                          return (
                            <div key={q.id} className="p-3 rounded border border-slate-200 dark:border-slate-700">
                              <div className="mb-1 text-sm font-medium">{idx + 1}. {q.text} <span className="text-xs text-muted-foreground">({q.type}, {q.points || 1} pts)</span></div>
                              {q.type === 'short_text' && (
                                <div className="space-y-2">
                                  <div className="text-sm"><span className="text-muted-foreground">Answer:</span> {ans?.answer_payload?.text || '-'}</div>
                                  <div className="flex items-center gap-2">
                                    <Input className="w-24" type="number" placeholder="points" defaultValue={ans?.points_awarded ?? ''} onBlur={async (e) => { const v = Number(e.target.value || 0); await gradeShortText(ans?.id, v); }} />
                                    <span className="text-xs text-muted-foreground">out of {q.points || 1}</span>
                                  </div>
                                  <div>
                                    <textarea className="w-full mt-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-transparent" placeholder="Comment (optional)" defaultValue={ans?.answer_payload?.comment || ''} onBlur={async (e) => { await updateAnswerPayload(ans?.id, { comment: e.target.value }); toast.success('Comment saved'); }} />
                                  </div>
                                </div>
                              )}
                              {q.type === 'numeric' && (
                                <div className="space-y-2">
                                  <div className="text-sm"><span className="text-muted-foreground">Answer:</span> {ans?.answer_payload?.number ?? '-'}</div>
                                  <div className="flex items-center gap-2">
                                    <Input className="w-24" type="number" placeholder="points" defaultValue={ans?.points_awarded ?? ''} onBlur={async (e) => { const v = Number(e.target.value || 0); await gradeShortText(ans?.id, v); }} />
                                    <span className="text-xs text-muted-foreground">out of {q.points || 1}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">Tolerance: ±{q.media_url ? Number(q.media_url) : 0}</div>
                                </div>
                              )}
                              {['mcq_single','mcq_multi','true_false'].includes(q.type) && (
                                <div className="text-sm text-muted-foreground">Auto-graded</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
