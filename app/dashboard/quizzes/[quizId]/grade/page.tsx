// Server component wrapper for static export compatibility
import GradeQuizClient from './GradeQuizClient';

// Required for static export with output: 'export'
export async function generateStaticParams() {
  return []; // Empty array allows dynamic generation at runtime
}

export const dynamicParams = true;

export default function GradeQuizPage() {
  return <GradeQuizClient />;
}
