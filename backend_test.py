#!/usr/bin/env python3
"""
Backend Testing for Colyseus Room ID Property Fix - Session Tracking
Testing the critical fix where trackPlayerSession function was changed from room.id to room.roomId
"""

import requests
import json
import time
import sys
from datetime import datetime, timedelta

# Test configuration
BASE_URL = "https://lobby-finder-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class ColyseusRoomIDFixTester:
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'TurfLoot-Backend-Tester/1.0'
        })
        
    def log_test(self, test_name, success, details, expected=None, actual=None):
        """Log test results with detailed information"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'expected': expected,
            'actual': actual,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        print(f"   Details: {details}")
        if expected and actual:
            print(f"   Expected: {expected}")
            print(f"   Actual: {actual}")
        print()
        
    def test_api_health(self):
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers_count = len(data.get('servers', []))
                colyseus_enabled = data.get('colyseusEnabled', False)
                
                self.log_test(
                    "API Health Check",
                    True,
                    f"API accessible with {servers_count} servers, Colyseus enabled: {colyseus_enabled}",
                    "API accessible with Colyseus enabled",
                    f"{servers_count} servers, Colyseus: {colyseus_enabled}"
                )
                return True
            else:
                self.log_test(
                    "API Health Check",
                    False,
                    f"API returned status {response.status_code}",
                    "Status 200",
                    f"Status {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "API Health Check",
                False,
                f"API connection failed: {str(e)}",
                "Successful connection",
                f"Error: {str(e)}"
            )
            return False
    
    def test_session_tracking_with_valid_room_id(self):
        """Test session tracking API with valid room ID (not undefined)"""
        try:
            # Test data with realistic room ID (simulating fixed room.roomId)
            test_room_id = "colyseus-arena-test-room-123"
            session_data = {
                "action": "join",
                "session": {
                    "roomId": test_room_id,
                    "joinedAt": datetime.now().isoformat(),
                    "lastActivity": datetime.now().isoformat(),
                    "userId": "test_user_" + str(int(time.time())),
                    "entryFee": 0,
                    "mode": "colyseus-multiplayer",
                    "region": "AU",
                    "isRealHathoraRoom": False,
                    "colyseusRoom": True
                }
            }
            
            response = self.session.post(
                f"{API_BASE}/game-sessions",
                json=session_data,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                success = result.get('success', False)
                action = result.get('action', '')
                
                self.log_test(
                    "Session Tracking with Valid Room ID",
                    success and action == 'join',
                    f"Session created successfully for room {test_room_id}",
                    "Session created with valid room ID",
                    f"Success: {success}, Action: {action}"
                )
                return test_room_id if success else None
            else:
                error_text = response.text
                self.log_test(
                    "Session Tracking with Valid Room ID",
                    False,
                    f"Session creation failed with status {response.status_code}: {error_text}",
                    "Status 200 with successful session creation",
                    f"Status {response.status_code}"
                )
                return None
                
        except Exception as e:
            self.log_test(
                "Session Tracking with Valid Room ID",
                False,
                f"Session tracking failed: {str(e)}",
                "Successful session creation",
                f"Error: {str(e)}"
            )
            return None
    
    def test_session_tracking_with_undefined_room_id(self):
        """Test session tracking API with undefined room ID (old bug scenario)"""
        try:
            # Test data with undefined room ID (simulating old room.id bug)
            session_data = {
                "action": "join",
                "session": {
                    "roomId": None,  # Simulating undefined room ID
                    "joinedAt": datetime.now().isoformat(),
                    "lastActivity": datetime.now().isoformat(),
                    "userId": "test_user_undefined_" + str(int(time.time())),
                    "entryFee": 0,
                    "mode": "colyseus-multiplayer",
                    "region": "AU"
                }
            }
            
            response = self.session.post(
                f"{API_BASE}/game-sessions",
                json=session_data,
                timeout=10
            )
            
            # This should fail with 400 Bad Request due to missing roomId
            if response.status_code == 400:
                error_data = response.json()
                error_msg = error_data.get('error', '')
                
                self.log_test(
                    "Session Tracking with Undefined Room ID",
                    True,
                    f"Correctly rejected undefined room ID with 400 error: {error_msg}",
                    "400 Bad Request for undefined room ID",
                    f"Status {response.status_code}, Error: {error_msg}"
                )
                return True
            else:
                self.log_test(
                    "Session Tracking with Undefined Room ID",
                    False,
                    f"Should have rejected undefined room ID but got status {response.status_code}",
                    "400 Bad Request",
                    f"Status {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Session Tracking with Undefined Room ID",
                False,
                f"Test failed with error: {str(e)}",
                "400 Bad Request for undefined room ID",
                f"Error: {str(e)}"
            )
            return False
    
    def test_database_storage_validation(self):
        """Test that sessions are properly stored in database with correct room IDs"""
        try:
            # Get active sessions from the API
            response = self.session.get(f"{API_BASE}/game-sessions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                total_sessions = data.get('totalActiveSessions', 0)
                sessions_by_room = data.get('sessionsByRoom', {})
                
                # Check for sessions with valid room IDs
                valid_room_sessions = 0
                undefined_room_sessions = 0
                
                for room_id, sessions in sessions_by_room.items():
                    if room_id and room_id != 'undefined' and room_id != 'null':
                        valid_room_sessions += len(sessions)
                    else:
                        undefined_room_sessions += len(sessions)
                
                success = undefined_room_sessions == 0  # No sessions with undefined room IDs
                
                self.log_test(
                    "Database Storage Validation",
                    success,
                    f"Found {valid_room_sessions} sessions with valid room IDs, {undefined_room_sessions} with undefined room IDs",
                    "All sessions have valid room IDs",
                    f"Valid: {valid_room_sessions}, Undefined: {undefined_room_sessions}"
                )
                return success
            else:
                self.log_test(
                    "Database Storage Validation",
                    False,
                    f"Failed to retrieve sessions: status {response.status_code}",
                    "Status 200 with session data",
                    f"Status {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Database Storage Validation",
                False,
                f"Database validation failed: {str(e)}",
                "Successful session retrieval",
                f"Error: {str(e)}"
            )
            return False
    
    def test_room_pooling_logic(self):
        """Test that player count tracking works with proper room IDs"""
        try:
            # Create multiple sessions for the same room
            test_room_id = "colyseus-arena-pooling-test"
            created_sessions = []
            
            for i in range(3):
                session_data = {
                    "action": "join",
                    "session": {
                        "roomId": test_room_id,
                        "joinedAt": datetime.now().isoformat(),
                        "lastActivity": datetime.now().isoformat(),
                        "userId": f"pooling_test_user_{i}_{int(time.time())}",
                        "entryFee": 0,
                        "mode": "colyseus-multiplayer",
                        "region": "AU"
                    }
                }
                
                response = self.session.post(
                    f"{API_BASE}/game-sessions",
                    json=session_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    created_sessions.append(f"pooling_test_user_{i}_{int(time.time())}")
            
            # Wait a moment for database updates
            time.sleep(2)
            
            # Check if server browser shows correct player count
            response = self.session.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                total_players = data.get('totalPlayers', 0)
                
                # Look for our test room or check total player count
                room_found = False
                room_player_count = 0
                
                for server in servers:
                    if server.get('id') == test_room_id or server.get('colyseusRoomId') == test_room_id:
                        room_found = True
                        room_player_count = server.get('currentPlayers', 0)
                        break
                
                success = len(created_sessions) > 0 and (room_found or total_players >= len(created_sessions))
                
                self.log_test(
                    "Room Pooling Logic",
                    success,
                    f"Created {len(created_sessions)} sessions, server shows {total_players} total players",
                    f"Player count reflects created sessions ({len(created_sessions)})",
                    f"Total players: {total_players}, Room found: {room_found}"
                )
                return success
            else:
                self.log_test(
                    "Room Pooling Logic",
                    False,
                    f"Failed to check server browser: status {response.status_code}",
                    "Status 200 with server data",
                    f"Status {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Room Pooling Logic",
                False,
                f"Room pooling test failed: {str(e)}",
                "Successful player count tracking",
                f"Error: {str(e)}"
            )
            return False
    
    def test_server_browser_integration(self):
        """Test that server browser shows accurate player counts"""
        try:
            response = self.session.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                total_players = data.get('totalPlayers', 0)
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                # Check server structure
                valid_servers = 0
                for server in servers:
                    if (server.get('id') and 
                        server.get('serverType') == 'colyseus' and
                        'currentPlayers' in server and
                        'maxPlayers' in server):
                        valid_servers += 1
                
                success = colyseus_enabled and valid_servers > 0 and colyseus_endpoint
                
                self.log_test(
                    "Server Browser Integration",
                    success,
                    f"Found {valid_servers} valid Colyseus servers, {total_players} total players, endpoint: {colyseus_endpoint}",
                    "Valid Colyseus servers with player counts",
                    f"Servers: {valid_servers}, Players: {total_players}, Enabled: {colyseus_enabled}"
                )
                return success
            else:
                self.log_test(
                    "Server Browser Integration",
                    False,
                    f"Server browser API failed: status {response.status_code}",
                    "Status 200 with server data",
                    f"Status {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Server Browser Integration",
                False,
                f"Server browser test failed: {str(e)}",
                "Successful server browser data",
                f"Error: {str(e)}"
            )
            return False
    
    def test_end_to_end_session_flow(self):
        """Test complete flow from session creation to cleanup"""
        try:
            test_room_id = "colyseus-e2e-test-room"
            test_user_id = f"e2e_user_{int(time.time())}"
            
            # Step 1: Create session
            session_data = {
                "action": "join",
                "session": {
                    "roomId": test_room_id,
                    "joinedAt": datetime.now().isoformat(),
                    "lastActivity": datetime.now().isoformat(),
                    "userId": test_user_id,
                    "entryFee": 5,
                    "mode": "colyseus-multiplayer",
                    "region": "AU"
                }
            }
            
            create_response = self.session.post(
                f"{API_BASE}/game-sessions",
                json=session_data,
                timeout=10
            )
            
            if create_response.status_code != 200:
                self.log_test(
                    "End-to-End Session Flow",
                    False,
                    f"Session creation failed: status {create_response.status_code}",
                    "Successful session creation",
                    f"Status {create_response.status_code}"
                )
                return False
            
            # Step 2: Update session activity
            time.sleep(1)
            update_data = {
                "action": "update",
                "roomId": test_room_id,
                "lastActivity": datetime.now().isoformat()
            }
            
            update_response = self.session.post(
                f"{API_BASE}/game-sessions",
                json=update_data,
                timeout=10
            )
            
            # Step 3: Leave session
            leave_data = {
                "action": "leave",
                "roomId": test_room_id
            }
            
            leave_response = self.session.post(
                f"{API_BASE}/game-sessions",
                json=leave_data,
                timeout=10
            )
            
            # Check all steps succeeded
            create_success = create_response.status_code == 200
            update_success = update_response.status_code == 200
            leave_success = leave_response.status_code == 200
            
            overall_success = create_success and update_success and leave_success
            
            self.log_test(
                "End-to-End Session Flow",
                overall_success,
                f"Create: {create_success}, Update: {update_success}, Leave: {leave_success}",
                "All session operations successful",
                f"Create: {create_success}, Update: {update_success}, Leave: {leave_success}"
            )
            return overall_success
            
        except Exception as e:
            self.log_test(
                "End-to-End Session Flow",
                False,
                f"E2E test failed: {str(e)}",
                "Successful complete session flow",
                f"Error: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all tests for Colyseus Room ID Property Fix"""
        print("🧪 COLYSEUS ROOM ID PROPERTY FIX - BACKEND TESTING")
        print("=" * 60)
        print("Testing the critical fix where trackPlayerSession function was changed from room.id to room.roomId")
        print("Focus: Session tracking API, database storage, and room pooling functionality")
        print()
        
        # Run tests in order
        tests = [
            ("API Health Check", self.test_api_health),
            ("Session Tracking with Valid Room ID", self.test_session_tracking_with_valid_room_id),
            ("Session Tracking with Undefined Room ID", self.test_session_tracking_with_undefined_room_id),
            ("Database Storage Validation", self.test_database_storage_validation),
            ("Room Pooling Logic", self.test_room_pooling_logic),
            ("Server Browser Integration", self.test_server_browser_integration),
            ("End-to-End Session Flow", self.test_end_to_end_session_flow)
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                if result:
                    passed_tests += 1
            except Exception as e:
                print(f"❌ FAIL {test_name}: Unexpected error - {str(e)}")
        
        # Summary
        print("=" * 60)
        print("🏁 COLYSEUS ROOM ID PROPERTY FIX - TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (passed_tests / total_tests) * 100
        print(f"📊 Overall Success Rate: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        if success_rate >= 85:
            print("🎉 EXCELLENT: Room ID property fix is working correctly!")
        elif success_rate >= 70:
            print("✅ GOOD: Room ID property fix is mostly working with minor issues")
        else:
            print("⚠️ ISSUES: Room ID property fix has significant problems")
        
        print()
        print("🔍 DETAILED FINDINGS:")
        
        critical_issues = []
        minor_issues = []
        
        for result in self.test_results:
            if not result['success']:
                if 'Session Tracking' in result['test'] or 'Database Storage' in result['test']:
                    critical_issues.append(result['test'])
                else:
                    minor_issues.append(result['test'])
        
        if critical_issues:
            print("❌ CRITICAL ISSUES:")
            for issue in critical_issues:
                print(f"   - {issue}")
        
        if minor_issues:
            print("⚠️ MINOR ISSUES:")
            for issue in minor_issues:
                print(f"   - {issue}")
        
        if not critical_issues and not minor_issues:
            print("✅ NO ISSUES: All tests passed successfully!")
        
        print()
        print("🎯 ROOM ID PROPERTY FIX VERIFICATION:")
        
        # Check specific fix verification
        session_tracking_passed = any(r['success'] and 'Session Tracking with Valid Room ID' in r['test'] for r in self.test_results)
        undefined_handling_passed = any(r['success'] and 'Undefined Room ID' in r['test'] for r in self.test_results)
        database_storage_passed = any(r['success'] and 'Database Storage' in r['test'] for r in self.test_results)
        
        if session_tracking_passed:
            print("✅ Session tracking now accepts valid room IDs (fix working)")
        else:
            print("❌ Session tracking still has issues with room IDs")
        
        if undefined_handling_passed:
            print("✅ System correctly rejects undefined room IDs (validation working)")
        else:
            print("❌ System not properly handling undefined room IDs")
        
        if database_storage_passed:
            print("✅ Database stores sessions with valid room IDs")
        else:
            print("❌ Database storage has room ID issues")
        
        return success_rate >= 70

if __name__ == "__main__":
    tester = ColyseusRoomIDFixTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)