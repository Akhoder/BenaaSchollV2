/**
 * Quiz Grading Utilities
 *
 * توفر هذه الوحدة دوال موحدة لحساب وإدارة درجات الاختبارات
 * تضمن الاتساق في حساب الدرجات عبر جميع أجزاء التطبيق
 */

export interface QuizQuestion {
  id: string;
  type: 'mcq_single' | 'mcq_multi' | 'true_false' | 'short_text' | 'numeric' | 'ordering' | 'matching';
  points: number;
}

export interface QuizAnswer {
  id: string;
  question_id: string;
  is_correct?: boolean | null;
  points_awarded?: number | null;
  answer_payload?: any;
}

export interface QuizAttempt {
  id: string;
  score?: number | null;
  status: 'in_progress' | 'submitted' | 'graded';
}

/**
 * يحدد ما إذا كان نوع السؤال يتم تصحيحه تلقائياً
 */
export function isAutoGradedQuestion(type: string): boolean {
  return ['mcq_single', 'mcq_multi', 'true_false', 'numeric'].includes(type);
}

/**
 * يحسب النقاط الممنوحة لإجابة واحدة بناءً على قاعدة موحدة:
 *
 * القاعدة الموحدة:
 * 1. إذا كان points_awarded موجود وصحيح → استخدمه
 * 2. وإلا:
 *    - للأسئلة التلقائية: استخدم is_correct
 *    - للأسئلة اليدوية: اعتبر غير مصحح (null)
 *
 * @param answer - إجابة الطالب
 * @param question - السؤال المرتبط
 * @returns النقاط الممنوحة أو null إذا لم يتم التصحيح
 */
export function calculateAnswerPoints(
  answer: QuizAnswer | undefined,
  question: QuizQuestion
): number | null {
  if (!answer) {
    return null;
  }

  const questionPoints = Number(question.points) || 1;
  const autoGraded = isAutoGradedQuestion(question.type);

  // ✅ القاعدة 1: إذا كان points_awarded موجود وصحيح
  if (answer.points_awarded !== null && answer.points_awarded !== undefined) {
    const points = Number(answer.points_awarded);
    if (!isNaN(points) && points >= 0) {
      return points;
    }
  }

  // ✅ القاعدة 2أ: للأسئلة التلقائية - استخدم is_correct
  if (autoGraded && typeof answer.is_correct === 'boolean') {
    return answer.is_correct ? questionPoints : 0;
  }

  // ✅ القاعدة 2ب: للأسئلة اليدوية - اعتبر غير مصحح
  return null;
}

/**
 * يحسب الدرجة الإجمالية للمحاولة
 *
 * @param questions - قائمة الأسئلة
 * @param answers - قائمة الإجابات (مرتبطة بـ question_id)
 * @returns الدرجة الإجمالية
 */
export function calculateAttemptScore(
  questions: QuizQuestion[],
  answers: Record<string, QuizAnswer>
): number {
  let totalScore = 0;

  for (const question of questions) {
    const answer = answers[question.id];
    const points = calculateAnswerPoints(answer, question);

    if (points !== null) {
      totalScore += points;
    }
  }

  return totalScore;
}

/**
 * يحسب إجمالي النقاط المتاحة للاختبار
 */
export function calculateTotalPoints(questions: QuizQuestion[]): number {
  return questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
}

/**
 * يحسب النسبة المئوية للدرجة
 */
export function calculatePercentage(score: number, totalPoints: number): number {
  if (!totalPoints || totalPoints === 0) return 0;
  const percentage = (score / totalPoints) * 100;
  return Math.max(0, Math.min(100, Math.round(percentage)));
}

/**
 * يحدد ما إذا كانت الإجابة صحيحة بناءً على القاعدة الموحدة
 *
 * @returns true إذا كانت صحيحة، false إذا كانت خاطئة، undefined إذا لم يتم التصحيح
 */
export function isAnswerCorrect(
  answer: QuizAnswer | undefined,
  question: QuizQuestion
): boolean | undefined {
  if (!answer) {
    return undefined;
  }

  const questionPoints = Number(question.points) || 1;
  const autoGraded = isAutoGradedQuestion(question.type);

  // ✅ أولاً: تحقق من is_correct إذا كان موجوداً بشكل صريح
  if (typeof answer.is_correct === 'boolean') {
    return answer.is_correct;
  }

  // ✅ ثانياً: استنتج من points_awarded
  if (answer.points_awarded !== null && answer.points_awarded !== undefined) {
    const points = Number(answer.points_awarded);
    if (!isNaN(points) && points >= 0) {
      // للأسئلة التلقائية: صحيحة إذا كانت النقاط تساوي نقاط السؤال
      if (autoGraded) {
        return points === questionPoints;
      }
      // للأسئلة اليدوية: صحيحة إذا حصل على أي نقاط
      return points > 0;
    }
  }

  // ✅ غير مصحح
  return undefined;
}

/**
 * يحسب إحصائيات الإجابات (صحيح، خطأ، غير مصحح)
 */
export function calculateAnswerStats(
  questions: QuizQuestion[],
  answers: Record<string, QuizAnswer>
): { correct: number; wrong: number; notGraded: number; total: number } {
  let correct = 0;
  let wrong = 0;
  let notGraded = 0;

  for (const question of questions) {
    const answer = answers[question.id];
    const isCorrect = isAnswerCorrect(answer, question);

    if (isCorrect === true) {
      correct++;
    } else if (isCorrect === false) {
      wrong++;
    } else {
      notGraded++;
    }
  }

  return {
    correct,
    wrong,
    notGraded,
    total: questions.length,
  };
}

/**
 * يتحقق من صحة اتساق البيانات
 * يطبع تحذيراً في development mode إذا كانت هناك تناقضات
 */
export function validateAnswerConsistency(
  answer: QuizAnswer,
  question: QuizQuestion
): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return true;
  }

  const questionPoints = Number(question.points) || 1;
  const autoGraded = isAutoGradedQuestion(question.type);

  // فقط للأسئلة التلقائية
  if (autoGraded && typeof answer.is_correct === 'boolean' &&
      answer.points_awarded !== null && answer.points_awarded !== undefined) {
    const points = Number(answer.points_awarded);
    const expectedPoints = answer.is_correct ? questionPoints : 0;

    if (Math.abs(points - expectedPoints) > 0.01) {
      console.warn('⚠️ Inconsistent grading data:', {
        questionId: question.id,
        questionType: question.type,
        isCorrect: answer.is_correct,
        pointsAwarded: points,
        expectedPoints,
        questionPoints,
      });
      return false;
    }
  }

  return true;
}

/**
 * يحسب الدرجة النهائية من attempt أو من حساب الإجابات
 * يعطي الأولوية لـ attempt.score إذا كانت موجودة وصحيحة
 */
export function getFinalScore(
  attempt: QuizAttempt | null,
  questions: QuizQuestion[],
  answers: Record<string, QuizAnswer>
): number {
  // ✅ أولوية: استخدم attempt.score إذا كانت موجودة وصحيحة
  if (attempt?.score !== null && attempt?.score !== undefined) {
    const score = Number(attempt.score);
    if (!isNaN(score) && score >= 0) {
      return score;
    }
  }

  // ✅ بديل: احسب من الإجابات
  return calculateAttemptScore(questions, answers);
}
