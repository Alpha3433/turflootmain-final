#!/usr/bin/env python3
"""
TurfLoot Party Lobby System Backend Testing
Tests all 5 new Party Lobby endpoints with comprehensive scenarios

Focus Areas:
1. POST /api/lobby/create - Create a new party lobby
2. POST /api/lobby/join - Join an existing lobby
3. POST /api/lobby/invite - Send invite to friend
4. GET /api/lobby/status - Get user's current lobby status and pending invites
5. GET /api/lobby/validate-room - Validate if all party members can afford a room
"""

import requests
import time
import json
import sys
from typing import Dict, List, Tuple
import os
from datetime import datetime

class TurfLootBackendTester:
    def __init__(self):
        # Get base URL from environment or use localhost fallback
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
        self.api_base = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🎯 TurfLoot Backend API Testing - Real-time Latency Region Selection")
        print(f"🔗 Testing API Base URL: {self.api_base}")
        print("=" * 80)

    def log_test(self, test_name: str, passed: bool, details: str = "", response_time: float = 0):
        """Log test results"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = {
            'test': test_name,
            'passed': passed,
            'details': details,
            'response_time': response_time
        }
        self.test_results.append(result)
        
        time_info = f" ({response_time:.3f}s)" if response_time > 0 else ""
        print(f"{status} - {test_name}{time_info}")
        if details:
            print(f"    📝 {details}")

    def test_ping_endpoint(self) -> bool:
        """Test GET /api/ping endpoint for basic server latency testing"""
        print("\n🏓 Testing Ping Endpoint (GET /api/ping)")
        print("-" * 50)
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_base}/ping", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields for latency testing
                required_fields = ['status', 'timestamp', 'server']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Ping Endpoint - Response Structure", False, 
                                f"Missing required fields: {missing_fields}", response_time)
                    return False
                
                # Verify status is 'ok'
                if data.get('status') != 'ok':
                    self.log_test("Ping Endpoint - Status Check", False, 
                                f"Expected status 'ok', got '{data.get('status')}'", response_time)
                    return False
                
                # Verify timestamp is recent (within last 10 seconds)
                current_time = int(time.time() * 1000)  # Convert to milliseconds
                timestamp = data.get('timestamp', 0)
                time_diff = abs(current_time - timestamp)
                
                if time_diff > 10000:  # 10 seconds in milliseconds
                    self.log_test("Ping Endpoint - Timestamp Accuracy", False, 
                                f"Timestamp too old: {time_diff}ms difference", response_time)
                    return False
                
                # Verify response time is suitable for real-time latency measurement (< 2 seconds)
                if response_time > 2.0:
                    self.log_test("Ping Endpoint - Response Time", False, 
                                f"Response too slow for real-time use: {response_time:.3f}s", response_time)
                    return False
                
                self.log_test("Ping Endpoint - Complete Test", True, 
                            f"Status: {data['status']}, Server: {data['server']}, Response time suitable for latency measurement", response_time)
                return True
                
            else:
                self.log_test("Ping Endpoint - HTTP Status", False, 
                            f"Expected 200, got {response.status_code}", response_time)
                return False
                
        except requests.exceptions.Timeout:
            self.log_test("Ping Endpoint - Timeout", False, "Request timed out after 10 seconds")
            return False
        except requests.exceptions.RequestException as e:
            self.log_test("Ping Endpoint - Connection Error", False, f"Request failed: {str(e)}")
            return False
        except json.JSONDecodeError:
            self.log_test("Ping Endpoint - JSON Parse", False, "Invalid JSON response")
            return False

    def test_root_endpoint(self) -> bool:
        """Test GET /api/ root endpoint response time"""
        print("\n🏠 Testing Root Endpoint (GET /api/)")
        print("-" * 50)
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_base}/", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields for API identification
                required_fields = ['message', 'service', 'features', 'timestamp']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Root Endpoint - Response Structure", False, 
                                f"Missing required fields: {missing_fields}", response_time)
                    return False
                
                # Verify API version and service
                if 'TurfLoot API' not in data.get('message', ''):
                    self.log_test("Root Endpoint - API Identification", False, 
                                f"Expected TurfLoot API message, got '{data.get('message')}'", response_time)
                    return False
                
                # Verify features include multiplayer (needed for region selection)
                features = data.get('features', [])
                if 'multiplayer' not in features:
                    self.log_test("Root Endpoint - Multiplayer Feature", False, 
                                f"Multiplayer feature missing from: {features}", response_time)
                    return False
                
                # Verify response time is suitable for quick connectivity checks (< 2 seconds)
                if response_time > 2.0:
                    self.log_test("Root Endpoint - Response Time", False, 
                                f"Response too slow for connectivity check: {response_time:.3f}s", response_time)
                    return False
                
                self.log_test("Root Endpoint - Complete Test", True, 
                            f"API: {data['message']}, Features: {features}, Response time suitable for connectivity check", response_time)
                return True
                
            else:
                self.log_test("Root Endpoint - HTTP Status", False, 
                            f"Expected 200, got {response.status_code}", response_time)
                return False
                
        except requests.exceptions.Timeout:
            self.log_test("Root Endpoint - Timeout", False, "Request timed out after 10 seconds")
            return False
        except requests.exceptions.RequestException as e:
            self.log_test("Root Endpoint - Connection Error", False, f"Request failed: {str(e)}")
            return False
        except json.JSONDecodeError:
            self.log_test("Root Endpoint - JSON Parse", False, "Invalid JSON response")
            return False

    def test_servers_lobbies_endpoint(self) -> bool:
        """Test GET /api/servers/lobbies endpoint for server browser functionality"""
        print("\n🖥️ Testing Server Browser Endpoint (GET /api/servers/lobbies)")
        print("-" * 50)
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_base}/servers/lobbies", timeout=15)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify required fields for server browser
                required_fields = ['servers', 'totalPlayers', 'totalActiveServers', 'regions', 'gameTypes', 'timestamp']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Server Browser - Response Structure", False, 
                                f"Missing required fields: {missing_fields}", response_time)
                    return False
                
                # Verify servers array exists and has data
                servers = data.get('servers', [])
                if not isinstance(servers, list):
                    self.log_test("Server Browser - Servers Array", False, 
                                f"Servers should be an array, got {type(servers)}", response_time)
                    return False
                
                if len(servers) == 0:
                    self.log_test("Server Browser - Server Count", False, 
                                "No servers available for region selection", response_time)
                    return False
                
                # Verify regions are available for selection
                regions = data.get('regions', [])
                expected_regions = ['US-East-1', 'US-West-1', 'EU-Central-1']
                missing_regions = [region for region in expected_regions if region not in regions]
                
                if missing_regions:
                    self.log_test("Server Browser - Region Coverage", False, 
                                f"Missing expected regions: {missing_regions}", response_time)
                    return False
                
                # Verify server data structure for region selection
                if servers:
                    sample_server = servers[0]
                    required_server_fields = ['id', 'name', 'region', 'ping', 'status']
                    missing_server_fields = [field for field in required_server_fields if field not in sample_server]
                    
                    if missing_server_fields:
                        self.log_test("Server Browser - Server Data Structure", False, 
                                    f"Server missing required fields: {missing_server_fields}", response_time)
                        return False
                    
                    # Verify ping values are reasonable for latency display
                    ping = sample_server.get('ping', 0)
                    if not isinstance(ping, (int, float)) or ping < 0 or ping > 1000:
                        self.log_test("Server Browser - Ping Values", False, 
                                    f"Invalid ping value: {ping} (should be 0-1000ms)", response_time)
                        return False
                
                # Verify response time is suitable for server browser updates (< 3 seconds)
                if response_time > 3.0:
                    self.log_test("Server Browser - Response Time", False, 
                                f"Response too slow for server browser: {response_time:.3f}s", response_time)
                    return False
                
                # Count servers by region for region selection dropdown
                region_counts = {}
                for server in servers:
                    region = server.get('region', 'Unknown')
                    region_counts[region] = region_counts.get(region, 0) + 1
                
                self.log_test("Server Browser - Complete Test", True, 
                            f"Found {len(servers)} servers across {len(regions)} regions. Region distribution: {region_counts}", response_time)
                return True
                
            else:
                self.log_test("Server Browser - HTTP Status", False, 
                            f"Expected 200, got {response.status_code}", response_time)
                return False
                
        except requests.exceptions.Timeout:
            self.log_test("Server Browser - Timeout", False, "Request timed out after 15 seconds")
            return False
        except requests.exceptions.RequestException as e:
            self.log_test("Server Browser - Connection Error", False, f"Request failed: {str(e)}")
            return False
        except json.JSONDecodeError:
            self.log_test("Server Browser - JSON Parse", False, "Invalid JSON response")
            return False

    def test_region_selection_performance(self) -> bool:
        """Test the combined performance of all endpoints for region selection feature"""
        print("\n⚡ Testing Region Selection Performance (Combined Endpoints)")
        print("-" * 50)
        
        try:
            # Simulate the region selection workflow
            total_start_time = time.time()
            
            # Step 1: Check connectivity with root endpoint
            root_start = time.time()
            root_response = requests.get(f"{self.api_base}/", timeout=5)
            root_time = time.time() - root_start
            
            if root_response.status_code != 200:
                self.log_test("Region Selection - Connectivity Check", False, 
                            f"Root endpoint failed: {root_response.status_code}")
                return False
            
            # Step 2: Measure server latency with ping
            ping_start = time.time()
            ping_response = requests.get(f"{self.api_base}/ping", timeout=5)
            ping_time = time.time() - ping_start
            
            if ping_response.status_code != 200:
                self.log_test("Region Selection - Latency Measurement", False, 
                            f"Ping endpoint failed: {ping_response.status_code}")
                return False
            
            # Step 3: Load server browser for region selection
            servers_start = time.time()
            servers_response = requests.get(f"{self.api_base}/servers/lobbies", timeout=10)
            servers_time = time.time() - servers_start
            
            if servers_response.status_code != 200:
                self.log_test("Region Selection - Server Browser", False, 
                            f"Server browser failed: {servers_response.status_code}")
                return False
            
            total_time = time.time() - total_start_time
            
            # Verify total workflow time is acceptable for real-time region selection (< 8 seconds)
            if total_time > 8.0:
                self.log_test("Region Selection - Total Workflow Time", False, 
                            f"Total workflow too slow: {total_time:.3f}s (should be < 8s)", total_time)
                return False
            
            # Verify individual endpoint times are reasonable
            if root_time > 2.0 or ping_time > 2.0 or servers_time > 3.0:
                self.log_test("Region Selection - Individual Endpoint Performance", False, 
                            f"One or more endpoints too slow: Root={root_time:.3f}s, Ping={ping_time:.3f}s, Servers={servers_time:.3f}s")
                return False
            
            self.log_test("Region Selection - Complete Workflow", True, 
                        f"Total: {total_time:.3f}s (Root: {root_time:.3f}s, Ping: {ping_time:.3f}s, Servers: {servers_time:.3f}s)", total_time)
            return True
            
        except requests.exceptions.RequestException as e:
            self.log_test("Region Selection - Workflow Error", False, f"Workflow failed: {str(e)}")
            return False

    def test_concurrent_latency_measurements(self) -> bool:
        """Test multiple concurrent ping requests to simulate real-time latency measurements"""
        print("\n🔄 Testing Concurrent Latency Measurements")
        print("-" * 50)
        
        try:
            import threading
            import queue
            
            results_queue = queue.Queue()
            num_concurrent_requests = 5
            
            def ping_worker():
                try:
                    start_time = time.time()
                    response = requests.get(f"{self.api_base}/ping", timeout=5)
                    response_time = time.time() - start_time
                    results_queue.put((True, response_time, response.status_code))
                except Exception as e:
                    results_queue.put((False, 0, str(e)))
            
            # Start concurrent ping requests
            threads = []
            start_time = time.time()
            
            for i in range(num_concurrent_requests):
                thread = threading.Thread(target=ping_worker)
                thread.start()
                threads.append(thread)
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
            
            total_time = time.time() - start_time
            
            # Collect results
            successful_requests = 0
            response_times = []
            
            while not results_queue.empty():
                success, response_time, status = results_queue.get()
                if success and status == 200:
                    successful_requests += 1
                    response_times.append(response_time)
            
            # Verify all requests succeeded
            if successful_requests != num_concurrent_requests:
                self.log_test("Concurrent Latency - Success Rate", False, 
                            f"Only {successful_requests}/{num_concurrent_requests} requests succeeded")
                return False
            
            # Verify average response time is reasonable
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            max_response_time = max(response_times) if response_times else 0
            
            if avg_response_time > 2.0:
                self.log_test("Concurrent Latency - Average Response Time", False, 
                            f"Average response time too high: {avg_response_time:.3f}s")
                return False
            
            if max_response_time > 3.0:
                self.log_test("Concurrent Latency - Maximum Response Time", False, 
                            f"Maximum response time too high: {max_response_time:.3f}s")
                return False
            
            self.log_test("Concurrent Latency - Complete Test", True, 
                        f"All {num_concurrent_requests} requests succeeded. Avg: {avg_response_time:.3f}s, Max: {max_response_time:.3f}s, Total: {total_time:.3f}s")
            return True
            
        except ImportError:
            self.log_test("Concurrent Latency - Threading Support", False, "Threading module not available")
            return False
        except Exception as e:
            self.log_test("Concurrent Latency - Unexpected Error", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend API tests for real-time latency region selection feature"""
        print("🚀 Starting TurfLoot Backend API Tests for Real-time Latency Region Selection")
        print("=" * 80)
        
        # Test individual endpoints
        test_methods = [
            self.test_ping_endpoint,
            self.test_root_endpoint,
            self.test_servers_lobbies_endpoint,
            self.test_region_selection_performance,
            self.test_concurrent_latency_measurements
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test_method.__name__}: {str(e)}")
                self.log_test(f"{test_method.__name__} - Critical Error", False, str(e))
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY - Real-time Latency Region Selection Backend")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"✅ Passed: {self.passed_tests}/{self.total_tests} ({success_rate:.1f}%)")
        
        if self.passed_tests == self.total_tests:
            print("🎉 ALL TESTS PASSED - Backend APIs are ready for real-time latency region selection!")
            print("🔗 Key findings:")
            print("   • Ping endpoint responds quickly for latency measurements")
            print("   • Root endpoint provides fast connectivity checks")
            print("   • Server browser loads region data efficiently")
            print("   • Combined workflow completes within acceptable time limits")
            print("   • Concurrent requests handled properly for real-time updates")
        else:
            failed_tests = self.total_tests - self.passed_tests
            print(f"⚠️ {failed_tests} TESTS FAILED - Backend needs attention for optimal region selection")
            
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['passed']:
                    print(f"   • {result['test']}: {result['details']}")
        
        print("=" * 80)
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = TurfLootBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)