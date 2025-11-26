'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { SimplePageLoading } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Send, CheckCircle, XCircle, Calendar, AlertCircle } from 'lucide-react';
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
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" /> {t('graded')}: {submission.score}/{assignment.total_points}
          </Badge>
        );
      }
      return (
        <Badge variant="info" className="gap-1">
          <Send className="h-3 w-3" /> {t('submitted')}
        </Badge>
      );
    }
    const now = new Date();
    if (assignment.due_date && new Date(assignment.due_date) < now) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> {t('overdue')}
        </Badge>
      );
    }
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" /> {t('pending')}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <SimplePageLoading text={t('loadingAssignments')} />
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
          icon={FileText}
          title={t('myAssignments')}
          description={t('viewAndSubmitAssignments')}
          gradient="from-primary to-accent"
        />

        {assignments.length === 0 ? (
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
                    <FileText className="h-16 w-16 mx-auto text-primary animate-float" />
                  </div>
                </div>
                <div className="w-24 h-1 bg-gradient-to-l from-transparent via-secondary to-transparent mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-foreground font-display mb-2">{t('noAssignments')}</h3>
                <p className="text-muted-foreground font-sans">{t('noAssignmentsDescription')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 animate-fade-in-up">
            {assignments.map((assignment: any, index: number) => {
              const submission = submissions[assignment.id];
              const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date() && !submission;
              return (
                <Card 
                  key={assignment.id} 
                  className="glass-card-hover border-primary/10 group overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg flex-shrink-0">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-display text-foreground group-hover:text-primary transition-colors mb-2">
                          {assignment.title}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="islamic" className="gap-1">
                            <FileText className="h-3 w-3" />
                            {getTypeLabel(assignment.assignment_type)}
                          </Badge>
                          {getStatusBadge(assignment, submission)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {assignment.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{assignment.description}</p>
                    )}
                    
                    <div className="space-y-2.5 text-sm">
                      {assignment.due_date && (
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="flex-1">
                            <span className="font-semibold">{t('dueDate')}:</span>{' '}
                            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                              {new Date(assignment.due_date).toLocaleDateString()}
                            </span>
                          </span>
                          {isOverdue && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 text-muted-foreground">
                        <FileText className="h-4 w-4 text-accent flex-shrink-0" />
                        <span>
                          <span className="font-semibold">{t('points')}:</span> {assignment.total_points} | 
                          <span className="font-semibold"> {t('weight')}:</span> {assignment.grade_weight}%
                        </span>
                      </div>
                      {submission && (
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <Send className="h-4 w-4 text-info flex-shrink-0" />
                          <span>
                            <span className="font-semibold">{t('submitted')}:</span>{' '}
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {submission?.feedback && (
                      <div className="p-3 bg-gradient-to-l from-primary/5 to-secondary/5 border border-primary/10 rounded-xl">
                        <p className="text-xs font-semibold text-primary mb-1">{t('feedback')}:</p>
                        <p className="text-sm text-foreground">{submission.feedback}</p>
                      </div>
                    )}

                    <Button
                      variant={submission ? 'outline' : 'default'}
                      className="w-full transition-all duration-300 hover:scale-105"
                      onClick={() => router.push(`/dashboard/assignments/${assignment.id}/submit`)}
                    >
                      {submission ? t('viewSubmission') : t('submitWork')}
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

