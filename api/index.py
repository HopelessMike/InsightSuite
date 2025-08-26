# api/index.py
import os
from pathlib import Path
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

# Dati demo letti dai router
DATA_DIR = Path(__file__).resolve().parent / "insightsuite" / "_data"
os.environ.setdefault("INSIGHTS_DATA_DIR", str(DATA_DIR))

# App principale
app = FastAPI(title="InsightSuite API")

# CORS (puoi restringere i domini se vuoi)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # oppure ["https://michelemiranda.com", "https://*.vercel.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# /health e info root
@app.get("/")
def info():
    return {"ok": True, "service": "insightsuite", "endpoints": ["/health", "/api/*"]}

@app.get("/health")
def health():
    return {"ok": True, "service": "insightsuite", "path": "/health"}

# API reali sotto /api/*
api = APIRouter(prefix="/api")

# importa i router python esistenti
from ai_service.routers import reviews, jobs  # noqa: E402

api.include_router(reviews.router)
api.include_router(jobs.router)

# registra le API
app.include_router(api)

# (opzionale) esponi anche docs/swagger rediretti
# NB: Vercel rewriterà /docs e /openapi.json su questa funzione
