import SubmitAssignmentClient from './SubmitAssignmentClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function SubmitAssignmentPage() {
  return <SubmitAssignmentClient />;
}
