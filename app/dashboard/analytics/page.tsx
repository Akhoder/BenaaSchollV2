'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, Award, Users, School, BarChart3, Target, Lightbulb } from 'lucide-react';
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
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
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
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      low: 'default',
      medium: 'secondary',
      high: 'destructive',
    };
    
    const labels: Record<string, Record<string, string>> = {
      low: { ar: 'منخفض', en: 'Low' },
      medium: { ar: 'متوسط', en: 'Medium' },
      high: { ar: 'عالي', en: 'High' },
    };

    return (
      <Badge variant={variants[risk] || 'secondary'}>
        {labels[risk]?.[language] || risk}
      </Badge>
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

        {/* Overview Stats */}
        {overviewData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}
                </CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">{overviewData.totalStudents}</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-16 -mt-16" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'المعدل العام' : 'Average Grade'}
                </CardTitle>
                <Target className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">{overviewData.averageGrade}%</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-16 -mt-16" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'معرضون للخطر' : 'At Risk'}
                </CardTitle>
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">{overviewData.atRiskStudents}</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -mr-16 -mt-16" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'متفوقون' : 'Top Performers'}
                </CardTitle>
                <Award className="h-5 w-5 text-yellow-600" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">{overviewData.topPerformers}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Class Selector */}
        {overviewData && overviewData.classes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                {language === 'ar' ? 'اختر الفصل' : 'Select Class'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue placeholder={language === 'ar' ? 'اختر الفصل' : 'Select class'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'ar' ? 'جميع الفصول' : 'All Classes'}
                  </SelectItem>
                  {overviewData.classes.map((cls) => (
                    <SelectItem key={cls.classId} value={cls.classId}>
                      {cls.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Class Analytics */}
        {classData && (
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/50">
              <CardTitle className="flex items-center gap-3 text-xl">
                <School className="h-5 w-5 text-primary" />
                {classData.className}
                <Badge variant="secondary" className="ml-auto">
                  {classData.totalStudents} {language === 'ar' ? 'طالب' : 'students'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'المعدل العام' : 'Average Grade'}
                  </p>
                  <p className="text-2xl font-bold">{classData.averageGrade}%</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'معرضون للخطر' : 'At Risk'}
                  </p>
                  <p className="text-2xl font-bold text-red-600">{classData.atRiskStudents}</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'متفوقون' : 'Top Performers'}
                  </p>
                  <p className="text-2xl font-bold text-green-600">{classData.topPerformers}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'اسم الطالب' : 'Student Name'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المعدل' : 'Average'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التنبؤ' : 'Predicted'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الاتجاه' : 'Trend'}</TableHead>
                      <TableHead>{language === 'ar' ? 'مستوى الخطر' : 'Risk Level'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحضور' : 'Attendance'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classData.students.map((student) => (
                      <TableRow key={student.studentId} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{student.studentName}</TableCell>
                        <TableCell>
                          <span className={cn(
                            'font-semibold',
                            student.averageGrade >= 85 ? 'text-green-600' :
                            student.averageGrade >= 70 ? 'text-blue-600' :
                            student.averageGrade >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          )}>
                            {student.averageGrade}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{student.predictedGrade}%</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(student.trend)}
                            <span className="text-sm">{getTrendLabel(student.trend)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getRiskBadge(student.riskLevel)}</TableCell>
                        <TableCell>
                          <span className={cn(
                            'font-medium',
                            student.attendanceRate >= 90 ? 'text-green-600' :
                            student.attendanceRate >= 80 ? 'text-yellow-600' :
                            'text-red-600'
                          )}>
                            {student.attendanceRate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student.studentId);
                              router.push(`/dashboard/students/${student.studentId}`);
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

        {/* Student Details */}
        {studentData && (
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/50">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Users className="h-5 w-5 text-primary" />
                {studentData.studentName}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentData(null);
                  }}
                  className="ml-auto"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {language === 'ar' ? 'المعدل الحالي' : 'Current Average'}
                    </p>
                    <p className="text-3xl font-bold">{studentData.averageGrade}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {language === 'ar' ? 'التنبؤ بالدرجة' : 'Predicted Grade'}
                    </p>
                    <p className="text-2xl font-bold text-primary">{studentData.predictedGrade}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {language === 'ar' ? 'الاتجاه' : 'Trend'}
                    </p>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(studentData.trend)}
                      <span className="font-medium">{getTrendLabel(studentData.trend)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {language === 'ar' ? 'مستوى الخطر' : 'Risk Level'}
                    </p>
                    <div>{getRiskBadge(studentData.riskLevel)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {language === 'ar' ? 'معدل الحضور' : 'Attendance Rate'}
                    </p>
                    <p className="text-2xl font-bold">{studentData.attendanceRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {language === 'ar' ? 'الواجبات' : 'Assignments'}
                    </p>
                    <p className="text-lg font-medium">
                      {studentData.assignmentsCompleted} / {studentData.assignmentsTotal}
                    </p>
                  </div>
                </div>
              </div>

              {studentData.recommendations.length > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">
                      {language === 'ar' ? 'التوصيات' : 'Recommendations'}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {studentData.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!overviewData && !loading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                {language === 'ar' 
                  ? 'لا توجد بيانات للعرض'
                  : 'No data available'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

