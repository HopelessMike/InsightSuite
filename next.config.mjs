/** @type {import('next').NextConfig} */
const BASE_PATH = "/InsightSuite";

const nextConfig = {
  basePath: BASE_PATH,
  reactStrictMode: true,

  // opzionali, mantieni i tuoi se già presenti
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },

  // 👇 rende disponibile in runtime (client/server) il base path
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH }
};

export default nextConfig;
