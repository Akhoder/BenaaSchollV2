'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { School, BookOpen, ChevronRight, Loader2, Video, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { fetchMyEnrolledClassesWithDetails, fetchSubjectsForClass, fetchLessonsBySubject, Lesson, fetchAttachmentsForLessons } from '@/lib/supabase';
import { toast } from 'sonner';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

export default function MyClassesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, any[]>>({});
  const [lessonsBySubject, setLessonsBySubject] = useState<Record<string, Lesson[]>>({});
  const [attachmentsByLesson, setAttachmentsByLesson] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

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
      loadData().catch(() => {});
    }
  }, [profile, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: myClasses, error: cErr } = await fetchMyEnrolledClassesWithDetails();
      if (cErr) {
        console.error(cErr);
        toast.error('Error loading classes');
        return;
      }
      setClasses((myClasses || []) as any[]);

      // Load subjects for each class
      const subs: Record<string, any[]> = {};
      for (const cls of (myClasses || [])) {
        const { data: subjects } = await fetchSubjectsForClass(cls.id);
        subs[cls.id] = (subjects || []) as any[];
      }
      setSubjectsByClass(subs);

      // Load lessons for all subjects
      const less: Record<string, Lesson[]> = {};
      const atts: Record<string, any[]> = {};
      for (const clsId in subs) {
        for (const sub of subs[clsId]) {
          const { data: lessons } = await fetchLessonsBySubject(sub.id);
          less[sub.id] = (lessons || []) as Lesson[];
          if (lessons && lessons.length > 0) {
            const lessonIds = lessons.map((l: Lesson) => l.id);
            const { data: attachments } = await fetchAttachmentsForLessons(lessonIds);
            (attachments || []).forEach((a: any) => {
              if (!atts[a.lesson_id]) atts[a.lesson_id] = [];
              atts[a.lesson_id].push(a);
            });
          }
        }
      }
      setLessonsBySubject(less);
      setAttachmentsByLesson(atts);
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

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || profile.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <School className="h-8 w-8" />
            {t('myClasses') || 'My Classes'}
          </h1>
          <p className="text-muted-foreground mt-2">
            View your enrolled classes, subjects, and lessons
          </p>
        </div>

        {classes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <School className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You are not enrolled in any classes yet.</p>
              <Button className="mt-4" onClick={() => router.push('/dashboard')}>
                Browse Available Classes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {classes.map((cls: any) => (
              <Card key={cls.id} className="overflow-hidden">
                <Collapsible
                  open={expandedClasses[cls.id] || false}
                  onOpenChange={(open) => setExpandedClasses(prev => ({ ...prev, [cls.id]: open }))}
                >
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {cls.image_url && (
                            <img src={cls.image_url} alt={cls.class_name} className="w-16 h-16 rounded-lg object-cover" />
                          )}
                          <div className="text-left">
                            <CardTitle className="text-xl">{cls.class_name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Level: {cls.level} | {cls.teacher?.full_name || 'No teacher'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {(subjectsByClass[cls.id] || []).length} Subjects
                          </Badge>
                          <ChevronRight className={`h-5 w-5 transition-transform ${expandedClasses[cls.id] ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {(subjectsByClass[cls.id] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No subjects in this class.</p>
                      ) : (
                        (subjectsByClass[cls.id] || []).map((sub: any) => (
                          <Card key={sub.id} className="border-l-4 border-l-primary">
                            <Collapsible
                              open={expandedSubjects[sub.id] || false}
                              onOpenChange={(open) => setExpandedSubjects(prev => ({ ...prev, [sub.id]: open }))}
                            >
                              <CollapsibleTrigger className="w-full">
                                <CardHeader className="hover:bg-muted/50 transition-colors cursor-pointer py-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <BookOpen className="h-5 w-5 text-primary" />
                                      <CardTitle className="text-base">{sub.subject_name}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary">
                                        {(lessonsBySubject[sub.id] || []).length} Lessons
                                      </Badge>
                                      <ChevronRight className={`h-4 w-4 transition-transform ${expandedSubjects[sub.id] ? 'rotate-90' : ''}`} />
                                    </div>
                                  </div>
                                </CardHeader>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <CardContent className="pt-0 space-y-3">
                                  {(lessonsBySubject[sub.id] || []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-2">No lessons yet.</p>
                                  ) : (
                                    (lessonsBySubject[sub.id] || []).map((lesson: Lesson) => {
                                      const embed = getVideoEmbedUrl(lesson.video_url);
                                      return (
                                        <Card key={lesson.id} className="bg-muted/30">
                                          <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold">{lesson.title}</CardTitle>
                                            {lesson.description && (
                                              <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                                            )}
                                          </CardHeader>
                                          <CardContent className="pt-0 space-y-3">
                                            {embed && (
                                              <div>
                                                <AspectRatio ratio={16 / 9}>
                                                  <iframe
                                                    src={embed}
                                                    className="w-full h-full rounded"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                    allowFullScreen
                                                    loading="lazy"
                                                  />
                                                </AspectRatio>
                                              </div>
                                            )}
                                            {lesson.video_url && !embed && (
                                              <a href={lesson.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-primary underline">
                                                <Video className="h-4 w-4 mr-1" />
                                                Watch Video
                                                <ExternalLink className="h-3 w-3 ml-1" />
                                              </a>
                                            )}
                                            {(attachmentsByLesson[lesson.id] || []).length > 0 && (
                                              <div>
                                                <p className="text-xs font-medium mb-2">Attachments:</p>
                                                <div className="space-y-2">
                                                  {(attachmentsByLesson[lesson.id] || []).map((att: any) => {
                                                    const type = (att.file_type || '').toLowerCase();
                                                    const isImage = type === 'image' || /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(att.file_url || '');
                                                    const isPdf = type === 'pdf' || /\.pdf(\?|$)/i.test(att.file_url || '');
                                                    return (
                                                      <div key={att.id} className="flex items-center gap-2 p-2 bg-background rounded border">
                                                        {isImage ? (
                                                          <ImageIcon className="h-4 w-4 text-emerald-600" />
                                                        ) : isPdf ? (
                                                          <FileText className="h-4 w-4 text-red-600" />
                                                        ) : (
                                                          <FileText className="h-4 w-4 text-slate-600" />
                                                        )}
                                                        <a href={att.file_url} target="_blank" rel="noreferrer" className="text-sm underline flex-1">
                                                          {att.file_name || att.file_url}
                                                        </a>
                                                        {isImage && (
                                                          <div className="rounded overflow-hidden border max-w-[200px]">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={att.file_url} alt={att.file_name || 'image'} className="max-h-24 w-auto object-contain" />
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      );
                                    })
                                  )}
                                </CardContent>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        ))
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

