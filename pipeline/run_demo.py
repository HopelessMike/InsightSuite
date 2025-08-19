#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
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
    Aggiunge a ciascun cluster un campo `quotes` con frasi reali prese dal dataset:
    [{
      text, rating, sentiment, lang, date, sourceId
    }]
    """
    quotes_map: dict[str, list[dict]] = {}
    grouped = df_full.groupby('cluster_label', dropna=False)
    for key, g in grouped:
        if not isinstance(key, str) or not key.startswith("cluster_"):
            continue
        g = g.dropna(subset=['text'])
        if len(g) == 0:
            continue
        # campione bilanciato: un po' positivi/negativi/selezione casuale
        g = g.sample(n=min(len(g), n_per_cluster * 3), random_state=42) if len(g) > n_per_cluster * 3 else g
        # ordina per “novità” (evita duplicati simili) e poi scegli
        take = g.head(n_per_cluster)
        q = []
        for _, r in take.iterrows():
            q.append({
                "text": str(r.get("text", ""))[:800],
                "rating": (None if pd.isna(r.get("rating")) else float(r.get("rating"))),
                "sentiment": (None if pd.isna(r.get("sentiment")) else float(r.get("sentiment"))),
                "lang": str(r.get("lang", "")) if not pd.isna(r.get("lang")) else None,
                "date": (str(r.get("timestamp").date()) if ("timestamp" in r and not pd.isna(r.get("timestamp"))) else None),
                "sourceId": str(r.get("id", "")),
            })
        quotes_map[str(key)] = q

    # applica alle strutture cluster
    out = []
    for c in clusters:
        cid = c.get("id")
        c["quotes"] = quotes_map.get(cid, [])
        out.append(c)
    return out


def process_dataset(
    df: pd.DataFrame,
    project_id: str,
    project_name: str,
    source_name: str,
    output_dir: str,
    max_reviews: int = 10000
) -> str:
    print(f"\n=== Processing project: {project_id} ===")
    df = _compute_sentiment_with_resume(df, project_id)
    if len(df) > max_reviews:
        df = df.sample(n=max_reviews, random_state=42).reset_index(drop=True)

    steps = ["Embeddings","Clustering","Assegnazione","Sommari","Personas","Salvataggio"]
    pbar = tqdm(total=len(steps), desc=f"{project_id} pipeline", leave=False)

    embed_max = min(len(df), int(os.getenv("EMBED_MAX", "30000")))
    embed_df = df.sample(n=embed_max, random_state=123).copy() if len(df) > embed_max else df.copy()

    print("\n🧠 Step 3: Embeddings")
    cache_file = f"./cache/embeddings/{project_id}_embeddings.pkl"
    use_voyage = test_voyage_connection()
    if use_voyage:
        embeddings = compute_embeddings_with_cache(
            embed_df['text'].tolist(),
            cache_file=cache_file,
            desc=f"{project_id} • Embeddings"
        )
    else:
        print("⚠️ Using fallback embeddings (Voyage API not available)")
        from sklearn.feature_extraction.text import TfidfVectorizer
        vectorizer = TfidfVectorizer(max_features=512, min_df=2, max_df=0.9)
        embeddings = vectorizer.fit_transform(embed_df['text']).toarray()
    pbar.update(1)

    print("\n🎯 Step 4: Clustering")
    clusters, labels = cluster_reviews(embed_df, embeddings)
    embed_df['cluster_label'] = ['cluster_' + str(l) if l != -1 else 'noise' for l in labels]
    pbar.update(1)

    print("\n📐 Step 4b: Assigning labels to non-sampled reviews for accurate shares")
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

    # **NUOVO**: aggiungi citazioni reali per Review Explorer
    clusters = _attach_cluster_quotes(clusters, df, n_per_cluster=12)

    print("\n📊 Step 5: Cluster Summarization")
    use_claude = test_anthropic_connection()
    if use_claude:
        clusters = summarize_clusters(clusters, embed_df, max_clusters=10)
    else:
        print("⚠️ Using rule-based summarization (Claude API not available)")
    pbar.update(1)

    print("\n👥 Step 6: Persona Generation")
    if use_claude:
        personas = generate_personas(clusters, embed_df, n_personas=3)
    else:
        from personas import generate_placeholder_personas
        personas = generate_placeholder_personas(clusters, n_personas=3)
    personas = enrich_personas_with_data(personas, embed_df, clusters)
    pbar.update(1)

    print("\n💾 Step 7: Saving Results")
    meta = {"name": project_name, "source": source_name}
    output_path = save_project_json(project_id, df, clusters, personas, meta, output_dir)
    pbar.update(1); pbar.close()

    front = Path('../public/demo/projects')
    if front.exists():
        import shutil
        try:
            shutil.copy(output_path, front / f"{project_id}.json")
            print(f"Copied to frontend: {front / f'{project_id}.json'}")
        except Exception as e:
            print(f"Copy to frontend failed: {e}")
    else:
        print(f"⚠️ Frontend directory not found at {front}")

    return output_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--airbnb', type=str)
    ap.add_argument('--mobile', type=str)
    ap.add_argument('--ecommerce', type=str)
    ap.add_argument('--out', type=str, default='./out')
    ap.add_argument('--max-reviews', type=int, default=50000)
    ap.add_argument('--test-apis', action='store_true')
    args = ap.parse_args()

    if args.test_apis:
        print("Testing Voyage ..."); test_voyage_connection()
        print("Testing Anthropic ..."); test_anthropic_connection(); return

    outputs = []
    if args.airbnb:
        p = _resolve_input_path(args.airbnb)
        df = load_airbnb_reviews(p)
        outputs.append(process_dataset(df, "airbnb", "Airbnb Roma", "InsideAirbnb", args.out, args.max_reviews))
    if args.mobile:
        p = _resolve_input_path(args.mobile)
        df = load_mendeley_mobile(p)
        outputs.append(process_dataset(df, "mobile", "BCA Mobile (Google Play)", "Mendeley", args.out, args.max_reviews))
    if args.ecommerce:
        p = _resolve_input_path(args.ecommerce)
        df = load_women_ecommerce(p)
        outputs.append(process_dataset(df, "ecommerce", "Women’s E-Comm", "Kaggle", args.out, args.max_reviews))

    print("\nDone. Outputs:")
    for o in outputs:
        print(" -", o)


if __name__ == "__main__":
    main()
