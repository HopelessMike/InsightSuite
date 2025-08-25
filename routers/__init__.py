"""
Router bridge module - Re-exports routers from ai_service
This bridge allows the root main.py to import routers while keeping the real implementation in ai_service/
"""

from ai_service.routers import health, reviews, jobs

__all__ = ["health", "reviews", "jobs"]