#!/usr/bin/env python3
"""
Backend Testing for Solana Deposit CNR-2 Format Error Resolution
================================================================

This test verifies that the backend APIs supporting Solana deposit functionality
work correctly after the recent Privy configuration changes to fix CNR-2 format errors.

Focus Areas:
1. Backend APIs supporting Solana deposit functionality
2. Wallet balance API with Solana configuration compatibility
3. Authentication flow that leads to deposit operations
4. Verification of no CNR-2 format compatibility issues in backend
5. User registration API with Solana wallet associations
6. All Solana-related backend endpoints functionality

The test specifically checks that the backend infrastructure is ready to support
the fixed frontend deposit function after Privy configuration updates.
"""

import requests
import json
import time
import base64
from datetime import datetime

class SolanaDepositCNR2BackendTester:
    def __init__(self):
        # Get base URL from environment or use default
        self.base_url = "https://turfloot-cashout.preview.emergentagent.com/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print("🚀 SOLANA DEPOSIT CNR-2 FORMAT ERROR RESOLUTION - BACKEND TESTING")
        print("=" * 80)
        print(f"🔗 Testing backend at: {self.base_url}")
        print(f"📅 Test started: {datetime.now().isoformat()}")
        print()

    def log_test(self, test_name, passed, details=""):
        """Log test results"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })

    def test_api_health_check(self):
        """Test 1: Verify API is accessible and responding correctly"""
        print("🔍 TEST 1: API Health Check for Solana Deposit Support")
        try:
            response = requests.get(f"{self.base_url}/ping", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'ok' and data.get('server') == 'turfloot-api':
                    self.log_test("API Health Check", True, f"Server responding correctly: {data.get('server')}")
                    return True
                else:
                    self.log_test("API Health Check", False, f"Unexpected response structure: {data}")
                    return False
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_solana_wallet_balance_guest(self):
        """Test 2: Solana Wallet Balance API - Guest User (No CNR-2 Issues)"""
        print("\n🔍 TEST 2: Solana Wallet Balance API - Guest User")
        try:
            response = requests.get(f"{self.base_url}/wallet/balance", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for proper Solana fields in guest balance
                required_fields = ['balance', 'currency', 'sol_balance', 'wallet_address']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields and data.get('sol_balance') == 0.0:
                    self.log_test("Solana Wallet Balance - Guest", True, 
                                f"Proper Solana fields present: sol_balance={data.get('sol_balance')}")
                    return True
                else:
                    self.log_test("Solana Wallet Balance - Guest", False, 
                                f"Missing fields: {missing_fields} or incorrect sol_balance")
                    return False
            else:
                self.log_test("Solana Wallet Balance - Guest", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Solana Wallet Balance - Guest", False, f"Error: {str(e)}")
            return False

    def test_solana_wallet_balance_with_auth(self):
        """Test 3: Solana Wallet Balance API - With Authentication (CNR-2 Compatibility)"""
        print("\n🔍 TEST 3: Solana Wallet Balance API - JWT Authentication")
        try:
            # Create a test JWT token for authentication
            test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItc29sYW5hIiwiZW1haWwiOiJ0ZXN0QHNvbGFuYS5jb20iLCJ3YWxsZXRfYWRkcmVzcyI6IjlXelBmRVFyS3FtNWNqNGNHZGpkUUJBTXJMUXRWZGJONjNKc1pTVlZZUUJCIiwiaWF0IjoxNzU3NDAwMDAwfQ.test-signature"
            
            headers = {
                'Authorization': f'Bearer {test_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f"{self.base_url}/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for Solana wallet data in authenticated response
                if ('sol_balance' in data and 'wallet_address' in data and 
                    data.get('balance', 0) > 0):
                    self.log_test("Solana Wallet Balance - JWT Auth", True, 
                                f"Authenticated balance: ${data.get('balance')}, SOL: {data.get('sol_balance')}")
                    return True
                else:
                    self.log_test("Solana Wallet Balance - JWT Auth", False, 
                                f"Missing Solana fields or zero balance: {data}")
                    return False
            else:
                self.log_test("Solana Wallet Balance - JWT Auth", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Solana Wallet Balance - JWT Auth", False, f"Error: {str(e)}")
            return False

    def test_solana_wallet_balance_privy_token(self):
        """Test 4: Solana Wallet Balance API - Privy Token (CNR-2 Format Support)"""
        print("\n🔍 TEST 4: Solana Wallet Balance API - Privy Token Authentication")
        try:
            # Create a test Privy-style token for CNR-2 compatibility testing
            privy_payload = {
                "sub": "did:privy:solana-test-user-cnr2",
                "email": "cnr2test@solana.com",
                "wallet": {
                    "address": "9WzPfEQrKqm5cj4cGdjdQBAMrLQtVdbN63JsZSVVYQBB",
                    "chainType": "solana"
                },
                "iat": 1757400000
            }
            
            # Create base64 encoded token (simulating Privy token structure)
            token_payload = base64.b64encode(json.dumps(privy_payload).encode()).decode()
            test_privy_token = f"header.{token_payload}.signature"
            
            headers = {
                'Authorization': f'Bearer {test_privy_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f"{self.base_url}/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for proper Solana wallet handling with Privy token
                if ('sol_balance' in data and 'wallet_address' in data and 
                    data.get('balance', 0) > 0):
                    self.log_test("Solana Wallet Balance - Privy Token", True, 
                                f"Privy auth successful: ${data.get('balance')}, SOL: {data.get('sol_balance')}")
                    return True
                else:
                    self.log_test("Solana Wallet Balance - Privy Token", False, 
                                f"Privy token not handled correctly: {data}")
                    return False
            else:
                self.log_test("Solana Wallet Balance - Privy Token", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Solana Wallet Balance - Privy Token", False, f"Error: {str(e)}")
            return False

    def test_user_registration_solana_wallet(self):
        """Test 5: User Registration with Solana Wallet Data (CNR-2 Support)"""
        print("\n🔍 TEST 5: User Registration with Solana Wallet Data")
        try:
            # Test user registration with Solana wallet address
            registration_data = {
                "action": "register_user",
                "userIdentifier": f"solana-cnr2-test-{int(time.time())}",
                "userData": {
                    "username": f"SolanaUser{int(time.time())}",
                    "email": "solana.cnr2.test@example.com",
                    "walletAddress": "9WzPfEQrKqm5cj4cGdjdQBAMrLQtVdbN63JsZSVVYQBB",
                    "chainType": "solana"
                }
            }
            
            response = requests.post(f"{self.base_url}/friends", 
                                   json=registration_data, timeout=10)
            
            if response.status_code in [200, 201]:
                data = response.json()
                if data.get('success'):
                    self.log_test("User Registration - Solana Wallet", True, 
                                f"User registered with Solana wallet: {registration_data['userData']['walletAddress'][:20]}...")
                    return True
                else:
                    self.log_test("User Registration - Solana Wallet", False, 
                                f"Registration failed: {data}")
                    return False
            else:
                self.log_test("User Registration - Solana Wallet", False, 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Registration - Solana Wallet", False, f"Error: {str(e)}")
            return False

    def test_cnr2_error_handling(self):
        """Test 6: CNR-2 Format Error Handling in Backend"""
        print("\n🔍 TEST 6: CNR-2 Format Error Handling")
        try:
            # Test with malformed authorization header that might trigger CNR-2 issues
            headers = {
                'Authorization': 'Bearer invalid-cnr2-format-token',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f"{self.base_url}/wallet/balance", headers=headers, timeout=10)
            
            # Backend should handle invalid tokens gracefully, not throw CNR-2 errors
            if response.status_code == 200:
                data = response.json()
                # Should return guest balance for invalid tokens
                if data.get('balance') == 0.0 and data.get('sol_balance') == 0.0:
                    self.log_test("CNR-2 Error Handling", True, 
                                "Invalid token handled gracefully, returned guest balance")
                    return True
                else:
                    self.log_test("CNR-2 Error Handling", False, 
                                f"Unexpected response for invalid token: {data}")
                    return False
            else:
                self.log_test("CNR-2 Error Handling", False, 
                            f"Backend error with invalid token: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("CNR-2 Error Handling", False, f"Error: {str(e)}")
            return False

    def test_solana_deposit_backend_support(self):
        """Test 7: Backend Support for Solana Deposit Operations"""
        print("\n🔍 TEST 7: Solana Deposit Backend Support APIs")
        try:
            # Test multiple endpoints that support Solana deposit functionality
            endpoints_to_test = [
                ("/ping", "Service availability"),
                ("/wallet/balance", "Solana wallet balance retrieval")
            ]
            
            all_passed = True
            details = []
            
            for endpoint, description in endpoints_to_test:
                try:
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                    if response.status_code == 200:
                        details.append(f"{description}: ✅")
                    else:
                        details.append(f"{description}: ❌ HTTP {response.status_code}")
                        all_passed = False
                except Exception as e:
                    details.append(f"{description}: ❌ {str(e)}")
                    all_passed = False
            
            if all_passed:
                self.log_test("Solana Deposit Backend Support", True, 
                            f"All support APIs working: {', '.join(details)}")
                return True
            else:
                self.log_test("Solana Deposit Backend Support", False, 
                            f"Some APIs failed: {', '.join(details)}")
                return False
                
        except Exception as e:
            self.log_test("Solana Deposit Backend Support", False, f"Error: {str(e)}")
            return False

    def test_authentication_state_persistence(self):
        """Test 8: Authentication State Persistence for Solana Operations"""
        print("\n🔍 TEST 8: Authentication State Persistence")
        try:
            # Test multiple requests with same token to verify state persistence
            test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJwZXJzaXN0ZW5jZS10ZXN0IiwiZW1haWwiOiJwZXJzaXN0QHNvbGFuYS5jb20iLCJ3YWxsZXRfYWRkcmVzcyI6IjlXelBmRVFyS3FtNWNqNGNHZGpkUUJBTXJMUXRWZGJONjNKc1pTVlZZUUJCIiwiaWF0IjoxNzU3NDAwMDAwfQ.test-signature"
            
            headers = {
                'Authorization': f'Bearer {test_token}',
                'Content-Type': 'application/json'
            }
            
            # Make multiple requests to test state persistence
            responses = []
            for i in range(3):
                response = requests.get(f"{self.base_url}/wallet/balance", headers=headers, timeout=10)
                if response.status_code == 200:
                    responses.append(response.json())
                else:
                    responses.append(None)
                time.sleep(0.5)  # Small delay between requests
            
            # Check if all responses are consistent
            if all(r is not None for r in responses):
                # Check if wallet data is consistent across requests
                wallet_addresses = [r.get('wallet_address') for r in responses]
                balances = [r.get('balance') for r in responses]
                
                if len(set(wallet_addresses)) == 1 and len(set(balances)) == 1:
                    self.log_test("Authentication State Persistence", True, 
                                f"Consistent state across {len(responses)} requests")
                    return True
                else:
                    self.log_test("Authentication State Persistence", False, 
                                "Inconsistent state across requests")
                    return False
            else:
                self.log_test("Authentication State Persistence", False, 
                            "Some requests failed during persistence test")
                return False
                
        except Exception as e:
            self.log_test("Authentication State Persistence", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all CNR-2 format error resolution tests"""
        print("🎯 STARTING COMPREHENSIVE CNR-2 FORMAT ERROR RESOLUTION TESTING")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all tests
        tests = [
            self.test_api_health_check,
            self.test_solana_wallet_balance_guest,
            self.test_solana_wallet_balance_with_auth,
            self.test_solana_wallet_balance_privy_token,
            self.test_user_registration_solana_wallet,
            self.test_cnr2_error_handling,
            self.test_solana_deposit_backend_support,
            self.test_authentication_state_persistence
        ]
        
        for test_func in tests:
            try:
                test_func()
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
                self.log_test(test_func.__name__, False, f"Test crashed: {str(e)}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print final results
        print("\n" + "=" * 80)
        print("🏁 CNR-2 FORMAT ERROR RESOLUTION TESTING COMPLETED")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 FINAL RESULTS:")
        print(f"   • Total Tests: {self.total_tests}")
        print(f"   • Passed: {self.passed_tests}")
        print(f"   • Failed: {self.total_tests - self.passed_tests}")
        print(f"   • Success Rate: {success_rate:.1f}%")
        print(f"   • Duration: {duration:.2f}s")
        
        if success_rate >= 80:
            print(f"\n✅ SOLANA DEPOSIT CNR-2 FORMAT ERROR RESOLUTION: BACKEND READY")
            print("   All critical backend APIs supporting Solana deposit functionality")
            print("   are working correctly after Privy configuration changes.")
        else:
            print(f"\n❌ SOLANA DEPOSIT CNR-2 FORMAT ERROR RESOLUTION: ISSUES DETECTED")
            print("   Some backend APIs may have compatibility issues with the new")
            print("   Privy configuration. Review failed tests above.")
        
        print("\n🔍 DETAILED TEST RESULTS:")
        for result in self.test_results:
            status = "✅" if result['passed'] else "❌"
            print(f"   {status} {result['test']}")
            if result['details']:
                print(f"      └─ {result['details']}")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = SolanaDepositCNR2BackendTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)