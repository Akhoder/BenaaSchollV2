'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Loader2, 
  Video, 
  FileText, 
  Image as ImageIcon, 
  ExternalLink, 
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  User,
  GraduationCap,
  Clock,
  Calendar,
  Play,
  Lock,
  Search,
  Filter,
  X,
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  fetchSubjectsForClass, 
  fetchLessonsBySubject, 
  Lesson, 
  fetchAttachmentsForLessons,
  fetchAllLessonProgressForSubject,
  updateLessonProgress,
  LessonProgress
} from '@/lib/supabase';
import { fetchMyAssignmentsForSubject, fetchSubmissionForAssignment } from '@/lib/supabase';
import { fetchQuizzesForSubject, fetchQuizzesForLesson, fetchStudentAttemptsForQuiz } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import * as api from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SubjectLessonsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Safely extract params with proper type checking and null safety
  const classId = params && typeof params.classId === 'string' ? params.classId : null;
  const subjectId = params && typeof params.subjectId === 'string' ? params.subjectId : null;

  const [subject, setSubject] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attachmentsByLesson, setAttachmentsByLesson] = useState<Record<string, any[]>>({});
  const [lessonsProgress, setLessonsProgress] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [lessonQuizzes, setLessonQuizzes] = useState<any[]>([]);
  const [quizzesByLesson, setQuizzesByLesson] = useState<Record<string, any[]>>({});
  const [quizAttempts, setQuizAttempts] = useState<Record<string, any[]>>({});
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');
  const [lessonStatusFilter, setLessonStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');
  const [certificateEligibility, setCertificateEligibility] = useState<any>(null);
  const [issuingCertificate, setIssuingCertificate] = useState(false);

  useEffect(() => {
    // Early return if params are not available (build time or initial render)
    if (!classId || !subjectId) {
      return;
    }
    // Don't proceed if auth is still loading
    if (authLoading) {
      return;
    }
    // Redirect if not authenticated
    if (!profile) {
      router.push('/login');
      return;
    }
    // Redirect if not a student
    if (profile.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    // Load data only when all conditions are met
    if (profile.role === 'student' && classId && subjectId) {
      loadData().catch((err) => {
        console.error('Error loading data:', err);
      });
    }
  }, [profile, authLoading, router, classId, subjectId]);

  // Keep lesson quizzes in sync with the active lesson
  useEffect(() => {
    const current = lessons[activeLessonIndex];
    if (current?.id) {
      // Use cached quizzes if available, otherwise fetch
      if (quizzesByLesson[current.id]) {
        setLessonQuizzes(quizzesByLesson[current.id]);
      } else {
        fetchQuizzesForLesson(current.id).then(({ data }) => {
          setLessonQuizzes(data || []);
          // Update cache
          setQuizzesByLesson((prev) => ({
            ...prev,
            [current.id]: data || []
          }));
        });
      }
    } else {
      setLessonQuizzes([]);
    }
  }, [activeLessonIndex, lessons, quizzesByLesson]);

  // Calculate subject progress
  const subjectProgress = useMemo(() => {
    const completed = lessons.filter(l => lessonsProgress[l.id]?.status === 'completed').length;
    const inProgress = lessons.filter(l => lessonsProgress[l.id]?.status === 'in_progress').length;
    const total = lessons.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, inProgress, total, percentage };
  }, [lessons, lessonsProgress]);

  // Filter lessons based on search and status
  const filteredLessons = useMemo(() => {
    let filtered = lessons;
    
    // Search filter
    if (lessonSearchQuery.trim()) {
      filtered = filtered.filter(lesson =>
        lesson.title.toLowerCase().includes(lessonSearchQuery.toLowerCase()) ||
        (lesson.description?.toLowerCase().includes(lessonSearchQuery.toLowerCase()) || false)
      );
    }
    
    // Status filter
    if (lessonStatusFilter !== 'all') {
      filtered = filtered.filter(lesson => {
        const lessonProgress = lessonsProgress[lesson.id];
        if (lessonStatusFilter === 'completed') return lessonProgress?.status === 'completed';
        if (lessonStatusFilter === 'in_progress') return lessonProgress?.status === 'in_progress';
        if (lessonStatusFilter === 'not_started') return !lessonProgress || lessonProgress.status === 'not_started';
        return true;
      });
    }
    
    return filtered;
  }, [lessons, lessonSearchQuery, lessonStatusFilter, lessonsProgress]);

  const loadData = async () => {
    // Type assertion: at this point, classId and subjectId are guaranteed to be strings
    // because loadData is only called after null checks in useEffect
    if (!classId || !subjectId) {
      return;
    }
    const currentClassId = classId as string;
    const currentSubjectId = subjectId as string;
    
    try {
      setLoading(true);
      
      // Get subject details
      const { data: subjects } = await fetchSubjectsForClass(currentClassId);
      const subjectData = (subjects || []).find((s: any) => s.id === currentSubjectId);
      if (!subjectData) {
        toast.error('Subject not found');
        router.push(`/dashboard/my-classes/${currentClassId}`);
        return;
      }
      setSubject(subjectData);

      // Load lessons
      const { data: lessonsData } = await fetchLessonsBySubject(currentSubjectId);
      const lessonsList = (lessonsData || []) as Lesson[];
      setLessons(lessonsList);

      // Load attachments
      if (lessonsList.length > 0) {
        const lessonIds = lessonsList.map(l => l.id);
        const { data: attachments } = await fetchAttachmentsForLessons(lessonIds);
        const map: Record<string, any[]> = {};
        (attachments || []).forEach((a: any) => {
          if (!map[a.lesson_id]) map[a.lesson_id] = [];
          map[a.lesson_id].push(a);
        });
        setAttachmentsByLesson(map);
      }

      // Load progress
      const { data: progress } = await fetchAllLessonProgressForSubject(currentSubjectId);
      const progressMap: Record<string, LessonProgress> = {};
      if (progress) {
        progress.forEach((p: LessonProgress) => {
          progressMap[p.lesson_id] = p;
        });
      }
      setLessonsProgress(progressMap);

      // Load assignments for this subject
      const { data: assns } = await fetchMyAssignmentsForSubject(currentSubjectId);
      setAssignments(assns || []);
      // Load submissions per assignment
      const subs: Record<string, any> = {};
      for (const a of (assns || [])) {
        const { data: sub } = await fetchSubmissionForAssignment(a.id);
        if (sub) subs[a.id] = sub;
      }
      setSubmissions(subs);

      // Load quizzes for this subject
      const { data: qz } = await fetchQuizzesForSubject(currentSubjectId);
      setQuizzes(qz || []);

      // Load quizzes for all lessons
      const allQuizIds: string[] = [];
      if (lessonsList.length > 0) {
        const lessonIds = lessonsList.map(l => l.id);
        const quizzesMap: Record<string, any[]> = {};
        
        // Fetch quizzes for all lessons in parallel
        const quizPromises = lessonIds.map(async (lessonId) => {
          const { data } = await fetchQuizzesForLesson(lessonId);
          return { lessonId, quizzes: data || [] };
        });
        
        const quizResults = await Promise.all(quizPromises);
        quizResults.forEach(({ lessonId, quizzes: qzs }) => {
          if (qzs.length > 0) {
            quizzesMap[lessonId] = qzs;
            qzs.forEach((q: any) => allQuizIds.push(q.id));
          }
        });
        
        setQuizzesByLesson(quizzesMap);
        
        // Set active lesson quizzes
        if (lessonsList.length > 0 && activeLessonIndex === 0) {
          const firstLessonId = lessonsList[0].id;
          setLessonQuizzes(quizzesMap[firstLessonId] || []);
        }
      }

      // Collect all quiz IDs (subject + lesson quizzes)
      (qz || []).forEach((q: any) => allQuizIds.push(q.id));

      // Load student attempts for all quizzes in parallel
      if (allQuizIds.length > 0) {
        const attemptPromises = allQuizIds.map(async (quizId) => {
          const { data } = await fetchStudentAttemptsForQuiz(quizId);
          return { quizId, attempts: data || [] };
        });
        
        const attemptResults = await Promise.all(attemptPromises);
        const attemptsMap: Record<string, any[]> = {};
        attemptResults.forEach(({ quizId, attempts }) => {
          if (attempts.length > 0) {
            attemptsMap[quizId] = attempts;
          }
        });
        setQuizAttempts(attemptsMap);
      }

      // Check certificate eligibility
      if (profile?.id) {
        try {
          // Check if auto_publish is enabled for this subject
          const { data: subjectData } = await supabase
            .from('class_subjects')
            .select('auto_publish_certificates')
            .eq('id', currentSubjectId)
            .single();
          
          if (subjectData?.auto_publish_certificates) {
            // Check if certificate already exists
            const { data: existingCerts, error: certError } = await supabase
              .from('certificates')
              .select('id')
              .eq('student_id', profile.id)
              .eq('subject_id', currentSubjectId);
            
            if (!certError && (!existingCerts || existingCerts.length === 0)) {
              // Check eligibility
              const { data: eligibility } = await supabase.rpc('check_certificate_eligibility', {
                p_student_id: profile.id,
                p_subject_id: currentSubjectId,
              });
              
              if (eligibility && (eligibility as any).eligible) {
                setCertificateEligibility(eligibility);
              }
            }
          }
        } catch (err) {
          console.error('Error checking certificate eligibility:', err);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const getVideoEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      // YouTube
      if (host.includes('youtube.com')) {
        const v = u.searchParams.get('v');
        if (v) return `https://www.youtube.com/embed/${v}`;
      } else if (host === 'youtu.be') {
        const id = u.pathname.replace('/', '');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      // Vimeo
      if (host.includes('vimeo.com')) {
        const pathParts = u.pathname.split('/').filter(Boolean);
        const maybeId = pathParts[pathParts.length - 1];
        const id = pathParts.includes('video') ? pathParts[pathParts.length - 1] : maybeId;
        if (id && /^\d+$/.test(id)) {
          return `https://player.vimeo.com/video/${id}`;
        }
      }
      // Google Drive
      if (host.includes('drive.google.com')) {
        const parts = u.pathname.split('/');
        const idx = parts.findIndex(p => p === 'd');
        if (idx !== -1 && parts[idx + 1]) {
          const fileId = parts[idx + 1];
          return `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleVideoPlay = async (lessonId: string) => {
    const progress = lessonsProgress[lessonId];
    if (!progress || progress.status === 'not_started') {
      const result = await updateLessonProgress(lessonId, 5, 'in_progress');
      if (result && !result.error) {
        // Reload progress - safeSubjectId is guaranteed to be string after null check
        const { data } = await fetchAllLessonProgressForSubject(safeSubjectId);
        if (data) {
          const progressMap: Record<string, LessonProgress> = {};
          data.forEach((p: LessonProgress) => {
            progressMap[p.lesson_id] = p;
          });
          setLessonsProgress(progressMap);
        }
      }
    };
  };

  const handleMarkComplete = async (lessonId: string) => {
    await updateLessonProgress(lessonId, 100, 'completed');
    toast.success('Lesson marked as completed!');
    
    // Reload progress - safeSubjectId is guaranteed to be string after null check
    const { data } = await fetchAllLessonProgressForSubject(safeSubjectId);
    if (data) {
      const progressMap: Record<string, LessonProgress> = {};
      data.forEach((p: LessonProgress) => {
        progressMap[p.lesson_id] = p;
      });
      setLessonsProgress(progressMap);
    }
  };

  const handleLessonClick = (index: number, lessonId: string) => {
    setActiveLessonIndex(index);
    handleVideoPlay(lessonId);
    setSheetOpen(false); // Close sheet on mobile
  };

  const handlePrevious = () => {
    if (activeLessonIndex > 0) {
      const newIndex = activeLessonIndex - 1;
      setActiveLessonIndex(newIndex);
      handleVideoPlay(lessons[newIndex].id);
    }
  };

  const handleNext = () => {
    if (activeLessonIndex < lessons.length - 1) {
      const newIndex = activeLessonIndex + 1;
      setActiveLessonIndex(newIndex);
      handleVideoPlay(lessons[newIndex].id);
      
      // Auto-scroll sidebar to active lesson
      if (sidebarRef.current) {
        const activeElement = sidebarRef.current.children[newIndex] as HTMLElement;
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  };

  // Safety check for build time - handle null/undefined params during static generation
  // This ensures the component can render safely during build time
  if (classId === null || subjectId === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  // TypeScript type narrowing: after the check above, we know these are strings
  const safeClassId: string = classId;
  const safeSubjectId: string = subjectId;

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  // Handle missing data gracefully - return loading state instead of null
  if (!profile || profile.role !== 'student') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!subject || lessons.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Safety check for activeLesson
  const activeLesson = lessons[activeLessonIndex] || lessons[0];
  if (!activeLesson) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const progress = lessonsProgress[activeLesson.id];
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress';
  const embed = getVideoEmbedUrl(activeLesson.video_url);
  const hasAttachments = (attachmentsByLesson[activeLesson.id] || []).length > 0;
  const hasAssignments = assignments.length > 0;
  const hasQuizzes = quizzes.length > 0;
  

  const LessonSidebar = () => {
    const lessonsToShow = lessonSearchQuery || lessonStatusFilter !== 'all' ? filteredLessons : lessons;
    
    return (
      <div className="space-y-2" ref={sidebarRef}>
        {lessonsToShow.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            {language === 'ar' ? 'لا توجد دروس مطابقة' : 'No lessons found'}
          </div>
        ) : (
          lessonsToShow.map((lesson) => {
            const idx = lessons.findIndex(l => l.id === lesson.id);
        const lessonProgress = lessonsProgress[lesson.id];
        const isLessonCompleted = lessonProgress?.status === 'completed';
        const isLessonInProgress = lessonProgress?.status === 'in_progress';
        const isActive = idx === activeLessonIndex;

        return (
          <button
            key={lesson.id}
            onClick={() => handleLessonClick(idx, lesson.id)}
            className={cn(
              "w-full text-left p-3 rounded-xl transition-all duration-200 border-2",
              isActive 
                ? "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-blue-500 dark:border-blue-600 shadow-md" 
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Lesson Number */}
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow transition-all",
                isActive && "bg-blue-500 text-white shadow-lg scale-110",
                !isActive && isLessonCompleted && "bg-emerald-500 text-white",
                !isActive && isLessonInProgress && "bg-blue-400 text-white",
                !isActive && !lessonProgress && "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
              )}>
                {idx + 1}
              </div>

              {/* Lesson Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={cn(
                    "font-semibold text-sm line-clamp-2 transition-colors flex-1",
                    isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-white"
                  )}>
                    {lesson.title}
                  </h4>
                  {/* Quiz Notification Badge */}
                  {quizzesByLesson[lesson.id] && quizzesByLesson[lesson.id].length > 0 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering lesson click
                        const availableQuizzes = quizzesByLesson[lesson.id].filter((q: any) => {
                          const isActive = !q.end_at || new Date(q.end_at) > new Date();
                          const isStarted = !q.start_at || new Date(q.start_at) <= new Date();
                          return isActive && isStarted;
                        });
                        
                        if (availableQuizzes.length > 0) {
                          // Go to first available quiz
                          router.push(`/dashboard/quizzes/${availableQuizzes[0].id}/take?classId=${safeClassId}&subjectId=${safeSubjectId}`);
                        } else {
                          // If no active quiz, switch to lesson to show quizzes
                          const lessonIndex = lessons.findIndex(l => l.id === lesson.id);
                          if (lessonIndex !== -1) {
                            setActiveLessonIndex(lessonIndex);
                            handleVideoPlay(lesson.id);
                            setSheetOpen(false); // Close sheet on mobile
                          }
                        }
                      }}
                      className="flex-shrink-0 cursor-pointer"
                    >
                      <Badge 
                        className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs shadow-sm hover:shadow-md hover:bg-purple-200 dark:hover:bg-purple-800 transition-all cursor-pointer"
                        title={language === 'ar' ? `${quizzesByLesson[lesson.id].length} اختبار متاح لهذا الدرس - اضغط للانتقال` : `${quizzesByLesson[lesson.id].length} quiz${quizzesByLesson[lesson.id].length > 1 ? 'zes' : ''} available - Click to go to quiz`}
                      >
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {quizzesByLesson[lesson.id].length}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {isLessonCompleted ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </span>
                  ) : isLessonInProgress ? (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <CircleDot className="h-3 w-3" />
                      In Progress
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <CircleDot className="h-3 w-3" />
                      Not Started
                    </span>
                  )}
                </div>
                {/* Lesson Progress Bar */}
                {lessonProgress && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{lessonProgress.progress_percentage || 0}%</span>
                    </div>
                    <Progress value={lessonProgress.progress_percentage || 0} className="h-1.5" />
                  </div>
                )}
              </div>
            </div>
          </button>
            );
          })
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Certificate Eligibility Banner */}
        {certificateEligibility && (
          <Card className="card-elegant border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      {language === 'ar' ? 'شهادة جاهزة للإصدار!' : 'Certificate Ready to Issue!'}
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                      {language === 'ar' 
                        ? `تهانينا! لقد أكملت جميع الدروس والاختبارات في مادة ${subject?.subject_name || ''}. يمكنك الآن إصدار شهادتك مباشرة.`
                        : `Congratulations! You've completed all lessons and quizzes for ${subject?.subject_name || ''}. You can now issue your certificate.`
                      }
                    </p>
                    <div className="flex items-center gap-4 text-xs text-amber-600 dark:text-amber-400">
                      <span>
                        {language === 'ar' ? 'العلامة النهائية' : 'Final Score'}: {certificateEligibility.final_score ? parseFloat(certificateEligibility.final_score).toFixed(1) : '0.0'} / 100
                      </span>
                      <span className="font-semibold">{certificateEligibility.grade || '-'}</span>
                    </div>
                  </div>
                </div>
                <Button
                  className="btn-gradient whitespace-nowrap"
                  onClick={async () => {
                    try {
                      setIssuingCertificate(true);
                      const { data, error } = await api.studentIssueCertificate(safeSubjectId);
                      if (error) {
                        toast.error(language === 'ar' ? 'فشل إصدار الشهادة' : 'Failed to issue certificate');
                        return;
                      }
                      toast.success(language === 'ar' ? 'تم إصدار الشهادة بنجاح!' : 'Certificate issued successfully!');
                      setCertificateEligibility(null);
                      // Redirect to certificates page
                      router.push('/dashboard/my-certificates');
                    } catch (err: any) {
                      console.error(err);
                      toast.error(err.message || (language === 'ar' ? 'خطأ في إصدار الشهادة' : 'Error issuing certificate'));
                    } finally {
                      setIssuingCertificate(false);
                    }
                  }}
                  disabled={issuingCertificate}
                >
                  {issuingCertificate ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {language === 'ar' ? 'جاري الإصدار...' : 'Issuing...'}
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إصدار الشهادة' : 'Issue Certificate'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Header */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push(`/dashboard/my-classes/${safeClassId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4 mr-2" />
                Lessons
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{subject.subject_name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{lessons.length} Lessons</p>
              </div>
              <LessonSidebar />
            </SheetContent>
          </Sheet>
        </div>

        {/* Subject Header - Mobile Only */}
        <div className="lg:hidden relative overflow-hidden rounded-2xl p-6 mb-6 border border-white/20 bg-gradient-to-br from-cyan-600 via-teal-600 to-blue-700 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-display font-bold mb-1">{subject.subject_name}</h1>
                    {subject.teacher?.full_name && (
                      <div className="flex items-center gap-2 text-sm text-white/90 mb-1">
                        <User className="h-3.5 w-3.5" />
                        <span>{subject.teacher.full_name}</span>
                      </div>
                    )}
                    <p className="text-sm text-white/90">Lesson {activeLessonIndex + 1} of {lessons.length}</p>
                  </div>
            </div>
          </div>
        </div>

        {/* Main Layout: Split View */}
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="mb-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push(`/dashboard/my-classes/${safeClassId}`)}
                  className="mb-3"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Subjects
                </Button>
                <div className="p-4 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">{subject.subject_name}</h3>
                      {subject.teacher?.full_name && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{subject.teacher.full_name}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-600 dark:text-gray-400">{lessons.length} {language === 'ar' ? 'درس' : 'Lessons'}</p>
                    </div>
                  </div>
                  {/* Subject Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{subjectProgress.percentage}%</span>
                    </div>
                    <Progress value={subjectProgress.percentage} className="h-2" />
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{subjectProgress.completed} {language === 'ar' ? 'مكتمل' : 'Completed'}</span>
                      <span>{subjectProgress.inProgress} {language === 'ar' ? 'قيد التقدم' : 'In Progress'}</span>
                      <span>{subjectProgress.total - subjectProgress.completed - subjectProgress.inProgress} {language === 'ar' ? 'لم يبدأ' : 'Not Started'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="border-gray-200 dark:border-gray-800 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">{language === 'ar' ? 'الدروس' : 'Lessons'}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {/* Search and Filter */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder={language === 'ar' ? 'بحث في الدروس...' : 'Search lessons...'}
                        value={lessonSearchQuery}
                        onChange={(e) => setLessonSearchQuery(e.target.value)}
                        className="pl-10 h-9 text-sm"
                      />
                      {lessonSearchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setLessonSearchQuery('')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Select value={lessonStatusFilter} onValueChange={(v) => setLessonStatusFilter(v as any)}>
                      <SelectTrigger className="h-9 text-sm">
                        <Filter className="h-3.5 w-3.5 mr-2" />
                        <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'ar' ? 'جميع الدروس' : 'All Lessons'}</SelectItem>
                        <SelectItem value="completed">{language === 'ar' ? 'مكتملة' : 'Completed'}</SelectItem>
                        <SelectItem value="in_progress">{language === 'ar' ? 'قيد التقدم' : 'In Progress'}</SelectItem>
                        <SelectItem value="not_started">{language === 'ar' ? 'لم تبدأ' : 'Not Started'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <LessonSidebar />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            {/* Lesson Header */}
            <div className="hidden lg:block">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                  {activeLesson.title}
                </h1>
                <Badge className={cn(
                  "ml-4",
                  isCompleted && "bg-emerald-500",
                  isInProgress && "bg-blue-500",
                  !progress && "bg-gray-400"
                )}>
                  {isCompleted ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</>
                  ) : isInProgress ? (
                    <><CircleDot className="h-3 w-3 mr-1" /> In Progress</>
                  ) : (
                    <><CircleDot className="h-3 w-3 mr-1" /> Not Started</>
                  )}
                </Badge>
              </div>
              {activeLesson.description && (
                <p className="text-gray-600 dark:text-gray-400">{activeLesson.description}</p>
              )}
            </div>

            {/* Video Player */}
            {embed && (
              <div className="rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-xl bg-black">
                <AspectRatio ratio={16 / 9}>
                  <iframe
                    src={embed}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    onLoad={() => handleVideoPlay(activeLesson.id)}
                  />
                </AspectRatio>
              </div>
            )}

            {/* Lesson Actions */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={activeLessonIndex === 0}
                      className="flex-1"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'السابق' : 'Previous'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleNext}
                      disabled={activeLessonIndex === lessons.length - 1}
                      className="flex-1"
                    >
                      {language === 'ar' ? 'التالي' : 'Next'}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                  {!isCompleted && embed && (
                    <Button
                      variant="default"
                      className={cn(
                        "bg-gradient-to-r hover:opacity-90",
                        isInProgress ? "from-blue-600 to-cyan-600" : "from-gray-600 to-gray-700"
                      )}
                      onClick={() => handleMarkComplete(activeLesson.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'تمييز كمكتمل' : 'Mark Complete'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Content Tabs */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-0">
                <Tabs defaultValue="video" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                    <TabsTrigger value="video" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
                      <Video className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'الفيديو' : 'Video'}
                    </TabsTrigger>
                    {hasAttachments && (
                      <TabsTrigger value="resources" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
                        <FileText className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'الموارد' : 'Resources'}
                      </TabsTrigger>
                    )}
                    {hasAssignments && (
                      <TabsTrigger value="assignments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
                        <FileText className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'الواجبات' : 'Assignments'}
                      </TabsTrigger>
                    )}
                    {(hasQuizzes || lessonQuizzes.length > 0) && (
                      <TabsTrigger value="quizzes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'الاختبارات' : 'Quizzes'}
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Video Tab */}
                  <TabsContent value="video" className="p-6 space-y-4">
                    {activeLesson.description && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{language === 'ar' ? 'الوصف' : 'Description'}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{activeLesson.description}</p>
                      </div>
                    )}
                    {/* Progress Bar for this lesson */}
                    {progress && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">{language === 'ar' ? 'تقدم الدرس' : 'Lesson Progress'}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{progress.progress_percentage || 0}%</span>
                        </div>
                        <Progress value={progress.progress_percentage || 0} className="h-2" />
                      </div>
                    )}
                  </TabsContent>

                  {/* Resources Tab */}
                  {hasAttachments && (
                    <TabsContent value="resources" className="p-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {language === 'ar' ? 'موارد الدرس' : 'Lesson Resources'}
                          </h3>
                          <div className="grid gap-3 md:grid-cols-2">
                            {(attachmentsByLesson[activeLesson.id] || []).map((att: any) => {
                      const type = (att.file_type || '').toLowerCase();
                      const isImage = type === 'image' || /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(att.file_url || '');
                      const isPdf = type === 'pdf' || /\.pdf(\?|$)/i.test(att.file_url || '');
                      return (
                        <a
                          key={att.id}
                          href={att.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:shadow-md transition-all group/att"
                        >
                          {isImage ? (
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900 group-hover/att:bg-green-200 dark:group-hover/att:bg-green-800 transition-colors">
                              <ImageIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                          ) : isPdf ? (
                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900 group-hover/att:bg-red-200 dark:group-hover/att:bg-red-800 transition-colors">
                              <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover/att:bg-gray-200 dark:group-hover/att:bg-gray-600 transition-colors">
                              <FileText className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                            </div>
                          )}
                          <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 group-hover/att:text-blue-600 dark:group-hover/att:text-blue-400 truncate">
                            {att.file_name || 'File'}
                          </span>
                          <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover/att:opacity-100 transition-opacity" />
                        </a>
                      );
                    })}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  )}

                  {/* Assignments Tab */}
                  {hasAssignments && (
                    <TabsContent value="assignments" className="p-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {language === 'ar' ? 'واجبات المادة' : 'Subject Assignments'}
                          </h3>
                          <div className="grid gap-3 md:grid-cols-2">
                            {assignments.map((a: any) => {
                              const sub = submissions[a.id];
                              const dueStr = a.due_date ? new Date(a.due_date).toLocaleDateString() : '';
                              return (
                                <div key={a.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{a.title}</h4>
                                      <p className="text-xs text-muted-foreground">{dueStr && `${language === 'ar' ? 'موعد التسليم: ' : 'Due: '}${dueStr}`}</p>
                                      {a.description && (
                                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.description}</p>
                                      )}
                                      {sub ? (
                                        <div className="mt-2">
                                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{language === 'ar' ? 'تم التسليم' : 'Submitted'}</Badge>
                                          {sub.status === 'graded' && (
                                            <Badge className="ml-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{sub.score}/{a.total_points}</Badge>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="mt-2">
                                          <Badge variant="outline">{language === 'ar' ? 'معلق' : 'Pending'}</Badge>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/assignments/${a.id}/submit`)}>
                                        {sub ? (language === 'ar' ? 'عرض' : 'View') : (language === 'ar' ? 'تسليم' : 'Submit')}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  )}

                  {/* Quizzes Tab */}
                  {(hasQuizzes || lessonQuizzes.length > 0) && (
                    <TabsContent value="quizzes" className="p-6">
                      <div className="space-y-6">
                        {/* Lesson Quizzes */}
                        {lessonQuizzes.length > 0 && (
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                                <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {language === 'ar' ? 'اختبار الدرس' : 'Lesson Quiz'}
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {language === 'ar' ? 'اختبار لـ: ' : 'Quiz for: '}
                                  <span className="font-medium text-purple-600 dark:text-purple-400">{activeLesson.title}</span>
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              {lessonQuizzes.map((q: any) => {
                                const isActive = !q.end_at || new Date(q.end_at) > new Date();
                                const isStarted = q.start_at && new Date(q.start_at) > new Date();
                                const attempts = quizAttempts[q.id] || [];
                                const completedAttempts = attempts.filter((a: any) => a.status === 'submitted' || a.status === 'graded');
                                const isCompleted = completedAttempts.length > 0;
                                const latestAttempt = completedAttempts[0] || null;
                                const remainingAttempts = q.attempts_allowed - attempts.length;
                                const hasRemainingAttempts = remainingAttempts > 0 && isActive && !isStarted;
                                
                                return (
                                  <div 
                                    key={q.id} 
                                    className={cn(
                                      "p-4 rounded-xl border-2 bg-white dark:bg-gray-800 hover:shadow-lg transition-all group",
                                      isCompleted 
                                        ? "border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700" 
                                        : "border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700"
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="font-semibold text-gray-900 dark:text-white">{q.title}</h4>
                                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">
                                            <GraduationCap className="h-3 w-3 mr-1" />
                                            {language === 'ar' ? 'درس' : 'Lesson'}
                                          </Badge>
                                          {isCompleted && (
                                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">
                                              <CheckCircle2 className="h-3 w-3 mr-1" />
                                              {language === 'ar' ? 'مكتمل' : 'Completed'}
                                            </Badge>
                                          )}
                                        </div>
                                        {q.description && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                                            {q.description}
                                          </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                          {q.time_limit_minutes && (
                                            <div className="flex items-center gap-1">
                                              <Clock className="h-3.5 w-3.5" />
                                              <span>{q.time_limit_minutes} {language === 'ar' ? 'دقيقة' : 'min'}</span>
                                            </div>
                                          )}
                                          {q.attempts_allowed && (
                                            <div className="flex items-center gap-1">
                                              <FileText className="h-3.5 w-3.5" />
                                              <span>
                                                {q.attempts_allowed} {language === 'ar' ? (q.attempts_allowed > 1 ? 'محاولات' : 'محاولة') : (q.attempts_allowed > 1 ? 'attempts' : 'attempt')}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        {isCompleted && latestAttempt && (
                                          <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                {language === 'ar' ? 'آخر نتيجة:' : 'Last Result:'}
                                              </span>
                                              {latestAttempt.score !== null && latestAttempt.score !== undefined ? (
                                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                                  {latestAttempt.score}%
                                                </span>
                                              ) : (
                                                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                                  {latestAttempt.status === 'graded' 
                                                    ? (language === 'ar' ? 'تم التصحيح' : 'Graded')
                                                    : (language === 'ar' ? 'قيد التصحيح' : 'Pending')}
                                                </span>
                                              )}
                                            </div>
                                            {latestAttempt.submitted_at && (
                                              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                                {new Date(latestAttempt.submitted_at).toLocaleDateString()}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {!isCompleted && hasRemainingAttempts && (
                                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                            {language === 'ar' 
                                              ? `محاولات متبقية: ${remainingAttempts}` 
                                              : `Remaining attempts: ${remainingAttempts}`}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-purple-100 dark:border-purple-900">
                                      <Badge 
                                        className={cn(
                                          isCompleted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" :
                                          isActive && !isStarted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" :
                                          isActive && isStarted ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                                          "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                        )}
                                      >
                                        {isCompleted ? (
                                          <>
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            {language === 'ar' ? 'مكتمل' : 'Completed'}
                                          </>
                                        ) : isActive && !isStarted ? (
                                          <>
                                            <Play className="h-3 w-3 mr-1" />
                                            {language === 'ar' ? 'متاح' : 'Available'}
                                          </>
                                        ) : isActive && isStarted ? (
                                          <>
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {language === 'ar' ? 'يبدأ قريباً' : 'Starts Soon'}
                                          </>
                                        ) : (
                                          <>
                                            <Lock className="h-3 w-3 mr-1" />
                                            {language === 'ar' ? 'مغلق' : 'Closed'}
                                          </>
                                        )}
                                      </Badge>
                                      {isCompleted ? (
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => router.push(`/dashboard/quizzes/${q.id}/result?classId=${safeClassId}&subjectId=${safeSubjectId}`)}
                                          className="group-hover:scale-105 transition-transform border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                          {language === 'ar' ? 'عرض النتيجة' : 'View Results'}
                                        </Button>
                                      ) : (
                                        <Button 
                                          variant={hasRemainingAttempts ? "default" : "outline"} 
                                          size="sm" 
                                          onClick={() => router.push(`/dashboard/quizzes/${q.id}/take?classId=${safeClassId}&subjectId=${safeSubjectId}`)}
                                          disabled={!hasRemainingAttempts}
                                          className={cn(
                                            hasRemainingAttempts && "bg-purple-600 hover:bg-purple-700 text-white",
                                            "group-hover:scale-105 transition-transform"
                                          )}
                                        >
                                          <Play className="h-3.5 w-3.5 mr-1.5" />
                                          {hasRemainingAttempts 
                                            ? (language === 'ar' ? 'ابدأ الاختبار' : 'Start Quiz') 
                                            : (language === 'ar' ? 'لا توجد محاولات متبقية' : 'No Attempts Left')}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Subject Quizzes */}
                        {hasQuizzes && (
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {language === 'ar' ? 'اختبار المادة' : 'Subject Quiz'}
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {language === 'ar' ? 'اختبار لـ: ' : 'Quiz for: '}
                                  <span className="font-medium text-blue-600 dark:text-blue-400">{subject.subject_name}</span>
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              {quizzes.map((q: any) => {
                                const isActive = !q.end_at || new Date(q.end_at) > new Date();
                                const isStarted = q.start_at && new Date(q.start_at) > new Date();
                                const attempts = quizAttempts[q.id] || [];
                                const completedAttempts = attempts.filter((a: any) => a.status === 'submitted' || a.status === 'graded');
                                const isCompleted = completedAttempts.length > 0;
                                const latestAttempt = completedAttempts[0] || null;
                                const remainingAttempts = q.attempts_allowed - attempts.length;
                                const hasRemainingAttempts = remainingAttempts > 0 && isActive && !isStarted;
                                
                                return (
                                  <div 
                                    key={q.id} 
                                    className={cn(
                                      "p-4 rounded-xl border-2 bg-white dark:bg-gray-800 hover:shadow-lg transition-all group",
                                      isCompleted 
                                        ? "border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700" 
                                        : "border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700"
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="font-semibold text-gray-900 dark:text-white">{q.title}</h4>
                                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">
                                            <BookOpen className="h-3 w-3 mr-1" />
                                            {language === 'ar' ? 'مادة' : 'Subject'}
                                          </Badge>
                                          {isCompleted && (
                                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">
                                              <CheckCircle2 className="h-3 w-3 mr-1" />
                                              {language === 'ar' ? 'مكتمل' : 'Completed'}
                                            </Badge>
                                          )}
                                        </div>
                                        {q.description && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                                            {q.description}
                                          </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                          {q.time_limit_minutes && (
                                            <div className="flex items-center gap-1">
                                              <Clock className="h-3.5 w-3.5" />
                                              <span>{q.time_limit_minutes} {language === 'ar' ? 'دقيقة' : 'min'}</span>
                                            </div>
                                          )}
                                          {q.attempts_allowed && (
                                            <div className="flex items-center gap-1">
                                              <FileText className="h-3.5 w-3.5" />
                                              <span>
                                                {q.attempts_allowed} {language === 'ar' ? (q.attempts_allowed > 1 ? 'محاولات' : 'محاولة') : (q.attempts_allowed > 1 ? 'attempts' : 'attempt')}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        {isCompleted && latestAttempt && (
                                          <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                {language === 'ar' ? 'آخر نتيجة:' : 'Last Result:'}
                                              </span>
                                              {latestAttempt.score !== null && latestAttempt.score !== undefined ? (
                                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                                  {latestAttempt.score}%
                                                </span>
                                              ) : (
                                                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                                  {latestAttempt.status === 'graded' 
                                                    ? (language === 'ar' ? 'تم التصحيح' : 'Graded')
                                                    : (language === 'ar' ? 'قيد التصحيح' : 'Pending')}
                                                </span>
                                              )}
                                            </div>
                                            {latestAttempt.submitted_at && (
                                              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                                {new Date(latestAttempt.submitted_at).toLocaleDateString()}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {!isCompleted && hasRemainingAttempts && (
                                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                            {language === 'ar' 
                                              ? `محاولات متبقية: ${remainingAttempts}` 
                                              : `Remaining attempts: ${remainingAttempts}`}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-blue-100 dark:border-blue-900">
                                      <Badge 
                                        className={cn(
                                          isCompleted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" :
                                          isActive && !isStarted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" :
                                          isActive && isStarted ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                                          "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                        )}
                                      >
                                        {isCompleted ? (
                                          <>
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            {language === 'ar' ? 'مكتمل' : 'Completed'}
                                          </>
                                        ) : isActive && !isStarted ? (
                                          <>
                                            <Play className="h-3 w-3 mr-1" />
                                            {language === 'ar' ? 'متاح' : 'Available'}
                                          </>
                                        ) : isActive && isStarted ? (
                                          <>
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {language === 'ar' ? 'يبدأ قريباً' : 'Starts Soon'}
                                          </>
                                        ) : (
                                          <>
                                            <Lock className="h-3 w-3 mr-1" />
                                            {language === 'ar' ? 'مغلق' : 'Closed'}
                                          </>
                                        )}
                                      </Badge>
                                      {isCompleted ? (
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => router.push(`/dashboard/quizzes/${q.id}/result?classId=${safeClassId}&subjectId=${safeSubjectId}`)}
                                          className="group-hover:scale-105 transition-transform border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                          {language === 'ar' ? 'عرض النتيجة' : 'View Results'}
                                        </Button>
                                      ) : (
                                        <Button 
                                          variant={hasRemainingAttempts ? "default" : "outline"} 
                                          size="sm" 
                                          onClick={() => router.push(`/dashboard/quizzes/${q.id}/take?classId=${safeClassId}&subjectId=${safeSubjectId}`)}
                                          disabled={!hasRemainingAttempts}
                                          className={cn(
                                            hasRemainingAttempts && "bg-blue-600 hover:bg-blue-700 text-white",
                                            "group-hover:scale-105 transition-transform"
                                          )}
                                        >
                                          <Play className="h-3.5 w-3.5 mr-1.5" />
                                          {hasRemainingAttempts 
                                            ? (language === 'ar' ? 'ابدأ الاختبار' : 'Start Quiz') 
                                            : (language === 'ar' ? 'لا توجد محاولات متبقية' : 'No Attempts Left')}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
