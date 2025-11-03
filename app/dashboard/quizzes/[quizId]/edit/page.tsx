'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase, fetchQuizBundle, updateQuiz, fetchQuestionsForQuiz, addQuizQuestion, updateQuestion, replaceOptions } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

export default function EditQuizPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quizId = params?.quizId as string;

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({
    title: '', description: '', time_limit_minutes: 10, attempts_allowed: 1, start_at: '', end_at: '', shuffle_questions: true, shuffle_options: true, show_results_policy: 'after_close',
  });
  const [questions, setQuestions] = useState<any[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Map<string, any[]>>(new Map());

  useEffect(() => {
    if (!authLoading) {
      if (!profile || !['admin','teacher','supervisor'].includes(profile.role)) { router.push('/dashboard'); return; }
      load().catch(() => {});
    }
  }, [authLoading, profile, quizId]);

  const load = async () => {
    try {
      setLoading(true);
      const { quiz } = await fetchQuizBundle(quizId);
      if (!quiz) { toast.error('Quiz not found'); router.push('/dashboard/quizzes'); return; }
      setForm({
        title: quiz.title || '',
        description: quiz.description || '',
        time_limit_minutes: quiz.time_limit_minutes || 0,
        attempts_allowed: quiz.attempts_allowed || 1,
        start_at: quiz.start_at ? new Date(quiz.start_at).toISOString().slice(0,16) : '',
        end_at: quiz.end_at ? new Date(quiz.end_at).toISOString().slice(0,16) : '',
        shuffle_questions: !!quiz.shuffle_questions,
        shuffle_options: !!quiz.shuffle_options,
        show_results_policy: quiz.show_results_policy || 'after_close',
      });
      const { questions, optionsByQuestion } = await fetchQuestionsForQuiz(quizId);
      setQuestions(questions as any[]);
      setOptionsByQ(optionsByQuestion as any);
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    try {
      const payload: any = {
        title: form.title,
        description: form.description || null,
        time_limit_minutes: form.time_limit_minutes || null,
        attempts_allowed: form.attempts_allowed || 1,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        shuffle_questions: !!form.shuffle_questions,
        shuffle_options: !!form.shuffle_options,
        show_results_policy: form.show_results_policy,
      };
      const { error } = await updateQuiz(quizId, payload);
      if (error) { toast.error('Save failed'); return; }
      toast.success('Quiz updated');
    } catch (e) {
      console.error(e);
      toast.error('Save failed');
    }
  };

  const addQuestion = async (type: 'mcq_single' | 'short_text' | 'numeric') => {
    const { data, error } = await addQuizQuestion({ quiz_id: quizId, type, text: 'New question', points: 1, order_index: questions.length });
    if (!error && data) {
      setQuestions(prev => [...prev, data]);
      if (type === 'mcq_single') setOptionsByQ(prev => new Map(prev.set(data.id, [{ id: 'tmp1', text: 'Option 1', is_correct: true, order_index: 0 }, { id: 'tmp2', text: 'Option 2', is_correct: false, order_index: 1 }])));
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const to = idx + dir; if (to < 0 || to >= questions.length) return;
    const reordered = [...questions];
    const tmp = reordered[idx]; reordered[idx] = reordered[to]; reordered[to] = tmp;
    // persist order indexes
    await updateQuestion(reordered[idx].id, { order_index: idx });
    await updateQuestion(reordered[to].id, { order_index: to });
    setQuestions(reordered);
  };

  const saveQuestion = async (q: any, idx: number) => {
    await updateQuestion(q.id, { text: q.text, points: q.points, order_index: idx, media_url: q.media_url ?? null });
    if (q.type === 'mcq_single') {
      const opts = (optionsByQ.get(q.id) || []).map((o: any, i: number) => ({ text: o.text, is_correct: !!o.is_correct, order_index: i }));
      await replaceOptions(q.id, opts);
    }
    toast.success('Saved');
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
            <CardTitle>Edit Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Title</Label>
                <Input className="mt-1" value={form.title} onChange={(e) => setForm((p: any) => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Input className="mt-1" value={form.description} onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm">Time limit (min)</Label>
                <Input type="number" className="mt-1" value={form.time_limit_minutes} onChange={(e) => setForm((p: any) => ({ ...p, time_limit_minutes: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-sm">Attempts allowed</Label>
                <Input type="number" className="mt-1" value={form.attempts_allowed} onChange={(e) => setForm((p: any) => ({ ...p, attempts_allowed: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-sm">Start at</Label>
                <Input type="datetime-local" className="mt-1" value={form.start_at} onChange={(e) => setForm((p: any) => ({ ...p, start_at: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">End at</Label>
                <Input type="datetime-local" className="mt-1" value={form.end_at} onChange={(e) => setForm((p: any) => ({ ...p, end_at: e.target.value }))} />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 mt-2">
                <Checkbox id="sq" checked={!!form.shuffle_questions} onCheckedChange={(v) => setForm((p: any) => ({ ...p, shuffle_questions: !!v }))} />
                <Label htmlFor="sq">Shuffle questions</Label>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox id="so" checked={!!form.shuffle_options} onCheckedChange={(v) => setForm((p: any) => ({ ...p, shuffle_options: !!v }))} />
                <Label htmlFor="so">Shuffle options</Label>
              </div>
              <div>
                <Label className="text-sm">Results policy</Label>
                <Select value={form.show_results_policy} onValueChange={(v) => setForm((p: any) => ({ ...p, show_results_policy: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="after_close">After Close</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={onSave}>Save Changes</Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Questions</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => addQuestion('mcq_single')}>Add MCQ</Button>
                <Button variant="outline" onClick={() => addQuestion('short_text')}>Add Short Text</Button>
                <Button variant="outline" onClick={() => addQuestion('numeric')}>Add Numeric</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions yet.</p>
            ) : (
              questions.map((q, idx) => {
                const opts = optionsByQ.get(q.id) || [];
                return (
                  <div key={q.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <Input value={q.text} onChange={(e) => setQuestions(prev => prev.map((x, i) => i === idx ? { ...x, text: e.target.value } : x))} />
                        <div className="flex items-center gap-3">
                          <Label className="text-xs">Points</Label>
                          <Input className="w-24" type="number" value={q.points || 1} onChange={(e) => setQuestions(prev => prev.map((x, i) => i === idx ? { ...x, points: Number(e.target.value) } : x))} />
                          <Badge>{q.type}</Badge>
                        </div>
                        {q.type === 'mcq_single' && (
                          <div className="space-y-2">
                            {(opts.length ? opts : [{ text: 'Option 1', is_correct: true }, { text: 'Option 2', is_correct: false }]).map((o: any, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                <input type="checkbox" checked={!!o.is_correct} onChange={(e) => setOptionsByQ(prev => new Map(prev.set(q.id, (prev.get(q.id) || []).map((oo: any, ii: number) => ii === i ? { ...oo, is_correct: e.target.checked } : oo))))} />
                                <Input value={o.text} onChange={(e) => setOptionsByQ(prev => new Map(prev.set(q.id, (prev.get(q.id) || []).map((oo: any, ii: number) => ii === i ? { ...oo, text: e.target.value } : oo))))} />
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'numeric' && (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">Enter the correct number in a correct option, and optional tolerance below.</div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Tolerance (±)</Label>
                              <Input className="w-32" type="number" value={q.media_url || ''} onChange={(e) => setQuestions(prev => prev.map((x, i) => i === idx ? { ...x, media_url: e.target.value } : x))} />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => move(idx, -1)}>Up</Button>
                          <Button variant="outline" onClick={() => move(idx, 1)}>Down</Button>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => saveQuestion(questions[idx], idx)}>Save</Button>
                          <Button variant="destructive" onClick={async () => { await supabase.from('quiz_questions').delete().eq('id', q.id); setQuestions(prev => prev.filter((_, i) => i !== idx)); }}>Delete</Button>
                        </div>
                      </div>
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
