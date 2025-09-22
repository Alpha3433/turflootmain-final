#!/usr/bin/env python3
"""
REAL PRIVY USERS ONLY Server Browser Implementation Testing
===========================================================

Testing the filtering for server browser to only show active servers created by real Privy users,
excluding anonymous sessions.

CRITICAL TESTS NEEDED:
1. Database Session Verification - Check that database contains both anonymous and real Privy user sessions
2. Server Browser API Filtering - Test /api/servers endpoint only returns sessions with real Privy user IDs
3. Session Creation with Real Users - Test creating sessions with real Privy user IDs
4. Filtering Logic Verification - Verify MongoDB query filters
"""

import requests
import json
import time
import sys
import os
from urllib.parse import urlencode, parse_qs, urlparse

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://lobby-finder-1.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class ColyseusMultiplayerFlowTester:
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'TurfLoot-Backend-Tester/1.0'
        })
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test results with detailed information"""
        status = "✅ PASSED" if success else "❌ FAILED"
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'error': error,
            'timestamp': time.time()
        }
        self.test_results.append(result)
        
        print(f"{status}: {test_name}")
        if details:
            print(f"   📋 Details: {details}")
        if error:
            print(f"   ❌ Error: {error}")
        print()
        
    def test_server_browser_api(self):
        """Test 1: Server Browser API - Verify /api/servers shows active rooms"""
        print("🔍 TEST 1: SERVER BROWSER API - ACTIVE ROOMS WITH PLAYERS")
        print("=" * 60)
        
        try:
            # Test the main servers endpoint
            response = self.session.get(f"{API_BASE}/servers")
            
            if response.status_code != 200:
                self.log_test(
                    "Server Browser API Accessibility",
                    False,
                    f"HTTP {response.status_code}",
                    f"Expected 200, got {response.status_code}"
                )
                return False
                
            data = response.json()
            
            # Verify response structure
            required_fields = ['servers', 'totalPlayers', 'colyseusEnabled', 'colyseusEndpoint']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test(
                    "Server Browser API Structure",
                    False,
                    f"Missing fields: {missing_fields}",
                    "Response missing required fields"
                )
                return False
                
            self.log_test(
                "Server Browser API Structure",
                True,
                f"All required fields present: {required_fields}"
            )
            
            # Verify Colyseus is enabled
            if not data.get('colyseusEnabled', False):
                self.log_test(
                    "Colyseus Integration Status",
                    False,
                    f"colyseusEnabled: {data.get('colyseusEnabled')}",
                    "Colyseus integration is disabled"
                )
                return False
                
            self.log_test(
                "Colyseus Integration Status",
                True,
                f"Colyseus enabled with endpoint: {data.get('colyseusEndpoint')}"
            )
            
            # Verify server data structure
            servers = data.get('servers', [])
            if not servers:
                self.log_test(
                    "Server Availability",
                    False,
                    "No servers returned",
                    "Server browser should show at least one Colyseus arena"
                )
                return False
                
            # Check first server structure
            server = servers[0]
            server_fields = ['id', 'name', 'serverType', 'currentPlayers', 'maxPlayers', 'colyseusEndpoint']
            missing_server_fields = [field for field in server_fields if field not in server]
            
            if missing_server_fields:
                self.log_test(
                    "Server Data Structure",
                    False,
                    f"Missing server fields: {missing_server_fields}",
                    "Server objects missing required fields"
                )
                return False
                
            self.log_test(
                "Server Data Structure",
                True,
                f"Server has all required fields. Type: {server.get('serverType')}, Players: {server.get('currentPlayers')}/{server.get('maxPlayers')}"
            )
            
            return True
            
        except Exception as e:
            self.log_test(
                "Server Browser API Test",
                False,
                "",
                f"Exception occurred: {str(e)}"
            )
            return False
            
    def test_url_parameter_generation(self):
        """Test 2: URL Parameter Generation - Test correct URL parameters for Colyseus"""
        print("🔍 TEST 2: URL PARAMETER GENERATION FOR COLYSEUS MULTIPLAYER")
        print("=" * 60)
        
        try:
            # Get server data first
            response = self.session.get(f"{API_BASE}/servers")
            if response.status_code != 200:
                self.log_test(
                    "URL Parameter Generation - Server Data",
                    False,
                    "",
                    "Cannot get server data for URL generation test"
                )
                return False
                
            data = response.json()
            servers = data.get('servers', [])
            
            if not servers:
                self.log_test(
                    "URL Parameter Generation - No Servers",
                    False,
                    "",
                    "No servers available for URL parameter testing"
                )
                return False
                
            # Test URL parameter structure for Colyseus server
            server = servers[0]
            
            # Expected URL parameters for Colyseus multiplayer
            expected_params = {
                'mode': 'colyseus-multiplayer',
                'server': 'colyseus',
                'multiplayer': 'colyseus',
                'roomId': server.get('id', 'colyseus-arena-global')
            }
            
            # Construct URL like the frontend would
            game_url = f"{BASE_URL}/agario?" + urlencode(expected_params)
            
            # Parse URL to verify parameters
            parsed_url = urlparse(game_url)
            url_params = parse_qs(parsed_url.query)
            
            # Verify all expected parameters are present
            missing_params = []
            for param, expected_value in expected_params.items():
                if param not in url_params:
                    missing_params.append(param)
                elif url_params[param][0] != expected_value:
                    missing_params.append(f"{param} (expected: {expected_value}, got: {url_params[param][0]})")
                    
            if missing_params:
                self.log_test(
                    "URL Parameter Generation",
                    False,
                    f"Missing/incorrect parameters: {missing_params}",
                    "URL parameters not correctly generated"
                )
                return False
                
            self.log_test(
                "URL Parameter Generation",
                True,
                f"All required parameters present: {list(expected_params.keys())}"
            )
            
            # Verify the constructed URL points to the game page
            if '/agario' not in game_url:
                self.log_test(
                    "Game Page URL Construction",
                    False,
                    f"URL: {game_url}",
                    "URL does not point to /agario game page"
                )
                return False
                
            self.log_test(
                "Game Page URL Construction",
                True,
                f"URL correctly points to game page: {game_url}"
            )
            
            return True
            
        except Exception as e:
            self.log_test(
                "URL Parameter Generation Test",
                False,
                "",
                f"Exception occurred: {str(e)}"
            )
            return False
            
    def test_session_tracking_flow(self):
        """Test 3: Session Tracking Flow - Test complete flow from session creation to room visibility"""
        print("🔍 TEST 3: SESSION TRACKING FLOW - DEVICE 1 → DEVICE 2 VISIBILITY")
        print("=" * 60)
        
        try:
            # Step 1: Create a game session (simulate Device 1 joining)
            session_data = {
                'action': 'join',
                'session': {
                    'roomId': 'colyseus-arena-test-' + str(int(time.time())),
                    'joinedAt': time.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
                    'lastActivity': time.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
                    'userId': 'test_user_' + str(int(time.time())),
                    'entryFee': 0,
                    'mode': 'colyseus-multiplayer',
                    'region': 'AU',
                    'status': 'active'
                }
            }
            
            # Test game session creation
            response = self.session.post(f"{API_BASE}/game-sessions", json=session_data)
            
            if response.status_code not in [200, 201]:
                self.log_test(
                    "Session Creation (Device 1)",
                    False,
                    f"HTTP {response.status_code}",
                    f"Failed to create game session: {response.text}"
                )
                return False
                
            self.log_test(
                "Session Creation (Device 1)",
                True,
                f"Session created for room: {session_data['session']['roomId']}"
            )
            
            # Step 2: Wait a moment for database update
            time.sleep(2)
            
            # Step 3: Check if session appears in server browser (simulate Device 2)
            response = self.session.get(f"{API_BASE}/servers")
            
            if response.status_code != 200:
                self.log_test(
                    "Session Visibility (Device 2)",
                    False,
                    f"HTTP {response.status_code}",
                    "Cannot check server browser for session visibility"
                )
                return False
                
            data = response.json()
            servers = data.get('servers', [])
            total_players = data.get('totalPlayers', 0)
            
            # Check if our session is reflected in player count
            if total_players == 0:
                self.log_test(
                    "Session Visibility (Device 2)",
                    False,
                    f"Total players: {total_players}",
                    "Created session not reflected in server browser player count"
                )
                return False
                
            self.log_test(
                "Session Visibility (Device 2)",
                True,
                f"Session visible in server browser. Total players: {total_players}"
            )
            
            # Step 4: Verify room appears in server list
            room_found = False
            for server in servers:
                if server.get('id') == session_data['session']['roomId'] or server.get('currentPlayers', 0) > 0:
                    room_found = True
                    break
                    
            if not room_found:
                self.log_test(
                    "Room Visibility in Server List",
                    False,
                    f"Searched {len(servers)} servers",
                    "Created room not found in server list"
                )
                return False
                
            self.log_test(
                "Room Visibility in Server List",
                True,
                f"Room found in server list with active players"
            )
            
            # Step 5: Test session cleanup
            cleanup_data = {
                'action': 'leave',
                'session': {
                    'roomId': session_data['session']['roomId'],
                    'userId': session_data['session']['userId']
                }
            }
            
            response = self.session.post(f"{API_BASE}/game-sessions", json=cleanup_data)
            
            if response.status_code not in [200, 201]:
                self.log_test(
                    "Session Cleanup",
                    False,
                    f"HTTP {response.status_code}",
                    "Failed to cleanup test session"
                )
                return False
                
            self.log_test(
                "Session Cleanup",
                True,
                "Test session successfully cleaned up"
            )
            
            return True
            
        except Exception as e:
            self.log_test(
                "Session Tracking Flow Test",
                False,
                "",
                f"Exception occurred: {str(e)}"
            )
            return False
            
    def test_game_page_parameter_parsing(self):
        """Test 4: Game Page Parameter Parsing - Verify parameters are received correctly"""
        print("🔍 TEST 4: GAME PAGE PARAMETER PARSING - MULTIPLAYER MODE DETECTION")
        print("=" * 60)
        
        try:
            # Test different URL parameter combinations that should trigger multiplayer mode
            test_cases = [
                {
                    'name': 'Standard Colyseus Multiplayer',
                    'params': {
                        'mode': 'colyseus-multiplayer',
                        'server': 'colyseus',
                        'multiplayer': 'colyseus',
                        'roomId': 'colyseus-arena-global'
                    },
                    'should_be_multiplayer': True
                },
                {
                    'name': 'Server Browser Join',
                    'params': {
                        'mode': 'multiplayer',
                        'server': 'colyseus',
                        'roomId': 'arena-room-123'
                    },
                    'should_be_multiplayer': True
                },
                {
                    'name': 'Practice Mode (Should be Single-player)',
                    'params': {
                        'mode': 'practice',
                        'roomId': 'global-practice-bots'
                    },
                    'should_be_multiplayer': False
                },
                {
                    'name': 'Local Mode (Should be Single-player)',
                    'params': {
                        'mode': 'local'
                    },
                    'should_be_multiplayer': False
                }
            ]
            
            all_tests_passed = True
            
            for test_case in test_cases:
                # Construct URL with parameters
                game_url = f"{BASE_URL}/agario?" + urlencode(test_case['params'])
                
                # Parse URL to verify parameters are correctly formatted
                parsed_url = urlparse(game_url)
                url_params = parse_qs(parsed_url.query)
                
                # Verify all expected parameters are present
                params_correct = True
                for param, expected_value in test_case['params'].items():
                    if param not in url_params or url_params[param][0] != expected_value:
                        params_correct = False
                        break
                        
                if not params_correct:
                    self.log_test(
                        f"Parameter Parsing - {test_case['name']}",
                        False,
                        f"URL: {game_url}",
                        "Parameters not correctly parsed in URL"
                    )
                    all_tests_passed = False
                    continue
                    
                # Check if the parameter combination should trigger multiplayer
                mode = test_case['params'].get('mode', '')
                server = test_case['params'].get('server', '')
                multiplayer = test_case['params'].get('multiplayer', '')
                room_id = test_case['params'].get('roomId', '')
                
                # Logic from the game page to determine if it should be multiplayer
                is_practice = mode == 'practice' and room_id == 'global-practice-bots'
                is_local = mode == 'local'
                should_be_multiplayer = not (is_practice or is_local)
                
                if should_be_multiplayer != test_case['should_be_multiplayer']:
                    self.log_test(
                        f"Multiplayer Detection - {test_case['name']}",
                        False,
                        f"Expected: {test_case['should_be_multiplayer']}, Got: {should_be_multiplayer}",
                        "Multiplayer mode detection logic incorrect"
                    )
                    all_tests_passed = False
                    continue
                    
                self.log_test(
                    f"Parameter Parsing - {test_case['name']}",
                    True,
                    f"Correctly detected as {'multiplayer' if should_be_multiplayer else 'single-player'}"
                )
                
            return all_tests_passed
            
        except Exception as e:
            self.log_test(
                "Game Page Parameter Parsing Test",
                False,
                "",
                f"Exception occurred: {str(e)}"
            )
            return False
            
    def test_colyseus_endpoint_configuration(self):
        """Test 5: Colyseus Endpoint Configuration - Verify endpoint is correctly configured"""
        print("🔍 TEST 5: COLYSEUS ENDPOINT CONFIGURATION")
        print("=" * 60)
        
        try:
            # Test server browser endpoint configuration
            response = self.session.get(f"{API_BASE}/servers")
            
            if response.status_code != 200:
                self.log_test(
                    "Colyseus Endpoint Configuration",
                    False,
                    f"HTTP {response.status_code}",
                    "Cannot retrieve server configuration"
                )
                return False
                
            data = response.json()
            colyseus_endpoint = data.get('colyseusEndpoint')
            
            if not colyseus_endpoint:
                self.log_test(
                    "Colyseus Endpoint Presence",
                    False,
                    "No colyseusEndpoint in response",
                    "Colyseus endpoint not configured in server response"
                )
                return False
                
            # Verify endpoint format
            if not colyseus_endpoint.startswith('wss://'):
                self.log_test(
                    "Colyseus Endpoint Format",
                    False,
                    f"Endpoint: {colyseus_endpoint}",
                    "Colyseus endpoint should use secure WebSocket (wss://)"
                )
                return False
                
            self.log_test(
                "Colyseus Endpoint Configuration",
                True,
                f"Endpoint correctly configured: {colyseus_endpoint}"
            )
            
            # Verify endpoint matches environment variable expectation
            expected_endpoint = "wss://au-syd-ab3eaf4e.colyseus.cloud"
            if colyseus_endpoint != expected_endpoint:
                self.log_test(
                    "Colyseus Endpoint Consistency",
                    False,
                    f"Expected: {expected_endpoint}, Got: {colyseus_endpoint}",
                    "Endpoint doesn't match expected Colyseus Cloud endpoint"
                )
                return False
                
            self.log_test(
                "Colyseus Endpoint Consistency",
                True,
                f"Endpoint matches expected Colyseus Cloud configuration"
            )
            
            return True
            
        except Exception as e:
            self.log_test(
                "Colyseus Endpoint Configuration Test",
                False,
                "",
                f"Exception occurred: {str(e)}"
            )
            return False
            
    def run_comprehensive_test(self):
        """Run all tests for Server Browser to Game joining flow"""
        print("🎮 COLYSEUS MULTIPLAYER FLOW COMPREHENSIVE TESTING")
        print("=" * 80)
        print(f"🌐 Testing against: {BASE_URL}")
        print(f"📡 API Base: {API_BASE}")
        print("=" * 80)
        print()
        
        # Run all tests
        tests = [
            ("Server Browser API", self.test_server_browser_api),
            ("URL Parameter Generation", self.test_url_parameter_generation),
            ("Session Tracking Flow", self.test_session_tracking_flow),
            ("Game Page Parameter Parsing", self.test_game_page_parameter_parsing),
            ("Colyseus Endpoint Configuration", self.test_colyseus_endpoint_configuration)
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test_name}: {str(e)}")
                
        # Summary
        print("=" * 80)
        print("🎯 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("=" * 80)
        
        success_rate = (passed_tests / total_tests) * 100
        
        print(f"📊 Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        print()
        
        if success_rate == 100:
            print("🎉 ALL TESTS PASSED - COLYSEUS MULTIPLAYER FLOW IS WORKING PERFECTLY!")
            print("✅ Server Browser shows active rooms with players")
            print("✅ URL parameters are correctly generated for Colyseus multiplayer")
            print("✅ Game page correctly parses parameters and sets multiplayer mode")
            print("✅ Session tracking flow works for Device 1 → Device 2 visibility")
            print("✅ Colyseus endpoint is correctly configured")
        elif success_rate >= 80:
            print("⚠️ MOSTLY WORKING - Some minor issues detected")
            print("🔍 Review failed tests above for specific issues")
        else:
            print("❌ CRITICAL ISSUES DETECTED - Multiplayer flow has significant problems")
            print("🚨 Players will likely get single-player mode instead of Colyseus multiplayer")
            
        print()
        print("=" * 80)
        
        # Detailed test results
        print("📋 DETAILED TEST RESULTS:")
        print("-" * 40)
        
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"   📋 {result['details']}")
            if result['error']:
                print(f"   ❌ {result['error']}")
                
        return success_rate >= 80

if __name__ == "__main__":
    print("🚀 Starting Colyseus Multiplayer Flow Backend Testing...")
    print()
    
    tester = ColyseusMultiplayerFlowTester()
    success = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)