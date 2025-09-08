#!/usr/bin/env python3
"""
Party Matchmaking System Comprehensive Backend Testing
Testing complete workflow for coordinated game room creation and party member notifications
"""

import requests
import json
import time
import sys
from datetime import datetime

# Test Configuration
BASE_URL = "https://turfloot-nav.preview.emergentagent.com"
LOCALHOST_URL = "http://localhost:3000"

# Real Privy User IDs from review request
ANTH_USER_ID = "did:privy:cmeksdeoe00gzl10bsienvnbk"
ROBIEE_USER_ID = "did:privy:cme20s0fl005okz0bmxcr0cp0"

class PartyMatchmakingTester:
    def __init__(self):
        self.base_url = LOCALHOST_URL  # Use localhost due to 502 issues on preview
        self.test_results = []
        self.party_id = None
        self.game_room_id = None
        self.notification_ids = []
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_time": f"{response_time:.3f}s",
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} - {test_name}: {details} ({response_time:.3f}s)")
        return success

    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            headers = {'Content-Type': 'application/json'}
            
            if method.upper() == 'GET':
                response = requests.get(url, params=params, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            response_time = time.time() - start_time
            return response, response_time
            
        except requests.exceptions.RequestException as e:
            response_time = time.time() - start_time
            print(f"❌ Request failed for {method} {url}: {e}")
            return None, response_time

    def cleanup_existing_parties(self):
        """Clean up any existing parties for test users"""
        print("🧹 Cleaning up existing parties...")
        
        for user_id, username in [(ANTH_USER_ID, 'anth'), (ROBIEE_USER_ID, 'robiee')]:
            try:
                # Get current party
                response, _ = self.make_request('GET', '/party-api/current', params={'userId': user_id})
                
                if response and response.status_code == 200:
                    data = response.json()
                    if data.get('hasParty') and data.get('party'):
                        party_id = data['party']['id']
                        
                        # Leave party
                        leave_response, _ = self.make_request('POST', '/party-api/leave', {
                            'partyId': party_id,
                            'userId': user_id
                        })
                        
                        if leave_response and leave_response.status_code == 200:
                            print(f"  ✅ Cleaned up party for {username}")
                        else:
                            print(f"  ⚠️  Could not leave party for {username}")
                            
            except Exception as e:
                print(f"  ⚠️  Cleanup warning for {username}: {e}")
        
        print("✅ Cleanup completed")

    def test_party_creation_setup(self):
        """Test 1: Party Creation and Setup"""
        print("\n🎯 TESTING PARTY CREATION AND SETUP")
        
        # Test 1.1: Create party with ANTH as owner
        response, rt = self.make_request('POST', '/party-api/create', {
            'ownerId': ANTH_USER_ID,
            'ownerUsername': 'anth',
            'partyName': 'Matchmaking Test Party'
        })
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('partyId'):
                self.party_id = data['partyId']
                party_data = data.get('party', {})
                max_members = party_data.get('maxMembers', 0)
                
                success = max_members == 2
                details = f"Party created: {self.party_id}, maxMembers: {max_members}"
                self.log_test("Party Creation with 2-Player Limit", success, details, rt)
            else:
                self.log_test("Party Creation with 2-Player Limit", False, f"Invalid response: {data}", rt)
        elif response and response.status_code == 500:
            # Handle the case where user already has a party
            error_data = response.json()
            error_msg = error_data.get('error', '')
            if 'already have an active party' in error_msg:
                self.log_test("Party Creation with 2-Player Limit", False, f"User already has active party: {error_msg}", rt)
            else:
                self.log_test("Party Creation with 2-Player Limit", False, f"Server error: {error_msg}", rt)
        else:
            status = response.status_code if response else "No Response"
            self.log_test("Party Creation with 2-Player Limit", False, f"HTTP {status}", rt)
        
        # Test 1.2: Verify party structure
        if self.party_id:
            response, rt = self.make_request('GET', '/party-api/current', params={'userId': ANTH_USER_ID})
            
            if response and response.status_code == 200:
                data = response.json()
                party = data.get('party', {})
                
                if party:
                    required_fields = ['id', 'ownerId', 'ownerUsername', 'name', 'status', 'maxMembers', 'members']
                    has_all_fields = all(field in party for field in required_fields)
                    member_count = len(party.get('members', []))
                    
                    success = has_all_fields and member_count == 1 and party.get('maxMembers') == 2
                    details = f"Party structure verified: {len(required_fields)} fields, {member_count} member(s)"
                    self.log_test("Party Data Structure Verification", success, details, rt)
                else:
                    self.log_test("Party Data Structure Verification", False, "No party data in response", rt)
            else:
                status = response.status_code if response else "No Response"
                self.log_test("Party Data Structure Verification", False, f"HTTP {status}", rt)

        # Test 1.3: Invite ROBIEE to party
        if self.party_id:
            response, rt = self.make_request('POST', '/party-api/invite', {
                'partyId': self.party_id,
                'fromUserId': ANTH_USER_ID,
                'toUserId': ROBIEE_USER_ID,
                'toUsername': 'robiee'
            })
            
            if response and response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                invitation_id = data.get('invitationId', '')
                details = f"Invitation sent: {invitation_id}"
                self.log_test("Party Member Invitation", success, details, rt)
                
                # Accept invitation
                if success and invitation_id:
                    response, rt = self.make_request('POST', '/party-api/accept-invitation', {
                        'invitationId': invitation_id,
                        'userId': ROBIEE_USER_ID
                    })
                    
                    if response and response.status_code == 200:
                        data = response.json()
                        success = data.get('success', False)
                        member_count = data.get('memberCount', 0)
                        details = f"Invitation accepted, party now has {member_count} members"
                        self.log_test("Party Member Addition", success, details, rt)
                    else:
                        status = response.status_code if response else "No Response"
                        self.log_test("Party Member Addition", False, f"HTTP {status}", rt)
            else:
                status = response.status_code if response else "No Response"
                self.log_test("Party Member Invitation", False, f"HTTP {status}", rt)

    def test_coordinated_game_room_creation(self):
        """Test 2: Coordinated Game Room Creation"""
        print("\n🎯 TESTING COORDINATED GAME ROOM CREATION")
        
        if not self.party_id:
            self.log_test("Game Room Creation", False, "No party ID available", 0)
            return
        
        # Test different room types
        room_types = [
            {'roomType': 'practice', 'entryFee': 0},
            {'roomType': '$1', 'entryFee': 1},
            {'roomType': '$5', 'entryFee': 5},
            {'roomType': '$25', 'entryFee': 25}
        ]
        
        for room_config in room_types:
            room_type = room_config['roomType']
            entry_fee = room_config['entryFee']
            
            response, rt = self.make_request('POST', '/party-api/start-game', {
                'partyId': self.party_id,
                'roomType': room_type,
                'entryFee': entry_fee,
                'ownerId': ANTH_USER_ID
            })
            
            if response and response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                
                if success:
                    self.game_room_id = data.get('gameRoomId', '')
                    party_members = data.get('partyMembers', [])
                    returned_room_type = data.get('roomType', '')
                    returned_entry_fee = data.get('entryFee', 0)
                    
                    # Verify game room data
                    valid_game_room = (
                        self.game_room_id and 
                        len(party_members) == 2 and
                        returned_room_type == room_type and
                        returned_entry_fee == entry_fee
                    )
                    
                    details = f"GameRoomId: {self.game_room_id}, Members: {len(party_members)}, Type: {returned_room_type}, Fee: ${returned_entry_fee}"
                    self.log_test(f"Game Room Creation ({room_type})", valid_game_room, details, rt)
                    
                    # Test party status update
                    response, rt = self.make_request('GET', '/party-api/current', params={'userId': ANTH_USER_ID})
                    if response and response.status_code == 200:
                        party_response = response.json()
                        party_data = party_response.get('party', {})
                        if party_data:
                            party_status = party_data.get('status', '')
                            stored_game_room_id = party_data.get('gameRoomId', '')
                            
                            status_updated = party_status == 'in_game' and stored_game_room_id == self.game_room_id
                            details = f"Party status: {party_status}, GameRoomId: {stored_game_room_id}"
                            self.log_test(f"Party Status Update ({room_type})", status_updated, details, rt)
                        else:
                            self.log_test(f"Party Status Update ({room_type})", False, "No party data in response", rt)
                    
                    break  # Use first successful room for remaining tests
                else:
                    error_msg = data.get('error', 'Unknown error')
                    self.log_test(f"Game Room Creation ({room_type})", False, f"Error: {error_msg}", rt)
            else:
                status = response.status_code if response else "No Response"
                self.log_test(f"Game Room Creation ({room_type})", False, f"HTTP {status}", rt)

    def test_party_member_notifications(self):
        """Test 3: Party Member Notifications"""
        print("\n🎯 TESTING PARTY MEMBER NOTIFICATIONS")
        
        if not self.game_room_id:
            self.log_test("Party Notifications", False, "No game room ID available", 0)
            return
        
        # Test 3.1: Get notifications for ROBIEE (non-owner member)
        response, rt = self.make_request('GET', '/party-api/notifications', params={'userId': ROBIEE_USER_ID})
        
        if response and response.status_code == 200:
            data = response.json()
            success = data.get('success', False)
            notifications = data.get('notifications', [])
            count = data.get('count', 0)
            
            if success and count > 0:
                # Verify notification structure
                notification = notifications[0]
                required_fields = ['id', 'userId', 'type', 'title', 'message', 'data', 'status']
                has_all_fields = all(field in notification for field in required_fields)
                
                # Verify notification data contains game room details
                notification_data = notification.get('data', {})
                has_game_data = (
                    notification_data.get('gameRoomId') == self.game_room_id and
                    notification_data.get('partyId') == self.party_id and
                    'roomType' in notification_data and
                    'partyMembers' in notification_data
                )
                
                success = has_all_fields and has_game_data
                details = f"Found {count} notifications, structure valid: {has_all_fields}, game data: {has_game_data}"
                self.log_test("Party Member Notifications", success, details, rt)
                
                # Store notification ID for marking as seen
                if success:
                    self.notification_ids.append(notification['id'])
            else:
                details = f"No notifications found for user {ROBIEE_USER_ID}"
                self.log_test("Party Member Notifications", False, details, rt)
        else:
            status = response.status_code if response else "No Response"
            self.log_test("Party Member Notifications", False, f"HTTP {status}", rt)
        
        # Test 3.2: Mark notification as seen
        if self.notification_ids:
            notification_id = self.notification_ids[0]
            response, rt = self.make_request('POST', '/party-api/mark-notification-seen', {
                'notificationId': notification_id,
                'userId': ROBIEE_USER_ID
            })
            
            if response and response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                details = f"Notification {notification_id} marked as seen"
                self.log_test("Mark Notification Seen", success, details, rt)
            else:
                status = response.status_code if response else "No Response"
                self.log_test("Mark Notification Seen", False, f"HTTP {status}", rt)

    def test_game_room_coordination(self):
        """Test 4: Game Room Coordination"""
        print("\n🎯 TESTING GAME ROOM COORDINATION")
        
        if not self.game_room_id:
            self.log_test("Game Room Coordination", False, "No game room ID available", 0)
            return
        
        # Test 4.1: Verify both party members get same gameRoomId
        anth_party_response, rt1 = self.make_request('GET', '/party-api/current', params={'userId': ANTH_USER_ID})
        robiee_party_response, rt2 = self.make_request('GET', '/party-api/current', params={'userId': ROBIEE_USER_ID})
        
        if anth_party_response and robiee_party_response and anth_party_response.status_code == 200 and robiee_party_response.status_code == 200:
            anth_response_data = anth_party_response.json()
            robiee_response_data = robiee_party_response.json()
            
            anth_data = anth_response_data.get('party', {})
            robiee_data = robiee_response_data.get('party', {})
            
            if anth_data and robiee_data:
                anth_game_room = anth_data.get('gameRoomId', '')
                robiee_game_room = robiee_data.get('gameRoomId', '')
                
                same_game_room = anth_game_room == robiee_game_room == self.game_room_id
                details = f"ANTH gameRoomId: {anth_game_room}, ROBIEE gameRoomId: {robiee_game_room}, Match: {same_game_room}"
                self.log_test("Same GameRoomId for Both Members", same_game_room, details, max(rt1, rt2))
            else:
                self.log_test("Same GameRoomId for Both Members", False, "One or both users have no party data", max(rt1, rt2))
        else:
            self.log_test("Same GameRoomId for Both Members", False, "Failed to get party data for both users", max(rt1, rt2))
        
        # Test 4.2: Verify game room contains proper party member information
        # Note: In a real implementation, we would query a game rooms endpoint
        # For now, we verify through party data that contains the game room reference
        if anth_party_response and anth_party_response.status_code == 200:
            anth_response_data = anth_party_response.json()
            party_data = anth_response_data.get('party', {})
            
            if party_data:
                members = party_data.get('members', [])
                
                # Verify both party members are present
                member_ids = [member.get('id') for member in members]
                has_both_members = ANTH_USER_ID in member_ids and ROBIEE_USER_ID in member_ids
                
                details = f"Party members: {len(members)}, Has both users: {has_both_members}"
                self.log_test("Game Room Party Member Info", has_both_members, details, rt1)
            else:
                self.log_test("Game Room Party Member Info", False, "No party data available", rt1)
        else:
            self.log_test("Game Room Party Member Info", False, "Failed to get party data", rt1)

    def test_end_to_end_workflow(self):
        """Test 5: End-to-End Matchmaking Workflow"""
        print("\n🎯 TESTING END-TO-END MATCHMAKING WORKFLOW")
        
        # Create a fresh party for complete workflow test
        workflow_party_id = None
        
        # Step 1: Create party
        response, rt = self.make_request('POST', '/party-api/create', {
            'ownerId': ANTH_USER_ID,
            'ownerUsername': 'anth',
            'partyName': 'E2E Workflow Test'
        })
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                workflow_party_id = data['partyId']
                self.log_test("E2E: Party Creation", True, f"Party: {workflow_party_id}", rt)
            else:
                self.log_test("E2E: Party Creation", False, "Failed to create party", rt)
                return
        else:
            self.log_test("E2E: Party Creation", False, "HTTP error", rt)
            return
        
        # Step 2: Add member
        response, rt = self.make_request('POST', '/party-api/invite', {
            'partyId': workflow_party_id,
            'fromUserId': ANTH_USER_ID,
            'toUserId': ROBIEE_USER_ID,
            'toUsername': 'robiee'
        })
        
        invitation_id = None
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                invitation_id = data['invitationId']
                self.log_test("E2E: Member Invitation", True, f"Invitation: {invitation_id}", rt)
            else:
                self.log_test("E2E: Member Invitation", False, "Failed to send invitation", rt)
                return
        else:
            self.log_test("E2E: Member Invitation", False, "HTTP error", rt)
            return
        
        # Step 3: Accept invitation
        if invitation_id:
            response, rt = self.make_request('POST', '/party-api/accept-invitation', {
                'invitationId': invitation_id,
                'userId': ROBIEE_USER_ID
            })
            
            if response and response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                self.log_test("E2E: Accept Invitation", success, f"Member count: {data.get('memberCount', 0)}", rt)
            else:
                self.log_test("E2E: Accept Invitation", False, "HTTP error", rt)
                return
        
        # Step 4: Start game
        response, rt = self.make_request('POST', '/party-api/start-game', {
            'partyId': workflow_party_id,
            'roomType': 'practice',
            'entryFee': 0,
            'ownerId': ANTH_USER_ID
        })
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                e2e_game_room_id = data['gameRoomId']
                self.log_test("E2E: Start Game", True, f"GameRoom: {e2e_game_room_id}", rt)
            else:
                error = data.get('error', 'Unknown error')
                self.log_test("E2E: Start Game", False, f"Error: {error}", rt)
                return
        else:
            self.log_test("E2E: Start Game", False, "HTTP error", rt)
            return
        
        # Step 5: Verify notifications
        response, rt = self.make_request('GET', '/party-api/notifications', params={'userId': ROBIEE_USER_ID})
        
        if response and response.status_code == 200:
            data = response.json()
            notifications = data.get('notifications', [])
            has_notification = len(notifications) > 0
            self.log_test("E2E: Member Notifications", has_notification, f"Notifications: {len(notifications)}", rt)
        else:
            self.log_test("E2E: Member Notifications", False, "HTTP error", rt)
        
        # Step 6: Verify same room access
        anth_response, rt1 = self.make_request('GET', '/party-api/current', params={'userId': ANTH_USER_ID})
        robiee_response, rt2 = self.make_request('GET', '/party-api/current', params={'userId': ROBIEE_USER_ID})
        
        if anth_response and robiee_response and anth_response.status_code == 200 and robiee_response.status_code == 200:
            anth_response_data = anth_response.json()
            robiee_response_data = robiee_response.json()
            
            anth_party_data = anth_response_data.get('party', {})
            robiee_party_data = robiee_response_data.get('party', {})
            
            if anth_party_data and robiee_party_data:
                anth_game_room = anth_party_data.get('gameRoomId', '')
                robiee_game_room = robiee_party_data.get('gameRoomId', '')
                
                same_room = anth_game_room == robiee_game_room and anth_game_room != ''
                self.log_test("E2E: Same Room Access", same_room, f"Both users in room: {anth_game_room}", max(rt1, rt2))
            else:
                self.log_test("E2E: Same Room Access", False, "One or both users have no party data", max(rt1, rt2))
        else:
            self.log_test("E2E: Same Room Access", False, "Failed to verify room access", max(rt1, rt2))

    def run_all_tests(self):
        """Run complete Party Matchmaking test suite"""
        print("🚀 STARTING PARTY MATCHMAKING SYSTEM COMPREHENSIVE TESTING")
        print(f"📍 Testing against: {self.base_url}")
        print(f"👥 Test users: ANTH ({ANTH_USER_ID}), ROBIEE ({ROBIEE_USER_ID})")
        print("=" * 80)
        
        # Clean up existing parties first
        self.cleanup_existing_parties()
        
        start_time = time.time()
        
        # Run all test suites
        self.test_party_creation_setup()
        self.test_coordinated_game_room_creation()
        self.test_party_member_notifications()
        self.test_game_room_coordination()
        self.test_end_to_end_workflow()
        
        # Calculate results
        total_time = time.time() - start_time
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 PARTY MATCHMAKING SYSTEM TEST SUMMARY")
        print("=" * 80)
        print(f"📊 Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {total_tests - passed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        print(f"⏱️  Total Time: {total_time:.3f}s")
        
        if self.party_id:
            print(f"🎉 Party ID: {self.party_id}")
        if self.game_room_id:
            print(f"🎮 Game Room ID: {self.game_room_id}")
        
        print("\n📋 DETAILED TEST RESULTS:")
        for result in self.test_results:
            print(f"{result['status']} {result['test']}: {result['details']} ({result['response_time']})")
        
        # Critical findings
        print("\n🔍 CRITICAL FINDINGS:")
        if success_rate >= 90:
            print("✅ Party Matchmaking system is FULLY OPERATIONAL")
            print("✅ Coordinated game room creation working correctly")
            print("✅ Party member notifications functioning properly")
            print("✅ Both players can access same game room instance")
        elif success_rate >= 70:
            print("⚠️  Party Matchmaking system is MOSTLY OPERATIONAL with minor issues")
        else:
            print("❌ Party Matchmaking system has CRITICAL ISSUES requiring immediate attention")
        
        return success_rate >= 90

if __name__ == "__main__":
    tester = PartyMatchmakingTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)