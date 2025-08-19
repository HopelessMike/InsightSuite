"""
Utility functions for data loading, cleaning, processing, and saving
"""
from __future__ import annotations

import os
import re
import json
import html as _html
import unicodedata
import hashlib
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from langdetect import detect, LangDetectException
from transformers import pipeline
import warnings
warnings.filterwarnings('ignore')

# ---------- Anthropic model resolution (per meta) ----------
def _resolve_anthropic_model_for_meta() -> str:
    alias = os.getenv("ANTHROPIC_MODEL", "").strip()
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return "rule-based" if not alias else alias
    m = alias.lower()
    mapping = {
        "claude-4-sonnet": "claude-sonnet-4",
        "sonnet-4": "claude-sonnet-4",
        "claude-4-opus": "claude-opus-4",
        "opus-4": "claude-opus-4",
        "sonnet-3.7": "claude-3-7-sonnet",
        "claude-3.7-sonnet": "claude-3-7-sonnet",
        "sonnet-3.5": "claude-3-5-sonnet",
        "haiku-3.5": "claude-3-5-haiku",
        "claude-haiku-3.5": "claude-3-5-haiku",
    }
    wanted = mapping.get(m, alias or "claude-3-5-haiku")
    if "-20" in wanted:
        return wanted
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        models = list(client.models.list().data)
        for model in models:
            mid = getattr(model, "id", "")
            if mid.startswith(wanted + "-"):
                return mid
        for model in models:
            mid = getattr(model, "id", "")
            if mid.startswith("claude-3-5-haiku-"):
                return mid
    except Exception:
        pass
    return wanted or "rule-based"

# -----------------------------
# Text cleaning
# -----------------------------
_ZW_CHARS = ["\u200b", "\u200c", "\u200d", "\ufeff"]
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_MULTI_SPACE_RE = re.compile(r"[ \t\u00A0]{2,}")
_MULTI_NEWLINE_RE = re.compile(r"\n{3,}")

def clean_text(s: str) -> str:
    if not s:
        return ""
    s = str(s)
    s = s.replace("<br/>", "\n").replace("<br>", "\n").replace("<br />", "\n")
    s = _HTML_TAG_RE.sub("", s)
    s = _html.unescape(s)
    s = unicodedata.normalize("NFKC", s)
    for z in _ZW_CHARS:
        s = s.replace(z, "")
    s = "".join(ch for ch in s if (ch == "\n" or ch == "\t" or ord(ch) >= 32))
    s = _MULTI_SPACE_RE.sub(" ", s).replace("\r", "")
    s = _MULTI_NEWLINE_RE.sub("\n\n", s)
    return s.strip()

# -----------------------------
# Sentiment pipeline (lazy) + cache resume
# -----------------------------
_SENT_PIPE = None
def init_sentiment_pipeline():
    global _SENT_PIPE
    if _SENT_PIPE is None:
        model = os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-xlm-roberta-base-sentiment")
        _SENT_PIPE = pipeline("sentiment-analysis", model=model)
        print("Device set to use", _SENT_PIPE.device)
    return _SENT_PIPE

def sentiment_score(text: str) -> float:
    try:
        if not text or not str(text).strip():
            return 0.0
        pipe = init_sentiment_pipeline()
        res = pipe(str(text)[:512])[0]
        label = res['label'].lower(); score = float(res['score'])
        if 'positive' in label: return score
        if 'negative' in label: return -score
        # mapping per modelli 1..5 stelle
        if label in ('1 star','1','one'): return -1.0 * score
        if label in ('2 stars','2','two'): return -0.5 * score
        if label in ('3 stars','3','three'): return 0.0
        if label in ('4 stars','4','four'): return 0.5 * score
        if label in ('5 stars','5','five'): return 1.0 * score
        return 0.0
    except Exception:
        return 0.0

def _preproc_cache_path(project_id: str) -> Path:
    p = Path("./cache/preproc"); p.mkdir(parents=True, exist_ok=True)
    return p / f"{project_id}_preproc.parquet"

def try_load_preproc_cache(project_id: str) -> Optional[pd.DataFrame]:
    path = _preproc_cache_path(project_id)
    if path.exists():
        try:
            return pd.read_parquet(path)
        except Exception:
            return None
    return None

def save_preproc_cache(df: pd.DataFrame, project_id: str) -> None:
    path = _preproc_cache_path(project_id)
    try:
        cols = [c for c in ['id','text','rating','timestamp','lang','sentiment','cluster_label'] if c in df.columns]
        df[cols].to_parquet(path, index=False)
    except Exception:
        pass

