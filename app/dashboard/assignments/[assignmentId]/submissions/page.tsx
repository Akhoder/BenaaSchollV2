import AssignmentSubmissionsClient from './AssignmentSubmissionsClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function AssignmentSubmissionsPage() {
  return <AssignmentSubmissionsClient />;
}
