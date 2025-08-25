"""
Health check router
"""
from fastapi import APIRouter, Response
from datetime import datetime
from typing import Dict

router = APIRouter()

@router.get("/health/check")
async def health_check() -> Dict[str, str]:
    """
    Simple health check endpoint
    
    Returns:
        Dict with status "ok" if service is running
    """
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@router.get("/health/live")
async def liveness_probe(response: Response) -> Dict[str, str]:
    """
    Kubernetes liveness probe endpoint
    
    Returns:
        200 OK if service is alive
    """
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

@router.get("/health/ready")
async def readiness_probe(response: Response) -> Dict[str, bool]:
    """
    Kubernetes readiness probe endpoint
    
    Returns:
        200 OK if service is ready to accept requests
        503 Service Unavailable if not ready
    """
    # Check if all required services are available
    checks = {
        "api": True,
        "dependencies": check_dependencies()
    }
    
    is_ready = all(checks.values())
    
    if not is_ready:
        response.status_code = 503
    
    return {
        "ready": is_ready,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }

def check_dependencies() -> bool:
    """
    Check if all required dependencies are available
    """
    try:
        # Check critical imports only
        import pandas
        import fastapi
        import pydantic
        return True
    except ImportError:
        return False