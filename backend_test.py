#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Wallet Functionality with Updated Helius API Key
Testing Priority: Critical Wallet Fix Verification

This test suite verifies:
1. Wallet Balance API with new Helius API key
2. Wallet Transactions API functionality  
3. Helius RPC connectivity verification
4. Sample Solana wallet testing
5. Authentication integration testing
6. Error handling verification
7. JSON response format validation

PRIORITY FOCUS: Wallet Functionality Testing with New Helius API Key
Updated API Key: dccb9763-d453-4940-bd43-dfd987f278b1
Updated Environment Variables:
- HELIUS_API_KEY=dccb9763-d453-4940-bd43-dfd987f278b1
- NEXT_PUBLIC_HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=dccb9763-d453-4940-bd43-dfd987f278b1
- HELIUS_WEBSOCKET_URL=wss://atlas-mainnet.helius-rpc.com/?api-key=dccb9763-d453-4940-bd43-dfd987f278b1

TESTING REQUIREMENTS:
Core Focus (Priority 1):
1. Wallet Balance API - Test /api/wallet/balance with new Helius API key
2. Wallet Transactions API - Test /api/wallet/transactions with new Helius API key  
3. Helius RPC Connectivity - Verify direct connection to Helius with new API key
4. Sample Wallet Testing - Test with known Solana addresses

