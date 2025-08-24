# ai_service/routers/jobs.py
from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os, json, uuid, time
import requests
from urllib.parse import quote

from ..models import CreateJobRequest, CreateJobResponse, JobStatus
from .reviews import load_reviews  # riutilizziamo logica lettura dati

router = APIRouter()

# ----- Config KV (Vercel KV/Upstash) -------------------------
# Vercel KV (nuovo) inietta tipicamente:
#   KV_REST_API_URL, KV_REST_API_TOKEN
# Upstash Redis (classico) usa:
#   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
KV_URL = os.environ.get("KV_REST_API_URL") or os.environ.get("UPSTASH_REDIS_REST_URL")
KV_TOKEN = os.environ.get("KV_REST_API_TOKEN") or os.environ.get("UPSTASH_REDIS_REST_TOKEN")
if not KV_URL or not KV_TOKEN:
    print("[jobs] WARNING: KV env vars missing; jobs will raise 500")

JOB_TTL_SECONDS = int(os.environ.get("JOB_TTL_SECONDS", "86400"))  # 24h
JOBS_INDEX_KEY = "jobs:index"  # sorted set (score=timestamp)

def _kv_headers():
    return {"Authorization": f"Bearer {KV_TOKEN}"}

def kv_set_json(key: str, obj: Dict[str, Any], ex: Optional[int] = None):
    if not KV_URL or not KV_TOKEN:
        raise HTTPException(status_code=500, detail="KV not configured")
    value = json.dumps(obj, ensure_ascii=False)
    url = f"{KV_URL}/set/{quote(key, safe='')}/{quote(value, safe='')}"
    if ex:
        url += f"?EX={ex}"
    r = requests.post(url, headers=_kv_headers(), timeout=8)
    if r.status_code >= 400:
        raise HTTPException(status_code=500, detail=f"KV set error: {r.text}")
    return r.json()

def kv_get_json(key: str) -> Optional[Dict[str, Any]]:
    if not KV_URL or not KV_TOKEN:
        raise HTTPException(status_code=500, detail="KV not configured")
    url = f"{KV_URL}/get/{quote(key, safe='')}"
    r = requests.get(url, headers=_kv_headers(), timeout=8)
    if r.status_code == 404:
        return None
    if r.status_code >= 400:
        raise HTTPException(status_code=500, detail=f"KV get error: {r.text}")
    data = r.json()
    val = data.get("result")
    if val is None:
        return None
    try:
        return json.loads(val)
    except Exception:
        return None

def kv_zadd(key: str, score: float, member: str):
    url = f"{KV_URL}/zadd/{quote(key, safe='')}/{score}/{quote(member, safe='')}"
    r = requests.post(url, headers=_kv_headers(), timeout=8)
    if r.status_code >= 400:
        raise HTTPException(status_code=500, detail=f"KV zadd error: {r.text}")
    return r.json()

def kv_zrevrange(key: str, start: int, stop: int) -> List[str]:
    url = f"{KV_URL}/zrevrange/{quote(key, safe='')}/{start}/{stop}"
    r = requests.get(url, headers=_kv_headers(), timeout=8)
    if r.status_code >= 400:
        raise HTTPException(status_code=500, detail=f"KV zrevrange error: {r.text}")
    data = r.json()
    res = data.get("result") or []
    # Upstash può restituire come lista o stringa separata, normalizziamo
    if isinstance(res, str):
        return [res]
    return res

def utcnow_iso():
    return datetime.now(timezone.utc).isoformat()

# -------------------------------------------------------------

def _analyze(project_id: str) -> Dict[str, Any]:
    """Analisi 'on-demand' (veloce): calcola 3 stats base."""
    df = load_reviews(project_id)
    total = int(len(df))
    sentiment_mean = float(df['sentiment'].mean())
    top_clusters = (
        df['clusterId'].value_counts(dropna=False)
        .head(5)
        .to_dict()
    )
    langs = df['lang'].value_counts(dropna=False).to_dict()
    return {
        "project_id": project_id,
        "total_reviews": total,
        "sentiment_mean": sentiment_mean,
        "top_clusters": top_clusters,
        "languages": langs,
    }

@router.post("/jobs/analyze", response_model=CreateJobResponse)
async def create_analysis_job(req: CreateJobRequest) -> CreateJobResponse:
    if not KV_URL or not KV_TOKEN:
        raise HTTPException(status_code=500, detail="KV not configured")
    job_id = str(uuid.uuid4())
    now = utcnow_iso()
    job = {
        "id": job_id,
        "status": "queued",
        "progress": 0.0,
        "message": "queued",
        "params": req.model_dump(),
        "result": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
        "completed_at": None
    }
    kv_set_json(f"job:{job_id}", job, ex=JOB_TTL_SECONDS)
    kv_zadd(JOBS_INDEX_KEY, time.time(), job_id)
    return CreateJobResponse(job_id=job_id, status="queued", message="queued")

@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str) -> JobStatus:
    job = kv_get_json(f"job:{job_id}")
    if not job:
        raise HTTPException(status_code=404, detail="job not found")

    status = job.get("status")
    if status in ("queued", "running"):
        # Esegui l'analisi al primo polling ("just-in-time")
        try:
            project_id = (job.get("params") or {}).get("project_id") or (job.get("params") or {}).get("projectId")
            if not project_id:
                raise ValueError("project_id is required in params")
            job["status"] = "running"
            job["progress"] = 10.0
            job["message"] = "running"
            job["updated_at"] = utcnow_iso()
            kv_set_json(f"job:{job_id}", job, ex=JOB_TTL_SECONDS)

            result = _analyze(project_id)
            job["status"] = "completed"
            job["progress"] = 100.0
            job["message"] = "completed"
            job["result"] = result
            job["updated_at"] = utcnow_iso()
            job["completed_at"] = job["updated_at"]
            kv_set_json(f"job:{job_id}", job, ex=JOB_TTL_SECONDS)
        except Exception as e:
            job["status"] = "failed"
            job["message"] = "failed"
            job["error"] = str(e)
            job["updated_at"] = utcnow_iso()
            kv_set_json(f"job:{job_id}", job, ex=JOB_TTL_SECONDS)

    # Response model
    return JobStatus(
        id=job["id"],
        status=job["status"],
        progress=float(job.get("progress") or 0),
        message=job.get("message"),
        created_at=datetime.fromisoformat(job["created_at"]),
        updated_at=datetime.fromisoformat(job["updated_at"]),
        completed_at=datetime.fromisoformat(job["completed_at"]) if job.get("completed_at") else None,
        result=job.get("result"),
        error=job.get("error")
    )

@router.get("/jobs", response_model=List[JobStatus])
async def list_jobs(limit: int = 10, offset: int = 0) -> List[JobStatus]:
    # Legge gli ultimi job dall'indice (sorted set)
    ids = kv_zrevrange(JOBS_INDEX_KEY, offset, offset + limit - 1)
    out: List[JobStatus] = []
    for job_id in ids:
        job = kv_get_json(f"job:{job_id}")
        if not job:
            continue
        out.append(JobStatus(
            id=job["id"],
            status=job["status"],
            progress=float(job.get("progress") or 0),
            message=job.get("message"),
            created_at=datetime.fromisoformat(job["created_at"]),
            updated_at=datetime.fromisoformat(job["updated_at"]),
            completed_at=datetime.fromisoformat(job["completed_at"]) if job.get("completed_at") else None,
            result=job.get("result"),
            error=job.get("error")
        ))
    return out
