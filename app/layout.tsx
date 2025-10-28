import './globals.css';
import type { Metadata } from 'next';
import { Inter, Poppins, Cairo } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', 'arial']
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
  fallback: ['system-ui', 'arial']
});

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
  fallback: ['system-ui', 'arial']
});

export const metadata: Metadata = {
  title: 'BenaaSchool - School Management System',
  description: 'Multi-language school management system with role-based access',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${poppins.variable} ${cairo.variable} font-sans antialiased`}>
        <ServiceWorkerProvider>
          <LanguageProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
