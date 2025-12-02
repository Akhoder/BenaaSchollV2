'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSpinner';
import { ResponsiveTable } from '@/components/ResponsiveTable';
import { ErrorDisplay, EmptyState } from '@/components/ErrorDisplay';
import { InputMask } from '@/components/InputMask';
import { LoadingButton } from '@/components/ProgressIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudentsOptimized } from '@/lib/optimizedQueries';
import { useAuthCheck } from '@/hooks/useAuthCheck';
import { usePagination } from '@/hooks/usePagination';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useDebounce } from '@/hooks/useDebounce';
import { filterBySearch } from '@/lib/tableUtils';
import { getErrorMessage } from '@/lib/errorHandler';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language, type TranslationKey } from '@/lib/translations';
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
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogDescription as DialogDescription,
  ResponsiveDialogFooter as DialogFooter,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from '@/components/ui/responsive-dialog';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadUserAvatar } from '@/lib/supabase';
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
  Upload,
  X,
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
  gender?: 'male' | 'female';
  // Common fields
  address?: string;
  date_of_birth?: string;
  // Student fields
  parent_name?: string;
  parent_phone?: string;
  emergency_contact?: string;
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
  const dateLocale = useMemo(
    () => (language === 'ar' ? 'ar' : language === 'fr' ? 'fr-FR' : 'en-US'),
    [language]
  );
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // âœ… PERFORMANCE: Debounce search to reduce re-renders
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
  const [createGender, setCreateGender] = useState<'male' | 'female' | ''>('');
  // Common fields for create
  const [createAddress, setCreateAddress] = useState('');
  const [createDateOfBirth, setCreateDateOfBirth] = useState('');
  // Student fields for create
  const [createParentName, setCreateParentName] = useState('');
  const [createParentPhone, setCreateParentPhone] = useState('');
  const [createEmergencyContact, setCreateEmergencyContact] = useState('');
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editLanguage, setEditLanguage] = useState<Language>(language);
  const [editGender, setEditGender] = useState<'male' | 'female' | ''>('');
  // Avatar for create
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState<string | null>(null);
  const [uploadingCreateAvatar, setUploadingCreateAvatar] = useState(false);
  // Avatar for edit
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [uploadingEditAvatar, setUploadingEditAvatar] = useState(false);
  // Common fields for edit
  const [editAddress, setEditAddress] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  // Student fields for edit
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | 'enrolled' | 'notEnrolled'>('all');
  const [fabVisible, setFabVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50 || currentScrollY < lastScrollY) {
        setFabVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setFabVisible(false);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);
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
      // âœ… PERFORMANCE: Only show loading if no cached data
      const { data: allStudents, error, fromCache } = await getStudentsOptimized(
        profile.role || 'student', 
        profile.id
      );
      
      // âœ… OPTIMISTIC LOADING: Don't show loading if data is from cache
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
        // âœ… OPTIMIZED: Single query for all enrollments
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

  // âœ… PERFORMANCE: Fetch students immediately when authorized
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

  // âœ… PERFORMANCE: Filter students using debounced search query
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
        <PageLoading
          text={t('loadingStudents')}
          statsCount={4}
          contentType={viewMode === 'grid' ? 'grid' : 'table'}
          contentRows={6}
        />
      </DashboardLayout>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <DashboardLayout>
      <PullToRefresh onRefresh={fetchStudents}>
        <div className="space-y-6 animate-fade-in">
          {/* âœ¨ Enhanced Header - Islamic Design */}
        <PageHeader 
          icon={GraduationCap}
          title={t('studentsManagement')}
          description={t('studentsManagementDescription')}
        >
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as 'list' | 'grid')}
            className="rounded-full border border-white/30 bg-white/10 p-1 text-white backdrop-blur-lg shadow-inner"
            aria-label={t('viewMode')}
          >
            <ToggleGroupItem
              value="list"
              className="flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition data-[state=on]:bg-secondary data-[state=on]:text-white data-[state=on]:shadow-lg text-white/80 hover:text-white"
            >
              <List className="h-4 w-4" />
              {t('listView')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="grid"
              className="flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition data-[state=on]:bg-secondary data-[state=on]:text-white data-[state=on]:shadow-lg text-white/80 hover:text-white"
            >
              <LayoutGrid className="h-4 w-4" />
              {t('gridView')}
            </ToggleGroupItem>
          </ToggleGroup>
          {profile?.role === 'admin' && (
            <Button 
              onClick={() => setCreateOpen(true)}
              className="hidden md:flex bg-secondary hover:bg-secondary/90 text-white backdrop-blur-sm border border-secondary/50 shadow-lg shadow-secondary/30 transition-all duration-300 hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addStudent')}
            </Button>
          )}
        </PageHeader>

        {/* âœ¨ Stats Cards - Islamic Design - Mobile Horizontal Scroll */}
        <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory md:grid md:gap-4 md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:pb-0 animate-fade-in-up -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          {statsConfig.map((stat, index) => {
            const Icon = stat.icon;
            const gradients = [
              'from-primary to-accent',
              'from-success to-primary',
              'from-secondary to-secondary/80',
              'from-accent to-primary'
            ];
            const borderColors = [
              'border-primary/10 hover:border-primary/30',
              'border-success/10 hover:border-success/30',
              'border-secondary/10 hover:border-secondary/30',
              'border-accent/10 hover:border-accent/30'
            ];
            const textColors = ['text-primary', 'text-success', 'text-secondary', 'text-accent'];
            return (
              <div key={stat.title} className="min-w-[240px] snap-center md:min-w-0">
                <Card className={`glass-card-hover ${borderColors[index % 4]} transition-all duration-300 h-full`}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-muted-foreground font-sans whitespace-nowrap">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2.5 bg-gradient-to-br ${gradients[index % 4]} rounded-xl shadow-lg`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold font-display ${textColors[index % 4]}`}>
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-sans">{stat.subtitle}</p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* âœ¨ Search and Filters - Islamic Design */}
        <Card className="glass-card border-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Filter className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="font-display text-foreground">{t('searchAndFilter')}</CardTitle>
            </div>
            <CardDescription className="font-sans text-muted-foreground">
              {t('searchStudentsHelper')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchStudentsPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rtl:pl-3 rtl:pr-10 h-11 font-sans input-modern border-primary/20 focus:border-primary"
              />
            </div>
            <div className="grid gap-4 pt-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('enrollmentFilterLabel')}
                </label>
                <Select value={enrollmentFilter} onValueChange={(value) => setEnrollmentFilter(value as 'all' | 'enrolled' | 'notEnrolled')}>
                  <SelectTrigger className="mt-1 font-sans border-primary/20">
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

        {/* âœ¨ Create Student Dialog - Islamic Design */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg border-primary/20">
            <DialogHeader className="border-b border-primary/10 pb-4">
              <DialogTitle className="text-2xl font-display text-primary flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                {t('addStudent')}
              </DialogTitle>
              <DialogDescription className="font-sans text-muted-foreground">{t('createStudentDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Avatar Upload */}
              <div className="space-y-4 border-b border-primary/10 pb-4">
                <h3 className="text-sm font-semibold text-foreground font-sans">{t('profilePicture' as TranslationKey)}</h3>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 ring-2 ring-secondary/40 shadow-lg">
                      <AvatarImage src={createAvatarPreview || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold text-lg">
                        {createName.charAt(0).toUpperCase() || <User className="h-6 w-6" />}
                      </AvatarFallback>
                    </Avatar>
                    {createAvatarPreview && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                        onClick={() => {
                          setCreateAvatarFile(null);
                          setCreateAvatarPreview(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith('image/')) {
                          toast.error(t('invalidImageFile' as TranslationKey));
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error(t('imageTooLarge' as TranslationKey));
                          return;
                        }
                        setCreateAvatarFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCreateAvatarPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                      id="create-avatar-upload"
                    />
                    <label htmlFor="create-avatar-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full font-sans"
                        disabled={uploadingCreateAvatar}
                        asChild
                      >
                        <span className="cursor-pointer">
                          {uploadingCreateAvatar ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('uploading' as TranslationKey)}
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              {createAvatarPreview ? t('changePicture' as TranslationKey) : t('uploadPicture' as TranslationKey)}
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1 font-sans">
                      {t('imageUploadHint' as TranslationKey)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground font-sans">{t('basicInformation' as TranslationKey)}</h3>
              <div>
                  <label className="text-sm font-medium font-sans">{t('fullName')}</label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} className="mt-1 font-sans" />
              </div>
              <div>
                  <label className="text-sm font-medium font-sans">{t('email')}</label>
                <Input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="mt-1 font-sans" />
              </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium font-sans">{t('gender' as TranslationKey)}</label>
                    <Select value={createGender} onValueChange={(v) => setCreateGender(v as 'male' | 'female' | '')}>
                      <SelectTrigger className="mt-1 font-sans">
                        <SelectValue placeholder={t('selectGender' as TranslationKey)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('male' as TranslationKey)}</SelectItem>
                        <SelectItem value="female">{t('female' as TranslationKey)}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium font-sans">{t('address' as TranslationKey)}</label>
                    <Input value={createAddress} onChange={(e) => setCreateAddress(e.target.value)} className="mt-1 font-sans" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium font-sans">{t('dateOfBirth' as TranslationKey)}</label>
                  <Input 
                    type="date"
                    value={createDateOfBirth} 
                    onChange={(e) => setCreateDateOfBirth(e.target.value)} 
                    className="mt-1 font-sans" 
                  />
                </div>
              </div>

              {/* Student-specific fields */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-sans">{t('studentInformation' as TranslationKey)}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium font-sans">{t('parentName' as TranslationKey)}</label>
                    <Input value={createParentName} onChange={(e) => setCreateParentName(e.target.value)} className="mt-1 font-sans" />
                  </div>
                  <div>
                    <label className="text-sm font-medium font-sans">{t('parentPhone' as TranslationKey)}</label>
                    <Input value={createParentPhone} onChange={(e) => setCreateParentPhone(e.target.value)} className="mt-1 font-sans" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium font-sans">{t('emergencyContact' as TranslationKey)}</label>
                  <Input value={createEmergencyContact} onChange={(e) => setCreateEmergencyContact(e.target.value)} className="mt-1 font-sans" />
                </div>
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
                    // Get auth token
                    const { data: session } = await supabase.auth.getSession();
                    const token = session.session?.access_token;
                    
                    // Upload avatar first if selected
                    let avatarUrl: string | null = null;
                    if (createAvatarFile) {
                      setUploadingCreateAvatar(true);
                      // We need to create the user first to get the user ID
                      // So we'll upload the avatar after user creation
                    }
                    
                    // Call API to create user
                    const res = await fetch('/api/admin/create-user', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : '',
                      },
                      body: JSON.stringify({
                        email: createEmail.trim(),
                        password: undefined, // Auto-generate password
                        full_name: createName.trim(),
                        role: 'student',
                        language_preference: createLang,
                        phone: createPhone.trim() || null,
                        gender: createGender || null,
                        address: createAddress.trim() || null,
                        date_of_birth: createDateOfBirth || null,
                        parent_name: createParentName.trim() || null,
                        parent_phone: createParentPhone.trim() || null,
                        emergency_contact: createEmergencyContact.trim() || null,
                      }),
                    });

                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({}));
                      toast.error(errorData.error || t('failedToCreateStudent'));
                      return;
                    }

                    const data = await res.json();
                    
                    // Upload avatar if file was selected
                    if (createAvatarFile && data.user?.id) {
                      setUploadingCreateAvatar(true);
                      const { data: uploadData, error: uploadError } = await uploadUserAvatar(createAvatarFile, data.user.id);
                      if (!uploadError && uploadData?.publicUrl) {
                        // Update profile with avatar URL
                        await supabase
                          .from('profiles')
                          .update({ avatar_url: uploadData.publicUrl })
                          .eq('id', data.user.id);
                      }
                      setUploadingCreateAvatar(false);
                    }
                    
                    toast.success(t('studentCreated'));
                    setCreateOpen(false);
                    setCreateName('');
                    setCreateEmail('');
                    setCreatePhone('');
                    setCreateLang(language);
                    setCreateGender('');
                    setCreateAddress('');
                    setCreateDateOfBirth('');
                    setCreateParentName('');
                    setCreateParentPhone('');
                    setCreateEmergencyContact('');
                    setCreateAvatarFile(null);
                    setCreateAvatarPreview(null);
                    await fetchStudents();
                  } catch (err) {
                    console.error('Error creating student:', err);
                    toast.error(t('failedToCreateStudent'));
                  } finally { setSavingCreate(false); }
                }}
                className="btn-gradient font-sans"
              >
                {t('create')}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* âœ¨ Students List - Islamic Design */}
        <Card className="glass-card border-primary/10 overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
            <CardTitle className="font-display text-foreground flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              {t('students')} 
              <Badge variant="gold" className="mr-2">{filteredStudents.length}</Badge>
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
                  <Card key={s.id} className="glass-card-hover border-primary/10 hover:border-secondary/30 transition-all duration-300">
                    <CardHeader className="flex-row items-center gap-4">
                      <Avatar className="h-14 w-14 ring-2 ring-secondary/30 shadow-lg">
                        <AvatarImage src={s.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                          {(s.full_name || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg font-semibold text-foreground">{s.full_name}</CardTitle>
                          <Badge variant={s.enrolled_classes && s.enrolled_classes > 0 ? 'success' : 'gold'} className="text-xs">
                            {s.enrolled_classes && s.enrolled_classes > 0 ? t('enrolled') : t('notEnrolled')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{s.email}</p>
                        <p className="text-sm text-muted-foreground">{s.phone || 'â€”'}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-9 w-9"
                          onClick={async () => {
                            setSelectedStudent(s);
                            setIsDialogOpen(true);
                            
                            // Fetch fresh data from database to ensure all fields are loaded
                            try {
                              const { data: freshData, error } = await supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', s.id)
                                .single();
                              
                              if (!error && freshData) {
                                setEditLanguage(isSupportedLanguage(freshData.language_preference) ? freshData.language_preference : language);
                                setEditGender(freshData.gender || '');
                                setEditAddress(freshData.address || '');
                                setEditDateOfBirth(freshData.date_of_birth || '');
                                setEditParentName(freshData.parent_name || '');
                                setEditParentPhone(freshData.parent_phone || '');
                                setEditEmergencyContact(freshData.emergency_contact || '');
                                setEditAvatarUrl(freshData.avatar_url || '');
                                setEditAvatarPreview(freshData.avatar_url || null);
                                setEditAvatarFile(null);
                                
                                // Update selectedStudent with fresh data
                                setSelectedStudent({ ...s, ...freshData });
                              } else {
                                // Fallback to existing data if fetch fails
                                setEditLanguage(isSupportedLanguage(s.language_preference) ? s.language_preference : language);
                                setEditGender(s.gender || '');
                                setEditAddress(s.address || '');
                                setEditDateOfBirth(s.date_of_birth || '');
                                setEditParentName(s.parent_name || '');
                                setEditParentPhone(s.parent_phone || '');
                                setEditEmergencyContact(s.emergency_contact || '');
                                setEditAvatarUrl(s.avatar_url || '');
                                setEditAvatarPreview(s.avatar_url || null);
                                setEditAvatarFile(null);
                              }
                            } catch (err) {
                              console.error('Error fetching student data:', err);
                              // Fallback to existing data
                              setEditLanguage(isSupportedLanguage(s.language_preference) ? s.language_preference : language);
                              setEditGender(s.gender || '');
                              setEditAddress(s.address || '');
                              setEditDateOfBirth(s.date_of_birth || '');
                              setEditParentName(s.parent_name || '');
                              setEditParentPhone(s.parent_phone || '');
                              setEditEmergencyContact(s.emergency_contact || '');
                              setEditAvatarUrl(s.avatar_url || '');
                              setEditAvatarPreview(s.avatar_url || null);
                              setEditAvatarFile(null);
                            }
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-primary/5 rounded-lg p-3">
                          <p className="text-muted-foreground text-xs">{t('enrolled')}</p>
                          <p className="text-lg font-semibold text-primary">{s.enrolled_classes ?? 0}</p>
                        </div>
                        <div className="bg-secondary/5 rounded-lg p-3">
                          <p className="text-muted-foreground text-xs">{t('avgGrade')}</p>
                          <p className="text-lg font-semibold text-secondary">{s.average_grade ?? 'â€”'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <span>
                          {t('createdAt')}: {new Date(s.created_at).toLocaleDateString(dateLocale)}
                        </span>
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                          {s.id.slice(0, 8)}...
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table className="min-w-[700px] md:min-w-0">
                  <TableHeader>
                    <TableRow className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
                      <TableHead className="font-semibold text-foreground text-xs sm:text-sm">{t('fullName')}</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs sm:text-sm hidden md:table-cell">{t('email')}</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs sm:text-sm hidden lg:table-cell">{t('phone')}</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs sm:text-sm">{t('enrolled')}</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs sm:text-sm hidden sm:table-cell">{t('avgGrade')}</TableHead>
                      <TableHead className="text-right font-semibold text-foreground text-xs sm:text-sm">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((s) => (
                      <TableRow key={s.id} className="hover:bg-primary/5 transition-colors border-b border-border/50">
                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-secondary/30 flex-shrink-0">
                              <AvatarImage src={s.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold text-xs sm:text-sm">
                                {(s.full_name||'?').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-foreground text-sm sm:text-base truncate">{s.full_name}</div>
                              <div className="text-xs text-muted-foreground">{s.id.slice(0,8)}...</div>
                              <div className="text-xs text-muted-foreground md:hidden mt-0.5 truncate">{s.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-foreground text-xs sm:text-sm hidden md:table-cell">{s.email}</TableCell>
                        <TableCell className="py-3 text-muted-foreground text-xs sm:text-sm hidden lg:table-cell">{s.phone || '—'}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="islamic" className="text-xs">{s.enrolled_classes ?? 0}</Badge>
                        </TableCell>
                        <TableCell className="py-3 hidden sm:table-cell">
                          <Badge variant="gold" className="text-xs">{s.average_grade ?? '—'}</Badge>
                        </TableCell>
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
                              <DropdownMenuItem onClick={async () => {
                                setSelectedStudent(s);
                                setIsDialogOpen(true);
                                
                                // Fetch fresh data from database to ensure all fields are loaded
                                try {
                                  const { data: freshData, error } = await supabase
                                    .from('profiles')
                                    .select('*')
                                    .eq('id', s.id)
                                    .single();
                                  
                                  if (!error && freshData) {
                                    setEditLanguage(isSupportedLanguage(freshData.language_preference) ? freshData.language_preference : language);
                                    setEditGender(freshData.gender || '');
                                    setEditAddress(freshData.address || '');
                                    setEditDateOfBirth(freshData.date_of_birth || '');
                                    setEditParentName(freshData.parent_name || '');
                                    setEditParentPhone(freshData.parent_phone || '');
                                    setEditEmergencyContact(freshData.emergency_contact || '');
                                    setEditAvatarUrl(freshData.avatar_url || '');
                                    setEditAvatarPreview(freshData.avatar_url || null);
                                    setEditAvatarFile(null);
                                    
                                    // Update selectedStudent with fresh data
                                    setSelectedStudent({ ...s, ...freshData });
                                  } else {
                                    // Fallback to existing data if fetch fails
                                    setEditLanguage(isSupportedLanguage(s.language_preference) ? s.language_preference : language);
                                    setEditGender(s.gender || '');
                                    setEditAddress(s.address || '');
                                    setEditDateOfBirth(s.date_of_birth || '');
                                    setEditParentName(s.parent_name || '');
                                    setEditParentPhone(s.parent_phone || '');
                                    setEditEmergencyContact(s.emergency_contact || '');
                                    setEditAvatarUrl(s.avatar_url || '');
                                    setEditAvatarPreview(s.avatar_url || null);
                                    setEditAvatarFile(null);
                                  }
                                } catch (err) {
                                  console.error('Error fetching student data:', err);
                                  // Fallback to existing data
                                  setEditLanguage(isSupportedLanguage(s.language_preference) ? s.language_preference : language);
                                  setEditGender(s.gender || '');
                                  setEditAddress(s.address || '');
                                  setEditDateOfBirth(s.date_of_birth || '');
                                  setEditParentName(s.parent_name || '');
                                  setEditParentPhone(s.parent_phone || '');
                                  setEditEmergencyContact(s.emergency_contact || '');
                                  setEditAvatarUrl(s.avatar_url || '');
                                  setEditAvatarPreview(s.avatar_url || null);
                                  setEditAvatarFile(null);
                                }
                              }}>
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
          
          {/* âœ… PAGINATION: Add pagination UI */}
          {filteredStudents.length > itemsPerPage && (
            <div className="border-t border-primary/10 p-4 bg-gradient-to-l from-primary/5 to-transparent">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
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
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                {/* Avatar Upload */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-sans">{t('profilePicture' as TranslationKey)}</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20 ring-2 ring-blue-500/20">
                        <AvatarImage src={editAvatarPreview || editAvatarUrl || undefined} />
                        <AvatarFallback className="bg-blue-600 text-white font-semibold text-lg">
                          {selectedStudent.full_name.charAt(0).toUpperCase() || <User className="h-6 w-6" />}
                        </AvatarFallback>
                      </Avatar>
                      {(editAvatarPreview || editAvatarUrl) && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                          onClick={() => {
                            setEditAvatarFile(null);
                            setEditAvatarPreview(null);
                            setEditAvatarUrl('');
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith('image/')) {
                            toast.error(t('invalidImageFile' as TranslationKey));
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error(t('imageTooLarge' as TranslationKey));
                            return;
                          }
                          setEditAvatarFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditAvatarPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                        id="edit-avatar-upload"
                      />
                      <label htmlFor="edit-avatar-upload">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full font-sans"
                          disabled={uploadingEditAvatar}
                          asChild
                        >
                          <span className="cursor-pointer">
                            {uploadingEditAvatar ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('uploading' as TranslationKey)}
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                {editAvatarPreview || editAvatarUrl ? t('changePicture' as TranslationKey) : t('uploadPicture' as TranslationKey)}
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                        {t('imageUploadHint' as TranslationKey)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-sans">{t('basicInformation' as TranslationKey)}</h3>
                <form id="edit-student-form" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="text-sm font-medium font-sans">{t('fullName')}</label>
                    <Input name="full_name" defaultValue={selectedStudent.full_name} className="mt-1 font-sans" />
                  </div>
                  <div>
                      <label className="text-sm font-medium font-sans">{t('email')}</label>
                      <Input name="email" defaultValue={selectedStudent.email} className="mt-1 font-sans" disabled />
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
                      <div>
                        <label className="text-sm font-medium font-sans">{t('gender' as TranslationKey)}</label>
                        <Select value={editGender} onValueChange={(v) => setEditGender(v as 'male' | 'female' | '')}>
                          <SelectTrigger className="mt-1 font-sans">
                            <SelectValue placeholder={t('selectGender' as TranslationKey)} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t('male' as TranslationKey)}</SelectItem>
                            <SelectItem value="female">{t('female' as TranslationKey)}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium font-sans">{t('address' as TranslationKey)}</label>
                        <Input 
                          value={editAddress} 
                          onChange={(e) => setEditAddress(e.target.value)} 
                          className="mt-1 font-sans" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
                      <div>
                        <label className="text-sm font-medium font-sans">{t('dateOfBirth' as TranslationKey)}</label>
                        <Input 
                          type="date"
                          value={editDateOfBirth} 
                          onChange={(e) => setEditDateOfBirth(e.target.value)} 
                          className="mt-1 font-sans" 
                        />
                      </div>
                    </div>
                </form>
                </div>

                {/* Student-specific fields */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-sans">{t('studentInformation' as TranslationKey)}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium font-sans">{t('parentName' as TranslationKey)}</label>
                      <Input 
                        value={editParentName} 
                        onChange={(e) => setEditParentName(e.target.value)} 
                        className="mt-1 font-sans" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium font-sans">{t('parentPhone' as TranslationKey)}</label>
                      <Input 
                        value={editParentPhone} 
                        onChange={(e) => setEditParentPhone(e.target.value)} 
                        className="mt-1 font-sans" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium font-sans">{t('emergencyContact' as TranslationKey)}</label>
                    <Input 
                      value={editEmergencyContact} 
                      onChange={(e) => setEditEmergencyContact(e.target.value)} 
                      className="mt-1 font-sans" 
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-sans">
                {t('cancel')}
              </Button>
              <LoadingButton
                loading={savingEdit || uploadingEditAvatar}
                className="btn-gradient font-sans"
                onClick={async () => {
                  if (!selectedStudent) return;
                  try {
                    setSavingEdit(true);
                    // Get form values
                    const form = document.querySelector('#edit-student-form') as HTMLFormElement | null;
                    const full_name = (form?.querySelector('[name="full_name"]') as HTMLInputElement | null)?.value || selectedStudent.full_name;
                    const email = (form?.querySelector('[name="email"]') as HTMLInputElement | null)?.value || selectedStudent.email;
                    const phone = (form?.querySelector('[name="phone"]') as HTMLInputElement | null)?.value || selectedStudent.phone || null;
                    
                    // Upload avatar if a new file was selected
                    let finalAvatarUrl = editAvatarUrl;
                    if (editAvatarFile) {
                      setUploadingEditAvatar(true);
                      const { data: uploadData, error: uploadError } = await uploadUserAvatar(editAvatarFile, selectedStudent.id);
                      if (uploadError) {
                        toast.error(uploadError.message || t('failedToUploadAvatar' as TranslationKey));
                        setUploadingEditAvatar(false);
                        return;
                      }
                      finalAvatarUrl = uploadData?.publicUrl || '';
                      setUploadingEditAvatar(false);
                    }
                    
                    // Update profile with all fields
                    const { error } = await supabase
                      .from('profiles')
                      .update({
                        full_name: full_name.trim(),
                        phone: phone?.trim() || null,
                        language_preference: editLanguage,
                        gender: editGender || null,
                        avatar_url: finalAvatarUrl || null,
                        address: editAddress?.trim() || null,
                        date_of_birth: editDateOfBirth || null,
                        parent_name: editParentName?.trim() || null,
                        parent_phone: editParentPhone?.trim() || null,
                        emergency_contact: editEmergencyContact?.trim() || null,
                      })
                      .eq('id', selectedStudent.id);
                    
                    if (error) { toast.error(t('saveFailed')); return; }
                    // Optimistic UI update
                    setStudents(prev => prev.map(s => s.id === selectedStudent.id ? {
                      ...s,
                      full_name,
                      phone: phone || undefined,
                      language_preference: editLanguage,
                      gender: editGender || undefined,
                      avatar_url: finalAvatarUrl || undefined,
                      address: editAddress || undefined,
                      date_of_birth: editDateOfBirth || undefined,
                      parent_name: editParentName || undefined,
                      parent_phone: editParentPhone || undefined,
                      emergency_contact: editEmergencyContact || undefined,
                    } : s));
                    toast.success(t('studentUpdated'));
                    setIsDialogOpen(false);
                    setSelectedStudent(null);
                    setEditAvatarFile(null);
                    setEditAvatarPreview(null);
                    setEditAvatarUrl('');
                    // Avoid immediate refetch to prevent stale overwrite when Realtime is off
                  } finally { 
                    setSavingEdit(false);
                    setUploadingEditAvatar(false);
                  }
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
            <Button onClick={() => setCreateOpen(true)} className={cn('fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl z-50 md:hidden', 'bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90', 'text-white border-2 border-white/20', 'transition-all duration-300 transform', fabVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-32 opacity-0 scale-75')} size='icon'><Plus className='h-7 w-7' /></Button>
      </PullToRefresh>
    </DashboardLayout>
  );
}



