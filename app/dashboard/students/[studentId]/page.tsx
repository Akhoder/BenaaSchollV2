'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Phone, Calendar, School, BookOpen, Users, User, ArrowLeft, Globe, Award, TrendingUp, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fetchMyEnrolledClassesWithDetails } from '@/lib/supabase';

interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'student';
  avatar_url?: string;
  phone?: string;
  language_preference?: string;
  created_at: string;
  updated_at: string;
}

interface StudentClass {
  id: string;
  class_name: string;
  level: number;
  image_url?: string;
  teacher_name?: string;
  enrolled_at: string;
}

interface StudentGrade {
  subject_name: string;
  assignment_title: string;
  score: number;
  total_points: number;
  percentage: number;
}

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { profile: currentProfile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [stats, setStats] = useState({
    totalClasses: 0,
    averageGrade: 0,
    totalAssignments: 0,
    completedAssignments: 0,
  });

  useEffect(() => {
    if (!authLoading && studentId && currentProfile) {
      // Check authorization
      if (currentProfile.role !== 'admin' && 
          currentProfile.role !== 'teacher' && 
          currentProfile.id !== studentId) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      loadStudentData();
    }
  }, [studentId, authLoading, currentProfile]);

  const loadStudentData = async () => {
    try {
      setLoading(true);

      // Load student profile
      const { data: studentData, error: studentError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .eq('role', 'student')
        .single();

      if (studentError || !studentData) {
        toast.error(language === 'ar' ? 'الطالب غير موجود' : 'Student not found');
        router.push('/dashboard/students');
        return;
      }

      setStudent(studentData as StudentProfile);

      // Load classes, grades, and assignments in parallel
      const [enrollmentsRes, assignmentsRes] = await Promise.all([
        // Get enrolled classes
        supabase
          .from('student_enrollments')
          .select('class_id, enrolled_at, classes(id, class_name, level, image_url, teacher_id, teacher:profiles!teacher_id(full_name))')
          .eq('student_id', studentId)
          .eq('status', 'active'),
        // Get assignments and grades
        supabase
          .from('assignment_submissions')
          .select(`
            id,
            assignment_id,
            score,
            status,
            assignments!inner(
              id,
              title,
              total_points,
              subject_id,
              class_subjects!inner(
                id,
                subject_name,
                class_id
              )
            )
          `)
          .eq('student_id', studentId),
      ]);

      // Process classes
      const classesList: StudentClass[] = (enrollmentsRes.data || []).map((enrollment: any) => ({
        id: enrollment.classes.id,
        class_name: enrollment.classes.class_name,
        level: enrollment.classes.level || 0,
        image_url: enrollment.classes.image_url,
        teacher_name: enrollment.classes.teacher?.full_name,
        enrolled_at: enrollment.enrolled_at,
      }));

      setClasses(classesList);

      // Process grades
      const gradesList: StudentGrade[] = (assignmentsRes.data || [])
        .filter((submission: any) => submission.status === 'graded' && submission.score !== null)
        .map((submission: any) => {
          const assignment = submission.assignments;
          const subject = assignment.class_subjects;
          const percentage = assignment.total_points > 0 
            ? (submission.score / assignment.total_points) * 100 
            : 0;
          
          return {
            subject_name: subject.subject_name,
            assignment_title: assignment.title,
            score: submission.score,
            total_points: assignment.total_points,
            percentage: Math.round(percentage),
          };
        });

      setGrades(gradesList);

      // Calculate stats
      const totalAssignments = (assignmentsRes.data || []).length;
      const completedAssignments = (assignmentsRes.data || []).filter(
        (s: any) => s.status === 'graded' || s.status === 'submitted'
      ).length;

      const averageGrade = gradesList.length > 0
        ? gradesList.reduce((sum, g) => sum + g.percentage, 0) / gradesList.length
        : 0;

      setStats({
        totalClasses: classesList.length,
        averageGrade: Math.round(averageGrade),
        totalAssignments,
        completedAssignments,
      });
    } catch (error: any) {
      console.error('Error loading student data:', error);
      toast.error(language === 'ar' ? 'فشل تحميل بيانات الطالب' : 'Failed to load student data');
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
    const date = new Date(dateString);
    return date.toLocaleDateString(
      language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 80) return 'text-blue-600 bg-blue-50';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
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

  if (unauthorized) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl mx-auto mt-8">
          <CardContent className="pt-6 text-center">
            <div className="mb-4">
              <Users className="h-16 w-16 text-muted-foreground mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {language === 'ar' ? 'غير مصرح بالوصول' : 'Access Denied'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {language === 'ar' 
                ? 'ليس لديك صلاحية لعرض هذه الصفحة'
                : 'You do not have permission to view this page'}
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              {language === 'ar' ? 'العودة إلى الداشبورد' : 'Back to Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/students')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'العودة إلى الطلاب' : 'Back to Students'}
        </Button>

        {/* Hero Section with Student Photo */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              {/* Student Photo - Large and Professional */}
              <div className="relative flex-shrink-0 group">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-xl opacity-50" />
                
                {/* Avatar with Border */}
                <div className="relative">
                  {student.avatar_url ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-sm opacity-75" />
                      <img
                        src={student.avatar_url}
                        alt={student.full_name}
                        className="relative w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-2xl"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-sm opacity-75" />
                      <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-2xl relative">
                        <AvatarFallback className="text-4xl md:text-5xl bg-gradient-to-br from-primary to-accent text-white font-bold">
                          {student.full_name
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

              {/* Student Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                      {student.full_name}
                    </h1>
                    <Badge variant="default" className="text-sm px-3 py-1">
                      <User className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'طالب' : 'Student'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-lg">
                    {language === 'ar' ? 'طالب في المدرسة' : 'School Student'}
                  </p>
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
                      <p className="text-sm font-medium truncate">{student.email}</p>
                    </div>
                  </div>
                  
                  {student.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          {language === 'ar' ? 'الهاتف' : 'Phone'}
                        </p>
                        <p className="text-sm font-medium">{student.phone}</p>
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
                      <p className="text-sm font-medium">{getLanguageLabel(student.language_preference)}</p>
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
                      <p className="text-sm font-medium">{formatDate(student.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Enhanced Design */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-green-500/10 transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'المعدل' : 'Average'}
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">{stats.averageGrade}%</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'نسبة مئوية' : 'percentage'}
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'الواجبات' : 'Assignments'}
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">{stats.totalAssignments}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'واجب' : 'assignment'}{stats.totalAssignments !== 1 ? (language === 'ar' ? 'ات' : 's') : ''}
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'مكتملة' : 'Completed'}
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <CheckCircle2 className="h-5 w-5 text-accent-foreground" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold mb-1">{stats.completedAssignments}</div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'واجب مكتمل' : 'completed'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Classes Section */}
        {classes.length > 0 && (
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/50">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <School className="h-5 w-5 text-primary" />
                </div>
                {language === 'ar' ? 'الفصول المسجل فيها' : 'Enrolled Classes'}
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
                      {cls.teacher_name && (
                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {cls.teacher_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'تاريخ التسجيل:' : 'Enrolled:'} {formatDate(cls.enrolled_at)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grades Section */}
        {grades.length > 0 && (
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/50">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Award className="h-5 w-5 text-green-600" />
                </div>
                {language === 'ar' ? 'التقديرات' : 'Grades'}
                <Badge variant="secondary" className="ml-auto">
                  {grades.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">{language === 'ar' ? 'المادة' : 'Subject'}</TableHead>
                      <TableHead className="font-semibold">{language === 'ar' ? 'الواجب' : 'Assignment'}</TableHead>
                      <TableHead className="font-semibold">{language === 'ar' ? 'الدرجة' : 'Score'}</TableHead>
                      <TableHead className="font-semibold">{language === 'ar' ? 'النسبة' : 'Percentage'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.map((grade, index) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {grade.subject_name}
                          </div>
                        </TableCell>
                        <TableCell>{grade.assignment_title}</TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {grade.score} / {grade.total_points}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('font-semibold', getGradeColor(grade.percentage))}>
                            {grade.percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {classes.length === 0 && grades.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' 
                  ? 'لا توجد فصول أو تقديرات مسجلة لهذا الطالب'
                  : 'No classes or grades registered for this student'}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

