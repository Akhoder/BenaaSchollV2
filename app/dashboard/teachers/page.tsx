'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Plus, MoreVertical, Edit, Search, Mail, Phone, Activity, Globe, TrendingUp, Trash2, School, GraduationCap, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Language } from '@/lib/translations';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface TeacherProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'teacher';
  avatar_url?: string;
  phone?: string;
  language_preference?: string;
  created_at: string;
  updated_at: string;
  classes_count?: number;
  students_count?: number;
}

const ITEMS_PER_PAGE = 20;

const isSupportedLanguage = (value?: string | null): value is Language =>
  value === 'en' || value === 'ar' || value === 'fr';

export default function TeachersPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selected, setSelected] = useState<TeacherProfile | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [isCreateNew, setIsCreateNew] = useState(false);
  const [newAccount, setNewAccount] = useState({ email: '', password: '', full_name: '' });
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    language_preference: language,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    newThisMonth: 0,
    byLanguage: {} as Record<string, number>,
  });
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('nameAsc');
  const languageOptions = useMemo(
    () => [
      { value: 'en', label: t('languageEnglish') },
      { value: 'ar', label: t('languageArabic') },
      { value: 'fr', label: t('languageFrench') },
    ],
    [t]
  );
  const getLanguageLabel = useCallback(
    (lang?: string) => languageOptions.find((opt) => opt.value === (lang ?? 'en'))?.label ?? t('languageEnglish'),
    [languageOptions, t]
  );

  // Auth check
  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [profile, authLoading, router]);

  // Load data
  useEffect(() => {
    if (profile && profile.role === 'admin') {
      void loadData();
    }
  }, [profile]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, languageFilter, activityFilter, sortBy]);

  // Update form language preference when language changes
  useEffect(() => {
    if (!selected) {
      setForm(prev => ({ ...prev, language_preference: language }));
    }
  }, [language, selected]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_profiles');
      let teachersData: TeacherProfile[] = [];
      
      if (!rpcError && rpcData) {
        teachersData = (rpcData as any[]).filter(p => p.role === 'teacher');
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'teacher')
          .order('full_name', { ascending: true });
        if (error) throw error;
        teachersData = (data || []) as any;
      }
      
      // Fetch classes and students count for each teacher
      const teacherIds = teachersData.map(t => t.id);
      
      if (teacherIds.length > 0) {
        // Get classes count from class_subjects (where teacher teaches subjects)
        const { data: classSubjectsData } = await supabase
          .from('class_subjects')
          .select('teacher_id, class_id')
          .in('teacher_id', teacherIds);
        
        // Count unique classes per teacher
        const classesByTeacher: Record<string, Set<string>> = {};
        teacherIds.forEach(id => {
          classesByTeacher[id] = new Set();
        });
        
        // Add classes from class_subjects (where teacher teaches subjects)
        (classSubjectsData || []).forEach((cs: any) => {
          if (cs.teacher_id && cs.class_id) {
            classesByTeacher[cs.teacher_id]?.add(cs.class_id);
          }
        });
        
        // Get classes count from classes table (where teacher is main teacher)
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, teacher_id')
          .in('teacher_id', teacherIds);
        
        // Add classes from classes table
        (classesData || []).forEach((c: any) => {
          if (c.teacher_id && c.id) {
            classesByTeacher[c.teacher_id]?.add(c.id);
          }
        });
        
        // Get all class IDs that teachers are associated with
        const allClassIds = new Set<string>();
        Object.values(classesByTeacher).forEach(classSet => {
          classSet.forEach(classId => allClassIds.add(classId));
        });
        
        // Get students count for all classes
        let studentsByClass: Record<string, number> = {};
        if (allClassIds.size > 0) {
          const { data: enrollmentsData } = await supabase
            .from('student_enrollments')
            .select('class_id')
            .in('class_id', Array.from(allClassIds))
            .eq('status', 'active');
          
          (enrollmentsData || []).forEach((e: any) => {
            studentsByClass[e.class_id] = (studentsByClass[e.class_id] || 0) + 1;
          });
        }
        
        // Calculate students count per teacher
        const studentsByTeacher: Record<string, number> = {};
        Object.entries(classesByTeacher).forEach(([teacherId, classSet]) => {
          let totalStudents = 0;
          classSet.forEach(classId => {
            totalStudents += studentsByClass[classId] || 0;
          });
          studentsByTeacher[teacherId] = totalStudents;
        });
        
        // Add counts to teachers data
        teachersData = teachersData.map(teacher => ({
          ...teacher,
          classes_count: classesByTeacher[teacher.id]?.size || 0,
          students_count: studentsByTeacher[teacher.id] || 0,
        }));
      }
      
      setTeachers(teachersData);
      
      // Calculate statistics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const active = teachersData.filter(t => {
        const updatedAt = t.updated_at ? new Date(t.updated_at) : new Date(t.created_at);
        return updatedAt >= thirtyDaysAgo;
      }).length;
      
      const newThisMonth = teachersData.filter(t => {
        const createdAt = new Date(t.created_at);
        return createdAt >= thisMonthStart;
      }).length;
      
      const byLanguage: Record<string, number> = {};
      teachersData.forEach(t => {
        const lang = t.language_preference || 'en';
        byLanguage[lang] = (byLanguage[lang] || 0) + 1;
      });
      
      setStats({
        total: teachersData.length,
        active,
        newThisMonth,
        byLanguage,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(t('failedToLoadTeachers'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const filtered = useMemo(() => {
    let result = teachers;
    
    // Search filter
    const q = (search || '').toLowerCase();
    if (q) {
      result = result.filter((teacher) =>
        (teacher.full_name || '').toLowerCase().includes(q) ||
        (teacher.email || '').toLowerCase().includes(q) ||
        (teacher.phone || '').toLowerCase().includes(q)
      );
    }
    
    // Language filter
    if (languageFilter !== 'all') {
      result = result.filter((teacher) => 
        (teacher.language_preference || 'en') === languageFilter
      );
    }
    
    // Activity filter
    if (activityFilter !== 'all') {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      result = result.filter((teacher) => {
        const updatedAt = teacher.updated_at ? new Date(teacher.updated_at) : new Date(teacher.created_at);
        if (activityFilter === 'active') {
          return updatedAt >= thirtyDaysAgo;
        } else if (activityFilter === 'inactive') {
          return updatedAt < thirtyDaysAgo;
        }
        return true;
      });
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'nameAsc':
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'nameDesc':
          return (b.full_name || '').localeCompare(a.full_name || '');
        case 'dateNewest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'dateOldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'classesMost':
          return (b.classes_count || 0) - (a.classes_count || 0);
        case 'classesLeast':
          return (a.classes_count || 0) - (b.classes_count || 0);
        case 'studentsMost':
          return (b.students_count || 0) - (a.students_count || 0);
        case 'studentsLeast':
          return (a.students_count || 0) - (b.students_count || 0);
        default:
          return 0;
      }
    });
    
    return result;
  }, [teachers, search, languageFilter, activityFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTeachers = filtered.slice(startIndex, endIndex);

  const openEdit = useCallback((t: TeacherProfile) => {
    setSelected(t);
    setForm({
      full_name: t.full_name || '',
      phone: t.phone || '',
      avatar_url: t.avatar_url || '',
      language_preference: isSupportedLanguage(t.language_preference) ? t.language_preference : language,
    });
    setIsDialogOpen(true);
  }, [language]);

  const resetDialog = useCallback(() => {
    setSelected(null);
    setPromoteEmail('');
    setIsCreateNew(false);
    setNewAccount({ email: '', password: '', full_name: '' });
    setForm({ full_name: '', phone: '', avatar_url: '', language_preference: language });
  }, [language]);

  const openNewDialog = useCallback(() => {
    resetDialog();
    setIsDialogOpen(true);
  }, [resetDialog]);

  const handleDelete = useCallback(async (teacherId: string) => {
    try {
      setIsDeleting(true);
      
      // Check if teacher has classes assigned
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('teacher_id', teacherId)
        .limit(1);
      
      if (classesError) {
        console.error('Error checking classes:', classesError);
        toast.error(t('cannotDeleteTeacher'));
        return;
      }
      
      if (classesData && classesData.length > 0) {
        toast.error(t('teacherHasClasses'));
        return;
      }
      
      // Check if teacher has subjects assigned
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('class_subjects')
        .select('id')
        .eq('teacher_id', teacherId)
        .limit(1);
      
      if (subjectsError) {
        console.error('Error checking subjects:', subjectsError);
        toast.error(t('cannotDeleteTeacher'));
        return;
      }
      
      if (subjectsData && subjectsData.length > 0) {
        toast.error(t('teacherHasClasses'));
        return;
      }
      
      // Delete teacher profile
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', teacherId);
      
      if (deleteError) {
        throw deleteError;
      }
      
      toast.success(t('teacherDeleted'));
      setTeachers(prev => prev.filter(t => t.id !== teacherId));
      setDeleteConfirmOpen(false);
      setSelected(null);
      
      // Update stats
      await loadData();
    } catch (e: any) {
      console.error(e);
      toast.error(t('saveFailed'));
    } finally {
      setIsDeleting(false);
    }
  }, [t, loadData]);

  const save = useCallback(async () => {
    try {
      setIsSaving(true);
      if (selected) {
        const { error } = await supabase.rpc('admin_update_profile', {
          p_id: selected.id,
          p_full_name: form.full_name,
          p_phone: form.phone || null,
          p_avatar_url: form.avatar_url || null,
          p_language_preference: form.language_preference,
        });
        if (error) throw error;
        toast.success(t('teacherUpdated'));
        setTeachers(prev => prev.map(t => t.id === selected.id ? {
          ...t,
          full_name: form.full_name,
          phone: form.phone || undefined,
          avatar_url: form.avatar_url || undefined,
          language_preference: form.language_preference,
        } : t));
      } else {
        if (isCreateNew) {
          if (!newAccount.email || !newAccount.password || !newAccount.full_name) {
            toast.error(t('emailPasswordAndFullNameRequired'));
            return;
          }
          const { data: signData, error: signError } = await supabase.auth.signUp({
            email: newAccount.email,
            password: newAccount.password,
            options: {
              data: { full_name: newAccount.full_name, role: 'teacher' }
            }
          });
          if (signError) throw signError;
          if (signData.user) {
            await supabase
              .from('profiles')
              .update({ role: 'teacher', full_name: newAccount.full_name })
              .eq('id', signData.user.id);
          }
          toast.success(t('teacherAccountCreated'));
        } else {
          if (!promoteEmail) {
            toast.error(t('enterEmailToPromote'));
            return;
          }
          const { error } = await supabase
            .from('profiles')
            .update({ role: 'teacher' })
            .eq('email', promoteEmail);
          if (error) throw error;
          toast.success(t('userPromotedToTeacher'));
        }
      }
      setIsDialogOpen(false);
      resetDialog();
      await loadData();
    } catch (e: any) {
      console.error(e);
      toast.error(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [selected, form, isCreateNew, newAccount, promoteEmail, t, resetDialog, loadData]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <PageLoading
          text={t('loadingTeachers')}
          statsCount={4}
          contentType="table"
          contentRows={8}
        />
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'admin') return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          icon={Users}
          title={t('teachers')}
          description={t('manageTeacherAccounts')}
        >
          <Button 
            onClick={openNewDialog}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> {t('promoteUserToTeacher')}
          </Button>
        </PageHeader>

        {/* ✨ Stats Cards - Islamic Design */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
          {/* Total Teachers */}
          <Card className="glass-card-hover border-primary/10 hover:border-primary/30 transition-all duration-300 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('totalTeachers')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary font-display">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('totalTeachers')}
              </p>
            </CardContent>
          </Card>
          
          {/* Active Teachers */}
          <Card className="glass-card-hover border-primary/10 hover:border-success/30 transition-all duration-300 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('activeTeachers')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-success to-primary rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Activity className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success font-display">{stats.active}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('last30Days')}</p>
            </CardContent>
          </Card>
          
          {/* New Teachers This Month */}
          <Card className="glass-card-hover border-primary/10 hover:border-info/30 transition-all duration-300 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('newTeachersThisMonth')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-info to-primary rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-info font-display">{stats.newThisMonth}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('thisMonth')}</p>
            </CardContent>
          </Card>
          
          {/* Teachers By Language */}
          <Card className="glass-card-hover border-primary/10 hover:border-accent/30 transition-all duration-300 group">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {t('teachersByLanguage')}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-accent to-primary rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Globe className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.keys(stats.byLanguage).length > 0 ? (
                  Object.entries(stats.byLanguage)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 2)
                    .map(([lang, count]) => (
                      <div key={lang} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {getLanguageLabel(lang)}
                        </span>
                        <span className="text-lg font-bold text-accent font-display">{count}</span>
                      </div>
                    ))
                ) : (
                  <div className="text-2xl font-bold font-display text-muted-foreground">—</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ✨ Search and Filter Card - Islamic Design */}
        <Card className="glass-card border-primary/10">
          <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
            <CardTitle className="flex items-center gap-3 text-primary">
              <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                <Filter className="h-5 w-5 text-white" />
              </div>
              {t('searchAndFilter')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-primary/10 rounded-lg group-focus-within:bg-primary/20 transition-colors">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <Input
                  placeholder={t('searchByNameEmailOrPhone')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-14 h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder={t('filterByLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allLanguages')}</SelectItem>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder={t('filterByActivity')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allActivity')}</SelectItem>
                    <SelectItem value="active">{t('active')}</SelectItem>
                    <SelectItem value="inactive">{t('inactive')}</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder={t('sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nameAsc">{t('nameAsc')}</SelectItem>
                    <SelectItem value="nameDesc">{t('nameDesc')}</SelectItem>
                    <SelectItem value="dateNewest">{t('dateNewest')}</SelectItem>
                    <SelectItem value="dateOldest">{t('dateOldest')}</SelectItem>
                    <SelectItem value="classesMost">{t('classesMost')}</SelectItem>
                    <SelectItem value="classesLeast">{t('classesLeast')}</SelectItem>
                    <SelectItem value="studentsMost">{t('studentsMost')}</SelectItem>
                    <SelectItem value="studentsLeast">{t('studentsLeast')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✨ Teachers Table - Islamic Design */}
        <Card className="glass-card border-primary/10 overflow-hidden">
          <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="text-primary font-display">{t('teachers')} ({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paginatedTeachers.length === 0 ? (
              <div className="text-center py-16 px-4 animate-fade-in">
                {/* Empty State - Enhanced Design */}
                <div className="relative inline-block mb-6">
                  {/* Decorative Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full blur-2xl scale-150 animate-pulse" />
                  
                  {/* Icon Container */}
                  <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border-2 border-primary/20">
                    <Users className="h-16 w-16 mx-auto text-primary animate-float" />
                  </div>
                </div>
                
                {/* Text Content */}
                <h3 className="text-xl font-bold text-foreground font-display mb-2">
                  {t('noTeachersFound')}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t('tryAdjustingFilters')}
                </p>
                
                {/* Decorative Line */}
                <div className="mt-6 h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-secondary to-transparent rounded-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10 hover:bg-gradient-to-l hover:from-primary/10 hover:to-secondary/10">
                      <TableHead className="font-bold text-foreground">{t('teacher')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('email')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('phone')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('classesCount')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('studentsCount')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('languagePreference')}</TableHead>
                      <TableHead className="font-bold text-foreground text-center">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTeachers.map((teacher, index) => (
                      <TableRow 
                        key={teacher.id}
                        className="hover:bg-primary/5 border-b border-border/50 transition-all duration-200 animate-fade-in-up group"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        {/* Teacher with Avatar */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-secondary/30 group-hover:ring-primary/50 transition-all">
                              <AvatarImage src={teacher.avatar_url || ''} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                                {teacher.full_name?.charAt(0).toUpperCase() || 'T'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-foreground">{teacher.full_name}</div>
                              <div className="text-xs text-muted-foreground">{t('teacher')}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              <Mail className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-foreground">{teacher.email}</span>
                          </div>
                        </TableCell>

                        {/* Phone */}
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            {teacher.phone ? (
                              <>
                                <div className="p-1.5 bg-accent/10 rounded-lg">
                                  <Phone className="h-4 w-4 text-accent" />
                                </div>
                                <span className="text-foreground">{teacher.phone}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Classes Count */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-info/10 rounded-lg">
                              <School className="h-4 w-4 text-info" />
                            </div>
                            <span className="font-semibold text-foreground">{teacher.classes_count ?? 0}</span>
                            {teacher.classes_count === 0 && (
                              <span className="text-xs text-muted-foreground">({t('noClasses')})</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Students Count */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-success/10 rounded-lg">
                              <GraduationCap className="h-4 w-4 text-success" />
                            </div>
                            <span className="font-semibold text-foreground">{teacher.students_count ?? 0}</span>
                            {teacher.students_count === 0 && (
                              <span className="text-xs text-muted-foreground">({t('noStudents')})</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Language Preference */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-accent" />
                            <span className="text-sm text-foreground">{getLanguageLabel(teacher.language_preference)}</span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="font-display">{t('actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(teacher)}>
                                <Edit className="mr-2 h-4 w-4" /> {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                                onClick={() => {
                                  setSelected(teacher);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
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
          
          {filtered.length > ITEMS_PER_PAGE && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('showing')} {startIndex + 1} {t('to')} {Math.min(endIndex, filtered.length)} {t('of')} {filtered.length} {t('teachers')}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
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
              <DialogTitle className="text-2xl font-display">
                {selected ? t('editTeacher') : t('promoteUserToTeacher')}
              </DialogTitle>
              <DialogDescription className="font-sans">
                {selected ? t('updateTeacherInformation') : t('enterExistingUserEmail')}
              </DialogDescription>
            </DialogHeader>

            {selected ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium font-sans">{t('fullName')}</Label>
                  <Input 
                    value={form.full_name} 
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                    className="mt-1 font-sans" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium font-sans">{t('phone')}</Label>
                  <Input 
                    value={form.phone} 
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                    className="mt-1 font-sans" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium font-sans">{t('avatarUrl')}</Label>
                  <Input 
                    value={form.avatar_url} 
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} 
                    className="mt-1 font-sans" 
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <input
                    id="create_new_teacher"
                    type="checkbox"
                    checked={isCreateNew}
                    onChange={(e) => setIsCreateNew(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="create_new_teacher" className="text-sm font-medium font-sans">
                    {t('createNewTeacherAccount')}
                  </Label>
                </div>

                {isCreateNew ? (
                  <>
                    <div>
                      <Label className="text-sm font-medium font-sans">{t('fullName')}</Label>
                      <Input 
                        value={newAccount.full_name} 
                        onChange={(e) => setNewAccount({ ...newAccount, full_name: e.target.value })} 
                        className="mt-1 font-sans" 
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium font-sans">{t('email')}</Label>
                      <Input 
                        type="email" 
                        value={newAccount.email} 
                        onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })} 
                        placeholder={t('emailPlaceholder')}
                        className="mt-1 font-sans" 
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium font-sans">{t('password')}</Label>
                      <Input 
                        type="password" 
                        value={newAccount.password} 
                        onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })} 
                        className="mt-1 font-sans" 
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <Label className="text-sm font-medium font-sans">{t('userEmail')}</Label>
                    <Input 
                      value={promoteEmail} 
                      onChange={(e) => setPromoteEmail(e.target.value)} 
                      placeholder={t('emailPlaceholder')}
                      className="mt-1 font-sans" 
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                {t('cancel')}
              </Button>
              <Button 
                onClick={save} 
                disabled={
                  isSaving || (selected ? !form.full_name : (isCreateNew ? (!newAccount.email || !newAccount.password || !newAccount.full_name) : !promoteEmail))
                } 
                className="font-sans bg-primary hover:bg-primary-hover text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('save')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{t('deleteTeacher')}</DialogTitle>
              <DialogDescription className="font-sans">
                {t('deleteTeacherConfirm')}
              </DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="py-4 space-y-2">
                <p className="font-sans">
                  <strong>{t('fullName')}:</strong> {selected.full_name}
                </p>
                <p className="font-sans">
                  <strong>{t('email')}:</strong> {selected.email}
                </p>
                {selected.phone && (
                  <p className="font-sans">
                    <strong>{t('phone')}:</strong> {selected.phone}
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setSelected(null);
                }} 
                className="font-sans"
                disabled={isDeleting}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => selected && handleDelete(selected.id)}
                className="font-sans"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('checkingClasses')}
                  </>
                ) : (
                  t('delete')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
