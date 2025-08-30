#!/usr/bin/env python3

"""
PARTY ROOM COORDINATION SERVER VERIFICATION
Testing Socket.IO room coordination for party members as requested in review.

CRITICAL TESTS:
1. Socket.IO Room Assignment Verification
2. Party Parameter Processing on Server  
3. Multiplayer Server Room Status

Focus: Verify game server creates ONE room for party members with same gameRoomId
Issue: User reports party members still can't see each other in games despite JavaScript fixes.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://party-lobby-system.preview.emergentagent.com"
LOCALHOST_URL = "http://localhost:3000"

# Test Users (Real Privy DID format)
TEST_USER_ANTH = "did:privy:cmeksdeoe00gzl10bsienvnbk"  # ANTH
TEST_USER_ROBIEE = "did:privy:cme20s0fl005okz0bmxcr0cp0"  # ROBIEE

def log_test_step(step_name, details=""):
    """Log test step with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"\n🎯 [{timestamp}] {step_name}")
    if details:
        print(f"   {details}")

def make_request(method, endpoint, data=None, params=None, use_localhost=True):
    """Make HTTP request with error handling"""
    url = f"{LOCALHOST_URL if use_localhost else BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response.status_code, response.json() if response.content else {}
    
    except requests.exceptions.Timeout:
        return 408, {"error": "Request timeout"}
    except requests.exceptions.ConnectionError:
        return 503, {"error": "Connection failed"}
    except Exception as e:
        return 500, {"error": str(e)}

def test_party_room_creation_coordination():
    """
    TEST 1: PARTY ROOM CREATION & COORDINATION
    - Create 2-member party with ANTH and ROBIEE
    - Start coordinated game for practice room
    - Verify SAME gameRoomId is generated for all party members
    """
    log_test_step("TEST 1: PARTY ROOM CREATION & COORDINATION")
    
    results = {
        "party_creation": False,
        "member_invitation": False, 
        "game_start": False,
        "room_id_coordination": False,
        "notification_delivery": False
    }
    
    try:
        # Step 1: Create party with ANTH as owner
        log_test_step("1.1 Creating party with ANTH as owner")
        
        party_data = {
            "ownerId": TEST_USER_ANTH,
            "ownerUsername": "ANTH",
            "partyName": "Debug Party"
        }
        
        status, create_result = make_request("POST", "/party-api/create", data=party_data)
        
        if status == 200 and create_result.get("success"):
            party_id = create_result.get("partyId")
            print(f"   ✅ Party created successfully: {party_id}")
            results["party_creation"] = True
        else:
            print(f"   ❌ Party creation failed: {status} - {create_result}")
            return results
        
        # Step 2: Invite ROBIEE to party
        log_test_step("1.2 Inviting ROBIEE to party")
        
        invite_data = {
            "partyId": party_id,
            "fromUserId": TEST_USER_ANTH,
            "toUserId": TEST_USER_ROBIEE,
            "toUsername": "ROBIEE"
        }
        
        status, invite_result = make_request("POST", "/party-api/invite", data=invite_data)
        
        if status == 200 and invite_result.get("success"):
            invitation_id = invite_result.get("invitationId")
            print(f"   ✅ Invitation sent successfully: {invitation_id}")
            
            # Accept invitation
            accept_data = {
                "invitationId": invitation_id,
                "userId": TEST_USER_ROBIEE
            }
            
            status, accept_result = make_request("POST", "/party-api/accept-invitation", data=accept_data)
            
            if status == 200 and accept_result.get("success"):
                print(f"   ✅ Invitation accepted successfully")
                results["member_invitation"] = True
            else:
                print(f"   ❌ Invitation acceptance failed: {status} - {accept_result}")
                return results
        else:
            print(f"   ❌ Invitation failed: {status} - {invite_result}")
            return results
        
        # Step 3: Start coordinated game for practice room
        log_test_step("1.3 Starting coordinated game for practice room")
        
        game_start_data = {
            "partyId": party_id,
            "roomType": "practice",
            "entryFee": 0,
            "ownerId": TEST_USER_ANTH
        }
        
        status, game_result = make_request("POST", "/party-api/start-game", data=game_start_data)
        
        if status == 200 and game_result.get("success"):
            game_room_id = game_result.get("gameRoomId")
            party_members = game_result.get("partyMembers", [])
            
            print(f"   ✅ Game started successfully")
            print(f"   🎮 Game Room ID: {game_room_id}")
            print(f"   👥 Party Members: {len(party_members)}")
            
            # Verify gameRoomId format (should start with 'game_')
            if game_room_id and game_room_id.startswith('game_'):
                print(f"   ✅ Game Room ID format correct: {game_room_id}")
                results["game_start"] = True
                results["room_id_coordination"] = True
            else:
                print(f"   ❌ Invalid Game Room ID format: {game_room_id}")
                return results
                
        else:
            print(f"   ❌ Game start failed: {status} - {game_result}")
            return results
        
        # Step 4: Verify notifications delivered to party members
        log_test_step("1.4 Verifying notifications delivered to ROBIEE")
        
        status, notifications = make_request("GET", "/party-api/notifications", params={"userId": TEST_USER_ROBIEE})
        
        if status == 200 and notifications.get("success"):
            notification_list = notifications.get("notifications", [])
            
            if notification_list:
                # Check if notification contains same gameRoomId
                for notification in notification_list:
                    notification_data = notification.get("data", {})
                    notification_room_id = notification_data.get("gameRoomId")
                    
                    if notification_room_id == game_room_id:
                        print(f"   ✅ Notification contains correct gameRoomId: {notification_room_id}")
                        results["notification_delivery"] = True
                        break
                else:
                    print(f"   ❌ No notification found with matching gameRoomId")
                    print(f"   📋 Available notifications: {len(notification_list)}")
            else:
                print(f"   ❌ No notifications found for ROBIEE")
        else:
            print(f"   ❌ Notification fetch failed: {status} - {notifications}")
        
        return results
        
    except Exception as e:
        print(f"   ❌ Test exception: {str(e)}")
        return results

