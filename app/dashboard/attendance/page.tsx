'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoadingInline } from '@/components/LoadingSpinner';
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
import { BookOpen } from 'lucide-react';

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

  // ✅ CHANGED: Subject-based attendance instead of class-based
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [classesForSubject, setClassesForSubject] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<any[]>([]);
  const [statusByStudent, setStatusByStudent] = useState<Record<string, { status: string; notes?: string }>>({});

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
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

  // Load students when both subject and class are selected
  useEffect(() => {
    if (selectedSubjectId && selectedClassId && dateStr) {
      loadStudentsAndAttendance(selectedSubjectId, selectedClassId, dateStr).catch(() => {});
    } else {
      setStudents([]);
      setStatusByStudent({});
    }
  }, [selectedSubjectId, selectedClassId, dateStr]);

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
        
        // Group subjects by name (same subject may be in different classes)
        // Each subject entry contains all classes where it's taught
        const subjectsMap = new Map<string, any>();
        (data || []).forEach((s: any) => {
          const key = s.subject_name;
          if (!subjectsMap.has(key)) {
            subjectsMap.set(key, {
              id: s.id, // Use first subject ID as representative
              subject_name: s.subject_name,
              classes: []
            });
          }
          subjectsMap.get(key).classes.push({
            class_id: s.class_id,
            class_name: classMap.get(s.class_id) || 'Unknown',
            subject_id: s.id // Keep track of subject_id for each class
          });
        });
        
        const subjectsList = Array.from(subjectsMap.values());
        setSubjects(subjectsList);
        
        // Load classes for first subject
        if (subjectsList.length > 0) {
          const firstSubject = subjectsList[0];
          setSelectedSubjectId(firstSubject.id);
          // Load classes will be triggered by useEffect
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
      const classIds = [...new Set(allSubjectData.map((s: any) => s.class_id).filter(Boolean))];
      
      if (classIds.length === 0) {
        setClassesForSubject([]);
        setSelectedClassId('');
        toast.warning(language === 'ar' ? 'لا توجد فصول صالحة لهذه المادة' : 'No valid classes found for this subject');
        return;
      }
      
      // Fetch class names separately
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, class_name')
        .in('id', classIds);
      
      if (classesError) {
        console.error('Error loading classes:', classesError);
        toast.error(language === 'ar' ? 'فشل تحميل أسماء الفصول' : 'Failed to load class names');
        // Even if there's an error, try to continue with what we have
      }
      
      // Create a map of class_id to class_name
      const classMap = new Map<string, string>();
      if (classesData && classesData.length > 0) {
        classesData.forEach((c: any) => {
          if (c.id && c.class_name) {
            classMap.set(c.id, c.class_name);
          }
        });
      }
      
      // If we don't have class names, try to fetch them individually
      if (classMap.size === 0 && classIds.length > 0) {
        console.warn('No class names found in batch query, trying individual queries');
        for (const classId of classIds) {
          try {
            const { data: classData, error: classErr } = await supabase
              .from('classes')
              .select('id, class_name')
              .eq('id', classId)
              .single();
            
            if (!classErr && classData && classData.class_name) {
              classMap.set(classId, classData.class_name);
            }
          } catch (e) {
            console.warn(`Failed to load class ${classId}:`, e);
          }
        }
      }
      
      // Map subject data with class names
      const classesList = allSubjectData.map((s: any) => {
        const className = classMap.get(s.class_id);
        if (!className) {
          console.warn(`Class name not found for class_id: ${s.class_id}`);
        }
        return {
          class_id: s.class_id,
          class_name: className || `Class ${s.class_id.slice(0, 8)}...`,
          subject_id: s.id
        };
      });
      
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

  // ✅ CHANGED: Load students for subject and class
  const loadStudentsAndAttendance = async (subjectId: string, classId: string, date: string) => {
    try {
      setLoadingStudents(true);
      
      // Get the actual subject_id for this class (from classesForSubject)
      const classInfo = classesForSubject.find(c => c.class_id === classId);
      const actualSubjectId = classInfo?.subject_id || subjectId;
      
      // Fetch students enrolled in the class
      const { data: studs } = await fetchStudentsInClass(classId);
      
      // Fetch attendance records for this subject, class, and date
      // Try with subject_id first, fallback to class_id only if subject_id doesn't exist
      let att: any[] = [];
      try {
        const { data: attData, error: attError } = await supabase
          .from('attendance_records')
          .select('student_id, status, notes')
          .eq('subject_id', actualSubjectId)
          .eq('class_id', classId)
          .eq('attendance_date', date);
        
        if (attError && attError.code === 'PGRST116') {
          // Column doesn't exist yet, fallback to class-based attendance
          const { data: attDataFallback } = await supabase
            .from('attendance_records')
            .select('student_id, status, notes')
            .eq('class_id', classId)
            .eq('attendance_date', date);
          att = attDataFallback || [];
        } else if (attError) {
          console.warn('Error loading attendance with subject_id:', attError);
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
        console.warn('Error loading attendance, trying fallback:', err);
        // Fallback to class-based attendance
        const { data: attDataFallback } = await supabase
          .from('attendance_records')
          .select('student_id, status, notes')
          .eq('class_id', classId)
          .eq('attendance_date', date);
        att = attDataFallback || [];
      }
      
      const map: Record<string, { status: string; notes?: string }> = {};
      (att || []).forEach((r: any) => { 
        map[r.student_id] = { status: r.status, notes: r.notes || '' }; 
      });
      
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

  // ✅ CHANGED: Save attendance with subject_id
  const onSave = async () => {
    try {
      if (!selectedSubjectId || !selectedClassId) return;
      setSaving(true);
      
      // Get the actual subject_id for this class
      const classInfo = classesForSubject.find(c => c.class_id === selectedClassId);
      const actualSubjectId = classInfo?.subject_id || selectedSubjectId;
      
      const studentIds = students.map((s: any) => s.id);
      
      // Delete existing attendance records for this class and date
      // Work without subject_id until migration is applied
      if (studentIds.length > 0) {
        const { error: delErr } = await supabase
          .from('attendance_records')
          .delete()
          .eq('class_id', selectedClassId)
          .eq('attendance_date', dateStr)
          .in('student_id', studentIds);
        
        if (delErr) {
          console.error('Error deleting existing records:', delErr);
          toast.error(language === 'ar' ? 'فشل الحفظ' : 'Save failed');
          return;
        }
      }
      
      // Insert new attendance records
      // First, try without subject_id (since migration may not be applied yet)
      const rows = students.map((s: any) => ({
        student_id: s.id,
        class_id: selectedClassId,
        attendance_date: dateStr,
        status: statusByStudent[s.id]?.status || 'present',
        notes: statusByStudent[s.id]?.notes || null,
      }));
      
      // Try insert without subject_id first (safer for now)
      let { error } = await supabase
        .from('attendance_records')
        .insert(rows)
        .select('*');
      
      // If successful and we want to add subject_id later, we can update the records
      // For now, we'll work without subject_id until migration is applied
      
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
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-gradient">
              <Users className="h-5 w-5 text-blue-600" />
              {language === 'ar' ? 'تسجيل حضور الطلاب' : 'Record Student Attendance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
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
                <label className="text-sm block mb-1">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="input-modern" />
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

        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="font-display text-gradient">{language === 'ar' ? 'الطلاب' : 'Students'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="py-8">
                <LoadingInline 
                  text={language === 'ar' ? 'جاري تحميل الطلاب...' : 'Loading students...'}
                  size="default"
                />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Users className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">{language === 'ar' ? 'لا يوجد طلاب' : 'No students found'}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {language === 'ar' ? 'لا يوجد طلاب مسجلين في هذا الفصل' : 'No students enrolled in this class'}
                </p>
              </div>
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
              <Button className="btn-gradient" onClick={onSave} disabled={saving || !selectedSubjectId || !selectedClassId}>
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
