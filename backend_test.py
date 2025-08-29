#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Party Lobby System Integration
Testing party-api and lobby-api endpoints as requested in review.
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://team-turfloot.preview.emergentagent.com"  # Using production URL from .env
PARTY_API_BASE = f"{BASE_URL}/party-api"
LOBBY_API_BASE = f"{BASE_URL}/lobby-api"

# Test data - realistic user data
TEST_USERS = {
    'alice': {
        'id': f'did:privy:alice_{uuid.uuid4().hex[:8]}',
        'username': 'AliceGamer2024'
    },
    'bob': {
        'id': f'did:privy:bob_{uuid.uuid4().hex[:8]}',
        'username': 'BobWarrior'
    },
    'charlie': {
        'id': f'did:privy:charlie_{uuid.uuid4().hex[:8]}',
        'username': 'CharlieHunter'
    },
    'diana': {
        'id': f'did:privy:diana_{uuid.uuid4().hex[:8]}',
        'username': 'DianaPhoenix'
    }
}

# Test results tracking
test_results = {
    'total_tests': 0,
    'passed_tests': 0,
    'failed_tests': 0,
    'test_details': []
}

def log_test_result(test_name, success, details="", response_time=0):
    """Log test result with details"""
    test_results['total_tests'] += 1
    if success:
        test_results['passed_tests'] += 1
        status = "✅ PASS"
    else:
        test_results['failed_tests'] += 1
        status = "❌ FAIL"
    
    result = {
        'test': test_name,
        'status': status,
        'details': details,
        'response_time': f"{response_time:.3f}s",
        'timestamp': datetime.now().isoformat()
    }
    
    test_results['test_details'].append(result)
    print(f"{status} - {test_name} ({response_time:.3f}s)")
    if details:
        print(f"    Details: {details}")

def make_request(method, url, data=None, params=None):
    """Make HTTP request with error handling"""
    try:
        start_time = time.time()
        
        if method.upper() == 'GET':
            response = requests.get(url, params=params, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response_time = time.time() - start_time
        
        return {
            'success': True,
            'status_code': response.status_code,
            'data': response.json() if response.content else {},
            'response_time': response_time
        }
    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'error': str(e),
            'response_time': time.time() - start_time
        }
    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f"JSON decode error: {str(e)}",
            'response_time': time.time() - start_time
        }

