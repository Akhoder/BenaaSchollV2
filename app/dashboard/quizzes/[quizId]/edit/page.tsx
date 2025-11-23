import EditQuizClient from './EditQuizClient';

export const dynamic = 'force-static';

import { PageHeader } from '@/components/PageHeader';


interface Question {
  id: string;
  type: 'mcq_single' | 'mcq_multi' | 'true_false' | 'short_text' | 'numeric';
  text: string;
  points: number;
  order_index: number;
  options?: QuestionOption[];
  correct_answer?: string | number | boolean | null;
  tolerance?: number;
  media_url?: string | null;
}

interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
}

export default function EditQuizPage() {
  return <EditQuizClient />;
}