Secondary Focus (Priority 2):
5. Authentication Integration - Test wallet APIs with different auth scenarios
6. Error Handling - Verify proper error handling for invalid requests
7. JSON Response Format - Ensure APIs return proper JSON structure
"""

import requests
import json
import time
import base64
import sys
from datetime import datetime

# Configuration
HELIUS_API_KEY = "dccb9763-d453-4940-bd43-dfd987f278b1"
HELIUS_RPC_URL = f"https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"

# Sample Solana addresses for testing
SAMPLE_WALLETS = [
    "F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG",  # Test wallet 1
    "GrYLV9QSnkDwEQ3saypgM9LLHwE36QPZrYCRJceyQfTa",  # Site fee wallet
    "11111111111111111111111111111112",              # System program (should have balance)
    "So11111111111111111111111111111111111111112",   # Wrapped SOL mint
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"   # USDC mint
]

class WalletTester:
    def __init__(self):
        # Get base URL from environment
        with open('/app/.env', 'r') as f:
            env_content = f.read()
            for line in env_content.split('\n'):
                if line.startswith('NEXT_PUBLIC_BASE_URL='):
                    self.base_url = line.split('=', 1)[1].strip()
                    break
        
        if not hasattr(self, 'base_url'):
            self.base_url = "https://hathora-overhaul.preview.emergentagent.com"
        
        self.api_base = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.start_time = time.time()
        
        print(f"🚀 WALLET FUNCTIONALITY TESTING WITH UPDATED HELIUS API KEY")
        print(f"📍 Backend URL: {self.api_base}")
        print(f"🔑 Helius API Key: {HELIUS_API_KEY}")
        print(f"🎯 Focus: Wallet balance, transactions, Helius RPC connectivity")
        print("=" * 80)

    def log_result(self, test_name, passed, details=""):
        """Log test results with detailed information"""
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

    def test_helius_rpc_connectivity(self):
        """Test direct Helius RPC connectivity with new API key"""
        print("\n🔗 Testing Helius RPC Connectivity...")
        
        try:
            # Test basic RPC health check
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getHealth"
            }
            
            response = requests.post(HELIUS_RPC_URL, json=payload, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('result') == 'ok':
                    self.log_result("Helius RPC Health Check", True, f"Status: {data.get('result')}")
                else:
                    self.log_result("Helius RPC Health Check", False, f"Unexpected result: {data}")
            else:
                self.log_result("Helius RPC Health Check", False, f"HTTP {response.status_code}")
                
            # Test slot retrieval
            slot_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getSlot"
            }
            
            slot_response = requests.post(HELIUS_RPC_URL, json=slot_payload, timeout=10)
            if slot_response.status_code == 200:
                slot_data = slot_response.json()
                if 'result' in slot_data and isinstance(slot_data['result'], int):
                    self.log_result("Helius Slot Retrieval", True, f"Current slot: {slot_data['result']}")
                else:
                    self.log_result("Helius Slot Retrieval", False, f"Invalid slot data: {slot_data}")
            else:
                self.log_result("Helius Slot Retrieval", False, f"HTTP {slot_response.status_code}")
                
        except Exception as e:
            self.log_result("Helius RPC Connectivity", False, f"Exception: {str(e)}")

    def test_wallet_balance_guest(self):
        """Test wallet balance API for guest users"""
        print("\n💰 Testing Wallet Balance API - Guest User...")
        
        try:
            response = requests.get(f"{self.api_base}/wallet/balance", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['balance', 'currency', 'sol_balance', 'wallet_address']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Guest Wallet Balance Structure", True, 
                                  f"Balance: ${data.get('balance')}, SOL: {data.get('sol_balance')}")
                else:
                    self.log_result("Guest Wallet Balance Structure", False, 
                                  f"Missing fields: {missing_fields}")
                    
                # Verify guest balance is 0
                if data.get('balance') == 0.0 and data.get('sol_balance') == 0.0:
                    self.log_result("Guest Balance Values", True, "Correct zero balances for guest")
                else:
                    self.log_result("Guest Balance Values", False, 
                                  f"Expected zero balances, got: ${data.get('balance')}, {data.get('sol_balance')} SOL")
            else:
                self.log_result("Guest Wallet Balance API", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Guest Wallet Balance API", False, f"Exception: {str(e)}")

    def test_wallet_balance_with_jwt(self):
        """Test wallet balance API with JWT authentication"""
        print("\n🔐 Testing Wallet Balance API - JWT Authentication...")
        
        try:
            # Create a test JWT token
            test_payload = {
                "userId": "test-user-123",
                "email": "test@example.com",
                "jwt_wallet_address": SAMPLE_WALLETS[0],
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600
            }
            
            # Use testing token format
            test_token = "testing-" + base64.b64encode(json.dumps(test_payload).encode()).decode()
            
            headers = {"Authorization": f"Bearer {test_token}"}
            response = requests.get(f"{self.api_base}/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if we got realistic testing balance
                if data.get('balance', 0) > 0 and data.get('sol_balance', 0) > 0:
                    self.log_result("JWT Wallet Balance", True, 
                                  f"Balance: ${data.get('balance')}, SOL: {data.get('sol_balance')}, Address: {data.get('wallet_address')}")
                else:
                    self.log_result("JWT Wallet Balance", False, 
                                  f"Expected positive balances, got: ${data.get('balance')}, {data.get('sol_balance')} SOL")
            else:
                self.log_result("JWT Wallet Balance API", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("JWT Wallet Balance API", False, f"Exception: {str(e)}")
    
    def test_wallet_balance_with_privy_token(self):
        """Test wallet balance API with Privy token simulation"""
        print("\n🔑 Testing Wallet Balance API - Privy Token...")
        
        try:
            # Create a mock Privy token structure
            privy_payload = {
                "sub": "privy-user-456",
                "email": "privy@example.com",
                "wallet": {
                    "address": SAMPLE_WALLETS[0]
                },
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600
            }
            
            # Use testing token format for Privy simulation
            test_token = "testing-" + base64.b64encode(json.dumps(privy_payload).encode()).decode()
            
            headers = {"Authorization": f"Bearer {test_token}"}
            response = requests.get(f"{self.api_base}/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if we got realistic testing balance
                if data.get('balance', 0) > 0 and data.get('sol_balance', 0) > 0:
                    self.log_result("Privy Token Wallet Balance", True, 
                                  f"Balance: ${data.get('balance')}, SOL: {data.get('sol_balance')}, Address: {data.get('wallet_address')}")
                else:
                    self.log_result("Privy Token Wallet Balance", False, 
                                  f"Expected positive balances, got: ${data.get('balance')}, {data.get('sol_balance')} SOL")
            else:
                self.log_result("Privy Token Wallet Balance API", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Privy Token Wallet Balance API", False, f"Exception: {str(e)}")
    
    def test_sample_wallet_balances(self):
        """Test wallet balance retrieval for sample Solana addresses"""
        print("\n🎯 Testing Sample Solana Wallet Balances...")
        
        for i, wallet_address in enumerate(SAMPLE_WALLETS[:3]):  # Test first 3 wallets
            try:
                # Test direct Helius API call for this wallet
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
                        self.log_result(f"Sample Wallet {i+1} Balance", True, 
                                      f"Address: {wallet_address[:8]}...{wallet_address[-8:]} - {sol_balance:.4f} SOL")
                    else:
                        self.log_result(f"Sample Wallet {i+1} Balance", False, 
                                      f"Invalid response structure: {data}")
                else:
                    self.log_result(f"Sample Wallet {i+1} Balance", False, 
                                  f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Sample Wallet {i+1} Balance", False, f"Exception: {str(e)}")
    
    def test_wallet_transactions_api(self):
        """Test wallet transactions API"""
        print("\n📊 Testing Wallet Transactions API...")
        
        try:
            response = requests.get(f"{self.api_base}/wallet/transactions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['transactions', 'total_count', 'wallet_address', 'timestamp']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Transactions API Structure", True, 
                                  f"Count: {data.get('total_count')}, Address: {data.get('wallet_address')}")
                else:
                    self.log_result("Transactions API Structure", False, 
                                  f"Missing fields: {missing_fields}")
                    
                # Check if transactions is a list
                if isinstance(data.get('transactions'), list):
                    self.log_result("Transactions Array Type", True, "Transactions field is proper array")
                else:
                    self.log_result("Transactions Array Type", False, 
                                  f"Transactions field type: {type(data.get('transactions'))}")
            else:
                self.log_result("Wallet Transactions API", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Wallet Transactions API", False, f"Exception: {str(e)}")
    
    def test_json_response_format(self):
        """Test that APIs return proper JSON responses"""
        print("\n📋 Testing JSON Response Format...")
        
        endpoints = [
            "/wallet/balance",
            "/wallet/transactions"
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.api_base}{endpoint}", timeout=10)
                
                # Check Content-Type header
                content_type = response.headers.get('content-type', '')
                if 'application/json' in content_type:
                    self.log_result(f"JSON Content-Type {endpoint}", True, f"Content-Type: {content_type}")
                else:
                    self.log_result(f"JSON Content-Type {endpoint}", False, f"Content-Type: {content_type}")
                
                # Try to parse JSON
                try:
                    data = response.json()
                    self.log_result(f"JSON Parse {endpoint}", True, "Valid JSON response")
                except json.JSONDecodeError:
                    self.log_result(f"JSON Parse {endpoint}", False, "Invalid JSON response")
                    
            except Exception as e:
                self.log_result(f"JSON Format {endpoint}", False, f"Exception: {str(e)}")
    
    def test_authentication_error_handling(self):
        """Test error handling for invalid authentication"""
        print("\n🛡️ Testing Authentication Error Handling...")
        
        try:
            # Test with invalid token
            headers = {"Authorization": "Bearer invalid-token-12345"}
            response = requests.get(f"{self.api_base}/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                # Should return guest balance for invalid token
                if data.get('balance') == 0.0 and data.get('wallet_address') == 'Not connected':
                    self.log_result("Invalid Token Handling", True, "Correctly returns guest balance for invalid token")
                else:
                    self.log_result("Invalid Token Handling", False, 
                                  f"Unexpected response for invalid token: {data}")
            else:
                self.log_result("Invalid Token Handling", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Authentication Error Handling", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all Hathora integration tests"""
        print("🚀 STARTING PHASE 2 HATHORA INTEGRATION TESTING")
        print("=" * 80)
        
        start_time = time.time()
        
        # Core Focus Tests (Priority 1)
        print("📋 CORE FOCUS TESTS (PRIORITY 1)")
        print("-" * 40)
        self.test_api_health_check()
        self.test_hathora_room_creation_api()
        self.test_real_room_process_verification()
        self.test_game_session_integration()
        self.test_navigation_flow_backend_support()
        
        print("📋 SECONDARY FOCUS TESTS (PRIORITY 2)")
        print("-" * 40)
        self.test_websocket_authentication_support()
        self.test_balance_validation_support()
        self.test_general_application_health()
        
        total_time = time.time() - start_time
        
        # Print comprehensive summary
        print("=" * 80)
        print("🎯 PHASE 2 HATHORA INTEGRATION TEST RESULTS")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
        
        print(f"📊 OVERALL RESULTS: {self.passed_tests}/{self.total_tests} tests passed ({success_rate:.1f}% success rate)")
        print(f"⏱️  TOTAL TEST TIME: {total_time:.2f} seconds")
        print(f"🎮 BACKEND URL: {self.api_base}")
        print()
        
        # Categorize results
        critical_tests = ["API Health Check", "Hathora Room Creation API", "Real Room Process Verification", "Game Session Integration", "Navigation Flow Backend Support"]
        critical_passed = sum(1 for result in self.test_results if result['test'] in critical_tests and result['success'])
        critical_total = len([r for r in self.test_results if r['test'] in critical_tests])
        
        print(f"🔥 CRITICAL TESTS: {critical_passed}/{critical_total} passed")
        
        # Print detailed results
        print("\n📋 DETAILED TEST RESULTS:")
        print("-" * 60)
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"    📝 {result['details']}")
            if result['response_time'] > 0:
                print(f"    ⏱️  {result['response_time']:.3f}s")
        
        print("\n" + "=" * 80)
        
        # Determine overall status
        if success_rate >= 90:
            print("🎉 EXCELLENT: Phase 2 Hathora integration is working perfectly!")
        elif success_rate >= 75:
            print("✅ GOOD: Phase 2 Hathora integration is mostly working with minor issues")
        elif success_rate >= 50:
            print("⚠️  PARTIAL: Phase 2 Hathora integration has significant issues")
        else:
            print("❌ CRITICAL: Phase 2 Hathora integration has major problems")
        
        return success_rate >= 75

if __name__ == "__main__":
    tester = HathoraBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)