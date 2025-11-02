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

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percentage: number;
  last_accessed_at?: string | null;
  completed_at?: string | null;
  video_position: number;
  time_spent_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface SubjectProgressStats {
  total_lessons: number;
  completed_lessons: number;
  in_progress_lessons: number;
  not_started_lessons: number;
  overall_progress: number;
}

export interface SubjectRow {
  id: string;
  class_id: string;
  subject_name: string;
  teacher_id: string | null;
  published?: boolean;
  created_at: string;
}

export type AssignmentType = 'homework' | 'quiz' | 'test' | 'project';
export type AssignmentStatus = 'draft' | 'published' | 'closed';
export type SubmissionStatus = 'submitted' | 'graded' | 'returned' | 'late';

export interface Assignment {
  id: string;
  subject_id: string;
  title: string;
  description?: string | null;
  assignment_type: AssignmentType;
  grade_weight: number;
  start_date?: string | null;
  due_date?: string | null;
  status: AssignmentStatus;
  instructions?: string | null;
  total_points: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_content?: string | null;
  submission_files: any[];
  status: SubmissionStatus;
  submitted_at: string;
  graded_at?: string | null;
  score?: number | null;
  feedback?: string | null;
  graded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassRow {
  id: string;
  class_name: string;
  teacher_id: string | null;
  published?: boolean;
  created_at: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  status: 'active' | 'inactive' | 'completed' | 'dropped';
  enrolled_at: string;
}

export async function fetchPublishedClasses() {
  return await supabase
    .from('classes')
    .select('id, class_name, teacher_id, published, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false });
}

export async function fetchMyClassEnrollments() {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: [], error: null } as any;
  return await supabase
    .from('student_enrollments')
    .select('id, class_id, student_id, status, enrolled_at')
    .eq('student_id', uid)
    .eq('status', 'active');
}

export async function enrollInClass(classId: string) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return { data: null, error: userErr || new Error('Not authenticated') } as any;
  const student_id = userRes.user.id;
  
  // Check if already enrolled
  const { data: existing } = await supabase
    .from('student_enrollments')
    .select('id, status')
    .eq('class_id', classId)
    .eq('student_id', student_id)
    .maybeSingle();
  
  if (existing) {
    if (existing.status === 'active') {
      return { data: existing, error: null };
    }
    // Re-activate if dropped/inactive/completed
    return await supabase
      .from('student_enrollments')
      .update({ status: 'active' })
      .eq('id', existing.id)
      .select('*')
      .single();
  }
  
  // Insert new enrollment; trigger will auto-enroll in all subjects
  return await supabase
    .from('student_enrollments')
    .insert([{ class_id: classId, student_id, status: 'active' }])
    .select('*')
    .single();
}

export async function cancelClassEnrollment(classId: string) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return { data: null, error: userErr || new Error('Not authenticated') } as any;
  const student_id = userRes.user.id;
  return await supabase
    .from('student_enrollments')
    .update({ status: 'dropped' })
    .eq('class_id', classId)
    .eq('student_id', student_id)
    .select('*')
    .single();
}

export async function fetchMyEnrolledClassesWithDetails() {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: [], error: null } as any;
  
  // Get enrollments
  const { data: enrollments, error: eErr } = await supabase
    .from('student_enrollments')
    .select('class_id, enrolled_at')
    .eq('student_id', uid)
    .eq('status', 'active');
  
  if (eErr || !enrollments || enrollments.length === 0) {
    return { data: [], error: eErr };
  }
  
  const classIds = enrollments.map(e => e.class_id);
  
  // Get classes details
  const { data: classes, error: cErr } = await supabase
    .from('classes')
    .select('id, class_name, teacher_id, level, image_url, teacher:profiles!teacher_id(full_name)')
    .in('id', classIds);
  
  if (cErr) return { data: [], error: cErr };
  
  return { data: classes || [], error: null };
}

export async function fetchSubjectsForClass(classId: string) {
  return await supabase
    .from('class_subjects')
    .select('id, subject_name, teacher_id, created_at, teacher:profiles!teacher_id(full_name)')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
}

export async function fetchAssignmentsForSubject(subjectId: string) {
  return await supabase
    .from('assignments')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
}

export async function fetchMyAssignmentsForSubject(subjectId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: [], error: null } as any;
  
  return await supabase
    .from('assignments')
    .select('*')
    .eq('subject_id', subjectId)
    .in('status', ['published', 'closed'])
    .order('due_date', { ascending: false });
}

export async function createAssignment(input: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>) {
  return await supabase
    .from('assignments')
    .insert([input])
    .select('*')
    .single();
}

export async function updateAssignment(id: string, fields: Partial<Assignment>) {
  return await supabase
    .from('assignments')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single();
}

export async function deleteAssignment(id: string) {
  return await supabase
    .from('assignments')
    .delete()
    .eq('id', id);
}

