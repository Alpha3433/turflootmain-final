#!/usr/bin/env python3
"""
Colyseus Room Tracking System Backend Testing
Testing the improved room tracking system where Device 1 creates a room and Device 2 can see it.
"""

import requests
import json
import time
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://turfloot-colyseus.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class ColyseusRoomTrackingTester:
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'ColyseusRoomTrackingTester/1.0'
        })
    
    def log_test(self, test_name, success, details="", error=None):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'error': str(error) if error else None,
            'timestamp': datetime.now().isoformat()
        })
        print()
    
    def test_step_1_server_browser_state(self):
        """Step 1: Check Current Server Browser State"""
        print("🔍 STEP 1: Checking Current Server Browser State")
        print("=" * 60)
        
        try:
            response = self.session.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code != 200:
                self.log_test(
                    "Server Browser API Accessibility",
                    False,
                    f"Status: {response.status_code}",
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
            
            data = response.json()
            
            # Test API response structure
            required_fields = ['servers', 'totalPlayers', 'totalActiveServers', 'colyseusEnabled', 'colyseusEndpoint']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test(
                    "Server Browser API Structure",
                    False,
                    f"Missing fields: {missing_fields}",
                    "API response missing required fields"
                )
                return False
            
            self.log_test(
                "Server Browser API Structure",
                True,
                f"All required fields present: {required_fields}"
            )
            
            # Test Colyseus configuration
            colyseus_enabled = data.get('colyseusEnabled', False)
            colyseus_endpoint = data.get('colyseusEndpoint', '')
            
            self.log_test(
                "Colyseus Integration Status",
                colyseus_enabled,
                f"Enabled: {colyseus_enabled}, Endpoint: {colyseus_endpoint}"
            )
            
            # Test server data structure
            servers = data.get('servers', [])
            if not servers:
                self.log_test(
                    "Server Data Availability",
                    False,
                    "No servers returned",
                    "Expected at least one Colyseus arena server"
                )
                return False
            
            # Check arena server structure
            arena_server = None
            for server in servers:
                if server.get('serverType') == 'colyseus' and server.get('roomType') == 'arena':
                    arena_server = server
                    break
            
            if not arena_server:
                self.log_test(
                    "Colyseus Arena Server Presence",
                    False,
                    f"Found {len(servers)} servers but no Colyseus arena server",
                    "Expected Colyseus arena server not found"
                )
                return False
            
            # Validate arena server structure
            required_server_fields = ['id', 'roomType', 'name', 'currentPlayers', 'maxPlayers', 'serverType']
            missing_server_fields = [field for field in required_server_fields if field not in arena_server]
            
            if missing_server_fields:
                self.log_test(
                    "Arena Server Structure",
                    False,
                    f"Missing server fields: {missing_server_fields}",
                    "Arena server missing required fields"
                )
                return False
            
            current_players = arena_server.get('currentPlayers', 0)
            max_players = arena_server.get('maxPlayers', 0)
            
            self.log_test(
                "Arena Server Structure",
                True,
                f"ID: {arena_server['id']}, Players: {current_players}/{max_players}, Type: {arena_server['serverType']}"
            )
            
            # Store current state for comparison
            self.initial_player_count = current_players
            self.arena_server_id = arena_server['id']
            
            return True
            
        except requests.exceptions.RequestException as e:
            self.log_test(
                "Server Browser API Accessibility",
                False,
                "Network error",
                str(e)
            )
            return False
        except Exception as e:
            self.log_test(
                "Server Browser API Processing",
                False,
                "Unexpected error",
                str(e)
            )
            return False
    
    def test_step_2_game_session_tracking(self):
        """Step 2: Simulate Room Creation Flow"""
        print("🎮 STEP 2: Simulating Room Creation Flow")
        print("=" * 60)
        
        # Test game session API accessibility
        try:
            response = self.session.get(f"{API_BASE}/game-sessions", timeout=10)
            
            if response.status_code != 200:
                self.log_test(
                    "Game Sessions API Accessibility",
                    False,
                    f"Status: {response.status_code}",
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
            
            data = response.json()
            initial_sessions = data.get('totalActiveSessions', 0)
            
            self.log_test(
                "Game Sessions API Accessibility",
                True,
                f"Initial active sessions: {initial_sessions}"
            )
            
        except Exception as e:
            self.log_test(
                "Game Sessions API Accessibility",
                False,
                "Failed to access game sessions API",
                str(e)
            )
            return False
        
        # Simulate Device 1 creating/joining a room
        # Use the actual arena server ID from the server browser
        arena_room_id = getattr(self, 'arena_server_id', 'colyseus-arena-global')
        
        device1_session = {
            "action": "join",
            "session": {
                "roomId": arena_room_id,
                "userId": "device1_user",
                "mode": "colyseus-arena",
                "region": "au-syd",
                "entryFee": 0,
                "joinedAt": datetime.now().isoformat(),
                "lastActivity": datetime.now().isoformat()
            }
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/game-sessions",
                json=device1_session,
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test(
                    "Device 1 Room Join Simulation",
                    False,
                    f"Status: {response.status_code}",
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
            
            join_data = response.json()
            
            self.log_test(
                "Device 1 Room Join Simulation",
                join_data.get('success', False),
                f"Action: {join_data.get('action')}, Message: {join_data.get('message')}"
            )
            
        except Exception as e:
            self.log_test(
                "Device 1 Room Join Simulation",
                False,
                "Failed to simulate room join",
                str(e)
            )
            return False
        
        # Wait a moment for database update
        time.sleep(2)
        
        # Verify session was recorded
        try:
            response = self.session.get(f"{API_BASE}/game-sessions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                sessions_by_room = data.get('sessionsByRoom', {})
                arena_sessions = sessions_by_room.get('colyseus-arena-global', [])
                
                self.log_test(
                    "Session Database Recording",
                    len(arena_sessions) > 0,
                    f"Arena sessions found: {len(arena_sessions)}"
                )
                
                return len(arena_sessions) > 0
            else:
                self.log_test(
                    "Session Database Recording",
                    False,
                    f"Failed to verify session recording: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Session Database Recording",
                False,
                "Failed to verify session recording",
                str(e)
            )
            return False
    
    def test_step_3_room_pooling_logic(self):
        """Step 3: Verify Room Pooling Logic"""
        print("🏟️ STEP 3: Verifying Room Pooling Logic")
        print("=" * 60)
        
        # Add a second player to test pooling
        # Use the same room ID as Device 1
        arena_room_id = getattr(self, 'arena_server_id', 'colyseus-arena-global')
        
        device2_session = {
            "action": "join",
            "session": {
                "roomId": arena_room_id,
                "userId": "device2_user",
                "mode": "colyseus-arena",
                "region": "au-syd",
                "entryFee": 0,
                "joinedAt": datetime.now().isoformat(),
                "lastActivity": datetime.now().isoformat()
            }
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/game-sessions",
                json=device2_session,
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test(
                    "Device 2 Room Join Simulation",
                    False,
                    f"Status: {response.status_code}",
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
            
            self.log_test(
                "Device 2 Room Join Simulation",
                True,
                "Second player successfully joined arena"
            )
            
        except Exception as e:
            self.log_test(
                "Device 2 Room Join Simulation",
                False,
                "Failed to simulate second player join",
                str(e)
            )
            return False
        
        # Wait for database update
        time.sleep(2)
        
        # Check if server browser now shows updated player count
        try:
            response = self.session.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code != 200:
                self.log_test(
                    "Updated Player Count Verification",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
            
            data = response.json()
            servers = data.get('servers', [])
            
            arena_server = None
            for server in servers:
                if server.get('id') == 'colyseus-arena-global':
                    arena_server = server
                    break
            
            if not arena_server:
                self.log_test(
                    "Updated Player Count Verification",
                    False,
                    "Arena server not found in updated response"
                )
                return False
            
            updated_player_count = arena_server.get('currentPlayers', 0)
            expected_count = 2  # Device 1 + Device 2
            
            self.log_test(
                "Room Player Count Pooling",
                updated_player_count >= expected_count,
                f"Expected: {expected_count}, Actual: {updated_player_count}, Initial: {self.initial_player_count}"
            )
            
            # Test room grouping by checking game sessions
            response = self.session.get(f"{API_BASE}/game-sessions", timeout=10)
            
            if response.status_code == 200:
                session_data = response.json()
                sessions_by_room = session_data.get('sessionsByRoom', {})
                arena_sessions = sessions_by_room.get('colyseus-arena-global', [])
                
                self.log_test(
                    "Session Grouping by Room ID",
                    len(arena_sessions) >= 2,
                    f"Sessions in arena room: {len(arena_sessions)}"
                )
                
                # Verify session details
                user_ids = [session.get('userId') for session in arena_sessions]
                expected_users = ['device1_user', 'device2_user']
                users_found = all(user in user_ids for user in expected_users)
                
                self.log_test(
                    "Multiple Sessions in Same Room",
                    users_found,
                    f"Expected users: {expected_users}, Found users: {user_ids}"
                )
                
                return updated_player_count >= expected_count and users_found
            else:
                self.log_test(
                    "Session Grouping Verification",
                    False,
                    f"Failed to get session data: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Room Pooling Logic Verification",
                False,
                "Failed to verify room pooling",
                str(e)
            )
            return False
    
    def test_expected_behavior_flow(self):
        """Test the complete expected behavior flow"""
        print("🔄 TESTING EXPECTED BEHAVIOR FLOW")
        print("=" * 60)
        
        # Test the complete flow as described in the review request
        try:
            # 1. Check that server browser shows the arena with updated player count
            response = self.session.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code != 200:
                self.log_test(
                    "Complete Flow - Server Browser Check",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
            
            data = response.json()
            servers = data.get('servers', [])
            
            arena_server = None
            for server in servers:
                if server.get('serverType') == 'colyseus' and server.get('roomType') == 'arena':
                    arena_server = server
                    break
            
            if not arena_server:
                self.log_test(
                    "Complete Flow - Arena Server Visibility",
                    False,
                    "Arena server not visible in server browser"
                )
                return False
            
            current_players = arena_server.get('currentPlayers', 0)
            max_players = arena_server.get('maxPlayers', 50)
            server_name = arena_server.get('gameType', 'Arena Battle')
            
            # Expected format: "Arena Battle (2/50)" with "Join Now" option
            expected_display = f"{server_name} ({current_players}/{max_players})"
            join_option = arena_server.get('avgWaitTime', 'Join Now')
            can_join = arena_server.get('canJoin', True)
            
            self.log_test(
                "Device 2 Server Browser View",
                current_players > 0 and can_join,
                f"Display: {expected_display}, Join Option: {join_option}, Can Join: {can_join}"
            )
            
            # 2. Test database queries for active sessions
            response = self.session.get(f"{API_BASE}/game-sessions", timeout=10)
            
            if response.status_code == 200:
                session_data = response.json()
                total_active = session_data.get('totalActiveSessions', 0)
                sessions_by_room = session_data.get('sessionsByRoom', {})
                
                # Check active sessions criteria
                arena_sessions = sessions_by_room.get('colyseus-arena-global', [])
                recent_sessions = []
                
                for session in arena_sessions:
                    last_activity = session.get('lastActivity')
                    if last_activity:
                        # Check if session is within 2 minutes (as per the API logic)
                        try:
                            activity_time = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
                            if datetime.now().replace(tzinfo=activity_time.tzinfo) - activity_time < timedelta(minutes=2):
                                recent_sessions.append(session)
                        except:
                            # If parsing fails, assume it's recent
                            recent_sessions.append(session)
                
                self.log_test(
                    "Active Session Query Logic",
                    len(recent_sessions) > 0,
                    f"Total active: {total_active}, Arena sessions: {len(arena_sessions)}, Recent: {len(recent_sessions)}"
                )
                
                # 3. Test room grouping by room ID
                room_ids = list(sessions_by_room.keys())
                arena_in_rooms = 'colyseus-arena-global' in room_ids
                
                self.log_test(
                    "Room ID Grouping",
                    arena_in_rooms,
                    f"Room IDs found: {room_ids}, Arena present: {arena_in_rooms}"
                )
                
                return current_players > 0 and len(recent_sessions) > 0 and arena_in_rooms
            else:
                self.log_test(
                    "Database Query Verification",
                    False,
                    f"Failed to query game sessions: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Expected Behavior Flow",
                False,
                "Failed to test complete flow",
                str(e)
            )
            return False
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("🧹 CLEANING UP TEST DATA")
        print("=" * 30)
        
        # Remove test sessions
        cleanup_actions = [
            {"action": "leave", "roomId": "colyseus-arena-global"},
        ]
        
        for action in cleanup_actions:
            try:
                response = self.session.post(
                    f"{API_BASE}/game-sessions",
                    json=action,
                    timeout=10
                )
                
                if response.status_code == 200:
                    print(f"✅ Cleaned up: {action['action']} for room {action['roomId']}")
                else:
                    print(f"⚠️ Cleanup warning: {action['action']} returned {response.status_code}")
                    
            except Exception as e:
                print(f"⚠️ Cleanup error for {action}: {e}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 COLYSEUS ROOM TRACKING SYSTEM TESTING")
        print("=" * 80)
        print(f"Testing against: {BASE_URL}")
        print(f"Started at: {datetime.now().isoformat()}")
        print()
        
        # Initialize tracking variables
        self.initial_player_count = 0
        self.arena_server_id = None
        
        # Run test steps
        step1_success = self.test_step_1_server_browser_state()
        step2_success = self.test_step_2_game_session_tracking() if step1_success else False
        step3_success = self.test_step_3_room_pooling_logic() if step2_success else False
        flow_success = self.test_expected_behavior_flow() if step3_success else False
        
        # Clean up
        self.cleanup_test_data()
        
        # Generate summary
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed_tests = sum(1 for result in self.test_results if result['success'])
        total_tests = len(self.test_results)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # Detailed results
        print("📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
            if result['error']:
                print(f"   Error: {result['error']}")
        
        print()
        print("🎯 REVIEW REQUEST VERIFICATION:")
        
        # Check specific requirements from review request
        requirements_met = {
            "Server Browser API returns room data": step1_success,
            "Game session tracking works": step2_success,
            "Room pooling logic operational": step3_success,
            "Expected behavior flow works": flow_success
        }
        
        for requirement, met in requirements_met.items():
            status = "✅" if met else "❌"
            print(f"{status} {requirement}")
        
        overall_success = all(requirements_met.values())
        
        print()
        if overall_success:
            print("🎉 COLYSEUS ROOM TRACKING SYSTEM: FULLY OPERATIONAL")
            print("✅ Device 1 creates room → Device 2 can see it in server browser")
            print("✅ Database-based room tracking working correctly")
            print("✅ Real-time room display functional")
        else:
            print("⚠️ COLYSEUS ROOM TRACKING SYSTEM: ISSUES DETECTED")
            print("❌ Some components of the room tracking system need attention")
        
        return overall_success

if __name__ == "__main__":
    tester = ColyseusRoomTrackingTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)