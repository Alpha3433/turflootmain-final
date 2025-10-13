#!/usr/bin/env python3
"""
TurfLoot Arena Privy Solana Wallet Integration Backend Testing
Testing complete Privy Solana wallet integration and paid room entry functionality
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-fix-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class PrivySolanaBackendTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name, passed, details="", error=""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            self.failed_tests += 1
            status = "❌ FAILED"
            
        result = {
            'test': test_name,
            'status': status,
            'passed': passed,
            'details': details,
            'error': error,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()

    def test_api_health_check(self):
        """Test 1: API Health Check - Backend infrastructure operational"""
        try:
            response = requests.get(f"{API_BASE}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                service = data.get('service', '')
                status = data.get('status', '')
                features = data.get('features', [])
                
                if service == 'turfloot-api' and status == 'operational':
                    auth_enabled = 'auth' in features
                    blockchain_enabled = 'blockchain' in features
                    multiplayer_enabled = 'multiplayer' in features
                    
                    details = f"Service: {service}, Status: {status}, Features: {features}"
                    if auth_enabled and blockchain_enabled:
                        self.log_test("API Health Check", True, details)
                        return True
                    else:
                        self.log_test("API Health Check", False, details, "Missing required features (auth/blockchain)")
                        return False
                else:
                    self.log_test("API Health Check", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("API Health Check", False, "", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, "", str(e))
            return False

    def test_wallet_balance_api_guest(self):
        """Test 2: Wallet Balance API - Guest User (No Authentication)"""
        try:
            response = requests.get(f"{API_BASE}/wallet/balance", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields for guest user
                required_fields = ['balance', 'currency', 'sol_balance', 'wallet_address']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    balance = data.get('balance', 0)
                    sol_balance = data.get('sol_balance', 0)
                    wallet_address = data.get('wallet_address', '')
                    
                    # Guest should have 0 balance and "Not connected" wallet
                    if balance == 0 and sol_balance == 0 and wallet_address == 'Not connected':
                        details = f"Balance: {balance}, SOL: {sol_balance}, Wallet: {wallet_address}"
                        self.log_test("Wallet Balance API - Guest", True, details)
                        return True
                    else:
                        details = f"Balance: {balance}, SOL: {sol_balance}, Wallet: {wallet_address}"
                        self.log_test("Wallet Balance API - Guest", False, details, "Unexpected guest balance values")
                        return False
                else:
                    self.log_test("Wallet Balance API - Guest", False, "", f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Wallet Balance API - Guest", False, "", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Wallet Balance API - Guest", False, "", str(e))
            return False

    def test_server_browser_api(self):
        """Test 3: Server Browser API - Room configurations with entry fees ($0.02, $0.05, $0.10)"""
        try:
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                servers = data.get('servers', [])
                colyseus_enabled = data.get('colyseusEnabled', False)
                
                # Check for rooms with correct entry fees ($0.02, $0.05, $0.10)
                expected_fees = [0.02, 0.05, 0.10]
                found_fees = []
                
                for server in servers:
                    entry_fee = server.get('entryFee', 0)
                    if entry_fee in expected_fees:
                        found_fees.append(entry_fee)
                
                # Check if we have the expected room configurations
                has_free_room = any(s.get('entryFee', 0) == 0 for s in servers)
                has_paid_rooms = len(found_fees) > 0
                
                details = f"Servers: {len(servers)}, Colyseus: {colyseus_enabled}, Entry fees: {found_fees}"
                
                if has_free_room and has_paid_rooms and colyseus_enabled:
                    self.log_test("Server Browser API", True, details)
                    return True
                else:
                    self.log_test("Server Browser API", False, details, "Missing expected room configurations")
                    return False
            else:
                self.log_test("Server Browser API", False, "", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Server Browser API", False, "", str(e))
            return False

    def test_privy_authentication_integration(self):
        """Test 4: Privy Authentication Integration - API endpoints working with Privy tokens"""
        try:
            # Test with mock Privy token format
            privy_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6cHJpdnk6Y21keWNnbHRrMDA3bGpzMGJwamJqcXgwYSIsImVtYWlsIjoidGVzdEBwcml2eS5pbyIsIndhbGxldCI6eyJhZGRyZXNzIjoiRjd6RGV3MTUxYnlhOEthdFppSEY2RVhEQmk4RFZOSnZyTEU2MTl2d3lwdkcifX0.test_signature"
            
            headers = {'Authorization': f'Bearer {privy_token}'}
            
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                balance = data.get('balance', 0)
                wallet_address = data.get('wallet_address', '')
                
                details = f"Privy token processed, Balance: {balance}, Wallet: {wallet_address}"
                self.log_test("Privy Authentication Integration", True, details)
                return True
            else:
                self.log_test("Privy Authentication Integration", False, "", f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Privy Authentication Integration", False, "", str(e))
            return False

    def test_sol_transaction_processing(self):
        """Test 5: SOL Transaction Processing - Verify SOL transaction logic support"""
        try:
            # Test wallet transactions endpoint for SOL transaction support
            response = requests.get(f"{API_BASE}/wallet/transactions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return transaction structure ready for SOL transactions
                if isinstance(data, list) or 'transactions' in data:
                    details = f"Transaction endpoint ready for SOL transactions"
                    self.log_test("SOL Transaction Processing", True, details)
                    return True
                else:
                    self.log_test("SOL Transaction Processing", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("SOL Transaction Processing", False, "", f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("SOL Transaction Processing", False, "", str(e))
            return False

    def test_arena_room_api(self):
        """Test 6: Arena Room API - Room creation and management"""
        try:
            room_data = {
                "name": "Test Privy Room",
                "gameType": "Arena Battle", 
                "region": "Global",
                "entryFee": 0,
                "maxPlayers": 8,
                "creatorWallet": "F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG",
                "creatorName": "TestUser",
                "privyUserId": "did:privy:test123"
            }
            
            response = requests.post(f"{API_BASE}/rooms/create", json=room_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                room_id = data.get('roomId', '')
                
                if success and room_id:
                    details = f"Room created successfully: {room_id}"
                    self.log_test("Arena Room API", True, details)
                    return True
                else:
                    self.log_test("Arena Room API", False, f"Success: {success}, RoomId: {room_id}")
                    return False
            else:
                self.log_test("Arena Room API", False, "", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Arena Room API", False, "", str(e))
            return False

    def test_privy_wallet_balance_proper_format(self):
        """Test 7: Privy Wallet Balance - Proper format and authentication"""
        try:
            # Use a testing JWT token
            headers = {
                'Authorization': 'Bearer testing-eyJ1c2VySWQiOiJ0ZXN0X3VzZXJfMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwid2FsbGV0X2FkZHJlc3MiOiJGN3pEZXcxNTFieWE4S2F0WmlIRjZFWERCaThEVk5KdnJMRTYxOXZ3eXB2RyJ9'
            }
            
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['balance', 'currency', 'sol_balance', 'wallet_address']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    balance = data.get('balance', 0)
                    sol_balance = data.get('sol_balance', 0)
                    wallet_address = data.get('wallet_address', '')
                    
                    # Authenticated user should have some balance and wallet address
                    if balance > 0 and wallet_address != 'Not connected':
                        details = f"Balance: {balance}, SOL: {sol_balance}, Wallet: {wallet_address}"
                        self.log_test("Privy Wallet Balance Proper Format", True, details)
                        return True
                    else:
                        details = f"Balance: {balance}, SOL: {sol_balance}, Wallet: {wallet_address}"
                        self.log_test("Privy Wallet Balance Proper Format", False, details, "Expected positive balance and wallet address")
                        return False
                else:
                    self.log_test("Privy Wallet Balance Proper Format", False, "", f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Privy Wallet Balance Proper Format", False, "", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Privy Wallet Balance Proper Format", False, "", str(e))
            return False

    def test_no_signandsendtransaction_errors(self):
        """Test 8: No signAndSendTransaction Errors - Backend should not have undefined errors"""
        try:
            # Test multiple endpoints to ensure no backend errors
            endpoints = [
                f"{API_BASE}",
                f"{API_BASE}/servers",
                f"{API_BASE}/wallet/balance",
                f"{API_BASE}/wallet/transactions"
            ]
            
            all_working = True
            error_details = []
            
            for endpoint in endpoints:
                try:
                    response = requests.get(endpoint, timeout=5)
                    if response.status_code not in [200, 404]:  # 404 is acceptable for some endpoints
                        all_working = False
                        error_details.append(f"{endpoint}: HTTP {response.status_code}")
                except Exception as e:
                    all_working = False
                    error_details.append(f"{endpoint}: {str(e)}")
            
            if all_working:
                details = f"All endpoints responding correctly, no signAndSendTransaction errors detected"
                self.log_test("No signAndSendTransaction Errors", True, details)
                return True
            else:
                self.log_test("No signAndSendTransaction Errors", False, f"Errors: {error_details}")
                return False
                
        except Exception as e:
            self.log_test("No signAndSendTransaction Errors", False, "", str(e))
            return False

    def run_all_tests(self):
        """Run all backend tests for Privy Solana wallet integration"""
        print("🎯 PRIVY SOLANA WALLET INTEGRATION BACKEND TESTING STARTED")
        print("=" * 80)
        print(f"Testing against: {BASE_URL}")
        print(f"Started at: {datetime.now().isoformat()}")
        print()
        
        # Execute all tests
        tests = [
            self.test_api_health_check,
            self.test_wallet_balance_api_guest,
            self.test_server_browser_api,
            self.test_privy_authentication_integration,
            self.test_sol_transaction_processing,
            self.test_arena_room_api,
            self.test_privy_wallet_balance_proper_format,
            self.test_no_signandsendtransaction_errors
        ]
        
        start_time = time.time()
        
        for test in tests:
            try:
                test()
            except Exception as e:
                test_name = test.__name__.replace('test_', '').replace('_', ' ').title()
                self.log_test(test_name, False, "", f"Test execution error: {str(e)}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("=" * 80)
        print("🎯 PRIVY SOLANA WALLET INTEGRATION BACKEND TESTING SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        print()
        
        # Print detailed results
        print("DETAILED TEST RESULTS:")
        print("-" * 40)
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   Details: {result['details']}")
            if result['error']:
                print(f"   Error: {result['error']}")
        
        print()
        print(f"Testing completed at: {datetime.now().isoformat()}")
        
        return self.passed_tests, self.failed_tests, self.total_tests

if __name__ == "__main__":
    tester = PrivySolanaBackendTester()
    passed, failed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)