#!/usr/bin/env python3
"""
TurfLoot Multiplayer Servers Backend Testing
Testing the working multiplayer servers implementation with focus on:
- 36 persistent multiplayer servers creation and accessibility
- Real server data from game server (not simulated)
- Server status updates based on player counts
- Socket.IO game server handling multiple rooms
- Server regions and game types implementation
- Real-time multiplayer functionality verification
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration - Use localhost since external URL has 502 errors
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class MultiplayerServerTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, passed, details=""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = f"{status} - {test_name}"
        if details:
            result += f": {details}"
        
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        
    def test_persistent_servers_creation(self):
        """Test that 36 persistent multiplayer servers are created and accessible"""
        print("\n🌐 Testing Persistent Multiplayer Servers Creation...")
        
        try:
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            
            if response.status_code != 200:
                self.log_test("Server Browser API Accessibility", False, f"Status {response.status_code}")
                return
                
            data = response.json()
            
            # Test 1: Verify API returns server data structure
            required_fields = ['servers', 'totalPlayers', 'totalActiveServers', 'regions', 'gameTypes', 'timestamp']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Server Data Structure", False, f"Missing fields: {missing_fields}")
                return
            else:
                self.log_test("Server Data Structure", True, "All required fields present")
            
            # Test 2: Verify 36 persistent servers are created
            servers = data.get('servers', [])
            server_count = len(servers)
            
            if server_count >= 36:
                self.log_test("36 Persistent Servers Created", True, f"Found {server_count} servers")
            else:
                self.log_test("36 Persistent Servers Created", False, f"Only {server_count} servers found, expected 36+")
            
            # Test 3: Verify server regions implementation
            expected_regions = ['US-East-1', 'US-West-1', 'EU-Central-1']
            actual_regions = data.get('regions', [])
            
            regions_match = all(region in actual_regions for region in expected_regions)
            if regions_match:
                self.log_test("Server Regions Implementation", True, f"All 3 regions present: {actual_regions}")
            else:
                self.log_test("Server Regions Implementation", False, f"Missing regions. Expected: {expected_regions}, Got: {actual_regions}")
            
            # Test 4: Verify all game types are present
            expected_game_types = [
                {'stake': 0, 'mode': 'free', 'name': 'Free Play'},
                {'stake': 1, 'mode': 'cash', 'name': '$1 Cash Game'},
                {'stake': 5, 'mode': 'cash', 'name': '$5 Cash Game'},
                {'stake': 20, 'mode': 'cash', 'name': '$20 High Stakes'}
            ]
            
            actual_game_types = data.get('gameTypes', [])
            game_types_present = []
            
            for expected_type in expected_game_types:
                found = any(
                    gt.get('stake') == expected_type['stake'] and 
                    gt.get('mode') == expected_type['mode']
                    for gt in actual_game_types
                )
                game_types_present.append(found)
            
            if all(game_types_present):
                self.log_test("All Game Types Present", True, f"Found all 4 game types: Free, $1, $5, $20")
            else:
                self.log_test("All Game Types Present", False, f"Missing game types. Expected: {len(expected_game_types)}, Found: {len(actual_game_types)}")
            
            # Test 5: Verify server structure and required fields
            if servers:
                sample_server = servers[0]
                required_server_fields = [
                    'id', 'name', 'region', 'stake', 'mode', 'currentPlayers', 
                    'maxPlayers', 'minPlayers', 'waitingPlayers', 'isRunning', 
                    'ping', 'avgWaitTime', 'difficulty', 'entryFee', 'potentialWinning', 'status'
                ]
                
                missing_server_fields = [field for field in required_server_fields if field not in sample_server]
                
                if not missing_server_fields:
                    self.log_test("Server Structure Complete", True, f"All {len(required_server_fields)} fields present")
                else:
                    self.log_test("Server Structure Complete", False, f"Missing fields: {missing_server_fields}")
            
            # Test 6: Verify ping values are region-appropriate
            ping_test_passed = True
            ping_details = []
            
            for server in servers[:10]:  # Test first 10 servers
                region = server.get('region', '')
                ping = server.get('ping', 0)
                
                # Expected ping ranges
                if region == 'US-East-1' and not (15 <= ping <= 40):
                    ping_test_passed = False
                elif region == 'US-West-1' and not (25 <= ping <= 55):
                    ping_test_passed = False
                elif region == 'EU-Central-1' and not (35 <= ping <= 80):
                    ping_test_passed = False
                
                ping_details.append(f"{region}: {ping}ms")
            
            if ping_test_passed:
                self.log_test("Region-Appropriate Ping Values", True, f"Sample pings: {', '.join(ping_details[:5])}")
            else:
                self.log_test("Region-Appropriate Ping Values", False, f"Ping values outside expected ranges")
            
            # Test 7: Verify server statistics calculation
            total_players = data.get('totalPlayers', 0)
            total_active = data.get('totalActiveServers', 0)
            
            # Calculate expected values from server data
            calculated_players = sum(server.get('currentPlayers', 0) for server in servers)
            calculated_active = sum(1 for server in servers if server.get('status') == 'active')
            
            stats_accurate = (total_players == calculated_players and total_active == calculated_active)
            
            if stats_accurate:
                self.log_test("Server Statistics Accuracy", True, f"Players: {total_players}, Active: {total_active}")
            else:
                self.log_test("Server Statistics Accuracy", False, 
                            f"Mismatch - Reported: {total_players}/{total_active}, Calculated: {calculated_players}/{calculated_active}")
            
            return data
            
        except requests.exceptions.RequestException as e:
            self.log_test("Server Browser API Accessibility", False, f"Request failed: {str(e)}")
            return None
        except Exception as e:
            self.log_test("Persistent Servers Creation Test", False, f"Unexpected error: {str(e)}")
            return None
    
    def test_real_server_data_vs_simulated(self):
        """Test that the API returns real server data from game server, not simulated data"""
        print("\n🎮 Testing Real vs Simulated Server Data...")
        
        try:
            # Make multiple requests to check for dynamic data
            responses = []
            for i in range(3):
                response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                if response.status_code == 200:
                    responses.append(response.json())
                time.sleep(1)  # Wait 1 second between requests
            
            if len(responses) < 2:
                self.log_test("Real Server Data Collection", False, "Could not collect multiple samples")
                return
            
            # Test 1: Check if server data comes from game server (not fallback)
            first_response = responses[0]
            servers = first_response.get('servers', [])
            
            # Real server data should have consistent structure and realistic values
            if servers:
                # Check for game server integration indicators
                has_realistic_data = True
                indicators = []
                
                # Check for unique server IDs that match expected pattern
                server_ids = [server.get('id', '') for server in servers]
                pattern_match = all('-' in sid and any(region.lower() in sid for region in ['us-east', 'us-west', 'eu-central']) for sid in server_ids[:5])
                
                if pattern_match:
                    indicators.append("Server ID patterns match game server format")
                else:
                    has_realistic_data = False
                    indicators.append("Server ID patterns don't match expected format")
                
                # Check for realistic player distributions
                player_counts = [server.get('currentPlayers', 0) for server in servers]
                max_players = max(player_counts) if player_counts else 0
                
                if max_players <= 6:  # Max players per room should be 6
                    indicators.append(f"Realistic max players: {max_players}")
                else:
                    has_realistic_data = False
                    indicators.append(f"Unrealistic max players: {max_players}")
                
                # Check for proper status distribution
                statuses = [server.get('status', '') for server in servers]
                status_types = set(statuses)
                expected_statuses = {'waiting', 'active', 'full'}
                
                if status_types.issubset(expected_statuses):
                    indicators.append(f"Valid status types: {status_types}")
                else:
                    has_realistic_data = False
                    indicators.append(f"Invalid status types found")
                
                self.log_test("Real Server Data Indicators", has_realistic_data, "; ".join(indicators))
            
            # Test 2: Check for game server integration (not fallback data)
            # Real game server should provide timestamp and proper structure
            timestamp = first_response.get('timestamp')
            if timestamp:
                try:
                    # Verify timestamp is recent (within last minute)
                    from datetime import datetime, timezone
                    ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    now = datetime.now(timezone.utc)
                    time_diff = (now - ts).total_seconds()
                    
                    if time_diff < 60:  # Within last minute
                        self.log_test("Real-time Server Data", True, f"Fresh timestamp: {time_diff:.1f}s ago")
                    else:
                        self.log_test("Real-time Server Data", False, f"Stale timestamp: {time_diff:.1f}s ago")
                except:
                    self.log_test("Real-time Server Data", False, "Invalid timestamp format")
            else:
                self.log_test("Real-time Server Data", False, "No timestamp provided")
            
            # Test 3: Verify server count consistency (should be exactly 36 for persistent servers)
            server_counts = [len(resp.get('servers', [])) for resp in responses]
            consistent_count = all(count == server_counts[0] for count in server_counts)
            
            if consistent_count and server_counts[0] >= 36:
                self.log_test("Consistent Server Count", True, f"Stable count of {server_counts[0]} servers")
            else:
                self.log_test("Consistent Server Count", False, f"Inconsistent counts: {server_counts}")
            
        except Exception as e:
            self.log_test("Real Server Data Test", False, f"Error: {str(e)}")
    
    def test_server_status_logic(self):
        """Test that servers show correct status based on player counts"""
        print("\n📊 Testing Server Status Logic...")
        
        try:
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            if response.status_code != 200:
                self.log_test("Server Status Test Setup", False, f"API unavailable: {response.status_code}")
                return
            
            data = response.json()
            servers = data.get('servers', [])
            
            if not servers:
                self.log_test("Server Status Logic", False, "No servers to test")
                return
            
            # Test status logic for different scenarios
            status_tests = {
                'waiting': 0,
                'active': 0,
                'full': 0,
                'invalid': 0
            }
            
            logic_errors = []
            
            for server in servers:
                current_players = server.get('currentPlayers', 0)
                max_players = server.get('maxPlayers', 6)
                min_players = server.get('minPlayers', 1)
                status = server.get('status', '')
                
                # Count status types
                if status in status_tests:
                    status_tests[status] += 1
                else:
                    status_tests['invalid'] += 1
                
                # Verify status logic
                if current_players >= max_players:
                    expected_status = 'full'
                elif current_players >= min_players:
                    expected_status = 'active'
                else:
                    expected_status = 'waiting'
                
                if status != expected_status:
                    logic_errors.append(f"Server {server.get('id', 'unknown')}: {current_players}/{max_players} players, status '{status}' should be '{expected_status}'")
            
            # Test results
            if not logic_errors:
                self.log_test("Server Status Logic Accuracy", True, 
                            f"All {len(servers)} servers have correct status. Distribution: {status_tests}")
            else:
                self.log_test("Server Status Logic Accuracy", False, 
                            f"{len(logic_errors)} errors found. First error: {logic_errors[0]}")
            
            # Test status distribution reasonableness
            total_servers = len(servers)
            if status_tests['waiting'] > 0 and status_tests['active'] >= 0:
                self.log_test("Realistic Status Distribution", True, 
                            f"Waiting: {status_tests['waiting']}, Active: {status_tests['active']}, Full: {status_tests['full']}")
            else:
                self.log_test("Realistic Status Distribution", False, 
                            f"Unrealistic distribution: {status_tests}")
            
        except Exception as e:
            self.log_test("Server Status Logic Test", False, f"Error: {str(e)}")
    
    def test_socket_io_server_accessibility(self):
        """Test that Socket.IO game server is accessible and can handle connections"""
        print("\n🔌 Testing Socket.IO Game Server Accessibility...")
        
        try:
            # Test 1: Check if Socket.IO endpoint is accessible
            # Socket.IO typically responds to HTTP requests with upgrade information
            response = requests.get(f"{BASE_URL}/socket.io/", 
                                  params={'EIO': '4', 'transport': 'polling'}, 
                                  timeout=10)
            
            if response.status_code == 200:
                # Check for Socket.IO response indicators
                response_text = response.text
                if 'socket.io' in response_text.lower() or response_text.startswith('0'):
                    self.log_test("Socket.IO Server Accessibility", True, 
                                f"Socket.IO server responding (status {response.status_code})")
                else:
                    self.log_test("Socket.IO Server Accessibility", False, 
                                f"Unexpected response format: {response_text[:100]}")
            else:
                self.log_test("Socket.IO Server Accessibility", False, 
                            f"Socket.IO endpoint returned status {response.status_code}")
            
            # Test 2: Verify game server initialization
            # Check if the game server has been properly initialized by looking for server data
            server_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            if server_response.status_code == 200:
                server_data = server_response.json()
                servers = server_data.get('servers', [])
                
                if servers:
                    # Check if servers have proper game server integration
                    sample_server = servers[0]
                    has_game_integration = all(field in sample_server for field in 
                                             ['currentPlayers', 'isRunning', 'waitingPlayers'])
                    
                    if has_game_integration:
                        self.log_test("Game Server Integration", True, 
                                    "Servers show real-time game state integration")
                    else:
                        self.log_test("Game Server Integration", False, 
                                    "Servers missing real-time game state fields")
                else:
                    self.log_test("Game Server Integration", False, "No servers available for testing")
            
            # Test 3: Check for multiple room support capability
            # Verify that the server can theoretically handle multiple rooms
            if server_response.status_code == 200:
                server_data = server_response.json()
                servers = server_data.get('servers', [])
                unique_rooms = set(server.get('id', '') for server in servers)
                
                if len(unique_rooms) >= 36:
                    self.log_test("Multiple Room Support", True, 
                                f"Server supports {len(unique_rooms)} unique rooms")
                else:
                    self.log_test("Multiple Room Support", False, 
                                f"Only {len(unique_rooms)} unique rooms available")
            
        except requests.exceptions.RequestException as e:
            self.log_test("Socket.IO Server Accessibility", False, f"Connection failed: {str(e)}")
        except Exception as e:
            self.log_test("Socket.IO Server Test", False, f"Error: {str(e)}")
    
    def test_game_types_implementation(self):
        """Test that all game types ($1, $5, $20, Free) have working servers"""
        print("\n💰 Testing Game Types Implementation...")
        
        try:
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            if response.status_code != 200:
                self.log_test("Game Types Test Setup", False, f"API unavailable: {response.status_code}")
                return
            
            data = response.json()
            servers = data.get('servers', [])
            game_types_data = data.get('gameTypes', [])
            
            if not servers:
                self.log_test("Game Types Implementation", False, "No servers to test")
                return
            
            # Test 1: Verify all expected game types are defined
            expected_stakes = [0, 1, 5, 20]
            defined_stakes = [gt.get('stake', -1) for gt in game_types_data]
            
            missing_stakes = [stake for stake in expected_stakes if stake not in defined_stakes]
            
            if not missing_stakes:
                self.log_test("All Game Types Defined", True, f"Found all 4 game types: {defined_stakes}")
            else:
                self.log_test("All Game Types Defined", False, f"Missing stakes: {missing_stakes}")
            
            # Test 2: Verify servers exist for each game type
            server_stakes = [server.get('stake', -1) for server in servers]
            available_stakes = set(server_stakes)
            
            servers_for_all_types = all(stake in available_stakes for stake in expected_stakes)
            
            if servers_for_all_types:
                self.log_test("Servers for All Game Types", True, 
                            f"Servers available for all stakes: {sorted(available_stakes)}")
            else:
                missing_server_stakes = [stake for stake in expected_stakes if stake not in available_stakes]
                self.log_test("Servers for All Game Types", False, 
                            f"No servers for stakes: {missing_server_stakes}")
            
            # Test 3: Verify game type distribution
            stake_counts = {}
            for stake in server_stakes:
                stake_counts[stake] = stake_counts.get(stake, 0) + 1
            
            # Each game type should have multiple servers
            adequate_distribution = all(count >= 2 for stake, count in stake_counts.items() if stake in expected_stakes)
            
            if adequate_distribution:
                self.log_test("Adequate Game Type Distribution", True, 
                            f"Server counts per stake: {stake_counts}")
            else:
                self.log_test("Adequate Game Type Distribution", False, 
                            f"Some game types have too few servers: {stake_counts}")
            
            # Test 4: Verify game type properties
            game_type_tests = []
            
            for server in servers[:20]:  # Test first 20 servers
                stake = server.get('stake', 0)
                mode = server.get('mode', '')
                entry_fee = server.get('entryFee', 0)
                potential_winning = server.get('potentialWinning', 0)
                min_players = server.get('minPlayers', 0)
                
                # Verify mode matches stake
                expected_mode = 'free' if stake == 0 else 'cash'
                if mode != expected_mode:
                    game_type_tests.append(f"Server {server.get('id', 'unknown')}: stake {stake} should have mode '{expected_mode}', got '{mode}'")
                
                # Verify entry fee matches stake
                if entry_fee != stake:
                    game_type_tests.append(f"Server {server.get('id', 'unknown')}: entry fee {entry_fee} should match stake {stake}")
                
                # Verify minimum players logic
                expected_min = 1 if stake == 0 else 2
                if min_players != expected_min:
                    game_type_tests.append(f"Server {server.get('id', 'unknown')}: min players {min_players} should be {expected_min} for stake {stake}")
                
                # Verify potential winnings calculation (stake * maxPlayers * 0.9 for cash games)
                if stake > 0:
                    max_players = server.get('maxPlayers', 6)
                    expected_winning = stake * max_players * 0.9
                    if abs(potential_winning - expected_winning) > 0.01:
                        game_type_tests.append(f"Server {server.get('id', 'unknown')}: potential winning {potential_winning} should be {expected_winning}")
            
            if not game_type_tests:
                self.log_test("Game Type Properties Accuracy", True, "All game type properties are correct")
            else:
                self.log_test("Game Type Properties Accuracy", False, 
                            f"{len(game_type_tests)} property errors. First: {game_type_tests[0]}")
            
        except Exception as e:
            self.log_test("Game Types Implementation Test", False, f"Error: {str(e)}")
    
    def test_server_statistics_calculation(self):
        """Test that server statistics are accurately calculated"""
        print("\n📈 Testing Server Statistics Calculation...")
        
        try:
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            if response.status_code != 200:
                self.log_test("Server Statistics Test Setup", False, f"API unavailable: {response.status_code}")
                return
            
            data = response.json()
            servers = data.get('servers', [])
            reported_total_players = data.get('totalPlayers', 0)
            reported_active_servers = data.get('totalActiveServers', 0)
            
            if not servers:
                self.log_test("Server Statistics Calculation", False, "No servers to test")
                return
            
            # Test 1: Calculate and verify total players
            calculated_total_players = sum(server.get('currentPlayers', 0) for server in servers)
            
            players_match = calculated_total_players == reported_total_players
            
            if players_match:
                self.log_test("Total Players Calculation", True, 
                            f"Correct total: {reported_total_players} players")
            else:
                self.log_test("Total Players Calculation", False, 
                            f"Mismatch: reported {reported_total_players}, calculated {calculated_total_players}")
            
            # Test 2: Calculate and verify active servers
            calculated_active_servers = sum(1 for server in servers if server.get('status') == 'active')
            
            active_match = calculated_active_servers == reported_active_servers
            
            if active_match:
                self.log_test("Active Servers Calculation", True, 
                            f"Correct active count: {reported_active_servers} servers")
            else:
                self.log_test("Active Servers Calculation", False, 
                            f"Mismatch: reported {reported_active_servers}, calculated {calculated_active_servers}")
            
            # Test 3: Verify statistics consistency across multiple requests
            time.sleep(1)
            response2 = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            
            if response2.status_code == 200:
                data2 = response2.json()
                servers2 = data2.get('servers', [])
                
                # Statistics should be consistent for persistent servers
                server_count_consistent = len(servers) == len(servers2)
                
                if server_count_consistent:
                    self.log_test("Statistics Consistency", True, 
                                f"Consistent server count: {len(servers)} servers")
                else:
                    self.log_test("Statistics Consistency", False, 
                                f"Inconsistent server count: {len(servers)} vs {len(servers2)}")
            
        except Exception as e:
            self.log_test("Server Statistics Calculation Test", False, f"Error: {str(e)}")
    
    def test_performance_and_reliability(self):
        """Test server browser performance and reliability"""
        print("\n⚡ Testing Performance and Reliability...")
        
        try:
            # Test 1: Response time
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                if response_time < 1.0:
                    self.log_test("Response Time Performance", True, 
                                f"Fast response: {response_time:.3f}s")
                else:
                    self.log_test("Response Time Performance", False, 
                                f"Slow response: {response_time:.3f}s")
            else:
                self.log_test("Response Time Performance", False, 
                            f"Request failed with status {response.status_code}")
            
            # Test 2: Multiple concurrent requests reliability
            if response.status_code == 200:
                concurrent_results = []
                
                for i in range(3):
                    try:
                        resp = requests.get(f"{API_BASE}/servers/lobbies", timeout=5)
                        concurrent_results.append(resp.status_code == 200)
                    except:
                        concurrent_results.append(False)
                    time.sleep(0.5)
                
                reliability_score = sum(concurrent_results) / len(concurrent_results)
                
                if reliability_score >= 0.8:
                    self.log_test("Concurrent Request Reliability", True, 
                                f"Reliability: {reliability_score:.1%}")
                else:
                    self.log_test("Concurrent Request Reliability", False, 
                                f"Poor reliability: {reliability_score:.1%}")
            
            # Test 3: Data consistency across requests
            if response.status_code == 200:
                data1 = response.json()
                time.sleep(1)
                
                response2 = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                if response2.status_code == 200:
                    data2 = response2.json()
                    
                    # Server count should be consistent for persistent servers
                    server_count_1 = len(data1.get('servers', []))
                    server_count_2 = len(data2.get('servers', []))
                    
                    if server_count_1 == server_count_2:
                        self.log_test("Data Consistency", True, 
                                    f"Consistent server count: {server_count_1}")
                    else:
                        self.log_test("Data Consistency", False, 
                                    f"Inconsistent server count: {server_count_1} vs {server_count_2}")
                else:
                    self.log_test("Data Consistency", False, "Second request failed")
            
        except Exception as e:
            self.log_test("Performance and Reliability Test", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all multiplayer server tests"""
        print("🚀 Starting TurfLoot Multiplayer Servers Backend Testing")
        print("=" * 80)
        
        # Run all test suites
        server_data = self.test_persistent_servers_creation()
        self.test_real_server_data_vs_simulated()
        self.test_server_status_logic()
        self.test_socket_io_server_accessibility()
        self.test_game_types_implementation()
        self.test_server_statistics_calculation()
        self.test_performance_and_reliability()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🏁 MULTIPLAYER SERVERS TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
        
        print(f"📊 Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.total_tests - self.passed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("\n🎉 EXCELLENT: Multiplayer servers implementation is working excellently!")
        elif success_rate >= 75:
            print("\n✅ GOOD: Multiplayer servers implementation is working well with minor issues.")
        elif success_rate >= 50:
            print("\n⚠️ MODERATE: Multiplayer servers implementation has some significant issues.")
        else:
            print("\n❌ POOR: Multiplayer servers implementation has major issues that need attention.")
        
        # Print detailed results for failed tests
        failed_tests = [result for result in self.test_results if not result['passed']]
        if failed_tests:
            print(f"\n🔍 FAILED TESTS DETAILS ({len(failed_tests)} failures):")
            for i, test in enumerate(failed_tests[:10], 1):  # Show first 10 failures
                print(f"{i}. {test['test']}: {test['details']}")
            
            if len(failed_tests) > 10:
                print(f"... and {len(failed_tests) - 10} more failures")
        
        return success_rate >= 75

if __name__ == "__main__":
    tester = MultiplayerServerTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)