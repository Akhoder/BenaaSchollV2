import TakeQuizClient from './TakeQuizClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function TakeQuizPage() {
  return <TakeQuizClient />;
}
