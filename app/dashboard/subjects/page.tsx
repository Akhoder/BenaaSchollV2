'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BookOpen, Plus, MoreVertical, Edit, Trash2, Search, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SubjectRow {
  id: string;
  class_id: string;
  subject_name: string;
  teacher_id: string | null;
  created_at: string;
  class_name?: string;
  teacher_name?: string;
  published?: boolean;
}

interface ClassRow { id: string; class_name: string; }
interface TeacherRow { id: string; full_name: string; }

export default function SubjectsPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selected, setSelected] = useState<SubjectRow | null>(null);

  const [form, setForm] = useState({
    subject_name: '',
    class_id: '',
    teacher_id: '',
  });

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile && ['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      void loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes] = await Promise.all([
        supabase.from('classes').select('id, class_name').order('created_at', { ascending: false }),
        supabase
          .from('class_subjects')
          .select(`id, class_id, subject_name, teacher_id, created_at, published, classes(class_name), teacher:profiles!teacher_id(full_name)`) // include published
          .order('created_at', { ascending: false }),
      ]);

      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      // Load teachers using admin RPC first, fallback to direct query
      let teachersList: TeacherRow[] = [];
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_profiles');
        if (!rpcError && rpcData) {
          teachersList = (rpcData as any[])
            .filter((p) => p.role === 'teacher')
            .map((p) => ({ id: p.id, full_name: p.full_name }));
        } else {
          const teachersRes = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('role', 'teacher')
            .order('full_name', { ascending: true });
          if (!teachersRes.error && teachersRes.data) {
            teachersList = teachersRes.data.map((p: any) => ({ id: p.id, full_name: p.full_name }));
          }
        }
      } catch (e) {
        // ignore and leave teachersList empty if both fail
      }

      // Build a quick lookup for teacher names
      const teacherNameById: Record<string, string> = {};
      teachersList.forEach(t => {
        if (t.id) teacherNameById[t.id] = t.full_name;
      });

      // Build a quick lookup for class names
      const classNameById: Record<string, string> = {};
      (classesRes.data || []).forEach((c: any) => {
        if (c.id) classNameById[c.id] = c.class_name;
      });

      const subjectsWithNames: SubjectRow[] = (subjectsRes.data || []).map((s: any) => ({
        id: s.id,
        class_id: s.class_id,
        subject_name: s.subject_name,
        teacher_id: s.teacher_id,
        created_at: s.created_at,
        published: s.published,
        class_name: s.classes?.class_name ?? classNameById[s.class_id],
        teacher_name: s.teacher?.full_name ?? (s.teacher_id ? teacherNameById[s.teacher_id] : undefined),
      }));

      setClasses((classesRes.data || []) as any);
      setTeachers(teachersList);
      setSubjects(subjectsWithNames);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm({ subject_name: '', class_id: '', teacher_id: '' });

  const openCreate = () => {
    setSelected(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (row: SubjectRow) => {
    setSelected(row);
    setForm({
      subject_name: row.subject_name || '',
      class_id: row.class_id || '',
      teacher_id: row.teacher_id || '',
    });
    setIsDialogOpen(true);
  };

  const onSave = async () => {
    try {
      if (!form.subject_name || !form.class_id) {
        toast.error('Subject and class are required');
        return;
      }
      setIsSaving(true);
      if (selected) {
        const { error } = await supabase
          .from('class_subjects')
          .update({ subject_name: form.subject_name, class_id: form.class_id, teacher_id: form.teacher_id || null })
          .eq('id', selected.id);
        if (error) throw error;
        toast.success('Subject updated');
      } else {
        const { error } = await supabase
          .from('class_subjects')
          .insert({ subject_name: form.subject_name, class_id: form.class_id, teacher_id: form.teacher_id || null });
        if (error) throw error;
        toast.success('Subject created');
      }
      setIsDialogOpen(false);
      setSelected(null);
      resetForm();
      void loadData();
    } catch (e: any) {
      console.error(e);
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('class_subjects').delete().eq('id', id);
      if (error) throw error;
      toast.success('Subject deleted');
      // Optimistic update to reflect deletion immediately
      setSubjects(prev => prev.filter(s => s.id !== id));
      void loadData();
    } catch (e: any) {
      console.error(e);
      toast.error('Delete failed');
    }
  };

  const filtered = useMemo(() => {
    const q = (search || '').toLowerCase();
    return subjects.filter((s) =>
      (s.subject_name || '').toLowerCase().includes(q) ||
      (s.class_name || '').toLowerCase().includes(q) ||
      (s.teacher_name || '').toLowerCase().includes(q)
    );
  }, [subjects, search]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-sans">Loading subjects...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              Subjects
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 font-sans">
              Manage class subjects and assignments
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
              onClick={openCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-500" />
              <CardTitle className="font-display">Search Subjects</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by subject, class or teacher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 font-sans"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                Subjects ({filtered.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-4 text-slate-500 dark:text-slate-400 font-sans">No subjects found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="font-semibold font-sans">Subject</TableHead>
                      <TableHead className="font-semibold font-sans">Class</TableHead>
                      <TableHead className="font-semibold font-sans">Teacher</TableHead>
                      <TableHead className="font-semibold font-sans">Published</TableHead>
                      <TableHead className="text-right font-semibold font-sans">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.subject_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-sans">{s.class_name || '—'}</Badge>
                        </TableCell>
                        <TableCell className="font-sans">{s.teacher_name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Switch
                            checked={(s as any).published === true}
                            onCheckedChange={async (val) => {
                              const { error } = await supabase
                                .from('class_subjects')
                                .update({ published: val })
                                .eq('id', s.id);
                              if (error) {
                                toast.error('Failed to update');
                              } else {
                                setSubjects(prev => prev.map(x => x.id === s.id ? { ...x, published: val } as any : x));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="font-display">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(s)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/subjects/${s.id}/lessons`)}>
                                <BookOpen className="mr-2 h-4 w-4" /> Lessons
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => onDelete(s.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{selected ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
              <DialogDescription className="font-sans">
                {selected ? 'Update subject info' : 'Create a new subject for a class'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div>
                <Label className="text-sm font-medium font-sans">Subject Name *</Label>
                <Input
                  value={form.subject_name}
                  onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                  placeholder="e.g., Mathematics, Physics"
                  className="mt-1 font-sans"
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-medium font-sans">Class *</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger className="mt-1 font-sans">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium font-sans">Teacher (optional)</Label>
                <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                  <SelectTrigger className="mt-1 font-sans">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                Cancel
              </Button>
              <Button onClick={onSave} disabled={isSaving || !form.subject_name || !form.class_id} className="font-sans">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  selected ? 'Update' : 'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}


