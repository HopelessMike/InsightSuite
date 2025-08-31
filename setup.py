#!/usr/bin/env python3
"""
Setup script for InsightSuite project
Creates necessary directories and validates structure
"""

import os
import sys
from pathlib import Path

def create_project_structure():
    """Create the required project structure"""
    
    print("🔧 Setting up InsightSuite project structure...")
    print("=" * 50)
    
    # Get project root (where this script is located)
    project_root = Path(__file__).parent
    
    # Define required directories
    required_dirs = {
        "api": "API endpoint files",
        "_data": "Data files (JSONL format)"
    }
    
    # Create directories if they don't exist
    for dir_name, description in required_dirs.items():
        dir_path = project_root / dir_name
        if not dir_path.exists():
            dir_path.mkdir(parents=True)
            print(f"✅ Created directory: {dir_name}/ - {description}")
        else:
            print(f"✓  Directory exists: {dir_name}/")
    
    # Check for api/index.py
    api_index = project_root / "api" / "index.py"
    if not api_index.exists():
        print(f"⚠️  Warning: api/index.py not found!")
        print("   Please ensure api/index.py exists with your FastAPI application")
    else:
        print(f"✓  Found: api/index.py")
    
    # Check for required files
    required_files = [
        "vercel.json",
        "requirements.txt",
        "run_local.py",
        "test_routes.py"
    ]
    
    print("\n📁 Checking required files:")
    for file_name in required_files:
        file_path = project_root / file_name
        if file_path.exists():
            print(f"✓  Found: {file_name}")
        else:
            print(f"⚠️  Missing: {file_name}")
    
    # Create sample data file if _data is empty
    data_dir = project_root / "ai_service/_data"
    if not any(data_dir.glob("*.jsonl")):
        sample_file = data_dir / "sample_reviews.jsonl"
        sample_data = [
            '{"id": "1", "rating": 5, "text": "Excellent service!", "date": "2024-01-01", "sentiment": "positive"}',
            '{"id": "2", "rating": 4, "text": "Very good experience", "date": "2024-01-02", "sentiment": "positive"}',
            '{"id": "3", "rating": 3, "text": "Average quality", "date": "2024-01-03", "sentiment": "neutral"}'
        ]
        
        with open(sample_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sample_data))
        
        print(f"\n✅ Created sample data file: _data/sample_reviews.jsonl")
    
    print("\n" + "=" * 50)
    print("✅ Project structure validated!")
    print("\n📝 Next steps:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Run local server: python run_local.py")
    print("3. Test endpoints: python test_routes.py --env local")
    print("4. Deploy to Vercel: vercel --prod")

if __name__ == "__main__":
    create_project_structure()