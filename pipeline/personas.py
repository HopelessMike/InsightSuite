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

ICONS = ["A", "B", "C", "D", "E", "F", "G", "H"]
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


def _assess_data_quality(clusters: List[Dict[str, Any]], embed_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Analizza la qualità dei dati per determinare se generare personas AI o placeholder
    """
    if not clusters or embed_df.empty:
        return {"use_ai": False, "reason": "no_data", "avg_length": 0}
    
    # Calcola lunghezza media delle recensioni
    texts = embed_df["text"].astype(str)
    avg_length = texts.str.len().mean()
    
    # Conta quante recensioni sono molto brevi (<=10 caratteri)
    short_reviews = (texts.str.len() <= 10).sum()
    short_ratio = short_reviews / len(texts) if len(texts) > 0 else 1
    
    # Conta recensioni di una sola parola
    single_word = texts.str.split().str.len().eq(1).sum()
    single_word_ratio = single_word / len(texts) if len(texts) > 0 else 1
    
    # Criteri per usare AI
    use_ai = (
        avg_length >= 20 and  # Lunghezza media ragionevole
        short_ratio < 0.7 and  # Meno del 70% di recensioni molto brevi
        single_word_ratio < 0.5 and  # Meno del 50% di recensioni di una parola
        len(clusters) >= 2  # Almeno 2 cluster
    )
    
    reason = "sufficient_data" if use_ai else "insufficient_data"
    if short_ratio >= 0.7:
        reason = "too_many_short_reviews"
    elif single_word_ratio >= 0.5:
        reason = "too_many_single_words"
    elif avg_length < 20:
        reason = "low_avg_length"
    
    return {
        "use_ai": use_ai,
        "reason": reason,
        "avg_length": round(avg_length, 1),
        "short_ratio": round(short_ratio, 3),
        "single_word_ratio": round(single_word_ratio, 3)
    }


def generate_personas(clusters: List[Dict[str, Any]], embed_df: pd.DataFrame, n_personas: int = 3) -> List[Dict[str, Any]]:
    # Analizza qualità dei dati
    quality = _assess_data_quality(clusters, embed_df)
    
    client = _anthropic_client()
    if client is None or not quality["use_ai"]:
        print(f">> Using placeholder personas: {quality['reason']} (avg_length: {quality['avg_length']})")
        return generate_adaptive_personas(clusters, embed_df, n_personas, quality)

    print(f">> Data quality sufficient for AI personas (avg_length: {quality['avg_length']})")
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
        print(f">> Generated {len(personas)} AI personas successfully")
    except Exception as e:
        print(f">> AI persona generation failed: {str(e)[:100]}")
        personas = []

    if not personas:
        return generate_adaptive_personas(clusters, embed_df, n_personas, quality)

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


def generate_adaptive_personas(clusters: List[Dict[str, Any]], embed_df: pd.DataFrame, n_personas: int = 3, quality: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Genera personas adattive basate sui cluster reali quando i dati sono insufficienti per l'AI
    """
    n = max(2, min(4, n_personas))
    out: List[Persona] = []
    
    # Determina il tipo di contenuto dalle keywords dei cluster
    all_keywords = []
    cluster_sentiments = []
    for c in clusters:
        all_keywords.extend(c.get("keywords", []))
        cluster_sentiments.append(c.get("sentiment", 0))
    
    avg_sentiment = sum(cluster_sentiments) / len(cluster_sentiments) if cluster_sentiments else 0
    
    # Classifica il dominio basato sulle keywords
    domain_type = _classify_domain(all_keywords, embed_df)
    
    # Genera personas specifiche per dominio
    for i in range(n):
        persona_data = _generate_domain_specific_persona(domain_type, i, avg_sentiment, clusters)
        
        out.append(
            Persona(
                id=f"persona_{i+1}",
                title=persona_data["title"],
                archetype=persona_data["archetype"],
                share=round(1.0 / n, 3),
                goals=persona_data["goals"],
                pains=persona_data["pains"],
                quotes=persona_data["quotes"],
                channels=persona_data["channels"],
                icon=ICONS[i % len(ICONS)],
                accent=ACCENTS[i % len(ACCENTS)],
            )
        )
    return [asdict(pp) for pp in out]


def _classify_domain(keywords: List[str], embed_df: pd.DataFrame) -> str:
    """
    Classifica il tipo di dominio basato su keywords e testi
    """
    keywords_str = " ".join(keywords).lower()
    
    # Analizza anche i testi per pattern
    sample_texts = embed_df["text"].head(20).str.lower().str.cat(sep=" ")
    combined_text = keywords_str + " " + sample_texts
    
    # Classificazione per pattern
    if any(word in combined_text for word in ["hotel", "airbnb", "host", "room", "location", "stay", "guest", "eccellente", "eccezionale", "ottimo", "carino", "posizione", "parcheggio", "soggiorno"]):
        return "hospitality"
    elif any(word in combined_text for word in ["app", "mobile", "feature", "bug", "update", "interface"]):
        return "mobile_app"
    elif any(word in combined_text for word in ["product", "quality", "size", "fabric", "delivery", "shipping", "order"]):
        return "ecommerce"
    elif any(word in combined_text for word in ["service", "support", "staff", "customer", "help"]):
        return "service"
    else:
        return "generic"


def _generate_domain_specific_persona(domain: str, index: int, avg_sentiment: float, clusters: List[Dict]) -> Dict:
    """
    Genera dati persona specifici per dominio
    """
    
    # Template per hospitality (Airbnb, hotel, etc.)
    if domain == "hospitality":
        personas_data = [
            {
                "title": "Budget Traveler",
                "archetype": "Budget Seeker",
                "goals": ["Find affordable stays", "Good location access", "Basic amenities"],
                "pains": ["Unexpected fees", "Poor location", "Misleading photos"],
                "quotes": ["\"Perfect location, great value\"", "\"Simple but clean\""],
                "channels": ["Price comparison sites", "Review platforms", "Social media"]
            },
            {
                "title": "Experience Seeker", 
                "archetype": "Explorer",
                "goals": ["Authentic experiences", "Local recommendations", "Unique properties"],
                "pains": ["Generic accommodations", "Poor host communication", "Limited local info"],
                "quotes": ["\"Loved the local touch\"", "\"Host made all the difference\""],
                "channels": ["Instagram", "Travel blogs", "Word of mouth"]
            },
            {
                "title": "Comfort Focused",
                "archetype": "Quality Seeker", 
                "goals": ["Clean comfortable space", "Reliable amenities", "Quiet environment"],
                "pains": ["Noise issues", "Cleanliness problems", "Broken facilities"],
                "quotes": ["\"Everything worked perfectly\"", "\"Spotlessly clean\""],
                "channels": ["Direct booking", "Premium platforms", "Referrals"]
            }
        ]
    
    # Template per mobile app
    elif domain == "mobile_app":
        personas_data = [
            {
                "title": "Power User",
                "archetype": "Convenience First",
                "goals": ["Advanced features", "Quick navigation", "Customization options"],
                "pains": ["Missing features", "Slow performance", "Complex UI"],
                "quotes": ["\"Love the new features\"", "\"Could be faster\""],
                "channels": ["App stores", "Tech forums", "Social media"]
            },
            {
                "title": "Casual User",
                "archetype": "Convenience First", 
                "goals": ["Simple interface", "Reliable basic functions", "Easy learning"],
                "pains": ["Too many options", "Confusing navigation", "Frequent crashes"],
                "quotes": ["\"Simple and works\"", "\"Too complicated\""],
                "channels": ["App stores", "Friends", "Default options"]
            }
        ]
    
    # Template per ecommerce
    elif domain == "ecommerce":
        personas_data = [
            {
                "title": "Quality Conscious",
                "archetype": "Quality Seeker",
                "goals": ["High quality products", "Accurate descriptions", "Good materials"],
                "pains": ["Poor quality", "Misleading descriptions", "Size issues"],
                "quotes": ["\"Exactly as described\"", "\"Great quality materials\""],
                "channels": ["Review sites", "Brand websites", "Social proof"]
            },
            {
                "title": "Deal Hunter",
                "archetype": "Value Maximizer",
                "goals": ["Best prices", "Fast shipping", "Easy returns"],
                "pains": ["High prices", "Slow delivery", "Complicated returns"],
                "quotes": ["\"Great deal, fast delivery\"", "\"Perfect price point\""],
                "channels": ["Price comparison", "Deal alerts", "Social media"]
            }
        ]
    
    # Template generico
    else:
        personas_data = [
            {
                "title": "Satisfied User",
                "archetype": "Quality Seeker",
                "goals": ["Reliable service", "Good value", "Positive experience"],
                "pains": ["Service issues", "Poor communication", "Unmet expectations"],
                "quotes": ["\"Met my expectations\"", "\"Good overall experience\""],
                "channels": ["Search engines", "Reviews", "Recommendations"]
            },
            {
                "title": "Critical User",
                "archetype": "Quality Seeker",
                "goals": ["High standards", "Attention to detail", "Consistent quality"],
                "pains": ["Quality inconsistency", "Poor attention to detail", "Service gaps"],
                "quotes": ["\"Could be better\"", "\"Needs improvement\""],
                "channels": ["Review platforms", "Direct feedback", "Community forums"]
            }
        ]
    
    # Adatta il sentiment
    persona = personas_data[index % len(personas_data)].copy()
    if avg_sentiment < -0.3:
        # Sentiment negativo - enfatizza i pain points
        persona["pains"] = persona["pains"] + ["Frequent disappointments", "Poor customer service"]
        persona["quotes"] = ["\"Not as expected\"", "\"Room for improvement\""]
    elif avg_sentiment > 0.5:
        # Sentiment positivo - enfatizza i successi
        persona["goals"] = persona["goals"] + ["Consistent positive experiences"]
        persona["quotes"] = ["\"Exceeded expectations\"", "\"Highly recommend\""]
    
    return persona


def generate_placeholder_personas(clusters: List[Dict[str, Any]], n_personas: int = 3) -> List[Dict[str, Any]]:
    """Legacy function - now redirects to adaptive personas"""
    return generate_adaptive_personas(clusters, pd.DataFrame(), n_personas)


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
