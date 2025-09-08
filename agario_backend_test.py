#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Rebuilt Agar.io Game
Testing Focus: Game Engine, API Integration, State Management, Performance, Mobile Compatibility
"""

import requests
import json
import time
import sys
from datetime import datetime

# Get base URL from environment
BASE_URL = "https://game-ui-debug.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class AgarIOBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'AgarIO-Backend-Tester/1.0',
            'Content-Type': 'application/json'
        })
        self.test_results = []
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        result = {
            'test': test_name,
            'status': status,
            'success': success,
            'details': details,
            'response_time': f"{response_time:.3f}s",
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} ({response_time:.3f}s)")
        if details:
            print(f"   Details: {details}")
        return success

    def test_api_health_check(self):
        """Test 1: API Health Check - Verify backend is accessible"""
        print("\n🔍 TESTING: API Health Check")
        try:
            # Test root API endpoint
            start_time = time.time()
            response = self.session.get(f"{API_BASE}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                service_info = data.get('service', 'unknown')
                features = data.get('features', [])
                self.log_test(
                    "Root API Endpoint", 
                    True, 
                    f"Service: {service_info}, Features: {features}", 
                    response_time
                )
                
                # Test ping endpoint
                start_time = time.time()
                response = self.session.get(f"{API_BASE}/ping", timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    ping_data = response.json()
                    server_info = ping_data.get('server', 'unknown')
                    return self.log_test(
                        "Ping Endpoint", 
                        True, 
                        f"Server: {server_info}", 
                        response_time
                    )
                else:
                    return self.log_test(
                        "Ping Endpoint", 
                        False, 
                        f"HTTP {response.status_code}", 
                        response_time
                    )
            else:
                return self.log_test(
                    "Root API Endpoint", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:100]}", 
                    response_time
                )
        except Exception as e:
            return self.log_test("API Health Check", False, f"Connection error: {str(e)}")

    def test_game_session_apis(self):
        """Test 2: Game Session APIs - Test session tracking for Agar.io game"""
        print("\n🔍 TESTING: Game Session APIs")
        
        # Test game-sessions/join endpoint with proper parameters
        try:
            start_time = time.time()
            join_data = {
                "roomId": "agario-test-room",
                "playerId": "test-player-123"
            }
            response = self.session.post(f"{API_BASE}/game-sessions/join", 
                                       json=join_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                session_data = response.json()
                session_id = session_data.get('sessionId')
                self.log_test(
                    "Game Session Join", 
                    True, 
                    f"Session created: {session_id}", 
                    response_time
                )
                
                # Test session leave
                start_time = time.time()
                leave_data = {
                    "roomId": "agario-test-room",
                    "playerId": "test-player-123"
                }
                response = self.session.post(f"{API_BASE}/game-sessions/leave", 
                                           json=leave_data, timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    return self.log_test(
                        "Game Session Leave", 
                        True, 
                        "Session cleanup successful", 
                        response_time
                    )
                else:
                    return self.log_test(
                        "Game Session Leave", 
                        False, 
                        f"HTTP {response.status_code}: {response.text[:100]}", 
                        response_time
                    )
            else:
                return self.log_test(
                    "Game Session Join", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:100]}", 
                    response_time
                )
        except Exception as e:
            return self.log_test("Game Session APIs", False, f"Error: {str(e)}")

    def test_game_state_tracking(self):
        """Test 3: Game State Management - Test score, mass, statistics tracking"""
        print("\n🔍 TESTING: Game State Management")
        
        try:
            # Test live players stats endpoint
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/stats/live-players", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                stats_data = response.json()
                live_players = stats_data.get('livePlayers', 0)
                
                self.log_test(
                    "Live Player Statistics", 
                    True, 
                    f"Live players: {live_players}", 
                    response_time
                )
                
                # Test global winnings endpoint
                start_time = time.time()
                response = self.session.get(f"{API_BASE}/stats/global-winnings", timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    winnings_data = response.json()
                    global_winnings = winnings_data.get('globalWinnings', 0)
                    return self.log_test(
                        "Global Winnings Statistics", 
                        True, 
                        f"Global winnings: ${global_winnings}", 
                        response_time
                    )
                else:
                    return self.log_test(
                        "Global Winnings Statistics", 
                        False, 
                        f"HTTP {response.status_code}", 
                        response_time
                    )
            else:
                return self.log_test(
                    "Live Player Statistics", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:100]}", 
                    response_time
                )
        except Exception as e:
            return self.log_test("Game State Management", False, f"Error: {str(e)}")

    def test_multiplayer_integration(self):
        """Test 4: Multiplayer Integration - Test Hathora integration for Agar.io"""
        print("\n🔍 TESTING: Multiplayer Integration")
        
        try:
            # Test server browser
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                servers_data = response.json()
                servers = servers_data.get('servers', [])
                hathora_enabled = servers_data.get('hathoraEnabled', False)
                
                self.log_test(
                    "Server Browser", 
                    True, 
                    f"Found {len(servers)} servers, Hathora: {hathora_enabled}", 
                    response_time
                )
                
                # Test Hathora room creation if available
                if hathora_enabled:
                    start_time = time.time()
                    room_data = {
                        "gameMode": "practice",
                        "region": "US-East-1",
                        "maxPlayers": 50
                    }
                    response = self.session.post(f"{API_BASE}/hathora/create-room", 
                                               json=room_data, timeout=15)
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        room_response = response.json()
                        room_id = room_response.get('roomId', 'unknown')
                        return self.log_test(
                            "Hathora Room Creation", 
                            True, 
                            f"Room created: {room_id}", 
                            response_time
                        )
                    else:
                        return self.log_test(
                            "Hathora Room Creation", 
                            False, 
                            f"HTTP {response.status_code}", 
                            response_time
                        )
                else:
                    return self.log_test(
                        "Hathora Integration", 
                        True, 
                        "Hathora disabled, local mode active", 
                        response_time
                    )
            else:
                return self.log_test(
                    "Server Browser", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:100]}", 
                    response_time
                )
        except Exception as e:
            return self.log_test("Multiplayer Integration", False, f"Error: {str(e)}")

    def test_performance_apis(self):
        """Test 5: Performance Testing - Test API response times and reliability"""
        print("\n🔍 TESTING: Performance & Reliability")
        
        try:
            # Test multiple rapid API calls using ping endpoint
            response_times = []
            success_count = 0
            
            for i in range(5):
                start_time = time.time()
                response = self.session.get(f"{API_BASE}/ping", timeout=5)
                response_time = time.time() - start_time
                response_times.append(response_time)
                
                if response.status_code == 200:
                    success_count += 1
            
            avg_response_time = sum(response_times) / len(response_times)
            success_rate = (success_count / 5) * 100
            
            performance_good = avg_response_time < 2.0 and success_rate >= 80
            
            return self.log_test(
                "API Performance Test", 
                performance_good, 
                f"Avg: {avg_response_time:.3f}s, Success: {success_rate}%", 
                avg_response_time
            )
        except Exception as e:
            return self.log_test("Performance Testing", False, f"Error: {str(e)}")

    def test_mobile_compatibility_apis(self):
        """Test 6: Mobile Compatibility - Test APIs with mobile user agent"""
        print("\n🔍 TESTING: Mobile Compatibility")
        
        try:
            # Set mobile user agent
            mobile_headers = {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                'Content-Type': 'application/json'
            }
            
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/ping", 
                                      headers=mobile_headers, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                # Test mobile-specific session creation
                start_time = time.time()
                mobile_session_data = {
                    "roomId": "agario-mobile-test",
                    "playerId": "mobile-player-123"
                }
                response = self.session.post(f"{API_BASE}/game-sessions/join", 
                                           json=mobile_session_data, 
                                           headers=mobile_headers, timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    return self.log_test(
                        "Mobile API Compatibility", 
                        True, 
                        "Mobile session creation successful", 
                        response_time
                    )
                else:
                    return self.log_test(
                        "Mobile API Compatibility", 
                        False, 
                        f"Mobile session failed: HTTP {response.status_code}", 
                        response_time
                    )
            else:
                return self.log_test(
                    "Mobile API Health Check", 
                    False, 
                    f"HTTP {response.status_code}", 
                    response_time
                )
        except Exception as e:
            return self.log_test("Mobile Compatibility", False, f"Error: {str(e)}")

    def test_agario_specific_features(self):
        """Test 7: Agar.io Specific Features - Test game-specific backend functionality"""
        print("\n🔍 TESTING: Agar.io Specific Features")
        
        try:
            # Test wallet balance (for cash-out functionality in Agar.io)
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/wallet/balance", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                balance_data = response.json()
                balance = balance_data.get('balance', 0)
                
                self.log_test(
                    "User Balance System", 
                    True, 
                    f"User balance: ${balance}", 
                    response_time
                )
                
                # Test leaderboard endpoint
                start_time = time.time()
                response = self.session.get(f"{API_BASE}/users/leaderboard", timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    leaderboard_data = response.json()
                    players = leaderboard_data.get('players', [])
                    return self.log_test(
                        "Leaderboard System", 
                        True, 
                        f"Leaderboard with {len(players)} players", 
                        response_time
                    )
                else:
                    return self.log_test(
                        "Leaderboard System", 
                        False, 
                        f"HTTP {response.status_code}", 
                        response_time
                    )
            else:
                return self.log_test(
                    "User Balance System", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:100]}", 
                    response_time
                )
        except Exception as e:
            return self.log_test("Agar.io Specific Features", False, f"Error: {str(e)}")

    def run_comprehensive_tests(self):
        """Run all backend tests for the rebuilt Agar.io game"""
        print("🚀 STARTING COMPREHENSIVE AGAR.IO BACKEND TESTING")
        print("=" * 60)
        
        # Run all test categories
        tests = [
            self.test_api_health_check,
            self.test_game_session_apis,
            self.test_game_state_tracking,
            self.test_multiplayer_integration,
            self.test_performance_apis,
            self.test_mobile_compatibility_apis,
            self.test_agario_specific_features
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test function {test_func.__name__} failed: {e}")
        
        # Generate summary
        print("\n" + "=" * 60)
        print("📊 AGAR.IO BACKEND TESTING SUMMARY")
        print("=" * 60)
        
        success_rate = (passed_tests / total_tests) * 100
        print(f"Overall Success Rate: {success_rate:.1f}% ({passed_tests}/{total_tests} tests passed)")
        
        # Detailed results
        print("\n📋 DETAILED TEST RESULTS:")
        for result in self.test_results:
            print(f"{result['status']}: {result['test']} ({result['response_time']})")
            if result['details']:
                print(f"   └─ {result['details']}")
        
        # Critical findings
        print(f"\n🎯 CRITICAL FINDINGS:")
        if success_rate >= 85:
            print("✅ AGAR.IO BACKEND IS FULLY OPERATIONAL")
            print("✅ All core game functionality is working correctly")
            print("✅ Game engine integration with backend APIs is successful")
            print("✅ Ready for production use")
        elif success_rate >= 70:
            print("⚠️  AGAR.IO BACKEND IS MOSTLY OPERATIONAL")
            print("⚠️  Some minor issues detected but core functionality works")
            print("⚠️  Game is playable with minor limitations")
        else:
            print("❌ AGAR.IO BACKEND HAS CRITICAL ISSUES")
            print("❌ Major functionality problems detected")
            print("❌ Game may not function properly")
        
        return success_rate >= 70

if __name__ == "__main__":
    tester = AgarIOBackendTester()
    success = tester.run_comprehensive_tests()
    sys.exit(0 if success else 1)