# -----------------------------
# Robust CSV reader
# -----------------------------
def _robust_read_csv(path: str) -> pd.DataFrame:
    encodings = ("utf-8", "utf-8-sig", "latin-1", "iso-8859-1")
    is_gz = str(path).lower().endswith(".gz")
    last_err: Exception | None = None
    for comp in (("gzip" if is_gz else None), None):
        for enc in encodings:
            try:
                return pd.read_csv(
                    path,
                    encoding=enc,
                    compression=comp,
                    engine="python",
                    sep=None,
                    on_bad_lines="skip",
                    dtype=None,
                )
            except Exception as e:
                last_err = e
                continue
        for enc in encodings:
            try:
                return pd.read_csv(
                    path,
                    encoding=enc,
                    compression=comp,
                    engine="c",
                    sep=",",
                )
            except Exception as e:
                last_err = e
                continue
    raise RuntimeError(f"Cannot read file: {path}\nLast error: {last_err}")

# -----------------------------
# Language detection (robusta)
# -----------------------------
def _safe_detect_lang(text: str) -> str:
    """
    Rilevazione robusta:
    - se testo vuoto/≤10 char → 'unknown'
    - try/except su LangDetectException e ritorna 'unknown'
    """
    try:
        if not text:
            return "unknown"
        s = str(text).strip()
        if len(s) <= 10:
            return "unknown"
        return detect(s)
    except LangDetectException:
        return "unknown"
    except Exception:
        return "unknown"

# -----------------------------
# Loaders (normalize schema)
# -----------------------------
def _normalize_df(
    df: pd.DataFrame,
    source: str,
    id_col: Optional[str] = None,
    text_col: str = "text",
    rating_col: Optional[str] = None,
    time_col: Optional[str] = None,
    lang_col: Optional[str] = None
) -> pd.DataFrame:
    out = pd.DataFrame()
    out['id'] = df[id_col] if id_col and id_col in df.columns else pd.RangeIndex(len(df)).astype(str)
    if text_col not in df.columns:
        raise KeyError(f"Text column '{text_col}' not found in dataframe")
    out['text'] = df[text_col].astype(str).map(clean_text)
    out['rating'] = df[rating_col] if (rating_col and rating_col in df.columns) else np.nan
    out['timestamp'] = pd.to_datetime(df[time_col], errors='coerce') if (time_col and time_col in df.columns) else pd.NaT

    # Language: priorità a colonna esistente; altrimenti detection robusta (o skip via env)
    if lang_col and lang_col in df.columns:
        out['lang'] = df[lang_col].astype(str)
    else:
        if os.getenv("SKIP_LANG_DETECT", "0") == "1":
            out['lang'] = "unknown"
        else:
            out['lang'] = out['text'].apply(_safe_detect_lang)

    out['source'] = source
    return out

def load_airbnb_reviews(path: str) -> pd.DataFrame:
    print(f"Loading Airbnb reviews from {path} ...")
    df = _robust_read_csv(path)
    if 'comments' not in df.columns:
        for alt in ['review', 'text', 'content']:
            if alt in df.columns:
                df['comments'] = df[alt]; break
    if 'date' not in df.columns:
        for alt in ['at', 'timestamp', 'time']:
            if alt in df.columns:
                df['date'] = df[alt]; break
    if 'id' not in df.columns and 'review_id' in df.columns:
        df['id'] = df['review_id']
    return _normalize_df(df, "InsideAirbnb", 'id', 'comments', None, 'date', None)

def load_mendeley_mobile(path: str) -> pd.DataFrame:
    print(f"Loading Mendeley Mobile reviews from {path} ...")
    df = _robust_read_csv(path)
    if 'content' not in df.columns:
        for alt in ['review', 'text', 'comment']:
            if alt in df.columns:
                df['content'] = df[alt]; break
    if 'score' in df.columns and 'rating' not in df.columns:
        df['rating'] = df['score']
    if 'at' not in df.columns and 'date' in df.columns:
        df['at'] = df['date']
    if 'review_id' not in df.columns and 'id' in df.columns:
        df['review_id'] = df['id']
    out = _normalize_df(df, "Mendeley BCA Mobile", 'review_id', 'content', 'rating', 'at', None)
    out['lang'] = 'id'
    return out

