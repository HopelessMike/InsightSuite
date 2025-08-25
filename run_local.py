#!/usr/bin/env python3
"""
Local development server for InsightSuite API
Handles both main.py and api/index.py structures
"""

import os
import sys
import subprocess
from pathlib import Path

def setup_environment():
    """Setup environment variables for local development"""
    os.environ["VERCEL_ENV"] = "development"
    
    project_root = Path(__file__).parent.absolute()
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    
    print("Environment Configuration:")
    print(f"   VERCEL_ENV: {os.environ.get('VERCEL_ENV')}")
    print(f"   Project Root: {project_root}")
    print()
    
    return project_root

def check_structure(project_root):
    """Check project structure and determine which file to run"""
    ai_service_main = project_root / "ai_service" / "main.py"
    main_py = project_root / "main.py"
    api_index = project_root / "api" / "index.py"
    routers_dir = project_root / "routers"
    ai_routers_dir = project_root / "ai_service" / "routers"
    
    print("Project Structure Check:")
    
    # Check what exists
    has_ai_service_main = ai_service_main.exists()
    has_main = main_py.exists()
    has_api_index = api_index.exists()
    has_routers = routers_dir.exists()
    has_ai_routers = ai_routers_dir.exists()
    
    print(f"   ai_service/main.py: {'[OK] Found' if has_ai_service_main else '[X] Not found'}")
    print(f"   main.py: {'[OK] Found' if has_main else '[X] Not found'}")
    print(f"   api/index.py: {'[OK] Found' if has_api_index else '[X] Not found'}")
    print(f"   routers/: {'[OK] Found' if has_routers else '[X] Not found'}")
    print(f"   ai_service/routers/: {'[OK] Found' if has_ai_routers else '[X] Not found'}")
    
    if has_ai_routers:
        router_files = list(ai_routers_dir.glob("*.py"))
        if router_files:
            print(f"   AI service router files: {', '.join([f.stem for f in router_files if f.stem != '__init__'])}")
    
    if has_routers:
        router_files = list(routers_dir.glob("*.py"))
        if router_files:
            print(f"   Root router files: {', '.join([f.stem for f in router_files if f.stem != '__init__'])}")
    
    print()
    
    # Determine which app to run (prefer ai_service/main.py)
    if has_ai_service_main:
        return "ai_service", ai_service_main
    elif has_main:
        return "main", main_py
    elif has_api_index:
        return "api", api_index
    else:
        return None, None

def run_with_uvicorn(app_type, file_path):
    """Run the app with uvicorn using subprocess for better compatibility"""
    print("Starting InsightSuite API Development Server")
    print("=" * 50)
    print("Local URL: http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("Health Check: http://localhost:8000/health")
    print("=" * 50)
    print()
    
    # Determine the app module string
    if app_type == "ai_service":
        app_module = "ai_service.main:app"
    elif app_type == "main":
        app_module = "main:app"
    else:  # api
        app_module = "api.index:app"
    
    print(f"Running: uvicorn {app_module} --reload --host 0.0.0.0 --port 8000")
    print()
    
    # Run uvicorn as a subprocess for better compatibility
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            app_module,
            "--reload",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--log-level", "info"
        ])
    except KeyboardInterrupt:
        print("\nServer stopped")
    except Exception as e:
        print(f"[ERROR] Error running server: {e}")
        print("\nTrying alternative method...")
        
        # Alternative: import and run directly
        try:
            import uvicorn
            
            if app_type == "ai_service":
                from ai_service.main import app
            elif app_type == "main":
                from main import app
            else:
                from api.index import app
            
            uvicorn.run(
                app,
                host="0.0.0.0",
                port=8000,
                reload=False,  # Disable reload for direct run
                log_level="info"
            )
        except ImportError as ie:
            print(f"[ERROR] Import error: {ie}")
            print("\nPlease ensure all dependencies are installed:")
            print("  pip install fastapi uvicorn")

def main():
    """Main function"""
    project_root = setup_environment()
    app_type, file_path = check_structure(project_root)
    
    if not app_type:
        print("[ERROR]: No FastAPI app found!")
        print("\nPlease ensure one of the following exists:")
        print("  1. main.py with 'app = FastAPI()' in the project root")
        print("  2. api/index.py with 'app = FastAPI()'")
        sys.exit(1)
    
    print(f"[OK] Using {app_type} app from: {file_path}")
    print()
    
    # Check if uvicorn is installed
    try:
        import uvicorn
        print("[OK] Uvicorn is installed")
    except ImportError:
        print("[INFO] Uvicorn not found. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "uvicorn"])
    
    # Run the server
    run_with_uvicorn(app_type, file_path)

if __name__ == "__main__":
    main()