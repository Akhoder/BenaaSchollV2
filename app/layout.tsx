import './globals.css';
import type { Metadata } from 'next';
import { Inter, Poppins, Cairo, Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';

// ✅ FONT OPTIMIZATION: Modern, contemporary fonts for better design
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
});

// Modern display font for headings - Very popular in 2024
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'arial']
});

// Modern geometric sans-serif - Clean and professional
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'arial']
});

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  variable: '--font-cairo',
  display: 'swap',
  preload: false,
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
      <body className={`${inter.variable} ${plusJakarta.variable} ${dmSans.variable} ${cairo.variable} font-sans antialiased`}>
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
