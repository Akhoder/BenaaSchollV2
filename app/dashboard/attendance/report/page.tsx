'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingInline } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Users, Calendar, BookOpen, School, FileText, TrendingUp, CheckCircle, X, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, fetchStudentsInClass } from '@/lib/supabase';

export default function AttendanceReportPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [classesForSubject, setClassesForSubject] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(); 
    d.setDate(d.getDate() - 30); 
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [students, setStudents] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!profile) { 
        router.push('/login'); 
        return; 
      }
      if (!['teacher', 'admin', 'supervisor'].includes(profile.role)) { 
        router.push('/dashboard'); 
        return; 
      }
      loadSubjects().catch(() => {});
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (selectedSubjectId) {
      loadClassesForSubject(selectedSubjectId).catch(() => {});
    } else {
      setClassesForSubject([]);
      setSelectedClassId('');
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    if (selectedSubjectId && selectedClassId && fromDate && toDate) {
      loadReport().catch(() => {});
    }
  }, [selectedSubjectId, selectedClassId, fromDate, toDate]);

  const loadSubjects = useCallback(async () => {
    try {
      setLoadingSubjects(true);
      
      const isAdmin = profile!.role === 'admin';
      const query = supabase
        .from('class_subjects')
        .select('id, subject_name, class_id')
        .order('subject_name', { ascending: true });
      
      if (!isAdmin) {
        query.eq('teacher_id', profile!.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading subjects:', error);
        toast.error(t('failedToLoadSubjects'));
        return;
      }
      
      if (!data || data.length === 0) {
        setSubjects([]);
        return;
      }
      
      const classIds = [...new Set(data.map((s: any) => s.class_id).filter(Boolean))];
      
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, class_name')
        .in('id', classIds);
      
      const classMap = new Map(
        (classesData || []).map((c: any) => [c.id, c.class_name])
      );
      
      const subjectsMap = new Map<string, any>();
      data.forEach((s: any) => {
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
        setSelectedSubjectId(subjectsList[0].id);
      }
    } catch (err) {
      console.error('Unexpected error loading subjects:', err);
      toast.error(t('errorLoadingSubjects'));
    } finally {
      setLoadingSubjects(false);
    }
  }, [profile, t]);

  const loadClassesForSubject = useCallback(async (subjectId: string) => {
    try {
      setLoadingClasses(true);
      
      const { data: subjectDataById, error: errById } = await supabase
        .from('class_subjects')
        .select('id, subject_name, class_id')
        .eq('id', subjectId)
        .limit(1)
        .single();
      
      if (errById || !subjectDataById) {
        console.error('Error loading subject by ID:', errById);
        toast.error(t('failedToLoadSubject'));
        return;
      }
      
      const { data: allSubjectData, error: subjectError } = await supabase
        .from('class_subjects')
        .select('id, subject_name, class_id')
        .eq('subject_name', subjectDataById.subject_name)
        .order('class_id');
      
      if (subjectError) {
        console.error('Error loading classes for subject:', subjectError);
        toast.error(t('failedToLoadClasses'));
        return;
      }
      
      if (!allSubjectData || allSubjectData.length === 0) {
        setClassesForSubject([]);
        setSelectedClassId('');
        toast.warning(t('noClassesForSubject'));
        return;
      }
      
      const classIds = [...new Set(allSubjectData.map((s: any) => s.class_id).filter(Boolean))];
      
      if (classIds.length === 0) {
        setClassesForSubject([]);
        setSelectedClassId('');
        toast.warning(t('noValidClassesForSubject'));
        return;
      }
      
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, class_name')
        .in('id', classIds);
      
      if (classesError) {
        console.error('Error loading classes:', classesError);
        toast.error(t('failedToLoadClassNames'));
      }
      
      const classMap = new Map<string, string>();
      if (classesData) {
        classesData.forEach((c: any) => {
          if (c.id && c.class_name) {
            classMap.set(c.id, c.class_name);
          }
        });
      }
      
      const classesList = allSubjectData.map((s: any) => ({
        class_id: s.class_id,
        class_name: classMap.get(s.class_id) || `Class ${s.class_id.slice(0, 8)}...`,
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
      toast.error(t('errorLoadingClasses'));
    } finally {
      setLoadingClasses(false);
    }
  }, [t]);

  const loadReport = useCallback(async () => {
    try {
      setLoadingData(true);
      
      const classInfo = classesForSubject.find(c => c.class_id === selectedClassId);
      const actualSubjectId = classInfo?.subject_id || selectedSubjectId;
      
      const { data: studs } = await fetchStudentsInClass(selectedClassId);
      
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
        toast.error(t('failedToLoadStudents')); 
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
      toast.error(t('errorOccurred'));
    } finally {
      setLoadingData(false);
    }
  }, [selectedSubjectId, selectedClassId, fromDate, toDate, classesForSubject, t]);

  const exportCSV = useCallback(() => {
    const header = [t('name'), t('present'), t('absent'), t('late'), t('excused'), t('total'), t('rate') + '%'];
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
    toast.success(t('exported'));
  }, [rows, selectedClassId, fromDate, toDate, t]);

  const summaryStats = useMemo(() => {
    const total = rows.length;
    const totalPresent = rows.reduce((sum, r: any) => sum + r.present, 0);
    const totalAbsent = rows.reduce((sum, r: any) => sum + r.absent, 0);
    const totalLate = rows.reduce((sum, r: any) => sum + r.late, 0);
    const totalExcused = rows.reduce((sum, r: any) => sum + r.excused, 0);
    const totalDays = rows.reduce((sum, r: any) => sum + r.total, 0);
    const avgRate = total > 0 ? Math.round(rows.reduce((sum, r: any) => sum + r.rate, 0) / total) : 0;
    
    return {
      total,
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
      totalDays,
      avgRate
    };
  }, [rows]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Skeleton className="h-12 w-12" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !['teacher', 'admin', 'supervisor'].includes(profile.role)) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          icon={FileText}
          title={t('attendanceReport')}
          description={t('attendanceReportDescription')}
        />

        {/* Filters */}
        <Card className="card-hover glass-strong">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-500" />
              {t('filtersAndSearch')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  {t('subjectLabel')}
                </label>
                {loadingSubjects ? (
                  <Skeleton className="h-11 w-full" />
                ) : (
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t('selectSubject')} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            {s.subject_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-2 flex items-center gap-2">
                  <School className="h-4 w-4 text-purple-600" />
                  {t('class')}
                </label>
                {loadingClasses ? (
                  <Skeleton className="h-11 w-full" />
                ) : (
                  <Select 
                    value={selectedClassId} 
                    onValueChange={setSelectedClassId}
                    disabled={!selectedSubjectId || classesForSubject.length === 0}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t('selectClass')} />
                    </SelectTrigger>
                    <SelectContent>
                      {classesForSubject.map((c: any) => (
                        <SelectItem key={c.class_id} value={c.class_id}>
                          {c.class_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  {t('fromDate')}
                </label>
                <Input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)} 
                  className="input-modern h-11" 
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  {t('toDate')}
                </label>
                <Input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)} 
                  className="input-modern h-11" 
                />
              </div>
            </div>
            {rows.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <Button 
                  onClick={exportCSV} 
                  disabled={rows.length === 0}
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('exportCSV')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {rows.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
            <Card className="card-hover glass-strong">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('totalStudents')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-primary">{summaryStats.total}</div>
              </CardContent>
            </Card>
            <Card className="card-hover glass-strong">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('totalPresent')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-emerald-600">{summaryStats.totalPresent}</div>
              </CardContent>
            </Card>
            <Card className="card-hover glass-strong">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <X className="h-4 w-4" />
                  {t('totalAbsent')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-red-600">{summaryStats.totalAbsent}</div>
              </CardContent>
            </Card>
            <Card className="card-hover glass-strong">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t('averageRate')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-blue-600">{summaryStats.avgRate}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report Table */}
        <Card className="card-hover glass-strong animate-fade-in-up delay-200">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {t('summary')} ({rows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="py-8">
                <LoadingInline 
                  text={t('loading')}
                  size="default"
                />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <FileText className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                  {t('noData')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {t('noAttendanceData')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="font-semibold w-12">#</TableHead>
                      <TableHead className="font-semibold">{t('name')}</TableHead>
                      <TableHead className="font-semibold text-center">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          {t('present')}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-center">
                        <div className="flex items-center justify-center gap-1">
                          <X className="h-4 w-4 text-red-600" />
                          {t('absent')}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-4 w-4 text-amber-600" />
                          {t('late')}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          {t('excused')}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-center">{t('total')}</TableHead>
                      <TableHead className="font-semibold text-center">{t('rate')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r: any, i: number) => (
                      <TableRow 
                        key={r.student.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-semibold font-sans">
                          {r.student.full_name || r.student.email}
                        </TableCell>
                        <TableCell className="text-center text-emerald-600 font-semibold">
                          {r.present}
                        </TableCell>
                        <TableCell className="text-center text-red-600 font-semibold">
                          {r.absent}
                        </TableCell>
                        <TableCell className="text-center text-amber-600 font-semibold">
                          {r.late}
                        </TableCell>
                        <TableCell className="text-center text-blue-600 font-semibold">
                          {r.excused}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {r.total}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-md text-sm font-semibold ${
                            r.rate >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                            r.rate >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {r.rate}%
                          </span>
                        </TableCell>
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

