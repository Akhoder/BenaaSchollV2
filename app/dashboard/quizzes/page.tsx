'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase, fetchStaffQuizzes, fetchAttemptsForQuiz, fetchQuizBundle, fetchEnrolledStudentsForSubject, createNotification, updateQuiz, deleteQuiz } from '@/lib/supabase';
import { toast } from 'sonner';

export default function QuizzesManagePage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  useEffect(() => {
    if (!authLoading) {
      if (!profile || !['admin','teacher','supervisor'].includes(profile.role)) { router.push('/dashboard'); return; }
      load().catch(() => {});
    }
  }, [authLoading, profile]);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await fetchStaffQuizzes();
      if (error) return;
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async (quizId: string) => {
    try {
      setDownloading(quizId);
      const { data } = await fetchAttemptsForQuiz(quizId);
      // Fetch student profiles for richer CSV
      const ids = Array.from(new Set((data || []).map((r: any) => r.student_id)));
      let profilesMap: Record<string, any> = {};
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ids);
        (profs || []).forEach((p: any) => { profilesMap[p.id] = p; });
      }
      const header = ['student_id','full_name','email','started_at','submitted_at','status','score'];
      const lines = (data || []).map((r: any) => {
        const p = profilesMap[r.student_id] || {};
        return [r.student_id, JSON.stringify(p.full_name || ''), JSON.stringify(p.email || ''), r.started_at, r.submitted_at || '', r.status, r.score ?? 0].join(',');
      });
      const csv = [header.join(','), ...lines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `quiz_${quizId}_attempts.csv`; a.click(); URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  const publish = async (quiz: any) => {
    try {
      setPublishing(quiz.id);
      // Notify enrolled students (subject-level only for now)
      if (quiz.subject_id) {
        const { data: students } = await fetchEnrolledStudentsForSubject(quiz.subject_id);
        for (const s of (students || [])) {
          await createNotification({ recipient_id: s.id, title: `New quiz: ${quiz.title}`, body: 'A new quiz is available.', link_url: `/dashboard/quizzes/${quiz.id}/take` });
        }
      }
      toast.success('Published notifications');
    } finally {
      setPublishing(null);
    }
  };

  const closeNow = async (quiz: any) => {
    try {
      const ok = window.confirm('Close this quiz now? end_at will be set to current time.');
      if (!ok) return;
      const { error } = await updateQuiz(quiz.id, { end_at: new Date().toISOString() });
      if (error) { toast.error('Failed to close'); return; }
      toast.success('Quiz closed');
      await load();
    } catch {}
  };

  const removeQuiz = async (quiz: any) => {
    try {
      const ok = window.confirm('Delete this quiz and its content? This cannot be undone.');
      if (!ok) return;
      const { error } = await deleteQuiz(quiz.id);
      if (error) { toast.error('Delete failed'); return; }
      toast.success('Quiz deleted');
      await load();
    } catch {}
  };

  const notifyResults = async (quiz: any) => {
    try {
      setNotifying(quiz.id);
      const isAfterClose = quiz.show_results_policy === 'after_close';
      const ended = quiz.end_at && new Date(quiz.end_at) < new Date();
      if (!isAfterClose || !ended) { toast.error('Results not available yet'); return; }
      if (quiz.subject_id) {
        const { data: students } = await fetchEnrolledStudentsForSubject(quiz.subject_id);
        for (const s of (students || [])) {
          await createNotification({ recipient_id: s.id, title: `Results available: ${quiz.title}`, body: 'Results are now available.', link_url: `/dashboard/quizzes/${quiz.id}/result` });
        }
      }
      toast.success('Results notifications sent');
    } finally {
      setNotifying(null);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><Skeleton className="h-12 w-12" /></div>
      </DashboardLayout>
    );
  }

  const filtered = items.filter((q) => {
    const matchText = !search || (q.title || '').toLowerCase().includes(search.toLowerCase());
    const active = !q.end_at || new Date(q.end_at) > new Date();
    const matchStatus = status === 'ALL' || (status === 'OPEN' ? active : !active);
    return matchText && matchStatus;
  });
  const openCount = items.filter((q) => !q.end_at || new Date(q.end_at) > new Date()).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quizzes</CardTitle>
              <Button onClick={() => router.push('/dashboard/quizzes/new')}>Create Quiz</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4">
              <input className="w-full md:w-72 border rounded px-3 py-2 bg-transparent" placeholder="Search title..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="border rounded px-3 py-2 bg-transparent" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="ALL">All</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
              <div className="text-xs text-muted-foreground">Total: {items.length} | Open: {openCount}</div>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quizzes yet.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((q: any) => {
                  const active = !q.end_at || new Date(q.end_at) > new Date();
                  return (
                    <div key={q.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold">{q.title}</div>
                        <div className="text-xs text-muted-foreground">Attempts: {q.attempts_allowed || 1}</div>
                        <div className="text-xs text-muted-foreground">Window: {(q.start_at ? new Date(q.start_at).toLocaleString() : '—')} → {(q.end_at ? new Date(q.end_at).toLocaleString() : '—')}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700'}>{active ? 'Open' : 'Closed'}</Badge>
                        <Button variant="outline" onClick={() => router.push(`/dashboard/quizzes/${q.id}/edit`)}>Edit</Button>
                        <Button variant="outline" onClick={() => router.push(`/dashboard/quizzes/${q.id}/grade`)}>Grade</Button>
                        <Button variant="outline" onClick={() => closeNow(q)} disabled={!active}>Close Now</Button>
                        <Button variant="outline" onClick={() => exportCSV(q.id)} disabled={downloading === q.id}>{downloading === q.id ? 'Exporting...' : 'Export CSV'}</Button>
                        <Button variant="outline" onClick={() => publish(q)} disabled={publishing === q.id}>{publishing === q.id ? 'Publishing...' : 'Publish'}</Button>
                        <Button variant="outline" onClick={() => notifyResults(q)} disabled={notifying === q.id}>{notifying === q.id ? 'Notifying...' : 'Notify Results'}</Button>
                        <Button variant="destructive" onClick={() => removeQuiz(q)}>Delete</Button>
                      </div>
                    </div>
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
