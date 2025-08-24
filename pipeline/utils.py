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
# Text cleaning + stopwords removal + lemmatization
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

# Stopwords multilingua (essenziali)
_STOPWORDS = {
    'en': {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'not', 'no'},
    'it': {'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'uno', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'e', 'o', 'ma', 'però', 'che', 'chi', 'cui', 'dove', 'quando', 'come', 'perché', 'se', 'questo', 'questa', 'quello', 'quella', 'questi', 'queste', 'quelli', 'quelle', 'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'mi', 'ti', 'ci', 'vi', 'si', 'mio', 'tuo', 'suo', 'nostro', 'vostro', 'loro', 'è', 'sono', 'sei', 'siamo', 'siete', 'era', 'ero', 'eri', 'eravamo', 'eravate', 'erano', 'ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno', 'non'},
    'es': {'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para', 'desde', 'hasta', 'y', 'o', 'pero', 'que', 'quien', 'donde', 'cuando', 'como', 'porque', 'si', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas', 'me', 'te', 'se', 'nos', 'os', 'mi', 'tu', 'su', 'nuestro', 'vuestro', 'es', 'son', 'era', 'eran', 'he', 'has', 'ha', 'hemos', 'habéis', 'han', 'no'},
    'fr': {'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'à', 'au', 'aux', 'en', 'dans', 'sur', 'avec', 'par', 'pour', 'sans', 'sous', 'entre', 'et', 'ou', 'mais', 'que', 'qui', 'où', 'quand', 'comment', 'pourquoi', 'si', 'ce', 'cette', 'ces', 'cet', 'celui', 'celle', 'ceux', 'celles', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se', 'mon', 'ton', 'son', 'notre', 'votre', 'leur', 'est', 'sont', 'était', 'étaient', 'ai', 'as', 'a', 'avons', 'avez', 'ont', 'ne', 'pas'},
    'de': {'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 'und', 'oder', 'aber', 'in', 'auf', 'an', 'zu', 'von', 'mit', 'bei', 'für', 'über', 'unter', 'durch', 'dass', 'wer', 'was', 'wo', 'wann', 'wie', 'warum', 'wenn', 'dieser', 'diese', 'dieses', 'jener', 'jene', 'jenes', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mich', 'dich', 'sich', 'uns', 'euch', 'mein', 'dein', 'sein', 'unser', 'euer', 'ihr', 'ist', 'sind', 'war', 'waren', 'habe', 'hast', 'hat', 'haben', 'habt', 'nicht', 'kein', 'keine'}
}

def remove_stopwords(text: str, lang: str = 'en') -> str:
    """Rimuove stopwords dal testo basandosi sulla lingua"""
    if not text or not isinstance(text, str):
        return ""
    
    # Determina le stopwords da usare
    stopwords = _STOPWORDS.get(lang.lower()[:2], _STOPWORDS['en'])
    
    # Tokenizzazione semplice
    words = re.findall(r'\b\w+\b', text.lower())
    
    # Filtra stopwords
    filtered_words = [w for w in words if w not in stopwords and len(w) > 2]
    
    return ' '.join(filtered_words)

def lemmatize_text(text: str, lang: str = 'en') -> str:
    """Lemmatizzazione opzionale con spaCy (degrada silenziosamente se non disponibile)"""
    try:
        import spacy
        
        # Mappa lingua a modello spaCy
        lang_models = {
            'en': 'en_core_web_sm',
            'it': 'it_core_news_sm', 
            'es': 'es_core_news_sm',
            'fr': 'fr_core_news_sm',
            'de': 'de_core_news_sm'
        }
        
        model_name = lang_models.get(lang.lower()[:2], 'en_core_web_sm')
        
        try:
            nlp = spacy.load(model_name)
        except OSError:
            # Modello non installato, usa fallback inglese
            try:
                nlp = spacy.load('en_core_web_sm')
            except OSError:
                # Nessun modello disponibile, ritorna testo originale
                return text
        
        # Processa il testo
        doc = nlp(text[:1000])  # Limita a 1000 caratteri per performance
        lemmas = [token.lemma_ for token in doc if not token.is_stop and not token.is_punct and token.text.strip()]
        
        return ' '.join(lemmas)
        
    except ImportError:
        # spaCy non installato, ritorna testo originale
        return text
    except Exception:
        # Qualsiasi altro errore, ritorna testo originale
        return text

def preprocess_for_keywords(text: str, lang: str = 'en', use_lemmatization: bool = False) -> str:
    """
    Preprocessa il testo per l'estrazione delle keywords:
    - Pulizia base
    - Rimozione stopwords multilingua
    - Lemmatizzazione opzionale (se abilitata e spaCy disponibile)
    """
    if not text or not isinstance(text, str):
        return ""
    
    # 1. Pulizia base
    cleaned = clean_text(text)
    
    # 2. Rimozione stopwords
    no_stopwords = remove_stopwords(cleaned, lang)
    
    # 3. Lemmatizzazione opzionale
    if use_lemmatization:
        result = lemmatize_text(no_stopwords, lang)
    else:
        result = no_stopwords
    
    return result

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
def calculate_timeseries(df: pd.DataFrame, clusters: List[Dict]) -> Dict:
    """
    Calcola serie temporali per sentiment e volume
    """
    if 'timestamp' not in df.columns or df['timestamp'].isna().all():
        return {}
    
    # Converti timestamp a datetime
    df = df.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    df = df.dropna(subset=['timestamp'])
    
    if len(df) == 0:
        return {}
    
    # Aggrega per mese
    df['month'] = df['timestamp'].dt.to_period('M')
    
    # Serie mensile generale
    monthly = df.groupby('month').agg({
        'sentiment': 'mean',
        'id': 'count'
    }).rename(columns={'id': 'volume'})
    
    monthly_data = []
    for period, row in monthly.iterrows():
        monthly_data.append({
            'date': str(period),
            'sentiment_mean': round(row['sentiment'], 3),
            'volume': int(row['volume'])
        })
    
    # Serie per cluster
    cluster_series = {}
    if 'cluster_label' in df.columns:
        for cluster in clusters:
            cid = cluster['id']
            cluster_df = df[df['cluster_label'] == cid]
            if len(cluster_df) > 0:
                cluster_monthly = cluster_df.groupby('month').agg({
                    'id': 'count',
                    'sentiment': 'mean'
                }).rename(columns={'id': 'volume'})
                
                series = []
                for period, row in cluster_monthly.iterrows():
                    series.append({
                        'date': str(period),
                        'volume': int(row['volume']),
                        'share': round(row['volume'] / monthly.loc[period, 'volume'], 3),
                        'sentiment': round(row['sentiment'], 3)
                    })
                cluster_series[cid] = series
    
    return {
        'monthly': monthly_data,
        'clusters': cluster_series
    }

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

# -----------------------------
# Generic dataset loader (CSV / JSONL / Parquet) with column guessing
# -----------------------------
def _guess_col(candidates: list[str], columns: list[str]) -> Optional[str]:
    cols_lower = {c.lower(): c for c in columns}
    for cand in candidates:
        if cand.lower() in cols_lower:
            return cols_lower[cand.lower()]
    # fuzzy: try contains
    for c in columns:
        cl = c.lower()
        for cand in candidates:
            if cand.lower() in cl:
                return c
    return None

def _read_any(path: str) -> pd.DataFrame:
    p = str(path).lower()
    if p.endswith(".jsonl") or p.endswith(".jsonl.gz"):
        # JSON lines
        try:
            return pd.read_json(path, lines=True)
        except Exception:
            # try with explicit encoding fallback
            return pd.read_json(path, lines=True, encoding="utf-8")
    if p.endswith(".parquet") or p.endswith(".parq"):
        return pd.read_parquet(path)
    # default: CSV (robusto)
    return _robust_read_csv(path)

def load_generic_reviews(path: str) -> pd.DataFrame:
    """
    Carica un dataset di recensioni (CSV/JSONL/Parquet) e normalizza lo schema:
    colonne target: id, text, rating, timestamp, lang
    - text: prova a mappare tra ['text','review','review_text','content','body','comment','comments','message']
    - id:   ['id','review_id','comment_id','uuid']
    - rating: ['rating','stars','score','vote','voto']
    - timestamp: ['date','created_at','time','timestamp','published_at','data']
    - lang: ['lang','language','locale']
    Se una colonna non esiste, viene riempita con valori di default (es. lang='detect').
    """
    df_raw = _read_any(path)
    if not isinstance(df_raw, pd.DataFrame) or len(df_raw.columns) == 0:
        raise RuntimeError(f"Empty or invalid table: {path}")

    cols = df_raw.columns.tolist()

    text_col = _guess_col(
        ["text","review","review_text","content","body","comment","comments","message","reviewBody"],
        cols
    )
    if not text_col:
        raise KeyError(f"Cannot find a text column in {path}. Columns: {cols}")

    id_col = _guess_col(["id","review_id","comment_id","uuid"], cols)
    rating_col = _guess_col(["rating","stars","score","vote","voto","ratingValue"], cols)
    time_col = _guess_col(["date","created_at","time","timestamp","published_at","data"], cols)
    lang_col = _guess_col(["lang","language","locale"], cols)

    out = _normalize_df(
        df=df_raw,
        source=Path(path).name,
        id_col=id_col,
        text_col=text_col,
        rating_col=rating_col,
        time_col=time_col,
        lang_col=lang_col
    )

    # Se manca la lingua, metti 'detect' per attivare lo step di detection in run_demo.py
    if 'lang' not in out.columns or out['lang'].isna().all():
        out['lang'] = 'detect'

    return out

def load_airbnb_reviews(path: str) -> pd.DataFrame:
    print(f"Loading Airbnb reviews from {path} ...")
    df = _robust_read_csv(path)
    
    # Handle text column - check for 'comments', 'title', and other alternatives
    text_col = None
    if 'comments' in df.columns:
        text_col = 'comments'
    elif 'title' in df.columns:
        text_col = 'title'
    else:
        for alt in ['review', 'text', 'content']:
            if alt in df.columns:
                text_col = alt
                break
    
    if text_col and text_col != 'comments':
        df['comments'] = df[text_col]
    
    # Handle date column - check for 'date', 'review_date', and other alternatives  
    date_col = None
    if 'date' in df.columns:
        date_col = 'date'
    elif 'review_date' in df.columns:
        date_col = 'review_date'
    else:
        for alt in ['at', 'timestamp', 'time']:
            if alt in df.columns:
                date_col = alt
                break
    
    if date_col and date_col != 'date':
        df['date'] = df[date_col]
    
    # Handle rating column - check for 'score' and other alternatives
    rating_col = None
    if 'rating' in df.columns:
        rating_col = 'rating'
    elif 'score' in df.columns:
        # Handle comma-separated scores in Italian format
        df['score'] = df['score'].astype(str).str.replace(',', '.', regex=False)
        df['score'] = pd.to_numeric(df['score'], errors='coerce')
        rating_col = 'score'
    
    # Generate IDs if missing
    if 'id' not in df.columns:
        if 'review_id' in df.columns:
            df['id'] = df['review_id']
        else:
            df['id'] = df.index.astype(str)
    
    return _normalize_df(df, "InsideAirbnb", 'id', 'comments', rating_col, 'date', None)

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

def save_project_json(
    project_id: str,
    df: pd.DataFrame,
    clusters: List[Dict],
    personas: List[Dict],
    meta: Dict,
    output_dir: str,
    timeseries: Dict = None
) -> str:
    """
    Save project data to JSON file with complete structure for frontend consumption
    
    Args:
        project_id: Unique project identifier (airbnb, mobile, ecommerce)
        df: DataFrame with all reviews and analysis
        clusters: List of cluster dictionaries with summaries
        personas: List of persona dictionaries
        meta: Metadata dictionary with name and source
        output_dir: Output directory path
        timeseries: Optional timeseries data
    
    Returns:
        Path to saved JSON file
    """
    import json
    from pathlib import Path
    from datetime import datetime
    
    # Ensure output directory exists
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Calculate aggregates from dataframe
    aggregates = {}
    
    # Sentiment statistics
    if 'sentiment' in df.columns and df['sentiment'].notna().any():
        sentiment_values = df['sentiment'].dropna()
        aggregates['sentiment_mean'] = round(float(sentiment_values.mean()), 3)
        
        # Sentiment distribution
        neg_count = (sentiment_values < -0.3).sum()
        neu_count = ((sentiment_values >= -0.3) & (sentiment_values <= 0.3)).sum()
        pos_count = (sentiment_values > 0.3).sum()
        total_sent = len(sentiment_values)
        
        aggregates['sentiment_dist'] = {
            'neg': round(neg_count / total_sent, 3) if total_sent > 0 else 0,
            'neu': round(neu_count / total_sent, 3) if total_sent > 0 else 0,
            'pos': round(pos_count / total_sent, 3) if total_sent > 0 else 0
        }
    else:
        aggregates['sentiment_mean'] = 0.0
        aggregates['sentiment_dist'] = {'neg': 0, 'neu': 0, 'pos': 1.0}
    
    # Rating histogram
    if 'rating' in df.columns and df['rating'].notna().any():
        rating_counts = df['rating'].value_counts().sort_index()
        rating_hist = []
        for r in range(1, 6):
            count = int(rating_counts.get(r, 0))
            rating_hist.append([r, count])
    else:
        rating_hist = [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]
    
    aggregates['rating_hist'] = rating_hist
    
    # Extract languages
    languages = []
    if 'lang' in df.columns:
        lang_counts = df['lang'].value_counts()
        # Keep languages with at least 10 reviews
        languages = [str(lang) for lang in lang_counts[lang_counts >= 10].index.tolist()]
        if not languages:
            languages = ['en']  # Default fallback
    else:
        languages = ['en']
    
    # Get date range
    date_range = ["", ""]
    if 'timestamp' in df.columns and df['timestamp'].notna().any():
        dates = pd.to_datetime(df['timestamp'], errors='coerce').dropna()
        if len(dates) > 0:
            date_range = [
                dates.min().strftime('%Y-%m-%d'),
                dates.max().strftime('%Y-%m-%d')
            ]
    
    # Build metadata
    full_meta = {
        'project_id': project_id,
        'name': meta.get('name', project_id.title()),
        'source': meta.get('source', 'Unknown'),
        'date_range': date_range,
        'languages': languages,
        'totals': {
            'reviews': len(df),
            'clusters': len(clusters)
        }
    }
    
    # Add method info if available
    if meta.get('method'):
        full_meta['method'] = meta['method']
    else:
        # Default method info
        full_meta['method'] = {
            'sentiment': 'xlm-roberta (CardiffNLP)',
            'embedding': 'voyage-3.5-lite',
            'clustering': 'hdbscan',
            'llm': 'claude-sonnet-4-20250514'
        }
    
    # Process clusters to ensure all required fields
    processed_clusters = []
    for cluster in clusters:
        processed_cluster = {
            'id': cluster.get('id', f"cluster_{len(processed_clusters)}"),
            'label': cluster.get('label', f"Cluster {len(processed_clusters) + 1}"),
            'size': int(cluster.get('size', 0)),
            'share': float(cluster.get('share', 0)),
            'sentiment': float(cluster.get('sentiment', 0)),
            'keywords': cluster.get('keywords', [])[:15],  # Max 15 keywords
            'summary': cluster.get('summary', ''),
            'strengths': cluster.get('strengths', [])[:3],  # Max 3 strengths
            'weaknesses': cluster.get('weaknesses', [])[:3],  # Max 3 weaknesses
            'opportunity_score': float(cluster.get('opportunity_score', 0.5))
        }
        
        # Add trend if available
        if 'trend' in cluster:
            processed_cluster['trend'] = cluster['trend']
        
        # Process quotes
        quotes = []
        if 'quotes' in cluster:
            for quote in cluster['quotes'][:12]:  # Max 12 quotes
                if isinstance(quote, dict):
                    processed_quote = {
                        'id': str(quote.get('id', '')),
                        'text': str(quote.get('text', ''))[:800],  # Max 800 chars
                        'rating': quote.get('rating'),
                        'sentiment': float(quote.get('sentiment', 0)),
                        'lang': str(quote.get('lang', 'unknown')),
                        'date': quote.get('date'),
                        'sourceId': str(quote.get('sourceId', ''))
                    }
                elif isinstance(quote, str):
                    # Handle legacy string quotes
                    processed_quote = {
                        'id': '',
                        'text': str(quote)[:800],
                        'rating': None,
                        'sentiment': 0,
                        'lang': 'unknown',
                        'date': None,
                        'sourceId': ''
                    }
                else:
                    continue
                quotes.append(processed_quote)
        
        processed_cluster['quotes'] = quotes
        
        # Add co_occurs if available
        if 'co_occurs' in cluster:
            processed_cluster['co_occurs'] = cluster['co_occurs']
        else:
            processed_cluster['co_occurs'] = []
        
        processed_clusters.append(processed_cluster)
    
    # Calculate opportunity scores if not present
    for cluster in processed_clusters:
        if cluster['opportunity_score'] == 0.5:  # Default value, needs calculation
            # Simple heuristic: high negativity + high share = high opportunity
            negativity = max(0, -cluster['sentiment'])
            share = cluster['share']
            cluster['opportunity_score'] = round(
                (negativity * 0.6 + share * 0.4) * 1.5,  # Boost factor
                3
            )
            cluster['opportunity_score'] = min(1.0, cluster['opportunity_score'])
    
    # Process personas to ensure all required fields
    processed_personas = []
    for persona in personas:
        processed_persona = {
            'id': persona.get('id', f"persona_{len(processed_personas) + 1}"),
            'name': persona.get('name', persona.get('title', f"Persona {len(processed_personas) + 1}")),
            'share': float(persona.get('share', 0.25)),
            'goals': persona.get('goals', [])[:5],  # Max 5 goals
            'pains': persona.get('pains', persona.get('pain_points', []))[:5],  # Max 5 pains
            'clusters': persona.get('clusters', []),
            'quotes': persona.get('quotes', [])[:3],  # Max 3 quotes
            'channels': persona.get('channels', [])[:5]  # Max 5 channels
        }
        processed_personas.append(processed_persona)
    
    # Normalize persona shares to sum to 1.0
    total_share = sum(p['share'] for p in processed_personas)
    if total_share > 0:
        for persona in processed_personas:
            persona['share'] = round(persona['share'] / total_share, 3)
    
    # Build final data structure
    data = {
        'meta': full_meta,
        'aggregates': aggregates,
        'clusters': processed_clusters,
        'personas': processed_personas
    }
    
    # Add timeseries if provided
    if timeseries and (timeseries.get('monthly') or timeseries.get('clusters')):
        # Validate and clean timeseries data
        clean_timeseries = {}
        
        if 'monthly' in timeseries and timeseries['monthly']:
            clean_monthly = []
            for point in timeseries['monthly']:
                clean_point = {
                    'date': str(point.get('date', '')),
                    'sentiment_mean': round(float(point.get('sentiment_mean', 0)), 3),
                    'volume': int(point.get('volume', 0))
                }
                clean_monthly.append(clean_point)
            if clean_monthly:
                clean_timeseries['monthly'] = clean_monthly
        
        if 'clusters' in timeseries and timeseries['clusters']:
            clean_clusters = {}
            for cluster_id, series in timeseries['clusters'].items():
                if series and isinstance(series, list):
                    clean_series = []
                    for point in series:
                        clean_point = {
                            'date': str(point.get('date', '')),
                            'volume': int(point.get('volume', 0)),
                            'share': round(float(point.get('share', 0)), 3),
                            'sentiment': round(float(point.get('sentiment', 0)), 3)
                        }
                        clean_series.append(clean_point)
                    if clean_series:
                        clean_clusters[cluster_id] = clean_series
            if clean_clusters:
                clean_timeseries['clusters'] = clean_clusters
        
        if clean_timeseries:
            data['timeseries'] = clean_timeseries
    
    # Save to JSON file
    output_path = Path(output_dir) / f"{project_id}.json"
    
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"SUCCESS: Saved project JSON to {output_path}")
        
        # Validate JSON structure
        with open(output_path, 'r', encoding='utf-8') as f:
            loaded = json.load(f)
            
        # Basic validation
        assert 'meta' in loaded, "Missing meta section"
        assert 'aggregates' in loaded, "Missing aggregates section"
        assert 'clusters' in loaded, "Missing clusters section"
        assert 'personas' in loaded, "Missing personas section"
        assert len(loaded['clusters']) > 0, "No clusters found"
        assert len(loaded['personas']) > 0, "No personas found"
        
        # Validate sentiment ranges
        for cluster in loaded['clusters']:
            assert -1 <= cluster['sentiment'] <= 1, f"Invalid sentiment in cluster {cluster['id']}"
            assert 0 <= cluster['share'] <= 1, f"Invalid share in cluster {cluster['id']}"
            assert 0 <= cluster['opportunity_score'] <= 1, f"Invalid opportunity_score in cluster {cluster['id']}"
        
        # Validate persona shares sum to ~1.0
        persona_share_sum = sum(p['share'] for p in loaded['personas'])
        assert 0.95 <= persona_share_sum <= 1.05, f"Persona shares sum to {persona_share_sum}, should be ~1.0"
        
        print(f"SUCCESS: JSON validation passed")
        
    except Exception as e:
        print(f"ERROR: Error saving or validating JSON: {e}")
        raise
    
    return str(output_path)

def cache_key(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()
