#!/usr/bin/env python3
"""
TurfLoot Backend API Testing Suite
Tests all backend APIs after server configuration changes from yarn dev to custom server.js
Focus: Verify no regression issues from switching to Socket.IO game server integration
"""

import requests
import json
import time
import uuid
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class TurfLootAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None
        self.test_user_id = None
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        print(f"{status} - {test_name}: {details}")
        
    def test_core_api_health(self):
        """Test 1: Core API Health Check (GET /api/)"""
        print("\n🔍 Testing Core API Health Check...")
        try:
            response = self.session.get(f"{API_BASE}/")
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('message') == 'TurfLoot API v2.0' and 
                    data.get('service') == 'turfloot-backend' and
                    'auth' in data.get('features', []) and
                    'blockchain' in data.get('features', []) and
                    'multiplayer' in data.get('features', [])):
                    self.log_test("Core API Health Check", True, 
                                f"API v2.0 responding correctly with all features: {data.get('features')}")
                else:
                    self.log_test("Core API Health Check", False, 
                                f"Unexpected response structure: {data}")
            else:
                self.log_test("Core API Health Check", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Core API Health Check", False, f"Request failed: {str(e)}")
    
    def test_live_statistics(self):
        """Test 2: Live Statistics APIs"""
        print("\n📊 Testing Live Statistics APIs...")
        
        # Test live players endpoint
        try:
            response = self.session.get(f"{API_BASE}/stats/live-players")
            if response.status_code == 200:
                data = response.json()
                if 'count' in data and 'timestamp' in data:
                    self.log_test("Live Players Statistics", True, 
                                f"Live players count: {data['count']}")
                else:
                    self.log_test("Live Players Statistics", False, 
                                f"Missing required fields: {data}")
            else:
                self.log_test("Live Players Statistics", False, 
                            f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Live Players Statistics", False, f"Request failed: {str(e)}")
        
        # Test global winnings endpoint
        try:
            response = self.session.get(f"{API_BASE}/stats/global-winnings")
            if response.status_code == 200:
                data = response.json()
                if 'total' in data and 'timestamp' in data:
                    self.log_test("Global Winnings Statistics", True, 
                                f"Global winnings total: ${data['total']}")
                else:
                    self.log_test("Global Winnings Statistics", False, 
                                f"Missing required fields: {data}")
            else:
                self.log_test("Global Winnings Statistics", False, 
                            f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Global Winnings Statistics", False, f"Request failed: {str(e)}")
    
    def test_game_pots(self):
        """Test 3: Game Pots Endpoint"""
        print("\n🎰 Testing Game Pots Endpoint...")
        try:
            response = self.session.get(f"{API_BASE}/pots")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 3:
                    tables = [pot.get('table') for pot in data]
                    if '$1' in tables and '$5' in tables and '$20' in tables:
                        total_players = sum(pot.get('players', 0) for pot in data)
                        total_pot = sum(pot.get('pot', 0) for pot in data)
                        self.log_test("Game Pots Endpoint", True, 
                                    f"All 3 pot tables available. Total players: {total_players}, Total pot: ${total_pot}")
                    else:
                        self.log_test("Game Pots Endpoint", False, 
                                    f"Missing expected pot tables: {tables}")
                else:
                    self.log_test("Game Pots Endpoint", False, 
                                f"Unexpected response format: {data}")
            else:
                self.log_test("Game Pots Endpoint", False, 
                            f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Game Pots Endpoint", False, f"Request failed: {str(e)}")
    
    def test_unified_privy_auth(self):
        """Test 4: Unified Privy Authentication System"""
        print("\n🔐 Testing Unified Privy Authentication...")
        
        # Test missing privy_user validation
        try:
            response = self.session.post(f"{API_BASE}/auth/privy", 
                                       json={}, 
                                       headers={'Content-Type': 'application/json'})
            if response.status_code == 400:
                self.log_test("Privy Auth - Missing User Validation", True, 
                            "Correctly rejects requests without privy_user")
            else:
                self.log_test("Privy Auth - Missing User Validation", False, 
                            f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Privy Auth - Missing User Validation", False, f"Request failed: {str(e)}")
        
        # Test Google OAuth user creation through Privy
        test_timestamp = int(time.time())
        test_email = f"test.user.{test_timestamp}@gmail.com"
        
        try:
            privy_user_data = {
                "privy_user": {
                    "id": f"did:privy:cm{uuid.uuid4().hex[:20]}",
                    "google": {
                        "email": test_email,
                        "name": f"Test User {test_timestamp}",
                        "picture": "https://example.com/avatar.jpg"
                    }
                },
                "access_token": f"test_token_{test_timestamp}"
            }
            
            response = self.session.post(f"{API_BASE}/auth/privy", 
                                       json=privy_user_data,
                                       headers={'Content-Type': 'application/json'})
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('success') and 
                    data.get('user', {}).get('email') == test_email and
                    data.get('token')):
                    self.auth_token = data.get('token')
                    self.test_user_id = data.get('user', {}).get('id')
                    self.log_test("Privy Auth - Google OAuth", True, 
                                f"User created successfully: {test_email}")
                else:
                    self.log_test("Privy Auth - Google OAuth", False, 
                                f"Unexpected response structure: {data}")
            else:
                self.log_test("Privy Auth - Google OAuth", False, 
                            f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Privy Auth - Google OAuth", False, f"Request failed: {str(e)}")
    
    def test_deprecated_endpoints(self):
        """Test 5: Deprecated Authentication Endpoints"""
        print("\n🚫 Testing Deprecated Authentication Endpoints...")
        
        deprecated_endpoints = [
            "/auth/google",
            "/auth/wallet", 
            "/auth/google-callback",
            "/auth/register"
        ]
        
        for endpoint in deprecated_endpoints:
            try:
                response = self.session.post(f"{API_BASE}{endpoint}", 
                                           json={},
                                           headers={'Content-Type': 'application/json'})
                if response.status_code == 410:
                    self.log_test(f"Deprecated Endpoint {endpoint}", True, 
                                "Correctly returns 410 deprecated status")
                else:
                    self.log_test(f"Deprecated Endpoint {endpoint}", False, 
                                f"Expected 410, got {response.status_code}")
            except Exception as e:
                self.log_test(f"Deprecated Endpoint {endpoint}", False, f"Request failed: {str(e)}")
    
    def test_wallet_apis(self):
        """Test 6: Wallet APIs with Authentication"""
        print("\n💰 Testing Wallet APIs...")
        
        if not self.auth_token:
            self.log_test("Wallet APIs", False, "No auth token available for testing")
            return
        
        headers = {
            'Authorization': f'Bearer {self.auth_token}',
            'Content-Type': 'application/json'
        }
        
        # Test wallet balance
        try:
            response = self.session.get(f"{API_BASE}/wallet/balance", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ['balance', 'currency', 'sol_balance', 'usdc_balance']):
                    self.log_test("Wallet Balance API", True, 
                                f"Balance: ${data['balance']} USD, {data['sol_balance']} SOL, {data['usdc_balance']} USDC")
                else:
                    self.log_test("Wallet Balance API", False, 
                                f"Missing required fields: {data}")
            else:
                self.log_test("Wallet Balance API", False, 
                            f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Wallet Balance API", False, f"Request failed: {str(e)}")
        
        # Test transaction history
        try:
            response = self.session.get(f"{API_BASE}/wallet/transactions", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if 'transactions' in data:
                    tx_count = len(data['transactions'])
                    self.log_test("Transaction History API", True, 
                                f"Retrieved {tx_count} transactions")
                else:
                    self.log_test("Transaction History API", False, 
                                f"Missing transactions field: {data}")
            else:
                self.log_test("Transaction History API", False, 
                            f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Transaction History API", False, f"Request failed: {str(e)}")
    
    def test_game_server_integration(self):
        """Test 7: Game Server Integration (Socket.IO availability)"""
        print("\n🎮 Testing Game Server Integration...")
        
        # Test if Socket.IO endpoint is accessible
        try:
            # Test Socket.IO handshake endpoint
            response = self.session.get(f"{BASE_URL}/socket.io/?EIO=4&transport=polling")
            
            if response.status_code == 200:
                # Socket.IO responds with a specific format
                response_text = response.text
                if "0{" in response_text or "sid" in response_text:
                    self.log_test("Socket.IO Game Server", True, 
                                "Socket.IO server responding correctly")
                else:
                    self.log_test("Socket.IO Game Server", False, 
                                f"Unexpected Socket.IO response: {response_text[:100]}")
            else:
                self.log_test("Socket.IO Game Server", False, 
                            f"Socket.IO endpoint not accessible: HTTP {response.status_code}")
        except Exception as e:
            self.log_test("Socket.IO Game Server", False, f"Socket.IO test failed: {str(e)}")
        
        # Test game server status through API if available
        try:
            response = self.session.get(f"{API_BASE}/")
            if response.status_code == 200:
                data = response.json()
                if 'multiplayer' in data.get('features', []):
                    self.log_test("Game Server Features", True, 
                                "Multiplayer feature enabled in API")
                else:
                    self.log_test("Game Server Features", False, 
                                "Multiplayer feature not listed in API features")
        except Exception as e:
            self.log_test("Game Server Features", False, f"Feature check failed: {str(e)}")
    
    def test_user_management(self):
        """Test 8: User Management APIs"""
        print("\n👤 Testing User Management APIs...")
        
        if not self.test_user_id:
            self.log_test("User Management", False, "No test user ID available")
            return
        
        # Test user profile retrieval
        try:
            response = self.session.get(f"{API_BASE}/users/{self.test_user_id}")
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and 'email' in data:
                    self.log_test("User Profile Retrieval", True, 
                                f"User profile retrieved successfully: {data.get('email')}")
                else:
                    self.log_test("User Profile Retrieval", False, 
                                f"Missing required user fields: {data}")
            else:
                self.log_test("User Profile Retrieval", False, 
                            f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("User Profile Retrieval", False, f"Request failed: {str(e)}")
    
    def test_custom_name_update(self):
        """Test 9: Custom Name Update Endpoint"""
        print("\n✏️ Testing Custom Name Update...")
        
        if not self.test_user_id:
            self.log_test("Custom Name Update", False, "No test user ID available")
            return
        
        test_name = f"TestGamer_{int(time.time())}"
        
        try:
            response = self.session.post(f"{API_BASE}/users/profile/update-name",
                                       json={
                                           "userId": self.test_user_id,
                                           "customName": test_name
                                       },
                                       headers={'Content-Type': 'application/json'})
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('customName') == test_name:
                    self.log_test("Custom Name Update", True, 
                                f"Custom name updated successfully: {test_name}")
                else:
                    self.log_test("Custom Name Update", False, 
                                f"Unexpected response: {data}")
            else:
                self.log_test("Custom Name Update", False, 
                            f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Custom Name Update", False, f"Request failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting TurfLoot Backend API Testing Suite")
        print("=" * 60)
        print(f"Testing against: {BASE_URL}")
        print(f"API Base URL: {API_BASE}")
        print("=" * 60)
        
        # Core API tests
        self.test_core_api_health()
        self.test_live_statistics()
        self.test_game_pots()
        
        # Authentication tests
        self.test_unified_privy_auth()
        self.test_deprecated_endpoints()
        
        # Authenticated API tests
        self.test_wallet_apis()
        self.test_user_management()
        self.test_custom_name_update()
        
        # Game server tests
        self.test_game_server_integration()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASSED" in result['status'])
        failed = sum(1 for result in self.test_results if "❌ FAILED" in result['status'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAILED" in result['status']:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            print(f"{result['status']} - {result['test']}")
            if result['details']:
                print(f"    Details: {result['details']}")
        
        print("\n" + "=" * 60)
        
        # Overall assessment
        if passed == total:
            print("🎉 ALL TESTS PASSED - Backend APIs working correctly after server changes!")
        elif passed >= total * 0.8:
            print("⚠️ MOSTLY WORKING - Minor issues detected, but core functionality operational")
        else:
            print("🚨 CRITICAL ISSUES - Multiple backend APIs failing, requires immediate attention")

if __name__ == "__main__":
    tester = TurfLootAPITester()
    tester.run_all_tests()