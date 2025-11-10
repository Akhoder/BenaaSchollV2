import GradeQuizClient from './GradeQuizClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function GradeQuizPage() {
  return <GradeQuizClient />;
}
