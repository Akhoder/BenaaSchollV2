'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Upload, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

export default function SubmitAssignmentPage() {
  const params = useParams();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const assignmentId = params?.assignmentId as string;
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    if (!assignmentId) {
      router.push('/dashboard/my-assignments');
      return;
    }
    
    if (!authLoading && profile?.role === 'student') {
      loadData();
    } else if (!authLoading) {
      router.push('/dashboard');
    }
  }, [authLoading, profile, assignmentId, router]);

  const loadData = async () => {
    if (!assignmentId) {
      return;
    }
    
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
        router.push('/dashboard/my-assignments');
        return;
      }
      
      setAssignment(assn);

      // Fetch existing submission if any
      const { data: sub, error: sErr } = await api.fetchSubmissionForAssignment(assignmentId);
      if (!sErr && sub) {
        setSubmission(sub);
        setContent(sub.submission_content || '');
        setFiles(sub.submission_files || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please provide submission content');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await api.submitAssignment(assignmentId, content, files);
      if (error) {
        console.error(error);
        toast.error('Failed to submit assignment');
      } else {
        toast.success('Assignment submitted successfully!');
        router.push('/dashboard/my-assignments');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error submitting');
    } finally {
      setSubmitting(false);
    }
  };

  // Safety check for build time
  if (!assignmentId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!assignment || !profile || profile.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{assignment.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{assignment.assignment_type}</Badge>
                  <Badge>Points: {assignment.total_points}</Badge>
                </div>
              </div>
              {submission && submission.status === 'graded' && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  <CheckCircle className="mr-1 h-3 w-3" /> Graded
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignment.description && <p className="text-muted-foreground">{assignment.description}</p>}
            {assignment.instructions && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm font-medium mb-2">Instructions:</p>
                <p className="text-sm whitespace-pre-wrap">{assignment.instructions}</p>
              </div>
            )}
            {assignment.due_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                Due: {new Date(assignment.due_date).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        {submission && submission.status === 'graded' && (
          <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="h-5 w-5" /> Grade Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-emerald-700">
                  {submission.score} / {assignment.total_points}
                </p>
                {submission.feedback && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded mt-2">
                    <p className="text-sm whitespace-pre-wrap">{submission.feedback}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Your Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="content">Submission Content *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                placeholder="Write your submission here..."
                disabled={submission?.status === 'graded'}
                className="mt-1 font-sans"
              />
            </div>

            {submission?.status !== 'graded' && (
              <Button
                onClick={handleSubmit}
                disabled={submitting || !content.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> {submission ? 'Update Submission' : 'Submit Assignment'}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

