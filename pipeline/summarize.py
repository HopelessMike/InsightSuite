"""
Cluster summarization using Anthropic Claude with JSON validation.
- Accetta alias (es. 'claude-4-sonnet') e risolve l'id completo via Models API.
- Mostra progress bar sui cluster elaborati.
"""
from __future__ import annotations

import json
import os
import time
from typing import List, Dict, Optional

from anthropic import Anthropic, APIStatusError
from dotenv import load_dotenv, find_dotenv
from jsonschema import validate, ValidationError
from tqdm.auto import tqdm

# -------- Env loader --------
def _load_envs():
    for fname in (".env.local", ".env"):
        try:
            path = find_dotenv(filename=fname, usecwd=True)
            if path:
                load_dotenv(dotenv_path=path, override=False)
        except Exception:
            pass
_load_envs()

DEFAULT_ALIAS = os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku")

# -------- Model resolution --------
def _normalize_alias(alias: str) -> str:
    a = alias.strip().lower()
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
    return mapping.get(a, a)

def _looks_versioned(model: str) -> bool:
    return "-20" in model

def _resolve_model_id(client: Anthropic, desired: str) -> str:
    wanted = _normalize_alias(desired or DEFAULT_ALIAS)
    if _looks_versioned(wanted):
        return wanted
    try:
        models = list(client.models.list().data)
        for m in models:
            mid = getattr(m, "id", "")
            if mid.startswith(wanted + "-"):
                return mid
        for m in models:
            mid = getattr(m, "id", "")
            if mid.startswith(wanted):
                return mid
    except Exception as e:
        print(f"[anthropic] models.list failed ({e}), will try alias '{wanted}'")
    try:
        models = list(client.models.list().data)
        for m in models:
            mid = getattr(m, "id", "")
            if mid.startswith("claude-3-5-haiku-"):
                print(f"[anthropic] Falling back to model '{mid}'")
                return mid
    except Exception:
        pass
    return "claude-3-5-haiku"

# -------- JSON schema --------
CLUSTER_SCHEMA = {
    "type": "object",
    "properties": {
        "label": {"type": "string"},
        "summary": {"type": "string"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["label", "summary", "strengths", "weaknesses"],
}

def _strict_json_extract(text: str):
    try:
        return json.loads(text)
    except Exception:
        pass
    start = text.find("{"); end = text.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except Exception:
            return None
    return None

def generate_placeholder_summary(cluster: Dict) -> Dict:
    label = cluster.get("label") or "Key Theme"
    keywords = ", ".join(cluster.get("keywords", [])[:5])
    cluster["label"] = label
    cluster["summary"] = f"Tema caratterizzato da: {keywords}. Riassume opinioni simili nel dataset."
    cluster["strengths"] = cluster.get("strengths", [])[:3]
    cluster["weaknesses"] = cluster.get("weaknesses", [])[:3]
    return cluster

def _summarize_one(client: Anthropic, model_id: str, cluster: Dict, sample_quotes: List[str]) -> Dict:
    context = f"""
Cluster Statistics:
- Size: {cluster['size']} ({cluster['share']*100:.1f}%)
- Sentiment: {cluster['sentiment']:.2f} (-1..+1)
- Keywords: {', '.join(cluster['keywords'][:10])}

Sample Reviews ({len(sample_quotes)}):
{chr(10).join(['- ' + q for q in sample_quotes[:40]])}
""".strip()
    sys_msg = (
        "You are an analyst. Only use the provided reviews. "
        "Return a SINGLE JSON object with keys: label, summary, strengths (array), weaknesses (array). "
        "Be precise, concise, non-repetitive. Language should match the reviews' language."
    )
    user_msg = (
        f"{context}\n\n"
        "Respond ONLY with JSON. Example:\n"
        "{\"label\":\"...\",\"summary\":\"...\",\"strengths\":[\"...\"],\"weaknesses\":[\"...\"]}"
    )

    for attempt in range(2):
        try:
            resp = client.messages.create(
                model=model_id,
                max_tokens=400,
                temperature=0.3,
                system=sys_msg,
                messages=[{"role": "user", "content": user_msg}],
            )
        except APIStatusError as e:
            if e.status_code == 404:
                return generate_placeholder_summary(cluster)
            time.sleep(0.5)
            if attempt == 0:
                continue
            return generate_placeholder_summary(cluster)
        except Exception:
            time.sleep(0.5)
            if attempt == 0:
                continue
            return generate_placeholder_summary(cluster)

        text = resp.content[0].text if resp and resp.content else ""
        result = _strict_json_extract(text)
        if not result:
            if attempt == 0:
                time.sleep(0.3)
                continue
            return generate_placeholder_summary(cluster)
        try:
            validate(result, CLUSTER_SCHEMA)
            cluster["label"] = result.get("label", cluster.get("label", ""))
            cluster["summary"] = result.get("summary", "")
            cluster["strengths"] = list(result.get("strengths", []))[:3]
            cluster["weaknesses"] = list(result.get("weaknesses", []))[:3]
            return cluster
        except ValidationError:
            if attempt == 0:
                time.sleep(0.3)
                continue
            return generate_placeholder_summary(cluster)

    return generate_placeholder_summary(cluster)

def summarize_clusters(
    clusters: List[Dict],
    df,
    max_clusters: int = 20,
    samples_per_cluster: int = 30,
) -> List[Dict]:
    df = df.copy()
    if "cluster_label" not in df.columns:
        return clusters

    by_cluster = {}
    for cid, sub in df.groupby("cluster_label"):
        by_cluster[cid] = sub["text"].astype(str).tolist()

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("Warning: ANTHROPIC_API_KEY not found, using placeholder summaries")
        return [generate_placeholder_summary(c) for c in clusters]

    client = Anthropic(api_key=api_key)
    model_alias = os.getenv("ANTHROPIC_MODEL", DEFAULT_ALIAS)
    model_id = _resolve_model_id(client, model_alias)

    # progress bar sui cluster
    limit = min(max_clusters, len(clusters))
    for i in tqdm(range(limit), desc="Summaries", unit="cluster"):
        c = clusters[i]
        cid = c["id"]
        sample_quotes = by_cluster.get(cid, [])[:samples_per_cluster]
        clusters[i] = _summarize_one(client, model_id, c, sample_quotes)
        time.sleep(0.25)  # gentle

    # placeholder per gli altri
    for j in range(limit, len(clusters)):
        clusters[j] = generate_placeholder_summary(clusters[j])

    print("Cluster summarization complete")
    return clusters

def test_anthropic_connection() -> bool:
    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            print("ERROR: ANTHROPIC_API_KEY not found in environment")
            return False
        client = Anthropic(api_key=api_key)
        model_alias = os.getenv("ANTHROPIC_MODEL", DEFAULT_ALIAS)
        model_id = _resolve_model_id(client, model_alias)
        resp = client.messages.create(
            model=model_id, max_tokens=8, messages=[{"role": "user", "content": "ok"}]
        )
        if resp and resp.content:
            print(f"SUCCESS: Anthropic reachable with model '{model_id}' (from alias '{model_alias}')")
            return True
        return False
    except APIStatusError as e:
        if e.status_code == 404:
            print("ERROR: Model still not found by API; try ANTHROPIC_MODEL=claude-3-5-haiku")
        else:
            print(f"Anthropic connection failed: {e}")
        return False
    except Exception as e:
        print(f"Anthropic connection failed: {e}")
        return False
