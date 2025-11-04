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
import { Download, Users, Calendar, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, fetchTeacherClasses, fetchStudentsInClass, fetchAttendanceRangeForClass } from '@/lib/supabase';

export default function AttendanceReportPage() {
  const { profile, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  // ✅ CHANGED: Subject-based attendance report
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [classesForSubject, setClassesForSubject] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0,10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0,10));

  const [students, setStudents] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!profile) { router.push('/login'); return; }
      if (!['teacher','admin','supervisor'].includes(profile.role)) { router.push('/dashboard'); return; }
      loadSubjects().catch(() => {});
    }
  }, [authLoading, profile]);

  // Load classes when subject is selected
  useEffect(() => {
    if (selectedSubjectId) {
      loadClassesForSubject(selectedSubjectId).catch(() => {});
    } else {
      setClassesForSubject([]);
      setSelectedClassId('');
    }
  }, [selectedSubjectId]);

  // Load report when both subject and class are selected
  useEffect(() => {
    if (selectedSubjectId && selectedClassId && fromDate && toDate) {
      loadReport().catch(() => {});
    }
  }, [selectedSubjectId, selectedClassId, fromDate, toDate]);

  // ✅ CHANGED: Load subjects instead of classes
  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true);
      
      let data: any[] = [];
      let error: any = null;
      
      if (profile!.role === 'admin') {
        // Admin gets all subjects
        const result = await supabase
          .from('class_subjects')
          .select('id, subject_name, class_id')
          .order('subject_name', { ascending: true });
        data = result.data || [];
        error = result.error;
      } else {
        // Teachers get their subjects
        const result = await supabase
          .from('class_subjects')
          .select('id, subject_name, class_id')
          .eq('teacher_id', profile!.id)
          .order('subject_name', { ascending: true });
        data = result.data || [];
        error = result.error;
      }
      
      if (error) {
        console.error('Error loading subjects:', error);
        toast.error(language === 'ar' ? 'فشل تحميل المواد' : 'Failed to load subjects');
      }
      
      // Get unique class IDs and fetch class names separately
      if (data && data.length > 0) {
        const classIds = [...new Set(data.map((s: any) => s.class_id))];
        
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, class_name')
          .in('id', classIds);
        
        if (classesError) {
          console.error('Error loading classes:', classesError);
        }
        
        // Create a map of class_id to class_name
        const classMap = new Map(
          (classesData || []).map((c: any) => [c.id, c.class_name])
        );
        
        // Group subjects by name
        const subjectsMap = new Map<string, any>();
        (data || []).forEach((s: any) => {
          const key = s.subject_name;
          if (!subjectsMap.has(key)) {
            subjectsMap.set(key, {
              id: s.id,
              subject_name: s.subject_name,
              classes: []
            });
          }
          subjectsMap.get(key).classes.push({
            class_id: s.class_id,
            class_name: classMap.get(s.class_id) || 'Unknown',
            subject_id: s.id
          });
        });
        
        const subjectsList = Array.from(subjectsMap.values());
        setSubjects(subjectsList);
        
        if (subjectsList.length > 0) {
          const firstSubject = subjectsList[0];
          setSelectedSubjectId(firstSubject.id);
        }
      } else {
        setSubjects([]);
      }
    } catch (err) {
      console.error('Unexpected error loading subjects:', err);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء تحميل المواد' : 'An error occurred while loading subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Load classes for selected subject
  const loadClassesForSubject = async (subjectId: string) => {
    try {
      setLoadingClasses(true);
      
      // Always fetch from database to ensure we have the latest data
      // First, get the subject by ID to get its name
      const { data: subjectDataById, error: errById } = await supabase
        .from('class_subjects')
        .select('id, subject_name, class_id')
        .eq('id', subjectId)
        .limit(1)
        .single();
      
      if (errById || !subjectDataById) {
        console.error('Error loading subject by ID:', errById);
        toast.error(language === 'ar' ? 'فشل تحميل المادة' : 'Failed to load subject');
        return;
      }
      
      // Fetch all classes for this subject name
      const { data: allSubjectData, error: subjectError } = await supabase
        .from('class_subjects')
        .select('id, subject_name, class_id')
        .eq('subject_name', subjectDataById.subject_name)
        .order('class_id');
      
      if (subjectError) {
        console.error('Error loading classes for subject:', subjectError);
        toast.error(language === 'ar' ? 'فشل تحميل الفصول' : 'Failed to load classes');
        return;
      }
      
      if (!allSubjectData || allSubjectData.length === 0) {
        setClassesForSubject([]);
        setSelectedClassId('');
        toast.warning(language === 'ar' ? 'لا توجد فصول لهذه المادة' : 'No classes found for this subject');
        return;
      }
      
      // Get unique class IDs
      const classIds = [...new Set(allSubjectData.map((s: any) => s.class_id))];
      
      // Fetch class names separately
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, class_name')
        .in('id', classIds);
      
      if (classesError) {
        console.error('Error loading classes:', classesError);
        toast.error(language === 'ar' ? 'فشل تحميل أسماء الفصول' : 'Failed to load class names');
      }
      
      // Create a map of class_id to class_name
      const classMap = new Map(
        (classesData || []).map((c: any) => [c.id, c.class_name])
      );
      
      // Map subject data with class names
      const classesList = allSubjectData.map((s: any) => ({
        class_id: s.class_id,
        class_name: classMap.get(s.class_id) || 'Unknown',
        subject_id: s.id
      }));
      
      setClassesForSubject(classesList);
      if (classesList.length > 0) {
        setSelectedClassId(classesList[0].class_id);
      } else {
        setSelectedClassId('');
      }
    } catch (err) {
      console.error('Unexpected error loading classes for subject:', err);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء تحميل الفصول' : 'An error occurred while loading classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  // ✅ CHANGED: Load report for subject and class
  const loadReport = async () => {
    try {
      setLoadingData(true);
      
      // Get the actual subject_id for this class
      const classInfo = classesForSubject.find(c => c.class_id === selectedClassId);
      const actualSubjectId = classInfo?.subject_id || selectedSubjectId;
      
      const { data: studs } = await fetchStudentsInClass(selectedClassId);
      
      // Fetch attendance records for this subject, class, and date range
      // Try with subject_id first, fallback to class_id only if subject_id doesn't exist
      let att: any[] = [];
      let error: any = null;
      
      try {
        const { data: attData, error: attError } = await supabase
          .from('attendance_records')
          .select('student_id, status, attendance_date')
          .eq('subject_id', actualSubjectId)
          .eq('class_id', selectedClassId)
          .gte('attendance_date', fromDate)
          .lte('attendance_date', toDate);
        
        if (attError && (attError.code === 'PGRST116' || attError.message?.includes('subject_id'))) {
          // Column doesn't exist yet, fallback to class-based attendance
          const { data: attDataFallback, error: attErrorFallback } = await supabase
            .from('attendance_records')
            .select('student_id, status, attendance_date')
            .eq('class_id', selectedClassId)
            .gte('attendance_date', fromDate)
            .lte('attendance_date', toDate);
          att = attDataFallback || [];
          error = attErrorFallback;
        } else if (attError) {
          console.warn('Error loading attendance with subject_id:', attError);
          // Fallback to class-based
          const { data: attDataFallback, error: attErrorFallback } = await supabase
            .from('attendance_records')
            .select('student_id, status, attendance_date')
            .eq('class_id', selectedClassId)
            .gte('attendance_date', fromDate)
            .lte('attendance_date', toDate);
          att = attDataFallback || [];
          error = attErrorFallback;
        } else {
          att = attData || [];
        }
      } catch (err: any) {
        console.warn('Error loading attendance, trying fallback:', err);
        // Fallback to class-based attendance
        const { data: attDataFallback, error: attErrorFallback } = await supabase
          .from('attendance_records')
          .select('student_id, status, attendance_date')
          .eq('class_id', selectedClassId)
          .gte('attendance_date', fromDate)
          .lte('attendance_date', toDate);
        att = attDataFallback || [];
        error = attErrorFallback;
      }
      
      if (error) { 
        toast.error(language === 'ar' ? 'فشل تحميل الحضور' : 'Failed to load attendance'); 
        return; 
      }
      
      const studentList = (studs || []) as any[];
      const byStudent: Record<string, any> = {};
      studentList.forEach(s => { 
        byStudent[s.id] = { student: s, present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 }; 
      });
      
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
            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <label className="text-sm block mb-1">{language === 'ar' ? 'المادة' : 'Subject'}</label>
                {loadingSubjects ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر مادة' : 'Select subject'} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {s.subject_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm block mb-1">{language === 'ar' ? 'الفصل' : 'Class'}</label>
                {loadingClasses ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select 
                    value={selectedClassId} 
                    onValueChange={setSelectedClassId}
                    disabled={!selectedSubjectId || classesForSubject.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر فصل' : 'Select class'} />
                    </SelectTrigger>
                    <SelectContent>
                      {classesForSubject.map((c: any) => (
                        <SelectItem key={c.class_id} value={c.class_id}>{c.class_name}</SelectItem>
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
