// تحسين استعلامات قاعدة البيانات للأداء
import { supabase } from '@/lib/supabase';

// ذاكرة تخزين مؤقت بسيطة للاستعلامات
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1 * 60 * 1000; // ✅ OPTIMIZED: 1 دقيقة (faster updates, less stale data)

// دالة مساعدة لتنظيف الذاكرة المؤقتة
const cleanupCache = () => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  queryCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_DURATION) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => queryCache.delete(key));
};

// دالة مساعدة للحصول على البيانات من الذاكرة المؤقتة أو قاعدة البيانات
// ✅ PERFORMANCE: Returns cached data immediately if available (optimistic loading)
export const getCachedData = async <T>(
  cacheKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  useCache: boolean = true,
  returnCachedImmediately: boolean = true // ✅ NEW: Return cached data immediately
): Promise<{ data: T | null; error: any; fromCache?: boolean }> => {
  // تنظيف الذاكرة المؤقتة
  cleanupCache();

  // ✅ OPTIMISTIC LOADING: Return cached data immediately if available
  if (useCache && returnCachedImmediately && queryCache.has(cacheKey)) {
    const cached = queryCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      // Return cached data immediately, then refresh in background
      queryFn().then((result) => {
        if (!result.error && useCache) {
          queryCache.set(cacheKey, {
            data: result.data,
            timestamp: Date.now()
          });
        }
      }).catch(() => {
        // Silently fail background refresh
      });
      return { data: cached.data, error: null, fromCache: true };
    }
  }

  // تنفيذ الاستعلام
  const result = await queryFn();
  
  // حفظ النتيجة في الذاكرة المؤقتة
  if (useCache && !result.error) {
    queryCache.set(cacheKey, {
      data: result.data,
      timestamp: Date.now()
    });
  }

  return { ...result, fromCache: false };
};

// استعلامات محسنة للطلاب
export const getStudentsOptimized = async (role: string, userId?: string) => {
  const cacheKey = `students_${role}_${userId || 'all'}`;
  
  return getCachedData(cacheKey, async () => {
    try {
      let query = supabase.from('profiles').select('*');
      
      if (role === 'admin') {
        // للمدير: استخدام RPC للحصول على جميع البيانات
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_profiles');
        if (!rpcError && rpcData) {
          return { 
            data: rpcData.filter((user: any) => user.role === 'student'), 
            error: null 
          };
        }
        // في حالة فشل RPC، استخدام الاستعلام المباشر
        query = query.eq('role', 'student');
      } else {
        // للمعلمين والمشرفين: الحصول على طلابهم فقط
        query = query.eq('role', 'student');
      }
      
      const { data, error } = await query.order('full_name', { ascending: true });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  });
};

// استعلامات محسنة للمستخدمين
export const getUsersOptimized = async () => {
  const cacheKey = 'users_all';
  
  return getCachedData(cacheKey, async () => {
    try {
      // محاولة استخدام RPC أولاً
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_profiles');
      
      if (!rpcError && rpcData) {
        return { data: rpcData, error: null };
      }
      
      // في حالة فشل RPC، استخدام الاستعلام المباشر
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  });
};

// استعلامات محسنة للفصول
export const getClassesOptimized = async (role: string, userId?: string) => {
  const cacheKey = `classes_${role}_${userId || 'all'}`;
  
  return getCachedData(cacheKey, async () => {
    try {
      let query = supabase.from('classes').select('*');
      
      if (role === 'teacher') {
        query = query.eq('teacher_id', userId);
      } else if (role === 'supervisor') {
        query = query.eq('supervisor_id', userId);
      }
      
      const { data: classesData, error: classesError } = await query.order('created_at', { ascending: false });
      
      if (classesError) {
        return { data: [], error: classesError };
      }
      
      // الحصول على عدد الطلاب والمواد لكل فصل في استعلام واحد
      const classIds = (classesData || []).map(c => c.id);
      
      if (classIds.length === 0) {
        return { data: [], error: null };
      }
      
      // استعلام موحد للحصول على إحصائيات الفصول
      const [enrollmentsResult, subjectsResult] = await Promise.all([
        supabase
          .from('student_enrollments')
          .select('class_id')
          .in('class_id', classIds),
        supabase
          .from('class_subjects')
          .select('class_id')
          .in('class_id', classIds)
      ]);
      
      // معالجة البيانات
      const enrollCounts = (enrollmentsResult.data || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.class_id] = (acc[row.class_id] || 0) + 1;
        return acc;
      }, {});
      
      const subjectCounts = (subjectsResult.data || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.class_id] = (acc[row.class_id] || 0) + 1;
        return acc;
      }, {});
      
      const mappedClasses = (classesData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        grade: c.grade_level ? `Grade ${c.grade_level}` : '-',
        students: enrollCounts[c.id] || 0,
        subjects: subjectCounts[c.id] || 0,
        academicYear: c.academic_year || null,
        status: (enrollCounts[c.id] || 0) > 0 ? 'active' : 'inactive',
        created_at: c.created_at,
      }));
      
      return { data: mappedClasses, error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  });
};

