#!/usr/bin/env python3
"""
Debug script to investigate the friend request storage and retrieval issue
"""

import requests
import json
import time

BASE_URL = "https://battle-buddies-7.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def debug_friend_request_flow():
    print("🔍 DEBUGGING FRIEND REQUEST FLOW")
    print("=" * 50)
    
    # Step 1: Register two fresh test users
    timestamp = int(time.time())
    user1 = {
        "userIdentifier": f"debug_user_1_{timestamp}",
        "username": f"DebugUser1_{timestamp}",
        "displayName": f"Debug User 1 {timestamp}",
        "email": f"debug1_{timestamp}@test.com",
        "walletAddress": f"0x{hex(timestamp)[2:].zfill(40)}"
    }
    
    user2 = {
        "userIdentifier": f"debug_user_2_{timestamp}",
        "username": f"DebugUser2_{timestamp}",
        "displayName": f"Debug User 2 {timestamp}",
        "email": f"debug2_{timestamp}@test.com",
        "walletAddress": f"0x{hex(timestamp+1)[2:].zfill(40)}"
    }
    
    print(f"👤 Registering User 1: {user1['userIdentifier']} -> {user1['username']}")
    response1 = requests.post(
        f"{API_BASE}/friends",
        json={
            "action": "register_user",
            "userIdentifier": user1["userIdentifier"],
            "userData": {
                "username": user1["username"],
                "displayName": user1["displayName"],
                "email": user1["email"],
                "walletAddress": user1["walletAddress"]
            }
        },
        timeout=10
    )
    print(f"   Registration result: {response1.status_code} - {response1.json()}")
    
    print(f"👤 Registering User 2: {user2['userIdentifier']} -> {user2['username']}")
    response2 = requests.post(
        f"{API_BASE}/friends",
        json={
            "action": "register_user",
            "userIdentifier": user2["userIdentifier"],
            "userData": {
                "username": user2["username"],
                "displayName": user2["displayName"],
                "email": user2["email"],
                "walletAddress": user2["walletAddress"]
            }
        },
        timeout=10
    )
    print(f"   Registration result: {response2.status_code} - {response2.json()}")
    
    # Step 2: Send friend request from user1 to user2
    print(f"\n📤 Sending friend request from {user1['userIdentifier']} to {user2['username']}")
    friend_request_response = requests.post(
        f"{API_BASE}/friends",
        json={
            "action": "send_request",
            "userIdentifier": user1["userIdentifier"],
            "friendUsername": user2["username"]
        },
        timeout=10
    )
    print(f"   Friend request result: {friend_request_response.status_code}")
    friend_request_data = friend_request_response.json()
    print(f"   Response data: {json.dumps(friend_request_data, indent=2)}")
    
    # Step 3: Check friend requests for user2
    print(f"\n📥 Checking friend requests for {user2['userIdentifier']}")
    requests_response = requests.get(
        f"{API_BASE}/friends?type=requests&userIdentifier={user2['userIdentifier']}", 
        timeout=10
    )
    print(f"   Requests check result: {requests_response.status_code}")
    requests_data = requests_response.json()
    print(f"   Requests data: {json.dumps(requests_data, indent=2)}")
    
    # Step 4: Check if user2 is filtered from user1's available users list
    print(f"\n👥 Checking available users for {user1['userIdentifier']}")
    users_response = requests.get(
        f"{API_BASE}/friends?type=users&userIdentifier={user1['userIdentifier']}", 
        timeout=10
    )
    print(f"   Users list result: {users_response.status_code}")
    users_data = users_response.json()
    
    # Check if user2 is in the list
    user2_found = False
    if 'users' in users_data:
        for user in users_data['users']:
            if user.get('username') == user2['username']:
                user2_found = True
                break
    
    print(f"   Total users available: {len(users_data.get('users', []))}")
    print(f"   User2 ({user2['username']}) found in available users: {user2_found}")
    
    # Summary
    print("\n" + "=" * 50)
    print("🔍 DEBUGGING SUMMARY:")
    print(f"✅ User1 registration: {response1.status_code == 200}")
    print(f"✅ User2 registration: {response2.status_code == 200}")
    print(f"✅ Friend request sent: {friend_request_response.status_code == 200}")
    print(f"✅ Friend request stored: {len(requests_data.get('requests', {}).get('received', [])) > 0}")
    print(f"✅ User filtering working: {not user2_found}")
    
    return {
        'user1': user1,
        'user2': user2,
        'friend_request_success': friend_request_response.status_code == 200,
        'requests_found': len(requests_data.get('requests', {}).get('received', [])) > 0,
        'filtering_working': not user2_found
    }

if __name__ == "__main__":
    result = debug_friend_request_flow()
    print(f"\n🎯 FINAL RESULT: {result}")