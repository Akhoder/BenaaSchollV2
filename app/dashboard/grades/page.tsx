'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, TrendingUp } from 'lucide-react';
import * as api from '@/lib/supabase';
import { toast } from 'sonner';
import { fetchMyEnrolledClassesWithDetails, fetchSubjectsForClass } from '@/lib/supabase';

export default function GradesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, average: 0, graded: 0 });

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

      // Get all assignments and grades for enrolled subjects
      const allGrades: any[] = [];
      const subjectNames: Record<string, string> = {};

      for (const cls of classes) {
        const { data: subjects } = await fetchSubjectsForClass(cls.id);
        for (const subject of (subjects || [])) {
          subjectNames[subject.id] = subject.subject_name;
          
          // Get submissions for this subject's assignments
          const { data: assignments } = await api.supabase
            .from('assignments')
            .select('id, title, total_points')
            .eq('subject_id', subject.id)
            .in('status', ['published', 'closed']);
          
          if (assignments && assignments.length > 0) {
            for (const assignment of assignments) {
              const { data: submission } = await api.fetchSubmissionForAssignment(assignment.id);
              if (submission && submission.status === 'graded' && submission.score !== null) {
                allGrades.push({
                  ...submission,
                  assignment_title: assignment.title,
                  total_points: assignment.total_points,
                  subject_name: subject.subject_name,
                });
              }
            }
          }
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
      toast.error('Error loading grades');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center animate-fade-in">
            <div className="relative inline-block">
              <Loader2 className="h-16 w-16 animate-spin text-emerald-600 mx-auto animate-pulse-glow" />
              <div className="absolute inset-0 bg-emerald-200/20 rounded-full blur-xl animate-pulse"></div>
            </div>
            <p className="mt-6 text-lg font-semibold text-slate-700 dark:text-slate-300 font-display">Loading your grades...</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-sans">Please wait while we fetch your data</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Enhanced Header */}
        <PageHeader 
          icon={FileText}
          title="My Grades"
          description="View your grades and feedback"
          gradient="from-emerald-600 via-teal-600 to-emerald-700"
        />

        {/* ✅ Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Total Graded
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <FileText className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-blue-600">{stats.total}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Assignments graded</p>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Average Grade
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.average}%</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Overall average</p>
            </CardContent>
          </Card>
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Status
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Active</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.graded}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Graded assignments</p>
            </CardContent>
          </Card>
        </div>

        {/* ✅ Grades List */}
        {grades.length === 0 ? (
          <Card className="card-elegant">
            <CardContent className="py-12 text-center animate-fade-in">
              <div className="relative inline-block mb-4">
                <FileText className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">No Grades Yet</h3>
              <p className="text-slate-500 dark:text-slate-400 font-sans">You don't have any graded assignments yet. Submit your work to see grades here!</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-gradient">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Grade Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {grades.map((grade: any, idx: number) => {
                  const percentage = grade.total_points > 0 
                    ? Math.round((grade.score / grade.total_points) * 100)
                    : 0;
                  const colorClass = percentage >= 80 
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : percentage >= 60
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-red-100 text-red-700 border-red-200';

                  return (
                    <Card key={grade.id || idx} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{grade.assignment_title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{grade.subject_name}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-lg border ${colorClass}`}>
                            <p className="text-lg font-bold">{percentage}%</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Score:</span>
                          <span className="font-semibold">{grade.score} / {grade.total_points}</span>
                        </div>
                        {grade.feedback && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                            <p className="text-xs font-medium text-blue-700 mb-1">Feedback:</p>
                            <p className="text-sm whitespace-pre-wrap">{grade.feedback}</p>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Graded: {new Date(grade.graded_at).toLocaleDateString()}
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

