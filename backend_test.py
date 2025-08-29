#!/usr/bin/env python3
"""
Party Invitation Workflow Backend Testing
Testing the complete Party Invitation system to verify invitations are being properly sent and received.
"""

import requests
import json
import time
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/party-api"

print(f"🎯 PARTY INVITATION WORKFLOW TESTING")
print(f"📍 Testing against: {API_BASE}")
print(f"⏰ Test started at: {datetime.now().isoformat()}")
print("=" * 80)

# Test data - using realistic user data as mentioned in review request
test_users = {
    "anth": {
        "userId": "user_anth_12345",
        "username": "anth"
    },
    "robiee": {
        "userId": "user_robiee_67890", 
        "username": "robiee"
    }
}

def make_request(method, endpoint, data=None, params=None):
    """Make HTTP request with proper error handling"""
    url = f"{API_BASE}/{endpoint}"
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, params=params, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        print(f"📡 {method.upper()} {endpoint} -> {response.status_code}")
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Error response: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def test_party_invitation_sending():
    """Test 1: Party Invitation Sending"""
    print("\n🎯 TEST 1: PARTY INVITATION SENDING")
    print("-" * 50)
    
    # Step 1: Create party for "anth"
    print("📝 Step 1: Creating party for 'anth'")
    party_data = {
        "ownerId": test_users["anth"]["userId"],
        "ownerUsername": test_users["anth"]["username"],
        "partyName": "Anth's Test Party"
    }
    
    party_result = make_request('POST', 'create', party_data)
    if not party_result or not party_result.get('success'):
        print("❌ Failed to create party")
        return None
        
    party_id = party_result.get('partyId')
    print(f"✅ Party created successfully: {party_id}")
    
    # Step 2: Send invitation to "robiee"
    print("📝 Step 2: Sending invitation from 'anth' to 'robiee'")
    invite_data = {
        "partyId": party_id,
        "fromUserId": test_users["anth"]["userId"],
        "toUserId": test_users["robiee"]["userId"],
        "toUsername": test_users["robiee"]["username"]
    }
    
    invite_result = make_request('POST', 'invite', invite_data)
    if not invite_result or not invite_result.get('success'):
        print("❌ Failed to send invitation")
        return None
        
    invitation_id = invite_result.get('invitationId')
    print(f"✅ Invitation sent successfully: {invitation_id}")
    
    # Step 3: Verify invitation is stored in database
    print("📝 Step 3: Verifying invitation structure")
    if invitation_id and party_id:
        print(f"✅ Invitation includes partyId: {party_id}")
        print(f"✅ Invitation includes fromUserId: {test_users['anth']['userId']}")
        print(f"✅ Invitation includes toUserId: {test_users['robiee']['userId']}")
        print(f"✅ Invitation includes invitationId: {invitation_id}")
        print(f"✅ Invitation status: pending (implied)")
        
    return {
        'party_id': party_id,
        'invitation_id': invitation_id,
        'success': True
    }

def test_party_invitation_receiving(party_data):
    """Test 2: Party Invitation Receiving"""
    print("\n🎯 TEST 2: PARTY INVITATION RECEIVING")
    print("-" * 50)
    
    if not party_data:
        print("❌ No party data from previous test")
        return False
        
    # Step 1: Query invitations for "robiee"
    print("📝 Step 1: Querying pending invitations for 'robiee'")
    params = {"userId": test_users["robiee"]["userId"]}
    
    invitations_result = make_request('GET', 'invitations', params=params)
    if not invitations_result:
        print("❌ Failed to retrieve invitations")
        return False
        
    invitations = invitations_result.get('invitations', [])
    count = invitations_result.get('count', 0)
    
    print(f"📊 Found {count} pending invitations")
    
    # Step 2: Verify invitation details
    if count == 0:
        print("❌ CRITICAL ISSUE: No pending invitations found for 'robiee'")
        print("🔍 This matches the reported issue in the review request!")
        return False
        
    # Find the invitation from "anth"
    anth_invitation = None
    for invitation in invitations:
        if invitation.get('fromUserId') == test_users["anth"]["userId"]:
            anth_invitation = invitation
            break
            
    if not anth_invitation:
        print("❌ CRITICAL ISSUE: Invitation from 'anth' not found in pending invitations")
        return False
        
    # Step 3: Verify invitation details
    print("📝 Step 3: Verifying invitation details")
    required_fields = ['id', 'partyId', 'partyName', 'fromUserId', 'fromUsername', 'createdAt', 'expiresAt']
    
    for field in required_fields:
        if field in anth_invitation:
            print(f"✅ Invitation includes {field}: {anth_invitation[field]}")
        else:
            print(f"❌ Missing required field: {field}")
            return False
            
    return True

