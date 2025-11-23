import ClassViewClient from './ClassViewClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function ClassViewPage() {
  return <ClassViewClient />;
}

      
