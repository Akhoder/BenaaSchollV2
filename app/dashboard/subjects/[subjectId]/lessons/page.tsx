'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import * as api from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import type { AttachmentType, Lesson } from '@/lib/supabase';
import { toast } from 'sonner';
import { Image as ImageIcon, FileText, File as FileIcon, Loader2, Calendar, GripVertical, BookOpen, Plus, Video, PlayCircle, FileVideo, CheckCircle2, XCircle, Search, Filter, ArrowLeft } from 'lucide-react';
import { ContentGenerator } from '@/components/ContentGenerator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LessonStatus } from '@/lib/supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const FILE_TYPE_MAP: Record<string, AttachmentType> = {
  'png': 'image',
  'jpg': 'image',
  'jpeg': 'image',
  'gif': 'image',
  'webp': 'image',
  'pdf': 'pdf',
  'ppt': 'ppt',
  'pptx': 'ppt',
  'doc': 'word',
  'docx': 'word'
};

interface AttachmentDraft {
  file_url: string;
  file_name?: string;
  file_type: AttachmentType;
}

interface SortableLessonProps {
  lesson: Lesson;
  attachments: any[];
  editingLessonId: string | null;
  editTitle: string;
  editDescription: string;
  editVideoUrl: string;
  imageErrors: Set<string>;
  lessonUploadBusy: Record<string, boolean>;
  addUrlByLesson: Record<string, string>;
  onEditStart: (lesson: Lesson) => void;
  onEditTitle: (value: string) => void;
  onEditDescription: (value: string) => void;
  onEditVideoUrl: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: LessonStatus) => void;
  onRemoveAttachment: (id: string) => void;
  onUploadAttachmentFile: (lessonId: string, file: File) => void;
  onAddAttachmentUrl: (lessonId: string) => void;
  onSetAddUrl: (lessonId: string, url: string) => void;
  getStatusBadge: (status?: LessonStatus) => JSX.Element;
  getVideoEmbedUrl: (url?: string | null) => string | null;
  t: (key: any) => string;
}

