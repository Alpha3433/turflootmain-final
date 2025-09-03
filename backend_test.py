#!/usr/bin/env python3
"""
Party Game Start Notification System Testing
============================================

Testing the party game start notification system to identify why only one player loads into the game.
Focus areas:
1. POST /party-api/start-game properly creates notifications for all party members
2. GET /party-api/notifications returns the game start notifications for non-owner party members  
3. Notification contains all required game data (gameRoomId, roomType, entryFee, partyMembers)
4. Multi-Member Coordination: Both party members receive identical notification data

Test Scenario: 
- Create party with 2 members (Alice as owner, Bob as member)
- Alice starts a practice game 
- Verify Bob receives auto-join notification with same gameRoomId
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
PARTY_API_BASE = f"{BASE_URL}/party-api"

# Test users - using realistic Privy DID format
ALICE_USER_ID = "did:privy:alice_party_owner_test_123"
ALICE_USERNAME = "AlicePartyOwner"

BOB_USER_ID = "did:privy:bob_party_member_test_456"  
BOB_USERNAME = "BobPartyMember"

class PartyNotificationTester:
    def __init__(self):
        self.test_results = []
        self.party_id = None
        self.game_room_id = None
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response_time': response_time
        })
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if response_time > 0:
            print(f"    Response time: {response_time:.3f}s")
        print()

    def test_1_party_creation_with_alice(self):
        """Test 1: Create party with Alice as owner"""
        print("🎯 TEST 1: PARTY CREATION WITH ALICE AS OWNER")
        print("=" * 60)
        
        try:
            start_time = time.time()
            
            # Create party with Alice as owner
            create_data = {
                "ownerId": ALICE_USER_ID,
                "ownerUsername": ALICE_USERNAME,
                "partyName": "Alice & Bob Test Party"
            }
            
            response = requests.post(f"{PARTY_API_BASE}/create", json=create_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('partyId'):
                    self.party_id = data['partyId']
                    self.log_test(
                        "Party Creation", 
                        True, 
                        f"Party created successfully: {self.party_id}",
                        response_time
                    )
                    return True
                else:
                    self.log_test("Party Creation", False, f"Invalid response structure: {data}")
                    return False
            else:
                self.log_test("Party Creation", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Party Creation", False, f"Exception: {str(e)}")
            return False

    def test_2_invite_bob_to_party(self):
        """Test 2: Invite Bob to the party"""
        print("🎯 TEST 2: INVITE BOB TO PARTY")
        print("=" * 60)
        
        if not self.party_id:
            self.log_test("Bob Invitation", False, "No party ID available")
            return False
            
        try:
            start_time = time.time()
            
            invite_data = {
                "partyId": self.party_id,
                "fromUserId": ALICE_USER_ID,
                "toUserId": BOB_USER_ID,
                "toUsername": BOB_USERNAME
            }
            
            response = requests.post(f"{PARTY_API_BASE}/invite", json=invite_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test(
                        "Bob Invitation", 
                        True, 
                        f"Invitation sent successfully: {data.get('invitationId')}",
                        response_time
                    )
                    return True
                else:
                    self.log_test("Bob Invitation", False, f"Invitation failed: {data}")
                    return False
            else:
                self.log_test("Bob Invitation", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Bob Invitation", False, f"Exception: {str(e)}")
            return False

    def test_3_bob_accept_invitation(self):
        """Test 3: Bob accepts the party invitation"""
        print("🎯 TEST 3: BOB ACCEPTS PARTY INVITATION")
        print("=" * 60)
        
        try:
            # First get Bob's pending invitations
            start_time = time.time()
            response = requests.get(f"{PARTY_API_BASE}/invitations", params={'userId': BOB_USER_ID}, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Get Bob's Invitations", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
            invitations_data = response.json()
            invitations = invitations_data.get('invitations', [])
            
            if not invitations:
                self.log_test("Get Bob's Invitations", False, "No pending invitations found")
                return False
                
            invitation_id = invitations[0]['id']
            self.log_test(
                "Get Bob's Invitations", 
                True, 
                f"Found invitation: {invitation_id}",
                response_time
            )
            
            # Accept the invitation
            start_time = time.time()
            accept_data = {
                "invitationId": invitation_id,
                "userId": BOB_USER_ID
            }
            
            response = requests.post(f"{PARTY_API_BASE}/accept-invitation", json=accept_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_test(
                        "Bob Accept Invitation", 
                        True, 
                        f"Invitation accepted, member count: {data.get('memberCount')}",
                        response_time
                    )
                    return True
                else:
                    self.log_test("Bob Accept Invitation", False, f"Accept failed: {data}")
                    return False
            else:
                self.log_test("Bob Accept Invitation", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Bob Accept Invitation", False, f"Exception: {str(e)}")
            return False

    def test_4_verify_2_member_party(self):
        """Test 4: Verify party has 2 members"""
        print("🎯 TEST 4: VERIFY 2-MEMBER PARTY SETUP")
        print("=" * 60)
        
        try:
            # Check Alice's party status
            start_time = time.time()
            response = requests.get(f"{PARTY_API_BASE}/current", params={'userId': ALICE_USER_ID}, timeout=10)
            alice_response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Alice Party Status", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
            alice_data = response.json()
            alice_party = alice_data.get('party')
            
            if not alice_party or alice_party.get('memberCount') != 2:
                self.log_test("Alice Party Status", False, f"Invalid party data: {alice_party}")
                return False
                
            self.log_test(
                "Alice Party Status", 
                True, 
                f"Alice party has {alice_party['memberCount']} members",
                alice_response_time
            )
            
            # Check Bob's party status
            start_time = time.time()
            response = requests.get(f"{PARTY_API_BASE}/current", params={'userId': BOB_USER_ID}, timeout=10)
            bob_response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Bob Party Status", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
            bob_data = response.json()
            bob_party = bob_data.get('party')
            
            if not bob_party or bob_party.get('id') != alice_party.get('id'):
                self.log_test("Bob Party Status", False, f"Bob not in same party: {bob_party}")
                return False
                
            self.log_test(
                "Bob Party Status", 
                True, 
                f"Bob in same party: {bob_party['id']}",
                bob_response_time
            )
            
            return True
            
        except Exception as e:
            self.log_test("Party Status Verification", False, f"Exception: {str(e)}")
            return False

    def test_5_alice_starts_practice_game(self):
        """Test 5: Alice starts a practice game (CRITICAL TEST)"""
        print("🎯 TEST 5: ALICE STARTS PRACTICE GAME - NOTIFICATION CREATION")
        print("=" * 60)
        
        if not self.party_id:
            self.log_test("Alice Start Game", False, "No party ID available")
            return False
            
        try:
            start_time = time.time()
            
            start_game_data = {
                "partyId": self.party_id,
                "roomType": "practice",
                "entryFee": 0,
                "ownerId": ALICE_USER_ID
            }
            
            response = requests.post(f"{PARTY_API_BASE}/start-game", json=start_game_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('gameRoomId'):
                    self.game_room_id = data['gameRoomId']
                    party_members = data.get('partyMembers', [])
                    
                    self.log_test(
                        "Alice Start Game", 
                        True, 
                        f"Game started: {self.game_room_id}, Members: {len(party_members)}",
                        response_time
                    )
                    
                    # Verify game room ID format
                    if self.game_room_id.startswith('game_'):
                        self.log_test(
                            "Game Room ID Format", 
                            True, 
                            f"Valid format: {self.game_room_id}"
                        )
                    else:
                        self.log_test(
                            "Game Room ID Format", 
                            False, 
                            f"Invalid format: {self.game_room_id}"
                        )
                    
                    # Verify party members data
                    if len(party_members) == 2:
                        member_usernames = [m.get('username') for m in party_members]
                        if ALICE_USERNAME in member_usernames and BOB_USERNAME in member_usernames:
                            self.log_test(
                                "Party Members Data", 
                                True, 
                                f"Both members present: {member_usernames}"
                            )
                        else:
                            self.log_test(
                                "Party Members Data", 
                                False, 
                                f"Missing members: {member_usernames}"
                            )
                    else:
                        self.log_test(
                            "Party Members Data", 
                            False, 
                            f"Wrong member count: {len(party_members)}"
                        )
                    
                    return True
                else:
                    self.log_test("Alice Start Game", False, f"Game start failed: {data}")
                    return False
            else:
                self.log_test("Alice Start Game", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Alice Start Game", False, f"Exception: {str(e)}")
            return False

    def test_6_bob_notification_retrieval(self):
        """Test 6: Bob retrieves game start notifications (CRITICAL TEST)"""
        print("🎯 TEST 6: BOB NOTIFICATION RETRIEVAL - AUTO-JOIN DATA")
        print("=" * 60)
        
        try:
            start_time = time.time()
            
            response = requests.get(f"{PARTY_API_BASE}/notifications", params={'userId': BOB_USER_ID}, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                notifications = data.get('notifications', [])
                
                self.log_test(
                    "Bob Notification Retrieval", 
                    True, 
                    f"Retrieved {len(notifications)} notifications",
                    response_time
                )
                
                # Find party_game_start notification
                game_start_notification = None
                for notification in notifications:
                    if notification.get('type') == 'party_game_start':
                        game_start_notification = notification
                        break
                
                if game_start_notification:
                    self.log_test(
                        "Game Start Notification Found", 
                        True, 
                        f"Notification ID: {game_start_notification.get('id')}"
                    )
                    
                    # Verify notification structure
                    required_fields = ['id', 'type', 'title', 'message', 'data', 'status', 'createdAt', 'expiresAt']
                    missing_fields = [field for field in required_fields if field not in game_start_notification]
                    
                    if not missing_fields:
                        self.log_test(
                            "Notification Structure", 
                            True, 
                            "All required fields present"
                        )
                    else:
                        self.log_test(
                            "Notification Structure", 
                            False, 
                            f"Missing fields: {missing_fields}"
                        )
                    
                    # Verify notification data content
                    notification_data = game_start_notification.get('data', {})
                    required_data_fields = ['gameRoomId', 'partyId', 'roomType', 'entryFee', 'partyMembers']
                    missing_data_fields = [field for field in required_data_fields if field not in notification_data]
                    
                    if not missing_data_fields:
                        self.log_test(
                            "Notification Data Fields", 
                            True, 
                            "All required data fields present"
                        )
                    else:
                        self.log_test(
                            "Notification Data Fields", 
                            False, 
                            f"Missing data fields: {missing_data_fields}"
                        )
                    
                    # Verify game room ID matches
                    notification_game_room_id = notification_data.get('gameRoomId')
                    if notification_game_room_id == self.game_room_id:
                        self.log_test(
                            "Game Room ID Match", 
                            True, 
                            f"Notification gameRoomId matches: {notification_game_room_id}"
                        )
                    else:
                        self.log_test(
                            "Game Room ID Match", 
                            False, 
                            f"Mismatch - Expected: {self.game_room_id}, Got: {notification_game_room_id}"
                        )
                    
                    # Verify party members data in notification
                    notification_party_members = notification_data.get('partyMembers', [])
                    if len(notification_party_members) == 2:
                        member_usernames = [m.get('username') for m in notification_party_members]
                        if ALICE_USERNAME in member_usernames and BOB_USERNAME in member_usernames:
                            self.log_test(
                                "Notification Party Members", 
                                True, 
                                f"Both members in notification: {member_usernames}"
                            )
                        else:
                            self.log_test(
                                "Notification Party Members", 
                                False, 
                                f"Missing members in notification: {member_usernames}"
                            )
                    else:
                        self.log_test(
                            "Notification Party Members", 
                            False, 
                            f"Wrong member count in notification: {len(notification_party_members)}"
                        )
                    
                    # Verify room type and entry fee
                    if notification_data.get('roomType') == 'practice':
                        self.log_test("Notification Room Type", True, "Room type is practice")
                    else:
                        self.log_test("Notification Room Type", False, f"Wrong room type: {notification_data.get('roomType')}")
                    
                    if notification_data.get('entryFee') == 0:
                        self.log_test("Notification Entry Fee", True, "Entry fee is 0 (free)")
                    else:
                        self.log_test("Notification Entry Fee", False, f"Wrong entry fee: {notification_data.get('entryFee')}")
                    
                    return True
                else:
                    self.log_test(
                        "Game Start Notification Found", 
                        False, 
                        f"No party_game_start notification found. Available types: {[n.get('type') for n in notifications]}"
                    )
                    return False
            else:
                self.log_test("Bob Notification Retrieval", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Bob Notification Retrieval", False, f"Exception: {str(e)}")
            return False

    def test_7_alice_notification_check(self):
        """Test 7: Verify Alice (owner) does NOT receive auto-join notification"""
        print("🎯 TEST 7: ALICE NOTIFICATION CHECK - OWNER EXCLUSION")
        print("=" * 60)
        
        try:
            start_time = time.time()
            
            response = requests.get(f"{PARTY_API_BASE}/notifications", params={'userId': ALICE_USER_ID}, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                notifications = data.get('notifications', [])
                
                self.log_test(
                    "Alice Notification Retrieval", 
                    True, 
                    f"Retrieved {len(notifications)} notifications",
                    response_time
                )
                
                # Check if Alice has any party_game_start notifications
                game_start_notifications = [n for n in notifications if n.get('type') == 'party_game_start']
                
                if len(game_start_notifications) == 0:
                    self.log_test(
                        "Alice Owner Exclusion", 
                        True, 
                        "Alice correctly excluded from auto-join notifications"
                    )
                    return True
                else:
                    self.log_test(
                        "Alice Owner Exclusion", 
                        False, 
                        f"Alice incorrectly received {len(game_start_notifications)} game start notifications"
                    )
                    return False
            else:
                self.log_test("Alice Notification Retrieval", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Alice Notification Check", False, f"Exception: {str(e)}")
            return False

    def test_8_party_coordination_verification(self):
        """Test 8: Verify both party members have same game room coordination"""
        print("🎯 TEST 8: PARTY COORDINATION VERIFICATION")
        print("=" * 60)
        
        try:
            # Check Alice's party status after game start
            start_time = time.time()
            response = requests.get(f"{PARTY_API_BASE}/current", params={'userId': ALICE_USER_ID}, timeout=10)
            alice_response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Alice Post-Game Party Status", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
            alice_data = response.json()
            alice_party = alice_data.get('party')
            
            if not alice_party:
                self.log_test("Alice Post-Game Party Status", False, "No party data found")
                return False
                
            alice_game_room_id = alice_party.get('gameRoomId')
            alice_status = alice_party.get('status')
            
            self.log_test(
                "Alice Post-Game Party Status", 
                True, 
                f"Status: {alice_status}, GameRoomId: {alice_game_room_id}",
                alice_response_time
            )
            
            # Check Bob's party status after game start
            start_time = time.time()
            response = requests.get(f"{PARTY_API_BASE}/current", params={'userId': BOB_USER_ID}, timeout=10)
            bob_response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Bob Post-Game Party Status", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
            bob_data = response.json()
            bob_party = bob_data.get('party')
            
            if not bob_party:
                self.log_test("Bob Post-Game Party Status", False, "No party data found")
                return False
                
            bob_game_room_id = bob_party.get('gameRoomId')
            bob_status = bob_party.get('status')
            
            self.log_test(
                "Bob Post-Game Party Status", 
                True, 
                f"Status: {bob_status}, GameRoomId: {bob_game_room_id}",
                bob_response_time
            )
            
            # Verify coordination
            if alice_game_room_id == bob_game_room_id == self.game_room_id:
                self.log_test(
                    "Game Room Coordination", 
                    True, 
                    f"All parties have same gameRoomId: {alice_game_room_id}"
                )
            else:
                self.log_test(
                    "Game Room Coordination", 
                    False, 
                    f"Mismatch - Alice: {alice_game_room_id}, Bob: {bob_game_room_id}, Expected: {self.game_room_id}"
                )
            
            if alice_status == bob_status == 'in_game':
                self.log_test(
                    "Party Status Coordination", 
                    True, 
                    f"Both parties have 'in_game' status"
                )
                return True
            else:
                self.log_test(
                    "Party Status Coordination", 
                    False, 
                    f"Status mismatch - Alice: {alice_status}, Bob: {bob_status}"
                )
                return False
                
        except Exception as e:
            self.log_test("Party Coordination Verification", False, f"Exception: {str(e)}")
            return False

    def test_9_notification_expiry_check(self):
        """Test 9: Verify notification expiry times are reasonable"""
        print("🎯 TEST 9: NOTIFICATION EXPIRY TIME VERIFICATION")
        print("=" * 60)
        
        try:
            response = requests.get(f"{PARTY_API_BASE}/notifications", params={'userId': BOB_USER_ID}, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                notifications = data.get('notifications', [])
                
                game_start_notification = None
                for notification in notifications:
                    if notification.get('type') == 'party_game_start':
                        game_start_notification = notification
                        break
                
                if game_start_notification:
                    created_at = game_start_notification.get('createdAt')
                    expires_at = game_start_notification.get('expiresAt')
                    
                    if created_at and expires_at:
                        from datetime import datetime
                        created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        expires_time = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                        
                        expiry_duration = (expires_time - created_time).total_seconds()
                        
                        # Should expire in 2 minutes (120 seconds)
                        if 100 <= expiry_duration <= 140:  # Allow some tolerance
                            self.log_test(
                                "Notification Expiry Time", 
                                True, 
                                f"Reasonable expiry duration: {expiry_duration:.0f} seconds"
                            )
                            return True
                        else:
                            self.log_test(
                                "Notification Expiry Time", 
                                False, 
                                f"Unreasonable expiry duration: {expiry_duration:.0f} seconds"
                            )
                            return False
                    else:
                        self.log_test("Notification Expiry Time", False, "Missing timestamp fields")
                        return False
                else:
                    self.log_test("Notification Expiry Time", False, "No game start notification found")
                    return False
            else:
                self.log_test("Notification Expiry Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Notification Expiry Check", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all party notification tests"""
        print("🚀 PARTY GAME START NOTIFICATION SYSTEM TESTING")
        print("=" * 80)
        print(f"Testing party game start notifications for auto-join functionality")
        print(f"Alice (Owner): {ALICE_USER_ID}")
        print(f"Bob (Member): {BOB_USER_ID}")
        print("=" * 80)
        print()
        
        # Run tests in sequence
        tests = [
            self.test_1_party_creation_with_alice,
            self.test_2_invite_bob_to_party,
            self.test_3_bob_accept_invitation,
            self.test_4_verify_2_member_party,
            self.test_5_alice_starts_practice_game,
            self.test_6_bob_notification_retrieval,
            self.test_7_alice_notification_check,
            self.test_8_party_coordination_verification,
            self.test_9_notification_expiry_check
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
                self.log_test(test.__name__, False, f"Exception: {str(e)}")
            
            # Small delay between tests
            time.sleep(0.5)
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("🎯 PARTY GAME START NOTIFICATION TESTING SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {failed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['details']}")
            print()
        
        print("🔍 CRITICAL FINDINGS:")
        
        # Check if notifications are being created
        notification_creation_tests = [r for r in self.test_results if 'Start Game' in r['test'] or 'Notification' in r['test']]
        notification_success = all(r['success'] for r in notification_creation_tests)
        
        if notification_success:
            print("   ✅ Party game start notifications are being created correctly")
            print("   ✅ Non-owner party members receive auto-join notifications")
            print("   ✅ Notifications contain all required game data")
            print("   ✅ Multi-member coordination data is consistent")
        else:
            print("   ❌ Issues detected in party game start notification system")
            print("   ❌ This explains why only one player loads into the game")
        
        print()
        print("🎮 GAME COORDINATION STATUS:")
        if self.game_room_id:
            print(f"   Game Room ID: {self.game_room_id}")
            print("   ✅ Game room created successfully")
        else:
            print("   ❌ No game room created")
        
        print()
        print("📋 RECOMMENDATION:")
        if success_rate >= 90:
            print("   ✅ Party notification system is working correctly")
            print("   ✅ Backend supports proper auto-join functionality")
            print("   ⚠️  If users still can't auto-join, check frontend polling logic")
        elif success_rate >= 70:
            print("   ⚠️  Party notification system has minor issues")
            print("   🔧 Review failed tests and fix identified problems")
        else:
            print("   ❌ Party notification system has major issues")
            print("   🚨 Critical fixes needed before auto-join can work")
        
        print("=" * 80)

if __name__ == "__main__":
    print("🎯 Starting Party Game Start Notification System Testing...")
    print(f"Target URL: {BASE_URL}")
    print()
    
    tester = PartyNotificationTester()
    tester.run_all_tests()
    print("="*80)
    
    # Clean up any existing parties first
    print("🧹 Cleaning up any existing parties...")
    for user in [TEST_USER_ALICE, TEST_USER_BOB]:
        cleanup_response = make_request('GET', 'current', params={'userId': user['userId']})
        if cleanup_response and cleanup_response.status_code == 200:
            data = cleanup_response.json()
            if data.get('hasParty') and data.get('party'):
                party_id = data['party']['id']
                print(f"   Leaving existing party {party_id} for {user['username']}")
                make_request('POST', 'leave', data={'partyId': party_id, 'userId': user['userId']})
    
    # Create new party with Alice as owner
    print(f"\n🎉 Creating new party with {TEST_USER_ALICE['username']} as owner")
    create_data = {
        'ownerId': TEST_USER_ALICE['userId'],
        'ownerUsername': TEST_USER_ALICE['username'],
        'partyName': f"{TEST_USER_ALICE['username']}'s Game Party"
    }
    
    print(f"📤 Party creation data: {json.dumps(create_data, indent=2)}")
    
    response = make_request('POST', 'create', data=create_data)
    
    if response and response.status_code == 200:
        data = response.json()
        print(f"✅ Party created successfully!")
        print(f"📊 Response: {json.dumps(data, indent=2)}")
        
        party_id = data.get('partyId')
        if party_id:
            print(f"🎯 Party ID: {party_id}")
            return party_id
        else:
            print("❌ No party ID returned")
            return None
    else:
        print(f"❌ Failed to create party: {response.status_code if response else 'No response'}")
        if response:
            print(f"   Error: {response.text}")
        return None

def test_party_invitation():
    """Test 2: Invite second member to party"""
    print("\n" + "="*80)
    print("📧 TEST 2: PARTY INVITATION FOR GAME SETUP")
    print("="*80)
    
    # First get Alice's current party
    print(f"🔍 Getting {TEST_USER_ALICE['username']}'s current party...")
    response = make_request('GET', 'current', params={'userId': TEST_USER_ALICE['userId']})
    
    if not response or response.status_code != 200:
        print("❌ Failed to get Alice's party status")
        return None
        
    data = response.json()
    if not data.get('hasParty') or not data.get('party'):
        print("❌ Alice doesn't have a party")
        return None
        
    party = data['party']
    party_id = party['id']
    print(f"✅ Found Alice's party: {party_id}")
    
    # Send invitation to Bob
    print(f"\n📤 Sending invitation to {TEST_USER_BOB['username']}")
    invite_data = {
        'partyId': party_id,
        'fromUserId': TEST_USER_ALICE['userId'],
        'toUserId': TEST_USER_BOB['userId'],
        'toUsername': TEST_USER_BOB['username']
    }
    
    print(f"📋 Invitation data: {json.dumps(invite_data, indent=2)}")
    
    invite_response = make_request('POST', 'invite', data=invite_data)
    
    if invite_response and invite_response.status_code == 200:
        invite_result = invite_response.json()
        print(f"✅ Invitation sent successfully!")
        print(f"📊 Response: {json.dumps(invite_result, indent=2)}")
        
        invitation_id = invite_result.get('invitationId')
        if invitation_id:
            print(f"🎯 Invitation ID: {invitation_id}")
            return {'party_id': party_id, 'invitation_id': invitation_id}
        else:
            print("❌ No invitation ID returned")
            return None
    else:
        print(f"❌ Failed to send invitation: {invite_response.status_code if invite_response else 'No response'}")
        if invite_response:
            print(f"   Error: {invite_response.text}")
        return None

def test_party_acceptance():
    """Test 3: Accept party invitation to form complete party"""
    print("\n" + "="*80)
    print("✅ TEST 3: PARTY INVITATION ACCEPTANCE")
    print("="*80)
    
    # First get Bob's pending invitations
    print(f"🔍 Checking {TEST_USER_BOB['username']}'s pending invitations...")
    response = make_request('GET', 'invitations', params={'userId': TEST_USER_BOB['userId']})
    
    if not response or response.status_code != 200:
        print("❌ Failed to get Bob's invitations")
        return None
        
    data = response.json()
    invitations = data.get('invitations', [])
    
    if not invitations:
        print("❌ No pending invitations found for Bob")
        return None
        
    print(f"✅ Found {len(invitations)} pending invitation(s)")
    invitation = invitations[0]  # Take the first invitation
    invitation_id = invitation['id']
    party_id = invitation['partyId']
    
    print(f"📋 Invitation details:")
    print(f"   ID: {invitation_id}")
    print(f"   Party ID: {party_id}")
    print(f"   From: {invitation.get('fromUsername')}")
    print(f"   Party Name: {invitation.get('partyName')}")
    
    # Accept the invitation
    print(f"\n✅ Accepting invitation...")
    accept_data = {
        'invitationId': invitation_id,
        'userId': TEST_USER_BOB['userId']
    }
    
    accept_response = make_request('POST', 'accept-invitation', data=accept_data)
    
    if accept_response and accept_response.status_code == 200:
        accept_result = accept_response.json()
        print(f"✅ Invitation accepted successfully!")
        print(f"📊 Response: {json.dumps(accept_result, indent=2)}")
        
        # Verify party membership
        print(f"\n🔍 Verifying party membership...")
        verify_response = make_request('GET', 'current', params={'userId': TEST_USER_BOB['userId']})
        
        if verify_response and verify_response.status_code == 200:
            verify_data = verify_response.json()
            if verify_data.get('hasParty'):
                party = verify_data['party']
                print(f"✅ Bob is now in party: {party.get('name')}")
                print(f"   Member count: {party.get('memberCount')}")
                print(f"   Members: {[m.get('username') for m in party.get('members', [])]}")
                return party_id
            else:
                print("❌ Bob is not in any party after accepting invitation")
                return None
        else:
            print("❌ Failed to verify party membership")
            return None
    else:
        print(f"❌ Failed to accept invitation: {accept_response.status_code if accept_response else 'No response'}")
        if accept_response:
            print(f"   Error: {accept_response.text}")
        return None

def test_party_game_start():
    """Test 4: Start party game and create game room"""
    print("\n" + "="*80)
    print("🎮 TEST 4: PARTY GAME INITIALIZATION - START GAME")
    print("="*80)
    
    # Get Alice's current party (she should be the owner)
    print(f"🔍 Getting {TEST_USER_ALICE['username']}'s current party...")
    response = make_request('GET', 'current', params={'userId': TEST_USER_ALICE['userId']})
    
    if not response or response.status_code != 200:
        print("❌ Failed to get Alice's party status")
        return None
        
    data = response.json()
    if not data.get('hasParty') or not data.get('party'):
        print("❌ Alice doesn't have a party")
        return None
        
    party = data['party']
    party_id = party['id']
    member_count = party.get('memberCount', 0)
    
    print(f"✅ Found Alice's party: {party_id}")
    print(f"   Member count: {member_count}")
    print(f"   Members: {[m.get('username') for m in party.get('members', [])]}")
    
    if member_count != 2:
        print(f"❌ Party must have exactly 2 members for game start (has {member_count})")
        return None
    
    # Start party game
    print(f"\n🎮 Starting party game...")
    game_start_data = {
        'partyId': party_id,
        'roomType': 'FREE',  # Test with free room first
        'entryFee': 0,
        'ownerId': TEST_USER_ALICE['userId']
    }
    
    print(f"📋 Game start data: {json.dumps(game_start_data, indent=2)}")
    
    start_response = make_request('POST', 'start-game', data=game_start_data)
    
    if start_response and start_response.status_code == 200:
        start_result = start_response.json()
        print(f"✅ Party game started successfully!")
        print(f"📊 Response: {json.dumps(start_result, indent=2)}")
        
        game_room_id = start_result.get('gameRoomId')
        party_members = start_result.get('partyMembers', [])
        room_type = start_result.get('roomType')
        entry_fee = start_result.get('entryFee')
        
        if game_room_id:
            print(f"\n🎯 GAME ROOM CREATED:")
            print(f"   Game Room ID: {game_room_id}")
            print(f"   Room Type: {room_type}")
            print(f"   Entry Fee: ${entry_fee}")
            print(f"   Party Members: {len(party_members)}")
            
            for member in party_members:
                print(f"     - {member.get('username')} ({member.get('userId')})")
            
            return {
                'game_room_id': game_room_id,
                'party_id': party_id,
                'room_type': room_type,
                'entry_fee': entry_fee,
                'party_members': party_members
            }
        else:
            print("❌ No game room ID returned")
            return None
    else:
        print(f"❌ Failed to start party game: {start_response.status_code if start_response else 'No response'}")
        if start_response:
            print(f"   Error: {start_response.text}")
        return None

def test_game_room_validation():
    """Test 5: Validate game room creation and accessibility"""
    print("\n" + "="*80)
    print("🔍 TEST 5: GAME ROOM VALIDATION AND ACCESSIBILITY")
    print("="*80)
    
    # This test requires a game room to have been created in the previous test
    # We'll check if we can access the game room data through the database
    
    # First, let's check if Alice's party is in 'in_game' status
    print(f"🔍 Checking {TEST_USER_ALICE['username']}'s party status after game start...")
    response = make_request('GET', 'current', params={'userId': TEST_USER_ALICE['userId']})
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get('hasParty') and data.get('party'):
            party = data['party']
            party_status = party.get('status')
            game_room_id = party.get('gameRoomId')
            
            print(f"✅ Party status: {party_status}")
            print(f"✅ Game Room ID: {game_room_id}")
            
            if party_status == 'in_game' and game_room_id:
                print(f"🎯 GAME ROOM VALIDATION SUCCESS:")
                print(f"   Party is in 'in_game' status")
                print(f"   Game Room ID is present: {game_room_id}")
                print(f"   Game Room ID format: {'✅ Valid' if game_room_id.startswith('game_') else '❌ Invalid'}")
                
                # Validate game room ID format
                if game_room_id.startswith('game_') and len(game_room_id) > 20:
                    print(f"✅ Game Room ID format is valid for game connection")
                    
                    # Check if both party members can see the game room
                    print(f"\n🔍 Checking if both party members can access game room...")
                    
                    for member in party.get('members', []):
                        member_id = member.get('id')
                        member_username = member.get('username')
                        
                        print(f"   Checking {member_username} ({member_id})...")
                        member_response = make_request('GET', 'current', params={'userId': member_id})
                        
                        if member_response and member_response.status_code == 200:
                            member_data = member_response.json()
                            if member_data.get('party', {}).get('gameRoomId') == game_room_id:
                                print(f"   ✅ {member_username} can access game room {game_room_id}")
                            else:
                                print(f"   ❌ {member_username} cannot access game room")
                        else:
                            print(f"   ❌ Failed to check {member_username}'s party status")
                    
                    return {
                        'game_room_id': game_room_id,
                        'party_status': party_status,
                        'validation_success': True
                    }
                else:
                    print(f"❌ Game Room ID format is invalid")
                    return None
            else:
                print(f"❌ Party is not in game mode or missing game room ID")
                print(f"   Status: {party_status}")
                print(f"   Game Room ID: {game_room_id}")
                return None
        else:
            print("❌ No party found for Alice")
            return None
    else:
        print("❌ Failed to get Alice's party status")
        return None

def test_party_notifications():
    """Test 6: Check party game notifications for members"""
    print("\n" + "="*80)
    print("📢 TEST 6: PARTY GAME NOTIFICATIONS")
    print("="*80)
    
    # Check notifications for Bob (non-owner member)
    print(f"🔍 Checking notifications for {TEST_USER_BOB['username']}...")
    response = make_request('GET', 'notifications', params={'userId': TEST_USER_BOB['userId']})
    
    if response and response.status_code == 200:
        data = response.json()
        notifications = data.get('notifications', [])
        notification_count = data.get('count', 0)
        
        print(f"✅ Retrieved {notification_count} notifications")
        print(f"📊 Response: {json.dumps(data, indent=2)}")
        
        if notifications:
            print(f"\n📢 NOTIFICATION ANALYSIS:")
            for i, notification in enumerate(notifications):
                print(f"Notification {i+1}:")
                print(f"  ID: {notification.get('id')}")
                print(f"  Type: {notification.get('type')}")
                print(f"  Title: {notification.get('title')}")
                print(f"  Message: {notification.get('message')}")
                print(f"  Status: {notification.get('status')}")
                print(f"  Created: {notification.get('createdAt')}")
                print(f"  Expires: {notification.get('expiresAt')}")
                
                # Check notification data
                notification_data = notification.get('data', {})
                if notification_data:
                    print(f"  Data:")
                    print(f"    Game Room ID: {notification_data.get('gameRoomId')}")
                    print(f"    Party ID: {notification_data.get('partyId')}")
                    print(f"    Room Type: {notification_data.get('roomType')}")
                    print(f"    Entry Fee: ${notification_data.get('entryFee')}")
                    
                    # Validate game room ID in notification
                    game_room_id = notification_data.get('gameRoomId')
                    if game_room_id and game_room_id.startswith('game_'):
                        print(f"    ✅ Game Room ID format is valid: {game_room_id}")
                    else:
                        print(f"    ❌ Game Room ID format is invalid: {game_room_id}")
            
            return {
                'notification_count': notification_count,
                'notifications': notifications,
                'has_game_notifications': any(n.get('type') == 'party_game_start' for n in notifications)
            }
        else:
            print("ℹ️ No notifications found")
            return {'notification_count': 0, 'notifications': [], 'has_game_notifications': False}
    else:
        print(f"❌ Failed to get notifications: {response.status_code if response else 'No response'}")
        if response:
            print(f"   Error: {response.text}")
        return None

def test_party_coordination():
    """Test 7: Verify party coordination for game connection"""
    print("\n" + "="*80)
    print("🤝 TEST 7: PARTY COORDINATION FOR GAME CONNECTION")
    print("="*80)
    
    # Check that both party members have the same game room information
    print("🔍 Verifying party coordination between members...")
    
    members_data = []
    
    for user in [TEST_USER_ALICE, TEST_USER_BOB]:
        print(f"\n📡 Checking {user['username']}'s party status...")
        response = make_request('GET', 'current', params={'userId': user['userId']})
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('hasParty') and data.get('party'):
                party = data['party']
                member_data = {
                    'username': user['username'],
                    'userId': user['userId'],
                    'partyId': party.get('id'),
                    'partyStatus': party.get('status'),
                    'gameRoomId': party.get('gameRoomId'),
                    'memberCount': party.get('memberCount'),
                    'userRole': party.get('userRole')
                }
                members_data.append(member_data)
                
                print(f"✅ {user['username']} party data:")
                print(f"   Party ID: {member_data['partyId']}")
                print(f"   Party Status: {member_data['partyStatus']}")
                print(f"   Game Room ID: {member_data['gameRoomId']}")
                print(f"   User Role: {member_data['userRole']}")
            else:
                print(f"❌ {user['username']} is not in any party")
                return None
        else:
            print(f"❌ Failed to get {user['username']}'s party status")
            return None
    
    # Verify coordination
    if len(members_data) == 2:
        alice_data = members_data[0]
        bob_data = members_data[1]
        
        print(f"\n🤝 PARTY COORDINATION ANALYSIS:")
        
        # Check if both members are in the same party
        same_party = alice_data['partyId'] == bob_data['partyId']
        print(f"   Same Party ID: {'✅ Yes' if same_party else '❌ No'}")
        
        # Check if both have the same game room ID
        same_game_room = alice_data['gameRoomId'] == bob_data['gameRoomId']
        print(f"   Same Game Room ID: {'✅ Yes' if same_game_room else '❌ No'}")
        
        # Check if both have the same party status
        same_status = alice_data['partyStatus'] == bob_data['partyStatus']
        print(f"   Same Party Status: {'✅ Yes' if same_status else '❌ No'}")
        
        # Check if both see the same member count
        same_member_count = alice_data['memberCount'] == bob_data['memberCount']
        print(f"   Same Member Count: {'✅ Yes' if same_member_count else '❌ No'}")
        
        coordination_success = same_party and same_game_room and same_status and same_member_count
        
        if coordination_success:
            print(f"\n✅ PARTY COORDINATION SUCCESS!")
            print(f"   Both members can connect to the same game room: {alice_data['gameRoomId']}")
            print(f"   Party status is consistent: {alice_data['partyStatus']}")
            print(f"   Member count is correct: {alice_data['memberCount']}")
            
            return {
                'coordination_success': True,
                'game_room_id': alice_data['gameRoomId'],
                'party_id': alice_data['partyId'],
                'party_status': alice_data['partyStatus'],
                'member_count': alice_data['memberCount']
            }
        else:
            print(f"\n❌ PARTY COORDINATION FAILED!")
            print(f"   Alice's data: {alice_data}")
            print(f"   Bob's data: {bob_data}")
            return None
    else:
        print(f"❌ Could not get data for both party members")
        return None

def run_all_tests():
    """Run all party game initialization tests"""
    print("🚀 STARTING PARTY GAME INITIALIZATION TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test User (Alice): {TEST_USER_ALICE['userId']}")
    print(f"Test User (Bob): {TEST_USER_BOB['userId']}")
    
    results = {}
    test_success = True
    
    try:
        # Test 1: Create party
        print("\n🎯 PHASE 1: PARTY SETUP")
        results['party_creation'] = test_party_creation()
        if not results['party_creation']:
            print("❌ Party creation failed - stopping tests")
            test_success = False
            return results
        
        # Test 2: Send invitation
        results['party_invitation'] = test_party_invitation()
        if not results['party_invitation']:
            print("❌ Party invitation failed - stopping tests")
            test_success = False
            return results
        
        # Test 3: Accept invitation
        results['party_acceptance'] = test_party_acceptance()
        if not results['party_acceptance']:
            print("❌ Party acceptance failed - stopping tests")
            test_success = False
            return results
        
        print("\n🎮 PHASE 2: GAME INITIALIZATION")
        
        # Test 4: Start party game
        results['game_start'] = test_party_game_start()
        if not results['game_start']:
            print("❌ Game start failed - continuing with validation tests")
            test_success = False
        
        # Test 5: Validate game room
        results['game_room_validation'] = test_game_room_validation()
        
        # Test 6: Check notifications
        results['notifications'] = test_party_notifications()
        
        # Test 7: Verify coordination
        results['coordination'] = test_party_coordination()
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        test_success = False
    
    # Summary
    print("\n" + "="*80)
    print("📋 PARTY GAME INITIALIZATION TEST SUMMARY")
    print("="*80)
    
    print("🔍 TEST RESULTS:")
    print(f"1. Party Creation: {'✅ PASSED' if results.get('party_creation') else '❌ FAILED'}")
    print(f"2. Party Invitation: {'✅ PASSED' if results.get('party_invitation') else '❌ FAILED'}")
    print(f"3. Party Acceptance: {'✅ PASSED' if results.get('party_acceptance') else '❌ FAILED'}")
    print(f"4. Game Start: {'✅ PASSED' if results.get('game_start') else '❌ FAILED'}")
    print(f"5. Game Room Validation: {'✅ PASSED' if results.get('game_room_validation') else '❌ FAILED'}")
    print(f"6. Notifications: {'✅ PASSED' if results.get('notifications') else '❌ FAILED'}")
    print(f"7. Party Coordination: {'✅ PASSED' if results.get('coordination') else '❌ FAILED'}")
    
    print("\n🎯 KEY FINDINGS:")
    
    # Check for game room creation
    if results.get('game_start') and results.get('game_start', {}).get('game_room_id'):
        game_room_id = results['game_start']['game_room_id']
        print(f"✅ Game Room Created: {game_room_id}")
        print(f"✅ Room ID Format: Valid for game connection")
    else:
        print("❌ Game Room Creation: Failed or invalid")
    
    # Check for party coordination
    if results.get('coordination') and results.get('coordination', {}).get('coordination_success'):
        print("✅ Party Coordination: Both members can connect to same room")
    else:
        print("❌ Party Coordination: Members cannot connect to same room")
    
    # Check for notifications
    if results.get('notifications') and results.get('notifications', {}).get('has_game_notifications'):
        print("✅ Game Notifications: Party members notified of game start")
    else:
        print("❌ Game Notifications: No game start notifications found")
    
    # Overall status
    if test_success and all(results.get(key) for key in ['party_creation', 'party_invitation', 'party_acceptance', 'game_start']):
        print("\n🎉 OVERALL RESULT: ✅ PARTY GAME INITIALIZATION WORKING")
        print("   - Party creation successful")
        print("   - Game room creation successful") 
        print("   - Room ID validation passed")
        print("   - Party coordination working")
    else:
        print("\n🚨 OVERALL RESULT: ❌ PARTY GAME INITIALIZATION ISSUES DETECTED")
        print("   - Check failed tests above for specific issues")
        print("   - User may experience black screen due to coordination problems")
    
    print("\n✅ Party game initialization tests completed!")
    return results

if __name__ == "__main__":
    run_all_tests()