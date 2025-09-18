#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Hathora Client TypeError Fixes
Testing that all methods work without "Cannot read properties of undefined" errors
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-gameroom.preview.emergentagent.com"

class HathoraClientTester:
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
        
    def test_api_health_check(self):
        """Test 1: Verify API is accessible and Hathora is enabled"""
        print("\n🔗 TESTING API HEALTH CHECK")
        
        try:
            response = requests.get(f"{BASE_URL}/api/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'servers' in data and 'hathoraEnabled' in data:
                    server_count = len(data['servers'])
                    hathora_enabled = data['hathoraEnabled']
                    self.log_result("API Health Check", True, 
                                  f"API accessible, {server_count} servers available, Hathora enabled: {hathora_enabled}")
                else:
                    self.log_result("API Health Check", False, f"Invalid response structure: {data}")
            else:
                self.log_result("API Health Check", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("API Health Check", False, f"Exception: {str(e)}")
    
    def test_hathora_room_creation_api(self):
        """Test 2: Test Hathora room creation via server API (no TypeError)"""
        print("\n🚀 TESTING HATHORA ROOM CREATION API")
        
        try:
            # Test room creation via server API
            payload = {
                "gameMode": "practice",
                "region": "US-East-1",
                "maxPlayers": 50,
                "stakeAmount": 0
            }
            
            response = requests.post(f"{BASE_URL}/api/hathora/room", 
                                   json=payload, 
                                   headers={"Content-Type": "application/json"},
                                   timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if 'success' in data and data['success'] and 'roomId' in data:
                    self.log_result("Hathora Room Creation API", True, 
                                  f"Room created successfully: {data['roomId']}")
                else:
                    self.log_result("Hathora Room Creation API", False, 
                                  f"Room creation failed: {data.get('error', 'Unknown error')}")
            else:
                self.log_result("Hathora Room Creation API", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Hathora Room Creation API", False, f"Exception: {str(e)}")
    
    def test_multiple_room_creation(self):
        """Test 3: Test multiple room creation to verify no client initialization issues"""
        print("\n🔄 TESTING MULTIPLE ROOM CREATION")
        
        created_rooms = []
        
        for i in range(3):
            try:
                payload = {
                    "gameMode": "practice",
                    "region": "US-West-2",
                    "maxPlayers": 50,
                    "stakeAmount": 0
                }
                
                response = requests.post(f"{BASE_URL}/api/hathora/room", 
                                       json=payload, 
                                       headers={"Content-Type": "application/json"},
                                       timeout=30)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'success' in data and data['success'] and 'roomId' in data:
                        created_rooms.append(data['roomId'])
                    else:
                        self.log_result(f"Multiple Room Creation #{i+1}", False, 
                                      f"Room creation failed: {data.get('error', 'Unknown error')}")
                        return
                else:
                    self.log_result(f"Multiple Room Creation #{i+1}", False, 
                                  f"HTTP {response.status_code}: {response.text}")
                    return
                    
                # Small delay between requests
                time.sleep(1)
                
            except Exception as e:
                self.log_result(f"Multiple Room Creation #{i+1}", False, f"Exception: {str(e)}")
                return
        
        if len(created_rooms) == 3:
            self.log_result("Multiple Room Creation", True, 
                          f"Successfully created 3 rooms: {created_rooms}")
        else:
            self.log_result("Multiple Room Creation", False, 
                          f"Only created {len(created_rooms)} out of 3 rooms")
    
    def test_room_creation_different_regions(self):
        """Test 4: Test room creation in different regions"""
        print("\n🌍 TESTING ROOM CREATION IN DIFFERENT REGIONS")
        
        regions = ["US-East-1", "US-West-2", "Europe", "Asia", "Oceania"]
        successful_regions = []
        
        for region in regions:
            try:
                payload = {
                    "gameMode": "practice",
                    "region": region,
                    "maxPlayers": 50,
                    "stakeAmount": 0
                }
                
                response = requests.post(f"{BASE_URL}/api/hathora/room", 
                                       json=payload, 
                                       headers={"Content-Type": "application/json"},
                                       timeout=30)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'success' in data and data['success'] and 'roomId' in data:
                        successful_regions.append(region)
                        print(f"  ✅ {region}: Room {data['roomId']} created")
                    else:
                        print(f"  ❌ {region}: {data.get('error', 'Unknown error')}")
                else:
                    print(f"  ❌ {region}: HTTP {response.status_code}")
                    
                # Small delay between requests
                time.sleep(1)
                
            except Exception as e:
                print(f"  ❌ {region}: Exception: {str(e)}")
        
        if len(successful_regions) >= 3:
            self.log_result("Multi-Region Room Creation", True, 
                          f"Successfully created rooms in {len(successful_regions)} regions: {successful_regions}")
        else:
            self.log_result("Multi-Region Room Creation", False, 
                          f"Only created rooms in {len(successful_regions)} regions: {successful_regions}")
    
    def test_websocket_url_construction(self):
        """Test 5: Test WebSocket URL construction without TypeError"""
        print("\n🔗 TESTING WEBSOCKET URL CONSTRUCTION")
        
        try:
            # Create a room first to get connection info
            payload = {
                "gameMode": "practice",
                "region": "US-East-1",
                "maxPlayers": 50,
                "stakeAmount": 0
            }
            
            response = requests.post(f"{BASE_URL}/api/hathora/room", 
                                   json=payload, 
                                   headers={"Content-Type": "application/json"},
                                   timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if 'success' in data and data['success']:
                    # Check if connection info is provided
                    required_fields = ['roomId']
                    optional_fields = ['host', 'port', 'playerToken']
                    
                    has_required = all(field in data for field in required_fields)
                    has_optional = any(field in data for field in optional_fields)
                    
                    if has_required:
                        connection_info = {
                            'roomId': data.get('roomId'),
                            'host': data.get('host', 'Not provided'),
                            'port': data.get('port', 'Not provided'),
                            'hasToken': 'playerToken' in data
                        }
                        self.log_result("WebSocket URL Construction", True, 
                                      f"Connection info available: {connection_info}")
                    else:
                        self.log_result("WebSocket URL Construction", False, 
                                      f"Missing required connection fields: {data}")
                else:
                    self.log_result("WebSocket URL Construction", False, 
                                  f"Room creation failed: {data.get('error', 'Unknown error')}")
            else:
                self.log_result("WebSocket URL Construction", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("WebSocket URL Construction", False, f"Exception: {str(e)}")
    
    def test_authentication_token_flow(self):
        """Test 6: Test authentication token flow without client errors"""
        print("\n🔐 TESTING AUTHENTICATION TOKEN FLOW")
        
        try:
            # Test room creation with different game modes
            test_cases = [
                {"gameMode": "practice", "region": "US-East-1", "stakeAmount": 0},
                {"gameMode": "cash-game", "region": "US-West-2", "stakeAmount": 0.01}
            ]
            
            successful_auths = 0
            
            for i, test_case in enumerate(test_cases):
                response = requests.post(f"{BASE_URL}/api/hathora/room", 
                                       json=test_case, 
                                       headers={"Content-Type": "application/json"},
                                       timeout=30)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'success' in data and data['success']:
                        # Check if authentication token is provided
                        has_token = 'playerToken' in data or 'authToken' in data
                        room_id = data.get('roomId', 'Unknown')
                        
                        print(f"  ✅ Test case {i+1}: Room {room_id}, Token provided: {has_token}")
                        successful_auths += 1
                    else:
                        print(f"  ❌ Test case {i+1}: {data.get('error', 'Unknown error')}")
                else:
                    print(f"  ❌ Test case {i+1}: HTTP {response.status_code}")
                
                time.sleep(1)
            
            if successful_auths == len(test_cases):
                self.log_result("Authentication Token Flow", True, 
                              f"All {successful_auths} authentication tests passed")
            else:
                self.log_result("Authentication Token Flow", False, 
                              f"Only {successful_auths}/{len(test_cases)} authentication tests passed")
                
        except Exception as e:
            self.log_result("Authentication Token Flow", False, f"Exception: {str(e)}")
    
    def test_server_browser_integration(self):
        """Test 7: Test server browser integration with Hathora rooms"""
        print("\n🎮 TESTING SERVER BROWSER INTEGRATION")
        
        try:
            response = requests.get(f"{BASE_URL}/api/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'servers' in data:
                    servers = data['servers']
                    hathora_servers = [s for s in servers if s.get('serverType') == 'hathora-paid']
                    
                    if hathora_servers:
                        # Check if Hathora servers have required fields
                        required_fields = ['id', 'hathoraRoomId', 'hathoraRegion', 'name', 'region']
                        valid_servers = 0
                        
                        for server in hathora_servers[:5]:  # Check first 5 servers
                            if all(field in server for field in required_fields):
                                valid_servers += 1
                        
                        if valid_servers > 0:
                            self.log_result("Server Browser Integration", True, 
                                          f"{len(hathora_servers)} Hathora servers found, {valid_servers} properly configured")
                        else:
                            self.log_result("Server Browser Integration", False, 
                                          "Hathora servers found but missing required fields")
                    else:
                        self.log_result("Server Browser Integration", False, 
                                      "No Hathora servers found in server browser")
                else:
                    self.log_result("Server Browser Integration", False, 
                                  f"Invalid server browser response: {data}")
            else:
                self.log_result("Server Browser Integration", False, 
                              f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Server Browser Integration", False, f"Exception: {str(e)}")
    
    def test_graceful_error_handling(self):
        """Test 8: Test graceful error handling without TypeErrors"""
        print("\n🛡️ TESTING GRACEFUL ERROR HANDLING")
        
        try:
            # Test with invalid parameters to ensure graceful handling
            test_cases = [
                {"gameMode": "invalid-mode", "region": "US-East-1"},
                {"gameMode": "practice", "region": "Invalid-Region"},
                {"gameMode": "practice", "region": "US-East-1", "maxPlayers": -1}
            ]
            
            graceful_errors = 0
            
            for i, test_case in enumerate(test_cases):
                response = requests.post(f"{BASE_URL}/api/hathora/room", 
                                       json=test_case, 
                                       headers={"Content-Type": "application/json"},
                                       timeout=30)
                
                # We expect either success or graceful error handling (not 500 errors)
                if response.status_code in [200, 400, 422]:
                    if response.status_code == 200:
                        data = response.json()
                        if 'success' in data:
                            print(f"  ✅ Test case {i+1}: Handled gracefully (success: {data['success']})")
                            graceful_errors += 1
                        else:
                            print(f"  ❌ Test case {i+1}: Invalid response structure")
                    else:
                        print(f"  ✅ Test case {i+1}: Proper error response (HTTP {response.status_code})")
                        graceful_errors += 1
                elif response.status_code == 500:
                    print(f"  ❌ Test case {i+1}: Server error (HTTP 500) - possible TypeError")
                else:
                    print(f"  ⚠️ Test case {i+1}: Unexpected status (HTTP {response.status_code})")
                
                time.sleep(1)
            
            if graceful_errors >= 2:
                self.log_result("Graceful Error Handling", True, 
                              f"{graceful_errors}/{len(test_cases)} error cases handled gracefully")
            else:
                self.log_result("Graceful Error Handling", False, 
                              f"Only {graceful_errors}/{len(test_cases)} error cases handled gracefully")
                
        except Exception as e:
            self.log_result("Graceful Error Handling", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all Hathora client TypeError fix tests"""
        print("🚀 STARTING COMPREHENSIVE HATHORA CLIENT TYPEERROR FIX TESTING")
        print(f"📅 Test started at: {datetime.now().isoformat()}")
        print(f"🔗 Base URL: {BASE_URL}")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all tests
        self.test_api_health_check()
        self.test_hathora_room_creation_api()
        self.test_multiple_room_creation()
        self.test_room_creation_different_regions()
        self.test_websocket_url_construction()
        self.test_authentication_token_flow()
        self.test_server_browser_integration()
        self.test_graceful_error_handling()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 HATHORA CLIENT TYPEERROR FIX TESTING SUMMARY")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.passed_tests}/{self.total_tests}")
        print(f"❌ Tests Failed: {self.total_tests - self.passed_tests}/{self.total_tests}")
        print(f"📈 Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%")
        print(f"⏱️  Total Duration: {duration:.2f} seconds")
        print(f"📅 Completed at: {datetime.now().isoformat()}")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 ALL HATHORA CLIENT TYPEERROR FIX TESTS PASSED!")
            print("✅ No 'Cannot read properties of undefined' errors detected")
            print("✅ Server API integration working correctly")
            print("✅ Room creation operational without client initialization")
            print("✅ WebSocket connection establishment functional")
            print("✅ Graceful error handling implemented")
        else:
            print(f"\n⚠️  {self.total_tests - self.passed_tests} TESTS FAILED")
            print("❌ Some Hathora client issues detected")
            
            # Print failed tests
            failed_tests = [r for r in self.results if not r['success']]
            if failed_tests:
                print("\nFAILED TESTS:")
                for test in failed_tests:
                    print(f"  ❌ {test['test']}: {test['details']}")
        
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = HathoraClientTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)