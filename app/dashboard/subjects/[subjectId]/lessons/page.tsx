'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as api from '@/lib/supabase';
import type { AttachmentType, Lesson } from '@/lib/supabase';
import { toast } from 'sonner';
import { Image as ImageIcon, FileText, File as FileIcon, ExternalLink, Loader2 } from 'lucide-react';

interface AttachmentDraft {
  file_url: string;
  file_name?: string;
  file_type: AttachmentType;
}

export default function SubjectLessonsPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.subjectId as string) || '';
  const { user, loading } = useAuth();
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
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [isUploadingIdx, setIsUploadingIdx] = useState<number | null>(null);
  const [lessonUploadBusy, setLessonUploadBusy] = useState<Record<string, boolean>>({});
  const [addUrlByLesson, setAddUrlByLesson] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (subjectId) {
      loadLessons().catch(() => {});
    }
  }, [subjectId]);

  const loadLessons = async () => {
    try {
      setLoadingLessons(true);
      const { data, error } = await api.fetchLessonsBySubject(subjectId);
      if (error) {
        console.error(error);
        toast.error('Error loading lessons');
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
      toast.error('Title is required');
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
        toast.error('Failed to create lesson');
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
          toast.error('Lesson saved, some attachments failed');
        }
      }

      toast.success('Lesson created');
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setAttachments([]);
      setShowAddForm(false);
      await loadLessons();
    } finally {
      setSubmitting(false);
    }
  };

  const onUploadAttachmentFile = async (file: File, idx: number) => {
    if (!user) {
      toast.error('Please login first');
      return;
    }
    try {
      setIsUploadingIdx(idx);
      const { data, error } = await api.uploadLessonAttachmentFile(file, user.id);
      if (error || !data) {
        toast.error((error as any)?.message || 'Upload failed');
        return;
      }
      onChangeAttachment(idx, 'file_url', data.publicUrl);
      if (!attachments[idx].file_name) {
        onChangeAttachment(idx, 'file_name', file.name);
      }
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const typeMap: Record<string, AttachmentType> = { 'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image', 'webp': 'image', 'pdf': 'pdf', 'ppt': 'ppt', 'pptx': 'ppt', 'doc': 'word', 'docx': 'word' };
      onChangeAttachment(idx, 'file_type', typeMap[ext] || 'pdf');
      toast.success('Uploaded');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setIsUploadingIdx(null);
    }
  };

  const uploadAttachmentForLesson = async (lessonId: string, file: File) => {
    if (!user) {
      toast.error('Please login first');
      return;
    }
    try {
      setLessonUploadBusy(prev => ({ ...prev, [lessonId]: true }));
      const { data, error } = await api.uploadLessonAttachmentFile(file, user.id);
      if (error || !data) {
        toast.error((error as any)?.message || 'Upload failed');
        return;
      }
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const typeMap: Record<string, AttachmentType> = { 'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image', 'webp': 'image', 'pdf': 'pdf', 'ppt': 'ppt', 'pptx': 'ppt', 'doc': 'word', 'docx': 'word' };
      const { error: addErr } = await api.addLessonAttachment({
        lesson_id: lessonId,
        file_url: data.publicUrl,
        file_name: file.name,
        file_type: typeMap[ext] || 'pdf',
      });
      if (addErr) {
        toast.error('Failed to save attachment');
        return;
      }
      toast.success('Saved');
      await loadLessons();
    } finally {
      setLessonUploadBusy(prev => ({ ...prev, [lessonId]: false }));
    }
  };

  const addAttachmentUrlForLesson = async (lessonId: string) => {
    const url = (addUrlByLesson[lessonId] || '').trim();
    if (!url) {
      toast.error('URL is required');
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
      toast.error('Failed to save attachment');
      return;
    }
    toast.success('Saved');
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
      toast.error('Failed to save');
      return;
    }
    toast.success('Saved');
    cancelEdit();
    await loadLessons();
  };

  const removeLesson = async (id: string) => {
    const { error } = await api.deleteLesson(id);
    if (error) {
      toast.error('Delete failed');
      return;
    }
    toast.success('Deleted');
    await loadLessons();
  };

  const removeAttachment = async (id: string) => {
    const { error } = await api.deleteLessonAttachment(id);
    if (error) {
      toast.error('Delete failed');
      return;
    }
    toast.success('Deleted');
    await loadLessons();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-3xl font-display text-gradient">
            {t('lessons') || 'Lessons'}
          </h1>
          <div className="flex items-center gap-2">
            {!showAddForm && (
              <Button className="btn-gradient mt-1" onClick={() => setShowAddForm(true)}>
                {t('addLesson') || 'Add Lesson'}
              </Button>
            )}
          </div>
        </div>

        {showAddForm && (
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="font-display text-gradient">{t('addLesson') || 'Add Lesson'}</CardTitle>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('title') || 'Title'}</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('title') || 'Title'} className="input-modern" />
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('description') || 'Description'}</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('description') || 'Description'} className="input-modern" />
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('videoUrl') || 'Video URL (optional)'}</label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className="input-modern" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t('attachmentsOptional') || 'Attachments (optional)'}</span>
                  <Button type="button" className="btn-gradient" onClick={onAddAttachment}>
                    {t('addAttachment') || 'Add Attachment'}
                  </Button>
                </div>
                {attachments.map((att, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('fileUrl') || 'File URL'}</label>
                      <Input value={att.file_url} onChange={(e) => onChangeAttachment(idx, 'file_url', e.target.value)} placeholder="https://..." className="input-modern" />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('fileName') || 'File name'}</label>
                      <Input value={att.file_name || ''} onChange={(e) => onChangeAttachment(idx, 'file_name', e.target.value)} placeholder="optional" className="input-modern" />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1 text-sm text-slate-600 dark:text-slate-300">{t('fileType') || 'File type'}</label>
                      <select
                        className="block w-full border rounded h-10 px-2 input-modern"
                        value={att.file_type}
                        onChange={(e) => onChangeAttachment(idx, 'file_type', e.target.value)}
                      >
                        <option value="image">image</option>
                        <option value="pdf">pdf</option>
                        <option value="ppt">ppt</option>
                        <option value="word">word</option>
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
                            toast.error('File too large (max 20MB)');
                            return;
                          }
                          void onUploadAttachmentFile(file, idx);
                        }}
                        className="block w-full text-sm"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="destructive" onClick={() => onRemoveAttachment(idx)} disabled={isUploadingIdx === idx}>
                        {t('remove') || 'Remove'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  {t('cancel') || 'Cancel'}
                </Button>
                <Button disabled={submitting} className="btn-gradient">
                  {submitting ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
                </Button>
              </div>
            </form>
            </CardContent>
          </Card>
        )}

        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="font-display text-gradient">{t('lessonsList') || 'Lessons'}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters & Search */}
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2"></div>
              <div className="relative">
                <Input
                  placeholder={(t('search') as any) || 'Search lessons...'}
                  value={lessonSearchQuery}
                  onChange={(e) => setLessonSearchQuery(e.target.value)}
                  className="input-modern"
                />
              </div>
            </div>
            {loadingLessons ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto animate-pulse-glow" />
                  <div className="absolute inset-0 bg-emerald-200/20 rounded-full blur-xl"></div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">{t('loading') || 'Loading...'}</p>
              </div>
            ) : (lessons || []).filter(l => {
              const q = lessonSearchQuery.trim().toLowerCase();
              if (!q) return true;
              return (
                (l.title || '').toLowerCase().includes(q) ||
                (l.description || '').toLowerCase().includes(q)
              );
            }).length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <div className="relative inline-block mb-4">
                  <FileText className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 animate-float" />
                </div>
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 font-display mb-2">{t('noData') || 'No lessons yet.'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">{t('addLessonToStart') || 'Add a lesson to get started'}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(lessons || []).filter(l => {
                  const q = lessonSearchQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    (l.title || '').toLowerCase().includes(q) ||
                    (l.description || '').toLowerCase().includes(q)
                  );
                }).map((l) => {
                  const atts = attachmentsByLesson[l.id] || [];
                  const hasVideo = !!l.video_url;
                  return (
                    <Card key={l.id} className="card-hover overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg font-display font-semibold line-clamp-1">{l.title}</CardTitle>
                          <div className="flex flex-wrap gap-2">
                            {hasVideo && (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Video</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {atts.length} {(t('attachments') as any) || 'Attachments'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {editingLessonId === l.id ? (
                          <div className="space-y-2">
                            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-modern" />
                            <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="input-modern" />
                            <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="https://..." className="input-modern" />
                            <div className="flex gap-2">
                              <Button onClick={saveEdit} className="btn-gradient">{t('save') || 'Save'}</Button>
                              <Button variant="outline" onClick={cancelEdit}>{t('cancel') || 'Cancel'}</Button>
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
                                    {t('viewVideo') || 'View video'}
                                  </a>
                                );
                              }
                              return null;
                            })()}

                            {/* Attachments preview (first 1-2) */}
                            {atts.length > 0 && (
                              <div className="flex flex-col gap-2 mt-2">
                                {atts.slice(0, 2).map((a: any) => (
                                  <div key={a.id} className="border rounded p-2 text-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="h-4 w-4 text-slate-600" />
                                      <a href={a.file_url} target="_blank" rel="noreferrer" className="underline text-blue-600 truncate">
                                        {a.file_name || a.file_url}
                                      </a>
                                    </div>
                                    <Button size="sm" variant="destructive" onClick={() => removeAttachment(a.id)}>
                                      {t('delete') || 'Delete'}
                                    </Button>
                                  </div>
                                ))}
                                {atts.length > 2 && (
                                  <div className="text-xs text-slate-500">+{atts.length - 2} more...</div>
                                )}
                              </div>
                            )}

                            {/* Quick actions */}
                            <div className="flex gap-2 pt-2">
                              <Button variant="secondary" size="sm" onClick={() => startEdit(l)}>{t('edit') || 'Edit'}</Button>
                              <Button variant="destructive" size="sm" onClick={() => removeLesson(l.id)}>{t('delete') || 'Delete'}</Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


