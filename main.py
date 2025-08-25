#!/usr/bin/env python3
"""
Main entry point for local development/testing.
This file exists as a fallback if ai_service import fails.
"""

import sys
import os
from pathlib import Path

# Add current directory to path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Set data directory
DATA_DIR = current_dir / "api" / "insightsuite" / "_data"
if DATA_DIR.exists():
    os.environ.setdefault("INSIGHTS_DATA_DIR", str(DATA_DIR))

try:
    from ai_service.main import app
    print("SUCCESS: Using ai_service.main app")
except ImportError as e:
    print(f"WARNING: Could not import ai_service: {e}")
    # Create a minimal FastAPI app as fallback
    from fastapi import FastAPI
    app = FastAPI(title="InsightSuite Fallback", version="1.0.0")
    
    @app.get("/")
    def root():
        return {"message": "InsightSuite Fallback API", "error": str(e)}
    
    @app.get("/health")
    def health():
        return {"status": "ok", "mode": "fallback"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)