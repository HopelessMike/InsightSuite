#!/usr/bin/env python3
"""
Diagnostic script for InsightSuite project
"""

import sys
import os
from pathlib import Path
import importlib.util

def check_python_version():
    """Check Python version"""
    print("🐍 Python Version:")
    print(f"   {sys.version}")
    print()

def check_dependencies():
    """Check if required packages are installed"""
    print("📦 Dependencies Check:")
    
    required = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "pandas",
        "requests"
    ]
    
    for package in required:
        try:
            __import__(package)
            print(f"   ✅ {package} installed")
        except ImportError:
            print(f"   ❌ {package} NOT installed")
    print()

def check_project_structure():
    """Check project files and structure"""
    print("📁 Project Structure:")
    
    root = Path.cwd()
    
    files_to_check = [
        "main.py",
        "api/index.py",
        "ai_service/routers/__init__.py",
        "ai_service/routers/health.py",
        "ai_service/routers/reviews.py",
        "ai_service/routers/jobs.py",
        "requirements.txt",
        "vercel.json"
    ]
    
    for file_path in files_to_check:
        full_path = root / file_path
        if full_path.exists():
            print(f"   ✅ {file_path}")
            
            # Try to import Python files
            if file_path.endswith('.py') and not file_path.startswith('routers/'):
                try:
                    module_name = file_path.replace('/', '.').replace('.py', '')
                    spec = importlib.util.spec_from_file_location(module_name, full_path)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    if hasattr(module, 'app'):
                        print(f"      → Contains 'app' object")
                except Exception as e:
                    print(f"      → Error loading: {str(e)[:50]}")
        else:
            print(f"   ❌ {file_path}")
    print()

def test_imports():
    """Test if the app can be imported"""
    print("🔄 Import Tests:")
    
    # Test main.py import
    try:
        from main import app
        print("   ✅ Successfully imported app from main.py")
    except ImportError as e:
        print(f"   ❌ Cannot import from main.py: {e}")
    
    # Test api.index import
    try:
        from api.index import app
        print("   ✅ Successfully imported app from api/index.py")
    except ImportError as e:
        print(f"   ❌ Cannot import from api/index.py: {e}")
    
    # Test routers import
    try:
        from routers import health, reviews, jobs
        print("   ✅ Successfully imported routers")
    except ImportError as e:
        print(f"   ❌ Cannot import routers: {e}")
    
    print()

def test_server_start():
    """Try to start the server"""
    print("🚀 Server Start Test:")
    
    try:
        # Try to import and create the app
        try:
            from main import app
            print("   ✅ Using app from main.py")
        except:
            try:
                from api.index import app
                print("   ✅ Using app from api/index.py")
            except:
                print("   ❌ No app found to start")
                return
        
        # Try to run with uvicorn
        import uvicorn
        print("   📡 Starting server on http://localhost:8000")
        print("   Press Ctrl+C to stop")
        
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
        
    except Exception as e:
        print(f"   ❌ Error starting server: {e}")

def main():
    print("=" * 60)
    print("InsightSuite Project Diagnostics")
    print("=" * 60)
    print()
    
    check_python_version()
    check_dependencies()
    check_project_structure()
    test_imports()
    
    print("=" * 60)
    print("Diagnosis Complete!")
    print("=" * 60)
    
    # Ask if user wants to try starting the server
    response = input("\nDo you want to try starting the server? (y/n): ")
    if response.lower() == 'y':
        test_server_start()

if __name__ == "__main__":
    main()