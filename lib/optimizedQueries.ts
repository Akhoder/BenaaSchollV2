// تحسين استعلامات قاعدة البيانات للأداء
import { supabase } from '@/lib/supabase';

// ذاكرة تخزين مؤقت بسيطة للاستعلامات
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

// دالة مساعدة لتنظيف الذاكرة المؤقتة
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      queryCache.delete(key);
    }
  }
};

// دالة مساعدة للحصول على البيانات من الذاكرة المؤقتة أو قاعدة البيانات
export const getCachedData = async <T>(
  cacheKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  useCache: boolean = true
): Promise<{ data: T | null; error: any }> => {
  // تنظيف الذاكرة المؤقتة
  cleanupCache();

  // التحقق من الذاكرة المؤقتة
  if (useCache && queryCache.has(cacheKey)) {
    const cached = queryCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return { data: cached.data, error: null };
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

  return result;
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

// استعلامات محسنة للإحصائيات
export const getStatsOptimized = async () => {
  const cacheKey = 'dashboard_stats';
  
  return getCachedData(cacheKey, async () => {
    try {
      // استخدام Promise.all لتنفيذ جميع الاستعلامات بشكل متوازي
      const [studentsResult, teachersResult, classesResult, subjectsResult] = await Promise.all([
        supabase.rpc('get_total_students'),
        supabase.rpc('get_total_teachers'),
        supabase.from('classes').select('id', { count: 'exact' }),
        supabase.from('subjects').select('id', { count: 'exact' })
      ]);
      
      return {
        data: {
          totalStudents: studentsResult.data || 0,
          totalTeachers: teachersResult.data || 0,
          totalClasses: classesResult.count || 0,
          totalSubjects: subjectsResult.count || 0,
        },
        error: null
      };
    } catch (err) {
      return { data: null, error: err };
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
