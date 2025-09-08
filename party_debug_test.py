#!/usr/bin/env python3
"""
Focused Party Invitation Debug Test
Testing the specific issue: anth sent invitation to robiee but robiee doesn't see it
"""

import requests
import json
import time
from urllib.parse import quote, unquote

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

def main():
    log("🎯 PARTY INVITATION DEBUG TEST - REAL USER IDS")
    log(f"ANTH: {ANTH_USER_ID}")
    log(f"ROBIEE: {ROBIEE_USER_ID}")
    
    # Step 1: Check existing invitations for ROBIEE
    log("=== STEP 1: CHECK EXISTING INVITATIONS FOR ROBIEE ===")
    success, result = api_request('GET', 'invitations', params={'userId': ROBIEE_USER_ID})
    
    if success:
        invitations = result.get('invitations', [])
        count = result.get('count', 0)
        log(f"✅ Found {count} existing invitations for ROBIEE")
        
        if invitations:
            log("📋 Existing invitations:")
            for inv in invitations:
                log(f"   ID: {inv.get('id')}")
                log(f"   From: {inv.get('fromUserId')} ({inv.get('fromUsername')})")
                log(f"   To: {inv.get('toUserId')}")
                log(f"   Party: {inv.get('partyName')}")
                log(f"   Status: {inv.get('status', 'pending')}")
                
                # Check if this is from ANTH
                if inv.get('fromUserId') == ANTH_USER_ID:
                    log("🎯 FOUND INVITATION FROM ANTH TO ROBIEE!", "SUCCESS")
                    log("   This means the invitation system IS working correctly")
                    return True
        else:
            log("❌ No existing invitations found for ROBIEE")
    else:
        log(f"❌ Failed to check invitations: {result.get('error')}", "ERROR")
        return False
    
    # Step 2: Check current party status for both users
    log("=== STEP 2: CHECK CURRENT PARTY STATUS ===")
    
    for user_name, user_id in [("ANTH", ANTH_USER_ID), ("ROBIEE", ROBIEE_USER_ID)]:
        success, result = api_request('GET', 'current', params={'userId': user_id})
        if success:
            has_party = result.get('hasParty', False)
            party = result.get('party')
            log(f"✅ {user_name} party status: {'Has party' if has_party else 'No party'}")
            if has_party and party:
                log(f"   Party ID: {party.get('id')}")
                log(f"   Party Name: {party.get('name')}")
                log(f"   Members: {party.get('memberCount', 0)}")
        else:
            log(f"❌ Failed to check {user_name} party status: {result.get('error')}", "ERROR")
    
    # Step 3: Leave existing parties to clean slate
    log("=== STEP 3: CLEAN SLATE - LEAVE EXISTING PARTIES ===")
    
    for user_name, user_id in [("ANTH", ANTH_USER_ID), ("ROBIEE", ROBIEE_USER_ID)]:
        success, result = api_request('GET', 'current', params={'userId': user_id})
        if success and result.get('hasParty'):
            party = result.get('party')
            party_id = party.get('id')
            
            log(f"Leaving existing party for {user_name}: {party_id}")
            success, leave_result = api_request('POST', 'leave', {
                'partyId': party_id,
                'userId': user_id
            })
            
            if success:
                log(f"✅ {user_name} left party successfully")
            else:
                log(f"❌ Failed to leave party for {user_name}: {leave_result.get('error')}", "ERROR")
    
    # Step 4: Create fresh party for ANTH
    log("=== STEP 4: CREATE FRESH PARTY FOR ANTH ===")
    
    success, result = api_request('POST', 'create', {
        'ownerId': ANTH_USER_ID,
        'ownerUsername': 'anth',
        'partyName': 'Debug Test Party'
    })
    
    if not success:
        log(f"❌ Failed to create party: {result.get('error')}", "ERROR")
        return False
    
    party_id = result.get('partyId')
    log(f"✅ Created party: {party_id}")
    
    # Step 5: Send invitation from ANTH to ROBIEE
    log("=== STEP 5: SEND INVITATION FROM ANTH TO ROBIEE ===")
    
    success, result = api_request('POST', 'invite', {
        'partyId': party_id,
        'fromUserId': ANTH_USER_ID,
        'toUserId': ROBIEE_USER_ID,
        'toUsername': 'robiee'
    })
    
    if not success:
        log(f"❌ Failed to send invitation: {result.get('error')}", "ERROR")
        return False
    
    invitation_id = result.get('invitationId')
    log(f"✅ Sent invitation: {invitation_id}")
    
    # Step 6: Verify ROBIEE can see the invitation
    log("=== STEP 6: VERIFY ROBIEE CAN SEE INVITATION ===")
    
    # Wait a moment for database consistency
    time.sleep(1)
    
    success, result = api_request('GET', 'invitations', params={'userId': ROBIEE_USER_ID})
    
    if not success:
        log(f"❌ Failed to check invitations: {result.get('error')}", "ERROR")
        return False
    
    invitations = result.get('invitations', [])
    count = result.get('count', 0)
    log(f"📊 ROBIEE has {count} pending invitations")
    
    # Look for our specific invitation
    found_invitation = None
    for inv in invitations:
        if inv.get('id') == invitation_id:
            found_invitation = inv
            break
    
    if found_invitation:
        log("✅ SUCCESS: ROBIEE CAN SEE THE INVITATION FROM ANTH!", "SUCCESS")
        log(f"   Invitation details:")
        log(f"   - ID: {found_invitation.get('id')}")
        log(f"   - From: {found_invitation.get('fromUserId')}")
        log(f"   - To: {found_invitation.get('toUserId')}")
        log(f"   - Party: {found_invitation.get('partyName')}")
        
        # Verify user ID matching
        if found_invitation.get('fromUserId') == ANTH_USER_ID:
            log("✅ From User ID matches exactly")
        else:
            log("❌ From User ID mismatch!", "ERROR")
            
        if found_invitation.get('toUserId') == ROBIEE_USER_ID:
            log("✅ To User ID matches exactly")
        else:
            log("❌ To User ID mismatch!", "ERROR")
            
        return True
    else:
        log("❌ CRITICAL: INVITATION NOT FOUND IN ROBIEE'S LIST!", "ERROR")
        log("🔍 This confirms the reported issue!")
        
        if invitations:
            log("📋 Available invitations:")
            for inv in invitations:
                log(f"   - {inv.get('id')} from {inv.get('fromUserId')}")
        
        # Debug: Check for user ID format issues
        log("=== DEBUG: USER ID FORMAT ANALYSIS ===")
        log(f"Expected fromUserId: '{ANTH_USER_ID}'")
        log(f"Expected toUserId: '{ROBIEE_USER_ID}'")
        
        for inv in invitations:
            stored_from = inv.get('fromUserId', '')
            stored_to = inv.get('toUserId', '')
            
            log(f"Stored fromUserId: '{stored_from}'")
            log(f"Stored toUserId: '{stored_to}'")
            log(f"From match: {stored_from == ANTH_USER_ID}")
            log(f"To match: {stored_to == ROBIEE_USER_ID}")
            
            if stored_from != ANTH_USER_ID:
                log(f"From ID length: stored={len(stored_from)}, expected={len(ANTH_USER_ID)}")
            if stored_to != ROBIEE_USER_ID:
                log(f"To ID length: stored={len(stored_to)}, expected={len(ROBIEE_USER_ID)}")
        
        return False

if __name__ == "__main__":
    success = main()
    if success:
        log("🎉 Party invitation system working correctly!", "SUCCESS")
    else:
        log("❌ Party invitation issue confirmed!", "ERROR")