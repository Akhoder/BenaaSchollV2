'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as api from '@/lib/supabase';
import type { AttachmentType, Lesson } from '@/lib/supabase';
import { toast } from 'sonner';
import { Image as ImageIcon, FileText, File as FileIcon, ExternalLink } from 'lucide-react';

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
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [attachmentsByLesson, setAttachmentsByLesson] = useState<Record<string, AttachmentDraft[] & any[]>>({});
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [isUploadingIdx, setIsUploadingIdx] = useState<number | null>(null);
  const [lessonUploadBusy, setLessonUploadBusy] = useState<Record<string, boolean>>({});
  const [addUrlByLesson, setAddUrlByLesson] = useState<Record<string, string>>({});

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
    const { data, error } = await api.fetchLessonsBySubject(subjectId);
    if (error) {
      console.error(error);
      toast.error('Error loading lessons');
      return;
    }
    const list = (data || []) as Lesson[];
    setLessons(list);
    const ids = list.map(l => l.id);
    const { data: atts } = await api.fetchAttachmentsForLessons(ids);
    const map: Record<string, any[]> = {};
    (atts || []).forEach((a: any) => {
      if (!map[a.lesson_id]) map[a.lesson_id] = [];
      map[a.lesson_id].push(a);
    });
    setAttachmentsByLesson(map);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            {t('lessons') || 'Lessons'}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('addLesson') || 'Add Lesson'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="block mb-1">{t('title') || 'Title'}</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('title') || 'Title'} />
              </div>
              <div>
                <label className="block mb-1">{t('description') || 'Description'}</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('description') || 'Description'} />
              </div>
              <div>
                <label className="block mb-1">{t('videoUrl') || 'Video URL (optional)'}</label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t('attachmentsOptional') || 'Attachments (optional)'}</span>
                  <Button type="button" variant="secondary" onClick={onAddAttachment}>
                    {t('addAttachment') || 'Add Attachment'}
                  </Button>
                </div>
                {attachments.map((att, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <label className="block mb-1">{t('fileUrl') || 'File URL'}</label>
                      <Input value={att.file_url} onChange={(e) => onChangeAttachment(idx, 'file_url', e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1">{t('fileName') || 'File name'}</label>
                      <Input value={att.file_name || ''} onChange={(e) => onChangeAttachment(idx, 'file_name', e.target.value)} placeholder="optional" />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1">{t('fileType') || 'File type'}</label>
                      <select
                        className="block w-full border rounded h-10 px-2"
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

              <div className="flex justify-end">
                <Button disabled={submitting}>
                  {submitting ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('lessonsList') || 'Lessons'}</CardTitle>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t('noData') || 'No lessons yet.'}</div>
            ) : (
              <div className="space-y-3">
                {lessons.map((l) => (
                  <Card key={l.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">{l.title}</CardTitle>
                        <div className="flex gap-2">
                          {l.video_url && (
                            <a href={l.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-emerald-600 underline">
                              {t('open') || 'Open'} <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          )}
                          <Button variant="secondary" size="sm" onClick={() => startEdit(l)}>{t('edit') || 'Edit'}</Button>
                          <Button variant="destructive" size="sm" onClick={() => removeLesson(l.id)}>{t('delete') || 'Delete'}</Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                    {editingLessonId === l.id ? (
                      <div className="space-y-2">
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                        <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                        <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="https://..." />
                        <div className="flex gap-2">
                          <Button onClick={saveEdit}>{t('save') || 'Save'}</Button>
                          <Button variant="outline" onClick={cancelEdit}>{t('cancel') || 'Cancel'}</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {l.description && (
                          <div className="text-sm text-muted-foreground mt-1">{l.description}</div>
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
                      </>
                    )}

                    <div className="mt-3">
                      <div className="font-medium mb-2">{t('attachments') || 'Attachments'}</div>
                      {(attachmentsByLesson[l.id] || []).length === 0 ? (
                        <div className="text-xs text-muted-foreground">{t('noData') || 'No attachments'}</div>
                      ) : (
                        <div className="space-y-3">
                          {(attachmentsByLesson[l.id] || []).map((a: any) => {
                            const type = (a.file_type || '').toLowerCase();
                            const isImage = type === 'image' || /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(a.file_url || '');
                            const isPdf = type === 'pdf' || /\.pdf(\?|$)/i.test(a.file_url || '');
                            return (
                              <div key={a.id} className="border rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {isImage ? (
                                      <ImageIcon className="h-4 w-4 text-emerald-600" />
                                    ) : isPdf ? (
                                      <FileText className="h-4 w-4 text-red-600" />
                                    ) : (
                                      <FileIcon className="h-4 w-4 text-slate-600" />
                                    )}
                                    <a href={a.file_url} target="_blank" rel="noreferrer" className="text-sm underline text-blue-600">
                                      {a.file_name || a.file_url}
                                    </a>
                                    <span className="text-xs text-slate-500">({a.file_type})</span>
                                  </div>
                                  <Button size="sm" variant="destructive" onClick={() => removeAttachment(a.id)}>
                                    {t('delete') || 'Delete'}
                                  </Button>
                                </div>
                                {isImage && (
                                  <div className="rounded overflow-hidden border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={a.file_url} alt={a.file_name || 'image'} className="max-h-48 w-auto object-contain mx-auto" />
                                  </div>
                                )}
                                {isPdf && (
                                  <div className="rounded overflow-hidden border">
                                    <iframe
                                      src={a.file_url}
                                      title={a.file_name || 'pdf'}
                                      className="w-full h-64"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-8">
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
                              void uploadAttachmentForLesson(l.id, file);
                            }}
                            className="block w-full text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder={t('fileUrl') || 'File URL'}
                            value={addUrlByLesson[l.id] || ''}
                            onChange={(e) => setAddUrlByLesson(prev => ({ ...prev, [l.id]: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button size="sm" onClick={() => addAttachmentUrlForLesson(l.id)} disabled={!!lessonUploadBusy[l.id]}>
                            {t('add') || 'Add'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


