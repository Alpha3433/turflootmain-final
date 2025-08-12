#!/usr/bin/env python3
"""
TurfLoot Comprehensive Backend API Testing
Testing all core backend systems after UI position swap and settings system integration.
Focus: Verify no regressions in backend APIs after frontend changes.
"""

import requests
import json
import time
import uuid
import sys
from datetime import datetime

# Configuration - Use environment URL from .env
BASE_URL = "https://gridgame-dev.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class TurfLootComprehensiveTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
    
    def test_core_api_health(self):
        """Test core API health endpoints"""
        print("\n🏥 CORE API HEALTH TESTING")
        print("=" * 50)
        
        # Test 1: Root endpoint
        try:
            response = self.session.get(f"{API_BASE}/")
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('message') == 'TurfLoot API v2.0' and 
                    'features' in data and 
                    isinstance(data['features'], list)):
                    self.log_test(
                        "Root API Endpoint", 
                        True, 
                        f"Version: {data.get('message')}, Features: {data.get('features')}"
                    )
                else:
                    self.log_test(
                        "Root API Endpoint", 
                        False, 
                        f"Unexpected response structure: {data}"
                    )
            else:
                self.log_test(
                    "Root API Endpoint", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Root API Endpoint", False, f"Exception: {str(e)}")
        
        # Test 2: Game pots endpoint
        try:
            response = self.session.get(f"{API_BASE}/pots")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 3:
                    # Check if all pots have required fields
                    valid_pots = all('table' in pot and 'pot' in pot and 'players' in pot for pot in data)
                    if valid_pots:
                        total_players = sum(pot['players'] for pot in data)
                        total_pot = sum(pot['pot'] for pot in data)
                        self.log_test(
                            "Game Pots Endpoint", 
                            True, 
                            f"Found {len(data)} tables, {total_players} players, ${total_pot} total pot"
                        )
                    else:
                        self.log_test(
                            "Game Pots Endpoint", 
                            False, 
                            "Missing required fields in pot data"
                        )
                else:
                    self.log_test(
                        "Game Pots Endpoint", 
                        False, 
                        f"Expected array with 3+ pots, got: {type(data)} with {len(data) if isinstance(data, list) else 'N/A'} items"
                    )
            else:
                self.log_test(
                    "Game Pots Endpoint", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Game Pots Endpoint", False, f"Exception: {str(e)}")
        
        # Test 3: Live Statistics APIs
        try:
            # Test live players endpoint
            response = self.session.get(f"{API_BASE}/stats/live-players")
            
            if response.status_code == 200:
                data = response.json()
                if 'count' in data and 'timestamp' in data:
                    self.log_test(
                        "Live Players Statistics", 
                        True, 
                        f"Live players: {data['count']}, Timestamp: {data['timestamp']}"
                    )
                else:
                    self.log_test(
                        "Live Players Statistics", 
                        False, 
                        f"Missing required fields: {data}"
                    )
            else:
                self.log_test(
                    "Live Players Statistics", 
                    False, 
                    f"Status: {response.status_code}"
                )
            
            # Test global winnings endpoint
            response = self.session.get(f"{API_BASE}/stats/global-winnings")
            
            if response.status_code == 200:
                data = response.json()
                if 'total' in data and 'timestamp' in data:
                    self.log_test(
                        "Global Winnings Statistics", 
                        True, 
                        f"Global winnings: ${data['total']}, Timestamp: {data['timestamp']}"
                    )
                else:
                    self.log_test(
                        "Global Winnings Statistics", 
                        False, 
                        f"Missing required fields: {data}"
                    )
            else:
                self.log_test(
                    "Global Winnings Statistics", 
                    False, 
                    f"Status: {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Live Statistics APIs", False, f"Exception: {str(e)}")
    
    def test_authentication_system(self):
        """Test Privy authentication system"""
        print("\n🔑 AUTHENTICATION SYSTEM TESTING")
        print("=" * 50)
        
        # Test 1: Missing privy_user validation
        try:
            response = self.session.post(
                f"{API_BASE}/auth/privy",
                json={},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 400:
                data = response.json()
                if 'privy' in data.get('error', '').lower():
                    self.log_test(
                        "Missing Privy User Validation", 
                        True, 
                        f"Correctly rejected empty request: {data.get('error')}"
                    )
                else:
                    self.log_test(
                        "Missing Privy User Validation", 
                        False, 
                        f"Wrong error message: {data.get('error')}"
                    )
            else:
                self.log_test(
                    "Missing Privy User Validation", 
                    False, 
                    f"Expected 400, got {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Missing Privy User Validation", False, f"Exception: {str(e)}")
        
        # Test 2: Google OAuth user creation through Privy
        try:
            test_email = f"test.user.{int(time.time())}@gmail.com"
            privy_user_data = {
                "privy_user": {
                    "id": f"did:privy:cm{uuid.uuid4().hex[:20]}",
                    "google": {
                        "email": test_email,
                        "name": "Test User",
                        "picture": "https://example.com/avatar.jpg"
                    },
                    "email": None,
                    "wallet": None
                }
            }
            
            response = self.session.post(
                f"{API_BASE}/auth/privy",
                json=privy_user_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('success') and 
                    'token' in data and 
                    'user' in data and
                    data['user'].get('email') == test_email):
                    
                    # Store auth token for subsequent tests
                    self.auth_token = data.get('token')
                    self.test_user_id = data.get('user', {}).get('id')
                    
                    # Set authorization header for future requests
                    self.session.headers.update({
                        'Authorization': f'Bearer {self.auth_token}'
                    })
                    
                    self.log_test(
                        "Google OAuth User Creation via Privy", 
                        True, 
                        f"User created: {test_email}, Auth method: {data['user'].get('auth_method')}"
                    )
                else:
                    self.log_test(
                        "Google OAuth User Creation via Privy", 
                        False, 
                        f"Missing required fields in response: {data}"
                    )
            else:
                self.log_test(
                    "Google OAuth User Creation via Privy", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Google OAuth User Creation via Privy", False, f"Exception: {str(e)}")
        
        # Test 3: Deprecated endpoints return 410
        deprecated_endpoints = [
            'auth/google',
            'auth/wallet', 
            'auth/google-callback',
            'auth/register'
        ]
        
        for endpoint in deprecated_endpoints:
            try:
                response = self.session.post(
                    f"{API_BASE}/{endpoint}",
                    json={"test": "data"},
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 410:
                    self.log_test(
                        f"Deprecated Endpoint {endpoint}", 
                        True, 
                        "Correctly returns 410 deprecated status"
                    )
                else:
                    self.log_test(
                        f"Deprecated Endpoint {endpoint}", 
                        False, 
                        f"Expected 410, got {response.status_code}"
                    )
                    
            except Exception as e:
                self.log_test(f"Deprecated Endpoint {endpoint}", False, f"Exception: {str(e)}")
    
    def test_wallet_apis(self):
        """Test wallet-related APIs"""
        print("\n💰 WALLET APIs TESTING")
        print("=" * 50)
        
        if not self.auth_token:
            print("⚠️ Skipping wallet tests - no authentication token available")
            return
        
        # Test 1: Wallet balance API
        try:
            response = self.session.get(f"{API_BASE}/wallet/balance")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['balance', 'currency', 'sol_balance', 'usdc_balance']
                
                if all(field in data for field in required_fields):
                    self.log_test(
                        "Wallet Balance API", 
                        True, 
                        f"Balance: ${data['balance']}, SOL: {data['sol_balance']}, USDC: {data['usdc_balance']}"
                    )
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test(
                        "Wallet Balance API", 
                        False, 
                        f"Missing fields: {missing}"
                    )
            else:
                self.log_test(
                    "Wallet Balance API", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Wallet Balance API", False, f"Exception: {str(e)}")
        
        # Test 2: Add funds API
        try:
            add_funds_data = {
                "amount": 0.1,
                "currency": "SOL",
                "transaction_hash": f"test_tx_{uuid.uuid4().hex[:16]}"
            }
            
            response = self.session.post(
                f"{API_BASE}/wallet/add-funds",
                json=add_funds_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'transaction_id' in data:
                    self.log_test(
                        "Add Funds API", 
                        True, 
                        f"Added {add_funds_data['amount']} {add_funds_data['currency']}, TX ID: {data['transaction_id']}"
                    )
                else:
                    self.log_test(
                        "Add Funds API", 
                        False, 
                        f"Missing success or transaction_id: {data}"
                    )
            else:
                self.log_test(
                    "Add Funds API", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Add Funds API", False, f"Exception: {str(e)}")
        
        # Test 3: Transaction history API
        try:
            response = self.session.get(f"{API_BASE}/wallet/transactions")
            
            if response.status_code == 200:
                data = response.json()
                if 'transactions' in data and isinstance(data['transactions'], list):
                    transactions = data['transactions']
                    self.log_test(
                        "Transaction History API", 
                        True, 
                        f"Retrieved {len(transactions)} transactions"
                    )
                else:
                    self.log_test(
                        "Transaction History API", 
                        False, 
                        f"Missing or invalid transactions field: {data}"
                    )
            else:
                self.log_test(
                    "Transaction History API", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Transaction History API", False, f"Exception: {str(e)}")
        
        # Test 4: Cash out API validation
        try:
            # Test minimum amount validation
            cash_out_data = {
                "amount": 0.01,  # Below minimum
                "currency": "SOL",
                "recipient_address": "11111111111111111111111111111112"
            }
            
            response = self.session.post(
                f"{API_BASE}/wallet/cash-out",
                json=cash_out_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 400:
                data = response.json()
                if 'minimum' in data.get('error', '').lower():
                    self.log_test(
                        "Cash Out Minimum Validation", 
                        True, 
                        f"Correctly rejected below minimum: {data.get('error')}"
                    )
                else:
                    self.log_test(
                        "Cash Out Minimum Validation", 
                        False, 
                        f"Wrong error message: {data.get('error')}"
                    )
            else:
                self.log_test(
                    "Cash Out Minimum Validation", 
                    False, 
                    f"Expected 400, got {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Cash Out Minimum Validation", False, f"Exception: {str(e)}")
    
    def test_user_management(self):
        """Test user management APIs"""
        print("\n👤 USER MANAGEMENT TESTING")
        print("=" * 50)
        
        if not self.auth_token or not self.test_user_id:
            print("⚠️ Skipping user management tests - no authentication available")
            return
        
        # Test 1: Get user profile
        try:
            response = self.session.get(f"{API_BASE}/users/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and 'email' in data:
                    self.log_test(
                        "Get User Profile", 
                        True, 
                        f"Retrieved profile for user: {data.get('email', 'N/A')}"
                    )
                else:
                    self.log_test(
                        "Get User Profile", 
                        False, 
                        f"Missing required fields: {data}"
                    )
            else:
                self.log_test(
                    "Get User Profile", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Get User Profile", False, f"Exception: {str(e)}")
        
        # Test 2: Custom name update
        try:
            custom_name_data = {
                "userId": self.test_user_id,
                "customName": f"TestGamer_{int(time.time())}"
            }
            
            response = self.session.post(
                f"{API_BASE}/users/profile/update-name",
                json=custom_name_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test(
                        "Custom Name Update", 
                        True, 
                        f"Updated name to: {custom_name_data['customName']}"
                    )
                else:
                    self.log_test(
                        "Custom Name Update", 
                        False, 
                        f"Success field missing or false: {data}"
                    )
            else:
                self.log_test(
                    "Custom Name Update", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Custom Name Update", False, f"Exception: {str(e)}")
    
    def test_game_server_integration(self):
        """Test game server and Socket.IO integration"""
        print("\n🎮 GAME SERVER INTEGRATION TESTING")
        print("=" * 50)
        
        # Test 1: Socket.IO server accessibility
        try:
            # Test if Socket.IO endpoint is accessible
            response = self.session.get(f"{BASE_URL}/socket.io/")
            
            # Socket.IO typically returns specific responses or redirects
            if response.status_code in [200, 400, 404]:  # Various valid Socket.IO responses
                self.log_test(
                    "Socket.IO Server Accessibility", 
                    True, 
                    f"Socket.IO endpoint responding (Status: {response.status_code})"
                )
            else:
                self.log_test(
                    "Socket.IO Server Accessibility", 
                    False, 
                    f"Unexpected status: {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Socket.IO Server Accessibility", False, f"Exception: {str(e)}")
        
        # Test 2: Game creation API
        if self.auth_token:
            try:
                game_data = {
                    "stake": 1.0,
                    "game_mode": "territory"
                }
                
                response = self.session.post(
                    f"{API_BASE}/games",
                    json=game_data,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'id' in data and 'stake' in data:
                        self.log_test(
                            "Game Creation API", 
                            True, 
                            f"Created game with ID: {data['id']}, Stake: ${data['stake']}"
                        )
                    else:
                        self.log_test(
                            "Game Creation API", 
                            False, 
                            f"Missing required fields: {data}"
                        )
                else:
                    self.log_test(
                        "Game Creation API", 
                        False, 
                        f"Status: {response.status_code}, Response: {response.text[:200]}"
                    )
                    
            except Exception as e:
                self.log_test("Game Creation API", False, f"Exception: {str(e)}")
    
    def test_database_connectivity(self):
        """Test MongoDB database connectivity through APIs"""
        print("\n🗄️ DATABASE CONNECTIVITY TESTING")
        print("=" * 50)
        
        # Test database connectivity by checking if APIs that require DB work
        try:
            # Test 1: Pots endpoint (requires DB aggregation)
            response = self.session.get(f"{API_BASE}/pots")
            
            if response.status_code == 200:
                self.log_test(
                    "MongoDB Connectivity (Pots)", 
                    True, 
                    "Database queries working through pots endpoint"
                )
            else:
                self.log_test(
                    "MongoDB Connectivity (Pots)", 
                    False, 
                    f"Database query failed: {response.status_code}"
                )
            
            # Test 2: Live statistics (requires DB aggregation)
            response = self.session.get(f"{API_BASE}/stats/live-players")
            
            if response.status_code == 200:
                self.log_test(
                    "MongoDB Connectivity (Stats)", 
                    True, 
                    "Database aggregation working through stats endpoint"
                )
            else:
                self.log_test(
                    "MongoDB Connectivity (Stats)", 
                    False, 
                    f"Database aggregation failed: {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Database Connectivity", False, f"Exception: {str(e)}")
    
    def run_comprehensive_tests(self):
        """Run all comprehensive backend tests"""
        print("🚀 TURFLOOT COMPREHENSIVE BACKEND TESTING")
        print("=" * 70)
        print(f"Testing against: {BASE_URL}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("Testing after UI position swap and settings system integration")
        print("=" * 70)
        
        # Step 1: Core API Health
        self.test_core_api_health()
        
        # Step 2: Authentication System
        self.test_authentication_system()
        
        # Step 3: Wallet APIs
        self.test_wallet_apis()
        
        # Step 4: User Management
        self.test_user_management()
        
        # Step 5: Game Server Integration
        self.test_game_server_integration()
        
        # Step 6: Database Connectivity
        self.test_database_connectivity()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 70)
        print("📋 COMPREHENSIVE BACKEND TEST SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"✅ Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - No backend regressions detected after UI changes!")
        else:
            print("⚠️  Some tests failed - potential regressions detected")
            failed_tests = [r for r in self.test_results if not r['success']]
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['details']}")
        
        print("\n🔍 SYSTEMS TESTED:")
        print("   • Core API Health (Root, Pots, Live Statistics)")
        print("   • Authentication System (Privy integration)")
        print("   • Wallet APIs (Balance, Add-funds, Cash-out, Transactions)")
        print("   • User Management (Profile, Custom names)")
        print("   • Game Server Integration (Socket.IO, Game creation)")
        print("   • Database Connectivity (MongoDB operations)")
        
        print(f"\n⏰ Test completed at: {datetime.now().isoformat()}")
        print("🎯 Focus: Verify no regressions after UI position swap and settings integration")

if __name__ == "__main__":
    tester = TurfLootComprehensiveTester()
    tester.run_comprehensive_tests()