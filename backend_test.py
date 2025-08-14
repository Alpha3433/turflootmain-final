#!/usr/bin/env python3
"""
TurfLoot Wallet Refresh Functionality Testing
Tests the wallet balance and transactions endpoints that support the wallet refresh feature.
"""

import requests
import json
import time
import uuid
import sys
from datetime import datetime

# Configuration - Use localhost since external URL has 502 errors
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class WalletRefreshTester:
    def __init__(self):
        self.test_results = []
        self.auth_token = None
        self.test_user_id = None
        
    def log_result(self, test_name, success, details="", error=""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()

    def create_test_user_and_authenticate(self):
        """Create a test user and get authentication token"""
        try:
            print("🔐 Setting up test authentication...")
            
            # Create test user data
            test_email = f"wallet.test.{int(time.time())}@turfloot.com"
            test_user_id = f"test-user-{uuid.uuid4()}"
            
            # Use the unified Privy authentication endpoint
            auth_data = {
                "privy_user": {
                    "id": f"privy-{test_user_id}",
                    "email": {
                        "address": test_email
                    }
                }
            }
            
            response = requests.post(f"{API_BASE}/auth/privy", json=auth_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('token')
                self.test_user_id = data.get('user', {}).get('id')
                
                self.log_result(
                    "Authentication Setup", 
                    True, 
                    f"Created test user: {test_email}, Token length: {len(self.auth_token) if self.auth_token else 0}"
                )
                return True
            else:
                self.log_result(
                    "Authentication Setup", 
                    False, 
                    error=f"Status: {response.status_code}, Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Authentication Setup", False, error=str(e))
            return False

    def test_wallet_balance_authenticated(self):
        """Test wallet balance endpoint with authentication"""
        try:
            headers = {
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields are present
                required_fields = ['balance', 'currency', 'sol_balance', 'usdc_balance']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "Wallet Balance API - Authenticated", 
                        False, 
                        error=f"Missing required fields: {missing_fields}"
                    )
                    return False
                
                # Verify data types
                if not isinstance(data['balance'], (int, float)):
                    self.log_result(
                        "Wallet Balance API - Authenticated", 
                        False, 
                        error="Balance field is not numeric"
                    )
                    return False
                
                self.log_result(
                    "Wallet Balance API - Authenticated", 
                    True, 
                    f"Balance: ${data['balance']}, SOL: {data['sol_balance']}, USDC: {data['usdc_balance']}, Currency: {data['currency']}"
                )
                return True
            else:
                self.log_result(
                    "Wallet Balance API - Authenticated", 
                    False, 
                    error=f"Status: {response.status_code}, Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Balance API - Authenticated", False, error=str(e))
            return False

    def test_wallet_balance_unauthenticated(self):
        """Test wallet balance endpoint without authentication"""
        try:
            response = requests.get(f"{API_BASE}/wallet/balance")
            
            if response.status_code == 401:
                self.log_result(
                    "Wallet Balance API - Unauthenticated", 
                    True, 
                    "Correctly rejected unauthenticated request with 401 status"
                )
                return True
            else:
                self.log_result(
                    "Wallet Balance API - Unauthenticated", 
                    False, 
                    error=f"Expected 401, got {response.status_code}. Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Balance API - Unauthenticated", False, error=str(e))
            return False

    def test_wallet_balance_invalid_token(self):
        """Test wallet balance endpoint with invalid authentication token"""
        try:
            headers = {
                'Authorization': 'Bearer invalid-token-12345',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers)
            
            if response.status_code == 401:
                self.log_result(
                    "Wallet Balance API - Invalid Token", 
                    True, 
                    "Correctly rejected invalid token with 401 status"
                )
                return True
            else:
                self.log_result(
                    "Wallet Balance API - Invalid Token", 
                    False, 
                    error=f"Expected 401, got {response.status_code}. Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Balance API - Invalid Token", False, error=str(e))
            return False

    def test_wallet_transactions_authenticated(self):
        """Test wallet transactions endpoint with authentication"""
        try:
            headers = {
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/wallet/transactions", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if 'transactions' not in data:
                    self.log_result(
                        "Wallet Transactions API - Authenticated", 
                        False, 
                        error="Missing 'transactions' field in response"
                    )
                    return False
                
                transactions = data['transactions']
                
                if not isinstance(transactions, list):
                    self.log_result(
                        "Wallet Transactions API - Authenticated", 
                        False, 
                        error="Transactions field is not an array"
                    )
                    return False
                
                # If there are transactions, verify their structure
                if transactions:
                    required_tx_fields = ['id', 'type', 'amount', 'currency', 'status', 'created_at']
                    first_tx = transactions[0]
                    missing_fields = [field for field in required_tx_fields if field not in first_tx]
                    
                    if missing_fields:
                        self.log_result(
                            "Wallet Transactions API - Authenticated", 
                            False, 
                            error=f"Transaction missing required fields: {missing_fields}"
                        )
                        return False
                
                self.log_result(
                    "Wallet Transactions API - Authenticated", 
                    True, 
                    f"Retrieved {len(transactions)} transactions successfully"
                )
                return True
            else:
                self.log_result(
                    "Wallet Transactions API - Authenticated", 
                    False, 
                    error=f"Status: {response.status_code}, Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Transactions API - Authenticated", False, error=str(e))
            return False

    def test_wallet_transactions_unauthenticated(self):
        """Test wallet transactions endpoint without authentication"""
        try:
            response = requests.get(f"{API_BASE}/wallet/transactions")
            
            if response.status_code == 401:
                self.log_result(
                    "Wallet Transactions API - Unauthenticated", 
                    True, 
                    "Correctly rejected unauthenticated request with 401 status"
                )
                return True
            else:
                self.log_result(
                    "Wallet Transactions API - Unauthenticated", 
                    False, 
                    error=f"Expected 401, got {response.status_code}. Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Transactions API - Unauthenticated", False, error=str(e))
            return False

    def test_wallet_transactions_invalid_token(self):
        """Test wallet transactions endpoint with invalid authentication token"""
        try:
            headers = {
                'Authorization': 'Bearer invalid-token-67890',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f"{API_BASE}/wallet/transactions", headers=headers)
            
            if response.status_code == 401:
                self.log_result(
                    "Wallet Transactions API - Invalid Token", 
                    True, 
                    "Correctly rejected invalid token with 401 status"
                )
                return True
            else:
                self.log_result(
                    "Wallet Transactions API - Invalid Token", 
                    False, 
                    error=f"Expected 401, got {response.status_code}. Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Transactions API - Invalid Token", False, error=str(e))
            return False

    def test_wallet_refresh_simulation(self):
        """Test the complete wallet refresh flow (balance + transactions)"""
        try:
            headers = {
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json'
            }
            
            print("🔄 Simulating wallet refresh (calling both endpoints simultaneously)...")
            
            # Simulate the handleRefreshWallet function by calling both endpoints
            start_time = time.time()
            
            # Make both requests (simulating Promise.all in the frontend)
            balance_response = requests.get(f"{API_BASE}/wallet/balance", headers=headers)
            transactions_response = requests.get(f"{API_BASE}/wallet/transactions", headers=headers)
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Check both responses
            balance_success = balance_response.status_code == 200
            transactions_success = transactions_response.status_code == 200
            
            if balance_success and transactions_success:
                balance_data = balance_response.json()
                transactions_data = transactions_response.json()
                
                self.log_result(
                    "Wallet Refresh Simulation", 
                    True, 
                    f"Both endpoints responded successfully in {total_time:.3f}s. Balance: ${balance_data['balance']}, Transactions: {len(transactions_data['transactions'])}"
                )
                return True
            else:
                errors = []
                if not balance_success:
                    errors.append(f"Balance API failed: {balance_response.status_code}")
                if not transactions_success:
                    errors.append(f"Transactions API failed: {transactions_response.status_code}")
                
                self.log_result(
                    "Wallet Refresh Simulation", 
                    False, 
                    error="; ".join(errors)
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Refresh Simulation", False, error=str(e))
            return False

    def test_response_times(self):
        """Test response times for wallet endpoints"""
        try:
            headers = {
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json'
            }
            
            # Test balance endpoint response time
            start_time = time.time()
            balance_response = requests.get(f"{API_BASE}/wallet/balance", headers=headers)
            balance_time = time.time() - start_time
            
            # Test transactions endpoint response time
            start_time = time.time()
            transactions_response = requests.get(f"{API_BASE}/wallet/transactions", headers=headers)
            transactions_time = time.time() - start_time
            
            if balance_response.status_code == 200 and transactions_response.status_code == 200:
                # Consider response times acceptable if under 2 seconds each
                acceptable_time = 2.0
                balance_acceptable = balance_time < acceptable_time
                transactions_acceptable = transactions_time < acceptable_time
                
                if balance_acceptable and transactions_acceptable:
                    self.log_result(
                        "Response Time Performance", 
                        True, 
                        f"Balance: {balance_time:.3f}s, Transactions: {transactions_time:.3f}s (both under {acceptable_time}s)"
                    )
                    return True
                else:
                    self.log_result(
                        "Response Time Performance", 
                        False, 
                        error=f"Slow response times - Balance: {balance_time:.3f}s, Transactions: {transactions_time:.3f}s"
                    )
                    return False
            else:
                self.log_result(
                    "Response Time Performance", 
                    False, 
                    error=f"API errors - Balance: {balance_response.status_code}, Transactions: {transactions_response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_result("Response Time Performance", False, error=str(e))
            return False

    def run_all_tests(self):
        """Run all wallet refresh functionality tests"""
        print("🧪 Starting TurfLoot Wallet Refresh Functionality Tests")
        print("=" * 60)
        
        # Setup authentication first
        if not self.create_test_user_and_authenticate():
            print("❌ Authentication setup failed. Cannot proceed with wallet tests.")
            return False
        
        # Run all wallet refresh tests
        tests = [
            self.test_wallet_balance_authenticated,
            self.test_wallet_balance_unauthenticated,
            self.test_wallet_balance_invalid_token,
            self.test_wallet_transactions_authenticated,
            self.test_wallet_transactions_unauthenticated,
            self.test_wallet_transactions_invalid_token,
            self.test_wallet_refresh_simulation,
            self.test_response_times
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        # Print summary
        print("=" * 60)
        print(f"🏁 WALLET REFRESH TESTING SUMMARY")
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 ALL WALLET REFRESH TESTS PASSED!")
            return True
        else:
            print("⚠️  Some wallet refresh tests failed. Check details above.")
            return False

def main():
    """Main test execution"""
    tester = WalletRefreshTester()
    success = tester.run_all_tests()
    
    # Print detailed results for debugging
    print("\n" + "=" * 60)
    print("📋 DETAILED TEST RESULTS")
    print("=" * 60)
    
    for result in tester.test_results:
        status = "✅" if result['success'] else "❌"
        print(f"{status} {result['test']}")
        if result['details']:
            print(f"   📝 {result['details']}")
        if result['error']:
            print(f"   🚨 {result['error']}")
        print()
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)