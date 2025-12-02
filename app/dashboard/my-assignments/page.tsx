'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { SimplePageLoading } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Clock, Send, CheckCircle, XCircle, Calendar, AlertCircle, Filter, LayoutGrid, List as ListIcon, ChevronRight, BookOpen, X } from 'lucide-react';
import * as api from '@/lib/supabase';
import { toast } from 'sonner';
import { fetchMyEnrolledClassesWithDetails, fetchSubjectsForClass } from '@/lib/supabase';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { cn } from '@/lib/utils';

export default function MyAssignmentsPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLabel } = useBreadcrumb();
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const classId = searchParams.get('class');
    const subjectId = searchParams.get('subject');
    if (classId) {
      setFilterClass(classId);
    }
    if (subjectId) {
      setFilterSubject(subjectId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && profile.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    if (profile?.role === 'student') {
      loadData();
    }
  }, [profile, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get enrolled classes
      const { data: enrolledClasses } = await fetchMyEnrolledClassesWithDetails();
      setClasses(enrolledClasses || []);

      if (!enrolledClasses || enrolledClasses.length === 0) {
        setAssignments([]);
        return;
      }

      // Get all subjects for enrolled classes
      const subjectsByClass: Record<string, any[]> = {};
      const allSubjectsList: any[] = [];
      for (const cls of enrolledClasses) {
        const { data: subjects } = await fetchSubjectsForClass(cls.id);
        const subjectsWithClass = (subjects || []).map((s: any) => ({ ...s, class_id: cls.id, class_name: cls.class_name }));
        subjectsByClass[cls.id] = subjectsWithClass;
        allSubjectsList.push(...subjectsWithClass);
      }
      setSubjects(allSubjectsList);
      
      // Set breadcrumb label for subject if provided
      const subjectId = searchParams.get('subject');
      if (subjectId) {
        const subject = allSubjectsList.find((s: any) => s.id === subjectId);
        if (subject) {
          setLabel(subjectId, subject.subject_name);
        }
      }

      // Fetch assignments for all subjects
      const allAssignments: any[] = [];
      const allSubmissions: Record<string, any> = {};
      
      for (const clsId in subjectsByClass) {
        for (const subject of subjectsByClass[clsId]) {
          const { data: assignments, error: assErr } = await api.fetchMyAssignmentsForSubject(subject.id);
          if (assErr) {
            continue;
          }
          if (assignments && assignments.length > 0) {
            // Add class_id and subject info to assignment for filtering
            const assignmentsWithClass = assignments.map((a: any) => ({
              ...a,
              class_id: clsId,
              class_name: enrolledClasses.find((c: any) => c.id === clsId)?.class_name,
              subject_name: subject.subject_name,
              subject_id: subject.id
            }));
            allAssignments.push(...assignmentsWithClass);
            
            // Fetch submissions for each assignment
            for (const assignment of assignments) {
              const { data: submission } = await api.fetchSubmissionForAssignment(assignment.id);
              if (submission) {
                allSubmissions[assignment.id] = submission;
              }
            }
          }
        }
      }

      setAssignments(allAssignments);
      setSubmissions(allSubmissions);
    } catch (e) {
      console.error(e);
      toast.error('Error loading assignments');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (t: string) => {
    const labels: Record<string, string> = { homework: 'Homework', quiz: 'Quiz', test: 'Test', project: 'Project' };
    return labels[t] || t;
  };

  const getStatusBadge = (assignment: any, submission: any) => {
    if (submission) {
      if (submission.status === 'graded') {
        return (
          <Badge variant="success" className={cn("gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs flex items-center", language === 'ar' && 'rtl:flex-row-reverse')}>
            <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
            <span className="text-left rtl:text-right">{submission.score}/{assignment.total_points}</span>
          </Badge>
        );
      }
      return (
        <Badge variant="info" className={cn("gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs flex items-center", language === 'ar' && 'rtl:flex-row-reverse')}>
          <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
          <span className="text-left rtl:text-right">{t('submitted')}</span>
        </Badge>
      );
    }
    const now = new Date();
    if (assignment.due_date && new Date(assignment.due_date) < now) {
      return (
        <Badge variant="destructive" className={cn("gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs flex items-center", language === 'ar' && 'rtl:flex-row-reverse')}>
          <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
          <span className="text-left rtl:text-right">{t('overdue')}</span>
        </Badge>
      );
    }
    return (
      <Badge variant="warning" className={cn("gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs flex items-center", language === 'ar' && 'rtl:flex-row-reverse')}>
        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
        <span className="text-left rtl:text-right">{t('pending')}</span>
      </Badge>
    );
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment: any) => {
      const matchesClass = filterClass === 'ALL' || assignment.class_id === filterClass;
      const matchesSubject = filterSubject === 'ALL' || assignment.subject_id === filterSubject;
      const submission = submissions[assignment.id];
      const now = new Date();
      const isOverdue = assignment.due_date && new Date(assignment.due_date) < now && !submission;
      
      let matchesStatus = true;
      switch (filterStatus) {
        case 'pending':
          matchesStatus = !submission && !isOverdue;
          break;
        case 'submitted':
          matchesStatus = !!submission && submission.status !== 'graded';
          break;
        case 'graded':
          matchesStatus = !!submission && submission.status === 'graded';
          break;
        case 'overdue':
          matchesStatus = isOverdue;
          break;
      }
      
      return matchesClass && matchesSubject && matchesStatus;
    });
  }, [assignments, submissions, filterClass, filterSubject, filterStatus]);

  const stats = useMemo(() => {
    // Calculate stats based on ALL assignments for the selected class and subject (ignoring status filter)
    let relevantAssignments = assignments;
    if (filterClass !== 'ALL') {
      relevantAssignments = relevantAssignments.filter((a: any) => a.class_id === filterClass);
    }
    if (filterSubject !== 'ALL') {
      relevantAssignments = relevantAssignments.filter((a: any) => a.subject_id === filterSubject);
    }

    const total = relevantAssignments.length;
    const submitted = relevantAssignments.filter((a: any) => submissions[a.id]).length;
    const graded = relevantAssignments.filter((a: any) => submissions[a.id]?.status === 'graded').length;
    const pending = total - submitted;
    
    return { total, submitted, graded, pending };
  }, [assignments, submissions, filterClass, filterSubject]);
  
  // Get filtered subjects based on selected class
  const filteredSubjects = useMemo(() => {
    if (filterClass === 'ALL') {
      return subjects;
    }
    return subjects.filter((s: any) => s.class_id === filterClass);
  }, [subjects, filterClass]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <SimplePageLoading text={t('loading')} />
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6 animate-fade-in pb-20 md:pb-0 px-2 sm:px-3 md:px-0" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <PageHeader 
          icon={FileText}
          title={t('myAssignments')}
          description={t('assignments')}
          gradient="from-primary to-accent"
        />

        {/* Stats Cards - Horizontal Scroll on Mobile */}
        <div className="flex overflow-x-auto pb-3 sm:pb-4 gap-2.5 sm:gap-3 md:gap-4 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible md:pb-0 -mx-2 sm:-mx-3 md:mx-0 px-2 sm:px-3 md:px-0 scrollbar-none">
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-primary/10 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-primary/10 rounded-full mb-2 sm:mb-2.5 md:mb-3">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground font-display">{stats.total}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium text-left rtl:text-right">{t('total')}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-warning/10 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-warning/10 rounded-full mb-2 sm:mb-2.5 md:mb-3">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-warning" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground font-display">{stats.pending}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium text-left rtl:text-right">{t('pending')}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-info/10 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-info/10 rounded-full mb-2 sm:mb-2.5 md:mb-3">
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-info" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground font-display">{stats.submitted}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium text-left rtl:text-right">{t('submitted')}</p>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-[160px] sm:min-w-[180px] md:min-w-0 snap-center h-full">
            <Card className="glass-card-hover border-success/10 h-full">
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full">
                <div className="p-2 sm:p-2.5 md:p-3 bg-success/10 rounded-full mb-2 sm:mb-2.5 md:mb-3">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-success" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground font-display">{stats.graded}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium text-left rtl:text-right">{t('graded')}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="w-full sm:w-auto sm:flex-1 md:w-64">
              <Select value={filterClass} onValueChange={(value) => {
                setFilterClass(value);
                // Reset subject filter when class changes
                if (value === 'ALL') {
                  setFilterSubject('ALL');
                }
              }}>
                <SelectTrigger className={cn("w-full input-modern bg-background/50 backdrop-blur-sm h-9 sm:h-10 text-xs sm:text-sm", language === 'ar' && 'rtl:flex-row-reverse')}>
                  <Filter className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", language === 'ar' ? 'ml-2 mr-0' : 'mr-2')} />
                  <SelectValue placeholder={t('allClasses' as any) || 'All Classes'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allClasses' as any) || 'All Classes'}</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-left rtl:text-right">{c.class_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full sm:w-auto sm:flex-1 md:w-64">
              <Select 
                value={filterSubject} 
                onValueChange={setFilterSubject}
                disabled={filterClass === 'ALL' || filteredSubjects.length === 0}
              >
                <SelectTrigger className={cn("w-full input-modern bg-background/50 backdrop-blur-sm h-9 sm:h-10 text-xs sm:text-sm", language === 'ar' && 'rtl:flex-row-reverse')}>
                  <BookOpen className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", language === 'ar' ? 'ml-2 mr-0' : 'mr-2')} />
                  <SelectValue placeholder={t('allSubjects' as any) || 'All Subjects'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allSubjects' as any) || 'All Subjects'}</SelectItem>
                  {filteredSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-left rtl:text-right">
                      <div className="flex flex-col">
                        <span>{s.subject_name}</span>
                        <span className="text-xs text-muted-foreground">{s.class_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Clear Filters Button */}
            {(filterClass !== 'ALL' || filterSubject !== 'ALL' || filterStatus !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterClass('ALL');
                  setFilterSubject('ALL');
                  setFilterStatus('all');
                }}
                className={cn("h-9 sm:h-10 text-xs sm:text-sm flex items-center gap-1.5", language === 'ar' && 'rtl:flex-row-reverse')}
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-left rtl:text-right">{language === 'ar' ? 'مسح الفلاتر' : 'Clear'}</span>
              </Button>
            )}
          </div>
          
          <div className="flex-1 overflow-x-auto pb-2 md:pb-0 -mx-2 sm:-mx-3 md:mx-0 px-2 sm:px-3 md:px-0 scrollbar-none">
            <div className="flex gap-1.5 sm:gap-2 min-w-max">
              <Button 
                variant={filterStatus === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('all')}
                className={cn("rounded-full px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm flex items-center gap-1.5", language === 'ar' && 'rtl:flex-row-reverse')}
              >
                <span className="text-left rtl:text-right">{t('all')}</span>
              </Button>
              <Button 
                variant={filterStatus === 'pending' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('pending')}
                className={cn("rounded-full px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm flex items-center gap-1.5", language === 'ar' && 'rtl:flex-row-reverse')}
              >
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="text-left rtl:text-right">{t('pending')}</span>
              </Button>
              <Button 
                variant={filterStatus === 'submitted' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('submitted')}
                className={cn("rounded-full px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm flex items-center gap-1.5", language === 'ar' && 'rtl:flex-row-reverse')}
              >
                <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="text-left rtl:text-right">{t('submitted')}</span>
              </Button>
              <Button 
                variant={filterStatus === 'graded' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('graded')}
                className={cn("rounded-full px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm flex items-center gap-1.5", language === 'ar' && 'rtl:flex-row-reverse')}
              >
                <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="text-left rtl:text-right">{t('graded')}</span>
              </Button>
              <Button 
                variant={filterStatus === 'overdue' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('overdue')}
                className={cn("rounded-full px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm flex items-center gap-1.5", language === 'ar' && 'rtl:flex-row-reverse')}
              >
                <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="text-left rtl:text-right">{t('overdue')}</span>
              </Button>
            </div>
          </div>
        </div>

        {filteredAssignments.length === 0 ? (
          <Card className="glass-card border-primary/10">
            <CardContent className="py-8 sm:py-10 md:py-12 text-center animate-fade-in relative overflow-hidden">
              <div className="absolute inset-0 islamic-pattern-subtle opacity-30"></div>
              <div className="relative z-10">
                <div className="p-4 sm:p-5 md:p-6 bg-primary/5 rounded-full inline-block mb-3 sm:mb-4">
                  <FileText className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary/50" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground font-display mb-1.5 sm:mb-2 text-left rtl:text-right">{t('noAssignmentsFound' as any) || 'No assignments found'}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-sans text-left rtl:text-right">{t('tryAdjustingFilters' as any) || 'Try adjusting your filters'}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2.5 sm:gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-3 animate-fade-in-up">
            {filteredAssignments.map((assignment: any, index: number) => {
              const submission = submissions[assignment.id];
              const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date() && !submission;
              return (
                <Card 
                  key={assignment.id} 
                  className="glass-card-hover border-primary/10 group overflow-hidden flex flex-col"
                  style={{ animationDelay: `${index * 50}ms` }}
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                >
                  <CardHeader className={cn("bg-gradient-to-l from-primary/5 to-secondary/5 border-b border-primary/10 p-3 sm:p-4", language === 'ar' && 'bg-gradient-to-r')}>
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1 rtl:flex-row-reverse">
                        <div className="p-1.5 sm:p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-border/50 flex-shrink-0">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm sm:text-base font-semibold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2 text-left rtl:text-right">
                            {assignment.title}
                          </CardTitle>
                          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1 text-left rtl:text-right">
                            {assignment.class_name}
                            {assignment.subject_name && (
                              <span className="mx-1">•</span>
                            )}
                            {assignment.subject_name && (
                              <span className="text-primary">{assignment.subject_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(assignment, submission)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 flex-1 flex flex-col gap-2.5 sm:gap-3 md:gap-4">
                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                       <Badge variant="outline" className="bg-background/50 text-[10px] sm:text-xs">
                         {getTypeLabel(assignment.assignment_type)}
                       </Badge>
                       {assignment.due_date && (
                        <div className={cn(`flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`, language === 'ar' && 'rtl:flex-row-reverse')}>
                          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                          <span className="text-left rtl:text-right">{new Date(assignment.due_date).toLocaleDateString()}</span>
                        </div>
                       )}
                    </div>

                    {assignment.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 flex-1 min-h-[2rem] sm:min-h-[2.5rem] text-left rtl:text-right">
                        {assignment.description}
                      </p>
                    )}
                    
                    <div className={cn("grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground bg-secondary/5 p-2 sm:p-2.5 rounded-lg border border-border/50", language === 'ar' && 'rtl:grid-cols-2')}>
                      <div className="flex flex-col gap-0.5 text-left rtl:text-right">
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-70">{t('scoreLabel')}:</span>
                        <span className="font-semibold text-foreground">{assignment.total_points} pts</span>
                      </div>
                      <div className={cn("flex flex-col gap-0.5 border-l pl-1.5 sm:pl-2 border-border/50", language === 'ar' && 'border-l-0 border-r pr-1.5 sm:pr-2')}>
                         <span className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-70 text-left rtl:text-right">{t('grade')}:</span>
                         <span className="font-semibold text-foreground text-left rtl:text-right">{assignment.grade_weight}%</span>
                      </div>
                    </div>

                    {submission?.feedback && (
                      <div className="p-2 sm:p-2.5 bg-primary/5 border border-primary/10 rounded-lg text-[10px] sm:text-xs">
                        <div className={cn("font-semibold text-primary mb-1 flex items-center gap-1", language === 'ar' && 'rtl:flex-row-reverse')}>
                          <LayoutGrid className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                          <span className="text-left rtl:text-right">{t('feedback')}:</span>
                        </div>
                        <p className="text-foreground/90 line-clamp-2 text-left rtl:text-right">{submission.feedback}</p>
                      </div>
                    )}

                    <Button
                      variant={submission ? 'secondary' : 'default'}
                      className={cn("w-full mt-auto h-8 sm:h-9 text-xs sm:text-sm shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center", language === 'ar' && 'rtl:flex-row-reverse')}
                      onClick={() => router.push(`/dashboard/assignments/${assignment.id}/submit`)}
                    >
                      {submission ? (
                        <>
                          <FileText className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", language === 'ar' ? 'ml-1.5 sm:ml-2 mr-0' : 'mr-1.5 sm:mr-2')} />
                          <span className="text-left rtl:text-right">{t('viewSubmission' as any) || 'View Submission'}</span>
                        </>
                      ) : (
                        <>
                          <Send className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", language === 'ar' ? 'ml-1.5 sm:ml-2 mr-0' : 'mr-1.5 sm:mr-2')} />
                          <span className="text-left rtl:text-right">{t('submitAssignment' as any) || 'Submit Assignment'}</span>
                        </>
                      )}
                      <ChevronRight className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-50", language === 'ar' ? 'mr-auto ml-0 rotate-180' : 'ml-auto')} />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

