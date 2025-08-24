# api/insightsuite/[...path].py
import os, sys
from pathlib import Path
from fastapi import FastAPI

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

DATA_DIR = Path(__file__).resolve().parent / "_data"
os.environ.setdefault("INSIGHTS_DATA_DIR", str(DATA_DIR))

app = FastAPI(title="InsightSuite API")

try:
    from ai_service.routers import health, reviews, jobs
    app.include_router(health.router)
    app.include_router(reviews.router)
    app.include_router(jobs.router)
except Exception as e:
    @app.get("/health")
    def health_fallback():
        return {"ok": False, "error": f"routers not loaded: {e.__class__.__name__}: {e}"}
