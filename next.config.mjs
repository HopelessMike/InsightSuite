/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Quando arriva /InsightSuite/... dal main, instrada alle vere route del child
  async rewrites() {
    return [
      { source: '/InsightSuite', destination: '/' },
      { source: '/InsightSuite/:path*', destination: '/:path*' },
    ];
  },
};

export default nextConfig;
