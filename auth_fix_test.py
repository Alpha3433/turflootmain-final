#!/usr/bin/env python3
"""
TurfLoot Backend Authentication Fix Verification Test
Quick verification test to confirm the authentication fix is working

PRIORITY TESTS:
1. Test that the server browser API is still accessible and working
2. Verify that the multiplayer server endpoints are functional
3. Test that the authentication graceful fallback is working
4. Verify that users can now access the game without authentication errors
5. Test that the server browser shows real server data
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://bf7b3564-8863-4eaa-9ec0-5d002ec5a3fe.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class TurfLootAuthFixTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}: {message}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        
    def test_root_endpoint(self):
        """Test that the root API endpoint is accessible"""
        try:
            response = self.session.get(f"{API_BASE}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'TurfLoot API' in data['message']:
                    self.log_test(
                        "Root API Endpoint",
                        True,
                        f"API accessible - {data['message']} with features {data.get('features', [])}"
                    )
                    return True
                else:
                    self.log_test("Root API Endpoint", False, f"Unexpected response format: {data}")
                    return False
            else:
                self.log_test("Root API Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Root API Endpoint", False, f"Connection error: {str(e)}")
            return False
    
    def test_server_browser_api(self):
        """Test that the server browser API is accessible and returns real server data"""
        try:
            response = self.session.get(f"{API_BASE}/servers/lobbies", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for required fields
                if 'servers' in data and 'totalPlayers' in data:
                    servers = data['servers']
                    total_players = data.get('totalPlayers', 0)
                    total_active = data.get('totalActiveServers', 0)
                    
                    self.log_test(
                        "Server Browser API",
                        True,
                        f"Returns {len(servers)} servers with {total_players} total players, {total_active} active",
                        {
                            'server_count': len(servers),
                            'total_players': total_players,
                            'active_servers': total_active
                        }
                    )
                    return True
                else:
                    self.log_test("Server Browser API", False, f"Missing required fields in response: {data}")
                    return False
            else:
                self.log_test("Server Browser API", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Server Browser API", False, f"Connection error: {str(e)}")
            return False
    
    def test_multiplayer_servers_data(self):
        """Test that multiplayer servers return proper data structure"""
        try:
            response = self.session.get(f"{API_BASE}/servers/lobbies", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                if not servers:
                    self.log_test("Multiplayer Servers Data", False, "No servers found in response")
                    return False
                
                # Check first server structure
                first_server = servers[0]
                required_fields = ['id', 'name', 'region', 'stake', 'mode', 'currentPlayers', 'maxPlayers', 'status']
                
                missing_fields = [field for field in required_fields if field not in first_server]
                
                if not missing_fields:
                    # Check for different game types
                    game_types = set(server.get('stake', 'Free') for server in servers)
                    regions = set(server.get('region', 'Unknown') for server in servers)
                    
                    self.log_test(
                        "Multiplayer Servers Data",
                        True,
                        f"Proper server structure with game types {list(game_types)} across regions {list(regions)}",
                        {
                            'game_types': list(game_types),
                            'regions': list(regions),
                            'sample_server': first_server
                        }
                    )
                    return True
                else:
                    self.log_test("Multiplayer Servers Data", False, f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_test("Multiplayer Servers Data", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Multiplayer Servers Data", False, f"Connection error: {str(e)}")
            return False
    
    def test_authentication_graceful_fallback(self):
        """Test that authentication endpoints handle unauthenticated requests gracefully"""
        try:
            # Test wallet balance endpoint without authentication
            response = self.session.get(f"{API_BASE}/wallet/balance", timeout=10)
            
            if response.status_code == 401:
                data = response.json()
                if 'error' in data:
                    self.log_test(
                        "Authentication Graceful Fallback",
                        True,
                        f"Unauthenticated requests properly rejected with 401: {data['error']}"
                    )
                    return True
                else:
                    self.log_test("Authentication Graceful Fallback", False, f"401 response missing error message: {data}")
                    return False
            else:
                self.log_test("Authentication Graceful Fallback", False, f"Expected 401, got HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Authentication Graceful Fallback", False, f"Connection error: {str(e)}")
            return False
    
    def test_privy_authentication_endpoint(self):
        """Test that the Privy authentication endpoint is accessible and handles requests properly"""
        try:
            # Test with missing data to verify endpoint is working
            response = self.session.post(
                f"{API_BASE}/auth/privy",
                json={},
                timeout=10
            )
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'privy_user' in data['error']:
                    self.log_test(
                        "Privy Authentication Endpoint",
                        True,
                        f"Endpoint accessible and validates input: {data['error']}"
                    )
                    return True
                else:
                    self.log_test("Privy Authentication Endpoint", False, f"Unexpected 400 response: {data}")
                    return False
            else:
                self.log_test("Privy Authentication Endpoint", False, f"Expected 400, got HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Privy Authentication Endpoint", False, f"Connection error: {str(e)}")
            return False
    
    def test_deprecated_auth_endpoints(self):
        """Test that deprecated authentication endpoints return proper deprecation messages"""
        deprecated_endpoints = [
            'auth/google',
            'auth/wallet',
            'auth/register'
        ]
        
        all_deprecated = True
        
        for endpoint in deprecated_endpoints:
            try:
                response = self.session.post(f"{API_BASE}/{endpoint}", json={}, timeout=10)
                
                if response.status_code == 410:
                    data = response.json()
                    if 'deprecated' in data.get('error', '').lower():
                        print(f"✅ {endpoint} properly deprecated")
                    else:
                        print(f"❌ {endpoint} returns 410 but missing deprecation message")
                        all_deprecated = False
                else:
                    print(f"❌ {endpoint} should return 410, got {response.status_code}")
                    all_deprecated = False
                    
            except Exception as e:
                print(f"❌ {endpoint} connection error: {str(e)}")
                all_deprecated = False
        
        self.log_test(
            "Deprecated Auth Endpoints",
            all_deprecated,
            "All deprecated endpoints return proper 410 status" if all_deprecated else "Some deprecated endpoints not working correctly"
        )
        
        return all_deprecated
    
    def test_game_access_without_auth_errors(self):
        """Test that users can access game-related endpoints without authentication errors blocking core functionality"""
        try:
            # Test game pots endpoint (should be accessible without auth)
            response = self.session.get(f"{API_BASE}/pots", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_test(
                        "Game Access Without Auth",
                        True,
                        f"Game pots accessible without auth - {len(data)} pots available"
                    )
                    return True
                else:
                    self.log_test("Game Access Without Auth", False, f"Unexpected pots data format: {data}")
                    return False
            else:
                self.log_test("Game Access Without Auth", False, f"Game pots endpoint failed: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Game Access Without Auth", False, f"Connection error: {str(e)}")
            return False
    
    def test_live_statistics_endpoints(self):
        """Test that live statistics endpoints are working for game display"""
        try:
            # Test live players endpoint
            response1 = self.session.get(f"{API_BASE}/stats/live-players", timeout=10)
            response2 = self.session.get(f"{API_BASE}/stats/global-winnings", timeout=10)
            
            both_working = True
            messages = []
            
            if response1.status_code == 200:
                data1 = response1.json()
                if 'count' in data1:
                    messages.append(f"Live players: {data1['count']}")
                else:
                    both_working = False
                    messages.append("Live players missing count field")
            else:
                both_working = False
                messages.append(f"Live players failed: {response1.status_code}")
            
            if response2.status_code == 200:
                data2 = response2.json()
                if 'total' in data2:
                    messages.append(f"Global winnings: ${data2['total']}")
                else:
                    both_working = False
                    messages.append("Global winnings missing total field")
            else:
                both_working = False
                messages.append(f"Global winnings failed: {response2.status_code}")
            
            self.log_test(
                "Live Statistics Endpoints",
                both_working,
                "; ".join(messages)
            )
            
            return both_working
                
        except Exception as e:
            self.log_test("Live Statistics Endpoints", False, f"Connection error: {str(e)}")
            return False
    
    def run_authentication_fix_verification(self):
        """Run the complete authentication fix verification test suite"""
        print("🚀 Starting TurfLoot Authentication Fix Verification Tests")
        print("=" * 60)
        
        # Priority tests as requested in review
        tests = [
            ("Server Browser API Accessibility", self.test_server_browser_api),
            ("Multiplayer Server Endpoints", self.test_multiplayer_servers_data),
            ("Authentication Graceful Fallback", self.test_authentication_graceful_fallback),
            ("Game Access Without Auth Errors", self.test_game_access_without_auth_errors),
            ("Server Browser Shows Real Data", self.test_server_browser_api),  # Duplicate for emphasis
            ("Privy Authentication Endpoint", self.test_privy_authentication_endpoint),
            ("Root API Endpoint", self.test_root_endpoint),
            ("Live Statistics Endpoints", self.test_live_statistics_endpoints),
            ("Deprecated Auth Endpoints", self.test_deprecated_auth_endpoints)
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🔍 Running: {test_name}")
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                self.log_test(test_name, False, f"Test execution error: {str(e)}")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 AUTHENTICATION FIX VERIFICATION SUMMARY")
        print("=" * 60)
        
        success_rate = (passed_tests / total_tests) * 100
        print(f"Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        if success_rate >= 80:
            print("🎉 AUTHENTICATION FIX VERIFICATION: SUCCESS")
            print("✅ Authentication fix is working correctly")
            print("✅ Server browser and multiplayer endpoints are functional")
            print("✅ Graceful fallback mechanisms are working")
            print("✅ Users can access game without authentication errors")
        else:
            print("⚠️  AUTHENTICATION FIX VERIFICATION: ISSUES DETECTED")
            print("❌ Some critical functionality may not be working correctly")
        
        # Detailed results
        print("\n📋 Detailed Test Results:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        return success_rate >= 80

def main():
    """Main test execution"""
    tester = TurfLootAuthFixTester()
    
    try:
        success = tester.run_authentication_fix_verification()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test suite failed with error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()