import SubjectCertificatesClient from './SubjectCertificatesClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function SubjectCertificatesPage() {
  return <SubjectCertificatesClient />;
}
