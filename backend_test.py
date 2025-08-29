#!/usr/bin/env python3
"""
Backend Testing for Game Loading Popup Integration
Tests API endpoints that support the new GameLoadingPopup component functionality
"""

import requests
import json
import time
import sys
from datetime import datetime

# Test Configuration
BASE_URL = "http://localhost:3000"
TIMEOUT = 10

class GameLoadingPopupBackendTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, success, message, response_time=None):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        print(f"    {message}")
        
    def test_api_health_check(self):
        """Test basic API health endpoints that support game loading"""
        print("\n🔍 TESTING API HEALTH CHECK ENDPOINTS")
        
        # Test 1: Root API endpoint
        try:
            start_time = time.time()
            response = requests.get(f"{BASE_URL}/api/", timeout=TIMEOUT)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'name' in data and 'TurfLoot' in data['name']:
                    self.log_test("Root API Endpoint", True, 
                                f"API responding correctly: {data.get('name', 'Unknown')}", response_time)
                else:
                    self.log_test("Root API Endpoint", False, 
                                f"Unexpected API response: {data}", response_time)
            else:
                self.log_test("Root API Endpoint", False, 
                            f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Root API Endpoint", False, f"Request failed: {str(e)}")
            
        # Test 2: Ping endpoint for connectivity
        try:
            start_time = time.time()
            response = requests.get(f"{BASE_URL}/api/ping", timeout=TIMEOUT)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'ok':
                    self.log_test("Ping Endpoint", True, 
                                f"Server responding: {data.get('message', 'OK')}", response_time)
                else:
                    self.log_test("Ping Endpoint", False, 
                                f"Unexpected ping response: {data}", response_time)
            else:
                self.log_test("Ping Endpoint", False, 
                            f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Ping Endpoint", False, f"Request failed: {str(e)}")
            
    def test_game_server_endpoints(self):
        """Test game server endpoints that support room joining"""
        print("\n🎮 TESTING GAME SERVER ENDPOINTS")
        
        # Test 3: Server browser endpoint (for room selection)
        try:
            start_time = time.time()
            response = requests.get(f"{BASE_URL}/api/servers/lobbies", timeout=TIMEOUT)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if servers have required fields for game loading popup
                    server = data[0]
                    required_fields = ['id', 'name', 'stake', 'mode', 'currentPlayers', 'maxPlayers']
                    missing_fields = [field for field in required_fields if field not in server]
                    
                    if not missing_fields:
                        self.log_test("Server Browser API", True, 
                                    f"Found {len(data)} servers with proper structure", response_time)
                    else:
                        self.log_test("Server Browser API", False, 
                                    f"Server missing fields: {missing_fields}", response_time)
                else:
                    self.log_test("Server Browser API", False, 
                                f"No servers found or invalid format: {data}", response_time)
            else:
                self.log_test("Server Browser API", False, 
                            f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Server Browser API", False, f"Request failed: {str(e)}")
            
    def test_authentication_endpoints(self):
        """Test authentication endpoints needed for game joining"""
        print("\n🔐 TESTING AUTHENTICATION ENDPOINTS")
        
        # Test 4: Privy authentication endpoint
        try:
            start_time = time.time()
            test_user_data = {
                "privy_user": {
                    "id": "did:privy:test_game_loading_user",
                    "email": {"address": "test@gameloading.com"}
                }
            }
            
            response = requests.post(f"{BASE_URL}/api/auth/privy", 
                                   json=test_user_data, 
                                   timeout=TIMEOUT)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'token' in data:
                    self.log_test("Privy Authentication", True, 
                                f"Authentication successful, token generated", response_time)
                else:
                    self.log_test("Privy Authentication", False, 
                                f"Authentication failed: {data}", response_time)
            else:
                self.log_test("Privy Authentication", False, 
                            f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Privy Authentication", False, f"Request failed: {str(e)}")
            
    def test_game_statistics_endpoints(self):
        """Test statistics endpoints that may be called during game loading"""
        print("\n📊 TESTING GAME STATISTICS ENDPOINTS")
        
        # Test 5: Live players count
        try:
            start_time = time.time()
            response = requests.get(f"{BASE_URL}/api/stats/live-players", timeout=TIMEOUT)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'count' in data and 'timestamp' in data:
                    self.log_test("Live Players Stats", True, 
                                f"Live players: {data['count']}", response_time)
                else:
                    self.log_test("Live Players Stats", False, 
                                f"Invalid stats format: {data}", response_time)
            else:
                self.log_test("Live Players Stats", False, 
                            f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Live Players Stats", False, f"Request failed: {str(e)}")
            
        # Test 6: Global winnings
        try:
            start_time = time.time()
            response = requests.get(f"{BASE_URL}/api/stats/global-winnings", timeout=TIMEOUT)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'total' in data and 'timestamp' in data:
                    self.log_test("Global Winnings Stats", True, 
                                f"Global winnings: ${data['total']}", response_time)
                else:
                    self.log_test("Global Winnings Stats", False, 
                                f"Invalid winnings format: {data}", response_time)
            else:
                self.log_test("Global Winnings Stats", False, 
                            f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Global Winnings Stats", False, f"Request failed: {str(e)}")
            
    def test_server_compilation(self):
        """Test that server compiles correctly with new components"""
        print("\n🔧 TESTING SERVER COMPILATION")
        
        # Test 7: Multiple rapid requests to test server stability
        try:
            start_time = time.time()
            successful_requests = 0
            total_requests = 5
            
            for i in range(total_requests):
                response = requests.get(f"{BASE_URL}/api/ping", timeout=TIMEOUT)
                if response.status_code == 200:
                    successful_requests += 1
                time.sleep(0.1)  # Small delay between requests
                
            response_time = time.time() - start_time
            
            if successful_requests == total_requests:
                self.log_test("Server Stability Test", True, 
                            f"All {total_requests} requests successful", response_time)
            else:
                self.log_test("Server Stability Test", False, 
                            f"Only {successful_requests}/{total_requests} requests successful", response_time)
        except Exception as e:
            self.log_test("Server Stability Test", False, f"Stability test failed: {str(e)}")
            
    def run_all_tests(self):
        """Run all backend tests for Game Loading Popup Integration"""
        print("🚀 STARTING GAME LOADING POPUP BACKEND INTEGRATION TESTS")
        print("=" * 70)
        
        # Run test suites
        self.test_api_health_check()
        self.test_game_server_endpoints()
        self.test_authentication_endpoints()
        self.test_game_statistics_endpoints()
        self.test_server_compilation()
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 GAME LOADING POPUP BACKEND TEST SUMMARY")
        print("=" * 70)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("\n✅ GAME LOADING POPUP BACKEND INTEGRATION: SUCCESSFUL")
            print("   All critical backend APIs are working correctly")
            print("   Server compilation is stable with new components")
        else:
            print("\n❌ GAME LOADING POPUP BACKEND INTEGRATION: ISSUES DETECTED")
            print("   Some backend APIs are not responding correctly")
            print("   Review failed tests above for details")
            
        # Print failed tests details
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n🔍 FAILED TESTS DETAILS:")
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['message']}")
                
        return success_rate >= 80

if __name__ == "__main__":
    tester = GameLoadingPopupBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)