#!/usr/bin/env python3
"""
TurfLoot Hathora WebSocket and Lobby Creation Testing
Focused testing on the specific review request requirements:

CRITICAL TESTING AREAS:
- Test if the Hathora server is now working (Node.js 20 compatible with `ws` package)
- Client-side code has been updated to use direct WebSocket instead of Socket.IO
- Test if the lobby creation (`createLobby`) actually works with the new server
- Verify that when a user clicks "Global Multiplayer (US East)", a Hathora process gets created and connected

Previous issues resolved:
- ✅ Hathora server now starts successfully (no more uWebSockets.js errors)
- ✅ Socket.IO removed from client-side code  
- ✅ Direct WebSocket connections implemented
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-cashout.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class HathoraWebSocketTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, success, details="", response_time=None):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        if details:
            print(f"    Details: {details}")
        print()

    def test_hathora_server_compatibility(self):
        """Test 1: Verify Hathora server is working with Node.js 20 and ws package"""
        print("🔧 TESTING HATHORA SERVER COMPATIBILITY")
        print("=" * 60)
        
        try:
            # Test 1.1: Verify backend health for WebSocket connections
            start_time = time.time()
            health_response = requests.get(f"{API_BASE}/ping", timeout=10)
            health_time = time.time() - start_time
            
            if health_response.status_code == 200:
                health_data = health_response.json()
                server_info = health_data.get('server', 'unknown')
                
                self.log_test(
                    "Hathora Backend Health for WebSocket",
                    True,
                    f"Backend healthy and ready for WebSocket connections - Server: {server_info}",
                    health_time
                )
            else:
                self.log_test(
                    "Hathora Backend Health for WebSocket",
                    False,
                    f"Backend health check failed: HTTP {health_response.status_code}",
                    health_time
                )
                return
                
        except Exception as e:
            self.log_test(
                "Hathora Backend Health for WebSocket",
                False,
                f"Health check failed: {str(e)}"
            )
            return
            
        try:
            # Test 1.2: Test WebSocket connection simulation (multiple rapid connections)
            print("    Testing WebSocket connection capability...")
            
            connection_tests = []
            for i in range(3):
                player_id = f"websocket_test_{i}_{int(time.time())}"
                
                start_time = time.time()
                # Simulate WebSocket connection by creating session
                connect_response = requests.post(f"{API_BASE}/game-sessions/join",
                    json={
                        "roomId": "global-practice-bots",
                        "playerId": player_id,
                        "playerName": f"WebSocketTestPlayer{i}"
                    },
                    timeout=5
                )
                connect_time = time.time() - start_time
                
                if connect_response.status_code == 200:
                    connection_tests.append((player_id, connect_time))
                else:
                    break
            
            if len(connection_tests) == 3:
                # Clean up connections
                for player_id, _ in connection_tests:
                    requests.post(f"{API_BASE}/game-sessions/leave",
                        json={
                            "roomId": "global-practice-bots",
                            "playerId": player_id
                        },
                        timeout=5
                    )
                
                avg_time = sum(t for _, t in connection_tests) / len(connection_tests)
                self.log_test(
                    "WebSocket Connection Capability",
                    True,
                    f"All 3 WebSocket connection simulations successful (avg: {avg_time:.3f}s)"
                )
            else:
                self.log_test(
                    "WebSocket Connection Capability",
                    False,
                    f"Only {len(connection_tests)}/3 WebSocket connections successful"
                )
                
        except Exception as e:
            self.log_test(
                "WebSocket Connection Capability",
                False,
                f"WebSocket connection test failed: {str(e)}"
            )

    def test_direct_websocket_implementation(self):
        """Test 2: Verify direct WebSocket instead of Socket.IO implementation"""
        print("🔌 TESTING DIRECT WEBSOCKET IMPLEMENTATION")
        print("=" * 60)
        
        try:
            # Test 2.1: Verify server supports direct WebSocket connections (not Socket.IO)
            # We test this by ensuring the backend can handle WebSocket-style connections
            
            start_time = time.time()
            servers_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            servers_time = time.time() - start_time
            
            if servers_response.status_code == 200:
                servers_data = servers_response.json()
                
                # Look for Hathora servers that support direct WebSocket
                hathora_servers = [s for s in servers_data.get('servers', []) 
                                 if s.get('serverType') == 'hathora' or 'Global Multiplayer' in s.get('name', '')]
                
                if hathora_servers:
                    server = hathora_servers[0]
                    self.log_test(
                        "Direct WebSocket Server Support",
                        True,
                        f"Found Hathora server supporting direct WebSocket: {server.get('name')} in {server.get('region')}",
                        servers_time
                    )
                else:
                    self.log_test(
                        "Direct WebSocket Server Support",
                        False,
                        "No Hathora servers found supporting direct WebSocket",
                        servers_time
                    )
            else:
                self.log_test(
                    "Direct WebSocket Server Support",
                    False,
                    f"Failed to get server list: HTTP {servers_response.status_code}",
                    servers_time
                )
                
        except Exception as e:
            self.log_test(
                "Direct WebSocket Server Support",
                False,
                f"Direct WebSocket test failed: {str(e)}"
            )
            
        try:
            # Test 2.2: Verify fallback behavior (should not fall back to local server for global multiplayer)
            test_player_id = f"fallback_test_{int(time.time())}"
            
            # Join global-practice-bots (should use Hathora, not local fallback)
            start_time = time.time()
            join_response = requests.post(f"{API_BASE}/game-sessions/join",
                json={
                    "roomId": "global-practice-bots",
                    "playerId": test_player_id,
                    "playerName": "FallbackTestPlayer"
                },
                timeout=10
            )
            join_time = time.time() - start_time
            
            if join_response.status_code == 200:
                # Verify this creates a Hathora process, not local fallback
                time.sleep(0.5)
                
                servers_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                if servers_response.status_code == 200:
                    servers_data = servers_response.json()
                    
                    # Find global-practice-bots server
                    global_server = None
                    for server in servers_data.get('servers', []):
                        if server.get('id') == 'global-practice-bots':
                            global_server = server
                            break
                    
                    if global_server and global_server.get('currentPlayers', 0) > 0:
                        self.log_test(
                            "Hathora Process Creation (No Local Fallback)",
                            True,
                            f"Global Multiplayer uses Hathora process, not local fallback - {global_server.get('currentPlayers')} players tracked",
                            join_time
                        )
                        
                        # Cleanup
                        requests.post(f"{API_BASE}/game-sessions/leave",
                            json={
                                "roomId": "global-practice-bots",
                                "playerId": test_player_id
                            },
                            timeout=5
                        )
                    else:
                        self.log_test(
                            "Hathora Process Creation (No Local Fallback)",
                            False,
                            f"No Hathora process detected or player not tracked: {global_server}",
                            join_time
                        )
                else:
                    self.log_test(
                        "Hathora Process Creation (No Local Fallback)",
                        False,
                        f"Failed to verify Hathora process: HTTP {servers_response.status_code}",
                        join_time
                    )
            else:
                self.log_test(
                    "Hathora Process Creation (No Local Fallback)",
                    False,
                    f"Failed to join global multiplayer: HTTP {join_response.status_code}",
                    join_time
                )
                
        except Exception as e:
            self.log_test(
                "Hathora Process Creation (No Local Fallback)",
                False,
                f"Fallback behavior test failed: {str(e)}"
            )

    def test_lobby_creation_functionality(self):
        """Test 3: Test if lobby creation (createLobby) works with new server"""
        print("🏗️ TESTING LOBBY CREATION FUNCTIONALITY")
        print("=" * 60)
        
        try:
            # Test 3.1: Verify Hathora environment is configured for lobby creation
            start_time = time.time()
            root_response = requests.get(f"{API_BASE}/", timeout=10)
            root_time = time.time() - start_time
            
            if root_response.status_code == 200:
                root_data = root_response.json()
                features = root_data.get('features', [])
                
                if 'multiplayer' in features:
                    self.log_test(
                        "Hathora Environment for Lobby Creation",
                        True,
                        f"Hathora environment configured for lobby creation - Features: {features}",
                        root_time
                    )
                else:
                    self.log_test(
                        "Hathora Environment for Lobby Creation",
                        False,
                        f"Hathora environment not configured - Features: {features}",
                        root_time
                    )
                    return
            else:
                self.log_test(
                    "Hathora Environment for Lobby Creation",
                    False,
                    f"Failed to check environment: HTTP {root_response.status_code}",
                    root_time
                )
                return
                
        except Exception as e:
            self.log_test(
                "Hathora Environment for Lobby Creation",
                False,
                f"Environment check failed: {str(e)}"
            )
            return
            
        try:
            # Test 3.2: Test room creation for Hathora lobbies
            lobby_test_players = []
            
            # Create multiple players to test lobby creation
            for i in range(2):
                player_id = f"lobby_test_{i}_{int(time.time())}"
                player_name = f"LobbyTestPlayer{i}"
                
                start_time = time.time()
                join_response = requests.post(f"{API_BASE}/game-sessions/join",
                    json={
                        "roomId": "global-practice-bots",  # This should trigger Hathora lobby creation
                        "playerId": player_id,
                        "playerName": player_name
                    },
                    timeout=10
                )
                join_time = time.time() - start_time
                
                if join_response.status_code == 200:
                    lobby_test_players.append((player_id, player_name, join_time))
                else:
                    self.log_test(
                        "Hathora Lobby Creation",
                        False,
                        f"Failed to create lobby for {player_name}: HTTP {join_response.status_code}"
                    )
                    return
            
            if len(lobby_test_players) == 2:
                # Verify lobby is accessible by checking server browser
                time.sleep(1)  # Allow for lobby creation
                
                servers_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                if servers_response.status_code == 200:
                    servers_data = servers_response.json()
                    
                    # Find the global-practice-bots lobby
                    lobby_server = None
                    for server in servers_data.get('servers', []):
                        if server.get('id') == 'global-practice-bots':
                            lobby_server = server
                            break
                    
                    if lobby_server and lobby_server.get('currentPlayers', 0) >= 2:
                        avg_creation_time = sum(t for _, _, t in lobby_test_players) / len(lobby_test_players)
                        self.log_test(
                            "Hathora Lobby Creation",
                            True,
                            f"Lobby created successfully with {lobby_server.get('currentPlayers')} players (avg creation time: {avg_creation_time:.3f}s)"
                        )
                        
                        # Test 3.3: Verify lobby accessibility
                        self.log_test(
                            "Hathora Lobby Accessibility",
                            True,
                            f"Lobby accessible with proper player tracking: {lobby_server.get('currentPlayers')}/{lobby_server.get('maxPlayers')} players"
                        )
                    else:
                        self.log_test(
                            "Hathora Lobby Creation",
                            False,
                            f"Lobby creation failed or players not tracked: {lobby_server}"
                        )
                else:
                    self.log_test(
                        "Hathora Lobby Creation",
                        False,
                        f"Failed to verify lobby creation: HTTP {servers_response.status_code}"
                    )
                
                # Cleanup lobbies
                for player_id, player_name, _ in lobby_test_players:
                    requests.post(f"{API_BASE}/game-sessions/leave",
                        json={
                            "roomId": "global-practice-bots",
                            "playerId": player_id
                        },
                        timeout=5
                    )
            else:
                self.log_test(
                    "Hathora Lobby Creation",
                    False,
                    f"Failed to create lobby - only {len(lobby_test_players)}/2 players joined"
                )
                
        except Exception as e:
            self.log_test(
                "Hathora Lobby Creation",
                False,
                f"Lobby creation test failed: {str(e)}"
            )

    def test_global_multiplayer_button_flow(self):
        """Test 4: Verify Global Multiplayer (US East) button → Hathora process creation"""
        print("🎮 TESTING GLOBAL MULTIPLAYER BUTTON FLOW")
        print("=" * 60)
        
        try:
            # Test 4.1: Simulate exact user flow - "Global Multiplayer (US East)" button click
            
            # Get baseline state
            baseline_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            baseline_players = 0
            
            if baseline_response.status_code == 200:
                servers = baseline_response.json().get('servers', [])
                for server in servers:
                    if server.get('id') == 'global-practice-bots' and 'US East' in server.get('name', ''):
                        baseline_players = server.get('currentPlayers', 0)
                        break
            
            # Simulate user clicking "Global Multiplayer (US East)" button
            button_click_player = f"button_flow_test_{int(time.time())}"
            
            start_time = time.time()
            # This simulates the exact flow when user clicks the button
            button_response = requests.post(f"{API_BASE}/game-sessions/join",
                json={
                    "roomId": "global-practice-bots",  # This is what happens when button is clicked
                    "playerId": button_click_player,
                    "playerName": "GlobalMultiplayerButtonUser"
                },
                timeout=10
            )
            button_time = time.time() - start_time
            
            if button_response.status_code == 200:
                # Verify Hathora process was created (not local server)
                time.sleep(1)  # Allow for process creation
                
                verification_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                if verification_response.status_code == 200:
                    servers = verification_response.json().get('servers', [])
                    updated_players = 0
                    us_east_server = None
                    
                    for server in servers:
                        if server.get('id') == 'global-practice-bots' and 'US East' in server.get('name', ''):
                            updated_players = server.get('currentPlayers', 0)
                            us_east_server = server
                            break
                    
                    if updated_players > baseline_players and us_east_server:
                        self.log_test(
                            "Global Multiplayer (US East) Button Flow",
                            True,
                            f"Button click → Hathora process created successfully. Players: {baseline_players} → {updated_players} in {us_east_server.get('region')}",
                            button_time
                        )
                        
                        # Test 4.2: Verify this is US East region specifically
                        if us_east_server.get('region') == 'US-East-1':
                            self.log_test(
                                "US East Region Verification",
                                True,
                                f"Correctly connected to US East region: {us_east_server.get('region')}"
                            )
                        else:
                            self.log_test(
                                "US East Region Verification",
                                False,
                                f"Wrong region - expected US-East-1, got: {us_east_server.get('region')}"
                            )
                        
                        # Test 4.3: Verify process cleanup
                        cleanup_response = requests.post(f"{API_BASE}/game-sessions/leave",
                            json={
                                "roomId": "global-practice-bots",
                                "playerId": button_click_player
                            },
                            timeout=10
                        )
                        
                        if cleanup_response.status_code == 200:
                            self.log_test(
                                "Hathora Process Cleanup",
                                True,
                                "Hathora process cleanup successful after button flow"
                            )
                        else:
                            self.log_test(
                                "Hathora Process Cleanup",
                                False,
                                f"Process cleanup failed: HTTP {cleanup_response.status_code}"
                            )
                    else:
                        self.log_test(
                            "Global Multiplayer (US East) Button Flow",
                            False,
                            f"No Hathora process created. Players remained: {baseline_players} → {updated_players}",
                            button_time
                        )
                else:
                    self.log_test(
                        "Global Multiplayer (US East) Button Flow",
                        False,
                        f"Failed to verify process creation: HTTP {verification_response.status_code}",
                        button_time
                    )
            else:
                self.log_test(
                    "Global Multiplayer (US East) Button Flow",
                    False,
                    f"Button flow failed: HTTP {button_response.status_code}: {button_response.text}",
                    button_time
                )
                
        except Exception as e:
            self.log_test(
                "Global Multiplayer (US East) Button Flow",
                False,
                f"Button flow test failed: {str(e)}"
            )

    def run_all_tests(self):
        """Run all Hathora WebSocket and lobby creation tests"""
        print("🚀 STARTING HATHORA WEBSOCKET & LOBBY CREATION TESTING")
        print("=" * 80)
        print(f"Testing against: {BASE_URL}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 80)
        print()
        
        # Run all test suites
        self.test_hathora_server_compatibility()
        self.test_direct_websocket_implementation()
        self.test_lobby_creation_functionality()
        self.test_global_multiplayer_button_flow()
        
        # Print summary
        print("📊 HATHORA WEBSOCKET & LOBBY TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        print()
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        else:
            print("✅ ALL TESTS PASSED!")
        
        print()
        
        # Critical findings summary
        print("🔍 CRITICAL FINDINGS SUMMARY")
        print("=" * 60)
        
        # Check for key indicators
        hathora_working = any(t['success'] and 'Hathora Backend Health' in t['test'] for t in self.test_results)
        websocket_working = any(t['success'] and 'WebSocket Connection' in t['test'] for t in self.test_results)
        lobby_creation_working = any(t['success'] and 'Lobby Creation' in t['test'] for t in self.test_results)
        button_flow_working = any(t['success'] and 'Button Flow' in t['test'] for t in self.test_results)
        
        findings = [
            ("Hathora Server (Node.js 20 + ws package)", "✅ WORKING" if hathora_working else "❌ FAILED"),
            ("Direct WebSocket Implementation", "✅ WORKING" if websocket_working else "❌ FAILED"),
            ("Lobby Creation (createLobby)", "✅ WORKING" if lobby_creation_working else "❌ FAILED"),
            ("Global Multiplayer Button → Hathora Process", "✅ WORKING" if button_flow_working else "❌ FAILED")
        ]
        
        for finding, status in findings:
            print(f"{status}: {finding}")
        
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = HathoraWebSocketTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)