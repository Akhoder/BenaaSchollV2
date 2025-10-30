import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'teacher' | 'student' | 'supervisor';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  language_preference: 'en' | 'ar' | 'fr';
  created_at: string;
  updated_at: string;
}

export type AttachmentType = 'image' | 'pdf' | 'ppt' | 'word';

export interface Lesson {
  id: string;
  subject_id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LessonAttachment {
  id: string;
  lesson_id: string;
  file_url: string;
  file_name?: string | null;
  file_type: AttachmentType;
  created_at: string;
  created_by: string;
}

export interface SubjectRow {
  id: string;
  class_id: string;
  subject_name: string;
  teacher_id: string | null;
  published?: boolean;
  created_at: string;
}

export interface SubjectEnrollment {
  id: string;
  subject_id: string;
  student_id: string;
  status: 'active' | 'cancelled';
  created_at: string;
}

export async function fetchPublishedSubjects() {
  return await supabase
    .from('class_subjects')
    .select('id, class_id, subject_name, teacher_id, published, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false });
}

export async function fetchMySubjectEnrollments() {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: [], error: null } as any;
  return await supabase
    .from('subject_enrollments')
    .select('id, subject_id, student_id, status, created_at')
    .eq('student_id', uid)
    .eq('status', 'active');
}

export async function enrollInSubject(subjectId: string) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return { data: null, error: userErr || new Error('Not authenticated') } as any;
  const student_id = userRes.user.id;
  return await supabase
    .from('subject_enrollments')
    .insert([{ subject_id: subjectId, student_id, status: 'active' }])
    .select('*')
    .single();
}

export async function cancelSubjectEnrollment(subjectId: string) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return { data: null, error: userErr || new Error('Not authenticated') } as any;
  const student_id = userRes.user.id;
  return await supabase
    .from('subject_enrollments')
    .update({ status: 'cancelled' })
    .eq('subject_id', subjectId)
    .eq('student_id', student_id)
    .select('*')
    .single();
}

export async function fetchLessonsBySubject(subjectId: string) {
  return await supabase
    .from('lessons')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
}

export async function createLesson(input: {
  subject_id: string;
  title: string;
  description?: string;
  video_url?: string;
}) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    return { data: null, error: userErr || new Error('Not authenticated') } as any;
  }
  const created_by = userRes.user.id;
  return await supabase
    .from('lessons')
    .insert([{ ...input, created_by }])
    .select('*')
    .single();
}

export async function addLessonAttachment(input: {
  lesson_id: string;
  file_url: string;
  file_name?: string;
  file_type: AttachmentType;
}) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    return { data: null, error: userErr || new Error('Not authenticated') } as any;
  }
  const created_by = userRes.user.id;
  return await supabase
    .from('lesson_attachments')
    .insert([{ ...input, created_by }])
    .select('*')
    .single();
}

export async function fetchLessonAttachments(lessonId: string) {
  return await supabase
    .from('lesson_attachments')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });
}

export async function fetchAttachmentsForLessons(lessonIds: string[]) {
  if (lessonIds.length === 0) return { data: [], error: null } as any;
  return await supabase
    .from('lesson_attachments')
    .select('*')
    .in('lesson_id', lessonIds)
    .order('created_at', { ascending: false });
}

export async function updateLesson(id: string, fields: Partial<Pick<Lesson, 'title' | 'description' | 'video_url'>>) {
  return await supabase
    .from('lessons')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single();
}

export async function deleteLesson(id: string) {
  return await supabase
    .from('lessons')
    .delete()
    .eq('id', id);
}

export async function deleteLessonAttachment(id: string) {
  return await supabase
    .from('lesson_attachments')
    .delete()
    .eq('id', id);
}

export async function uploadLessonAttachmentFile(file: File, userId: string) {
  const bucket = 'lesson-attachments';
  const ext = file.name.split('.').pop() || 'bin';
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const uid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as any).randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${y}/${m}/${d}/${uid}_${safeName}`;
  // Validate file type/size
  const allowedExt = ['png','jpg','jpeg','gif','webp','pdf','ppt','pptx','doc','docx'];
  if (!allowedExt.includes(ext.toLowerCase())) {
    return { data: null, error: new Error('Unsupported file type') } as any;
  }
  const maxBytes = 20 * 1024 * 1024; // 20MB
  if (file.size > maxBytes) {
    return { data: null, error: new Error('File too large (max 20MB)') } as any;
  }
  const contentTypeByExt: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    pdf: 'application/pdf', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  const contentType = file.type || contentTypeByExt[ext.toLowerCase()] || 'application/octet-stream';
  const { data, error } = await (supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType,
  }) as any);
  if (error) {
    // Return more helpful error
    return { data: null, error: new Error(`Upload failed: ${error.message || 'Unknown error'}`) } as any;
  }
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return { data: { path, publicUrl: pub.publicUrl }, error: null };
}