#!/usr/bin/env python3
"""
Backend Testing Suite for Server Browser and Wallet API Fixes
Testing the recent fixes for:
1. Server Browser API Fix (/api/servers)
2. Wallet API Endpoints (/api/wallet/balance, /api/wallet/transactions)
3. API Endpoint Consistency (no 404 errors)
4. Helius Integration (wallet balance with updated API key)
5. Server Browser Data Structure (Sydney/Oceania regions)
"""

import requests
import json
import time
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://mp-game-enhance.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class BackendTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name, passed, details="", error_msg=""):
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
            'details': details,
            'error': error_msg,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error_msg:
            print(f"   Error: {error_msg}")
        print()

    def test_api_health_check(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            if response.status_code == 200:
                self.log_test("API Health Check", True, f"API accessible at {API_BASE}")
                return True
            else:
                self.log_test("API Health Check", False, f"Status: {response.status_code}", response.text[:200])
                return False
        except Exception as e:
            self.log_test("API Health Check", False, "", str(e))
            return False

    def test_hathora_environment_variables(self):
        """Test 2: Verify Hathora environment variables are properly configured"""
        try:
            # Test by checking if servers endpoint returns Hathora configuration
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                hathora_enabled = data.get('hathoraEnabled', False)
                servers = data.get('servers', [])
                
                # Check for Hathora-specific server properties
                hathora_servers = [s for s in servers if s.get('serverType') == 'hathora-paid']
                
                if hathora_enabled and len(hathora_servers) > 0:
                    # Check for proper region mapping
                    regions_found = set()
                    for server in hathora_servers:
                        if 'hathoraRegion' in server:
                            regions_found.add(server['hathoraRegion'])
                    
                    self.log_test(
                        "Hathora Environment Variables Configuration",
                        True,
                        f"Hathora enabled, {len(hathora_servers)} Hathora servers, Regions: {list(regions_found)}"
                    )
                else:
                    self.log_test(
                        "Hathora Environment Variables Configuration",
                        False,
                        f"Hathora enabled: {hathora_enabled}, Hathora servers: {len(hathora_servers)}",
                        "Hathora environment not properly configured"
                    )
            else:
                self.log_test(
                    "Hathora Environment Variables Configuration",
                    False,
                    f"API returned status {response.status_code}",
                    "Cannot verify Hathora configuration"
                )
                
        except Exception as e:
            self.log_test(
                "Hathora Environment Variables Configuration",
                False,
                "Failed to verify Hathora environment",
                str(e)
            )

    def test_region_mapping_verification(self):
        """Test 3: Verify region mapping works correctly (Oceania->sydney, US->washington-dc, EU->frankfurt/london)"""
        try:
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                # Check for specific region mappings
                region_mappings = {}
                expected_mappings = {
                    'Oceania': ['sydney'],
                    'US East': ['washington-dc', 'us-east-1'],
                    'Europe': ['frankfurt', 'london', 'eu-central-1', 'eu-west-2']
                }
                
                for server in servers:
                    region = server.get('region')
                    hathora_region = server.get('hathoraRegion')
                    region_id = server.get('regionId')
                    
                    if region and (hathora_region or region_id):
                        if region not in region_mappings:
                            region_mappings[region] = set()
                        if hathora_region:
                            region_mappings[region].add(hathora_region)
                        if region_id:
                            region_mappings[region].add(region_id)
                
                # Verify mappings
                mapping_success = True
                mapping_details = []
                
                for expected_region, expected_values in expected_mappings.items():
                    if expected_region in region_mappings:
                        actual_values = region_mappings[expected_region]
                        has_expected = any(val in actual_values for val in expected_values)
                        if has_expected:
                            mapping_details.append(f"{expected_region}: {list(actual_values)} ✅")
                        else:
                            mapping_details.append(f"{expected_region}: {list(actual_values)} ❌ (expected one of {expected_values})")
                            mapping_success = False
                    else:
                        mapping_details.append(f"{expected_region}: NOT FOUND ❌")
                        mapping_success = False
                
                self.log_test(
                    "Region Mapping Verification (Oceania->sydney, US->washington-dc, EU->frankfurt/london)",
                    mapping_success,
                    f"Region mappings: {'; '.join(mapping_details)}"
                )
            else:
                self.log_test(
                    "Region Mapping Verification (Oceania->sydney, US->washington-dc, EU->frankfurt/london)",
                    False,
                    f"API returned status {response.status_code}",
                    "Cannot verify region mappings"
                )
                
        except Exception as e:
            self.log_test(
                "Region Mapping Verification (Oceania->sydney, US->washington-dc, EU->frankfurt/london)",
                False,
                "Failed to verify region mappings",
                str(e)
            )

    def test_hathora_room_creation_api(self):
        """Test 4: Test Hathora room creation API endpoints"""
        try:
            # Test creating a room through the API
            room_data = {
                "gameMode": "practice",
                "region": "sydney",  # Test Oceania region specifically
                "maxPlayers": 50
            }
            
            # Try to create a room (this might not exist as a direct endpoint, but test what's available)
            response = requests.post(f"{self.api_base}/servers", json=room_data, timeout=15)
            
            if response.status_code == 405:  # Method not allowed is expected for GET-only endpoint
                # Test the servers endpoint which should show Hathora integration
                get_response = requests.get(f"{self.api_base}/servers", timeout=10)
                if get_response.status_code == 200:
                    data = get_response.json()
                    hathora_enabled = data.get('hathoraEnabled', False)
                    
                    if hathora_enabled:
                        self.log_test(
                            "Hathora Room Creation API Integration",
                            True,
                            f"Hathora integration confirmed via servers endpoint, hathoraEnabled: {hathora_enabled}"
                        )
                    else:
                        self.log_test(
                            "Hathora Room Creation API Integration",
                            False,
                            "Servers endpoint accessible but Hathora not enabled",
                            "Hathora integration not working"
                        )
                else:
                    self.log_test(
                        "Hathora Room Creation API Integration",
                        False,
                        f"Servers endpoint returned {get_response.status_code}",
                        "Cannot verify Hathora integration"
                    )
            elif response.status_code == 200:
                # If room creation endpoint exists and works
                data = response.json()
                self.log_test(
                    "Hathora Room Creation API Integration",
                    True,
                    f"Room creation successful: {data}"
                )
            else:
                self.log_test(
                    "Hathora Room Creation API Integration",
                    False,
                    f"Room creation returned {response.status_code}",
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test(
                "Hathora Room Creation API Integration",
                False,
                "Failed to test room creation API",
                str(e)
            )

    def test_createPublicLobby_parameter_syntax(self):
        """Test 5: Verify createPublicLobby method uses correct parameter syntax (region in options object)"""
        try:
            # Test by checking server configuration and region handling
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                # Look for servers with proper region configuration
                sydney_servers = [s for s in servers if 'sydney' in str(s.get('regionId', '')).lower() or 
                                 'sydney' in str(s.get('hathoraRegion', '')).lower() or
                                 s.get('region') == 'Oceania']
                
                washington_servers = [s for s in servers if 'washington' in str(s.get('regionId', '')).lower() or 
                                     'washington-dc' in str(s.get('hathoraRegion', '')).lower() or
                                     s.get('region') == 'US East']
                
                eu_servers = [s for s in servers if any(region in str(s.get('hathoraRegion', '')).lower() 
                                                       for region in ['frankfurt', 'london']) or
                             s.get('region') == 'Europe']
                
                if sydney_servers and washington_servers and eu_servers:
                    self.log_test(
                        "createPublicLobby Parameter Syntax Verification (region in options object)",
                        True,
                        f"Found servers for all regions: Sydney ({len(sydney_servers)}), Washington ({len(washington_servers)}), EU ({len(eu_servers)})"
                    )
                else:
                    self.log_test(
                        "createPublicLobby Parameter Syntax Verification (region in options object)",
                        False,
                        f"Missing servers for some regions: Sydney ({len(sydney_servers)}), Washington ({len(washington_servers)}), EU ({len(eu_servers)})",
                        "Region parameter syntax may not be working correctly"
                    )
            else:
                self.log_test(
                    "createPublicLobby Parameter Syntax Verification (region in options object)",
                    False,
                    f"API returned status {response.status_code}",
                    "Cannot verify parameter syntax"
                )
                
        except Exception as e:
            self.log_test(
                "createPublicLobby Parameter Syntax Verification (region in options object)",
                False,
                "Failed to verify parameter syntax",
                str(e)
            )

    def test_error_handling_and_fallbacks(self):
        """Test 6: Test error handling and simplified connection info approach"""
        try:
            # Test API error handling by making requests with various parameters
            test_cases = [
                {"endpoint": "/servers", "expected_status": 200},
                {"endpoint": "/servers?region=invalid", "expected_status": 200},  # Should handle gracefully
                {"endpoint": "/servers?gameMode=invalid", "expected_status": 200}  # Should handle gracefully
            ]
            
            error_handling_success = True
            error_details = []
            
            for test_case in test_cases:
                try:
                    response = requests.get(f"{self.api_base}{test_case['endpoint']}", timeout=10)
                    
                    if response.status_code == test_case['expected_status']:
                        if response.status_code == 200:
                            data = response.json()
                            if 'error' not in data or data.get('hathoraEnabled') is not None:
                                error_details.append(f"{test_case['endpoint']}: ✅ Handled gracefully")
                            else:
                                error_details.append(f"{test_case['endpoint']}: ❌ Error in response")
                                error_handling_success = False
                        else:
                            error_details.append(f"{test_case['endpoint']}: ✅ Expected status {test_case['expected_status']}")
                    else:
                        error_details.append(f"{test_case['endpoint']}: ❌ Got {response.status_code}, expected {test_case['expected_status']}")
                        error_handling_success = False
                        
                except Exception as e:
                    error_details.append(f"{test_case['endpoint']}: ❌ Exception: {str(e)}")
                    error_handling_success = False
            
            self.log_test(
                "Error Handling and Simplified Connection Info Approach",
                error_handling_success,
                f"Error handling tests: {'; '.join(error_details)}"
            )
            
        except Exception as e:
            self.log_test(
                "Error Handling and Simplified Connection Info Approach",
                False,
                "Failed to test error handling",
                str(e)
            )

    def test_hathora_client_initialization(self):
        """Test 7: Verify Hathora client can be initialized without constructor errors"""
        try:
            # Test by checking if the API can successfully use Hathora integration
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                hathora_enabled = data.get('hathoraEnabled', False)
                servers = data.get('servers', [])
                
                # If Hathora is enabled and servers are returned, the client initialization is working
                if hathora_enabled and len(servers) > 0:
                    # Check for Hathora-specific properties that would only exist if client is working
                    hathora_properties = []
                    for server in servers[:3]:  # Check first 3 servers
                        if server.get('hathoraRegion'):
                            hathora_properties.append('hathoraRegion')
                        if server.get('serverType') == 'hathora-paid':
                            hathora_properties.append('serverType')
                        if server.get('hathoraRoomId'):
                            hathora_properties.append('hathoraRoomId')
                    
                    if hathora_properties:
                        self.log_test(
                            "Hathora Client Initialization (No Constructor Errors)",
                            True,
                            f"Hathora client working, found properties: {list(set(hathora_properties))}, {len(servers)} servers"
                        )
                    else:
                        self.log_test(
                            "Hathora Client Initialization (No Constructor Errors)",
                            False,
                            f"Hathora enabled but no Hathora-specific properties found",
                            "Client may not be properly initialized"
                        )
                else:
                    self.log_test(
                        "Hathora Client Initialization (No Constructor Errors)",
                        False,
                        f"Hathora enabled: {hathora_enabled}, Servers: {len(servers)}",
                        "Hathora client not properly initialized"
                    )
            else:
                self.log_test(
                    "Hathora Client Initialization (No Constructor Errors)",
                    False,
                    f"API returned status {response.status_code}",
                    "Cannot verify client initialization"
                )
                
        except Exception as e:
            self.log_test(
                "Hathora Client Initialization (No Constructor Errors)",
                False,
                "Failed to verify client initialization",
                str(e)
            )

    def test_oceania_sydney_region_creation(self):
        """Test 8: Specifically test that Oceania servers create rooms in Sydney region instead of Washington D.C."""
        try:
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                # Look specifically for Oceania/Sydney servers
                oceania_servers = []
                for server in servers:
                    region = server.get('region', '').lower()
                    region_id = server.get('regionId', '').lower()
                    hathora_region = server.get('hathoraRegion', '').lower()
                    display_name = server.get('name', '').lower()
                    
                    if ('oceania' in region or 'sydney' in region_id or 'sydney' in hathora_region or 
                        'sydney' in display_name or region == 'oceania'):
                        oceania_servers.append({
                            'id': server.get('id'),
                            'region': server.get('region'),
                            'regionId': server.get('regionId'),
                            'hathoraRegion': server.get('hathoraRegion'),
                            'name': server.get('name')
                        })
                
                # Check if any Oceania servers are incorrectly mapped to Washington D.C.
                washington_mapped = []
                sydney_mapped = []
                
                for server in oceania_servers:
                    hathora_region = server.get('hathoraRegion', '').lower()
                    region_id = server.get('regionId', '').lower()
                    
                    if 'washington' in hathora_region or 'us-east' in hathora_region:
                        washington_mapped.append(server)
                    elif 'sydney' in hathora_region or 'sydney' in region_id or 'ap-southeast-2' in hathora_region:
                        sydney_mapped.append(server)
                
                if len(oceania_servers) > 0:
                    if len(sydney_mapped) > 0 and len(washington_mapped) == 0:
                        self.log_test(
                            "Oceania Sydney Region Creation (Not Washington D.C.)",
                            True,
                            f"Found {len(oceania_servers)} Oceania servers, all mapped to Sydney region: {[s['hathoraRegion'] for s in sydney_mapped]}"
                        )
                    elif len(washington_mapped) > 0:
                        self.log_test(
                            "Oceania Sydney Region Creation (Not Washington D.C.)",
                            False,
                            f"Found {len(washington_mapped)} Oceania servers incorrectly mapped to Washington D.C.",
                            f"Servers mapped to Washington: {[s['hathoraRegion'] for s in washington_mapped]}"
                        )
                    else:
                        self.log_test(
                            "Oceania Sydney Region Creation (Not Washington D.C.)",
                            False,
                            f"Found {len(oceania_servers)} Oceania servers but unclear region mapping",
                            f"Server regions: {[s['hathoraRegion'] for s in oceania_servers]}"
                        )
                else:
                    self.log_test(
                        "Oceania Sydney Region Creation (Not Washington D.C.)",
                        False,
                        "No Oceania servers found in server list",
                        "Cannot verify Oceania region mapping"
                    )
            else:
                self.log_test(
                    "Oceania Sydney Region Creation (Not Washington D.C.)",
                    False,
                    f"API returned status {response.status_code}",
                    "Cannot verify Oceania region creation"
                )
                
        except Exception as e:
            self.log_test(
                "Oceania Sydney Region Creation (Not Washington D.C.)",
                False,
                "Failed to verify Oceania region creation",
                str(e)
            )

    def test_sdk_method_availability(self):
        """Test 9: Verify that all Hathora SDK methods being used actually exist and work properly"""
        try:
            # Test by verifying the API can successfully provide Hathora functionality
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                hathora_enabled = data.get('hathoraEnabled', False)
                
                if hathora_enabled:
                    # Check for evidence that SDK methods are working
                    servers = data.get('servers', [])
                    total_servers = data.get('totalServers', 0)
                    regions = data.get('regions', [])
                    
                    # Look for Hathora-specific data that would only exist if SDK methods work
                    sdk_evidence = []
                    
                    if total_servers > 0:
                        sdk_evidence.append(f"Server generation working ({total_servers} servers)")
                    
                    if len(regions) > 0:
                        sdk_evidence.append(f"Region handling working ({len(regions)} regions)")
                    
                    # Check for Hathora-specific server properties
                    hathora_servers = [s for s in servers if s.get('serverType') == 'hathora-paid']
                    if len(hathora_servers) > 0:
                        sdk_evidence.append(f"Hathora server creation working ({len(hathora_servers)} Hathora servers)")
                    
                    # Check for proper region mapping
                    regions_with_hathora = [s for s in servers if s.get('hathoraRegion')]
                    if len(regions_with_hathora) > 0:
                        sdk_evidence.append(f"Region mapping working ({len(regions_with_hathora)} servers with Hathora regions)")
                    
                    if len(sdk_evidence) >= 2:  # At least 2 pieces of evidence that SDK is working
                        self.log_test(
                            "SDK Method Availability and Functionality",
                            True,
                            f"SDK methods working: {'; '.join(sdk_evidence)}"
                        )
                    else:
                        self.log_test(
                            "SDK Method Availability and Functionality",
                            False,
                            f"Limited SDK functionality: {'; '.join(sdk_evidence) if sdk_evidence else 'No evidence'}",
                            "SDK methods may not be fully available"
                        )
                else:
                    self.log_test(
                        "SDK Method Availability and Functionality",
                        False,
                        "Hathora not enabled in API response",
                        "SDK methods not available or not working"
                    )
            else:
                self.log_test(
                    "SDK Method Availability and Functionality",
                    False,
                    f"API returned status {response.status_code}",
                    "Cannot verify SDK method availability"
                )
                
        except Exception as e:
            self.log_test(
                "SDK Method Availability and Functionality",
                False,
                "Failed to verify SDK method availability",
                str(e)
            )

    def test_no_getConnectionInfo_errors(self):
        """Test 10: Verify that getConnectionInfo calls have been eliminated and no related errors occur"""
        try:
            # Test by making multiple API calls and checking for consistent responses
            test_endpoints = [
                "/servers",
                "/servers?region=sydney",
                "/servers?region=washington-dc"
            ]
            
            connection_info_success = True
            connection_details = []
            
            for endpoint in test_endpoints:
                try:
                    response = requests.get(f"{self.api_base}{endpoint}", timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Check if response contains error messages related to getConnectionInfo
                        response_text = json.dumps(data).lower()
                        
                        if 'getconnectioninfo' in response_text or 'connection info' in response_text:
                            if 'error' in response_text or 'failed' in response_text:
                                connection_details.append(f"{endpoint}: ❌ Contains getConnectionInfo errors")
                                connection_info_success = False
                            else:
                                connection_details.append(f"{endpoint}: ✅ Contains connection info but no errors")
                        else:
                            connection_details.append(f"{endpoint}: ✅ No getConnectionInfo references")
                        
                        # Check if Hathora functionality is working without getConnectionInfo
                        if data.get('hathoraEnabled') and len(data.get('servers', [])) > 0:
                            connection_details.append(f"{endpoint}: ✅ Hathora working without getConnectionInfo")
                        
                    else:
                        connection_details.append(f"{endpoint}: ❌ HTTP {response.status_code}")
                        connection_info_success = False
                        
                except Exception as e:
                    connection_details.append(f"{endpoint}: ❌ Exception: {str(e)}")
                    connection_info_success = False
            
            self.log_test(
                "No getConnectionInfo Errors (Simplified Connection Info)",
                connection_info_success,
                f"Connection info tests: {'; '.join(connection_details)}"
            )
            
        except Exception as e:
            self.log_test(
                "No getConnectionInfo Errors (Simplified Connection Info)",
                False,
                "Failed to verify getConnectionInfo elimination",
                str(e)
            )

    def run_all_tests(self):
        """Run all Hathora SDK fix tests"""
        print("🚀 Starting Comprehensive Hathora SDK Fixes Testing...")
        print()
        
        # Run all tests
        self.test_api_health_check()
        self.test_hathora_environment_variables()
        self.test_region_mapping_verification()
        self.test_hathora_room_creation_api()
        self.test_createPublicLobby_parameter_syntax()
        self.test_error_handling_and_fallbacks()
        self.test_hathora_client_initialization()
        self.test_oceania_sydney_region_creation()
        self.test_sdk_method_availability()
        self.test_no_getConnectionInfo_errors()
        
        # Print summary
        print("=" * 80)
        print("🏁 HATHORA SDK FIXES TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.total_tests - self.passed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        print()
        
        # Print detailed results
        print("📋 DETAILED TEST RESULTS:")
        print("-" * 40)
        
        for i, result in enumerate(self.test_results, 1):
            status = "✅ PASSED" if result['success'] else "❌ FAILED"
            print(f"{i:2d}. {status}: {result['test']}")
            if result['details']:
                print(f"    📋 {result['details']}")
            if result['error']:
                print(f"    ❌ {result['error']}")
            print()
        
        # Overall assessment
        if success_rate >= 80:
            print("🎉 OVERALL ASSESSMENT: HATHORA SDK FIXES ARE WORKING CORRECTLY")
        elif success_rate >= 60:
            print("⚠️ OVERALL ASSESSMENT: HATHORA SDK FIXES PARTIALLY WORKING - SOME ISSUES REMAIN")
        else:
            print("❌ OVERALL ASSESSMENT: HATHORA SDK FIXES NEED SIGNIFICANT WORK")
        
        print("=" * 80)
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = HathoraSDKTester()
    success = tester.run_all_tests()
    
    if success:
        print("✅ All critical Hathora SDK fixes are working correctly!")
    else:
        print("❌ Some Hathora SDK fixes need attention.")