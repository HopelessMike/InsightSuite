// next.config.mjs — InsightSuite (child)
import { withMicrofrontends } from '@vercel/microfrontends/next/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Facoltativo ma utile: “sfila” il prefisso se mai arrivasse al child
  async rewrites() {
    return [
      { source: '/InsightSuite', destination: '/' },
      { source: '/InsightSuite/:path*', destination: '/:path*' },
    ];
  },
};

export default withMicrofrontends(nextConfig);
