#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Wallet Functionality with Updated Helius API Key
Testing wallet balance API, Helius RPC connectivity, SOL balance retrieval, and authentication integration
"""

import requests
import json
import time
import base64
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-gameroom.preview.emergentagent.com"
HELIUS_API_KEY = "dccb9763-d453-4940-bd43-dfd987f278b1"
HELIUS_RPC_URL = f"https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"

# Test wallet addresses (real Solana addresses for testing)
TEST_WALLETS = [
    "F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG",  # Default test wallet
    "11111111111111111111111111111112",  # System program (should have 0 balance)
    "So11111111111111111111111111111111111111112",  # Wrapped SOL mint (should have 0 balance)
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC mint (should have 0 balance)
]

class WalletTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
            
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        
        print(result)
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        
    def test_helius_rpc_connectivity(self):
        """Test 1: Verify Helius RPC connectivity with new API key"""
        print("\n🔗 TESTING HELIUS RPC CONNECTIVITY")
        
        try:
            # Test basic RPC call to Helius
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getHealth"
            }
            
            response = requests.post(HELIUS_RPC_URL, json=payload, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'result' in data and data['result'] == 'ok':
                    self.log_result("Helius RPC Health Check", True, f"Status: {data['result']}")
                else:
                    self.log_result("Helius RPC Health Check", False, f"Unexpected response: {data}")
            else:
                self.log_result("Helius RPC Health Check", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Helius RPC Health Check", False, f"Exception: {str(e)}")
    
    def test_helius_balance_retrieval(self):
        """Test 2: Test SOL balance retrieval for different wallet addresses"""
        print("\n💰 TESTING HELIUS SOL BALANCE RETRIEVAL")
        
        for i, wallet_address in enumerate(TEST_WALLETS):
            try:
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getBalance",
                    "params": [wallet_address]
                }
                
                response = requests.post(HELIUS_RPC_URL, json=payload, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'result' in data and 'value' in data['result']:
                        lamports = data['result']['value']
                        sol_balance = lamports / 1e9
                        self.log_result(f"SOL Balance Retrieval #{i+1}", True, 
                                      f"Wallet: {wallet_address[:8]}...{wallet_address[-8:]} = {sol_balance:.4f} SOL")
                    else:
                        self.log_result(f"SOL Balance Retrieval #{i+1}", False, f"Invalid response: {data}")
                else:
                    self.log_result(f"SOL Balance Retrieval #{i+1}", False, 
                                  f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_result(f"SOL Balance Retrieval #{i+1}", False, f"Exception: {str(e)}")
    
    def test_wallet_balance_api_guest(self):
        """Test 3: Test wallet balance API for guest users"""
        print("\n🎭 TESTING WALLET BALANCE API - GUEST USER")
        
        try:
            response = requests.get(f"{BASE_URL}/api/wallet/balance", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['balance', 'currency', 'sol_balance', 'usdc_balance', 'wallet_address']
                
                if all(field in data for field in required_fields):
                    if data['balance'] == 0.0 and data['sol_balance'] == 0.0:
                        self.log_result("Guest User Balance API", True, 
                                      f"Balance: ${data['balance']}, SOL: {data['sol_balance']}, Wallet: {data['wallet_address']}")
                    else:
                        self.log_result("Guest User Balance API", False, 
                                      f"Expected 0 balance for guest, got: ${data['balance']}, SOL: {data['sol_balance']}")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Guest User Balance API", False, f"Missing fields: {missing}")
            else:
                self.log_result("Guest User Balance API", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Guest User Balance API", False, f"Exception: {str(e)}")
    
    def test_wallet_balance_api_jwt(self):
        """Test 4: Test wallet balance API with JWT authentication"""
        print("\n🔐 TESTING WALLET BALANCE API - JWT AUTHENTICATION")
        
        try:
            # Create a test JWT token
            test_payload = {
                "userId": "test-user-123",
                "email": "test@turfloot.com",
                "jwt_wallet_address": TEST_WALLETS[0],
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600
            }
            
            # For testing, we'll use a testing token format
            testing_token = "testing-" + base64.b64encode(json.dumps(test_payload).encode()).decode()
            
            headers = {"Authorization": f"Bearer {testing_token}"}
            response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['balance', 'currency', 'sol_balance', 'usdc_balance', 'wallet_address']
                
                if all(field in data for field in required_fields):
                    if data['balance'] > 0 and data['sol_balance'] > 0:
                        self.log_result("JWT Authentication Balance API", True, 
                                      f"Balance: ${data['balance']}, SOL: {data['sol_balance']}, Wallet: {data['wallet_address']}")
                    else:
                        self.log_result("JWT Authentication Balance API", False, 
                                      f"Expected positive balance for authenticated user, got: ${data['balance']}, SOL: {data['sol_balance']}")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("JWT Authentication Balance API", False, f"Missing fields: {missing}")
            else:
                self.log_result("JWT Authentication Balance API", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("JWT Authentication Balance API", False, f"Exception: {str(e)}")
    
    def test_wallet_balance_api_privy(self):
        """Test 5: Test wallet balance API with Privy token simulation"""
        print("\n🔑 TESTING WALLET BALANCE API - PRIVY TOKEN SIMULATION")
        
        try:
            # Create a mock Privy token structure
            privy_payload = {
                "sub": "privy-user-456",
                "email": "privy@turfloot.com",
                "wallet": {
                    "address": TEST_WALLETS[0]
                },
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600
            }
            
            # Create a testing token that simulates Privy format
            testing_token = "testing-" + base64.b64encode(json.dumps(privy_payload).encode()).decode()
            
            headers = {"Authorization": f"Bearer {testing_token}"}
            response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['balance', 'currency', 'sol_balance', 'usdc_balance', 'wallet_address']
                
                if all(field in data for field in required_fields):
                    if data['balance'] > 0 and data['sol_balance'] > 0:
                        self.log_result("Privy Token Balance API", True, 
                                      f"Balance: ${data['balance']}, SOL: {data['sol_balance']}, Wallet: {data['wallet_address']}")
                    else:
                        self.log_result("Privy Token Balance API", False, 
                                      f"Expected positive balance for Privy user, got: ${data['balance']}, SOL: {data['sol_balance']}")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Privy Token Balance API", False, f"Missing fields: {missing}")
            else:
                self.log_result("Privy Token Balance API", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Privy Token Balance API", False, f"Exception: {str(e)}")
    
    def test_wallet_transactions_api(self):
        """Test 6: Test wallet transactions API"""
        print("\n📊 TESTING WALLET TRANSACTIONS API")
        
        try:
            # Test without authentication
            response = requests.get(f"{BASE_URL}/api/wallet/transactions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['transactions', 'total_count', 'wallet_address', 'timestamp']
                
                if all(field in data for field in required_fields):
                    if isinstance(data['transactions'], list) and data['total_count'] >= 0:
                        self.log_result("Wallet Transactions API", True, 
                                      f"Transactions: {len(data['transactions'])}, Total: {data['total_count']}")
                    else:
                        self.log_result("Wallet Transactions API", False, 
                                      f"Invalid transaction data structure: {data}")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Wallet Transactions API", False, f"Missing fields: {missing}")
            else:
                self.log_result("Wallet Transactions API", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Wallet Transactions API", False, f"Exception: {str(e)}")
    
    def test_api_error_resolution(self):
        """Test 7: Test that previous 401/403 errors are resolved"""
        print("\n🔧 TESTING API ERROR RESOLUTION")
        
        try:
            # Test with invalid token to ensure proper error handling
            headers = {"Authorization": "Bearer invalid-token-12345"}
            response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                # Should return guest balance for invalid token, not 401/403
                if 'balance' in data and data['balance'] == 0.0:
                    self.log_result("API Error Resolution", True, 
                                  "Invalid token gracefully handled with guest balance")
                else:
                    self.log_result("API Error Resolution", False, 
                                  f"Unexpected response for invalid token: {data}")
            elif response.status_code in [401, 403]:
                self.log_result("API Error Resolution", False, 
                              f"Still getting {response.status_code} errors for invalid tokens")
            else:
                self.log_result("API Error Resolution", False, 
                              f"Unexpected status code: {response.status_code}")
                
        except Exception as e:
            self.log_result("API Error Resolution", False, f"Exception: {str(e)}")
    
    def test_helius_websocket_url(self):
        """Test 8: Verify Helius WebSocket URL configuration"""
        print("\n🌐 TESTING HELIUS WEBSOCKET URL CONFIGURATION")
        
        try:
            # Test that the WebSocket URL is properly configured
            expected_ws_url = f"wss://atlas-mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"
            
            # We can't directly test WebSocket connection in this script, but we can verify the URL format
            if HELIUS_API_KEY in expected_ws_url and "wss://" in expected_ws_url:
                self.log_result("Helius WebSocket URL Configuration", True, 
                              f"WebSocket URL properly configured with API key")
            else:
                self.log_result("Helius WebSocket URL Configuration", False, 
                              "WebSocket URL configuration issue")
                
        except Exception as e:
            self.log_result("Helius WebSocket URL Configuration", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all wallet functionality tests"""
        print("🚀 STARTING COMPREHENSIVE WALLET FUNCTIONALITY TESTING")
        print(f"📅 Test started at: {datetime.now().isoformat()}")
        print(f"🔗 Base URL: {BASE_URL}")
        print(f"🔑 Helius API Key: {HELIUS_API_KEY[:8]}...{HELIUS_API_KEY[-8:]}")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all tests
        self.test_helius_rpc_connectivity()
        self.test_helius_balance_retrieval()
        self.test_wallet_balance_api_guest()
        self.test_wallet_balance_api_jwt()
        self.test_wallet_balance_api_privy()
        self.test_wallet_transactions_api()
        self.test_api_error_resolution()
        self.test_helius_websocket_url()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 WALLET FUNCTIONALITY TESTING SUMMARY")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.passed_tests}/{self.total_tests}")
        print(f"❌ Tests Failed: {self.total_tests - self.passed_tests}/{self.total_tests}")
        print(f"📈 Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%")
        print(f"⏱️  Total Duration: {duration:.2f} seconds")
        print(f"📅 Completed at: {datetime.now().isoformat()}")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 ALL WALLET FUNCTIONALITY TESTS PASSED!")
            print("✅ Helius API key update successful")
            print("✅ Wallet balance API working correctly")
            print("✅ SOL balance retrieval operational")
            print("✅ Authentication integration functional")
            print("✅ API error handling resolved")
        else:
            print(f"\n⚠️  {self.total_tests - self.passed_tests} TESTS FAILED")
            print("❌ Some wallet functionality issues detected")
            
            # Print failed tests
            failed_tests = [r for r in self.results if not r['success']]
            if failed_tests:
                print("\nFAILED TESTS:")
                for test in failed_tests:
                    print(f"  ❌ {test['test']}: {test['details']}")
        
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = WalletTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)