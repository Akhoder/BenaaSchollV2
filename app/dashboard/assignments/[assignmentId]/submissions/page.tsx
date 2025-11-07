'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, CheckCircle, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Force dynamic rendering - this page requires runtime params
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AssignmentSubmissionsPage() {
  const params = useParams();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  useEffect(() => {
    if (!authLoading && profile?.role !== 'student') {
      loadData();
    } else if (!authLoading) {
      router.push('/dashboard');
    }
  }, [authLoading, profile, assignmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch assignment details
      const { data: assn, error: aErr } = await api.supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();
      
      if (aErr || !assn) {
        toast.error('Assignment not found');
        router.push('/dashboard');
        return;
      }
      
      setAssignment(assn);

      // Fetch all submissions
      const { data: subs, error: sErr } = await api.fetchAllSubmissionsForAssignment(assignmentId);
      if (sErr) {
        toast.error('Failed to load submissions');
      } else {
        setSubmissions((subs || []) as any[]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const openGradingDialog = (submission: any) => {
    setSelectedSubmission(submission);
    setScore(submission.score || '');
    setFeedback(submission.feedback || '');
    setGradingDialogOpen(true);
  };

  const handleGradeSubmit = async () => {
    if (!selectedSubmission) return;
    
    try {
      setSubmittingGrade(true);
      const scoreNum = parseFloat(score);
      if (isNaN(scoreNum) || scoreNum < 0) {
        toast.error('Please enter a valid score');
        return;
      }

      const { error } = await api.gradeSubmission(selectedSubmission.id, scoreNum, feedback || '');
      if (error) {
        console.error(error);
        toast.error('Failed to submit grade');
      } else {
        toast.success('Grade submitted successfully');
        setGradingDialogOpen(false);
        setSelectedSubmission(null);
        loadData();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error submitting grade');
    } finally {
      setSubmittingGrade(false);
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

  if (!assignment || !profile || profile.role === 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{assignment.title}</h1>
            <p className="text-muted-foreground mt-2">
              Grade submissions and provide feedback
            </p>
          </div>
        </div>

        {assignment.description && (
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{assignment.description}</p>
              {assignment.instructions && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm font-medium mb-2">Instructions:</p>
                  <p className="text-sm whitespace-pre-wrap">{assignment.instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Submissions ({submissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No submissions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub: any) => (
                  <Card key={sub.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{(sub.student as any)?.full_name || 'Unknown Student'}</CardTitle>
                            <p className="text-sm text-muted-foreground">{(sub.student as any)?.email || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.status === 'graded' && (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle className="mr-1 h-3 w-3" /> Graded
                            </Badge>
                          )}
                          {sub.status === 'submitted' && (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Submitted: {new Date(sub.submitted_at).toLocaleString()}
                        </div>
                        {sub.score !== null && (
                          <div className="flex items-center gap-1 font-medium text-blue-600">
                            Score: {sub.score} / {assignment.total_points}
                          </div>
                        )}
                      </div>

                      {sub.submission_content && (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">Submission:</p>
                          <p className="text-sm whitespace-pre-wrap">{sub.submission_content}</p>
                        </div>
                      )}

                      {sub.feedback && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200">
                          <p className="text-sm font-medium mb-2 text-emerald-700">Feedback:</p>
                          <p className="text-sm whitespace-pre-wrap">{sub.feedback}</p>
                        </div>
                      )}

                      <Button
                        onClick={() => openGradingDialog(sub)}
                        variant={sub.status === 'graded' ? 'outline' : 'default'}
                        className="w-full"
                      >
                        {sub.status === 'graded' ? 'Update Grade' : 'Grade Submission'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={gradingDialogOpen} onOpenChange={setGradingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              Provide a score and feedback for this student&apos;s work
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Score (out of {assignment?.total_points || 100})</Label>
              <Input
                type="number"
                step="0.01"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Enter score"
              />
            </div>
            <div>
              <Label>Feedback</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={8}
                placeholder="Provide detailed feedback..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGradeSubmit} disabled={submittingGrade || !score}>
              {submittingGrade ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                'Submit Grade'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

