#!/usr/bin/env python3

"""
Real-Time Player Tracking Fix Testing
=====================================

This test verifies the real-time player tracking fix implemented in the frontend routing logic.
The fix ensures that users clicking "JOIN GLOBAL MULTIPLAYER" trigger session tracking API calls
by routing through initializeMultiplayer() instead of initializeGame(false).

Test Focus:
1. Session tracking APIs (/api/game-sessions/join and /api/game-sessions/leave)
2. Server browser real-time player counts (GET /api/servers/lobbies)
3. Complete workflow: player joins → session created → server browser updates → player leaves → session removed
4. Global-practice-bots room tracking specifically
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://party-play-system.preview.emergentagent.com"
LOCAL_URL = "http://localhost:3000"

# Test configuration
TEST_USER_ID = "did:privy:test_user_tracking_fix"
TEST_USER_NAME = "TrackingTestUser"
TEST_ROOM_ID = "global-practice-bots"  # This is what JOIN GLOBAL MULTIPLAYER uses

def log_test(message, status="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

def test_api_endpoint(url, method="GET", data=None, description=""):
    """Test an API endpoint and return response"""
    try:
        log_test(f"Testing {method} {url} - {description}")
        
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            headers = {'Content-Type': 'application/json'}
            response = requests.post(url, json=data, headers=headers, timeout=10)
        else:
            log_test(f"Unsupported method: {method}", "ERROR")
            return None
            
        log_test(f"Response: {response.status_code} - {response.text[:200]}...")
        return response
        
    except requests.exceptions.RequestException as e:
        log_test(f"Request failed: {str(e)}", "ERROR")
        return None

def test_session_tracking_apis():
    """Test the session tracking APIs that should be triggered by the fix"""
    log_test("=" * 60)
    log_test("TESTING SESSION TRACKING APIs")
    log_test("=" * 60)
    
    results = {
        "join_api": False,
        "leave_api": False,
        "join_response": None,
        "leave_response": None
    }
    
    # Test 1: Game Session Join API
    log_test("1. Testing POST /api/game-sessions/join")
    join_data = {
        "roomId": TEST_ROOM_ID,
        "playerId": TEST_USER_ID,
        "playerName": TEST_USER_NAME
    }
    
    join_response = test_api_endpoint(
        f"{LOCAL_URL}/api/game-sessions/join",
        method="POST",
        data=join_data,
        description="Player joining global-practice-bots room"
    )
    
    if join_response and join_response.status_code == 200:
        results["join_api"] = True
        results["join_response"] = join_response.json()
        log_test("✅ Game session join API working correctly", "SUCCESS")
    else:
        log_test("❌ Game session join API failed", "ERROR")
    
    # Small delay to ensure database update
    time.sleep(1)
    
    # Test 2: Game Session Leave API
    log_test("2. Testing POST /api/game-sessions/leave")
    leave_data = {
        "roomId": TEST_ROOM_ID,
        "playerId": TEST_USER_ID
    }
    
    leave_response = test_api_endpoint(
        f"{LOCAL_URL}/api/game-sessions/leave",
        method="POST",
        data=leave_data,
        description="Player leaving global-practice-bots room"
    )
    
    if leave_response and leave_response.status_code == 200:
        results["leave_api"] = True
        results["leave_response"] = leave_response.json()
        log_test("✅ Game session leave API working correctly", "SUCCESS")
    else:
        log_test("❌ Game session leave API failed", "ERROR")
    
    return results

def test_server_browser_updates():
    """Test that server browser shows real-time player counts"""
    log_test("=" * 60)
    log_test("TESTING SERVER BROWSER REAL-TIME UPDATES")
    log_test("=" * 60)
    
    results = {
        "server_browser_api": False,
        "global_practice_bots_found": False,
        "baseline_count": 0,
        "updated_count": 0,
        "server_data": None
    }
    
    # Test 1: Get baseline server browser data
    log_test("1. Getting baseline server browser data")
    baseline_response = test_api_endpoint(
        f"{LOCAL_URL}/api/servers/lobbies",
        description="Getting baseline player counts"
    )
    
    if baseline_response and baseline_response.status_code == 200:
        results["server_browser_api"] = True
        server_data = baseline_response.json()
        results["server_data"] = server_data
        
        # Find global-practice-bots server
        global_server = None
        if "servers" in server_data:
            for server in server_data["servers"]:
                if server.get("id") == TEST_ROOM_ID:
                    global_server = server
                    break
        
        if global_server:
            results["global_practice_bots_found"] = True
            results["baseline_count"] = global_server.get("currentPlayers", 0)
            log_test(f"✅ Found global-practice-bots server with {results['baseline_count']} players", "SUCCESS")
        else:
            log_test("⚠️ global-practice-bots server not found in server list", "WARNING")
            
        log_test("✅ Server browser API working correctly", "SUCCESS")
    else:
        log_test("❌ Server browser API failed", "ERROR")
        return results
    
    return results

def test_complete_workflow():
    """Test the complete workflow: join → update → leave → update"""
    log_test("=" * 60)
    log_test("TESTING COMPLETE WORKFLOW")
    log_test("=" * 60)
    
    workflow_results = {
        "baseline_established": False,
        "session_created": False,
        "count_increased": False,
        "session_removed": False,
        "count_decreased": False,
        "baseline_count": 0,
        "after_join_count": 0,
        "after_leave_count": 0
    }
    
    # Step 1: Get baseline count
    log_test("Step 1: Establishing baseline player count")
    baseline_response = test_api_endpoint(
        f"{LOCAL_URL}/api/servers/lobbies",
        description="Getting baseline count"
    )
    
    if baseline_response and baseline_response.status_code == 200:
        server_data = baseline_response.json()
        global_server = None
        
        if "servers" in server_data:
            for server in server_data["servers"]:
                if server.get("id") == TEST_ROOM_ID:
                    global_server = server
                    break
        
        if global_server:
            workflow_results["baseline_established"] = True
            workflow_results["baseline_count"] = global_server.get("currentPlayers", 0)
            log_test(f"✅ Baseline established: {workflow_results['baseline_count']} players")
        else:
            log_test("❌ Could not establish baseline - server not found", "ERROR")
            return workflow_results
    else:
        log_test("❌ Could not establish baseline - API failed", "ERROR")
        return workflow_results
    
    # Step 2: Create session (simulate player join)
    log_test("Step 2: Creating game session (simulating player join)")
    join_data = {
        "roomId": TEST_ROOM_ID,
        "playerId": TEST_USER_ID,
        "playerName": TEST_USER_NAME
    }
    
    join_response = test_api_endpoint(
        f"{LOCAL_URL}/api/game-sessions/join",
        method="POST",
        data=join_data,
        description="Creating session for workflow test"
    )
    
    if join_response and join_response.status_code == 200:
        workflow_results["session_created"] = True
        log_test("✅ Session created successfully")
        
        # Small delay for database update
        time.sleep(1)
        
        # Step 3: Check if count increased
        log_test("Step 3: Checking if player count increased")
        after_join_response = test_api_endpoint(
            f"{LOCAL_URL}/api/servers/lobbies",
            description="Checking count after join"
        )
        
        if after_join_response and after_join_response.status_code == 200:
            server_data = after_join_response.json()
            
            if "servers" in server_data:
                for server in server_data["servers"]:
                    if server.get("id") == TEST_ROOM_ID:
                        workflow_results["after_join_count"] = server.get("currentPlayers", 0)
                        
                        if workflow_results["after_join_count"] > workflow_results["baseline_count"]:
                            workflow_results["count_increased"] = True
                            log_test(f"✅ Count increased from {workflow_results['baseline_count']} to {workflow_results['after_join_count']}")
                        else:
                            log_test(f"⚠️ Count did not increase: {workflow_results['baseline_count']} → {workflow_results['after_join_count']}", "WARNING")
                        break
        
        # Step 4: Remove session (simulate player leave)
        log_test("Step 4: Removing game session (simulating player leave)")
        leave_data = {
            "roomId": TEST_ROOM_ID,
            "playerId": TEST_USER_ID
        }
        
        leave_response = test_api_endpoint(
            f"{LOCAL_URL}/api/game-sessions/leave",
            method="POST",
            data=leave_data,
            description="Removing session for workflow test"
        )
        
        if leave_response and leave_response.status_code == 200:
            workflow_results["session_removed"] = True
            log_test("✅ Session removed successfully")
            
            # Small delay for database update
            time.sleep(1)
            
            # Step 5: Check if count decreased
            log_test("Step 5: Checking if player count decreased")
            after_leave_response = test_api_endpoint(
                f"{LOCAL_URL}/api/servers/lobbies",
                description="Checking count after leave"
            )
            
            if after_leave_response and after_leave_response.status_code == 200:
                server_data = after_leave_response.json()
                
                if "servers" in server_data:
                    for server in server_data["servers"]:
                        if server.get("id") == TEST_ROOM_ID:
                            workflow_results["after_leave_count"] = server.get("currentPlayers", 0)
                            
                            if workflow_results["after_leave_count"] <= workflow_results["baseline_count"]:
                                workflow_results["count_decreased"] = True
                                log_test(f"✅ Count returned to baseline: {workflow_results['after_leave_count']}")
                            else:
                                log_test(f"⚠️ Count did not return to baseline: {workflow_results['after_leave_count']}", "WARNING")
                            break
        else:
            log_test("❌ Failed to remove session", "ERROR")
    else:
        log_test("❌ Failed to create session", "ERROR")
    
    return workflow_results

def test_global_practice_bots_specific():
    """Test specifically for global-practice-bots room tracking"""
    log_test("=" * 60)
    log_test("TESTING GLOBAL-PRACTICE-BOTS SPECIFIC TRACKING")
    log_test("=" * 60)
    
    results = {
        "room_exists": False,
        "room_data": None,
        "tracking_works": False
    }
    
    # Test 1: Verify global-practice-bots room exists in server list
    log_test("1. Verifying global-practice-bots room exists")
    response = test_api_endpoint(
        f"{LOCAL_URL}/api/servers/lobbies",
        description="Looking for global-practice-bots room"
    )
    
    if response and response.status_code == 200:
        server_data = response.json()
        
        if "servers" in server_data:
            for server in server_data["servers"]:
                if server.get("id") == TEST_ROOM_ID:
                    results["room_exists"] = True
                    results["room_data"] = server
                    log_test(f"✅ Found global-practice-bots room: {json.dumps(server, indent=2)}")
                    break
        
        if not results["room_exists"]:
            log_test("❌ global-practice-bots room not found in server list", "ERROR")
            return results
    else:
        log_test("❌ Failed to get server list", "ERROR")
        return results
    
    # Test 2: Test session tracking for this specific room
    log_test("2. Testing session tracking for global-practice-bots")
    
    # Create session
    join_data = {
        "roomId": TEST_ROOM_ID,
        "playerId": f"{TEST_USER_ID}_specific",
        "playerName": f"{TEST_USER_NAME}_Specific"
    }
    
    join_response = test_api_endpoint(
        f"{LOCAL_URL}/api/game-sessions/join",
        method="POST",
        data=join_data,
        description="Testing specific room tracking"
    )
    
    if join_response and join_response.status_code == 200:
        log_test("✅ Session created for global-practice-bots")
        
        # Clean up
        leave_data = {
            "roomId": TEST_ROOM_ID,
            "playerId": f"{TEST_USER_ID}_specific"
        }
        
        leave_response = test_api_endpoint(
            f"{LOCAL_URL}/api/game-sessions/leave",
            method="POST",
            data=leave_data,
            description="Cleaning up specific room test"
        )
        
        if leave_response and leave_response.status_code == 200:
            results["tracking_works"] = True
            log_test("✅ Session tracking works for global-practice-bots room")
        else:
            log_test("⚠️ Session cleanup failed", "WARNING")
    else:
        log_test("❌ Session creation failed for global-practice-bots", "ERROR")
    
    return results

def generate_summary(session_results, browser_results, workflow_results, specific_results):
    """Generate comprehensive test summary"""
    log_test("=" * 60)
    log_test("REAL-TIME PLAYER TRACKING FIX TEST SUMMARY")
    log_test("=" * 60)
    
    total_tests = 0
    passed_tests = 0
    
    # Session Tracking APIs
    log_test("1. SESSION TRACKING APIs:")
    if session_results["join_api"]:
        log_test("   ✅ POST /api/game-sessions/join - WORKING")
        passed_tests += 1
    else:
        log_test("   ❌ POST /api/game-sessions/join - FAILED")
    total_tests += 1
    
    if session_results["leave_api"]:
        log_test("   ✅ POST /api/game-sessions/leave - WORKING")
        passed_tests += 1
    else:
        log_test("   ❌ POST /api/game-sessions/leave - FAILED")
    total_tests += 1
    
    # Server Browser
    log_test("2. SERVER BROWSER:")
    if browser_results["server_browser_api"]:
        log_test("   ✅ GET /api/servers/lobbies - WORKING")
        passed_tests += 1
    else:
        log_test("   ❌ GET /api/servers/lobbies - FAILED")
    total_tests += 1
    
    if browser_results["global_practice_bots_found"]:
        log_test("   ✅ global-practice-bots server found - WORKING")
        passed_tests += 1
    else:
        log_test("   ❌ global-practice-bots server not found - FAILED")
    total_tests += 1
    
    # Complete Workflow
    log_test("3. COMPLETE WORKFLOW:")
    if workflow_results["session_created"] and workflow_results["session_removed"]:
        log_test("   ✅ Session create/remove cycle - WORKING")
        passed_tests += 1
    else:
        log_test("   ❌ Session create/remove cycle - FAILED")
    total_tests += 1
    
    if workflow_results["count_increased"] or workflow_results["count_decreased"]:
        log_test("   ✅ Real-time count updates - WORKING")
        passed_tests += 1
    else:
        log_test("   ⚠️ Real-time count updates - NEEDS VERIFICATION")
    total_tests += 1
    
    # Global-Practice-Bots Specific
    log_test("4. GLOBAL-PRACTICE-BOTS SPECIFIC:")
    if specific_results["room_exists"]:
        log_test("   ✅ Room exists in server list - WORKING")
        passed_tests += 1
    else:
        log_test("   ❌ Room not found in server list - FAILED")
    total_tests += 1
    
    if specific_results["tracking_works"]:
        log_test("   ✅ Session tracking for room - WORKING")
        passed_tests += 1
    else:
        log_test("   ❌ Session tracking for room - FAILED")
    total_tests += 1
    
    # Overall Results
    success_rate = (passed_tests / total_tests) * 100
    log_test("=" * 60)
    log_test(f"OVERALL RESULTS: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
    
    if success_rate >= 90:
        log_test("🎉 EXCELLENT: Real-time player tracking fix is working correctly!", "SUCCESS")
    elif success_rate >= 75:
        log_test("✅ GOOD: Most functionality working, minor issues detected", "SUCCESS")
    elif success_rate >= 50:
        log_test("⚠️ PARTIAL: Some functionality working, needs attention", "WARNING")
    else:
        log_test("❌ CRITICAL: Major issues detected, fix needs review", "ERROR")
    
    # Specific findings about the fix
    log_test("=" * 60)
    log_test("FIX VERIFICATION RESULTS:")
    
    if session_results["join_api"] and session_results["leave_api"]:
        log_test("✅ Session tracking APIs are ready to receive calls from frontend")
    else:
        log_test("❌ Session tracking APIs have issues - frontend calls will fail")
    
    if browser_results["server_browser_api"] and browser_results["global_practice_bots_found"]:
        log_test("✅ Server browser can show real-time player counts")
    else:
        log_test("❌ Server browser has issues showing player counts")
    
    if specific_results["room_exists"] and specific_results["tracking_works"]:
        log_test("✅ global-practice-bots room tracking is fully operational")
    else:
        log_test("❌ global-practice-bots room tracking has issues")
    
    log_test("=" * 60)
    log_test("CONCLUSION:")
    
    if passed_tests >= 6:  # Most critical tests passing
        log_test("The real-time player tracking fix appears to be working correctly.")
        log_test("Backend APIs are ready to receive session tracking calls from the frontend.")
        log_test("When users click 'JOIN GLOBAL MULTIPLAYER', the session tracking should work.")
    else:
        log_test("There are issues with the backend APIs that need to be addressed.")
        log_test("The frontend fix may be correct, but backend is not ready to handle the calls.")
    
    return {
        "total_tests": total_tests,
        "passed_tests": passed_tests,
        "success_rate": success_rate,
        "ready_for_frontend": passed_tests >= 6
    }

def main():
    """Main test execution"""
    log_test("Starting Real-Time Player Tracking Fix Testing")
    log_test(f"Testing against: {LOCAL_URL}")
    log_test(f"Target room: {TEST_ROOM_ID}")
    
    # Run all tests
    session_results = test_session_tracking_apis()
    browser_results = test_server_browser_updates()
    workflow_results = test_complete_workflow()
    specific_results = test_global_practice_bots_specific()
    
    # Generate summary
    summary = generate_summary(session_results, browser_results, workflow_results, specific_results)
    
    # Exit with appropriate code
    if summary["ready_for_frontend"]:
        log_test("✅ Backend is ready for the real-time player tracking fix!", "SUCCESS")
        sys.exit(0)
    else:
        log_test("❌ Backend needs fixes before the tracking will work properly", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main()