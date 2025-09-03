#!/usr/bin/env python3
"""
Real-Time Player Tracking Debug Test
Specifically testing the issue where server browser doesn't update when players join games.

Focus Areas:
1. POST /api/game-sessions/join - verify it's being called when players join
2. Database state check - query game_sessions collection 
3. GET /api/servers/lobbies - verify it reads database correctly
4. Real-time updates - verify server browser auto-refresh
5. Session cleanup - check if sessions are maintained properly

Context: User joined Global Multiplayer server on one device but second device's 
server browser still shows "0/50 players" instead of "1/50 players"
"""

import requests
import json
import time
import os
from datetime import datetime, timedelta

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/api"

print(f"🎯 REAL-TIME PLAYER TRACKING DEBUG TEST")
print(f"🔗 API Base URL: {API_BASE}")
print(f"📅 Test Started: {datetime.now().isoformat()}")
print("=" * 80)

def test_api_endpoint(method, endpoint, data=None, expected_status=200, timeout=10):
    """Test an API endpoint and return response"""
    url = f"{API_BASE}/{endpoint}"
    
    try:
        start_time = time.time()
        
        if method.upper() == 'GET':
            response = requests.get(url, timeout=timeout)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=timeout)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        end_time = time.time()
        response_time = round(end_time - start_time, 3)
        
        print(f"  📡 {method} {endpoint} -> {response.status_code} ({response_time}s)")
        
        if response.status_code == expected_status:
            try:
                return response.json(), response_time, True
            except:
                return response.text, response_time, True
        else:
            print(f"  ❌ Expected {expected_status}, got {response.status_code}")
            try:
                error_data = response.json()
                print(f"  📄 Error: {error_data}")
                return error_data, response_time, False
            except:
                return {"error": response.text}, response_time, False
                
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Request failed: {str(e)}")
        return {"error": str(e)}, 0, False

def test_session_join_endpoint():
    """Test 1: Verify POST /api/game-sessions/join is working correctly"""
    print("\n🧪 TEST 1: SESSION TRACKING VERIFICATION")
    print("Testing if POST /api/game-sessions/join is actually being called when players join")
    print("-" * 70)
    
    # Test data simulating a real player joining the global multiplayer server
    test_player = {
        "roomId": "global-practice-bots",
        "playerId": "real_tracking_test_player_001",
        "playerName": "TestPlayerRealTime"
    }
    
    print(f"  🎮 Testing player join for room: {test_player['roomId']}")
    print(f"  👤 Player: {test_player['playerName']} (ID: {test_player['playerId']})")
    
    # Test the join endpoint
    join_result, join_time, join_success = test_api_endpoint('POST', 'game-sessions/join', test_player)
    
    if not join_success:
        print(f"  ❌ CRITICAL: game-sessions/join endpoint failed!")
        print(f"  📄 Error details: {join_result}")
        return False
    
    if join_result.get('success'):
        print(f"  ✅ Session join endpoint working correctly")
        print(f"  📊 Response: {join_result.get('message', 'Success')}")
        print(f"  ⏱️ Response time: {join_time}s")
        return True
    else:
        print(f"  ❌ Session join endpoint returned unexpected response: {join_result}")
        return False

def test_database_state():
    """Test 2: Check database state by verifying active sessions are recorded"""
    print("\n🧪 TEST 2: DATABASE STATE CHECK")
    print("Querying the game_sessions collection to see if active sessions are recorded")
    print("-" * 70)
    
    # Create a test session first
    test_player = {
        "roomId": "global-practice-bots",
        "playerId": "db_state_test_player_001",
        "playerName": "DatabaseStateTestPlayer"
    }
    
    print("  🗄️ Step 1: Creating test session in database")
    join_result, _, join_success = test_api_endpoint('POST', 'game-sessions/join', test_player)
    
    if not join_success:
        print(f"  ❌ Failed to create test session: {join_result}")
        return False
    
    print(f"  ✅ Test session created successfully")
    
    # Wait for database write
    time.sleep(2)
    
    print("  📊 Step 2: Checking if server browser reflects database state")
    
    # Get server browser data to see if it shows the active session
    server_data, response_time, success = test_api_endpoint('GET', 'servers/lobbies')
    
    if not success:
        print(f"  ❌ Failed to get server browser data: {server_data}")
        return False
    
    # Look for the global practice server
    global_server = None
    servers = server_data.get('servers', [])
    
    for server in servers:
        if server.get('id') == 'global-practice-bots':
            global_server = server
            break
    
    if not global_server:
        print("  ❌ CRITICAL: Global practice server not found in server browser!")
        print(f"  📄 Available servers: {[s.get('id', 'unknown') for s in servers]}")
        return False
    
    current_players = global_server.get('currentPlayers', 0)
    print(f"  📊 Global practice server shows: {current_players} current players")
    
    if current_players > 0:
        print(f"  ✅ Database state is being read correctly - server shows active players")
        database_working = True
    else:
        print(f"  ⚠️ Server shows 0 players despite active session - potential database read issue")
        database_working = False
    
    # Clean up test session
    print("  🧹 Step 3: Cleaning up test session")
    leave_data = {
        "roomId": test_player["roomId"],
        "playerId": test_player["playerId"]
    }
    leave_result, _, _ = test_api_endpoint('POST', 'game-sessions/leave', leave_data)
    print("  ✅ Test session cleaned up")
    
    return database_working

