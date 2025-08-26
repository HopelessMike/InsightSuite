// lib/basePath.ts
// Configurazione per microfrontends deployment
const MICRO_MOUNT = "/InsightSuite";

// Determina se siamo su Vercel diretto o attraverso microfrontend
function isDirectVercelDomain(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname.includes("vercel.app") || hostname === "localhost";
}

/** Rileva a runtime la base path corretta */
function resolveBase(): string {
  if (typeof window === "undefined") {
    // SSR: usa variabile d'ambiente se presente
    return process.env.NEXT_PUBLIC_BASE_PATH || "";
  }
  
  const { pathname, hostname } = window.location;
  
  // Se siamo su vercel.app diretto o localhost, nessun prefisso
  if (isDirectVercelDomain()) {
    return "";
  }
  
  // Altrimenti controlla se siamo sotto /InsightSuite (microfrontend)
  if (
    pathname === MICRO_MOUNT ||
    pathname === MICRO_MOUNT + "/" ||
    pathname.startsWith(MICRO_MOUNT + "/")
  ) {
    return MICRO_MOUNT;
  }
  
  return "";
}

function norm(p: string) {
  return p.startsWith("/") ? p : `/${p}`;
}

/** Path generico sotto la base */
export function withBase(p: string) {
  return `${resolveBase()}${norm(p)}`;
}

/** Path per le API.
 *  IMPORTANTE: Le API sono sempre sul dominio diretto Vercel, NON passano dal microfrontend
 */
export function withApiPath(p: string) {
  const s = norm(p);
  
  // Se siamo in ambiente browser e NON su dominio diretto
  if (typeof window !== "undefined" && !isDirectVercelDomain()) {
    // Usa URL assoluto per le API
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://v0-insight-suite.vercel.app";
    const apiPath = s.startsWith("/api") ? s : `/api${s}`;
    return `${apiBase}${apiPath}`;
  }
  
  // Altrimenti usa path relativo
  const apiPath = s.startsWith("/api") ? s : `/api${s}`;
  return apiPath;
}

/** Path per asset statici */
export function withAssetPath(p: string) {
  return withBase(p);
}