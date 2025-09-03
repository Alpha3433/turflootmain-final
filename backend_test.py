#!/usr/bin/env python3
"""
Backend Testing Script for Party Game Initialization
Testing party game room creation, room ID validation, and party coordination
"""

import requests
import json
import time
import os
from urllib.parse import urljoin

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/party-api"

# Test user data - using realistic Privy DID format for party game testing
TEST_USER_ALICE = {
    'userId': 'did:privy:alice_test_party_game_001',
    'username': 'AlicePartyPlayer',
    'displayName': 'Alice'
}

TEST_USER_BOB = {
    'userId': 'did:privy:bob_test_party_game_002',
    'username': 'BobPartyPlayer',
    'displayName': 'Bob'
}

def make_request(method, endpoint, data=None, params=None):
    """Make HTTP request with error handling"""
    url = f"{API_BASE}/{endpoint}" if not endpoint.startswith('http') else endpoint
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, params=params, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def test_party_creation():
    """Test 1: Create a party for game initialization testing"""
    print("\n" + "="*80)
    print("🎯 TEST 1: PARTY CREATION FOR GAME INITIALIZATION")
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

def cleanup_stale_parties():
    """Test 6: Cleanup stale party data"""
    print("\n" + "="*80)
    print("🧹 TEST 6: CLEANUP STALE PARTY DATA")
    print("="*80)
    
    # Try to leave any existing parties for robiee
    print(f"🚪 Attempting to leave all parties for robiee...")
    
    # First get current party
    response = make_request('GET', 'current', params={'userId': TEST_USER_ROBIEE['userId']})
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get('hasParty') and data.get('party'):
            party = data['party']
            party_id = party.get('id')
            
            print(f"📤 Leaving party: {party_id}")
            leave_response = make_request('POST', 'leave', data={
                'partyId': party_id,
                'userId': TEST_USER_ROBIEE['userId']
            })
            
            if leave_response and leave_response.status_code == 200:
                leave_data = leave_response.json()
                print(f"✅ Successfully left party")
                print(f"   Response: {json.dumps(leave_data, indent=2)}")
                
                # Verify party is gone
                verify_response = make_request('GET', 'current', params={'userId': TEST_USER_ROBIEE['userId']})
                if verify_response and verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    if not verify_data.get('hasParty'):
                        print(f"✅ Confirmed: User is no longer in any party")
                    else:
                        print(f"⚠️ User still appears to be in a party")
                        print(f"   Party: {verify_data.get('party', {}).get('name')}")
            else:
                print(f"❌ Failed to leave party: {leave_response.status_code if leave_response else 'No response'}")
                if leave_response:
                    print(f"   Error: {leave_response.text}")
        else:
            print("ℹ️ No party to leave")
    else:
        print(f"❌ Failed to check current party status")

def run_all_tests():
    """Run all debug tests"""
    print("🚀 STARTING PARTY LOBBY USERNAME DEBUG TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test User (Robiee): {TEST_USER_ROBIEE['userId']}")
    print(f"Test User (Workflow): {TEST_USER_WORKFLOW['userId']}")
    
    results = {}
    
    try:
        # Test 1: Check current party status
        results['current_party'] = test_current_party_status()
        
        # Test 2: Check for stale records
        results['stale_check'] = test_database_cleanup_check()
        
        # Test 3: Test party creation with correct username
        results['party_creation'] = test_party_creation_username()
        
        # Test 4: Username verification
        results['username_verification'] = test_username_verification()
        
        # Test 5: Deep data inspection
        results['data_inspection'] = test_party_data_inspection()
        
        # Test 6: Cleanup if needed
        results['cleanup'] = cleanup_stale_parties()
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Summary
    print("\n" + "="*80)
    print("📋 TEST SUMMARY")
    print("="*80)
    
    print("🔍 INVESTIGATION RESULTS:")
    print("1. Current Party Status: Checked for existing parties")
    print("2. Stale Records: Searched for conflicting party data")
    print("3. Party Creation: Tested username handling in new parties")
    print("4. Username Verification: Verified username consistency")
    print("5. Data Inspection: Deep dive into party data structure")
    print("6. Cleanup: Attempted to clean stale data")
    
    print("\n🎯 KEY FINDINGS:")
    if any('WorkflowUser1' in str(result) for result in results.values() if result):
        print("- Found 'WorkflowUser1' in party data")
        print("- This appears to be the source of the username display issue")
        print("- Recommend cleaning up stale party records")
    else:
        print("- No 'WorkflowUser1' found in current party data")
        print("- Issue may be in frontend display logic or cached data")
    
    print("\n✅ Debug tests completed!")
    return results

if __name__ == "__main__":
    run_all_tests()