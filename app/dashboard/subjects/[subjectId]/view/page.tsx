'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
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
import { 
  BookOpen, 
  Loader2, 
  Video, 
  FileText, 
  Image as ImageIcon, 
  ExternalLink, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  Filter,
  X,
  Edit,
  Trash2,
  Settings,
  MessageCircle
} from 'lucide-react';
import { 
  fetchLessonsBySubject, 
  Lesson, 
  fetchAttachmentsForLessons,
} from '@/lib/supabase';
import { fetchQuizzesForSubject, fetchQuizzesForLesson } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import * as api from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SubjectDiscussion } from '@/components/dashboard/SubjectDiscussion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function TeacherSubjectViewPage() {
  const params = useParams();
  const router = useRouter();
  const authContext = useAuth();
  const languageContext = useLanguage();
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const profile = authContext?.profile ?? null;
  const authLoading = authContext?.loading ?? true;
  const t = languageContext?.t ?? (() => '');
  const language = languageContext?.language ?? 'en';
  const dateLocale = useMemo(
    () => (language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US'),
    [language]
  );
  
  const subjectId = params && typeof params.subjectId === 'string' ? params.subjectId : null;

  const [subject, setSubject] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attachmentsByLesson, setAttachmentsByLesson] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [lessonQuizzes, setLessonQuizzes] = useState<any[]>([]);
  const [quizzesByLesson, setQuizzesByLesson] = useState<Record<string, any[]>>({});
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');
  const [lessonStatusFilter, setLessonStatusFilter] = useState<'all' | 'published' | 'draft' | 'scheduled'>('all');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editStatus, setEditStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    if (authLoading) return;
    if (!profile) {
      router.push('/login');
      return;
    }
    if (profile.role !== 'teacher' && profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    if (subjectId) {
      loadData().catch((err) => {
        console.error('Error loading data:', err);
      });
    }
  }, [profile, authLoading, router, subjectId]);

  useEffect(() => {
    const current = lessons[activeLessonIndex];
    if (current?.id) {
      if (quizzesByLesson[current.id]) {
        setLessonQuizzes(quizzesByLesson[current.id]);
      } else {
        fetchQuizzesForLesson(current.id).then(({ data }) => {
          setLessonQuizzes(data || []);
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

  const filteredLessons = useMemo(() => {
    let filtered = lessons;
    
    if (lessonSearchQuery.trim()) {
      filtered = filtered.filter(lesson =>
        lesson.title.toLowerCase().includes(lessonSearchQuery.toLowerCase()) ||
        (lesson.description?.toLowerCase().includes(lessonSearchQuery.toLowerCase()) || false)
      );
    }
    
    if (lessonStatusFilter !== 'all') {
      filtered = filtered.filter(lesson => {
        const status = lesson.status || 'draft';
        return status === lessonStatusFilter;
      });
    }
    
    return filtered;
  }, [lessons, lessonSearchQuery, lessonStatusFilter]);

  const loadData = async () => {
    if (!subjectId) return;
    const currentSubjectId = subjectId as string;
    
    try {
      setLoading(true);
      
      // Get subject details
      const { data: subjectData, error: subjectError } = await supabase
        .from('class_subjects')
        .select('subject_name, class_id, classes(class_name)')
        .eq('id', currentSubjectId)
        .single();
      
      if (subjectError || !subjectData) {
        toast.error(t('errorLoadingSubjectInfo' as TranslationKey));
        router.push('/dashboard/subjects');
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

      // Load quizzes
      const { data: qz } = await fetchQuizzesForSubject(currentSubjectId);
      setQuizzes(qz || []);

      // Load quizzes for all lessons
      if (lessonsList.length > 0) {
        const lessonIds = lessonsList.map(l => l.id);
        const quizzesMap: Record<string, any[]> = {};
        
        const quizPromises = lessonIds.map(async (lessonId) => {
          const { data } = await fetchQuizzesForLesson(lessonId);
          return { lessonId, quizzes: data || [] };
        });
        
        const quizResults = await Promise.all(quizPromises);
        quizResults.forEach(({ lessonId, quizzes: qzs }) => {
          if (qzs.length > 0) {
            quizzesMap[lessonId] = qzs;
          }
        });
        
        setQuizzesByLesson(quizzesMap);
        
        if (lessonsList.length > 0 && activeLessonIndex === 0) {
          const firstLessonId = lessonsList[0].id;
          setLessonQuizzes(quizzesMap[firstLessonId] || []);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error(t('errorLoadingLessons' as TranslationKey));
    } finally {
      setLoading(false);
    }
  };

  const getVideoEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (host.includes('youtube.com')) {
        const v = u.searchParams.get('v');
        if (v) return `https://www.youtube.com/embed/${v}`;
      } else if (host === 'youtu.be') {
        const id = u.pathname.replace('/', '');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (host.includes('vimeo.com')) {
        const pathParts = u.pathname.split('/').filter(Boolean);
        const maybeId = pathParts[pathParts.length - 1];
        const id = pathParts.includes('video') ? pathParts[pathParts.length - 1] : maybeId;
        if (id && /^\d+$/.test(id)) {
          return `https://player.vimeo.com/video/${id}`;
        }
      }
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

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setEditTitle(lesson.title);
    setEditDescription(lesson.description || '');
    setEditVideoUrl(lesson.video_url || '');
    setEditStatus((lesson.status || 'draft') as 'draft' | 'published' | 'scheduled');
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLesson) return;
    try {
      const { error } = await api.updateLesson(editingLesson.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null as any,
        video_url: editVideoUrl.trim() || null as any,
        status: editStatus,
      });
      if (error) {
        toast.error(t('failedToSave' as TranslationKey));
        return;
      }
      toast.success(t('saved' as TranslationKey));
      setShowEditDialog(false);
      setEditingLesson(null);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(t('errorOccurred' as TranslationKey));
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm(t('confirmDelete' as TranslationKey))) return;
    try {
      setDeletingLesson(lessonId);
      const { error } = await api.deleteLesson(lessonId);
      if (error) {
        toast.error(t('deleteFailed' as TranslationKey));
        return;
      }
      toast.success(t('deleted' as TranslationKey));
      await loadData();
      if (activeLessonIndex >= lessons.length - 1 && activeLessonIndex > 0) {
        setActiveLessonIndex(activeLessonIndex - 1);
      }
    } catch (err) {
      console.error(err);
      toast.error(t('errorOccurred' as TranslationKey));
    } finally {
      setDeletingLesson(null);
    }
  };

  const handleLessonClick = (index: number) => {
    setActiveLessonIndex(index);
    setSheetOpen(false);
  };

  const handlePrevious = () => {
    if (activeLessonIndex > 0) {
      setActiveLessonIndex(activeLessonIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeLessonIndex < lessons.length - 1) {
      setActiveLessonIndex(activeLessonIndex + 1);
      if (sidebarRef.current) {
        const activeElement = sidebarRef.current.children[activeLessonIndex + 1] as HTMLElement;
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  };

  if (subjectId === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

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

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
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

  const embed = getVideoEmbedUrl(activeLesson.video_url);
  const hasAttachments = (attachmentsByLesson[activeLesson.id] || []).length > 0;
  const hasQuizzes = quizzes.length > 0;
  const status = activeLesson.status || 'draft';

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
            const isActive = idx === activeLessonIndex;
            const lessonStatus = lesson.status || 'draft';

            return (
              <button
                key={lesson.id}
                onClick={() => handleLessonClick(idx)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition-all duration-200 border-2",
                  isActive 
                    ? "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-blue-500 dark:border-blue-600 shadow-md" 
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow transition-all",
                    isActive && "bg-blue-500 text-white shadow-lg scale-110",
                    !isActive && lessonStatus === 'published' && "bg-emerald-500 text-white",
                    !isActive && lessonStatus === 'draft' && "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300",
                    !isActive && lessonStatus === 'scheduled' && "bg-blue-400 text-white"
                  )}>
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn(
                        "font-semibold text-sm line-clamp-2 transition-colors flex-1",
                        isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-white"
                      )}>
                        {lesson.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Badge className={cn(
                        "text-xs",
                        lessonStatus === 'published' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
                        lessonStatus === 'draft' && "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
                        lessonStatus === 'scheduled' && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      )}>
                        {lessonStatus === 'published' ? (language === 'ar' ? 'منشور' : 'Published') :
                         lessonStatus === 'draft' ? (language === 'ar' ? 'مسودة' : 'Draft') :
                         (language === 'ar' ? 'مجدول' : 'Scheduled')}
                      </Badge>
                    </div>
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
        {/* Mobile Header */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push(`/dashboard/subjects/${safeSubjectId}/lessons`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
          
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'الدروس' : 'Lessons'}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{subject.subject_name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{lessons.length} {language === 'ar' ? 'درس' : 'Lessons'}</p>
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
                  onClick={() => router.push(`/dashboard/subjects/${safeSubjectId}/lessons`)}
                  className="mb-3"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'رجوع للإدارة' : 'Back to Management'}
                </Button>
                <div className="p-4 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">{subject.subject_name}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{lessons.length} {language === 'ar' ? 'درس' : 'Lessons'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="border-gray-200 dark:border-gray-800 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">{language === 'ar' ? 'الدروس' : 'Lessons'}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
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
                        <SelectItem value="published">{language === 'ar' ? 'منشورة' : 'Published'}</SelectItem>
                        <SelectItem value="draft">{language === 'ar' ? 'مسودات' : 'Drafts'}</SelectItem>
                        <SelectItem value="scheduled">{language === 'ar' ? 'مجدولة' : 'Scheduled'}</SelectItem>
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
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "ml-4",
                    status === 'published' && "bg-emerald-500",
                    status === 'draft' && "bg-gray-400",
                    status === 'scheduled' && "bg-blue-500"
                  )}>
                    {status === 'published' ? (language === 'ar' ? 'منشور' : 'Published') :
                     status === 'draft' ? (language === 'ar' ? 'مسودة' : 'Draft') :
                     (language === 'ar' ? 'مجدول' : 'Scheduled')}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditLesson(activeLesson)}
                    className="ml-2"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'تعديل' : 'Edit'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteLesson(activeLesson.id)}
                    disabled={deletingLesson === activeLesson.id}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'حذف' : 'Delete'}
                  </Button>
                </div>
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleEditLesson(activeLesson)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'تعديل الدرس' : 'Edit Lesson'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteLesson(activeLesson.id)}
                      disabled={deletingLesson === activeLesson.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'حذف' : 'Delete'}
                    </Button>
                  </div>
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
                    {(hasQuizzes || lessonQuizzes.length > 0) && (
                      <TabsTrigger value="quizzes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
                        <BookOpen className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'الاختبارات' : 'Quizzes'}
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="discussion" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'النقاش' : 'Discussion'}
                    </TabsTrigger>
                  </TabsList>

                  {/* Video Tab */}
                  <TabsContent value="video" className="p-6 space-y-4">
                    {activeLesson.description && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{language === 'ar' ? 'الوصف' : 'Description'}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{activeLesson.description}</p>
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

                  {/* Quizzes Tab */}
                  {(hasQuizzes || lessonQuizzes.length > 0) && (
                    <TabsContent value="quizzes" className="p-6">
                      <div className="space-y-6">
                        {lessonQuizzes.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                              {language === 'ar' ? 'اختبارات الدرس' : 'Lesson Quizzes'}
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                              {lessonQuizzes.map((q: any) => (
                                <Card key={q.id} className="border-gray-200 dark:border-gray-700">
                                  <CardHeader>
                                    <CardTitle className="text-base">{q.title}</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => router.push(`/dashboard/quizzes/${q.id}/edit`)}
                                    >
                                      <Settings className="h-4 w-4 mr-2" />
                                      {language === 'ar' ? 'تعديل' : 'Edit'}
                                    </Button>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                        {hasQuizzes && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                              {language === 'ar' ? 'اختبارات المادة' : 'Subject Quizzes'}
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                              {quizzes.map((q: any) => (
                                <Card key={q.id} className="border-gray-200 dark:border-gray-700">
                                  <CardHeader>
                                    <CardTitle className="text-base">{q.title}</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => router.push(`/dashboard/quizzes/${q.id}/edit`)}
                                    >
                                      <Settings className="h-4 w-4 mr-2" />
                                      {language === 'ar' ? 'تعديل' : 'Edit'}
                                    </Button>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  )}

                  {/* Discussion Tab */}
                  <TabsContent value="discussion" className="p-6">
                    <SubjectDiscussion
                      subjectId={safeSubjectId}
                      subjectName={subject.subject_name}
                      t={t}
                      dateLocale={dateLocale}
                      currentUserId={profile.id}
                      currentUserRole={profile.role as 'admin' | 'teacher' | 'student'}
                      variant="card"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تعديل الدرس' : 'Edit Lesson'}</DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'قم بتعديل تفاصيل الدرس' : 'Update lesson details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">{language === 'ar' ? 'العنوان' : 'Title'}</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">{language === 'ar' ? 'الوصف' : 'Description'}</label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">{language === 'ar' ? 'رابط الفيديو' : 'Video URL'}</label>
              <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">{language === 'ar' ? 'الحالة' : 'Status'}</label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
                  <SelectItem value="published">{language === 'ar' ? 'منشور' : 'Published'}</SelectItem>
                  <SelectItem value="scheduled">{language === 'ar' ? 'مجدول' : 'Scheduled'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveEdit}>
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

