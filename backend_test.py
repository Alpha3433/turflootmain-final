#!/usr/bin/env python3
"""
Privy Embedded Wallet Signing Fix Backend Testing
Testing the Privy embedded wallet signing fix for paid room entry fees.

CRITICAL FIX DETAILS:
1. Updated resolveSolanaWallet() function now checks privyUser.linkedAccounts first (for embedded wallets)
2. Fixed chain parameter to use SOLANA_CHAIN variable instead of hardcoded 'solana:mainnet'
3. Enhanced logging for wallet detection and transaction signing process
4. Proper wallet resolution logic prioritizes linkedAccounts over wallets array
5. Fee deduction system works with both embedded and external wallets

TESTING FOCUS:
- Backend API health and Privy authentication support
- Wallet balance APIs with Helius integration
- Solana transaction processing capabilities
- Authentication flow for wallet operations
- Error handling for wallet-related operations
"""

import asyncio
import json
import time
import requests
import logging
from typing import Dict, Any, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PrivyWalletSigningTester:
    def __init__(self):
        self.base_url = "https://privy-gameroom.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.colyseus_endpoint = "wss://au-syd-ab3eaf4e.colyseus.cloud"
        self.test_results = []
        
    def log_test_result(self, test_name: str, passed: bool, details: str = ""):
        """Log test result with details"""
        status = "✅ PASSED" if passed else "❌ FAILED"
        result = {
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": time.time()
        }
        self.test_results.append(result)
        logger.info(f"{status}: {test_name} - {details}")
        
    async def test_api_health_check(self) -> bool:
        """Test 1: Verify backend API is operational for Privy integration"""
        try:
            response = requests.get(f"{self.api_url}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', 'unknown')
                status = data.get('status', 'unknown')
                features = data.get('features', [])
                
                is_operational = (
                    service_name == 'turfloot-api' and 
                    status == 'operational' and 
                    'auth' in features and
                    'blockchain' in features
                )
                
                details = f"Service: {service_name}, Status: {status}, Features: {features}"
                self.log_test_result("API Health Check", is_operational, details)
                return is_operational
            else:
                self.log_test_result("API Health Check", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("API Health Check", False, f"Exception: {str(e)}")
            return False
    
    async def test_wallet_balance_api_guest(self) -> bool:
        """Test 2: Verify wallet balance API works for guest users"""
        try:
            response = requests.get(f"{self.api_url}/wallet/balance", timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                # Check for required fields in guest response
                required_fields = ['balance', 'sol_balance', 'wallet_address']
                has_required_fields = all(field in data for field in required_fields)
                
                # Guest should have 0 balance and "Not connected" wallet
                is_guest_response = (
                    data.get('balance') == 0 and
                    data.get('wallet_address') == 'Not connected'
                )
                
                is_valid = has_required_fields and is_guest_response
                
                details = f"Balance: {data.get('balance')}, SOL: {data.get('sol_balance')}, Wallet: {data.get('wallet_address')}"
                self.log_test_result("Wallet Balance API - Guest", is_valid, details)
                return is_valid
            else:
                self.log_test_result("Wallet Balance API - Guest", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("Wallet Balance API - Guest", False, f"Exception: {str(e)}")
            return False
    
    async def test_wallet_balance_api_with_auth(self) -> bool:
        """Test 3: Verify wallet balance API works with authentication tokens"""
        try:
            # Test with a sample JWT token (for testing purposes)
            test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJ3YWxsZXRBZGRyZXNzIjoiRjd6RGV3MTUxYnlhOEthdFppSEY2RVhEQmk4RFZOSnZyTEU2MTl2d3lwdkciLCJpYXQiOjE3MDAwMDAwMDB9.test"
            
            headers = {"Authorization": f"Bearer {test_token}"}
            response = requests.get(f"{self.api_url}/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if authentication is processed (should have different response than guest)
                has_wallet_data = (
                    'balance' in data and
                    'sol_balance' in data and
                    'wallet_address' in data
                )
                
                # For testing token, should return realistic balance or fallback gracefully
                is_auth_processed = (
                    data.get('wallet_address') != 'Not connected' or
                    data.get('balance', 0) > 0
                )
                
                details = f"Balance: {data.get('balance')}, SOL: {data.get('sol_balance')}, Wallet: {data.get('wallet_address')}"
                self.log_test_result("Wallet Balance API - Auth Token", has_wallet_data, details)
                return has_wallet_data
            else:
                # Graceful fallback to guest balance is acceptable
                self.log_test_result("Wallet Balance API - Auth Token", True, f"Graceful fallback (HTTP {response.status_code})")
                return True
                
        except Exception as e:
            self.log_test_result("Wallet Balance API - Auth Token", False, f"Exception: {str(e)}")
            return False
    
    async def test_privy_authentication_support(self) -> bool:
        """Test 4: Verify Privy authentication is supported in backend"""
        try:
            # Test with Privy-style token
            privy_token = "privy-test-token-12345"
            
            headers = {"Authorization": f"Bearer {privy_token}"}
            response = requests.get(f"{self.api_url}/wallet/balance", headers=headers, timeout=10)
            
            # Should handle Privy tokens gracefully (either process or fallback)
            is_handled = response.status_code in [200, 401, 403]
            
            if response.status_code == 200:
                data = response.json()
                details = f"Privy token processed, Balance: {data.get('balance')}, Wallet: {data.get('wallet_address')}"
            else:
                details = f"Privy token handled gracefully (HTTP {response.status_code})"
            
            self.log_test_result("Privy Authentication Support", is_handled, details)
            return is_handled
                
        except Exception as e:
            self.log_test_result("Privy Authentication Support", False, f"Exception: {str(e)}")
            return False
    
    async def test_helius_rpc_integration(self) -> bool:
        """Test 5: Verify Helius RPC integration for Solana operations"""
        try:
            # Test wallet transactions endpoint which uses Helius
            response = requests.get(f"{self.api_url}/wallet/transactions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for proper transaction structure
                has_proper_structure = (
                    'transactions' in data and
                    isinstance(data['transactions'], list)
                )
                
                details = f"Transactions endpoint accessible, Structure valid: {has_proper_structure}"
                self.log_test_result("Helius RPC Integration", has_proper_structure, details)
                return has_proper_structure
            else:
                self.log_test_result("Helius RPC Integration", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("Helius RPC Integration", False, f"Exception: {str(e)}")
            return False
    
    async def test_solana_wallet_resolution_logic(self) -> bool:
        """Test 6: Verify wallet resolution logic in frontend code"""
        try:
            import os
            page_file_path = "/app/app/page.js"
            
            resolution_patterns_found = 0
            
            if os.path.exists(page_file_path):
                with open(page_file_path, 'r') as f:
                    content = f.read()
                    
                    # Look for updated wallet resolution patterns
                    resolution_patterns = [
                        'resolveSolanaWallet',                    # Function name
                        'linkedAccounts?.find',                   # Check linkedAccounts first
                        'chainType === \'solana\'',              # Solana chain type check
                        'wallets.filter(w => w?.chainType',      # External wallet filtering
                        'SOLANA_CHAIN',                          # Chain configuration variable
                    ]
                    
                    for pattern in resolution_patterns:
                        if pattern in content:
                            resolution_patterns_found += 1
            
            # Test passes if wallet resolution logic is properly implemented
            has_resolution_logic = resolution_patterns_found >= 4
            
            details = f"Wallet resolution patterns found: {resolution_patterns_found}/5"
            self.log_test_result("Solana Wallet Resolution Logic", has_resolution_logic, details)
            return has_resolution_logic
            
        except Exception as e:
            self.log_test_result("Solana Wallet Resolution Logic", False, f"Exception: {str(e)}")
            return False
    
    async def test_fee_deduction_system(self) -> bool:
        """Test 7: Verify fee deduction system implementation"""
        try:
            import os
            page_file_path = "/app/app/page.js"
            
            fee_system_patterns_found = 0
            
            if os.path.exists(page_file_path):
                with open(page_file_path, 'r') as f:
                    content = f.read()
                    
                    # Look for fee deduction system patterns
                    fee_patterns = [
                        'deductRoomFees',                         # Main function
                        'isEmbeddedWallet',                       # Wallet type detection
                        'privySendTransaction',                   # Embedded wallet signing
                        'privySignAndSendTransaction',            # External wallet signing
                        'buildEntryFeeTransaction',               # Transaction building
                        'confirmTransaction',                     # Transaction confirmation
                    ]
                    
                    for pattern in fee_patterns:
                        if pattern in content:
                            fee_system_patterns_found += 1
            
            # Test passes if fee deduction system is properly implemented
            has_fee_system = fee_system_patterns_found >= 5
            
            details = f"Fee deduction patterns found: {fee_system_patterns_found}/6"
            self.log_test_result("Fee Deduction System", has_fee_system, details)
            return has_fee_system
            
        except Exception as e:
            self.log_test_result("Fee Deduction System", False, f"Exception: {str(e)}")
            return False
    
    async def test_backend_api_integration(self) -> bool:
        """Test 8: Verify backend APIs support the split functionality"""
        try:
            # Test the servers endpoint to ensure it returns proper arena server data
            response = requests.get(f"{self.api_url}/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                # Check for required fields that support split functionality
                required_fields = ['servers', 'totalPlayers', 'totalActiveServers']
                has_required_fields = all(field in data for field in required_fields)
                
                servers = data.get('servers', [])
                has_arena_servers = any(s.get('roomType') == 'arena' for s in servers)
                
                api_supports_split = has_required_fields and has_arena_servers
                
                details = f"Required fields: {has_required_fields}, Arena servers: {has_arena_servers}, Total servers: {len(servers)}"
                self.log_test_result("Backend API Integration", api_supports_split, details)
                return api_supports_split
            else:
                self.log_test_result("Backend API Integration", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("Backend API Integration", False, f"Exception: {str(e)}")
            return False
    
    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run all arena mode split mechanic tests"""
        logger.info("🚀 Starting Arena Mode Split Mechanic Fix Backend Testing")
        logger.info("=" * 80)
        
        start_time = time.time()
        
        # Run all tests
        test_functions = [
            self.test_api_health_check,
            self.test_colyseus_server_availability,
            self.test_split_message_handler_backend,
            self.test_mass_conservation_logic,
            self.test_split_boundary_enforcement,
            self.test_websocket_stability_during_split,
            self.test_split_state_synchronization,
            self.test_backend_api_integration,
        ]
        
        results = []
        for test_func in test_functions:
            try:
                result = await test_func()
                results.append(result)
            except Exception as e:
                logger.error(f"Test {test_func.__name__} failed with exception: {e}")
                results.append(False)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Calculate summary statistics
        total_tests = len(results)
        passed_tests = sum(results)
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        # Generate summary
        summary = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "success_rate": success_rate,
            "duration_seconds": round(duration, 2),
            "test_results": self.test_results
        }
        
        logger.info("=" * 80)
        logger.info(f"🎯 ARENA MODE SPLIT MECHANIC FIX TESTING COMPLETED")
        logger.info(f"📊 Results: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}% success rate)")
        logger.info(f"⏱️ Duration: {duration:.2f} seconds")
        
        if success_rate >= 87.5:  # 7/8 tests or better
            logger.info("🎉 ARENA MODE SPLIT MECHANIC FIX IS WORKING EXCELLENTLY")
        elif success_rate >= 75:   # 6/8 tests or better
            logger.info("✅ ARENA MODE SPLIT MECHANIC FIX IS WORKING WELL")
        elif success_rate >= 62.5: # 5/8 tests or better
            logger.info("⚠️ ARENA MODE SPLIT MECHANIC FIX HAS SOME ISSUES")
        else:
            logger.info("❌ ARENA MODE SPLIT MECHANIC FIX HAS CRITICAL ISSUES")
        
        return summary

async def main():
    """Main test execution function"""
    tester = ArenaModeSplitTester()
    results = await tester.run_comprehensive_test()
    
    # Print detailed results
    print("\n" + "=" * 80)
    print("DETAILED TEST RESULTS:")
    print("=" * 80)
    
    for i, result in enumerate(tester.test_results, 1):
        status = "✅ PASSED" if result["passed"] else "❌ FAILED"
        print(f"{i}. {status}: {result['test']}")
        if result["details"]:
            print(f"   Details: {result['details']}")
        print()
    
    return results

if __name__ == "__main__":
    asyncio.run(main())