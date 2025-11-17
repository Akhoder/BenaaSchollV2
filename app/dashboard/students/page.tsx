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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudentsOptimized } from '@/lib/optimizedQueries';
import { useAuthCheck } from '@/hooks/useAuthCheck';
import { usePagination } from '@/hooks/usePagination';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useDebounce } from '@/hooks/useDebounce';
import { filterBySearch } from '@/lib/tableUtils';
import { getErrorMessage } from '@/lib/errorHandler';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/translations';
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
  LayoutGrid,
  List,
  Globe,
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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

const isSupportedLanguage = (value?: string | null): value is Language =>
  value === 'en' || value === 'ar' || value === 'fr';

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
  const [createLang, setCreateLang] = useState<Language>(language);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editLanguage, setEditLanguage] = useState<Language>(language);
  const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | 'enrolled' | 'notEnrolled'>('all');
  const languageOptions = useMemo(
    () => [
      { value: 'en' as Language, label: t('languageEnglish') },
      { value: 'ar' as Language, label: t('languageArabic') },
      { value: 'fr' as Language, label: t('languageFrench') },
    ],
    [t]
  );
  const getLanguageLabel = useCallback(
    (value?: string | null) => {
      const normalized = isSupportedLanguage(value) ? value : 'en';
      return languageOptions.find((option) => option.value === normalized)?.label || languageOptions[0]?.label || '';
    },
    [languageOptions]
  );

  useEffect(() => {
    setCreateLang(language);
  }, [language]);

  useEffect(() => {
    if (selectedStudent) {
      setEditLanguage(
        isSupportedLanguage(selectedStudent.language_preference)
          ? selectedStudent.language_preference
          : language
      );
    } else {
      setEditLanguage(language);
    }
  }, [selectedStudent, language]);

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
      toast.success(t('studentDeleted'));
        // Optimistic update - realtime will sync
        setStudents(prev => prev.filter(s => s.id !== studentId));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedStudent(null);
    }
  }, [t]);

  // ✅ PERFORMANCE: Filter students using debounced search query
  const filteredStudents = useMemo(() => {
    let result = filterBySearch(students, debouncedSearchQuery, (student) => [
      student.full_name,
      student.email,
      student.phone || '',
    ]);

    if (enrollmentFilter === 'enrolled') {
      result = result.filter((student) => (student.enrolled_classes || 0) > 0);
    } else if (enrollmentFilter === 'notEnrolled') {
      result = result.filter((student) => (student.enrolled_classes || 0) === 0);
    }

    return result;
  }, [students, debouncedSearchQuery, enrollmentFilter]);

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
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, enrollmentFilter, setCurrentPage]);

  const stats = {
    total: students.length,
    enrolled: students.filter((s) => (s.enrolled_classes || 0) > 0).length,
    notEnrolled: students.filter((s) => (s.enrolled_classes || 0) === 0).length,
    averageGrade: 'B+',
  };

  const statsConfig = useMemo(
    () => [
      {
        title: t('totalStudents'),
        value: stats.total,
        subtitle: t('allStudentsLabel'),
        icon: Users,
        accent: 'from-success to-success-light',
      },
      {
        title: t('enrolled'),
        value: stats.enrolled,
        subtitle: t('inClasses'),
        icon: BookOpen,
        accent: 'from-info to-info-light',
      },
      {
        title: t('notEnrolled'),
        value: stats.notEnrolled,
        subtitle: t('needEnrollment'),
        icon: User,
        accent: 'from-amber-500 to-orange-500',
      },
      {
        title: t('averageGrade'),
        value: stats.averageGrade,
        subtitle: t('overallAverage'),
        icon: Award,
        accent: 'from-fuchsia-500 to-rose-500',
      },
    ],
    [stats, t]
  );

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
          title={t('studentsManagement')}
          description={t('studentsManagementDescription')}
          gradient="from-emerald-600 via-teal-600 to-emerald-700"
        >
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as 'list' | 'grid')}
            className="rounded-full border border-emerald-100/60 bg-emerald-900/20 p-1 text-white backdrop-blur-lg shadow-inner shadow-emerald-900/30"
            aria-label={t('viewMode')}
          >
            <ToggleGroupItem
              value="list"
              className="flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-800 data-[state=on]:shadow-lg data-[state=on]:shadow-emerald-500/30 text-white/80 hover:text-white"
            >
              <List className="h-4 w-4" />
              {t('listView')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="grid"
              className="flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-800 data-[state=on]:shadow-lg data-[state=on]:shadow-emerald-500/30 text-white/80 hover:text-white"
            >
              <LayoutGrid className="h-4 w-4" />
              {t('gridView')}
            </ToggleGroupItem>
          </ToggleGroup>
          {profile?.role === 'admin' && (
            <Button 
              onClick={() => setCreateOpen(true)}
              className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-lg transition-all duration-300 hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2 animate-pulse-glow" />
              {t('addStudent')}
            </Button>
          )}
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
          {statsConfig.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="card-interactive">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground font-sans">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 bg-gradient-to-br ${stat.accent} rounded-lg`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display text-slate-900 dark:text-white">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">{stat.subtitle}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and Filters */}
        <Card className="card-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-500" />
              <CardTitle className="font-display">{t('searchAndFilter')}</CardTitle>
            </div>
            <CardDescription className="font-sans">
              {t('searchStudentsHelper')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t('searchStudentsPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 font-sans input-modern"
              />
            </div>
            <div className="grid gap-4 pt-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('enrollmentFilterLabel')}
                </label>
                <Select value={enrollmentFilter} onValueChange={(value) => setEnrollmentFilter(value as 'all' | 'enrolled' | 'notEnrolled')}>
                  <SelectTrigger className="mt-1 font-sans">
                    <SelectValue placeholder={t('enrollmentFilterLabel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('filterAllEnrollment')}</SelectItem>
                    <SelectItem value="enrolled">{t('filterEnrolled')}</SelectItem>
                    <SelectItem value="notEnrolled">{t('filterNotEnrolled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Student Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{t('addStudent')}</DialogTitle>
              <DialogDescription className="font-sans">{t('createStudentDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium font-sans">{t('fullName')}</label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} className="mt-1 font-sans" />
              </div>
              <div>
                <label className="text-sm font-medium font-sans">{t('email')}</label>
                <Input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="mt-1 font-sans" />
              </div>
              <div>
                <label className="text-sm font-medium font-sans">
                  {t('phone')} ({t('optional')})
                </label>
                <InputMask
                  mask="phone"
                  value={createPhone}
                  onChange={(value) => setCreatePhone(value)}
                  className="mt-1 font-sans"
                  placeholder="+XXX-XXX-XXXX"
                />
              </div>
              <div>
                <label className="text-sm font-medium font-sans">{t('language')}</label>
                <Select value={createLang} onValueChange={(value) => setCreateLang(value as Language)}>
                  <SelectTrigger className="mt-1 font-sans">
                    <SelectValue placeholder={t('language')} />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="font-sans" disabled={savingCreate}>
                {t('cancel')}
              </Button>
              <LoadingButton
                loading={savingCreate}
                onClick={async () => {
                  if (!createName.trim() || !createEmail.trim()) { toast.error(t('nameEmailRequired')); return; }
                  try {
                    setSavingCreate(true);
                    const { error } = await supabase.from('profiles').insert([
                      {
                        full_name: createName.trim(),
                        email: createEmail.trim(),
                        role: 'student',
                        phone: createPhone.trim() || null,
                        language_preference: createLang,
                      }
                    ]);
                    if (error) { toast.error(t('failedToCreateStudent')); return; }
                    toast.success(t('studentCreated'));
                    setCreateOpen(false);
                    setCreateName('');
                    setCreateEmail('');
                    setCreatePhone('');
                    setCreateLang(language);
                    await fetchStudents();
                  } finally { setSavingCreate(false); }
                }}
                className="btn-gradient font-sans"
              >
                {t('create')}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Students List */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="font-display text-gradient">
              {viewMode === 'grid' ? t('studentsGridTitle') : t('studentsTableTitle')} ({filteredStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title={searchQuery ? t('noStudentsFound') : t('noStudentsYet')}
                description={searchQuery ? t('tryAdjustingSearchCriteria') : t('studentsEmptyDescription')}
              />
            ) : viewMode === 'grid' ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedStudents.map((s) => (
                  <Card key={s.id} className="border border-slate-200/70 dark:border-slate-800/70 shadow-sm hover:shadow-lg transition-shadow">
                    <CardHeader className="flex-row items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={s.avatar_url} />
                        <AvatarFallback>{(s.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg font-semibold">{s.full_name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {s.enrolled_classes && s.enrolled_classes > 0 ? t('enrolled') : t('notEnrolled')}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">{s.email}</p>
                        <p className="text-sm text-slate-500">{s.phone || '—'}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            setSelectedStudent(s);
                            setIsDialogOpen(true);
                          }}
                          aria-label={t('edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            setSelectedStudent(s);
                            setDeleteConfirmOpen(true);
                          }}
                          aria-label={t('delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">{t('enrolled')}</p>
                          <p className="text-lg font-semibold">{s.enrolled_classes ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">{t('avgGrade')}</p>
                          <p className="text-lg font-semibold">{s.average_grade ?? '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {t('createdAt')}: {new Date(s.created_at).toLocaleDateString(language === 'ar' ? 'ar' : language === 'fr' ? 'fr-FR' : 'en-US')}
                        </span>
                        <span>
                          {t('code')}: {s.id.slice(0, 8)}...
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead>{t('fullName')}</TableHead>
                      <TableHead>{t('email')}</TableHead>
                      <TableHead>{t('phone')}</TableHead>
                      <TableHead>{t('enrolled')}</TableHead>
                      <TableHead>{t('avgGrade')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
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
                              <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedStudent(s); setIsDialogOpen(true); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedStudent(s); setDeleteConfirmOpen(true); }}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('delete')}
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
          
          {/* ✅ PAGINATION: Add pagination UI */}
          {filteredStudents.length > itemsPerPage && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('showing')} {startIndex + 1} {t('to')} {Math.min(endIndex, filteredStudents.length)} {t('of')}{' '}
                  {filteredStudents.length} {t('students')}
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
              <DialogTitle className="text-2xl font-display">{t('editStudent')}</DialogTitle>
              <DialogDescription className="font-sans">
                {t('editStudentDescription')}
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4 py-4">
                <form id="edit-student-form" className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium font-sans">{t('fullName')}</label>
                    <Input name="full_name" defaultValue={selectedStudent.full_name} className="mt-1 font-sans" />
                  </div>
                  <div>
                    <label className="text-sm font-medium font-sans">{t('email')}</label>
                    <Input name="email" defaultValue={selectedStudent.email} className="mt-1 font-sans" />
                  </div>
                <div className="grid grid-cols-2 gap-4 col-span-2">
                  <div>
                    <label className="text-sm font-medium font-sans">{t('phone')}</label>
                    <Input name="phone" defaultValue={selectedStudent.phone} className="mt-1 font-sans" />
                  </div>
                  <div>
                    <label className="text-sm font-medium font-sans">{t('language')}</label>
                    <Select value={editLanguage} onValueChange={(value) => setEditLanguage(value as Language)}>
                      <SelectTrigger className="mt-1 font-sans">
                        <SelectValue placeholder={t('language')} />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                </form>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                {t('cancel')}
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
                      p_language: editLanguage,
                      p_role: null,
                    });
                    if (error) { toast.error(t('saveFailed')); return; }
                    // Optimistic UI update
                    setStudents(prev => prev.map(s => s.id === selectedStudent.id ? {
                      ...s,
                      full_name,
                      email,
                      phone: phone || undefined,
                      language_preference: editLanguage,
                    } : s));
                    toast.success(t('studentUpdated'));
                    setIsDialogOpen(false);
                    setSelectedStudent(null);
                    // Avoid immediate refetch to prevent stale overwrite when Realtime is off
                  } finally { setSavingEdit(false); }
                }}
              >
                {t('saveChanges')}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{t('confirmDeletion')}</DialogTitle>
              <DialogDescription className="font-sans">
                {t('deleteStudentConfirm')}
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="py-4 space-y-2">
                <p className="font-sans">
                  <strong>{t('fullName')}:</strong> {selectedStudent.full_name}
                </p>
                <p className="font-sans">
                  <strong>{t('email')}:</strong> {selectedStudent.email}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="font-sans">
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedStudent && handleDelete(selectedStudent.id)}
                className="font-sans"
              >
                {t('delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
