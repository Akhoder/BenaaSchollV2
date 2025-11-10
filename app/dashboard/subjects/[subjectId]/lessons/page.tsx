import SubjectLessonsClient from './SubjectLessonsClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function SubjectLessonsPage() {
  return <SubjectLessonsClient />;
}
