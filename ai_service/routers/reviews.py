"""
Reviews router for paginated review data with filters
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
import json
from pathlib import Path
import pandas as pd
from functools import lru_cache
import time

# IMPORT CORRETTO:
from ..models import (
    Review,
    ReviewPage,
    ReviewQuery
)

router = APIRouter()

# Cache for loaded review data (TTL 10 minutes)
_cache: Dict[str, tuple[pd.DataFrame, float]] = {}
CACHE_TTL = 600  # 10 minutes


def load_reviews(project_id: str) -> pd.DataFrame:
    """
    Load reviews from JSONL file with caching
    """
    current_time = time.time()
    
    # Check cache
    if project_id in _cache:
        df, timestamp = _cache[project_id]
        if current_time - timestamp < CACHE_TTL:
            return df
    
    # Load from file
    base_paths = [
        Path(f"./out/{project_id}_reviews.jsonl"),
        Path(f"./pipeline/out/{project_id}_reviews.jsonl"),
        Path(f"../pipeline/out/{project_id}_reviews.jsonl"),
        Path(f"./public/demo/projects/{project_id}_reviews.jsonl"),
        Path(f"../public/demo/projects/{project_id}_reviews.jsonl"),
        # AGGIUNGI PATH PER SVILUPPO:
        Path(f"./{project_id}_reviews.jsonl"),
        Path(f"./data/{project_id}_reviews.jsonl"),
    ]
    
    for path in base_paths:
        if path.exists():
            try:
                df = pd.read_json(path, lines=True)
                # Convert date strings to datetime
                if 'date' in df.columns:
                    df['date'] = pd.to_datetime(df['date'], errors='coerce')
                # Cache the dataframe
                _cache[project_id] = (df, current_time)
                return df
            except Exception as e:
                print(f"Error loading {path}: {e}")
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
    """
    Get paginated reviews with filters
    """
    # Load data
    try:
        df = load_reviews(projectId)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading reviews: {str(e)}")
    
    # Apply filters
    if q:
        mask = df['text'].str.contains(q, case=False, na=False)
        df = df[mask]
    
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
            date_from = pd.to_datetime(dateFrom)
            df = df[df['date'] >= date_from]
        except:
            pass
    
    if dateTo:
        try:
            date_to = pd.to_datetime(dateTo)
            df = df[df['date'] <= date_to]
        except:
            pass
    
    # Sort
    sort_column = sort
    if sort_column == 'date' and 'date' not in df.columns:
        sort_column = 'sentiment'  # Fallback if no date column
    
    if sort_column in df.columns:
        df = df.sort_values(by=sort_column, ascending=(order == 'asc'))
    
    # Calculate total before pagination
    total = len(df)
    
    # Pagination
    start = (page - 1) * pageSize
    end = start + pageSize
    df_page = df.iloc[start:end]
    
    # Convert to response format
    items = []
    for _, row in df_page.iterrows():
        items.append(Review(
            id=str(row.get('id', '')),
            text=str(row.get('text', '')),
            clusterId=row.get('clusterId'),
            clusterLabel=row.get('clusterLabel'),
            sentiment=float(row.get('sentiment', 0)),
            lang=str(row.get('lang', 'unknown')),
            date=row.get('date').strftime('%Y-%m-%d') if pd.notna(row.get('date')) else None,
            rating=float(row.get('rating')) if pd.notna(row.get('rating')) else None,
            sourceId=str(row.get('sourceId', '')),
            projectId=str(row.get('projectId', projectId))
        ))
    
    return ReviewPage(
        total=total,
        page=page,
        pageSize=pageSize,
        items=items
    )


@router.get("/reviews/stats")
async def get_review_stats(
    projectId: str = Query(..., description="Project ID")
) -> Dict[str, Any]:
    """
    Get statistics about reviews for a project
    """
    try:
        df = load_reviews(projectId)
    except HTTPException as e:
        raise e
    
    return {
        "total": len(df),
        "languages": df['lang'].value_counts().to_dict(),
        "clusters": df['clusterId'].value_counts().to_dict(),
        "sentiment": {
            "mean": float(df['sentiment'].mean()),
            "std": float(df['sentiment'].std()),
            "min": float(df['sentiment'].min()),
            "max": float(df['sentiment'].max())
        },
        "rating": {
            "mean": float(df['rating'].mean()) if 'rating' in df.columns else None,
            "distribution": df['rating'].value_counts().to_dict() if 'rating' in df.columns else {}
        }
    }