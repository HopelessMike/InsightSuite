"""
Embeddings via Voyage AI with local disk cache, tqdm progress, and smart throttling.
- Throttling configurabile via env:
  VOYAGE_BATCH_SIZE (default 32)
  VOYAGE_MAX_RPM    (default 2  requests/min)
  VOYAGE_MAX_TPM    (default 9000 tokens/min)
- Salva cache su disco e riprende dopo restart.
"""
from __future__ import annotations

import os
import time
import math
import pickle
import hashlib
from pathlib import Path
from typing import List, Dict

import numpy as np
from tqdm.auto import tqdm

# voyageai client
try:
    import voyageai  # type: ignore
    from voyageai.error import RateLimitError  # type: ignore
except Exception:
    voyageai = None
    RateLimitError = Exception  # fallback, won't be used


def _text_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _load_cache(cache_file: str) -> Dict[str, List[float]]:
    p = Path(cache_file)
    if p.exists():
        try:
            with open(p, "rb") as f:
                return pickle.load(f)
        except Exception:
            pass
    p.parent.mkdir(parents=True, exist_ok=True)
    return {}


def _save_cache(cache_file: str, cache: Dict[str, List[float]]) -> None:
    try:
        with open(cache_file, "wb") as f:
            pickle.dump(cache, f)
    except Exception:
        pass


def test_voyage_connection() -> bool:
    try:
        key = os.getenv("VOYAGE_API_KEY")
        if not key or voyageai is None:
            print("❌ VOYAGE_API_KEY not set")
            return False
        model = os.getenv("VOYAGE_MODEL", "voyage-3.5-lite")
        vo = voyageai.Client(api_key=key)
        _ = vo.embed(["hello"], model=model, input_type="document")
        print(f"✅ Voyage reachable with model '{model}'")
        return True
    except Exception as e:
        print(f"Voyage connection failed: {e}")
        return False


def _estimate_tokens(text: str) -> int:
    # stima grossolana: ~4 char/token
    return max(1, math.ceil(len(text) / 4))


def compute_embeddings_with_cache(
    texts: List[str],
    cache_file: str,
    model: str | None = None,
    batch_size: int | None = None,
    desc: str | None = None,
) -> np.ndarray:
    """
    Embed a list of texts using Voyage with throttling and caching.
    - Riprende automaticamente grazie alla cache.
    """
    model = model or os.getenv("VOYAGE_MODEL", "voyage-3.5-lite")
    key = os.getenv("VOYAGE_API_KEY")
    if not key or voyageai is None:
        raise RuntimeError("Voyage API not available in this environment")

    batch_size = int(os.getenv("VOYAGE_BATCH_SIZE", str(batch_size or 32)))
    max_rpm = float(os.getenv("VOYAGE_MAX_RPM", "2"))
    max_tpm = int(os.getenv("VOYAGE_MAX_TPM", "9000"))  # per free-tier/limite ridotto

    # finestrella di 60s per TPM
    window_start = time.time()
    tokens_in_window = 0

    min_interval = 60.0 / max(1.0, max_rpm)

    cache = _load_cache(cache_file)
    out: List[List[float] | None] = [None] * len(texts)

    vo = voyageai.Client(api_key=key)

    # individua mancanti
    idx_to_embed = []
    for i, t in enumerate(texts):
        h = _text_hash(str(t))
        if h in cache:
            out[i] = cache[h]
        else:
            idx_to_embed.append(i)

    if not idx_to_embed:
        return np.array(out, dtype=np.float32)

    pbar = tqdm(total=len(idx_to_embed), desc=desc or "Embeddings", unit="txt")
    last_call = 0.0

    i0 = 0
    while i0 < len(idx_to_embed):
        i1 = min(i0 + batch_size, len(idx_to_embed))
        batch_idx = idx_to_embed[i0:i1]
        batch = [texts[i] for i in batch_idx]

        # throttling semplice RPM
        elapsed = time.time() - last_call
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)

        # throttling TPM (stima)
        now = time.time()
        if now - window_start >= 60.0:
            window_start = now
            tokens_in_window = 0

        est_tokens = sum(_estimate_tokens(t) for t in batch)
        if tokens_in_window + est_tokens > max_tpm:
            sleep_s = 60.0 - (now - window_start)
            if sleep_s > 0:
                time.sleep(sleep_s)
            window_start = time.time()
            tokens_in_window = 0

        # chiamata API con retry/backoff su 429
        try:
            resp = vo.embed(batch, model=model, input_type="document")
        except RateLimitError as e:
            # backoff aggressivo e riduzione batch
            wait = 20
            print(f"Rate limit: backing off {wait}s and reducing batch size")
            time.sleep(wait)
            batch_size = max(8, batch_size // 2)
            continue
        except Exception as e:
            # errori di rete temporanei: attende e riprova
            print(f"Voyage error: {e}. Waiting 10s and retrying ...")
            time.sleep(10)
            continue

        embs = resp.embeddings  # List[List[float]]
        for j, k in enumerate(batch_idx):
            h = _text_hash(str(texts[k]))
            cache[h] = embs[j]
            out[k] = embs[j]

        tokens_in_window += est_tokens
        last_call = time.time()
        pbar.update(len(batch_idx))
        i0 = i1

        # salva cache periodicamente
        if i0 % (batch_size * 10) == 0 or i0 == len(idx_to_embed):
            _save_cache(cache_file, cache)

    pbar.close()
    _save_cache(cache_file, cache)

    # riempi eventuali buchi con zeri (non dovrebbe succedere)
    dim = len(next(iter(cache.values()))) if cache else 1024
    for i, v in enumerate(out):
        if v is None:
            out[i] = [0.0] * dim

    return np.array(out, dtype=np.float32)
