"""
Clustering pipeline:
- Normalizza embeddings
- PCA (50D) per ridurre rumore e complessità
- HDBSCAN con parametri adattivi
- Fallback a MiniBatchKMeans se HDBSCAN non trova cluster
- Costruzione oggetti cluster con keyword TF-IDF e metriche base
"""
from __future__ import annotations

from typing import List, Tuple, Dict
import numpy as np
import pandas as pd

from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer

import hdbscan


def _adaptive_params(n: int) -> Tuple[int, int]:
    """
    Parametri HDBSCAN adattivi in funzione della dimensione del campione.
    """
    min_cluster_size = max(40, int(0.004 * n))   # ~0.4% del campione
    min_samples = max(5, int(0.001 * n))         # ~0.1% del campione
    return min_cluster_size, min_samples


def _reduce_dim(X: np.ndarray, n_components: int = 50) -> np.ndarray:
    """
    PCA randomized → 50D. Input e output in float32 per dimezzare memoria.
    """
    X = np.asarray(X, dtype=np.float32)
    d = X.shape[1]
    if d <= n_components:
        return X
    pca = PCA(n_components=n_components, svd_solver='randomized', random_state=42)
    X_red = pca.fit_transform(X)
    return np.asarray(X_red, dtype=np.float32)


def _keywords_for_cluster(texts: List[str], top_k: int = 12) -> List[str]:
    try:
        vec = TfidfVectorizer(max_features=3000, ngram_range=(1,2), min_df=2, max_df=0.9)
        X = vec.fit_transform(texts)
        scores = np.asarray(X.sum(axis=0)).ravel()
        terms = np.array(vec.get_feature_names_out())
        order = scores.argsort()[::-1][:top_k]
        return terms[order].tolist()
    except Exception:
        return []


def _build_clusters(df: pd.DataFrame, labels: np.ndarray) -> List[Dict]:
    n = len(df)
    unique = sorted(set(labels))
    has_noise = (-1 in unique)
    if has_noise:
        unique.remove(-1)

    total_non_noise = int((labels != -1).sum()) or 1
    clusters: List[Dict] = []
    for cid in unique:
        idx = np.where(labels == cid)[0]
        size = int(len(idx))
        share = round(size / total_non_noise, 3)

        if size == 0:
            continue

        sub = df.iloc[idx]
        if 'sentiment' in sub.columns and sub['sentiment'].notna().any():
            sent = float(sub['sentiment'].mean())
        else:
            sent = 0.0

        keywords = _keywords_for_cluster(sub['text'].astype(str).tolist(), top_k=12)

        clusters.append({
            "id": f"cluster_{cid}",
            "label": f"cluster_{cid}",
            "size": size,
            "share": share,
            "sentiment": round(sent, 3),
            "keywords": keywords,
        })
    return clusters


def cluster_reviews(df: pd.DataFrame, embeddings: np.ndarray) -> Tuple[List[Dict], np.ndarray]:
    """
    Ritorna (clusters, labels)
    - labels: array di interi (>=0) e -1 per rumore (se presente)
    """
    X = np.asarray(embeddings, dtype=np.float32)
    n = X.shape[0]

    # Standardizza (opzionale ma aiuta PCA/HDBSCAN su scale diverse)
    scaler = StandardScaler(with_mean=True, with_std=True)
    X_std = scaler.fit_transform(X)

    # Riduzione dimensionale
    X_red = _reduce_dim(X_std, n_components=50)

    # HDBSCAN adattivo
    mcs, ms = _adaptive_params(n)
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=mcs,
        min_samples=ms,
        metric='euclidean',
        cluster_selection_method='eom',
        prediction_data=True,
        core_dist_n_jobs=-1
    )
    labels = clusterer.fit_predict(X_red)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)

    # Fallback: se HDBSCAN non trova cluster, usa MiniBatchKMeans
    if n_clusters == 0:
        from sklearn.cluster import MiniBatchKMeans
        # numero cluster euristico per demo (tra 6 e 12)
        k = min(12, max(6, n // 2500))
        km = MiniBatchKMeans(
            n_clusters=k,
            random_state=42,
            batch_size=2048,
            n_init=5,
            reassignment_ratio=0.01
        )
        labels = km.fit_predict(X_red)

    clusters = _build_clusters(df, labels)
    return clusters, labels
