# ai_service/main.py
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers ufficiali dell'app (mantieni SOLO questi in ai_service/routers/)
from .routers import health, reviews, jobs


def _allowed_origins() -> List[str]:
    """
    Origini per CORS. Se non specificato, consenti tutto (utile per integrazione MFE).
    Puoi restringere a 'https://michelemiranda.com' e ai tuoi domini Vercel quando stabilizzato.
    """
    raw = os.getenv("ALLOWED_ORIGINS")
    if not raw:
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


app = FastAPI(
    title="InsightSuite AI Service",
    description="Backend service for customer feedback analysis",
    version="1.0.0",
    contact={"name": "InsightSuite", "url": "https://michelemiranda.com/InsightSuite"},
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS (consenti credenziali solo se necessario)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Monta i router SENZA prefisso /api.
# Importante: su Vercel, il file api/index.py monterà questa app ASGI su /api,
# quindi gli URL esterni saranno /api/health, /api/reviews, /api/jobs, ecc.
app.include_router(health.router, tags=["health"])
app.include_router(reviews.router, tags=["reviews"])
app.include_router(jobs.router, tags=["jobs"])

# ─────────────────────────────────────────────────────────────────────────────
# Root informativa (raggiungibile a /api/ in produzione Vercel)
@app.get("/", tags=["root"])
async def root():
    return {
        "message": "InsightSuite AI Service",
        "version": "1.0.0",
        "time_utc": datetime.now(timezone.utc).isoformat(),
        "docs": "/docs",
        "health": "/health",
    }


# Esecuzione locale (opzionale): `python -m ai_service.main`
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "ai_service.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
        log_level="info",
    )
