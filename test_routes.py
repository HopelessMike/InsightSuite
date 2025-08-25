#!/usr/bin/env python3
"""
Test script for InsightSuite API routes
Tests both local and deployed endpoints
"""

import requests
import json
import sys
from typing import Dict, List, Tuple
from datetime import datetime

class Colors:
    """Terminal colors for output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

class APITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.results = []
        
    def test_endpoint(self, path: str, method: str = "GET", params: Dict = None) -> Tuple[bool, str, int]:
        """Test a single endpoint"""
        url = f"{self.base_url}{path}"
        
        try:
            if method == "GET":
                response = requests.get(url, params=params, timeout=10)
            else:
                response = requests.request(method, url, json=params, timeout=10)
            
            success = response.status_code < 400
            return success, response.text[:200], response.status_code
            
        except requests.exceptions.ConnectionError:
            return False, "Connection failed", 0
        except requests.exceptions.Timeout:
            return False, "Request timeout", 0
        except Exception as e:
            return False, str(e), 0
    
    def print_result(self, test_name: str, success: bool, message: str, status_code: int):
        """Print formatted test result"""
        if success:
            print(f"{Colors.GREEN}✅ {test_name}{Colors.ENDC}")
            print(f"   Status: {status_code}")
            if message:
                print(f"   Response: {message[:100]}...")
        else:
            print(f"{Colors.RED}❌ {test_name}{Colors.ENDC}")
            print(f"   Status: {status_code if status_code else 'N/A'}")
            print(f"   Error: {message}")
        print()
    
    def run_tests(self):
        """Run all tests"""
        print(f"\n{Colors.BOLD}Testing API at: {self.base_url}{Colors.ENDC}\n")
        print("=" * 60)
        
        # Test 1: Root endpoint
        print(f"\n{Colors.BLUE}1. Testing Root Endpoint{Colors.ENDC}")
        success, message, status = self.test_endpoint("/")
        self.print_result("GET /", success, message, status)
        
        # Test 2: Health check endpoints
        print(f"\n{Colors.BLUE}2. Testing Health Endpoints{Colors.ENDC}")
        
        health_endpoints = [
            "/health",
            "/Health",  # Test case sensitivity
            "/api/health",
            "/InsightSuite/api/health"
        ]
        
        for endpoint in health_endpoints:
            success, message, status = self.test_endpoint(endpoint)
            self.print_result(f"GET {endpoint}", success, message, status)
            self.results.append((endpoint, success))
        
        # Test 3: Projects endpoint
        print(f"\n{Colors.BLUE}3. Testing Projects Endpoint{Colors.ENDC}")
        success, message, status = self.test_endpoint("/projects")
        self.print_result("GET /projects", success, message, status)
        
        # Test 4: Reviews endpoints with different parameters
        print(f"\n{Colors.BLUE}4. Testing Reviews Endpoints{Colors.ENDC}")
        
        reviews_tests = [
            ("/reviews", {"project_id": "airbnb", "page": 1, "page_size": 10}),
            ("/api/reviews", {"projectId": "airbnb", "page": 1, "pageSize": 10}),
            ("/reviews", {"project_id": "airbnb", "sort": "rating", "order": "asc"}),
        ]
        
        for endpoint, params in reviews_tests:
            success, message, status = self.test_endpoint(endpoint, params=params)
            param_str = ", ".join([f"{k}={v}" for k, v in params.items()])
            self.print_result(f"GET {endpoint}?{param_str}", success, message, status)
            self.results.append((f"{endpoint} with params", success))
        
        # Test 5: Stats endpoint
        print(f"\n{Colors.BLUE}5. Testing Stats Endpoint{Colors.ENDC}")
        success, message, status = self.test_endpoint("/stats/airbnb")
        self.print_result("GET /stats/airbnb", success, message, status)
        
        # Test 6: Non-existent endpoint (should return 404)
        print(f"\n{Colors.BLUE}6. Testing 404 Error Handling{Colors.ENDC}")
        success, message, status = self.test_endpoint("/non-existent-endpoint")
        is_404 = status == 404
        self.print_result("GET /non-existent-endpoint (expecting 404)", is_404, message, status)
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print(f"{Colors.BOLD}TEST SUMMARY{Colors.ENDC}")
        print("=" * 60)
        
        total = len(self.results)
        passed = sum(1 for _, success in self.results if success)
        failed = total - passed
        
        print(f"\nTotal tests: {total}")
        print(f"{Colors.GREEN}Passed: {passed}{Colors.ENDC}")
        print(f"{Colors.RED}Failed: {failed}{Colors.ENDC}")
        
        if failed == 0:
            print(f"\n{Colors.GREEN}{Colors.BOLD}✅ All tests passed!{Colors.ENDC}")
        else:
            print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  Some tests failed. Please review the output above.{Colors.ENDC}")
        
        print("\n" + "=" * 60)

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test InsightSuite API endpoints')
    parser.add_argument(
        '--url',
        default='http://localhost:8000',
        help='Base URL of the API (default: http://localhost:8000)'
    )
    parser.add_argument(
        '--env',
        choices=['local', 'staging', 'production'],
        default='local',
        help='Environment to test'
    )
    
    args = parser.parse_args()
    
    # Environment-specific URLs
    urls = {
        'local': 'http://localhost:8000',
        'staging': 'https://v0-insight-suite.vercel.app',
        'production': 'https://michelemiranda.com/InsightSuite/api'
    }
    
    if args.env != 'local':
        base_url = urls[args.env]
    else:
        base_url = args.url
    
    print(f"{Colors.BOLD}")
    print("╔══════════════════════════════════════════════════════════╗")
    print("║           InsightSuite API Route Tester                   ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"{Colors.ENDC}")
    print(f"Environment: {args.env}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = APITester(base_url)
    tester.run_tests()

if __name__ == "__main__":
    main()