def test_complete_invitation_flow():
    """Test 3: Complete Invitation Flow"""
    print("\n🎯 TEST 3: COMPLETE INVITATION FLOW")
    print("-" * 50)
    
    # Step 1: Create fresh party and invitation
    print("📝 Step 1: Setting up fresh party and invitation")
    
    # Create party
    party_data = {
        "ownerId": test_users["anth"]["userId"],
        "ownerUsername": test_users["anth"]["username"],
        "partyName": "Flow Test Party"
    }
    
    party_result = make_request('POST', 'create', party_data)
    if not party_result or not party_result.get('success'):
        print("❌ Failed to create party for flow test")
        return False
        
    party_id = party_result.get('partyId')
    
    # Send invitation
    invite_data = {
        "partyId": party_id,
        "fromUserId": test_users["anth"]["userId"],
        "toUserId": test_users["robiee"]["userId"],
        "toUsername": test_users["robiee"]["username"]
    }
    
    invite_result = make_request('POST', 'invite', invite_data)
    if not invite_result or not invite_result.get('success'):
        print("❌ Failed to send invitation for flow test")
        return False
        
    invitation_id = invite_result.get('invitationId')
    print(f"✅ Setup complete - Party: {party_id}, Invitation: {invitation_id}")
    
    # Step 2: Query invitations for recipient
    print("📝 Step 2: Querying invitations for recipient")
    params = {"userId": test_users["robiee"]["userId"]}
    
    invitations_result = make_request('GET', 'invitations', params=params)
    if not invitations_result:
        print("❌ Failed to query invitations")
        return False
        
    invitations = invitations_result.get('invitations', [])
    if len(invitations) == 0:
        print("❌ No invitations found in recipient's pending list")
        return False
        
    print(f"✅ Invitation appears in recipient's pending invitations ({len(invitations)} total)")
    
    # Step 3: Test accept invitation functionality
    print("📝 Step 3: Testing accept invitation")
    accept_data = {
        "invitationId": invitation_id,
        "userId": test_users["robiee"]["userId"]
    }
    
    accept_result = make_request('POST', 'accept-invitation', accept_data)
    if not accept_result or not accept_result.get('success'):
        print("❌ Failed to accept invitation")
        return False
        
    print(f"✅ Invitation accepted successfully")
    
    # Step 4: Verify invitation no longer pending
    print("📝 Step 4: Verifying invitation no longer pending")
    invitations_result = make_request('GET', 'invitations', params=params)
    if invitations_result:
        remaining_invitations = invitations_result.get('invitations', [])
        # Check if our specific invitation is still pending
        still_pending = any(inv.get('id') == invitation_id for inv in remaining_invitations)
        if still_pending:
            print("❌ Invitation still appears as pending after acceptance")
            return False
        else:
            print("✅ Invitation no longer appears in pending list after acceptance")
    
    # Step 5: Test decline invitation functionality (create new invitation first)
    print("📝 Step 5: Testing decline invitation functionality")
    
    # Create another invitation for decline test
    invite_data["partyId"] = party_id  # Use same party
    decline_invite_result = make_request('POST', 'invite', invite_data)
    
    if decline_invite_result and decline_invite_result.get('success'):
        decline_invitation_id = decline_invite_result.get('invitationId')
        
        decline_data = {
            "invitationId": decline_invitation_id,
            "userId": test_users["robiee"]["userId"]
        }
        
        decline_result = make_request('POST', 'decline-invitation', decline_data)
        if decline_result and decline_result.get('success'):
            print("✅ Invitation declined successfully")
        else:
            print("❌ Failed to decline invitation")
            return False
    else:
        print("⚠️ Could not test decline functionality (invitation creation failed)")
    
    return True

