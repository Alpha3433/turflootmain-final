#!/usr/bin/env python3
"""
Final Comprehensive Party Invitation Test
Testing all aspects of the party invitation system with real user IDs
"""

import requests
import json
import time

# Configuration
BASE_URL = "https://turfloot-nav.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/party-api"

# Real user IDs from server logs
ANTH_USER_ID = "did:privy:cmeksdeoe00gzl10bsienvnbk"
ROBIEE_USER_ID = "did:privy:cme20s0fl005okz0bmxcr0cp0"

def log(message, level="INFO"):
    timestamp = time.strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def api_request(method, endpoint, data=None, params=None):
    """Make API request with error handling"""
    url = f"{API_BASE}/{endpoint}"
    headers = {'Content-Type': 'application/json'}
    
    try:
        if method == 'GET':
            response = requests.get(url, params=params, headers=headers, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=10)
        
        log(f"{method} {endpoint} -> {response.status_code}")
        
        if response.status_code == 200:
            return True, response.json()
        else:
            try:
                error = response.json()
                return False, error
            except:
                return False, {"error": f"HTTP {response.status_code}", "text": response.text[:200]}
    except Exception as e:
        return False, {"error": str(e)}

def test_complete_invitation_workflow():
    """Test the complete invitation workflow"""
    log("🎯 COMPREHENSIVE PARTY INVITATION WORKFLOW TEST")
    
    # Clean up existing parties
    log("=== CLEANUP: LEAVE EXISTING PARTIES ===")
    for user_name, user_id in [("ANTH", ANTH_USER_ID), ("ROBIEE", ROBIEE_USER_ID)]:
        success, result = api_request('GET', 'current', params={'userId': user_id})
        if success and result.get('hasParty'):
            party = result.get('party')
            party_id = party.get('id')
            
            success, leave_result = api_request('POST', 'leave', {
                'partyId': party_id,
                'userId': user_id
            })
            
            if success:
                log(f"✅ {user_name} left existing party")
            else:
                log(f"⚠️ Could not leave party for {user_name}")
    
    # Test 1: Create Party
    log("=== TEST 1: PARTY CREATION ===")
    success, result = api_request('POST', 'create', {
        'ownerId': ANTH_USER_ID,
        'ownerUsername': 'anth',
        'partyName': 'Final Test Party'
    })
    
    if not success:
        log(f"❌ Party creation failed: {result.get('error')}", "FAIL")
        return False
    
    party_id = result.get('partyId')
    log(f"✅ Party created: {party_id}", "PASS")
    
    # Test 2: Send Invitation
    log("=== TEST 2: SEND INVITATION ===")
    success, result = api_request('POST', 'invite', {
        'partyId': party_id,
        'fromUserId': ANTH_USER_ID,
        'toUserId': ROBIEE_USER_ID,
        'toUsername': 'robiee'
    })
    
    if not success:
        log(f"❌ Invitation sending failed: {result.get('error')}", "FAIL")
        return False
    
    invitation_id = result.get('invitationId')
    log(f"✅ Invitation sent: {invitation_id}", "PASS")
    
    # Test 3: Retrieve Invitations
    log("=== TEST 3: RETRIEVE INVITATIONS ===")
    time.sleep(1)  # Brief delay for consistency
    
    success, result = api_request('GET', 'invitations', params={'userId': ROBIEE_USER_ID})
    
    if not success:
        log(f"❌ Invitation retrieval failed: {result.get('error')}", "FAIL")
        return False
    
    invitations = result.get('invitations', [])
    count = result.get('count', 0)
    log(f"✅ Retrieved {count} invitations", "PASS")
    
    # Verify invitation details
    found_invitation = None
    for inv in invitations:
        if inv.get('id') == invitation_id:
            found_invitation = inv
            break
    
    if not found_invitation:
        log("❌ Invitation not found in recipient's list", "FAIL")
        return False
    
    log("✅ Invitation found in recipient's list", "PASS")
    
    # Verify all required fields
    required_fields = ['id', 'partyId', 'partyName', 'fromUserId', 'fromUsername', 'toUserId', 'toUsername', 'createdAt', 'expiresAt']
    missing_fields = []
    
    for field in required_fields:
        if field not in found_invitation or found_invitation[field] is None:
            missing_fields.append(field)
    
    if missing_fields:
        log(f"❌ Missing fields: {missing_fields}", "FAIL")
        return False
    
    log("✅ All required fields present", "PASS")
    
    # Verify user ID matching
    if found_invitation['fromUserId'] != ANTH_USER_ID:
        log("❌ From User ID mismatch", "FAIL")
        return False
    
    if found_invitation['toUserId'] != ROBIEE_USER_ID:
        log("❌ To User ID mismatch", "FAIL")
        return False
    
    log("✅ User ID matching correct", "PASS")
    
    # Test 4: Accept Invitation
    log("=== TEST 4: ACCEPT INVITATION ===")
    success, result = api_request('POST', 'accept-invitation', {
        'invitationId': invitation_id,
        'userId': ROBIEE_USER_ID
    })
    
    if not success:
        log(f"❌ Invitation acceptance failed: {result.get('error')}", "FAIL")
        return False
    
    log("✅ Invitation accepted successfully", "PASS")
    
    # Test 5: Verify Party Membership
    log("=== TEST 5: VERIFY PARTY MEMBERSHIP ===")
    success, result = api_request('GET', 'current', params={'userId': ROBIEE_USER_ID})
    
    if not success:
        log(f"❌ Party status check failed: {result.get('error')}", "FAIL")
        return False
    
    if not result.get('hasParty'):
        log("❌ User not in party after acceptance", "FAIL")
        return False
    
    party = result.get('party')
    if party.get('id') != party_id:
        log("❌ User in wrong party", "FAIL")
        return False
    
    log("✅ User successfully joined party", "PASS")
    
    # Test 6: Verify Invitation No Longer Pending
    log("=== TEST 6: VERIFY INVITATION NO LONGER PENDING ===")
    success, result = api_request('GET', 'invitations', params={'userId': ROBIEE_USER_ID})
    
    if success:
        remaining_invitations = result.get('invitations', [])
        still_pending = any(inv.get('id') == invitation_id for inv in remaining_invitations)
        
        if still_pending:
            log("❌ Invitation still pending after acceptance", "FAIL")
            return False
        else:
            log("✅ Invitation no longer pending", "PASS")
    
    return True

def main():
    log("🚀 FINAL PARTY INVITATION SYSTEM TEST")
    log(f"Testing with ANTH: {ANTH_USER_ID}")
    log(f"Testing with ROBIEE: {ROBIEE_USER_ID}")
    
    success = test_complete_invitation_workflow()
    
    if success:
        log("🎉 ALL TESTS PASSED - PARTY INVITATION SYSTEM WORKING CORRECTLY!", "SUCCESS")
        log("✅ Issue Resolution: The missing toUserId/toUsername fields have been fixed")
        log("✅ Real User ID Format: Both Privy DID formats work correctly")
        log("✅ Complete Workflow: Create → Invite → Retrieve → Accept → Verify all working")
    else:
        log("❌ SOME TESTS FAILED - ISSUES REMAIN", "ERROR")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)