function SortableLesson({
  lesson: l,
  attachments: atts,
  editingLessonId,
  editTitle,
  editDescription,
  editVideoUrl,
  imageErrors,
  lessonUploadBusy,
  addUrlByLesson,
  onEditStart,
  onEditTitle,
  onEditDescription,
  onEditVideoUrl,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onUpdateStatus,
  onRemoveAttachment,
  onUploadAttachmentFile,
  onAddAttachmentUrl,
  onSetAddUrl,
  getStatusBadge,
  getVideoEmbedUrl,
  t,
}: SortableLessonProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: l.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasVideo = !!l.video_url;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="card-hover overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <button
                {...attributes}
                {...listeners}
                className="mt-1 p-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label={t('dragHandle')}
              >
                <GripVertical className="h-5 w-5" />
              </button>
              <CardTitle className="text-lg font-display font-semibold line-clamp-1 flex-1">{l.title}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              {getStatusBadge(l.status)}
              {hasVideo && (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  {t('video')}
                </Badge>
              )}
              {atts.length > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {atts.length} {t('attachments')}
              </Badge>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">{t('status')}:</span>
            <Select
              value={l.status || 'draft'}
              onValueChange={(value) => onUpdateStatus(l.id, value as LessonStatus)}
            >
              <SelectTrigger className="h-8 w-32 text-xs input-modern">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('draft')}</SelectItem>
                <SelectItem value="published">{t('published')}</SelectItem>
                <SelectItem value="scheduled">{t('scheduled')}</SelectItem>
              </SelectContent>
            </Select>
            {l.status === 'scheduled' && l.scheduled_at && (
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="h-3 w-3" />
                <span>{new Date(l.scheduled_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {editingLessonId === l.id ? (
            <div className="space-y-4">
            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('title')}</label>
              <Input value={editTitle} onChange={(e) => onEditTitle(e.target.value)} className="input-modern" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('description')}</label>
                <Textarea value={editDescription} onChange={(e) => onEditDescription(e.target.value)} className="input-modern" rows={3} />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('videoUrl')}</label>
              <Input value={editVideoUrl} onChange={(e) => onEditVideoUrl(e.target.value)} placeholder="https://..." className="input-modern" />
              </div>

              {/* Current Attachments */}
              {atts.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('currentAttachments')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {atts.map((a: any) => {
                      const type = (a.file_type || '').toLowerCase();
                      const fileUrl = a.file_url || '';
                      const isImage = type === 'image' || /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(fileUrl);
                      const isPdf = type === 'pdf' || /\.pdf(\?|$)/i.test(fileUrl);
                      
                      return (
                        <div key={a.id} className="border rounded p-2 text-xs overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative group">
                          {isImage ? (
                            <div className="space-y-1">
                              <div className="w-full h-16 bg-slate-100 dark:bg-slate-800 rounded border overflow-hidden relative flex items-center justify-center">
                                {imageErrors.has(a.id || fileUrl) ? (
                                  <ImageIcon className="h-6 w-6 text-slate-400" />
                                ) : (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img 
                                    src={fileUrl} 
                                    alt={a.file_name || t('attachments')} 
                                    className="w-full h-full object-cover"
                                    onError={() => onRemoveAttachment(a.id)}
                                  />
                                )}
                              </div>
                              <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="block truncate text-blue-600 hover:underline"
                                title={a.file_name || fileUrl}
                              >
                                {a.file_name || t('image')}
                              </a>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center justify-center h-16 bg-slate-100 dark:bg-slate-800 rounded border">
                                {isPdf ? (
                                  <FileText className="h-6 w-6 text-red-600" />
                                ) : (
                                  <FileIcon className="h-6 w-6 text-slate-600" />
                                )}
                              </div>
                              <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="block truncate text-blue-600 hover:underline"
                                title={a.file_name || fileUrl}
                              >
                                {a.file_name || fileUrl}
                              </a>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            onClick={() => onRemoveAttachment(a.id)}
                          >
                            ×
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add New Attachments */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('addAttachment')}</label>
                
                {/* Upload File */}
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*,.pdf,.ppt,.pptx,.doc,.docx"
                    onChange={(e) => {
                      if (!e.target.files || e.target.files.length === 0) return;
                      const file = e.target.files[0];
                      const maxBytes = 20 * 1024 * 1024;
                      if (file.size > maxBytes) {
                        toast.error(t('fileTooLarge'));
                        return;
                      }
                      onUploadAttachmentFile(l.id, file);
                      e.target.value = '';
                    }}
                    className="block w-full text-sm"
                    disabled={lessonUploadBusy[l.id]}
                  />
                  {lessonUploadBusy[l.id] && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('uploading')}...
                    </div>
                  )}
                </div>

                {/* Add URL */}
              <div className="flex gap-2">
                  <Input
                    value={addUrlByLesson[l.id] || ''}
                    onChange={(e) => onSetAddUrl(l.id, e.target.value)}
                    placeholder={t('fileUrl')}
                    className="input-modern flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => onAddAttachmentUrl(l.id)}
                    disabled={!addUrlByLesson[l.id]?.trim()}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {t('add')}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Button onClick={onSaveEdit} className="bg-primary hover:bg-primary/90 text-white flex-1">{t('save')}</Button>
                <Button variant="outline" onClick={onCancelEdit} className="flex-1">{t('cancel')}</Button>
              </div>
            </div>
          ) : (
            <>
              {l.description && (
                <div className="text-sm text-muted-foreground mt-1 line-clamp-3">{l.description}</div>
              )}
              {(() => {
                const embed = getVideoEmbedUrl(l.video_url);
                if (embed) {
                  return (
                    <div className="mt-3">
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
                  );
                }
                if (l.video_url) {
                  return (
                    <a className="text-sm text-emerald-600 underline mt-2 inline-block" href={l.video_url!} target="_blank" rel="noreferrer">
                      {t('viewVideo')}
                    </a>
                  );
                }
                return null;
              })()}

              {atts.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {atts.slice(0, 4).map((a: any) => {
                      const type = (a.file_type || '').toLowerCase();
                      const fileUrl = a.file_url || '';
                      const isImage = type === 'image' || /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(fileUrl);
                      const isPdf = type === 'pdf' || /\.pdf(\?|$)/i.test(fileUrl);
                      
                      return (
                        <div key={a.id} className="border rounded p-2 text-xs overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          {isImage ? (
                            <div className="space-y-1">
                              <div className="w-full h-16 bg-slate-100 dark:bg-slate-800 rounded border overflow-hidden relative flex items-center justify-center">
                                {imageErrors.has(a.id || fileUrl) ? (
                                  <ImageIcon className="h-6 w-6 text-slate-400" />
                                ) : (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img 
                                    src={fileUrl} 
                                    alt={a.file_name || t('attachments')} 
                                    className="w-full h-full object-cover"
                                    onError={() => onRemoveAttachment(a.id)}
                                  />
                                )}
                              </div>
                              <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="block truncate text-blue-600 hover:underline"
                                title={a.file_name || fileUrl}
                              >
                                {a.file_name || t('image')}
                              </a>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center justify-center h-16 bg-slate-100 dark:bg-slate-800 rounded border">
                                {isPdf ? (
                                  <FileText className="h-6 w-6 text-red-600" />
                                ) : (
                                  <FileIcon className="h-6 w-6 text-slate-600" />
                                )}
                              </div>
                              <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="block truncate text-blue-600 hover:underline"
                                title={a.file_name || fileUrl}
                              >
                                {a.file_name || fileUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {atts.length > 4 && (
                    <div className="text-xs text-slate-500 text-center pt-1">
                      +{atts.length - 4} {t('more')}...
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Button variant="secondary" size="sm" onClick={() => onEditStart(l)} className="flex-1">
                  {t('edit')}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(l.id)} className="flex-1">
                  {t('delete')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubjectLessonsPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.subjectId as string) || '';
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [attachmentsByLesson, setAttachmentsByLesson] = useState<Record<string, AttachmentDraft[] & any[]>>({});
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');
  const [filterHasVideo, setFilterHasVideo] = useState<'all' | 'with' | 'without'>('all');
  
  const debouncedQuery = useDebounce(lessonSearchQuery.trim().toLowerCase(), 300);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [isUploadingIdx, setIsUploadingIdx] = useState<number | null>(null);
  const [lessonUploadBusy, setLessonUploadBusy] = useState<Record<string, boolean>>({});
  const [addUrlByLesson, setAddUrlByLesson] = useState<Record<string, string>>({});
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [subjectInfo, setSubjectInfo] = useState<{ subject_name: string; class_name: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (subjectId) {
      loadSubjectInfo();
      loadLessons().catch(() => {});
    }
  }, [subjectId]);

  const loadSubjectInfo = async () => {
    try {
      // First, get the subject with class_id
      const { data: subjectData, error: subjectError } = await supabase
        .from('class_subjects')
        .select('subject_name, class_id')
        .eq('id', subjectId)
        .single();
      
      if (subjectError) {
        console.error('Error loading subject info:', subjectError);
        toast.error(t('errorLoadingLessons'));
        return;
      }
      
      if (!subjectData) {
        console.error('Subject not found');
        return;
      }
      
      let className = '';
      // Then, get the class name if class_id exists
      if (subjectData.class_id) {
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('class_name')
          .eq('id', subjectData.class_id)
          .single();
        
        if (!classError && classData) {
          className = classData.class_name || '';
        }
      }
      
      setSubjectInfo({
        subject_name: subjectData.subject_name || '',
        class_name: className
      });
    } catch (err) {
      console.error('Error loading subject info:', err);
      toast.error(t('errorLoadingSubjectInfo'));
    }
  };

  const loadLessons = async () => {
    try {
      setLoadingLessons(true);
    const { data, error } = await api.fetchLessonsBySubject(subjectId);
    if (error) {
      console.error(error);
      toast.error(t('errorLoadingLessons'));
      return;
    }
    const list = (data || []) as Lesson[];
    setLessons(list);
    const ids = list.map(l => l.id);
      if (ids.length > 0) {
    const { data: atts } = await api.fetchAttachmentsForLessons(ids);
    const map: Record<string, any[]> = {};
    (atts || []).forEach((a: any) => {
      if (!map[a.lesson_id]) map[a.lesson_id] = [];
      map[a.lesson_id].push(a);
    });
    setAttachmentsByLesson(map);
      } else {
        setAttachmentsByLesson({});
      }
    } finally {
      setLoadingLessons(false);
    }
  };

  const onAddAttachment = () => {
    setAttachments([...
      attachments,
      { file_url: '', file_name: '', file_type: 'pdf' }
    ]);
  };

  const onRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const onChangeAttachment = (index: number, field: keyof AttachmentDraft, value: string) => {
    const next = attachments.slice();
    // @ts-expect-error narrow assignment
    next[index][field] = value;
    setAttachments(next);
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t('titleRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const { data: newLesson, error } = await api.createLesson({
        subject_id: subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
      });
      if (error || !newLesson) {
        console.error(error);
        toast.error(t('failedToCreateLesson'));
        setSubmitting(false);
        return;
      }

      // Add attachments if any
      const validAttachments = attachments.filter(a => a.file_url.trim());
      if (validAttachments.length > 0) {
        const results = await Promise.all(
          validAttachments.map(att =>
            api.addLessonAttachment({
              lesson_id: newLesson.id,
              file_url: att.file_url.trim(),
              file_name: att.file_name?.trim() || undefined,
              file_type: att.file_type,
            })
          )
        );
        const anyError = results.find(r => r.error);
        if (anyError) {
          console.error(anyError.error);
          toast.error(t('lessonSavedSomeAttachmentsFailed'));
        }
      }

      toast.success(t('lessonCreated'));
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setAttachments([]);
      setShowAddDialog(false);
      await loadLessons();
    } finally {
      setSubmitting(false);
    }
  };

  const onUploadAttachmentFile = async (file: File, idx: number) => {
    if (!user) {
      toast.error(t('pleaseLoginFirst'));
      return;
    }
    try {
      setIsUploadingIdx(idx);
      const { data, error } = await api.uploadLessonAttachmentFile(file, user.id);
      if (error || !data) {
        toast.error((error as any)?.message || t('uploadFailed'));
        return;
      }
      onChangeAttachment(idx, 'file_url', data.publicUrl);
      if (!attachments[idx].file_name) {
        onChangeAttachment(idx, 'file_name', file.name);
      }
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      onChangeAttachment(idx, 'file_type', FILE_TYPE_MAP[ext] || 'pdf');
      toast.success(t('uploaded'));
    } catch (e: any) {
      toast.error(e?.message || t('uploadFailed'));
    } finally {
      setIsUploadingIdx(null);
    }
  };

  const uploadAttachmentForLesson = async (lessonId: string, file: File) => {
    if (!user) {
      toast.error(t('pleaseLoginFirst'));
      return;
    }
    try {
      setLessonUploadBusy(prev => ({ ...prev, [lessonId]: true }));
      const { data, error } = await api.uploadLessonAttachmentFile(file, user.id);
      if (error || !data) {
        toast.error((error as any)?.message || t('uploadFailed'));
        return;
      }
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const { error: addErr } = await api.addLessonAttachment({
        lesson_id: lessonId,
        file_url: data.publicUrl,
        file_name: file.name,
        file_type: FILE_TYPE_MAP[ext] || 'pdf',
      });
      if (addErr) {
        toast.error(t('failedToSave'));
        return;
      }
      toast.success(t('saved'));
      await loadLessons();
    } finally {
      setLessonUploadBusy(prev => ({ ...prev, [lessonId]: false }));
    }
  };

  const addAttachmentUrlForLesson = async (lessonId: string) => {
    const url = (addUrlByLesson[lessonId] || '').trim();
    if (!url) {
      toast.error(`${t('fileUrl')} ${t('isRequired')}`);
      return;
    }
    const lower = url.toLowerCase();
    let fileType: AttachmentType = 'pdf';
    if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp)(\?|$)/.test(lower)) fileType = 'image';
    else if (/(\.ppt|\.pptx)(\?|$)/.test(lower)) fileType = 'ppt';
    else if (/(\.doc|\.docx)(\?|$)/.test(lower)) fileType = 'word';
    const { error } = await api.addLessonAttachment({
      lesson_id: lessonId,
      file_url: url,
      file_name: undefined,
      file_type: fileType,
    });
    if (error) {
      toast.error(t('failedToSave'));
      return;
    }
    toast.success(t('saved'));
    setAddUrlByLesson(prev => ({ ...prev, [lessonId]: '' }));
    await loadLessons();
  };

  const startEdit = (l: Lesson) => {
    setEditingLessonId(l.id);
    setEditTitle(l.title);
    setEditDescription(l.description || '');
    setEditVideoUrl(l.video_url || '');
  };

  const cancelEdit = () => {
    setEditingLessonId(null);
    setEditTitle('');
    setEditDescription('');
    setEditVideoUrl('');
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
        // playlist or other formats → fallback
      } else if (host === 'youtu.be') {
        const id = u.pathname.replace('/', '');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      // Vimeo
      if (host.includes('vimeo.com')) {
        // formats: vimeo.com/VIDEO_ID or player.vimeo.com/video/VIDEO_ID
        const pathParts = u.pathname.split('/').filter(Boolean);
        const maybeId = pathParts[pathParts.length - 1];
        const id = pathParts.includes('video') ? pathParts[pathParts.length - 1] : maybeId;
        if (id && /^\d+$/.test(id)) {
          return `https://player.vimeo.com/video/${id}`;
        }
      }
      // Google Drive: https://drive.google.com/file/d/FILE_ID/view
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

  const saveEdit = async () => {
    if (!editingLessonId) return;
    const { error } = await api.updateLesson(editingLessonId, {
      title: editTitle.trim(),
      description: editDescription.trim() || null as any,
      video_url: editVideoUrl.trim() || null as any,
    });
    if (error) {
      toast.error(t('failedToSave'));
      return;
    }
    toast.success(t('saved'));
    cancelEdit();
    await loadLessons();
  };

  const removeLesson = async (id: string) => {
    const { error } = await api.deleteLesson(id);
    if (error) {
      toast.error(t('deleteFailed'));
      return;
    }
    toast.success(t('deleted'));
    await loadLessons();
  };

  const removeAttachment = async (id: string) => {
    const { error } = await api.deleteLessonAttachment(id);
    if (error) {
      toast.error(t('deleteFailed'));
      return;
    }
    toast.success(t('deleted'));
    await loadLessons();
  };

  const updateLessonStatus = async (lessonId: string, newStatus: LessonStatus) => {
    try {
      const { error } = await api.updateLesson(lessonId, { status: newStatus });
      if (error) {
        toast.error(t('failedToUpdateStatus'));
        return;
      }
      toast.success(t('statusUpdated'));
      await loadLessons();
    } catch (err) {
      toast.error(t('errorUpdatingStatus'));
    }
  };

  const getStatusBadge = useCallback((status?: LessonStatus) => {
    if (!status) status = 'draft';
    const statusConfig = {
      draft: { label: t('draft'), className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      published: { label: t('published'), className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      scheduled: { label: t('scheduled'), className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  }, [t]);

  const filteredLessons = useMemo(() => {
    return (lessons || []).filter(l => {
      const q = debouncedQuery;
      const matchesQuery = !q || (l.title || '').toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q);
      if (!matchesQuery) return false;
      const hasVideo = !!l.video_url;
      if (filterHasVideo === 'with' && !hasVideo) return false;
      if (filterHasVideo === 'without' && hasVideo) return false;
      return true;
    });
  }, [lessons, debouncedQuery, filterHasVideo]);

  const stats = useMemo(() => {
    return {
      total: lessons.length,
      published: lessons.filter(l => l.status === 'published').length,
      draft: lessons.filter(l => l.status === 'draft' || !l.status).length,
      withVideo: lessons.filter(l => !!l.video_url).length,
      withoutVideo: lessons.filter(l => !l.video_url).length,
    };
  }, [lessons]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Update local state immediately for better UX
    const newLessons = arrayMove(lessons, oldIndex, newIndex);
    setLessons(newLessons);

    // Save to database
    try {
      const lessonIds = newLessons.map((l) => l.id);
      const { error } = await api.updateLessonsOrder(lessonIds);
      if (error) {
        setLessons(lessons);
        toast.error(t('failedToSaveOrder'));
      } else {
        toast.success(t('orderSaved'));
      }
    } catch (err) {
      setLessons(lessons);
      toast.error(t('errorSavingOrder'));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Breadcrumbs />
        
        <PageHeader
          icon={BookOpen}
          title={t('lessons')}
          description={t('manageLessons')}
        >
          <Button 
            className="bg-primary hover:bg-primary/90 text-white" 
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addLesson')}
          </Button>
        </PageHeader>

        {subjectInfo && (
          <Card className="card-hover glass-strong border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-display text-foreground">
                        {subjectInfo.subject_name}
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span className="font-medium">{t('class')}:</span>
                        <span>{subjectInfo.class_name}</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1.5">
                    <BookOpen className="h-3 w-3 mr-1.5" />
                    {t('subjectLabel')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {t('totalLessons')}
              </CardTitle>
          </CardHeader>
          <CardContent>
              <div className="text-3xl font-bold font-display text-primary">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t('publishedLessons')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-emerald-600">{stats.published}</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {t('draftLessons')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-orange-600">{stats.draft}</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Video className="h-4 w-4" />
                {t('lessonsWithVideo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-blue-600">{stats.withVideo}</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover glass-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <FileVideo className="h-4 w-4" />
                {t('lessonsWithoutVideo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-slate-600">{stats.withoutVideo}</div>
            </CardContent>
          </Card>
        </div>

        {/* AI Content Generator - Only for teachers and admins */}
        {subjectInfo && (profile?.role === 'admin' || profile?.role === 'teacher') && (
          <ContentGenerator
            subjectId={subjectId}
            subjectName={subjectInfo.subject_name}
            onQuestionsGenerated={(questions) => {
              console.log('Generated questions:', questions);
              toast.success(t('questionsGenerated') || 'Questions generated successfully');
            }}
            onLessonPlanGenerated={(lessonPlan) => {
              console.log('Generated lesson plan:', lessonPlan);
              toast.success(t('lessonPlanGenerated') || 'Lesson plan generated successfully');
            }}
            onExercisesGenerated={(exercises) => {
              console.log('Generated exercises:', exercises);
              toast.success(t('exercisesGenerated') || 'Exercises generated successfully');
            }}
          />
        )}

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">{t('addLesson')}</DialogTitle>
              <DialogDescription>
                {t('createNewLessonForSubject')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('title')}</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('title')} className="input-modern" />
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('description')}</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('description')} className="input-modern" />
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('videoUrl')}</label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className="input-modern" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t('attachmentsOptional')}</span>
                  <Button type="button" className="bg-primary hover:bg-primary/90 text-white" onClick={onAddAttachment}>
                    {t('addAttachment')}
                  </Button>
                </div>
                {attachments.map((att, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('fileUrl')}</label>
                      <Input value={att.file_url} onChange={(e) => onChangeAttachment(idx, 'file_url', e.target.value)} placeholder="https://..." className="input-modern" />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('fileName')}</label>
                      <Input value={att.file_name || ''} onChange={(e) => onChangeAttachment(idx, 'file_name', e.target.value)} placeholder={t('optional')} className="input-modern" />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('fileType')}</label>
                      <select
                        className="block w-full border rounded h-10 px-2 input-modern"
                        value={att.file_type}
                        onChange={(e) => onChangeAttachment(idx, 'file_type', e.target.value)}
                      >
                        <option value="image">{t('image')}</option>
                        <option value="pdf">PDF</option>
                        <option value="ppt">PPT</option>
                        <option value="word">Word</option>
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-11">
                      <input
                        type="file"
                        accept="image/*,.pdf,.ppt,.pptx,.doc,.docx"
                        onChange={(e) => {
                          if (!e.target.files || e.target.files.length === 0) return;
                          const file = e.target.files[0];
                          const maxBytes = 20 * 1024 * 1024;
                          if (file.size > maxBytes) {
                            toast.error(t('fileTooLarge'));
                            return;
                          }
                          void onUploadAttachmentFile(file, idx);
                        }}
                        className="block w-full text-sm"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="destructive" onClick={() => onRemoveAttachment(idx)} disabled={isUploadingIdx === idx}>
                        {t('remove')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  {t('cancel')}
                </Button>
                <Button disabled={submitting} className="bg-primary hover:bg-primary/90 text-white">
                  {submitting ? t('saving') : t('save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Search & Filters */}
        <Card className="card-interactive">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('search')} & {t('filterByStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('searchLessons')}
                  value={lessonSearchQuery}
                  onChange={(e) => setLessonSearchQuery(e.target.value)}
                  className="input-modern pl-10"
                />
              </div>
              <div>
                <Select
                  value={filterHasVideo}
                  onValueChange={(value) => setFilterHasVideo(value as 'all' | 'with' | 'without')}
                >
                  <SelectTrigger className="input-modern">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allLessons')}</SelectItem>
                    <SelectItem value="with">{t('withVideo')}</SelectItem>
                    <SelectItem value="without">{t('withoutVideo')}</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader>
            <CardTitle className="font-display">{t('lessonsList')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLessons ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto animate-pulse-glow" />
                  <div className="absolute inset-0 bg-emerald-200/20 rounded-full blur-xl"></div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">{t('loading')}</p>
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl"></div>
                  <BookOpen className="h-20 w-20 mx-auto text-slate-300 dark:text-slate-600 animate-float relative z-10" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">{t('noLessons')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans mb-6">{t('addLessonToGetStarted')}</p>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addLesson')}
                </Button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredLessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredLessons.map((l) => {
                      const atts = attachmentsByLesson[l.id] || [];
                      return (
                        <SortableLesson
                          key={l.id}
                          lesson={l}
                          attachments={atts}
                          editingLessonId={editingLessonId}
                          editTitle={editTitle}
                          editDescription={editDescription}
                          editVideoUrl={editVideoUrl}
                          imageErrors={imageErrors}
                          lessonUploadBusy={lessonUploadBusy}
                          addUrlByLesson={addUrlByLesson}
                          onEditStart={startEdit}
                          onEditTitle={setEditTitle}
                          onEditDescription={setEditDescription}
                          onEditVideoUrl={setEditVideoUrl}
                          onSaveEdit={saveEdit}
                          onCancelEdit={cancelEdit}
                          onDelete={removeLesson}
                          onUpdateStatus={updateLessonStatus}
                          onRemoveAttachment={removeAttachment}
                          onUploadAttachmentFile={uploadAttachmentForLesson}
                          onAddAttachmentUrl={addAttachmentUrlForLesson}
                          onSetAddUrl={(lessonId, url) => setAddUrlByLesson(prev => ({ ...prev, [lessonId]: url }))}
                          getStatusBadge={getStatusBadge}
                          getVideoEmbedUrl={getVideoEmbedUrl}
                          t={t}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