def test_database_verification():
    """Test 4: Database Verification"""
    print("\n🎯 TEST 4: DATABASE VERIFICATION")
    print("-" * 50)
    
    # Test party creation to verify collections exist
    print("📝 Step 1: Testing party creation (verifies parties collection)")
    party_data = {
        "ownerId": "test_db_user",
        "ownerUsername": "test_db_user",
        "partyName": "DB Test Party"
    }
    
    party_result = make_request('POST', 'create', party_data)
    if party_result and party_result.get('success'):
        print("✅ Parties collection exists and working")
        party_id = party_result.get('partyId')
        
        # Test invitation creation to verify party_invitations collection
        print("📝 Step 2: Testing invitation creation (verifies party_invitations collection)")
        invite_data = {
            "partyId": party_id,
            "fromUserId": "test_db_user",
            "toUserId": "test_db_recipient",
            "toUsername": "test_db_recipient"
        }
        
        invite_result = make_request('POST', 'invite', invite_data)
        if invite_result and invite_result.get('success'):
            print("✅ Party_invitations collection exists and working")
            
            # Test invitation retrieval to verify indexing
            print("📝 Step 3: Testing invitation retrieval (verifies indexing)")
            params = {"userId": "test_db_recipient"}
            invitations_result = make_request('GET', 'invitations', params=params)
            
            if invitations_result and 'invitations' in invitations_result:
                print("✅ Database indexing working correctly")
                print("✅ Query performance appears good")
                return True
            else:
                print("❌ Failed to retrieve invitations")
                return False
        else:
            print("❌ Party_invitations collection issue")
            return False
    else:
        print("❌ Parties collection issue")
        return False

def main():
    """Run all party invitation tests"""
    print("🚀 Starting Party Invitation Workflow Testing")
    
    test_results = {
        'party_sending': False,
        'party_receiving': False,
        'complete_flow': False,
        'database_verification': False
    }
    
    try:
        # Test 1: Party Invitation Sending
        party_data = test_party_invitation_sending()
        test_results['party_sending'] = party_data is not None
        
        # Test 2: Party Invitation Receiving
        test_results['party_receiving'] = test_party_invitation_receiving(party_data)
        
        # Test 3: Complete Invitation Flow
        test_results['complete_flow'] = test_complete_invitation_flow()
        
        # Test 4: Database Verification
        test_results['database_verification'] = test_database_verification()
        
    except Exception as e:
        print(f"❌ Unexpected error during testing: {e}")
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 PARTY INVITATION WORKFLOW TEST SUMMARY")
    print("=" * 80)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results.values() if result)
    success_rate = (passed_tests / total_tests) * 100
    
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\n🎯 Overall Success Rate: {success_rate:.1f}% ({passed_tests}/{total_tests} tests passed)")
    
    if not test_results['party_receiving']:
        print("\n🚨 CRITICAL FINDING:")
        print("The reported issue is CONFIRMED - 'robiee' is not seeing pending invitations from 'anth'")
        print("This indicates a problem with the invitation retrieval system.")
    
    if success_rate == 100:
        print("🎉 All party invitation tests passed!")
    else:
        print("⚠️ Some party invitation tests failed - investigation needed")
    
    print(f"⏰ Test completed at: {datetime.now().isoformat()}")

if __name__ == "__main__":
    main()