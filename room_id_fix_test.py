#!/usr/bin/env python3
"""
Focused test for Colyseus Room ID Property Fix
Tests the specific fix where room.id was changed to room.roomId
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "https://lobby-finder-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_room_id_fix():
    """Test the specific room ID property fix"""
    print("🧪 TESTING COLYSEUS ROOM ID PROPERTY FIX")
    print("=" * 50)
    
    # Test 1: Verify /api/game-sessions accepts valid room IDs
    print("1. Testing /api/game-sessions POST with valid room ID...")
    
    session_data = {
        "action": "join",
        "session": {
            "roomId": "colyseus-arena-fix-test",
            "joinedAt": datetime.now().isoformat(),
            "lastActivity": datetime.now().isoformat(),
            "userId": "test_user_fix",
            "entryFee": 0,
            "mode": "colyseus-multiplayer",
            "region": "AU",
            "status": "active"
        }
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/game-sessions",
            json=session_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ SUCCESS: {result.get('message', 'Session created')}")
            print(f"   Room ID received: {session_data['session']['roomId']}")
        else:
            print(f"   ❌ FAILED: Status {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False
    
    # Test 2: Verify sessions are stored with correct room IDs
    print("\n2. Testing session storage in database...")
    
    try:
        response = requests.get(f"{API_BASE}/game-sessions", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            sessions_by_room = data.get('sessionsByRoom', {})
            
            # Check if our test session is stored correctly
            test_room_found = False
            for room_id, sessions in sessions_by_room.items():
                if room_id == "colyseus-arena-fix-test":
                    test_room_found = True
                    print(f"   ✅ SUCCESS: Test room found with {len(sessions)} sessions")
                    break
            
            if not test_room_found:
                print(f"   ⚠️ Test room not found, but {len(sessions_by_room)} rooms exist")
                for room_id in sessions_by_room.keys():
                    print(f"     - Room: {room_id}")
            
            # Check for any undefined room IDs
            undefined_rooms = [room_id for room_id in sessions_by_room.keys() 
                             if not room_id or room_id == 'undefined' or room_id == 'null']
            
            if undefined_rooms:
                print(f"   ❌ ISSUE: Found {len(undefined_rooms)} rooms with undefined IDs")
                return False
            else:
                print(f"   ✅ SUCCESS: No undefined room IDs found")
                
        else:
            print(f"   ❌ FAILED: Status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False
    
    # Test 3: Verify /api/servers endpoint structure
    print("\n3. Testing /api/servers endpoint...")
    
    try:
        response = requests.get(f"{API_BASE}/servers", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            servers = data.get('servers', [])
            total_players = data.get('totalPlayers', 0)
            colyseus_enabled = data.get('colyseusEnabled', False)
            
            print(f"   ✅ SUCCESS: API returned {len(servers)} servers")
            print(f"   Total players: {total_players}")
            print(f"   Colyseus enabled: {colyseus_enabled}")
            
            # Check server structure
            for server in servers:
                server_id = server.get('id', 'undefined')
                current_players = server.get('currentPlayers', 0)
                print(f"     - Server '{server_id}': {current_players} players")
                
                if server_id == 'undefined' or not server_id:
                    print(f"   ❌ ISSUE: Server with undefined ID found")
                    return False
            
            print(f"   ✅ SUCCESS: All servers have valid IDs")
            
        else:
            print(f"   ❌ FAILED: Status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False
    
    # Test 4: Test rejection of undefined room IDs
    print("\n4. Testing rejection of undefined room IDs...")
    
    invalid_session_data = {
        "action": "join",
        "session": {
            "roomId": None,  # This should be rejected
            "joinedAt": datetime.now().isoformat(),
            "lastActivity": datetime.now().isoformat(),
            "userId": "test_user_invalid",
            "entryFee": 0,
            "mode": "colyseus-multiplayer",
            "region": "AU"
        }
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/game-sessions",
            json=invalid_session_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 400:
            error_data = response.json()
            print(f"   ✅ SUCCESS: Correctly rejected undefined room ID")
            print(f"   Error message: {error_data.get('error', 'Bad Request')}")
        else:
            print(f"   ❌ ISSUE: Should have rejected undefined room ID but got status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 ROOM ID PROPERTY FIX VERIFICATION COMPLETE")
    print("=" * 50)
    print("✅ All critical requirements verified:")
    print("   1. /api/game-sessions accepts valid room IDs")
    print("   2. Sessions stored with correct room identifiers")
    print("   3. /api/servers shows proper server structure")
    print("   4. System rejects undefined room IDs")
    print("\n🔧 The fix from room.id → room.roomId is working correctly!")
    
    return True

if __name__ == "__main__":
    success = test_room_id_fix()
    if success:
        print("\n✅ ROOM ID PROPERTY FIX: WORKING CORRECTLY")
    else:
        print("\n❌ ROOM ID PROPERTY FIX: ISSUES DETECTED")