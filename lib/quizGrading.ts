import type { SupabaseClient } from '@supabase/supabase-js';

// Single source of truth for quiz grading. Parameterized by a Supabase client instance so the
// same logic can run with either the browser anon client (existing teacher-grading UI flows)
// or a service-role client (server-side submit endpoint).

export type QuizQuestionType =
  | 'mcq_single'
  | 'mcq_multi'
  | 'true_false'
  | 'short_text'
  | 'numeric'
  | 'ordering'
  | 'matching';

const AUTO_GRADABLE_TYPES: QuizQuestionType[] = ['mcq_single', 'mcq_multi', 'true_false', 'numeric'];

export function isAutoGradable(type: string): boolean {
  return AUTO_GRADABLE_TYPES.includes(type as QuizQuestionType);
}

/**
 * Grades a single answer against the current answer key. Returns null for question types that
 * require manual grading (short_text, and any not-yet-implemented type like ordering/matching).
 */
export function computeAutoGrade(
  question: { type: string; points?: number | null; media_url?: string | null },
  options: Array<{ id: string; text: string; is_correct: boolean; order_index?: number }>,
  answerPayload: any
): { is_correct: boolean; points_awarded: number } | null {
  if (!isAutoGradable(question.type)) return null;
  const points = Math.max(1, Number(question.points) || 1);

  if (question.type === 'mcq_single') {
    const selected = (answerPayload?.selected_option_ids || [])[0];
    const correctOpt = options.find((o) => o.is_correct);
    const correct = !!selected && !!correctOpt && selected === correctOpt.id;
    return { is_correct: correct, points_awarded: correct ? points : 0 };
  }

  if (question.type === 'mcq_multi') {
    const selected: string[] = answerPayload?.selected_option_ids || [];
    const correctIds = options.filter((o) => o.is_correct).map((o) => o.id).sort();
    const selSorted = [...selected].sort();
    const correct = JSON.stringify(correctIds) === JSON.stringify(selSorted);
    return { is_correct: correct, points_awarded: correct ? points : 0 };
  }

  if (question.type === 'true_false') {
    const provided = answerPayload?.bool;
    const correctOpt = options.find((o) => o.is_correct);
    // order_index 0 = True, order_index 1 = False (language-independent)
    const correctVal = correctOpt ? correctOpt.order_index === 0 : undefined;
    const correct = typeof provided === 'boolean' && typeof correctVal === 'boolean' && provided === correctVal;
    return { is_correct: correct, points_awarded: correct ? points : 0 };
  }

  // numeric: correct value lives in the single quiz_options row (is_correct=true), tolerance in media_url
  const provided = answerPayload?.number;
  const correctOpt = options.find((o) => o.is_correct);
  const correctVal = correctOpt ? Number(correctOpt.text) : undefined;
  const tol = question.media_url ? Number(question.media_url) : 0;
  const providedNum = typeof provided === 'number' && !isNaN(provided) ? provided : undefined;
  const correctNum = typeof correctVal === 'number' && !isNaN(correctVal) ? correctVal : undefined;
  const tolNum = !isNaN(tol) && tol >= 0 ? tol : 0;
  const correct =
    providedNum !== undefined && correctNum !== undefined && Math.abs(providedNum - correctNum) <= tolNum;
  return { is_correct: correct, points_awarded: correct ? points : 0 };
}

const ATTEMPT_SELECT = 'id, quiz_id, student_id, score, status, submitted_at, started_at, duration_seconds, attempt_number';

/**
 * Writes the final score/status for an attempt, preserving the retry-on-trigger-error behavior
 * the previous updateAttemptScore() had. `status` is explicit — callers decide 'graded' vs
 * 'submitted' (an attempt with any ungraded manually-graded answer must stay 'submitted').
 */
