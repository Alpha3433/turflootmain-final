#!/usr/bin/env python3
"""
Manual Session Creation and Server Browser Verification Test
Testing the complete chain from session creation → database update → server browser refresh

This test specifically addresses the review request:
1. Create a manual session for global-practice-bots room using session tracking API
2. Verify server browser immediately shows updated player count (0/50 to 1/50)
3. Confirm real-time verification works
4. Clean up session and verify count goes back to 0/50
"""

import requests
import json
import time
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/api"

print(f"🎯 MANUAL SESSION CREATION AND SERVER BROWSER VERIFICATION TEST")
print(f"🔗 API Base URL: {API_BASE}")
print(f"📅 Test Started: {datetime.now().isoformat()}")
print("=" * 80)

def test_api_endpoint(method, endpoint, data=None, expected_status=200):
    """Test an API endpoint and return response"""
    url = f"{API_BASE}/{endpoint}"
    
    try:
        start_time = time.time()
        
        if method.upper() == 'GET':
            response = requests.get(url, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        end_time = time.time()
        response_time = round(end_time - start_time, 3)
        
        print(f"  📡 {method} {endpoint} -> {response.status_code} ({response_time}s)")
        
        if response.status_code == expected_status:
            try:
                return response.json(), response_time
            except:
                return response.text, response_time
        else:
            print(f"  ❌ Expected {expected_status}, got {response.status_code}")
            try:
                error_data = response.json()
                print(f"  📄 Error: {error_data}")
                return error_data, response_time
            except:
                return {"error": response.text}, response_time
                
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Request failed: {str(e)}")
        return {"error": str(e)}, 0

def get_global_server_player_count():
    """Get current player count for global-practice-bots server"""
    print("  📊 Fetching current server browser data...")
    data, response_time = test_api_endpoint('GET', 'servers/lobbies')
    
    if 'error' in data:
        print(f"  ❌ Failed to get server data: {data}")
        return None, response_time
    
    # Find the global practice server
    for server in data.get('servers', []):
        if server.get('id') == 'global-practice-bots':
            player_count = server.get('currentPlayers', 0)
            max_players = server.get('maxPlayers', 50)
            print(f"  📈 Global server: {player_count}/{max_players} players")
            return player_count, response_time
    
    print("  ❌ Global practice server not found in server browser")
    return None, response_time

def manual_session_verification_test():
    """
    Complete manual session verification test as requested in review
    """
    print("\n🧪 MANUAL SESSION CREATION AND VERIFICATION TEST")
    print("-" * 60)
    
    # Test session data for global-practice-bots room
    test_session = {
        "roomId": "global-practice-bots",
        "playerId": "manual_test_player_001",
        "playerName": "ManualTestPlayer"
    }
    
    print("🔍 STEP 1: Get baseline player count for global-practice-bots")
    baseline_count, baseline_time = get_global_server_player_count()
    
    if baseline_count is None:
        print("❌ Cannot proceed - failed to get baseline player count")
        return False
    
    print(f"✅ Baseline established: {baseline_count}/50 players")
    
    print("\n🎮 STEP 2: Create manual session for global-practice-bots room")
    print(f"  Creating session: {test_session['playerName']} → {test_session['roomId']}")
    
    join_result, join_time = test_api_endpoint('POST', 'game-sessions/join', test_session)
    
    if 'error' in join_result:
        print(f"❌ Manual session creation failed: {join_result}")
        return False
    
    if not join_result.get('success'):
        print(f"❌ Session creation returned unexpected response: {join_result}")
        return False
    
    print(f"✅ Manual session created successfully ({join_time}s)")
    print(f"  📝 Message: {join_result.get('message', 'Session created')}")
    
    print("\n⏱️ STEP 3: Immediate server browser check (real-time verification)")
    print("  Checking if server browser immediately reflects the change...")
    
    # Check immediately (no delay)
    immediate_count, immediate_time = get_global_server_player_count()
    
    if immediate_count is None:
        print("❌ Failed to get immediate player count")
        return False
    
    expected_count = baseline_count + 1
    
    if immediate_count == expected_count:
        print(f"✅ IMMEDIATE UPDATE VERIFIED: {baseline_count}/50 → {immediate_count}/50 players")
        print(f"  🚀 Real-time update working perfectly (response time: {immediate_time}s)")
        immediate_success = True
    else:
        print(f"⚠️ Immediate count mismatch: expected {expected_count}, got {immediate_count}")
        print("  ⏳ Checking if there's a slight delay...")
        
        # Wait 2 seconds and check again
        time.sleep(2)
        delayed_count, delayed_time = get_global_server_player_count()
        
        if delayed_count == expected_count:
            print(f"✅ DELAYED UPDATE VERIFIED: {baseline_count}/50 → {delayed_count}/50 players")
            print(f"  ⏱️ Update detected after 2-second delay (response time: {delayed_time}s)")
            immediate_success = True
        else:
            print(f"❌ Even after delay: expected {expected_count}, got {delayed_count}")
            immediate_success = False
    
    print("\n🔄 STEP 4: Session cleanup and verification")
    print("  Removing the manual session...")
    
    leave_data = {
        "roomId": test_session["roomId"],
        "playerId": test_session["playerId"]
    }
    
    leave_result, leave_time = test_api_endpoint('POST', 'game-sessions/leave', leave_data)
    
    if 'error' in leave_result:
        print(f"❌ Session cleanup failed: {leave_result}")
        return False
    
    if not leave_result.get('success'):
        print(f"❌ Session cleanup returned unexpected response: {leave_result}")
        return False
    
    print(f"✅ Session cleanup successful ({leave_time}s)")
    print(f"  📝 Message: {leave_result.get('message', 'Session removed')}")
    
    print("\n📉 STEP 5: Verify count returns to baseline (0/50 verification)")
    print("  Checking if player count returns to original baseline...")
    
    # Check immediately after cleanup
    final_count, final_time = get_global_server_player_count()
    
    if final_count is None:
        print("❌ Failed to get final player count")
        return False
    
    if final_count == baseline_count:
        print(f"✅ CLEANUP VERIFIED: Count returned to baseline {baseline_count}/50 players")
        print(f"  🔄 Complete cycle working perfectly (response time: {final_time}s)")
        cleanup_success = True
    else:
        print(f"⚠️ Final count mismatch: expected {baseline_count}, got {final_count}")
        print("  ⏳ Checking if there's a cleanup delay...")
        
        # Wait 2 seconds and check again
        time.sleep(2)
        delayed_final_count, delayed_final_time = get_global_server_player_count()
        
        if delayed_final_count == baseline_count:
            print(f"✅ DELAYED CLEANUP VERIFIED: Count returned to baseline {baseline_count}/50 players")
            print(f"  ⏱️ Cleanup detected after 2-second delay (response time: {delayed_final_time}s)")
            cleanup_success = True
        else:
            print(f"❌ Even after delay: expected {baseline_count}, got {delayed_final_count}")
            cleanup_success = False
    
    # Overall test result
    overall_success = immediate_success and cleanup_success
    
    print("\n" + "=" * 60)
    print("📋 MANUAL SESSION VERIFICATION TEST RESULTS")
    print("=" * 60)
    
    print(f"✅ Session Creation: SUCCESS")
    print(f"{'✅' if immediate_success else '❌'} Real-time Update: {'SUCCESS' if immediate_success else 'FAILED'}")
    print(f"✅ Session Cleanup: SUCCESS")
    print(f"{'✅' if cleanup_success else '❌'} Baseline Restoration: {'SUCCESS' if cleanup_success else 'FAILED'}")
    
    if overall_success:
        print("\n🎉 COMPLETE SUCCESS: Manual session creation and server browser verification working perfectly!")
        print("   The complete chain from session creation → database update → server browser refresh is operational.")
    else:
        print("\n⚠️ PARTIAL SUCCESS: Some issues detected in the real-time update chain.")
        print("   Session tracking works but there may be timing or synchronization issues.")
    
    return overall_success

def enhanced_debugging_test():
    """
    Enhanced debugging test with detailed logging
    """
    print("\n🔍 ENHANCED DEBUGGING TEST WITH DETAILED LOGGING")
    print("-" * 60)
    
    # Multiple test sessions to verify database behavior
    test_sessions = [
        {
            "roomId": "global-practice-bots",
            "playerId": "debug_test_player_001",
            "playerName": "DebugPlayer1"
        },
        {
            "roomId": "global-practice-bots", 
            "playerId": "debug_test_player_002",
            "playerName": "DebugPlayer2"
        }
    ]
    
    print("📊 Getting initial state...")
    initial_count, _ = get_global_server_player_count()
    
    if initial_count is None:
        print("❌ Cannot get initial state")
        return False
    
    print(f"🎯 Initial state: {initial_count}/50 players")
    
    print("\n🎮 Adding players one by one with detailed tracking...")
    
    for i, session in enumerate(test_sessions):
        print(f"\n  Player {i+1}: {session['playerName']}")
        
        # Join session
        join_result, join_time = test_api_endpoint('POST', 'game-sessions/join', session)
        
        if 'error' in join_result or not join_result.get('success'):
            print(f"  ❌ Failed to add player {i+1}")
            continue
        
        print(f"  ✅ Player {i+1} joined ({join_time}s)")
        
        # Check immediate update
        current_count, check_time = get_global_server_player_count()
        expected_count = initial_count + i + 1
        
        if current_count == expected_count:
            print(f"  ✅ Count updated correctly: {current_count}/50 (expected {expected_count})")
        else:
            print(f"  ⚠️ Count mismatch: got {current_count}/50, expected {expected_count}")
        
        # Small delay between additions
        time.sleep(1)
    
    print("\n🚪 Removing players one by one...")
    
    for i, session in enumerate(test_sessions):
        print(f"\n  Removing Player {i+1}: {session['playerName']}")
        
        leave_data = {
            "roomId": session["roomId"],
            "playerId": session["playerId"]
        }
        
        # Leave session
        leave_result, leave_time = test_api_endpoint('POST', 'game-sessions/leave', leave_data)
        
        if 'error' in leave_result or not leave_result.get('success'):
            print(f"  ❌ Failed to remove player {i+1}")
            continue
        
        print(f"  ✅ Player {i+1} removed ({leave_time}s)")
        
        # Check immediate update
        current_count, check_time = get_global_server_player_count()
        expected_count = initial_count + len(test_sessions) - (i + 1)
        
        if current_count == expected_count:
            print(f"  ✅ Count updated correctly: {current_count}/50 (expected {expected_count})")
        else:
            print(f"  ⚠️ Count mismatch: got {current_count}/50, expected {expected_count}")
        
        # Small delay between removals
        time.sleep(1)
    
    # Final verification
    print("\n📊 Final state verification...")
    final_count, _ = get_global_server_player_count()
    
    if final_count == initial_count:
        print(f"✅ Final state matches initial: {final_count}/50 players")
        return True
    else:
        print(f"⚠️ Final state mismatch: got {final_count}/50, expected {initial_count}/50")
        return False

def run_manual_session_test():
    """Run the complete manual session test suite"""
    print("🚀 STARTING MANUAL SESSION CREATION AND SERVER BROWSER VERIFICATION")
    print("=" * 80)
    
    # Run main test
    main_test_success = manual_session_verification_test()
    
    # Run enhanced debugging test
    debug_test_success = enhanced_debugging_test()
    
    print("\n" + "=" * 80)
    print("📋 COMPLETE TEST SUITE RESULTS")
    print("=" * 80)
    
    print(f"{'✅' if main_test_success else '❌'} Manual Session Verification: {'PASSED' if main_test_success else 'FAILED'}")
    print(f"{'✅' if debug_test_success else '❌'} Enhanced Debugging Test: {'PASSED' if debug_test_success else 'FAILED'}")
    
    overall_success = main_test_success and debug_test_success
    
    if overall_success:
        print("\n🎉 EXCELLENT: Complete manual session creation and server browser verification is working!")
        print("   ✅ Session tracking API functional")
        print("   ✅ Database updates working")
        print("   ✅ Server browser reflects real-time changes")
        print("   ✅ Session cleanup working")
    else:
        print("\n⚠️ ISSUES DETECTED: Some problems found in the manual session verification chain")
        if not main_test_success:
            print("   ❌ Main verification test failed")
        if not debug_test_success:
            print("   ❌ Enhanced debugging test failed")
    
    print(f"\n📅 Test Completed: {datetime.now().isoformat()}")
    return overall_success

if __name__ == "__main__":
    success = run_manual_session_test()
    exit(0 if success else 1)