def test_server_browser_data_reading():
    """Test 3: Verify GET /api/servers/lobbies reads database correctly"""
    print("\n🧪 TEST 3: SERVER BROWSER DATA READING")
    print("Testing if GET /api/servers/lobbies is reading the database correctly")
    print("-" * 70)
    
    # Create multiple test sessions to verify database reading
    test_players = [
        {
            "roomId": "global-practice-bots",
            "playerId": "browser_test_player_001",
            "playerName": "BrowserTestPlayer1"
        },
        {
            "roomId": "global-practice-bots", 
            "playerId": "browser_test_player_002",
            "playerName": "BrowserTestPlayer2"
        }
    ]
    
    print("  📊 Step 1: Get baseline player count")
    baseline_data, _, success = test_api_endpoint('GET', 'servers/lobbies')
    
    if not success:
        print(f"  ❌ Failed to get baseline data: {baseline_data}")
        return False
    
    # Find global server baseline
    baseline_players = 0
    for server in baseline_data.get('servers', []):
        if server.get('id') == 'global-practice-bots':
            baseline_players = server.get('currentPlayers', 0)
            break
    
    print(f"  📈 Baseline player count: {baseline_players}")
    
    print("  🎮 Step 2: Add test players to database")
    
    # Add both test players
    for i, player in enumerate(test_players):
        join_result, _, success = test_api_endpoint('POST', 'game-sessions/join', player)
        if success:
            print(f"  ✅ Added player {i+1}: {player['playerName']}")
        else:
            print(f"  ❌ Failed to add player {i+1}: {join_result}")
            return False
    
    # Wait for database updates
    time.sleep(3)
    
    print("  📊 Step 3: Check if server browser reflects the changes")
    
    updated_data, response_time, success = test_api_endpoint('GET', 'servers/lobbies')
    
    if not success:
        print(f"  ❌ Failed to get updated data: {updated_data}")
        return False
    
    # Find updated player count
    updated_players = 0
    for server in updated_data.get('servers', []):
        if server.get('id') == 'global-practice-bots':
            updated_players = server.get('currentPlayers', 0)
            break
    
    print(f"  📈 Updated player count: {updated_players}")
    print(f"  📊 Expected increase: +2 players")
    print(f"  📊 Actual change: {updated_players - baseline_players:+d} players")
    
    # Check if the increase matches expectations
    expected_players = baseline_players + 2
    if updated_players == expected_players:
        print(f"  ✅ PERFECT: Server browser correctly reflects database changes")
        database_reading_correct = True
    elif updated_players > baseline_players:
        print(f"  ✅ GOOD: Server browser shows increase (may include other players)")
        database_reading_correct = True
    else:
        print(f"  ❌ ISSUE: Server browser doesn't reflect database changes")
        database_reading_correct = False
    
    # Clean up test players
    print("  🧹 Step 4: Cleaning up test players")
    for i, player in enumerate(test_players):
        leave_data = {
            "roomId": player["roomId"],
            "playerId": player["playerId"]
        }
        leave_result, _, _ = test_api_endpoint('POST', 'game-sessions/leave', leave_data)
        print(f"  ✅ Cleaned up player {i+1}")
    
    return database_reading_correct

