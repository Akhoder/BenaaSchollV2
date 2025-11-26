'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getErrorMessage } from '@/lib/errorHandler';
import { TranslationKey } from '@/lib/translations';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { LoadingInline, SimplePageLoading } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
        <SimplePageLoading text={t('loading')} />
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

        {/* ✨ Stats Cards - Islamic Design */}
        {students.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 animate-fade-in-up">
            {/* Total Students */}
            <Card className="glass-card-hover border-primary/10 hover:border-primary/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('totalStudents')}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary font-display">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('students')}</p>
              </CardContent>
            </Card>

            {/* Present */}
            <Card className="glass-card-hover border-primary/10 hover:border-success/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('present')}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-success to-primary rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success font-display">{stats.present}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? `${Math.round((stats.present / stats.total) * 100)}%` : '0%'}
                </p>
              </CardContent>
            </Card>

            {/* Absent */}
            <Card className="glass-card-hover border-primary/10 hover:border-error/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('absent')}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-error to-error/80 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <X className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-error font-display">{stats.absent}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? `${Math.round((stats.absent / stats.total) * 100)}%` : '0%'}
                </p>
              </CardContent>
            </Card>

            {/* Late */}
            <Card className="glass-card-hover border-primary/10 hover:border-warning/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('late')}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-warning to-warning/80 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning font-display">{stats.late}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? `${Math.round((stats.late / stats.total) * 100)}%` : '0%'}
                </p>
              </CardContent>
            </Card>

            {/* Excused */}
            <Card className="glass-card-hover border-primary/10 hover:border-info/30 transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {t('excused')}
                </CardTitle>
                <div className="p-2.5 bg-gradient-to-br from-info to-primary rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-info font-display">{stats.excused}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? `${Math.round((stats.excused / stats.total) * 100)}%` : '0%'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ✨ Filters Card - Islamic Design */}
        <Card className="glass-card border-primary/10">
          <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
            <CardTitle className="flex items-center gap-3 text-primary">
              <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                <Filter className="h-5 w-5 text-white" />
              </div>
              {t('filtersAndSearch')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-2 flex items-center gap-2 text-foreground">
                  <BookOpen className="h-4 w-4 text-accent" />
                  {t('subjectLabel')}
                </label>
                {loadingSubjects ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger className="h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                      <SelectValue placeholder={t('selectSubject')} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-accent" />
                            {s.subject_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-2 flex items-center gap-2 text-foreground">
                  <School className="h-4 w-4 text-info" />
                  {t('class')}
                </label>
                {loadingClasses ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <Select 
                    value={selectedClassId} 
                    onValueChange={setSelectedClassId}
                    disabled={!selectedSubjectId || classesForSubject.length === 0}
                  >
                    <SelectTrigger className="h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                      <SelectValue placeholder={t('selectClass')} />
                    </SelectTrigger>
                    <SelectContent>
                      {classesForSubject.map((c: any) => (
                        <SelectItem key={c.class_id} value={c.class_id}>
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4 text-info" />
                            {c.class_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-2 flex items-center gap-2 text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  {t('date')}
                </label>
                <Input 
                  type="date" 
                  value={dateStr} 
                  onChange={(e) => setDateStr(e.target.value)} 
                  className="h-12 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm" 
                />
              </div>
            </div>

            {/* ✨ Bulk Actions - Islamic Design */}
            {students.length > 0 && (
              <div className="mt-6 pt-6 border-t border-primary/10">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  {t('quickActions')}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button 
                    variant="outline" 
                    onClick={() => setAllStatus('present')}
                    className="border-success/30 bg-success/5 hover:bg-success/10 text-success hover:text-success hover:border-success/50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('allPresent')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setAllStatus('absent')}
                    className="border-error/30 bg-error/5 hover:bg-error/10 text-error hover:text-error hover:border-error/50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('allAbsent')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setAllStatus('late')}
                    className="border-warning/30 bg-warning/5 hover:bg-warning/10 text-warning hover:text-warning hover:border-warning/50"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {t('allLate')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setAllStatus('excused')}
                    className="border-info/30 bg-info/5 hover:bg-info/10 text-info hover:text-info hover:border-info/50"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {t('allExcused')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ✨ Students Table - Islamic Design */}
        <Card className="glass-card border-primary/10 overflow-hidden animate-fade-in-up delay-200">
          <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <span className="text-primary font-display">{t('students')} ({students.length})</span>
              </CardTitle>
              {students.length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="success" className="gap-1.5">
                    <CheckCircle className="h-3 w-3" />
                    {stats.present}
                  </Badge>
                  <Badge variant="destructive" className="gap-1.5">
                    <X className="h-3 w-3" />
                    {stats.absent}
                  </Badge>
                  <Badge variant="warning" className="gap-1.5">
                    <Clock className="h-3 w-3" />
                    {stats.late}
                  </Badge>
                  <Badge variant="info" className="gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    {stats.excused}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingStudents ? (
              <div className="py-8">
                <LoadingInline 
                  text={t('loadingStudents')}
                  size="default"
                />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-16 px-4 animate-fade-in">
                {/* Empty State - Enhanced Design */}
                <div className="relative inline-block mb-6">
                  {/* Decorative Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full blur-2xl scale-150 animate-pulse" />
                  
                  {/* Icon Container */}
                  <div className="relative p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border-2 border-primary/20">
                    <Users className="h-16 w-16 mx-auto text-primary animate-float" />
                  </div>
                </div>
                
                {/* Text Content */}
                <h3 className="text-xl font-bold text-foreground font-display mb-2">
                  {t('noStudentsFound')}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t('noStudentsEnrolled')}
                </p>
                
                {/* Decorative Line */}
                <div className="mt-6 h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-secondary to-transparent rounded-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10">
                      <TableHead className="font-bold text-foreground w-16">#</TableHead>
                      <TableHead className="font-bold text-foreground">{t('name')}</TableHead>
                      <TableHead className="font-bold text-foreground w-56">{t('status')}</TableHead>
                      <TableHead className="font-bold text-foreground">{t('notes')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s: any, idx: number) => {
                      const current = statusByStudent[s.id]?.status || 'present';
                      const statusOption = STATUS_OPTIONS.find(opt => opt.value === current);
                      return (
                        <TableRow 
                          key={s.id}
                          className="hover:bg-primary/5 border-b border-border/50 transition-all duration-200 group"
                        >
                          <TableCell className="text-sm text-muted-foreground font-medium">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground">
                              {s.full_name || s.email}
                            </div>
                          </TableCell>
                          {/* Status Selector */}
                          <TableCell>
                            <Select 
                              value={current} 
                              onValueChange={(v) => updateStudentStatus(s.id, v)}
                            >
                              <SelectTrigger className="w-full h-10 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm">
                                <SelectValue>
                                  <Badge 
                                    variant={
                                      current === 'present' ? 'success' :
                                      current === 'absent' ? 'destructive' :
                                      current === 'late' ? 'warning' :
                                      'info'
                                    }
                                    className="gap-1.5"
                                  >
                                    {current === 'present' && <CheckCircle className="h-3 w-3" />}
                                    {current === 'absent' && <X className="h-3 w-3" />}
                                    {current === 'late' && <Clock className="h-3 w-3" />}
                                    {current === 'excused' && <AlertCircle className="h-3 w-3" />}
                                    {t(current as 'present' | 'absent' | 'late' | 'excused')}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      {opt.value === 'present' && <CheckCircle className="h-4 w-4 text-success" />}
                                      {opt.value === 'absent' && <X className="h-4 w-4 text-error" />}
                                      {opt.value === 'late' && <Clock className="h-4 w-4 text-warning" />}
                                      {opt.value === 'excused' && <AlertCircle className="h-4 w-4 text-info" />}
                                      <span>{t(opt.labelKey)}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Notes Input */}
                          <TableCell>
                            <Input
                              placeholder={t('notesOptional')}
                              value={statusByStudent[s.id]?.notes || ''}
                              onChange={(e) => updateStudentNotes(s.id, e.target.value, current)}
                              className="h-10 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {/* ✨ Save Footer - Islamic Design */}
            {students.length > 0 && (
              <div className="p-6 border-t border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {/* Stats Summary */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        {t('totalStudents')}: <strong className="text-foreground font-display">{stats.total}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-sm">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <strong className="text-success">{stats.present}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-sm">
                        <X className="h-4 w-4 text-error" />
                        <strong className="text-error">{stats.absent}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-warning" />
                        <strong className="text-warning">{stats.late}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-sm">
                        <AlertCircle className="h-4 w-4 text-info" />
                        <strong className="text-info">{stats.excused}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button 
                    onClick={onSave} 
                    disabled={saving || !selectedSubjectId || !selectedClassId}
                    size="lg"
                    className="min-w-[160px] shadow-lg"
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

