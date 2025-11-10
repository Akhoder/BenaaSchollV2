import VerifyCertificateClient from './VerifyCertificateClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [];
}

export default function VerifyCertificatePage() {
  return <VerifyCertificateClient />;
}
