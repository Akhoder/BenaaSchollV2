import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';

// ✅ ULTRA MODERN FONTS - خطوط عصرية 2024
// تم تحميل الخطوط عبر CSS @import في globals.css لتجنب مشاكل التحميل في وضع التطوير
// Poppins & Cairo - يتم تحميلهما من Google Fonts عبر CSS مباشرة
// Fallback fonts: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif

// Get base URL from environment variable or use default
// In production, set NEXT_PUBLIC_APP_URL to your domain (e.g., https://benaaschool.ly)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://benaa-school.bolt.host';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
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
      <body className="font-sans antialiased">
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
