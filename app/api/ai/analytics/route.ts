import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AnalyticsRequest {
  type: 'student' | 'class' | 'overview';
  studentId?: string;
  classId?: string;
}

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

// Calculate trend based on recent grades
function calculateTrend(grades: number[]): 'improving' | 'declining' | 'stable' {
  if (grades.length < 2) return 'stable';
  
  const recent = grades.slice(-3); // Last 3 grades
  const earlier = grades.slice(0, -3);
  
  if (recent.length === 0 || earlier.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  
  const diff = recentAvg - earlierAvg;
  
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

// Predict future grade using simple linear regression
function predictGrade(grades: number[]): number {
  if (grades.length < 2) return grades[0] || 75;
  
  // Simple linear regression
  const n = grades.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const y = grades;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Predict next grade
  const predicted = slope * (n + 1) + intercept;
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, Math.round(predicted)));
}

// Determine risk level
function calculateRiskLevel(
  averageGrade: number,
  trend: string,
  attendanceRate: number,
  completionRate: number
): 'low' | 'medium' | 'high' {
  let riskScore = 0;
  
  // Grade factors
  if (averageGrade < 60) riskScore += 3;
  else if (averageGrade < 70) riskScore += 2;
  else if (averageGrade < 80) riskScore += 1;
  
  // Trend factors
  if (trend === 'declining') riskScore += 2;
  else if (trend === 'stable' && averageGrade < 70) riskScore += 1;
  
  // Attendance factors
  if (attendanceRate < 70) riskScore += 2;
  else if (attendanceRate < 80) riskScore += 1;
  
  // Completion factors
  if (completionRate < 70) riskScore += 2;
  else if (completionRate < 80) riskScore += 1;
  
  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'medium';
  return 'low';
}

// Generate AI recommendations
async function generateRecommendations(
  student: StudentPerformance,
  language: string = 'ar'
): Promise<string[]> {
  const recommendations: string[] = [];
  
  // Grade-based recommendations
  if (student.averageGrade < 60) {
    recommendations.push(
      language === 'ar' 
        ? 'يحتاج الطالب إلى دعم إضافي فوري. يُنصح بجدولة جلسات تقوية.'
        : 'Student needs immediate additional support. Consider scheduling tutoring sessions.'
    );
  } else if (student.averageGrade < 70) {
    recommendations.push(
      language === 'ar'
        ? 'يُنصح بمتابعة أدق وتقديم مواد إضافية للطالب.'
        : 'Consider closer monitoring and providing additional materials.'
    );
  }
  
  // Trend-based recommendations
  if (student.trend === 'declining') {
    recommendations.push(
      language === 'ar'
        ? 'الأداء في تراجع. يُنصح بمناقشة الوضع مع الطالب وأولياء الأمور.'
        : 'Performance is declining. Consider discussing with student and parents.'
    );
  } else if (student.trend === 'improving') {
    recommendations.push(
      language === 'ar'
        ? 'الأداء في تحسن. استمر في التشجيع والدعم.'
        : 'Performance is improving. Continue encouragement and support.'
    );
  }
  
  // Attendance-based recommendations
  if (student.attendanceRate < 80) {
    recommendations.push(
      language === 'ar'
        ? 'معدل الحضور منخفض. يُنصح بالتواصل مع الطالب وأولياء الأمور.'
        : 'Low attendance rate. Consider contacting student and parents.'
    );
  }
  
  // Completion-based recommendations
  if (student.assignmentsCompleted / student.assignmentsTotal < 0.8) {
    recommendations.push(
      language === 'ar'
        ? 'عدد الواجبات المكتملة منخفض. يُنصح بمتابعة الطالب وتذكيره بالمواعيد النهائية.'
        : 'Low assignment completion rate. Consider following up and reminding about deadlines.'
    );
  }
  
  // Risk-based recommendations
  if (student.riskLevel === 'high') {
    recommendations.push(
      language === 'ar'
        ? 'الطالب في خطر عالٍ. يُنصح بإجراء تدخل فوري وتطوير خطة دعم مخصصة.'
        : 'Student is at high risk. Consider immediate intervention and developing a customized support plan.'
    );
  }
  
  return recommendations;
}

