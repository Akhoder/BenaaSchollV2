'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import { useDebounce } from '@/hooks/useDebounce';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSpinner';
import { EmptyState, ErrorDisplay } from '@/components/ErrorDisplay';
import { OptimizedImage } from '@/components/OptimizedImage';
import { LoadingButton } from '@/components/ProgressIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  School,
  Calendar,
  Users,
  BookOpen,
  Image,
  Target,
  FileText,
  Loader2,
  MoreVertical,
  Eye,
} from 'lucide-react';
import { supabase, uploadClassImage } from '@/lib/supabase';
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

interface ClassData {
  id: string;
  class_code: string;
  class_name: string;
  start_date: string;
  end_date?: string;
  level: number;
  image_url?: string;
  goals: string;
  notes?: string;
  teacher_id?: string;
  supervisor_id?: string;
  created_at: string;
  updated_at: string;
  teacher_name?: string;
  supervisor_name?: string;
  student_count?: number;
  published?: boolean;
}

export default function ClassesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const dateLocale = useMemo(
    () => (language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US'),
    [language]
  );
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // ✅ PERFORMANCE: Debounce search to reduce re-renders
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isCreating, setIsCreating] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    level: 1,
    image_url: '',
    objectives: '',
    notes: '',
    teacher_id: '',
    supervisor_id: '',
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    // Reset input
    e.target.value = '';
    
    try {
      setIsUploading(true);
      if (!profile?.id) return;
      
      const { data, error } = await uploadClassImage(file, profile.id);
      
      if (error) {
        console.error('Upload error:', error);
        toast.error(t('failedToUploadImage' as TranslationKey));
        return;
      }
      
      if (data?.publicUrl) {
        setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
        toast.success(t('imageUploadedSuccessfully' as TranslationKey));
      }
    } catch (err) {
      console.error('Unexpected upload error:', err);
      toast.error(t('unexpectedError'));
    } finally {
      setIsUploading(false);
    }
  };

  const formatDateForInput = (value?: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  const prefillFormFromClass = (c: ClassData) => {
    setFormData({
      name: c.class_name || '',
      start_date: formatDateForInput(c.start_date),
      end_date: formatDateForInput(c.end_date || ''),
      level: c.level || 1,
      image_url: c.image_url || '',
      objectives: c.goals || '',
      notes: c.notes || '',
      teacher_id: c.teacher_id || '',
      supervisor_id: c.supervisor_id || '',
    });
  };

  useEffect(() => {
    if (isDialogOpen && selectedClass) {
      setFormData({
        name: selectedClass.class_name || '',
        start_date: formatDateForInput(selectedClass.start_date),
        end_date: formatDateForInput(selectedClass.end_date || ''),
        level: selectedClass.level || 1,
        image_url: selectedClass.image_url || '',
        objectives: selectedClass.goals || '',
        notes: selectedClass.notes || '',
        teacher_id: selectedClass.teacher_id || '',
        supervisor_id: selectedClass.supervisor_id || '',
      });
    }
    if (isDialogOpen && !selectedClass) {
      resetForm();
    }
  }, [isDialogOpen, selectedClass]);

  // ✅ PERFORMANCE: Memoize fetchClasses to prevent unnecessary re-renders
  // ✅ FIX: Define fetchClasses BEFORE useEffect that uses it
  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      
      // محاولة إنشاء الجدول أولاً إذا لم يكن موجوداً
      const { error: createError } = await supabase
        .from('classes')
        .select('id')
        .limit(1);
      
      if (createError && createError.code === 'PGRST116') {
        // الجدول غير موجود، عرض رسالة للمستخدم
        toast.error(t('classesTableNotFound' as TranslationKey));
        setClasses([]);
        return;
      }
      
      // استخدام الاستعلام المباشر
      const { data, error } = await supabase
        .from('classes')
        .select('*, teacher:profiles!teacher_id(full_name), supervisor:profiles!supervisor_id(full_name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching classes:', error);
        toast.error(t('failedToFetchClasses'));
        return;
      }

      // ✅ FIX: Get all enrollment counts in ONE query instead of N queries
      const classIds = (data || []).map(cls => cls.id);
      
      let enrollmentCounts: Record<string, number> = {};
      
      if (classIds.length > 0) {
        // Single query to get all enrollment counts for all classes
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('class_id')
          .in('class_id', classIds);
        
        // Count enrollments per class
        enrollmentCounts = (enrollments || []).reduce((acc: Record<string, number>, row: any) => {
          acc[row.class_id] = (acc[row.class_id] || 0) + 1;
          return acc;
        }, {});
      }
      
      // Map counts to classes
      const classesWithCounts = (data || []).map(cls => ({
        ...cls,
        teacher_name: cls.teacher?.full_name || t('unassigned'),
        supervisor_name: cls.supervisor?.full_name || t('unassigned'),
        student_count: enrollmentCounts[cls.id] || 0,
      }));
      
      setClasses(classesWithCounts);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ PERFORMANCE: Optimize dependencies - only depend on profile.id and authLoading
  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }

    // Check if user has access (admin, teacher, or supervisor)
    if (authLoading === false && profile && !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }

    if (profile && ['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      fetchClasses();
    }
  }, [profile?.id, profile?.role, authLoading, fetchClasses, router]);

  const generateClassCode = () => {
    const prefix = 'CLS';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleSaveClass = async () => {
    try {
      setIsCreating(true);
      
      if (selectedClass) {
        const { error } = await supabase
          .from('classes')
          .update({
            class_name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            level: formData.level,
            image_url: formData.image_url || null,
            goals: formData.objectives,
            notes: formData.notes || null,
            teacher_id: formData.teacher_id || null,
            supervisor_id: formData.supervisor_id || null,
          })
          .eq('id', selectedClass.id);
        
        if (error) {
          console.error('Error updating class:', error);
          toast.error(t('failedToUpdateClass'));
        } else {
          toast.success(t('classUpdatedSuccessfully'));
          setIsDialogOpen(false);
          setSelectedClass(null);
          resetForm();
          fetchClasses();
        }
      } else {
        const classCode = generateClassCode();
        const { error } = await supabase
          .from('classes')
          .insert({
            class_code: classCode,
            class_name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            level: formData.level,
            image_url: formData.image_url || null,
            goals: formData.objectives,
            notes: formData.notes || null,
            teacher_id: formData.teacher_id || null,
            supervisor_id: formData.supervisor_id || null,
          });

        if (error) {
          console.error('Error creating class:', error);
          toast.error(t('failedToCreateClass'));
        } else {
          toast.success(t('classCreatedSuccessfully'));
          setIsDialogOpen(false);
          resetForm();
          fetchClasses();
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(t('error'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) {
        toast.error(t('failedToDeleteClass'));
      } else {
        toast.success(t('classDeletedSuccessfully'));
        fetchClasses();
      }
    } catch (err) {
      toast.error(t('error'));
    }
    setDeleteConfirmOpen(false);
    setSelectedClass(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      level: 1,
      image_url: '',
      objectives: '',
      notes: '',
      teacher_id: '',
      supervisor_id: '',
    });
  };

  // ✅ PERFORMANCE: Use debounced search and memoize filtered results
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchesSearch =
        (cls.class_name || '').toLowerCase().includes((debouncedSearchQuery || '').toLowerCase()) ||
        (cls.class_code || '').toLowerCase().includes((debouncedSearchQuery || '').toLowerCase()) ||
        (cls.teacher_name || '').toLowerCase().includes((debouncedSearchQuery || '').toLowerCase());
      return matchesSearch;
    });
  }, [classes, debouncedSearchQuery]);

  // ✅ PAGINATION: Add pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const totalPages = Math.max(1, Math.ceil((filteredClasses.length || 0) / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClasses = filteredClasses.slice(startIndex, endIndex);

  // ✅ PERFORMANCE: Reset page when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  const stats = {
    total: classes.length,
    active: classes.filter((c) => !c.end_date || new Date(c.end_date) > new Date()).length,
    completed: classes.filter((c) => c.end_date && new Date(c.end_date) <= new Date()).length,
    totalStudents: classes.reduce((sum, c) => sum + (c.student_count || 0), 0),
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <PageLoading
          text={t('loadingClasses')}
          statsCount={4}
          contentType={viewMode === 'grid' ? 'grid' : 'table'}
          contentRows={5}
        />
      </DashboardLayout>
    );
  }

  if (!profile || !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
    return null;
  }

  // إذا لم يتم العثور على الجداول، اعرض رسالة توضيحية
  if (classes.length === 0 && !loading && !authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          {/* ✨ Enhanced Header - Islamic Design */}
          <div className="bg-gradient-to-l from-primary to-accent rounded-2xl p-6 text-white shadow-xl shadow-primary/20">
            <h1 className="text-3xl font-display font-bold tracking-tight">
              {t('classManagement')}
            </h1>
            <p className="text-white/80 mt-1 text-lg font-medium font-sans">
              {t('manageClassesAndEnrollments' as TranslationKey)}
            </p>
          </div>

          <Card className="glass-card border-primary/10">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <School className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t('databaseSetupRequired')}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t('classesTableNeedsToBeCreated')}
                </p>
              </div>

              <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-6 text-right mb-6 border border-primary/10">
                <h4 className="font-semibold text-foreground mb-4">
                  {t('stepsToFix' as TranslationKey)}
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>{t('openSupabaseDashboard' as TranslationKey)}</li>
                  <li>{t('goToSqlEditor' as TranslationKey)}</li>
                  <li>
                    {t('copyMigrationCodeFrom' as TranslationKey)} 
                    <code className="bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded text-primary">supabase/migrations/20251028030000_disable_rls_temporary.sql</code>
                  </li>
                  <li>{t('pasteAndRunSql' as TranslationKey)}</li>
                  <li>{t('refreshThisPage' as TranslationKey)}</li>
                </ol>
              </div>

              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-accent-dark text-white shadow-lg"
                >
                  {t('refreshPage' as TranslationKey)}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const migrationCode = [
                      '-- Copy this code to Supabase SQL Editor',
                      'ALTER TABLE classes DISABLE ROW LEVEL SECURITY;',
                      'ALTER TABLE student_enrollments DISABLE ROW LEVEL SECURITY;',
                      'ALTER TABLE class_subjects DISABLE ROW LEVEL SECURITY;',
                      '',
                      'CREATE TABLE IF NOT EXISTS classes (',
                      '  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,',
                      '  class_code text UNIQUE NOT NULL,',
                      '  class_name text NOT NULL,',
                      '  description text,',
                      '  start_date date NOT NULL,',
                      '  end_date date,',
                      '  level integer NOT NULL CHECK (level >= 1 AND level <= 12),',
                      '  image_url text,',
                      '  goals text,',
                      '  notes text,',
                      '  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,',
                      '  supervisor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,',
                      '  is_active boolean DEFAULT true,',
                      '  created_at timestamptz DEFAULT now(),',
                      '  updated_at timestamptz DEFAULT now()',
                      ');',
                      '',
                      'GRANT ALL ON classes TO authenticated;'
                    ].join('\n');
                    if (typeof window !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(migrationCode).catch(() => {
                        toast.error(t('failedToCopyToClipboard'));
                      });
                      toast.success(t('migrationCodeCopied'));
                    } else {
                      toast.error(t('clipboardNotAvailable'));
                    }
                  }}
                >
                  {t('copyMigrationCode')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Enhanced Header */}
        <PageHeader 
          icon={School}
          title={t('classManagement')}
          description={t('manageAndOrganizeClasses')}
        >
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="border-border bg-background hover:bg-accent text-foreground"
          >
            <Users className="h-4 w-4 mr-2" />
            {t('toggleView')}
          </Button>
          {profile?.role === 'admin' && (
            <Button 
              onClick={() => {
                setSelectedClass(null);
                setIsViewing(false);
                setIsDialogOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addClass')}
            </Button>
          )}
        </PageHeader>

        {/* ✨ Stats Cards - Islamic Design */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
          <Card className="glass-card-hover border-primary/10 hover:border-secondary/30 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground font-sans">
                {t('totalClasses')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg">
                <School className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-primary">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1 font-sans">{t('allClasses')}</p>
            </CardContent>
          </Card>

          <Card className="glass-card-hover border-success/10 hover:border-success/30 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground font-sans">
                {t('activeClasses')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-success to-primary rounded-xl shadow-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-success">{stats.active}</div>
              <p className="text-xs text-muted-foreground mt-1 font-sans">{t('currentlyRunning')}</p>
            </CardContent>
          </Card>

          <Card className="glass-card-hover border-secondary/10 hover:border-secondary/30 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground font-sans">
                {t('completed')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl shadow-lg shadow-secondary/20">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-secondary">{stats.completed}</div>
              <p className="text-xs text-muted-foreground mt-1 font-sans">{t('finishedClasses')}</p>
            </CardContent>
          </Card>

          <Card className="glass-card-hover border-accent/10 hover:border-accent/30 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground font-sans">
                {t('totalStudents')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-accent to-primary rounded-xl shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-accent">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1 font-sans">{t('enrolledStudents')}</p>
            </CardContent>
          </Card>
        </div>

        {/* ✨ Search - Islamic Design */}
        <Card className="glass-card border-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Filter className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="font-display text-foreground">{t('searchClasses')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchByClassNameCodeOrTeacher')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rtl:pl-3 rtl:pr-10 h-11 font-sans input-modern border-primary/20 focus:border-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* ✨ Classes List - Islamic Design */}
        <Card className="glass-card border-primary/10 overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <School className="h-5 w-5 text-primary" />
                </div>
                {t('classes')} 
                <Badge variant="gold" className="mr-2">{filteredClasses.length}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {filteredClasses.length === 0 ? (
              <EmptyState
                icon={School}
                title={t('noClassesFound')}
                description={searchQuery ? t('tryAdjustingSearchCriteria') : t('noClassesCreatedYet')}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
                      <TableHead className="font-semibold font-sans text-foreground">{t('class')}</TableHead>
                      <TableHead className="font-semibold font-sans text-foreground">{t('code')}</TableHead>
                      <TableHead className="font-semibold font-sans text-foreground">{t('level')}</TableHead>
                      <TableHead className="font-semibold font-sans text-foreground">{t('students')}</TableHead>
                      <TableHead className="font-semibold font-sans text-foreground">{t('duration')}</TableHead>
                      <TableHead className="font-semibold font-sans text-foreground">{t('status')}</TableHead>
                      <TableHead className="font-semibold font-sans text-foreground">{t('published')}</TableHead>
                      {profile?.role === 'admin' && (
                        <TableHead className="text-right font-semibold font-sans text-foreground">{t('actions')}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClasses.map((cls) => (
                      <TableRow
                        key={cls.id}
                        className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors border-b border-border/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-secondary/30 shadow-sm">
                              <AvatarImage src={cls.image_url} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                                {(cls.class_name || '?').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold font-sans text-foreground">{cls.class_name}</div>
                              <div className="text-sm text-muted-foreground font-sans">
                                {`${t('level' as TranslationKey)} ${cls.level}`}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                            {cls.class_code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="islamic" className="font-semibold">
                            {`${t('level' as TranslationKey)} ${cls.level}`}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-sans text-foreground">
                            <Users className="h-4 w-4 text-accent" />
                            {cls.student_count || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-sans">
                            <div className="flex items-center gap-1 text-foreground">
                              <Calendar className="h-3 w-3 text-secondary" />
                              {new Date(cls.start_date).toLocaleDateString(dateLocale)}
                            </div>
                            {cls.end_date && (
                              <div className="text-xs text-muted-foreground">
                                {t('to')} {new Date(cls.end_date).toLocaleDateString(dateLocale)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={cls.end_date && new Date(cls.end_date) <= new Date() ? 'gold' : 'success'}
                          >
                            {cls.end_date && new Date(cls.end_date) <= new Date() ? t('completed') : t('active')}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={cls.published === true}
                            onCheckedChange={async (val) => {
                              const { error } = await supabase
                                .from('classes')
                                .update({ published: val })
                                .eq('id', cls.id);
                              if (error) {
                                toast.error(t('failedToUpdate'));
                              } else {
                                setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, published: val } : c));
                              }
                            }}
                          />
                        </TableCell>
                        {profile?.role === 'admin' && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="font-display">{t('actions')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    prefillFormFromClass(cls);
                                    setIsViewing(true);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t('viewDetails')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    setIsViewing(false);
                                    prefillFormFromClass(cls);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          
          {/* ✅ PAGINATION: Add pagination UI */}
          {filteredClasses.length > itemsPerPage && (
            <div className="border-t border-primary/10 p-4 bg-gradient-to-l from-primary/5 to-transparent">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {t('showing')} {startIndex + 1} {t('to')} {Math.min(endIndex, filteredClasses.length || 0)} {t('of')} {filteredClasses.length || 0} {t('classesCount')}
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

        {/* ✨ Create/Edit Class Dialog - Islamic Design */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-primary/20">
            <DialogHeader className="border-b border-primary/10 pb-4">
              <DialogTitle className="text-2xl font-display text-primary flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                  <School className="h-5 w-5 text-white" />
                </div>
                {isViewing ? t('viewClass') : selectedClass ? t('editClass') : t('createNewClass')}
              </DialogTitle>
              <DialogDescription className="font-sans text-muted-foreground">
                {isViewing
                  ? t('viewClassInformation')
                  : selectedClass
                    ? t('updateClassInformation')
                    : t('addNewClassToSystem')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Class Code (Auto Generated) */}
              <div className="bg-gradient-to-l from-primary/5 to-secondary/5 p-4 rounded-xl border border-primary/10">
                <Label className="text-sm font-medium font-sans text-foreground">{t('classCodeAutoGenerated')}</Label>
                <div className="mt-2 p-3 bg-card border border-primary/20 rounded-lg font-mono text-sm text-primary">
                  {selectedClass ? selectedClass.class_code : generateClassCode()}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-sans">
                  {t('classCodeAutoGeneratedDesc')}
                </p>
              </div>

              {/* Class Name */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium font-sans">{t('classNameRequired')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('enterClassName')}
                  className="mt-1 font-sans"
                  disabled={isViewing}
                  required
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date" className="text-sm font-medium font-sans">{t('startDateRequired')}</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-1 font-sans"
                    disabled={isViewing}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date" className="text-sm font-medium font-sans">{t('endDateOptional')}</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="mt-1 font-sans"
                    disabled={isViewing}
                  />
                </div>
              </div>

              {/* Level */}
              <div>
                <Label htmlFor="level" className="text-sm font-medium font-sans">{t('levelRequired')}</Label>
                <Select
                  value={formData.level.toString()}
                  onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
                >
                  <SelectTrigger className="mt-1 font-sans" disabled={isViewing}>
                    <SelectValue placeholder={t('selectLevel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        {`${t('level' as TranslationKey)} ${level}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image Upload */}
              <div>
                <Label className="text-sm font-medium font-sans">{t('classImage' as TranslationKey)}</Label>
                <div className="mt-2 flex items-start gap-4">
                  {formData.image_url ? (
                    <div className="relative group">
                      <OptimizedImage
                        src={formData.image_url}
                        alt={t('classPreview' as TranslationKey)}
                        width={100}
                        height={100}
                        className="w-24 h-24 rounded-lg object-cover border"
                      />
                      {!isViewing && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
                      <Image className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  <div className="flex-1 space-y-2">
                    {!isViewing && (
                      <>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isUploading}
                            onClick={() => document.getElementById('class-image-upload')?.click()}
                          >
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Image className="h-4 w-4 mr-2" />
                            )}
                            {t('uploadImage' as TranslationKey)}
                          </Button>
                          <input
                            id="class-image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('imageUploadHint' as TranslationKey) || 'Recommended: 800x600px, Max: 5MB'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Objectives */}
              <div>
                <Label htmlFor="objectives" className="text-sm font-medium font-sans">{t('objectivesRequired')}</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder={t('describeLearningObjectives')}
                  className="mt-1 font-sans min-h-[100px]"
                  disabled={isViewing}
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium font-sans">{t('notesOptional')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('additionalNotes')}
                  className="mt-1 font-sans min-h-[80px]"
                  disabled={isViewing}
                />
              </div>
            </div>

            <DialogFooter>
              {isViewing ? (
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                  {t('close')}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                    {t('cancel')}
                  </Button>
                  <LoadingButton
                    loading={isCreating}
                    onClick={handleSaveClass}
                    className="bg-blue-600 hover:bg-blue-700 font-sans text-white"
                    disabled={isCreating || !formData.name || !formData.start_date || !formData.objectives}
                  >
                    {selectedClass ? t('updateClass') : t('createClass')}
                  </LoadingButton>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{t('confirmDeletion')}</DialogTitle>
              <DialogDescription className="font-sans">
                {t('deleteClassConfirm')}
              </DialogDescription>
            </DialogHeader>
            {selectedClass && (
              <div className="py-4 space-y-2">
                <p className="font-sans">
                  <strong>{t('class')}:</strong> {selectedClass.class_name}
                </p>
                <p className="font-sans">
                  <strong>{t('code')}:</strong> {selectedClass.class_code}
                </p>
                <p className="font-sans">
                  <strong>{t('level')}:</strong> {selectedClass.level}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="font-sans">
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedClass && handleDelete(selectedClass.id)}
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
