"""
FastAPI backend skeleton for InsightSuite
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
import os

from .routers import jobs, health, reviews  # Added reviews
from .models import HealthStatus

# App configuration
app_config = {
    "title": "InsightSuite AI Service",
    "description": "Backend service for customer feedback analysis",
    "version": "1.0.0"
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown
    """
    # Startup
    print("Starting InsightSuite AI Service...")
    
    # Initialize any necessary services here
    # e.g., database connections, ML model loading, etc.
    
    yield
    
    # Shutdown
    print("Shutting down InsightSuite AI Service...")
    
    # Cleanup resources here

# Create FastAPI app
app = FastAPI(
    **app_config,
    lifespan=lifespan
)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://localhost:3000",
    "https://localhost:3001",
    "https://michelemiranda.com",
    "https://v0-insight-suite.vercel.app",
    "https://v0-insight-suite-git-main-elmikedenapoli-gmailcoms-projects.vercel.app",
]

# Add more origins for production
if os.getenv("ENVIRONMENT") == "production":
    origins.extend([
        "https://michelemiranda.com",
        "https://v0-insight-suite.vercel.app"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(reviews.router, prefix="/api", tags=["reviews"])

@app.get("/", tags=["root"])
async def root():
    """
    Root endpoint
    """
    return {
        "message": "InsightSuite AI Service",
        "version": app_config["version"],
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/api/status", response_model=HealthStatus, tags=["status"])
async def get_status():
    """
    Get detailed service status
    """
    return HealthStatus(
        status="operational",
        timestamp=datetime.utcnow(),
        version=app_config["version"],
        services={
            "api": True,
            "voyage_ai": check_voyage_connection(),
            "anthropic": check_anthropic_connection(),
            "database": True,  # Placeholder
            "cache": True      # Placeholder
        }
    )

def check_voyage_connection() -> bool:
    """
    Check if Voyage AI is accessible
    """
    try:
        # Import here to avoid circular dependency
        api_key = os.getenv("VOYAGE_API_KEY")
        return api_key is not None and len(api_key) > 0
    except Exception:
        return False

def check_anthropic_connection() -> bool:
    """
    Check if Anthropic API is accessible
    """
    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        return api_key is not None and len(api_key) > 0
    except Exception:
        return False

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )