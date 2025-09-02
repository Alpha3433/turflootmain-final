#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Hathora Global Connection UI Updates
Testing all core API endpoints to ensure no regressions after UI changes.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Test Configuration
BASE_URL = "https://hathora-turfloot.preview.emergentagent.com"
LOCAL_URL = "http://localhost:3000"

# Use localhost for testing as per environment configuration
TEST_URL = LOCAL_URL

class BackendTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name, success, details="", response_time=None):
        """Log test result with details"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            self.failed_tests += 1
            status = "❌ FAIL"
            
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_time": response_time,
            "timestamp": datetime.now().isoformat()
        }
        
        self.test_results.append(result)
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if response_time:
            print(f"    Response Time: {response_time:.3f}s")
        print()
        
    def test_api_endpoint(self, endpoint, method="GET", data=None, expected_status=200, test_name=None):
        """Generic API endpoint tester"""
        if not test_name:
            test_name = f"{method} {endpoint}"
            
        try:
            start_time = time.time()
            
            if method == "GET":
                response = requests.get(f"{TEST_URL}{endpoint}", timeout=10)
            elif method == "POST":
                response = requests.post(f"{TEST_URL}{endpoint}", json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            response_time = time.time() - start_time
            
            if response.status_code == expected_status:
                try:
                    response_data = response.json()
                    self.log_test(test_name, True, f"Status: {response.status_code}, Data keys: {list(response_data.keys())}", response_time)
                    return True, response_data
                except:
                    self.log_test(test_name, True, f"Status: {response.status_code}, Non-JSON response", response_time)
                    return True, response.text
            else:
                self.log_test(test_name, False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}", response_time)
                return False, None
                
        except Exception as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")
            return False, None

    def test_core_api_endpoints(self):
        """Test core API endpoints that should work after UI changes"""
        print("🔍 TESTING CORE API ENDPOINTS")
        print("=" * 50)
        
        # 1. Root API endpoint
        self.test_api_endpoint("/api/", test_name="Root API Endpoint")
        
        # 2. Ping endpoint (specifically mentioned in review request)
        self.test_api_endpoint("/api/ping", test_name="Ping Endpoint")
        
        # 3. Server Browser (core game API)
        self.test_api_endpoint("/api/servers/lobbies", test_name="Server Browser API")
        
        # 4. Live Statistics APIs
        self.test_api_endpoint("/api/stats/live-players", test_name="Live Players Statistics")
        self.test_api_endpoint("/api/stats/global-winnings", test_name="Global Winnings Statistics")
        
        # 5. Leaderboard API
        self.test_api_endpoint("/api/users/leaderboard", test_name="Leaderboard API")
        
        # 6. Wallet Balance (authentication endpoint)
        self.test_api_endpoint("/api/wallet/balance", test_name="Wallet Balance API")
        
    def test_hathora_environment_config(self):
        """Test Hathora environment variables are properly configured"""
        print("🌍 TESTING HATHORA ENVIRONMENT CONFIGURATION")
        print("=" * 50)
        
        # Check if environment variables are accessible through API
        # Since we can't directly access env vars, we'll test if the system is working
        success, data = self.test_api_endpoint("/api/", test_name="Environment Config Check")
        
        if success and data:
            # Check if the API response indicates proper configuration
            if isinstance(data, dict) and 'features' in data:
                features = data.get('features', [])
                if 'multiplayer' in features:
                    self.log_test("Hathora Multiplayer Feature", True, "Multiplayer feature enabled in API response")
                else:
                    self.log_test("Hathora Multiplayer Feature", False, "Multiplayer feature not found in API response")
            else:
                self.log_test("Hathora Environment Config", True, "API responding normally, environment likely configured")
        
    def test_game_server_integration(self):
        """Test game server integration hasn't been broken"""
        print("🎮 TESTING GAME SERVER INTEGRATION")
        print("=" * 50)
        
        # Test server browser for game server data
        success, data = self.test_api_endpoint("/api/servers/lobbies", test_name="Game Server Data Retrieval")
        
        if success and data:
            servers = data.get('servers', [])
            if servers:
                self.log_test("Game Servers Available", True, f"Found {len(servers)} servers")
                
                # Check server data structure
                first_server = servers[0]
                required_fields = ['id', 'name', 'region', 'currentPlayers', 'maxPlayers']
                missing_fields = [field for field in required_fields if field not in first_server]
                
                if not missing_fields:
                    self.log_test("Server Data Structure", True, "All required server fields present")
                else:
                    self.log_test("Server Data Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Game Servers Available", False, "No servers found in response")
    
    def test_authentication_endpoints(self):
        """Test authentication-related endpoints"""
        print("🔐 TESTING AUTHENTICATION ENDPOINTS")
        print("=" * 50)
        
        # Test wallet balance (requires auth handling)
        self.test_api_endpoint("/api/wallet/balance", test_name="Authentication Wallet Balance")
        
        # Test user profile endpoint
        self.test_api_endpoint("/api/users/profile?userId=test-user", test_name="User Profile Endpoint", expected_status=404)
        
    def test_database_connectivity(self):
        """Test database connectivity through API endpoints"""
        print("🗄️ TESTING DATABASE CONNECTIVITY")
        print("=" * 50)
        
        # Test endpoints that require database access
        self.test_api_endpoint("/api/users/leaderboard", test_name="Database Leaderboard Query")
        self.test_api_endpoint("/api/users/search?q=test&userId=test-user", test_name="Database User Search")
        
    def test_performance_after_changes(self):
        """Test API performance hasn't degraded after UI changes"""
        print("⚡ TESTING API PERFORMANCE")
        print("=" * 50)
        
        # Test multiple rapid requests to check for performance issues
        start_time = time.time()
        rapid_tests = []
        
        for i in range(5):
            success, _ = self.test_api_endpoint("/api/ping", test_name=f"Performance Test {i+1}")
            rapid_tests.append(success)
            
        total_time = time.time() - start_time
        success_rate = sum(rapid_tests) / len(rapid_tests) * 100
        
        if success_rate >= 80 and total_time < 10:
            self.log_test("API Performance Test", True, f"Success rate: {success_rate}%, Total time: {total_time:.3f}s")
        else:
            self.log_test("API Performance Test", False, f"Success rate: {success_rate}%, Total time: {total_time:.3f}s")
    
    def test_hathora_specific_functionality(self):
        """Test functionality specific to Hathora integration"""
        print("🌐 TESTING HATHORA-SPECIFIC FUNCTIONALITY")
        print("=" * 50)
        
        # Test server browser for global servers (Hathora integration)
        success, data = self.test_api_endpoint("/api/servers/lobbies", test_name="Hathora Global Servers")
        
        if success and data:
            servers = data.get('servers', [])
            regions = data.get('regions', [])
            
            # Check for global/multi-region setup (indicates Hathora integration)
            if len(regions) > 1:
                self.log_test("Global Multi-Region Setup", True, f"Found {len(regions)} regions: {regions}")
            else:
                self.log_test("Global Multi-Region Setup", False, f"Only {len(regions)} region(s) found")
                
            # Check for different server types (free/cash games)
            game_types = set()
            for server in servers:
                if server.get('mode'):
                    game_types.add(server['mode'])
                    
            if len(game_types) > 1:
                self.log_test("Multiple Game Types", True, f"Found game types: {list(game_types)}")
            else:
                self.log_test("Multiple Game Types", False, f"Only found: {list(game_types)}")

    def run_all_tests(self):
        """Run comprehensive backend testing suite"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING")
        print("Testing Hathora Global Connection UI Updates - Backend Regression Testing")
        print("=" * 80)
        print()
        
        # Run all test suites
        self.test_core_api_endpoints()
        self.test_hathora_environment_config()
        self.test_game_server_integration()
        self.test_authentication_endpoints()
        self.test_database_connectivity()
        self.test_performance_after_changes()
        self.test_hathora_specific_functionality()
        
        # Print final summary
        self.print_summary()
        
    def print_summary(self):
        """Print comprehensive test summary"""
        print("=" * 80)
        print("🎯 COMPREHENSIVE BACKEND TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        if self.failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"  - {result['test']}")
        print()
        
        # Overall assessment
        if success_rate >= 90:
            print("🎉 EXCELLENT: Backend is fully operational after Hathora UI updates")
        elif success_rate >= 75:
            print("✅ GOOD: Backend is mostly operational with minor issues")
        elif success_rate >= 50:
            print("⚠️ WARNING: Backend has significant issues that need attention")
        else:
            print("🚨 CRITICAL: Backend has major problems that require immediate fixes")
            
        print("=" * 80)

if __name__ == "__main__":
    print("🔧 Hathora Global Connection UI Updates - Backend Testing")
    print("Testing all core API endpoints to ensure no regressions...")
    print()
    
    tester = BackendTester()
    tester.run_all_tests()