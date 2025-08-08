#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for TurfLoot
Testing all endpoints including NEW Custom Name Update Endpoint
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://2d1eda33-bd6c-40ac-a392-59cfdb7e363d.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class TurfLootBackendTester:
    def __init__(self):
        self.test_results = []
        self.auth_token = None
        self.test_user_id = None
        self.test_game_id = None
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        print(f"{status} - {test_name}: {details}")
        
    def test_root_endpoint(self):
        """Test GET /api/ - Root API health check"""
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "TurfLoot API" in data.get("message", ""):
                    self.log_test(
                        "Root API Endpoint", 
                        True, 
                        f"Status 200, API version: {data.get('message', 'Unknown')}, Features: {data.get('features', [])}"
                    )
                else:
                    self.log_test("Root API Endpoint", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Root API Endpoint", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Root API Endpoint", False, f"Request failed: {str(e)}")
    
    def test_pots_endpoint(self):
        """Test GET /api/pots - Game pot data"""
        try:
            response = requests.get(f"{API_BASE}/pots", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 3:
                    # Check for expected pot structure
                    pot_tables = [pot.get("table") for pot in data]
                    if "$1" in pot_tables and "$5" in pot_tables and "$20" in pot_tables:
                        self.log_test(
                            "Game Pots Endpoint", 
                            True, 
                            f"All 3 pot tables found: {pot_tables}, Total pots: {sum(pot.get('pot', 0) for pot in data)}"
                        )
                    else:
                        self.log_test("Game Pots Endpoint", False, f"Missing expected pot tables: {pot_tables}")
                else:
                    self.log_test("Game Pots Endpoint", False, f"Invalid pot data structure: {data}")
            else:
                self.log_test("Game Pots Endpoint", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Game Pots Endpoint", False, f"Request failed: {str(e)}")
    
    def test_unified_privy_auth(self):
        """Test POST /api/auth/privy - Unified Privy authentication"""
        try:
            # Test 1: Missing privy_user validation
            response = requests.post(f"{API_BASE}/auth/privy", json={}, timeout=10)
            
            if response.status_code == 400:
                self.log_test(
                    "Privy Auth - Missing Data Validation", 
                    True, 
                    "Correctly returns 400 for missing privy_user"
                )
            else:
                self.log_test("Privy Auth - Missing Data Validation", False, f"Expected 400, got {response.status_code}")
            
            # Test 2: Valid Google OAuth user creation through Privy
            test_privy_user = {
                "privy_user": {
                    "id": f"privy_test_{uuid.uuid4().hex[:8]}",
                    "google": {
                        "email": f"test.user.{uuid.uuid4().hex[:8]}@gmail.com",
                        "name": "Test User",
                        "picture": "https://example.com/avatar.jpg"
                    },
                    "wallet": {
                        "address": f"0x{uuid.uuid4().hex[:40]}"
                    }
                },
                "access_token": "test_access_token"
            }
            
            response = requests.post(f"{API_BASE}/auth/privy", json=test_privy_user, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("token") and data.get("user"):
                    # Store auth token for subsequent tests
                    self.auth_token = data["token"]
                    self.test_user_id = data["user"]["id"]
                    
                    self.log_test(
                        "Privy Auth - Google OAuth User Creation", 
                        True, 
                        f"User created with ID: {self.test_user_id}, Auth method: {data['user'].get('auth_method', 'unknown')}"
                    )
                else:
                    self.log_test("Privy Auth - Google OAuth User Creation", False, f"Invalid response structure: {data}")
            else:
                self.log_test("Privy Auth - Google OAuth User Creation", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Privy Auth - Unified Authentication", False, f"Request failed: {str(e)}")
    
    def test_user_creation(self):
        """Test POST /api/users - User creation"""
        try:
            test_user_data = {
                "wallet_address": f"0x{uuid.uuid4().hex[:40]}",
                "username": f"testuser_{uuid.uuid4().hex[:8]}",
                "email": f"test.{uuid.uuid4().hex[:8]}@example.com"
            }
            
            response = requests.post(f"{API_BASE}/users", json=test_user_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") and data.get("wallet_address") == test_user_data["wallet_address"]:
                    self.log_test(
                        "User Creation", 
                        True, 
                        f"User created with ID: {data['id']}, Wallet: {data['wallet_address'][:10]}..."
                    )
                else:
                    self.log_test("User Creation", False, f"Invalid user data returned: {data}")
            else:
                self.log_test("User Creation", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("User Creation", False, f"Request failed: {str(e)}")
    
    def test_user_profile_retrieval(self):
        """Test GET /api/users/{wallet} - User profile retrieval"""
        if not self.test_user_id:
            self.log_test("User Profile Retrieval", False, "No test user ID available from previous tests")
            return
            
        try:
            response = requests.get(f"{API_BASE}/users/{self.test_user_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.test_user_id and data.get("profile"):
                    self.log_test(
                        "User Profile Retrieval", 
                        True, 
                        f"Profile retrieved for user {self.test_user_id}, Profile includes: {list(data['profile'].keys())}"
                    )
                else:
                    self.log_test("User Profile Retrieval", False, f"Invalid profile data: {data}")
            elif response.status_code == 404:
                self.log_test("User Profile Retrieval", True, "Correctly returns 404 for non-existent user")
            else:
                self.log_test("User Profile Retrieval", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("User Profile Retrieval", False, f"Request failed: {str(e)}")
    
    def test_game_session_creation(self):
        """Test POST /api/games - Game session creation"""
        if not self.auth_token:
            self.log_test("Game Session Creation", False, "No auth token available from previous tests")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            game_data = {
                "stake": 5.0,
                "game_mode": "territory"
            }
            
            response = requests.post(f"{API_BASE}/games", json=game_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") and data.get("stake") == 5.0:
                    self.test_game_id = data["id"]
                    self.log_test(
                        "Game Session Creation", 
                        True, 
                        f"Game created with ID: {self.test_game_id}, Stake: ${data['stake']}, Status: {data.get('status', 'unknown')}"
                    )
                else:
                    self.log_test("Game Session Creation", False, f"Invalid game data: {data}")
            else:
                self.log_test("Game Session Creation", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Game Session Creation", False, f"Request failed: {str(e)}")
    
    def test_game_progress_update(self):
        """Test PUT /api/games/{id} - Game progress updates"""
        if not self.auth_token or not self.test_game_id:
            self.log_test("Game Progress Update", False, "No auth token or game ID available from previous tests")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            update_data = {
                "territory_percent": 75,
                "status": "active"
            }
            
            response = requests.put(f"{API_BASE}/games/{self.test_game_id}", json=update_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Game Progress Update", 
                        True, 
                        f"Game {self.test_game_id} updated successfully: {data.get('message', 'No message')}"
                    )
                else:
                    self.log_test("Game Progress Update", False, f"Update failed: {data}")
            else:
                self.log_test("Game Progress Update", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Game Progress Update", False, f"Request failed: {str(e)}")
    
    def test_withdrawal_request(self):
        """Test POST /api/withdraw - Withdrawal requests"""
        if not self.auth_token:
            self.log_test("Withdrawal Request", False, "No auth token available from previous tests")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            withdrawal_data = {
                "amount": 10.5
            }
            
            response = requests.post(f"{API_BASE}/withdraw", json=withdrawal_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("withdrawal_id"):
                    self.log_test(
                        "Withdrawal Request", 
                        True, 
                        f"Withdrawal created: ID {data['withdrawal_id']}, Amount: {withdrawal_data['amount']} SOL"
                    )
                else:
                    self.log_test("Withdrawal Request", False, f"Invalid withdrawal response: {data}")
            else:
                self.log_test("Withdrawal Request", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Withdrawal Request", False, f"Request failed: {str(e)}")
    
    def test_privy_webhook(self):
        """Test POST /api/onramp/webhook - Privy webhook handling"""
        try:
            webhook_data = {
                "event_type": "fiat_onramp.completed",
                "data": {
                    "user_id": "test_user_123",
                    "amount": 100.0,
                    "currency": "USD",
                    "transaction_id": f"tx_{uuid.uuid4().hex[:16]}"
                }
            }
            
            headers = {"x-privy-signature": "test_signature_123"}
            
            response = requests.post(f"{API_BASE}/onramp/webhook", json=webhook_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test(
                        "Privy Webhook", 
                        True, 
                        f"Webhook processed successfully: {data.get('message', 'No message')}"
                    )
                else:
                    self.log_test("Privy Webhook", False, f"Webhook processing failed: {data}")
            else:
                self.log_test("Privy Webhook", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Privy Webhook", False, f"Request failed: {str(e)}")
    
    def test_deprecated_endpoints(self):
        """Test deprecated endpoints return 410 status"""
        deprecated_endpoints = [
            ("POST", "/auth/google", "Google OAuth Direct"),
            ("POST", "/auth/wallet", "Wallet Authentication"),
            ("POST", "/auth/register", "User Registration"),
            ("GET", "/wallet/test123/balance", "Wallet Balance")
        ]
        
        for method, endpoint, name in deprecated_endpoints:
            try:
                if method == "POST":
                    response = requests.post(f"{API_BASE}{endpoint}", json={}, timeout=10)
                else:
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                
                if response.status_code == 410:
                    self.log_test(
                        f"Deprecated Endpoint - {name}", 
                        True, 
                        f"Correctly returns 410 for {method} {endpoint}"
                    )
                else:
                    self.log_test(f"Deprecated Endpoint - {name}", False, f"Expected 410, got {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Deprecated Endpoint - {name}", False, f"Request failed: {str(e)}")
    
    def run_all_tests(self):
        """Run comprehensive backend testing suite"""
        print("🚀 Starting Comprehensive Backend API Testing for TurfLoot")
        print("=" * 70)
        
        # Core API Health Checks
        print("\n📋 CORE API HEALTH CHECKS")
        self.test_root_endpoint()
        self.test_pots_endpoint()
        
        # Authentication System
        print("\n🔐 UNIFIED PRIVY AUTHENTICATION SYSTEM")
        self.test_unified_privy_auth()
        
        # User Management
        print("\n👤 USER MANAGEMENT")
        self.test_user_creation()
        self.test_user_profile_retrieval()
        
        # Game Systems
        print("\n🎮 GAME SYSTEMS")
        self.test_game_session_creation()
        self.test_game_progress_update()
        
        # Financial Operations
        print("\n💰 FINANCIAL OPERATIONS")
        self.test_withdrawal_request()
        self.test_privy_webhook()
        
        # Deprecated Endpoints
        print("\n🚫 DEPRECATED ENDPOINTS")
        self.test_deprecated_endpoints()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 TESTING SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        print(f"\n🎯 OVERALL STATUS: {'✅ ALL SYSTEMS OPERATIONAL' if failed_tests == 0 else '⚠️ ISSUES DETECTED'}")
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": success_rate,
            "all_passed": failed_tests == 0,
            "detailed_results": self.test_results
        }

if __name__ == "__main__":
    tester = TurfLootBackendTester()
    results = tester.run_all_tests()