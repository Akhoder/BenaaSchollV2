'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { DashboardStatsSkeleton, TableSkeleton, PageHeaderSkeleton } from '@/components/SkeletonLoaders';
import { ResponsiveTable } from '@/components/ResponsiveTable';
import { ErrorDisplay, EmptyState } from '@/components/ErrorDisplay';
import { InputMask } from '@/components/InputMask';
import { LoadingButton } from '@/components/ProgressIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudentsOptimized } from '@/lib/optimizedQueries';
import { useAuthCheck } from '@/hooks/useAuthCheck';
import { usePagination } from '@/hooks/usePagination';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useDebounce } from '@/hooks/useDebounce';
import { filterBySearch } from '@/lib/tableUtils';
import { getErrorMessage } from '@/lib/errorHandler';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  User,
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  Users,
  BookOpen,
  Award,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
// duplicate import removed

interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  language_preference: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  enrolled_classes?: number;
  average_grade?: string;
}

export default function StudentsPage() {
  const { profile, loading: authLoading, isAuthorized } = useAuthCheck({
    requiredRole: ['admin', 'teacher', 'supervisor'],
  });
  const { t, language } = useLanguage();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // ✅ PERFORMANCE: Debounce search to reduce re-renders
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createLang, setCreateLang] = useState('ar');
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch students function with optimistic loading
  const fetchStudents = useCallback(async () => {
    if (!profile) return;
    
    try {
      // ✅ PERFORMANCE: Only show loading if no cached data
      const { data: allStudents, error, fromCache } = await getStudentsOptimized(
        profile.role || 'student', 
        profile.id
      );
      
      // ✅ OPTIMISTIC LOADING: Don't show loading if data is from cache
      if (!fromCache) {
        setLoading(true);
      }
      
      if (error) {
        console.error('Error fetching students:', error);
        if (!fromCache) {
          toast.error(getErrorMessage(error));
        }
        setStudents([]);
        return;
      }
      
      if (allStudents && allStudents.length > 0) {
        // ✅ OPTIMIZED: Single query for all enrollments
        const studentIds = allStudents.map((s: any) => s.id);
        const { data: allEnrollments, error: enrollError } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .in('student_id', studentIds);
        
        if (enrollError) {
          console.error('Error fetching enrollments:', enrollError);
        }
        
        // Count enrollments per student
        const enrollCounts = (allEnrollments || []).reduce((acc: Record<string, number>, row: any) => {
          acc[row.student_id] = (acc[row.student_id] || 0) + 1;
          return acc;
        }, {});
        
        // Map enrollments to students
        const processedStudents = allStudents.map((student: any) => ({
          ...student,
          enrolled_classes: enrollCounts[student.id] || 0,
          average_grade: '85.5',
        }));
        
        setStudents(processedStudents);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(getErrorMessage(err));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // ✅ PERFORMANCE: Fetch students immediately when authorized
  useEffect(() => {
    if (isAuthorized && profile) {
      // Start fetching immediately - don't wait for render
      fetchStudents();
    }
  }, [isAuthorized, profile?.id, fetchStudents]);

  // Realtime updates using custom hook
  const handleUpdate = useCallback((row: any) => {
    setStudents(prev => prev.map(s => s.id === row.id ? { ...s, ...row } : s));
  }, []);
  
  const handleInsert = useCallback((row: any) => {
    if (row.role === 'student') {
      setStudents(prev => [{ ...row, enrolled_classes: 0, average_grade: '85.5' }, ...prev]);
    }
  }, []);
  
  const handleDeleteRealtime = useCallback((row: any) => {
    setStudents(prev => prev.filter(s => s.id !== row.id));
  }, []);

  useRealtimeSubscription({
    table: 'profiles',
    event: '*',
    enabled: isAuthorized ?? false,
    onUpdate: handleUpdate,
    onInsert: handleInsert,
    onDelete: handleDeleteRealtime,
  });

  const handleDelete = useCallback(async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', studentId);

      if (error) {
        toast.error(getErrorMessage(error));
      } else {
        toast.success('Student deleted successfully');
        // Optimistic update - realtime will sync
        setStudents(prev => prev.filter(s => s.id !== studentId));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedStudent(null);
    }
  }, []);

  // ✅ PERFORMANCE: Filter students using debounced search query
  const filteredStudents = useMemo(() => {
    return filterBySearch(students, debouncedSearchQuery, (student) => [
      student.full_name,
      student.email,
      student.phone || '',
    ]);
  }, [students, debouncedSearchQuery]);

  // Use pagination hook
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems: paginatedStudents,
    startIndex,
    endIndex,
    itemsPerPage,
  } = usePagination(filteredStudents, { itemsPerPage: 20 });

  const stats = {
    total: students.length,
    enrolled: students.filter((s) => (s.enrolled_classes || 0) > 0).length,
    notEnrolled: students.filter((s) => (s.enrolled_classes || 0) === 0).length,
    averageGrade: 'B+',
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeaderSkeleton />
          <DashboardStatsSkeleton />
          <Card>
            <CardHeader>
              <CardTitle>{t('students')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} cols={5} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Enhanced Header */}
        <PageHeader 
          icon={GraduationCap}
          title={`${t('students')} Management`}
          description="Manage and track all students in the system"
          gradient="from-emerald-600 via-teal-600 to-emerald-700"
        >
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
          >
            <Users className="h-4 w-4 mr-2" />
            Toggle View
          </Button>
          {profile?.role === 'admin' && (
            <Button 
              onClick={() => setCreateOpen(true)}
              className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-lg transition-all duration-300 hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2 animate-pulse-glow" />
              Add Student
            </Button>
          )}
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
          <Card className="card-interactive">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground font-sans">
                Total Students
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-success to-success-light rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-success">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1 font-sans">All students</p>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground font-sans">
                Enrolled
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-info to-info-light rounded-lg">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-info">{stats.enrolled}</div>
              <p className="text-xs text-muted-foreground mt-1 font-sans">In classes</p>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Not Enrolled
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                <User className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-amber-600">{stats.notEnrolled}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Need enrollment</p>
            </CardContent>
          </Card>

          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                Average Grade
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Award className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-purple-600">{stats.averageGrade}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Overall average</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="card-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-500" />
              <CardTitle className="font-display">Search & Filter</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 font-sans input-modern"
              />
            </div>
          </CardContent>
        </Card>

        {/* Create Student Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Add Student</DialogTitle>
              <DialogDescription className="font-sans">Create a new student profile</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium font-sans">Full Name</label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} className="mt-1 font-sans" />
              </div>
              <div>
                <label className="text-sm font-medium font-sans">Email</label>
                <Input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="mt-1 font-sans" />
              </div>
              <div>
                <label className="text-sm font-medium font-sans">Phone (optional)</label>
                <InputMask
                  mask="phone"
                  value={createPhone}
                  onChange={(value) => setCreatePhone(value)}
                  className="mt-1 font-sans"
                  placeholder="+XXX-XXX-XXXX"
                />
              </div>
              <div>
                <label className="text-sm font-medium font-sans">Language</label>
                <Select value={createLang} onValueChange={setCreateLang}>
                  <SelectTrigger className="mt-1 font-sans">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="font-sans" disabled={savingCreate}>Cancel</Button>
              <LoadingButton
                loading={savingCreate}
                onClick={async () => {
                  if (!createName.trim() || !createEmail.trim()) { toast.error('Name and email are required'); return; }
                  try {
                    setSavingCreate(true);
                    const { error } = await supabase.from('profiles').insert([
                      {
                        full_name: createName.trim(),
                        email: createEmail.trim(),
                        role: 'student',
                        phone: createPhone.trim() || null,
                        language_preference: createLang as any,
                      }
                    ]);
                    if (error) { toast.error('Create failed'); return; }
                    toast.success('Student created');
                    setCreateOpen(false);
                    setCreateName(''); setCreateEmail(''); setCreatePhone(''); setCreateLang('ar');
                    await fetchStudents();
                  } finally { setSavingCreate(false); }
                }}
                className="btn-gradient font-sans"
              >
                Create
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Students List */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="font-display text-gradient">Students ({filteredStudents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title={searchQuery ? 'No students found' : 'No students yet'}
                description={searchQuery ? 'Try adjusting your search criteria' : 'No students have been added yet'}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead>Avg Grade</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={s.avatar_url} />
                              <AvatarFallback>{(s.full_name||'?').charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{s.full_name}</div>
                              <div className="text-xs text-slate-500">{s.id.slice(0,8)}...</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell>{s.phone || '—'}</TableCell>
                        <TableCell>{s.enrolled_classes ?? 0}</TableCell>
                        <TableCell>{s.average_grade ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedStudent(s); setIsDialogOpen(true); }}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedStudent(s); setDeleteConfirmOpen(true); }}>Delete</DropdownMenuItem>
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
          
          {/* ✅ PAGINATION: Add pagination UI */}
          {filteredStudents.length > itemsPerPage && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
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

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Edit Student</DialogTitle>
              <DialogDescription className="font-sans">
                Update student information and details
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4 py-4">
                <form id="edit-student-form" className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium font-sans">Full Name</label>
                    <Input name="full_name" defaultValue={selectedStudent.full_name} className="mt-1 font-sans" />
                  </div>
                  <div>
                    <label className="text-sm font-medium font-sans">Email</label>
                    <Input name="email" defaultValue={selectedStudent.email} className="mt-1 font-sans" />
                  </div>
                <div className="grid grid-cols-2 gap-4 col-span-2">
                  <div>
                    <label className="text-sm font-medium font-sans">Phone</label>
                    <Input name="phone" defaultValue={selectedStudent.phone} className="mt-1 font-sans" />
                  </div>
                  <div>
                    <label className="text-sm font-medium font-sans">Language</label>
                    <Select defaultValue={selectedStudent.language_preference}>
                      <SelectTrigger className="mt-1 font-sans">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                </form>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                Cancel
              </Button>
              <LoadingButton
                loading={savingEdit}
                className="btn-gradient font-sans"
                onClick={async () => {
                  if (!selectedStudent) return;
                  try {
                    setSavingEdit(true);
                    // Simple update: only example fields
                    const form = document.querySelector('#edit-student-form') as HTMLFormElement | null;
                    const full_name = (form?.querySelector('[name="full_name"]') as HTMLInputElement | null)?.value || selectedStudent.full_name;
                    const email = (form?.querySelector('[name="email"]') as HTMLInputElement | null)?.value || selectedStudent.email;
                    const phone = (form?.querySelector('[name="phone"]') as HTMLInputElement | null)?.value || selectedStudent.phone || null;
                    const { error } = await supabase.rpc('admin_update_profile', {
                      p_id: selectedStudent.id,
                      p_full_name: full_name || null,
                      p_email: email || null,
                      p_phone: phone || null,
                      p_language: null,
                      p_role: null,
                    });
                    if (error) { toast.error('Save failed'); return; }
                    // Optimistic UI update
                    setStudents(prev => prev.map(s => s.id === selectedStudent.id ? {
                      ...s,
                      full_name,
                      email,
                      phone: phone || undefined,
                    } : s));
                    toast.success('Student updated');
                    setIsDialogOpen(false);
                    setSelectedStudent(null);
                    // Avoid immediate refetch to prevent stale overwrite when Realtime is off
                  } finally { setSavingEdit(false); }
                }}
              >
                Save Changes
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Confirm Deletion</DialogTitle>
              <DialogDescription className="font-sans">
                Are you sure you want to delete this student? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="py-4 space-y-2">
                <p className="font-sans">
                  <strong>Name:</strong> {selectedStudent.full_name}
                </p>
                <p className="font-sans">
                  <strong>Email:</strong> {selectedStudent.email}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="font-sans">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedStudent && handleDelete(selectedStudent.id)}
                className="font-sans"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
