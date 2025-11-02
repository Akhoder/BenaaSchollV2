'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AspectRatio } from '@/components/ui/aspect-ratio';
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
  User
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SubjectLessonsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const classId = (params?.classId as string) || '';
  const subjectId = (params?.subjectId as string) || '';
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [subject, setSubject] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attachmentsByLesson, setAttachmentsByLesson] = useState<Record<string, any[]>>({});
  const [lessonsProgress, setLessonsProgress] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (!authLoading && profile && profile.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    if (profile?.role === 'student' && classId && subjectId) {
      loadData().catch(() => {});
    }
  }, [profile, authLoading, router, classId, subjectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get subject details
      const { data: subjects } = await fetchSubjectsForClass(classId);
      const subjectData = (subjects || []).find((s: any) => s.id === subjectId);
      if (!subjectData) {
        toast.error('Subject not found');
        router.push(`/dashboard/my-classes/${classId}`);
        return;
      }
      setSubject(subjectData);

      // Load lessons
      const { data: lessonsData } = await fetchLessonsBySubject(subjectId);
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
      const { data: progress } = await fetchAllLessonProgressForSubject(subjectId);
      const progressMap: Record<string, LessonProgress> = {};
      if (progress) {
        progress.forEach((p: LessonProgress) => {
          progressMap[p.lesson_id] = p;
        });
      }
      setLessonsProgress(progressMap);
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
        // Reload progress
        const { data } = await fetchAllLessonProgressForSubject(subjectId);
        if (data) {
          const progressMap: Record<string, LessonProgress> = {};
          data.forEach((p: LessonProgress) => {
            progressMap[p.lesson_id] = p;
          });
          setLessonsProgress(progressMap);
        }
      }
    }
  };

  const handleMarkComplete = async (lessonId: string) => {
    await updateLessonProgress(lessonId, 100, 'completed');
    toast.success('Lesson marked as completed!');
    
    // Reload progress
    const { data } = await fetchAllLessonProgressForSubject(subjectId);
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

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student' || !subject || lessons.length === 0) {
    return null;
  }

  const activeLesson = lessons[activeLessonIndex];
  const progress = lessonsProgress[activeLesson.id];
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress';
  const embed = getVideoEmbedUrl(activeLesson.video_url);
  const hasAttachments = (attachmentsByLesson[activeLesson.id] || []).length > 0;

  const LessonSidebar = () => (
    <div className="space-y-2" ref={sidebarRef}>
      {lessons.map((lesson, idx) => {
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
                <h4 className={cn(
                  "font-semibold text-sm mb-1 line-clamp-2 transition-colors",
                  isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-white"
                )}>
                  {lesson.title}
                </h4>
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
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Mobile Header */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push(`/dashboard/my-classes/${classId}`)}
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
                  onClick={() => router.push(`/dashboard/my-classes/${classId}`)}
                  className="mb-3"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Subjects
                </Button>
                <div className="p-4 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center gap-3">
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
                      <p className="text-xs text-gray-600 dark:text-gray-400">{lessons.length} Lessons</p>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="border-gray-200 dark:border-gray-800 overflow-hidden">
                <CardContent className="p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                  <LessonSidebar />
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
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleNext}
                      disabled={activeLessonIndex === lessons.length - 1}
                      className="flex-1"
                    >
                      Next
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
                      Mark Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            {hasAttachments && (
              <Card className="border-gray-200 dark:border-gray-800">
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Lesson Resources
                  </p>
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
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
