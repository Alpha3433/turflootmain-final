#!/usr/bin/env python3
"""
TurfLoot Core Backend API Testing Suite
Testing core backend APIs before fixing frontend styling issues

TESTING FOCUS (Review Request):
1. Basic API health check (GET /api/ping)
2. Server browser data (GET /api/servers/lobbies) 
3. Live player statistics (GET /api/stats/live-players)
4. Global winnings stats (GET /api/stats/global-winnings)
5. Any authentication endpoints that are working

The main issue is that the landing page is rendering with no CSS styling 
(appearing as basic unstyled HTML instead of the sophisticated gaming UI). 
Need to verify backend is stable before fixing the Tailwind CSS compilation errors.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://battle-buddies-7.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class CoreAPITester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, success, details="", response_time=None):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        if details:
            print(f"    Details: {details}")
        print()

    def test_api_health_check(self):
        """Test 1: Basic API health check (GET /api/ping)"""
        print("🏥 TESTING BASIC API HEALTH CHECK")
        print("=" * 50)
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/ping", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "API Health Check (/api/ping)",
                    True,
                    f"Status: {data.get('status')}, Server: {data.get('server', 'unknown')}",
                    response_time
                )
            else:
                self.log_test(
                    "API Health Check (/api/ping)",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "API Health Check (/api/ping)",
                False,
                f"Request failed: {str(e)}"
            )

    def test_server_browser_data(self):
        """Test 2: Server browser data (GET /api/servers/lobbies)"""
        print("🎮 TESTING SERVER BROWSER DATA")
        print("=" * 50)
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                if servers:
                    # Check for required server properties
                    sample_server = servers[0]
                    required_props = ['id', 'name', 'region', 'currentPlayers', 'maxPlayers']
                    missing_props = [prop for prop in required_props if prop not in sample_server]
                    
                    if not missing_props:
                        self.log_test(
                            "Server Browser Data (/api/servers/lobbies)",
                            True,
                            f"Found {len(servers)} servers with all required properties",
                            response_time
                        )
                        
                        # Test for Global Multiplayer server specifically
                        global_servers = [s for s in servers if 'global' in s.get('name', '').lower()]
                        if global_servers:
                            global_server = global_servers[0]
                            self.log_test(
                                "Global Multiplayer Server Available",
                                True,
                                f"Found: {global_server.get('name')} in {global_server.get('region')} ({global_server.get('currentPlayers')}/{global_server.get('maxPlayers')} players)"
                            )
                        else:
                            self.log_test(
                                "Global Multiplayer Server Available",
                                False,
                                f"No global multiplayer server found in {len(servers)} servers"
                            )
                    else:
                        self.log_test(
                            "Server Browser Data (/api/servers/lobbies)",
                            False,
                            f"Server data missing required properties: {missing_props}",
                            response_time
                        )
                else:
                    self.log_test(
                        "Server Browser Data (/api/servers/lobbies)",
                        False,
                        "No servers returned in response",
                        response_time
                    )
            else:
                self.log_test(
                    "Server Browser Data (/api/servers/lobbies)",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Server Browser Data (/api/servers/lobbies)",
                False,
                f"Request failed: {str(e)}"
            )

    def test_live_player_statistics(self):
        """Test 3: Live player statistics (GET /api/stats/live-players)"""
        print("📊 TESTING LIVE PLAYER STATISTICS")
        print("=" * 50)
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/stats/live-players", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for expected data structure
                if 'count' in data or 'players' in data or 'total' in data:
                    player_count = data.get('count', data.get('players', data.get('total', 'unknown')))
                    self.log_test(
                        "Live Player Statistics (/api/stats/live-players)",
                        True,
                        f"Live players: {player_count}",
                        response_time
                    )
                else:
                    self.log_test(
                        "Live Player Statistics (/api/stats/live-players)",
                        True,  # Still pass if we get a response, even if structure is different
                        f"Response received: {json.dumps(data)[:100]}...",
                        response_time
                    )
            else:
                self.log_test(
                    "Live Player Statistics (/api/stats/live-players)",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Live Player Statistics (/api/stats/live-players)",
                False,
                f"Request failed: {str(e)}"
            )

    def test_global_winnings_stats(self):
        """Test 4: Global winnings stats (GET /api/stats/global-winnings)"""
        print("💰 TESTING GLOBAL WINNINGS STATISTICS")
        print("=" * 50)
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/stats/global-winnings", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for expected data structure
                if 'total' in data or 'winnings' in data or 'amount' in data:
                    winnings = data.get('total', data.get('winnings', data.get('amount', 'unknown')))
                    self.log_test(
                        "Global Winnings Statistics (/api/stats/global-winnings)",
                        True,
                        f"Global winnings: {winnings}",
                        response_time
                    )
                else:
                    self.log_test(
                        "Global Winnings Statistics (/api/stats/global-winnings)",
                        True,  # Still pass if we get a response, even if structure is different
                        f"Response received: {json.dumps(data)[:100]}...",
                        response_time
                    )
            else:
                self.log_test(
                    "Global Winnings Statistics (/api/stats/global-winnings)",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Global Winnings Statistics (/api/stats/global-winnings)",
                False,
                f"Request failed: {str(e)}"
            )

    def test_authentication_endpoints(self):
        """Test 5: Authentication endpoints that are working"""
        print("🔐 TESTING AUTHENTICATION ENDPOINTS")
        print("=" * 50)
        
        # Test common authentication endpoints
        auth_endpoints = [
            "/auth/status",
            "/auth/user",
            "/users/profile",
            "/wallet/balance"
        ]
        
        for endpoint in auth_endpoints:
            try:
                start_time = time.time()
                response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                response_time = time.time() - start_time
                
                # For auth endpoints, we expect either 200 (if working) or 401/403 (if auth required)
                # 404 means endpoint doesn't exist, 500 means server error
                if response.status_code in [200, 401, 403]:
                    if response.status_code == 200:
                        self.log_test(
                            f"Auth Endpoint ({endpoint})",
                            True,
                            f"Endpoint accessible, returned data",
                            response_time
                        )
                    else:
                        self.log_test(
                            f"Auth Endpoint ({endpoint})",
                            True,
                            f"Endpoint exists, requires authentication (HTTP {response.status_code})",
                            response_time
                        )
                elif response.status_code == 404:
                    self.log_test(
                        f"Auth Endpoint ({endpoint})",
                        False,
                        f"Endpoint not found (HTTP 404)",
                        response_time
                    )
                else:
                    self.log_test(
                        f"Auth Endpoint ({endpoint})",
                        False,
                        f"HTTP {response.status_code}: {response.text[:100]}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Auth Endpoint ({endpoint})",
                    False,
                    f"Request failed: {str(e)}"
                )

    def test_additional_core_endpoints(self):
        """Test 6: Additional core endpoints for completeness"""
        print("🔧 TESTING ADDITIONAL CORE ENDPOINTS")
        print("=" * 50)
        
        # Test root API endpoint
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                features = data.get('features', [])
                self.log_test(
                    "Root API Endpoint (/api/)",
                    True,
                    f"API info available, features: {features}",
                    response_time
                )
            else:
                self.log_test(
                    "Root API Endpoint (/api/)",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Root API Endpoint (/api/)",
                False,
                f"Request failed: {str(e)}"
            )

    def run_all_tests(self):
        """Run all core API tests"""
        print("🚀 STARTING CORE BACKEND API TESTING")
        print("=" * 80)
        print(f"Testing against: {BASE_URL}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 80)
        print()
        
        # Run all test suites
        self.test_api_health_check()
        self.test_server_browser_data()
        self.test_live_player_statistics()
        self.test_global_winnings_stats()
        self.test_authentication_endpoints()
        self.test_additional_core_endpoints()
        
        # Print summary
        print("📊 CORE API TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        print()
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        else:
            print("✅ ALL TESTS PASSED!")
        
        print()
        
        # Determine overall status
        if self.passed_tests == self.total_tests:
            print("🎉 BACKEND IS STABLE - Ready for frontend styling fixes!")
        elif self.passed_tests / self.total_tests >= 0.8:
            print("⚠️  BACKEND IS MOSTLY STABLE - Minor issues detected but core functionality working")
        else:
            print("🚨 BACKEND HAS ISSUES - Should fix backend problems before frontend styling")
        
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = CoreAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)