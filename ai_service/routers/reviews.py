"""
Reviews router for paginated review data with filters.
Funziona su Vercel (Serverless) leggendo i dataset inclusi nel bundle.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any, Literal
from pathlib import Path
import os
import time

import pandas as pd

from ..models import Review, ReviewPage

# ──────────────────────────────────────────────────────────────────────────────
# Percorso dati
# Priorità:
# 1) Variabile d'ambiente INSIGHTS_DATA_DIR (se impostata)
# 2) Cartella pacchettizzata nel bundle: ai_service/_data
# ──────────────────────────────────────────────────────────────────────────────
DEFAULT_DATA_DIR = Path(__file__).resolve().parents[1] / "_data"  # ai_service/_data

def _resolve_data_dir() -> Path:
    env_dir = os.environ.get("INSIGHTS_DATA_DIR")
    if env_dir:
        p = Path(env_dir)
        if p.exists():
            return p
    return DEFAULT_DATA_DIR

# Cache in-memory per evitare ricarichi ripetuti (TTL 10 min)
_CACHE: Dict[str, tuple[pd.DataFrame, float]] = {}
CACHE_TTL_SEC = 600

router = APIRouter()

def _load_jsonl(path: Path) -> pd.DataFrame:
    try:
        df = pd.read_json(path, lines=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading data file {path.name}: {e}")

    # Normalizzazioni/garanzie minime sulle colonne usate a valle
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # stringhe per sicurezza
    for col in ["id", "text", "clusterId", "clusterLabel", "lang", "sourceId", "projectId"]:
        if col in df.columns:
            df[col] = df[col].astype("string")

    # numerici per sicurezza
    if "sentiment" in df.columns:
        df["sentiment"] = pd.to_numeric(df["sentiment"], errors="coerce")
    if "rating" in df.columns:
        df["rating"] = pd.to_numeric(df["rating"], errors="coerce")

    return df


def load_reviews(project_id: str) -> pd.DataFrame:
    """
    Carica il dataset <project_id>_reviews.jsonl da:
      - $INSIGHTS_DATA_DIR se esiste
      - altrimenti ai_service/_data dentro il bundle
    Usa una cache in-memory con TTL.
    """
    now = time.time()
    if project_id in _CACHE:
        df, ts = _CACHE[project_id]
        if now - ts < CACHE_TTL_SEC:
            return df

    data_dir = _resolve_data_dir()
    data_file = data_dir / f"{project_id}_reviews.jsonl"

    if not data_file.exists():
        # Messaggio 404 chiaro (evita i vecchi path multipli e ambigui)
        raise HTTPException(
            status_code=404,
            detail=f"Reviews data not found for project '{project_id}' in {data_dir}"
        )

    df = _load_jsonl(data_file)
    _CACHE[project_id] = (df, now)
    return df


@router.get("/reviews", response_model=ReviewPage)
async def get_reviews(
    projectId: str = Query(..., description="Project ID (es: airbnb, mobile, ecommerce)"),
    q: Optional[str] = Query(None, description="Full-text search"),
    clusterId: Optional[str] = Query(None, description="Filter by cluster ID"),
    lang: Optional[str] = Query(None, description="Filter by language"),
    ratingMin: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating"),
    ratingMax: Optional[int] = Query(None, ge=1, le=5, description="Maximum rating"),
    sentimentMin: Optional[float] = Query(-1.0, ge=-1, le=1, description="Minimum sentiment"),
    sentimentMax: Optional[float] = Query(1.0, ge=-1, le=1, description="Maximum sentiment"),
    dateFrom: Optional[str] = Query(None, description="Start date (YYYY-MM-DD or ISO)"),
    dateTo: Optional[str] = Query(None, description="End date (YYYY-MM-DD or ISO)"),
    sort: Literal["date", "sentiment", "rating"] = Query("date", description="Sort field"),
    order: Literal["asc", "desc"] = Query("desc", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    pageSize: int = Query(50, ge=1, le=200, description="Page size"),
) -> ReviewPage:
    try:
        df = load_reviews(projectId)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading reviews: {e}")

    # Filtri
    if q and "text" in df.columns:
        df = df[df["text"].str.contains(q, case=False, na=False)]
    if clusterId and "clusterId" in df.columns:
        df = df[df["clusterId"] == clusterId]
    if lang and "lang" in df.columns:
        df = df[df["lang"] == lang]
    if ratingMin is not None and "rating" in df.columns:
        df = df[df["rating"] >= ratingMin]
    if ratingMax is not None and "rating" in df.columns:
        df = df[df["rating"] <= ratingMax]
    if sentimentMin is not None and "sentiment" in df.columns:
        df = df[df["sentiment"] >= sentimentMin]
    if sentimentMax is not None and "sentiment" in df.columns:
        df = df[df["sentiment"] <= sentimentMax]
    if dateFrom and "date" in df.columns:
        try:
            df = df[df["date"] >= pd.to_datetime(dateFrom)]
        except Exception:
            pass
    if dateTo and "date" in df.columns:
        try:
            df = df[df["date"] <= pd.to_datetime(dateTo)]
        except Exception:
            pass

    # Ordinamento (fallback su 'sentiment' se manca la colonna richiesta)
    sort_col = sort if sort in df.columns else ("sentiment" if "sentiment" in df.columns else None)
    if sort_col:
        df = df.sort_values(by=sort_col, ascending=(order == "asc"))

    # Paginazione
    total = int(len(df))
    start = (page - 1) * pageSize
    end = start + pageSize
    page_df = df.iloc[start:end]

    # Serializzazione
    items = []
    for _, row in page_df.iterrows():
        items.append(
            Review(
                id=str(row.get("id", "")),
                text=str(row.get("text", "")),
                clusterId=(row.get("clusterId") if pd.notna(row.get("clusterId")) else None),
                clusterLabel=(row.get("clusterLabel") if pd.notna(row.get("clusterLabel")) else None),
                sentiment=float(row.get("sentiment")) if pd.notna(row.get("sentiment")) else 0.0,
                lang=str(row.get("lang", "unknown")),
                date=row.get("date").strftime("%Y-%m-%d") if ("date" in row and pd.notna(row.get("date"))) else None,
                rating=float(row.get("rating")) if ("rating" in row and pd.notna(row.get("rating"))) else None,
                sourceId=str(row.get("sourceId", "")),
                projectId=str(row.get("projectId", projectId)),
            )
        )

    return ReviewPage(total=total, page=page, pageSize=pageSize, items=items)


@router.get("/reviews/stats")
async def get_review_stats(projectId: str = Query(..., description="Project ID")) -> Dict[str, Any]:
    df = load_reviews(projectId)

    def safe_vc(col: str) -> Dict[str, int]:
        return df[col].value_counts(dropna=False).to_dict() if col in df.columns else {}

    payload: Dict[str, Any] = {
        "total": int(len(df)),
        "languages": safe_vc("lang"),
        "clusters": safe_vc("clusterId"),
        "sentiment": {
            "mean": float(df["sentiment"].mean()) if "sentiment" in df.columns else None,
            "std": float(df["sentiment"].std()) if "sentiment" in df.columns else None,
            "min": float(df["sentiment"].min()) if "sentiment" in df.columns else None,
            "max": float(df["sentiment"].max()) if "sentiment" in df.columns else None,
        },
        "rating": {
            "mean": float(df["rating"].mean()) if "rating" in df.columns else None,
            "distribution": safe_vc("rating"),
        },
    }
    return payload
