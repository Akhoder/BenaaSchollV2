'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, fetchTeacherClasses, fetchStudentsInClass, fetchAttendanceForClassDate, saveAttendanceBatch } from '@/lib/supabase';

const STATUS_OPTIONS = [
  { value: 'present', labelAr: 'حاضر', labelEn: 'Present', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'absent', labelAr: 'غائب', labelEn: 'Absent', color: 'bg-red-100 text-red-700' },
  { value: 'late', labelAr: 'متأخر', labelEn: 'Late', color: 'bg-amber-100 text-amber-700' },
  { value: 'excused', labelAr: 'معذور', labelEn: 'Excused', color: 'bg-blue-100 text-blue-700' },
];

export default function AttendancePage() {
  const { profile, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<any[]>([]);
  const [statusByStudent, setStatusByStudent] = useState<Record<string, { status: string; notes?: string }>>({});

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!profile) {
        router.push('/login');
        return;
      }
      if (!['teacher','admin','supervisor'].includes(profile.role)) {
        router.push('/dashboard');
        return;
      }
      loadClasses().catch(() => {});
    }
  }, [authLoading, profile]);

  useEffect(() => {
    if (selectedClassId && dateStr) {
      loadStudentsAndAttendance(selectedClassId, dateStr).catch(() => {});
    }
  }, [selectedClassId, dateStr]);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const ownerId = profile!.id;
      const { data, error } = await fetchTeacherClasses(ownerId);
      if (error) {
        toast.error(language === 'ar' ? 'فشل تحميل الفصول' : 'Failed to load classes');
      }
      setClasses((data || []) as any[]);
      if ((data || []).length > 0) setSelectedClassId((data![0] as any).id);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadStudentsAndAttendance = async (classId: string, date: string) => {
    try {
      setLoadingStudents(true);
      const [{ data: studs }, { data: att }] = await Promise.all([
        fetchStudentsInClass(classId),
        fetchAttendanceForClassDate(classId, date),
      ] as any);
      const map: Record<string, { status: string; notes?: string }> = {};
      (att || []).forEach((r: any) => { map[r.student_id] = { status: r.status, notes: r.notes || '' }; });
      setStudents(studs || []);
      setStatusByStudent(map);
    } catch (e) {
      console.error(e);
      toast.error(language === 'ar' ? 'فشل تحميل الطلاب' : 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const setAllStatus = (status: string) => {
    const next: Record<string, { status: string; notes?: string }> = {};
    students.forEach((s: any) => { next[s.id] = { status }; });
    setStatusByStudent(next);
  };

  const onSave = async () => {
    try {
      if (!selectedClassId) return;
      setSaving(true);
      const rows = students.map((s: any) => ({
        student_id: s.id,
        status: statusByStudent[s.id]?.status || 'present',
        notes: statusByStudent[s.id]?.notes || null,
      }));
      const { error } = await saveAttendanceBatch(selectedClassId, dateStr, rows);
      if (error) {
        console.error(error);
        toast.error(language === 'ar' ? 'فشل الحفظ' : 'Save failed');
        return;
      }
      toast.success(language === 'ar' ? 'تم الحفظ' : 'Saved');
    } catch (e) {
      console.error(e);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><Skeleton className="h-12 w-12" /></div>
      </DashboardLayout>
    );
  }

  if (!profile || !['teacher','admin','supervisor'].includes(profile.role)) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              {language === 'ar' ? 'تسجيل حضور الطلاب' : 'Record Student Attendance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm block mb-1">{language === 'ar' ? 'الفصل' : 'Class'}</label>
                {loadingClasses ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر فصل' : 'Select class'} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm block mb-1">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
                </div>
              </div>
              <div className="flex items-end">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAllStatus('present')}>{language === 'ar' ? 'تعيين الجميع: حاضر' : 'All: Present'}</Button>
                  <Button variant="outline" onClick={() => setAllStatus('absent')}>{language === 'ar' ? 'تعيين الجميع: غائب' : 'All: Absent'}</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'الطلاب' : 'Students'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لا يوجد طلاب' : 'No students found'}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s: any, idx: number) => {
                      const current = statusByStudent[s.id]?.status || 'present';
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{s.full_name || s.email}</TableCell>
                          <TableCell>
                            <Select value={current} onValueChange={(v) => setStatusByStudent(prev => ({ ...prev, [s.id]: { ...(prev[s.id] || {}), status: v } }))}>
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <span className={`px-2 py-0.5 rounded ${opt.color}`}>{language === 'ar' ? opt.labelAr : opt.labelEn}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder={language === 'ar' ? 'ملاحظة (اختياري)' : 'Notes (optional)'}
                              value={statusByStudent[s.id]?.notes || ''}
                              onChange={(e) => setStatusByStudent(prev => ({ ...prev, [s.id]: { ...(prev[s.id] || { status: current }), notes: e.target.value } }))}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button onClick={onSave} disabled={saving || !selectedClassId}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
