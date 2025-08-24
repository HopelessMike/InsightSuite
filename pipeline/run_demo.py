#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import json
from pathlib import Path

import numpy as np
import pandas as pd
from dotenv import load_dotenv, find_dotenv
from tqdm.auto import tqdm

from utils import (
    load_airbnb_reviews,
    load_mendeley_mobile,
    load_women_ecommerce,
    sentiment_score,
    save_project_json,
    init_sentiment_pipeline,
    try_load_preproc_cache,
    save_preproc_cache,
    calculate_timeseries,  # NEW
    load_generic_reviews,   # AGGIUNTO
    preprocess_for_keywords,  # NUOVO
)
from embed import compute_embeddings_with_cache, test_voyage_connection
from cluster import cluster_reviews
from summarize import summarize_clusters, test_anthropic_connection
from personas import generate_personas, enrich_personas_with_data

import warnings
warnings.filterwarnings("ignore")


def _load_envs():
    for fname in (".env.local", ".env"):
        p = find_dotenv(filename=fname, usecwd=True)
        if p:
            load_dotenv(dotenv_path=p, override=False)
_load_envs()


def _resolve_input_path(p: str | None) -> str | None:
    if not p:
        return None
    pp = Path(p)
    for c in (pp, Path("./data")/pp.name, Path("../data")/pp.name):
        if c.exists():
            print(f"Using file: {c.resolve()}")
            return str(c.resolve())
    raise FileNotFoundError(f"Input file not found: {p}")


def _assign_rest_labels_by_tfidf(
    df_full: pd.DataFrame,
    df_sample: pd.DataFrame,
    sample_labels: np.ndarray,
) -> pd.Series:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.preprocessing import normalize
    from sklearn.neighbors import NearestNeighbors

    vec = TfidfVectorizer(max_features=4096, min_df=2, max_df=0.9)
    X_all = vec.fit_transform(df_full['text'].astype(str).tolist())
    X_sample = X_all[df_sample.index, :]

    X_all = normalize(X_all, norm='l2', copy=False)
    X_sample = normalize(X_sample, norm='l2', copy=False)

    nn = NearestNeighbors(n_neighbors=1, metric='cosine', algorithm='brute', n_jobs=-1)
    nn.fit(X_sample)
    nn_idx = nn.kneighbors(X_all, return_distance=False).reshape(-1)

    nearest_labels = np.array(['cluster_' + str(l) if l != -1 else 'noise' for l in sample_labels], dtype=object)
    return pd.Series(nearest_labels[nn_idx], index=df_full.index, name='cluster_label')


def _compute_sentiment_with_resume(df: pd.DataFrame, project_id: str, chunk_size: int = 512) -> pd.DataFrame:
    cached = try_load_preproc_cache(project_id)
    if cached is not None:
        cached = cached[['id','sentiment']].drop_duplicates('id')
        # Ensure consistent data types for merge
        cached['id'] = cached['id'].astype(str)
        df['id'] = df['id'].astype(str)
        df = df.merge(cached, on='id', how='left', suffixes=('','_cached'))
        if 'sentiment_y' in df.columns:
            df['sentiment'] = df['sentiment_x'].combine_first(df['sentiment_y'])
            df.drop(columns=['sentiment_x','sentiment_y'], inplace=True)
    if 'sentiment' in df.columns and df['sentiment'].notna().any():
        missing = df['sentiment'].isna()
    else:
        df['sentiment'] = np.nan
        missing = df['sentiment'].isna()

    if missing.sum() == 0:
        return df

    init_sentiment_pipeline()
    idx = np.where(missing)[0]
    pbar = tqdm(total=len(idx), desc="Sentiment", unit="txt")
    for start in range(0, len(idx), chunk_size):
        end = min(start + chunk_size, len(idx))
        ids = idx[start:end]
        vals = [sentiment_score(df.loc[i, 'text']) for i in ids]
        df.loc[ids, 'sentiment'] = vals
        save_preproc_cache(df, project_id)
        pbar.update(len(ids))
    pbar.close()
    return df


def _attach_cluster_quotes(clusters: list[dict], df_full: pd.DataFrame, n_per_cluster: int = 12) -> list[dict]:
    """
    Aggiunge a ciascun cluster un campo `quotes` con frasi reali prese dal dataset
    """
    quotes_map: dict[str, list[dict]] = {}
    grouped = df_full.groupby('cluster_label', dropna=False)
    for key, g in grouped:
        if not isinstance(key, str) or not key.startswith("cluster_"):
            continue
        g = g.dropna(subset=['text'])
        if len(g) == 0:
            continue
        # campione bilanciato
        g = g.sample(n=min(len(g), n_per_cluster * 3), random_state=42) if len(g) > n_per_cluster * 3 else g
        take = g.head(n_per_cluster)
        q = []
        for _, r in take.iterrows():
            q.append({
                "id": str(r.get("id", "")),
                "text": str(r.get("text", ""))[:800],
                "rating": (None if pd.isna(r.get("rating")) else float(r.get("rating"))),
                "sentiment": (None if pd.isna(r.get("sentiment")) else float(r.get("sentiment"))),
                "lang": str(r.get("lang", "")) if not pd.isna(r.get("lang")) else None,
                "date": (str(r.get("timestamp").date()) if ("timestamp" in r and not pd.isna(r.get("timestamp"))) else None),
                "sourceId": str(r.get("id", "")),
            })
        quotes_map[str(key)] = q

    out = []
    for c in clusters:
        cid = c.get("id")
        c["quotes"] = quotes_map.get(cid, [])
        out.append(c)
    return out


