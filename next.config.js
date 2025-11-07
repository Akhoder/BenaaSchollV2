/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ IMAGE OPTIMIZATION: Enable Next.js image optimization
  images: { 
    unoptimized: false, // Changed to false to enable optimization
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
    ],
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
  // استخدام webpack بدلاً من Turbopack
  webpack: (config, { isServer }) => {
    // قمع تحذيرات Supabase
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase/ },
    ];
    return config;
  },
  // إعدادات Turbopack (Next.js 16+)
  // إضافة config فارغ لإسكات التحذير
  turbopack: {},
  // ضغط الملفات
  compress: true,
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
