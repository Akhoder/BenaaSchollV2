'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getErrorMessage } from '@/lib/errorHandler';
import { TranslationKey } from '@/lib/translations';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingInline } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Save, Users, BookOpen, Filter, CheckCircle, X, Clock, AlertCircle, School, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, fetchStudentsInClass } from '@/lib/supabase';

interface AttendanceStatus {
  status: string;
  notes?: string;
}

interface StatusOption {
  value: string;
  labelKey: TranslationKey;
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'present', labelKey: 'present' as TranslationKey, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'absent', labelKey: 'absent' as TranslationKey, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'late', labelKey: 'late' as TranslationKey, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'excused', labelKey: 'excused' as TranslationKey, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
];

export default function AttendancePage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [classesForSubject, setClassesForSubject] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<any[]>([]);
  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttendanceStatus>>({});

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auth check and load subjects
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

  // Load classes when subject is selected
  useEffect(() => {
    if (selectedSubjectId) {
      loadClassesForSubject(selectedSubjectId).catch(() => {});
    } else {
      setClassesForSubject([]);
      setSelectedClassId('');
    }
  }, [selectedSubjectId]);

  // Load students when both subject and class are selected
  useEffect(() => {
    if (selectedSubjectId && selectedClassId && dateStr) {
      loadStudentsAndAttendance(selectedSubjectId, selectedClassId, dateStr).catch(() => {});
    } else {
      setStudents([]);
      setStatusByStudent({});
    }
  }, [selectedSubjectId, selectedClassId, dateStr]);

  // Load subjects
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
      
      // Get unique class IDs and fetch class names
      const classIds = [...new Set(data.map((s: any) => s.class_id).filter(Boolean))];
      
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, class_name')
        .in('id', classIds);
      
      const classMap = new Map(
        (classesData || []).map((c: any) => [c.id, c.class_name])
      );
      
      // Group subjects by name
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

  // Load classes for selected subject
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
      setSelectedClassId(classesList.length > 0 ? classesList[0].class_id : '');
    } catch (err) {
      console.error('Unexpected error loading classes for subject:', err);
      toast.error(t('errorLoadingClasses'));
    } finally {
      setLoadingClasses(false);
    }
  }, [t]);

  // Load students and attendance
  const loadStudentsAndAttendance = useCallback(async (subjectId: string, classId: string, date: string) => {
    try {
      setLoadingStudents(true);
      
      const classInfo = classesForSubject.find(c => c.class_id === classId);
      const actualSubjectId = classInfo?.subject_id || subjectId;
      
      const { data: studs } = await fetchStudentsInClass(classId);
      
      // Fetch attendance records
      let att: any[] = [];
      try {
        const { data: attData, error: attError } = await supabase
          .from('attendance_records')
          .select('student_id, status, notes')
          .eq('subject_id', actualSubjectId)
          .eq('class_id', classId)
          .eq('attendance_date', date);
        
        if (attError && attError.code === 'PGRST116') {
          // Fallback to class-based attendance
          const { data: attDataFallback } = await supabase
            .from('attendance_records')
            .select('student_id, status, notes')
            .eq('class_id', classId)
            .eq('attendance_date', date);
          att = attDataFallback || [];
        } else if (attError) {
          // Fallback to class-based
          const { data: attDataFallback } = await supabase
            .from('attendance_records')
            .select('student_id, status, notes')
            .eq('class_id', classId)
            .eq('attendance_date', date);
          att = attDataFallback || [];
        } else {
          att = attData || [];
        }
      } catch (err: any) {
        // Fallback to class-based attendance
        const { data: attDataFallback } = await supabase
          .from('attendance_records')
          .select('student_id, status, notes')
          .eq('class_id', classId)
          .eq('attendance_date', date);
        att = attDataFallback || [];
      }
      
      const map: Record<string, AttendanceStatus> = {};
      att.forEach((r: any) => { 
        map[r.student_id] = { status: r.status, notes: r.notes || '' }; 
      });
      
      setStudents(studs || []);
      setStatusByStudent(map);
    } catch (e) {
      console.error(e);
      toast.error(t('failedToLoadStudents'));
    } finally {
      setLoadingStudents(false);
    }
  }, [classesForSubject, t]);

  // Handlers
  const setAllStatus = useCallback((status: string) => {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s: any) => { 
      next[s.id] = { status }; 
    });
    setStatusByStudent(next);
  }, [students]);

  const updateStudentStatus = useCallback((studentId: string, status: string) => {
    setStatusByStudent(prev => ({ 
      ...prev, 
      [studentId]: { ...(prev[studentId] || {}), status } 
    }));
  }, []);

  const updateStudentNotes = useCallback((studentId: string, notes: string, currentStatus: string) => {
    setStatusByStudent(prev => ({ 
      ...prev, 
      [studentId]: { ...(prev[studentId] || { status: currentStatus }), notes } 
    }));
  }, []);

  // Stats
  const stats = useMemo(() => {
    const presentCount = Object.values(statusByStudent).filter(s => s.status === 'present').length;
    const absentCount = Object.values(statusByStudent).filter(s => s.status === 'absent').length;
    const lateCount = Object.values(statusByStudent).filter(s => s.status === 'late').length;
    const excusedCount = Object.values(statusByStudent).filter(s => s.status === 'excused').length;
    return {
      total: students.length,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      excused: excusedCount,
    };
  }, [students.length, statusByStudent]);

  // Save attendance
  const onSave = useCallback(async () => {
    try {
      if (!selectedSubjectId || !selectedClassId) return;
      setSaving(true);
      
      const classInfo = classesForSubject.find(c => c.class_id === selectedClassId);
      const studentIds = students.map((s: any) => s.id);
      
      if (studentIds.length > 0) {
        const { error: delErr } = await supabase
          .from('attendance_records')
          .delete()
          .eq('class_id', selectedClassId)
          .eq('attendance_date', dateStr)
          .in('student_id', studentIds);
        
        if (delErr) {
          console.error('Error deleting existing records:', delErr);
          toast.error(t('saveFailed'));
          return;
        }
      }
      
      const rows = students.map((s: any) => ({
        student_id: s.id,
        class_id: selectedClassId,
        attendance_date: dateStr,
        status: statusByStudent[s.id]?.status || 'present',
        notes: statusByStudent[s.id]?.notes || null,
      }));
      
      const { error } = await supabase
        .from('attendance_records')
        .insert(rows)
        .select('*');
      
      if (error) {
        console.error(error);
        toast.error(t('saveFailed'));
        return;
      }
      
      toast.success(t('saved'));
    } catch (e) {
      console.error(e);
      toast.error(t('errorOccurred'));
    } finally {
      setSaving(false);
    }
  }, [selectedSubjectId, selectedClassId, dateStr, students, statusByStudent, classesForSubject, t]);

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
          icon={Users}
          title={t('recordStudentAttendance')}
          description={t('attendance')}
        />

        {/* Stats Cards */}
        {students.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 animate-fade-in-up">
            <Card className="card-hover glass-strong">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('totalStudents')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-primary">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="card-hover glass-strong">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('present')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-emerald-600">{stats.present}</div>
              </CardContent>
            </Card>
            <Card className="card-hover glass-strong">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <X className="h-4 w-4" />
                  {t('absent')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-red-600">{stats.absent}</div>
              </CardContent>
            </Card>
            <Card className="card-hover glass-strong">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('late')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-amber-600">{stats.late}</div>
              </CardContent>
            </Card>
            <Card className="card-hover glass-strong">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {t('excused')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-blue-600">{stats.excused}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="card-hover glass-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Filter className="h-5 w-5 text-slate-500" />
              {t('filtersAndSearch')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
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
                  {t('date')}
                </label>
                <Input 
                  type="date" 
                  value={dateStr} 
                  onChange={(e) => setDateStr(e.target.value)} 
                  className="input-modern h-11" 
                />
              </div>
            </div>
            {students.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    onClick={() => setAllStatus('present')}
                    className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('allPresent')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setAllStatus('absent')}
                    className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('allAbsent')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setAllStatus('late')}
                    className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {t('allLate')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setAllStatus('excused')}
                    className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {t('allExcused')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card className="card-hover glass-strong animate-fade-in-up delay-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {t('students')} ({students.length})
              </CardTitle>
              {students.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    {stats.present}
                  </span>
                  <span className="flex items-center gap-1">
                    <X className="h-4 w-4 text-red-600" />
                    {stats.absent}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-amber-600" />
                    {stats.late}
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    {stats.excused}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="py-8">
                <LoadingInline 
                  text={t('loadingStudents')}
                  size="default"
                />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <Users className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">
                  {t('noStudentsFound')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {t('noStudentsEnrolled')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="font-semibold w-12">#</TableHead>
                      <TableHead className="font-semibold">{t('name')}</TableHead>
                      <TableHead className="font-semibold w-48">{t('status')}</TableHead>
                      <TableHead className="font-semibold">{t('notes')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s: any, idx: number) => {
                      const current = statusByStudent[s.id]?.status || 'present';
                      const statusOption = STATUS_OPTIONS.find(opt => opt.value === current);
                      return (
                        <TableRow 
                          key={s.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold font-sans">
                              {s.full_name || s.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={current} 
                              onValueChange={(v) => updateStudentStatus(s.id, v)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue>
                                  <span className={`px-2 py-1 rounded-md text-sm font-medium ${statusOption?.color || ''}`}>
                                    {t(current as 'present' | 'absent' | 'late' | 'excused')}
                                  </span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      {opt.value === 'present' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                                      {opt.value === 'absent' && <X className="h-4 w-4 text-red-600" />}
                                      {opt.value === 'late' && <Clock className="h-4 w-4 text-amber-600" />}
                                      {opt.value === 'excused' && <AlertCircle className="h-4 w-4 text-blue-600" />}
                                      <span className={`px-2 py-0.5 rounded text-sm font-medium ${opt.color}`}>
                                        {t(opt.labelKey)}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder={t('notesOptional')}
                              value={statusByStudent[s.id]?.notes || ''}
                              onChange={(e) => updateStudentNotes(s.id, e.target.value, current)}
                              className="input-modern"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {students.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('totalStudents')}: <strong className="text-slate-900 dark:text-slate-100">{stats.total}</strong>
                </div>
                <Button 
                  onClick={onSave} 
                  disabled={saving || !selectedSubjectId || !selectedClassId}
                  size="lg"
                  className="min-w-[140px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('save')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

