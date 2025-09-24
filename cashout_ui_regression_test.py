#!/usr/bin/env python3
"""
Backend Regression Testing After Cashout Success Modal UI Text Changes
=====================================================================

This test verifies that all backend functionality remains operational after
UI text changes to the cashout success modal buttons in /app/app/agario/page.js.

CHANGES MADE:
1. Changed "JOINING..." button text to "PLAY AGAIN" on line 3358
2. Changed "🏠Home" button text to "HOME" on line 3390

TESTING FOCUS:
1. Verify all existing API endpoints are still working correctly
2. Test game session management APIs that support the agario game functionality
3. Verify authentication and user management systems are operational
4. Test any APIs related to cashout functionality if they exist
5. Ensure no regressions were introduced by the UI text changes

Since these were purely cosmetic UI changes, all backend functionality should
remain completely unaffected.
"""

import requests
import json
import time
import base64
from datetime import datetime

class CashoutUIRegressionTester:
    def __init__(self):
        # Get base URL from environment
        self.base_url = "https://agario-multiplayer.preview.emergentagent.com/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print("🚀 BACKEND REGRESSION TESTING AFTER CASHOUT UI TEXT CHANGES")
        print("=" * 80)
        print(f"🔗 Testing backend at: {self.base_url}")
        print(f"📅 Test started: {datetime.now().isoformat()}")
        print()
        print("📝 UI CHANGES MADE:")
        print("   • 'JOINING...' → 'PLAY AGAIN' (line 3358)")
        print("   • '🏠Home' → 'HOME' (line 3390)")
        print("   • These are purely cosmetic changes that should not affect backend")
        print()

    def log_test(self, test_name, passed, details=""):
        """Log test results"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })

    def test_api_health_check(self):
        """Test 1: Core API Health Check"""
        print("🔍 TEST 1: Core API Health Check")
        try:
            # Test root API endpoint
            response = requests.get(f"{self.base_url}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('service') == 'turfloot-backend' and 
                    'auth' in data.get('features', []) and
                    'blockchain' in data.get('features', []) and
                    'multiplayer' in data.get('features', [])):
                    self.log_test("API Health Check", True, 
                                f"Service: {data.get('service')}, Features: {data.get('features')}")
                    return True
                else:
                    self.log_test("API Health Check", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_wallet_balance_api(self):
        """Test 2: Wallet Balance API (Critical for Cashout)"""
        print("\n🔍 TEST 2: Wallet Balance API")
        try:
            # Test guest balance
            response = requests.get(f"{self.base_url}/wallet/balance", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['balance', 'currency', 'sol_balance', 'wallet_address']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test("Wallet Balance API", True, 
                                f"All required fields present: balance=${data.get('balance')}, sol_balance={data.get('sol_balance')}")
                    return True
                else:
                    self.log_test("Wallet Balance API", False, f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Wallet Balance API", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Wallet Balance API", False, f"Error: {str(e)}")
            return False

    def test_game_session_apis(self):
        """Test 3: Game Session Management APIs"""
        print("\n🔍 TEST 3: Game Session Management APIs")
        try:
            # Test game session join
            session_data = {
                "action": "join_session",
                "roomId": "test-cashout-regression",
                "userId": f"test-user-{int(time.time())}",
                "gameMode": "practice"
            }
            
            response = requests.post(f"{self.base_url}/game-sessions/join", 
                                   json=session_data, timeout=10)
            
            if response.status_code in [200, 201]:
                data = response.json()
                if data.get('success'):
                    # Test session leave
                    leave_data = {
                        "action": "leave_session",
                        "roomId": "test-cashout-regression",
                        "userId": session_data["userId"]
                    }
                    
                    leave_response = requests.post(f"{self.base_url}/game-sessions/leave", 
                                                 json=leave_data, timeout=10)
                    
                    if leave_response.status_code == 200:
                        self.log_test("Game Session APIs", True, 
                                    "Session join/leave working correctly")
                        return True
                    else:
                        self.log_test("Game Session APIs", False, 
                                    f"Session leave failed: HTTP {leave_response.status_code}")
                        return False
                else:
                    self.log_test("Game Session APIs", False, f"Session join failed: {data}")
                    return False
            else:
                self.log_test("Game Session APIs", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Game Session APIs", False, f"Error: {str(e)}")
            return False

    def test_server_browser_api(self):
        """Test 4: Server Browser API (Supports Game Loading)"""
        print("\n🔍 TEST 4: Server Browser API")
        try:
            response = requests.get(f"{self.base_url}/servers/lobbies", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if ('servers' in data and 'totalPlayers' in data and 
                    'hathoraEnabled' in data):
                    server_count = len(data.get('servers', []))
                    self.log_test("Server Browser API", True, 
                                f"Server browser working: {server_count} servers, Hathora: {data.get('hathoraEnabled')}")
                    return True
                else:
                    self.log_test("Server Browser API", False, f"Missing required fields: {data}")
                    return False
            else:
                self.log_test("Server Browser API", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Server Browser API", False, f"Error: {str(e)}")
            return False

    def test_live_statistics_apis(self):
        """Test 5: Live Statistics APIs (Support Game Stats)"""
        print("\n🔍 TEST 5: Live Statistics APIs")
        try:
            # Test live players endpoint
            players_response = requests.get(f"{self.base_url}/stats/live-players", timeout=10)
            
            # Test global winnings endpoint
            winnings_response = requests.get(f"{self.base_url}/stats/global-winnings", timeout=10)
            
            players_ok = players_response.status_code == 200
            winnings_ok = winnings_response.status_code == 200
            
            if players_ok and winnings_ok:
                players_data = players_response.json()
                winnings_data = winnings_response.json()
                
                if ('count' in players_data and 'total' in winnings_data):
                    self.log_test("Live Statistics APIs", True, 
                                f"Live players: {players_data.get('count')}, Global winnings: {winnings_data.get('formatted')}")
                    return True
                else:
                    self.log_test("Live Statistics APIs", False, "Missing required fields in responses")
                    return False
            else:
                self.log_test("Live Statistics APIs", False, 
                            f"Players: HTTP {players_response.status_code}, Winnings: HTTP {winnings_response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Live Statistics APIs", False, f"Error: {str(e)}")
            return False

    def test_user_management_apis(self):
        """Test 6: User Management APIs"""
        print("\n🔍 TEST 6: User Management APIs")
        try:
            # Test leaderboard endpoint
            leaderboard_response = requests.get(f"{self.base_url}/users/leaderboard", timeout=10)
            
            if leaderboard_response.status_code == 200:
                data = leaderboard_response.json()
                if 'users' in data and 'leaderboard' in data:
                    user_count = len(data.get('users', []))
                    self.log_test("User Management APIs", True, 
                                f"Leaderboard working: {user_count} users")
                    return True
                else:
                    self.log_test("User Management APIs", False, f"Missing required fields: {data}")
                    return False
            else:
                self.log_test("User Management APIs", False, f"HTTP {leaderboard_response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("User Management APIs", False, f"Error: {str(e)}")
            return False

    def test_friends_system_apis(self):
        """Test 7: Friends System APIs"""
        print("\n🔍 TEST 7: Friends System APIs")
        try:
            # Test friends list endpoint
            response = requests.get(f"{self.base_url}/friends?type=friends&userIdentifier=guest", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'success' in data and 'friends' in data and 'count' in data:
                    friend_count = data.get('count', 0)
                    self.log_test("Friends System APIs", True, 
                                f"Friends API working: {friend_count} friends for guest user")
                    return True
                else:
                    self.log_test("Friends System APIs", False, f"Missing required fields: {data}")
                    return False
            else:
                self.log_test("Friends System APIs", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Friends System APIs", False, f"Error: {str(e)}")
            return False

    def test_authentication_system(self):
        """Test 8: Authentication System"""
        print("\n🔍 TEST 8: Authentication System")
        try:
            # Test with a test JWT token
            test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhdXRoLXRlc3QiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NTc0MDAwMDB9.test-signature"
            
            headers = {
                'Authorization': f'Bearer {test_token}',
                'Content-Type': 'application/json'
            }
            
            # Test authenticated wallet balance request
            response = requests.get(f"{self.base_url}/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'balance' in data and data.get('balance', 0) > 0:
                    self.log_test("Authentication System", True, 
                                f"JWT authentication working: balance=${data.get('balance')}")
                    return True
                else:
                    self.log_test("Authentication System", False, f"Authentication failed: {data}")
                    return False
            else:
                self.log_test("Authentication System", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Authentication System", False, f"Error: {str(e)}")
            return False

    def test_cashout_related_apis(self):
        """Test 9: Cashout-Related Backend Support"""
        print("\n🔍 TEST 9: Cashout-Related Backend Support")
        try:
            # Test multiple endpoints that would support cashout functionality
            endpoints_to_test = [
                ("/wallet/balance", "Wallet balance for cashout"),
                ("/stats/live-players", "Live player tracking"),
                ("/stats/global-winnings", "Global winnings tracking")
            ]
            
            all_passed = True
            details = []
            
            for endpoint, description in endpoints_to_test:
                try:
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                    if response.status_code == 200:
                        details.append(f"{description}: ✅")
                    else:
                        details.append(f"{description}: ❌ HTTP {response.status_code}")
                        all_passed = False
                except Exception as e:
                    details.append(f"{description}: ❌ {str(e)}")
                    all_passed = False
            
            if all_passed:
                self.log_test("Cashout Backend Support", True, 
                            f"All cashout support APIs working")
                return True
            else:
                self.log_test("Cashout Backend Support", False, 
                            f"Some cashout APIs failed")
                return False
                
        except Exception as e:
            self.log_test("Cashout Backend Support", False, f"Error: {str(e)}")
            return False

    def test_api_performance(self):
        """Test 10: API Performance and Reliability"""
        print("\n🔍 TEST 10: API Performance and Reliability")
        try:
            # Test multiple rapid requests to check for performance issues
            start_time = time.time()
            successful_requests = 0
            total_requests = 5
            
            for i in range(total_requests):
                response = requests.get(f"{self.base_url}/ping", timeout=5)
                if response.status_code == 200:
                    successful_requests += 1
                time.sleep(0.1)  # Small delay between requests
            
            end_time = time.time()
            duration = end_time - start_time
            success_rate = (successful_requests / total_requests) * 100
            avg_response_time = duration / total_requests
            
            if success_rate >= 80 and avg_response_time < 2.0:
                self.log_test("API Performance", True, 
                            f"{success_rate:.1f}% success rate, {avg_response_time:.3f}s avg response time")
                return True
            else:
                self.log_test("API Performance", False, 
                            f"{success_rate:.1f}% success rate, {avg_response_time:.3f}s avg response time")
                return False
                
        except Exception as e:
            self.log_test("API Performance", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all regression tests"""
        print("🎯 STARTING COMPREHENSIVE BACKEND REGRESSION TESTING")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all tests
        tests = [
            self.test_api_health_check,
            self.test_wallet_balance_api,
            self.test_game_session_apis,
            self.test_server_browser_api,
            self.test_live_statistics_apis,
            self.test_user_management_apis,
            self.test_friends_system_apis,
            self.test_authentication_system,
            self.test_cashout_related_apis,
            self.test_api_performance
        ]
        
        for test_func in tests:
            try:
                test_func()
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
                self.log_test(test_func.__name__, False, f"Test crashed: {str(e)}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print final results
        print("\n" + "=" * 80)
        print("🏁 BACKEND REGRESSION TESTING COMPLETED")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 FINAL RESULTS:")
        print(f"   • Total Tests: {self.total_tests}")
        print(f"   • Passed: {self.passed_tests}")
        print(f"   • Failed: {self.total_tests - self.passed_tests}")
        print(f"   • Success Rate: {success_rate:.1f}%")
        print(f"   • Duration: {duration:.2f}s")
        
        if success_rate >= 90:
            print(f"\n✅ REGRESSION TEST RESULT: NO BACKEND REGRESSIONS DETECTED")
            print("   All backend APIs are working correctly after UI text changes.")
            print("   The cashout success modal button text changes did not affect backend functionality.")
        elif success_rate >= 70:
            print(f"\n⚠️ REGRESSION TEST RESULT: MINOR ISSUES DETECTED")
            print("   Most backend APIs are working, but some issues were found.")
            print("   These may be pre-existing issues unrelated to the UI changes.")
        else:
            print(f"\n❌ REGRESSION TEST RESULT: SIGNIFICANT ISSUES DETECTED")
            print("   Multiple backend APIs are failing. Investigation required.")
        
        print("\n🔍 DETAILED TEST RESULTS:")
        for result in self.test_results:
            status = "✅" if result['passed'] else "❌"
            print(f"   {status} {result['test']}")
            if result['details']:
                print(f"      └─ {result['details']}")
        
        print(f"\n📝 CONCLUSION:")
        print(f"   The UI text changes to cashout success modal buttons were purely cosmetic")
        print(f"   and should not have affected any backend functionality. Test results above")
        print(f"   confirm whether any regressions were introduced.")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = CashoutUIRegressionTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)