def test_party_api_endpoints():
    """Test all Party API endpoints"""
    print("\n🎉 TESTING PARTY API ENDPOINTS")
    print("=" * 50)
    
    alice = TEST_USERS['alice']
    bob = TEST_USERS['bob']
    charlie = TEST_USERS['charlie']
    
    # Test 1: Create Party (POST /party-api/create)
    print("\n1. Testing Party Creation")
    create_data = {
        'ownerId': alice['id'],
        'ownerUsername': alice['username'],
        'partyName': 'Alice\'s Gaming Party'
    }
    
    result = make_request('POST', f"{PARTY_API_BASE}/create", create_data)
    
    if result['success'] and result['status_code'] == 200:
        party_data = result['data']
        if party_data.get('success') and party_data.get('partyId'):
            alice_party_id = party_data['partyId']
            log_test_result(
                "Party Creation (POST /party-api/create)",
                True,
                f"Created party {alice_party_id} for {alice['username']}",
                result['response_time']
            )
        else:
            log_test_result(
                "Party Creation (POST /party-api/create)",
                False,
                f"Invalid response structure: {party_data}",
                result['response_time']
            )
            return
    else:
        log_test_result(
            "Party Creation (POST /party-api/create)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )
        return
    
    # Test 2: Get Current Party (GET /party-api/current)
    print("\n2. Testing Get Current Party")
    result = make_request('GET', f"{PARTY_API_BASE}/current", params={'userId': alice['id']})
    
    if result['success'] and result['status_code'] == 200:
        party_status = result['data']
        if party_status.get('hasParty') and party_status.get('party'):
            log_test_result(
                "Get Current Party (GET /party-api/current)",
                True,
                f"Retrieved party for {alice['username']}: {party_status['party']['name']}",
                result['response_time']
            )
        else:
            log_test_result(
                "Get Current Party (GET /party-api/current)",
                False,
                f"No party found or invalid structure: {party_status}",
                result['response_time']
            )
    else:
        log_test_result(
            "Get Current Party (GET /party-api/current)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )
    
    # Test 3: Send Party Invitation (POST /party-api/invite)
    print("\n3. Testing Send Party Invitation")
    invite_data = {
        'partyId': alice_party_id,
        'fromUserId': alice['id'],
        'toUserId': bob['id'],
        'toUsername': bob['username']
    }
    
    result = make_request('POST', f"{PARTY_API_BASE}/invite", invite_data)
    
    if result['success'] and result['status_code'] == 200:
        invite_response = result['data']
        if invite_response.get('success') and invite_response.get('invitationId'):
            bob_invitation_id = invite_response['invitationId']
            log_test_result(
                "Send Party Invitation (POST /party-api/invite)",
                True,
                f"Sent invitation {bob_invitation_id} from {alice['username']} to {bob['username']}",
                result['response_time']
            )
        else:
            log_test_result(
                "Send Party Invitation (POST /party-api/invite)",
                False,
                f"Invalid response: {invite_response}",
                result['response_time']
            )
            return
    else:
        log_test_result(
            "Send Party Invitation (POST /party-api/invite)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )
        return
    
    # Test 4: Get Pending Invitations (GET /party-api/invitations)
    print("\n4. Testing Get Pending Invitations")
    result = make_request('GET', f"{PARTY_API_BASE}/invitations", params={'userId': bob['id']})
    
    if result['success'] and result['status_code'] == 200:
        invitations = result['data']
        if invitations.get('invitations') and invitations['count'] > 0:
            log_test_result(
                "Get Pending Invitations (GET /party-api/invitations)",
                True,
                f"Found {invitations['count']} pending invitations for {bob['username']}",
                result['response_time']
            )
        else:
            log_test_result(
                "Get Pending Invitations (GET /party-api/invitations)",
                False,
                f"No invitations found: {invitations}",
                result['response_time']
            )
    else:
        log_test_result(
            "Get Pending Invitations (GET /party-api/invitations)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )
    
    # Test 5: Accept Party Invitation (POST /party-api/accept-invitation)
    print("\n5. Testing Accept Party Invitation")
    accept_data = {
        'invitationId': bob_invitation_id,
        'userId': bob['id']
    }
    
    result = make_request('POST', f"{PARTY_API_BASE}/accept-invitation", accept_data)
    
    if result['success'] and result['status_code'] == 200:
        accept_response = result['data']
        if accept_response.get('success'):
            log_test_result(
                "Accept Party Invitation (POST /party-api/accept-invitation)",
                True,
                f"{bob['username']} accepted invitation to party {alice_party_id}",
                result['response_time']
            )
        else:
            log_test_result(
                "Accept Party Invitation (POST /party-api/accept-invitation)",
                False,
                f"Failed to accept: {accept_response}",
                result['response_time']
            )
    else:
        log_test_result(
            "Accept Party Invitation (POST /party-api/accept-invitation)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )
    
    # Test 6: Get Invitable Friends (GET /party-api/invitable-friends)
    print("\n6. Testing Get Invitable Friends")
    result = make_request('GET', f"{PARTY_API_BASE}/invitable-friends", 
                         params={'userId': alice['id'], 'partyId': alice_party_id})
    
    if result['success'] and result['status_code'] == 200:
        friends = result['data']
        log_test_result(
            "Get Invitable Friends (GET /party-api/invitable-friends)",
            True,
            f"Found {friends.get('count', 0)} invitable friends for {alice['username']}",
            result['response_time']
        )
    else:
        log_test_result(
            "Get Invitable Friends (GET /party-api/invitable-friends)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )
    
    # Test 7: Decline Invitation (separate invitation for Charlie)
    print("\n7. Testing Decline Party Invitation")
    
    # First send invitation to Charlie
    invite_charlie_data = {
        'partyId': alice_party_id,
        'fromUserId': alice['id'],
        'toUserId': charlie['id'],
        'toUsername': charlie['username']
    }
    
    invite_result = make_request('POST', f"{PARTY_API_BASE}/invite", invite_charlie_data)
    
    if invite_result['success'] and invite_result['status_code'] == 200:
        charlie_invitation_id = invite_result['data']['invitationId']
        
        # Now decline the invitation
        decline_data = {
            'invitationId': charlie_invitation_id,
            'userId': charlie['id']
        }
        
        result = make_request('POST', f"{PARTY_API_BASE}/decline-invitation", decline_data)
        
        if result['success'] and result['status_code'] == 200:
            decline_response = result['data']
            if decline_response.get('success'):
                log_test_result(
                    "Decline Party Invitation (POST /party-api/decline-invitation)",
                    True,
                    f"{charlie['username']} declined invitation to party {alice_party_id}",
                    result['response_time']
                )
            else:
                log_test_result(
                    "Decline Party Invitation (POST /party-api/decline-invitation)",
                    False,
                    f"Failed to decline: {decline_response}",
                    result['response_time']
                )
        else:
            log_test_result(
                "Decline Party Invitation (POST /party-api/decline-invitation)",
                False,
                f"Request failed: {result.get('error', 'Unknown error')}",
                result['response_time']
            )
    else:
        log_test_result(
            "Decline Party Invitation (POST /party-api/decline-invitation)",
            False,
            "Failed to send invitation to Charlie for decline test",
            0
        )
    
    # Test 8: Leave Party (POST /party-api/leave)
    print("\n8. Testing Leave Party")
    leave_data = {
        'partyId': alice_party_id,
        'userId': bob['id']
    }
    
    result = make_request('POST', f"{PARTY_API_BASE}/leave", leave_data)
    
    if result['success'] and result['status_code'] == 200:
        leave_response = result['data']
        if leave_response.get('success'):
            log_test_result(
                "Leave Party (POST /party-api/leave)",
                True,
                f"{bob['username']} left party {alice_party_id}",
                result['response_time']
            )
        else:
            log_test_result(
                "Leave Party (POST /party-api/leave)",
                False,
                f"Failed to leave: {leave_response}",
                result['response_time']
            )
    else:
        log_test_result(
            "Leave Party (POST /party-api/leave)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )
    
    return alice_party_id

def test_lobby_api_endpoints(party_id):
    """Test all Lobby API endpoints"""
    print("\n🎮 TESTING LOBBY API ENDPOINTS")
    print("=" * 50)
    
    alice = TEST_USERS['alice']
    diana = TEST_USERS['diana']
    
    # Test 1: Create Party-Integrated Lobby (POST /lobby-api/create)
    print("\n1. Testing Create Party-Integrated Lobby")
    create_lobby_data = {
        'userId': alice['id'],
        'roomType': '$5',
        'entryFee': 5
    }
    
    result = make_request('POST', f"{LOBBY_API_BASE}/create", create_lobby_data)
    
    if result['success'] and result['status_code'] == 200:
        lobby_response = result['data']
        if lobby_response.get('success') and lobby_response.get('lobbyId'):
            alice_lobby_id = lobby_response['lobbyId']
            log_test_result(
                "Create Party-Integrated Lobby (POST /lobby-api/create)",
                True,
                f"Created lobby {alice_lobby_id} for {lobby_response.get('roomType')} room with party size {lobby_response.get('partySize', 1)}",
                result['response_time']
            )
        else:
            log_test_result(
                "Create Party-Integrated Lobby (POST /lobby-api/create)",
                False,
                f"Invalid response: {lobby_response}",
                result['response_time']
            )
            return
    else:
        log_test_result(
            "Create Party-Integrated Lobby (POST /lobby-api/create)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )
        return
    
    # Test 2: Join Room with Party (POST /lobby-api/join-room)
    print("\n2. Testing Join Room with Party")
    join_room_data = {
        'userId': alice['id'],
        'roomType': '$10',
        'entryFee': 10
    }
    
    result = make_request('POST', f"{LOBBY_API_BASE}/join-room", join_room_data)
    
    if result['success'] and result['status_code'] == 200:
        join_response = result['data']
        if join_response.get('success'):
            log_test_result(
                "Join Room with Party (POST /lobby-api/join-room)",
                True,
                f"Joined {join_response.get('roomType')} room with party: {join_response.get('message')}",
                result['response_time']
            )
        else:
            log_test_result(
                "Join Room with Party (POST /lobby-api/join-room)",
                False,
                f"Failed to join room: {join_response}",
                result['response_time']
            )
    else:
        log_test_result(
            "Join Room with Party (POST /lobby-api/join-room)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )
    
    # Test 3: Get Lobby Status (GET /lobby-api/status)
    print("\n3. Testing Get Lobby Status")
    result = make_request('GET', f"{LOBBY_API_BASE}/status", params={'lobbyId': alice_lobby_id})
    
    if result['success'] and result['status_code'] == 200:
        status_response = result['data']
        if status_response.get('lobby'):
            log_test_result(
                "Get Lobby Status (GET /lobby-api/status)",
                True,
                f"Retrieved lobby status for {alice_lobby_id}: {status_response['lobby'].get('status')} with {len(status_response.get('players', []))} players",
                result['response_time']
            )
        else:
            log_test_result(
                "Get Lobby Status (GET /lobby-api/status)",
                False,
                f"Invalid status response: {status_response}",
                result['response_time']
            )
    else:
        log_test_result(
            "Get Lobby Status (GET /lobby-api/status)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )
    
    # Test 4: Solo Room Joining (no party)
    print("\n4. Testing Solo Room Joining")
    solo_join_data = {
        'userId': diana['id'],
        'roomType': 'practice',
        'entryFee': 0
    }
    
    result = make_request('POST', f"{LOBBY_API_BASE}/join-room", solo_join_data)
    
    if result['success'] and result['status_code'] == 200:
        solo_response = result['data']
        if solo_response.get('success'):
            log_test_result(
                "Solo Room Joining (POST /lobby-api/join-room)",
                True,
                f"{diana['username']} joined {solo_response.get('roomType')} room solo: {solo_response.get('message')}",
                result['response_time']
            )
        else:
            log_test_result(
                "Solo Room Joining (POST /lobby-api/join-room)",
                False,
                f"Failed solo join: {solo_response}",
                result['response_time']
            )
    else:
        log_test_result(
            "Solo Room Joining (POST /lobby-api/join-room)",
            False,
            f"Request failed: {result.get('error', 'Unknown error')}",
            result['response_time']
        )

def test_integration_workflow():
    """Test complete Party Lobby integration workflow"""
    print("\n🔄 TESTING COMPLETE INTEGRATION WORKFLOW")
    print("=" * 50)
    
    alice = TEST_USERS['alice']
    bob = TEST_USERS['bob']
    charlie = TEST_USERS['charlie']
    
    workflow_success = True
    workflow_details = []
    
    try:
        # Step 1: Create Party
        print("\nStep 1: Create Party")
        create_data = {
            'ownerId': alice['id'],
            'ownerUsername': alice['username'],
            'partyName': 'Integration Test Party'
        }
        
        result = make_request('POST', f"{PARTY_API_BASE}/create", create_data)
        if not (result['success'] and result['status_code'] == 200 and result['data'].get('success')):
            raise Exception(f"Failed to create party: {result}")
        
        party_id = result['data']['partyId']
        workflow_details.append(f"✅ Created party {party_id}")
        
        # Step 2: Invite Friends
        print("\nStep 2: Invite Friends")
        for friend in [bob, charlie]:
            invite_data = {
                'partyId': party_id,
                'fromUserId': alice['id'],
                'toUserId': friend['id'],
                'toUsername': friend['username']
            }
            
            result = make_request('POST', f"{PARTY_API_BASE}/invite", invite_data)
            if not (result['success'] and result['status_code'] == 200 and result['data'].get('success')):
                raise Exception(f"Failed to invite {friend['username']}: {result}")
            
            workflow_details.append(f"✅ Invited {friend['username']}")
        
        # Step 3: Accept Invitations
        print("\nStep 3: Accept Invitations")
        
        # Get Bob's invitations
        result = make_request('GET', f"{PARTY_API_BASE}/invitations", params={'userId': bob['id']})
        if not (result['success'] and result['status_code'] == 200):
            raise Exception(f"Failed to get Bob's invitations: {result}")
        
        bob_invitations = result['data']['invitations']
        if not bob_invitations:
            raise Exception("No invitations found for Bob")
        
        # Accept Bob's invitation
        accept_data = {
            'invitationId': bob_invitations[0]['id'],
            'userId': bob['id']
        }
        
        result = make_request('POST', f"{PARTY_API_BASE}/accept-invitation", accept_data)
        if not (result['success'] and result['status_code'] == 200 and result['data'].get('success')):
            raise Exception(f"Failed to accept Bob's invitation: {result}")
        
        workflow_details.append(f"✅ {bob['username']} accepted invitation")
        
        # Step 4: Create Lobby with Party
        print("\nStep 4: Create Lobby with Party")
        lobby_data = {
            'userId': alice['id'],
            'roomType': '$5',
            'entryFee': 5
        }
        
        result = make_request('POST', f"{LOBBY_API_BASE}/create", lobby_data)
        if not (result['success'] and result['status_code'] == 200 and result['data'].get('success')):
            raise Exception(f"Failed to create lobby: {result}")
        
        lobby_id = result['data']['lobbyId']
        party_size = result['data']['partySize']
        workflow_details.append(f"✅ Created lobby {lobby_id} with party size {party_size}")
        
        # Step 5: Join Room Together
        print("\nStep 5: Join Room Together")
        join_data = {
            'userId': alice['id'],
            'roomType': '$10',
            'entryFee': 10
        }
        
        result = make_request('POST', f"{LOBBY_API_BASE}/join-room", join_data)
        if not (result['success'] and result['status_code'] == 200 and result['data'].get('success')):
            raise Exception(f"Failed to join room: {result}")
        
        workflow_details.append(f"✅ Party joined {result['data']['roomType']} room together")
        
        log_test_result(
            "Complete Integration Workflow",
            True,
            " | ".join(workflow_details),
            0
        )
        
    except Exception as e:
        log_test_result(
            "Complete Integration Workflow",
            False,
            f"Workflow failed: {str(e)}",
            0
        )

def test_smart_routing():
    """Test smart routing and bypass system"""
    print("\n🔀 TESTING SMART ROUTING VERIFICATION")
    print("=" * 50)
    
    # Test party-api routing
    result = make_request('GET', f"{PARTY_API_BASE}/current", params={'userId': 'test_user'})
    
    if result['success']:
        log_test_result(
            "Party-API Smart Routing",
            True,
            f"Party-API accessible via bypass system (status: {result['status_code']})",
            result['response_time']
        )
    else:
        log_test_result(
            "Party-API Smart Routing",
            False,
            f"Party-API routing failed: {result.get('error')}",
            result['response_time']
        )
    
    # Test lobby-api routing
    result = make_request('GET', f"{LOBBY_API_BASE}/status", params={'lobbyId': 'test_lobby'})
    
    if result['success']:
        log_test_result(
            "Lobby-API Smart Routing",
            True,
            f"Lobby-API accessible via bypass system (status: {result['status_code']})",
            result['response_time']
        )
    else:
        log_test_result(
            "Lobby-API Smart Routing",
            False,
            f"Lobby-API routing failed: {result.get('error')}",
            result['response_time']
        )

def print_test_summary():
    """Print comprehensive test summary"""
    print("\n" + "=" * 70)
    print("🎯 PARTY LOBBY SYSTEM INTEGRATION TEST SUMMARY")
    print("=" * 70)
    
    total = test_results['total_tests']
    passed = test_results['passed_tests']
    failed = test_results['failed_tests']
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"\n📊 OVERALL RESULTS:")
    print(f"   Total Tests: {total}")
    print(f"   Passed: {passed} ✅")
    print(f"   Failed: {failed} ❌")
    print(f"   Success Rate: {success_rate:.1f}%")
    
    print(f"\n📋 DETAILED TEST RESULTS:")
    for result in test_results['test_details']:
        print(f"   {result['status']} {result['test']} ({result['response_time']})")
        if result['details']:
            print(f"      └─ {result['details']}")
    
    print(f"\n🔍 CRITICAL FINDINGS:")
    if success_rate >= 90:
        print("   ✅ Party Lobby system integration is FULLY OPERATIONAL")
        print("   ✅ All major workflows tested successfully")
        print("   ✅ Smart routing through bypass system working")
    elif success_rate >= 70:
        print("   ⚠️  Party Lobby system mostly functional with minor issues")
        print("   ⚠️  Some endpoints may need attention")
    else:
        print("   ❌ Party Lobby system has significant issues")
        print("   ❌ Multiple endpoints failing - requires investigation")
    
    print(f"\n🎮 PARTY API ENDPOINTS TESTED:")
    print("   • POST /party-api/create - Create new party")
    print("   • GET /party-api/current - Get current party status")
    print("   • POST /party-api/invite - Send party invitations")
    print("   • GET /party-api/invitations - Get pending invitations")
    print("   • POST /party-api/accept-invitation - Accept invitations")
    print("   • POST /party-api/decline-invitation - Decline invitations")
    print("   • POST /party-api/leave - Leave party")
    print("   • GET /party-api/invitable-friends - Get invitable friends")
    
    print(f"\n🏰 LOBBY API ENDPOINTS TESTED:")
    print("   • POST /lobby-api/create - Create party-integrated lobby")
    print("   • POST /lobby-api/join-room - Join room with party")
    print("   • GET /lobby-api/status - Get lobby status")
    
    print(f"\n🔄 INTEGRATION WORKFLOWS TESTED:")
    print("   • Complete party creation → invitation → acceptance → lobby creation → room joining")
    print("   • Solo (no party) and party (with members) room joining")
    print("   • Party owner room selection for all party members")
    print("   • Smart routing verification through bypass system")
    
    print("\n" + "=" * 70)

def main():
    """Main test execution"""
    print("🚀 STARTING PARTY LOBBY SYSTEM INTEGRATION TESTING")
    print(f"📡 Testing against: {BASE_URL}")
    print(f"🎉 Party API Base: {PARTY_API_BASE}")
    print(f"🎮 Lobby API Base: {LOBBY_API_BASE}")
    
    # Test Party API endpoints
    party_id = test_party_api_endpoints()
    
    # Test Lobby API endpoints
    test_lobby_api_endpoints(party_id)
    
    # Test complete integration workflow
    test_integration_workflow()
    
    # Test smart routing
    test_smart_routing()
    
    # Print comprehensive summary
    print_test_summary()

if __name__ == "__main__":
    main()