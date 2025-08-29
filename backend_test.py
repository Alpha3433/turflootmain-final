#!/usr/bin/env python3
"""
Backend Testing for Party Member Auto-Join Issue
Testing the complete matchmaking flow for party notifications
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://party-lobby-system.preview.emergentagent.com"
LOCALHOST_URL = "http://localhost:3000"

# Real User IDs from review request - using modified IDs to avoid conflicts
ANTH_USER_ID = "did:privy:cmeksdeoe00gzl10bsienvnbk_test"
ROBIEE_USER_ID = "did:privy:cme20s0fl005okz0bmxcr0cp0_test"

class PartyAutoJoinTester:
    def __init__(self):
        self.base_url = LOCALHOST_URL  # Use localhost due to 502 issues on preview
        self.test_results = []
        self.party_id = None
        self.game_room_id = None
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'success': success,
            'details': details,
            'response_time': f"{response_time:.3f}s",
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} {test_name}: {details} ({response_time:.3f}s)")
        return success

    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, params=params, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                return True, response.json(), response_time
            else:
                return False, {
                    'error': f"HTTP {response.status_code}",
                    'text': response.text[:200]
                }, response_time
                
        except requests.exceptions.RequestException as e:
            response_time = time.time() - start_time
            return False, {'error': str(e)}, response_time

    def test_1_party_setup_with_real_users(self):
        """Test 1: Party Setup with Real Users"""
        print("\n🎯 TEST 1: PARTY SETUP WITH REAL USERS")
        
        # Step 1.0: Clean up any existing parties first
        success, response, rt = self.make_request('GET', '/party-api/current', 
                                                params={'userId': ANTH_USER_ID})
        
        if success and response.get('hasParty'):
            existing_party = response.get('party')
            if existing_party:
                party_id = existing_party.get('id')
                self.log_test("Found Existing Party", True, 
                             f"Cleaning up existing party: {party_id}", rt)
                
                # Leave existing party
                leave_success, leave_response, leave_rt = self.make_request('POST', '/party-api/leave', {
                    'partyId': party_id,
                    'userId': ANTH_USER_ID
                })
                
                if leave_success:
                    self.log_test("Clean Up Existing Party", True, 
                                 f"Left existing party successfully", leave_rt)
                else:
                    self.log_test("Clean Up Existing Party", False, 
                                 f"Failed to leave: {leave_response.get('error', 'Unknown')}", leave_rt)
        
        # Also clean up ROBIEE's parties
        success, response, rt = self.make_request('GET', '/party-api/current', 
                                                params={'userId': ROBIEE_USER_ID})
        
        if success and response.get('hasParty'):
            existing_party = response.get('party')
            if existing_party:
                party_id = existing_party.get('id')
                leave_success, leave_response, leave_rt = self.make_request('POST', '/party-api/leave', {
                    'partyId': party_id,
                    'userId': ROBIEE_USER_ID
                })
                
                if leave_success:
                    self.log_test("Clean Up ROBIEE's Party", True, 
                                 f"Left ROBIEE's existing party", leave_rt)
        
        # Brief pause for database consistency
        time.sleep(1)
        
        # Step 1.1: Create party with ANTH as owner
        success, response, rt = self.make_request('POST', '/party-api/create', {
            'ownerId': ANTH_USER_ID,
            'ownerUsername': 'ANTH',
            'partyName': 'Auto-Join Test Party'
        })
        
        if success and response.get('success'):
            self.party_id = response.get('partyId')
            self.log_test("Create Party with ANTH", True, 
                         f"Party created: {self.party_id}", rt)
        else:
            return self.log_test("Create Party with ANTH", False, 
                               f"Failed: {response.get('error', 'Unknown error')}", rt)
        
        # Step 1.2: Verify party has exactly 1 member initially
        success, response, rt = self.make_request('GET', '/party-api/current', 
                                                params={'userId': ANTH_USER_ID})
        
        if success and response.get('hasParty') and response.get('party'):
            party = response['party']
            member_count = party.get('memberCount', 0)
            max_members = party.get('maxMembers', 0)
            
            if member_count == 1 and max_members == 2:
                self.log_test("Verify Party Structure", True, 
                             f"Party has {member_count}/{max_members} members", rt)
            else:
                return self.log_test("Verify Party Structure", False, 
                                   f"Expected 1/2 members, got {member_count}/{max_members}", rt)
        else:
            return self.log_test("Verify Party Structure", False, 
                               f"Party not found: {response.get('error', 'Unknown')}", rt)
        
        # Step 1.3: Add ROBIEE as member
        success, response, rt = self.make_request('POST', '/party-api/invite', {
            'partyId': self.party_id,
            'fromUserId': ANTH_USER_ID,
            'toUserId': ROBIEE_USER_ID,
            'toUsername': 'ROBIEE'
        })
        
        if success and response.get('success'):
            invitation_id = response.get('invitationId')
            self.log_test("Send Invitation to ROBIEE", True, 
                         f"Invitation sent: {invitation_id}", rt)
        else:
            return self.log_test("Send Invitation to ROBIEE", False, 
                               f"Failed: {response.get('error', 'Unknown error')}", rt)
        
        # Step 1.4: Accept invitation as ROBIEE
        success, response, rt = self.make_request('POST', '/party-api/accept-invitation', {
            'invitationId': invitation_id,
            'userId': ROBIEE_USER_ID
        })
        
        if success and response.get('success'):
            member_count = response.get('memberCount', 0)
            self.log_test("Accept Invitation as ROBIEE", True, 
                         f"Party now has {member_count} members", rt)
        else:
            return self.log_test("Accept Invitation as ROBIEE", False, 
                               f"Failed: {response.get('error', 'Unknown error')}", rt)
        
        # Step 1.5: Verify party has exactly 2 members
        success, response, rt = self.make_request('GET', '/party-api/current', 
                                                params={'userId': ANTH_USER_ID})
        
        if success and response.get('hasParty') and response.get('party'):
            party = response['party']
            member_count = party.get('memberCount', 0)
            members = party.get('members', [])
            
            if member_count == 2 and len(members) == 2:
                member_names = [m.get('username', 'Unknown') for m in members]
                return self.log_test("Verify 2-Member Party", True, 
                                   f"Party complete with members: {', '.join(member_names)}", rt)
            else:
                return self.log_test("Verify 2-Member Party", False, 
                                   f"Expected 2 members, got {member_count}", rt)
        else:
            return self.log_test("Verify 2-Member Party", False, 
                               f"Party verification failed: {response.get('error', 'Unknown')}", rt)

    def test_2_game_start_notification_creation(self):
        """Test 2: Game Start Notification Creation"""
        print("\n🎯 TEST 2: GAME START NOTIFICATION CREATION")
        
        if not self.party_id:
            return self.log_test("Game Start - Party Required", False, 
                               "No party ID available from previous test", 0)
        
        # Step 2.1: Start game with party owner (ANTH) - Practice room
        success, response, rt = self.make_request('POST', '/party-api/start-game', {
            'partyId': self.party_id,
            'roomType': 'practice',
            'entryFee': 0,
            'ownerId': ANTH_USER_ID
        })
        
        if success and response.get('success'):
            self.game_room_id = response.get('gameRoomId')
            party_members = response.get('partyMembers', [])
            notifications_created = response.get('notificationsCreated', 0)
            
            self.log_test("Start Practice Game", True, 
                         f"Game room created: {self.game_room_id}, {notifications_created} notifications", rt)
            
            # Verify game room data
            if self.game_room_id and len(party_members) == 2:
                self.log_test("Game Room Data Verification", True, 
                             f"Room: {self.game_room_id}, Members: {len(party_members)}", rt)
            else:
                return self.log_test("Game Room Data Verification", False, 
                                   f"Invalid game room data", rt)
        else:
            return self.log_test("Start Practice Game", False, 
                               f"Failed: {response.get('error', 'Unknown error')}", rt)
        
        # Step 2.2: Verify party_notifications were created for ROBIEE
        # Note: This is the CRITICAL test - checking if notifications are created
        time.sleep(0.5)  # Brief delay to ensure database consistency
        
        success, response, rt = self.make_request('GET', '/party-api/notifications', 
                                                params={'userId': ROBIEE_USER_ID})
        
        if success and response.get('success'):
            notifications = response.get('notifications', [])
            count = response.get('count', 0)
            
            if count > 0 and len(notifications) > 0:
                # Check notification structure
                notification = notifications[0]
                notification_type = notification.get('type')
                notification_data = notification.get('data', {})
                
                if notification_type == 'party_game_start':
                    game_room_in_notification = notification_data.get('gameRoomId')
                    room_type_in_notification = notification_data.get('roomType')
                    
                    if game_room_in_notification == self.game_room_id and room_type_in_notification == 'practice':
                        return self.log_test("CRITICAL: Party Notifications Created", True, 
                                           f"Found {count} notifications with correct game room data", rt)
                    else:
                        return self.log_test("CRITICAL: Party Notifications Created", False, 
                                           f"Notification data mismatch: room {game_room_in_notification} vs {self.game_room_id}", rt)
                else:
                    return self.log_test("CRITICAL: Party Notifications Created", False, 
                                       f"Wrong notification type: {notification_type}", rt)
            else:
                return self.log_test("CRITICAL: Party Notifications Created", False, 
                                   f"No notifications found for ROBIEE (count: {count})", rt)
        else:
            return self.log_test("CRITICAL: Party Notifications Created", False, 
                               f"Failed to fetch notifications: {response.get('error', 'Unknown')}", rt)

    def test_3_notification_retrieval_for_party_member(self):
        """Test 3: Notification Retrieval for Party Member"""
        print("\n🎯 TEST 3: NOTIFICATION RETRIEVAL FOR PARTY MEMBER")
        
        # Step 3.1: Test GET /party-api/notifications for ROBIEE
        success, response, rt = self.make_request('GET', '/party-api/notifications', 
                                                params={'userId': ROBIEE_USER_ID})
        
        if success and response.get('success'):
            notifications = response.get('notifications', [])
            count = response.get('count', 0)
            
            if count > 0:
                self.log_test("ROBIEE Can See Notifications", True, 
                             f"Retrieved {count} notifications successfully", rt)
            else:
                return self.log_test("ROBIEE Can See Notifications", False, 
                                   f"No notifications found for ROBIEE", rt)
        else:
            return self.log_test("ROBIEE Can See Notifications", False, 
                               f"Failed: {response.get('error', 'Unknown error')}", rt)
        
        # Step 3.2: Verify notification data structure and expiration
        if notifications:
            notification = notifications[0]
            required_fields = ['id', 'type', 'title', 'message', 'data', 'status', 'createdAt', 'expiresAt']
            missing_fields = [field for field in required_fields if field not in notification]
            
            if not missing_fields:
                self.log_test("Notification Structure Complete", True, 
                             f"All required fields present: {', '.join(required_fields)}", rt)
            else:
                return self.log_test("Notification Structure Complete", False, 
                                   f"Missing fields: {', '.join(missing_fields)}", rt)
            
            # Check expiration time
            expires_at = notification.get('expiresAt')
            created_at = notification.get('createdAt')
            
            if expires_at and created_at:
                self.log_test("Notification Expiration Times", True, 
                             f"Created: {created_at}, Expires: {expires_at}", rt)
            else:
                return self.log_test("Notification Expiration Times", False, 
                                   f"Missing time fields", rt)
        
        return True

    def test_4_auto_join_data_verification(self):
        """Test 4: Auto-Join Data Verification"""
        print("\n🎯 TEST 4: AUTO-JOIN DATA VERIFICATION")
        
        # Step 4.1: Get notifications for ROBIEE and verify auto-join data
        success, response, rt = self.make_request('GET', '/party-api/notifications', 
                                                params={'userId': ROBIEE_USER_ID})
        
        if not success or not response.get('success'):
            return self.log_test("Auto-Join Data Fetch", False, 
                               f"Failed to fetch notifications: {response.get('error', 'Unknown')}", rt)
        
        notifications = response.get('notifications', [])
        if not notifications:
            return self.log_test("Auto-Join Data Fetch", False, 
                               f"No notifications available for verification", rt)
        
        notification = notifications[0]
        notification_data = notification.get('data', {})
        
        # Step 4.2: Verify notification includes required auto-join fields
        required_auto_join_fields = ['gameRoomId', 'partyId', 'roomType', 'entryFee']
        missing_fields = [field for field in required_auto_join_fields if field not in notification_data]
        
        if not missing_fields:
            self.log_test("Auto-Join Fields Present", True, 
                         f"All required fields: {', '.join(required_auto_join_fields)}", rt)
        else:
            return self.log_test("Auto-Join Fields Present", False, 
                               f"Missing auto-join fields: {', '.join(missing_fields)}", rt)
        
        # Step 4.3: Verify field values are correct
        game_room_id = notification_data.get('gameRoomId')
        party_id = notification_data.get('partyId')
        room_type = notification_data.get('roomType')
        entry_fee = notification_data.get('entryFee')
        party_members = notification_data.get('partyMembers', [])
        
        if game_room_id == self.game_room_id:
            self.log_test("Game Room ID Match", True, 
                         f"Notification gameRoomId matches: {game_room_id}", rt)
        else:
            return self.log_test("Game Room ID Match", False, 
                               f"Mismatch: {game_room_id} vs {self.game_room_id}", rt)
        
        if party_id == self.party_id:
            self.log_test("Party ID Match", True, 
                         f"Notification partyId matches: {party_id}", rt)
        else:
            return self.log_test("Party ID Match", False, 
                               f"Mismatch: {party_id} vs {self.party_id}", rt)
        
        if room_type == 'practice':
            self.log_test("Room Type Correct", True, 
                         f"Room type is 'practice' as expected", rt)
        else:
            return self.log_test("Room Type Correct", False, 
                               f"Expected 'practice', got '{room_type}'", rt)
        
        if entry_fee == 0:
            self.log_test("Entry Fee Correct", True, 
                         f"Entry fee is 0 for practice room", rt)
        else:
            return self.log_test("Entry Fee Correct", False, 
                               f"Expected 0, got {entry_fee}", rt)
        
        # Step 4.4: Verify party member data is complete
        if len(party_members) == 2:
            member_usernames = [m.get('username', 'Unknown') for m in party_members]
            if 'ANTH' in member_usernames and 'ROBIEE' in member_usernames:
                self.log_test("Party Member Data Complete", True, 
                             f"Both members present: {', '.join(member_usernames)}", rt)
            else:
                return self.log_test("Party Member Data Complete", False, 
                                   f"Missing expected members: {member_usernames}", rt)
        else:
            return self.log_test("Party Member Data Complete", False, 
                               f"Expected 2 members, got {len(party_members)}", rt)
        
        return True

    def test_5_notification_marking_as_seen(self):
        """Test 5: Test notification marking as seen"""
        print("\n🎯 TEST 5: NOTIFICATION MARKING AS SEEN")
        
        # Step 5.1: Get current notifications
        success, response, rt = self.make_request('GET', '/party-api/notifications', 
                                                params={'userId': ROBIEE_USER_ID})
        
        if not success or not response.get('success'):
            return self.log_test("Get Notifications for Marking", False, 
                               f"Failed: {response.get('error', 'Unknown')}", rt)
        
        notifications = response.get('notifications', [])
        if not notifications:
            return self.log_test("Get Notifications for Marking", False, 
                               f"No notifications to mark as seen", rt)
        
        notification = notifications[0]
        notification_id = notification.get('id')
        current_status = notification.get('status')
        
        self.log_test("Get Notification for Marking", True, 
                     f"Found notification {notification_id} with status '{current_status}'", rt)
        
        # Step 5.2: Mark notification as seen
        success, response, rt = self.make_request('POST', '/party-api/mark-notification-seen', {
            'notificationId': notification_id,
            'userId': ROBIEE_USER_ID
        })
        
        if success and response.get('success'):
            self.log_test("Mark Notification as Seen", True, 
                         f"Notification {notification_id} marked as seen", rt)
        else:
            return self.log_test("Mark Notification as Seen", False, 
                               f"Failed: {response.get('error', 'Unknown error')}", rt)
        
        # Step 5.3: Verify notification status changed
        time.sleep(0.2)  # Brief delay for database update
        
        success, response, rt = self.make_request('GET', '/party-api/notifications', 
                                                params={'userId': ROBIEE_USER_ID})
        
        if success and response.get('success'):
            updated_notifications = response.get('notifications', [])
            if updated_notifications:
                updated_notification = next((n for n in updated_notifications if n.get('id') == notification_id), None)
                if updated_notification:
                    new_status = updated_notification.get('status')
                    if new_status == 'seen':
                        return self.log_test("Verify Notification Status Update", True, 
                                           f"Status updated from '{current_status}' to '{new_status}'", rt)
                    else:
                        return self.log_test("Verify Notification Status Update", False, 
                                           f"Status not updated: still '{new_status}'", rt)
                else:
                    return self.log_test("Verify Notification Status Update", False, 
                                       f"Notification {notification_id} not found after update", rt)
            else:
                return self.log_test("Verify Notification Status Update", False, 
                                   f"No notifications found after marking as seen", rt)
        else:
            return self.log_test("Verify Notification Status Update", False, 
                               f"Failed to verify update: {response.get('error', 'Unknown')}", rt)

    def test_6_complete_flow_debug(self):
        """Test 6: Complete Flow Debug - Identify where the flow breaks"""
        print("\n🎯 TEST 6: COMPLETE FLOW DEBUG")
        
        # Step 6.1: Verify owner can see their party in correct state
        success, response, rt = self.make_request('GET', '/party-api/current', 
                                                params={'userId': ANTH_USER_ID})
        
        if success and response.get('hasParty'):
            party = response.get('party', {})
            party_status = party.get('status', 'unknown')
            game_room_id = party.get('gameRoomId')
            
            if party_status == 'in_game' and game_room_id:
                self.log_test("Owner Party State", True, 
                             f"Party status: {party_status}, Game room: {game_room_id}", rt)
            else:
                return self.log_test("Owner Party State", False, 
                                   f"Unexpected party state: {party_status}, room: {game_room_id}", rt)
        else:
            return self.log_test("Owner Party State", False, 
                               f"Owner cannot see party: {response.get('error', 'Unknown')}", rt)
        
        # Step 6.2: Verify member can see the same party state
        success, response, rt = self.make_request('GET', '/party-api/current', 
                                                params={'userId': ROBIEE_USER_ID})
        
        if success and response.get('hasParty'):
            party = response.get('party', {})
            party_status = party.get('status', 'unknown')
            game_room_id = party.get('gameRoomId')
            
            if party_status == 'in_game' and game_room_id == self.game_room_id:
                self.log_test("Member Party State", True, 
                             f"Member sees same party state: {party_status}, room: {game_room_id}", rt)
            else:
                return self.log_test("Member Party State", False, 
                                   f"Member party state mismatch: {party_status}, room: {game_room_id}", rt)
        else:
            return self.log_test("Member Party State", False, 
                               f"Member cannot see party: {response.get('error', 'Unknown')}", rt)
        
        # Step 6.3: Check if notifications are still available and valid
        success, response, rt = self.make_request('GET', '/party-api/notifications', 
                                                params={'userId': ROBIEE_USER_ID})
        
        if success and response.get('success'):
            notifications = response.get('notifications', [])
            active_notifications = [n for n in notifications if n.get('status') in ['pending', 'seen']]
            
            if active_notifications:
                notification = active_notifications[0]
                expires_at = notification.get('expiresAt')
                current_time = datetime.now().isoformat()
                
                if expires_at > current_time:
                    self.log_test("Notification Still Valid", True, 
                                 f"Notification expires at {expires_at} (current: {current_time})", rt)
                else:
                    return self.log_test("Notification Still Valid", False, 
                                       f"Notification expired: {expires_at} < {current_time}", rt)
            else:
                return self.log_test("Notification Still Valid", False, 
                                   f"No active notifications found", rt)
        else:
            return self.log_test("Notification Still Valid", False, 
                               f"Failed to check notifications: {response.get('error', 'Unknown')}", rt)
        
        # Step 6.4: Test the complete auto-join flow simulation
        print("\n📋 COMPLETE AUTO-JOIN FLOW ANALYSIS:")
        print("1. ✅ Owner starts game → Game room created")
        print("2. ✅ Notification created → Party member gets notification")
        print("3. ✅ Member gets notification → Auto-join data available")
        print("4. 🔍 FRONTEND INTEGRATION → This is where the issue likely occurs")
        print("   - Frontend should poll for notifications")
        print("   - Frontend should automatically redirect member to game room")
        print("   - Frontend should use gameRoomId from notification data")
        
        return self.log_test("Complete Flow Analysis", True, 
                           f"Backend notification system working, issue likely in frontend auto-join logic", rt)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 STARTING PARTY MEMBER AUTO-JOIN BACKEND TESTING")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"👥 Test Users: ANTH ({ANTH_USER_ID[:20]}...), ROBIEE ({ROBIEE_USER_ID[:20]}...)")
        print("=" * 80)
        
        # Run tests in sequence
        tests = [
            self.test_1_party_setup_with_real_users,
            self.test_2_game_start_notification_creation,
            self.test_3_notification_retrieval_for_party_member,
            self.test_4_auto_join_data_verification,
            self.test_5_notification_marking_as_seen,
            self.test_6_complete_flow_debug
        ]
        
        for test_func in tests:
            try:
                result = test_func()
                if not result:
                    print(f"\n❌ Test failed: {test_func.__name__}")
                    break
            except Exception as e:
                self.log_test(f"{test_func.__name__} Exception", False, str(e), 0)
                print(f"\n💥 Exception in {test_func.__name__}: {e}")
                break
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("🎯 PARTY MEMBER AUTO-JOIN TESTING SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 RESULTS: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}% success rate)")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['details']}")
        
        print(f"\n🔍 CRITICAL FINDINGS:")
        
        # Check for critical notification issues
        notification_tests = [r for r in self.test_results if 'notification' in r['test'].lower()]
        notification_failures = [r for r in notification_tests if not r['success']]
        
        if notification_failures:
            print(f"   ❌ NOTIFICATION SYSTEM ISSUES DETECTED:")
            for failure in notification_failures:
                print(f"      • {failure['test']}: {failure['details']}")
        else:
            print(f"   ✅ NOTIFICATION SYSTEM: Working correctly")
        
        # Check for auto-join data issues
        auto_join_tests = [r for r in self.test_results if 'auto-join' in r['test'].lower()]
        auto_join_failures = [r for r in auto_join_tests if not r['success']]
        
        if auto_join_failures:
            print(f"   ❌ AUTO-JOIN DATA ISSUES DETECTED:")
            for failure in auto_join_failures:
                print(f"      • {failure['test']}: {failure['details']}")
        else:
            print(f"   ✅ AUTO-JOIN DATA: Complete and correct")
        
        print(f"\n🎮 GAME ROOM INFO:")
        if self.game_room_id:
            print(f"   • Game Room ID: {self.game_room_id}")
            print(f"   • Room Type: practice")
            print(f"   • Entry Fee: $0")
        else:
            print(f"   • No game room created")
        
        print(f"\n🎉 PARTY INFO:")
        if self.party_id:
            print(f"   • Party ID: {self.party_id}")
            print(f"   • Members: ANTH (owner), ROBIEE (member)")
        else:
            print(f"   • No party created")

if __name__ == "__main__":
    tester = PartyAutoJoinTester()
    tester.run_all_tests()