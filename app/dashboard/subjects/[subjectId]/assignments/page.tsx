'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2, Clock, Users, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as api from '@/lib/supabase';
import { toast } from 'sonner';


export default function SubjectAssignmentsPage() {
  const params = useParams();
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const subjectId = params.subjectId as string;
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    title: '',
    description: '',
    assignment_type: 'homework',
    grade_weight: '1.00',
    total_points: '100',
    start_date: '',
    due_date: '',
    instructions: '',
    status: 'draft',
  });

  useEffect(() => {
    if (!authLoading && profile) {
      loadAssignments();
    }
  }, [authLoading, profile, subjectId]);

  const loadAssignments = async () => {
    setLoading(true);
    const { data, error } = await api.fetchAssignmentsForSubject(subjectId);
    if (error) {
      console.error(error);
      toast.error('Failed to load assignments');
    } else {
      setAssignments((data || []) as any[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      assignment_type: 'homework',
      grade_weight: '1.00',
      total_points: '100',
      start_date: '',
      due_date: '',
      instructions: '',
      status: 'draft',
    });
    setSelectedAssignment(null);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setForm({
      title: a.title || '',
      description: a.description || '',
      assignment_type: a.assignment_type || 'homework',
      grade_weight: String(a.grade_weight || 1),
      total_points: String(a.total_points || 100),
      start_date: a.start_date ? a.start_date.split('T')[0] : '',
      due_date: a.due_date ? a.due_date.split('T')[0] : '',
      instructions: a.instructions || '',
      status: a.status || 'draft',
    });
    setSelectedAssignment(a);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsCreating(true);
      const { data: userRes } = await api.supabase.auth.getUser();
      if (!userRes?.user) {
        toast.error('Not authenticated');
        return;
      }

      // Validate dates
      if (form.start_date && form.due_date) {
        const start = new Date(form.start_date);
        const due = new Date(form.due_date);
        if (due < start) {
          toast.error('Due date must be after start date');
          return;
        }
      }

      const payload = {
        subject_id: subjectId,
        title: form.title,
        description: form.description || null,
        assignment_type: form.assignment_type,
        grade_weight: parseFloat(form.grade_weight),
        total_points: parseFloat(form.total_points),
        start_date: form.start_date ? `${form.start_date}T00:00:00Z` : null,
        due_date: form.due_date ? `${form.due_date}T23:59:59Z` : null,
        instructions: form.instructions || null,
        status: form.status,
        created_by: userRes.user.id,
      };

      if (selectedAssignment) {
        const { error } = await api.updateAssignment(selectedAssignment.id, payload);
        if (error) {
          console.error(error);
          toast.error('Failed to update assignment');
        } else {
          toast.success('Assignment updated');
          setIsDialogOpen(false);
          loadAssignments();
        }
      } else {
        const { error } = await api.createAssignment(payload);
        if (error) {
          console.error(error);
          toast.error('Failed to create assignment');
        } else {
          toast.success('Assignment created');
          setIsDialogOpen(false);
          loadAssignments();
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment?')) return;
    const { error } = await api.deleteAssignment(id);
    if (error) {
      console.error(error);
      toast.error('Failed to delete assignment');
    } else {
      toast.success('Deleted');
      loadAssignments();
    }
  };

  const getTypeLabel = (t: string) => {
    const labels: Record<string, string> = { homework: 'Homework', quiz: 'Quiz', test: 'Test', project: 'Project' };
    return labels[t] || t;
  };

  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
      closed: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    };
    return colors[s] || '';
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Assignments</h1>
            <p className="text-muted-foreground mt-2">Manage assignments for this subject</p>
          </div>
          {profile?.role !== 'student' && (
            <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="mr-2 h-4 w-4" /> Create Assignment
            </Button>
          )}
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No assignments yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((a: any) => (
              <Card key={a.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{a.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{getTypeLabel(a.assignment_type)}</Badge>
                        <Badge className={getStatusColor(a.status)}>{a.status}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {a.description && <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {a.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(a.due_date).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {a.total_points} pts
                    </div>
                  </div>
                  {profile?.role !== 'student' && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/assignments/${a.id}/submissions`)}>
                        <Eye className="mr-1 h-3 w-3" /> View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                        <Edit className="mr-1 h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(a.id)}>
                        <Trash2 className="mr-1 h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAssignment ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
            <DialogDescription>Manage assignment details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type *</Label>
                <Select value={form.assignment_type} onValueChange={(v) => setForm({ ...form, assignment_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homework">Homework</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade Weight *</Label>
                <Input type="number" step="0.01" value={form.grade_weight} onChange={(e) => setForm({ ...form, grade_weight: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Total Points</Label>
              <Input type="number" value={form.total_points} onChange={(e) => setForm({ ...form, total_points: e.target.value })} />
            </div>
            <div>
              <Label>Instructions</Label>
              <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={4} />
            </div>
            <div>
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isCreating || !form.title || !form.assignment_type}>
              {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (selectedAssignment ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

