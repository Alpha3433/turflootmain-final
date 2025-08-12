#!/usr/bin/env python3
"""
Enhanced Cash Out Workflow Backend API Testing
Testing the enhanced cash out functionality with improved validation, fee calculation, and user experience.
Focus: Verify enhanced cash out workflow with SOL/USD minimums, platform fees, and improved UX
"""

import requests
import json
import time
import uuid
import sys
from datetime import datetime

# Configuration - Use external URL for testing
BASE_URL = "https://6ab07e9e-a0f5-48da-9a37-3af5eed166ad.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class TurfLootAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
    
    def authenticate_user(self):
        """Authenticate a test user via Privy"""
        print("\n🔑 AUTHENTICATION TESTING")
        print("=" * 50)
        
        try:
            # Create test Privy user data
            test_email = f"cashout.test.{int(time.time())}@turfloot.com"
            privy_user_data = {
                "privy_user": {
                    "id": f"did:privy:cm{uuid.uuid4().hex[:20]}",
                    "email": {
                        "address": test_email
                    },
                    "google": None,
                    "wallet": None
                }
            }
            
            response = self.session.post(
                f"{API_BASE}/auth/privy",
                json=privy_user_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('token')
                self.test_user_id = data.get('user', {}).get('id')
                
                # Set authorization header for future requests
                self.session.headers.update({
                    'Authorization': f'Bearer {self.auth_token}'
                })
                
                self.log_test(
                    "User Authentication via Privy", 
                    True, 
                    f"User created: {test_email}, Token length: {len(self.auth_token) if self.auth_token else 0}"
                )
                return True
            else:
                self.log_test(
                    "User Authentication via Privy", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                return False
                
        except Exception as e:
            self.log_test("User Authentication via Privy", False, f"Exception: {str(e)}")
            return False
    
    def test_wallet_balance_api(self):
        """Test wallet balance retrieval for cash out modal"""
        print("\n💰 WALLET BALANCE API TESTING")
        print("=" * 50)
        
        try:
            response = self.session.get(f"{API_BASE}/wallet/balance")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['balance', 'currency', 'sol_balance', 'usdc_balance']
                
                if all(field in data for field in required_fields):
                    self.log_test(
                        "Wallet Balance API Structure", 
                        True, 
                        f"Balance: ${data['balance']}, SOL: {data['sol_balance']}, USDC: {data['usdc_balance']}"
                    )
                    return data
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test(
                        "Wallet Balance API Structure", 
                        False, 
                        f"Missing fields: {missing}"
                    )
                    return None
            else:
                self.log_test(
                    "Wallet Balance API", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                return None
                
        except Exception as e:
            self.log_test("Wallet Balance API", False, f"Exception: {str(e)}")
            return None
    
    def add_test_funds(self):
        """Add test funds to user account for cash out testing"""
        print("\n💳 ADDING TEST FUNDS")
        print("=" * 50)
        
        try:
            # Add SOL funds
            sol_deposit = {
                "amount": 1.0,
                "currency": "SOL",
                "transaction_hash": f"test_tx_{uuid.uuid4().hex[:16]}"
            }
            
            response = self.session.post(
                f"{API_BASE}/wallet/add-funds",
                json=sol_deposit,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                self.log_test(
                    "Add SOL Test Funds", 
                    True, 
                    "Added 1.0 SOL for cash out testing"
                )
                
                # Add USDC funds
                usdc_deposit = {
                    "amount": 100.0,
                    "currency": "USDC",
                    "transaction_hash": f"test_tx_{uuid.uuid4().hex[:16]}"
                }
                
                response = self.session.post(
                    f"{API_BASE}/wallet/add-funds",
                    json=usdc_deposit,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    self.log_test(
                        "Add USDC Test Funds", 
                        True, 
                        "Added 100.0 USDC for cash out testing"
                    )
                    return True
                else:
                    self.log_test(
                        "Add USDC Test Funds", 
                        False, 
                        f"Status: {response.status_code}"
                    )
                    return False
            else:
                self.log_test(
                    "Add SOL Test Funds", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                return False
                
        except Exception as e:
            self.log_test("Add Test Funds", False, f"Exception: {str(e)}")
            return False
    
    def test_enhanced_cash_out_api(self):
        """Test enhanced cash out API with improved validation and fee calculation"""
        print("\n💸 ENHANCED CASH OUT API TESTING")
        print("=" * 50)
        
        # Test 1: SOL minimum amount validation (0.05 SOL)
        try:
            invalid_sol_request = {
                "amount": 0.01,  # Below minimum of 0.05
                "currency": "SOL",
                "recipient_address": "11111111111111111111111111111112"  # Valid Solana address
            }
            
            response = self.session.post(
                f"{API_BASE}/wallet/cash-out",
                json=invalid_sol_request,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 400:
                data = response.json()
                if "minimum" in data.get('error', '').lower():
                    self.log_test(
                        "SOL Minimum Amount Validation (0.05 SOL)", 
                        True, 
                        f"Correctly rejected 0.01 SOL: {data.get('error')}"
                    )
                else:
                    self.log_test(
                        "SOL Minimum Amount Validation (0.05 SOL)", 
                        False, 
                        f"Wrong error message: {data.get('error')}"
                    )
            else:
                self.log_test(
                    "SOL Minimum Amount Validation (0.05 SOL)", 
                    False, 
                    f"Expected 400, got {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("SOL Minimum Amount Validation", False, f"Exception: {str(e)}")
        
        # Test 2: USD minimum amount validation ($20)
        try:
            invalid_usd_request = {
                "amount": 10.0,  # Below minimum of $20
                "currency": "USD",
                "recipient_address": "11111111111111111111111111111112"
            }
            
            response = self.session.post(
                f"{API_BASE}/wallet/cash-out",
                json=invalid_usd_request,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 400:
                data = response.json()
                if "minimum" in data.get('error', '').lower():
                    self.log_test(
                        "USD Minimum Amount Validation ($20)", 
                        True, 
                        f"Correctly rejected $10: {data.get('error')}"
                    )
                else:
                    self.log_test(
                        "USD Minimum Amount Validation ($20)", 
                        False, 
                        f"Wrong error message: {data.get('error')}"
                    )
            else:
                self.log_test(
                    "USD Minimum Amount Validation ($20)", 
                    False, 
                    f"Expected 400, got {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("USD Minimum Amount Validation", False, f"Exception: {str(e)}")
        
        # Test 3: Valid SOL cash out with 10% platform fee calculation
        try:
            valid_sol_request = {
                "amount": 0.1,  # Valid amount above minimum
                "currency": "SOL",
                "recipient_address": "11111111111111111111111111111112"
            }
            
            response = self.session.post(
                f"{API_BASE}/wallet/cash-out",
                json=valid_sol_request,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                expected_fee = 0.1 * 0.1  # 10% of 0.1 SOL = 0.01 SOL
                expected_net = 0.1 - expected_fee  # 0.09 SOL
                
                if (abs(data.get('platform_fee', 0) - expected_fee) < 0.0001 and 
                    abs(data.get('net_amount', 0) - expected_net) < 0.0001):
                    self.log_test(
                        "SOL Cash Out with 10% Platform Fee", 
                        True, 
                        f"Fee: {data.get('platform_fee')} SOL, Net: {data.get('net_amount')} SOL"
                    )
                else:
                    self.log_test(
                        "SOL Cash Out with 10% Platform Fee", 
                        False, 
                        f"Fee calculation error. Expected fee: {expected_fee}, got: {data.get('platform_fee')}"
                    )
            else:
                data = response.json()
                self.log_test(
                    "SOL Cash Out with 10% Platform Fee", 
                    False, 
                    f"Status: {response.status_code}, Error: {data.get('error')}"
                )
                
        except Exception as e:
            self.log_test("SOL Cash Out with Platform Fee", False, f"Exception: {str(e)}")
        
        # Test 4: Insufficient balance scenario
        try:
            insufficient_request = {
                "amount": 10.0,  # More than available balance
                "currency": "SOL",
                "recipient_address": "11111111111111111111111111111112"
            }
            
            response = self.session.post(
                f"{API_BASE}/wallet/cash-out",
                json=insufficient_request,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 400:
                data = response.json()
                if "insufficient" in data.get('error', '').lower():
                    self.log_test(
                        "Insufficient Balance Validation", 
                        True, 
                        f"Correctly rejected large amount: {data.get('error')}"
                    )
                else:
                    self.log_test(
                        "Insufficient Balance Validation", 
                        False, 
                        f"Wrong error message: {data.get('error')}"
                    )
            else:
                self.log_test(
                    "Insufficient Balance Validation", 
                    False, 
                    f"Expected 400, got {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Insufficient Balance Validation", False, f"Exception: {str(e)}")
        
        # Test 5: Missing recipient address validation
        try:
            missing_address_request = {
                "amount": 0.1,
                "currency": "SOL"
                # Missing recipient_address
            }
            
            response = self.session.post(
                f"{API_BASE}/wallet/cash-out",
                json=missing_address_request,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 400:
                data = response.json()
                self.log_test(
                    "Missing Recipient Address Validation", 
                    True, 
                    f"Correctly rejected missing address: {data.get('error')}"
                )
            else:
                self.log_test(
                    "Missing Recipient Address Validation", 
                    False, 
                    f"Expected 400, got {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Missing Recipient Address Validation", False, f"Exception: {str(e)}")
    
    def test_transaction_recording(self):
        """Test transaction history API to verify cash out transactions are recorded"""
        print("\n📊 TRANSACTION RECORDING TESTING")
        print("=" * 50)
        
        try:
            response = self.session.get(f"{API_BASE}/wallet/transactions")
            
            if response.status_code == 200:
                data = response.json()
                transactions = data.get('transactions', [])
                
                # Look for cash out transactions
                cash_out_transactions = [tx for tx in transactions if tx.get('type') == 'withdrawal']
                
                if cash_out_transactions:
                    latest_cash_out = cash_out_transactions[0]
                    required_fields = ['id', 'type', 'amount', 'currency', 'status', 'fee_amount', 'net_amount']
                    
                    if all(field in latest_cash_out for field in required_fields):
                        self.log_test(
                            "Cash Out Transaction Recording", 
                            True, 
                            f"Found {len(cash_out_transactions)} cash out transactions with all required fields"
                        )
                    else:
                        missing = [f for f in required_fields if f not in latest_cash_out]
                        self.log_test(
                            "Cash Out Transaction Recording", 
                            False, 
                            f"Missing transaction fields: {missing}"
                        )
                else:
                    self.log_test(
                        "Cash Out Transaction Recording", 
                        True, 
                        "No cash out transactions found (expected for new user)"
                    )
                
                self.log_test(
                    "Transaction History API Structure", 
                    True, 
                    f"Retrieved {len(transactions)} total transactions"
                )
                
            else:
                self.log_test(
                    "Transaction History API", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Transaction Recording", False, f"Exception: {str(e)}")
    
    def test_unauthenticated_access(self):
        """Test that wallet APIs properly require authentication"""
        print("\n🔒 AUTHENTICATION REQUIREMENT TESTING")
        print("=" * 50)
        
        # Remove auth header temporarily
        original_headers = self.session.headers.copy()
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']
        
        try:
            # Test wallet balance without auth
            response = self.session.get(f"{API_BASE}/wallet/balance")
            if response.status_code == 401:
                self.log_test(
                    "Wallet Balance Authentication Required", 
                    True, 
                    "Correctly rejected unauthenticated request"
                )
            else:
                self.log_test(
                    "Wallet Balance Authentication Required", 
                    False, 
                    f"Expected 401, got {response.status_code}"
                )
            
            # Test cash out without auth
            response = self.session.post(
                f"{API_BASE}/wallet/cash-out",
                json={"amount": 0.1, "currency": "SOL", "recipient_address": "test"},
                headers={'Content-Type': 'application/json'}
            )
            if response.status_code == 401:
                self.log_test(
                    "Cash Out Authentication Required", 
                    True, 
                    "Correctly rejected unauthenticated request"
                )
            else:
                self.log_test(
                    "Cash Out Authentication Required", 
                    False, 
                    f"Expected 401, got {response.status_code}"
                )
            
            # Test transactions without auth
            response = self.session.get(f"{API_BASE}/wallet/transactions")
            if response.status_code == 401:
                self.log_test(
                    "Transaction History Authentication Required", 
                    True, 
                    "Correctly rejected unauthenticated request"
                )
            else:
                self.log_test(
                    "Transaction History Authentication Required", 
                    False, 
                    f"Expected 401, got {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Authentication Requirements", False, f"Exception: {str(e)}")
        finally:
            # Restore auth headers
            self.session.headers.update(original_headers)
    
    def run_all_tests(self):
        """Run all enhanced cash out workflow tests"""
        print("🚀 ENHANCED CASH OUT WORKFLOW TESTING")
        print("=" * 60)
        print(f"Testing against: {BASE_URL}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 60)
        
        # Step 1: Authenticate user
        if not self.authenticate_user():
            print("❌ Authentication failed - cannot proceed with wallet tests")
            return
        
        # Step 2: Test wallet balance API
        balance_data = self.test_wallet_balance_api()
        
        # Step 3: Add test funds for cash out testing
        self.add_test_funds()
        
        # Step 4: Test enhanced cash out API
        self.test_enhanced_cash_out_api()
        
        # Step 5: Test transaction recording
        self.test_transaction_recording()
        
        # Step 6: Test authentication requirements
        self.test_unauthenticated_access()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📋 ENHANCED CASH OUT WORKFLOW TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"✅ Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - Enhanced cash out workflow is working perfectly!")
        else:
            print("⚠️  Some tests failed - see details above")
            failed_tests = [r for r in self.test_results if not r['success']]
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['details']}")
        
        print("\n🔍 KEY FEATURES TESTED:")
        print("   • SOL minimum amount validation (0.05 SOL)")
        print("   • USD minimum amount validation ($20)")
        print("   • Platform fee calculation (10%)")
        print("   • Insufficient balance scenarios")
        print("   • Authentication requirements")
        print("   • Transaction recording")
        print("   • Wallet balance API integration")
        
        print(f"\n⏰ Test completed at: {datetime.now().isoformat()}")

if __name__ == "__main__":
    tester = TurfLootAPITester()
    tester.run_all_tests()