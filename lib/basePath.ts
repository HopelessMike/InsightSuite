// lib/basePath.ts
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
/** Restituisce un path sempre corretto sotto il basePath */
export function withBase(p: string) {
  const s = p.startsWith("/") ? p : `/${p}`;
  return `${BASE}${s}`;
}
