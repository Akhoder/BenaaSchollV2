import './globals.css';
import type { Metadata } from 'next';
import { Inter, Tajawal, Almarai, Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
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

// Modern Arabic font - Clean, elegant, professional
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['200', '300', '400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
});

// Beautiful Arabic font for headings - Saudi-designed, modern
const almarai = Almarai({
  subsets: ['arabic'],
  weight: ['400', '700', '800'],
  variable: '--font-almarai',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'arial']
});

export const metadata: Metadata = {
  title: 'مدرسة البناء العلمي - Madrasat Al-Binaa Al-Ilmi',
  description: 'نظام إدارة مدرسي متعدد اللغات مع التحكم في الوصول القائم على الأدوار - Multi-language school management system with role-based access',
  manifest: '/manifest.json',
  themeColor: '#15803d',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Benaa School',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Benaa School',
    title: 'مدرسة البناء العلمي | Benaa School',
    description: 'نظام إدارة مدرسي متعدد اللغات',
  },
  twitter: {
    card: 'summary',
    title: 'Benaa School',
    description: 'نظام إدارة مدرسي متعدد اللغات',
  },
  icons: {
    icon: '/icons/icon-144x144.png',
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${plusJakarta.variable} ${dmSans.variable} ${tajawal.variable} ${almarai.variable} font-sans antialiased`}>
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
