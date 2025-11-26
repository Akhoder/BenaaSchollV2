'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Award, Users, School, BarChart3, Target, Lightbulb, BookOpen, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StudentPerformance {
  studentId: string;
  studentName: string;
  averageGrade: number;
  trend: 'improving' | 'declining' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  predictedGrade: number;
  attendanceRate: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  recommendations: string[];
}

interface ClassAnalytics {
  classId: string;
  className: string;
  totalStudents: number;
  averageGrade: number;
  atRiskStudents: number;
  topPerformers: number;
  students: StudentPerformance[];
}

interface OverviewData {
  totalClasses: number;
  totalStudents: number;
  averageGrade: number;
  atRiskStudents: number;
  topPerformers: number;
  classes: ClassAnalytics[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classData, setClassData] = useState<ClassAnalytics | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentPerformance | null>(null);

  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.role !== 'admin' && profile.role !== 'teacher') {
        router.push('/dashboard');
        return;
      }
      loadOverview();
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (selectedClass && selectedClass !== 'all') {
      loadClassData(selectedClass);
    } else {
      setClassData(null);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentData(selectedStudent);
    } else {
      setStudentData(null);
    }
  }, [selectedStudent]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ type: 'overview' }),
      });

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const result = await response.json();
      setOverviewData(result.data);
    } catch (error: any) {
      console.error('Error loading overview:', error);
      toast.error(language === 'ar' ? 'فشل تحميل التحليلات' : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadClassData = async (classId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ type: 'class', classId }),
      });

      if (!response.ok) {
        throw new Error('Failed to load class data');
      }

      const result = await response.json();
      setClassData(result.data);
    } catch (error: any) {
      console.error('Error loading class data:', error);
      toast.error(language === 'ar' ? 'فشل تحميل بيانات الفصل' : 'Failed to load class data');
    }
  };

  const loadStudentData = async (studentId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ type: 'student', studentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to load student data');
      }

      const result = await response.json();
      setStudentData(result.data);
    } catch (error: any) {
      console.error('Error loading student data:', error);
      toast.error(language === 'ar' ? 'فشل تحميل بيانات الطالب' : 'Failed to load student data');
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-error" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    if (language === 'ar') {
      switch (trend) {
        case 'improving': return 'في تحسن';
        case 'declining': return 'في تراجع';
        default: return 'مستقر';
      }
    } else {
      switch (trend) {
        case 'improving': return 'Improving';
        case 'declining': return 'Declining';
        default: return 'Stable';
      }
    }
  };

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive'> = {
      low: 'success',
      medium: 'warning',
      high: 'destructive',
    };
    
    const labels: Record<string, Record<string, string>> = {
      low: { ar: 'منخفض', en: 'Low' },
      medium: { ar: 'متوسط', en: 'Medium' },
      high: { ar: 'عالي', en: 'High' },
    };

    const icons: Record<string, React.ReactNode> = {
      low: <CheckCircle2 className="h-3 w-3" />,
      medium: <AlertTriangle className="h-3 w-3" />,
      high: <AlertTriangle className="h-3 w-3" />,
    };

    return (
      <Badge variant={variants[risk] || 'warning'} className="gap-1.5">
        {icons[risk]}
        {labels[risk]?.[language] || risk}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <PageLoading
          text={language === 'ar' ? 'جاري تحميل التحليلات...' : 'Loading analytics...'}
          statsCount={4}
          contentType="table"
          contentRows={6}
        />
      </DashboardLayout>
    );
  }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={BarChart3}
          title={language === 'ar' ? 'تحليلات الأداء التنبؤية' : 'Predictive Performance Analytics'}
          description={language === 'ar' 
            ? 'تحليل ذكي لأداء الطلاب وتنبؤ بالدرجات المستقبلية'
            : 'Intelligent analysis of student performance and grade predictions'}
        />

        {/* ✨ Overview Stats - Islamic Design */}
        {overviewData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in-up">
            {/* Total Students */}
            <Card className="glass-card-hover border-primary/10 hover:border-primary/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary font-display">
                  {overviewData.totalStudents}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'في جميع الفصول' : 'Across all classes'}
                </p>
              </CardContent>
            </Card>

            {/* Average Grade */}
            <Card className="glass-card-hover border-primary/10 hover:border-success/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {language === 'ar' ? 'المعدل العام' : 'Average Grade'}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-success to-primary rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Target className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success font-display">
                  {overviewData.averageGrade}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'للطلاب الحاليين' : 'Current students'}
                </p>
              </CardContent>
            </Card>

            {/* At Risk Students */}
            <Card className="glass-card-hover border-primary/10 hover:border-error/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {language === 'ar' ? 'معرضون للخطر' : 'At Risk'}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-error to-error/80 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-error font-display">
                  {overviewData.atRiskStudents}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'بحاجة للمتابعة' : 'Need attention'}
                </p>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="glass-card-hover border-primary/10 hover:border-secondary/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {language === 'ar' ? 'متفوقون' : 'Top Performers'}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Award className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-secondary font-display">
                  {overviewData.topPerformers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'طلاب متميزون' : 'Excellent students'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ✨ Class Selector - Islamic Design */}
        {overviewData && overviewData.classes.length > 0 && (
          <Card className="glass-card border-primary/10">
            <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
              <CardTitle className="flex items-center gap-3 text-primary">
                <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                  <School className="h-5 w-5 text-white" />
                </div>
                {language === 'ar' ? 'اختر الفصل' : 'Select Class'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full md:w-[320px] h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder={language === 'ar' ? 'اختر الفصل' : 'Select class'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4 text-primary" />
                        <span>{language === 'ar' ? 'جميع الفصول' : 'All Classes'}</span>
                      </div>
                    </SelectItem>
                    {overviewData.classes.map((cls) => (
                      <SelectItem key={cls.classId} value={cls.classId}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-accent" />
                          <span>{cls.className}</span>
                          <Badge variant="islamic" className="ml-2 text-xs">
                            {cls.totalStudents}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClass !== 'all' && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedClass('all')}
                    className="border-primary/20 hover:bg-primary/10"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ✨ Class Analytics - Islamic Design */}
        {classData && (
          <Card className="glass-card border-primary/10 overflow-hidden">
            <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                  <School className="h-5 w-5 text-white" />
                </div>
                <span className="text-primary font-display">{classData.className}</span>
                <Badge variant="islamic" className="ml-auto">
                  {classData.totalStudents} {language === 'ar' ? 'طالب' : 'students'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Class Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {language === 'ar' ? 'المعدل العام' : 'Average Grade'}
                  </p>
                  <p className="text-3xl font-bold text-primary font-display">{classData.averageGrade}%</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-error/5 to-error/5 border border-error/20">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-error" />
                    {language === 'ar' ? 'معرضون للخطر' : 'At Risk'}
                  </p>
                  <p className="text-3xl font-bold text-error font-display">{classData.atRiskStudents}</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-success/5 to-success/5 border border-success/20">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Award className="h-4 w-4 text-success" />
                    {language === 'ar' ? 'متفوقون' : 'Top Performers'}
                  </p>
                  <p className="text-3xl font-bold text-success font-display">{classData.topPerformers}</p>
                </div>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto rounded-xl border border-primary/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10 hover:bg-gradient-to-l hover:from-primary/10 hover:to-secondary/10">
                      <TableHead className="font-bold text-foreground">{language === 'ar' ? 'اسم الطالب' : 'Student Name'}</TableHead>
                      <TableHead className="font-bold text-foreground">{language === 'ar' ? 'المعدل' : 'Average'}</TableHead>
                      <TableHead className="font-bold text-foreground">{language === 'ar' ? 'التنبؤ' : 'Predicted'}</TableHead>
                      <TableHead className="font-bold text-foreground">{language === 'ar' ? 'الاتجاه' : 'Trend'}</TableHead>
                      <TableHead className="font-bold text-foreground">{language === 'ar' ? 'مستوى الخطر' : 'Risk Level'}</TableHead>
                      <TableHead className="font-bold text-foreground">{language === 'ar' ? 'الحضور' : 'Attendance'}</TableHead>
                      <TableHead className="font-bold text-foreground text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classData.students.map((student, index) => (
                      <TableRow 
                        key={student.studentId} 
                        className="hover:bg-primary/5 border-b border-border/50 transition-all duration-200 animate-fade-in-up group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Student Name with Avatar */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 ring-2 ring-secondary/30 group-hover:ring-primary/50 transition-all">
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm font-semibold">
                                {student.studentName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground">
                              {student.studentName}
                            </span>
                          </div>
                        </TableCell>

                        {/* Average Grade */}
                        <TableCell>
                          <Badge 
                            variant={
                              student.averageGrade >= 85 ? 'success' :
                              student.averageGrade >= 70 ? 'info' :
                              student.averageGrade >= 60 ? 'warning' :
                              'destructive'
                            }
                            className="font-semibold"
                          >
                            {student.averageGrade}%
                          </Badge>
                        </TableCell>

                        {/* Predicted Grade */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            <span className="font-medium text-primary">{student.predictedGrade}%</span>
                          </div>
                        </TableCell>

                        {/* Trend */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(student.trend)}
                            <span className="text-sm font-medium">{getTrendLabel(student.trend)}</span>
                          </div>
                        </TableCell>

                        {/* Risk Level */}
                        <TableCell>{getRiskBadge(student.riskLevel)}</TableCell>

                        {/* Attendance */}
                        <TableCell>
                          <Badge 
                            variant={
                              student.attendanceRate >= 90 ? 'success' :
                              student.attendanceRate >= 80 ? 'warning' :
                              'destructive'
                            }
                          >
                            {student.attendanceRate}%
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student.studentId);
                              router.push(`/dashboard/students/${student.studentId}`);
                            }}
                            className="hover:bg-primary/10 hover:text-primary transition-all"
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

        {/* ✨ Student Details - Islamic Design */}
        {studentData && (
          <Card className="glass-card border-primary/10 overflow-hidden">
            <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Avatar className="h-10 w-10 ring-2 ring-secondary/40">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold">
                    {studentData.studentName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-primary font-display">{studentData.studentName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentData(null);
                  }}
                  className="ml-auto border-primary/20 hover:bg-primary/10"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Student Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Current Average */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {language === 'ar' ? 'المعدل الحالي' : 'Current Average'}
                  </p>
                  <p className="text-3xl font-bold text-primary font-display">{studentData.averageGrade}%</p>
                </div>

                {/* Predicted Grade */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-success/5 to-success/5 border border-success/20">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    {language === 'ar' ? 'التنبؤ بالدرجة' : 'Predicted Grade'}
                  </p>
                  <p className="text-3xl font-bold text-success font-display">{studentData.predictedGrade}%</p>
                </div>

                {/* Attendance */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/5 to-secondary/5 border border-secondary/20">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    {language === 'ar' ? 'معدل الحضور' : 'Attendance Rate'}
                  </p>
                  <p className="text-3xl font-bold text-secondary font-display">{studentData.attendanceRate}%</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Trend */}
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    {language === 'ar' ? 'الاتجاه' : 'Trend'}
                  </p>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(studentData.trend)}
                    <span className="font-semibold text-foreground">{getTrendLabel(studentData.trend)}</span>
                  </div>
                </div>

                {/* Risk Level */}
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    {language === 'ar' ? 'مستوى الخطر' : 'Risk Level'}
                  </p>
                  <div>{getRiskBadge(studentData.riskLevel)}</div>
                </div>

                {/* Assignments */}
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    {language === 'ar' ? 'الواجبات' : 'Assignments'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="info" className="font-semibold">
                      {studentData.assignmentsCompleted} / {studentData.assignmentsTotal}
                    </Badge>
                  </div>
                </div>
              </div>

              {studentData.recommendations.length > 0 && (
                <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-secondary/10 to-primary/10 border-2 border-secondary/30 relative overflow-hidden">
                  {/* Decorative Background */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gradient-to-br from-secondary to-secondary/80 rounded-lg">
                        <Lightbulb className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-foreground font-display">
                        {language === 'ar' ? 'التوصيات' : 'Recommendations'}
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {studentData.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm">
                          <div className="mt-1 p-1 bg-secondary/20 rounded-full">
                            <CheckCircle2 className="h-3 w-3 text-secondary" />
                          </div>
                          <span className="text-foreground flex-1">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ✨ Empty State - Islamic Design */}
        {!overviewData && !loading && (
          <Card className="glass-card border-primary/10">
            <CardContent className="pt-16 pb-16 text-center">
              {/* Empty State - Enhanced Design */}
              <div className="relative inline-block mb-6">
                {/* Decorative Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full blur-2xl scale-150 animate-pulse" />
                
                {/* Icon Container */}
                <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border-2 border-primary/20">
                  <BarChart3 className="h-16 w-16 mx-auto text-primary animate-float" />
                </div>
              </div>
              
              {/* Text Content */}
              <h3 className="text-xl font-bold text-foreground font-display mb-2">
                {language === 'ar' ? 'لا توجد بيانات للعرض' : 'No data available'}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {language === 'ar' 
                  ? 'ستظهر التحليلات التنبؤية هنا عند توفر البيانات'
                  : 'Predictive analytics will appear here when data is available'}
              </p>
              
              {/* Decorative Line */}
              <div className="mt-6 h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-secondary to-transparent rounded-full" />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

