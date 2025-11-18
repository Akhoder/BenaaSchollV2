'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardLoadingSpinner } from '@/components/LoadingSpinner';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BookOpen, Plus, MoreVertical, Edit, Trash2, Search, FileText, Award, Filter, Users, CheckCircle2, XCircle, UserX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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
  const { t } = useLanguage();
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selected, setSelected] = useState<SubjectRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filters
  const [classFilter, setClassFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  
  const debouncedSearch = useDebounce(search, 300);

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
          .select(`id, class_id, subject_name, teacher_id, created_at, published, classes(class_name), teacher:profiles!teacher_id(full_name)`)
          .order('created_at', { ascending: false }),
      ]);

      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      let subjectsToShow = subjectsRes.data;
      if (profile?.role === 'teacher') {
        subjectsToShow = (subjectsRes.data || []).filter((s: any) => s.teacher_id === profile.id);
      }

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
        // Fallback failed, leave teachersList empty
      }

      const teacherNameById: Record<string, string> = {};
      teachersList.forEach(t => {
        if (t.id) teacherNameById[t.id] = t.full_name;
      });

      const classNameById: Record<string, string> = {};
      (classesRes.data || []).forEach((c: any) => {
        if (c.id) classNameById[c.id] = c.class_name;
      });

      const subjectsWithNames: SubjectRow[] = (subjectsToShow || []).map((s: any) => ({
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
      toast.error(t('failedToLoadSubjects'));
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
        toast.error(t('subjectAndClassRequired'));
        return;
      }
      setIsSaving(true);
      if (selected) {
        const { error } = await supabase
          .from('class_subjects')
          .update({ subject_name: form.subject_name, class_id: form.class_id, teacher_id: form.teacher_id || null })
          .eq('id', selected.id);
        if (error) throw error;
        toast.success(t('subjectUpdated'));
      } else {
        const { error } = await supabase
          .from('class_subjects')
          .insert({ subject_name: form.subject_name, class_id: form.class_id, teacher_id: form.teacher_id || null });
        if (error) throw error;
        toast.success(t('subjectCreated'));
      }
      setIsDialogOpen(false);
      setSelected(null);
      resetForm();
      void loadData();
    } catch (e: any) {
      console.error(e);
      toast.error(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setSubjectToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const onDelete = async () => {
    if (!subjectToDelete) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('class_subjects').delete().eq('id', subjectToDelete);
      if (error) throw error;
      toast.success(t('subjectDeleted'));
      setSubjects(prev => prev.filter(s => s.id !== subjectToDelete));
      setDeleteConfirmOpen(false);
      setSubjectToDelete(null);
      void loadData();
    } catch (e: any) {
      console.error(e);
      toast.error(t('failedToDelete'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = (debouncedSearch || '').toLowerCase();
    let result = subjects.filter((s) => {
      const matchesSearch =
        (s.subject_name || '').toLowerCase().includes(q) ||
        (s.class_name || '').toLowerCase().includes(q) ||
        (s.teacher_name || '').toLowerCase().includes(q);
      
      const matchesClass = classFilter === 'all' || s.class_id === classFilter;
      const matchesTeacher = teacherFilter === 'all' || s.teacher_id === teacherFilter;
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'published' && s.published === true) ||
        (statusFilter === 'unpublished' && s.published !== true);
      
      return matchesSearch && matchesClass && matchesTeacher && matchesStatus;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return (a.subject_name || '').localeCompare(b.subject_name || '');
        case 'name-desc':
          return (b.subject_name || '').localeCompare(a.subject_name || '');
        case 'date-newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [subjects, debouncedSearch, classFilter, teacherFilter, statusFilter, sortBy]);
  
  const stats = useMemo(() => {
    return {
      total: subjects.length,
      published: subjects.filter(s => s.published === true).length,
      unpublished: subjects.filter(s => s.published !== true).length,
      withoutTeacher: subjects.filter(s => !s.teacher_id).length,
    };
  }, [subjects]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubjects = filtered.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, classFilter, teacherFilter, statusFilter]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <DashboardLoadingSpinner
          text={t('loading')}
          subtext={t('loading')}
        />
      </DashboardLayout>
    );
  }

  if (!profile || !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          icon={BookOpen}
          title={t('subjects')}
          description={t('manageSubjects')}
        >
          {profile?.role === 'admin' && (
            <Button 
              onClick={openCreate}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('addSubject')}
            </Button>
          )}
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {t('totalSubjects')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-primary">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t('publishedSubjects')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.published}</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {t('unpublishedSubjects')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-orange-600">{stats.unpublished}</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <UserX className="h-4 w-4" />
                {t('subjectsWithoutTeacher')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-red-600">{stats.withoutTeacher}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="card-interactive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="font-display">{t('search')} & {t('filter')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t('searchBySubjectClassOrTeacher')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 font-sans input-modern"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-sm font-medium font-sans mb-2 block">{t('filterByClass')}</Label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allClasses')}</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.class_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium font-sans mb-2 block">{t('filterByTeacher')}</Label>
                  <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allTeachers')}</SelectItem>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium font-sans mb-2 block">{t('filterByStatus')}</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allStatus')}</SelectItem>
                      <SelectItem value="published">{t('published')}</SelectItem>
                      <SelectItem value="unpublished">{t('draft')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium font-sans mb-2 block">{t('sortBy')}</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">{t('nameAsc')}</SelectItem>
                      <SelectItem value="name-desc">{t('nameDesc')}</SelectItem>
                      <SelectItem value="date-newest">{t('dateNewest')}</SelectItem>
                      <SelectItem value="date-oldest">{t('dateOldest')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive animate-fade-in-up delay-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display">
                <BookOpen className="h-5 w-5 text-primary" />
                {t('subjects')} ({filtered.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <BookOpen className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">{t('noSubjectsFound')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {search ? t('tryAdjustingSearch') : t('noSubjectsAddedYet')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="font-semibold font-sans">{t('subject')}</TableHead>
                      <TableHead className="font-semibold font-sans">{t('classes')}</TableHead>
                      <TableHead className="font-semibold font-sans">{t('teacher')}</TableHead>
                      <TableHead className="font-semibold font-sans">{t('published')}</TableHead>
                      <TableHead className="text-right font-semibold font-sans">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubjects.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.subject_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-sans">{s.class_name || '—'}</Badge>
                        </TableCell>
                        <TableCell className="font-sans">
                          {s.teacher_name ? (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{s.teacher_name}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              {t('unassigned')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={s.published ? 'default' : 'secondary'} className="font-sans">
                              {s.published ? t('published') : t('draft')}
                            </Badge>
                            <Switch
                              checked={(s as any).published === true}
                              onCheckedChange={async (val) => {
                                const { error } = await supabase
                                  .from('class_subjects')
                                  .update({ published: val })
                                  .eq('id', s.id);
                                if (error) {
                                  toast.error(t('failedToUpdate'));
                                } else {
                                  setSubjects(prev => prev.map(x => x.id === s.id ? { ...x, published: val } as any : x));
                                }
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="font-display">{t('actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {profile?.role === 'admin' && (
                                <>
                                  <DropdownMenuItem onClick={() => openEdit(s)}>
                                    <Edit className="mr-2 h-4 w-4" /> {t('edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(s.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/subjects/${s.id}/lessons`)}>
                                <BookOpen className="mr-2 h-4 w-4" /> {t('lessons')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/subjects/${s.id}/assignments`)}>
                                <FileText className="mr-2 h-4 w-4" /> {t('assignments')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/subjects/${s.id}/certificates`)}>
                                <Award className="mr-2 h-4 w-4" /> {t('certificates')}
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
          
          {filtered.length > itemsPerPage && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('showingResults')
                    .replace('{start}', String(startIndex + 1))
                    .replace('{end}', String(Math.min(endIndex, filtered.length)))
                    .replace('{total}', String(filtered.length))}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(totalPages)}
                            className="cursor-pointer"
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{selected ? t('editSubject') : t('addSubject')}</DialogTitle>
              <DialogDescription className="font-sans">
                {selected ? t('updateSubjectInfo') : t('createNewSubjectForClass')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div>
                <Label className="text-sm font-medium font-sans">{t('subjectName')} *</Label>
                <Input
                  value={form.subject_name}
                  onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                  placeholder="e.g., Mathematics, Physics"
                  className="mt-1 font-sans"
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-medium font-sans">{t('classes')} *</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger className="mt-1 font-sans">
                    <SelectValue placeholder={t('selectClass')} />
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
                <Label className="text-sm font-medium font-sans">{t('teacher')} ({t('optional')})</Label>
                <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                  <SelectTrigger className="mt-1 font-sans">
                    <SelectValue placeholder={t('selectTeacher')} />
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
                {t('cancel')}
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-white font-sans" onClick={onSave} disabled={isSaving || !form.subject_name || !form.class_id}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  selected ? t('update') : t('create')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display text-red-600">{t('deleteSubject')}</DialogTitle>
              <DialogDescription className="font-sans">
                {t('deleteSubjectConfirm')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setSubjectToDelete(null);
                }}
                className="font-sans"
                disabled={isDeleting}
              >
                {t('cancel')}
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white font-sans" 
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('confirm')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}


