import QuizResultClient from './QuizResultClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function QuizResultPage() {
  return <QuizResultClient />;
}