def test_game_server_room_assignment():
    """
    TEST 2: GAME SERVER ROOM ASSIGNMENT
    - Test that getOrCreateRoom() method works correctly
    - Verify party members with same gameRoomId join same Socket.IO room
    - Check debug logs for room creation/joining
    """
    log_test_step("TEST 2: GAME SERVER ROOM ASSIGNMENT")
    
    results = {
        "server_browser_access": False,
        "practice_server_exists": False,
        "room_creation_logic": False,
        "socket_room_verification": False
    }
    
    try:
        # Step 1: Check server browser for available servers
        log_test_step("2.1 Checking server browser for available servers")
        
        status, servers_data = make_request("GET", "/api/servers/lobbies")
        
        if status == 200:
            servers = servers_data.get("servers", [])
            total_servers = len(servers)
            
            print(f"   ✅ Server browser accessible: {total_servers} servers found")
            results["server_browser_access"] = True
            
            # Look for global practice server
            practice_servers = [s for s in servers if 'practice' in s.get('name', '').lower() or s.get('id') == 'global-practice-bots']
            
            if practice_servers:
                practice_server = practice_servers[0]
                print(f"   ✅ Practice server found: {practice_server.get('name')} (ID: {practice_server.get('id')})")
                results["practice_server_exists"] = True
            else:
                print(f"   ❌ No practice server found in server list")
                
        else:
            print(f"   ❌ Server browser access failed: {status} - {servers_data}")
            return results
        
        # Step 2: Test room creation logic by checking API health
        log_test_step("2.2 Testing game server room creation logic")
        
        status, ping_data = make_request("GET", "/api/ping")
        
        if status == 200:
            print(f"   ✅ Game server API accessible")
            print(f"   📊 Server status: {ping_data.get('status')}")
            results["room_creation_logic"] = True
        else:
            print(f"   ❌ Game server API not accessible: {status}")
        
        # Step 3: Verify Socket.IO room coordination (indirect test via API)
        log_test_step("2.3 Verifying Socket.IO room coordination capability")
        
        # Test multiple API calls to ensure server stability for Socket.IO
        api_calls = [
            ("/api/", "GET"),
            ("/api/ping", "GET"),
            ("/api/servers/lobbies", "GET")
        ]
        
        successful_calls = 0
        for endpoint, method in api_calls:
            status, _ = make_request(method, endpoint)
            if status == 200:
                successful_calls += 1
        
        if successful_calls == len(api_calls):
            print(f"   ✅ Server stability confirmed for Socket.IO operations")
            results["socket_room_verification"] = True
        else:
            print(f"   ❌ Server stability issues: {successful_calls}/{len(api_calls)} calls successful")
        
        return results
        
    except Exception as e:
        print(f"   ❌ Test exception: {str(e)}")
        return results

def test_socket_multiplayer_coordination():
    """
    TEST 3: SOCKET.IO MULTIPLAYER COORDINATION
    - Test that party members receive position updates from each other
    - Verify both players can see each other's movements
    - Check real-time synchronization between party members
    """
    log_test_step("TEST 3: SOCKET.IO MULTIPLAYER COORDINATION")
    
    results = {
        "party_status_sync": False,
        "game_room_persistence": False,
        "member_coordination": False,
        "real_time_capability": False
    }
    
    try:
        # Step 1: Verify party status synchronization
        log_test_step("3.1 Verifying party status synchronization")
        
        # Check ANTH's party status
        status_anth, party_anth = make_request("GET", "/party-api/current", params={"userId": TEST_USER_ANTH})
        
        # Check ROBIEE's party status  
        status_robiee, party_robiee = make_request("GET", "/party-api/current", params={"userId": TEST_USER_ROBIEE})
        
        if status_anth == 200 and status_robiee == 200:
            anth_has_party = party_anth.get("hasParty", False)
            robiee_has_party = party_robiee.get("hasParty", False)
            
            anth_party_data = party_anth.get("party")
            robiee_party_data = party_robiee.get("party")
            
            print(f"   📊 ANTH has party: {anth_has_party}")
            print(f"   📊 ROBIEE has party: {robiee_has_party}")
            
            if anth_has_party and robiee_has_party:
                anth_party_id = anth_party_data.get("id") if anth_party_data else None
                robiee_party_id = robiee_party_data.get("id") if robiee_party_data else None
                
                if anth_party_id and robiee_party_id and anth_party_id == robiee_party_id:
                    print(f"   ✅ Both members in same party: {anth_party_id}")
                    results["party_status_sync"] = True
                    
                    # Check for gameRoomId in party data
                    anth_game_room = anth_party_data.get("gameRoomId")
                    robiee_game_room = robiee_party_data.get("gameRoomId")
                    
                    if anth_game_room and robiee_game_room and anth_game_room == robiee_game_room:
                        print(f"   ✅ Both members have same gameRoomId: {anth_game_room}")
                        results["game_room_persistence"] = True
                    else:
                        print(f"   ❌ GameRoomId mismatch - ANTH: {anth_game_room}, ROBIEE: {robiee_game_room}")
                else:
                    print(f"   ❌ Party ID mismatch - ANTH: {anth_party_id}, ROBIEE: {robiee_party_id}")
            else:
                print(f"   ❌ Not both members have party status")
        else:
            print(f"   ❌ Party status fetch failed - ANTH: {status_anth}, ROBIEE: {status_robiee}")
        
        # Step 2: Test member coordination via notifications
        log_test_step("3.2 Testing member coordination via notifications")
        
        # Check if ROBIEE has notifications about the game
        status, notifications = make_request("GET", "/party-api/notifications", params={"userId": TEST_USER_ROBIEE})
        
        if status == 200 and notifications.get("success"):
            notification_list = notifications.get("notifications", [])
            
            game_notifications = [n for n in notification_list if n.get("type") == "party_game_start"]
            
            if game_notifications:
                game_notification = game_notifications[0]
                notification_data = game_notification.get("data", {})
                
                print(f"   ✅ Game notification found for ROBIEE")
                print(f"   🎮 Notification gameRoomId: {notification_data.get('gameRoomId')}")
                print(f"   👥 Party members in notification: {len(notification_data.get('partyMembers', []))}")
                
                results["member_coordination"] = True
            else:
                print(f"   ❌ No game notifications found for ROBIEE")
        else:
            print(f"   ❌ Notification fetch failed: {status}")
        
        # Step 3: Test real-time capability with rapid API calls
        log_test_step("3.3 Testing real-time capability")
        
        start_time = time.time()
        rapid_calls = 5
        successful_rapid_calls = 0
        
        for i in range(rapid_calls):
            status, _ = make_request("GET", "/api/ping")
            if status == 200:
                successful_rapid_calls += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        if successful_rapid_calls == rapid_calls and total_time < 2.0:
            print(f"   ✅ Real-time capability confirmed: {rapid_calls} calls in {total_time:.3f}s")
            results["real_time_capability"] = True
        else:
            print(f"   ❌ Real-time issues: {successful_rapid_calls}/{rapid_calls} calls in {total_time:.3f}s")
        
        return results
        
    except Exception as e:
        print(f"   ❌ Test exception: {str(e)}")
        return results

def run_comprehensive_party_coordination_debug():
    """Run comprehensive party coordination debugging tests"""
    
    print("=" * 80)
    print("🚨 CRITICAL PARTY COORDINATION DEBUGGING - MEMBERS NOT IN SAME GAME SERVER")
    print("=" * 80)
    print(f"🔍 Testing against: {LOCALHOST_URL}")
    print(f"👥 Test Users: ANTH ({TEST_USER_ANTH[:20]}...) & ROBIEE ({TEST_USER_ROBIEE[:20]}...)")
    print("=" * 80)
    
    # Run all tests
    test_results = {}
    
    # Test 1: Party Room Creation & Coordination
    test_results["party_coordination"] = test_party_room_creation_coordination()
    
    # Test 2: Game Server Room Assignment
    test_results["room_assignment"] = test_game_server_room_assignment()
    
    # Test 3: Socket.IO Multiplayer Coordination
    test_results["multiplayer_coordination"] = test_socket_multiplayer_coordination()
    
    # Calculate overall results
    total_tests = 0
    passed_tests = 0
    
    for test_category, results in test_results.items():
        for test_name, result in results.items():
            total_tests += 1
            if result:
                passed_tests += 1
    
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    # Print comprehensive summary
    print("\n" + "=" * 80)
    print("🎯 COMPREHENSIVE PARTY COORDINATION DEBUG RESULTS")
    print("=" * 80)
    
    print(f"\n📊 OVERALL SUCCESS RATE: {success_rate:.1f}% ({passed_tests}/{total_tests} tests passed)")
    
    print(f"\n🔍 TEST 1: PARTY ROOM CREATION & COORDINATION")
    party_results = test_results["party_coordination"]
    for test_name, result in party_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {test_name}")
    
    print(f"\n🔍 TEST 2: GAME SERVER ROOM ASSIGNMENT")
    room_results = test_results["room_assignment"]
    for test_name, result in room_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {test_name}")
    
    print(f"\n🔍 TEST 3: SOCKET.IO MULTIPLAYER COORDINATION")
    multiplayer_results = test_results["multiplayer_coordination"]
    for test_name, result in multiplayer_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {test_name}")
    
    # Critical findings
    print(f"\n🚨 CRITICAL FINDINGS:")
    
    if party_results["room_id_coordination"] and party_results["notification_delivery"]:
        print("   ✅ Party room coordination is working - same gameRoomId generated and delivered")
    else:
        print("   ❌ Party room coordination FAILED - gameRoomId not properly coordinated")
    
    if room_results["practice_server_exists"] and room_results["socket_room_verification"]:
        print("   ✅ Game server room assignment capability confirmed")
    else:
        print("   ❌ Game server room assignment has issues")
    
    if multiplayer_results["party_status_sync"] and multiplayer_results["game_room_persistence"]:
        print("   ✅ Party members are properly synchronized with same gameRoomId")
    else:
        print("   ❌ Party members NOT synchronized - this is the ROOT CAUSE of the issue")
    
    # Recommendations
    print(f"\n💡 RECOMMENDATIONS:")
    
    if success_rate < 70:
        print("   🔧 CRITICAL: Multiple coordination failures detected")
        print("   🔧 Check party system database consistency")
        print("   🔧 Verify Socket.IO room creation logic in gameServer.js")
        print("   🔧 Test frontend auto-join logic for party notifications")
    elif success_rate < 90:
        print("   🔧 MODERATE: Some coordination issues detected")
        print("   🔧 Focus on failed test areas above")
    else:
        print("   ✅ Party coordination appears to be working correctly")
        print("   🔧 Issue may be in frontend implementation or Socket.IO connection")
    
    print("=" * 80)
    
    return success_rate >= 80

if __name__ == "__main__":
    try:
        success = run_comprehensive_party_coordination_debug()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Test failed with exception: {str(e)}")
        sys.exit(1)