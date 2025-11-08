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
  // (bolt.new يستخدم webpack بسبب مشاكل WASM مع Turbopack)
  webpack: (config, { isServer }) => {
    // قمع تحذيرات Supabase
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase/ },
    ];
    return config;
  },
  // ضغط الملفات
  compress: true,
  // ✅ PERFORMANCE: Add production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  // ملاحظة: headers() تم إزالتها لأنها لا تعمل مع output: 'export'
  // إذا كنت تحتاج إلى headers للأمان، أضفها في:
  // - Nginx/Apache (للـ server)
  // - CDN settings (Cloudflare, Vercel, إلخ)
  // - أو أزل output: 'export' من إعدادات CI/CD
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         {
  //           key: 'X-Content-Type-Options',
  //           value: 'nosniff',
  //         },
  //         {
  //           key: 'X-Frame-Options',
  //           value: 'DENY',
  //         },
  //         {
  //           key: 'X-XSS-Protection',
  //           value: '1; mode=block',
  //         },
  //       ],
  //     },
  //     {
  //       source: '/api/(.*)',
  //       headers: [
  //         {
  //           key: 'Cache-Control',
  //           value: 'public, max-age=60, s-maxage=60',
  //         },
  //       ],
  //     },
  //   ];
  // },
};

module.exports = nextConfig;
