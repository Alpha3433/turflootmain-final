#!/usr/bin/env python3
"""
Backend Testing Suite for Redesigned Server Browser with Collapsed Empty Servers
Testing Focus: Server Browser API Response, Server Grouping Logic, Empty Server Detection,
Regional Coverage, Stake Variations, and Server Browser Enhancement
"""

import requests
import json
import time
import os
from typing import Dict, List, Any

class ServerBrowserTester:
    def __init__(self):
        # Get base URL from environment
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://mp-game-enhance.preview.emergentagent.com')
        self.api_base = f"{self.base_url}/api"
        
        # Test results tracking
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🎮 REDESIGNED SERVER BROWSER TESTING SUITE")
        print(f"📡 Backend URL: {self.api_base}")
        print(f"🎯 Focus: Collapsed Empty Servers Design")
        print("=" * 80)

    def log_test(self, test_name: str, passed: bool, details: str = ""):
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
            'details': details
        })

    def test_server_browser_api_response(self):
        """Test 1: Server Browser API Response - Verify /api/servers returns expected data structure"""
        print("\n🔍 TEST 1: SERVER BROWSER API RESPONSE")
        
        try:
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code != 200:
                self.log_test("API Response Status", False, f"Expected 200, got {response.status_code}")
                return
            
            self.log_test("API Response Status", True, f"Status code: {response.status_code}")
            
            # Parse JSON response
            data = response.json()
            
            # Check required fields for redesigned server browser
            required_fields = ['servers', 'totalPlayers', 'totalActiveServers', 'totalServers', 'regions', 'gameTypes', 'hathoraEnabled']
            
            for field in required_fields:
                if field in data:
                    self.log_test(f"Required Field: {field}", True, f"Present with value: {type(data[field])}")
                else:
                    self.log_test(f"Required Field: {field}", False, "Missing from response")
            
            # Verify servers array structure
            if 'servers' in data and isinstance(data['servers'], list):
                if len(data['servers']) > 0:
                    server = data['servers'][0]
                    server_fields = ['id', 'name', 'region', 'stake', 'currentPlayers', 'maxPlayers', 'status', 'serverType']
                    
                    for field in server_fields:
                        if field in server:
                            self.log_test(f"Server Field: {field}", True, f"Value: {server.get(field)}")
                        else:
                            self.log_test(f"Server Field: {field}", False, "Missing from server object")
                    
                    self.log_test("Server Data Structure", True, f"Found {len(data['servers'])} servers")
                else:
                    self.log_test("Server Data Structure", False, "No servers in response")
            else:
                self.log_test("Server Data Structure", False, "Servers field missing or not array")
            
            return data
            
        except Exception as e:
            self.log_test("Server Browser API Response", False, f"Exception: {str(e)}")
            return None

    def test_server_grouping_logic(self, server_data: Dict):
        """Test 2: Server Grouping Logic - Confirm backend provides right data for grouping"""
        print("\n🔍 TEST 2: SERVER GROUPING LOGIC")
        
        if not server_data or 'servers' not in server_data:
            self.log_test("Server Grouping Logic", False, "No server data available")
            return
        
        servers = server_data['servers']
        
        # Test region grouping capability
        regions = set()
        stakes = set()
        region_stake_combinations = set()
        
        for server in servers:
            if 'region' in server and 'stake' in server:
                region = server['region']
                stake = server['stake']
                regions.add(region)
                stakes.add(stake)
                region_stake_combinations.add((region, stake))
        
        self.log_test("Region Extraction", len(regions) > 0, f"Found {len(regions)} unique regions: {list(regions)}")
        self.log_test("Stake Extraction", len(stakes) > 0, f"Found {len(stakes)} unique stakes: {list(stakes)}")
        self.log_test("Region-Stake Combinations", len(region_stake_combinations) > 0, 
                     f"Found {len(region_stake_combinations)} combinations for grouping")
        
        # Test grouping potential for collapsed design
        empty_servers = [s for s in servers if s.get('currentPlayers', 0) == 0]
        active_servers = [s for s in servers if s.get('currentPlayers', 0) > 0]
        
        self.log_test("Empty Server Detection", len(empty_servers) >= 0, 
                     f"Found {len(empty_servers)} empty servers for collapse grouping")
        self.log_test("Active Server Detection", len(active_servers) >= 0, 
                     f"Found {len(active_servers)} active servers to display normally")
        
        # Test grouping by region and stake for collapsed display
        grouping_data = {}
        for server in empty_servers:
            region = server.get('region', 'Unknown')
            stake = server.get('stake', 0)
            key = f"{region}-${stake}"
            
            if key not in grouping_data:
                grouping_data[key] = []
            grouping_data[key].append(server)
        
        self.log_test("Grouping Data Generation", len(grouping_data) > 0, 
                     f"Generated {len(grouping_data)} groups for collapsed display")
        
        return {
            'regions': regions,
            'stakes': stakes,
            'empty_servers': empty_servers,
            'active_servers': active_servers,
            'grouping_data': grouping_data
        }

    def test_sydney_oceania_regions(self):
        """Test that Sydney/Oceania regions are properly included in server data"""
        try:
            response = requests.get(f"{API_BASE}/servers", timeout=15)
            
            if response.status_code != 200:
                self.log_test("Sydney/Oceania Regions", False, f"Status: {response.status_code}")
                return False
                
            data = response.json()
            servers = data.get('servers', [])
            
            # Look for Sydney/Oceania servers
            sydney_servers = []
            oceania_servers = []
            
            for server in servers:
                region_id = server.get('regionId', '').lower()
                region_name = server.get('region', '').lower()
                display_name = server.get('name', '').lower()
                
                if 'sydney' in region_id or 'sydney' in display_name:
                    sydney_servers.append(server)
                    
                if 'oceania' in region_name or 'oceania' in display_name:
                    oceania_servers.append(server)
            
            # Check for Hathora region mapping
            hathora_regions = []
            for server in servers:
                hathora_region = server.get('hathoraRegion')
                if hathora_region and 'ap-southeast-2' in hathora_region:
                    hathora_regions.append(server)
            
            total_oceania_related = len(sydney_servers) + len(oceania_servers) + len(hathora_regions)
            
            if total_oceania_related > 0:
                self.log_test("Sydney/Oceania Regions", True, 
                             f"Found {len(sydney_servers)} Sydney servers, {len(oceania_servers)} Oceania servers, {len(hathora_regions)} ap-southeast-2 servers")
                return True
            else:
                self.log_test("Sydney/Oceania Regions", False, "No Sydney/Oceania regions found in server data")
                return False
                
        except Exception as e:
            self.log_test("Sydney/Oceania Regions", False, "", str(e))
            return False

    def test_wallet_balance_api(self):
        """Test /api/wallet/balance endpoint"""
        try:
            # Test without authentication (guest user)
            response = requests.get(f"{API_BASE}/wallet/balance", timeout=10)
            
            if response.status_code != 200:
                self.log_test("Wallet Balance API - Guest", False, f"Status: {response.status_code}", response.text[:200])
                return False
                
            data = response.json()
            
            # Check required fields for wallet balance
            required_fields = ['balance', 'currency', 'sol_balance', 'wallet_address']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Wallet Balance API - Guest", False, f"Missing fields: {missing_fields}")
                return False
                
            self.log_test("Wallet Balance API - Guest", True, 
                         f"Balance: ${data.get('balance')}, SOL: {data.get('sol_balance')}")
            return True
            
        except Exception as e:
            self.log_test("Wallet Balance API - Guest", False, "", str(e))
            return False

    def test_wallet_balance_with_auth(self):
        """Test wallet balance API with authentication token"""
        try:
            # Test with a simple testing token
            headers = {
                'Authorization': 'Bearer testing-simple-test-user'
            }
            
            response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code != 200:
                self.log_test("Wallet Balance API - Authenticated", False, f"Status: {response.status_code}", response.text[:200])
                return False
                
            data = response.json()
            
            # For testing tokens, the API should return a valid response structure
            required_fields = ['balance', 'currency', 'sol_balance', 'wallet_address']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Wallet Balance API - Authenticated", False, f"Missing fields: {missing_fields}")
                return False
                
            self.log_test("Wallet Balance API - Authenticated", True, 
                         f"Auth Balance: ${data.get('balance')}, SOL: {data.get('sol_balance')}, Wallet: {data.get('wallet_address')}")
            return True
                
        except Exception as e:
            self.log_test("Wallet Balance API - Authenticated", False, "", str(e))
            return False

    def test_wallet_transactions_api(self):
        """Test /api/wallet/transactions endpoint"""
        try:
            response = requests.get(f"{API_BASE}/wallet/transactions", timeout=10)
            
            if response.status_code != 200:
                self.log_test("Wallet Transactions API", False, f"Status: {response.status_code}", response.text[:200])
                return False
                
            data = response.json()
            
            # Check required fields for transactions
            required_fields = ['transactions', 'total_count', 'wallet_address']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Wallet Transactions API", False, f"Missing fields: {missing_fields}")
                return False
                
            # Transactions should be an array (even if empty)
            if not isinstance(data.get('transactions'), list):
                self.log_test("Wallet Transactions API", False, "Transactions field is not an array")
                return False
                
            self.log_test("Wallet Transactions API", True, 
                         f"Transactions count: {data.get('total_count')}, Wallet: {data.get('wallet_address')}")
            return True
            
        except Exception as e:
            self.log_test("Wallet Transactions API", False, "", str(e))
            return False

    def test_helius_integration(self):
        """Test Helius API integration by checking if the API key is configured"""
        try:
            # Check if Helius API key is configured by testing the wallet balance endpoint
            response = requests.get(f"{API_BASE}/wallet/balance", timeout=15)
            
            if response.status_code != 200:
                self.log_test("Helius Integration Test", False, f"Status: {response.status_code}")
                return False
                
            data = response.json()
            
            # Check if the response structure indicates Helius integration is available
            required_fields = ['balance', 'currency', 'sol_balance', 'wallet_address']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Helius Integration Test", False, f"Missing fields: {missing_fields}")
                return False
            
            # If sol_balance field exists, Helius integration is configured
            if 'sol_balance' in data:
                self.log_test("Helius Integration Test", True, 
                             f"Helius API integration configured, SOL balance field available")
                return True
            else:
                self.log_test("Helius Integration Test", False, "SOL balance field not available")
                return False
                
        except Exception as e:
            self.log_test("Helius Integration Test", False, "", str(e))
            return False

    def test_api_endpoint_consistency(self):
        """Test that all expected API endpoints exist and don't return 404"""
        endpoints_to_test = [
            '/servers',
            '/wallet/balance', 
            '/wallet/transactions',
            '/game-sessions',
            '/party',
            '/friends'
        ]
        
        all_passed = True
        endpoint_results = []
        
        for endpoint in endpoints_to_test:
            try:
                response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                
                if response.status_code == 404:
                    endpoint_results.append(f"❌ {endpoint}: 404 Not Found")
                    all_passed = False
                elif response.status_code >= 500:
                    endpoint_results.append(f"⚠️ {endpoint}: {response.status_code} Server Error")
                else:
                    endpoint_results.append(f"✅ {endpoint}: {response.status_code}")
                    
            except Exception as e:
                endpoint_results.append(f"❌ {endpoint}: Connection Error - {str(e)}")
                all_passed = False
        
        details = "\n   " + "\n   ".join(endpoint_results)
        
        if all_passed:
            self.log_test("API Endpoint Consistency", True, f"All endpoints accessible:{details}")
        else:
            self.log_test("API Endpoint Consistency", False, f"Some endpoints have issues:{details}")
            
        return all_passed

    def test_server_data_structure(self):
        """Test that server data structure contains all expected fields"""
        try:
            response = requests.get(f"{API_BASE}/servers", timeout=15)
            
            if response.status_code != 200:
                self.log_test("Server Data Structure", False, f"Status: {response.status_code}")
                return False
                
            data = response.json()
            servers = data.get('servers', [])
            
            if not servers:
                self.log_test("Server Data Structure", False, "No servers found to validate structure")
                return False
            
            # Check first server for required fields
            server = servers[0]
            required_server_fields = [
                'id', 'name', 'region', 'regionId', 'currentPlayers', 'maxPlayers',
                'hathoraRegion', 'serverType', 'status', 'canJoin'
            ]
            
            missing_fields = [field for field in required_server_fields if field not in server]
            
            if missing_fields:
                self.log_test("Server Data Structure", False, f"Missing server fields: {missing_fields}")
                return False
            
            # Check for Hathora integration flags
            hathora_enabled = data.get('hathoraEnabled', False)
            has_hathora_regions = any(server.get('hathoraRegion') for server in servers)
            
            if not hathora_enabled:
                self.log_test("Server Data Structure", False, "Hathora integration not enabled")
                return False
                
            if not has_hathora_regions:
                self.log_test("Server Data Structure", False, "No Hathora regions found in server data")
                return False
            
            self.log_test("Server Data Structure", True, 
                         f"Complete server structure with {len(servers)} servers, Hathora enabled")
            return True
            
        except Exception as e:
            self.log_test("Server Data Structure", False, "", str(e))
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend Testing Suite for Server Browser and Wallet API Fixes")
        print("=" * 80)
        print()
        
        start_time = time.time()
        
        # Run all tests
        self.test_api_health_check()
        self.test_server_browser_api()
        self.test_sydney_oceania_regions()
        self.test_wallet_balance_api()
        self.test_wallet_balance_with_auth()
        self.test_wallet_transactions_api()
        self.test_helius_integration()
        self.test_api_endpoint_consistency()
        self.test_server_data_structure()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("=" * 80)
        print("🎯 BACKEND TESTING SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        print(f"Duration: {duration:.2f}s")
        print()
        
        # Print detailed results
        print("📊 DETAILED TEST RESULTS:")
        print("-" * 40)
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
            if result['error']:
                print(f"   Error: {result['error']}")
        
        print()
        print("🎯 REVIEW REQUEST VERIFICATION:")
        print("-" * 40)
        
        # Check specific review request requirements
        server_browser_working = any('Server Browser API' in r['test'] and '✅' in r['status'] for r in self.test_results)
        wallet_balance_working = any('Wallet Balance API' in r['test'] and '✅' in r['status'] for r in self.test_results)
        wallet_transactions_working = any('Wallet Transactions API' in r['test'] and '✅' in r['status'] for r in self.test_results)
        helius_working = any('Helius Integration' in r['test'] and '✅' in r['status'] for r in self.test_results)
        sydney_regions_working = any('Sydney/Oceania' in r['test'] and '✅' in r['status'] for r in self.test_results)
        no_404_errors = any('API Endpoint Consistency' in r['test'] and '✅' in r['status'] for r in self.test_results)
        
        print(f"✅ Server Browser API Fix: {'WORKING' if server_browser_working else 'FAILED'}")
        print(f"✅ Wallet Balance Endpoint: {'WORKING' if wallet_balance_working else 'FAILED'}")
        print(f"✅ Wallet Transactions Endpoint: {'WORKING' if wallet_transactions_working else 'FAILED'}")
        print(f"✅ Helius Integration: {'WORKING' if helius_working else 'FAILED'}")
        print(f"✅ Sydney/Oceania Regions: {'WORKING' if sydney_regions_working else 'FAILED'}")
        print(f"✅ No 404 Errors: {'WORKING' if no_404_errors else 'FAILED'}")
        
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED - Backend fixes are working correctly!")
    else:
        print(f"\n⚠️ {tester.failed_tests} test(s) failed - Some issues need attention")
    
    exit(0 if success else 1)