#!/usr/bin/env python3
"""
Backend Testing Script for Server Browser Mock Data Removal and Real Player Tracking
Testing the transition from mock data to real database-driven player counts
"""

import requests
import json
import time
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/api"

print(f"🎯 TESTING SERVER BROWSER MOCK DATA REMOVAL AND REAL PLAYER TRACKING")
print(f"🔗 API Base URL: {API_BASE}")
print(f"📅 Test Started: {datetime.now().isoformat()}")
print("=" * 80)

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
            self.test_6_bob_notification_retrieval
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