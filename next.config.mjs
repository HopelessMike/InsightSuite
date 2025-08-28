/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // nessun basePath, nessun assetPrefix
  // niente variabile NEXT_PUBLIC_BASE_PATH qui

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true }
};

export default nextConfig;
