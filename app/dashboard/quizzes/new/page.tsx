'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthCheck } from '@/hooks/useAuthCheck';
import { getErrorMessage } from '@/lib/errorHandler';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  GraduationCap,
  FileText,
  Clock,
  Calendar,
  Info,
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, createQuiz, addQuizQuestion, addQuizOptions } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  type: 'mcq_single' | 'mcq_multi' | 'true_false' | 'short_text' | 'numeric';
  text: string;
  points: number;
  order_index: number;
  options?: QuestionOption[];
  correct_answer?: string | number | null;
  tolerance?: number;
}

interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
}

export default function NewQuizPage() {
  const { profile, loading: authLoading, isAuthorized } = useAuthCheck({
    requiredRole: ['admin', 'teacher', 'supervisor'],
  });
  const { language, t } = useLanguage();
  const router = useRouter();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [form, setForm] = useState({
    subject_id: '',
    lesson_id: '',
    title: '',
    description: '',
    time_limit_minutes: 30,
    attempts_allowed: 1,
    start_at: '',
    end_at: '',
    shuffle_questions: true,
    shuffle_options: true,
    show_results_policy: 'after_close' as 'immediate' | 'after_close' | 'never',
  });

  // Questions management
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  // Load subjects and lessons
  const loadRefs = useCallback(async () => {
    try {
      setLoadingRefs(true);
      const { data: subs, error } = await supabase
        .from('class_subjects')
        .select('id, subject_name, class_id')
        .order('subject_name');

      if (error) {
        console.error('Error loading subjects:', error);
        toast.error(getErrorMessage(error));
        return;
      }

      setSubjects(subs || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingRefs(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      loadRefs();
    }
  }, [isAuthorized, loadRefs]);

  // Load lessons when subject changes
  const onSubjectChange = useCallback(async (sid: string) => {
    setForm((prev) => ({ ...prev, subject_id: sid, lesson_id: '' }));
    if (!sid) {
      setLessons([]);
      return;
    }

    try {
      const { data: less, error } = await supabase
        .from('lessons')
        .select('id, title')
        .eq('subject_id', sid)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading lessons:', error);
        toast.error(getErrorMessage(error));
        return;
      }

      setLessons(less || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(getErrorMessage(err));
    }
  }, []);

  // Add new question
  const addQuestion = useCallback((type: Question['type']) => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}-${Math.random()}`,
      type,
      text: '',
      points: 1,
      order_index: questions.length,
      options: type === 'mcq_single' || type === 'mcq_multi' 
        ? [
            { id: `opt-1-${Date.now()}`, text: '', is_correct: type === 'mcq_single', order_index: 0 },
            { id: `opt-2-${Date.now()}`, text: '', is_correct: false, order_index: 1 },
            { id: `opt-3-${Date.now()}`, text: '', is_correct: false, order_index: 2 },
            { id: `opt-4-${Date.now()}`, text: '', is_correct: false, order_index: 3 },
          ]
        : [],
      correct_answer: null,
      tolerance: undefined,
    };
    setQuestions((prev) => [...prev, newQuestion]);
  }, [questions.length]);

  // Update question
  const updateQuestion = useCallback((questionId: string, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q))
    );
  }, []);

  // Update question option
  const updateQuestionOption = useCallback(
    (questionId: string, optionId: string, updates: Partial<QuestionOption>) => {
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== questionId || !q.options) return q;
          return {
            ...q,
            options: q.options.map((opt: any) =>
              opt.id === optionId ? { ...opt, ...updates } : opt
            ),
          };
        })
      );
    },
    []
  );

  // Add option to question
  const addOptionToQuestion = useCallback((questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const newOption: QuestionOption = {
          id: `opt-${Date.now()}-${Math.random()}`,
          text: '',
          is_correct: false,
          order_index: (q.options || []).length,
        };
        return {
          ...q,
          options: [...(q.options || []), newOption],
        };
      })
    );
  }, []);

  // Remove option from question
  const removeOptionFromQuestion = useCallback((questionId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId || !q.options) return q;
        const filtered = q.options.filter((opt: any) => opt.id !== optionId);
        // Reorder options
        return {
          ...q,
          options: filtered.map((opt: any, idx: number) => ({ ...opt, order_index: idx })),
        };
      })
    );
  }, []);

  // Remove question
  const removeQuestion = useCallback((questionId: string) => {
    setQuestions((prev) => {
      const filtered = prev.filter((q) => q.id !== questionId);
      // Reorder questions
      return filtered.map((q, idx) => ({ ...q, order_index: idx }));
    });
  }, []);

  // Move question
  const moveQuestion = useCallback((questionId: string, direction: 'up' | 'down') => {
    setQuestions((prev) => {
      const index = prev.findIndex((q) => q.id === questionId);
      if (index === -1) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const reordered = [...prev];
      const temp = reordered[index];
      reordered[index] = reordered[newIndex];
      reordered[newIndex] = temp;

      // Update order_index
      return reordered.map((q, idx) => ({ ...q, order_index: idx }));
    });
  }, []);

  // Validation
  const isValid = useMemo(() => {
    if (!form.title.trim()) return false;
    if (!form.subject_id && !form.lesson_id) return false;
    
    // Validate questions
    if (questions.length === 0) {
      // Allow saving without questions (can add later in edit page)
      return true;
    }
    
    for (const q of questions) {
      if (!q.text.trim()) return false;
      
      if (q.type === 'mcq_single' || q.type === 'mcq_multi') {
        if (!q.options || q.options.length < 2) return false;
        const validOptions = q.options.filter((opt: any) => opt.text.trim());
        if (validOptions.length < 2) return false;
        const hasCorrect = validOptions.some((opt) => opt.is_correct);
        if (!hasCorrect) return false;
      }
      
      if (q.type === 'true_false' && q.correct_answer === null) {
        return false;
      }
      
      if (q.type === 'numeric' && (q.correct_answer === null || q.correct_answer === undefined)) {
        return false;
      }
      
      // Short text questions don't need validation (manual grading)
    }
    
    return true;
  }, [form.title, form.subject_id, form.lesson_id, questions]);

  // Save quiz
  const onSave = useCallback(async () => {
    if (!isValid) {
      toast.error(
        language === 'ar'
          ? 'يرجى إدخال العنوان واختيار مادة أو درس، والتأكد من صحة جميع الأسئلة'
          : 'Please enter title, select subject or lesson, and ensure all questions are valid'
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        subject_id: form.lesson_id ? null : form.subject_id || null,
        lesson_id: form.lesson_id || null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        time_limit_minutes: form.time_limit_minutes > 0 ? form.time_limit_minutes : null,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        attempts_allowed: form.attempts_allowed || 1,
        shuffle_questions: form.shuffle_questions,
        shuffle_options: form.shuffle_options,
        show_results_policy: form.show_results_policy,
      };

      const { data: quiz, error } = await createQuiz(payload);

      if (error || !quiz) {
        toast.error(getErrorMessage(error) || 'Failed to create quiz');
        return;
      }

      // Create all questions
      for (const question of questions) {
        const questionPayload: any = {
          quiz_id: quiz.id,
          type: question.type,
          text: question.text.trim(),
          points: question.points || 1,
          order_index: question.order_index,
        };

        if (question.type === 'numeric' && question.correct_answer !== null) {
          questionPayload.media_url = String(question.correct_answer);
        }

        const { data: createdQuestion, error: qErr } = await addQuizQuestion(questionPayload);

        if (qErr || !createdQuestion) {
          console.error('Error adding question:', qErr);
          toast.error(`Failed to add question: ${question.text.substring(0, 30)}...`);
          continue;
        }

        // Add options for MCQ questions
        if (
          (question.type === 'mcq_single' || question.type === 'mcq_multi') &&
          question.options &&
          question.options.length >= 2
        ) {
          const validOptions = question.options
            .filter((opt: any) => opt.text.trim())
            .map((opt: any, idx: number) => ({
              text: opt.text.trim(),
              is_correct: opt.is_correct,
              order_index: idx,
            }));

          if (validOptions.length >= 2) {
            const { error: optErr } = await addQuizOptions(createdQuestion.id, validOptions);
            if (optErr) {
              console.error('Error adding options:', optErr);
              toast.error(`Failed to add options for question: ${question.text.substring(0, 30)}...`);
            }
          }
        }

        // Add options for True/False questions
        if (question.type === 'true_false' && question.correct_answer !== null) {
          const correctAnswerBool = question.correct_answer === 'true' || question.correct_answer === 1 || question.correct_answer === '1';
          const trueFalseOptions = [
            { text: language === 'ar' ? 'صحيح' : 'True', is_correct: correctAnswerBool, order_index: 0 },
            { text: language === 'ar' ? 'خطأ' : 'False', is_correct: !correctAnswerBool, order_index: 1 },
          ];
          const { error: optErr } = await addQuizOptions(createdQuestion.id, trueFalseOptions);
          if (optErr) {
            console.error('Error adding true/false options:', optErr);
            toast.error(`Failed to add options for question: ${question.text.substring(0, 30)}...`);
          }
        }
      }

      if (questions.length > 0) {
        toast.success(
          language === 'ar'
            ? `تم إنشاء المسابقة بنجاح مع ${questions.length} سؤال`
            : `Quiz created successfully with ${questions.length} question${questions.length !== 1 ? 's' : ''}`
        );
      } else {
        toast.success(
          language === 'ar'
            ? 'تم إنشاء المسابقة بنجاح. يمكنك إضافة الأسئلة من صفحة التعديل.'
            : 'Quiz created successfully. You can add questions from the edit page.'
        );
      }
      router.push('/dashboard/quizzes');
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [form, questions, isValid, language, router]);

  if (authLoading || loadingRefs) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const selectedSubject = subjects.find((s) => s.id === form.subject_id);
  const selectedLesson = lessons.find((l) => l.id === form.lesson_id);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          icon={FileText}
          title={language === 'ar' ? 'إنشاء مسابقة جديدة' : 'Create New Quiz'}
          description={
            language === 'ar'
              ? 'قم بإنشاء مسابقة جديدة وربطها بمادة أو درس'
              : 'Create a new quiz and link it to a subject or lesson'
          }
          gradient="from-purple-600 via-blue-600 to-purple-700"
        />

        {/* Link Selection */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              {language === 'ar' ? 'ربط المسابقة' : 'Link Quiz'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {language === 'ar'
                  ? 'يجب ربط المسابقة إما بمادة (متاحة لجميع طلاب المادة) أو بدرس محدد (متاحة فقط للطلاب المسجلين في هذا الدرس)'
                  : 'Link the quiz to either a subject (available to all students in the subject) or a specific lesson (available only to students enrolled in this lesson)'}
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4" />
                  {language === 'ar' ? 'المادة' : 'Subject'}{' '}
                  {language === 'ar' ? '(اختياري)' : '(Optional)'}
                </Label>
                <Select
                  value={form.subject_id || 'NONE'}
                  onValueChange={(sid) => onSubjectChange(sid === 'NONE' ? '' : sid)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={language === 'ar' ? 'اختر مادة' : 'Select subject'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      {language === 'ar' ? 'بدون مادة' : 'No Subject'}
                    </SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSubject && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'ar'
                      ? 'المسابقة ستكون متاحة لجميع طلاب هذه المادة'
                      : 'Quiz will be available to all students in this subject'}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4" />
                  {language === 'ar' ? 'الدرس' : 'Lesson'}{' '}
                  {language === 'ar' ? '(اختياري)' : '(Optional)'}
                </Label>
                <Select
                  value={form.lesson_id || 'NONE'}
                  onValueChange={(v) =>
                    setForm((prev: any) => ({ ...prev, lesson_id: v === 'NONE' ? '' : v }))
                  }
                  disabled={!form.subject_id}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={language === 'ar' ? 'اختر درس' : 'Select lesson'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      {language === 'ar' ? 'بدون درس' : 'No Lesson'}
                    </SelectItem>
                    {lessons.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!form.subject_id && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {language === 'ar' ? 'يجب اختيار مادة أولاً' : 'Please select a subject first'}
                  </p>
                )}
                {selectedLesson && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'ar'
                      ? 'المسابقة ستكون متاحة فقط لطلاب هذا الدرس'
                      : 'Quiz will be available only to students in this lesson'}
                  </p>
                )}
              </div>
            </div>

            {form.subject_id && form.lesson_id && (
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  {language === 'ar'
                    ? 'عند اختيار درس، سيتم ربط المسابقة بالدرس فقط وليس بالمادة'
                    : 'When a lesson is selected, the quiz will be linked to the lesson only, not the subject'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              {language === 'ar' ? 'معلومات المسابقة' : 'Quiz Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">
                {language === 'ar' ? 'العنوان' : 'Title'}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(e) => setForm((prev: any) => ({ ...prev, title: e.target.value }))}
                placeholder={
                  language === 'ar' ? 'أدخل عنوان المسابقة' : 'Enter quiz title'
                }
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">
                {language === 'ar' ? 'الوصف' : 'Description'}
              </Label>
              <Textarea
                className="mt-1"
                value={form.description}
                onChange={(e) =>
                  setForm((prev: any) => ({ ...prev, description: e.target.value }))
                }
                placeholder={
                  language === 'ar'
                    ? 'أدخل وصف المسابقة (اختياري)'
                    : 'Enter quiz description (optional)'
                }
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {language === 'ar' ? 'المدة (دقائق)' : 'Time Limit (minutes)'}
                </Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={form.time_limit_minutes}
                  onChange={(e) =>
                    setForm((prev: any) => ({
                      ...prev,
                      time_limit_minutes: Number(e.target.value) || 0,
                    }))
                  }
                  min="1"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">
                  {language === 'ar' ? 'عدد المحاولات المسموحة' : 'Attempts Allowed'}
                </Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={form.attempts_allowed}
                  onChange={(e) =>
                    setForm((prev: any) => ({
                      ...prev,
                      attempts_allowed: Number(e.target.value) || 1,
                    }))
                  }
                  min="1"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {language === 'ar' ? 'تاريخ البدء' : 'Start Date & Time'}
                </Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={form.start_at}
                  onChange={(e) =>
                    setForm((prev: any) => ({ ...prev, start_at: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {language === 'ar' ? 'تاريخ الانتهاء' : 'End Date & Time'}
                </Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={form.end_at}
                  onChange={(e) =>
                    setForm((prev: any) => ({ ...prev, end_at: e.target.value }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'الإعدادات' : 'Settings'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sq"
                  checked={form.shuffle_questions}
                  onCheckedChange={(v) =>
                    setForm((prev: any) => ({ ...prev, shuffle_questions: !!v }))
                  }
                />
                <Label htmlFor="sq">
                  {language === 'ar' ? 'خلط الأسئلة' : 'Shuffle Questions'}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="so"
                  checked={form.shuffle_options}
                  onCheckedChange={(v) =>
                    setForm((prev: any) => ({ ...prev, shuffle_options: !!v }))
                  }
                />
                <Label htmlFor="so">
                  {language === 'ar' ? 'خلط الخيارات' : 'Shuffle Options'}
                </Label>
              </div>

              <div>
                <Label className="text-sm font-semibold">
                  {language === 'ar' ? 'سياسة عرض النتائج' : 'Results Policy'}
                </Label>
                <Select
                  value={form.show_results_policy}
                  onValueChange={(v) =>
                    setForm((prev: any) => ({ ...prev, show_results_policy: v as any }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">
                      {language === 'ar' ? 'فوري' : 'Immediate'}
                    </SelectItem>
                    <SelectItem value="after_close">
                      {language === 'ar' ? 'بعد الإغلاق' : 'After Close'}
                    </SelectItem>
                    <SelectItem value="never">
                      {language === 'ar' ? 'أبداً' : 'Never'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Management */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                {language === 'ar' ? 'الأسئلة' : 'Questions'} ({questions.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(value) => addQuestion(value as Question['type'])}
                  defaultValue=""
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={language === 'ar' ? 'إضافة سؤال' : 'Add Question'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq_single">
                      {language === 'ar' ? 'اختيار من متعدد (واحد)' : 'Multiple Choice (Single)'}
                    </SelectItem>
                    <SelectItem value="mcq_multi">
                      {language === 'ar' ? 'اختيار من متعدد (متعدد)' : 'Multiple Choice (Multiple)'}
                    </SelectItem>
                    <SelectItem value="true_false">
                      {language === 'ar' ? 'صحيح/خطأ' : 'True/False'}
                    </SelectItem>
                    <SelectItem value="short_text">
                      {language === 'ar' ? 'نص قصير' : 'Short Text'}
                    </SelectItem>
                    <SelectItem value="numeric">
                      {language === 'ar' ? 'رقم' : 'Numeric'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد أسئلة بعد. اضغط على "إضافة سؤال" لإضافة سؤال جديد.' : 'No questions yet. Click "Add Question" to add a new question.'}</p>
              </div>
            ) : (
              questions.map((question, index) => (
                <div
                  key={question.id}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        #{index + 1}
                      </Badge>
                      <Badge>
                        {question.type === 'mcq_single'
                          ? language === 'ar'
                            ? 'اختيار واحد'
                            : 'MCQ Single'
                          : question.type === 'mcq_multi'
                          ? language === 'ar'
                            ? 'اختيار متعدد'
                            : 'MCQ Multiple'
                          : question.type === 'true_false'
                          ? language === 'ar'
                            ? 'صحيح/خطأ'
                            : 'True/False'
                          : question.type === 'short_text'
                          ? language === 'ar'
                            ? 'نص قصير'
                            : 'Short Text'
                          : language === 'ar'
                          ? 'رقم'
                          : 'Numeric'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveQuestion(question.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveQuestion(question.id, 'down')}
                        disabled={index === questions.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-semibold">
                        {language === 'ar' ? 'نص السؤال' : 'Question Text'}{' '}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        value={question.text}
                        onChange={(e) =>
                          updateQuestion(question.id, { text: e.target.value })
                        }
                        placeholder={
                          language === 'ar'
                            ? 'أدخل نص السؤال'
                            : 'Enter question text'
                        }
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-sm font-semibold">
                        {language === 'ar' ? 'النقاط' : 'Points'}
                      </Label>
                      <Input
                        type="number"
                        className="w-24"
                        value={question.points}
                        onChange={(e) =>
                          updateQuestion(question.id, {
                            points: Number(e.target.value) || 1,
                          })
                        }
                        min="1"
                      />
                    </div>

                    {/* MCQ Single/Multiple Options */}
                    {(question.type === 'mcq_single' ||
                      question.type === 'mcq_multi') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">
                            {language === 'ar' ? 'الخيارات' : 'Options'}
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOptionToQuestion(question.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {language === 'ar' ? 'إضافة خيار' : 'Add Option'}
                          </Button>
                        </div>
                        {(question.options || []).map((option: any, optIdx: number) => (
                          <div
                            key={option.id}
                            className="flex items-center gap-2 p-2 rounded border border-slate-200 dark:border-slate-700"
                          >
                            <Checkbox
                              checked={option.is_correct}
                              onCheckedChange={(checked) => {
                                if (question.type === 'mcq_single') {
                                  // For single choice, only one can be correct
                                  setQuestions((prev) =>
                                    prev.map((q) => {
                                      if (q.id !== question.id || !q.options) return q;
                                      return {
                                        ...q,
                                        options: q.options.map((opt: any) => ({
                                          ...opt,
                                          is_correct: opt.id === option.id ? !!checked : false,
                                        })),
                                      };
                                    })
                                  );
                                } else {
                                  updateQuestionOption(question.id, option.id, {
                                    is_correct: !!checked,
                                  });
                                }
                              }}
                            />
                            <Input
                              value={option.text}
                              onChange={(e) =>
                                updateQuestionOption(question.id, option.id, {
                                  text: e.target.value,
                                })
                              }
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1"
                            />
                            {(question.options || []).length > 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeOptionFromQuestion(question.id, option.id)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {(question.options || []).length < 2 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {language === 'ar'
                              ? 'يجب إضافة خيارين على الأقل'
                              : 'At least 2 options are required'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* True/False Options */}
                    {question.type === 'true_false' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          {language === 'ar' ? 'الإجابة الصحيحة' : 'Correct Answer'}
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            variant={(question.correct_answer === 'true' || question.correct_answer === 1 || question.correct_answer === '1') ? 'default' : 'outline'}
                            onClick={() =>
                              updateQuestion(question.id, { correct_answer: 'true' })
                            }
                          >
                            {language === 'ar' ? 'صحيح' : 'True'}
                          </Button>
                          <Button
                            variant={(question.correct_answer === 'false' || question.correct_answer === 0 || question.correct_answer === '0') ? 'default' : 'outline'}
                            onClick={() =>
                              updateQuestion(question.id, { correct_answer: 'false' })
                            }
                          >
                            {language === 'ar' ? 'خطأ' : 'False'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Numeric Answer */}
                    {question.type === 'numeric' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          {language === 'ar' ? 'الإجابة الصحيحة (رقم)' : 'Correct Answer (Number)'}
                        </Label>
                        <Input
                          type="number"
                          value={
                            question.correct_answer !== null
                              ? question.correct_answer
                              : ''
                          }
                          onChange={(e) =>
                            updateQuestion(question.id, {
                              correct_answer:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                          placeholder={language === 'ar' ? 'أدخل الرقم الصحيح' : 'Enter correct number'}
                        />
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-slate-600 dark:text-slate-400">
                            {language === 'ar' ? 'التسامح (±)' : 'Tolerance (±)'}
                          </Label>
                          <Input
                            type="number"
                            className="w-32"
                            value={question.tolerance || ''}
                            onChange={(e) =>
                              updateQuestion(question.id, {
                                tolerance:
                                  e.target.value === ''
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>
                    )}

                    {/* Short Text - Just text input, no correct answer needed */}
                    {question.type === 'short_text' && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          {language === 'ar'
                            ? 'هذا النوع من الأسئلة يحتاج إلى تصحيح يدوي'
                            : 'This question type requires manual grading'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={onSave} disabled={!isValid || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              language === 'ar' ? 'حفظ المسابقة' : 'Save Quiz'
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}