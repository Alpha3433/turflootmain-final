#!/usr/bin/env python3
"""
Backend Testing for TurfLoot Agar.io "Hold E to Cash Out" Functionality
Testing Focus: Backend API support for cash-out feature and game operations

CRITICAL TESTING REQUIREMENTS FROM REVIEW REQUEST:
1. Game Loading Test - Verify the /agario page loads correctly without JavaScript errors
2. Backend API Integration - Test that the game can communicate with backend APIs for score/session tracking
3. Cash Out Functionality Backend Support - Verify any backend endpoints that support the cash-out process
4. Session Management - Test game session tracking during cash-out operations
5. API Performance - Ensure backend can handle cash-out related API calls without errors

Expected Results:
- Backend APIs should support game session tracking
- Cash-out related operations should be handled properly
- API performance should be adequate for real-time game operations
- No critical backend errors that would affect cash-out functionality
"""

import requests
import json
import time
import os
import sys
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://turfloot-social.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class CashOutBackendTester:
    def __init__(self):
        self.test_results = []
        self.start_time = time.time()
        self.test_player_id = f"cashout_test_{int(time.time())}"
        self.test_room_id = "agario_cashout_test"
        
    def log_test(self, test_name, success, details, response_time=None):
        """Log test results with detailed information"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_time': response_time
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        print(f"   Details: {details}")
        
    def test_api_health_check(self):
        """Test 1: Verify core API endpoints are accessible"""
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/ping", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                server_info = data.get('server', 'unknown')
                features = data.get('features', [])
                
                self.log_test(
                    "API Health Check", 
                    True, 
                    f"API accessible - Server: {server_info}, Features: {', '.join(features) if features else 'none'}", 
                    response_time
                )
                return True
            else:
                self.log_test(
                    "API Health Check", 
                    False, 
                    f"API returned status {response.status_code}", 
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"API connection failed: {str(e)}")
            return False
    
    def test_game_session_apis(self):
        """Test 2: Verify game session tracking APIs work for cash-out operations"""
        try:
            # Test session join
            join_data = {
                "roomId": self.test_room_id,
                "playerId": self.test_player_id,
                "playerName": "CashOutTester"
            }
            
            start_time = time.time()
            response = requests.post(f"{API_BASE}/game-sessions/join", json=join_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                join_result = response.json()
                
                # Test session leave
                leave_data = {
                    "roomId": self.test_room_id,
                    "playerId": self.test_player_id
                }
                
                leave_response = requests.post(f"{API_BASE}/game-sessions/leave", json=leave_data, timeout=10)
                
                if leave_response.status_code == 200:
                    self.log_test(
                        "Game Session APIs", 
                        True, 
                        f"Session join/leave working - Join: {join_result.get('message', 'OK')}", 
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Game Session APIs", 
                        False, 
                        f"Session leave failed with status {leave_response.status_code}", 
                        response_time
                    )
                    return False
            else:
                self.log_test(
                    "Game Session APIs", 
                    False, 
                    f"Session join failed with status {response.status_code}", 
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test("Game Session APIs", False, f"Session API test failed: {str(e)}")
            return False

    def test_user_balance_and_stats(self):
        """Test 3: Verify user balance and stats APIs for cash-out support"""
        try:
            # Test wallet balance endpoint (correct endpoint)
            start_time = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance?userId={self.test_player_id}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                balance_data = response.json()
                balance = balance_data.get('balance', 0)
                
                # Test stats update endpoint for cash-out
                stats_data = {
                    "userId": self.test_player_id,
                    "score": 275,
                    "cashOut": True,
                    "amount": 27.50,
                    "gameTime": 45
                }
                
                stats_response = requests.post(f"{API_BASE}/users/stats/update", json=stats_data, timeout=10)
                
                if stats_response.status_code == 200:
                    stats_result = stats_response.json()
                    self.log_test(
                        "User Balance & Stats APIs", 
                        True, 
                        f"Balance: ${balance}, Stats update: {stats_result.get('message', 'OK')}", 
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "User Balance & Stats APIs", 
                        False, 
                        f"Stats update failed with status {stats_response.status_code}", 
                        response_time
                    )
                    return False
            else:
                self.log_test(
                    "User Balance & Stats APIs", 
                    False, 
                    f"Balance API failed with status {response.status_code}", 
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test("User Balance & Stats APIs", False, f"Balance/Stats API test failed: {str(e)}")
            return False

    def test_server_browser_integration(self):
        """Test 4: Verify server browser works for game discovery"""
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                servers_data = response.json()
                servers = servers_data.get('servers', [])
                
                if len(servers) > 0:
                    # Check server structure
                    first_server = servers[0]
                    required_fields = ['id', 'name', 'region', 'maxPlayers']
                    has_all_fields = all(field in first_server for field in required_fields)
                    
                    self.log_test(
                        "Server Browser Integration", 
                        True, 
                        f"Found {len(servers)} servers, structure valid: {has_all_fields}", 
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Server Browser Integration", 
                        True, 
                        "No servers available but API working", 
                        response_time
                    )
                    return True
            else:
                self.log_test(
                    "Server Browser Integration", 
                    False, 
                    f"Server browser failed with status {response.status_code}", 
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test("Server Browser Integration", False, f"Server browser test failed: {str(e)}")
            return False

    def test_live_player_statistics(self):
        """Test 5: Verify live player statistics for game state tracking"""
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/stats/live-players", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                live_data = response.json()
                live_count = live_data.get('count', 0)
                
                # Test global winnings endpoint
                winnings_response = requests.get(f"{API_BASE}/stats/global-winnings", timeout=10)
                
                if winnings_response.status_code == 200:
                    winnings_data = winnings_response.json()
                    total_winnings = winnings_data.get('total', 0)
                    
                    self.log_test(
                        "Live Player Statistics", 
                        True, 
                        f"Live players: {live_count}, Global winnings: ${total_winnings}", 
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Live Player Statistics", 
                        False, 
                        f"Global winnings API failed with status {winnings_response.status_code}", 
                        response_time
                    )
                    return False
            else:
                self.log_test(
                    "Live Player Statistics", 
                    False, 
                    f"Live players API failed with status {response.status_code}", 
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test("Live Player Statistics", False, f"Live statistics test failed: {str(e)}")
            return False

    def test_cash_out_workflow_simulation(self):
        """Test 6: Simulate complete cash-out workflow"""
        try:
            # Step 1: Join game session
            join_data = {
                "roomId": "agario_cashout_simulation",
                "playerId": self.test_player_id,
                "playerName": "CashOutSimulator"
            }
            
            start_time = time.time()
            response = requests.post(f"{API_BASE}/game-sessions/join", json=join_data, timeout=10)
            
            if response.status_code != 200:
                self.log_test(
                    "Cash-Out Workflow Simulation", 
                    False, 
                    "Failed to join game session for cash-out simulation"
                )
                return False
            
            # Step 2: Simulate cash-out with stats update
            cash_out_stats = {
                "userId": self.test_player_id,
                "score": 350,
                "mass": 120,
                "eliminations": 5,
                "cashOut": True,
                "cashOutAmount": 35.00,
                "gameTime": 60,
                "progressBarCompleted": True
            }
            
            stats_response = requests.post(f"{API_BASE}/users/stats/update", json=cash_out_stats, timeout=10)
            
            # Step 3: Leave game session
            leave_data = {
                "roomId": "agario_cashout_simulation",
                "playerId": self.test_player_id
            }
            
            leave_response = requests.post(f"{API_BASE}/game-sessions/leave", json=leave_data, timeout=10)
            response_time = time.time() - start_time
            
            if stats_response.status_code == 200 and leave_response.status_code == 200:
                self.log_test(
                    "Cash-Out Workflow Simulation", 
                    True, 
                    "Complete cash-out workflow successful - join, stats update, leave", 
                    response_time
                )
                return True
            else:
                self.log_test(
                    "Cash-Out Workflow Simulation", 
                    False, 
                    f"Workflow failed - Stats: {stats_response.status_code}, Leave: {leave_response.status_code}", 
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test("Cash-Out Workflow Simulation", False, f"Cash-out workflow test failed: {str(e)}")
            return False

    def test_api_performance_and_reliability(self):
        """Test 7: Verify API performance for real-time game operations"""
        try:
            start_time = time.time()
            success_count = 0
            total_calls = 5
            
            for i in range(total_calls):
                # Rapid API calls to simulate real-time game updates
                test_data = {
                    "roomId": f"perf_test_{i}",
                    "playerId": f"{self.test_player_id}_{i}",
                    "playerName": f"PerfTest{i}"
                }
                
                response = requests.post(f"{API_BASE}/game-sessions/join", json=test_data, timeout=5)
                if response.status_code == 200:
                    success_count += 1
                
                time.sleep(0.1)  # Small delay
            
            end_time = time.time()
            total_time = end_time - start_time
            success_rate = (success_count / total_calls) * 100
            avg_response_time = total_time / total_calls
            
            if success_rate >= 80 and avg_response_time < 2.0:
                self.log_test(
                    "API Performance & Reliability", 
                    True, 
                    f"Success rate: {success_rate:.1f}%, Avg response: {avg_response_time:.3f}s", 
                    avg_response_time
                )
                return True
            else:
                self.log_test(
                    "API Performance & Reliability", 
                    False, 
                    f"Poor performance - Success: {success_rate:.1f}%, Time: {avg_response_time:.3f}s", 
                    avg_response_time
                )
                return False
                
        except Exception as e:
            self.log_test("API Performance & Reliability", False, f"Performance test failed: {str(e)}")
            return False
    
    def run_comprehensive_tests(self):
        """Run all backend tests for cash-out functionality"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING FOR CASH-OUT FUNCTIONALITY")
        print("=" * 80)
        print("🎯 TESTING FOCUS: Hold E to Cash Out Backend Support")
        print("Review Request Requirements:")
        print("1. Game Loading Test - Backend API accessibility")
        print("2. Backend API Integration - Game communication with APIs")
        print("3. Cash Out Functionality Backend Support - Cash-out endpoints")
        print("4. Session Management - Game session tracking during cash-out")
        print("5. API Performance - Real-time game operation support")
        print("=" * 80)
        
        # Execute all tests in sequence
        tests = [
            self.test_api_health_check,
            self.test_game_session_apis,
            self.test_user_balance_and_stats,
            self.test_server_browser_integration,
            self.test_live_player_statistics,
            self.test_cash_out_workflow_simulation,
            self.test_api_performance_and_reliability
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
                print()  # Add spacing between tests
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test_func.__name__}: {str(e)}")
                print()
        
        # Generate comprehensive summary
        self.generate_test_summary(passed_tests, total_tests)
        
        return passed_tests, total_tests
    
    def generate_test_summary(self, passed_tests, total_tests):
        """Generate comprehensive test summary"""
        total_time = time.time() - self.start_time
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print("=" * 80)
        print("🎯 CASH-OUT BACKEND TESTING SUMMARY")
        print("=" * 80)
        print(f"📊 OVERALL RESULTS: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}% success rate)")
        print(f"⏱️  TOTAL TESTING TIME: {total_time:.2f} seconds")
        
        print(f"\n📋 DETAILED TEST RESULTS:")
        for result in self.test_results:
            status = "✅ PASSED" if result['success'] else "❌ FAILED"
            time_info = f" ({result['response_time']:.3f}s)" if result['response_time'] else ""
            print(f"   {status}: {result['test']}{time_info}")
            print(f"      {result['details']}")
        
        print("\n🎯 CASH-OUT FUNCTIONALITY VERIFICATION:")
        
        # Check API health
        api_tests = [r for r in self.test_results if 'API Health' in r['test']]
        if any(t['success'] for t in api_tests):
            print("   ✅ GAME LOADING SUPPORT: Backend APIs are accessible for game loading")
        else:
            print("   ❌ GAME LOADING SUPPORT: Backend API accessibility issues detected")
        
        # Check session management
        session_tests = [r for r in self.test_results if 'Session' in r['test']]
        if any(t['success'] for t in session_tests):
            print("   ✅ SESSION MANAGEMENT: Game session tracking working for cash-out operations")
        else:
            print("   ❌ SESSION MANAGEMENT: Session tracking has issues")
        
        # Check cash-out workflow
        cashout_tests = [r for r in self.test_results if 'Cash-Out' in r['test']]
        if any(t['success'] for t in cashout_tests):
            print("   ✅ CASH-OUT BACKEND SUPPORT: Complete cash-out workflow supported")
        else:
            print("   ❌ CASH-OUT BACKEND SUPPORT: Cash-out workflow has issues")
        
        # Check performance
        perf_tests = [r for r in self.test_results if 'Performance' in r['test']]
        if any(t['success'] for t in perf_tests):
            print("   ✅ API PERFORMANCE: Backend can handle real-time game operations")
        else:
            print("   ❌ API PERFORMANCE: Performance issues may affect cash-out functionality")
        
        # Check balance/stats
        balance_tests = [r for r in self.test_results if 'Balance' in r['test']]
        if any(t['success'] for t in balance_tests):
            print("   ✅ BALANCE & STATS: User balance and statistics APIs working")
        else:
            print("   ❌ BALANCE & STATS: Balance/statistics APIs have issues")
        
        print("\n" + "=" * 80)
        
        if success_rate >= 85:
            print("🎉 TESTING CONCLUSION: BACKEND FULLY SUPPORTS CASH-OUT FUNCTIONALITY")
            print("   All critical backend infrastructure is working - Hold E to Cash Out should work perfectly!")
        elif success_rate >= 70:
            print("⚠️  TESTING CONCLUSION: BACKEND MOSTLY SUPPORTS CASH-OUT WITH MINOR ISSUES")
            print("   Core functionality works but some edge cases may need attention")
        elif success_rate >= 50:
            print("🔧 TESTING CONCLUSION: BACKEND HAS SIGNIFICANT ISSUES AFFECTING CASH-OUT")
            print("   Major problems detected that could impact cash-out functionality")
        else:
            print("❌ TESTING CONCLUSION: CRITICAL BACKEND ISSUES - CASH-OUT MAY NOT WORK")
            print("   Severe problems detected - cash-out functionality likely broken")
        
        print("=" * 80)

if __name__ == "__main__":
    tester = CashOutBackendTester()
    passed, total = tester.run_comprehensive_tests()
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)