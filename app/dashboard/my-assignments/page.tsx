'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Clock, Send, CheckCircle, XCircle, Calendar } from 'lucide-react';
import * as api from '@/lib/supabase';
import { toast } from 'sonner';
import { fetchMyEnrolledClassesWithDetails, fetchSubjectsForClass } from '@/lib/supabase';

export default function MyAssignmentsPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

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
      loadData();
    }
  }, [profile, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get enrolled classes
      const { data: classes } = await fetchMyEnrolledClassesWithDetails();
      if (!classes || classes.length === 0) {
        setAssignments([]);
        return;
      }

      // Get all subjects for enrolled classes
      const subjectsByClass: Record<string, any[]> = {};
      for (const cls of classes) {
        const { data: subjects } = await fetchSubjectsForClass(cls.id);
        subjectsByClass[cls.id] = (subjects || []) as any[];
      }

      // Fetch assignments for all subjects
      const allAssignments: any[] = [];
      const allSubmissions: Record<string, any> = {};
      
      for (const clsId in subjectsByClass) {
        for (const subject of subjectsByClass[clsId]) {
          const { data: assignments, error: assErr } = await api.fetchMyAssignmentsForSubject(subject.id);
          if (assErr) {
            console.error('[MyAssignments] Error loading assignments for subject:', subject.subject_name, assErr);
            continue;
          }
          if (assignments && assignments.length > 0) {
            allAssignments.push(...assignments);
            // Fetch submissions for each assignment
            for (const assignment of assignments) {
              const { data: submission } = await api.fetchSubmissionForAssignment(assignment.id);
              if (submission) {
                allSubmissions[assignment.id] = submission;
              }
            }
          }
        }
      }

      setAssignments(allAssignments);
      setSubmissions(allSubmissions);
    } catch (e) {
      console.error(e);
      toast.error('Error loading assignments');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (t: string) => {
    const labels: Record<string, string> = { homework: 'Homework', quiz: 'Quiz', test: 'Test', project: 'Project' };
    return labels[t] || t;
  };

  const getStatusBadge = (assignment: any, submission: any) => {
    if (submission) {
      if (submission.status === 'graded') {
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            <CheckCircle className="mr-1 h-3 w-3" /> Graded: {submission.score}/{assignment.total_points}
          </Badge>
        );
      }
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          <Send className="mr-1 h-3 w-3" /> Submitted
        </Badge>
      );
    }
    const now = new Date();
    if (assignment.due_date && new Date(assignment.due_date) < now) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
          <XCircle className="mr-1 h-3 w-3" /> Overdue
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="mr-1 h-3 w-3" /> Pending
      </Badge>
    );
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
            My Assignments
          </h1>
          <p className="text-muted-foreground mt-2">View and submit your assignments</p>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No assignments yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {assignments.map((assignment: any) => {
              const submission = submissions[assignment.id];
              return (
                <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{assignment.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{getTypeLabel(assignment.assignment_type)}</Badge>
                          {getStatusBadge(assignment, submission)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {assignment.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{assignment.description}</p>
                    )}
                    <div className="space-y-2 text-xs text-muted-foreground">
                      {assignment.due_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        Points: {assignment.total_points} | Weight: {assignment.grade_weight}
                      </div>
                      {submission && (
                        <div className="flex items-center gap-2">
                          <Send className="h-3 w-3" />
                          Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                        </div>
                      )}
                      {submission?.feedback && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs">
                          <strong>Feedback:</strong> {submission.feedback}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push(`/dashboard/assignments/${assignment.id}/submit`)}
                    >
                      {submission ? 'View Submission' : 'Submit Work'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

