# ai_service/routers/__init__.py
"""
API routers for the InsightSuite service
"""

from .health import router as health_router
from .jobs import router as jobs_router

__all__ = ["health_router", "jobs_router"]