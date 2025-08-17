#!/usr/bin/env python3
"""
TurfLoot Backend API Testing Suite
Testing recently fixed API endpoints as requested in review.

Priority Tests:
1. Server Browser API (GET /api/servers/lobbies) - Should return 36 persistent multiplayer servers
2. Live Statistics APIs (GET /api/stats/live-players and GET /api/stats/global-winnings) 
3. Leaderboard API (GET /api/users/leaderboard) - Should return leaderboard array structure
4. Friends API (GET /api/friends/list?userId=demo-user) - Should return friends array structure
"""

import requests
import json
import time
from datetime import datetime

# Configuration - Using localhost since external URL has 502 errors
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_icon} {test_name}: {status}")
    if details:
        print(f"    {details}")

def test_server_browser_api():
    """Test Server Browser API - Priority Test #1"""
    print("\n🎯 PRIORITY TEST #1: Server Browser API")
    print("=" * 60)
    
    try:
        url = f"{API_BASE}/servers/lobbies"
        print(f"Testing: GET {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if servers array exists
            if 'servers' not in data:
                log_test("Server Browser API", "FAIL", "Missing 'servers' field in response")
                return False
            
            servers = data['servers']
            server_count = len(servers)
            
            # Check server count (should be 36 persistent servers)
            if server_count != 36:
                log_test("Server Browser API", "FAIL", f"Expected 36 servers, got {server_count}")
                return False
            
            # Check server structure - verify first server has all required fields
            if servers:
                first_server = servers[0]
                required_fields = ['id', 'name', 'region', 'stake', 'mode', 'currentPlayers', 
                                 'maxPlayers', 'ping', 'status']
                
                missing_fields = [field for field in required_fields if field not in first_server]
                if missing_fields:
                    log_test("Server Browser API", "FAIL", f"Missing fields in server structure: {missing_fields}")
                    return False
            
            # Check regions and game types
            regions = set(server['region'] for server in servers)
            game_types = set(server['stake'] for server in servers)
            
            expected_regions = {'US-East-1', 'US-West-1', 'EU-Central-1'}
            expected_game_types = {0, 1, 5, 20}  # Free, $1, $5, $20
            
            if not expected_regions.issubset(regions):
                log_test("Server Browser API", "FAIL", f"Missing regions. Expected: {expected_regions}, Got: {regions}")
                return False
            
            if not expected_game_types.issubset(game_types):
                log_test("Server Browser API", "FAIL", f"Missing game types. Expected: {expected_game_types}, Got: {game_types}")
                return False
            
            log_test("Server Browser API", "PASS", 
                    f"36 servers returned with proper structure. Regions: {len(regions)}, Game types: {len(game_types)}")
            return True
            
        else:
            log_test("Server Browser API", "FAIL", f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Server Browser API", "FAIL", f"Exception: {str(e)}")
        return False

def test_live_statistics_apis():
    """Test Live Statistics APIs - Priority Test #2"""
    print("\n🎯 PRIORITY TEST #2: Live Statistics APIs")
    print("=" * 60)
    
    results = []
    
    # Test live players endpoint
    try:
        url = f"{API_BASE}/stats/live-players"
        print(f"Testing: GET {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            if 'count' not in data or 'timestamp' not in data:
                log_test("Live Players API", "FAIL", "Missing required fields (count, timestamp)")
                results.append(False)
            else:
                # Validate data types
                if not isinstance(data['count'], int) or not isinstance(data['timestamp'], str):
                    log_test("Live Players API", "FAIL", "Invalid data types for count or timestamp")
                    results.append(False)
                else:
                    log_test("Live Players API", "PASS", f"Count: {data['count']}, Timestamp: {data['timestamp']}")
                    results.append(True)
        else:
            log_test("Live Players API", "FAIL", f"HTTP {response.status_code}: {response.text}")
            results.append(False)
            
    except Exception as e:
        log_test("Live Players API", "FAIL", f"Exception: {str(e)}")
        results.append(False)
    
    # Test global winnings endpoint
    try:
        url = f"{API_BASE}/stats/global-winnings"
        print(f"Testing: GET {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            required_fields = ['total', 'formatted', 'timestamp']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                log_test("Global Winnings API", "FAIL", f"Missing required fields: {missing_fields}")
                results.append(False)
            else:
                # Validate data types and format
                if (not isinstance(data['total'], (int, float)) or 
                    not isinstance(data['formatted'], str) or 
                    not isinstance(data['timestamp'], str)):
                    log_test("Global Winnings API", "FAIL", "Invalid data types")
                    results.append(False)
                else:
                    log_test("Global Winnings API", "PASS", 
                            f"Total: {data['total']}, Formatted: {data['formatted']}, Timestamp: {data['timestamp']}")
                    results.append(True)
        else:
            log_test("Global Winnings API", "FAIL", f"HTTP {response.status_code}: {response.text}")
            results.append(False)
            
    except Exception as e:
        log_test("Global Winnings API", "FAIL", f"Exception: {str(e)}")
        results.append(False)
    
    return all(results)

def test_leaderboard_api():
    """Test Leaderboard API - Priority Test #3"""
    print("\n🎯 PRIORITY TEST #3: Leaderboard API")
    print("=" * 60)
    
    try:
        url = f"{API_BASE}/users/leaderboard"
        print(f"Testing: GET {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            if 'leaderboard' not in data or 'timestamp' not in data:
                log_test("Leaderboard API", "FAIL", "Missing required fields (leaderboard, timestamp)")
                return False
            
            leaderboard = data['leaderboard']
            
            # Validate leaderboard is an array
            if not isinstance(leaderboard, list):
                log_test("Leaderboard API", "FAIL", "Leaderboard should be an array")
                return False
            
            # If leaderboard has entries, check structure
            if leaderboard:
                first_entry = leaderboard[0]
                required_fields = ['rank', 'username', 'gamesWon', 'gamesPlayed', 'totalTerritory']
                missing_fields = [field for field in required_fields if field not in first_entry]
                
                if missing_fields:
                    log_test("Leaderboard API", "FAIL", f"Missing fields in leaderboard entry: {missing_fields}")
                    return False
                
                log_test("Leaderboard API", "PASS", 
                        f"Leaderboard array with {len(leaderboard)} entries, proper structure verified")
            else:
                log_test("Leaderboard API", "PASS", "Leaderboard array structure correct (empty)")
            
            return True
            
        else:
            log_test("Leaderboard API", "FAIL", f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Leaderboard API", "FAIL", f"Exception: {str(e)}")
        return False

def test_friends_api():
    """Test Friends API - Priority Test #4"""
    print("\n🎯 PRIORITY TEST #4: Friends API")
    print("=" * 60)
    
    try:
        # Test with demo-user as specified in the review request
        url = f"{API_BASE}/friends/list?userId=demo-user"
        print(f"Testing: GET {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            if 'friends' not in data or 'timestamp' not in data:
                log_test("Friends API", "FAIL", "Missing required fields (friends, timestamp)")
                return False
            
            friends = data['friends']
            
            # Validate friends is an array
            if not isinstance(friends, list):
                log_test("Friends API", "FAIL", "Friends should be an array")
                return False
            
            # If friends has entries, check structure
            if friends:
                first_friend = friends[0]
                required_fields = ['id', 'username', 'status', 'last_seen']
                missing_fields = [field for field in required_fields if field not in first_friend]
                
                if missing_fields:
                    log_test("Friends API", "FAIL", f"Missing fields in friend entry: {missing_fields}")
                    return False
                
                log_test("Friends API", "PASS", 
                        f"Friends array with {len(friends)} entries, proper structure verified")
            else:
                log_test("Friends API", "PASS", "Friends array structure correct (empty)")
            
            return True
            
        else:
            log_test("Friends API", "FAIL", f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Friends API", "FAIL", f"Exception: {str(e)}")
        return False

def test_missing_userid_friends_api():
    """Test Friends API without userId parameter"""
    print("\n🔍 Additional Test: Friends API without userId")
    print("=" * 60)
    
    try:
        url = f"{API_BASE}/friends/list"
        print(f"Testing: GET {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 400:
            data = response.json()
            if 'error' in data:
                log_test("Friends API (no userId)", "PASS", f"Proper validation: {data['error']}")
                return True
            else:
                log_test("Friends API (no userId)", "FAIL", "Missing error message in 400 response")
                return False
        else:
            log_test("Friends API (no userId)", "FAIL", f"Expected 400, got {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Friends API (no userId)", "FAIL", f"Exception: {str(e)}")
        return False

def main():
    """Run all priority tests"""
    print("🚀 TurfLoot Backend API Testing Suite")
    print("Testing recently fixed API endpoints")
    print("=" * 80)
    
    start_time = time.time()
    
    # Run priority tests
    test_results = []
    
    test_results.append(test_server_browser_api())
    test_results.append(test_live_statistics_apis())
    test_results.append(test_leaderboard_api())
    test_results.append(test_friends_api())
    
    # Additional validation test
    test_results.append(test_missing_userid_friends_api())
    
    # Summary
    end_time = time.time()
    duration = end_time - start_time
    
    print("\n" + "=" * 80)
    print("🏁 TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(test_results)
    total = len(test_results)
    
    print(f"✅ Tests Passed: {passed}/{total}")
    print(f"⏱️  Total Duration: {duration:.3f}s")
    print(f"🎯 Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 ALL PRIORITY TESTS PASSED!")
        print("✅ Server Browser API: 36 persistent servers with proper structure")
        print("✅ Live Statistics APIs: Both endpoints working with correct data structure")
        print("✅ Leaderboard API: Returns proper leaderboard array structure")
        print("✅ Friends API: Returns proper friends array structure with validation")
        print("\n🚀 All recently fixed API endpoints are working correctly!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check logs above for details.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)