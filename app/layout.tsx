import './globals.css';
import type { Metadata } from 'next';
import { Inter, Poppins, Cairo } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';

// ✅ FONT OPTIMIZATION: Reduced weights and subsets for better performance
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'], // Reduced from 9 to 4 weights
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'], // Reduced from 9 to 3 weights
  variable: '--font-poppins',
  display: 'swap',
  preload: false, // Not critical, lazy load
  fallback: ['system-ui', 'arial']
});

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '600', '700'], // Reduced from 6 to 3 weights
  variable: '--font-cairo',
  display: 'swap',
  preload: false, // Not critical, lazy load
  fallback: ['system-ui', 'arial']
});

export const metadata: Metadata = {
  title: 'مدرسة البناء العلمي - Madrasat Al-Binaa Al-Ilmi',
  description: 'نظام إدارة مدرسي متعدد اللغات مع التحكم في الوصول القائم على الأدوار - Multi-language school management system with role-based access',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${poppins.variable} ${cairo.variable} font-sans antialiased`}>
        <link rel="icon" href="/icons/icon-144x144.png" />
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
