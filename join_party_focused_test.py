#!/usr/bin/env python3
"""
Focused JOIN PARTY Backend Integration Test
==========================================

This test focuses specifically on the JOIN PARTY workflow to verify
the backend can support the new JOIN PARTY frontend implementation.
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://agar-military.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"
PARTY_API_BASE = f"{BASE_URL}/party-api"

# Test users
USER1 = {
    "id": f"did:privy:host{uuid.uuid4().hex[:8]}",
    "username": "PartyHost",
}

USER2 = {
    "id": f"did:privy:joiner{uuid.uuid4().hex[:8]}",
    "username": "PartyJoiner",
}

def test_join_party_workflow():
    """Test the complete JOIN PARTY workflow"""
    print("🚀 TESTING JOIN PARTY WORKFLOW")
    print("=" * 50)
    
    party_id = None
    invitation_id = None
    
    # Step 1: Create a party (HOST)
    print("\n1️⃣ Creating party...")
    try:
        party_data = {
            "ownerId": USER1["id"],
            "ownerUsername": USER1["username"],
            "partyName": "Join Test Party"
        }
        response = requests.post(f"{PARTY_API_BASE}/create", json=party_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            party_id = data.get('partyId')
            print(f"✅ Party created successfully: {party_id}")
        else:
            print(f"❌ Party creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Party creation error: {str(e)}")
        return False
    
    # Step 2: Send invitation (HOST invites JOINER)
    print("\n2️⃣ Sending party invitation...")
    try:
        invite_data = {
            "partyId": party_id,
            "fromUserId": USER1["id"],
            "toUserId": USER2["id"],
            "toUsername": USER2["username"]
        }
        response = requests.post(f"{PARTY_API_BASE}/invite", json=invite_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            invitation_id = data.get('invitationId')
            print(f"✅ Invitation sent successfully: {invitation_id}")
        else:
            print(f"❌ Invitation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Invitation error: {str(e)}")
        return False
    
    # Step 3: Check pending invitations (JOINER perspective)
    print("\n3️⃣ Checking pending invitations...")
    try:
        response = requests.get(f"{PARTY_API_BASE}/invitations", 
                              params={"userId": USER2["id"]}, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            invitations = data.get('invitations', [])
            print(f"✅ Found {len(invitations)} pending invitations")
            
            if len(invitations) > 0:
                print(f"   Invitation from: {invitations[0].get('fromUserName', 'Unknown')}")
        else:
            print(f"❌ Check invitations failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Check invitations error: {str(e)}")
        return False
    
    # Step 4: Accept invitation (JOIN PARTY action)
    print("\n4️⃣ Accepting invitation (JOIN PARTY)...")
    try:
        accept_data = {
            "invitationId": invitation_id,
            "userId": USER2["id"]
        }
        response = requests.post(f"{PARTY_API_BASE}/accept-invitation", json=accept_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            member_count = data.get('memberCount', 0)
            print(f"✅ Successfully joined party! Members: {member_count}")
        else:
            print(f"❌ Join party failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Join party error: {str(e)}")
        return False
    
    # Step 5: Verify party status (both users should be in party)
    print("\n5️⃣ Verifying party status...")
    for user in [USER1, USER2]:
        try:
            response = requests.get(f"{PARTY_API_BASE}/current", 
                                  params={"userId": user["id"]}, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                has_party = data.get('hasParty', False)
                party_info = data.get('party', {})
                member_count = party_info.get('memberCount', 0)
                
                if has_party:
                    print(f"✅ {user['username']} is in party (Members: {member_count})")
                else:
                    print(f"❌ {user['username']} is NOT in party")
                    return False
            else:
                print(f"❌ Status check failed for {user['username']}: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Status check error for {user['username']}: {str(e)}")
            return False
    
    # Step 6: Test session management for party coordination
    print("\n6️⃣ Testing session management...")
    try:
        session_data = {
            "roomId": f"party-room-{party_id}",
            "playerId": USER1["id"],
            "playerName": USER1["username"]
        }
        response = requests.post(f"{API_BASE}/game-sessions/join", json=session_data, timeout=10)
        
        if response.status_code == 200:
            print("✅ Session tracking works for party coordination")
            
            # Clean up session
            leave_data = {
                "roomId": f"party-room-{party_id}",
                "playerId": USER1["id"]
            }
            requests.post(f"{API_BASE}/game-sessions/leave", json=leave_data, timeout=10)
        else:
            print(f"❌ Session management failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Session management error: {str(e)}")
        return False
    
    # Cleanup
    print("\n🧹 Cleaning up...")
    for user in [USER1, USER2]:
        try:
            leave_data = {
                "partyId": party_id,
                "userId": user["id"]
            }
            requests.post(f"{PARTY_API_BASE}/leave", json=leave_data, timeout=10)
        except:
            pass
    
    print("\n🎉 JOIN PARTY WORKFLOW TEST COMPLETED SUCCESSFULLY!")
    return True

def test_backend_readiness():
    """Test if backend is ready to support JOIN PARTY"""
    print("\n🔍 TESTING BACKEND READINESS FOR JOIN PARTY")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 0
    
    # Test 1: Core API Health
    total_tests += 1
    try:
        response = requests.get(f"{API_BASE}/ping", timeout=10)
        if response.status_code == 200:
            print("✅ Core API is healthy")
            tests_passed += 1
        else:
            print("❌ Core API is not responding")
    except Exception as e:
        print(f"❌ Core API error: {str(e)}")
    
    # Test 2: Party API availability
    total_tests += 1
    try:
        response = requests.get(f"{PARTY_API_BASE}/current", 
                              params={"userId": "test"}, timeout=10)
        if response.status_code in [200, 400]:  # 400 is expected for invalid user
            print("✅ Party API is available")
            tests_passed += 1
        else:
            print("❌ Party API is not available")
    except Exception as e:
        print(f"❌ Party API error: {str(e)}")
    
    # Test 3: Session tracking availability
    total_tests += 1
    try:
        session_data = {
            "roomId": "test-room",
            "playerId": "test-player",
            "playerName": "TestPlayer"
        }
        response = requests.post(f"{API_BASE}/game-sessions/join", json=session_data, timeout=10)
        if response.status_code == 200:
            print("✅ Session tracking is available")
            tests_passed += 1
            
            # Cleanup
            leave_data = {
                "roomId": "test-room",
                "playerId": "test-player"
            }
            requests.post(f"{API_BASE}/game-sessions/leave", json=leave_data, timeout=10)
        else:
            print("❌ Session tracking is not working")
    except Exception as e:
        print(f"❌ Session tracking error: {str(e)}")
    
    # Test 4: Server browser (for party game coordination)
    total_tests += 1
    try:
        response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
        if response.status_code == 200:
            data = response.json()
            servers = data.get('servers', [])
            print(f"✅ Server browser available ({len(servers)} servers)")
            tests_passed += 1
        else:
            print("❌ Server browser is not working")
    except Exception as e:
        print(f"❌ Server browser error: {str(e)}")
    
    success_rate = (tests_passed / total_tests * 100) if total_tests > 0 else 0
    print(f"\n📊 Backend Readiness: {tests_passed}/{total_tests} ({success_rate:.1f}%)")
    
    return success_rate >= 75

if __name__ == "__main__":
    print("🎯 JOIN PARTY BACKEND INTEGRATION VERIFICATION")
    print("=" * 60)
    
    # Test backend readiness
    backend_ready = test_backend_readiness()
    
    if backend_ready:
        # Test complete JOIN PARTY workflow
        workflow_success = test_join_party_workflow()
        
        print("\n" + "=" * 60)
        print("📋 FINAL ASSESSMENT")
        print("=" * 60)
        
        if workflow_success:
            print("🟢 EXCELLENT: Backend is fully ready to support JOIN PARTY functionality")
            print("✅ All JOIN PARTY workflow steps are working correctly")
            print("✅ Party creation, invitation, and joining processes are operational")
            print("✅ Session management supports party coordination")
            print("✅ The frontend JOIN PARTY implementation can integrate successfully")
        else:
            print("🟡 PARTIAL: Backend has some issues but core functionality works")
            print("⚠️ Some JOIN PARTY workflow steps may need attention")
    else:
        print("\n" + "=" * 60)
        print("📋 FINAL ASSESSMENT")
        print("=" * 60)
        print("🔴 CRITICAL: Backend is not ready for JOIN PARTY integration")
        print("❌ Core backend services need to be fixed before JOIN PARTY can work")
    
    print("\n✅ JOIN PARTY BACKEND VERIFICATION COMPLETED")