def _save_reviews_enriched(df: pd.DataFrame, project_id: str, output_dir: str, source_name: str, cluster_label_map: dict):
    """
    Salva tutte le recensioni arricchite con cluster, sentiment, etc.
    """
    enriched = pd.DataFrame({
        'id': df['id'].astype(str),
        'text': df['text'].astype(str),
        'clusterId': df['cluster_label'].apply(lambda x: x if x != 'noise' else None),
        'clusterLabel': df['cluster_label'].apply(lambda x: cluster_label_map.get(x, x) if x != 'noise' else None),
        'sentiment': df['sentiment'].round(3),
        'lang': df['lang'].fillna('unknown'),
        'date': df.get('timestamp', pd.Series([None]*len(df))).apply(
            lambda x: x.strftime('%Y-%m-%d') if pd.notna(x) else None
        ),
        'rating': df.get('rating', pd.Series([None]*len(df))).apply(
            lambda x: float(x) if pd.notna(x) else None
        ),
        'sourceId': source_name,
        'projectId': project_id
    })
    
    output_path = Path(output_dir) / f"{project_id}_reviews.jsonl"
    enriched.to_json(output_path, orient='records', lines=True, force_ascii=False)
    print(f">> Saved enriched reviews to {output_path}")
    return output_path


def process_dataset(
    df: pd.DataFrame,
    project_id: str,
    project_name: str,
    source_name: str,
    output_dir: str,
    max_reviews: int = 10000,
    use_lemmatization: bool = False
) -> str:
    print(f"\n=== Processing project: {project_id} ===")
    df = _compute_sentiment_with_resume(df, project_id)
    if len(df) > max_reviews:
        df = df.sample(n=max_reviews, random_state=42).reset_index(drop=True)

    steps = ["Embeddings","Clustering","Assegnazione","Sommari","Personas","Timeseries","Salvataggio"]
    pbar = tqdm(total=len(steps), desc=f"{project_id} pipeline", leave=False)

    embed_max = min(len(df), int(os.getenv("EMBED_MAX", "30000")))
    embed_df = df.sample(n=embed_max, random_state=123).copy() if len(df) > embed_max else df.copy()

    # Prepara dataframe per keywords con testo preprocessato
    kw_df = embed_df.copy()
    print(f"\n>> Preprocessing text for keywords (lemmatization={'ON' if use_lemmatization else 'OFF'})...")
    kw_df['text'] = kw_df.apply(
        lambda row: preprocess_for_keywords(
            row['text'], 
            lang=row.get('lang', 'en'), 
            use_lemmatization=use_lemmatization
        ), 
        axis=1
    )
    
    print("\n>> Step 3: Embeddings")
    cache_file = f"./cache/embeddings/{project_id}_embeddings.pkl"
    use_voyage = test_voyage_connection()
    if use_voyage:
        embeddings = compute_embeddings_with_cache(
            embed_df['text'].tolist(),
            cache_file=cache_file,
            desc=f"{project_id} • Embeddings"
        )
    else:
        print("WARNING: Using fallback embeddings (Voyage API not available)")
        from sklearn.feature_extraction.text import TfidfVectorizer
        vectorizer = TfidfVectorizer(max_features=512, min_df=2, max_df=0.9)
        embeddings = vectorizer.fit_transform(embed_df['text']).toarray()
    pbar.update(1)

    print("\n>> Step 4: Clustering")
    # Usa kw_df per keywords migliori, ma mantieni embed_df per il resto
    clusters, labels = cluster_reviews(kw_df, embeddings)
    embed_df['cluster_label'] = ['cluster_' + str(l) if l != -1 else 'noise' for l in labels]
    pbar.update(1)

    print("\n>> Step 4b: Assigning labels to non-sampled reviews")
    if len(df) > len(embed_df):
        all_labels = _assign_rest_labels_by_tfidf(df, embed_df, labels)
        df['cluster_label'] = all_labels
        mask = df['cluster_label'] != 'noise'
        total = int(mask.sum()) or 1
        counts = df.loc[mask, 'cluster_label'].value_counts()
        share_map = {k: v / total for k, v in counts.items()}
        for c in clusters:
            cid = c['id']
            c['size'] = int(counts.get(cid, c['size']))
            c['share'] = round(float(share_map.get(cid, c['share'])), 3)
    else:
        df['cluster_label'] = embed_df['cluster_label']
    pbar.update(1)

    # Aggiungi citazioni reali
    clusters = _attach_cluster_quotes(clusters, df, n_per_cluster=12)

    print("\n>> Step 5: Cluster Summarization")
    use_claude = test_anthropic_connection()
    if use_claude:
        clusters = summarize_clusters(clusters, embed_df, max_clusters=10)
    else:
        print("WARNING: Using rule-based summarization (Claude API not available)")
    
    # Mappa cluster labels dopo summarization
    cluster_label_map = {c['id']: c['label'] for c in clusters}
    pbar.update(1)

    print("\n>> Step 6: Persona Generation")
    if use_claude:
        personas = generate_personas(clusters, embed_df, n_personas=3)
    else:
        from personas import generate_placeholder_personas
        personas = generate_placeholder_personas(clusters, n_personas=3)
    personas = enrich_personas_with_data(personas, embed_df, clusters)
    pbar.update(1)

    print("\n>> Step 7: Timeseries Analysis")
    timeseries = calculate_timeseries(df, clusters)
    pbar.update(1)

    print("\n>> Step 8: Saving Results")
    meta = {"name": project_name, "source": source_name}
    
    # Salva JSON principale con timeseries
    output_path = save_project_json(project_id, df, clusters, personas, meta, output_dir, timeseries=timeseries)
    
    # Salva recensioni arricchite per API
    reviews_path = _save_reviews_enriched(df, project_id, output_dir, source_name, cluster_label_map)
    
    pbar.update(1); pbar.close()

    front = Path('../public/demo/projects')
    if front.exists():
        import shutil
        try:
            shutil.copy(output_path, front / f"{project_id}.json")
            shutil.copy(reviews_path, front / f"{project_id}_reviews.jsonl")
            print(f"Copied to frontend: {front / f'{project_id}.json'}")
        except Exception as e:
            print(f"Copy to frontend failed: {e}")
    else:
        print(f"WARNING: Frontend directory not found at {front}")

    return output_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--airbnb', type=str)
    ap.add_argument('--mobile', type=str)
    ap.add_argument('--ecommerce', type=str)
    ap.add_argument(
        '--generic',
        action='append',
        help="Path a dataset generico (CSV/JSONL/Parquet). "
             "Formato opzionale: 'percorso::Nome Progetto::Fonte'. "
             "Puoi ripeterlo più volte."
    )
    ap.add_argument('--out', type=str, default='./out')
    ap.add_argument('--max-reviews', type=int, default=50000)
    ap.add_argument('--lemmatize', action='store_true', 
                    help='Abilita lemmatizzazione per migliorare keywords (richiede spaCy)')
    ap.add_argument('--test-apis', action='store_true')
    args = ap.parse_args()

    if args.test_apis:
        print("Testing Voyage ..."); test_voyage_connection()
        print("Testing Anthropic ..."); test_anthropic_connection(); return

    outputs = []
    if args.airbnb:
        p = _resolve_input_path(args.airbnb)
        df = load_airbnb_reviews(p)
        outputs.append(process_dataset(df, "airbnb", "Airbnb Roma", "InsideAirbnb", args.out, args.max_reviews, args.lemmatize))
    if args.mobile:
        p = _resolve_input_path(args.mobile)
        df = load_mendeley_mobile(p)
        outputs.append(process_dataset(df, "mobile", "BCA Mobile (Google Play)", "Mendeley", args.out, args.max_reviews, args.lemmatize))
    if args.ecommerce:
        p = _resolve_input_path(args.ecommerce)
        df = load_women_ecommerce(p)
        outputs.append(process_dataset(df, "ecommerce", "Women's E-Comm", "Kaggle", args.out, args.max_reviews, args.lemmatize))

    # --- Generic datasets ---
    if args.generic:
        for item in args.generic:
            # Consenti "path::Project Name::Source"
            parts = [p.strip() for p in str(item).split("::")]
            path = parts[0]
            project_name = (parts[1] if len(parts) >= 2 and parts[1] else Path(path).stem)
            source_name = (parts[2] if len(parts) >= 3 and parts[2] else "Custom")
            project_id = (
                Path(path).stem
                .lower()
                .replace(" ", "-")
                .replace("_", "-")
            )
            p = _resolve_input_path(path)
            df = load_generic_reviews(p)
            outputs.append(
                process_dataset(df, project_id, project_name, source_name, args.out, args.max_reviews, args.lemmatize)
            )

    print("\nDone. Outputs:")
    for o in outputs:
        print(" -", o)


if __name__ == "__main__":
    main()