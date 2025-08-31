// next.config.mjs  (InsightSuite)
import { withMicrofrontends } from '@vercel/microfrontends/next/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
};

export default withMicrofrontends(nextConfig);
