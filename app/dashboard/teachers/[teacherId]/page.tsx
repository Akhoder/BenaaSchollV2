'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Phone, Calendar, School, BookOpen, Users, GraduationCap, ArrowLeft, Globe, Award, TrendingUp, MapPin, Briefcase, User, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!teacher) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/teachers')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'العودة إلى المعلمين' : 'Back to Teachers'}
        </Button>

        {/* Hero Section with Teacher Photo */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              {/* Teacher Photo - Large and Professional */}
              <div className="relative flex-shrink-0 group">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-xl opacity-50" />
                
                {/* Avatar with Border */}
                <div className="relative">
                  {teacher.avatar_url ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-sm opacity-75" />
                      <img
                        src={teacher.avatar_url}
                        alt={teacher.full_name}
                        className="relative w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-2xl"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-sm opacity-75" />
                      <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-2xl relative">
                        <AvatarFallback className="text-4xl md:text-5xl bg-gradient-to-br from-primary to-accent text-white font-bold">
                          {teacher.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute -bottom-2 -right-2 bg-green-500 border-4 border-white rounded-full w-6 h-6 shadow-lg" />
                </div>
              </div>

              {/* Teacher Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                      {teacher.full_name}
                    </h1>
                    <Badge variant="default" className="text-sm px-3 py-1">
                      <GraduationCap className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'معلم' : 'Teacher'}
                    </Badge>
                    {teacher.gender && (
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        <User className="h-3 w-3 mr-1" />
                        {teacher.gender === 'male' ? (language === 'ar' ? 'ذكر' : 'Male') : (language === 'ar' ? 'أنثى' : 'Female')}
                      </Badge>
                    )}
                  </div>
                  {teacher.specialization ? (
                    <p className="text-muted-foreground text-lg font-medium">
                      {teacher.specialization}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-lg">
                      {language === 'ar' ? 'معلم محترف في المدرسة' : 'Professional Teacher'}
                    </p>
                  )}
                  {teacher.years_of_experience && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {teacher.years_of_experience} {language === 'ar' ? 'سنة خبرة' : 'years of experience'}
                    </p>
                  )}
                </div>

                {/* Contact Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                      </p>
                      <p className="text-sm font-medium truncate">{teacher.email}</p>
                    </div>
                  </div>
                  
                  {teacher.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          {language === 'ar' ? 'الهاتف' : 'Phone'}
                        </p>
                        <p className="text-sm font-medium">{teacher.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {teacher.address && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          {language === 'ar' ? 'العنوان' : 'Address'}
                        </p>
                        <p className="text-sm font-medium truncate">{teacher.address}</p>
                      </div>
                    </div>
                  )}
                  
                  {teacher.date_of_birth && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          {language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}
                        </p>
                        <p className="text-sm font-medium">{formatDate(teacher.date_of_birth)}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {language === 'ar' ? 'اللغة المفضلة' : 'Preferred Language'}
                      </p>
                      <p className="text-sm font-medium">{getLanguageLabel(teacher.language_preference)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {language === 'ar' ? 'تاريخ الانضمام' : 'Joined'}
                      </p>
                      <p className="text-sm font-medium">{formatDate(teacher.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio & Qualifications Section */}
        {(teacher.bio || teacher.qualifications || teacher.specialization) && (
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/50">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                {language === 'ar' ? 'معلومات إضافية' : 'Additional Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {teacher.bio && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {language === 'ar' ? 'نبذة عن المعلم' : 'About'}
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {teacher.bio}
                  </p>
                </div>
              )}
              
              {teacher.specialization && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {language === 'ar' ? 'التخصص' : 'Specialization'}
                  </h3>
                  <p className="text-sm text-foreground">
                    {teacher.specialization}
                  </p>
                </div>
              )}
              
              {teacher.qualifications && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    {language === 'ar' ? 'المؤهلات' : 'Qualifications'}
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {teacher.qualifications}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Cards - Enhanced Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'الفصول' : 'Classes'}
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <School className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">{stats.totalClasses}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'فصل دراسي' : 'class'}{stats.totalClasses !== 1 ? (language === 'ar' ? 'ات' : 'es') : ''}
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'المواد' : 'Subjects'}
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <BookOpen className="h-5 w-5 text-accent-foreground" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">{stats.totalSubjects}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'مادة دراسية' : 'subject'}{stats.totalSubjects !== 1 ? (language === 'ar' ? 'ات' : 's') : ''}
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-green-500/10 transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'الطلاب' : 'Students'}
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'طالب' : 'student'}{stats.totalStudents !== 1 ? (language === 'ar' ? 'ين' : 's') : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Classes Section - Enhanced */}
        {classes.length > 0 && (
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/50">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <School className="h-5 w-5 text-primary" />
                </div>
                {language === 'ar' ? 'الفصول التي يدرسها' : 'Classes Taught'}
                <Badge variant="secondary" className="ml-auto">
                  {classes.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls) => (
                  <Card
                    key={cls.id}
                    className="cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all group overflow-hidden border-2"
                    onClick={() => router.push(`/dashboard/classes`)}
                  >
                    <div className="relative">
                      {cls.image_url ? (
                        <div className="relative h-32 overflow-hidden">
                          <img
                            src={cls.image_url}
                            alt={cls.class_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                      ) : (
                        <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <School className="h-12 w-12 text-primary/50" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white/90 text-foreground backdrop-blur-sm">
                          {language === 'ar' ? 'المستوى' : 'Lv.'} {cls.level}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                        {cls.class_name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{cls.student_count}</span>
                          <span className="text-xs">{language === 'ar' ? 'طالب' : 'students'}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-medium">{cls.subject_count}</span>
                          <span className="text-xs">{language === 'ar' ? 'مادة' : 'subjects'}</span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subjects Section - Enhanced */}
        {subjects.length > 0 && (
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/50">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-accent/10">
                  <BookOpen className="h-5 w-5 text-accent-foreground" />
                </div>
                {language === 'ar' ? 'المواد التي يدرسها' : 'Subjects Taught'}
                <Badge variant="secondary" className="ml-auto">
                  {subjects.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">{language === 'ar' ? 'اسم المادة' : 'Subject Name'}</TableHead>
                      <TableHead className="font-semibold">{language === 'ar' ? 'الفصل' : 'Class'}</TableHead>
                      <TableHead className="font-semibold">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead className="text-right font-semibold">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((subject, index) => (
                      <TableRow 
                        key={subject.id}
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/subjects/${subject.id}/lessons`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            {subject.subject_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4 text-muted-foreground" />
                            {subject.class_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={subject.published ? 'default' : 'secondary'}
                            className={cn(
                              subject.published && 'bg-green-500 hover:bg-green-600'
                            )}
                          >
                            {subject.published
                              ? language === 'ar' ? 'منشور' : 'Published'
                              : language === 'ar' ? 'مسودة' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-primary hover:text-primary-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/subjects/${subject.id}/lessons`);
                            }}
                          >
                            {language === 'ar' ? 'عرض' : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {classes.length === 0 && subjects.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' 
                  ? 'لا توجد فصول أو مواد مسجلة لهذا المعلم'
                  : 'No classes or subjects registered for this teacher'}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

