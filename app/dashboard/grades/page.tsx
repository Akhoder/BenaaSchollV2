'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { SimplePageLoading } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, Award, MessageSquare, Calendar } from 'lucide-react';
import * as api from '@/lib/supabase';
import { toast } from 'sonner';
import { fetchMyEnrolledClassesWithDetails, fetchSubjectsForClass } from '@/lib/supabase';

export default function GradesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, average: 0, graded: 0 });
  const dateLocale = useMemo(
    () => (language === 'ar' ? 'ar' : language === 'fr' ? 'fr-FR' : 'en-US'),
    [language]
  );

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && profile.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    if (profile?.role === 'student') {
      loadGrades();
    }
  }, [profile, authLoading, router]);

  const loadGrades = async () => {
    try {
      setLoading(true);
      // Get enrolled classes and subjects
      const { data: classes } = await fetchMyEnrolledClassesWithDetails();
      if (!classes || classes.length === 0) {
        setGrades([]);
        return;
      }

      // ✅ PERFORMANCE: Get all subjects in parallel instead of sequential loop
      const classIds = classes.map((c: any) => c.id);
      const subjectsPromises = classIds.map((classId: string) => 
        fetchSubjectsForClass(classId).then(({ data }) => ({ classId, subjects: data || [] }))
      );
      const subjectsResults = await Promise.all(subjectsPromises);
      
      // ✅ PERFORMANCE: Get all assignments and grades in parallel
      const allGrades: any[] = [];
      const subjectNames: Record<string, string> = {};
      const allSubjectIds: string[] = [];

      // Collect all subject IDs
      for (const { classId, subjects } of subjectsResults) {
        for (const subject of subjects || []) {
          subjectNames[subject.id] = subject.subject_name;
          allSubjectIds.push(subject.id);
        }
      }

      // Get all assignments for all subjects in parallel
      if (allSubjectIds.length > 0) {
        const { data: allAssignments } = await api.supabase
          .from('assignments')
          .select('id, title, total_points, subject_id')
          .in('subject_id', allSubjectIds)
          .in('status', ['published', 'closed']);

        if (allAssignments && allAssignments.length > 0) {
          // Get all submissions in parallel
          const submissionPromises = allAssignments.map(async (assignment) => {
            const { data: submission } = await api.fetchSubmissionForAssignment(assignment.id);
            if (submission && submission.status === 'graded' && submission.score !== null) {
              return {
                ...submission,
                type: 'assignment',
                title: assignment.title,
                total_points: assignment.total_points,
                subject_name: subjectNames[assignment.subject_id] || 'Unknown',
              };
            }
            return null;
          });

          const submissions = await Promise.all(submissionPromises);
          allGrades.push(...submissions.filter((s: any): s is any => s !== null));
        }

        // ✅ Get all quizzes for all subjects in parallel
        const { data: allQuizzes } = await api.supabase
          .from('quizzes')
          .select('id, title, total_points, subject_id, lesson_id')
          .in('subject_id', allSubjectIds)
          .in('status', ['published', 'closed']);

        if (allQuizzes && allQuizzes.length > 0) {
          // ✅ PERFORMANCE: Calculate total_points for all quizzes in parallel first
          const quizIds = allQuizzes.map((q: any) => q.id);
          const { data: allQuestions } = await api.supabase
            .from('quiz_questions')
            .select('quiz_id, points')
            .in('quiz_id', quizIds);
          
          // Create a map of quiz_id -> total_points
          const quizTotalPointsMap: Record<string, number> = {};
          allQuizzes.forEach((quiz: any) => {
            if (quiz.total_points && quiz.total_points > 0) {
              quizTotalPointsMap[quiz.id] = quiz.total_points;
            } else {
              // Calculate from questions
              const questions = (allQuestions || []).filter((q: any) => q.quiz_id === quiz.id);
              if (questions.length > 0) {
                quizTotalPointsMap[quiz.id] = questions.reduce((sum: number, q: any) => {
                  return sum + (Number(q.points) || 1);
                }, 0);
              } else {
                quizTotalPointsMap[quiz.id] = 100; // Default fallback
              }
            }
          });

          // Get all quiz attempts in parallel
          const quizAttemptPromises = allQuizzes.map(async (quiz) => {
            const { data: attempts } = await api.fetchStudentAttemptsForQuiz(quiz.id);
            // Get the best attempt (highest score) or latest graded attempt
            if (attempts && attempts.length > 0) {
              const gradedAttempts = attempts.filter((a: any) => a.status === 'graded' && a.score !== null);
              if (gradedAttempts.length > 0) {
                // Get the best score attempt
                const bestAttempt = gradedAttempts.reduce((best: any, current: any) => {
                  return (current.score || 0) > (best.score || 0) ? current : best;
                }, gradedAttempts[0]);

                return {
                  id: bestAttempt.id,
                  type: 'quiz',
                  title: quiz.title,
                  score: bestAttempt.score,
                  total_points: quizTotalPointsMap[quiz.id] || 100,
                  subject_name: subjectNames[quiz.subject_id] || 'Unknown',
                  graded_at: bestAttempt.submitted_at,
                  feedback: null,
                };
              }
            }
            return null;
          });

          const quizGrades = await Promise.all(quizAttemptPromises);
          allGrades.push(...quizGrades.filter((g: any): g is any => g !== null));
        }
      }

      setGrades(allGrades);

      // Calculate stats
      const gradedCount = allGrades.length;
      const totalScore = allGrades.reduce((sum, g) => sum + (g.score || 0), 0);
      const totalPossible = allGrades.reduce((sum, g) => sum + (g.total_points || 100), 0);
      const average = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;

      setStats({
        total: gradedCount,
        average: Math.round(average),
        graded: gradedCount,
      });
    } catch (e) {
      console.error(e);
      toast.error(t('errorLoadingGrades'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <SimplePageLoading text={t('loading')} />
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          icon={TrendingUp}
          title={t('myGrades')}
          description={t('viewGradesAndFeedback')}
          gradient="from-primary to-accent"
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 animate-fade-in-up">
          <StatCard
            title={t('totalGraded')}
            value={stats.total}
            description={t('assignmentsGraded')}
            icon={FileText}
            gradient="from-primary to-accent"
            color="primary"
          />
          <StatCard
            title={t('averageGrade')}
            value={`${stats.average}%`}
            description={t('overallAverage')}
            icon={TrendingUp}
            gradient="from-success to-primary"
            color="success"
          />
          <StatCard
            title={t('status')}
            value={stats.graded}
            description={t('gradedAssignments')}
            icon={Award}
            gradient="from-accent to-secondary"
            color="accent"
          />
        </div>

        {/* Grades List */}
        {grades.length === 0 ? (
          <Card className="glass-card border-primary/10">
            <CardContent className="py-12 text-center animate-fade-in relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 islamic-pattern-subtle opacity-30"></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-xl opacity-20 animate-pulse"></div>
                  <div className="relative p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
                    <TrendingUp className="h-16 w-16 mx-auto text-primary animate-float" />
                  </div>
                </div>
                <div className="w-24 h-1 bg-gradient-to-l from-transparent via-secondary to-transparent mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-foreground font-display mb-2">{t('noGradesYet')}</h3>
                <p className="text-muted-foreground font-sans">{t('noGradesDescription')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-primary/10 animate-fade-in-up">
            <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="font-display text-foreground">{t('gradeDetails')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {grades.map((grade: any, idx: number) => {
                  const percentage = grade.total_points > 0 
                    ? Math.round((grade.score / grade.total_points) * 100)
                    : 0;
                  const badgeVariant = percentage >= 80 
                    ? 'success'
                    : percentage >= 60
                    ? 'warning'
                    : 'destructive';
                  const isQuiz = grade.type === 'quiz';

                  return (
                    <Card key={grade.id || idx} className="glass-card-hover border-primary/10 group" style={{ animationDelay: `${idx * 50}ms` }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 bg-gradient-to-br rounded-xl shadow-lg flex-shrink-0 ${isQuiz ? 'from-secondary to-accent' : 'from-primary to-accent'}`}>
                            {isQuiz ? (
                              <Award className="h-4 w-4 text-white" />
                            ) : (
                              <FileText className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base text-foreground group-hover:text-primary transition-colors mb-1">
                              {grade.title || grade.assignment_title}
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="islamic" className="gap-1">
                                {isQuiz ? (
                                  <Award className="h-3 w-3" />
                                ) : (
                                  <FileText className="h-3 w-3" />
                                )}
                                {grade.subject_name}
                              </Badge>
                              <Badge variant={isQuiz ? 'secondary' : 'outline'} className="gap-1">
                                {isQuiz ? t('quizzes') : t('assignment')}
                              </Badge>
                              <Badge variant={badgeVariant} className="gap-1">
                                <Award className="h-3 w-3" />
                                {percentage}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm bg-gradient-to-l from-primary/5 to-secondary/5 p-3 rounded-xl border border-primary/10">
                          <span className="text-muted-foreground font-semibold">{t('scoreLabel')}</span>
                          <span className="font-bold text-foreground">{grade.score} / {grade.total_points}</span>
                        </div>
                        {grade.feedback && (
                          <div className="p-3 bg-gradient-to-l from-info/10 to-primary/10 rounded-xl border border-info/20">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="h-4 w-4 text-info" />
                              <p className="text-xs font-semibold text-info">{t('feedback')}</p>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{grade.feedback}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span>
                            <span className="font-semibold">{isQuiz ? t('submitted') : t('gradedOn')}:</span>{' '}
                            {new Date(grade.graded_at || grade.submitted_at).toLocaleDateString(dateLocale)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

