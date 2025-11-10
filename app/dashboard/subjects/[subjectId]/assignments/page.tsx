import SubjectAssignmentsClient from './SubjectAssignmentsClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function SubjectAssignmentsPage() {
  return <SubjectAssignmentsClient />;
}
