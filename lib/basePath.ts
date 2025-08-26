// lib/basePath.ts
// Punto di mount sul dominio "contenitore" (quello del portfolio)
const MICRO_MOUNT = "/InsightSuite";

// Fallback opzionale: se vuoi forzare un prefisso in qualche env
const ENV_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Rileva a runtime se l'app è montata sotto /InsightSuite (Microfrontends). */
function resolveBase(): string {
  if (typeof window === "undefined") {
    // SSR: usa il fallback ENV se presente, altrimenti nessun prefisso
    return ENV_BASE;
  }
  const { pathname } = window.location;
  // Esempi validi: /InsightSuite, /InsightSuite/, /InsightSuite/qualcosa
  if (
    pathname === MICRO_MOUNT ||
    pathname === MICRO_MOUNT + "/" ||
    pathname.startsWith(MICRO_MOUNT + "/")
  ) {
    return MICRO_MOUNT;
  }
  return ""; // dominio diretto *.vercel.app o dev locale
}

function norm(p: string) {
  return p.startsWith("/") ? p : `/${p}`;
}

/** Path sotto la base (per link/asset/API). */
export function withBase(p: string) {
  return `${resolveBase()}${norm(p)}`;
}

/** Path per le API.
 *  - Su dominio microfrontends: /InsightSuite/api/...
 *  - Su dominio diretto (o dev): /api/...
 */
export function withApiPath(p: string) {
  const s = norm(p);
  // Se già passi "api/..." o "/api/..." non duplico "api"
  const apiPath = s.startsWith("/api") ? s : `/api${s}`;
  const base = resolveBase();
  return base ? `${base}${apiPath}` : apiPath;
}

/** Path per asset statici (public/, file demo, ecc.). */
export function withAssetPath(p: string) {
  return withBase(p);
}
