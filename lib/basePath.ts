// lib/basePath.ts
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Restituisce un path sempre corretto sotto il basePath */
export function withBase(p: string) {
  const s = p.startsWith("/") ? p : `/${p}`;
  return `${BASE}${s}`;
}

/** 
 * Restituisce il path corretto per le API - non aggiunge basePath su dominio Vercel diretto
 */
export function withApiPath(p: string) {
  const s = p.startsWith("/") ? p : `/${p}`;
  
  // Se siamo sul dominio Vercel diretto, non aggiungere basePath per le API
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return s;
  }
  
  // Altrimenti usa il basePath normale
  return `${BASE}${s}`;
}

/**
 * Restituisce il path corretto per asset statici
 */
export function withAssetPath(p: string) {
  const s = p.startsWith("/") ? p : `/${p}`;
  return `${BASE}${s}`;
}
