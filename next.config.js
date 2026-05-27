/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode
  reactStrictMode: true,

  // Remove X-Powered-By header (security)
  poweredByHeader: false,

  // Enable gzip compression (useful when not behind Nginx)
  compress: true,

  // Skip ESLint errors during builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configure images (Cloudinary + local + unoptimized for Docker)
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001',
  },

  // Webpack configurations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },

  // Enable standalone output for Docker
  output: 'standalone',

  // Security headers (merged from next.config.mjs)
  async headers() {
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: blob: https://res.cloudinary.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' *",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },

  // Proxy /api/backend/* → backend Express server
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/:path*`,
      },
    ];
  },

  basePath: '',
};

module.exports = nextConfig;
