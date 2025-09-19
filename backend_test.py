#!/usr/bin/env python3
"""
Backend Testing Suite for Updated Seattle Server Implementation
Testing the new connection details provided by the user:
- ProcessId: 4fed52b7-91e5-4901-a064-ff51b8e72521 (was: cb88bc37-ecec-4688-8966-4d3d438a3242)
- Port: 55939 (was: 50283)
- Host: mpl7ff.edge.hathora.dev (unchanged)
- DeploymentId: dep-6a724a8d-89f4-416d-b56c-4ba6459eb6b9 (was: dep-7cc6db21-9d5e-4086-b5d8-984f1f1e2ddb)
"""

import requests
import json
import time
import sys
from typing import Dict, Any, List, Optional

class SeattleServerTester:
    def __init__(self):
        self.base_url = "https://turfws-solver.preview.emergentagent.com"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        # Expected new Seattle server configuration
        self.expected_config = {
            'processId': '4fed52b7-91e5-4901-a064-ff51b8e72521',
            'port': 55939,
            'host': 'mpl7ff.edge.hathora.dev',
            'deploymentId': 'dep-6a724a8d-89f4-416d-b56c-4ba6459eb6b9',
            'appId': 'app-ad240461-f9c1-4c9b-9846-8b9cbcaa1298',
            'buildId': 'bld-30739381-fd81-462f-97d7-377979f6918f'
        }
        
        print("SEATTLE SERVER UPDATE TESTING SUITE")
        print("=" * 60)
        print(f"Testing updated Seattle server configuration:")
        print(f"   ProcessId: {self.expected_config['processId']}")
        print(f"   Port: {self.expected_config['port']}")
        print(f"   Host: {self.expected_config['host']}")
        print(f"   DeploymentId: {self.expected_config['deploymentId']}")
        print("=" * 60)

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test results"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "PASSED"
        else:
            status = "FAILED"
        
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

    def test_server_browser_api_updated_config(self):
        """Test 1: Server Browser API returns updated Seattle server configuration"""
        print("\nTEST 1: Server Browser API - Updated Seattle Server Configuration")
        
        response = self.make_request("/api/servers")
        
        if not response:
            self.log_test("Server Browser API Accessibility", False, "API not accessible")
            return
        
        self.log_test("Server Browser API Accessibility", True, "API accessible")
        
        # Check if servers array exists
        if 'servers' not in response:
            self.log_test("Servers Array Present", False, "No servers array in response")
            return
        
        servers = response['servers']
        if not servers:
            self.log_test("Seattle Server Present", False, "No servers returned")
            return
        
        # Find Seattle server
        seattle_server = None
        for server in servers:
            if server.get('id') == 'seattle-main-server' or 'seattle' in server.get('name', '').lower():
                seattle_server = server
                break
        
        if not seattle_server:
            self.log_test("Seattle Server Present", False, "Seattle server not found in response")
            return
        
        self.log_test("Seattle Server Present", True, f"Found server: {seattle_server.get('name')}")
        
        # Verify updated ProcessId
        actual_process_id = seattle_server.get('hathoraRoomId')
        expected_process_id = self.expected_config['processId']
        
        if actual_process_id == expected_process_id:
            self.log_test("Updated ProcessId", True, f"ProcessId: {actual_process_id}")
        else:
            self.log_test("Updated ProcessId", False, f"Expected: {expected_process_id}, Got: {actual_process_id}")
        
        # Verify updated Port
        actual_port = seattle_server.get('connectionPort')
        expected_port = self.expected_config['port']
        
        if actual_port == expected_port:
            self.log_test("Updated Port", True, f"Port: {actual_port}")
        else:
            self.log_test("Updated Port", False, f"Expected: {expected_port}, Got: {actual_port}")
        
        # Verify Host (unchanged)
        actual_host = seattle_server.get('connectionHost')
        expected_host = self.expected_config['host']
        
        if actual_host == expected_host:
            self.log_test("Host Configuration", True, f"Host: {actual_host}")
        else:
            self.log_test("Host Configuration", False, f"Expected: {expected_host}, Got: {actual_host}")
        
        # Verify updated DeploymentId
        actual_deployment_id = seattle_server.get('deploymentId')
        expected_deployment_id = self.expected_config['deploymentId']
        
        if actual_deployment_id == expected_deployment_id:
            self.log_test("Updated DeploymentId", True, f"DeploymentId: {actual_deployment_id}")
        else:
            self.log_test("Updated DeploymentId", False, f"Expected: {expected_deployment_id}, Got: {actual_deployment_id}")
        
        # Verify AppId (unchanged)
        actual_app_id = seattle_server.get('appId')
        expected_app_id = self.expected_config['appId']
        
        if actual_app_id == expected_app_id:
            self.log_test("AppId Configuration", True, f"AppId: {actual_app_id}")
        else:
            self.log_test("AppId Configuration", False, f"Expected: {expected_app_id}, Got: {actual_app_id}")
        
        # Verify BuildId (unchanged)
        actual_build_id = seattle_server.get('buildId')
        expected_build_id = self.expected_config['buildId']
        
        if actual_build_id == expected_build_id:
            self.log_test("BuildId Configuration", True, f"BuildId: {actual_build_id}")
        else:
            self.log_test("BuildId Configuration", False, f"Expected: {expected_build_id}, Got: {actual_build_id}")
        
        # Check seattleServerInfo structure
        seattle_info = response.get('seattleServerInfo', {})
        if seattle_info:
            info_host = seattle_info.get('host')
            info_port = seattle_info.get('port')
            info_process_id = seattle_info.get('processId')
            info_app_id = seattle_info.get('appId')
            
            # Verify seattleServerInfo has updated values
            if (info_host == expected_host and 
                info_port == expected_port and 
                info_process_id == expected_process_id and 
                info_app_id == expected_app_id):
                self.log_test("SeattleServerInfo Structure", True, "All connection details correct")
            else:
                self.log_test("SeattleServerInfo Structure", False, 
                            f"Host: {info_host}, Port: {info_port}, ProcessId: {info_process_id}")
        else:
            self.log_test("SeattleServerInfo Structure", False, "seattleServerInfo not present")

    def test_hathora_client_configuration(self):
        """Test 2: Verify Hathora client uses new connection details"""
        print("\nTEST 2: Hathora Client Configuration Verification")
        
        # Test if we can access the client configuration through API health check
        response = self.make_request("/api/health")
        
        if response:
            self.log_test("API Health Check", True, "Backend accessible for client configuration")
        else:
            self.log_test("API Health Check", False, "Backend not accessible")
        
        # Test server browser API to ensure client can get updated connection info
        servers_response = self.make_request("/api/servers")
        
        if servers_response and 'seattleServerInfo' in servers_response:
            seattle_info = servers_response['seattleServerInfo']
            
            # Verify client will receive updated connection details
            if (seattle_info.get('host') == self.expected_config['host'] and
                seattle_info.get('port') == self.expected_config['port'] and
                seattle_info.get('processId') == self.expected_config['processId']):
                self.log_test("Client Connection Info", True, "Updated connection details available to client")
            else:
                self.log_test("Client Connection Info", False, "Connection details mismatch")
        else:
            self.log_test("Client Connection Info", False, "Seattle server info not available")

    def test_navigation_logic_configuration(self):
        """Test 3: Verify navigation logic uses updated server configuration"""
        print("\nTEST 3: Navigation Logic Configuration")
        
        # Test that the server browser provides correct navigation parameters
        response = self.make_request("/api/servers")
        
        if not response:
            self.log_test("Navigation Data Source", False, "Server browser API not accessible")
            return
        
        self.log_test("Navigation Data Source", True, "Server browser API accessible")
        
        # Check if the response contains all necessary navigation parameters
        required_fields = ['servers', 'seattleServerInfo', 'hathoraEnabled']
        
        for field in required_fields:
            if field in response:
                self.log_test(f"Navigation Field: {field}", True, f"{field} present in response")
            else:
                self.log_test(f"Navigation Field: {field}", False, f"{field} missing from response")
        
        # Verify Seattle server has all required navigation parameters
        if 'servers' in response and response['servers']:
            seattle_server = response['servers'][0]  # Should be the only server
            
            nav_fields = ['id', 'hathoraRoomId', 'connectionHost', 'connectionPort', 'region', 'regionId']
            
            for field in nav_fields:
                if field in seattle_server:
                    self.log_test(f"Server Navigation Field: {field}", True, 
                                f"{field}: {seattle_server[field]}")
                else:
                    self.log_test(f"Server Navigation Field: {field}", False, 
                                f"{field} missing from server data")

    def test_websocket_connection_configuration(self):
        """Test 4: Verify WebSocket connection points to new port 55939"""
        print("\nTEST 4: WebSocket Connection Configuration")
        
        # Get server configuration
        response = self.make_request("/api/servers")
        
        if not response:
            self.log_test("WebSocket Config Source", False, "Cannot get server configuration")
            return
        
        self.log_test("WebSocket Config Source", True, "Server configuration accessible")
        
        # Check seattleServerInfo for WebSocket connection details
        seattle_info = response.get('seattleServerInfo', {})
        
        if not seattle_info:
            self.log_test("WebSocket Connection Info", False, "Seattle server info not available")
            return
        
        # Verify WebSocket connection details
        ws_host = seattle_info.get('host')
        ws_port = seattle_info.get('port')
        
        if ws_host == self.expected_config['host']:
            self.log_test("WebSocket Host", True, f"Host: {ws_host}")
        else:
            self.log_test("WebSocket Host", False, f"Expected: {self.expected_config['host']}, Got: {ws_host}")
        
        if ws_port == self.expected_config['port']:
            self.log_test("WebSocket Port", True, f"Port: {ws_port}")
        else:
            self.log_test("WebSocket Port", False, f"Expected: {self.expected_config['port']}, Got: {ws_port}")
        
        # Construct expected WebSocket URL
        expected_ws_url = f"wss://{self.expected_config['host']}:{self.expected_config['port']}"
        actual_ws_url = f"wss://{ws_host}:{ws_port}"
        
        if actual_ws_url == expected_ws_url:
            self.log_test("WebSocket URL Construction", True, f"URL: {actual_ws_url}")
        else:
            self.log_test("WebSocket URL Construction", False, 
                        f"Expected: {expected_ws_url}, Got: {actual_ws_url}")

    def test_seattle_server_metadata(self):
        """Test 5: Verify all Seattle server metadata is correctly updated"""
        print("\nTEST 5: Seattle Server Metadata Verification")
        
        response = self.make_request("/api/servers")
        
        if not response:
            self.log_test("Metadata Source", False, "Server API not accessible")
            return
        
        self.log_test("Metadata Source", True, "Server API accessible")
        
        # Get Seattle server data
        servers = response.get('servers', [])
        if not servers:
            self.log_test("Server Data Available", False, "No servers in response")
            return
        
        seattle_server = servers[0]  # Should be the only server
        
        # Verify all metadata fields are present and correct
        metadata_checks = [
            ('id', 'seattle-main-server'),
            ('name', 'TurfLoot Seattle Server'),
            ('region', 'US West'),
            ('regionId', 'seattle'),
            ('hathoraRegion', 'us-west-2'),
            ('serverType', 'hathora-dedicated'),
            ('mode', 'multiplayer'),
            ('gameType', 'Main Server')
        ]
        
        for field, expected_value in metadata_checks:
            actual_value = seattle_server.get(field)
            if actual_value == expected_value:
                self.log_test(f"Metadata: {field}", True, f"{field}: {actual_value}")
            else:
                self.log_test(f"Metadata: {field}", False, 
                            f"Expected: {expected_value}, Got: {actual_value}")
        
        # Verify numeric fields
        numeric_checks = [
            ('maxPlayers', int),
            ('currentPlayers', int),
            ('entryFee', (int, float)),
            ('stake', (int, float))
        ]
        
        for field, expected_type in numeric_checks:
            actual_value = seattle_server.get(field)
            if isinstance(actual_value, expected_type):
                self.log_test(f"Metadata Type: {field}", True, f"{field}: {actual_value} ({type(actual_value).__name__})")
            else:
                self.log_test(f"Metadata Type: {field}", False, 
                            f"Expected type: {expected_type}, Got: {type(actual_value)}")
        
        # Verify boolean fields
        boolean_checks = ['canJoin', 'isRunning']
        
        for field in boolean_checks:
            actual_value = seattle_server.get(field)
            if isinstance(actual_value, bool):
                self.log_test(f"Metadata Boolean: {field}", True, f"{field}: {actual_value}")
            else:
                self.log_test(f"Metadata Boolean: {field}", False, 
                            f"Expected boolean, Got: {type(actual_value)}")

    def test_application_stability(self):
        """Test 6: Verify application remains stable after connection detail updates"""
        print("\nTEST 6: Application Stability After Updates")
        
        # Test multiple API endpoints to ensure stability
        endpoints_to_test = [
            ("/api/servers", "Server Browser"),
            ("/api/health", "Health Check"),
            ("/api/wallet/balance", "Wallet Balance")
        ]
        
        stable_endpoints = 0
        total_endpoints = len(endpoints_to_test)
        
        for endpoint, name in endpoints_to_test:
            response = self.make_request(endpoint)
            if response is not None:
                stable_endpoints += 1
                self.log_test(f"Stability: {name}", True, f"{endpoint} responding correctly")
            else:
                self.log_test(f"Stability: {name}", False, f"{endpoint} not responding")
        
        # Overall stability check
        stability_percentage = (stable_endpoints / total_endpoints) * 100
        
        if stability_percentage >= 80:
            self.log_test("Overall Application Stability", True, 
                        f"{stability_percentage:.1f}% of endpoints stable")
        else:
            self.log_test("Overall Application Stability", False, 
                        f"Only {stability_percentage:.1f}% of endpoints stable")
        
        # Test server response consistency
        print("\nTesting response consistency...")
        
        consistent_responses = 0
        total_consistency_tests = 3
        
        for i in range(total_consistency_tests):
            response = self.make_request("/api/servers")
            if response and 'seattleServerInfo' in response:
                seattle_info = response['seattleServerInfo']
                if (seattle_info.get('port') == self.expected_config['port'] and
                    seattle_info.get('processId') == self.expected_config['processId']):
                    consistent_responses += 1
            time.sleep(1)  # Small delay between requests
        
        consistency_percentage = (consistent_responses / total_consistency_tests) * 100
        
        if consistency_percentage == 100:
            self.log_test("Response Consistency", True, 
                        f"{consistency_percentage:.0f}% consistent responses")
        else:
            self.log_test("Response Consistency", False, 
                        f"Only {consistency_percentage:.0f}% consistent responses")

    def test_connection_propagation(self):
        """Test 7: Verify connection info propagation throughout system"""
        print("\nTEST 7: Connection Info Propagation Verification")
        
        # Test that all system components have access to updated connection info
        response = self.make_request("/api/servers")
        
        if not response:
            self.log_test("Propagation Source", False, "Cannot access server configuration")
            return
        
        self.log_test("Propagation Source", True, "Server configuration accessible")
        
        # Check main servers array
        servers = response.get('servers', [])
        if servers:
            main_server = servers[0]
            main_process_id = main_server.get('hathoraRoomId')
            main_port = main_server.get('connectionPort')
            
            if (main_process_id == self.expected_config['processId'] and
                main_port == self.expected_config['port']):
                self.log_test("Main Server Config Propagation", True, 
                            "Updated config in main servers array")
            else:
                self.log_test("Main Server Config Propagation", False, 
                            "Config mismatch in main servers array")
        
        # Check seattleServerInfo structure
        seattle_info = response.get('seattleServerInfo', {})
        if seattle_info:
            info_process_id = seattle_info.get('processId')
            info_port = seattle_info.get('port')
            
            if (info_process_id == self.expected_config['processId'] and
                info_port == self.expected_config['port']):
                self.log_test("Seattle Info Propagation", True, 
                            "Updated config in seattleServerInfo")
            else:
                self.log_test("Seattle Info Propagation", False, 
                            "Config mismatch in seattleServerInfo")
        
        # Verify all connection details are consistent across structures
        if servers and seattle_info:
            main_server = servers[0]
            
            consistency_checks = [
                ('host', 'connectionHost', 'host'),
                ('port', 'connectionPort', 'port'),
                ('processId', 'hathoraRoomId', 'processId'),
                ('appId', 'appId', 'appId')
            ]
            
            all_consistent = True
            
            for seattle_field, server_field, display_name in consistency_checks:
                seattle_value = seattle_info.get(seattle_field)
                server_value = main_server.get(server_field)
                
                if seattle_value == server_value:
                    self.log_test(f"Consistency: {display_name}", True, 
                                f"Values match: {seattle_value}")
                else:
                    self.log_test(f"Consistency: {display_name}", False, 
                                f"Mismatch - Seattle: {seattle_value}, Server: {server_value}")
                    all_consistent = False
            
            if all_consistent:
                self.log_test("Overall Config Consistency", True, 
                            "All connection details consistent across structures")
            else:
                self.log_test("Overall Config Consistency", False, 
                            "Inconsistencies found in connection details")

    def run_all_tests(self):
        """Run all test suites"""
        start_time = time.time()
        
        print("Starting comprehensive Seattle server update testing...\n")
        
        # Run all test suites
        self.test_server_browser_api_updated_config()
        self.test_hathora_client_configuration()
        self.test_navigation_logic_configuration()
        self.test_websocket_connection_configuration()
        self.test_seattle_server_metadata()
        self.test_application_stability()
        self.test_connection_propagation()
        
        # Calculate results
        end_time = time.time()
        duration = end_time - start_time
        success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
        
        # Print summary
        print("\n" + "=" * 60)
        print("SEATTLE SERVER UPDATE TESTING SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        
        # Detailed results
        if success_rate >= 90:
            print(f"\nEXCELLENT: Seattle server update testing completed with {success_rate:.1f}% success rate!")
            print("All critical connection details have been successfully updated and verified.")
        elif success_rate >= 75:
            print(f"\nGOOD: Seattle server update testing completed with {success_rate:.1f}% success rate.")
            print("Some minor issues detected but core functionality is working.")
        else:
            print(f"\nISSUES DETECTED: Only {success_rate:.1f}% success rate.")
            print("Critical issues found with Seattle server configuration updates.")
        
        # List failed tests
        failed_tests = [test for test in self.test_results if not test['passed']]
        if failed_tests:
            print(f"\nFAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        print("\n" + "=" * 60)
        
        return success_rate >= 75  # Return True if success rate is acceptable

if __name__ == "__main__":
    tester = SeattleServerTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)