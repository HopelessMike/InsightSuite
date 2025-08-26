# api/index.py
import os
import json
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

# Setup data directory
DATA_DIR = Path(__file__).resolve().parent / "insightsuite" / "_data"
os.environ.setdefault("INSIGHTS_DATA_DIR", str(DATA_DIR))

# Create FastAPI app
app = FastAPI(title="InsightSuite API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache for data
_cache: Dict[str, tuple[pd.DataFrame, float]] = {}
CACHE_TTL = 600  # 10 minutes

def load_reviews(project_id: str) -> pd.DataFrame:
    """Load reviews from JSONL file with caching"""
    now = time.time()
    if project_id in _cache:
        df, ts = _cache[project_id]
        if now - ts < CACHE_TTL:
            return df

    # Try to find the data file
    file_path = DATA_DIR / f"{project_id}_reviews.jsonl"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Reviews data not found for project {project_id}")
    
    try:
        df = pd.read_json(file_path, lines=True)
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
        _cache[project_id] = (df, now)
        return df
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading reviews: {str(e)}")

@app.get("/")
def info():
    """Root endpoint"""
    return {
        "ok": True,
        "service": "InsightSuite API",
        "version": "1.0.0",
        "endpoints": ["/health", "/api/reviews", "/api/reviews/stats"]
    }

@app.get("/health")
def health():
    """Health check endpoint"""
    return {
        "ok": True,
        "status": "healthy",
        "service": "InsightSuite",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/reviews")
async def get_reviews(
    projectId: str = Query(..., description="Project ID"),
    q: Optional[str] = Query(None, description="Search query"),
    clusterId: Optional[str] = Query(None, description="Filter by cluster ID"),
    lang: Optional[str] = Query(None, description="Filter by language"),
    ratingMin: Optional[int] = Query(None, ge=1, le=5),
    ratingMax: Optional[int] = Query(None, ge=1, le=5),
    sentimentMin: Optional[float] = Query(-1.0, ge=-1, le=1),
    sentimentMax: Optional[float] = Query(1.0, ge=-1, le=1),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    sort: str = Query("date", description="Sort field"),
    order: str = Query("desc", description="Sort order"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=200)
):
    """Get paginated reviews with filters"""
    try:
        df = load_reviews(projectId)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading reviews: {str(e)}")

    # Apply filters
    if q:
        df = df[df['text'].str.contains(q, case=False, na=False)]
    if clusterId:
        df = df[df['clusterId'] == clusterId]
    if lang:
        df = df[df['lang'] == lang]
    if ratingMin is not None:
        df = df[df['rating'] >= ratingMin]
    if ratingMax is not None:
        df = df[df['rating'] <= ratingMax]
    if sentimentMin is not None:
        df = df[df['sentiment'] >= sentimentMin]
    if sentimentMax is not None:
        df = df[df['sentiment'] <= sentimentMax]
    if dateFrom:
        try:
            df = df[df['date'] >= pd.to_datetime(dateFrom)]
        except:
            pass
    if dateTo:
        try:
            df = df[df['date'] <= pd.to_datetime(dateTo)]
        except:
            pass

    # Sort
    sort_col = sort if sort in df.columns else 'date'
    if sort_col in df.columns:
        df = df.sort_values(by=sort_col, ascending=(order == 'asc'))
    
    # Paginate
    total = len(df)
    start = (page - 1) * pageSize
    end = start + pageSize
    page_df = df.iloc[start:end]

    # Format response
    items = []
    for _, row in page_df.iterrows():
        items.append({
            "id": str(row.get('id', '')),
            "text": str(row.get('text', '')),
            "clusterId": row.get('clusterId'),
            "clusterLabel": row.get('clusterLabel'),
            "sentiment": float(row.get('sentiment', 0)),
            "lang": str(row.get('lang', 'unknown')),
            "date": row.get('date').strftime('%Y-%m-%d') if pd.notna(row.get('date')) else None,
            "rating": float(row.get('rating')) if 'rating' in row and pd.notna(row.get('rating')) else None,
            "sourceId": str(row.get('sourceId', '')),
            "projectId": str(row.get('projectId', projectId))
        })

    return {
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "items": items
    }

@app.get("/api/reviews/stats")
async def get_review_stats(projectId: str = Query(...)):
    """Get review statistics"""
    try:
        df = load_reviews(projectId)
    except HTTPException as e:
        raise e
    
    return {
        "total": int(len(df)),
        "languages": df['lang'].value_counts(dropna=False).to_dict() if 'lang' in df.columns else {},
        "clusters": df['clusterId'].value_counts(dropna=False).to_dict() if 'clusterId' in df.columns else {},
        "sentiment": {
            "mean": float(df['sentiment'].mean()) if 'sentiment' in df.columns else 0,
            "std": float(df['sentiment'].std()) if 'sentiment' in df.columns else 0,
            "min": float(df['sentiment'].min()) if 'sentiment' in df.columns else 0,
            "max": float(df['sentiment'].max()) if 'sentiment' in df.columns else 0
        },
        "rating": {
            "mean": float(df['rating'].mean()) if 'rating' in df.columns else None,
            "distribution": df['rating'].value_counts(dropna=False).to_dict() if 'rating' in df.columns else {}
        }
    }

@app.get("/api/debug")
async def debug_info():
    """Debug endpoint"""
    debug_data = {
        "cwd": str(Path.cwd()),
        "file_path": str(Path(__file__).parent),
        "data_dir": str(DATA_DIR),
        "data_dir_exists": DATA_DIR.exists(),
        "files_in_data_dir": []
    }
    
    if DATA_DIR.exists():
        debug_data["files_in_data_dir"] = [f.name for f in DATA_DIR.glob("*.jsonl")]
    
    return debug_data

# Handler for Vercel
handler = app