'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Save,
  Trash2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, fetchQuizBundle, updateQuiz, fetchQuestionsForQuiz, addQuizQuestion, updateQuestion, replaceOptions, addQuizOptions } from '@/lib/supabase';

import { PageHeader } from '@/components/PageHeader';

// Client component - generateStaticParams handled in layout.tsx
export const dynamicParams = true;

interface Question {
  id: string;
  type: 'mcq_single' | 'mcq_multi' | 'true_false' | 'short_text' | 'numeric';
  text: string;
  points: number;
  order_index: number;
  options?: QuestionOption[];
  correct_answer?: string | number | boolean | null;
  tolerance?: number;
  media_url?: string | null;
}

interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
}

export default function EditQuizPage() {
  const { profile, loading: authLoading, isAuthorized } = useAuthCheck({
    requiredRole: ['admin', 'teacher', 'supervisor'],
  });
  const { language, t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const quizId = params?.quizId as string;

  const [subjects, setSubjects] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
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

  const [questions, setQuestions] = useState<any[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Map<string, any[]>>(new Map());

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

  // Load lessons when subject changes
  const onSubjectChange = useCallback(async (sid: string) => {
    setForm((prev: any) => ({ ...prev, subject_id: sid, lesson_id: '' }));
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

  useEffect(() => {
    if (isAuthorized) {
      loadRefs();
      load().catch(() => {});
    }
  }, [isAuthorized, quizId, loadRefs]);

  const load = async () => {
    try {
      setLoading(true);
      const { quiz, error } = await fetchQuizBundle(quizId);
      
      if (error) {
        console.error('Error fetching quiz:', error);
        toast.error(getErrorMessage(error));
        return;
      }
      
      if (!quiz) {
        toast.error(language === 'ar' ? 'المسابقة غير موجودة' : 'Quiz not found');
        router.push('/dashboard/quizzes');
        return;
      }

      // Handle null/undefined values properly - keep the actual value if it exists
      let subjectId = quiz.subject_id ?? null;
      const lessonId = quiz.lesson_id ?? null;

      // If lesson_id exists but subject_id is null, fetch subject_id from lesson
      if (lessonId && !subjectId) {
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('subject_id')
          .eq('id', lessonId)
          .single();

        if (!lessonError && lessonData?.subject_id) {
          subjectId = lessonData.subject_id;
        }
      }

      setForm({
        subject_id: subjectId ? String(subjectId) : '',
        lesson_id: lessonId ? String(lessonId) : '',
        title: quiz.title || '',
        description: quiz.description || '',
        time_limit_minutes: quiz.time_limit_minutes || 30,
        attempts_allowed: quiz.attempts_allowed || 1,
        start_at: quiz.start_at ? new Date(quiz.start_at).toISOString().slice(0, 16) : '',
        end_at: quiz.end_at ? new Date(quiz.end_at).toISOString().slice(0, 16) : '',
        shuffle_questions: !!quiz.shuffle_questions,
        shuffle_options: !!quiz.shuffle_options,
        show_results_policy: quiz.show_results_policy || 'after_close',
      });

      // Load lessons if subject is selected (either from quiz or from lesson)
      if (subjectId) {
        const { data: less, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: true });

        if (!lessonsError && less) {
          setLessons(less);
        } else if (lessonsError) {
          console.error('Error loading lessons:', lessonsError);
        }
      }

      const { questions: loadedQuestions, optionsByQuestion } = await fetchQuestionsForQuiz(quizId);
      
      // Convert loaded questions to Question format with options
      const formattedQuestions: Question[] = (loadedQuestions || []).map((q: any) => {
        const opts = (optionsByQuestion.get(q.id) || []).map((opt: any, idx: number) => ({
          id: opt.id || `opt-${q.id}-${idx}`,
          text: opt.text || '',
          is_correct: opt.is_correct || false,
          order_index: opt.order_index ?? idx,
        }));

        // Determine correct_answer based on question type
        let correct_answer: string | number | boolean | null = null;
        if (q.type === 'true_false') {
          // For true_false, find the correct option
          const correctOpt = opts.find((opt: any) => opt.is_correct);
          if (correctOpt) {
            correct_answer = correctOpt.text === (language === 'ar' ? 'صحيح' : 'True');
          }
        } else if (q.type === 'numeric') {
          // For numeric, use media_url as correct_answer
          correct_answer = q.media_url ? Number(q.media_url) : null;
        }

        return {
          id: q.id,
          type: q.type as Question['type'],
          text: q.text || '',
          points: q.points || 1,
          order_index: q.order_index ?? 0,
          options: (q.type === 'mcq_single' || q.type === 'mcq_multi') ? opts : undefined,
          correct_answer,
          tolerance: undefined,
          media_url: q.media_url,
        };
      });

      setQuestions(formattedQuestions);
      
      // Update optionsByQ for backward compatibility
      const updatedOptionsByQ = new Map<string, any[]>();
      formattedQuestions.forEach((q) => {
        if (q.options && q.options.length > 0) {
          updatedOptionsByQ.set(q.id, q.options);
        }
      });
      setOptionsByQ(updatedOptionsByQ);
      
    } catch (err) {
      console.error('Error loading quiz:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const payload: any = {
        subject_id: form.lesson_id ? null : form.subject_id || null,
        lesson_id: form.lesson_id || null,
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
      if (error) {
        toast.error(getErrorMessage(error) || (language === 'ar' ? 'فشل الحفظ' : 'Save failed'));
        return;
      }
      toast.success(language === 'ar' ? 'تم تحديث المسابقة بنجاح' : 'Quiz updated successfully');
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e) || (language === 'ar' ? 'فشل الحفظ' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  // Add new question
  const addQuestion = useCallback(async (type: Question['type']) => {
    try {
      const { data, error } = await addQuizQuestion({
        quiz_id: quizId,
        type,
        text: language === 'ar' ? 'سؤال جديد' : 'New question',
        points: 1,
        order_index: questions.length,
      });
      
      if (error || !data) {
        toast.error(getErrorMessage(error));
        return;
      }

      const newQuestion: Question = {
        id: data.id,
        type,
        text: data.text || '',
        points: data.points || 1,
        order_index: data.order_index ?? questions.length,
        options: (type === 'mcq_single' || type === 'mcq_multi')
          ? [
              { id: `opt-1-${Date.now()}`, text: '', is_correct: type === 'mcq_single', order_index: 0 },
              { id: `opt-2-${Date.now()}`, text: '', is_correct: false, order_index: 1 },
              { id: `opt-3-${Date.now()}`, text: '', is_correct: false, order_index: 2 },
              { id: `opt-4-${Date.now()}`, text: '', is_correct: false, order_index: 3 },
            ]
          : undefined,
        correct_answer: null,
        tolerance: undefined,
      };

      setQuestions((prev) => [...prev, newQuestion]);

      // Add options for MCQ questions
      if ((type === 'mcq_single' || type === 'mcq_multi') && newQuestion.options) {
        const opts = newQuestion.options.map((opt: any, idx: number) => ({
          text: opt.text,
          is_correct: opt.is_correct,
          order_index: idx,
        }));

        const { error: optError } = await addQuizOptions(data.id, opts);
        if (optError) {
          console.error('Error adding options:', optError);
          toast.error(language === 'ar' ? 'تم إضافة السؤال لكن فشل إضافة الخيارات' : 'Question added but failed to add options');
        } else {
          // Update optionsByQ with actual option IDs
          const { data: addedOptions } = await supabase
            .from('quiz_options')
            .select('*')
            .eq('question_id', data.id)
            .order('order_index');

          if (addedOptions) {
            setOptionsByQ((prev) => {
              const newMap = new Map(prev);
              newMap.set(data.id, addedOptions);
              return newMap;
            });
          }
        }
      }

      // Add options for True/False questions
      if (type === 'true_false') {
        const trueFalseOptions = [
          { text: language === 'ar' ? 'صحيح' : 'True', is_correct: false, order_index: 0 },
          { text: language === 'ar' ? 'خطأ' : 'False', is_correct: false, order_index: 1 },
        ];
        const { error: optError } = await addQuizOptions(data.id, trueFalseOptions);
        if (optError) {
          console.error('Error adding true/false options:', optError);
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [quizId, questions.length, language]);

  // Update question
  const updateQuestionLocal = useCallback((questionId: string, updates: Partial<Question>) => {
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
          id: `temp-${Date.now()}-${Math.random()}`,
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
        return {
          ...q,
          options: filtered.map((opt: any, idx: number) => ({ ...opt, order_index: idx })),
        };
      })
    );
  }, []);

  // Remove question
  const removeQuestion = useCallback(async (questionId: string) => {
    try {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId);
      if (error) throw error;
      setQuestions((prev) => {
        const filtered = prev.filter((q) => q.id !== questionId);
        return filtered.map((q, idx) => ({ ...q, order_index: idx }));
      });
      setOptionsByQ((prev) => {
        const newMap = new Map(prev);
        newMap.delete(questionId);
        return newMap;
      });
      toast.success(language === 'ar' ? 'تم حذف السؤال' : 'Question deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [language]);

  // Move question
  const moveQuestion = useCallback(async (questionId: string, direction: 'up' | 'down') => {
    const index = questions.findIndex((q) => q.id === questionId);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const reordered = [...questions];
    const temp = reordered[index];
    reordered[index] = reordered[newIndex];
    reordered[newIndex] = temp;

    // Update order_index in database
    await updateQuestion(reordered[index].id, { order_index: index });
    await updateQuestion(reordered[newIndex].id, { order_index: newIndex });

    // Update local state
    setQuestions(reordered.map((q, idx) => ({ ...q, order_index: idx })));
  }, [questions]);

  const move = async (idx: number, dir: -1 | 1) => {
    const questionId = questions[idx]?.id;
    if (!questionId) return;
    await moveQuestion(questionId, dir === -1 ? 'up' : 'down');
  };

  // Save question to database
  const saveQuestion = useCallback(async (question: Question, idx: number) => {
    try {
      // Update question basic fields
      const updateData: any = {
        text: question.text,
        points: question.points,
        order_index: idx,
      };

      // Handle numeric questions
      if (question.type === 'numeric') {
        updateData.media_url = question.correct_answer !== null ? String(question.correct_answer) : null;
      } else {
        updateData.media_url = question.media_url ?? null;
      }

      await updateQuestion(question.id, updateData);

      // Handle options based on question type
      if (question.type === 'mcq_single' || question.type === 'mcq_multi') {
        if (question.options && question.options.length >= 2) {
          const opts = question.options
            .filter((opt: any) => opt.text.trim())
            .map((opt: any, i: number) => ({
              text: opt.text.trim(),
              is_correct: opt.is_correct,
              order_index: i,
            }));

          if (opts.length >= 2) {
            await replaceOptions(question.id, opts);
          }
        }
      } else if (question.type === 'true_false') {
        // Update true/false options
        const correctAnswerBool = question.correct_answer === 'true' || question.correct_answer === 1 || question.correct_answer === '1';
        const trueFalseOptions = [
          { text: language === 'ar' ? 'صحيح' : 'True', is_correct: correctAnswerBool, order_index: 0 },
          { text: language === 'ar' ? 'خطأ' : 'False', is_correct: !correctAnswerBool, order_index: 1 },
        ];
        await replaceOptions(question.id, trueFalseOptions);
      }

      toast.success(language === 'ar' ? 'تم الحفظ' : 'Saved');
      
      // Reload options for MCQ questions
      if (question.type === 'mcq_single' || question.type === 'mcq_multi') {
        const { data: updatedOptions } = await supabase
          .from('quiz_options')
          .select('*')
          .eq('question_id', question.id)
          .order('order_index');

        if (updatedOptions) {
          setOptionsByQ((prev) => {
            const newMap = new Map(prev);
            newMap.set(question.id, updatedOptions);
            return newMap;
          });
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [language]);

  if (authLoading || loading || loadingRefs) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
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
          title={language === 'ar' ? 'تعديل المسابقة' : 'Edit Quiz'}
          description={
            language === 'ar'
              ? 'قم بتعديل معلومات المسابقة والأسئلة'
              : 'Edit quiz information and questions'
          }
          gradient="from-blue-600 via-purple-600 to-blue-700"
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
                  key={`subject-${form.subject_id || 'none'}`}
                  value={form.subject_id && form.subject_id !== '' ? form.subject_id : 'NONE'}
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
                      <SelectItem key={s.id} value={String(s.id)}>
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
                  key={`lesson-${form.lesson_id || 'none'}-${lessons.length}`}
                  value={form.lesson_id && form.lesson_id !== '' ? form.lesson_id : 'NONE'}
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
                      <SelectItem key={l.id} value={String(l.id)}>
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
                onChange={(e) => setForm((p: any) => ({ ...p, title: e.target.value }))}
                placeholder={language === 'ar' ? 'أدخل عنوان المسابقة' : 'Enter quiz title'}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">
                {language === 'ar' ? 'الوصف' : 'Description'}
              </Label>
              <Textarea
                className="mt-1"
                value={form.description}
                onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))}
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
                    setForm((p: any) => ({
                      ...p,
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
                    setForm((p: any) => ({
                      ...p,
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
                  onChange={(e) => setForm((p: any) => ({ ...p, start_at: e.target.value }))}
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
                  onChange={(e) => setForm((p: any) => ({ ...p, end_at: e.target.value }))}
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
                  checked={!!form.shuffle_questions}
                  onCheckedChange={(v) => setForm((p: any) => ({ ...p, shuffle_questions: !!v }))}
                />
                <Label htmlFor="sq">
                  {language === 'ar' ? 'خلط الأسئلة' : 'Shuffle Questions'}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="so"
                  checked={!!form.shuffle_options}
                  onCheckedChange={(v) => setForm((p: any) => ({ ...p, shuffle_options: !!v }))}
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
                  onValueChange={(v) => setForm((p: any) => ({ ...p, show_results_policy: v }))}
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

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()} disabled={saving}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>

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
                  <SelectTrigger className="w-48">
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
          <CardContent className="space-y-3">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>
                  {language === 'ar'
                    ? 'لا توجد أسئلة بعد. اضغط على الأزرار أعلاه لإضافة أسئلة.'
                    : 'No questions yet. Click the buttons above to add questions.'}
                </p>
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
                          updateQuestionLocal(question.id, { text: e.target.value })
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
                          updateQuestionLocal(question.id, {
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
                              updateQuestionLocal(question.id, { correct_answer: 'true' })
                            }
                          >
                            {language === 'ar' ? 'صحيح' : 'True'}
                          </Button>
                          <Button
                            variant={(question.correct_answer === 'false' || question.correct_answer === 0 || question.correct_answer === '0') ? 'default' : 'outline'}
                            onClick={() =>
                              updateQuestionLocal(question.id, { correct_answer: 'false' })
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
                            updateQuestionLocal(question.id, {
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
                              updateQuestionLocal(question.id, {
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

                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveQuestion(question, index)}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'حفظ السؤال' : 'Save Question'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}