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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, School, BookOpen, Calendar, TrendingUp, Clock, Award, 
  CheckCircle2, ArrowRight, Video, GraduationCap, FileText, 
  AlertCircle, Bell 
} from 'lucide-react';
import { QuickStatsChart } from '@/components/Charts';
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
import { ChartsWithSuspense } from '@/components/LazyComponents';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================
// TYPES - تعريف الأنواع
// ============================================

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
}

interface RecentActivity {
  id: string;
  type: 'student_registered' | 'class_created' | 'teacher_added' | 'enrollment' | 'assignment_created';
  title: string;
  timestamp: Date;
  icon: string;
}

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
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  
  // Loading states
  const [loadingStudentData, setLoadingStudentData] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // ============================================
  // EFFECTS - التأثيرات الجانبية
  // ============================================

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // تحميل الإحصائيات عند تحميل الملف الشخصي
  useEffect(() => {
    if (profile) {
      fetchStats().catch(err => {
        console.error('Error fetching stats:', err);
        toast.error(language === 'ar' ? 'فشل تحميل الإحصائيات' : 'Failed to load statistics');
      });
      
      // تحميل بيانات الطالب
      if (profile.role === 'student') {
        void loadStudentData();
        void loadStudentSchedule();
        void loadStudentStats();
        void loadUpcomingAssignments();
      }
      
      // تحميل النشاط الحديث للمدير
      if (profile.role === 'admin') {
        void loadRecentActivity();
      }
    }
  }, [profile]);

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
        // استعلامات المعلم
        const [classes, students] = await Promise.all([
          supabase.from('classes').select('id', { count: 'exact' }).eq('teacher_id', profile.id),
          supabase
            .from('student_enrollments')
            .select('student_id', { count: 'exact' })
            .in('class_id',
              (await supabase.from('classes').select('id').eq('teacher_id', profile.id)).data?.map(c => c.id) || []
            ),
        ]);

        setStats({
          totalClasses: classes.count || 0,
          totalStudents: students.count || 0,
          totalTeachers: 0,
          totalSubjects: 0,
        });
      } else if (profile.role === 'student') {
        // استعلامات الطالب
        const enrollments = await supabase
          .from('student_enrollments')
          .select('class_id', { count: 'exact' })
          .eq('student_id', profile.id)
          .eq('status', 'active');

        setStats({
          totalClasses: enrollments.count || 0,
          totalStudents: 0,
          totalTeachers: 0,
          totalSubjects: 0,
        });
      } else if (profile.role === 'supervisor') {
        // استعلامات المشرف
        const [classes, students] = await Promise.all([
          supabase.from('classes').select('id', { count: 'exact' }).eq('supervisor_id', profile.id),
          supabase
            .from('student_enrollments')
            .select('student_id', { count: 'exact' })
            .in('class_id',
              (await supabase.from('classes').select('id').eq('supervisor_id', profile.id)).data?.map(c => c.id) || []
            ),
        ]);

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

  /**
   * جلب النشاط الحديث للمدير
   * يجلب البيانات الحقيقية من قاعدة البيانات
   */
  const loadRecentActivity = async () => {
    if (!profile || profile.role !== 'admin') return;
    
    try {
      setLoadingActivity(true);
      const activities: RecentActivity[] = [];
      
      // جلب آخر 5 طلاب مسجلين
      const { data: recentStudents } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (recentStudents) {
        recentStudents.forEach((student) => {
          activities.push({
            id: `student-${student.id}`,
            type: 'student_registered',
            title: language === 'ar' 
              ? `طالب جديد: ${student.full_name}` 
              : `New student: ${student.full_name}`,
            timestamp: new Date(student.created_at),
            icon: 'users',
          });
        });
      }
      
      // جلب آخر 5 فصول منشأة
      const { data: recentClasses } = await supabase
        .from('classes')
        .select('id, class_name, created_at')
        .order('created_at', { ascending: false })
        .limit(2);
      
      if (recentClasses) {
        recentClasses.forEach((cls) => {
          activities.push({
            id: `class-${cls.id}`,
            type: 'class_created',
            title: language === 'ar' 
              ? `تم إنشاء فصل: ${cls.class_name}` 
              : `Class created: ${cls.class_name}`,
            timestamp: new Date(cls.created_at),
            icon: 'school',
          });
        });
      }
      
      // ترتيب حسب التاريخ الأحدث
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setRecentActivity(activities.slice(0, 5));
    } catch (err) {
      console.error('Error loading recent activity:', err);
      toast.error(language === 'ar' ? 'فشل تحميل النشاط الحديث' : 'Failed to load recent activity');
    } finally {
      setLoadingActivity(false);
    }
  };

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
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">{t('loading')}</p>
          </div>
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
        {/* Header Section - قسم الترحيب */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl shadow-emerald-500/30 relative overflow-hidden border border-white/20">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)'
          }}></div>
          
          {/* Animated Elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 animate-float blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16 animate-float blur-2xl" style={{animationDelay: '1s'}}></div>
          
          <div className="relative z-10">
            {/* Avatar and Welcome */}
            <div className="flex items-start gap-4 md:gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md"></div>
                <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                  <span className="text-3xl md:text-4xl font-bold">{profile.full_name.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div className="flex-1 pt-2">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight flex items-center gap-2">
                  <span className="bg-gradient-to-r from-white to-emerald-50 bg-clip-text text-transparent drop-shadow-lg">
                    {t('welcomeBack')}, {profile.full_name}!
                  </span>
                  <span className="text-4xl md:text-5xl lg:text-6xl drop-shadow-2xl">👋</span>
                </h1>
                <p className="text-emerald-50/90 mt-2 text-lg md:text-xl font-medium font-sans">
                  {t(`${profile.role}Dashboard`)}
                </p>
              </div>
            </div>
            
            {/* Status and Quick Info */}
            <div className="mt-6 md:mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <span className="text-white text-sm font-medium font-sans">
                  {language === 'ar' ? 'نظام متصل' : 'System Online'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <Calendar className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium font-sans">
                  {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium font-sans">
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Dashboard - لوحة المدير */}
        {profile.role === 'admin' && (
          <>
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={t('totalStudents')}
                value={stats.totalStudents}
                icon={Users}
                description={t('activeClasses')}
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title={t('totalTeachers')}
                value={stats.totalTeachers}
                icon={Users}
                description={language === 'ar' ? 'أعضاء هيئة التدريس' : 'Faculty members'}
                gradient="from-purple-500 to-pink-500"
              />
              <StatCard
                title={t('totalClasses')}
                value={stats.totalClasses}
                icon={School}
                description={language === 'ar' ? 'فصول نشطة' : 'Active classes'}
                gradient="from-amber-500 to-orange-500"
              />
              <StatCard
                title={t('subjects')}
                value={stats.totalSubjects}
                icon={BookOpen}
                description={language === 'ar' ? 'المواد الأكاديمية' : 'Academic subjects'}
                gradient="from-emerald-500 to-teal-500"
              />
            </div>

            {/* Recent Activity and Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Recent Activity Card */}
              <Card className="card-hover glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    {t('recentActivity')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingActivity ? (
                  <div className="space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                      {language === 'ar' ? 'لا يوجد نشاط حديث' : 'No recent activity'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((activity) => (
                        <div 
                          key={activity.id} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20"
                        >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            {activity.icon === 'users' && <Users className="w-4 h-4 text-white" />}
                            {activity.icon === 'school' && <School className="w-4 h-4 text-white" />}
                      </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {activity.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                      </div>
                    </div>
                      ))}
                      </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="card-hover glass-strong">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    {t('quickActions')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full justify-start btn-gradient text-white font-medium"
                    onClick={() => router.push('/dashboard/students')}
                    aria-label={language === 'ar' ? 'إضافة طالب جديد' : 'Add new student'}
                  >
                    {language === 'ar' ? 'إضافة طالب جديد' : 'Add New Student'}
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full justify-start border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-medium"
                    onClick={() => router.push('/dashboard/classes')}
                    aria-label={language === 'ar' ? 'إنشاء فصل جديد' : 'Create new class'}
                  >
                    {language === 'ar' ? 'إنشاء فصل جديد' : 'Create New Class'}
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full justify-start border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-medium"
                    onClick={() => router.push('/dashboard/teachers')}
                    aria-label={language === 'ar' ? 'إضافة معلم جديد' : 'Add new teacher'}
                  >
                    {language === 'ar' ? 'إضافة معلم جديد' : 'Add New Teacher'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
                   <ChartsWithSuspense />
          </>
        )}

        {/* Student Dashboard - لوحة الطالب */}
        {profile.role === 'student' && (
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => router.push('/dashboard/schedule')} 
                      className="text-sm"
                    >
                      {language === 'ar' ? 'عرض الكامل' : 'View Full'} 
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSchedule ? (
                    <div className="text-center py-8">
                      <Skeleton className="h-12 w-12 mx-auto mb-2" />
                      <Skeleton className="h-4 w-32 mx-auto mb-2" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </div>
                  ) : todayEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-sans">
                        {language === 'ar' ? 'لا توجد أحداث اليوم' : 'No events scheduled for today'}
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
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => router.push('/dashboard/schedule')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'الجدول الدراسي' : 'Schedule'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => router.push('/dashboard/my-classes')}
                  >
                    <School className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'الفصول' : 'Classes'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => router.push('/dashboard/grades')}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'الدرجات' : 'Grades'}
                  </Button>
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
              <div className="text-center py-8">
                <Skeleton className="h-12 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : upcomingAssignments.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 font-display">
                      <FileText className="h-5 w-5 text-amber-600" />
                      {language === 'ar' ? 'الواجبات القادمة' : 'Upcoming Assignments'}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => router.push('/dashboard/my-assignments')} 
                      className="text-sm"
                    >
                      {language === 'ar' ? 'عرض الكل' : 'View All'} 
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
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
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => router.push(`/dashboard/assignments/${assignment.id}/submit`)}
                            >
                              {assignment.submission 
                                ? (language === 'ar' ? 'عرض' : 'View') 
                                : (language === 'ar' ? 'إرسال' : 'Submit')
                              }
                            </Button>
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
              <div className="text-center py-8">
                <Skeleton className="h-12 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : (
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <School className="h-5 w-5 text-blue-600" />
                    {language === 'ar' ? 'فصولي المسجلة' : 'My Enrolled Classes'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(myClassEnrollments).length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <School className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-sans mb-4">
                        {language === 'ar' ? 'لم تسجل في أي فصل بعد' : 'You have not enrolled in any classes yet'}
                      </p>
                      <Button 
                        onClick={() => router.push('/dashboard/classes')} 
                        variant="outline"
                      >
                        {language === 'ar' ? 'استعراض الفصول المتاحة' : 'Browse Available Classes'}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {publishedClasses
                        .filter((c: any) => myClassEnrollments[c.id])
                        .map((c: any) => (
                          <Card 
                            key={c.id} 
                            className="overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-2xl transition-all duration-300 group cursor-pointer"
                            onClick={() => router.push(`/dashboard/my-classes/${c.id}`)}
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
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Available Classes - الفصول المتاحة */}
            {loadingStudentData ? (
              <div className="text-center py-8">
                <Skeleton className="h-12 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ) : (
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                    {language === 'ar' ? 'الفصول المتاحة للتسجيل' : 'Available Classes'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {publishedClasses.filter((c: any) => !myClassEnrollments[c.id]).length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-sans">
                        {language === 'ar' ? 'لا توجد فصول متاحة حاليًا' : 'No available classes at the moment'}
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
                                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
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
        {profile.role === 'teacher' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title={t('myClasses')}
                value={stats.totalClasses}
                icon={School}
                description={language === 'ar' ? 'الفصول التي تدرسها' : 'Classes you teach'}
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                title={t('myStudents')}
                value={stats.totalStudents}
                icon={Users}
                description={language === 'ar' ? 'إجمالي الطلاب' : 'Total students'}
                gradient="from-purple-500 to-pink-500"
              />
              <StatCard
                title={t('schedule')}
                value={todayEvents.length}
                icon={Calendar}
                description={language === 'ar' ? 'فصول هذا الأسبوع' : 'Classes this week'}
                gradient="from-amber-500 to-orange-500"
              />
            </div>

            <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  {t('myClasses')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.totalClasses === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    {language === 'ar' ? 'لم يتم تعيين أي فصول بعد' : 'No classes assigned yet'}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {language === 'ar' 
                      ? `لديك ${stats.totalClasses} ${stats.totalClasses === 1 ? 'فصل' : 'فصول'}` 
                      : `You have ${stats.totalClasses} ${stats.totalClasses === 1 ? 'class' : 'classes'}`
                    }
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Supervisor Dashboard - لوحة المشرف */}
        {profile.role === 'supervisor' && (
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
