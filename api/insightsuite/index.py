import os, sys
from pathlib import Path
from fastapi import FastAPI

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

DATA_DIR = Path(__file__).resolve().parent / "_data"
os.environ.setdefault("INSIGHTS_DATA_DIR", str(DATA_DIR))

app = FastAPI(title="InsightSuite API")

# rotta di health SEMPRE presente a /health
@app.get("/health")
def health_root():
    return {"ok": True, "service": "insightsuite", "path": "/health"}

# includi i router della tua app
try:
    from ai_service.routers import health, reviews, jobs
    app.include_router(health.router)   # se qui hai prefix="/api/v1", rimane disponibile /api/v1/health
    app.include_router(reviews.router)
    app.include_router(jobs.router)
except Exception as e:
    # Diagnostica se l'import fallisce
    @app.get("/routers-status")
    def routers_status():
        return {"ok": False, "error": f"{e.__class__.__name__}: {e}"}