def load_women_ecommerce(path: str) -> pd.DataFrame:
    print(f"Loading Women E-Comm reviews from {path} ...")
    df = _robust_read_csv(path)
    if 'Clothing ID' in df.columns:
        df['rid'] = df['Clothing ID'].astype(str) + "-" + df.index.astype(str)
    else:
        df['rid'] = df.index.astype(str)
    if 'Review Text' in df.columns:
        df['ReviewText'] = df['Review Text']
    elif 'Review' in df.columns:
        df['ReviewText'] = df['Review']
    else:
        df['ReviewText'] = df.iloc[:, 0].astype(str)
    out = _normalize_df(df, "Kaggle Women E-Comm", 'rid', 'ReviewText', ('Rating' if 'Rating' in df.columns else None), None, None)
    out['lang'] = 'en'
    return out

# -----------------------------
# Scoring
# -----------------------------
def calculate_opportunity_score(cluster: Dict) -> float:
    neg_intensity = max(0.0, -float(cluster.get('sentiment', 0.0)))
    impact = float(cluster.get('share', 0.0))
    score = (neg_intensity * 0.6) + (impact * 0.4)
    if impact > 0.15 and neg_intensity > 0.5:
        score *= 1.2
    return min(1.0, score)

# -----------------------------
# Save JSON
# -----------------------------
def _languages_list(df: pd.DataFrame) -> List[str]:
    if 'lang' not in df.columns:
        return []
    counts = df['lang'].value_counts()
    langs = list(counts.index[:4])
    if len(counts) > 4:
        langs.append("other")
    return langs

def save_project_json(project_id: str, df_reviews: pd.DataFrame, clusters: List[Dict], personas: List[Dict], meta: Dict, output_dir: str = './out') -> str:
    out_dir = Path(output_dir); out_dir.mkdir(parents=True, exist_ok=True)
    sentiments = df_reviews['sentiment'].dropna() if 'sentiment' in df_reviews.columns else pd.Series([], dtype=float)
    ratings = df_reviews['rating'].dropna() if 'rating' in df_reviews.columns else pd.Series([], dtype=float)

    rating_hist: List[List[int]] = []
    if len(ratings) > 0:
        for r in range(1, 6):
            rating_hist.append([r, int((ratings == r).sum())])
    else:
        rating_hist = [[1,0],[2,0],[3,0],[4,0],[5,0]]

    neg = int((sentiments < -0.05).sum())
    pos = int((sentiments > 0.05).sum())
    neu = int(len(sentiments) - neg - pos)
    total = max(1, len(sentiments))
    sentiment_mean = float(sentiments.mean()) if len(sentiments) else 0.0
    dist = {"neg": round(neg/total,3), "neu": round(neu/total,3), "pos": round(pos/total,3)}

    method = {
        "sentiment": os.getenv("SENTIMENT_MODEL", "xlm-roberta (CardiffNLP)"),
        "embedding": "voyage-3.5-lite" if os.getenv("VOYAGE_API_KEY") else "tf-idf",
        "clustering": "hdbscan",
        "llm": _resolve_anthropic_model_for_meta()
    }

    project_data = {
        "meta": {
            "project_id": project_id,
            "name": meta.get("name", project_id),
            "source": meta.get("source", ""),
            "date_range": [
                str(df_reviews['timestamp'].min().date()) if 'timestamp' in df_reviews.columns and df_reviews['timestamp'].notna().any() else "",
                str(df_reviews['timestamp'].max().date()) if 'timestamp' in df_reviews.columns and df_reviews['timestamp'].notna().any() else "",
            ],
            "languages": _languages_list(df_reviews),
            "totals": {"reviews": int(len(df_reviews)), "clusters": int(len(clusters))},
            "method": method
        },
        "aggregates": {
            "sentiment_mean": round(sentiment_mean, 3),
            "sentiment_dist": dist,
            "rating_hist": rating_hist
        },
        "clusters": clusters,
        "personas": personas
    }

    filename = f"{project_id}.json"
    filepath = out_dir / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(project_data, f, indent=2, ensure_ascii=False)

    public_dir = Path("../public/demo/projects")
    if public_dir.exists():
        with open(public_dir / filename, "w", encoding="utf-8") as f:
            json.dump(project_data, f, indent=2, ensure_ascii=False)
        print(f"Saved to: {filepath}  (mirrored to {public_dir/filename})")
    else:
        print(f"Saved to: {filepath}")
    return str(filepath)

def cache_key(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()
