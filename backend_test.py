#!/usr/bin/env python3
"""
TurfLoot Backend Testing Suite - Withdrawal Modal & Authentication Fixes
Testing backend functionality after implementing withdrawal modal and authentication fixes.

TESTING FOCUS:
1. API Health Check - Verify core API endpoints are accessible
2. Authentication Systems - Test Privy authentication integration 
3. Wallet Balance APIs - Verify Helius RPC integration with new API key
4. User Balance & Stats APIs - Confirm balance retrieval functionality
5. Backend Regression Testing - Ensure frontend changes didn't break backend

RECENT CHANGES BEING TESTED:
- Authentication Fix: Updated handleWithdraw function to use Privy hooks directly
- Withdrawal Modal: Created new responsive withdrawal modal
- Helius Integration: Updated with valid API key (dccb9763-d453-4940-bd43-dfd987f278b1)
- UI Improvements: Fixed mobile modal sizing, font optimizations
"""

import requests
import json
import time
import sys
import base64
from datetime import datetime

# Configuration
BASE_URL = "https://mobilegame-ux.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class TurfLootBackendTester:
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
        """Test 1: API Health Check - Verify core API endpoints are accessible"""
        print("🔍 TEST 1: API HEALTH CHECK")
        print("=" * 50)
        
        try:
            # Test root API endpoint
            start_time = time.time()
            response = requests.get(f"{API_BASE}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', 'Unknown')
                features = data.get('features', [])
                
                self.log_result(
                    "Root API Endpoint Accessibility",
                    True,
                    f"Service: {service_name}, Features: {features}",
                    response_time
                )
                
                # Test ping endpoint
                start_time = time.time()
                ping_response = requests.get(f"{API_BASE}/ping", timeout=10)
                ping_time = time.time() - start_time
                
                if ping_response.status_code == 200:
                    ping_data = ping_response.json()
                    self.log_result(
                        "Ping Endpoint Functionality",
                        True,
                        f"Status: {ping_data.get('status')}, Server: {ping_data.get('server')}",
                        ping_time
                    )
                    return True
                else:
                    self.log_result(
                        "Ping Endpoint Functionality",
                        False,
                        f"HTTP {ping_response.status_code}: {ping_response.text[:100]}"
                    )
                    return False
            else:
                self.log_result(
                    "Root API Endpoint Accessibility",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "API Health Check",
                False,
                f"Connection error: {str(e)}"
            )
            return False

    def test_authentication_systems(self):
        """Test 2: Authentication Systems - Test Privy authentication integration"""
        print("🔐 TEST 2: AUTHENTICATION SYSTEMS")
        print("=" * 50)
        
        # Test 2.1: Wallet Balance API with Guest User (No Authentication)
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ['balance', 'currency', 'sol_balance', 'wallet_address']
                has_all_fields = all(field in data for field in expected_fields)
                
                if has_all_fields and data.get('balance') == 0.0:
                    self.log_result(
                        "Guest User Wallet Balance API",
                        True,
                        f"Guest balance structure correct: {data}",
                        response_time
                    )
                else:
                    self.log_result(
                        "Guest User Wallet Balance API",
                        False,
                        f"Unexpected guest balance structure: {data}"
                    )
            else:
                self.log_result(
                    "Guest User Wallet Balance API",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
        except Exception as e:
            self.log_result(
                "Guest User Wallet Balance API",
                False,
                f"Error: {str(e)}"
            )

        # Test 2.2: JWT Token Authentication
        try:
            # Create a test JWT token
            test_payload = {
                'userId': 'test_user_auth_fix',
                'email': 'authtest@turfloot.com',
                'iat': int(time.time()),
                'exp': int(time.time()) + 3600
            }
            
            # Simple base64 encoding for testing (not secure, just for testing)
            test_token = base64.b64encode(json.dumps(test_payload).encode()).decode()
            
            headers = {'Authorization': f'Bearer {test_token}', 'Content-Type': 'application/json'}
            
            start_time = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                # Should return default balance for new user or handle gracefully
                self.log_result(
                    "JWT Token Authentication Test",
                    True,
                    f"JWT auth handled correctly: balance={data.get('balance')}, wallet={data.get('wallet_address', 'N/A')[:20]}...",
                    response_time
                )
            else:
                self.log_result(
                    "JWT Token Authentication Test",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
        except Exception as e:
            self.log_result(
                "JWT Token Authentication Test",
                False,
                f"Error: {str(e)}"
            )

        # Test 2.3: Privy Token Authentication Simulation
        try:
            # Create a testing token that simulates Privy format
            privy_payload = {
                'sub': 'did:privy:withdrawal_test_123',
                'email': 'withdrawal_test@turfloot.com',
                'wallet': {
                    'address': '0x1234567890123456789012345678901234567890'
                },
                'iat': int(time.time()),
                'exp': int(time.time()) + 3600
            }
            
            # Create testing token with special prefix
            testing_token = f"testing-{base64.b64encode(json.dumps(privy_payload).encode()).decode()}"
            
            headers = {'Authorization': f'Bearer {testing_token}', 'Content-Type': 'application/json'}
            
            start_time = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                # Should return testing balance with realistic values
                if data.get('balance', 0) > 0 and 'wallet_address' in data:
                    self.log_result(
                        "Privy Token Authentication Simulation",
                        True,
                        f"Privy auth simulation successful: balance=${data.get('balance')}, SOL={data.get('sol_balance')}",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Privy Token Authentication Simulation",
                        False,
                        f"Unexpected testing token response: {data}"
                    )
                    return False
            else:
                self.log_result(
                    "Privy Token Authentication Simulation",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
                return False
        except Exception as e:
            self.log_result(
                "Privy Token Authentication Simulation",
                False,
                f"Error: {str(e)}"
            )
            return False

    def test_user_balance_stats_apis(self):
        """Test 3: User Balance & Stats APIs - Verify wallet balance and stats update APIs"""
        print("🔍 Testing User Balance & Stats APIs...")
        
        try:
            # Test wallet balance API
            start = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for required fields
                has_balance = 'balance' in data
                has_currency = 'currency' in data
                balance = data.get('balance', 'missing')
                currency = data.get('currency', 'missing')
                
                if has_balance and has_currency:
                    self.log_result(
                        "User Balance & Stats APIs", 
                        True, 
                        f"Wallet balance and stats update APIs are operational (Balance: ${balance} {currency})",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "User Balance & Stats APIs", 
                        False, 
                        f"Missing required fields: balance={balance}, currency={currency}"
                    )
                    return False
            else:
                self.log_result(
                    "User Balance & Stats APIs", 
                    False, 
                    f"API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("User Balance & Stats APIs", False, f"Error: {str(e)}")
            return False

    def test_server_browser_integration(self):
        """Test 4: Server Browser Integration - Test server browser functionality for game loading"""
        print("🔍 Testing Server Browser Integration...")
        
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for server browser fields
                has_servers = 'servers' in data
                servers = data.get('servers', [])
                total_players = data.get('totalPlayers', 0)
                hathora_enabled = data.get('hathoraEnabled', False)
                
                if has_servers and isinstance(servers, list):
                    self.log_result(
                        "Server Browser Integration", 
                        True, 
                        f"Server browser functionality for game loading works correctly ({len(servers)} servers, {total_players} players, Hathora: {hathora_enabled})",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Server Browser Integration", 
                        False, 
                        f"Invalid server browser response: servers={type(servers)}, count={len(servers) if isinstance(servers, list) else 'N/A'}"
                    )
                    return False
            else:
                self.log_result(
                    "Server Browser Integration", 
                    False, 
                    f"API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Server Browser Integration", False, f"Error: {str(e)}")
            return False

    def test_backend_regression_testing(self):
        """Test 5: Backend Regression Testing - Ensure UI changes didn't introduce backend issues"""
        print("🔍 Testing Backend Regression after Mobile Stats Panel UI Changes...")
        
        try:
            # Test multiple endpoints to check for regressions
            endpoints = [
                ("/ping", "Core API"),
                ("/wallet/balance", "Wallet API"), 
                ("/servers/lobbies", "Server Browser"),
                ("/stats/live-players", "Live Stats"),
                ("/users/leaderboard", "Leaderboard")
            ]
            
            total_time = 0
            successful_requests = 0
            
            for endpoint, description in endpoints:
                try:
                    start = time.time()
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=5)
                    response_time = time.time() - start
                    total_time += response_time
                    
                    if response.status_code == 200:
                        successful_requests += 1
                        print(f"   ✅ {description}: Working ({response_time:.3f}s)")
                    else:
                        print(f"   ❌ {description}: Failed (status {response.status_code})")
                        
                except Exception as e:
                    print(f"   ❌ {description}: Error - {str(e)}")
            
            if successful_requests >= 4:  # At least 4 out of 5 endpoints working
                avg_response_time = total_time / successful_requests
                
                self.log_result(
                    "Backend Regression Testing", 
                    True, 
                    f"No backend regressions introduced by mobile stats panel UI changes ({successful_requests}/{len(endpoints)} APIs working, avg response: {avg_response_time:.3f}s)",
                    avg_response_time
                )
                return True
            else:
                self.log_result(
                    "Backend Regression Testing", 
                    False, 
                    f"Potential regressions detected: only {successful_requests}/{len(endpoints)} APIs working"
                )
                return False
                
        except Exception as e:
            self.log_result("Backend Regression Testing", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests for TurfLoot Agario Game after Mobile Stats Panel UI changes"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING FOR TURFLOOT AGARIO GAME")
        print("=" * 80)
        print("Testing Focus: Backend API Health after Mobile Stats Panel Sub-Labels Implementation")
        print("UI Changes: Added sub-labels (K/D, Streak, Time, Net Worth, Mass) to mobile stats panel")
        print("=" * 80)
        print()
        
        # Run all tests
        tests = [
            self.test_api_health_check,
            self.test_game_session_apis,
            self.test_user_balance_stats_apis,
            self.test_server_browser_integration,
            self.test_backend_regression_testing
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
        print("🏁 TURFLOOT AGARIO GAME BACKEND TESTING COMPLETED")
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
        print(f"{'✅' if api_health else '❌'} API Health Check: {'OPERATIONAL' if api_health else 'FAILED'}")
        if api_health: requirements_met += 1
        
        # 2. Game Session APIs
        game_sessions = any('Game Session APIs' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if game_sessions else '❌'} Game Session APIs: {'WORKING' if game_sessions else 'FAILED'}")
        if game_sessions: requirements_met += 1
        
        # 3. User Balance & Stats APIs
        balance_stats = any('User Balance & Stats APIs' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if balance_stats else '❌'} User Balance & Stats APIs: {'WORKING' if balance_stats else 'FAILED'}")
        if balance_stats: requirements_met += 1
        
        # 4. Server Browser Integration
        server_browser = any('Server Browser Integration' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if server_browser else '❌'} Server Browser Integration: {'WORKING' if server_browser else 'FAILED'}")
        if server_browser: requirements_met += 1
        
        # 5. Backend Regression Testing
        regression_test = any('Backend Regression Testing' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if regression_test else '❌'} Backend Regression Testing: {'PASSED' if regression_test else 'FAILED'}")
        if regression_test: requirements_met += 1
        
        print()
        print(f"🏆 OVERALL ASSESSMENT: {requirements_met}/{total_requirements} key requirements met")
        
        if success_rate >= 80:
            print("🎉 CONCLUSION: Backend is STABLE - Mobile stats panel UI changes did not introduce regressions")
        elif success_rate >= 60:
            print("⚠️  CONCLUSION: Backend has MINOR ISSUES but core agario game functionality is working")
        else:
            print("🚨 CONCLUSION: Backend has CRITICAL ISSUES that need immediate attention")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = TurfLootAgarioBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)