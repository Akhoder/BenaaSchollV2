/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ✅ IMAGE OPTIMIZATION: Enable Next.js image optimization
  images: { 
    unoptimized: false, // Changed to false to enable optimization
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // تحسينات الأداء
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-icons',
      'recharts',
      'date-fns'
    ],
  },
  // ضغط الملفات
  compress: true,
  // تحسين البناء
  swcMinify: true,
  // ✅ PERFORMANCE: Add production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  // تحسين التخزين المؤقت
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