export async function setAttemptScoreAndStatus(
  client: SupabaseClient,
  attemptId: string,
  score: number,
  status: 'graded' | 'submitted'
): Promise<{ data: any; error: any }> {
  const validScore = typeof score === 'number' && !isNaN(score) && score >= 0 ? score : 0;

  const { data: currentAttempt } = await client
    .from('quiz_attempts')
    .select('submitted_at, status')
    .eq('id', attemptId)
    .single();

  const updateData: any = { status, score: validScore };
  if (!currentAttempt?.submitted_at) {
    updateData.submitted_at = new Date().toISOString();
  }

  let result = await client
    .from('quiz_attempts')
    .update(updateData)
    .eq('id', attemptId)
    .select(ATTEMPT_SELECT)
    .single();

  // Some environments have a DB trigger that errors on this update path; fall back to a plain
  // update + re-select instead of the update+select-in-one-call form.
  if (result.error && result.error.code === '42703') {
    console.warn('Trigger error in setAttemptScoreAndStatus, trying direct update:', result.error);
    const { error: directError } = await client.from('quiz_attempts').update(updateData).eq('id', attemptId);
    if (!directError) {
      const { data: fetched } = await client
        .from('quiz_attempts')
        .select(ATTEMPT_SELECT)
        .eq('id', attemptId)
        .single();
      if (fetched) {
        if (fetched.status !== status) {
          await client.from('quiz_attempts').update({ status }).eq('id', attemptId);
          const { data: final } = await client
            .from('quiz_attempts')
            .select(ATTEMPT_SELECT)
            .eq('id', attemptId)
            .single();
          return { data: final || fetched, error: null };
        }
        return { data: fetched, error: null };
      }
    }
  }

  if (result.data) {
    if (result.data.status !== status) {
      await client.from('quiz_attempts').update({ status }).eq('id', attemptId);
      const { data: verified } = await client
        .from('quiz_attempts')
        .select(ATTEMPT_SELECT)
        .eq('id', attemptId)
        .single();
      return { data: verified || result.data, error: null };
    }
    return result;
  }

  if (result.error) {
    console.warn('Update failed, trying status-only update:', result.error);
    const { error: statusError } = await client
      .from('quiz_attempts')
      .update({ status, score: validScore })
      .eq('id', attemptId);
    if (!statusError) {
      const { data: final } = await client
        .from('quiz_attempts')
        .select(ATTEMPT_SELECT)
        .eq('id', attemptId)
        .single();
      return { data: final, error: null };
    }
  }

  return result;
}

/**
 * Recomputes an attempt's total score and status from its quiz_answers rows.
 *
 * - Never force-fails an answer that's still awaiting manual grading (is_correct AND
 *   points_awarded both null on a non-auto-gradable question) — it's left untouched and the
 *   resulting attempt status is 'submitted', not 'graded'.
 * - With opts.regrade, auto-gradable answers are re-derived from the CURRENT answer key
 *   (quiz_questions/quiz_options) instead of trusting previously-stored is_correct/points_awarded
 *   — used after a teacher edits a question's correct answer or points.
 */
