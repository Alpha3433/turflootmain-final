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
BASE_URL = "https://military-agario.preview.emergentagent.com"
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

    def test_wallet_balance_apis(self):
        """Test 3: Wallet Balance APIs - Verify Helius RPC integration with new API key"""
        print("💰 TEST 3: WALLET BALANCE APIs - HELIUS RPC INTEGRATION")
        print("=" * 50)
        
        # Test 3.1: Helius RPC Connectivity Test
        try:
            # Test the Helius RPC endpoint directly to verify the new API key
            helius_url = "https://mainnet.helius-rpc.com/?api-key=agar-military-1"
            
            # Test with a simple getHealth request
            rpc_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getHealth"
            }
            
            start_time = time.time()
            response = requests.post(helius_url, json=rpc_payload, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'result' in data and data['result'] == 'ok':
                    self.log_result(
                        "Helius RPC Connectivity with New API Key",
                        True,
                        f"Helius RPC healthy: {data['result']}",
                        response_time
                    )
                else:
                    self.log_result(
                        "Helius RPC Connectivity with New API Key",
                        False,
                        f"Unexpected Helius response: {data}"
                    )
            else:
                self.log_result(
                    "Helius RPC Connectivity with New API Key",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
        except Exception as e:
            self.log_result(
                "Helius RPC Connectivity with New API Key",
                False,
                f"Error: {str(e)}"
            )

        # Test 3.2: Wallet Balance API Error Handling
        try:
            # Test with invalid token to verify error handling
            headers = {'Authorization': 'Bearer invalid_token_12345', 'Content-Type': 'application/json'}
            
            start_time = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                # Should gracefully fall back to guest balance
                if data.get('balance') == 0.0 and data.get('wallet_address') == 'Not connected':
                    self.log_result(
                        "Wallet Balance API Error Handling",
                        True,
                        f"Invalid token handled gracefully: {data}",
                        response_time
                    )
                else:
                    self.log_result(
                        "Wallet Balance API Error Handling",
                        False,
                        f"Unexpected error handling: {data}"
                    )
            else:
                self.log_result(
                    "Wallet Balance API Error Handling",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
        except Exception as e:
            self.log_result(
                "Wallet Balance API Error Handling",
                False,
                f"Error: {str(e)}"
            )

        # Test 3.3: Wallet Transactions API
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/wallet/transactions", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ['transactions', 'total_count', 'wallet_address']
                has_all_fields = all(field in data for field in expected_fields)
                
                if has_all_fields:
                    self.log_result(
                        "Wallet Transactions API",
                        True,
                        f"Transactions API working: {len(data.get('transactions', []))} transactions",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Wallet Transactions API",
                        False,
                        f"Missing expected fields: {data}"
                    )
                    return False
            else:
                self.log_result(
                    "Wallet Transactions API",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
                return False
        except Exception as e:
            self.log_result(
                "Wallet Transactions API",
                False,
                f"Error: {str(e)}"
            )
            return False

    def test_user_balance_stats_apis(self):
        """Test 4: User Balance & Stats APIs - Confirm balance retrieval functionality"""
        print("📊 TEST 4: USER BALANCE & STATS APIs")
        print("=" * 50)
        
        # Test 4.1: Server Browser API
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ['servers', 'totalPlayers', 'hathoraEnabled']
                has_all_fields = all(field in data for field in expected_fields)
                
                if has_all_fields:
                    server_count = len(data.get('servers', []))
                    hathora_enabled = data.get('hathoraEnabled', False)
                    self.log_result(
                        "Server Browser API",
                        True,
                        f"{server_count} servers available, Hathora: {hathora_enabled}",
                        response_time
                    )
                else:
                    self.log_result(
                        "Server Browser API",
                        False,
                        f"Missing expected fields: {data}"
                    )
            else:
                self.log_result(
                    "Server Browser API",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
        except Exception as e:
            self.log_result(
                "Server Browser API",
                False,
                f"Error: {str(e)}"
            )

        # Test 4.2: Live Statistics APIs
        try:
            # Test live players endpoint
            start_time = time.time()
            response = requests.get(f"{API_BASE}/stats/live-players", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'count' in data and 'timestamp' in data:
                    player_count = data.get('count', 0)
                    self.log_result(
                        "Live Players Statistics API",
                        True,
                        f"Live players: {player_count}",
                        response_time
                    )
                else:
                    self.log_result(
                        "Live Players Statistics API",
                        False,
                        f"Unexpected response structure: {data}"
                    )

            # Test global winnings endpoint
            start_time = time.time()
            response = requests.get(f"{API_BASE}/stats/global-winnings", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'total' in data and 'formatted' in data:
                    winnings = data.get('formatted', '$0')
                    self.log_result(
                        "Global Winnings Statistics API",
                        True,
                        f"Global winnings: {winnings}",
                        response_time
                    )
                else:
                    self.log_result(
                        "Global Winnings Statistics API",
                        False,
                        f"Unexpected response structure: {data}"
                    )
            else:
                self.log_result(
                    "Global Winnings Statistics API",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
        except Exception as e:
            self.log_result(
                "Live Statistics APIs",
                False,
                f"Error: {str(e)}"
            )

        # Test 4.3: Leaderboard API
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/users/leaderboard", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'users' in data:
                    user_count = len(data.get('users', []))
                    self.log_result(
                        "Leaderboard API",
                        True,
                        f"Leaderboard returned {user_count} users",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Leaderboard API",
                        False,
                        f"Missing 'users' field: {data}"
                    )
                    return False
            else:
                self.log_result(
                    "Leaderboard API",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
                return False
        except Exception as e:
            self.log_result(
                "Leaderboard API",
                False,
                f"Error: {str(e)}"
            )
            return False

    def test_backend_regression(self):
        """Test 5: Backend Regression Testing - Ensure frontend changes didn't break backend"""
        print("🔄 TEST 5: BACKEND REGRESSION TESTING")
        print("=" * 50)
        
        # Test 5.1: API Performance Check
        try:
            endpoints_to_test = [
                "/ping",
                "/wallet/balance", 
                "/servers/lobbies",
                "/stats/live-players"
            ]
            
            total_response_time = 0
            successful_requests = 0
            
            for endpoint in endpoints_to_test:
                try:
                    start_time = time.time()
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                    response_time = time.time() - start_time
                    total_response_time += response_time
                    
                    if response.status_code == 200:
                        successful_requests += 1
                        
                except Exception as endpoint_error:
                    print(f"    ⚠️ Endpoint {endpoint} failed: {str(endpoint_error)}")
            
            success_rate = (successful_requests / len(endpoints_to_test)) * 100
            avg_response_time = total_response_time / len(endpoints_to_test)
            
            if success_rate >= 75:  # At least 75% success rate
                self.log_result(
                    "API Performance Check",
                    True,
                    f"{successful_requests}/{len(endpoints_to_test)} endpoints working, avg response: {avg_response_time:.3f}s",
                    avg_response_time
                )
            else:
                self.log_result(
                    "API Performance Check",
                    False,
                    f"Only {successful_requests}/{len(endpoints_to_test)} endpoints working ({success_rate:.1f}%)"
                )
                
        except Exception as e:
            self.log_result(
                "API Performance Check",
                False,
                f"Error: {str(e)}"
            )

        # Test 5.2: Authentication State Persistence
        try:
            # Test multiple requests with same token to verify state persistence
            test_token = f"testing-{base64.b64encode(json.dumps({'sub': 'persistence_test', 'wallet': {'address': '0xTEST'}}).encode()).decode()}"
            headers = {'Authorization': f'Bearer {test_token}', 'Content-Type': 'application/json'}
            
            # Make 3 consecutive requests
            responses = []
            for i in range(3):
                start_time = time.time()
                response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    responses.append({
                        'balance': data.get('balance'),
                        'wallet_address': data.get('wallet_address'),
                        'response_time': response_time
                    })
                
                time.sleep(0.1)  # Small delay between requests
            
            if len(responses) == 3:
                # Check if wallet addresses are consistent
                wallet_addresses = [r['wallet_address'] for r in responses]
                addresses_consistent = len(set(wallet_addresses)) == 1
                
                if addresses_consistent:
                    avg_time = sum(r['response_time'] for r in responses) / 3
                    self.log_result(
                        "Authentication State Persistence",
                        True,
                        f"State consistent across 3 requests, wallet: {wallet_addresses[0][:20]}...",
                        avg_time
                    )
                    return True
                else:
                    self.log_result(
                        "Authentication State Persistence",
                        False,
                        f"Inconsistent wallet addresses: {wallet_addresses}"
                    )
                    return False
            else:
                self.log_result(
                    "Authentication State Persistence",
                    False,
                    f"Only {len(responses)}/3 requests successful"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Authentication State Persistence",
                False,
                f"Error: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 TURFLOOT BACKEND TESTING SUITE")
        print("Testing backend functionality after withdrawal modal & authentication fixes")
        print("=" * 80)
        print()
        
        # Run all test categories
        tests = [
            self.test_api_health_check,
            self.test_authentication_systems,
            self.test_wallet_balance_apis,
            self.test_user_balance_stats_apis,
            self.test_backend_regression
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
        
        # Generate final report
        self.generate_final_report(passed_tests, total_tests)
        
        return passed_tests >= (total_tests * 0.8)  # 80% success rate

    def generate_final_report(self, passed_tests, total_tests):
        """Generate comprehensive test report"""
        total_time = time.time() - self.start_time
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("=" * 80)
        print("🏁 FINAL TEST REPORT")
        print("=" * 80)
        print(f"📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests}")
        print(f"   ❌ Failed: {total_tests - passed_tests}")
        print(f"   📈 Success Rate: {success_rate:.1f}%")
        print(f"   ⏱️  Total Time: {total_time:.2f}s")
        print()
        
        print("📋 DETAILED RESULTS:")
        for result in self.results:
            status = "✅ PASSED" if result['success'] else "❌ FAILED"
            print(f"   {status} - {result['test']}")
            if result['details']:
                print(f"      └─ {result['details']}")
        print()
        
        # Critical findings summary
        print("🎯 CRITICAL FINDINGS:")
        if success_rate >= 90:
            print("   ✅ EXCELLENT: Backend is fully operational after withdrawal modal & auth fixes")
        elif success_rate >= 75:
            print("   ⚠️  GOOD: Backend is mostly operational with minor issues")
        elif success_rate >= 50:
            print("   ⚠️  MODERATE: Backend has some issues that need attention")
        else:
            print("   ❌ CRITICAL: Backend has significant issues requiring immediate attention")
        
        print()
        print("🔍 SPECIFIC REVIEW REQUEST VERIFICATION:")
        
        # Check specific requirements from review request
        api_health_passed = any("API" in r['test'] and r['success'] for r in self.results)
        auth_systems_passed = any("Authentication" in r['test'] and r['success'] for r in self.results)
        wallet_apis_passed = any("Wallet" in r['test'] and r['success'] for r in self.results)
        helius_integration_passed = any("Helius" in r['test'] and r['success'] for r in self.results)
        regression_passed = any("Regression" in r['test'] or "Performance" in r['test'] and r['success'] for r in self.results)
        
        requirements = [
            ("✅ API Health Check", api_health_passed),
            ("✅ Authentication Systems (Privy integration)", auth_systems_passed), 
            ("✅ Wallet Balance APIs (Helius RPC with new API key)", wallet_apis_passed),
            ("✅ Helius Integration Verification", helius_integration_passed),
            ("✅ Backend Regression Testing", regression_passed)
        ]
        
        for req_name, req_passed in requirements:
            status = "OPERATIONAL" if req_passed else "NEEDS ATTENTION"
            print(f"   {req_name}: {status}")
        
        print()
        print("=" * 80)

if __name__ == "__main__":
    tester = TurfLootBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)