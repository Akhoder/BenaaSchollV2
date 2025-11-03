'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { fetchTeacherClasses, fetchStudentsInClass, fetchAttendanceRangeForClass } from '@/lib/supabase';

export default function AttendanceReportPage() {
  const { profile, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0,10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0,10));

  const [students, setStudents] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!profile) { router.push('/login'); return; }
      if (!['teacher','admin','supervisor'].includes(profile.role)) { router.push('/dashboard'); return; }
      loadClasses().catch(() => {});
    }
  }, [authLoading, profile]);

  useEffect(() => {
    if (selectedClassId && fromDate && toDate) {
      loadReport().catch(() => {});
    }
  }, [selectedClassId, fromDate, toDate]);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const { data, error } = await fetchTeacherClasses(profile!.id);
      if (error) toast.error(language === 'ar' ? 'فشل تحميل الفصول' : 'Failed to load classes');
      setClasses((data || []) as any[]);
      if ((data || []).length > 0) setSelectedClassId((data![0] as any).id);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadReport = async () => {
    try {
      setLoadingData(true);
      const [{ data: studs }, { data: att, error }] = await Promise.all([
        fetchStudentsInClass(selectedClassId),
        fetchAttendanceRangeForClass(selectedClassId, fromDate, toDate),
      ] as any);
      if (error) { toast.error('Failed to load attendance'); return; }
      const studentList = (studs || []) as any[];
      const byStudent: Record<string, any> = {};
      studentList.forEach(s => { byStudent[s.id] = { student: s, present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 }; });
      (att || []).forEach((r: any) => {
        const row = byStudent[r.student_id];
        if (!row) return; 
        row.total += 1;
        if (r.status === 'present') row.present += 1;
        if (r.status === 'absent') row.absent += 1;
        if (r.status === 'late') row.late += 1;
        if (r.status === 'excused') row.excused += 1;
      });
      Object.values(byStudent).forEach((row: any) => {
        const attended = row.present + row.late + row.excused;
        row.rate = row.total > 0 ? Math.round((attended / row.total) * 100) : 0;
      });
      setStudents(studentList);
      setRows(Object.values(byStudent));
    } catch (e) {
      console.error(e);
      toast.error(language === 'ar' ? 'خطأ في تحميل التقرير' : 'Failed to load report');
    } finally {
      setLoadingData(false);
    }
  };

  const exportCSV = () => {
    const header = ['Name','Present','Absent','Late','Excused','Total','Rate%'];
    const lines = rows.map((r: any) => [
      JSON.stringify(r.student.full_name || r.student.email || ''),
      r.present, r.absent, r.late, r.excused, r.total, r.rate
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedClassId}_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><Skeleton className="h-12 w-12" /></div>
      </DashboardLayout>
    );
  }
  if (!profile || !['teacher','admin','supervisor'].includes(profile.role)) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              {language === 'ar' ? 'تقرير الحضور' : 'Attendance Report'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
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
                <label className="text-sm block mb-1">{language === 'ar' ? 'من تاريخ' : 'From'}</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm block mb-1">{language === 'ar' ? 'إلى تاريخ' : 'To'}</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={exportCSV} disabled={rows.length === 0}>
                  <Download className="h-4 w-4 mr-2" /> CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'الملخص' : 'Summary'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لا يوجد بيانات' : 'No data'}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{language === 'ar' ? 'الطالب' : 'Student'}</TableHead>
                      <TableHead>{language === 'ar' ? 'حاضر' : 'Present'}</TableHead>
                      <TableHead>{language === 'ar' ? 'غائب' : 'Absent'}</TableHead>
                      <TableHead>{language === 'ar' ? 'متأخر' : 'Late'}</TableHead>
                      <TableHead>{language === 'ar' ? 'معذور' : 'Excused'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النسبة' : 'Rate'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r: any, i: number) => (
                      <TableRow key={r.student.id}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.student.full_name || r.student.email}</TableCell>
                        <TableCell>{r.present}</TableCell>
                        <TableCell>{r.absent}</TableCell>
                        <TableCell>{r.late}</TableCell>
                        <TableCell>{r.excused}</TableCell>
                        <TableCell>{r.total}</TableCell>
                        <TableCell>{r.rate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
