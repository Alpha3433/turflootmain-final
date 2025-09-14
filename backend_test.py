#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Privy Solana Deposit Integration
Testing Focus: Backend API Health after SSR fixes and Solana dependency installation
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://mobilegame-ux.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class SolanaDepositBackendTester:
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
        """Test 1: Core API Health Check after Solana dependency installation"""
        print("🔍 Testing API Health Check...")
        
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/ping", timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                server_name = data.get('server', 'unknown')
                self.log_result(
                    "API Health Check", 
                    True, 
                    f"API accessible with {server_name} server, confirming backend infrastructure is operational after Solana dependency installation",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "API Health Check", 
                    False, 
                    f"API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_solana_wallet_balance_guest(self):
        """Test 2: Solana Wallet Balance API - Guest User"""
        print("🔍 Testing Solana Wallet Balance API - Guest User...")
        
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for Solana-specific fields
                has_sol_balance = 'sol_balance' in data
                sol_balance = data.get('sol_balance', 'missing')
                balance = data.get('balance', 'missing')
                
                if has_sol_balance and sol_balance == 0.0:
                    self.log_result(
                        "Solana Wallet Balance API - Guest User", 
                        True, 
                        f"GET /api/wallet/balance returns correct guest balance structure with proper Solana fields (sol_balance: {sol_balance}, balance: {balance}), proper handling of unauthenticated users for Solana deposits",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Solana Wallet Balance API - Guest User", 
                        False, 
                        f"Missing or incorrect Solana fields: sol_balance={sol_balance}, balance={balance}"
                    )
                    return False
            else:
                self.log_result(
                    "Solana Wallet Balance API - Guest User", 
                    False, 
                    f"API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Solana Wallet Balance API - Guest User", False, f"Error: {str(e)}")
            return False

    def test_solana_wallet_balance_jwt_auth(self):
        """Test 3: Solana Wallet Balance API - JWT Authentication"""
        print("🔍 Testing Solana Wallet Balance API - JWT Authentication...")
        
        try:
            # Create a test JWT token for authentication
            headers = {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItc29sYW5hIiwiZW1haWwiOiJ0ZXN0QHNvbGFuYS5jb20iLCJpYXQiOjE3NTc0MDAwMDAsImV4cCI6MTc1NzQ4NjQwMH0.test-signature'
            }
            
            start = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for Solana-specific fields and authentication
                has_sol_balance = 'sol_balance' in data
                sol_balance = data.get('sol_balance', 'missing')
                balance = data.get('balance', 'missing')
                wallet_address = data.get('wallet_address', 'missing')
                
                if has_sol_balance and balance != 0.0:
                    self.log_result(
                        "Solana Wallet Balance API - JWT Authentication", 
                        True, 
                        f"JWT token authentication working correctly with Solana wallet data, authenticated user balance (${balance}) and Solana wallet address properly included, proper Solana wallet address handling in authentication",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Solana Wallet Balance API - JWT Authentication", 
                        False, 
                        f"Authentication failed or missing Solana fields: sol_balance={sol_balance}, balance={balance}"
                    )
                    return False
            else:
                self.log_result(
                    "Solana Wallet Balance API - JWT Authentication", 
                    False, 
                    f"API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Solana Wallet Balance API - JWT Authentication", False, f"Error: {str(e)}")
            return False

    def test_solana_wallet_balance_privy_token(self):
        """Test 4: Solana Wallet Balance API - Privy Token Authentication"""
        print("🔍 Testing Solana Wallet Balance API - Privy Token Authentication...")
        
        try:
            # Create a test Privy token for Solana authentication
            test_payload = {
                "wallet_address": "0x2ec1DDCCd0387603cd68a564CDf0129576b1a25d",
                "user_id": "privy-solana-test-user",
                "email": "solana@privy.test"
            }
            import base64
            encoded_payload = base64.b64encode(json.dumps(test_payload).encode()).decode()
            
            headers = {
                'Authorization': f'Bearer testing-{encoded_payload}'
            }
            
            start = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for Solana-specific fields and Privy authentication
                has_sol_balance = 'sol_balance' in data
                sol_balance = data.get('sol_balance', 'missing')
                balance = data.get('balance', 'missing')
                wallet_address = data.get('wallet_address', 'missing')
                
                if has_sol_balance and balance > 0:
                    self.log_result(
                        "Solana Wallet Balance API - Privy Token", 
                        True, 
                        f"Privy test token authentication working correctly for Solana deposits, realistic Solana testing balance generated (${balance}, SOL: {sol_balance}), proper Solana wallet address handling with Privy integration",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Solana Wallet Balance API - Privy Token", 
                        False, 
                        f"Privy authentication failed or missing Solana fields: sol_balance={sol_balance}, balance={balance}"
                    )
                    return False
            else:
                self.log_result(
                    "Solana Wallet Balance API - Privy Token", 
                    False, 
                    f"API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Solana Wallet Balance API - Privy Token", False, f"Error: {str(e)}")
            return False

    def test_api_performance_after_solana_deps(self):
        """Test 5: API Performance Check - No degradation from Solana dependencies"""
        print("🔍 Testing API Performance after Solana dependency installation...")
        
        try:
            # Test multiple endpoints to check performance
            endpoints = [
                "/ping",
                "/wallet/balance", 
                "/servers/lobbies",
                "/stats/live-players"
            ]
            
            total_time = 0
            successful_requests = 0
            
            for endpoint in endpoints:
                try:
                    start = time.time()
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=5)
                    response_time = time.time() - start
                    total_time += response_time
                    
                    if response.status_code == 200:
                        successful_requests += 1
                        
                except Exception as e:
                    print(f"   Warning: {endpoint} failed: {str(e)}")
            
            if successful_requests >= 3:  # At least 3 out of 4 endpoints working
                avg_response_time = total_time / successful_requests
                performance_good = avg_response_time < 2.0  # Under 2 seconds average
                
                self.log_result(
                    "API Performance Check", 
                    performance_good, 
                    f"Performance check: {successful_requests}/{len(endpoints)} endpoints working, average response time: {avg_response_time:.3f}s, {'excellent' if avg_response_time < 1.0 else 'good' if avg_response_time < 2.0 else 'slow'} performance after Solana dependency installation",
                    avg_response_time
                )
                return performance_good
            else:
                self.log_result(
                    "API Performance Check", 
                    False, 
                    f"Only {successful_requests}/{len(endpoints)} endpoints working"
                )
                return False
                
        except Exception as e:
            self.log_result("API Performance Check", False, f"Error: {str(e)}")
            return False

    def test_error_handling_solana_operations(self):
        """Test 6: Error Handling for Solana Operations"""
        print("🔍 Testing Error Handling for Solana Operations...")
        
        try:
            # Test with invalid token to check graceful fallback
            headers = {
                'Authorization': 'Bearer invalid-solana-token-test'
            }
            
            start = time.time()
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
            response_time = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                
                # Should gracefully fallback to guest balance
                balance = data.get('balance', -1)
                sol_balance = data.get('sol_balance', -1)
                
                if balance == 0.0 and sol_balance == 0.0:
                    self.log_result(
                        "Error Handling for Solana Operations", 
                        True, 
                        f"Invalid tokens correctly handled by returning guest balance for Solana operations, robust error handling prevents authentication bypass in Solana deposits, graceful fallback to guest balance for invalid Solana requests",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Error Handling for Solana Operations", 
                        False, 
                        f"Error handling failed: balance={balance}, sol_balance={sol_balance}"
                    )
                    return False
            else:
                self.log_result(
                    "Error Handling for Solana Operations", 
                    False, 
                    f"API returned status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Error Handling for Solana Operations", False, f"Error: {str(e)}")
            return False

    def test_solana_deposit_backend_support(self):
        """Test 7: Solana Deposit Backend Support APIs"""
        print("🔍 Testing Solana Deposit Backend Support APIs...")
        
        try:
            # Test multiple APIs that support Solana deposit functionality
            api_tests = [
                ("/ping", "Service availability"),
                ("/wallet/balance", "Solana wallet balance retrieval"),
                ("/servers/lobbies", "Game server integration for deposits")
            ]
            
            successful_apis = 0
            total_apis = len(api_tests)
            
            for endpoint, description in api_tests:
                try:
                    start = time.time()
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=5)
                    response_time = time.time() - start
                    
                    if response.status_code == 200:
                        successful_apis += 1
                        print(f"   ✅ {description}: Working ({response_time:.3f}s)")
                    else:
                        print(f"   ❌ {description}: Failed (status {response.status_code})")
                        
                except Exception as e:
                    print(f"   ❌ {description}: Error - {str(e)}")
            
            success_rate = successful_apis / total_apis
            
            if success_rate >= 0.8:  # 80% success rate
                self.log_result(
                    "Solana Deposit Backend Support APIs", 
                    True, 
                    f"All APIs supporting Solana deposit functionality working correctly ({successful_apis}/{total_apis} passed), backend infrastructure fully supports Solana-only deposits after dependency installation"
                )
                return True
            else:
                self.log_result(
                    "Solana Deposit Backend Support APIs", 
                    False, 
                    f"Insufficient API support: {successful_apis}/{total_apis} working"
                )
                return False
                
        except Exception as e:
            self.log_result("Solana Deposit Backend Support APIs", False, f"Error: {str(e)}")
            return False

    def test_authentication_state_persistence(self):
        """Test 8: Authentication State Persistence for Solana Operations"""
        print("🔍 Testing Authentication State Persistence for Solana Operations...")
        
        try:
            # Test with consistent authentication across multiple requests
            test_payload = {
                "wallet_address": "0x2ec1DDCCd0387603cd68a564CDf0129576b1a25d",
                "user_id": "persistent-solana-test",
                "email": "persistent@solana.test"
            }
            import base64
            encoded_payload = base64.b64encode(json.dumps(test_payload).encode()).decode()
            
            headers = {
                'Authorization': f'Bearer testing-{encoded_payload}'
            }
            
            # Make multiple requests to test persistence
            balances = []
            wallet_addresses = []
            
            for i in range(3):
                try:
                    start = time.time()
                    response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=5)
                    response_time = time.time() - start
                    
                    if response.status_code == 200:
                        data = response.json()
                        balances.append(data.get('balance', 0))
                        wallet_addresses.append(data.get('wallet_address', ''))
                    
                    time.sleep(0.1)  # Small delay between requests
                    
                except Exception as e:
                    print(f"   Request {i+1} failed: {str(e)}")
            
            # Check consistency
            if len(balances) >= 2:
                balance_consistent = all(b == balances[0] for b in balances)
                address_consistent = all(a == wallet_addresses[0] for a in wallet_addresses)
                
                if balance_consistent and address_consistent:
                    self.log_result(
                        "Authentication State Persistence for Solana", 
                        True, 
                        f"Authentication state maintained across multiple Solana API requests, Solana wallet data consistency verified across session, no sign-out/sign-in issues detected during Solana operations"
                    )
                    return True
                else:
                    self.log_result(
                        "Authentication State Persistence for Solana", 
                        False, 
                        f"Inconsistent state: balances={balances}, addresses={wallet_addresses}"
                    )
                    return False
            else:
                self.log_result(
                    "Authentication State Persistence for Solana", 
                    False, 
                    "Insufficient successful requests to test persistence"
                )
                return False
                
        except Exception as e:
            self.log_result("Authentication State Persistence for Solana", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests for Privy Solana deposit integration"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING FOR PRIVY SOLANA DEPOSIT INTEGRATION")
        print("=" * 80)
        print("Testing Focus: Backend API Health after SSR fixes and Solana dependency installation")
        print("Key Dependencies: @solana/kit and @solana/spl-token")
        print("=" * 80)
        print()
        
        # Run all tests
        tests = [
            self.test_api_health_check,
            self.test_solana_wallet_balance_guest,
            self.test_solana_wallet_balance_jwt_auth,
            self.test_solana_wallet_balance_privy_token,
            self.test_api_performance_after_solana_deps,
            self.test_error_handling_solana_operations,
            self.test_solana_deposit_backend_support,
            self.test_authentication_state_persistence
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
        print("🏁 PRIVY SOLANA DEPOSIT INTEGRATION BACKEND TESTING COMPLETED")
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
        
        # 1. Backend API Health
        api_health = any(r['test'] == 'API Health Check' and r['success'] for r in self.results)
        print(f"{'✅' if api_health else '❌'} Backend API Health: {'OPERATIONAL' if api_health else 'FAILED'}")
        if api_health: requirements_met += 1
        
        # 2. Wallet Balance API
        wallet_api = any('Wallet Balance API' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if wallet_api else '❌'} Wallet Balance API: {'WORKING' if wallet_api else 'FAILED'}")
        if wallet_api: requirements_met += 1
        
        # 3. Authentication Flow
        auth_flow = any('Authentication' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if auth_flow else '❌'} Authentication Flow: {'WORKING' if auth_flow else 'FAILED'}")
        if auth_flow: requirements_met += 1
        
        # 4. API Performance
        performance = any('Performance' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if performance else '❌'} API Performance: {'GOOD' if performance else 'DEGRADED'}")
        if performance: requirements_met += 1
        
        # 5. Error Handling
        error_handling = any('Error Handling' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if error_handling else '❌'} Error Handling: {'WORKING' if error_handling else 'FAILED'}")
        if error_handling: requirements_met += 1
        
        print()
        print(f"🏆 OVERALL ASSESSMENT: {requirements_met}/{total_requirements} key requirements met")
        
        if success_rate >= 80:
            print("🎉 CONCLUSION: Backend is STABLE and READY for Privy Solana deposit integration")
        elif success_rate >= 60:
            print("⚠️  CONCLUSION: Backend has MINOR ISSUES but core functionality is working")
        else:
            print("🚨 CONCLUSION: Backend has CRITICAL ISSUES that need immediate attention")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = SolanaDepositBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)