export async function submitAssignment(assignmentId: string, content: string, files: any[]) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return { data: null, error: userErr || new Error('Not authenticated') } as any;
  const student_id = userRes.user.id;
  
  // Check if already submitted
  const { data: existing } = await supabase
    .from('assignment_submissions')
    .select('id, status')
    .eq('assignment_id', assignmentId)
    .eq('student_id', student_id)
    .maybeSingle();
  
  if (existing) {
    // Update existing
    return await supabase
      .from('assignment_submissions')
      .update({ submission_content: content, submission_files: files, status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single();
  }
  
  return await supabase
    .from('assignment_submissions')
    .insert([{ assignment_id: assignmentId, student_id, submission_content: content, submission_files: files, status: 'submitted' }])
    .select('*')
    .single();
}

export async function fetchSubmissionForAssignment(assignmentId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: null, error: null } as any;
  
  return await supabase
    .from('assignment_submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('student_id', uid)
    .maybeSingle();
}

export async function fetchAllSubmissionsForAssignment(assignmentId: string) {
  const { data: subs, error: e1 } = await supabase
    .from('assignment_submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false });
  
  if (e1 || !subs || subs.length === 0) {
    return { data: [], error: e1 };
  }
  
  // Fetch student profiles separately
  const studentIds = subs.map(s => s.student_id);
  const { data: students, error: e2 } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', studentIds);
  
  if (e2) {
    return { data: subs, error: e2 };
  }
  
  // Map students to submissions
  const studentsMap = new Map((students || []).map((s: any) => [s.id, s]));
  const enriched = (subs || []).map(sub => ({
    ...sub,
    student: studentsMap.get(sub.student_id) || { id: sub.student_id, full_name: 'Unknown', email: '' }
  }));
  
  return { data: enriched, error: null };
}

export async function gradeSubmission(submissionId: string, score: number, feedback: string) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return { data: null, error: userErr || new Error('Not authenticated') } as any;
  const graded_by = userRes.user.id;
  
  return await supabase
    .from('assignment_submissions')
    .update({ score, feedback, graded_by, graded_at: new Date().toISOString(), status: 'graded' })
    .eq('id', submissionId)
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

// ============================================
// LESSON PROGRESS FUNCTIONS
// ============================================

export async function fetchLessonProgressForStudent(lessonId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: null, error: null } as any;
  
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('student_id', uid)
    .maybeSingle();
  
  return { data: progress, error: null };
}

export async function fetchAllLessonProgressForSubject(subjectId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: [], error: null } as any;
  
  // Get all lessons for the subject
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('subject_id', subjectId);
  
  if (!lessons || lessons.length === 0) {
    return { data: [], error: null };
  }
  
  const lessonIds = lessons.map(l => l.id);
  
  // Get all progress for these lessons
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('student_id', uid)
    .in('lesson_id', lessonIds);
  
  return { data: progress || [], error: null };
}

export async function getSubjectProgressStats(subjectId: string): Promise<{ data: SubjectProgressStats | null, error: any }> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: null, error: null } as any;
  
  const { data, error } = await supabase.rpc('get_subject_progress', {
    p_student_id: uid,
    p_subject_id: subjectId
  });
  
  if (error) {
    console.error('Error fetching subject progress:', error);
    return { data: null, error };
  }
  
  // Transform the result to match our interface
  if (data && data.length > 0) {
    const stats = data[0];
    return {
      data: {
        total_lessons: Number(stats.total_lessons) || 0,
        completed_lessons: Number(stats.completed_lessons) || 0,
        in_progress_lessons: Number(stats.in_progress_lessons) || 0,
        not_started_lessons: Number(stats.not_started_lessons) || 0,
        overall_progress: Number(stats.overall_progress) || 0
      },
      error: null
    };
  }
  
  return { data: null, error: null };
}

export async function updateLessonProgress(
  lessonId: string,
  progressPercentage: number,
  status?: 'not_started' | 'in_progress' | 'completed',
  videoPosition?: number,
  timeSpent?: number
) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    return { data: null, error: userErr || new Error('Not authenticated') } as any;
  }
  const student_id = userRes.user.id;
  
  // Use the RPC function to handle the upsert and auto-logic
  const { data, error } = await supabase.rpc('update_lesson_progress', {
    p_student_id: student_id,
    p_lesson_id: lessonId,
    p_progress_percentage: Math.max(0, Math.min(100, progressPercentage)),
    p_status: status || null,
    p_video_position: videoPosition || null,
    p_time_spent: timeSpent || null
  });
  
  if (error) {
    console.error('Error updating lesson progress:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

export async function getOrCreateLessonProgress(lessonId: string) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    return { data: null, error: userErr || new Error('Not authenticated') } as any;
  }
  const student_id = userRes.user.id;
  
  const { data, error } = await supabase.rpc('get_or_create_lesson_progress', {
    p_student_id: student_id,
    p_lesson_id: lessonId
  });
  
  if (error) {
    console.error('Error getting/creating lesson progress:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

// ============================================
// CHAT FUNCTIONS
// ============================================

export interface Conversation {
  id: string;
  name?: string | null;
  type: 'direct' | 'class' | 'subject';
  class_id?: string | null;
  subject_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  last_read_at?: string | null;
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_url?: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    full_name: string;
    email: string;
  };
  read_count?: number;
  is_read_by_me?: boolean;
}

// Get all conversations for the current user
export async function getMyConversations() {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: [], error: null } as any;
  
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false, nullsLast: true })
    .limit(50);
  
  if (error) {
    return { data: [], error };
  }
  
  // Filter to only conversations where user is a participant
  const participantConversationIds: string[] = [];
  for (const conv of conversations || []) {
    const { data: isParticipant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conv.id)
      .eq('user_id', uid)
      .maybeSingle();
    
    if (isParticipant) {
      participantConversationIds.push(conv.id);
    }
  }
  
  const myConversations = (conversations || []).filter((c: any) => 
    participantConversationIds.includes(c.id)
  );
  
  return { data: myConversations, error: null };
}