// Analyze single student
async function analyzeStudent(
  supabase: any,
  studentId: string,
  language: string = 'ar'
): Promise<StudentPerformance | null> {
  try {
    // Get student profile
    const { data: student } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', studentId)
      .eq('role', 'student')
      .single();
    
    if (!student) return null;
    
    // Get enrolled classes
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('status', 'active');
    
    if (!enrollments || enrollments.length === 0) {
      return {
        studentId,
        studentName: student.full_name,
        averageGrade: 0,
        trend: 'stable',
        riskLevel: 'medium',
        predictedGrade: 0,
        attendanceRate: 0,
        assignmentsCompleted: 0,
        assignmentsTotal: 0,
        recommendations: [
          language === 'ar' 
            ? 'الطالب غير مسجل في أي فصل.'
            : 'Student is not enrolled in any class.'
        ],
      };
    }
    
    const classIds = enrollments.map((e: any) => e.class_id);
    
    // Get subjects
    const { data: subjects } = await supabase
      .from('class_subjects')
      .select('id')
      .in('class_id', classIds);
    
    const subjectIds = (subjects || []).map((s: any) => s.id);
    
    if (subjectIds.length === 0) {
      return {
        studentId,
        studentName: student.full_name,
        averageGrade: 0,
        trend: 'stable',
        riskLevel: 'medium',
        predictedGrade: 0,
        attendanceRate: 0,
        assignmentsCompleted: 0,
        assignmentsTotal: 0,
        recommendations: [
          language === 'ar'
            ? 'لا توجد مواد دراسية للطالب.'
            : 'No subjects for student.'
        ],
      };
    }
    
    // Get assignments and submissions
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, total_points')
      .in('subject_id', subjectIds)
      .in('status', ['published', 'closed']);
    
    const assignmentIds = (assignments || []).map((a: any) => a.id);
    
    // Get submissions
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('score, status, submitted_at, assignments(total_points)')
      .eq('student_id', studentId)
      .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['00000000-0000-0000-0000-000000000000'])
      .order('submitted_at', { ascending: true });
    
    // Calculate grades
    const gradedSubmissions = (submissions || []).filter(
      (s: any) => s.status === 'graded' && s.score !== null
    );
    
    const grades = gradedSubmissions.map((s: any) => {
      const total = s.assignments?.total_points || 100;
      return (s.score / total) * 100;
    });
    
    const averageGrade = grades.length > 0
      ? grades.reduce((a, b) => a + b, 0) / grades.length
      : 0;
    
    const trend = calculateTrend(grades);
    const predictedGrade = predictGrade(grades);
    
    // Calculate attendance (simplified - using last 30 days)
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const totalDays = attendanceData?.length || 1;
    const presentDays = (attendanceData || []).filter((a: any) => a.status === 'present').length;
    const attendanceRate = (presentDays / totalDays) * 100;
    
    // Calculate completion rate
    const assignmentsTotal = assignments?.length || 0;
    const assignmentsCompleted = (submissions || []).filter(
      (s: any) => s.status === 'graded' || s.status === 'submitted'
    ).length;
    const completionRate = assignmentsTotal > 0 
      ? (assignmentsCompleted / assignmentsTotal) * 100 
      : 0;
    
    const riskLevel = calculateRiskLevel(averageGrade, trend, attendanceRate, completionRate);
    
    const studentPerformance: StudentPerformance = {
      studentId,
      studentName: student.full_name,
      averageGrade: Math.round(averageGrade),
      trend,
      riskLevel,
      predictedGrade: Math.round(predictedGrade),
      attendanceRate: Math.round(attendanceRate),
      assignmentsCompleted,
      assignmentsTotal,
      recommendations: [],
    };
    
    // Generate recommendations
    studentPerformance.recommendations = await generateRecommendations(studentPerformance, language);
    
    return studentPerformance;
  } catch (error) {
    console.error('Error analyzing student:', error);
    return null;
  }
}

