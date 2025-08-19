from __future__ import annotations

import json
import os
import random
from dataclasses import dataclass, asdict
from typing import List, Dict, Any

import numpy as np
import pandas as pd

# Anthropic (opzionale, gestito a runtime)
try:
    import anthropic
except Exception:
    anthropic = None


# ----------------------- Utility modello -----------------------

def _anthropic_model_name() -> str:
    alias = os.getenv("ANTHROPIC_MODEL", "claude-4-sonnet").strip()
    mapping = {
        "claude-4-sonnet": "claude-sonnet-4-20250514",
        "claude-3-5-haiku": "claude-3-5-haiku-latest",
        "claude-3-7-sonnet": "claude-3-7-sonnet-latest",
    }
    return mapping.get(alias, alias)


def _anthropic_client():
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key or anthropic is None:
        return None
    return anthropic.Anthropic(api_key=key)


# ----------------------- Data model -----------------------

@dataclass
class Persona:
    id: str
    title: str
    archetype: str
    share: float
    goals: List[str]
    pains: List[str]
    quotes: List[str]
    channels: List[str]
    icon: str
    accent: str


ARCHETYPES = [
    "Explorer", "Planner", "Family Traveler", "Business Traveler",
    "Budget Seeker", "Quality Seeker", "Convenience First", "Value Maximizer"
]

ICONS = ["🧭", "🧳", "👨‍👩‍👧", "💼", "💸", "⭐️", "⚡️", "🎯"]
ACCENTS = ["#60a5fa", "#22c55e", "#f59e0b", "#f43f5e", "#a78bfa", "#14b8a6", "#eab308", "#fb7185"]


# ----------------------- Prompt -----------------------

PERSONA_SYSTEM = (
    "You are a careful UX and product research analyst. "
    "You create neutral, respectful, and data-grounded personas from clustered user feedback. "
    "Avoid stereotypes, avoid references to nationality/ethnicity/religion/gender/age unless explicitly present and relevant. "
    "Use neutral, professional language."
)

PERSONA_USER_TEMPLATE = """
We have semantic clusters of user feedback from a product. 
Each cluster has: id, label, share (0..1), sentiment (-1..1), sample quotes.

Task:
1) Infer between 2 and 4 user personas that explain behaviors and needs appearing across clusters.
2) Use neutral titles (e.g., “Strategic Traveler”, “Budget Conscious Guest”).
3) Do NOT use names of people or nationalities, avoid stereotypes and sensitive attributes.
4) For each persona, include:
   - title (string, neutral)
   - archetype (one of: {archetypes})
   - share (0..1, sum approx 1.0)
   - goals (3-6 bullet strings)
   - pains (3-6 bullet strings)
   - quotes (2-3 short paraphrases grounded in the clusters)
   - channels (3-5 discovery channels)
   - icon (pick an emoji from: {icons})
   - accent (pick a hex color from: {accents})

Return ONLY valid JSON:
{{"personas":[{{...}}, ...]}}
Clusters (JSON):
{clusters_json}
"""


# ----------------------- Core functions -----------------------

def _clusters_preview_for_prompt(clusters: List[Dict[str, Any]], embed_df: pd.DataFrame) -> str:
    # crea preview con quote reali
    out = []
    for c in clusters[:10]:
        cid = c.get("id")
        label = c.get("label")
        share = c.get("share", 0)
        sent = c.get("sentiment", 0)
        quotes = c.get("quotes", [])
        if not quotes:
            # prendi qualche riga dal df
            qs = embed_df.loc[embed_df["cluster_label"] == cid].head(3)["text"].astype(str).tolist()
        else:
            qs = [q.get("text","") for q in quotes[:3]]
        out.append({"id": cid, "label": label, "share": share, "sentiment": sent, "quotes": qs})
    return json.dumps(out, ensure_ascii=False)


def generate_personas(clusters: List[Dict[str, Any]], embed_df: pd.DataFrame, n_personas: int = 3) -> List[Dict[str, Any]]:
    client = _anthropic_client()
    if client is None:
        return generate_placeholder_personas(clusters, n_personas)

    clusters_json = _clusters_preview_for_prompt(clusters, embed_df)
    user = PERSONA_USER_TEMPLATE.format(
        archetypes=", ".join(ARCHETYPES),
        icons=", ".join(ICONS),
        accents=", ".join(ACCENTS),
        clusters_json=clusters_json,
    )
    try:
        res = client.messages.create(
            model=_anthropic_model_name(),
            max_tokens=2000,
            temperature=0.3,
            system=PERSONA_SYSTEM,
            messages=[{"role": "user", "content": user}],
        )
        txt = "".join([c.text for c in res.content if hasattr(c, "text")])
        data = json.loads(txt)
        personas = data.get("personas", [])
    except Exception:
        personas = []

    if not personas:
        return generate_placeholder_personas(clusters, n_personas)

    # normalizza struttura e riempi campi mancanti
    out: List[Persona] = []
    for i, p in enumerate(personas):
        out.append(
            Persona(
                id=f"persona_{i+1}",
                title=p.get("title") or p.get("archetype") or f"Persona {i+1}",
                archetype=p.get("archetype") or random.choice(ARCHETYPES),
                share=float(p.get("share") or round(1.0 / max(1, len(personas)), 3)),
                goals=[g for g in (p.get("goals") or [])][:6],
                pains=[g for g in (p.get("pains") or [])][:6],
                quotes=[g for g in (p.get("quotes") or [])][:3],
                channels=[g for g in (p.get("channels") or [])][:5],
                icon=p.get("icon") or ICONS[i % len(ICONS)],
                accent=p.get("accent") or ACCENTS[i % len(ACCENTS)],
            )
        )
    # normalizza shares
    tot = sum([pp.share for pp in out]) or 1.0
    for pp in out:
        pp.share = round(pp.share / tot, 3)
    return [asdict(pp) for pp in out]


def generate_placeholder_personas(clusters: List[Dict[str, Any]], n_personas: int = 3) -> List[Dict[str, Any]]:
    n = max(2, min(4, n_personas))
    out: List[Persona] = []
    for i in range(n):
        out.append(
            Persona(
                id=f"persona_{i+1}",
                title=["Strategic Traveler", "Value Maximizer", "Quality Seeker", "Family Planner"][i % 4],
                archetype=ARCHETYPES[i % len(ARCHETYPES)],
                share=round(1.0 / n, 3),
                goals=["Find reliable options", "Optimize cost vs. benefits", "Seamless booking experience"],
                pains=["Hidden fees", "Inconsistent quality", "Slow customer support"],
                quotes=["“Great location with supportive host”", "“Good value for money”"],
                channels=["Search engines", "Review websites", "Friends & community"],
                icon=ICONS[i % len(ICONS)],
                accent=ACCENTS[i % len(ACCENTS)],
            )
        )
    return [asdict(pp) for pp in out]


def enrich_personas_with_data(personas: List[Dict[str, Any]], embed_df: pd.DataFrame, clusters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # se possibile, pesiamo share sui cluster principali
    shares = [c.get("share", 0) for c in clusters if str(c.get("id","")).startswith("cluster_")]
    if shares:
        tot = sum(shares) or 1.0
        weights = [s / tot for s in shares]
        for i, p in enumerate(personas):
            p["share"] = round(weights[i % len(weights)], 3)

    # fill accent/icon mancanti
    for i, p in enumerate(personas):
        p.setdefault("icon", ICONS[i % len(ICONS)])
        p.setdefault("accent", ACCENTS[i % len(ACCENTS)])
    return personas
