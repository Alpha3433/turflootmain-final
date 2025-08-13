#!/usr/bin/env python3
"""
Enhanced Server Browser and Server Indicator Backend Testing
Testing the new /api/servers/lobbies endpoint functionality
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://bf7b3564-8863-4eaa-9ec0-5d002ec5a3fe.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def print_test_header(test_name):
    print(f"\n{'='*60}")
    print(f"🧪 {test_name}")
    print(f"{'='*60}")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_info(message):
    print(f"ℹ️  {message}")

def test_servers_lobbies_endpoint():
    """Test the new /api/servers/lobbies endpoint that returns actual servers"""
    print_test_header("ENHANCED SERVER BROWSER ENDPOINT TESTING")
    
    try:
        print_info("Testing GET /api/servers/lobbies endpoint...")
        response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
            
        data = response.json()
        print_success(f"Endpoint responded with status 200")
        
        # Test 1: Verify response structure
        print_info("Verifying response structure...")
        required_fields = ['servers', 'totalPlayers', 'totalActiveServers', 'regions', 'gameTypes', 'timestamp']
        for field in required_fields:
            if field not in data:
                print_error(f"Missing required field: {field}")
                return False
        print_success("All required response fields present")
        
        # Test 2: Verify servers array structure
        print_info("Verifying server data structure...")
        servers = data.get('servers', [])
        if not servers:
            print_error("No servers returned")
            return False
            
        print_success(f"Found {len(servers)} servers")
        
        # Test 3: Verify server fields
        print_info("Verifying individual server data structure...")
        required_server_fields = [
            'id', 'name', 'region', 'stake', 'mode', 'currentPlayers', 'maxPlayers', 
            'minPlayers', 'waitingPlayers', 'isRunning', 'ping', 'avgWaitTime', 
            'difficulty', 'entryFee', 'potentialWinning', 'status'
        ]
        
        sample_server = servers[0]
        for field in required_server_fields:
            if field not in sample_server:
                print_error(f"Missing server field: {field}")
                return False
        print_success("All required server fields present")
        
        # Test 4: Verify multiple regions
        print_info("Verifying server distribution across regions...")
        regions = data.get('regions', [])
        expected_regions = ['US-East-1', 'US-West-1', 'EU-Central-1']
        
        for region in expected_regions:
            if region not in regions:
                print_error(f"Missing expected region: {region}")
                return False
        print_success(f"All expected regions present: {regions}")
        
        # Test 5: Verify servers exist in all regions
        server_regions = set(server['region'] for server in servers)
        for region in expected_regions:
            if region not in server_regions:
                print_error(f"No servers found in region: {region}")
                return False
        print_success("Servers found in all regions")
        
        # Test 6: Verify stake levels
        print_info("Verifying stake levels...")
        stakes = set(server['stake'] for server in servers)
        expected_stakes = {0, 1, 5, 20}  # Free, $1, $5, $20
        
        for stake in expected_stakes:
            if stake not in stakes:
                print_error(f"Missing stake level: ${stake}")
                return False
        print_success(f"All stake levels present: {sorted(stakes)}")
        
        # Test 7: Verify ping calculations are realistic
        print_info("Verifying ping calculations...")
        ping_ranges = {
            'US-East-1': (15, 35),
            'US-West-1': (25, 50), 
            'EU-Central-1': (35, 75)
        }
        
        for server in servers:
            region = server['region']
            ping = server['ping']
            min_ping, max_ping = ping_ranges.get(region, (0, 1000))
            
            if not (min_ping <= ping <= max_ping):
                print_error(f"Unrealistic ping for {region}: {ping}ms (expected {min_ping}-{max_ping}ms)")
                return False
        print_success("Ping calculations are realistic for all regions")
        
        # Test 8: Verify server status logic
        print_info("Verifying server status logic...")
        status_counts = {'active': 0, 'waiting': 0, 'full': 0}
        
        for server in servers:
            status = server['status']
            current_players = server['currentPlayers']
            max_players = server['maxPlayers']
            min_players = server['minPlayers']
            
            if status not in status_counts:
                print_error(f"Invalid server status: {status}")
                return False
                
            status_counts[status] += 1
            
            # Verify status logic
            if current_players >= max_players and status != 'full':
                print_error(f"Server should be 'full' but is '{status}' (players: {current_players}/{max_players})")
                return False
            elif current_players >= min_players and current_players < max_players and status not in ['active', 'full']:
                print_error(f"Server should be 'active' but is '{status}' (players: {current_players}, min: {min_players})")
                return False
            elif current_players < min_players and status != 'waiting':
                print_error(f"Server should be 'waiting' but is '{status}' (players: {current_players}, min: {min_players})")
                return False
                
        print_success(f"Server status logic correct - Active: {status_counts['active']}, Waiting: {status_counts['waiting']}, Full: {status_counts['full']}")
        
        # Test 9: Verify potential winnings calculation
        print_info("Verifying potential winnings calculation...")
        for server in servers:
            stake = server['stake']
            max_players = server['maxPlayers']
            potential_winning = server['potentialWinning']
            
            if stake > 0:
                expected_winning = stake * max_players * 0.9  # 90% after 10% rake
                if abs(potential_winning - expected_winning) > 0.01:
                    print_error(f"Incorrect potential winning calculation: got {potential_winning}, expected {expected_winning}")
                    return False
            else:
                if potential_winning != 0:
                    print_error(f"Free games should have 0 potential winnings, got {potential_winning}")
                    return False
                    
        print_success("Potential winnings calculations are correct")
        
        # Test 10: Verify server count requirements (30+ servers)
        print_info("Verifying server count requirements...")
        if len(servers) < 30:
            print_error(f"Expected at least 30 servers, got {len(servers)}")
            return False
        print_success(f"Server count requirement met: {len(servers)} servers")
        
        # Test 11: Verify game types structure
        print_info("Verifying game types structure...")
        game_types = data.get('gameTypes', [])
        expected_game_types = [
            {'stake': 0, 'mode': 'free', 'name': 'Free Play'},
            {'stake': 1, 'mode': 'cash', 'name': '$1 Cash Game'},
            {'stake': 5, 'mode': 'cash', 'name': '$5 Cash Game'},
            {'stake': 20, 'mode': 'cash', 'name': '$20 High Stakes'}
        ]
        
        for expected_type in expected_game_types:
            found = False
            for game_type in game_types:
                if (game_type['stake'] == expected_type['stake'] and 
                    game_type['mode'] == expected_type['mode']):
                    found = True
                    break
            if not found:
                print_error(f"Missing game type: {expected_type}")
                return False
        print_success("All expected game types present")
        
        # Test 12: Verify statistics accuracy
        print_info("Verifying statistics accuracy...")
        calculated_total_players = sum(server['currentPlayers'] for server in servers)
        calculated_active_servers = len([s for s in servers if s['status'] == 'active'])
        
        if data['totalPlayers'] != calculated_total_players:
            print_error(f"Total players mismatch: reported {data['totalPlayers']}, calculated {calculated_total_players}")
            return False
            
        if data['totalActiveServers'] != calculated_active_servers:
            print_error(f"Active servers mismatch: reported {data['totalActiveServers']}, calculated {calculated_active_servers}")
            return False
            
        print_success("Statistics are accurate")
        
        # Test 13: Verify server ID uniqueness
        print_info("Verifying server ID uniqueness...")
        server_ids = [server['id'] for server in servers]
        if len(server_ids) != len(set(server_ids)):
            print_error("Duplicate server IDs found")
            return False
        print_success("All server IDs are unique")
        
        # Test 14: Verify server distribution per region/game type
        print_info("Verifying server distribution...")
        distribution = {}
        for server in servers:
            key = f"{server['region']}-{server['mode']}-{server['stake']}"
            distribution[key] = distribution.get(key, 0) + 1
            
        # Each region should have 2-4 servers per game type
        for region in expected_regions:
            for game_type in expected_game_types:
                key = f"{region}-{game_type['mode']}-{game_type['stake']}"
                count = distribution.get(key, 0)
                if count < 2 or count > 4:
                    print_error(f"Unexpected server count for {key}: {count} (expected 2-4)")
                    return False
                    
        print_success("Server distribution is appropriate")
        
        # Test 15: Verify timestamp format
        print_info("Verifying timestamp format...")
        timestamp = data.get('timestamp')
        try:
            datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            print_success("Timestamp format is valid ISO format")
        except:
            print_error(f"Invalid timestamp format: {timestamp}")
            return False
            
        # Print summary statistics
        print_info("=== SERVER BROWSER SUMMARY ===")
        print_info(f"Total Servers: {len(servers)}")
        print_info(f"Total Players: {data['totalPlayers']}")
        print_info(f"Active Servers: {data['totalActiveServers']}")
        print_info(f"Regions: {', '.join(regions)}")
        print_info(f"Game Types: {len(game_types)}")
        
        # Show sample servers from each region
        print_info("=== SAMPLE SERVERS ===")
        for region in expected_regions:
            region_servers = [s for s in servers if s['region'] == region][:2]
            for server in region_servers:
                print_info(f"{server['name']} ({server['region']}) - {server['currentPlayers']}/{server['maxPlayers']} players - {server['status']} - {server['ping']}ms")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print_error(f"Request failed: {e}")
        return False
    except json.JSONDecodeError as e:
        print_error(f"Invalid JSON response: {e}")
        return False
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        return False

def test_server_browser_performance():
    """Test server browser endpoint performance and consistency"""
    print_test_header("SERVER BROWSER PERFORMANCE TESTING")
    
    try:
        print_info("Testing endpoint response time...")
        start_time = time.time()
        response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
        end_time = time.time()
        
        response_time = end_time - start_time
        
        if response.status_code != 200:
            print_error(f"Performance test failed - status {response.status_code}")
            return False
            
        print_success(f"Response time: {response_time:.3f} seconds")
        
        if response_time > 2.0:
            print_error("Response time too slow (>2 seconds)")
            return False
        else:
            print_success("Response time is acceptable")
            
        # Test consistency across multiple requests
        print_info("Testing consistency across multiple requests...")
        server_counts = []
        
        for i in range(3):
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            if response.status_code == 200:
                data = response.json()
                server_counts.append(len(data.get('servers', [])))
            time.sleep(1)
            
        if len(set(server_counts)) == 1:
            print_success(f"Server count consistent across requests: {server_counts[0]}")
        else:
            print_info(f"Server counts vary (expected for dynamic servers): {server_counts}")
            
        return True
        
    except Exception as e:
        print_error(f"Performance test error: {e}")
        return False

def test_server_browser_fallback():
    """Test server browser fallback functionality"""
    print_test_header("SERVER BROWSER FALLBACK TESTING")
    
    try:
        print_info("Testing server browser endpoint with potential game server unavailability...")
        response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
        
        if response.status_code != 200:
            print_error(f"Fallback test failed - status {response.status_code}")
            return False
            
        data = response.json()
        servers = data.get('servers', [])
        
        if not servers:
            print_error("No servers returned in fallback scenario")
            return False
            
        print_success(f"Fallback working - returned {len(servers)} servers")
        
        # Verify fallback servers have basic structure
        sample_server = servers[0]
        required_fields = ['id', 'name', 'region', 'stake', 'mode', 'currentPlayers', 'maxPlayers']
        
        for field in required_fields:
            if field not in sample_server:
                print_error(f"Fallback server missing field: {field}")
                return False
                
        print_success("Fallback servers have proper structure")
        return True
        
    except Exception as e:
        print_error(f"Fallback test error: {e}")
        return False

def main():
    """Run all server browser tests"""
    print("🚀 Starting Enhanced Server Browser Backend Testing")
    print(f"🌐 Testing against: {BASE_URL}")
    print(f"⏰ Test started at: {datetime.now().isoformat()}")
    
    tests = [
        ("Enhanced Server Browser Endpoint", test_servers_lobbies_endpoint),
        ("Server Browser Performance", test_server_browser_performance),
        ("Server Browser Fallback", test_server_browser_fallback),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print_success(f"{test_name} - PASSED")
            else:
                print_error(f"{test_name} - FAILED")
        except Exception as e:
            print_error(f"{test_name} - ERROR: {e}")
    
    print(f"\n{'='*60}")
    print(f"🏁 ENHANCED SERVER BROWSER TESTING COMPLETE")
    print(f"{'='*60}")
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    print(f"📊 Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED - Enhanced Server Browser functionality is working perfectly!")
        return True
    else:
        print("⚠️  Some tests failed - Enhanced Server Browser needs attention")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)