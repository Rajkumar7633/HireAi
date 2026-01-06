/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode
  reactStrictMode: true,
  
  // Configure images
  images: {
    domains: [
      'localhost', 
      'your-s3-bucket-name.s3.amazonaws.com',
      'hireai-frontend-alb-*.us-east-1.elb.amazonaws.com',
      'hireai-backend-alb-*.us-east-1.elb.amazonaws.com'
    ],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001',
  },
  
  // Webpack configurations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fixes npm packages that depend on `fs` module
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
  
  // Enable server actions (no longer experimental in Next.js 14+)
  experimental: {
    // Add any experimental features here
  },
  
  // Handle module path aliases
  // Make sure these match your jsconfig.json/tsconfig.json
  basePath: '',
  transpilePackages: ['@/components', '@/hooks'],
};

module.exports = nextConfig;
