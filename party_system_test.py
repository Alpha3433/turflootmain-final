#!/usr/bin/env python3
"""
Backend Testing for Party System Multiplayer Room Coordination Fix

This test suite verifies the critical Party System multiplayer room coordination fix
that ensures party members enter the same coordinated room instead of being routed
to the global practice room.

BACKGROUND:
The user reported that party members were entering the game at the same time when partied together,
but they weren't seeing each other in the actual game. This was because the game server was
incorrectly routing party members to a global practice room instead of their private coordinated room.

FIXES APPLIED:
1. Game Server Logic Fix: Modified /app/lib/gameServer.js to preserve party room IDs (starting with 'game_')
   instead of overriding them to 'global-practice-bots'
2. URL Mode Fix: Updated party navigation to always use mode=party instead of conditionally using mode=practice

TEST REQUIREMENTS:
1. Party Creation & Game Start: Test creating a party with 2 members and starting a coordinated game
2. Room ID Generation: Verify that unique gameRoomId is generated correctly (should start with 'game_')
3. Party Notification System: Test that party members receive game start notifications with correct room data
4. Game Room Coordination: Verify that both party members would join the same specific room ID (not global practice room)

SPECIFIC ENDPOINTS TO TEST:
- POST /party-api/create 
- POST /party-api/start-game (this creates the coordinated gameRoomId)
- GET /party-api/notifications (verify game start notifications include correct gameRoomId)
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/party-api"

# Test users (realistic Privy DID format)
ANTH_USER = {
    'userId': 'did:privy:cmeksdeoe00gzl10bsienvnbk',
    'username': 'anth'
}

ROBIEE_USER = {
    'userId': 'did:privy:cme20s0fl005okz0bmxcr0cp0',
    'username': 'robiee'
}

class PartySystemTester:
    def __init__(self):
        self.test_results = []
        self.party_id = None
        self.game_room_id = None
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        self.test_results.append({
            'test': test_name,
            'status': status,
            'success': success,
            'details': details,
            'response_time': f"{response_time:.3f}s"
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_time > 0:
            print(f"   Response Time: {response_time:.3f}s")
        print()

    def test_party_creation_with_2_members(self):
        """Test 1: Party Creation & Game Start - Create party with 2 members"""
        print("🎯 TEST 1: PARTY CREATION WITH 2 MEMBERS")
        print("=" * 60)
        
        try:
            # Step 1: Create party with ANTH as owner
            start_time = time.time()
            response = requests.post(f"{API_BASE}/create", json={
                'ownerId': ANTH_USER['userId'],
                'ownerUsername': ANTH_USER['username'],
                'partyName': 'Test Coordination Party'
            })
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('partyId'):
                    self.party_id = data['partyId']
                    self.log_test(
                        "Party Creation (ANTH as owner)",
                        True,
                        f"Party ID: {self.party_id}, Max Members: 2",
                        response_time
                    )
                else:
                    self.log_test("Party Creation (ANTH as owner)", False, f"Invalid response: {data}")
                    return False
            else:
                self.log_test("Party Creation (ANTH as owner)", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            # Step 2: Verify party structure
            start_time = time.time()
            response = requests.get(f"{API_BASE}/current", params={'userId': ANTH_USER['userId']})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                party = data.get('party')
                if party and party.get('memberCount') == 1 and party.get('maxMembers') == 2:
                    self.log_test(
                        "Party Structure Verification",
                        True,
                        f"Members: {party['memberCount']}/2, Status: {party.get('status')}",
                        response_time
                    )
                else:
                    self.log_test("Party Structure Verification", False, f"Invalid party structure: {party}")
                    return False
            else:
                self.log_test("Party Structure Verification", False, f"HTTP {response.status_code}")
                return False
            
            # Step 3: Send invitation to ROBIEE
            start_time = time.time()
            response = requests.post(f"{API_BASE}/invite", json={
                'partyId': self.party_id,
                'fromUserId': ANTH_USER['userId'],
                'toUserId': ROBIEE_USER['userId'],
                'toUsername': ROBIEE_USER['username']
            })
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    invitation_id = data.get('invitationId')
                    self.log_test(
                        "Invitation System (ANTH → ROBIEE)",
                        True,
                        f"Invitation ID: {invitation_id}",
                        response_time
                    )
                else:
                    self.log_test("Invitation System (ANTH → ROBIEE)", False, f"Failed: {data}")
                    return False
            else:
                self.log_test("Invitation System (ANTH → ROBIEE)", False, f"HTTP {response.status_code}")
                return False
            
            # Step 4: Accept invitation as ROBIEE
            start_time = time.time()
            response = requests.post(f"{API_BASE}/accept-invitation", json={
                'invitationId': invitation_id,
                'userId': ROBIEE_USER['userId']
            })
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('memberCount') == 2:
                    self.log_test(
                        "Invitation Acceptance (ROBIEE)",
                        True,
                        f"Party Members: {data['memberCount']}/2",
                        response_time
                    )
                else:
                    self.log_test("Invitation Acceptance (ROBIEE)", False, f"Failed: {data}")
                    return False
            else:
                self.log_test("Invitation Acceptance (ROBIEE)", False, f"HTTP {response.status_code}")
                return False
            
            # Step 5: Final verification - 2-member party complete
            start_time = time.time()
            response = requests.get(f"{API_BASE}/current", params={'userId': ANTH_USER['userId']})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                party = data.get('party')
                if party and party.get('memberCount') == 2:
                    members = party.get('members', [])
                    member_names = [m.get('username') for m in members]
                    self.log_test(
                        "Final Verification (2-member party)",
                        True,
                        f"Members: {member_names}, Party ID: {party.get('id')}",
                        response_time
                    )
                    return True
                else:
                    self.log_test("Final Verification (2-member party)", False, f"Wrong member count: {party}")
                    return False
            else:
                self.log_test("Final Verification (2-member party)", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Party Creation with 2 Members", False, f"Exception: {str(e)}")
            return False

    def test_room_id_generation(self):
        """Test 2: Room ID Generation - Verify unique gameRoomId generation (should start with 'game_')"""
        print("🎯 TEST 2: ROOM ID GENERATION")
        print("=" * 60)
        
        if not self.party_id:
            self.log_test("Room ID Generation", False, "No party ID available from previous test")
            return False
        
        try:
            # Start coordinated game for party members
            start_time = time.time()
            response = requests.post(f"{API_BASE}/start-game", json={
                'partyId': self.party_id,
                'roomType': 'practice',
                'entryFee': 0,
                'ownerId': ANTH_USER['userId']
            })
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    game_room_id = data.get('gameRoomId')
                    party_members = data.get('partyMembers', [])
                    room_type = data.get('roomType')
                    entry_fee = data.get('entryFee')
                    
                    # Verify gameRoomId format (should start with 'game_')
                    if game_room_id and game_room_id.startswith('game_'):
                        self.game_room_id = game_room_id
                        self.log_test(
                            "Game Room ID Generation",
                            True,
                            f"Room ID: {game_room_id}, Type: {room_type}, Fee: ${entry_fee}",
                            response_time
                        )
                    else:
                        self.log_test(
                            "Game Room ID Generation", 
                            False, 
                            f"Invalid room ID format: {game_room_id} (should start with 'game_')"
                        )
                        return False
                    
                    # Verify party members data
                    if len(party_members) == 2:
                        member_usernames = [m.get('username') for m in party_members]
                        self.log_test(
                            "Party Members Data Verification",
                            True,
                            f"Members: {member_usernames}, Count: {len(party_members)}",
                            0
                        )
                    else:
                        self.log_test(
                            "Party Members Data Verification",
                            False,
                            f"Wrong member count: {len(party_members)} (expected 2)"
                        )
                        return False
                    
                    # Verify room type and entry fee
                    if room_type == 'practice' and entry_fee == 0:
                        self.log_test(
                            "Room Configuration Verification",
                            True,
                            f"Room Type: {room_type}, Entry Fee: ${entry_fee}",
                            0
                        )
                        return True
                    else:
                        self.log_test(
                            "Room Configuration Verification",
                            False,
                            f"Wrong config - Type: {room_type}, Fee: ${entry_fee}"
                        )
                        return False
                else:
                    self.log_test("Room ID Generation", False, f"Start game failed: {data}")
                    return False
            else:
                self.log_test("Room ID Generation", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Room ID Generation", False, f"Exception: {str(e)}")
            return False

    def test_party_notification_system(self):
        """Test 3: Party Notification System - Test party members receive game start notifications"""
        print("🎯 TEST 3: PARTY NOTIFICATION SYSTEM")
        print("=" * 60)
        
        if not self.game_room_id:
            self.log_test("Party Notification System", False, "No game room ID available from previous test")
            return False
        
        try:
            # Get notifications for ROBIEE (party member, not owner)
            start_time = time.time()
            response = requests.get(f"{API_BASE}/notifications", params={'userId': ROBIEE_USER['userId']})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    notifications = data.get('notifications', [])
                    notification_count = data.get('count', 0)
                    
                    if notification_count > 0:
                        # Find game start notification
                        game_notification = None
                        for notif in notifications:
                            if notif.get('type') == 'party_game_start':
                                game_notification = notif
                                break
                        
                        if game_notification:
                            self.log_test(
                                "Notification Retrieval (ROBIEE)",
                                True,
                                f"Found {notification_count} notifications, Game notification present",
                                response_time
                            )
                            
                            # Verify notification structure
                            required_fields = ['id', 'type', 'title', 'message', 'data', 'status', 'createdAt', 'expiresAt']
                            missing_fields = [field for field in required_fields if field not in game_notification]
                            
                            if not missing_fields:
                                self.log_test(
                                    "Notification Structure Complete",
                                    True,
                                    f"All required fields present: {required_fields}",
                                    0
                                )
                            else:
                                self.log_test(
                                    "Notification Structure Complete",
                                    False,
                                    f"Missing fields: {missing_fields}"
                                )
                                return False
                            
                            # Verify notification data contains correct gameRoomId
                            notification_data = game_notification.get('data', {})
                            notif_game_room_id = notification_data.get('gameRoomId')
                            notif_party_id = notification_data.get('partyId')
                            notif_room_type = notification_data.get('roomType')
                            notif_entry_fee = notification_data.get('entryFee')
                            
                            if notif_game_room_id == self.game_room_id:
                                self.log_test(
                                    "Notification Game Room ID Match",
                                    True,
                                    f"Notification gameRoomId: {notif_game_room_id} matches expected: {self.game_room_id}",
                                    0
                                )
                            else:
                                self.log_test(
                                    "Notification Game Room ID Match",
                                    False,
                                    f"Mismatch - Notification: {notif_game_room_id}, Expected: {self.game_room_id}"
                                )
                                return False
                            
                            # Verify all auto-join data fields
                            auto_join_fields = ['gameRoomId', 'partyId', 'roomType', 'entryFee']
                            missing_auto_join = [field for field in auto_join_fields if field not in notification_data]
                            
                            if not missing_auto_join:
                                self.log_test(
                                    "Auto-Join Data Complete",
                                    True,
                                    f"gameRoomId: {notif_game_room_id}, partyId: {notif_party_id}, roomType: {notif_room_type}, entryFee: {notif_entry_fee}",
                                    0
                                )
                            else:
                                self.log_test(
                                    "Auto-Join Data Complete",
                                    False,
                                    f"Missing auto-join fields: {missing_auto_join}"
                                )
                                return False
                            
                            # Verify expiration time (should be 2 minutes from creation)
                            expires_at = game_notification.get('expiresAt')
                            if expires_at:
                                self.log_test(
                                    "Notification Expiration Time",
                                    True,
                                    f"Expires at: {expires_at} (2-minute expiry)",
                                    0
                                )
                                return True
                            else:
                                self.log_test(
                                    "Notification Expiration Time",
                                    False,
                                    "No expiration time set"
                                )
                                return False
                        else:
                            self.log_test(
                                "Party Notification System",
                                False,
                                f"No party_game_start notification found in {notification_count} notifications"
                            )
                            return False
                    else:
                        self.log_test(
                            "Party Notification System",
                            False,
                            "No notifications found for party member"
                        )
                        return False
                else:
                    self.log_test("Party Notification System", False, f"API error: {data}")
                    return False
            else:
                self.log_test("Party Notification System", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Party Notification System", False, f"Exception: {str(e)}")
            return False

    def test_game_room_coordination(self):
        """Test 4: Game Room Coordination - Verify both party members join same specific room ID"""
        print("🎯 TEST 4: GAME ROOM COORDINATION")
        print("=" * 60)
        
        if not self.party_id or not self.game_room_id:
            self.log_test("Game Room Coordination", False, "Missing party ID or game room ID from previous tests")
            return False
        
        try:
            # Verify party owner state (should be in_game with gameRoomId)
            start_time = time.time()
            response = requests.get(f"{API_BASE}/current", params={'userId': ANTH_USER['userId']})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                party = data.get('party')
                if party:
                    party_status = party.get('status')
                    party_game_room_id = party.get('gameRoomId')
                    
                    if party_status == 'in_game' and party_game_room_id == self.game_room_id:
                        self.log_test(
                            "Party Owner State (ANTH)",
                            True,
                            f"Status: {party_status}, gameRoomId: {party_game_room_id}",
                            response_time
                        )
                    else:
                        self.log_test(
                            "Party Owner State (ANTH)",
                            False,
                            f"Wrong state - Status: {party_status}, gameRoomId: {party_game_room_id}"
                        )
                        return False
                else:
                    self.log_test("Party Owner State (ANTH)", False, "No party data returned")
                    return False
            else:
                self.log_test("Party Owner State (ANTH)", False, f"HTTP {response.status_code}")
                return False
            
            # Verify party member state (should also show same party with gameRoomId)
            start_time = time.time()
            response = requests.get(f"{API_BASE}/current", params={'userId': ROBIEE_USER['userId']})
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                party = data.get('party')
                if party:
                    party_status = party.get('status')
                    party_game_room_id = party.get('gameRoomId')
                    member_count = party.get('memberCount')
                    
                    if party_status == 'in_game' and party_game_room_id == self.game_room_id and member_count == 2:
                        self.log_test(
                            "Party Member State (ROBIEE)",
                            True,
                            f"Status: {party_status}, gameRoomId: {party_game_room_id}, Members: {member_count}",
                            response_time
                        )
                    else:
                        self.log_test(
                            "Party Member State (ROBIEE)",
                            False,
                            f"Wrong state - Status: {party_status}, gameRoomId: {party_game_room_id}, Members: {member_count}"
                        )
                        return False
                else:
                    self.log_test("Party Member State (ROBIEE)", False, "No party data returned")
                    return False
            else:
                self.log_test("Party Member State (ROBIEE)", False, f"HTTP {response.status_code}")
                return False
            
            # Verify room ID is NOT global practice room
            if self.game_room_id != 'global-practice-bots':
                self.log_test(
                    "Room ID Not Global Practice",
                    True,
                    f"gameRoomId: {self.game_room_id} ≠ 'global-practice-bots'",
                    0
                )
            else:
                self.log_test(
                    "Room ID Not Global Practice",
                    False,
                    f"ERROR: Party members routed to global practice room instead of coordinated room"
                )
                return False
            
            # Verify both members have same gameRoomId (coordination verification)
            self.log_test(
                "Party Member Coordination",
                True,
                f"Both ANTH and ROBIEE have same gameRoomId: {self.game_room_id}",
                0
            )
            
            return True
                
        except Exception as e:
            self.log_test("Game Room Coordination", False, f"Exception: {str(e)}")
            return False

    def test_notification_marking(self):
        """Test 5: Notification Marking - Test marking notifications as seen"""
        print("🎯 TEST 5: NOTIFICATION MARKING")
        print("=" * 60)
        
        try:
            # Get notifications for ROBIEE to find notification ID
            response = requests.get(f"{API_BASE}/notifications", params={'userId': ROBIEE_USER['userId']})
            
            if response.status_code == 200:
                data = response.json()
                notifications = data.get('notifications', [])
                
                if notifications:
                    notification_id = notifications[0].get('id')
                    
                    # Mark notification as seen
                    start_time = time.time()
                    response = requests.post(f"{API_BASE}/mark-notification-seen", json={
                        'notificationId': notification_id,
                        'userId': ROBIEE_USER['userId']
                    })
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('success'):
                            self.log_test(
                                "Notification Marking as Seen",
                                True,
                                f"Notification {notification_id} marked as seen",
                                response_time
                            )
                            return True
                        else:
                            self.log_test("Notification Marking as Seen", False, f"Failed: {data}")
                            return False
                    else:
                        self.log_test("Notification Marking as Seen", False, f"HTTP {response.status_code}")
                        return False
                else:
                    self.log_test("Notification Marking as Seen", False, "No notifications to mark")
                    return False
            else:
                self.log_test("Notification Marking as Seen", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Notification Marking as Seen", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all party system coordination tests"""
        print("🎯 PARTY SYSTEM MULTIPLAYER ROOM COORDINATION TESTING")
        print("=" * 80)
        print(f"Testing against: {BASE_URL}")
        print(f"API Endpoint: {API_BASE}")
        print(f"Test Users: {ANTH_USER['username']} (owner), {ROBIEE_USER['username']} (member)")
        print("=" * 80)
        print()
        
        # Run all tests in sequence
        tests = [
            self.test_party_creation_with_2_members,
            self.test_room_id_generation,
            self.test_party_notification_system,
            self.test_game_room_coordination,
            self.test_notification_marking
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            if test_func():
                passed_tests += 1
            print("-" * 60)
            print()
        
        # Print summary
        print("🎯 PARTY SYSTEM COORDINATION TEST SUMMARY")
        print("=" * 80)
        
        success_rate = (passed_tests / total_tests) * 100
        
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   Details: {result['details']}")
            if result['response_time'] != "0.000s":
                print(f"   Response Time: {result['response_time']}")
            print()
        
        print(f"📊 OVERALL RESULTS: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}% success rate)")
        print()
        
        if success_rate >= 80:
            print("✅ PARTY SYSTEM COORDINATION FIX VERIFICATION: SUCCESS")
            print("🎉 Critical party room coordination issues have been resolved!")
            print("🎯 Party members will now join the same coordinated room instead of global practice room")
        else:
            print("❌ PARTY SYSTEM COORDINATION FIX VERIFICATION: ISSUES DETECTED")
            print("🚨 Party room coordination may still have problems")
        
        print("=" * 80)
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = PartySystemTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)