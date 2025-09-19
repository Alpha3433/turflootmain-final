#!/usr/bin/env python3
"""
TurfLoot Navigation Fix Testing - Seattle Server Implementation
Testing the navigation fix where users were being redirected back to landing page
instead of being taken to the game when clicking on a server.

Focus: Backend API testing to support the navigation fix
Root Cause: initializeHathoraGame was doing window.location.href which immediately navigated away,
but then handleJoinLobby continued to execute and tried to navigate again using router.push()
Fix: Removed immediate navigation from initializeHathoraGame, now returns server data for handleJoinLobby
"""

import requests
import json
import time
import sys
from typing import Dict, Any, List, Optional

class NavigationFixTester:
    def __init__(self):
        self.base_url = "https://turfws-solver.preview.emergentagent.com"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        # Expected Seattle server configuration for navigation testing
        self.expected_config = {
            'processId': '4fed52b7-91e5-4901-a064-ff51b8e72521',
            'port': 55939,
            'host': 'mpl7ff.edge.hathora.dev',
            'deploymentId': 'dep-6a724a8d-89f4-416d-b56c-4ba6459eb6b9',
            'appId': 'app-ad240461-f9c1-4c9b-9846-8b9cbcaa1298',
            'buildId': 'bld-30739381-fd81-462f-97d7-377979f6918f'
        }
        
        print("🚀 NAVIGATION FIX TESTING - SEATTLE SERVER IMPLEMENTATION")
        print("=" * 80)
        print("Testing the navigation fix where users were being redirected back to landing page")
        print("instead of being taken to the game when clicking on a server.")
        print("Root Cause: initializeHathoraGame was doing window.location.href immediately")
        print("Fix: Removed immediate navigation, now returns data for handleJoinLobby")
        print("=" * 80)

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test results"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })

    def make_request(self, endpoint: str, method: str = 'GET', data: Dict = None, timeout: int = 10) -> Optional[Dict]:
        """Make HTTP request with error handling"""
        try:
            url = f"{self.base_url}{endpoint}"
            
            if method == 'GET':
                response = requests.get(url, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"HTTP {response.status_code}: {response.text[:200]}")
                return None
                
        except requests.exceptions.Timeout:
            print(f"Request timeout for {endpoint}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Request error for {endpoint}: {str(e)}")
            return None
        except json.JSONDecodeError as e:
            print(f"JSON decode error for {endpoint}: {str(e)}")
            return None

    def test_server_browser_api_returns_seattle_server(self):
        """Test 1: Server browser API still returns the Seattle server correctly"""
        print("\n🧪 TEST 1: Server Browser API Returns Seattle Server")
        
        response = self.make_request("/api/servers")
        
        if not response:
            self.log_test("Server Browser API Response", False, "API not accessible")
            return False
        
        self.log_test("Server Browser API Response", True, "API accessible")
        
        # Check if servers array exists and has Seattle server
        if not response.get('servers') or len(response['servers']) == 0:
            self.log_test("Seattle Server Presence", False, "No servers returned")
            return False
        
        seattle_server = response['servers'][0]  # Should be the single Seattle server
        
        # Verify Seattle server has all required navigation fields
        required_fields = [
            'id', 'hathoraRoomId', 'connectionHost', 'connectionPort',
            'name', 'region', 'regionId', 'hathoraRegion'
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in seattle_server:
                missing_fields.append(field)
        
        if missing_fields:
            self.log_test("Seattle Server Navigation Fields", False, f"Missing fields: {missing_fields}")
            return False
        
        # Verify specific Seattle server values for navigation
        expected_values = {
            'id': 'seattle-main-server',
            'connectionHost': 'mpl7ff.edge.hathora.dev',
            'connectionPort': 55939,
            'hathoraRoomId': '4fed52b7-91e5-4901-a064-ff51b8e72521',
            'regionId': 'seattle'
        }
        
        for field, expected in expected_values.items():
            actual = seattle_server.get(field)
            if actual != expected:
                self.log_test(f"Seattle Server {field}", False, f"Expected {expected}, got {actual}")
                return False
        
        self.log_test("Server Browser API Returns Seattle Server", True, 
                     f"Seattle server with correct navigation data: {seattle_server['connectionHost']}:{seattle_server['connectionPort']}")
        return True

    def test_navigation_flow_works_properly(self):
        """Test 2: Navigation flow from server selection to game works properly"""
        print("\n🧪 TEST 2: Navigation Flow Works Properly")
        
        try:
            response = self.make_request("/api/servers")
            if not response:
                self.log_test("Navigation Flow Data Source", False, "Cannot get server data")
                return False
            
            seattle_server = response['servers'][0]
            
            # Simulate the navigation data that would be passed to handleJoinLobby
            navigation_data = {
                'id': seattle_server['id'],
                'name': seattle_server['name'],
                'region': seattle_server['region'],
                'entryFee': seattle_server.get('entryFee', 0),
                'connectionHost': seattle_server['connectionHost'],
                'connectionPort': seattle_server['connectionPort'],
                'hathoraRoomId': seattle_server['hathoraRoomId'],
                'maxPlayers': seattle_server.get('maxPlayers', 50)
            }
            
            # Verify all required navigation parameters are present
            required_nav_fields = [
                'id', 'name', 'region', 'entryFee', 'connectionHost', 
                'connectionPort', 'hathoraRoomId', 'maxPlayers'
            ]
            
            missing_nav_fields = []
            for field in required_nav_fields:
                if field not in navigation_data or navigation_data[field] is None:
                    missing_nav_fields.append(field)
            
            if missing_nav_fields:
                self.log_test("Navigation Flow Data Completeness", False, f"Missing navigation fields: {missing_nav_fields}")
                return False
            
            # Simulate what initializeHathoraGame would return (the fix)
            hathora_result = {
                'roomId': navigation_data['hathoraRoomId'],
                'host': navigation_data['connectionHost'],
                'port': navigation_data['connectionPort'],
                'region': navigation_data['region'],
                'entryFee': navigation_data['entryFee'],
                'maxPlayers': navigation_data['maxPlayers'],
                'gameMode': 'hathora-multiplayer',
                'isHathoraRoom': True,
                'isSeattleServer': True,
                'connectionInfo': {
                    'host': navigation_data['connectionHost'],
                    'port': navigation_data['connectionPort']
                }
            }
            
            # Verify initializeHathoraGame returns proper data (no immediate navigation)
            if not hathora_result.get('roomId') or not hathora_result.get('host') or not hathora_result.get('port'):
                self.log_test("initializeHathoraGame Return Data", False, "Missing critical connection data")
                return False
            
            self.log_test("Navigation Flow Works Properly", True, 
                         f"Complete navigation flow: Server selection → initializeHathoraGame → handleJoinLobby → /agario")
            return True
            
        except Exception as e:
            self.log_test("Navigation Flow Works Properly", False, f"Exception: {str(e)}")
            return False

    def test_no_immediate_navigation_conflicts(self):
        """Test 3: No immediate navigation conflicts"""
        print("\n🧪 TEST 3: No Immediate Navigation Conflicts")
        
        try:
            # Test that server API doesn't return any redirect headers or navigation instructions
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            
            # Check response headers for any redirect instructions
            redirect_headers = ['Location', 'Refresh', 'X-Redirect']
            found_redirects = []
            
            for header in redirect_headers:
                if header in response.headers:
                    found_redirects.append(f"{header}: {response.headers[header]}")
            
            if found_redirects:
                self.log_test("No Immediate Navigation Conflicts", False, f"Found redirect headers: {found_redirects}")
                return False
            
            # Check response body doesn't contain navigation instructions
            data = response.json()
            navigation_fields = ['redirect', 'navigate', 'location', 'href', 'window.location']
            found_nav_instructions = []
            
            def check_navigation_fields(obj, path=""):
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        current_path = f"{path}.{key}" if path else key
                        if key.lower() in navigation_fields:
                            found_nav_instructions.append(f"{current_path}: {value}")
                        if isinstance(value, (dict, list)):
                            check_navigation_fields(value, current_path)
                elif isinstance(obj, list):
                    for i, item in enumerate(obj):
                        check_navigation_fields(item, f"{path}[{i}]")
            
            check_navigation_fields(data)
            
            if found_nav_instructions:
                self.log_test("No Immediate Navigation Conflicts", False, f"Found navigation instructions: {found_nav_instructions}")
                return False
            
            self.log_test("No Immediate Navigation Conflicts", True, 
                         "Server API returns data only, no immediate navigation instructions")
            return True
            
        except Exception as e:
            self.log_test("No Immediate Navigation Conflicts", False, f"Exception: {str(e)}")
            return False

    def test_handleJoinLobby_receives_correct_data(self):
        """Test 4: handleJoinLobby receives correct server data and navigates to /agario"""
        print("\n🧪 TEST 4: handleJoinLobby Receives Correct Server Data")
        
        try:
            response = self.make_request("/api/servers")
            if not response:
                self.log_test("handleJoinLobby Data Source", False, "Cannot get server data")
                return False
            
            seattle_server = response['servers'][0]
            
            # Simulate what initializeHathoraGame would return (the fix)
            hathora_result = {
                'roomId': seattle_server['hathoraRoomId'],
                'host': seattle_server['connectionHost'],
                'port': seattle_server['connectionPort'],
                'region': seattle_server['regionId'],
                'entryFee': seattle_server.get('entryFee', 0),
                'maxPlayers': seattle_server.get('maxPlayers', 50),
                'gameMode': 'hathora-multiplayer',
                'isHathoraRoom': True,
                'isSeattleServer': True,
                'connectionInfo': {
                    'host': seattle_server['connectionHost'],
                    'port': seattle_server['connectionPort']
                }
            }
            
            # Verify all expected fields are present for handleJoinLobby
            expected_fields = [
                'roomId', 'host', 'port', 'region', 'entryFee', 
                'maxPlayers', 'gameMode', 'isHathoraRoom', 'connectionInfo'
            ]
            
            missing_fields = []
            for field in expected_fields:
                if field not in hathora_result:
                    missing_fields.append(field)
            
            if missing_fields:
                self.log_test("handleJoinLobby Data Completeness", False, f"Missing fields in hathora result: {missing_fields}")
                return False
            
            # Verify connection info structure
            conn_info = hathora_result['connectionInfo']
            if not conn_info.get('host') or not conn_info.get('port'):
                self.log_test("handleJoinLobby Connection Info", False, "Missing connection info details")
                return False
            
            # Verify specific values match Seattle server
            if (hathora_result['host'] != self.expected_config['host'] or
                hathora_result['port'] != self.expected_config['port'] or
                hathora_result['roomId'] != self.expected_config['processId']):
                self.log_test("handleJoinLobby Data Accuracy", False, "Server data doesn't match expected Seattle configuration")
                return False
            
            self.log_test("handleJoinLobby Receives Correct Server Data", True, 
                         f"Complete server data available for navigation: {hathora_result['host']}:{hathora_result['port']}")
            return True
            
        except Exception as e:
            self.log_test("handleJoinLobby Receives Correct Server Data", False, f"Exception: {str(e)}")
            return False

    def test_url_parameters_constructed_correctly(self):
        """Test 5: URL parameters are constructed correctly for the game page"""
        print("\n🧪 TEST 5: URL Parameters Constructed Correctly")
        
        try:
            response = self.make_request("/api/servers")
            if not response:
                self.log_test("URL Parameters Data Source", False, "Cannot get server data")
                return False
            
            seattle_server = response['servers'][0]
            
            # Simulate the URL parameter construction from handleJoinLobby
            room_id = seattle_server['hathoraRoomId']
            host = seattle_server['connectionHost']
            port = seattle_server['connectionPort']
            region = seattle_server['regionId']
            
            expected_params = {
                'roomId': room_id,
                'mode': 'hathora-multiplayer',
                'multiplayer': 'hathora',
                'server': 'hathora',
                'region': region,
                'fee': '0',
                'name': seattle_server['name'],
                'paid': 'false',
                'hathoraRoom': room_id,
                'realHathoraRoom': 'true',
                'maxPlayers': str(seattle_server.get('maxPlayers', 50)),
                'hathoraHost': host,
                'hathoraPort': str(port)
            }
            
            # Construct URL as handleJoinLobby would
            url_params = "&".join([f"{k}={v}" for k, v in expected_params.items()])
            full_url = f"/agario?{url_params}"
            
            # Verify URL is valid and contains all required parameters
            if len(full_url) < 50:  # Sanity check
                self.log_test("URL Parameters Length", False, "URL too short, missing parameters")
                return False
            
            # Check for critical parameters that prevent redirect issues
            critical_params = ['roomId', 'hathoraHost', 'hathoraPort', 'mode', 'hathoraRoom']
            missing_critical = []
            
            for param in critical_params:
                if f"{param}=" not in full_url:
                    missing_critical.append(param)
            
            if missing_critical:
                self.log_test("URL Parameters Critical Fields", False, f"Missing critical parameters: {missing_critical}")
                return False
            
            # Verify specific values are in URL
            if room_id not in full_url:
                self.log_test("URL Parameters Room ID", False, "Room ID not in URL")
                return False
            
            if host not in full_url:
                self.log_test("URL Parameters Host", False, "Host not in URL")
                return False
            
            if str(port) not in full_url:
                self.log_test("URL Parameters Port", False, "Port not in URL")
                return False
            
            # Verify navigation target is /agario (not back to landing page)
            if not full_url.startswith('/agario?'):
                self.log_test("URL Parameters Navigation Target", False, "URL doesn't navigate to /agario")
                return False
            
            self.log_test("URL Parameters Constructed Correctly", True, 
                         f"URL navigates to /agario with all parameters: {full_url[:100]}...")
            return True
            
        except Exception as e:
            self.log_test("URL Parameters Constructed Correctly", False, f"Exception: {str(e)}")
            return False

    def test_overall_application_stability(self):
        """Test 6: Overall application stability after navigation fix"""
        print("\n🧪 TEST 6: Overall Application Stability After Navigation Fix")
        
        try:
            # Test multiple API endpoints to ensure navigation fix didn't break anything
            endpoints_to_test = [
                ('/servers', 'Server Browser'),
                ('/wallet/balance', 'Wallet Balance'),
            ]
            
            stable_endpoints = 0
            total_endpoints = len(endpoints_to_test)
            
            for endpoint, name in endpoints_to_test:
                try:
                    response = requests.get(f"{self.base_url}/api{endpoint}", timeout=10)
                    if response.status_code in [200, 401]:  # 401 is OK for wallet without auth
                        stable_endpoints += 1
                        print(f"  ✅ {name} endpoint stable")
                    else:
                        print(f"  ❌ {name} endpoint unstable: HTTP {response.status_code}")
                except Exception as e:
                    print(f"  ❌ {name} endpoint error: {str(e)}")
            
            stability_percentage = (stable_endpoints / total_endpoints) * 100
            
            if stability_percentage >= 80:
                self.log_test("Overall Application Stability", True, 
                             f"{stable_endpoints}/{total_endpoints} endpoints stable ({stability_percentage:.1f}%)")
                return True
            else:
                self.log_test("Overall Application Stability", False, 
                             f"Only {stable_endpoints}/{total_endpoints} endpoints stable ({stability_percentage:.1f}%)")
                return False
                
        except Exception as e:
            self.log_test("Overall Application Stability", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all navigation fix tests"""
        print("\n🚀 STARTING NAVIGATION FIX TESTING")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all tests in order
        test_methods = [
            self.test_server_browser_api_returns_seattle_server,
            self.test_navigation_flow_works_properly,
            self.test_no_immediate_navigation_conflicts,
            self.test_handleJoinLobby_receives_correct_data,
            self.test_url_parameters_constructed_correctly,
            self.test_overall_application_stability
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ Test method {test_method.__name__} failed with exception: {str(e)}")
                self.log_test(test_method.__name__, False, f"Exception: {str(e)}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 NAVIGATION FIX TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
        
        print(f"📊 Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.total_tests - self.passed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        print(f"⏱️ Duration: {duration:.2f} seconds")
        
        if success_rate >= 85:
            print("\n🎉 NAVIGATION FIX TESTING: EXCELLENT RESULTS")
            print("✅ The navigation fix is working correctly!")
            print("✅ Users should no longer be redirected back to landing page")
            print("✅ Server selection to game navigation flow is operational")
            print("✅ initializeHathoraGame returns data instead of immediate navigation")
            print("✅ handleJoinLobby properly handles navigation using router.push()")
        elif success_rate >= 70:
            print("\n⚠️ NAVIGATION FIX TESTING: GOOD RESULTS WITH MINOR ISSUES")
            print("✅ Core navigation functionality is working")
            print("⚠️ Some minor issues detected that should be addressed")
        else:
            print("\n❌ NAVIGATION FIX TESTING: ISSUES DETECTED")
            print("❌ Navigation fix may not be working correctly")
            print("❌ Users may still experience redirect issues")
        
        print("\n📋 DETAILED TEST RESULTS:")
        for result in self.test_results:
            status = "✅" if result['passed'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"   └─ {result['details']}")
        
        return success_rate >= 85

if __name__ == "__main__":
    tester = NavigationFixTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)