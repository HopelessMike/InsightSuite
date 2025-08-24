"""
Clustering pipeline:
- Normalizza embeddings
- PCA (50D) per ridurre rumore e complessità
- HDBSCAN con parametri adattivi
- Fallback a MiniBatchKMeans se HDBSCAN non trova cluster
- Costruzione oggetti cluster con keyword TF-IDF e metriche base
- NUOVO: Rimozione stopwords multilingua
"""
from __future__ import annotations

from typing import List, Tuple, Dict, Set
import numpy as np
import pandas as pd
import re

from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer

import hdbscan


# Stopwords multilingua
STOPWORDS_MULTI = {
    'en': {
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
        'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
        'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
        'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
        'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
        'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
        'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look',
        'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
        'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
        'any', 'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has',
        'had', 'were', 'said', 'did', 'get', 'may', 'very', 'made', 'find', 'where',
        'much', 'too', 'very', 'still', 'being', 'going', 'why', 'before', 'here',
        'more', 'always', 'really', 'something', 'nothing', 'everything', 'got'
    },
    'it': {
        'il', 'di', 'che', 'è', 'e', 'la', 'a', 'per', 'un', 'in', 'non', 'con', 'si',
        'da', 'lo', 'come', 'al', 'ma', 'su', 'sono', 'del', 'le', 'nella', 'alla',
        'dei', 'delle', 'anche', 'gli', 'o', 'se', 'ha', 'io', 'sia', 'loro', 'nel',
        'più', 'questo', 'quando', 'quello', 'molto', 'tutto', 'può', 'essere', 'ci',
        'così', 'tutti', 'sua', 'fa', 'fare', 'ancora', 'tra', 'dopo', 'solo', 'uno',
        'già', 'due', 'altre', 'ogni', 'dove', 'chi', 'dalla', 'cui', 'cosa', 'senza',
        'niente', 'grazie', 'stato', 'prima', 'ora', 'certo', 'casa', 'proprio', 'te',
        'però', 'né', 'qui', 'quindi', 'bene', 'meglio', 'poi', 'forse', 'meno', 'sì',
        'no', 'noi', 'hanno', 'aveva', 'sempre', 'quella', 'questa', 'nostro', 'questi',
        'quelle', 'suo', 'mio', 'tuo', 'loro', 'quale', 'quanto', 'tutta', 'molti',
        'alcuni', 'pochi', 'altro', 'prima', 'qualche', 'mentre', 'invece', 'sembra'
    },
    'fr': {
        'le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que',
        'se', 'qui', 'ce', 'dans', 'elle', 'au', 'pour', 'pas', 'cela', 'sur', 'on',
        'avec', 'lui', 'faire', 'pouvoir', 'tout', 'mais', 'ou', 'leur', 'comme',
        'si', 'notre', 'nous', 'bon', 'où', 'dire', 'là', 'du', 'bien', 'ces', 'plus',
        'sans', 'donc', 'très', 'même', 'quand', 'après', 'aussi', 'celui', 'deux',
        'mon', 'voir', 'trop', 'avant', 'ici', 'peu', 'jour', 'car', 'merci', 'puis',
        'ainsi', 'toute', 'autre', 'encore', 'entre', 'faire', 'déjà', 'tout', 'été'
    },
    'es': {
        'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
        'estar', 'tener', 'con', 'para', 'como', 'poder', 'decir', 'todo', 'este',
        'ir', 'otro', 'ese', 'la', 'si', 'su', 'lo', 'por', 'qué', 'al', 'le', 'más',
        'pero', 'poder', 'este', 'ya', 'entre', 'cuando', 'muy', 'sin', 'sobre',
        'también', 'me', 'hasta', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante',
        'todos', 'uno', 'les', 'ni', 'contra', 'otro', 'ese', 'eso', 'ante', 'ellos',
        'cada', 'nada', 'hacer', 'puede', 'poco', 'mismo', 'tan', 'ante', 'mucho'
    },
    'id': {
        'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'ini', 'itu', 'pada',
        'adalah', 'tidak', 'saya', 'anda', 'kami', 'mereka', 'akan', 'ada', 'bisa',
        'atau', 'jika', 'karena', 'oleh', 'sangat', 'sudah', 'juga', 'lebih', 'hanya',
        'semua', 'telah', 'bahwa', 'dalam', 'sebagai', 'menjadi', 'dapat', 'masih',
        'apa', 'siapa', 'mana', 'kapan', 'bagaimana', 'mengapa', 'kita', 'dia', 'nya'
    }
}

# Combina tutte le stopwords
ALL_STOPWORDS: Set[str] = set()
for lang_stops in STOPWORDS_MULTI.values():
    ALL_STOPWORDS.update(lang_stops)


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


def _clean_keyword(word: str) -> str:
    """
    Pulisce una parola rimuovendo caratteri speciali e numeri
    """
    # Rimuovi caratteri non alfabetici
    word = re.sub(r'[^a-zA-ZÀ-ÿ\s\'-]', '', word)
    # Rimuovi spazi extra
    word = word.strip()
    return word.lower()


def _keywords_for_cluster(texts: List[str], top_k: int = 15) -> List[str]:
    """
    Estrae keywords pulite usando TF-IDF con rimozione stopwords
    """
    try:
        # Preprocessa i testi
        processed_texts = []
        for text in texts:
            # Tokenizza e pulisci
            words = text.lower().split()
            clean_words = []
            for word in words:
                cleaned = _clean_keyword(word)
                # Filtra: no stopwords, lunghezza minima 3, no numeri puri
                if (cleaned and 
                    len(cleaned) >= 3 and 
                    cleaned not in ALL_STOPWORDS and
                    not cleaned.isdigit()):
                    clean_words.append(cleaned)
            processed_texts.append(' '.join(clean_words))
        
        if not processed_texts or all(not t for t in processed_texts):
            return []
        
        # TF-IDF con parametri ottimizzati per keywords pulite
        vec = TfidfVectorizer(
            max_features=500,
            ngram_range=(1, 2),  # Unigrammi e bigrammi
            min_df=2,
            max_df=0.8,
            token_pattern=r'\b[a-zA-ZÀ-ÿ]{3,}\b',  # Solo parole di almeno 3 caratteri
            lowercase=True
        )
        
        X = vec.fit_transform(processed_texts)
        
        # Calcola score medio per ogni termine
        scores = np.asarray(X.sum(axis=0)).ravel()
        terms = np.array(vec.get_feature_names_out())
        
        # Filtra ulteriormente i termini
        valid_indices = []
        for i, term in enumerate(terms):
            # Rimuovi bigrammi con stopwords
            if ' ' in term:
                parts = term.split()
                if any(p in ALL_STOPWORDS for p in parts):
                    continue
            # Verifica che non sia una stopword singola
            if term not in ALL_STOPWORDS:
                valid_indices.append(i)
        
        if not valid_indices:
            return []
        
        # Prendi solo termini validi
        valid_scores = scores[valid_indices]
        valid_terms = terms[valid_indices]
        
        # Ordina per score e prendi top-k
        order = valid_scores.argsort()[::-1][:top_k]
        
        # Deduplica mantenendo l'ordine
        seen = set()
        result = []
        for idx in order:
            term = valid_terms[idx]
            if term not in seen:
                seen.add(term)
                result.append(term)
        
        return result[:12]  # Limita a 12 keywords finali
        
    except Exception as e:
        print(f"Error extracting keywords: {e}")
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

        # Estrai keywords pulite
        keywords = _keywords_for_cluster(sub['text'].astype(str).tolist(), top_k=15)

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