'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { EnhancedTable } from '@/components/EnhancedTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Layers,
  School,
  Users,
  BookOpen,
  Plus,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ClassItem {
  id: string;
  name: string;
  grade: string;
  students: number;
  subjects: number;
  academicYear: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function ClassesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [className, setClassName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (authLoading === false && profile && !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
    if (profile && ['admin', 'teacher', 'supervisor'].includes(profile.role)) {
      fetchClasses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, authLoading]);

  const fetchClasses = async () => {
    try {
      setLoading(true);

      let query = supabase.from('classes').select('*');

      if (profile?.role === 'teacher') {
        query = query.eq('teacher_id', profile.id);
      } else if (profile?.role === 'supervisor') {
        query = query.eq('supervisor_id', profile.id);
      }

      const { data: classesData, error: classesError } = await query.order('created_at', { ascending: false });
      if (classesError) {
        setClasses([]);
        setLoading(false);
        return;
      }

      const classIds = (classesData || []).map(c => c.id);

      let enrollCounts: Record<string, number> = {};
      if (classIds.length > 0) {
        const { data: perClass, error: perClassError } = await supabase
          .from('student_enrollments')
          .select('class_id')
          .in('class_id', classIds);
        if (!perClassError && perClass) {
          enrollCounts = perClass.reduce((acc: Record<string, number>, row: any) => {
            acc[row.class_id] = (acc[row.class_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

      let subjectCounts: Record<string, number> = {};
      if (classIds.length > 0) {
        const { data: classSubjects, error: csError } = await supabase
          .from('class_subjects')
          .select('class_id')
          .in('class_id', classIds);
        if (!csError && classSubjects) {
          subjectCounts = classSubjects.reduce((acc: Record<string, number>, row: any) => {
            acc[row.class_id] = (acc[row.class_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

      const mapped: ClassItem[] = (classesData || []).map((c: any) => {
        const students = enrollCounts[c.id] || 0;
        const subjects = subjectCounts[c.id] || 0;
        const status: 'active' | 'inactive' = students > 0 ? 'active' : 'inactive';
        const grade = c.grade_level != null ? `Grade ${String(c.grade_level)}` : '-';
        return {
          id: c.id,
          name: c.name,
          grade,
          students,
          subjects,
          academicYear: c.academic_year || null,
          status,
          created_at: c.created_at,
        };
      });

      setClasses(mapped);
    } catch (e) {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setClassName('');
    setGradeLevel('');
    setAcademicYear('');
  };

  const handleCreate = async () => {
    if (!className || !gradeLevel) {
      toast.error('الرجاء إدخال اسم الفصل والمرحلة');
      return;
    }

    try {
      setCreateLoading(true);

      const insertPayload: any = {
        name: className,
        grade_level: Number(gradeLevel),
        academic_year: academicYear || null,
      };

      if (profile?.role === 'teacher') {
        insertPayload.teacher_id = profile.id;
      }
      if (profile?.role === 'supervisor') {
        insertPayload.supervisor_id = profile.id;
      }

      const { error } = await supabase.from('classes').insert(insertPayload);
      if (error) {
        toast.error('تعذر إنشاء الفصل');
      } else {
        toast.success('تم إنشاء الفصل بنجاح');
        setIsCreateOpen(false);
        resetCreateForm();
        await fetchClasses();
      }
    } catch (e) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setCreateLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-sans">Loading classes...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !['admin', 'teacher', 'supervisor'].includes(profile.role)) {
    return null;
  }

  const columns = [
    { key: 'name', label: 'الفصل', sortable: true },
    { key: 'grade', label: 'المرحلة', sortable: true },
    { key: 'students', label: 'الطلاب', sortable: true },
    { key: 'subjects', label: 'المواد', sortable: true },
    { key: 'academicYear', label: 'السنة الدراسية', sortable: true },
    {
      key: 'status',
      label: 'الحالة',
      sortable: true,
      render: (value: ClassItem['status']) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {value === 'active' ? 'نشط' : 'غير نشط'}
        </Badge>
      )
    },
  ] as const;

  const stats = {
    total: classes.length,
    active: classes.filter(c => c.status === 'active').length,
    inactive: classes.filter(c => c.status === 'inactive').length,
    students: classes.reduce((sum, c) => sum + c.students, 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl">
                <Layers className="h-6 w-6 text-white" />
              </div>
              {t('classes')} Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 font-sans">
              Create, organize, and manage all classes
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="btn-gradient" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              إنشاء فصل جديد
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="card-hover border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                إجمالي الفصول
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg">
                <School className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.total}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Total classes</p>
            </CardContent>
          </Card>

          <Card className="card-hover border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                فصول نشطة
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.active}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Active</p>
            </CardContent>
          </Card>

          <Card className="card-hover border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                فصول غير نشطة
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-amber-600">{stats.inactive}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Inactive</p>
            </CardContent>
          </Card>

          <Card className="card-hover border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-sans">
                إجمالي الطلاب
              </CardTitle>
              <div className="p-2 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-sky-600">{stats.students}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">Students across classes</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="card-hover border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-3">
            <Button className="w-full btn-gradient" onClick={() => setIsCreateOpen(true)}>إضافة فصل</Button>
            <Button variant="outline" className="w-full">إسناد معلم</Button>
            <Button variant="outline" className="w-full">توليد جدول</Button>
          </CardContent>
        </Card>

        {/* Classes Table */}
        <EnhancedTable<ClassItem>
          data={classes}
          columns={columns as any}
          title="قائمة الفصول"
          searchable
          filterable
          exportable
          pageSize={5}
        />
      </div>

      {/* Create Class Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">إنشاء فصل جديد</DialogTitle>
            <DialogDescription className="font-sans">أدخل تفاصيل الفصل ثم اضغط إنشاء</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium font-sans">اسم الفصل</label>
              <Input value={className} onChange={(e) => setClassName(e.target.value)} className="mt-1" placeholder="مثال: الصف الأول - أ" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium font-sans">المرحلة</label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SelectItem key={i+1} value={String(i + 1)}>Grade {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium font-sans">السنة الدراسية</label>
                <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="mt-1" placeholder="مثال: 2025-2026" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="font-sans">إلغاء</Button>
            <Button onClick={handleCreate} disabled={createLoading} className="btn-gradient">
              {createLoading ? 'جاري الإنشاء...' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