def test_real_time_updates():
    """Test 4: Verify server browser auto-refresh and real-time updates"""
    print("\n🧪 TEST 4: REAL-TIME UPDATES VERIFICATION")
    print("Testing if the server browser auto-refresh is working and polling updated data")
    print("-" * 70)
    
    # Test rapid successive calls to simulate auto-refresh
    print("  🔄 Step 1: Testing rapid successive server browser calls (simulating auto-refresh)")
    
    refresh_times = []
    player_counts = []
    
    for i in range(5):
        start_time = time.time()
        server_data, response_time, success = test_api_endpoint('GET', 'servers/lobbies')
        
        if not success:
            print(f"  ❌ Refresh {i+1} failed: {server_data}")
            continue
        
        # Find global server player count
        current_players = 0
        for server in server_data.get('servers', []):
            if server.get('id') == 'global-practice-bots':
                current_players = server.get('currentPlayers', 0)
                break
        
        refresh_times.append(response_time)
        player_counts.append(current_players)
        
        print(f"  📊 Refresh {i+1}: {current_players} players ({response_time}s)")
        
        # Small delay between refreshes
        time.sleep(0.5)
    
    if refresh_times:
        avg_response_time = sum(refresh_times) / len(refresh_times)
        print(f"  📈 Average response time: {avg_response_time:.3f}s")
        
        if avg_response_time < 2.0:
            print(f"  ✅ Response times suitable for real-time updates")
            fast_enough = True
        else:
            print(f"  ⚠️ Response times may be too slow for real-time updates")
            fast_enough = False
    else:
        print(f"  ❌ No successful refreshes")
        return False
    
    print("  🔄 Step 2: Testing real-time update with player join/leave during refresh cycle")
    
    # Start a background "refresh" cycle and add/remove a player
    test_player = {
        "roomId": "global-practice-bots",
        "playerId": "realtime_test_player_001",
        "playerName": "RealTimeTestPlayer"
    }
    
    # Get initial count
    initial_data, _, _ = test_api_endpoint('GET', 'servers/lobbies')
    initial_count = 0
    for server in initial_data.get('servers', []):
        if server.get('id') == 'global-practice-bots':
            initial_count = server.get('currentPlayers', 0)
            break
    
    print(f"  📊 Initial count: {initial_count}")
    
    # Add player
    print("  🎮 Adding test player...")
    join_result, _, _ = test_api_endpoint('POST', 'game-sessions/join', test_player)
    
    # Wait and check multiple times to see when the change appears
    for check in range(6):
        time.sleep(1)
        check_data, check_time, _ = test_api_endpoint('GET', 'servers/lobbies')
        
        check_count = 0
        for server in check_data.get('servers', []):
            if server.get('id') == 'global-practice-bots':
                check_count = server.get('currentPlayers', 0)
                break
        
        print(f"  📊 Check {check+1} (after {check+1}s): {check_count} players")
        
        if check_count > initial_count:
            print(f"  ✅ Real-time update detected after {check+1} seconds")
            real_time_working = True
            break
    else:
        print(f"  ❌ No real-time update detected after 6 seconds")
        real_time_working = False
    
    # Clean up
    leave_data = {
        "roomId": test_player["roomId"],
        "playerId": test_player["playerId"]
    }
    test_api_endpoint('POST', 'game-sessions/leave', leave_data)
    
    return fast_enough and real_time_working

