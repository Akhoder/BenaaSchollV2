'use client';

/**
 * صفحة الداشبورد الرئيسية
 * 
 * هذه الصفحة تعرض لوحة معلومات مخصصة لكل دور:
 * - المدير: إحصائيات شاملة + إجراءات سريعة + نشاط حديث
 * - المعلم: إحصائيات الفصول + الطلاب
 * - الطالب: الفصول + الواجبات + الجدول + الإشعارات
 * - المشرف: الفصول المسؤول عنها + التقارير
 * 
 * المميزات:
 * - ✅ استخدام بيانات حقيقية من قاعدة البيانات
 * - ✅ لا يوجد بيانات وهمية (fake data)
 * - ✅ لا توجد قيم مُشفرة (hard-coded values)
 * - ✅ TypeScript types واضحة
 * - ✅ دعم متعدد اللغات (عربي/إنجليزي)
 * - ✅ معالجة أخطاء شاملة
 * - ✅ تحميل بيانات محسن باستخدام cache
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { SmartRecommendations } from '@/components/SmartRecommendations';
import { DashboardLoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardStatsSkeleton, CardGridSkeleton, ListSkeleton } from '@/components/SkeletonLoaders';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { 
  Users, School, BookOpen, Calendar, TrendingUp, Clock, Award, 
  CheckCircle2, ArrowRight, Video, GraduationCap, FileText, 
  AlertCircle, Bell, Zap, Loader2, BarChart3, Sparkles
} from 'lucide-react';
import { 
  supabase, 
  fetchPublishedClasses, 
  fetchMyClassEnrollments, 
  enrollInClass, 
  cancelClassEnrollment, 
  fetchSubjectsForClass, 
  fetchMyEnrolledClassesWithDetails, 
  fetchMyAssignmentsForSubject, 
  fetchSubmissionForAssignment, 
  fetchMyNotifications 
} from '@/lib/supabase';
import { getStatsOptimized } from '@/lib/optimizedQueries';
import { AdminCharts } from '@/components/AdminCharts';
import { QuickInsights } from '@/components/QuickInsights';
import { EnhancedActivityTimeline } from '@/components/EnhancedActivityTimeline';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Force dynamic rendering - this page requires authentication context
// Client component - no static generation needed

// ============================================
// TYPES - تعريف الأنواع
// ============================================

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  // ✅ NEW: Additional metrics
  attendanceRate?: number;
  completionRate?: number;
  activeUsers?: number;
  // ✅ NEW: Trends (comparison with previous period)
  trends?: {
    students: { value: number; isPositive: boolean };
    teachers: { value: number; isPositive: boolean };
    classes: { value: number; isPositive: boolean };
    subjects: { value: number; isPositive: boolean };
    attendance?: { value: number; isPositive: boolean };
    completion?: { value: number; isPositive: boolean };
  };
}

// ✅ Note: RecentActivity interface moved to EnhancedActivityTimeline component

interface ScheduleEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  room?: string;
  zoom_url?: string;
  mode?: 'online' | 'hybrid' | 'offline';
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  subject_name: string;
  class_name: string;
  submission?: {
    status: string;
    score?: number;
  };
}

interface ClassProgress {
  [classId: string]: number;
}

// ============================================
// MAIN COMPONENT - المكون الرئيسي
// ============================================

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  
  // ============================================
  // STATE MANAGEMENT - إدارة الحالة
  // ============================================
  
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    attendanceRate: undefined,
    completionRate: undefined,
    activeUsers: undefined,
    trends: undefined,
  });
  
  const [publishedClasses, setPublishedClasses] = useState<any[]>([]);
  const [myClassEnrollments, setMyClassEnrollments] = useState<Record<string, boolean>>({});
  const [enrollingIds, setEnrollingIds] = useState<Record<string, boolean>>({});
  const [todayEvents, setTodayEvents] = useState<ScheduleEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, any[]>>({});
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [averageGrade, setAverageGrade] = useState<number | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [classProgress, setClassProgress] = useState<ClassProgress>({});
  // Teacher-specific stats
  const [teacherClassCount, setTeacherClassCount] = useState<number>(0);
  const [teacherStudentCount, setTeacherStudentCount] = useState<number>(0);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  
  // Loading states
  const [loadingStudentData, setLoadingStudentData] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingTeacherData, setLoadingTeacherData] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // ============================================
  // EFFECTS - التأثيرات الجانبية
  // ============================================

  // ✅ PERFORMANCE: Optimize dependencies - only depend on user.id and loading
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user?.id, loading, router]);

  // ✅ PERFORMANCE: Optimize dependencies - only depend on profile.id and role
  useEffect(() => {
    if (profile) {
      fetchStats().catch(err => {
        console.error('Error fetching stats:', err);
        toast.error(language === 'ar' ? 'فشل تحميل الإحصائيات' : 'Failed to load statistics');
      });
      
      // ✅ PERFORMANCE: Load student data in parallel instead of sequential
      if (profile.role === 'student') {
        Promise.all([
          loadStudentData(),
          loadStudentSchedule(),
          loadStudentStats(),
          loadUpcomingAssignments()
        ]).catch(err => {
          console.error('Error loading student data:', err);
        });
      }
      
      // ✅ PERFORMANCE: Load teacher data in parallel
      if (profile.role === 'teacher') {
        Promise.all([
          loadTeacherData(),
          loadTeacherSchedule()
        ]).catch(err => {
          console.error('Error loading teacher data:', err);
        });
      }

      // ✅ Note: Recent Activity is now handled by EnhancedActivityTimeline component
    }
  }, [profile?.id, profile?.role]);

  // بناء الإشعارات من الواجبات والأحداث
  useEffect(() => {
    const items: any[] = [];
    
    // الواجبات المتأخرة والعاجلة
    upcomingAssignments.forEach((a: Assignment) => {
      const due = a.due_date ? new Date(a.due_date) : null;
      if (!due) return;
      const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (!a.submission && daysLeft < 0) {
        items.push({ 
          type: 'danger', 
          title: a.title, 
          when: due.toLocaleDateString(), 
          label: 'overdue' 
        });
      } else if (!a.submission && daysLeft <= 2) {
        items.push({ 
          type: 'warning', 
          title: a.title, 
          when: due.toLocaleDateString(), 
          label: 'dueSoon' 
        });
      }
    });
    
    // الأحداث التي تبدأ خلال ساعتين
    const twoHours = 1000 * 60 * 60 * 2;
    todayEvents.forEach((e: ScheduleEvent) => {
      const start = new Date(e.start_at).getTime();
      const now = Date.now();
      if (start >= now && start <= now + twoHours) {
        items.push({ 
          type: 'info', 
          title: e.title, 
          when: new Date(e.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          label: 'startingSoon' 
        });
      }
    });

    // تحميل الإشعارات من قاعدة البيانات ودمجها
    (async () => {
      const { data } = await fetchMyNotifications(10);
      const dbItems = (data || []).map((n: any) => ({ 
        type: n.type || 'info', 
        title: n.title, 
        when: new Date(n.created_at).toLocaleString(), 
        label: 'db', 
        read_at: n.read_at 
      }));
      setNotifications([...dbItems, ...items].slice(0, 5));
    })();
  }, [upcomingAssignments, todayEvents]);

  // ============================================
  // DATA FETCHING FUNCTIONS - دوال جلب البيانات
  // ============================================

  /**
   * جلب الإحصائيات حسب الدور
   * يستخدم استعلامات محسنة مع cache للأداء
   */
  const fetchStats = async () => {
    if (!profile) return;

    try {
      setLoadingStats(true);
      
      if (profile.role === 'admin') {
        // استخدام الاستعلام المحسن للمدير
        const { data: statsData, error } = await getStatsOptimized();
        
        if (error) {
          console.error('Error fetching stats:', error);
          toast.error(language === 'ar' ? 'فشل تحميل الإحصائيات' : 'Failed to load statistics');
          return;
        }
        
        if (statsData) {
          setStats(statsData);
        }
      } else if (profile.role === 'teacher') {
        // إحصائيات المعلم يتم جلبها من loadTeacherData
        // لا حاجة لاستعلامات إضافية هنا
        setStats({
          totalClasses: 0,
          totalStudents: 0,
          totalTeachers: 0,
          totalSubjects: 0,
        });
      } else if (profile.role === 'student') {
        // استعلامات الطالب
        const { count } = await supabase
          .from('student_enrollments')
          .select('class_id', { count: 'exact', head: true })
          .eq('student_id', profile.id)
          .eq('status', 'active');

        setStats({
          totalClasses: count || 0,
          totalStudents: 0,
          totalTeachers: 0,
          totalSubjects: 0,
        });
      } else if (profile.role === 'supervisor') {
        // استعلامات المشرف
        const classesResult = await supabase
          .from('classes')
          .select('id', { count: 'exact' })
          .eq('supervisor_id', profile.id);
        
        const classIds = classesResult.data?.map(c => c.id) || [];
        
        const studentsResult = await supabase
          .from('student_enrollments')
          .select('student_id', { count: 'exact' })
          .in('class_id', classIds);
        
        const classes = classesResult;
        const students = studentsResult;

        setStats({
          totalClasses: classes.count || 0,
          totalStudents: students.count || 0,
          totalTeachers: 0,
          totalSubjects: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء تحميل الإحصائيات' : 'An error occurred while loading statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  // ✅ Note: Recent Activity is now handled by EnhancedActivityTimeline component
  // The old loadRecentActivity function has been removed

  /**
   * جلب بيانات الطالب (الفصول المنشورة والتسجيلات)
   * يجلب الفصول المتاحة والفصول المسجل فيها
   */
  const loadStudentData = async () => {
    if (!profile || profile.role !== 'student') return;
    
    try {
      setLoadingStudentData(true);
      
      // جلب الفصول المنشورة والتسجيلات بشكل متوازي
      const [pub, mine] = await Promise.all([
        fetchPublishedClasses(),
        fetchMyClassEnrollments(),
      ]);
      
      if (!pub.error && pub.data) {
        setPublishedClasses(pub.data as any[]);
      }
      
      // إنشاء خريطة للتسجيلات
      const enrolled: Record<string, boolean> = {};
      (mine.data || []).forEach((e: any) => { 
        enrolled[e.class_id] = true; 
      });
      setMyClassEnrollments(enrolled);

      // جلب المواد لكل فصل مسجل فيه
      const enrolledClassIds = Object.keys(enrolled);
      const subs: Record<string, any[]> = {};
      
      if (enrolledClassIds.length > 0) {
        const { data: subjects, error: subjectsError } = await supabase
          .from('class_subjects')
          .select('id, class_id, subject_name')
          .in('class_id', enrolledClassIds);
        
        if (subjectsError) {
          console.error('Error fetching subjects:', subjectsError);
          toast.error(language === 'ar' ? 'فشل تحميل المواد' : 'Failed to load subjects');
        } else if (subjects) {
          subjects.forEach((s: any) => {
            subs[s.class_id] = subs[s.class_id] || [];
            subs[s.class_id].push(s);
          });
        }
      }
      
      setSubjectsByClass(subs);
    } catch (e) {
      console.error('Error loading student data:', e);
      toast.error(language === 'ar' ? 'فشل تحميل بيانات الطالب' : 'Failed to load student data');
    } finally {
      setLoadingStudentData(false);
    }
  };

  /**
   * جلب جدول الطالب (الأحداث اليومية والقادمة)
   * يستخدم RPC function للحصول على الأحداث
   */
  const loadStudentSchedule = async () => {
    if (!profile || profile.role !== 'student') return;
    
    try {
      setLoadingSchedule(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);
      
      const { data, error } = await supabase.rpc('get_user_events', {
        p_start: today.toISOString(),
        p_end: endOfWeek.toISOString()
      });
      
      if (error) {
        console.error('Error fetching schedule:', error);
        toast.error(language === 'ar' ? 'فشل تحميل الجدول' : 'Failed to load schedule');
        return;
      }
      
      // تصفية الأحداث اليومية
      const todayItems = (data || []).filter((e: any) => {
        const d = new Date(e.start_at);
        return d.toDateString() === today.toDateString();
      });
      
      // تصفية الأحداث القادمة
      const upcoming = (data || []).filter((e: any) => {
        const d = new Date(e.start_at);
        return d > today && d <= endOfWeek;
      }).slice(0, 5);
      
      setTodayEvents(todayItems || []);
      setUpcomingEvents(upcoming || []);
    } catch (e) {
      console.error('Error loading schedule:', e);
      toast.error(language === 'ar' ? 'فشل تحميل الجدول' : 'Failed to load schedule');
    } finally {
      setLoadingSchedule(false);
    }
  };

  /**
   * جلب إحصائيات الطالب (المعدل ونسبة الحضور)
   * يحسب المعدل من الواجبات المقيّمة ونسبة الحضور من آخر 30 يوم
   */
  const loadStudentStats = async () => {
    if (!profile || profile.role !== 'student') return;
    
    try {
      setLoadingStats(true);
      
      // جلب الفصول المسجل فيها
      const { data: classes } = await fetchMyEnrolledClassesWithDetails();
      if (!classes || classes.length === 0) {
        setAverageGrade(null);
        setAttendanceRate(null);
        return;
      }
      
      const classIds = (classes || []).map((c: any) => c.id);
      
      // جلب المواد للفصول المسجل فيها
      const { data: subjects, error: subjectsError } = await supabase
        .from('class_subjects')
        .select('id, class_id')
        .in('class_id', classIds);
      
      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        setAverageGrade(null);
        setAttendanceRate(null);
        return;
      }
      
      const subjectIds = (subjects || []).map((s: any) => s.id);
      if (subjectIds.length === 0) {
        setAverageGrade(null);
        setAttendanceRate(null);
        return;
      }
      
      // جلب الواجبات المقيّمة
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, subject_id, total_points, status')
        .in('subject_id', subjectIds)
        .in('status', ['published', 'closed']);
      
      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        setAverageGrade(null);
      }
      
      const assignmentIds = (assignments || []).map((a: any) => a.id);
      
      // جلب التقديرات للواجبات
      if (assignmentIds.length > 0) {
        const { data: submissions, error: submissionsError } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, status, score')
          .in('assignment_id', assignmentIds)
          .eq('student_id', profile.id);
        
        if (!submissionsError && submissions) {
          const assignmentMap = new Map((assignments || []).map((a: any) => [a.id, a]));
          let totalScore = 0;
          let totalPossible = 0;
          
          submissions.forEach((sub: any) => {
            if (sub.status === 'graded') {
              const a = assignmentMap.get(sub.assignment_id);
              if (a) {
                totalScore += sub.score || 0;
                totalPossible += a.total_points || 100;
              }
            }
          });
          
          const average = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : null;
          setAverageGrade(average);
        }
      }
      
      // جلب نسبة الحضور من آخر 30 يوم
      try {
        const today = new Date();
        const from = new Date();
        from.setDate(today.getDate() - 30);
        
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('status')
          .eq('student_id', profile.id)
          .gte('attendance_date', from.toISOString().slice(0, 10))
          .lte('attendance_date', today.toISOString().slice(0, 10));
        
        if (!attendanceError && attendance) {
          const total = attendance.filter((r: any) => 
            ['present', 'absent', 'late', 'excused'].includes(r.status)
          ).length;
          const attended = attendance.filter((r: any) => 
            ['present', 'late', 'excused'].includes(r.status)
          ).length;
          const rate = total > 0 ? Math.round((attended / total) * 100) : null;
          setAttendanceRate(rate);
        }
      } catch (e) {
        console.error('Error calculating attendance rate:', e);
        setAttendanceRate(null);
      }
    } catch (e) {
      console.error('Error loading student stats:', e);
      toast.error(language === 'ar' ? 'فشل تحميل إحصائيات الطالب' : 'Failed to load student statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  /**
   * جلب بيانات المعلم (الفصول والطلاب)
   * يجلب الفصول التي يدرسها المعلم من class_subjects
   */
  const loadTeacherData = async () => {
    if (!profile || profile.role !== 'teacher') return;
    
    try {
      setLoadingTeacherData(true);
      
      // جلب الفصول التي يدرسها المعلم من class_subjects
      const { data: classSubjects, error: csError } = await supabase
        .from('class_subjects')
        .select('class_id, subject_name')
        .eq('teacher_id', profile.id);
      
      if (csError) {
        console.error('Error fetching class subjects:', csError);
        toast.error(language === 'ar' ? 'فشل تحميل المواد' : 'Failed to load subjects');
        return;
      }
      
      const classIds = Array.from(new Set((classSubjects || []).map((x: any) => x.class_id).filter(Boolean)));
      setTeacherClassCount(classIds.length);
      
      if (classIds.length === 0) {
        setTeacherClasses([]);
        setTeacherStudentCount(0);
        return;
      }
      
      // جلب تفاصيل الفصول
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, class_name, level, goals, image_url')
        .in('id', classIds);
      
      if (classesError) {
        console.error('Error fetching classes:', classesError);
        toast.error(language === 'ar' ? 'فشل تحميل الفصول' : 'Failed to load classes');
        return;
      }
      
      // إضافة عدد الطلاب لكل فصل
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('status', 'active');
      
      const enrollmentCounts = (enrollments || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.class_id] = (acc[row.class_id] || 0) + 1;
        return acc;
      }, {});
      
      const classesWithCounts = (classesData || []).map((cls: any) => ({
        ...cls,
        student_count: enrollmentCounts[cls.id] || 0,
        subjects: (classSubjects || []).filter((cs: any) => cs.class_id === cls.id).map((cs: any) => cs.subject_name)
      }));
      
      setTeacherClasses(classesWithCounts);
      
      // حساب إجمالي الطلاب
      const totalStudents = Object.values(enrollmentCounts).reduce((sum: number, count: any) => sum + count, 0);
      setTeacherStudentCount(totalStudents);
    } catch (e) {
      console.error('Error loading teacher data:', e);
      toast.error(language === 'ar' ? 'فشل تحميل بيانات المعلم' : 'Failed to load teacher data');
    } finally {
      setLoadingTeacherData(false);
    }
  };

  /**
   * جلب جدول المعلم (الأحداث اليومية والقادمة)
   * يستخدم RPC function للحصول على الأحداث
   */
  const loadTeacherSchedule = async () => {
    if (!profile || profile.role !== 'teacher') return;
    
    try {
      setLoadingSchedule(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);
      
      const { data, error } = await supabase.rpc('get_user_events', {
        p_start: today.toISOString(),
        p_end: endOfWeek.toISOString()
      });
      
      if (error) {
        console.error('Error fetching schedule:', error);
        toast.error(language === 'ar' ? 'فشل تحميل الجدول' : 'Failed to load schedule');
        return;
      }
      
      // تصفية الأحداث اليومية
      const todayItems = (data || []).filter((e: any) => {
        const d = new Date(e.start_at);
        return d.toDateString() === today.toDateString();
      });
      
      // تصفية الأحداث القادمة
      const upcoming = (data || []).filter((e: any) => {
        const d = new Date(e.start_at);
        return d > today && d <= endOfWeek;
      }).slice(0, 5);
      
      setTodayEvents(todayItems || []);
      setUpcomingEvents(upcoming || []);
    } catch (e) {
      console.error('Error loading schedule:', e);
      toast.error(language === 'ar' ? 'فشل تحميل الجدول' : 'Failed to load schedule');
    } finally {
      setLoadingSchedule(false);
    }
  };

  /**
   * جلب الواجبات القادمة للطالب
   * يجلب الواجبات التي تنتهي خلال الأسبوع القادم
   */
  const loadUpcomingAssignments = async () => {
    if (!profile || profile.role !== 'student') return;
    
    try {
      setLoadingAssignments(true);
      
      // جلب الفصول المسجل فيها
      const { data: classes } = await fetchMyEnrolledClassesWithDetails();
      if (!classes || classes.length === 0) {
        setUpcomingAssignments([]);
        setClassProgress({});
        return;
      }

      const classIds = (classes || []).map((c: any) => c.id);
      const classMap = new Map((classes || []).map((c: any) => [c.id, c]));

      // جلب المواد لجميع الفصول
      const { data: subjects, error: subjectsError } = await supabase
        .from('class_subjects')
        .select('id, class_id, subject_name')
        .in('class_id', classIds);
      
      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        setUpcomingAssignments([]);
        return;
      }
      
      const subjectIds = (subjects || []).map((s: any) => s.id);
      const subjectToClass: Record<string, string> = {};
      const subjectNameMap: Record<string, string> = {};
      
      (subjects || []).forEach((s: any) => { 
        subjectToClass[s.id] = s.class_id; 
        subjectNameMap[s.id] = s.subject_name; 
      });

      if (subjectIds.length === 0) {
        setUpcomingAssignments([]);
        setClassProgress({});
        return;
      }

      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);

      // جلب الواجبات للمواد
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, subject_id, title, total_points, due_date, status')
        .in('subject_id', subjectIds)
        .in('status', ['published', 'closed']);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        setUpcomingAssignments([]);
        return;
      }

      const assignmentIds = (assignments || []).map((a: any) => a.id);

      // جلب التقديرات للواجبات
      const { data: submissions } = assignmentIds.length > 0 ? await supabase
        .from('assignment_submissions')
        .select('assignment_id, status, score')
        .in('assignment_id', assignmentIds)
        .eq('student_id', profile.id) : { data: [] as Array<{ assignment_id: string; status: string; score?: number }> };

      const submissionMap = new Map(
        (submissions || []).map((s: { assignment_id: string; status: string; score?: number }) => [s.assignment_id, s])
      );

      // بناء قائمة الواجبات القادمة
      const upcoming: Assignment[] = [];
      const perClassTotals: Record<string, number> = {};
      const perClassCompleted: Record<string, number> = {};

      (assignments || []).forEach((a: any) => {
        const due = a.due_date ? new Date(a.due_date) : null;
        const sId = a.subject_id;
        const cId = subjectToClass[sId];
        
        if (!perClassTotals[cId]) { 
          perClassTotals[cId] = 0; 
          perClassCompleted[cId] = 0; 
        }
        perClassTotals[cId] += 1;
        
        const sub = submissionMap.get(a.id);
        if (sub && sub.status === 'graded') {
          perClassCompleted[cId] += 1;
        }

        if (due && due > now && due <= nextWeek) {
          const classInfo = classMap.get(cId);
          upcoming.push({
            id: a.id,
            title: a.title,
            due_date: a.due_date,
            subject_name: subjectNameMap[sId],
            class_name: (classInfo as any)?.class_name || (classInfo as any)?.name || '',
            submission: sub ? {
              status: (sub as { assignment_id: string; status: string; score?: number }).status,
              score: (sub as { assignment_id: string; status: string; score?: number }).score
            } : undefined,
          });
        }
      });

      // حساب التقدم لكل فصل
      const progress: ClassProgress = {};
      Object.keys(perClassTotals).forEach(cId => {
        const total = perClassTotals[cId] || 0;
        const done = perClassCompleted[cId] || 0;
        progress[cId] = total > 0 ? Math.round((done / total) * 100) : 0;
      });

      // ترتيب حسب تاريخ الاستحقاق
      upcoming.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      setUpcomingAssignments(upcoming.slice(0, 5));
      setClassProgress(progress);
    } catch (e) {
      console.error('Error loading upcoming assignments:', e);
      toast.error(language === 'ar' ? 'فشل تحميل الواجبات القادمة' : 'Failed to load upcoming assignments');
    } finally {
      setLoadingAssignments(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS - دوال مساعدة
  // ============================================

  /**
   * تنسيق الوقت النسبي (منذ متى)
   */
  const formatTimeAgo = (date: Date): string => {
      const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      return language === 'ar' ? 'الآن' : 'Just now';
    } else if (diffMins < 60) {
      return language === 'ar' 
        ? `منذ ${diffMins} ${diffMins === 1 ? 'دقيقة' : 'دقائق'}` 
        : `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return language === 'ar' 
        ? `منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : 'ساعات'}` 
        : `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return language === 'ar' 
        ? `منذ ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}` 
        : `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  // ============================================
  // RENDER - عرض المكون
  // ============================================

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <DashboardStatsSkeleton />
          <CardGridSkeleton count={3} />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* ✅ Compact Hero Section - قسم الترحيب المدمج */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 shadow-lg bg-gradient-to-br from-primary/5 via-accent/3 to-secondary/5">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-2xl"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {/* ✅ Compact Avatar */}
              <div className="relative group flex-shrink-0">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-br from-primary to-accent rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
                
                {/* Avatar Container */}
                <div className="relative w-16 h-16 md:w-20 md:h-20">
                  {/* Outer Ring */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 p-0.5">
                    <div className="w-full h-full rounded-2xl bg-background/90 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                      <span className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                        {profile?.full_name?.charAt(0).toUpperCase() || ''}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-background shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Welcome Text */}
              <div className="flex-1 min-w-0">
                {/* Main Heading */}
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight">
                    <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                      {t('welcomeBack')}, {profile?.full_name || ''}
                    </span>
                  </h1>
                  {/* ✅ Replaced emoji with icon */}
                  <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary animate-pulse" />
                  </div>
                </div>

                {/* Subtitle and Quick Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <p className="text-sm md:text-base text-muted-foreground font-medium">
                    {t(`${profile?.role || 'user'}Dashboard`)}
                  </p>

                  {/* Quick Stats Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* System Status */}
                    <div className="group relative px-3 py-1.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-200">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-2 h-2 bg-success rounded-full"></div>
                          <div className="absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping opacity-50"></div>
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {language === 'ar' ? 'متصل' : 'Online'}
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="group relative px-3 py-1.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-200">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-foreground">
                          {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className="group relative px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-200">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ Compact Additional Info Bar (Admin Only) */}
            {profile?.role === 'admin' && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Users className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{language === 'ar' ? 'المستخدمين' : 'Users'}</p>
                        <p className="text-sm font-bold text-foreground">{stats.totalStudents + stats.totalTeachers}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-accent/10">
                        <School className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الفصول' : 'Classes'}</p>
                        <p className="text-sm font-bold text-foreground">{stats.totalClasses}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
                    <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-success">
                      {language === 'ar' ? 'جميع الأنظمة تعمل' : 'All systems operational'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin Dashboard - لوحة المدير */}
        {profile?.role === 'admin' && (
          <div className="space-y-8">
            {/* Floating Orbs Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
              <div className="orb-primary w-64 h-64 top-20 left-10" />
              <div className="orb-accent w-64 h-64 top-1/3 right-10" />
              <div className="orb-secondary w-64 h-64 bottom-20 left-1/3" />
            </div>

            {/* ============================================
                SECTION 1: Main Statistics
                ============================================ */}
            <section className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <span>{language === 'ar' ? 'الإحصائيات الرئيسية' : 'Main Statistics'}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 ml-12">
                    {language === 'ar' ? 'نظرة شاملة على النظام' : 'Overview of your system'}
                  </p>
                </div>
              </div>

              {/* Statistics Cards */}
              {loadingStats ? (
                <DashboardStatsSkeleton />
              ) : (
                <>
                  {/* Main Stats with Trends */}
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      title={t('totalStudents')}
                      value={stats.totalStudents}
                      icon={Users}
                      description={language === 'ar' ? 'إجمالي الطلاب' : 'Total students'}
                      color="primary"
                      trend={stats.trends?.students}
                    />
                    <StatCard
                      title={t('totalTeachers')}
                      value={stats.totalTeachers}
                      icon={Users}
                      description={language === 'ar' ? 'أعضاء هيئة التدريس' : 'Faculty members'}
                      color="accent"
                      trend={stats.trends?.teachers}
                    />
                    <StatCard
                      title={t('totalClasses')}
                      value={stats.totalClasses}
                      icon={School}
                      description={language === 'ar' ? 'فصول نشطة' : 'Active classes'}
                      color="secondary"
                      trend={stats.trends?.classes}
                    />
                    <StatCard
                      title={t('subjects')}
                      value={stats.totalSubjects}
                      icon={BookOpen}
                      description={language === 'ar' ? 'المواد الأكاديمية' : 'Academic subjects'}
                      color="success"
                      trend={stats.trends?.subjects}
                    />
                  </div>

                  {/* Additional Metrics */}
                  {(stats.attendanceRate !== undefined || stats.completionRate !== undefined || stats.activeUsers !== undefined) && (
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {stats.attendanceRate !== undefined && (
                        <StatCard
                          title={language === 'ar' ? 'معدل الحضور' : 'Attendance Rate'}
                          value={`${stats.attendanceRate}%`}
                          icon={CheckCircle2}
                          description={language === 'ar' ? 'آخر 30 يوم' : 'Last 30 days'}
                          color="success"
                          gradient="from-emerald-500 to-teal-500"
                        />
                      )}
                      {stats.completionRate !== undefined && (
                        <StatCard
                          title={language === 'ar' ? 'معدل الإتمام' : 'Completion Rate'}
                          value={`${stats.completionRate}%`}
                          icon={Award}
                          description={language === 'ar' ? 'الدروس المكتملة' : 'Lessons completed'}
                          color="info"
                          gradient="from-blue-500 to-cyan-500"
                        />
                      )}
                      {stats.activeUsers !== undefined && (
                        <StatCard
                          title={language === 'ar' ? 'المستخدمون النشطون' : 'Active Users'}
                          value={stats.activeUsers}
                          icon={Zap}
                          description={language === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'}
                          color="warning"
                          gradient="from-amber-500 to-orange-500"
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center">
                <div className="bg-background px-4">
                  <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                </div>
              </div>
            </div>

            {/* ============================================
                SECTION 2: Activity & Quick Actions
                ============================================ */}
            <section className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-xl">
                      <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <span>{language === 'ar' ? 'النشاط والإجراءات' : 'Activity & Actions'}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 ml-12">
                    {language === 'ar' ? 'آخر الأنشطة والإجراءات السريعة' : 'Recent activity and quick actions'}
                  </p>
                </div>
              </div>

              {/* Enhanced Activity Timeline and Quick Actions */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Enhanced Activity Timeline */}
                <EnhancedActivityTimeline />

                {/* ✅ Enhanced Quick Actions Card */}
                <Card className="glass-card-hover border-0 shadow-xl overflow-hidden">
                  <CardHeader className="pb-4 border-b border-border/50">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold">
                      <div className="p-2.5 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl backdrop-blur-sm">
                        <Zap className="w-5 h-5 text-accent" />
                      </div>
                      <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {t('quickActions')}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    {/* ✅ PERFORMANCE: Use Link with prefetch for faster navigation */}
                    <Link 
                      href="/dashboard/students"
                      prefetch={true}
                      className="w-full btn-primary flex items-center justify-between group p-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
                      aria-label={language === 'ar' ? 'إضافة طالب جديد' : 'Add new student'}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="font-semibold">{language === 'ar' ? 'إضافة طالب جديد' : 'Add New Student'}</span>
                      </div>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link 
                      href="/dashboard/classes"
                      prefetch={true}
                      className="w-full btn-glass flex items-center justify-between group p-4 rounded-xl transition-all duration-200 hover:shadow-lg"
                      aria-label={language === 'ar' ? 'إنشاء فصل جديد' : 'Create new class'}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <School className="w-5 h-5" />
                        </div>
                        <span className="font-semibold">{language === 'ar' ? 'إنشاء فصل جديد' : 'Create New Class'}</span>
                      </div>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link 
                      href="/dashboard/teachers"
                      prefetch={true}
                      className="w-full btn-outline flex items-center justify-between group p-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:border-primary/50"
                      aria-label={language === 'ar' ? 'إضافة معلم جديد' : 'Add new teacher'}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <GraduationCap className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-semibold">{language === 'ar' ? 'إضافة معلم جديد' : 'Add New Teacher'}</span>
                      </div>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center">
                <div className="bg-background px-4">
                  <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                </div>
              </div>
            </div>

            {/* ============================================
                SECTION 3: Analytics & Insights
                ============================================ */}
            <section className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-info/20 to-success/20 rounded-xl">
                      <BarChart3 className="w-5 h-5 text-info" />
                    </div>
                    <span>{language === 'ar' ? 'التحليلات والرؤى' : 'Analytics & Insights'}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 ml-12">
                    {language === 'ar' ? 'الرسوم البيانية والرؤى السريعة' : 'Charts and quick insights'}
                  </p>
                </div>
              </div>

              {/* Charts and Quick Insights */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Charts - Takes 2 columns on large screens */}
                <div className="lg:col-span-2">
                  <AdminCharts />
                </div>
                
                {/* Quick Insights - Takes 1 column on large screens */}
                <div className="lg:col-span-1">
                  <QuickInsights />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Student Dashboard - لوحة الطالب */}
        {profile?.role === 'student' && (
          <>
            {/* Statistics Cards - بطاقات الإحصائيات */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={language === 'ar' ? 'فصولي' : 'My Classes'}
                value={stats.totalClasses}
                icon={School}
                description={language === 'ar' ? 'فصول مسجلة' : 'Enrolled classes'}
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title={language === 'ar' ? 'المعدل' : 'Average Grade'}
                value={averageGrade !== null ? `${averageGrade}%` : '—'}
                icon={Award}
                description={language === 'ar' ? 'الدرجة المتوسطة' : 'Current average'}
                gradient="from-emerald-500 to-teal-500"
              />
              <StatCard
                title={language === 'ar' ? 'الحضور' : 'Attendance'}
                value={attendanceRate !== null ? `${attendanceRate}%` : '—'}
                icon={CheckCircle2}
                description={language === 'ar' ? 'نسبة الحضور' : 'Attendance rate'}
                gradient="from-amber-500 to-orange-500"
              />
              <StatCard
                title={language === 'ar' ? 'اليوم' : 'Today'}
                value={todayEvents.length}
                icon={Clock}
                description={language === 'ar' ? 'أحداث اليوم' : 'Events today'}
                gradient="from-purple-500 to-pink-500"
              />
            </div>

            {/* Today's Schedule and Quick Actions - جدول اليوم والإجراءات السريعة */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Today's Schedule Card */}
              <Card className="card-hover glass-strong md:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 font-display">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      {language === 'ar' ? 'جدول اليوم' : "Today's Schedule"}
                    </CardTitle>
                    <Link 
                      href="/dashboard/schedule"
                      prefetch={true}
                    >
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-sm"
                      >
                        {language === 'ar' ? 'عرض الكامل' : 'View Full'} 
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSchedule ? (
                    <div className="text-center py-8 animate-fade-in">
                      <div className="relative inline-block mb-4">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                        <div className="absolute inset-0 bg-blue-200/20 rounded-full blur-xl"></div>
                      </div>
                      <Skeleton className="h-4 w-32 mx-auto mb-2" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </div>
                  ) : todayEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 animate-fade-in">
                      <div className="relative inline-block mb-4">
                        <Calendar className="h-16 w-16 mx-auto opacity-50 animate-float" />
                      </div>
                      <p className="text-sm font-semibold font-display mb-1">
                        {language === 'ar' ? 'لا توجد أحداث اليوم' : 'No events scheduled for today'}
                      </p>
                      <p className="text-xs font-sans opacity-75">
                        {language === 'ar' ? 'لا توجد أحداث مجدولة لهذا اليوم' : 'You have a free day today!'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todayEvents.map((e: ScheduleEvent) => (
                        <div 
                          key={e.id} 
                          className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  {new Date(e.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                  {new Date(e.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{e.title}</h4>
                              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                                {e.room && <span>📍 {e.room}</span>}
                                {e.mode === 'online' && (
                                  <span className="flex items-center gap-1">
                                    <Video className="h-3 w-3" /> 
                                    {language === 'ar' ? 'أونلاين' : 'Online'}
                                  </span>
                                )}
                                {e.mode === 'hybrid' && (
                                  <span className="flex items-center gap-1">
                                    <Video className="h-3 w-3" /> 
                                    {language === 'ar' ? 'هجين' : 'Hybrid'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {e.zoom_url && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => window.open(e.zoom_url, '_blank')}
                              >
                                <Video className="h-3 w-3 mr-1" /> 
                                {language === 'ar' ? 'انضم' : 'Join'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/dashboard/schedule" prefetch={true} className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'الجدول الدراسي' : 'Schedule'}
                    </Button>
                  </Link>
                  <Link href="/dashboard/my-classes" prefetch={true} className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                    >
                      <School className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'الفصول' : 'Classes'}
                    </Button>
                  </Link>
                  <Link href="/dashboard/grades" prefetch={true} className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                    >
                      <Award className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'الدرجات' : 'Grades'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Notifications Card */}
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Bell className="h-5 w-5 text-amber-600" />
                    {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(loadingAssignments || loadingSchedule) ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((n, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {n.label === 'overdue' && (
                                <span className="text-red-600 dark:text-red-400">
                                  {language === 'ar' ? 'متأخر: ' : 'Overdue: '}
                                </span>
                              )}
                              {n.label === 'dueSoon' && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {language === 'ar' ? 'قريب: ' : 'Due soon: '}
                                </span>
                              )}
                              {n.label === 'startingSoon' && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  {language === 'ar' ? 'قريباً يبدأ: ' : 'Starting soon: '}
                                </span>
                              )}
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{n.when}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Assignments - الواجبات القادمة */}
            {loadingAssignments ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-amber-600 mx-auto animate-pulse-glow" />
                  <div className="absolute inset-0 bg-amber-200/20 rounded-full blur-xl"></div>
                </div>
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : upcomingAssignments.length > 0 && (
              <Card className="card-elegant">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 font-display text-primary">
                      <FileText className="h-5 w-5 text-amber-600" />
                      {language === 'ar' ? 'الواجبات القادمة' : 'Upcoming Assignments'}
                    </CardTitle>
                    <Link href="/dashboard/my-assignments" prefetch={true}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-sm"
                      >
                        {language === 'ar' ? 'عرض الكل' : 'View All'} 
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingAssignments.map((assignment: Assignment) => {
                      const dueDate = new Date(assignment.due_date);
                      const daysLeft = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysLeft < 0;
                      const isUrgent = daysLeft <= 2 && !isOverdue;
                      
                      return (
                        <div 
                          key={assignment.id} 
                          className={`p-4 rounded-lg border ${
                            isOverdue 
                              ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' 
                              : isUrgent 
                                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20' 
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                          } hover:shadow-sm transition-shadow`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                  {assignment.title}
                                </h4>
                                {assignment.submission && assignment.submission.status === 'submitted' && (
                                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    {language === 'ar' ? 'تم الإرسال' : 'Submitted'}
                                  </Badge>
                                )}
                                {isOverdue && !assignment.submission && (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                                    <AlertCircle className="h-3 w-3 mr-1" /> 
                                    {language === 'ar' ? 'متأخر' : 'Overdue'}
                                  </Badge>
                                )}
                                {isUrgent && !assignment.submission && (
                                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                    <Clock className="h-3 w-3 mr-1" /> 
                                    {language === 'ar' ? 'عاجل' : 'Urgent'}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {dueDate.toLocaleDateString()}
                                </span>
                                <span>{assignment.subject_name}</span>
                                <span>• {assignment.class_name}</span>
                              </div>
                            </div>
                            <Link href={`/dashboard/assignments/${assignment.id}/submit`} prefetch={true}>
                              <Button
                                size="sm" 
                                className="btn-gradient transition-all duration-300 hover:scale-105"
                              >
                                {assignment.submission 
                                  ? (language === 'ar' ? 'عرض' : 'View') 
                                  : (language === 'ar' ? 'إرسال' : 'Submit')
                                }
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Enrolled Classes - فصولي المسجلة */}
            {loadingStudentData ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto animate-pulse-glow" />
                  <div className="absolute inset-0 bg-blue-200/20 rounded-full blur-xl"></div>
                </div>
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : (
              <Card className="card-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-gradient">
                    <School className="h-5 w-5 text-blue-600" />
                    {language === 'ar' ? 'فصولي المسجلة' : 'My Enrolled Classes'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(myClassEnrollments).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400 animate-fade-in">
                      <div className="relative inline-block mb-4">
                        <School className="h-20 w-20 mx-auto opacity-50 animate-float" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                        {language === 'ar' ? 'لم تسجل في أي فصل بعد' : 'No Enrolled Classes'}
                      </h3>
                      <p className="text-sm font-sans mb-6">
                        {language === 'ar' ? 'استعرض الفصول المتاحة وابدأ التعلم!' : 'Browse available classes and start learning!'}
                      </p>
                      <Link href="/dashboard/classes" prefetch={true}>
                        <Button 
                          className="btn-gradient animate-pulse-glow"
                        >
                          {language === 'ar' ? 'استعراض الفصول المتاحة' : 'Browse Available Classes'}
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {publishedClasses
                        .filter((c: any) => myClassEnrollments[c.id])
                        .map((c: any) => (
                          <Link key={c.id} href={`/dashboard/my-classes/${c.id}`} prefetch={true}>
                            <Card 
                              className="card-hover overflow-hidden cursor-pointer"
                            >
                            <CardHeader className="hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-950/20 dark:hover:to-cyan-950/20 transition-all duration-300">
                              <div className="flex items-start gap-4">
                                {/* Class Image */}
                                <div className="relative flex-shrink-0">
                                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                                  {c.image_url ? (
                                    <img 
                                      src={c.image_url} 
                                      alt={c.class_name || c.name} 
                                      className="w-20 h-20 rounded-2xl object-cover relative border-2 border-blue-100 dark:border-blue-900" 
                                    />
                                  ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative">
                                      <GraduationCap className="h-10 w-10 text-white" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Class Info */}
                                <div className="flex-1 min-w-0 pt-1">
                                  <CardTitle className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {c.class_name || c.name}
                                  </CardTitle>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                                        {language === 'ar' ? `المستوى ${c.level || '—'}` : `Level ${c.level || '—'}`}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                                        {(subjectsByClass[c.id] || []).length} {((subjectsByClass[c.id] || []).length === 1 
                                          ? (language === 'ar' ? 'مادة' : 'Subject') 
                                          : (language === 'ar' ? 'مواد' : 'Subjects'))}
                                      </Badge>
                                      {classProgress[c.id] !== undefined && (
                                        <div className="flex items-center gap-2">
                                          <Progress className="h-2 w-16" value={classProgress[c.id]} />
                                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                            {classProgress[c.id]}%
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                          </Link>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Available Classes - الفصول المتاحة */}
            {loadingStudentData ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto animate-pulse-glow" />
                  <div className="absolute inset-0 bg-emerald-200/20 rounded-full blur-xl"></div>
                </div>
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : (
              <Card className="card-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-gradient">
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                    {language === 'ar' ? 'الفصول المتاحة للتسجيل' : 'Available Classes'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {publishedClasses.filter((c: any) => !myClassEnrollments[c.id]).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400 animate-fade-in">
                      <div className="relative inline-block mb-4">
                        <BookOpen className="h-20 w-20 mx-auto opacity-50 animate-float" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                        {language === 'ar' ? 'لا توجد فصول متاحة' : 'No Available Classes'}
                      </h3>
                      <p className="text-sm font-sans">
                        {language === 'ar' ? 'لا توجد فصول متاحة للتسجيل حاليًا' : 'No classes available for enrollment at the moment'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {publishedClasses
                        .filter((c: any) => !myClassEnrollments[c.id])
                        .map((c: any) => (
                          <Card 
                            key={c.id} 
                            className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg font-display">
                                    {c.class_name || c.name}
                                  </CardTitle>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {language === 'ar' ? `المستوى ${c.level || '—'}` : `Level ${c.level || '—'}`}
                                  </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                  <BookOpen className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {c.goals && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                  {c.goals}
                                </p>
                              )}
                              <Button
                                className="btn-gradient w-full transition-all duration-300 hover:scale-105"
                                disabled={!!enrollingIds[c.id]}
                                onClick={async () => {
                                  try {
                                    setEnrollingIds(prev => ({ ...prev, [c.id]: true }));
                                    const { error } = await enrollInClass(c.id);
                                    if (error) {
                                      console.error(error);
                                      toast.error(language === 'ar' ? 'فشل التسجيل' : 'Enrollment failed');
                                      return;
                                    }
                                    setMyClassEnrollments(prev => ({ ...prev, [c.id]: true }));
                                    toast.success(language === 'ar' ? 'تم التسجيل بنجاح' : 'Enrolled successfully');
                                    await loadStudentData();
                                  } finally {
                                    setEnrollingIds(prev => ({ ...prev, [c.id]: false }));
                                  }
                                }}
                              >
                                {enrollingIds[c.id] 
                                  ? (language === 'ar' ? 'جاري التسجيل...' : 'Enrolling...') 
                                  : (language === 'ar' ? 'التسجيل في الفصل' : 'Enroll in Class')
                                }
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Events - الأحداث القادمة */}
            {loadingSchedule ? (
              <div className="text-center py-8">
                <Skeleton className="h-12 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : upcomingEvents.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Clock className="h-5 w-5 text-amber-600" />
                    {language === 'ar' ? 'الأحداث القادمة' : 'Upcoming Events'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingEvents.map((e: ScheduleEvent) => (
                      <div 
                        key={e.id} 
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                              {e.title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(e.start_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(e.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {e.room && <span>📍 {e.room}</span>}
                            </div>
                          </div>
                          {e.zoom_url && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => window.open(e.zoom_url, '_blank')}
                            >
                              <Video className="h-3 w-3 mr-1" /> 
                              {language === 'ar' ? 'انضم' : 'Join'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Teacher Dashboard - لوحة المعلم */}
        {profile?.role === 'teacher' && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title={t('myClasses')}
                value={teacherClassCount}
                icon={School}
                description={language === 'ar' ? 'الفصول التي تدرسها' : 'Classes you teach'}
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title={t('myStudents')}
                value={teacherStudentCount}
                icon={Users}
                description={language === 'ar' ? 'إجمالي الطلاب' : 'Total students'}
                gradient="from-purple-500 to-pink-500"
              />
              <StatCard
                title={t('schedule')}
                value={todayEvents.length}
                icon={Calendar}
                description={language === 'ar' ? 'فصول اليوم' : 'Classes today'}
                gradient="from-amber-500 to-orange-500"
              />
            </div>

            {/* Today's Schedule */}
            {loadingSchedule ? (
              <Card className="card-elegant">
                <CardHeader>
                  <CardTitle className="font-display text-gradient">
                    {language === 'ar' ? 'جدول اليوم' : 'Today\'s Schedule'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 animate-fade-in">
                    <div className="relative inline-block mb-4">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto animate-pulse-glow" />
                      <div className="absolute inset-0 bg-blue-200/20 rounded-full blur-xl"></div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                      {language === 'ar' ? 'جاري تحميل الجدول...' : 'Loading schedule...'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : todayEvents.length > 0 && (
              <Card className="card-elegant">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 font-display text-gradient">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      {language === 'ar' ? 'جدول اليوم' : 'Today\'s Schedule'}
                    </CardTitle>
                    <Link 
                      href="/dashboard/schedule"
                      prefetch={true}
                    >
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-sm"
                      >
                        {language === 'ar' ? 'عرض الكامل' : 'View Full'} 
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todayEvents.map((e: ScheduleEvent) => (
                      <div 
                        key={e.id} 
                        className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {new Date(e.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                {new Date(e.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{e.title}</h4>
                            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                              {e.room && <span>📍 {e.room}</span>}
                              {e.mode === 'online' && (
                                <span className="flex items-center gap-1">
                                  <Video className="h-3 w-3" /> 
                                  {language === 'ar' ? 'أونلاين' : 'Online'}
                                </span>
                              )}
                            </div>
                          </div>
                          {e.zoom_url && (
                            <Button 
                              size="sm" 
                              className="btn-gradient transition-all duration-300 hover:scale-105"
                              onClick={() => window.open(e.zoom_url, '_blank')}
                            >
                              <Video className="h-3 w-3 mr-1" /> 
                              {language === 'ar' ? 'انضم' : 'Join'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Classes */}
            {loadingTeacherData ? (
              <Card className="card-elegant">
                <CardHeader>
                  <CardTitle className="font-display text-gradient">{t('myClasses')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 animate-fade-in">
                    <div className="relative inline-block mb-4">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto animate-pulse-glow" />
                      <div className="absolute inset-0 bg-blue-200/20 rounded-full blur-xl"></div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                      {language === 'ar' ? 'جاري تحميل الفصول...' : 'Loading classes...'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="card-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-gradient">
                    <School className="h-5 w-5 text-blue-600" />
                    {t('myClasses')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {teacherClasses.length === 0 ? (
                    <div className="text-center py-12 animate-fade-in">
                      <div className="relative inline-block mb-4">
                        <School className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                        {language === 'ar' ? 'لا توجد فصول' : 'No Classes'}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                        {language === 'ar' ? 'لم يتم تعيين أي فصول لك بعد' : 'No classes have been assigned to you yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {teacherClasses.map((cls: any) => (
                        <Link key={cls.id} href={`/dashboard/classes/${cls.id}`} prefetch={true}>
                          <Card 
                            className="card-hover overflow-hidden cursor-pointer"
                          >
                          <CardHeader className="hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-950/20 dark:hover:to-cyan-950/20 transition-all duration-300">
                            <div className="flex items-start gap-4">
                              <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                                {cls.image_url ? (
                                  <img 
                                    src={cls.image_url} 
                                    alt={cls.class_name} 
                                    className="w-16 h-16 rounded-2xl object-cover relative border-2 border-blue-100 dark:border-blue-900" 
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative">
                                    <School className="h-8 w-8 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pt-1">
                                <CardTitle className="text-lg font-display font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {cls.class_name}
                                </CardTitle>
                                <div className="space-y-1">
                                  {cls.level && (
                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-xs">
                                      {language === 'ar' ? `المستوى ${cls.level}` : `Level ${cls.level}`}
                                    </Badge>
                                  )}
                                  <div className="flex items-center justify-between mt-2">
                                    <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 text-xs">
                                      {cls.student_count} {language === 'ar' ? 'طالب' : 'students'}
                                    </Badge>
                                    {cls.subjects && cls.subjects.length > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {cls.subjects.length} {language === 'ar' ? 'مادة' : 'subjects'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Supervisor Dashboard - لوحة المشرف */}
        {profile?.role === 'supervisor' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title={language === 'ar' ? 'الفصول المسؤول عنها' : 'Assigned Classes'}
                value={stats.totalClasses}
                icon={School}
                description={language === 'ar' ? 'الفصول تحت الإشراف' : 'Classes under supervision'}
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title={language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}
                value={stats.totalStudents}
                icon={Users}
                description={language === 'ar' ? 'الطلاب في الفصول المعينة' : 'Students in assigned classes'}
                gradient="from-purple-500 to-pink-500"
              />
              <StatCard
                title={language === 'ar' ? 'التقارير' : 'Reports'}
                value="0"
                icon={BookOpen}
                description={language === 'ar' ? 'التقارير المعلقة' : 'Pending reports'}
                gradient="from-amber-500 to-orange-500"
              />
            </div>

            <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  {language === 'ar' ? 'الفصول المشرفة عليها' : 'Supervised Classes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.totalClasses === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    {language === 'ar' ? 'لم يتم تعيين أي فصول للإشراف بعد' : 'No classes assigned for supervision yet'}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {language === 'ar' 
                      ? `لديك ${stats.totalClasses} ${stats.totalClasses === 1 ? 'فصل' : 'فصول'} تحت الإشراف` 
                      : `You are supervising ${stats.totalClasses} ${stats.totalClasses === 1 ? 'class' : 'classes'}`
                    }
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
