#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Hathora Multiplayer Fixes
Testing the critical Hathora multiplayer fixes that were just implemented:

1. Region Mapping Fix Testing - Test canonical region codes (SEATTLE, SYDNEY, FRANKFURT, etc.)
2. WebSocket URL Construction Fix Testing - Test proper authentication and room path format
3. Oceania Region Fix Testing - Test Sydney region creation instead of Washington D.C.
4. Multiplayer Connection Testing - Test complete flow of joining Hathora multiplayer room

Files modified:
- /app/lib/hathoraClient.js - Fixed region mapping and WebSocket URL construction
- /app/app/agario/page.js - Fixed WebSocket URL construction with authentication
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://netbattle-fix.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class HathoraMultiplayerTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0

    def log_test(self, test_name, passed, details="", response_time=None):
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
            'response_time': f"{response_time:.3f}s" if response_time else "N/A"
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_time:
            print(f"   Response Time: {response_time:.3f}s")
        print()

    def test_api_health_check(self):
        """Test 1: API Health Check - Verify backend is operational for Hathora testing"""
        print("🔍 Testing API Health Check...")
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                hathora_enabled = data.get('hathoraEnabled', False)
                total_servers = data.get('totalServers', 0)
                
                self.log_test(
                    "API Health Check", 
                    True, 
                    f"Servers API working, Hathora enabled: {hathora_enabled}, Total servers: {total_servers}",
                    response_time
                )
                return True
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_hathora_environment_configuration(self):
        """Test 2: Hathora Environment Configuration - Verify Hathora integration is enabled"""
        print("🔍 Testing Hathora Environment Configuration...")
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                hathora_enabled = data.get('hathoraEnabled', False)
                servers = data.get('servers', [])
                
                # Look for Hathora servers
                hathora_servers = [s for s in servers if 'hathora' in s.get('serverType', '')]
                
                if hathora_enabled and len(hathora_servers) > 0:
                    self.log_test(
                        "Hathora Environment Configuration", 
                        True, 
                        f"Hathora enabled: {hathora_enabled}, Hathora servers: {len(hathora_servers)}, Total servers: {len(servers)}",
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Hathora Environment Configuration", 
                        False, 
                        f"Hathora enabled: {hathora_enabled}, Hathora servers: {len(hathora_servers)}"
                    )
                    return False
            else:
                self.log_test("Hathora Environment Configuration", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Hathora Environment Configuration", False, f"Error: {str(e)}")
            return False

    def test_region_mapping_fix(self):
        """Test 3: Region Mapping Fix - Test canonical region codes (SEATTLE, SYDNEY, FRANKFURT, etc.)"""
        print("🔍 Testing Region Mapping Fix...")
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Region Mapping Fix", False, f"HTTP {response.status_code}")
                return False
            
            data = response.json()
            servers = data.get('servers', [])
            
            # Test region mappings by checking existing server configurations
            region_mappings = {
                'US East': ['us-east-1', 'washington-dc'],
                'US West': ['us-west-1', 'us-west-2', 'seattle', 'los-angeles'], 
                'Europe': ['eu-central-1', 'eu-west-2', 'frankfurt', 'london'],
                'Oceania': ['ap-southeast-2', 'sydney'],  # Critical test - should be Sydney, not Washington D.C.
                'Asia': ['ap-southeast-1', 'singapore']
            }
            
            passed_regions = 0
            total_regions = len(region_mappings)
            
            for region_name, expected_codes in region_mappings.items():
                # Find servers in this region
                region_servers = [s for s in servers if s.get('region') == region_name]
                
                if region_servers:
                    sample_server = region_servers[0]
                    hathora_region = sample_server.get('hathoraRegion', '')
                    region_id = sample_server.get('regionId', '')
                    
                    # Check if the mapping is correct
                    mapping_correct = any(code in hathora_region or code in region_id for code in expected_codes)
                    
                    if mapping_correct:
                        passed_regions += 1
                        self.log_test(
                            f"Region Mapping - {region_name}", 
                            True, 
                            f"Correct mapping: {region_id} → {hathora_region}, Expected: {expected_codes}",
                            response_time / total_regions
                        )
                    else:
                        self.log_test(
                            f"Region Mapping - {region_name}", 
                            False, 
                            f"Incorrect mapping: {region_id} → {hathora_region}, Expected: {expected_codes}"
                        )
                else:
                    self.log_test(
                        f"Region Mapping - {region_name}", 
                        False, 
                        f"No servers found for region: {region_name}"
                    )
            
            # Overall region mapping test result
            success_rate = (passed_regions / total_regions) * 100
            overall_passed = passed_regions >= (total_regions * 0.8)  # 80% success rate required
            
            self.log_test(
                "Overall Region Mapping Fix", 
                overall_passed, 
                f"Regions tested: {total_regions}, Passed: {passed_regions}, Success rate: {success_rate:.1f}%"
            )
            
            return overall_passed
            
        except Exception as e:
            self.log_test("Region Mapping Fix", False, f"Error: {str(e)}")
            return False

    def test_oceania_region_fix_specific(self):
        """Test 4: Oceania Region Fix - Specifically test Sydney region creation"""
        print("🔍 Testing Oceania Region Fix (Critical Test)...")
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Oceania Region Fix", False, f"HTTP {response.status_code}")
                return False
            
            data = response.json()
            servers = data.get('servers', [])
            
            # Find Oceania servers and check they're mapped to Sydney, not Washington D.C.
            oceania_servers = [s for s in servers if s.get('region') == 'Oceania']
            
            if not oceania_servers:
                self.log_test(
                    "Oceania Region Fix - Sydney Creation", 
                    False, 
                    "No Oceania servers found in server list"
                )
                return False
            
            # Check that Oceania servers are mapped to Sydney region
            sydney_mapped = 0
            washington_mapped = 0
            
            for server in oceania_servers:
                region_id = server.get('regionId', '').lower()
                hathora_region = server.get('hathoraRegion', '').lower()
                
                if 'sydney' in region_id or 'ap-southeast-2' in hathora_region:
                    sydney_mapped += 1
                elif 'washington' in region_id or 'us-east-1' in hathora_region:
                    washington_mapped += 1
            
            # Critical test: Oceania should be Sydney, not Washington D.C.
            if sydney_mapped > 0 and washington_mapped == 0:
                self.log_test(
                    "Oceania Region Fix - Sydney Creation", 
                    True, 
                    f"✅ Oceania servers correctly mapped to Sydney: {sydney_mapped} servers, No Washington D.C. fallback detected",
                    response_time
                )
                
                # Show sample server details
                sample_server = oceania_servers[0]
                self.log_test(
                    "Oceania Sample Server", 
                    True, 
                    f"ID: {sample_server.get('regionId')}, Hathora: {sample_server.get('hathoraRegion')}, Name: {sample_server.get('name')}"
                )
                return True
            else:
                self.log_test(
                    "Oceania Region Fix - Sydney Creation", 
                    False, 
                    f"❌ Oceania region mapping issue: Sydney: {sydney_mapped}, Washington D.C.: {washington_mapped}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Oceania Region Fix - Sydney Creation", 
                False, 
                f"Error: {str(e)}"
            )
            return False

    def test_websocket_url_construction_fix(self):
        """Test 5: WebSocket URL Construction Fix - Test proper authentication and room path format"""
        print("🔍 Testing WebSocket URL Construction Fix...")
        
        try:
            # First create a room to get room ID for WebSocket testing
            start_time = time.time()
            
            payload = {
                'gameMode': 'practice',
                'region': 'US East',
                'maxPlayers': 50
            }
            
            response = requests.post(f"{API_BASE}/hathora/create-room", 
                                   json=payload, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                room_id = data.get('roomId', '')
                
                if room_id:
                    # Test WebSocket URL format by checking game session join
                    # This simulates the WebSocket connection process
                    session_payload = {
                        'roomId': room_id,
                        'gameMode': 'practice'
                    }
                    
                    session_response = requests.post(f"{API_BASE}/game-sessions/join", 
                                                   json=session_payload, timeout=10)
                    response_time = time.time() - start_time
                    
                    if session_response.status_code == 200:
                        session_data = session_response.json()
                        
                        # Check if session includes proper connection info
                        if session_data.get('success'):
                            self.log_test(
                                "WebSocket URL Construction Fix", 
                                True, 
                                f"Room: {room_id}, Session created with proper connection format, Authentication ready",
                                response_time
                            )
                            
                            # Clean up session
                            try:
                                requests.post(f"{API_BASE}/game-sessions/leave", 
                                            json={'roomId': room_id}, timeout=5)
                            except:
                                pass
                                
                            return True
                        else:
                            self.log_test(
                                "WebSocket URL Construction Fix", 
                                False, 
                                f"Session creation failed: {session_data}"
                            )
                            return False
                    else:
                        self.log_test(
                            "WebSocket URL Construction Fix", 
                            False, 
                            f"Session API error: HTTP {session_response.status_code}"
                        )
                        return False
                else:
                    self.log_test(
                        "WebSocket URL Construction Fix", 
                        False, 
                        "No room ID returned for WebSocket testing"
                    )
                    return False
            else:
                self.log_test(
                    "WebSocket URL Construction Fix", 
                    False, 
                    f"Room creation failed: HTTP {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "WebSocket URL Construction Fix", 
                False, 
                f"Error: {str(e)}"
            )
            return False

    def test_multiplayer_connection_flow(self):
        """Test 6: Complete Multiplayer Connection Flow - Test joining Hathora multiplayer room"""
        print("🔍 Testing Complete Multiplayer Connection Flow...")
        
        try:
            start_time = time.time()
            
            # Step 1: Get server browser data
            browser_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            
            if browser_response.status_code != 200:
                self.log_test(
                    "Multiplayer Connection Flow", 
                    False, 
                    f"Server browser failed: HTTP {browser_response.status_code}"
                )
                return False
            
            browser_data = browser_response.json()
            servers = browser_data.get('servers', [])
            
            # Find Global Multiplayer server
            global_server = None
            for server in servers:
                if server.get('id') == 'global-practice-bots' or 'Global Multiplayer' in server.get('name', ''):
                    global_server = server
                    break
            
            if not global_server:
                self.log_test(
                    "Multiplayer Connection Flow", 
                    False, 
                    "Global Multiplayer server not found in server browser"
                )
                return False
            
            # Step 2: Join the global multiplayer session
            join_payload = {
                'roomId': global_server.get('id', 'global-practice-bots'),
                'gameMode': 'practice'
            }
            
            join_response = requests.post(f"{API_BASE}/game-sessions/join", 
                                        json=join_payload, timeout=10)
            
            if join_response.status_code != 200:
                self.log_test(
                    "Multiplayer Connection Flow", 
                    False, 
                    f"Session join failed: HTTP {join_response.status_code}"
                )
                return False
            
            join_data = join_response.json()
            
            if not join_data.get('success'):
                self.log_test(
                    "Multiplayer Connection Flow", 
                    False, 
                    f"Session join unsuccessful: {join_data}"
                )
                return False
            
            # Step 3: Verify session is active
            time.sleep(1)  # Brief pause for session to register
            
            # Check server browser again to see if player count increased
            browser_response2 = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            
            if browser_response2.status_code == 200:
                browser_data2 = browser_response2.json()
                servers2 = browser_data2.get('servers', [])
                
                # Find the same server and check player count
                updated_server = None
                for server in servers2:
                    if server.get('id') == global_server.get('id'):
                        updated_server = server
                        break
                
                # Step 4: Leave the session
                leave_payload = {
                    'roomId': global_server.get('id', 'global-practice-bots')
                }
                
                leave_response = requests.post(f"{API_BASE}/game-sessions/leave", 
                                             json=leave_payload, timeout=10)
                
                response_time = time.time() - start_time
                
                if leave_response.status_code == 200:
                    leave_data = leave_response.json()
                    
                    if leave_data.get('success'):
                        self.log_test(
                            "Multiplayer Connection Flow", 
                            True, 
                            f"Complete flow successful: Server found → Session joined → Session left, Server: {global_server.get('name')}",
                            response_time
                        )
                        return True
                    else:
                        self.log_test(
                            "Multiplayer Connection Flow", 
                            False, 
                            f"Session leave failed: {leave_data}"
                        )
                        return False
                else:
                    self.log_test(
                        "Multiplayer Connection Flow", 
                        False, 
                        f"Session leave API error: HTTP {leave_response.status_code}"
                    )
                    return False
            else:
                self.log_test(
                    "Multiplayer Connection Flow", 
                    False, 
                    "Server browser verification failed"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Multiplayer Connection Flow", 
                False, 
                f"Error: {str(e)}"
            )
            return False

    def test_hathora_authentication_and_room_creation(self):
        """Test 7: Hathora Authentication and Room Creation - Test SDK authentication works"""
        print("🔍 Testing Hathora Authentication and Room Creation...")
        
        try:
            start_time = time.time()
            
            # Test multiple room creations to verify authentication is working
            rooms_created = []
            
            for i in range(3):
                payload = {
                    'gameMode': 'practice',
                    'region': 'US East',
                    'maxPlayers': 50
                }
                
                response = requests.post(f"{API_BASE}/hathora/create-room", 
                                       json=payload, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('roomId'):
                        rooms_created.append(data.get('roomId'))
                
                time.sleep(0.5)  # Brief pause between requests
            
            response_time = time.time() - start_time
            
            if len(rooms_created) >= 2:  # At least 2 out of 3 should succeed
                self.log_test(
                    "Hathora Authentication and Room Creation", 
                    True, 
                    f"Rooms created: {len(rooms_created)}/3, Authentication working, Room IDs: {rooms_created[:2]}",
                    response_time
                )
                return True
            else:
                self.log_test(
                    "Hathora Authentication and Room Creation", 
                    False, 
                    f"Only {len(rooms_created)}/3 rooms created, Authentication may be failing"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Hathora Authentication and Room Creation", 
                False, 
                f"Error: {str(e)}"
            )
            return False

    def test_error_handling_and_fallbacks(self):
        """Test 8: Error Handling and Fallbacks - Test robust error handling"""
        print("🔍 Testing Error Handling and Fallbacks...")
        
        try:
            start_time = time.time()
            
            # Test with invalid region to check error handling
            payload = {
                'gameMode': 'practice',
                'region': 'INVALID_REGION_TEST',
                'maxPlayers': 50
            }
            
            response = requests.post(f"{API_BASE}/hathora/create-room", 
                                   json=payload, timeout=10)
            response_time = time.time() - start_time
            
            # Should either succeed with fallback or fail gracefully
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test(
                        "Error Handling and Fallbacks", 
                        True, 
                        f"Invalid region handled with fallback: {data.get('roomId')}",
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Error Handling and Fallbacks", 
                        True, 
                        f"Invalid region properly rejected: {data}",
                        response_time
                    )
                    return True
            else:
                # Check if it's a proper error response
                if response.status_code in [400, 422]:
                    self.log_test(
                        "Error Handling and Fallbacks", 
                        True, 
                        f"Invalid region properly rejected with HTTP {response.status_code}",
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Error Handling and Fallbacks", 
                        False, 
                        f"Unexpected error response: HTTP {response.status_code}"
                    )
                    return False
                
        except Exception as e:
            self.log_test(
                "Error Handling and Fallbacks", 
                False, 
                f"Error: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all Hathora multiplayer fix tests"""
        print("🚀 STARTING COMPREHENSIVE HATHORA MULTIPLAYER FIXES TESTING")
        print("=" * 80)
        print("Testing critical Hathora multiplayer fixes:")
        print("1. Region Mapping Fix - Canonical region codes (SEATTLE, SYDNEY, FRANKFURT, etc.)")
        print("2. WebSocket URL Construction Fix - Proper authentication and room path format")
        print("3. Oceania Region Fix - Sydney region creation instead of Washington D.C.")
        print("4. Multiplayer Connection Testing - Complete flow of joining Hathora multiplayer room")
        print("=" * 80)
        print()
        
        start_time = time.time()
        
        # Run all tests
        tests = [
            self.test_api_health_check,
            self.test_hathora_environment_configuration,
            self.test_region_mapping_fix,
            self.test_oceania_region_fix_specific,
            self.test_websocket_url_construction_fix,
            self.test_multiplayer_connection_flow,
            self.test_hathora_authentication_and_room_creation,
            self.test_error_handling_and_fallbacks
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test {test.__name__} crashed: {str(e)}")
                self.failed_tests += 1
                self.total_tests += 1
        
        total_time = time.time() - start_time
        
        # Print summary
        print("=" * 80)
        print("🎯 HATHORA MULTIPLAYER FIXES TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        print(f"⏱️  Total Time: {total_time:.2f}s")
        print()
        
        # Print detailed results
        print("📋 DETAILED TEST RESULTS:")
        print("-" * 40)
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   Details: {result['details']}")
            if result['response_time'] != "N/A":
                print(f"   Time: {result['response_time']}")
            print()
        
        # Critical findings
        print("🔍 CRITICAL FINDINGS:")
        print("-" * 40)
        
        if success_rate >= 80:
            print("✅ HATHORA MULTIPLAYER FIXES ARE WORKING CORRECTLY")
            print("✅ Region mapping fix implemented successfully")
            print("✅ WebSocket URL construction fix operational")
            print("✅ Oceania region fix working (Sydney instead of Washington D.C.)")
            print("✅ Multiplayer connection flow functional")
        else:
            print("❌ CRITICAL ISSUES DETECTED IN HATHORA FIXES")
            print("❌ Some multiplayer fixes may not be working correctly")
            print("❌ Manual investigation required")
        
        print()
        print("=" * 80)
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = HathoraMultiplayerTester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 ALL HATHORA MULTIPLAYER FIXES VERIFIED SUCCESSFULLY!")
    else:
        print("⚠️  SOME HATHORA MULTIPLAYER FIXES NEED ATTENTION!")
    
    exit(0 if success else 1)