// استعلامات محسنة للإحصائيات مع trends و metrics إضافية
export const getStatsOptimized = async () => {
  const cacheKey = 'dashboard_stats';
  
  return getCachedData(cacheKey, async () => {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // ✅ PERFORMANCE: Load all data in parallel
      const [
        studentsResult, 
        teachersResult, 
        classesResult, 
        subjectsResult,
        // Previous month data for trends
        prevStudentsResult,
        prevTeachersResult,
        prevClassesResult,
        prevSubjectsResult,
        // Attendance data
        attendanceData,
        // Completion data
        lessonProgressData,
        // Active users (last 7 days)
        activeUsersData
      ] = await Promise.all([
        supabase.rpc('get_total_students'),
        supabase.rpc('get_total_teachers'),
        supabase.from('classes').select('id', { count: 'exact' }),
        // ✅ FIX: Get all subjects from class_subjects to count unique subject_name values
        supabase.from('class_subjects').select('subject_name'),
        // Previous month counts
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student')
          .lt('created_at', thisMonthStart.toISOString()),
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'teacher')
          .lt('created_at', thisMonthStart.toISOString()),
        supabase.from('classes')
          .select('id', { count: 'exact', head: true })
          .lt('created_at', thisMonthStart.toISOString()),
        // ✅ FIX: Get previous month subjects from class_subjects to calculate unique count
        supabase.from('class_subjects')
          .select('subject_name')
          .lt('created_at', thisMonthStart.toISOString()),
        // Attendance rate (last 30 days)
        supabase.from('attendance_records')
          .select('status')
          .gte('attendance_date', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
        // Completion rate (lessons completed)
        supabase.from('lesson_progress')
          .select('status'),
        // Active users (last 7 days)
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('updated_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);
      
      const totalStudents = studentsResult.data || 0;
      const totalTeachers = teachersResult.data || 0;
      const totalClasses = classesResult.count || 0;
      
      // ✅ FIX: Calculate unique subjects count from class_subjects
      // Subjects are stored in class_subjects table with subject_name field
      // We need to count distinct subject_name values
      let totalSubjects = 0;
      if (subjectsResult.data && subjectsResult.data.length > 0) {
        // Get unique subject names (case-insensitive, trimmed)
        const uniqueSubjects = new Set(
          subjectsResult.data
            .map((s: any) => s.subject_name?.toLowerCase().trim())
            .filter((name: string) => name && name.length > 0)
        );
        totalSubjects = uniqueSubjects.size;
      } else if (subjectsResult.error) {
        // If error, try alternative: check if there's a separate subjects table
        const { data: subjectsTableData, error: subjectsTableError } = await supabase
          .from('subjects')
          .select('id', { count: 'exact' });
        
        if (!subjectsTableError && subjectsTableData !== null) {
          // If subjects table exists, use it
          totalSubjects = (subjectsTableData as any).count || 0;
        } else {
          // Fallback: try to get from class_subjects again
          const { data: allSubjects } = await supabase
            .from('class_subjects')
            .select('subject_name');
          if (allSubjects && allSubjects.length > 0) {
            const uniqueSubjects = new Set(
              allSubjects
                .map((s: any) => s.subject_name?.toLowerCase().trim())
                .filter((name: string) => name && name.length > 0)
            );
            totalSubjects = uniqueSubjects.size;
          }
        }
      }
      
      // Calculate trends (percentage change from previous month)
      const prevStudents = prevStudentsResult.count || 0;
      const prevTeachers = prevTeachersResult.count || 0;
      const prevClasses = prevClassesResult.count || 0;
      
      // ✅ FIX: Calculate unique subjects count for previous month
      let prevSubjects = 0;
      if (prevSubjectsResult.data && prevSubjectsResult.data.length > 0) {
        const uniquePrevSubjects = new Set(
          prevSubjectsResult.data
            .map((s: any) => s.subject_name?.toLowerCase().trim())
            .filter((name: string) => name && name.length > 0)
        );
        prevSubjects = uniquePrevSubjects.size;
      }
      
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
        const change = ((current - previous) / previous) * 100;
        return { value: Math.round(change), isPositive: change >= 0 };
      };
      
      // Calculate attendance rate
      let attendanceRate: number | undefined;
      if (attendanceData.data && attendanceData.data.length > 0) {
        const total = attendanceData.data.filter((r: any) => 
          ['present', 'absent', 'late', 'excused'].includes(r.status)
        ).length;
        const attended = attendanceData.data.filter((r: any) => 
          ['present', 'late', 'excused'].includes(r.status)
        ).length;
        attendanceRate = total > 0 ? Math.round((attended / total) * 100) : undefined;
      }
      
      // Calculate completion rate
      let completionRate: number | undefined;
      if (lessonProgressData.data && lessonProgressData.data.length > 0) {
        const total = lessonProgressData.data.length;
        const completed = lessonProgressData.data.filter((r: any) => r.status === 'completed').length;
        completionRate = total > 0 ? Math.round((completed / total) * 100) : undefined;
      }
      
      const activeUsers = activeUsersData.count || 0;
      
      return {
        data: {
          totalStudents,
          totalTeachers,
          totalClasses,
          totalSubjects,
          attendanceRate,
          completionRate,
          activeUsers,
          trends: {
            students: calculateTrend(totalStudents, prevStudents),
            teachers: calculateTrend(totalTeachers, prevTeachers),
            classes: calculateTrend(totalClasses, prevClasses),
            subjects: calculateTrend(totalSubjects, prevSubjects),
          }
        },
        error: null
      };
    } catch (err) {
      return { data: null, error: err };
    }
  });
};

// ✅ NEW: Charts data functions
// جلب بيانات نمو الطلاب (آخر 6 أشهر)
export const getStudentGrowthData = async () => {
  const cacheKey = 'student_growth_chart';
  
  return getCachedData(cacheKey, async () => {
    try {
      const now = new Date();
      const months: { name: string; value: number }[] = [];
      
      // جلب عدد الطلاب لكل شهر من آخر 6 أشهر
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student')
          .lte('created_at', monthEnd.toISOString());
        
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        months.push({
          name: monthNames[monthStart.getMonth()],
          value: count || 0
        });
      }
      
      return { data: months, error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  });
};

// جلب توزيع الفصول حسب المستوى
export const getClassDistributionData = async () => {
  const cacheKey = 'class_distribution_chart';
  
  return getCachedData(cacheKey, async () => {
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('level');
      
      if (error) {
        return { data: [], error };
      }
      
      // تجميع حسب المستوى
      const distribution: Record<number, number> = {};
      (classes || []).forEach((cls: any) => {
        const level = cls.level || 0;
        distribution[level] = (distribution[level] || 0) + 1;
      });
      
      const result = Object.entries(distribution).map(([level, count]) => ({
        name: `الصف ${level}`,
        value: count as number
      }));
      
      return { data: result, error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  });
};

// جلب بيانات الحضور (آخر 4 أسابيع)
export const getAttendanceTrendsData = async () => {
  const cacheKey = 'attendance_trends_chart';
  
  return getCachedData(cacheKey, async () => {
    try {
      const now = new Date();
      const weeks: { name: string; value: number }[] = [];
      
      // جلب معدل الحضور لكل أسبوع من آخر 4 أسابيع
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        
        const { data: attendance } = await supabase
          .from('attendance_records')
          .select('status')
          .gte('attendance_date', weekStart.toISOString().slice(0, 10))
          .lte('attendance_date', weekEnd.toISOString().slice(0, 10));
        
        if (attendance && attendance.length > 0) {
          const total = attendance.filter((r: any) => 
            ['present', 'absent', 'late', 'excused'].includes(r.status)
          ).length;
          const attended = attendance.filter((r: any) => 
            ['present', 'late', 'excused'].includes(r.status)
          ).length;
          const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
          weeks.push({
            name: `الأسبوع ${4 - i}`,
            value: rate
          });
        } else {
          weeks.push({
            name: `الأسبوع ${4 - i}`,
            value: 0
          });
        }
      }
      
      return { data: weeks, error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  });
};

// دالة لمسح الذاكرة المؤقتة يدوياً
export const clearCache = () => {
  queryCache.clear();
};

// دالة لمسح ذاكرة مؤقتة محددة
export const clearCacheKey = (key: string) => {
  queryCache.delete(key);
};
