# api/index.py (INSIGHTSUITE)
import os
from pathlib import Path
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

# directory dati demo (jsonl) usati dalle API
DATA_DIR = Path(__file__).resolve().parent / "insightsuite" / "_data"
os.environ.setdefault("INSIGHTS_DATA_DIR", str(DATA_DIR))

app = FastAPI(title="InsightSuite API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # restringi ai tuoi domini in produzione se vuoi
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def info():
    return {"ok": True, "service": "insightsuite", "endpoints": ["/health", "/api/*"]}

@app.get("/health")
def health():
    return {"ok": True, "service": "insightsuite", "path": "/health"}

# Router /api/*
api = APIRouter(prefix="/api")

# importa i tuoi router reali (devono definire `router = APIRouter()`)
from ai_service.routers import reviews, jobs  # noqa: E402
api.include_router(reviews.router)
api.include_router(jobs.router)

app.include_router(api)
