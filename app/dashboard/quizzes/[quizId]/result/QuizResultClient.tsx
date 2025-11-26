'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageLoading } from '@/components/LoadingSpinner';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase, fetchQuizBundle, fetchAnswersForAttempt } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ArrowLeft, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Target
} from 'lucide-react';

// Client component - generateStaticParams handled in page.tsx
export const dynamicParams = true;

export default function QuizResultClient() {
  const params = useParams();
  const search = useSearchParams();
  const quizId = params?.quizId as string;
  const router = useRouter();
  const { t, language } = useLanguage();

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

  // Calculate statistics
  const stats = useMemo(() => {
    if (!questions.length) return { correct: 0, wrong: 0, notGraded: 0, total: 0 };
    
    let correct = 0;
    let wrong = 0;
    let notGraded = 0;
    
    questions.forEach((q) => {
      const ansRow = answers[q.id];
      if (typeof ansRow?.is_correct === 'boolean') {
        if (ansRow.is_correct) correct++;
        else wrong++;
      } else if (q.type === 'short_text') {
        notGraded++;
      }
    });
    
    return { correct, wrong, notGraded, total: questions.length };
  }, [questions, answers]);

  if (loading) {
    return (
      <DashboardLayout>
        <SimplePageLoading text={language === 'ar' ? 'جاري تحميل النتائج...' : 'Loading results...'} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <PageHeader
          title={quiz?.title || (language === 'ar' ? 'نتائج الاختبار' : 'Quiz Results')}
          description={quiz?.description || (language === 'ar' ? 'عرض إجاباتك ونتائجك' : 'View your answers and results')}
          icon={Award}
          gradient="from-secondary to-accent"
        />

        {/* Score Card */}
        {attempt && canShow && (
          <Card className="glass-card border-secondary/30 bg-gradient-to-br from-secondary/10 to-accent/10 shadow-xl shadow-secondary/20 animate-fade-in-up">
            <CardContent className="pt-6 relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 islamic-pattern-subtle opacity-20"></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl animate-pulse"></div>
              
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Score */}
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-secondary to-accent text-white shadow-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Award className="h-6 w-6" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{attempt.score ?? 0}%</div>
                  <div className="text-xs opacity-90">{language === 'ar' ? 'النتيجة النهائية' : 'Final Score'}</div>
                </div>

                {/* Correct Answers */}
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-success/20 to-success/10 border border-success/30">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div className="text-3xl font-bold text-success mb-1">{stats.correct}</div>
                  <div className="text-xs text-muted-foreground">{language === 'ar' ? 'إجابات صحيحة' : 'Correct'}</div>
                </div>

                {/* Wrong Answers */}
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/10 border border-destructive/30">
                  <div className="flex items-center justify-center mb-2">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="text-3xl font-bold text-destructive mb-1">{stats.wrong}</div>
                  <div className="text-xs text-muted-foreground">{language === 'ar' ? 'إجابات خاطئة' : 'Wrong'}</div>
                </div>

                {/* Not Graded */}
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-warning/20 to-warning/10 border border-warning/30">
                  <div className="flex items-center justify-center mb-2">
                    <AlertCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div className="text-3xl font-bold text-warning mb-1">{stats.notGraded}</div>
                  <div className="text-xs text-muted-foreground">{language === 'ar' ? 'قيد التصحيح' : 'Not Graded'}</div>
                </div>
              </div>

              {/* Submission Time */}
              {attempt.submitted_at && (
                <div className="mt-4 pt-4 border-t border-secondary/30 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {language === 'ar' ? 'تم التسليم في' : 'Submitted at'}: {new Date(attempt.submitted_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Questions & Answers */}
        <Card className="glass-card border-primary/10">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-display">{language === 'ar' ? 'الأسئلة والإجابات' : 'Questions & Answers'}</CardTitle>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مراجعة إجاباتك' : 'Review your answers'}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {!canShow ? (
              <div className="text-center py-12">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-warning to-warning/80 rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <div className="relative p-6 bg-gradient-to-br from-warning/10 to-warning/5 rounded-full border border-warning/20">
                    <Clock className="h-12 w-12 text-warning" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-foreground mb-2">
                  {language === 'ar' ? 'النتائج غير متاحة حالياً' : 'Results Not Available Yet'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'ستكون النتائج متاحة لاحقاً حسب سياسة المعلم' : 'Results will be available later according to teacher policy'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q: any, idx: number) => {
                  const ansRow = answers[q.id];
                  const opts = optionsByQuestion.get(q.id) || [];
                  const selectedIds: string[] = ansRow?.answer_payload?.selected_option_ids || [];
                  const correctOpts = opts.filter((o: any) => o.is_correct);
                  const selectedTextSingle = opts.find((o: any) => o.id === selectedIds[0])?.text || '-';
                  const correctSingleText = correctOpts[0]?.text || '-';
                  const isCorrect = typeof ansRow?.is_correct === 'boolean' ? ansRow.is_correct : undefined;
                  
                  return (
                    <div 
                      key={q.id} 
                      className="glass-card-hover border-primary/10 p-5 rounded-xl animate-fade-in-up"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Question Number */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg ${
                          isCorrect === true ? 'bg-gradient-to-br from-success to-success/80 text-white' :
                          isCorrect === false ? 'bg-gradient-to-br from-destructive to-destructive/80 text-white' :
                          'bg-gradient-to-br from-warning to-warning/80 text-white'
                        }`}>
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Question Text */}
                          <div className="mb-3 font-semibold text-foreground flex items-start gap-2">
                            <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{q.text}</span>
                          </div>

                          {/* Answers */}
                          <div className="space-y-2">
                            {q.type === 'mcq_single' && (
                              <>
                                <div className="text-sm p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <span className="font-medium text-primary">{language === 'ar' ? 'إجابتك:' : 'Your answer:'}</span>
                                  <span className="ml-2 text-foreground">{selectedTextSingle}</span>
                                </div>
                                <div className="text-sm p-3 rounded-lg bg-success/5 border border-success/10">
                                  <span className="font-medium text-success">{language === 'ar' ? 'الإجابة الصحيحة:' : 'Correct answer:'}</span>
                                  <span className="ml-2 text-foreground">{correctSingleText}</span>
                                </div>
                              </>
                            )}
                            {q.type === 'mcq_multi' && (
                              <>
                                <div className="text-sm p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <span className="font-medium text-primary">{language === 'ar' ? 'إجاباتك:' : 'Your answers:'}</span>
                                  <span className="ml-2 text-foreground">{opts.filter((o: any) => selectedIds.includes(o.id)).map((o: any) => o.text).join(', ') || '-'}</span>
                                </div>
                                <div className="text-sm p-3 rounded-lg bg-success/5 border border-success/10">
                                  <span className="font-medium text-success">{language === 'ar' ? 'الإجابات الصحيحة:' : 'Correct answers:'}</span>
                                  <span className="ml-2 text-foreground">{correctOpts.map((o: any) => o.text).join(', ') || '-'}</span>
                                </div>
                              </>
                            )}
                            {q.type === 'short_text' && (
                              <>
                                <div className="text-sm p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <span className="font-medium text-primary">{language === 'ar' ? 'إجابتك:' : 'Your answer:'}</span>
                                  <div className="mt-2 text-foreground">{ansRow?.answer_payload?.text || '-'}</div>
                                </div>
                                {ansRow?.answer_payload?.comment && (
                                  <div className="text-sm p-3 rounded-lg bg-info/5 border border-info/10">
                                    <span className="font-medium text-info">{language === 'ar' ? 'تعليق المعلم:' : 'Teacher comment:'}</span>
                                    <div className="mt-2 text-foreground">{ansRow.answer_payload.comment}</div>
                                  </div>
                                )}
                              </>
                            )}
                            {q.type === 'numeric' && (
                              <>
                                <div className="text-sm p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <span className="font-medium text-primary">{language === 'ar' ? 'إجابتك:' : 'Your answer:'}</span>
                                  <span className="ml-2 text-foreground">{ansRow?.answer_payload?.number ?? '-'}</span>
                                </div>
                                <div className="text-sm p-3 rounded-lg bg-success/5 border border-success/10">
                                  <span className="font-medium text-success">{language === 'ar' ? 'الإجابة الصحيحة:' : 'Correct answer:'}</span>
                                  <span className="ml-2 text-foreground">{correctSingleText || '-'}</span>
                                </div>
                                {q.media_url && (
                                  <div className="text-xs text-warning flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {language === 'ar' ? 'التسامح:' : 'Tolerance:'} ±{Number(q.media_url)}
                                  </div>
                                )}
                              </>
                            )}
                            {q.type === 'true_false' && (
                              <div className="text-sm p-3 rounded-lg bg-primary/5 border border-primary/10">
                                <span className="font-medium text-primary">{language === 'ar' ? 'إجابتك:' : 'Your answer:'}</span>
                                <span className="ml-2 text-foreground">
                                  {ansRow?.answer_payload?.bool === true 
                                    ? (language === 'ar' ? 'صح' : 'True')
                                    : ansRow?.answer_payload?.bool === false 
                                    ? (language === 'ar' ? 'خطأ' : 'False')
                                    : '-'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Result Badge */}
                        {typeof isCorrect === 'boolean' ? (
                          <Badge variant={isCorrect ? 'success' : 'destructive'} className="flex-shrink-0">
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {language === 'ar' ? 'صحيح' : 'Correct'}
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                {language === 'ar' ? 'خطأ' : 'Wrong'}
                              </>
                            )}
                          </Badge>
                        ) : q.type === 'short_text' ? (
                          <Badge variant="warning" className="flex-shrink-0">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {language === 'ar' ? 'لم يتم التصحيح' : 'Not graded'}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Back Button */}
            <div className="pt-4 border-t border-primary/10">
              {classId && subjectId ? (
                <Button 
                  variant="outline" 
                  onClick={() => router.push(`/dashboard/my-classes/${classId}/subjects/${subjectId}`)}
                  className="border-primary/30 hover:bg-primary/5 hover:border-primary/50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'العودة للمادة' : 'Back to Subject'}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="border-primary/30 hover:bg-primary/5 hover:border-primary/50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

