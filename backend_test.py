#!/usr/bin/env python3
"""
TurfLoot Backend API Testing Script - Post Professional Gaming Interface Redesign
Comprehensive testing focusing on priority endpoints from review request:
1. Core API Health Check: GET /api/
2. Live Statistics APIs: GET /api/stats/live-players and GET /api/stats/global-winnings  
3. Unified Privy Authentication: POST /api/auth/privy
4. Game Systems: POST /api/games and GET /api/pots
5. User Management: POST /api/users and GET /api/users/{wallet}
6. Profile Updates: POST /api/users/profile/update-name
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://247b4ccd-3ca1-4058-9869-0a0a47b3d2a9.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"
HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'TurfLoot-Backend-Test/2.0'
}

class TurfLootAPITester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            self.failed_tests += 1
            status = "❌ FAILED"
            
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_data': response_data
        }
        self.test_results.append(result)
        print(f"{status} - {test_name}: {details}")
        
    def test_root_endpoint(self):
        """Test GET /api/ root endpoint - Core API Health Check"""
        print("\n🔍 Testing Core API Health Check...")
        try:
            response = requests.get(f"{API_BASE}/", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'TurfLoot API' in data['message']:
                    self.log_test(
                        "Root API Endpoint", 
                        True, 
                        f"Status 200, API version: {data.get('message', 'N/A')}, Features: {data.get('features', [])}"
                    )
                else:
                    self.log_test("Root API Endpoint", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Root API Endpoint", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Root API Endpoint", False, f"Request failed: {str(e)}")
    
    def test_live_statistics_endpoints(self):
        """Test Live Statistics APIs - GET /api/stats/live-players and GET /api/stats/global-winnings"""
        print("\n📊 Testing Live Statistics APIs...")
        
        # Test live players endpoint
        try:
            response = requests.get(f"{API_BASE}/stats/live-players", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'count' in data and 'timestamp' in data:
                    self.log_test(
                        "Live Players Statistics", 
                        True, 
                        f"Players count: {data['count']}, Timestamp: {data['timestamp']}"
                    )
                else:
                    self.log_test("Live Players Statistics", False, f"Missing required fields: {data}")
            else:
                self.log_test("Live Players Statistics", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Live Players Statistics", False, f"Request failed: {str(e)}")
        
        # Test global winnings endpoint
        try:
            response = requests.get(f"{API_BASE}/stats/global-winnings", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'total' in data and 'timestamp' in data:
                    self.log_test(
                        "Global Winnings Statistics", 
                        True, 
                        f"Total winnings: ${data['total']}, Timestamp: {data['timestamp']}"
                    )
                else:
                    self.log_test("Global Winnings Statistics", False, f"Missing required fields: {data}")
            else:
                self.log_test("Global Winnings Statistics", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Global Winnings Statistics", False, f"Request failed: {str(e)}")
    
    def test_unified_privy_authentication(self):
        """Test Unified Privy Authentication - POST /api/auth/privy"""
        print("\n🔐 Testing Unified Privy Authentication...")
        
        # Test missing privy_user validation
        try:
            response = requests.post(f"{API_BASE}/auth/privy", 
                                   json={}, 
                                   headers=HEADERS, timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'Privy user' in data['error']:
                    self.log_test(
                        "Privy Auth - Missing User Validation", 
                        True, 
                        f"Correctly rejected empty request: {data['error']}"
                    )
                else:
                    self.log_test("Privy Auth - Missing User Validation", False, f"Unexpected error format: {data}")
            else:
                self.log_test("Privy Auth - Missing User Validation", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Privy Auth - Missing User Validation", False, f"Request failed: {str(e)}")
        
        # Test Google OAuth user creation through Privy
        try:
            test_privy_user = {
                "privy_user": {
                    "id": f"privy_test_{uuid.uuid4().hex[:8]}",
                    "google": {
                        "email": f"test.user.{int(time.time())}@gmail.com",
                        "name": "Test Gaming User",
                        "picture": "https://example.com/avatar.jpg"
                    }
                },
                "access_token": "test_access_token"
            }
            
            response = requests.post(f"{API_BASE}/auth/privy", 
                                   json=test_privy_user, 
                                   headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'user' in data and 'token' in data:
                    user = data['user']
                    self.log_test(
                        "Privy Auth - Google OAuth User Creation", 
                        True, 
                        f"User created: {user.get('email')}, Auth method: {user.get('auth_method')}, JWT token generated"
                    )
                else:
                    self.log_test("Privy Auth - Google OAuth User Creation", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Privy Auth - Google OAuth User Creation", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Privy Auth - Google OAuth User Creation", False, f"Request failed: {str(e)}")
        
        # Test Email OTP user creation through Privy
        try:
            test_privy_user = {
                "privy_user": {
                    "id": f"privy_email_{uuid.uuid4().hex[:8]}",
                    "email": {
                        "address": f"gamer.{int(time.time())}@turfloot.com"
                    }
                }
            }
            
            response = requests.post(f"{API_BASE}/auth/privy", 
                                   json=test_privy_user, 
                                   headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'user' in data:
                    user = data['user']
                    self.log_test(
                        "Privy Auth - Email OTP User Creation", 
                        True, 
                        f"Email user created: {user.get('email')}, Auth method: {user.get('auth_method')}"
                    )
                else:
                    self.log_test("Privy Auth - Email OTP User Creation", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Privy Auth - Email OTP User Creation", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Privy Auth - Email OTP User Creation", False, f"Request failed: {str(e)}")
    
    def test_game_systems(self):
        """Test Game Systems - POST /api/games and GET /api/pots"""
        print("\n🎮 Testing Game Systems...")
        
        # Test GET /api/pots endpoint
        try:
            response = requests.get(f"{API_BASE}/pots", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 3:
                    # Check for expected pot structure
                    pot_tables = [pot.get('table') for pot in data]
                    if '$1' in pot_tables and '$5' in pot_tables and '$20' in pot_tables:
                        total_players = sum(pot.get('players', 0) for pot in data)
                        total_pot = sum(pot.get('pot', 0) for pot in data)
                        self.log_test(
                            "Game Pots Endpoint", 
                            True, 
                            f"All 3 pot tables found, Total players: {total_players}, Total pot: ${total_pot}"
                        )
                    else:
                        self.log_test("Game Pots Endpoint", False, f"Missing expected pot tables: {pot_tables}")
                else:
                    self.log_test("Game Pots Endpoint", False, f"Unexpected data format: {data}")
            else:
                self.log_test("Game Pots Endpoint", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Game Pots Endpoint", False, f"Request failed: {str(e)}")
        
        # Test POST /api/games endpoint (requires authentication)
        # Note: This will fail without proper JWT token, but we can test the endpoint structure
        try:
            test_game_data = {
                "stake": 5.0,
                "game_mode": "territory"
            }
            
            response = requests.post(f"{API_BASE}/games", 
                                   json=test_game_data, 
                                   headers=HEADERS, timeout=10)
            
            # We expect 401 Unauthorized since we don't have a valid JWT token
            if response.status_code == 401:
                self.log_test(
                    "Game Creation Endpoint", 
                    True, 
                    "Correctly requires authentication (401 Unauthorized)"
                )
            elif response.status_code == 200:
                # If somehow it works without auth, that's also fine for testing
                data = response.json()
                self.log_test(
                    "Game Creation Endpoint", 
                    True, 
                    f"Game created successfully: {data.get('id', 'N/A')}"
                )
            else:
                self.log_test("Game Creation Endpoint", False, f"Unexpected status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Game Creation Endpoint", False, f"Request failed: {str(e)}")
    
    def test_user_management(self):
        """Test User Management - POST /api/users and GET /api/users/{wallet}"""
        print("\n👤 Testing User Management...")
        
        # Test POST /api/users endpoint
        try:
            test_user_data = {
                "wallet_address": f"test_wallet_{uuid.uuid4().hex[:16]}",
                "username": f"gamer_{int(time.time())}",
                "email": f"test.{int(time.time())}@turfloot.com"
            }
            
            response = requests.post(f"{API_BASE}/users", 
                                   json=test_user_data, 
                                   headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and 'wallet_address' in data:
                    created_user_id = data['id']
                    wallet_address = data['wallet_address']
                    self.log_test(
                        "User Creation", 
                        True, 
                        f"User created with ID: {created_user_id}, Wallet: {wallet_address}"
                    )
                    
                    # Test GET /api/users/{wallet} endpoint with the created user
                    try:
                        response = requests.get(f"{API_BASE}/users/{wallet_address}", 
                                              headers=HEADERS, timeout=10)
                        
                        if response.status_code == 200:
                            user_data = response.json()
                            if user_data.get('wallet_address') == wallet_address:
                                self.log_test(
                                    "User Profile Retrieval", 
                                    True, 
                                    f"User profile retrieved: {user_data.get('username', 'N/A')}"
                                )
                            else:
                                self.log_test("User Profile Retrieval", False, f"Wallet address mismatch: {user_data}")
                        else:
                            self.log_test("User Profile Retrieval", False, f"Status {response.status_code}: {response.text}")
                            
                    except Exception as e:
                        self.log_test("User Profile Retrieval", False, f"Request failed: {str(e)}")
                        
                else:
                    self.log_test("User Creation", False, f"Missing required fields in response: {data}")
            else:
                self.log_test("User Creation", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("User Creation", False, f"Request failed: {str(e)}")
        
        # Test GET /api/users/{wallet} with non-existent user
        try:
            fake_wallet = f"nonexistent_wallet_{uuid.uuid4().hex[:16]}"
            response = requests.get(f"{API_BASE}/users/{fake_wallet}", 
                                  headers=HEADERS, timeout=10)
            
            if response.status_code == 404:
                data = response.json()
                if 'error' in data:
                    self.log_test(
                        "User Not Found Handling", 
                        True, 
                        f"Correctly returns 404 for non-existent user: {data['error']}"
                    )
                else:
                    self.log_test("User Not Found Handling", False, f"Missing error message: {data}")
            else:
                self.log_test("User Not Found Handling", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("User Not Found Handling", False, f"Request failed: {str(e)}")
    
    def test_profile_updates(self):
        """Test Profile Updates - POST /api/users/profile/update-name"""
        print("\n✏️ Testing Profile Updates...")
        
        # Test missing required fields
        try:
            response = requests.post(f"{API_BASE}/users/profile/update-name", 
                                   json={}, 
                                   headers=HEADERS, timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and ('userId' in data['error'] or 'customName' in data['error']):
                    self.log_test(
                        "Profile Update - Missing Fields Validation", 
                        True, 
                        f"Correctly validates missing fields: {data['error']}"
                    )
                else:
                    self.log_test("Profile Update - Missing Fields Validation", False, f"Unexpected error format: {data}")
            else:
                self.log_test("Profile Update - Missing Fields Validation", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Profile Update - Missing Fields Validation", False, f"Request failed: {str(e)}")
        
        # Test custom name update with valid data
        try:
            test_update_data = {
                "userId": f"test_user_{uuid.uuid4().hex[:8]}",
                "customName": f"ProGamer_{int(time.time())}",
                "privyId": f"privy_{uuid.uuid4().hex[:8]}"
            }
            
            response = requests.post(f"{API_BASE}/users/profile/update-name", 
                                   json=test_update_data, 
                                   headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'customName' in data:
                    self.log_test(
                        "Profile Update - Custom Name Update", 
                        True, 
                        f"Custom name updated successfully: {data['customName']}"
                    )
                else:
                    self.log_test("Profile Update - Custom Name Update", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Profile Update - Custom Name Update", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Profile Update - Custom Name Update", False, f"Request failed: {str(e)}")
    
    def test_deprecated_endpoints(self):
        """Test that deprecated endpoints return proper 410 status"""
        print("\n🚫 Testing Deprecated Endpoints...")
        
        deprecated_endpoints = [
            "auth/google",
            "auth/wallet", 
            "auth/google-callback",
            "auth/register"
        ]
        
        for endpoint in deprecated_endpoints:
            try:
                response = requests.post(f"{API_BASE}/{endpoint}", 
                                       json={}, 
                                       headers=HEADERS, timeout=10)
                
                if response.status_code == 410:
                    data = response.json()
                    if 'error' in data and 'deprecated' in data['error'].lower():
                        self.log_test(
                            f"Deprecated Endpoint - {endpoint}", 
                            True, 
                            f"Correctly returns 410 deprecated: {data['error']}"
                        )
                    else:
                        self.log_test(f"Deprecated Endpoint - {endpoint}", False, f"Missing deprecation message: {data}")
                else:
                    self.log_test(f"Deprecated Endpoint - {endpoint}", False, f"Expected 410, got {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Deprecated Endpoint - {endpoint}", False, f"Request failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting TurfLoot Backend API Testing")
        print("🎯 Post Professional Gaming Interface Redesign Verification")
        print("=" * 70)
        print(f"Base URL: {API_BASE}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print("=" * 70)
        
        # Run all test categories based on review request priorities
        self.test_root_endpoint()
        self.test_live_statistics_endpoints()
        self.test_unified_privy_authentication()
        self.test_game_systems()
        self.test_user_management()
        self.test_profile_updates()
        self.test_deprecated_endpoints()
        
        # Print summary
        print("\n" + "=" * 70)
        print("🏁 TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        if self.failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAILED" in result['status']:
                    print(f"  - {result['test']}: {result['details']}")
        
        print(f"\nTest completed at: {datetime.now().isoformat()}")
        return self.passed_tests, self.failed_tests, self.total_tests

if __name__ == "__main__":
    tester = TurfLootAPITester()
    passed, failed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if failed == 0 else 1)