'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { SimplePageLoading } from '@/components/LoadingSpinner';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Calendar, School, BookOpen, Users, GraduationCap, ArrowLeft, Globe, Award, TrendingUp, MapPin, Briefcase, User, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TeacherProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'teacher';
  avatar_url?: string;
  phone?: string;
  language_preference?: string;
  gender?: 'male' | 'female';
  address?: string;
  date_of_birth?: string;
  specialization?: string;
  years_of_experience?: number;
  qualifications?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

interface TeacherClass {
  id: string;
  class_name: string;
  level: number;
  image_url?: string;
  student_count: number;
  subject_count: number;
}

interface TeacherSubject {
  id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  published: boolean;
}

export default function TeacherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { profile: currentProfile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const { setLabel } = useBreadcrumb();
  const teacherId = params.teacherId as string;

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalSubjects: 0,
    totalStudents: 0,
  });

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!authLoading && teacherId) {
      loadTeacherData();
    }
  }, [teacherId, authLoading]);

  const loadTeacherData = async () => {
    try {
      setLoading(true);

      // Load teacher profile
      const { data: teacherData, error: teacherError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', teacherId)
        .eq('role', 'teacher')
        .single();

      if (teacherError || !teacherData) {
        toast.error(language === 'ar' ? 'المعلم غير موجود' : 'Teacher not found');
        router.push('/dashboard/teachers');
        return;
      }

      setTeacher(teacherData as TeacherProfile);
      
      // Set breadcrumb label with teacher name instead of UUID
      if (teacherData?.full_name) {
        setLabel(teacherId, teacherData.full_name);
      }

      // Load classes and subjects in parallel
      const [classSubjectsRes, classesRes, subjectsRes] = await Promise.all([
        // Get classes from class_subjects (where teacher teaches subjects)
        supabase
          .from('class_subjects')
          .select('class_id, classes(id, class_name, level, image_url)')
          .eq('teacher_id', teacherId),
        // Get classes from classes table (where teacher is main teacher)
        supabase
          .from('classes')
          .select('id, class_name, level, image_url')
          .eq('teacher_id', teacherId),
        // Get all subjects taught by this teacher
        supabase
          .from('class_subjects')
          .select('id, subject_name, class_id, published, classes(class_name)')
          .eq('teacher_id', teacherId)
          .order('subject_name', { ascending: true }),
      ]);

      // Combine classes from both sources
      const classIdsSet = new Set<string>();
      const classesMap = new Map<string, TeacherClass>();

      // Add classes from class_subjects
      if (classSubjectsRes.data) {
        classSubjectsRes.data.forEach((item: any) => {
          if (item.class_id && item.classes) {
            const classId = item.class_id;
            if (!classIdsSet.has(classId)) {
              classIdsSet.add(classId);
              classesMap.set(classId, {
                id: classId,
                class_name: item.classes.class_name,
                level: item.classes.level || 0,
                image_url: item.classes.image_url,
                student_count: 0,
                subject_count: 0,
              });
            }
          }
        });
      }

      // Add classes from classes table
      if (classesRes.data) {
        classesRes.data.forEach((cls: any) => {
          if (cls.id && !classIdsSet.has(cls.id)) {
            classIdsSet.add(cls.id);
            classesMap.set(cls.id, {
              id: cls.id,
              class_name: cls.class_name,
              level: cls.level || 0,
              image_url: cls.image_url,
              student_count: 0,
              subject_count: 0,
            });
          }
        });
      }

      // Get student counts for all classes
      const allClassIds = Array.from(classIdsSet);
      if (allClassIds.length > 0) {
        const { data: enrollmentsData } = await supabase
          .from('student_enrollments')
          .select('class_id')
          .in('class_id', allClassIds)
          .eq('status', 'active');

        // Count students per class
        const studentCounts: Record<string, number> = {};
        (enrollmentsData || []).forEach((enrollment: any) => {
          studentCounts[enrollment.class_id] = (studentCounts[enrollment.class_id] || 0) + 1;
        });

        // Count subjects per class
        const subjectCounts: Record<string, number> = {};
        if (subjectsRes.data) {
          subjectsRes.data.forEach((subject: any) => {
            if (subject.class_id) {
              subjectCounts[subject.class_id] = (subjectCounts[subject.class_id] || 0) + 1;
            }
          });
        }

        // Update classes with counts
        classesMap.forEach((cls, id) => {
          cls.student_count = studentCounts[id] || 0;
          cls.subject_count = subjectCounts[id] || 0;
        });
      }

      const classesList = Array.from(classesMap.values()).sort((a, b) => 
        a.class_name.localeCompare(b.class_name)
      );

      setClasses(classesList);

      // Process subjects
      const subjectsList: TeacherSubject[] = (subjectsRes.data || []).map((subject: any) => ({
        id: subject.id,
        subject_name: subject.subject_name,
        class_id: subject.class_id,
        class_name: subject.classes?.class_name || '',
        published: subject.published || false,
      }));

      setSubjects(subjectsList);

      // Calculate stats
      const totalStudents = Object.values(
        classesList.reduce((acc: Record<string, number>, cls) => {
          acc[cls.id] = cls.student_count;
          return acc;
        }, {})
      ).reduce((sum, count) => sum + count, 0);

      setStats({
        totalClasses: classesList.length,
        totalSubjects: subjectsList.length,
        totalStudents,
      });
    } catch (error: any) {
      console.error('Error loading teacher data:', error);
      toast.error(language === 'ar' ? 'فشل تحميل بيانات المعلم' : 'Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  };

  const getLanguageLabel = (lang?: string) => {
    if (lang === 'ar') return language === 'ar' ? 'العربية' : 'Arabic';
    if (lang === 'fr') return language === 'ar' ? 'الفرنسية' : 'French';
    return language === 'ar' ? 'الإنجليزية' : 'English';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return as-is if invalid
    return date.toLocaleDateString(
      language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <SimplePageLoading text={language === 'ar' ? 'جاري تحميل بيانات المعلم...' : 'Loading teacher data...'} />
      </DashboardLayout>
    );
  }

  if (!teacher) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6 -mx-4 sm:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8 pb-20" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Hero Banner - Mobile First */}
        <div className="relative h-32 sm:h-40 md:h-48 lg:h-64 xl:h-80 w-full sm:w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 bg-gradient-to-br from-primary/90 via-accent/80 to-secondary/90 rtl:bg-gradient-to-bl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-accent/50 to-secondary/60 rtl:from-secondary/60 rtl:via-accent/50 rtl:to-primary/60" />
          <div className="absolute inset-0 islamic-pattern-subtle opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/10" />
          <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-20 md:h-24 lg:h-32 bg-gradient-to-t from-background via-background/95 to-transparent" />
          
          {/* Back Button - RTL Support */}
        <Button
            variant="ghost"
          size="sm"
            onClick={() => router.back()}
            className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 lg:top-6 lg:left-6 rtl:left-auto rtl:right-2 sm:rtl:right-3 md:rtl:right-4 lg:rtl:right-6 text-white hover:bg-white/20 hover:text-white z-10 backdrop-blur-sm h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 p-0"
        >
            <ArrowLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
            <span className="sr-only">{language === 'ar' ? 'عودة' : 'Back'}</span>
        </Button>
        </div>

        <div className="relative px-2 sm:px-3 md:px-4 lg:px-6 max-w-7xl mx-auto">
          {/* Profile Header Content - Mobile First */}
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 lg:gap-8 -mt-12 sm:-mt-16 md:-mt-20 lg:-mt-24 relative z-10 mb-3 sm:mb-4 md:mb-6 lg:mb-8">
            {/* Avatar */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="relative p-0.5 sm:p-1 md:p-1.5 bg-background rounded-full shadow-xl">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 border-2 sm:border-3 md:border-4 border-background shadow-inner">
                  <AvatarImage src={teacher.avatar_url} alt={teacher.full_name} className="object-cover" />
                  <AvatarFallback className="text-2xl sm:text-3xl md:text-4xl bg-primary/10 text-primary font-bold">
                    {teacher.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 md:bottom-2 md:right-2 lg:bottom-3 lg:right-3 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 bg-green-500 border-2 sm:border-3 md:border-4 border-background rounded-full" />
                </div>
              </div>

            {/* Info - Mobile First with RTL */}
            <div className={`flex-1 pt-0 sm:pt-1 md:pt-2 lg:pt-24 ${language === 'ar' ? 'text-right' : 'text-center md:text-left'}`}>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-1.5 sm:mb-2 font-display leading-tight">
                      {teacher.full_name}
                    </h1>
              <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 ${language === 'ar' ? 'justify-end' : 'justify-center md:justify-start'}`}>
                <Badge variant="secondary" className="px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs md:text-sm font-medium">
                  {teacher.specialization || (language === 'ar' ? 'معلم' : 'Teacher')}
                    </Badge>
                {teacher.years_of_experience && (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs md:text-sm text-muted-foreground bg-muted/50 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                    <span>{teacher.years_of_experience} {language === 'ar' ? 'سنوات' : 'Yrs'}</span>
                  </div>
                  )}
                </div>

              {/* Quick Actions - Mobile First */}
              <div className={`flex items-center gap-1.5 sm:gap-2 md:gap-3 ${language === 'ar' ? 'justify-end' : 'justify-center md:justify-start'}`}>
                <Button size="sm" className="gap-1 sm:gap-1.5 md:gap-2 shadow-sm text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 px-2 sm:px-3 md:px-4 flex items-center rtl:flex-row-reverse" onClick={() => window.location.href = `mailto:${teacher.email}`}>
                  <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                  <span className="text-left rtl:text-right">{language === 'ar' ? 'تواصل' : 'Contact'}</span>
                </Button>
                    </div>
                    </div>
                  </div>
                  
          {/* Main Content Tabs - Mobile First */}
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="sticky top-14 sm:top-16 z-30 bg-background/95 backdrop-blur-sm pb-2 sm:pb-3 md:pb-4 pt-2 -mx-2 sm:-mx-2 md:-mx-3 px-2 sm:px-2 md:px-3">
              <TabsList className="w-full justify-start rtl:justify-end h-auto p-0.5 sm:p-1 bg-muted/50 rounded-lg sm:rounded-xl overflow-x-auto flex-nowrap scrollbar-none">
                <TabsTrigger value="overview" className="flex-1 min-w-[90px] sm:min-w-[100px] md:min-w-[110px] py-2 sm:py-2.5 px-2 sm:px-2.5 md:px-3 rounded-md sm:rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] sm:text-xs md:text-sm flex items-center justify-center rtl:flex-row-reverse gap-1 sm:gap-1.5 md:gap-2">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate text-left rtl:text-right whitespace-nowrap">{language === 'ar' ? 'نظرة عامة' : 'Overview'}</span>
                </TabsTrigger>
                <TabsTrigger value="classes" className="flex-1 min-w-[90px] sm:min-w-[100px] md:min-w-[110px] py-2 sm:py-2.5 px-2 sm:px-2.5 md:px-3 rounded-md sm:rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] sm:text-xs md:text-sm flex items-center justify-center rtl:flex-row-reverse gap-1 sm:gap-1.5 md:gap-2">
                  <School className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate text-left rtl:text-right whitespace-nowrap">{language === 'ar' ? 'الفصول' : 'Classes'}</span>
                  <Badge variant="secondary" className="h-3.5 sm:h-4 md:h-5 px-1 sm:px-1 md:px-1.5 text-[8px] sm:text-[9px] md:text-[10px] flex-shrink-0">{stats.totalClasses}</Badge>
                </TabsTrigger>
                <TabsTrigger value="subjects" className="flex-1 min-w-[90px] sm:min-w-[100px] md:min-w-[110px] py-2 sm:py-2.5 px-2 sm:px-2.5 md:px-3 rounded-md sm:rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-[10px] sm:text-xs md:text-sm flex items-center justify-center rtl:flex-row-reverse gap-1 sm:gap-1.5 md:gap-2">
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate text-left rtl:text-right whitespace-nowrap">{language === 'ar' ? 'المواد' : 'Subjects'}</span>
                  <Badge variant="secondary" className="h-3.5 sm:h-4 md:h-5 px-1 sm:px-1 md:px-1.5 text-[8px] sm:text-[9px] md:text-[10px] flex-shrink-0">{stats.totalSubjects}</Badge>
                </TabsTrigger>
              </TabsList>
                  </div>
                  
            <TabsContent value="overview" className="space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8 animate-in fade-in-50 duration-500 mt-2 sm:mt-3 md:mt-4 lg:mt-6">
              {/* Stats Grid - Mobile First */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4">
                <div className="p-2.5 sm:p-3 md:p-3 lg:p-4 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 text-center">
                  <div className="mx-auto w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-primary/20 flex items-center justify-center mb-1 sm:mb-1.5 md:mb-2 text-primary">
                    <School className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5 lg:h-5 lg:w-5" />
                    </div>
                  <div className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-primary">{stats.totalClasses}</div>
                  <div className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">{language === 'ar' ? 'فصول' : 'Classes'}</div>
                    </div>
                <div className="p-2.5 sm:p-3 md:p-3 lg:p-4 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/10 text-center">
                  <div className="mx-auto w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-accent/20 flex items-center justify-center mb-1 sm:mb-1.5 md:mb-2 text-accent">
                    <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5 lg:h-5 lg:w-5" />
                  </div>
                  <div className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-accent">{stats.totalSubjects}</div>
                  <div className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">{language === 'ar' ? 'مواد' : 'Subjects'}</div>
                </div>
                <div className="p-2.5 sm:p-3 md:p-3 lg:p-4 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/10 text-center">
                  <div className="mx-auto w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-1 sm:mb-1.5 md:mb-2 text-green-600">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5 lg:h-5 lg:w-5" />
              </div>
                  <div className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-green-600">{stats.totalStudents}</div>
                  <div className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">{language === 'ar' ? 'طلاب' : 'Students'}</div>
          </div>
        </div>

              {/* Content Grid - Mobile First */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                {/* Main Column: Bio & Contact */}
                <div className="md:col-span-2 space-y-3 sm:space-y-4 md:space-y-6 order-2 md:order-1">
                  <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                      <CardTitle className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-1.5 sm:gap-2 text-left rtl:text-right">
                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                        {language === 'ar' ? 'عن المعلم' : 'About Teacher'}
              </CardTitle>
            </CardHeader>
                    <CardContent className="px-3 sm:px-4 md:px-5 lg:px-6 pb-3 sm:pb-4 md:pb-5 lg:pb-6 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
                      {teacher.bio ? (
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line text-left rtl:text-right">
                    {teacher.bio}
                  </p>
                      ) : (
                        <p className="text-sm sm:text-base text-muted-foreground italic text-left rtl:text-right">
                          {language === 'ar' ? 'لا توجد نبذة متاحة.' : 'No biography available.'}
                        </p>
              )}
              
              {teacher.qualifications && (
                        <div className="pt-3 sm:pt-4 border-t border-border/50">
                          <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2 flex items-center gap-2 text-left rtl:text-right">
                            <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent flex-shrink-0" />
                    {language === 'ar' ? 'المؤهلات' : 'Qualifications'}
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-left rtl:text-right">
                    {teacher.qualifications}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

                {/* Sidebar Column: Details - Mobile First */}
                <div className="space-y-3 sm:space-y-4 md:space-y-6 order-1 md:order-2">
                  <Card className="border-none shadow-sm bg-muted/30">
                    <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6 pb-2">
                      <CardTitle className="text-xs sm:text-sm md:text-base font-semibold text-left rtl:text-right">
                        {language === 'ar' ? 'معلومات التواصل' : 'Contact Info'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-4 md:px-5 lg:px-6 pb-3 sm:pb-4 md:pb-5 lg:pb-6 space-y-2.5 sm:space-y-3 md:space-y-4">
                      <div className="flex items-start gap-2 sm:gap-3 rtl:flex-row-reverse">
                        <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 sm:mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0 text-left rtl:text-right">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{language === 'ar' ? 'البريد' : 'Email'}</p>
                          <p className="text-xs sm:text-sm font-medium break-all">{teacher.email}</p>
                        </div>
                      </div>
                      {teacher.phone && (
                        <div className="flex items-start gap-2 sm:gap-3 rtl:flex-row-reverse">
                          <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 sm:mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0 text-left rtl:text-right">
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{language === 'ar' ? 'الهاتف' : 'Phone'}</p>
                            <p className="text-xs sm:text-sm font-medium">{teacher.phone}</p>
                          </div>
                        </div>
                      )}
                      {teacher.address && (
                        <div className="flex items-start gap-2 sm:gap-3 rtl:flex-row-reverse">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 sm:mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0 text-left rtl:text-right">
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{language === 'ar' ? 'العنوان' : 'Address'}</p>
                            <p className="text-xs sm:text-sm font-medium">{teacher.address}</p>
                          </div>
                </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm bg-muted/30">
                    <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6 pb-2">
                      <CardTitle className="text-xs sm:text-sm md:text-base font-semibold text-left rtl:text-right">
                        {language === 'ar' ? 'معلومات إضافية' : 'Details'}
              </CardTitle>
            </CardHeader>
                    <CardContent className="px-3 sm:px-4 md:px-5 lg:px-6 pb-3 sm:pb-4 md:pb-5 lg:pb-6 space-y-2.5 sm:space-y-3 md:space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] sm:text-xs text-muted-foreground text-left rtl:text-right">{language === 'ar' ? 'تاريخ الانضمام' : 'Joined'}</span>
                        <span className="text-xs sm:text-sm font-medium text-left rtl:text-right">{formatDate(teacher.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] sm:text-xs text-muted-foreground text-left rtl:text-right">{language === 'ar' ? 'اللغة' : 'Language'}</span>
                        <span className="text-xs sm:text-sm font-medium text-left rtl:text-right">{getLanguageLabel(teacher.language_preference)}</span>
                      </div>
                      {teacher.gender && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] sm:text-xs text-muted-foreground text-left rtl:text-right">{language === 'ar' ? 'الجنس' : 'Gender'}</span>
                          <span className="text-xs sm:text-sm font-medium capitalize text-left rtl:text-right">
                            {teacher.gender === 'male' 
                              ? (language === 'ar' ? 'ذكر' : 'Male') 
                              : (language === 'ar' ? 'أنثى' : 'Female')}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="classes" className="space-y-3 sm:space-y-4 md:space-y-6 animate-in fade-in-50 duration-500 mt-2 sm:mt-3 md:mt-4 lg:mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                {classes.map((cls) => (
                  <Card
                    key={cls.id}
                    className="group cursor-pointer hover:shadow-md transition-all duration-300 border-border/50 overflow-hidden active:scale-[0.98]"
                    onClick={() => router.push(`/dashboard/classes`)}
                  >
                    <div className="relative h-28 sm:h-32 md:h-36 lg:h-32 bg-muted">
                      {cls.image_url ? (
                        <img src={cls.image_url} alt={cls.class_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                          <School className="h-10 w-10 sm:h-12 sm:w-12 text-primary/20" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2">
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-[10px] sm:text-xs px-2 py-0.5">
                          {language === 'ar' ? 'مستوى' : 'Lvl'} {cls.level}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-3 sm:p-3.5 md:p-4">
                      <h3 className="font-bold text-sm sm:text-base md:text-lg mb-1.5 sm:mb-2 group-hover:text-primary transition-colors line-clamp-1 text-left rtl:text-right">{cls.class_name}</h3>
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="font-medium">{cls.student_count}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="font-medium">{cls.subject_count}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {classes.length === 0 && (
                  <div className="col-span-full py-8 sm:py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                    <School className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-20" />
                    <p className="text-sm sm:text-base">{language === 'ar' ? 'لا توجد فصول مسجلة' : 'No classes found'}</p>
              </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="subjects" className="space-y-3 sm:space-y-4 md:space-y-6 animate-in fade-in-50 duration-500 mt-2 sm:mt-3 md:mt-4 lg:mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                {subjects.map((subject) => (
                  <Card 
                    key={subject.id} 
                    className="group cursor-pointer hover:shadow-md transition-all duration-300 border-border/50 active:scale-[0.98]"
                    onClick={() => {
                        if (currentProfile?.role === 'student') {
                          router.push(`/dashboard/my-classes/${subject.class_id}/subjects/${subject.id}`);
                        } else {
                          router.push(`/dashboard/subjects/${subject.id}/lessons`);
                        }
                    }}
                  >
                    <CardContent className="p-3 sm:p-4 md:p-5">
                      <div className="flex items-start justify-between mb-2 sm:mb-2.5 md:mb-3 gap-1.5 sm:gap-2">
                        <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-300 flex-shrink-0">
                          <BookOpen className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
              </div>
                        <Badge variant={subject.published ? 'success' : 'secondary'} className="text-[9px] sm:text-[10px] md:text-xs flex-shrink-0 px-1.5 sm:px-2 py-0.5">
                          {subject.published 
                            ? (language === 'ar' ? 'منشور' : 'Published') 
                            : (language === 'ar' ? 'مسودة' : 'Draft')}
                        </Badge>
                  </div>
                      <h3 className="font-bold text-sm sm:text-base md:text-base mb-1.5 sm:mb-2 group-hover:text-accent transition-colors line-clamp-2 text-left rtl:text-right leading-tight">
                        {subject.subject_name}
                      </h3>
                      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                        <School className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                        <span className="truncate text-left rtl:text-right font-medium">{subject.class_name}</span>
              </div>
            </CardContent>
          </Card>
                ))}
                {subjects.length === 0 && (
                  <div className="col-span-full py-8 sm:py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                    <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-20" />
                    <p className="text-sm sm:text-base">{language === 'ar' ? 'لا توجد مواد مسجلة' : 'No subjects found'}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}

