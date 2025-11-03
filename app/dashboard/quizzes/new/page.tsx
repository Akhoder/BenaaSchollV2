'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase, createQuiz, addQuizQuestion, addQuizOptions } from '@/lib/supabase';

export default function NewQuizPage() {
  const { profile, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [form, setForm] = useState({
    subject_id: '',
    lesson_id: '',
    title: '',
    description: '',
    time_limit_minutes: 10,
    attempts_allowed: 1,
    start_at: '',
    end_at: '',
    shuffle_questions: true,
    shuffle_options: true,
    show_results_policy: 'after_close' as 'immediate' | 'after_close' | 'never',
  });

  // Basic first question inputs
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [corrects, setCorrects] = useState<Record<string, boolean>>({ A: true, B: false, C: false, D: false });

  useEffect(() => {
    if (!authLoading) {
      if (!profile) { router.push('/login'); return; }
      if (!['admin','teacher','supervisor'].includes(profile.role)) { router.push('/dashboard'); return; }
      loadRefs().catch(() => {});
    }
  }, [authLoading, profile]);

  const loadRefs = async () => {
    try {
      setLoadingRefs(true);
      const { data: subs } = await supabase
        .from('class_subjects')
        .select('id, subject_name, class_id')
        .order('subject_name');
      setSubjects(subs || []);
    } finally {
      setLoadingRefs(false);
    }
  };

  const onSubjectChange = async (sid: string) => {
    setForm(prev => ({ ...prev, subject_id: sid, lesson_id: '' }));
    if (!sid) { setLessons([]); return; }
    const { data: less } = await supabase
      .from('lessons')
      .select('id, title')
      .eq('subject_id', sid)
      .order('created_at', { ascending: true });
    setLessons(less || []);
  };

  const onSave = async () => {
    try {
      if (!form.title.trim()) { toast.error(language === 'ar' ? 'أدخل العنوان' : 'Enter title'); return; }
      if (!form.subject_id && !form.lesson_id) { toast.error(language === 'ar' ? 'اختر مادة أو درس' : 'Choose subject or lesson'); return; }
      const payload = {
        subject_id: form.lesson_id ? null : (form.subject_id || null),
        lesson_id: form.lesson_id || null,
        title: form.title,
        description: form.description || null,
        time_limit_minutes: form.time_limit_minutes || null,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        attempts_allowed: form.attempts_allowed || 1,
        shuffle_questions: form.shuffle_questions,
        shuffle_options: form.shuffle_options,
        show_results_policy: form.show_results_policy,
      };
      const { data: quiz, error } = await createQuiz(payload);
      if (error || !quiz) { toast.error('Failed to create quiz'); return; }

      // If user added first question, create it
      if (qText.trim()) {
        const { data: q, error: qErr } = await addQuizQuestion({ quiz_id: quiz.id, type: 'mcq_single', text: qText, points: 1, order_index: 0 });
        if (!qErr && q) {
          const opts = [
            { text: optA, is_correct: !!corrects.A, order_index: 0 },
            { text: optB, is_correct: !!corrects.B, order_index: 1 },
            { text: optC, is_correct: !!corrects.C, order_index: 2 },
            { text: optD, is_correct: !!corrects.D, order_index: 3 },
          ].filter(o => o.text && o.text.trim());
          if (opts.length > 0) {
            await addQuizOptions(q.id, opts);
          }
        }
      }

      toast.success(language === 'ar' ? 'تم إنشاء المسابقة' : 'Quiz created');
      router.push('/dashboard');
    } catch (e) {
      console.error(e);
      toast.error('Save failed');
    }
  };

  if (authLoading || loadingRefs) {
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
            <CardTitle>{language === 'ar' ? 'إنشاء مسابقة' : 'Create Quiz'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">{language === 'ar' ? 'المادة' : 'Subject'}</Label>
                <Select value={form.subject_id || 'NONE'} onValueChange={(sid) => onSubjectChange(sid === 'NONE' ? '' : sid)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={language === 'ar' ? 'اختر مادة' : 'Select subject'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                    {subjects.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">{language === 'ar' ? 'الدرس (اختياري)' : 'Lesson (optional)'}</Label>
                <Select value={form.lesson_id || 'NONE'} onValueChange={(v) => setForm(prev => ({ ...prev, lesson_id: v === 'NONE' ? '' : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={language === 'ar' ? 'اختر درس' : 'Select lesson'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                    {lessons.map((l: any) => (<SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">{language === 'ar' ? 'العنوان' : 'Title'}</Label>
                <Input className="mt-1" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                <Input className="mt-1" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm">{language === 'ar' ? 'المدة (دقائق)' : 'Time limit (min)'}</Label>
                <Input type="number" className="mt-1" value={form.time_limit_minutes} onChange={(e) => setForm(prev => ({ ...prev, time_limit_minutes: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-sm">{language === 'ar' ? 'عدد المحاولات' : 'Attempts allowed'}</Label>
                <Input type="number" className="mt-1" value={form.attempts_allowed} onChange={(e) => setForm(prev => ({ ...prev, attempts_allowed: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-sm">{language === 'ar' ? 'البدء' : 'Start at'}</Label>
                <Input type="datetime-local" className="mt-1" value={form.start_at} onChange={(e) => setForm(prev => ({ ...prev, start_at: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">{language === 'ar' ? 'الانتهاء' : 'End at'}</Label>
                <Input type="datetime-local" className="mt-1" value={form.end_at} onChange={(e) => setForm(prev => ({ ...prev, end_at: e.target.value }))} />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 mt-2">
                <Checkbox id="sq" checked={form.shuffle_questions} onCheckedChange={(v) => setForm(prev => ({ ...prev, shuffle_questions: !!v }))} />
                <Label htmlFor="sq">{language === 'ar' ? 'خلط الأسئلة' : 'Shuffle questions'}</Label>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox id="so" checked={form.shuffle_options} onCheckedChange={(v) => setForm(prev => ({ ...prev, shuffle_options: !!v }))} />
                <Label htmlFor="so">{language === 'ar' ? 'خلط الخيارات' : 'Shuffle options'}</Label>
              </div>
              <div>
                <Label className="text-sm">{language === 'ar' ? 'سياسة عرض النتيجة' : 'Results policy'}</Label>
                <Select value={form.show_results_policy} onValueChange={(v) => setForm(prev => ({ ...prev, show_results_policy: v as any }))}>
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

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'سؤال أول (اختياري)' : 'First Question (optional)'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label className="text-sm">{language === 'ar' ? 'نص السؤال' : 'Question text'}</Label>
            <Input value={qText} onChange={(e) => setQText(e.target.value)} />
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>A</Label>
                <Input value={optA} onChange={(e) => setOptA(e.target.value)} />
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox id="ca" checked={!!corrects.A} onCheckedChange={(v) => setCorrects(prev => ({ ...prev, A: !!v }))} />
                  <Label htmlFor="ca">{language === 'ar' ? 'إجابة صحيحة' : 'Correct'}</Label>
                </div>
              </div>
              <div>
                <Label>B</Label>
                <Input value={optB} onChange={(e) => setOptB(e.target.value)} />
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox id="cb" checked={!!corrects.B} onCheckedChange={(v) => setCorrects(prev => ({ ...prev, B: !!v }))} />
                  <Label htmlFor="cb">{language === 'ar' ? 'إجابة صحيحة' : 'Correct'}</Label>
                </div>
              </div>
              <div>
                <Label>C</Label>
                <Input value={optC} onChange={(e) => setOptC(e.target.value)} />
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox id="cc" checked={!!corrects.C} onCheckedChange={(v) => setCorrects(prev => ({ ...prev, C: !!v }))} />
                  <Label htmlFor="cc">{language === 'ar' ? 'إجابة صحيحة' : 'Correct'}</Label>
                </div>
              </div>
              <div>
                <Label>D</Label>
                <Input value={optD} onChange={(e) => setOptD(e.target.value)} />
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox id="cd" checked={!!corrects.D} onCheckedChange={(v) => setCorrects(prev => ({ ...prev, D: !!v }))} />
                  <Label htmlFor="cd">{language === 'ar' ? 'إجابة صحيحة' : 'Correct'}</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={onSave}>{language === 'ar' ? 'حفظ المسابقة' : 'Save Quiz'}</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
