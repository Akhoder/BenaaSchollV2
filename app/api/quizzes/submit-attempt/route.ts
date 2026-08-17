import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { submitAndGradeAttempt } from '@/lib/quizGrading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-side quiz submission + auto-grading. Correctness is decided here, with a service-role
// client that reads quiz_options.is_correct / quiz_questions.media_url — data the browser never
// receives while the quiz is open (see fetchQuizBundleForTaking). This is also the only path
// that can flip a quiz_attempts row to 'graded'/'submitted' with a score, closing the gap where
// a student could otherwise call the Supabase client directly to fabricate their own score.
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userRes, error: userError } = await userClient.auth.getUser();
    if (userError || !userRes?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = userRes.user.id;

    const body = await request.json();
    const attemptId = body?.attemptId as string | undefined;
    const durationSeconds = typeof body?.durationSeconds === 'number' ? body.durationSeconds : undefined;
    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId is required' }, { status: 400 });
    }

    // Look up the attempt with the admin client (avoids any RLS recursion) and verify ownership.
    const { data: attempt, error: attemptError } = await adminClient
      .from('quiz_attempts')
      .select('id, student_id, status')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }
    if (attempt.student_id !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Attempt is not in progress' }, { status: 409 });
    }

    const { data, error } = await submitAndGradeAttempt(adminClient, attemptId, durationSeconds);
    if (error) {
      console.error('Error submitting/grading attempt:', error);
      return NextResponse.json({ error: 'Failed to submit attempt' }, { status: 500 });
    }

    return NextResponse.json({ score: data?.score ?? 0, status: data?.status ?? 'submitted' });
  } catch (error: any) {
    console.error('Error in submit-attempt route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
