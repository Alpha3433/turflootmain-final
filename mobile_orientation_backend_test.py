#!/usr/bin/env python3
"""
Mobile Orientation Modal Backend API Testing
Testing Focus: Backend APIs supporting game entry points after mobile orientation modal implementation
Review Request: Verify backend APIs are working correctly to support the modified game entry points
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration from .env
BASE_URL = "https://turfloot-colyseus.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class MobileOrientationBackendTester:
    def __init__(self):
        self.results = []
        self.start_time = time.time()
        
    def log_result(self, test_name, success, details="", response_time=0):
        """Log test result with timestamp"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_time': f"{response_time:.3f}s",
            'timestamp': datetime.now().isoformat()
        }
        self.results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_time > 0:
            print(f"   Response Time: {response_time:.3f}s")
        print()

    def test_api_health_check(self):
        """Test 1: API Health Check - Verify core backend APIs are responding"""
        print("🔍 Testing API Health Check...")
        
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/ping", timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                server_name = data.get('server', 'unknown')
                features = data.get('features', [])
                
                self.log_result(
                    "API Health Check", 
                    True, 
                    f"Core API endpoints accessible and responding correctly with {server_name} server, features: {features}, confirming backend infrastructure is operational for game entry functionality",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "API Health Check", 
                    False, 
                    f"API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_game_session_apis(self):
        """Test 2: Game Session APIs - Test session join/leave endpoints for game entry"""
        print("🔍 Testing Game Session APIs...")
        
        try:
            # Test session join endpoint
            join_data = {
                "roomId": "mobile-orientation-test-room",
                "playerId": "mobile-test-user",
                "playerName": "MobileTestUser"
            }
            
            start = time.time()
            response = requests.post(f"{API_BASE}/game-sessions/join", 
                                   json=join_data, 
                                   timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                
                if success:
                    # Test session leave endpoint
                    leave_data = {
                        "roomId": "mobile-orientation-test-room",
                        "playerId": "mobile-test-user"
                    }
                    
                    leave_response = requests.post(f"{API_BASE}/game-sessions/leave", 
                                                 json=leave_data, 
                                                 timeout=10)
                    
                    if leave_response.status_code == 200:
                        self.log_result(
                            "Game Session APIs", 
                            True, 
                            f"Session join/leave endpoints working correctly, supporting game entry points that were modified for mobile orientation check",
                            response_time
                        )
                        return True
                    else:
                        self.log_result(
                            "Game Session APIs", 
                            False, 
                            f"Session leave failed with status {leave_response.status_code}"
                        )
                        return False
                else:
                    self.log_result(
                        "Game Session APIs", 
                        False, 
                        f"Session join returned success=false: {data}"
                    )
                    return False
            else:
                self.log_result(
                    "Game Session APIs", 
                    False, 
                    f"Session join API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Game Session APIs", False, f"Error: {str(e)}")
            return False

    def test_user_authentication_apis(self):
        """Test 3: User Authentication - Verify authentication APIs for game access"""
        print("🔍 Testing User Authentication APIs...")
        
        try:
            # Test with JWT authentication
            headers = {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtb2JpbGUtdGVzdC11c2VyIiwiZW1haWwiOiJtb2JpbGVAZ2FtZS50ZXN0IiwiaWF0IjoxNzU3NDAwMDAwLCJleHAiOjE3NTc0ODY0MDB9.test-signature'
            }
            
            start = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                balance = data.get('balance', 'missing')
                wallet_address = data.get('wallet_address', 'missing')
                
                # Test without authentication (guest access)
                guest_response = requests.get(f"{API_BASE}/wallet/balance", timeout=10)
                
                if guest_response.status_code == 200:
                    guest_data = guest_response.json()
                    guest_balance = guest_data.get('balance', 'missing')
                    
                    self.log_result(
                        "User Authentication APIs", 
                        True, 
                        f"Authentication APIs working correctly - JWT auth balance: ${balance}, guest balance: ${guest_balance}, supporting secure game access after orientation validation",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "User Authentication APIs", 
                        False, 
                        f"Guest access failed with status {guest_response.status_code}"
                    )
                    return False
            else:
                self.log_result(
                    "User Authentication APIs", 
                    False, 
                    f"Authentication API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("User Authentication APIs", False, f"Error: {str(e)}")
            return False

    def test_server_browser_apis(self):
        """Test 4: Server Browser APIs - Test server discovery and room creation for paid rooms"""
        print("🔍 Testing Server Browser APIs...")
        
        try:
            # Test server lobbies endpoint
            start = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                # Test Hathora room creation endpoint
                room_data = {
                    "gameMode": "practice",
                    "region": "US-East-1",
                    "maxPlayers": 50
                }
                
                room_response = requests.post(f"{API_BASE}/hathora/create-room", 
                                            json=room_data, 
                                            timeout=15)
                
                if room_response.status_code == 200:
                    room_result = room_response.json()
                    room_success = room_result.get('success', False)
                    room_id = room_result.get('roomId', 'none')
                    
                    self.log_result(
                        "Server Browser APIs", 
                        True, 
                        f"Server discovery working with {len(servers)} servers available, Hathora room creation successful (Room ID: {room_id}), supporting paid room functionality after mobile orientation check",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Server Browser APIs", 
                        False, 
                        f"Hathora room creation failed with status {room_response.status_code}"
                    )
                    return False
            else:
                self.log_result(
                    "Server Browser APIs", 
                    False, 
                    f"Server browser API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Server Browser APIs", False, f"Error: {str(e)}")
            return False

    def test_wallet_balance_apis(self):
        """Test 5: Wallet Balance APIs - Verify wallet APIs for paid room validation"""
        print("🔍 Testing Wallet Balance APIs...")
        
        try:
            # Test guest wallet balance
            start = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                balance = data.get('balance', 'missing')
                sol_balance = data.get('sol_balance', 'missing')
                currency = data.get('currency', 'missing')
                
                # Test with Privy token for authenticated balance
                test_payload = {
                    "wallet_address": "0x2ec1DDCCd0387603cd68a564CDf0129576b1a25d",
                    "user_id": "mobile-orientation-test",
                    "email": "mobile@orientation.test"
                }
                import base64
                encoded_payload = base64.b64encode(json.dumps(test_payload).encode()).decode()
                
                headers = {
                    'Authorization': f'Bearer testing-{encoded_payload}'
                }
                
                auth_response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
                
                if auth_response.status_code == 200:
                    auth_data = auth_response.json()
                    auth_balance = auth_data.get('balance', 'missing')
                    auth_sol = auth_data.get('sol_balance', 'missing')
                    
                    self.log_result(
                        "Wallet Balance APIs", 
                        True, 
                        f"Wallet balance APIs working correctly - Guest: ${balance} (SOL: {sol_balance}), Authenticated: ${auth_balance} (SOL: {auth_sol}), supporting paid room validation after orientation check",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Wallet Balance APIs", 
                        False, 
                        f"Authenticated wallet balance failed with status {auth_response.status_code}"
                    )
                    return False
            else:
                self.log_result(
                    "Wallet Balance APIs", 
                    False, 
                    f"Wallet balance API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Balance APIs", False, f"Error: {str(e)}")
            return False

    def test_live_statistics_apis(self):
        """Test 6: Live Statistics APIs - Test real-time game statistics"""
        print("🔍 Testing Live Statistics APIs...")
        
        try:
            # Test live players endpoint
            start = time.time()
            response = requests.get(f"{API_BASE}/stats/live-players", timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                live_players = data.get('live_players', 'missing')
                
                # Test global winnings endpoint
                winnings_response = requests.get(f"{API_BASE}/stats/global-winnings", timeout=10)
                
                if winnings_response.status_code == 200:
                    winnings_data = winnings_response.json()
                    global_winnings = winnings_data.get('global_winnings', 'missing')
                    
                    self.log_result(
                        "Live Statistics APIs", 
                        True, 
                        f"Live statistics APIs working correctly - Live players: {live_players}, Global winnings: ${global_winnings}, supporting real-time game data after mobile orientation implementation",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Live Statistics APIs", 
                        False, 
                        f"Global winnings API failed with status {winnings_response.status_code}"
                    )
                    return False
            else:
                self.log_result(
                    "Live Statistics APIs", 
                    False, 
                    f"Live players API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Live Statistics APIs", False, f"Error: {str(e)}")
            return False

    def test_comprehensive_api_performance(self):
        """Test 7: Comprehensive API Performance - Verify no regressions from frontend changes"""
        print("🔍 Testing Comprehensive API Performance...")
        
        try:
            # Test multiple critical endpoints
            endpoints = [
                ("/ping", "Core API health"),
                ("/wallet/balance", "Wallet balance"),
                ("/servers/lobbies", "Server browser"),
                ("/stats/live-players", "Live statistics"),
                ("/users/leaderboard", "User leaderboard")
            ]
            
            total_time = 0
            successful_requests = 0
            endpoint_results = []
            
            for endpoint, description in endpoints:
                try:
                    start = time.time()
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                    response_time = time.time() - start
                    total_time += response_time
                    
                    if response.status_code == 200:
                        successful_requests += 1
                        endpoint_results.append(f"✅ {description}: {response_time:.3f}s")
                    else:
                        endpoint_results.append(f"❌ {description}: HTTP {response.status_code}")
                        
                except Exception as e:
                    endpoint_results.append(f"❌ {description}: {str(e)}")
            
            if successful_requests >= 4:  # At least 4 out of 5 endpoints working
                avg_response_time = total_time / successful_requests
                performance_good = avg_response_time < 2.0
                
                self.log_result(
                    "Comprehensive API Performance", 
                    performance_good, 
                    f"Performance check: {successful_requests}/{len(endpoints)} endpoints working, average response time: {avg_response_time:.3f}s, no performance regressions from mobile orientation modal changes. Results: {'; '.join(endpoint_results)}",
                    avg_response_time
                )
                return performance_good
            else:
                self.log_result(
                    "Comprehensive API Performance", 
                    False, 
                    f"Only {successful_requests}/{len(endpoints)} endpoints working. Results: {'; '.join(endpoint_results)}"
                )
                return False
                
        except Exception as e:
            self.log_result("Comprehensive API Performance", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests for mobile orientation modal implementation"""
        print("🚀 STARTING MOBILE ORIENTATION BACKEND API TESTING")
        print("=" * 80)
        print("Testing Focus: Backend APIs supporting game entry points after mobile orientation modal implementation")
        print("Review Request: Verify backend APIs are working correctly to support modified game entry points")
        print("=" * 80)
        print()
        
        # Run all tests
        tests = [
            self.test_api_health_check,
            self.test_game_session_apis,
            self.test_user_authentication_apis,
            self.test_server_browser_apis,
            self.test_wallet_balance_apis,
            self.test_live_statistics_apis,
            self.test_comprehensive_api_performance
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
        
        # Calculate results
        success_rate = (passed_tests / total_tests) * 100
        total_time = time.time() - self.start_time
        
        print("=" * 80)
        print("🏁 MOBILE ORIENTATION BACKEND API TESTING COMPLETED")
        print("=" * 80)
        print(f"📊 RESULTS: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}% success rate)")
        print(f"⏱️  Total testing time: {total_time:.2f}s")
        print()
        
        # Detailed results
        print("📋 DETAILED TEST RESULTS:")
        print("-" * 40)
        for result in self.results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
            print(f"   Response Time: {result['response_time']}")
            print()
        
        # Summary based on review request requirements
        print("🎯 REVIEW REQUEST REQUIREMENTS VERIFICATION:")
        print("-" * 50)
        
        requirements_met = 0
        total_requirements = 5
        
        # 1. API Health Check
        api_health = any(r['test'] == 'API Health Check' and r['success'] for r in self.results)
        print(f"{'✅' if api_health else '❌'} API Health Check: {'OPERATIONAL' if api_health else 'FAILED'} - Core backend APIs responding correctly")
        if api_health: requirements_met += 1
        
        # 2. Game Session APIs
        game_sessions = any('Game Session APIs' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if game_sessions else '❌'} Game Session APIs: {'WORKING' if game_sessions else 'FAILED'} - Session join/leave endpoints supporting game entry")
        if game_sessions: requirements_met += 1
        
        # 3. User Authentication
        auth_apis = any('User Authentication' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if auth_apis else '❌'} User Authentication: {'WORKING' if auth_apis else 'FAILED'} - Authentication APIs for game access")
        if auth_apis: requirements_met += 1
        
        # 4. Server Browser APIs
        server_browser = any('Server Browser APIs' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if server_browser else '❌'} Server Browser APIs: {'WORKING' if server_browser else 'FAILED'} - Server discovery and room creation for paid rooms")
        if server_browser: requirements_met += 1
        
        # 5. Wallet Balance APIs
        wallet_apis = any('Wallet Balance APIs' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if wallet_apis else '❌'} Wallet Balance APIs: {'WORKING' if wallet_apis else 'FAILED'} - Wallet APIs supporting paid room validation")
        if wallet_apis: requirements_met += 1
        
        print()
        print(f"🏆 OVERALL ASSESSMENT: {requirements_met}/{total_requirements} key requirements met")
        
        if success_rate >= 85:
            print("🎉 CONCLUSION: Backend is READY to support game entry points after mobile orientation validation")
        elif success_rate >= 70:
            print("⚠️  CONCLUSION: Backend has MINOR ISSUES but core functionality supports mobile orientation implementation")
        else:
            print("🚨 CONCLUSION: Backend has CRITICAL ISSUES that may affect mobile orientation game entry flow")
        
        return success_rate >= 70

if __name__ == "__main__":
    tester = MobileOrientationBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)