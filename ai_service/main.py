# ai_service/main.py
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .routers import health, reviews, jobs


def _allowed_origins() -> List[str]:
    raw = os.getenv("ALLOWED_ORIGINS")
    if not raw:
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


app = FastAPI(
    title="InsightSuite AI Service",
    description="Backend service for customer feedback analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    # La Function è esposta da Vercel sotto /api
    root_path="/api",
)

# 🔧 Middleware: rimuove il prefisso /InsightSuite quando l'app è montata nel Portfolio
@app.middleware("http")
async def strip_insightsuite_prefix(request: Request, call_next):
    # In Starlette/FastAPI, la route corrisponde a request.scope["path"]
    path = request.scope.get("path", "")
    if path.startswith("/InsightSuite/"):
        request.scope["path"] = path[len("/InsightSuite"):]
    elif path == "/InsightSuite":
        request.scope["path"] = "/"
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router SENZA prefisso /api (ci pensa root_path="/api")
app.include_router(health.router, tags=["health"])
app.include_router(reviews.router, tags=["reviews"])
app.include_router(jobs.router, tags=["jobs"])


@app.get("/", tags=["root"])
async def root():
    return {
        "message": "InsightSuite AI Service",
        "version": "1.0.0",
        "time_utc": datetime.now(timezone.utc).isoformat(),
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "ai_service.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
