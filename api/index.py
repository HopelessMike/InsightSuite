"""
Vercel handler for InsightSuite API
This file imports the main FastAPI app from ai_service and exposes it for Vercel
"""

import sys
import os
from pathlib import Path

# Add root directory to path
root_path = Path(__file__).parent.parent
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

# Set data directory environment variable
DATA_DIR = root_path / "api" / "insightsuite" / "_data"
if DATA_DIR.exists():
    os.environ.setdefault("INSIGHTS_DATA_DIR", str(DATA_DIR))

# Import the main app from ai_service
try:
    from ai_service.main import app
    print("✅ Imported app from ai_service.main")
except ImportError as e:
    print(f"⚠️ Could not import from ai_service.main: {e}")
    
    # Fallback to root main.py (for compatibility)
    try:
        from main import app
        print("✅ Imported app from root main.py")
    except ImportError as e2:
        print(f"⚠️ Could not import from root main.py: {e2}")
        raise ImportError(f"Could not import app: {e}, {e2}")

# IMPORTANT: Export handler for Vercel
handler = app