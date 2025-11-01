'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
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
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8" />
            My Grades
          </h1>
          <p className="text-muted-foreground mt-2">View your grades and feedback</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Graded</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-12 w-12 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Grade</p>
                  <p className="text-2xl font-bold">{stats.average}%</p>
                </div>
                <TrendingUp className="h-12 w-12 text-emerald-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Graded Assignments</p>
                  <p className="text-2xl font-bold">{stats.graded}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grades List */}
        {grades.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No graded assignments yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Grade Details</CardTitle>
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

