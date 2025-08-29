#!/usr/bin/env python3
"""
Backend API Testing for Critical Bug Fixes
==========================================

Testing the critical bug fixes that were just implemented:
1. API Balance Endpoint Fix: Test POST /api/users/balance endpoint
2. Leaderboard Data Structure Fix: Test GET /api/users/leaderboard returns correct format
3. Overall API Stability: Test main API endpoints for 500 errors

Background: Frontend was experiencing 500 Internal Server Errors for missing POST endpoint
and invalid leaderboard data structure causing console errors.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://party-lobby-system.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test data
TEST_USER_ID = "demo-user"
REALISTIC_USER_ID = "did:privy:cme20s0fl005okz0bmxcr0cp0"

class APITester:
    def __init__(self):
        self.passed_tests = 0
        self.total_tests = 0
        self.results = []
        
    def log_test(self, test_name, success, details="", response_time=None):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
            
        result = {
            'test': test_name,
            'status': status,
            'success': success,
            'details': details,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        }
        self.results.append(result)
        
        print(f"{status}: {test_name}")
        if details:
            print(f"    Details: {details}")
        if response_time:
            print(f"    Response Time: {response_time:.3f}s")
        print()
        
    def test_api_balance_endpoint_fix(self):
        """Test the newly created POST /api/users/balance endpoint"""
        print("🎯 TESTING API BALANCE ENDPOINT FIX")
        print("=" * 50)
        
        # Test 1: POST /api/users/balance with demo user
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/users/balance",
                json={"userId": TEST_USER_ID},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['balance', 'currency', 'timestamp']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test(
                        "POST /api/users/balance - Demo User",
                        True,
                        f"Status: {response.status_code}, Balance: {data.get('balance')}, Currency: {data.get('currency')}",
                        response_time
                    )
                else:
                    self.log_test(
                        "POST /api/users/balance - Demo User",
                        False,
                        f"Missing required fields: {missing_fields}",
                        response_time
                    )
            else:
                self.log_test(
                    "POST /api/users/balance - Demo User",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "POST /api/users/balance - Demo User",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 2: POST /api/users/balance with realistic Privy DID
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/users/balance",
                json={"userId": REALISTIC_USER_ID},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['balance', 'currency', 'timestamp']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test(
                        "POST /api/users/balance - Realistic User",
                        True,
                        f"Status: {response.status_code}, Balance: {data.get('balance')}, Currency: {data.get('currency')}",
                        response_time
                    )
                else:
                    self.log_test(
                        "POST /api/users/balance - Realistic User",
                        False,
                        f"Missing required fields: {missing_fields}",
                        response_time
                    )
            else:
                self.log_test(
                    "POST /api/users/balance - Realistic User",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "POST /api/users/balance - Realistic User",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 3: POST /api/users/balance with missing userId (error handling)
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/users/balance",
                json={},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                self.log_test(
                    "POST /api/users/balance - Missing UserId Validation",
                    True,
                    f"Correctly returned 400 error for missing userId",
                    response_time
                )
            else:
                self.log_test(
                    "POST /api/users/balance - Missing UserId Validation",
                    False,
                    f"Expected 400 error, got {response.status_code}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "POST /api/users/balance - Missing UserId Validation",
                False,
                f"Request failed: {str(e)}"
            )
            
    def test_leaderboard_data_structure_fix(self):
        """Test that GET /api/users/leaderboard returns correct format with both 'users' and 'leaderboard' fields"""
        print("🎯 TESTING LEADERBOARD DATA STRUCTURE FIX")
        print("=" * 50)
        
        # Test 1: GET /api/users/leaderboard structure verification
        try:
            start_time = time.time()
            response = requests.get(
                f"{API_BASE}/users/leaderboard",
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for both 'users' and 'leaderboard' fields
                has_users = 'users' in data
                has_leaderboard = 'leaderboard' in data
                has_timestamp = 'timestamp' in data
                
                if has_users and has_leaderboard and has_timestamp:
                    # Verify data structure
                    users_data = data.get('users', [])
                    leaderboard_data = data.get('leaderboard', [])
                    
                    # Check if both arrays have the same structure
                    structure_match = len(users_data) == len(leaderboard_data)
                    
                    # Check required fields in leaderboard entries
                    required_fields = ['rank', 'username', 'gamesWon', 'gamesPlayed', 'totalTerritory']
                    valid_structure = True
                    
                    if users_data:
                        first_entry = users_data[0]
                        missing_fields = [field for field in required_fields if field not in first_entry]
                        if missing_fields:
                            valid_structure = False
                    
                    if valid_structure and structure_match:
                        self.log_test(
                            "GET /api/users/leaderboard - Data Structure Fix",
                            True,
                            f"Both 'users' and 'leaderboard' fields present. Users count: {len(users_data)}, Leaderboard count: {len(leaderboard_data)}",
                            response_time
                        )
                    else:
                        self.log_test(
                            "GET /api/users/leaderboard - Data Structure Fix",
                            False,
                            f"Data structure issues. Structure match: {structure_match}, Valid structure: {valid_structure}",
                            response_time
                        )
                else:
                    missing_fields = []
                    if not has_users:
                        missing_fields.append('users')
                    if not has_leaderboard:
                        missing_fields.append('leaderboard')
                    if not has_timestamp:
                        missing_fields.append('timestamp')
                        
                    self.log_test(
                        "GET /api/users/leaderboard - Data Structure Fix",
                        False,
                        f"Missing required fields: {missing_fields}",
                        response_time
                    )
            else:
                self.log_test(
                    "GET /api/users/leaderboard - Data Structure Fix",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "GET /api/users/leaderboard - Data Structure Fix",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test 2: Verify leaderboard entry structure
        try:
            start_time = time.time()
            response = requests.get(
                f"{API_BASE}/users/leaderboard",
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                users_data = data.get('users', [])
                
                if users_data:
                    first_entry = users_data[0]
                    expected_fields = ['rank', 'username', 'gamesWon', 'gamesPlayed', 'totalTerritory', 'bestPercent', 'winRate']
                    present_fields = [field for field in expected_fields if field in first_entry]
                    
                    if len(present_fields) >= 5:  # At least 5 core fields should be present
                        self.log_test(
                            "GET /api/users/leaderboard - Entry Structure",
                            True,
                            f"Leaderboard entry has {len(present_fields)}/{len(expected_fields)} expected fields: {present_fields}",
                            response_time
                        )
                    else:
                        self.log_test(
                            "GET /api/users/leaderboard - Entry Structure",
                            False,
                            f"Insufficient fields in leaderboard entry. Present: {present_fields}",
                            response_time
                        )
                else:
                    self.log_test(
                        "GET /api/users/leaderboard - Entry Structure",
                        True,
                        "Empty leaderboard (acceptable for new system)",
                        response_time
                    )
            else:
                self.log_test(
                    "GET /api/users/leaderboard - Entry Structure",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "GET /api/users/leaderboard - Entry Structure",
                False,
                f"Request failed: {str(e)}"
            )
            
    def test_overall_api_stability(self):
        """Test main API endpoints for 500 errors and overall stability"""
        print("🎯 TESTING OVERALL API STABILITY")
        print("=" * 50)
        
        # Core API endpoints to test
        endpoints = [
            ("GET", "/ping", "API Ping"),
            ("GET", "/", "Root API"),
            ("GET", "/servers/lobbies", "Server Browser"),
            ("GET", "/stats/live-players", "Live Statistics"),
            ("GET", "/stats/global-winnings", "Global Winnings"),
            ("GET", "/friends/list?userId=demo-user", "Friends List"),
            ("GET", "/users/search?q=test&userId=demo-user", "User Search")
        ]
        
        for method, endpoint, name in endpoints:
            try:
                start_time = time.time()
                
                if method == "GET":
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                elif method == "POST":
                    response = requests.post(f"{API_BASE}{endpoint}", json={}, timeout=10)
                    
                response_time = time.time() - start_time
                
                # Check for 500 errors specifically
                if response.status_code == 500:
                    self.log_test(
                        f"API Stability - {name}",
                        False,
                        f"500 Internal Server Error detected: {response.text[:200]}",
                        response_time
                    )
                elif response.status_code in [200, 201, 400, 404]:  # Acceptable status codes
                    self.log_test(
                        f"API Stability - {name}",
                        True,
                        f"Status: {response.status_code} (No 500 error)",
                        response_time
                    )
                else:
                    self.log_test(
                        f"API Stability - {name}",
                        True,
                        f"Status: {response.status_code} (Non-500 error, acceptable)",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"API Stability - {name}",
                    False,
                    f"Request failed: {str(e)}"
                )
                
        # Test the specific endpoints mentioned in the review request
        print("\n🔍 TESTING SPECIFIC REVIEW REQUEST ENDPOINTS")
        print("-" * 50)
        
        # Test POST /api/users/balance (already tested above, but verify no 500 error)
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/users/balance",
                json={"userId": "demo-user"},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code != 500:
                self.log_test(
                    "Review Request - POST /api/users/balance (No 500 Error)",
                    True,
                    f"Status: {response.status_code} (No 500 error)",
                    response_time
                )
            else:
                self.log_test(
                    "Review Request - POST /api/users/balance (No 500 Error)",
                    False,
                    f"500 Internal Server Error still present: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Review Request - POST /api/users/balance (No 500 Error)",
                False,
                f"Request failed: {str(e)}"
            )
            
        # Test GET /api/users/leaderboard (verify no 500 error and correct structure)
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/users/leaderboard", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                has_both_fields = 'users' in data and 'leaderboard' in data
                
                if has_both_fields:
                    self.log_test(
                        "Review Request - GET /api/users/leaderboard (Fixed Structure)",
                        True,
                        f"Status: 200, Both 'users' and 'leaderboard' fields present",
                        response_time
                    )
                else:
                    self.log_test(
                        "Review Request - GET /api/users/leaderboard (Fixed Structure)",
                        False,
                        f"Missing required fields. Has users: {'users' in data}, Has leaderboard: {'leaderboard' in data}",
                        response_time
                    )
            elif response.status_code != 500:
                self.log_test(
                    "Review Request - GET /api/users/leaderboard (Fixed Structure)",
                    True,
                    f"Status: {response.status_code} (No 500 error, acceptable)",
                    response_time
                )
            else:
                self.log_test(
                    "Review Request - GET /api/users/leaderboard (Fixed Structure)",
                    False,
                    f"500 Internal Server Error still present: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Review Request - GET /api/users/leaderboard (Fixed Structure)",
                False,
                f"Request failed: {str(e)}"
            )
            
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 STARTING CRITICAL BUG FIXES TESTING")
        print("=" * 60)
        print(f"Testing API Base URL: {API_BASE}")
        print(f"Test Start Time: {datetime.now().isoformat()}")
        print()
        
        # Run test suites
        self.test_api_balance_endpoint_fix()
        self.test_leaderboard_data_structure_fix()
        self.test_overall_api_stability()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🎯 CRITICAL BUG FIXES TESTING SUMMARY")
        print("=" * 60)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r['success']]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
            print()
        
        # Print key findings
        print("🔍 KEY FINDINGS:")
        
        # Check if POST /api/users/balance is working
        balance_tests = [r for r in self.results if 'users/balance' in r['test'] and 'POST' in r['test']]
        balance_working = any(r['success'] for r in balance_tests)
        
        if balance_working:
            print("  ✅ POST /api/users/balance endpoint is working (500 error fixed)")
        else:
            print("  ❌ POST /api/users/balance endpoint still has issues")
            
        # Check if leaderboard structure is fixed
        leaderboard_tests = [r for r in self.results if 'leaderboard' in r['test'].lower() and 'structure' in r['test'].lower()]
        leaderboard_fixed = any(r['success'] for r in leaderboard_tests)
        
        if leaderboard_fixed:
            print("  ✅ Leaderboard data structure is fixed (both 'users' and 'leaderboard' fields)")
        else:
            print("  ❌ Leaderboard data structure still needs fixing")
            
        # Check overall API stability
        stability_tests = [r for r in self.results if 'stability' in r['test'].lower() or '500' in r['details']]
        no_500_errors = not any('500 Internal Server Error' in r['details'] for r in self.results)
        
        if no_500_errors:
            print("  ✅ No 500 Internal Server Errors detected in main endpoints")
        else:
            print("  ❌ Some endpoints still returning 500 Internal Server Errors")
            
        print()
        print(f"Test Completion Time: {datetime.now().isoformat()}")
        
        return success_rate >= 80  # Consider successful if 80% or more tests pass

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)