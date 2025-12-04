'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageLoading } from '@/components/LoadingSpinner';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase, fetchQuizBundle, fetchAnswersForAttempt, recalcAttemptScore } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
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
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any | null>(null);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState<Map<string, any[]>>(new Map());
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (authLoading || !profile) return;
    
    (async () => {
      try {
        setLoading(true);
        const { quiz, questions, optionsByQuestion } = await fetchQuizBundle(quizId);
        setQuiz(quiz);
        setQuestions(questions || []);
        setOptionsByQuestion(optionsByQuestion as any);
        
        // ✅ FIX: Fetch the most recent attempt (graded or submitted) for current student
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('student_id', profile.id)
          .in('status', ['graded', 'submitted'])
          .order('started_at', { ascending: false })
          .limit(1);
        const att = attempts && attempts[0] ? attempts[0] : null;
        
        if (att) {
          const { data: ansRows, error: ansError } = await fetchAnswersForAttempt(att.id);
          if (ansError) {
            console.error('Error fetching answers:', ansError);
          }
          const map: Record<string, any> = {};
          (ansRows || []).forEach((r: any) => { 
            map[r.question_id] = r;
            // Debug: log answer data
            if (process.env.NODE_ENV === 'development') {
              console.log(`Answer for question ${r.question_id}:`, {
                is_correct: r.is_correct,
                points_awarded: r.points_awarded,
                answer_payload: r.answer_payload
              });
            }
          });
          setAnswers(map);
          
          // If score is null/undefined, try to recalculate it
          if ((att.score === null || att.score === undefined) && att.status === 'submitted') {
            try {
              const { error: recalcError } = await recalcAttemptScore(att.id);
              if (!recalcError) {
                // Re-fetch the attempt to get updated score
                const { data: updatedAttempt } = await supabase
                  .from('quiz_attempts')
                  .select('*')
                  .eq('id', att.id)
                  .single();
                if (updatedAttempt) {
                  // Re-fetch answers to get updated is_correct and points_awarded
                  const { data: updatedAnsRows } = await fetchAnswersForAttempt(att.id);
                  const updatedMap: Record<string, any> = {};
                  (updatedAnsRows || []).forEach((r: any) => { updatedMap[r.question_id] = r; });
                  setAnswers(updatedMap);
                  setAttempt(updatedAttempt);
                  return;
                }
              }
            } catch (err) {
              console.warn('Error recalculating score:', err);
            }
          }
          
          // Also recalculate if attempt is graded but score is 0 and we have answers
          if (att.status === 'graded' && (att.score === null || att.score === 0 || att.score === undefined)) {
            // Check if we have answers with points_awarded
            const hasGradedAnswers = Object.values(map).some((ans: any) => 
              ans.points_awarded !== null && ans.points_awarded !== undefined
            );
            if (hasGradedAnswers) {
              try {
                const { error: recalcError } = await recalcAttemptScore(att.id);
                if (!recalcError) {
                  // Re-fetch the attempt and answers
                  const { data: updatedAttempt } = await supabase
                    .from('quiz_attempts')
                    .select('*')
                    .eq('id', att.id)
                    .single();
                  if (updatedAttempt) {
                    const { data: updatedAnsRows } = await fetchAnswersForAttempt(att.id);
                    const updatedMap: Record<string, any> = {};
                    (updatedAnsRows || []).forEach((r: any) => { updatedMap[r.question_id] = r; });
                    setAnswers(updatedMap);
                    setAttempt(updatedAttempt);
                    return;
                  }
                }
              } catch (err) {
                console.warn('Error recalculating score for graded attempt:', err);
              }
            }
          }
        }
        
        setAttempt(att);
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId, profile, authLoading]);

  const classId = search.get('classId');
  const subjectId = search.get('subjectId');
  // ✅ FIX: Check if results should be shown based on quiz policy
  const canShow = useMemo(() => {
    if (!quiz || !attempt) return false;
    
    // Default policy is 'after_close' if not set
    const policy = quiz.show_results_policy || 'after_close';
    
    // If policy is 'never', never show results
    if (policy === 'never') return false;
    
    // If policy is 'immediate', show results immediately after submission
    if (policy === 'immediate') {
      return attempt.status === 'graded' || attempt.status === 'submitted';
    }
    
    // If policy is 'after_close', only show after quiz end date has passed
    if (policy === 'after_close') {
      if (!quiz.end_at) {
        // If no end date, show if attempt is graded or submitted (more lenient)
        return attempt.status === 'graded' || attempt.status === 'submitted';
      }
      const now = new Date();
      const endDate = new Date(quiz.end_at);
      return endDate < now && (attempt.status === 'graded' || attempt.status === 'submitted');
    }
    
    // Default: show if attempt is graded or submitted
    return attempt.status === 'graded' || attempt.status === 'submitted';
  }, [quiz, attempt]);
  
  // Calculate total_points from questions
  const totalPoints = useMemo(() => {
    if (!questions.length) return 100; // Default fallback
    return questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
  }, [questions]);
  
  // Calculate score from answers if attempt.score is null/undefined
  const calculatedScore = useMemo(() => {
    if (!questions.length || !answers || Object.keys(answers).length === 0) {
      return 0;
    }
    let total = 0;
    questions.forEach((q) => {
      const ansRow = answers[q.id];
      if (ansRow) {
        const questionPoints = Number(q.points) || 1;
        let points = ansRow.points_awarded;
        
        // If points_awarded is set and valid, use it
        if (points !== null && points !== undefined) {
          const pointsNum = Number(points);
          if (!isNaN(pointsNum) && pointsNum >= 0) {
            total += pointsNum;
            return;
          }
        }
        
        // If points_awarded is not set or invalid, use is_correct
        if (typeof ansRow.is_correct === 'boolean') {
          if (ansRow.is_correct === true) {
            total += questionPoints;
          }
          // If false, add 0 (no need to add anything)
        }
      }
    });
    return total;
  }, [questions, answers]);

  // Use attempt.score if available, otherwise use calculated score
  const finalScore = useMemo(() => {
    // First try to use attempt.score
    if (attempt?.score !== null && attempt?.score !== undefined) {
      const score = Number(attempt.score);
      if (!isNaN(score) && score >= 0) {
        return score;
      }
    }
    // Fallback to calculated score from answers
    return calculatedScore;
  }, [attempt, calculatedScore]);

  // Calculate percentage score
  const percentageScore = useMemo(() => {
    if (!totalPoints || totalPoints === 0) return 0;
    const percentage = (finalScore / totalPoints) * 100;
    return Math.max(0, Math.min(100, Math.round(percentage))); // Clamp between 0 and 100
  }, [finalScore, totalPoints]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!questions.length) return { correct: 0, wrong: 0, notGraded: 0, total: 0 };
    
    let correct = 0;
    let wrong = 0;
    let notGraded = 0;
    
    questions.forEach((q) => {
      const ansRow = answers[q.id];
      const questionPoints = Number(q.points) || 1;
      
      // Check if answer exists
      if (!ansRow) {
        notGraded++;
        return;
      }
      
      // For auto-graded questions, check is_correct or points_awarded
      if (['mcq_single', 'mcq_multi', 'true_false', 'numeric'].includes(q.type)) {
        // Check is_correct first
        if (typeof ansRow.is_correct === 'boolean') {
          if (ansRow.is_correct) {
            correct++;
          } else {
            wrong++;
          }
        } 
        // If is_correct is not set, check points_awarded
        else if (ansRow.points_awarded !== null && ansRow.points_awarded !== undefined) {
          const points = Number(ansRow.points_awarded);
          if (!isNaN(points)) {
            if (points > 0 && points >= questionPoints) {
              correct++;
            } else if (points === 0) {
              wrong++;
            } else {
              // Partial credit - count as correct if more than half points
              if (points >= questionPoints / 2) {
                correct++;
              } else {
                wrong++;
              }
            }
          } else {
            notGraded++;
          }
        } else {
          notGraded++;
        }
      } 
      // For short_text, check if graded
      else if (q.type === 'short_text') {
        if (ansRow.points_awarded !== null && ansRow.points_awarded !== undefined) {
          const points = Number(ansRow.points_awarded);
          if (!isNaN(points) && points >= 0) {
            if (points > 0) {
              correct++;
            } else {
              wrong++;
            }
          } else {
            notGraded++;
          }
        } else {
          notGraded++;
        }
      } else {
        notGraded++;
      }
    });
    
    return { correct, wrong, notGraded, total: questions.length };
  }, [questions, answers]);

  if (loading) {
    return (
      <DashboardLayout>
        <SimplePageLoading text={t('loading' as TranslationKey)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <PageHeader
          title={quiz?.title || t('quizResultsAvailable' as TranslationKey)}
          description={quiz?.description || t('viewGradesAndFeedback' as TranslationKey)}
          icon={Award}
          gradient="from-secondary to-accent"
        />

        {/* Score Card - Show if attempt exists and canShow is true, or if attempt exists and we want to show score even if policy doesn't allow full results */}
        {attempt && (canShow || attempt.status === 'graded' || attempt.status === 'submitted') && (
          <Card className="glass-card border-secondary/30 bg-gradient-to-br from-secondary/10 to-accent/10 shadow-xl shadow-secondary/20 animate-fade-in-up">
            <CardContent className="pt-6 relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 islamic-pattern-subtle opacity-20"></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl animate-pulse"></div>
              
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Score */}
                <div className="text-center p-3 sm:p-4 rounded-xl bg-gradient-to-br from-secondary to-accent text-white shadow-lg">
                  <div className="flex items-center justify-center mb-1.5 sm:mb-2">
                    <Award className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold mb-1">{percentageScore}%</div>
                  <div className="text-[10px] sm:text-xs opacity-90">{t('finalScore' as TranslationKey)}</div>
                  <div className="text-[9px] sm:text-[10px] opacity-75 mt-0.5">
                    {typeof finalScore === 'number' ? finalScore.toFixed(1) : finalScore} / {totalPoints}
                  </div>
                </div>

                {/* Correct Answers */}
                <div className="text-center p-3 sm:p-4 rounded-xl bg-gradient-to-br from-success/20 to-success/10 border border-success/30">
                  <div className="flex items-center justify-center mb-1.5 sm:mb-2">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-success mb-1">{stats.correct}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{t('correct' as TranslationKey)}</div>
                </div>

                {/* Wrong Answers */}
                <div className="text-center p-3 sm:p-4 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/10 border border-destructive/30">
                  <div className="flex items-center justify-center mb-1.5 sm:mb-2">
                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-destructive mb-1">{stats.wrong}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{t('wrong' as TranslationKey)}</div>
                </div>

                {/* Not Graded */}
                <div className="text-center p-3 sm:p-4 rounded-xl bg-gradient-to-br from-warning/20 to-warning/10 border border-warning/30">
                  <div className="flex items-center justify-center mb-1.5 sm:mb-2">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-warning mb-1">{stats.notGraded}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{t('notGraded' as TranslationKey)}</div>
                </div>
              </div>

              {/* Submission Time */}
              {attempt.submitted_at && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-secondary/30 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{t('submitted' as TranslationKey)}: {new Date(attempt.submitted_at).toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                  </div>
                  {attempt.status === 'submitted' && (
                    <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-warning">
                      <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>{t('someQuestionsRequireManualGrading' as TranslationKey)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Questions & Answers */}
        {!attempt ? (
          <Card className="glass-card border-primary/10">
            <CardContent className="p-4 sm:p-6">
              <div className="text-center py-12">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-warning to-warning/80 rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <div className="relative p-6 bg-gradient-to-br from-warning/10 to-warning/5 rounded-full border border-warning/20">
                    <Clock className="h-12 w-12 text-warning" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-foreground mb-2">
                  {t('resultsNotAvailableYet' as TranslationKey)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('noQuizAttemptFound' as TranslationKey)}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : !canShow ? (
          <Card className="glass-card border-primary/10">
            <CardContent className="p-4 sm:p-6">
              <div className="text-center py-12">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-warning to-warning/80 rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <div className="relative p-6 bg-gradient-to-br from-warning/10 to-warning/5 rounded-full border border-warning/20">
                    <Clock className="h-12 w-12 text-warning" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-foreground mb-2">
                  {t('resultsNotAvailableYet' as TranslationKey)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {quiz?.show_results_policy === 'never' 
                    ? t('resultsNotAvailablePerSettings' as TranslationKey)
                    : quiz?.show_results_policy === 'after_close' && quiz?.end_at && new Date(quiz.end_at) > new Date()
                    ? t('resultsWillBeAvailable' as TranslationKey).replace('{date}', new Date(quiz.end_at).toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US'))
                    : t('resultsNotAvailableAtThisTime' as TranslationKey)}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-primary/10">
            <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="font-display">{t('viewGradesAndFeedback' as TranslationKey)}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('feedback' as TranslationKey)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
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
                      className="glass-card-hover border-primary/10 p-3 sm:p-5 rounded-xl animate-fade-in-up"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Question Number */}
                        <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg ${
                          isCorrect === true ? 'bg-gradient-to-br from-success to-success/80 text-white' :
                          isCorrect === false ? 'bg-gradient-to-br from-destructive to-destructive/80 text-white' :
                          'bg-gradient-to-br from-warning to-warning/80 text-white'
                        }`}>
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Question Text */}
                          <div className="mb-2 sm:mb-3 font-semibold text-sm sm:text-base text-foreground flex items-start gap-2">
                            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="break-words">{q.text}</span>
                          </div>

                          {/* Answers */}
                          <div className="space-y-2">
                            {q.type === 'mcq_single' && (
                              <>
                                <div className="text-xs sm:text-sm p-2.5 sm:p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <span className="font-medium text-primary">{t('yourAnswer' as TranslationKey)}</span>
                                  <span className="ml-2 rtl:mr-2 rtl:ml-0 text-foreground break-words">{selectedTextSingle}</span>
                                </div>
                                <div className="text-xs sm:text-sm p-2.5 sm:p-3 rounded-lg bg-success/5 border border-success/10">
                                  <span className="font-medium text-success">{t('correctAnswer' as TranslationKey)}</span>
                                  <span className="ml-2 rtl:mr-2 rtl:ml-0 text-foreground break-words">{correctSingleText}</span>
                                </div>
                              </>
                            )}
                            {q.type === 'mcq_multi' && (
                              <>
                                <div className="text-sm p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <span className="font-medium text-primary">{t('yourAnswers' as TranslationKey)}</span>
                                  <span className="ml-2 text-foreground">{opts.filter((o: any) => selectedIds.includes(o.id)).map((o: any) => o.text).join(', ') || '-'}</span>
                                </div>
                                <div className="text-sm p-3 rounded-lg bg-success/5 border border-success/10">
                                  <span className="font-medium text-success">{t('correctAnswers' as TranslationKey)}</span>
                                  <span className="ml-2 text-foreground">{correctOpts.map((o: any) => o.text).join(', ') || '-'}</span>
                                </div>
                              </>
                            )}
                            {q.type === 'short_text' && (
                              <>
                                <div className="text-sm p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <span className="font-medium text-primary">{t('yourAnswer' as TranslationKey)}</span>
                                  <div className="mt-2 text-foreground">{ansRow?.answer_payload?.text || '-'}</div>
                                </div>
                                {ansRow?.answer_payload?.comment && (
                                  <div className="text-sm p-3 rounded-lg bg-info/5 border border-info/10">
                                    <span className="font-medium text-info">{t('teacherComment' as TranslationKey)}</span>
                                    <div className="mt-2 text-foreground">{ansRow.answer_payload.comment}</div>
                                  </div>
                                )}
                              </>
                            )}
                            {q.type === 'numeric' && (
                              <>
                                <div className="text-sm p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <span className="font-medium text-primary">{t('yourAnswer' as TranslationKey)}</span>
                                  <span className="ml-2 text-foreground">{ansRow?.answer_payload?.number ?? '-'}</span>
                                </div>
                                <div className="text-sm p-3 rounded-lg bg-success/5 border border-success/10">
                                  <span className="font-medium text-success">{t('correctAnswer' as TranslationKey)}</span>
                                  <span className="ml-2 text-foreground">{correctSingleText || '-'}</span>
                                </div>
                                {q.media_url && (
                                  <div className="text-xs text-warning flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {t('tolerance' as TranslationKey)} ±{Number(q.media_url)}
                                  </div>
                                )}
                              </>
                            )}
                            {q.type === 'true_false' && (
                              <>
                                <div className="text-xs sm:text-sm p-2.5 sm:p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <span className="font-medium text-primary">{t('yourAnswer' as TranslationKey)}</span>
                                  <span className="ml-2 rtl:mr-2 rtl:ml-0 text-foreground">
                                    {ansRow?.answer_payload?.bool === true 
                                      ? (language === 'ar' ? 'صحيح' : language === 'fr' ? 'Vrai' : 'True')
                                      : ansRow?.answer_payload?.bool === false 
                                      ? (language === 'ar' ? 'خطأ' : language === 'fr' ? 'Faux' : 'False')
                                      : '-'}
                                  </span>
                                </div>
                                <div className="text-xs sm:text-sm p-2.5 sm:p-3 rounded-lg bg-success/5 border border-success/10">
                                  <span className="font-medium text-success">{t('correctAnswer' as TranslationKey)}</span>
                                  <span className="ml-2 rtl:mr-2 rtl:ml-0 text-foreground">
                                    {(() => {
                                      const correctOpt = opts.find((o: any) => o.is_correct);
                                      if (correctOpt) {
                                        // Use order_index for language independence: 0 = True, 1 = False
                                        return correctOpt.order_index === 0 
                                          ? (language === 'ar' ? 'صحيح' : language === 'fr' ? 'Vrai' : 'True')
                                          : (language === 'ar' ? 'خطأ' : language === 'fr' ? 'Faux' : 'False');
                                      }
                                      return '-';
                                    })()}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Result Badge */}
                        {typeof isCorrect === 'boolean' ? (
                          <Badge variant={isCorrect ? 'success' : 'destructive'} className="flex-shrink-0">
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {t('correct' as TranslationKey)}
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                {t('wrong' as TranslationKey)}
                              </>
                            )}
                          </Badge>
                        ) : q.type === 'short_text' ? (
                          <Badge variant="warning" className="flex-shrink-0">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {t('notGraded' as TranslationKey)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Back Button */}
              <div className="pt-3 sm:pt-4 border-t border-primary/10">
                {classId && subjectId ? (
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/dashboard/my-classes/${classId}/subjects/${subjectId}`)}
                    className="w-full sm:w-auto border-primary/30 hover:bg-primary/5 hover:border-primary/50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
                    {t('backToSubjects' as TranslationKey)}
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    className="w-full sm:w-auto border-primary/30 hover:bg-primary/5 hover:border-primary/50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
                    {t('back' as TranslationKey)} {t('dashboard' as TranslationKey)}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Button - shown when results are not available */}
        {(!attempt || !canShow) && (
          <Card className="glass-card border-primary/10">
            <CardContent className="p-4 sm:p-6">
              <div className="pt-3 sm:pt-4">
                {classId && subjectId ? (
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/dashboard/my-classes/${classId}/subjects/${subjectId}`)}
                    className="w-full sm:w-auto border-primary/30 hover:bg-primary/5 hover:border-primary/50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
                    {t('backToSubjects' as TranslationKey)}
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    className="w-full sm:w-auto border-primary/30 hover:bg-primary/5 hover:border-primary/50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
                    {t('back' as TranslationKey)} {t('dashboard' as TranslationKey)}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

