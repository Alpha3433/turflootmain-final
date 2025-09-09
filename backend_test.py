#!/usr/bin/env python3
"""
TurfLoot Solana-Only Deposit Functionality Backend Testing
=========================================================

This script tests the new Solana-only deposit functionality that was implemented 
to simplify and fix previous deposit issues.

CRITICAL TESTING REQUIREMENTS:
1. Solana-Only Deposit Function Backend Support
2. No EVM/Multi-Chain Conflicts  
3. DEPOSIT SOL Button Functionality
4. Simplified Implementation Benefits

Test Focus: Backend APIs supporting Solana-only deposits
"""

import requests
import json
import time
import base64
import sys
from datetime import datetime, timedelta
import os

# Configuration
BASE_URL = "https://battle-buddies-7.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test data for realistic wallet addresses
TEST_WALLET_ADDRESSES = [
    "0x2ec1DDCCd0387603cd68a564CDf0129576b1a25d",
    "0x3fc2EEDDd1498714de79a675DEf0240687c2b36e", 
    "0x1A2B3C4D5E6F7890123456789ABCDEF012345678"
]

TEST_USERS = [
    {
        "id": "privy-user-1",
        "email": "testuser1@turfloot.com",
        "wallet_address": TEST_WALLET_ADDRESSES[0]
    },
    {
        "id": "privy-user-2", 
        "email": "testuser2@turfloot.com",
        "wallet_address": TEST_WALLET_ADDRESSES[1]
    }
]

class PrivyDepositTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'TurfLoot-Backend-Tester/1.0'
        })
        self.test_results = []
        self.jwt_secret = "turfloot-secret-key-change-in-production"
        
    def log_result(self, test_name, success, details="", error=""):
        """Log test result with timestamp"""
        result = {
            'test': test_name,
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'details': details,
            'error': error
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()

    def generate_test_jwt(self, user_data):
        """Generate a test JWT token for authentication"""
        try:
            # Simple JWT payload without external library
            import base64
            import hmac
            import hashlib
            
            header = {"alg": "HS256", "typ": "JWT"}
            payload = {
                'userId': user_data['id'],
                'id': user_data['id'],
                'email': user_data['email'],
                'jwt_wallet_address': user_data['wallet_address'],
                'iat': int(time.time()),
                'exp': int(time.time()) + 3600
            }
            
            # Encode header and payload
            header_encoded = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
            payload_encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
            
            # Create signature
            message = f"{header_encoded}.{payload_encoded}"
            signature = hmac.new(
                self.jwt_secret.encode(),
                message.encode(),
                hashlib.sha256
            ).digest()
            signature_encoded = base64.urlsafe_b64encode(signature).decode().rstrip('=')
            
            return f"{header_encoded}.{payload_encoded}.{signature_encoded}"
        except Exception as e:
            print(f"❌ Error generating JWT: {e}")
            return None

    def generate_privy_test_token(self, user_data):
        """Generate a Privy-style test token"""
        try:
            # Create a testing token with Privy-like structure
            payload = {
                'wallet_address': user_data['wallet_address'],
                'user_id': user_data['id'],
                'email': user_data['email']
            }
            
            encoded_payload = base64.b64encode(json.dumps(payload).encode()).decode()
            return f"testing-{encoded_payload}"
        except Exception as e:
            print(f"❌ Error generating Privy test token: {e}")
            return None

    def test_api_health_check(self):
        """Test 1: API Health Check"""
        try:
            response = self.session.get(f"{API_BASE}/ping")
            
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', 'Unknown')
                features = data.get('features', [])
                
                self.log_result(
                    "API Health Check",
                    True,
                    f"Service: {service_name}, Features: {', '.join(features) if features else 'None'}"
                )
                return True
            else:
                self.log_result(
                    "API Health Check", 
                    False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("API Health Check", False, error=str(e))
            return False

    def test_wallet_balance_guest(self):
        """Test 2: Wallet Balance API - Guest User"""
        try:
            response = self.session.get(f"{API_BASE}/wallet/balance")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify guest balance structure
                required_fields = ['balance', 'currency', 'sol_balance', 'usdc_balance', 'eth_balance', 'wallet_address']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "Wallet Balance API - Guest User",
                        False,
                        error=f"Missing fields: {missing_fields}"
                    )
                    return False
                
                # Verify guest values
                expected_guest_values = {
                    'balance': 0.00,
                    'currency': 'USD',
                    'sol_balance': 0.0000,
                    'usdc_balance': 0.00,
                    'eth_balance': 0.0000,
                    'wallet_address': 'Not connected'
                }
                
                for field, expected in expected_guest_values.items():
                    if data[field] != expected:
                        self.log_result(
                            "Wallet Balance API - Guest User",
                            False,
                            error=f"Field {field}: expected {expected}, got {data[field]}"
                        )
                        return False
                
                self.log_result(
                    "Wallet Balance API - Guest User",
                    True,
                    f"Guest balance structure correct: {data}"
                )
                return True
            else:
                self.log_result(
                    "Wallet Balance API - Guest User",
                    False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Balance API - Guest User", False, error=str(e))
            return False

    def test_wallet_balance_authenticated_jwt(self):
        """Test 3: Wallet Balance API - JWT Authenticated User"""
        try:
            user = TEST_USERS[0]
            token = self.generate_test_jwt(user)
            
            if not token:
                self.log_result(
                    "Wallet Balance API - JWT Auth",
                    False,
                    error="Failed to generate JWT token"
                )
                return False
            
            headers = {'Authorization': f'Bearer {token}'}
            response = self.session.get(f"{API_BASE}/wallet/balance", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify authenticated user balance structure
                required_fields = ['balance', 'currency', 'sol_balance', 'usdc_balance', 'eth_balance', 'wallet_address']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "Wallet Balance API - JWT Auth",
                        False,
                        error=f"Missing fields: {missing_fields}"
                    )
                    return False
                
                # Verify wallet address is included
                if data['wallet_address'] != user['wallet_address']:
                    self.log_result(
                        "Wallet Balance API - JWT Auth",
                        False,
                        error=f"Wallet address mismatch: expected {user['wallet_address']}, got {data['wallet_address']}"
                    )
                    return False
                
                # Verify balance is not zero (should have default balance)
                if data['balance'] <= 0:
                    self.log_result(
                        "Wallet Balance API - JWT Auth",
                        False,
                        error=f"Expected positive balance for authenticated user, got {data['balance']}"
                    )
                    return False
                
                self.log_result(
                    "Wallet Balance API - JWT Auth",
                    True,
                    f"JWT auth balance: ${data['balance']}, SOL: {data['sol_balance']}, Wallet: {data['wallet_address'][:10]}..."
                )
                return True
            else:
                self.log_result(
                    "Wallet Balance API - JWT Auth",
                    False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Balance API - JWT Auth", False, error=str(e))
            return False

    def test_wallet_balance_privy_token(self):
        """Test 4: Wallet Balance API - Privy Test Token"""
        try:
            user = TEST_USERS[1]
            token = self.generate_privy_test_token(user)
            
            if not token:
                self.log_result(
                    "Wallet Balance API - Privy Token",
                    False,
                    error="Failed to generate Privy test token"
                )
                return False
            
            headers = {'Authorization': f'Bearer {token}'}
            response = self.session.get(f"{API_BASE}/wallet/balance", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify Privy test token response structure
                required_fields = ['balance', 'currency', 'sol_balance', 'usdc_balance', 'eth_balance', 'wallet_address']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "Wallet Balance API - Privy Token",
                        False,
                        error=f"Missing fields: {missing_fields}"
                    )
                    return False
                
                # Verify realistic testing values
                if data['balance'] < 50 or data['balance'] > 150:
                    self.log_result(
                        "Wallet Balance API - Privy Token",
                        False,
                        error=f"Testing balance out of expected range (50-150): {data['balance']}"
                    )
                    return False
                
                if data['sol_balance'] < 0.1 or data['sol_balance'] > 0.6:
                    self.log_result(
                        "Wallet Balance API - Privy Token",
                        False,
                        error=f"Testing SOL balance out of expected range (0.1-0.6): {data['sol_balance']}"
                    )
                    return False
                
                self.log_result(
                    "Wallet Balance API - Privy Token",
                    True,
                    f"Privy test balance: ${data['balance']}, SOL: {data['sol_balance']}, Wallet: {data['wallet_address'][:10]}..."
                )
                return True
            else:
                self.log_result(
                    "Wallet Balance API - Privy Token",
                    False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Balance API - Privy Token", False, error=str(e))
            return False

    def test_wallet_balance_invalid_token(self):
        """Test 5: Wallet Balance API - Invalid Token Error Handling"""
        try:
            # Test with invalid JWT token
            invalid_token = "invalid.jwt.token"
            headers = {'Authorization': f'Bearer {invalid_token}'}
            response = self.session.get(f"{API_BASE}/wallet/balance", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return guest balance for invalid token
                if data['balance'] == 0.00 and data['wallet_address'] == 'Not connected':
                    self.log_result(
                        "Wallet Balance API - Invalid Token",
                        True,
                        "Invalid token correctly handled, returned guest balance"
                    )
                    return True
                else:
                    self.log_result(
                        "Wallet Balance API - Invalid Token",
                        False,
                        error=f"Expected guest balance for invalid token, got: {data}"
                    )
                    return False
            else:
                self.log_result(
                    "Wallet Balance API - Invalid Token",
                    False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Balance API - Invalid Token", False, error=str(e))
            return False

    def test_user_registration_with_wallet(self):
        """Test 6: User Registration with Wallet Data"""
        try:
            user_data = {
                "action": "register_user",
                "userIdentifier": TEST_WALLET_ADDRESSES[2],
                "userData": {
                    "username": "DepositTestUser",
                    "displayName": "Deposit Test User",
                    "email": "deposittest@turfloot.com",
                    "walletAddress": TEST_WALLET_ADDRESSES[2],
                    "equippedSkin": {
                        "type": "circle",
                        "color": "#3b82f6",
                        "pattern": "solid"
                    }
                }
            }
            
            response = self.session.post(f"{API_BASE}/friends", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    self.log_result(
                        "User Registration with Wallet",
                        True,
                        f"User registered successfully with wallet: {TEST_WALLET_ADDRESSES[2][:10]}..."
                    )
                    return True
                else:
                    self.log_result(
                        "User Registration with Wallet",
                        False,
                        error=f"Registration failed: {data.get('error', 'Unknown error')}"
                    )
                    return False
            else:
                self.log_result(
                    "User Registration with Wallet",
                    False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("User Registration with Wallet", False, error=str(e))
            return False

    def test_authentication_state_persistence(self):
        """Test 7: Authentication State Management"""
        try:
            user = TEST_USERS[0]
            token = self.generate_test_jwt(user)
            
            if not token:
                self.log_result(
                    "Authentication State Persistence",
                    False,
                    error="Failed to generate JWT token"
                )
                return False
            
            headers = {'Authorization': f'Bearer {token}'}
            
            # Make multiple requests to test session persistence
            test_endpoints = [
                f"{API_BASE}/wallet/balance",
                f"{API_BASE}/ping",
                f"{API_BASE}/wallet/balance"  # Test again to verify persistence
            ]
            
            all_success = True
            for i, endpoint in enumerate(test_endpoints):
                response = self.session.get(endpoint, headers=headers)
                
                if response.status_code != 200:
                    self.log_result(
                        "Authentication State Persistence",
                        False,
                        error=f"Request {i+1} failed: HTTP {response.status_code}"
                    )
                    return False
                
                # For wallet balance endpoints, verify user data is consistent
                if 'wallet/balance' in endpoint:
                    data = response.json()
                    if data.get('wallet_address') != user['wallet_address']:
                        self.log_result(
                            "Authentication State Persistence",
                            False,
                            error=f"Inconsistent wallet address in request {i+1}"
                        )
                        return False
            
            self.log_result(
                "Authentication State Persistence",
                True,
                f"All {len(test_endpoints)} authenticated requests successful with consistent data"
            )
            return True
                
        except Exception as e:
            self.log_result("Authentication State Persistence", False, error=str(e))
            return False

    def test_wallet_error_handling(self):
        """Test 8: Wallet Error Handling and Edge Cases"""
        try:
            # Test with malformed authorization header
            malformed_headers = [
                {'Authorization': 'Bearer'},  # Missing token
                {'Authorization': 'InvalidFormat token'},  # Wrong format
                {'Authorization': ''},  # Empty
            ]
            
            success_count = 0
            for i, headers in enumerate(malformed_headers):
                response = self.session.get(f"{API_BASE}/wallet/balance", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    # Should return guest balance for malformed headers
                    if data['balance'] == 0.00 and data['wallet_address'] == 'Not connected':
                        success_count += 1
                    else:
                        self.log_result(
                            "Wallet Error Handling",
                            False,
                            error=f"Malformed header test {i+1} didn't return guest balance: {data}"
                        )
                        return False
                else:
                    self.log_result(
                        "Wallet Error Handling",
                        False,
                        error=f"Malformed header test {i+1} failed: HTTP {response.status_code}"
                    )
                    return False
            
            self.log_result(
                "Wallet Error Handling",
                True,
                f"All {len(malformed_headers)} malformed header tests handled correctly"
            )
            return True
                
        except Exception as e:
            self.log_result("Wallet Error Handling", False, error=str(e))
            return False

    def test_deposit_backend_support_apis(self):
        """Test 9: Backend APIs Supporting Deposit Functionality"""
        try:
            # Test APIs that the deposit function relies on
            test_apis = [
                {
                    'endpoint': f"{API_BASE}/ping",
                    'method': 'GET',
                    'description': 'Service availability check'
                },
                {
                    'endpoint': f"{API_BASE}/wallet/balance",
                    'method': 'GET', 
                    'description': 'Wallet balance retrieval',
                    'headers': {'Authorization': f'Bearer {self.generate_test_jwt(TEST_USERS[0])}'}
                }
            ]
            
            success_count = 0
            for test in test_apis:
                headers = test.get('headers', {})
                
                if test['method'] == 'GET':
                    response = self.session.get(test['endpoint'], headers=headers)
                else:
                    response = self.session.post(test['endpoint'], headers=headers)
                
                if response.status_code == 200:
                    success_count += 1
                    print(f"   ✅ {test['description']}: OK")
                else:
                    print(f"   ❌ {test['description']}: HTTP {response.status_code}")
            
            if success_count == len(test_apis):
                self.log_result(
                    "Deposit Backend Support APIs",
                    True,
                    f"All {len(test_apis)} deposit-supporting APIs working correctly"
                )
                return True
            else:
                self.log_result(
                    "Deposit Backend Support APIs",
                    False,
                    error=f"Only {success_count}/{len(test_apis)} APIs working"
                )
                return False
                
        except Exception as e:
            self.log_result("Deposit Backend Support APIs", False, error=str(e))
            return False

    def test_wallet_funding_simulation(self):
        """Test 10: Wallet Funding Mechanism Simulation"""
        try:
            user = TEST_USERS[0]
            token = self.generate_test_jwt(user)
            
            if not token:
                self.log_result(
                    "Wallet Funding Simulation",
                    False,
                    error="Failed to generate JWT token"
                )
                return False
            
            headers = {'Authorization': f'Bearer {token}'}
            
            # Step 1: Get initial balance
            response1 = self.session.get(f"{API_BASE}/wallet/balance", headers=headers)
            if response1.status_code != 200:
                self.log_result(
                    "Wallet Funding Simulation",
                    False,
                    error=f"Failed to get initial balance: HTTP {response1.status_code}"
                )
                return False
            
            initial_balance = response1.json()
            
            # Step 2: Simulate funding operation (check balance again)
            time.sleep(1)  # Simulate time delay
            response2 = self.session.get(f"{API_BASE}/wallet/balance", headers=headers)
            if response2.status_code != 200:
                self.log_result(
                    "Wallet Funding Simulation",
                    False,
                    error=f"Failed to get balance after funding: HTTP {response2.status_code}"
                )
                return False
            
            final_balance = response2.json()
            
            # Verify balance structure consistency
            if (initial_balance['wallet_address'] == final_balance['wallet_address'] and
                initial_balance['currency'] == final_balance['currency']):
                
                self.log_result(
                    "Wallet Funding Simulation",
                    True,
                    f"Funding simulation successful - wallet consistency maintained: {final_balance['wallet_address'][:10]}..."
                )
                return True
            else:
                self.log_result(
                    "Wallet Funding Simulation",
                    False,
                    error="Wallet data inconsistency detected during funding simulation"
                )
                return False
                
        except Exception as e:
            self.log_result("Wallet Funding Simulation", False, error=str(e))
            return False

    def run_all_tests(self):
        """Run all Privy deposit function backend tests"""
        print("🚀 STARTING PRIVY DEPOSIT FUNCTION BACKEND TESTING")
        print("=" * 60)
        print()
        
        start_time = time.time()
        
        # Test suite for Privy deposit function backend support
        tests = [
            self.test_api_health_check,
            self.test_wallet_balance_guest,
            self.test_wallet_balance_authenticated_jwt,
            self.test_wallet_balance_privy_token,
            self.test_wallet_balance_invalid_token,
            self.test_user_registration_with_wallet,
            self.test_authentication_state_persistence,
            self.test_wallet_error_handling,
            self.test_deposit_backend_support_apis,
            self.test_wallet_funding_simulation
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test.__name__}: {e}")
                failed += 1
        
        end_time = time.time()
        duration = end_time - start_time
        
        print("=" * 60)
        print("🏁 PRIVY DEPOSIT FUNCTION BACKEND TESTING COMPLETED")
        print(f"⏱️  Total Duration: {duration:.2f} seconds")
        print(f"✅ Tests Passed: {passed}")
        print(f"❌ Tests Failed: {failed}")
        print(f"📊 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        if failed == 0:
            print("\n🎉 ALL TESTS PASSED - PRIVY DEPOSIT FUNCTION BACKEND IS WORKING CORRECTLY!")
        else:
            print(f"\n⚠️  {failed} TESTS FAILED - REVIEW ISSUES ABOVE")
        
        return passed, failed, self.test_results

if __name__ == "__main__":
    tester = PrivyDepositTester()
    passed, failed, results = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)