export async function recalcAttemptScoreCore(
  client: SupabaseClient,
  attemptId: string,
  opts?: { regrade?: boolean }
): Promise<{ data: any; error: any }> {
  const regrade = !!opts?.regrade;

  const { data: answers } = await client
    .from('quiz_answers')
    .select('id, points_awarded, is_correct, question_id, answer_payload')
    .eq('attempt_id', attemptId);

  if (!answers || answers.length === 0) {
    return await setAttemptScoreAndStatus(client, attemptId, 0, 'graded');
  }

  const questionIds = Array.from(new Set(answers.map((a: any) => a.question_id)));
  const [{ data: questions }, { data: options }] = await Promise.all([
    client.from('quiz_questions').select('id, type, points, media_url').in('id', questionIds),
    client.from('quiz_options').select('id, question_id, text, is_correct, order_index').in('question_id', questionIds),
  ]);

  const questionMap = new Map((questions || []).map((q: any) => [q.id, q]));
  const optionsByQuestion = new Map<string, any[]>();
  (options || []).forEach((o: any) => {
    const arr = optionsByQuestion.get(o.question_id) || [];
    arr.push(o);
    optionsByQuestion.set(o.question_id, arr);
  });

  const answersToFix: Array<{ id: string; points: number; is_correct: boolean }> = [];
  let totalScore = 0;
  let hasPendingManualGrade = false;

  for (const ans of answers) {
    const question = questionMap.get(ans.question_id);
    if (!question) {
      // Orphaned answer (question deleted after the attempt) — don't guess, don't count.
      continue;
    }

    const questionPoints = Math.max(1, Number(question.points) || 1);
    const storedPoints = ans.points_awarded;
    const storedCorrect = ans.is_correct;

    if (isAutoGradable(question.type)) {
      const isUngraded = storedCorrect === null && storedPoints === null;
      if (regrade || isUngraded) {
        const graded = computeAutoGrade(question, optionsByQuestion.get(ans.question_id) || [], ans.answer_payload)!;
        if (graded.is_correct !== storedCorrect || Number(graded.points_awarded) !== Number(storedPoints)) {
          answersToFix.push({ id: ans.id, points: graded.points_awarded, is_correct: graded.is_correct });
        }
        totalScore += graded.points_awarded;
        continue;
      }
      // Trust stored grading, just reconcile is_correct/points_awarded consistency.
      if (storedCorrect === true) {
        if (Number(storedPoints) !== questionPoints) {
          answersToFix.push({ id: ans.id, points: questionPoints, is_correct: true });
        }
        totalScore += questionPoints;
      } else {
        if (Number(storedPoints || 0) !== 0) {
          answersToFix.push({ id: ans.id, points: 0, is_correct: false });
        }
      }
      continue;
    }

    // Manually-graded question type (short_text, etc.)
    if (storedCorrect === null && storedPoints === null) {
      // Still awaiting the teacher — leave it alone, don't count it yet.
      hasPendingManualGrade = true;
      continue;
    }
    const pointsNum =
      storedPoints !== null && storedPoints !== undefined && !isNaN(Number(storedPoints))
        ? Math.max(0, Math.min(Number(storedPoints), questionPoints))
        : 0;
    const shouldBeCorrect = pointsNum > 0;
    if (storedCorrect !== shouldBeCorrect || Number(storedPoints) !== pointsNum) {
      answersToFix.push({ id: ans.id, points: pointsNum, is_correct: shouldBeCorrect });
    }
    totalScore += pointsNum;
  }

  if (answersToFix.length > 0) {
    await Promise.all(
      answersToFix.map(async (ans) => {
        try {
          await client
            .from('quiz_answers')
            .update({ points_awarded: ans.points, is_correct: ans.is_correct, graded_at: new Date().toISOString() })
            .eq('id', ans.id);
        } catch (err) {
          console.warn(`Failed to fix answer ${ans.id}:`, err);
        }
      })
    );
  }

  const finalTotal = Math.max(0, totalScore);
  const finalStatus: 'graded' | 'submitted' = hasPendingManualGrade ? 'submitted' : 'graded';
  return await setAttemptScoreAndStatus(client, attemptId, finalTotal, finalStatus);
}

/**
 * Marks an in-progress attempt as submitted and grades it in one step. Used by the
 * server-side submit-attempt API route (with a service-role client) so correctness is always
 * decided on the server, never trusted from the browser.
 */
export async function submitAndGradeAttempt(
  client: SupabaseClient,
  attemptId: string,
  durationSeconds?: number
): Promise<{ data: any; error: any }> {
  const { error: submitError } = await client
    .from('quiz_attempts')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      duration_seconds: durationSeconds ?? null,
    })
    .eq('id', attemptId);
  if (submitError) return { data: null, error: submitError };

  return await recalcAttemptScoreCore(client, attemptId, { regrade: true });
}
