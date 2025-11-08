// Server component wrapper for static export compatibility
import SubmitAssignmentClient from './SubmitAssignmentClient';

// Required for static export with output: 'export'
export async function generateStaticParams() {
  return []; // Empty array allows dynamic generation at runtime
}

export const dynamicParams = true;

export default function SubmitAssignmentPage() {
  return <SubmitAssignmentClient />;
}
