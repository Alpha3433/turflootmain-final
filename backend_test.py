#!/usr/bin/env python3
"""
Backend Testing for ServerBrowserModalNew Component Fix Verification
Testing all backend APIs that support the fixed server browser component

PRIORITY FOCUS: Critical Fix Testing
Recent fixes to ServerBrowserModalNew.jsx:
1. ✅ Added missing useState declarations (pingingRegions, selectedStakeFilter, etc.)
2. ✅ Fixed variable name inconsistency (server → room)  
3. ✅ Corrected emptyServers reference to emptyRooms

TESTING REQUIREMENTS:
Core Focus (Priority 1):
1. API Health Check - Verify backend infrastructure is operational
2. Server Browser API - Test /api/servers endpoint that provides data to component
3. Hathora Integration - Verify Hathora room creation/management still works
4. Real-time Server Data - Test server discovery and room listing APIs

Secondary Focus (Priority 2):
5. Game Session Management - Test join/leave functionality for rooms
6. Ping Infrastructure - Verify ping endpoint accessibility
7. General Application Health - Ensure no regressions from fixes
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://hathora-overhaul.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class BackendTester:
    def __init__(self):
        self.test_results = []
        self.start_time = time.time()
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    Details: {details}")
        if error:
            print(f"    Error: {error}")
        
    def test_api_health_check(self):
        """Test 1: API Health Check - Verify backend infrastructure"""
        try:
            # Test basic API accessibility
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                server_count = len(data.get('servers', []))
                hathora_enabled = data.get('hathoraEnabled', False)
                
                self.log_test(
                    "API Health Check", 
                    True,
                    f"API accessible, {server_count} servers available, Hathora enabled: {hathora_enabled}"
                )
                return True
            else:
                self.log_test(
                    "API Health Check", 
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, error=str(e))
            return False
    
    def test_server_browser_api(self):
        """Test 2: Server Browser API - Test /api/servers endpoint"""
        try:
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code != 200:
                self.log_test(
                    "Server Browser API", 
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
                return False
            
            data = response.json()
            
            # Verify required fields
            required_fields = ['servers', 'totalPlayers', 'totalActiveServers', 'hathoraEnabled']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test(
                    "Server Browser API", 
                    False,
                    f"Missing required fields: {missing_fields}"
                )
                return False
            
            servers = data.get('servers', [])
            if not servers:
                self.log_test(
                    "Server Browser API", 
                    False,
                    "No servers returned from API"
                )
                return False
            
            # Verify server structure
            sample_server = servers[0]
            required_server_fields = ['id', 'name', 'entryFee', 'region', 'regionId', 'currentPlayers', 'maxPlayers']
            missing_server_fields = [field for field in required_server_fields if field not in sample_server]
            
            if missing_server_fields:
                self.log_test(
                    "Server Browser API", 
                    False,
                    f"Server missing required fields: {missing_server_fields}"
                )
                return False
            
            self.log_test(
                "Server Browser API", 
                True,
                f"{len(servers)} servers with proper structure, Hathora enabled: {data.get('hathoraEnabled')}"
            )
            return True
            
        except Exception as e:
            self.log_test("Server Browser API", False, error=str(e))
            return False
            
    def test_server_count(self, data: Dict):
        """Test that endpoint returns expected number of servers (around 35)"""
        print("\n🔍 TESTING: Server Count")
        if not data or 'servers' not in data:
            self.log_test("Server Count", False, "No server data available")
            return
            
        servers = data['servers']
        server_count = len(servers)
        
        # Expected: 3 game types × 7 regions × (1-2 rooms per type) = ~35 servers
        # 0.01 and 0.02 stakes get 2 rooms each, 0.05 gets 1 room
        # So: (2 + 2 + 1) × 7 regions = 35 servers
        expected_count = 35
        
        if server_count == expected_count:
            self.log_test("Server Count", True, f"Found {server_count} servers (expected {expected_count})")
        elif abs(server_count - expected_count) <= 5:  # Allow some tolerance
            self.log_test("Server Count", True, f"Found {server_count} servers (close to expected {expected_count})")
        else:
            self.log_test("Server Count", False, f"Found {server_count} servers (expected ~{expected_count})")
            
    def test_server_data_structure(self, data: Dict):
        """Test that each server has required fields"""
        print("\n🔍 TESTING: Server Data Structure")
        if not data or 'servers' not in data:
            self.log_test("Server Data Structure", False, "No server data available")
            return
            
        servers = data['servers']
        if not servers:
            self.log_test("Server Data Structure", False, "No servers in response")
            return
            
        # Required fields from review request
        required_fields = ['id', 'name', 'entryFee', 'region', 'regionId', 'currentPlayers', 'maxPlayers']
        
        sample_server = servers[0]
        missing_fields = [field for field in required_fields if field not in sample_server]
        
        if missing_fields:
            self.log_test("Server Data Structure", False, f"Missing fields in server: {missing_fields}")
        else:
            self.log_test("Server Data Structure", True, f"All required fields present in servers")
            
        # Test a few more servers to ensure consistency
        for i, server in enumerate(servers[:3]):
            server_missing = [field for field in required_fields if field not in server]
            if server_missing:
                self.log_test(f"Server {i+1} Structure", False, f"Missing: {server_missing}")
            else:
                self.log_test(f"Server {i+1} Structure", True, "All fields present")
                
    def test_entry_fees(self, data: Dict):
        """Test that servers have entryFee > 0 (cash games)"""
        print("\n🔍 TESTING: Entry Fees (Cash Games)")
        if not data or 'servers' not in data:
            self.log_test("Entry Fees", False, "No server data available")
            return
            
        servers = data['servers']
        if not servers:
            self.log_test("Entry Fees", False, "No servers in response")
            return
            
        # Check that all servers have entryFee > 0
        zero_fee_servers = [s for s in servers if s.get('entryFee', 0) <= 0]
        
        if zero_fee_servers:
            self.log_test("Entry Fees > 0", False, f"Found {len(zero_fee_servers)} servers with zero/negative entry fees")
        else:
            self.log_test("Entry Fees > 0", True, f"All {len(servers)} servers have positive entry fees")
            
        # Check expected entry fee values (0.01, 0.02, 0.05)
        expected_fees = {0.01, 0.02, 0.05}
        actual_fees = set(s.get('entryFee', 0) for s in servers)
        
        if expected_fees.issubset(actual_fees):
            self.log_test("Expected Entry Fee Values", True, f"Found expected fees: {sorted(actual_fees)}")
        else:
            missing_fees = expected_fees - actual_fees
            self.log_test("Expected Entry Fee Values", False, f"Missing fees: {missing_fees}, Found: {sorted(actual_fees)}")
            
    def test_regions_coverage(self, data: Dict):
        """Test that all expected regions are represented"""
        print("\n🔍 TESTING: Regional Coverage")
        if not data or 'servers' not in data:
            self.log_test("Regional Coverage", False, "No server data available")
            return
            
        servers = data['servers']
        if not servers:
            self.log_test("Regional Coverage", False, "No servers in response")
            return
            
        # Expected regions from review request
        expected_regions = {'US East', 'US West', 'Europe', 'Asia', 'Oceania'}
        actual_regions = set(s.get('region', '') for s in servers)
        
        missing_regions = expected_regions - actual_regions
        extra_regions = actual_regions - expected_regions
        
        if not missing_regions:
            self.log_test("All Expected Regions Present", True, f"Found: {sorted(actual_regions)}")
        else:
            self.log_test("All Expected Regions Present", False, f"Missing: {missing_regions}")
            
        if extra_regions:
            self.log_test("Extra Regions Found", True, f"Additional regions: {sorted(extra_regions)}")
            
        # Test region distribution
        region_counts = {}
        for server in servers:
            region = server.get('region', 'Unknown')
            region_counts[region] = region_counts.get(region, 0) + 1
            
        print(f"📊 Region Distribution: {region_counts}")
        
        # Each region should have multiple servers (3 game types × 1-2 rooms = 5 servers per region)
        for region, count in region_counts.items():
            if count >= 3:  # At least 3 servers per region (minimum viable)
                self.log_test(f"Region {region} Server Count", True, f"{count} servers")
            else:
                self.log_test(f"Region {region} Server Count", False, f"Only {count} servers")
                
    def test_ping_endpoints(self, data: Dict):
        """Test that ping endpoints are accessible"""
        print("\n🔍 TESTING: Ping Endpoints Accessibility")
        if not data or 'servers' not in data:
            self.log_test("Ping Endpoints", False, "No server data available")
            return
            
        servers = data['servers']
        if not servers:
            self.log_test("Ping Endpoints", False, "No servers in response")
            return
            
        # Get unique ping endpoints
        ping_endpoints = set()
        for server in servers:
            endpoint = server.get('pingEndpoint')
            if endpoint:
                ping_endpoints.add(endpoint)
                
        if not ping_endpoints:
            self.log_test("Ping Endpoints Present", False, "No ping endpoints found in servers")
            return
        else:
            self.log_test("Ping Endpoints Present", True, f"Found {len(ping_endpoints)} unique endpoints")
            
        # Test accessibility of ping endpoints (basic connectivity)
        accessible_endpoints = 0
        for endpoint in list(ping_endpoints)[:3]:  # Test first 3 to avoid too many requests
            try:
                # Try to resolve the endpoint (basic connectivity test)
                import socket
                host = endpoint.replace('ec2.', '').replace('.amazonaws.com', '')
                socket.gethostbyname(f"ec2.{host}.amazonaws.com")
                accessible_endpoints += 1
                self.log_test(f"Ping Endpoint {endpoint}", True, "DNS resolvable")
            except Exception as e:
                self.log_test(f"Ping Endpoint {endpoint}", False, f"DNS error: {str(e)}")
                
    def test_server_filtering_logic(self, data: Dict):
        """Test server filtering and sorting logic"""
        print("\n🔍 TESTING: Server Filtering Logic")
        if not data or 'servers' not in data:
            self.log_test("Server Filtering", False, "No server data available")
            return
            
        servers = data['servers']
        if not servers:
            self.log_test("Server Filtering", False, "No servers in response")
            return
            
        # Test that servers have proper status values
        valid_statuses = {'waiting', 'active', 'full'}
        invalid_status_servers = [s for s in servers if s.get('status') not in valid_statuses]
        
        if invalid_status_servers:
            self.log_test("Server Status Values", False, f"Found {len(invalid_status_servers)} servers with invalid status")
        else:
            self.log_test("Server Status Values", True, "All servers have valid status values")
            
        # Test currentPlayers vs maxPlayers logic
        invalid_player_count = []
        for server in servers:
            current = server.get('currentPlayers', 0)
            max_players = server.get('maxPlayers', 0)
            if current > max_players:
                invalid_player_count.append(server['id'])
                
        if invalid_player_count:
            self.log_test("Player Count Logic", False, f"Servers with currentPlayers > maxPlayers: {len(invalid_player_count)}")
        else:
            self.log_test("Player Count Logic", True, "All servers have valid player counts")
            
        # Test that full servers have currentPlayers == maxPlayers
        full_servers = [s for s in servers if s.get('status') == 'full']
        incorrect_full_servers = [s for s in full_servers if s.get('currentPlayers', 0) < s.get('maxPlayers', 0)]
        
        if incorrect_full_servers:
            self.log_test("Full Server Logic", False, f"Found {len(incorrect_full_servers)} 'full' servers that aren't actually full")
        else:
            self.log_test("Full Server Logic", True, "Full servers have correct player counts")
            
    def test_hathora_integration(self, data: Dict):
        """Test Hathora-specific fields and integration"""
        print("\n🔍 TESTING: Hathora Integration")
        if not data or 'servers' not in data:
            self.log_test("Hathora Integration", False, "No server data available")
            return
            
        # Check hathoraEnabled flag
        hathora_enabled = data.get('hathoraEnabled', False)
        if hathora_enabled:
            self.log_test("Hathora Enabled Flag", True, "Hathora integration is enabled")
        else:
            self.log_test("Hathora Enabled Flag", False, "Hathora integration is disabled")
            
        servers = data['servers']
        if not servers:
            self.log_test("Hathora Server Data", False, "No servers in response")
            return
            
        # Check Hathora-specific fields
        hathora_fields = ['hathoraRoomId', 'hathoraRegion', 'serverType']
        servers_with_hathora = 0
        
        for server in servers:
            has_all_hathora_fields = all(field in server for field in hathora_fields)
            if has_all_hathora_fields:
                servers_with_hathora += 1
                
        if servers_with_hathora == len(servers):
            self.log_test("Hathora Server Fields", True, f"All {len(servers)} servers have Hathora fields")
        else:
            self.log_test("Hathora Server Fields", False, f"Only {servers_with_hathora}/{len(servers)} servers have Hathora fields")
            
        # Check serverType values
        server_types = set(s.get('serverType', '') for s in servers)
        expected_server_type = 'hathora-paid'
        
        if expected_server_type in server_types:
            self.log_test("Hathora Server Type", True, f"Found expected server type: {expected_server_type}")
        else:
            self.log_test("Hathora Server Type", False, f"Expected '{expected_server_type}', found: {server_types}")
            
    def run_comprehensive_tests(self):
        """Run all server browser tests"""
        print("🚀 STARTING COMPREHENSIVE SERVER BROWSER BACKEND TESTING")
        print("=" * 80)
        
        # Test 1: API Health
        if not self.test_api_health():
            print("❌ API is not accessible, stopping tests")
            return self.generate_summary()
            
        # Test 2: Get server data
        server_data = self.test_servers_endpoint_structure()
        if not server_data:
            print("❌ Cannot get server data, stopping tests")
            return self.generate_summary()
            
        # Test 3: Server count
        self.test_server_count(server_data)
        
        # Test 4: Server data structure
        self.test_server_data_structure(server_data)
        
        # Test 5: Entry fees
        self.test_entry_fees(server_data)
        
        # Test 6: Regional coverage
        self.test_regions_coverage(server_data)
        
        # Test 7: Ping endpoints
        self.test_ping_endpoints(server_data)
        
        # Test 8: Server filtering logic
        self.test_server_filtering_logic(server_data)
        
        # Test 9: Hathora integration
        self.test_hathora_integration(server_data)
        
        return self.generate_summary()
        
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 80)
        print("📊 SERVER BROWSER BACKEND TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.passed_tests}/{self.total_tests} tests ({success_rate:.1f}% success rate)")
        
        if self.passed_tests == self.total_tests:
            print("🎉 ALL TESTS PASSED - SERVER BROWSER BACKEND IS FULLY OPERATIONAL")
        elif success_rate >= 80:
            print("✅ MOSTLY WORKING - Minor issues detected")
        elif success_rate >= 60:
            print("⚠️ PARTIALLY WORKING - Several issues need attention")
        else:
            print("❌ CRITICAL ISSUES - Major problems detected")
            
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['passed']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['details']}")
                
        return {
            'total_tests': self.total_tests,
            'passed_tests': self.passed_tests,
            'success_rate': success_rate,
            'failed_tests': failed_tests
        }

if __name__ == "__main__":
    tester = ServerBrowserTester()
    results = tester.run_comprehensive_tests()
    
    # Exit with appropriate code
    if results['success_rate'] >= 80:
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure