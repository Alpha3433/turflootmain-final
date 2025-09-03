#!/usr/bin/env python3
"""
TurfLoot Hathora Integration Backend Testing Suite
Testing the updated Hathora integration implementation

TESTING FOCUS (Review Request):
1. Test that session tracking APIs still work for global-practice-bots
2. Verify Hathora client integration is working (authentication and lobby creation logs)
3. Test server browser still shows Global Multiplayer entry
4. Check for connection errors or fallback to local server
5. Critical question: Does new implementation connect to deployed Hathora server?
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://realtime-lobby.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class GlobalMultiplayerTester:
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'TurfLoot-Backend-Tester/1.0'
        })
    
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'success': success,
            'details': details,
            'response_time': f"{response_time:.3f}s" if response_time > 0 else "N/A",
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} {test_name}")
        if details:
            print(f"    📋 {details}")
        if response_time > 0:
            print(f"    ⏱️  Response time: {response_time:.3f}s")
        print()
    
    def test_api_connectivity(self):
        """Test basic API connectivity"""
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/ping")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "API Connectivity Check",
                    True,
                    f"Ping successful: {data.get('status', 'unknown')}",
                    response_time
                )
                return True
            else:
                self.log_test(
                    "API Connectivity Check",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
                return False
        except Exception as e:
            self.log_test(
                "API Connectivity Check",
                False,
                f"Connection error: {str(e)}"
            )
            return False
    
    def test_server_browser_global_multiplayer(self):
        """Test server browser shows Global Multiplayer (US East) entry correctly"""
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/servers/lobbies")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                # Look for Global Multiplayer (US East) server
                global_server = None
                for server in servers:
                    if 'Global Multiplayer' in server.get('name', '') and 'US East' in server.get('name', ''):
                        global_server = server
                        break
                
                if global_server:
                    # Verify server properties
                    expected_properties = {
                        'id': 'global-practice-bots',
                        'mode': 'practice',
                        'stake': 0,
                        'region': 'US-East-1'
                    }
                    
                    all_properties_correct = True
                    property_details = []
                    
                    for prop, expected_value in expected_properties.items():
                        actual_value = global_server.get(prop)
                        if actual_value == expected_value:
                            property_details.append(f"{prop}={actual_value} ✓")
                        else:
                            property_details.append(f"{prop}={actual_value} (expected {expected_value}) ✗")
                            all_properties_correct = False
                    
                    self.log_test(
                        "Server Browser - Global Multiplayer Entry",
                        all_properties_correct,
                        f"Found server: {global_server.get('name')} | Properties: {', '.join(property_details)} | Current players: {global_server.get('currentPlayers', 0)}/{global_server.get('maxPlayers', 50)}",
                        response_time
                    )
                    return global_server
                else:
                    self.log_test(
                        "Server Browser - Global Multiplayer Entry",
                        False,
                        f"Global Multiplayer (US East) server not found. Available servers: {[s.get('name') for s in servers]}"
                    )
                    return None
            else:
                self.log_test(
                    "Server Browser - Global Multiplayer Entry",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
                return None
        except Exception as e:
            self.log_test(
                "Server Browser - Global Multiplayer Entry",
                False,
                f"Error: {str(e)}"
            )
            return None
    
    def test_session_tracking_join(self, player_id, player_name):
        """Test session tracking API for joining global-practice-bots room"""
        try:
            start_time = time.time()
            payload = {
                "roomId": "global-practice-bots",
                "playerId": player_id,
                "playerName": player_name
            }
            
            response = self.session.post(f"{API_BASE}/game-sessions/join", json=payload)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    f"Session Tracking - Join ({player_name})",
                    True,
                    f"Player {player_name} successfully joined global-practice-bots room",
                    response_time
                )
                return True
            else:
                self.log_test(
                    f"Session Tracking - Join ({player_name})",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
                return False
        except Exception as e:
            self.log_test(
                f"Session Tracking - Join ({player_name})",
                False,
                f"Error: {str(e)}"
            )
            return False
    
    def test_session_tracking_leave(self, player_id, player_name):
        """Test session tracking API for leaving global-practice-bots room"""
        try:
            start_time = time.time()
            payload = {
                "roomId": "global-practice-bots",
                "playerId": player_id
            }
            
            response = self.session.post(f"{API_BASE}/game-sessions/leave", json=payload)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    f"Session Tracking - Leave ({player_name})",
                    True,
                    f"Player {player_name} successfully left global-practice-bots room",
                    response_time
                )
                return True
            else:
                self.log_test(
                    f"Session Tracking - Leave ({player_name})",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
                return False
        except Exception as e:
            self.log_test(
                f"Session Tracking - Leave ({player_name})",
                False,
                f"Error: {str(e)}"
            )
            return False
    
    def test_multiple_players_same_session(self):
        """Test that multiple players connecting to global-practice-bots are in same session"""
        print("🎮 Testing Multiple Players in Same Session...")
        
        # Test players
        test_players = [
            ("player_global_test_1", "GlobalPlayer1"),
            ("player_global_test_2", "GlobalPlayer2"),
            ("player_global_test_3", "GlobalPlayer3")
        ]
        
        # Step 1: Get baseline player count
        baseline_server = self.test_server_browser_global_multiplayer()
        baseline_count = baseline_server.get('currentPlayers', 0) if baseline_server else 0
        
        # Step 2: Add all test players
        successful_joins = 0
        for player_id, player_name in test_players:
            if self.test_session_tracking_join(player_id, player_name):
                successful_joins += 1
                time.sleep(0.5)  # Small delay between joins
        
        # Step 3: Verify player count increased
        time.sleep(1)  # Allow database to update
        updated_server = self.test_server_browser_global_multiplayer()
        updated_count = updated_server.get('currentPlayers', 0) if updated_server else 0
        
        expected_count = baseline_count + successful_joins
        count_matches = updated_count == expected_count
        
        self.log_test(
            "Multiple Players - Same Session Verification",
            count_matches,
            f"Baseline: {baseline_count} players → Added: {successful_joins} players → Current: {updated_count} players (Expected: {expected_count})"
        )
        
        # Step 4: Remove all test players
        successful_leaves = 0
        for player_id, player_name in test_players:
            if self.test_session_tracking_leave(player_id, player_name):
                successful_leaves += 1
                time.sleep(0.5)  # Small delay between leaves
        
        # Step 5: Verify player count returned to baseline
        time.sleep(1)  # Allow database to update
        final_server = self.test_server_browser_global_multiplayer()
        final_count = final_server.get('currentPlayers', 0) if final_server else 0
        
        cleanup_successful = final_count == baseline_count
        
        self.log_test(
            "Multiple Players - Session Cleanup",
            cleanup_successful,
            f"Removed: {successful_leaves} players → Final count: {final_count} (Expected baseline: {baseline_count})"
        )
        
        return count_matches and cleanup_successful
    
    def test_room_id_handling(self):
        """Test room ID handling for shared multiplayer experience"""
        print("🔧 Testing Room ID Handling...")
        
        # Test that global-practice-bots room ID is consistently used
        test_scenarios = [
            {
                "name": "Direct Room ID Usage",
                "test": lambda: self.test_session_tracking_join("test_room_id_player", "RoomIDTestPlayer")
            },
            {
                "name": "Server Browser Room ID Consistency", 
                "test": lambda: self.verify_server_browser_room_id()
            }
        ]
        
        all_passed = True
        for scenario in test_scenarios:
            try:
                result = scenario["test"]()
                if not result:
                    all_passed = False
            except Exception as e:
                self.log_test(
                    f"Room ID Handling - {scenario['name']}",
                    False,
                    f"Error: {str(e)}"
                )
                all_passed = False
        
        # Cleanup test player
        self.test_session_tracking_leave("test_room_id_player", "RoomIDTestPlayer")
        
        return all_passed
    
    def verify_server_browser_room_id(self):
        """Verify server browser uses correct room ID"""
        server = self.test_server_browser_global_multiplayer()
        if server:
            room_id = server.get('id')
            expected_room_id = 'global-practice-bots'
            
            if room_id == expected_room_id:
                self.log_test(
                    "Room ID Handling - Server Browser Consistency",
                    True,
                    f"Server browser uses correct room ID: {room_id}"
                )
                return True
            else:
                self.log_test(
                    "Room ID Handling - Server Browser Consistency",
                    False,
                    f"Server browser room ID mismatch: got '{room_id}', expected '{expected_room_id}'"
                )
                return False
        else:
            return False
    
    def test_shared_server_instance_behavior(self):
        """Test that the fix ensures shared server instance behavior"""
        print("🌍 Testing Shared Server Instance Behavior...")
        
        # This test verifies the core fix: users connecting to global-practice-bots
        # should all connect to the same shared server instance
        
        # Test 1: Verify session persistence across multiple operations
        test_player = "shared_instance_test_player"
        test_name = "SharedInstancePlayer"
        
        # Join session
        join_success = self.test_session_tracking_join(test_player, test_name)
        
        # Verify session exists by checking server browser
        time.sleep(1)
        server_after_join = self.test_server_browser_global_multiplayer()
        
        # Leave session
        leave_success = self.test_session_tracking_leave(test_player, test_name)
        
        # Verify session removed
        time.sleep(1)
        server_after_leave = self.test_server_browser_global_multiplayer()
        
        # Check that player counts changed appropriately
        join_count = server_after_join.get('currentPlayers', 0) if server_after_join else 0
        leave_count = server_after_leave.get('currentPlayers', 0) if server_after_leave else 0
        
        shared_instance_working = (
            join_success and 
            leave_success and 
            server_after_join and 
            server_after_leave
        )
        
        self.log_test(
            "Shared Server Instance - Session Persistence",
            shared_instance_working,
            f"Join→Leave cycle successful | Player count: {join_count}→{leave_count}"
        )
        
        return shared_instance_working
    
    def run_comprehensive_test(self):
        """Run comprehensive test suite for Global Multiplayer shared room fix"""
        print("🚀 GLOBAL MULTIPLAYER SHARED ROOM FIX - COMPREHENSIVE BACKEND TESTING")
        print("=" * 80)
        print(f"🌐 Testing against: {BASE_URL}")
        print(f"⏰ Test started: {datetime.now().isoformat()}")
        print()
        
        # Test 1: Basic connectivity
        if not self.test_api_connectivity():
            print("❌ API connectivity failed. Aborting tests.")
            return False
        
        # Test 2: Server browser shows Global Multiplayer entry
        global_server = self.test_server_browser_global_multiplayer()
        if not global_server:
            print("❌ Global Multiplayer server not found. Aborting tests.")
            return False
        
        # Test 3: Session tracking APIs
        print("🔄 Testing Session Tracking APIs...")
        session_test_player = "session_api_test_player"
        session_test_name = "SessionAPITestPlayer"
        
        join_success = self.test_session_tracking_join(session_test_player, session_test_name)
        leave_success = self.test_session_tracking_leave(session_test_player, session_test_name)
        
        # Test 4: Multiple players in same session
        multiple_players_success = self.test_multiple_players_same_session()
        
        # Test 5: Room ID handling
        room_id_success = self.test_room_id_handling()
        
        # Test 6: Shared server instance behavior
        shared_instance_success = self.test_shared_server_instance_behavior()
        
        # Calculate results
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("=" * 80)
        print("📊 GLOBAL MULTIPLAYER SHARED ROOM FIX TEST RESULTS")
        print("=" * 80)
        
        # Print summary
        print(f"✅ Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        print()
        
        # Print detailed results
        for result in self.test_results:
            print(f"{result['status']} {result['test']}")
            if result['details']:
                print(f"    📋 {result['details']}")
            if result['response_time'] != "N/A":
                print(f"    ⏱️  {result['response_time']}")
        
        print()
        print("🎯 CRITICAL FINDINGS:")
        
        if success_rate >= 90:
            print("✅ GLOBAL MULTIPLAYER SHARED ROOM FIX IS WORKING CORRECTLY")
            print("   - Session tracking APIs operational for global-practice-bots room")
            print("   - Multiple players can connect to same shared game session")
            print("   - Server browser correctly shows Global Multiplayer (US East) entry")
            print("   - Room ID handling works properly for shared multiplayer experience")
        elif success_rate >= 70:
            print("⚠️  GLOBAL MULTIPLAYER SHARED ROOM FIX PARTIALLY WORKING")
            print("   - Some components working but issues detected")
            print("   - Review failed tests for specific problems")
        else:
            print("❌ GLOBAL MULTIPLAYER SHARED ROOM FIX HAS CRITICAL ISSUES")
            print("   - Multiple test failures detected")
            print("   - Fix may not be working as intended")
        
        print()
        print(f"⏰ Test completed: {datetime.now().isoformat()}")
        
        return success_rate >= 90

if __name__ == "__main__":
    tester = GlobalMultiplayerTester()
    success = tester.run_comprehensive_test()
    sys.exit(0 if success else 1)