// Analyze class
async function analyzeClass(
  supabase: any,
  classId: string,
  language: string = 'ar'
): Promise<ClassAnalytics | null> {
  try {
    // Get class info
    const { data: classData } = await supabase
      .from('classes')
      .select('id, class_name')
      .eq('id', classId)
      .single();
    
    if (!classData) return null;
    
    // Get enrolled students
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'active');
    
    if (!enrollments || enrollments.length === 0) {
      return {
        classId,
        className: classData.class_name,
        totalStudents: 0,
        averageGrade: 0,
        atRiskStudents: 0,
        topPerformers: 0,
        students: [],
      };
    }
    
    const studentIds = enrollments.map((e: any) => e.student_id);
    
    // Analyze each student
    const studentAnalyses = await Promise.all(
      studentIds.map((id: string) => analyzeStudent(supabase, id, language))
    );
    
    const students = studentAnalyses.filter((s): s is StudentPerformance => s !== null);
    
    // Calculate class statistics
    const totalStudents = students.length;
    const averageGrade = students.length > 0
      ? students.reduce((sum, s) => sum + s.averageGrade, 0) / students.length
      : 0;
    const atRiskStudents = students.filter(s => s.riskLevel === 'high' || s.riskLevel === 'medium').length;
    const topPerformers = students.filter(s => s.averageGrade >= 85).length;
    
    return {
      classId,
      className: classData.class_name,
      totalStudents,
      averageGrade: Math.round(averageGrade),
      atRiskStudents,
      topPerformers,
      students: students.sort((a, b) => b.averageGrade - a.averageGrade),
    };
  } catch (error) {
    console.error('Error analyzing class:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!supabaseUrl || !anon) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    // Verify user
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: user, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await userClient
      .from('profiles')
      .select('role, language_preference')
      .eq('id', user.user.id)
      .single();

    // Only teachers and admins can access analytics
    if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: AnalyticsRequest = await request.json();
    const { type, studentId, classId } = body;
    const language = profile?.language_preference || 'ar';

    if (type === 'student' && studentId) {
      const analysis = await analyzeStudent(userClient, studentId, language);
      if (!analysis) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      return NextResponse.json({ data: analysis });
    }

    if (type === 'class' && classId) {
      const analysis = await analyzeClass(userClient, classId, language);
      if (!analysis) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 });
      }
      return NextResponse.json({ data: analysis });
    }

    if (type === 'overview') {
      // Get all classes for teacher/admin
      let classesQuery = userClient.from('classes').select('id, class_name');
      
      if (profile?.role === 'teacher') {
        classesQuery = classesQuery.eq('teacher_id', user.user.id);
      }
      
      const { data: classes } = await classesQuery;
      
      if (!classes || classes.length === 0) {
        return NextResponse.json({
          data: {
            totalClasses: 0,
            totalStudents: 0,
            averageGrade: 0,
            atRiskStudents: 0,
            topPerformers: 0,
            classes: [],
          },
        });
      }
      
      // Analyze all classes
      const classAnalyses = await Promise.all(
        classes.map((cls: any) => analyzeClass(userClient, cls.id, language))
      );
      
      const validAnalyses = classAnalyses.filter((c): c is ClassAnalytics => c !== null);
      
      // Calculate overview statistics
      const totalStudents = validAnalyses.reduce((sum, c) => sum + c.totalStudents, 0);
      const allStudents = validAnalyses.flatMap(c => c.students);
      const averageGrade = allStudents.length > 0
        ? allStudents.reduce((sum, s) => sum + s.averageGrade, 0) / allStudents.length
        : 0;
      const atRiskStudents = allStudents.filter(s => s.riskLevel === 'high' || s.riskLevel === 'medium').length;
      const topPerformers = allStudents.filter(s => s.averageGrade >= 85).length;
      
      return NextResponse.json({
        data: {
          totalClasses: validAnalyses.length,
          totalStudents,
          averageGrade: Math.round(averageGrade),
          atRiskStudents,
          topPerformers,
          classes: validAnalyses,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