// Get conversation messages with sender info
export async function getConversationMessages(conversationId: string, limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(id, full_name, email)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    return { data: [], error };
  }
  
  // Get read status for current user
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  
  if (uid && data) {
    const messageIds = data.map((m: any) => m.id);
    const { data: reads } = await supabase
      .from('message_reads')
      .select('message_id')
      .in('message_id', messageIds)
      .eq('user_id', uid);
    
    const readMessageIds = new Set((reads || []).map((r: any) => r.message_id));
    
    const enrichedMessages = data.map((msg: any) => ({
      ...msg,
      is_read_by_me: readMessageIds.has(msg.id)
    }));
    
    return { data: enrichedMessages.reverse(), error: null };
  }
  
  return { data: (data || []).reverse(), error: null };
}

// Send a message
export async function sendMessage(
  conversationId: string,
  content: string,
  messageType: 'text' | 'file' | 'image' = 'text',
  fileUrl?: string
) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: null, error: new Error('Not authenticated') } as any;
  
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: uid,
      content,
      message_type: messageType,
      file_url: fileUrl || null
    })
    .select()
    .single();
  
  if (error) {
    return { data: null, error };
  }
  
  // Mark as read by sender
  if (data) {
    await supabase
      .from('message_reads')
      .insert({
        message_id: data.id,
        user_id: uid
      });
  }
  
  return { data, error: null };
}

// Mark messages as read
export async function markMessagesAsRead(conversationId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: null, error: new Error('Not authenticated') } as any;
  
  // Get unread messages in this conversation
  const { data: unreadMessages } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .not('sender_id', 'eq', uid);
  
  if (!unreadMessages || unreadMessages.length === 0) {
    return { data: true, error: null };
  }
  
  // Check which ones aren't read yet
  const messageIds = unreadMessages.map((m: any) => m.id);
  const { data: reads } = await supabase
    .from('message_reads')
    .select('message_id')
    .in('message_id', messageIds)
    .eq('user_id', uid);
  
  const readMessageIds = new Set((reads || []).map((r: any) => r.message_id));
  const newReads = unreadMessages
    .filter((m: any) => !readMessageIds.has(m.id))
    .map((m: any) => ({
      message_id: m.id,
      user_id: uid
    }));
  
  if (newReads.length > 0) {
    const { error } = await supabase
      .from('message_reads')
      .insert(newReads);
    
    if (error) {
      return { data: null, error };
    }
  }
  
  return { data: true, error: null };
}

// Create a direct conversation with another user
export async function createDirectConversation(otherUserId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return { data: null, error: new Error('Not authenticated') } as any;
  
  if (uid === otherUserId) {
    return { data: null, error: new Error('Cannot create conversation with yourself') } as any;
  }
  
  // Check if conversation already exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('type', 'direct')
    .or(`created_by.eq.${uid},created_by.eq.${otherUserId}`);
  
  // TODO: Better check for existing direct conversation
  
  // Create conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({
      type: 'direct',
      created_by: uid
    })
    .select()
    .single();
  
  if (convError) {
    return { data: null, error: convError };
  }
  
  // Add participants
  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: conv.id, user_id: uid, role: 'admin' },
      { conversation_id: conv.id, user_id: otherUserId, role: 'member' }
    ]);
  
  if (partError) {
    // Clean up conversation if participants failed
    await supabase.from('conversations').delete().eq('id', conv.id);
    return { data: null, error: partError };
  }
  
  return { data: conv, error: null };
}

// Subscribe to new messages in a conversation
export function subscribeToMessages(
  conversationId: string,
  callback: (message: MessageWithSender) => void
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        const message = payload.new as Message;
        
        // Fetch sender info
        const { data: sender } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', message.sender_id)
          .single();
        
        callback({
          ...message,
          sender: sender || { id: message.sender_id, full_name: 'Unknown', email: '' }
        } as MessageWithSender);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}