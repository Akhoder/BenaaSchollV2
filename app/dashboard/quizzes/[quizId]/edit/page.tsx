import EditQuizClient from './EditQuizClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function EditQuizPage() {
  return <EditQuizClient />;
}
