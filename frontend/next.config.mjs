/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['http://127.0.0.1:*', 'http://localhost:*'],
  // Environment variables for API URL
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api'
  },
  // Static export for combined deployment with Express backend
  output: 'export',
  // Disable image optimization for static export
  images: { unoptimized: true }
};

export default nextConfig;
