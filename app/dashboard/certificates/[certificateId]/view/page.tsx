import CertificateViewClient from './CertificateViewClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function CertificateViewPage() {
  return <CertificateViewClient />;
}
