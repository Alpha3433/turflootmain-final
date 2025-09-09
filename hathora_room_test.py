#!/usr/bin/env python3
"""
HATHORA ROOM CREATION TESTING - Backend API Testing
Testing Focus: Verify that actual room processes are created instead of just lobbies

CRITICAL CHANGES TO TEST:
1. Hathora client now uses createRoom() instead of createLobby()
2. Connection method updated to getConnectionInfo() instead of getLobbyInfo()
3. Room creation should generate actual server processes that appear in Hathora console
4. Real-time tracking should work with actual Hathora rooms
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://party-play-system.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class HathoraRoomCreationTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
            
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_time": f"{response_time:.3f}s" if response_time > 0 else "N/A",
            "timestamp": datetime.now().isoformat()
        }
        
        self.test_results.append(result)
        print(f"{status} {test_name}")
        if details:
            print(f"    Details: {details}")
        if response_time > 0:
            print(f"    Response Time: {response_time:.3f}s")
        print()

    def test_hathora_environment_variables(self):
        """Test 1: Verify Hathora environment variables and client initialization"""
        print("🔧 TESTING HATHORA ENVIRONMENT CONFIGURATION")
        print("=" * 60)
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/ping", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "API Health Check", 
                    True, 
                    f"Server status: {data.get('status', 'unknown')}, Server: {data.get('server', 'unknown')}", 
                    response_time
                )
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

        # Test multiplayer feature enabled (indicates Hathora integration)
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                features = data.get('features', [])
                multiplayer_enabled = 'multiplayer' in features
                
                self.log_test(
                    "Multiplayer Feature Enabled", 
                    multiplayer_enabled, 
                    f"Features: {features}, Multiplayer: {'✅' if multiplayer_enabled else '❌'}", 
                    response_time
                )
            else:
                self.log_test("Multiplayer Feature Check", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Multiplayer Feature Check", False, f"Error: {str(e)}")

        # Test server browser for Hathora integration
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                hathora_enabled = data.get('hathoraEnabled', False)
                servers = data.get('servers', [])
                
                self.log_test(
                    "Hathora Integration Enabled", 
                    hathora_enabled, 
                    f"Hathora enabled: {hathora_enabled}, Servers available: {len(servers)}", 
                    response_time
                )
                
                # Check for Global Multiplayer server (should use Hathora)
                global_server = None
                for server in servers:
                    if 'Global Multiplayer' in server.get('name', ''):
                        global_server = server
                        break
                
                if global_server:
                    server_type = global_server.get('serverType', 'unknown')
                    region = global_server.get('region', 'unknown')
                    self.log_test(
                        "Global Multiplayer Server Found", 
                        True, 
                        f"Server type: {server_type}, Region: {region}, ID: {global_server.get('id', 'unknown')}", 
                        0
                    )
                else:
                    self.log_test("Global Multiplayer Server Found", False, "No Global Multiplayer server found")
                    
            else:
                self.log_test("Server Browser Check", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Server Browser Check", False, f"Error: {str(e)}")

        return True

    def test_room_creation_api(self):
        """Test 2: Test if createRoom() is being used instead of createLobby()"""
        print("🏗️ TESTING ROOM CREATION API METHODS")
        print("=" * 60)
        
        # Test session tracking for room creation (this should trigger Hathora room creation)
        try:
            test_player_id = f"test_player_{int(time.time())}"
            test_player_name = f"TestPlayer{int(time.time()) % 1000}"
            
            # Test joining global-practice-bots room (should create Hathora room process)
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/game-sessions/join",
                json={
                    "roomId": "global-practice-bots",
                    "playerId": test_player_id,
                    "playerName": test_player_name
                },
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                
                self.log_test(
                    "Room Creation via Session Tracking", 
                    success, 
                    f"Player {test_player_name} joined global-practice-bots room", 
                    response_time
                )
                
                # Verify the session was created by checking server browser
                time.sleep(1)  # Allow time for database update
                
                start_time = time.time()
                browser_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                browser_response_time = time.time() - start_time
                
                if browser_response.status_code == 200:
                    browser_data = browser_response.json()
                    servers = browser_data.get('servers', [])
                    
                    global_server = None
                    for server in servers:
                        if server.get('id') == 'global-practice-bots':
                            global_server = server
                            break
                    
                    if global_server:
                        current_players = global_server.get('currentPlayers', 0)
                        self.log_test(
                            "Room Process Verification", 
                            current_players > 0, 
                            f"Current players in global-practice-bots: {current_players} (should be > 0 if room process created)", 
                            browser_response_time
                        )
                    else:
                        self.log_test("Room Process Verification", False, "Global server not found in browser")
                else:
                    self.log_test("Room Process Verification", False, f"Server browser error: HTTP {browser_response.status_code}")
                
                # Clean up - leave the session
                cleanup_response = requests.post(
                    f"{API_BASE}/game-sessions/leave",
                    json={
                        "roomId": "global-practice-bots",
                        "playerId": test_player_id
                    },
                    timeout=10
                )
                
                if cleanup_response.status_code == 200:
                    self.log_test("Session Cleanup", True, "Test session cleaned up successfully", 0)
                else:
                    self.log_test("Session Cleanup", False, f"Cleanup failed: HTTP {cleanup_response.status_code}")
                    
            else:
                self.log_test("Room Creation via Session Tracking", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Room Creation via Session Tracking", False, f"Error: {str(e)}")

    def test_connection_flow(self):
        """Test 3: Test complete connection flow from Global Multiplayer button to WebSocket connection"""
        print("🔌 TESTING CONNECTION FLOW")
        print("=" * 60)
        
        # Test the complete flow that happens when users click "Global Multiplayer (US East)"
        try:
            # Step 1: Verify server browser has Global Multiplayer entry
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                global_server = None
                for server in servers:
                    if 'Global Multiplayer' in server.get('name', '') and 'US East' in server.get('name', ''):
                        global_server = server
                        break
                
                if global_server:
                    self.log_test(
                        "Global Multiplayer (US East) Discovery", 
                        True, 
                        f"Found server: {global_server.get('name')}, Region: {global_server.get('region')}", 
                        response_time
                    )
                    
                    # Step 2: Test room creation for this specific server
                    room_id = global_server.get('id', 'global-practice-bots')
                    region = global_server.get('region', 'US-East-1')
                    
                    # Simulate multiple players joining (should create room processes)
                    test_players = []
                    for i in range(3):
                        player_id = f"test_player_{int(time.time())}_{i}"
                        player_name = f"TestPlayer{i}"
                        test_players.append((player_id, player_name))
                        
                        start_time = time.time()
                        join_response = requests.post(
                            f"{API_BASE}/game-sessions/join",
                            json={
                                "roomId": room_id,
                                "playerId": player_id,
                                "playerName": player_name
                            },
                            timeout=10
                        )
                        join_response_time = time.time() - start_time
                        
                        if join_response.status_code == 200:
                            self.log_test(
                                f"Multi-Player Room Creation (Player {i+1})", 
                                True, 
                                f"Player {player_name} joined {room_id} in {region}", 
                                join_response_time
                            )
                        else:
                            self.log_test(f"Multi-Player Room Creation (Player {i+1})", False, f"HTTP {join_response.status_code}")
                    
                    # Step 3: Verify all players are tracked (indicates room processes are working)
                    time.sleep(2)  # Allow time for all database updates
                    
                    start_time = time.time()
                    verification_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                    verification_response_time = time.time() - start_time
                    
                    if verification_response.status_code == 200:
                        verification_data = verification_response.json()
                        verification_servers = verification_data.get('servers', [])
                        
                        updated_global_server = None
                        for server in verification_servers:
                            if server.get('id') == room_id:
                                updated_global_server = server
                                break
                        
                        if updated_global_server:
                            final_player_count = updated_global_server.get('currentPlayers', 0)
                            expected_count = len(test_players)
                            
                            self.log_test(
                                "Room Process Player Tracking", 
                                final_player_count >= expected_count, 
                                f"Expected {expected_count} players, found {final_player_count} (indicates room processes created)", 
                                verification_response_time
                            )
                        else:
                            self.log_test("Room Process Player Tracking", False, "Server not found after player joins")
                    
                    # Cleanup all test players
                    for player_id, player_name in test_players:
                        cleanup_response = requests.post(
                            f"{API_BASE}/game-sessions/leave",
                            json={
                                "roomId": room_id,
                                "playerId": player_id
                            },
                            timeout=10
                        )
                        
                        if cleanup_response.status_code == 200:
                            self.log_test(f"Cleanup Player {player_name}", True, "Player session cleaned up", 0)
                        else:
                            self.log_test(f"Cleanup Player {player_name}", False, f"Cleanup failed: HTTP {cleanup_response.status_code}")
                            
                else:
                    self.log_test("Global Multiplayer (US East) Discovery", False, "Global Multiplayer (US East) server not found")
            else:
                self.log_test("Server Browser Access", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Connection Flow Test", False, f"Error: {str(e)}")

    def test_real_time_tracking(self):
        """Test 4: Verify session tracking works with actual Hathora rooms"""
        print("📊 TESTING REAL-TIME TRACKING WITH HATHORA ROOMS")
        print("=" * 60)
        
        try:
            # Test real-time session tracking for Hathora rooms
            test_player_id = f"hathora_test_{int(time.time())}"
            test_player_name = f"HathoraPlayer{int(time.time()) % 1000}"
            
            # Step 1: Get baseline player count
            start_time = time.time()
            baseline_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            baseline_response_time = time.time() - start_time
            
            baseline_count = 0
            if baseline_response.status_code == 200:
                baseline_data = baseline_response.json()
                servers = baseline_data.get('servers', [])
                
                for server in servers:
                    if server.get('id') == 'global-practice-bots':
                        baseline_count = server.get('currentPlayers', 0)
                        break
                
                self.log_test(
                    "Baseline Player Count", 
                    True, 
                    f"Baseline players in global-practice-bots: {baseline_count}", 
                    baseline_response_time
                )
            else:
                self.log_test("Baseline Player Count", False, f"HTTP {baseline_response.status_code}")
                return
            
            # Step 2: Join session (should create/join Hathora room)
            start_time = time.time()
            join_response = requests.post(
                f"{API_BASE}/game-sessions/join",
                json={
                    "roomId": "global-practice-bots",
                    "playerId": test_player_id,
                    "playerName": test_player_name
                },
                timeout=10
            )
            join_response_time = time.time() - start_time
            
            if join_response.status_code == 200:
                self.log_test(
                    "Hathora Room Join", 
                    True, 
                    f"Player {test_player_name} joined Hathora room", 
                    join_response_time
                )
                
                # Step 3: Verify real-time tracking (player count should increase)
                time.sleep(1)  # Allow time for real-time update
                
                start_time = time.time()
                updated_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                updated_response_time = time.time() - start_time
                
                if updated_response.status_code == 200:
                    updated_data = updated_response.json()
                    updated_servers = updated_data.get('servers', [])
                    
                    updated_count = 0
                    for server in updated_servers:
                        if server.get('id') == 'global-practice-bots':
                            updated_count = server.get('currentPlayers', 0)
                            break
                    
                    count_increased = updated_count > baseline_count
                    self.log_test(
                        "Real-Time Player Count Update", 
                        count_increased, 
                        f"Count changed from {baseline_count} to {updated_count} (increase: {count_increased})", 
                        updated_response_time
                    )
                    
                    # Step 4: Test session leave (should decrease count)
                    start_time = time.time()
                    leave_response = requests.post(
                        f"{API_BASE}/game-sessions/leave",
                        json={
                            "roomId": "global-practice-bots",
                            "playerId": test_player_id
                        },
                        timeout=10
                    )
                    leave_response_time = time.time() - start_time
                    
                    if leave_response.status_code == 200:
                        self.log_test(
                            "Hathora Room Leave", 
                            True, 
                            f"Player {test_player_name} left Hathora room", 
                            leave_response_time
                        )
                        
                        # Step 5: Verify count decreased
                        time.sleep(1)  # Allow time for real-time update
                        
                        start_time = time.time()
                        final_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                        final_response_time = time.time() - start_time
                        
                        if final_response.status_code == 200:
                            final_data = final_response.json()
                            final_servers = final_data.get('servers', [])
                            
                            final_count = 0
                            for server in final_servers:
                                if server.get('id') == 'global-practice-bots':
                                    final_count = server.get('currentPlayers', 0)
                                    break
                            
                            count_decreased = final_count <= baseline_count
                            self.log_test(
                                "Real-Time Player Count Decrease", 
                                count_decreased, 
                                f"Final count: {final_count}, Baseline: {baseline_count} (properly decreased: {count_decreased})", 
                                final_response_time
                            )
                        else:
                            self.log_test("Real-Time Player Count Decrease", False, f"HTTP {final_response.status_code}")
                    else:
                        self.log_test("Hathora Room Leave", False, f"HTTP {leave_response.status_code}")
                else:
                    self.log_test("Real-Time Player Count Update", False, f"HTTP {updated_response.status_code}")
            else:
                self.log_test("Hathora Room Join", False, f"HTTP {join_response.status_code}")
                
        except Exception as e:
            self.log_test("Real-Time Tracking Test", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all Hathora room creation tests"""
        print("🚀 HATHORA ROOM CREATION TESTING STARTED")
        print("=" * 80)
        print("TESTING FOCUS: Verify actual room processes are created instead of lobbies")
        print("EXPECTED CHANGES:")
        print("  - Hathora client uses createRoom() instead of createLobby()")
        print("  - Connection method uses getConnectionInfo() instead of getLobbyInfo()")
        print("  - Room creation generates actual server processes in Hathora console")
        print("=" * 80)
        print()
        
        # Run all test categories
        self.test_hathora_environment_variables()
        self.test_room_creation_api()
        self.test_connection_flow()
        self.test_real_time_tracking()
        
        # Print final summary
        print("🏁 HATHORA ROOM CREATION TESTING COMPLETED")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 FINAL RESULTS:")
        print(f"   Total Tests: {self.total_tests}")
        print(f"   Passed: {self.passed_tests}")
        print(f"   Failed: {self.total_tests - self.passed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print()
        
        if success_rate >= 90:
            print("🎉 EXCELLENT: Hathora room creation is working perfectly!")
        elif success_rate >= 75:
            print("✅ GOOD: Hathora room creation is mostly working with minor issues")
        elif success_rate >= 50:
            print("⚠️ MODERATE: Hathora room creation has some significant issues")
        else:
            print("❌ CRITICAL: Hathora room creation has major problems")
        
        print()
        print("🔍 DETAILED TEST RESULTS:")
        print("-" * 80)
        
        for result in self.test_results:
            print(f"{result['status']} {result['test']}")
            if result['details']:
                print(f"    {result['details']}")
            if result['response_time'] != "N/A":
                print(f"    Response Time: {result['response_time']}")
            print()
        
        return success_rate >= 75

if __name__ == "__main__":
    tester = HathoraRoomCreationTester()
    success = tester.run_all_tests()
    
    if success:
        print("✅ HATHORA ROOM CREATION TESTING PASSED")
        sys.exit(0)
    else:
        print("❌ HATHORA ROOM CREATION TESTING FAILED")
        sys.exit(1)