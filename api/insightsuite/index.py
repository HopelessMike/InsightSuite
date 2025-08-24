# api/insightsuite/index.py
import os, sys
from pathlib import Path
from fastapi import FastAPI

# Rende importabile il root del progetto (per ai_service.*)
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Directory con i dati JSONL inclusi nel bundle serverless
DATA_DIR = Path(__file__).resolve().parent / "_data"
os.environ.setdefault("INSIGHTS_DATA_DIR", str(DATA_DIR))

# Costruisci SEMPRE l'app qui e registra i router esplicitamente
app = FastAPI(title="InsightSuite API")

try:
    from ai_service.routers import health, reviews, jobs
    app.include_router(health.router)   # GET /health
    app.include_router(reviews.router)  # GET /reviews, /reviews/stats
    app.include_router(jobs.router)     # /jobs/*
except Exception as e:
    # Fallback minimale per diagnosi
    @app.get("/health")
    def health_fallback():
        return {"ok": False, "error": f"routers not loaded: {e.__class__.__name__}: {e}"}