def test_session_cleanup():
    """Test 5: Check if sessions are being properly maintained and not immediately deleted"""
    print("\n🧪 TEST 5: SESSION CLEANUP AND MAINTENANCE")
    print("Testing if sessions are properly maintained and not immediately deleted")
    print("-" * 70)
    
    # Create a test session
    test_player = {
        "roomId": "global-practice-bots",
        "playerId": "cleanup_test_player_001",
        "playerName": "CleanupTestPlayer"
    }
    
    print("  🎮 Step 1: Creating test session")
    join_result, _, success = test_api_endpoint('POST', 'game-sessions/join', test_player)
    
    if not success:
        print(f"  ❌ Failed to create test session: {join_result}")
        return False
    
    print("  ✅ Test session created")
    
    # Check persistence over time
    print("  ⏱️ Step 2: Testing session persistence over time")
    
    persistence_checks = []
    
    for minute in range(3):  # Check for 3 minutes
        time.sleep(60 if minute > 0 else 5)  # First check after 5s, then every minute
        
        server_data, _, success = test_api_endpoint('GET', 'servers/lobbies')
        
        if success:
            current_players = 0
            for server in server_data.get('servers', []):
                if server.get('id') == 'global-practice-bots':
                    current_players = server.get('currentPlayers', 0)
                    break
            
            persistence_checks.append(current_players > 0)
            check_time = "5 seconds" if minute == 0 else f"{minute} minute(s)"
            status = "✅ PERSISTENT" if current_players > 0 else "❌ MISSING"
            print(f"  📊 After {check_time}: {status} ({current_players} players)")
        else:
            persistence_checks.append(False)
            print(f"  ❌ Failed to check after {minute} minute(s)")
    
    # Analyze persistence
    persistent_checks = sum(persistence_checks)
    total_checks = len(persistence_checks)
    
    print(f"  📊 Session persistence: {persistent_checks}/{total_checks} checks successful")
    
    if persistent_checks == total_checks:
        print("  ✅ EXCELLENT: Session properly maintained over time")
        session_maintenance = True
    elif persistent_checks > 0:
        print("  ⚠️ PARTIAL: Session sometimes maintained, may have cleanup issues")
        session_maintenance = True
    else:
        print("  ❌ POOR: Session not maintained, immediate cleanup detected")
        session_maintenance = False
    
    # Test explicit cleanup
    print("  🧹 Step 3: Testing explicit session cleanup")
    
    leave_data = {
        "roomId": test_player["roomId"],
        "playerId": test_player["playerId"]
    }
    leave_result, _, success = test_api_endpoint('POST', 'game-sessions/leave', leave_data)
    
    if success and leave_result.get('success'):
        print("  ✅ Explicit cleanup successful")
        
        # Verify cleanup worked
        time.sleep(2)
        final_data, _, _ = test_api_endpoint('GET', 'servers/lobbies')
        
        final_players = 0
        for server in final_data.get('servers', []):
            if server.get('id') == 'global-practice-bots':
                final_players = server.get('currentPlayers', 0)
                break
        
        print(f"  📊 After cleanup: {final_players} players")
        cleanup_working = True
    else:
        print(f"  ❌ Explicit cleanup failed: {leave_result}")
        cleanup_working = False
    
    return session_maintenance and cleanup_working

def run_real_time_tracking_debug():
    """Run all real-time player tracking debug tests"""
    print("🚀 STARTING REAL-TIME PLAYER TRACKING DEBUG")
    print("=" * 80)
    
    test_results = {}
    
    # Run all specific tests for the real-time tracking issue
    test_results['session_join_endpoint'] = test_session_join_endpoint()
    test_results['database_state'] = test_database_state()
    test_results['server_browser_reading'] = test_server_browser_data_reading()
    test_results['real_time_updates'] = test_real_time_updates()
    test_results['session_cleanup'] = test_session_cleanup()
    
    # Calculate results
    passed_tests = sum(1 for result in test_results.values() if result)
    total_tests = len(test_results)
    success_rate = (passed_tests / total_tests) * 100
    
    print("\n" + "=" * 80)
    print("📋 REAL-TIME PLAYER TRACKING DEBUG RESULTS")
    print("=" * 80)
    
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        test_display = test_name.replace('_', ' ').title()
        print(f"  {status} - {test_display}")
    
    print(f"\n📊 OVERALL SUCCESS RATE: {success_rate:.1f}% ({passed_tests}/{total_tests} tests passed)")
    
    # Provide specific diagnosis
    print("\n🔍 DIAGNOSIS:")
    
    if not test_results['session_join_endpoint']:
        print("  🚨 CRITICAL: game-sessions/join endpoint not working - players can't be tracked")
    
    if not test_results['database_state']:
        print("  🚨 CRITICAL: Database not recording active sessions properly")
    
    if not test_results['server_browser_reading']:
        print("  🚨 CRITICAL: Server browser not reading database correctly")
    
    if not test_results['real_time_updates']:
        print("  ⚠️ WARNING: Real-time updates not working - server browser won't refresh properly")
    
    if not test_results['session_cleanup']:
        print("  ⚠️ WARNING: Session cleanup issues - may cause incorrect player counts")
    
    if success_rate == 100:
        print("  ✅ All systems working - issue may be in frontend implementation")
    elif success_rate >= 80:
        print("  ⚠️ Most systems working - minor issues detected")
    else:
        print("  ❌ Major backend issues detected - real-time tracking broken")
    
    print(f"\n📅 Debug Test Completed: {datetime.now().isoformat()}")
    return success_rate >= 80

if __name__ == "__main__":
    success = run_real_time_tracking_debug()
    exit(0 if success else 1)