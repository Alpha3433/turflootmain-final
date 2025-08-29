#!/usr/bin/env python3
"""
Targeted test for Party Lobby State Synchronization Bug
This test specifically verifies the issue where:
- Backend says "You already have an active party" when creating a party
- But GET /party-api/current returns hasParty: false
"""

import requests
import json

BASE_URL = "http://localhost:3000"
TEST_USER_ANTH = "did:privy:cmeksdeoe00gzl10bsienvnbk"
TEST_USER_ROBIEE = "did:privy:cme20s0fl005okz0bmxcr0cp0"

def test_party_sync_bug():
    print("🔍 TESTING PARTY LOBBY STATE SYNCHRONIZATION BUG")
    print("=" * 60)
    
    test_users = [
        (TEST_USER_ANTH, "anth"),
        (TEST_USER_ROBIEE, "robiee")
    ]
    
    bug_detected = False
    
    for user_id, username in test_users:
        print(f"\n👤 Testing user: {username} ({user_id})")
        
        # Step 1: Check current party status
        current_response = requests.get(f"{BASE_URL}/party-api/current", params={'userId': user_id})
        
        if current_response.status_code == 200:
            current_data = current_response.json()
            has_party_status = current_data.get('hasParty', False)
            party_data = current_data.get('party')
            
            print(f"   Current party status: hasParty={has_party_status}, party={bool(party_data)}")
            
            # Step 2: Try to create a party
            create_data = {
                'ownerId': user_id,
                'ownerUsername': username,
                'partyName': f'{username} Test Party'
            }
            
            create_response = requests.post(f"{BASE_URL}/party-api/create", json=create_data)
            
            print(f"   Create party response: {create_response.status_code}")
            
            if create_response.status_code in [400, 500]:
                try:
                    error_data = create_response.json()
                    error_message = error_data.get('error', '')
                    print(f"   Create party error: {error_message}")
                    
                    # Check if this is the "already have active party" error
                    if 'already have an active party' in error_message.lower():
                        print(f"   🐛 BUG DETECTED: Backend says user has active party but current status shows hasParty={has_party_status}")
                        
                        if not has_party_status:
                            bug_detected = True
                            print(f"   ❌ SYNCHRONIZATION BUG CONFIRMED: Inconsistent party state!")
                        else:
                            print(f"   ✅ SYNCHRONIZATION OK: Consistent party state")
                    
                except json.JSONDecodeError:
                    print(f"   ⚠️ Could not parse error response")
            
            elif create_response.status_code == 200:
                print(f"   ✅ Party created successfully")
                
                # Check status after creation
                post_create_response = requests.get(f"{BASE_URL}/party-api/current", params={'userId': user_id})
                if post_create_response.status_code == 200:
                    post_create_data = post_create_response.json()
                    post_has_party = post_create_data.get('hasParty', False)
                    print(f"   Post-creation status: hasParty={post_has_party}")
                    
                    if not post_has_party:
                        bug_detected = True
                        print(f"   ❌ SYNCHRONIZATION BUG: Party created but status shows hasParty=false!")
            else:
                print(f"   ⚠️ Unexpected response: {create_response.status_code}")
        else:
            print(f"   ❌ Failed to get current party status: {current_response.status_code}")
    
    print("\n" + "=" * 60)
    if bug_detected:
        print("❌ PARTY LOBBY STATE SYNCHRONIZATION BUG CONFIRMED")
        print("   Issue: Backend party state is inconsistent between create and current endpoints")
        print("   Impact: Users see 'Create New Party' option when they already have a party")
        print("   Root Cause: Discrepancy between parties and party_members collections")
    else:
        print("✅ PARTY LOBBY STATE SYNCHRONIZATION WORKING CORRECTLY")
        print("   All party state checks are consistent")
    
    return not bug_detected

if __name__ == "__main__":
    success = test_party_sync_bug()
    exit(0 if success else 1)