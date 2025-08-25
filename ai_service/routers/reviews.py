"""
Reviews router for paginated review data with filters
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
import json, os
from pathlib import Path
import pandas as pd
from functools import lru_cache
import time

from ..models import Review, ReviewPage, ReviewQuery

router = APIRouter()

_cache: Dict[str, tuple[pd.DataFrame, float]] = {}
CACHE_TTL = 600  # 10 minutes

def load_reviews(project_id: str) -> pd.DataFrame:
    now = time.time()
    if project_id in _cache:
        df, ts = _cache[project_id]
        if now - ts < CACHE_TTL:
            return df

    data_dir_env = os.environ.get("INSIGHTS_DATA_DIR")
    paths = []
    if data_dir_env:
        paths.append(Path(data_dir_env) / f"{project_id}_reviews.jsonl")
    
    # Add more comprehensive paths for production
    current_dir = Path(__file__).parent.parent.parent  # Go to project root
    paths += [
        current_dir / "api" / "insightsuite" / "_data" / f"{project_id}_reviews.jsonl",
        current_dir / "pipeline" / "out" / f"{project_id}_reviews.jsonl", 
        current_dir / "public" / "demo" / "projects" / f"{project_id}_reviews.jsonl",
        Path(f"./out/{project_id}_reviews.jsonl"),
        Path(f"./pipeline/out/{project_id}_reviews.jsonl"),
        Path(f"../pipeline/out/{project_id}_reviews.jsonl"),
        Path(f"./public/demo/projects/{project_id}_reviews.jsonl"),
        Path(f"../public/demo/projects/{project_id}_reviews.jsonl"),
        Path(f"./{project_id}_reviews.jsonl"),
        Path(f"./data/{project_id}_reviews.jsonl"),
    ]

    # Try each path until we find the data file
    for i, p in enumerate(paths):
        if p.exists():
            try:
                df = pd.read_json(p, lines=True)
                if 'date' in df.columns:
                    df['date'] = pd.to_datetime(df['date'], errors='coerce')
                _cache[project_id] = (df, now)
                return df
            except Exception as e:
                # Continue to next path if this one fails
                continue
    raise HTTPException(status_code=404, detail=f"Reviews data not found for project {project_id}")

@router.get("/reviews", response_model=ReviewPage)
async def get_reviews(
    projectId: str = Query(..., description="Project ID (airbnb, mobile, ecommerce)"),
    q: Optional[str] = Query(None, description="Search query for text"),
    clusterId: Optional[str] = Query(None, description="Filter by cluster ID"),
    lang: Optional[str] = Query(None, description="Filter by language"),
    ratingMin: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating"),
    ratingMax: Optional[int] = Query(None, ge=1, le=5, description="Maximum rating"),
    sentimentMin: Optional[float] = Query(-1.0, ge=-1, le=1, description="Minimum sentiment"),
    sentimentMax: Optional[float] = Query(1.0, ge=-1, le=1, description="Maximum sentiment"),
    dateFrom: Optional[str] = Query(None, description="Start date (ISO format)"),
    dateTo: Optional[str] = Query(None, description="End date (ISO format)"),
    sort: Literal["date", "sentiment", "rating"] = Query("date", description="Sort field"),
    order: Literal["asc", "desc"] = Query("desc", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    pageSize: int = Query(50, ge=1, le=200, description="Page size")
) -> ReviewPage:
    try:
        df = load_reviews(projectId)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading reviews: {str(e)}")

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
        try: df = df[df['date'] >= pd.to_datetime(dateFrom)]
        except: pass
    if dateTo:
        try: df = df[df['date'] <= pd.to_datetime(dateTo)]
        except: pass

    sort_col = sort if sort in df.columns else 'sentiment'
    df = df.sort_values(by=sort_col, ascending=(order == 'asc'))
    total = len(df)
    start, end = (page - 1) * pageSize, (page - 1) * pageSize + pageSize
    page_df = df.iloc[start:end]

    items = []
    for _, row in page_df.iterrows():
        items.append(Review(
            id=str(row.get('id', '')),
            text=str(row.get('text', '')),
            clusterId=row.get('clusterId'),
            clusterLabel=row.get('clusterLabel'),
            sentiment=float(row.get('sentiment', 0)),
            lang=str(row.get('lang', 'unknown')),
            date=row.get('date').strftime('%Y-%m-%d') if pd.notna(row.get('date')) else None,
            rating=float(row.get('rating')) if 'rating' in row and pd.notna(row.get('rating')) else None,
            sourceId=str(row.get('sourceId', '')),
            projectId=str(row.get('projectId', projectId))
        ))

    return ReviewPage(total=total, page=page, pageSize=pageSize, items=items)

@router.get("/reviews/stats")
async def get_review_stats(projectId: str = Query(..., description="Project ID")) -> Dict[str, Any]:
    df = load_reviews(projectId)
    return {
        "total": int(len(df)),
        "languages": df['lang'].value_counts(dropna=False).to_dict(),
        "clusters": df['clusterId'].value_counts(dropna=False).to_dict(),
        "sentiment": {
            "mean": float(df['sentiment'].mean()),
            "std": float(df['sentiment'].std()),
            "min": float(df['sentiment'].min()),
            "max": float(df['sentiment'].max())
        },
        "rating": {
            "mean": float(df['rating'].mean()) if 'rating' in df.columns else None,
            "distribution": df['rating'].value_counts(dropna=False).to_dict() if 'rating' in df.columns else {}
        }
    }
