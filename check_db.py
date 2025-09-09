#!/usr/bin/env python3
"""
Check what's actually stored in the database
"""

import requests
import json
import time

BASE_URL = "https://party-play-system.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def check_database_content():
    print("🔍 CHECKING DATABASE CONTENT")
    print("=" * 40)
    
    # Register a test user
    timestamp = int(time.time())
    test_user = {
        "userIdentifier": f"db_check_user_{timestamp}",
        "username": f"DBCheckUser_{timestamp}",
        "displayName": f"DB Check User {timestamp}",
        "email": f"dbcheck_{timestamp}@test.com",
        "walletAddress": f"0x{hex(timestamp)[2:].zfill(40)}"
    }
    
    print(f"👤 Registering test user: {test_user['userIdentifier']} -> {test_user['username']}")
    
    # Register the user
    response = requests.post(
        f"{API_BASE}/friends",
        json={
            "action": "register_user",
            "userIdentifier": test_user["userIdentifier"],
            "userData": {
                "username": test_user["username"],
                "displayName": test_user["displayName"],
                "email": test_user["email"],
                "walletAddress": test_user["walletAddress"]
            }
        },
        timeout=10
    )
    
    print(f"   Registration result: {response.status_code}")
    if response.status_code == 200:
        print(f"   Response: {response.json()}")
    else:
        print(f"   Error: {response.text}")
        return
    
    # Now try to get the user list and see if our user appears
    print(f"\n👥 Getting user list to check if our user appears...")
    users_response = requests.get(
        f"{API_BASE}/friends?type=users&userIdentifier=different_user_123", 
        timeout=10
    )
    
    if users_response.status_code == 200:
        users_data = users_response.json()
        users = users_data.get('users', [])
        
        # Look for our test user
        found_user = None
        for user in users:
            if user.get('username') == test_user['username']:
                found_user = user
                break
        
        if found_user:
            print(f"   ✅ Found our test user in the list:")
            print(f"   User data: {json.dumps(found_user, indent=4)}")
        else:
            print(f"   ❌ Our test user not found in the list")
            print(f"   Total users in list: {len(users)}")
            # Show a few sample users
            print(f"   Sample users: {[u.get('username', 'NO_USERNAME') for u in users[:5]]}")
    else:
        print(f"   Error getting users: {users_response.status_code} - {users_response.text}")
    
    # Try to send a friend request to our test user from another user
    print(f"\n📤 Testing friend request to our test user...")
    friend_request_response = requests.post(
        f"{API_BASE}/friends",
        json={
            "action": "send_request",
            "userIdentifier": "another_test_user_123",
            "friendUsername": test_user["username"]
        },
        timeout=10
    )
    
    print(f"   Friend request result: {friend_request_response.status_code}")
    print(f"   Response: {friend_request_response.json()}")

if __name__ == "__main__":
    check_database_content()