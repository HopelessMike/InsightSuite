// next.config.mjs
import { withMicrofrontends } from '@vercel/microfrontends/next/config';

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  reactStrictMode: true,

  // ✅ niente basePath e niente assetPrefix: ci pensa Microfrontends
  // basePath: undefined,
  // assetPrefix: undefined,

  // (opzionali, come nel tuo file attuale)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },

  // Se il codice usa questa variabile per costruire URL (es. demo JSON, link assoluti),
  // tienila vuota in dev per evitare 404 locali e prefissata in prod su Vercel.
  env: {
    NEXT_PUBLIC_BASE_PATH: isDev ? "" : "/InsightSuite"
  }
};

export default withMicrofrontends(nextConfig);
