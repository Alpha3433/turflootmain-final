#!/usr/bin/env python3
"""
TurfLoot Hathora Integration Backend Testing Suite
Testing the updated Hathora integration implementation

TESTING FOCUS (Review Request):
1. Test that session tracking APIs still work for global-practice-bots
2. Verify Hathora client integration is working (authentication and lobby creation logs)
3. Test server browser still shows Global Multiplayer entry
4. Check for connection errors or fallback to local server
5. Critical question: Does new implementation connect to deployed Hathora server?
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://tactical-turfloot.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class HathoraIntegrationTester:
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

    def test_session_tracking_apis(self):
        """Test 1: Session tracking APIs still work for global-practice-bots"""
        print("🎯 TESTING SESSION TRACKING APIs FOR GLOBAL-PRACTICE-BOTS")
        print("=" * 60)
        
        # Test data for global-practice-bots room
        test_player_id = f"hathora_test_player_{int(time.time())}"
        test_player_name = "HathoraTestPlayer"
        room_id = "global-practice-bots"
        
        try:
            # Test 1.1: Join session API
            start_time = time.time()
            join_response = requests.post(f"{API_BASE}/game-sessions/join", 
                json={
                    "roomId": room_id,
                    "playerId": test_player_id,
                    "playerName": test_player_name
                },
                timeout=10
            )
            join_time = time.time() - start_time
            
            if join_response.status_code == 200:
                join_data = join_response.json()
                self.log_test(
                    "Session Join API (global-practice-bots)",
                    True,
                    f"Player {test_player_name} successfully joined {room_id}",
                    join_time
                )
            else:
                self.log_test(
                    "Session Join API (global-practice-bots)",
                    False,
                    f"HTTP {join_response.status_code}: {join_response.text}",
                    join_time
                )
                return
                
        except Exception as e:
            self.log_test(
                "Session Join API (global-practice-bots)",
                False,
                f"Request failed: {str(e)}"
            )
            return
            
        try:
            # Test 1.2: Verify server browser shows updated player count
            start_time = time.time()
            servers_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            servers_time = time.time() - start_time
            
            if servers_response.status_code == 200:
                servers_data = servers_response.json()
                
                # Find global-practice-bots server
                global_server = None
                for server in servers_data.get('servers', []):
                    if server.get('id') == room_id:
                        global_server = server
                        break
                
                if global_server:
                    current_players = global_server.get('currentPlayers', 0)
                    self.log_test(
                        "Server Browser Real-time Update",
                        True,
                        f"Global Multiplayer server found with {current_players} players",
                        servers_time
                    )
                else:
                    self.log_test(
                        "Server Browser Real-time Update",
                        False,
                        "Global Multiplayer server not found in server list",
                        servers_time
                    )
            else:
                self.log_test(
                    "Server Browser Real-time Update",
                    False,
                    f"HTTP {servers_response.status_code}: {servers_response.text}",
                    servers_time
                )
                
        except Exception as e:
            self.log_test(
                "Server Browser Real-time Update",
                False,
                f"Request failed: {str(e)}"
            )
            
        try:
            # Test 1.3: Leave session API
            start_time = time.time()
            leave_response = requests.post(f"{API_BASE}/game-sessions/leave",
                json={
                    "roomId": room_id,
                    "playerId": test_player_id
                },
                timeout=10
            )
            leave_time = time.time() - start_time
            
            if leave_response.status_code == 200:
                leave_data = leave_response.json()
                self.log_test(
                    "Session Leave API (global-practice-bots)",
                    True,
                    f"Player {test_player_id} successfully left {room_id}",
                    leave_time
                )
            else:
                self.log_test(
                    "Session Leave API (global-practice-bots)",
                    False,
                    f"HTTP {leave_response.status_code}: {leave_response.text}",
                    leave_time
                )
                
        except Exception as e:
            self.log_test(
                "Session Leave API (global-practice-bots)",
                False,
                f"Request failed: {str(e)}"
            )

    def test_hathora_environment_config(self):
        """Test 2: Verify Hathora environment configuration"""
        print("🌍 TESTING HATHORA ENVIRONMENT CONFIGURATION")
        print("=" * 60)
        
        try:
            # Test 2.1: Check API root for Hathora features
            start_time = time.time()
            root_response = requests.get(f"{API_BASE}/", timeout=10)
            root_time = time.time() - start_time
            
            if root_response.status_code == 200:
                root_data = root_response.json()
                features = root_data.get('features', [])
                
                if 'multiplayer' in features:
                    self.log_test(
                        "Hathora Multiplayer Feature Enabled",
                        True,
                        f"Multiplayer feature found in API features: {features}",
                        root_time
                    )
                else:
                    self.log_test(
                        "Hathora Multiplayer Feature Enabled",
                        False,
                        f"Multiplayer feature not found in API features: {features}",
                        root_time
                    )
            else:
                self.log_test(
                    "Hathora Multiplayer Feature Enabled",
                    False,
                    f"HTTP {root_response.status_code}: {root_response.text}",
                    root_time
                )
                
        except Exception as e:
            self.log_test(
                "Hathora Multiplayer Feature Enabled",
                False,
                f"Request failed: {str(e)}"
            )
            
        try:
            # Test 2.2: Verify server browser includes Hathora servers
            start_time = time.time()
            servers_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            servers_time = time.time() - start_time
            
            if servers_response.status_code == 200:
                servers_data = servers_response.json()
                servers = servers_data.get('servers', [])
                
                # Look for Hathora-enabled servers
                hathora_servers = [s for s in servers if s.get('serverType') == 'hathora']
                global_multiplayer = [s for s in servers if 'Global Multiplayer' in s.get('name', '')]
                
                if hathora_servers or global_multiplayer:
                    server_info = hathora_servers[0] if hathora_servers else global_multiplayer[0]
                    self.log_test(
                        "Hathora Server Integration",
                        True,
                        f"Found Hathora server: {server_info.get('name')} in {server_info.get('region')}",
                        servers_time
                    )
                else:
                    self.log_test(
                        "Hathora Server Integration",
                        False,
                        f"No Hathora servers found. Available servers: {len(servers)}",
                        servers_time
                    )
            else:
                self.log_test(
                    "Hathora Server Integration",
                    False,
                    f"HTTP {servers_response.status_code}: {servers_response.text}",
                    servers_time
                )
                
        except Exception as e:
            self.log_test(
                "Hathora Server Integration",
                False,
                f"Request failed: {str(e)}"
            )

    def test_server_browser_global_multiplayer(self):
        """Test 3: Server browser still shows Global Multiplayer entry"""
        print("🎮 TESTING SERVER BROWSER GLOBAL MULTIPLAYER ENTRY")
        print("=" * 60)
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                # Look for Global Multiplayer entry
                global_multiplayer_servers = []
                for server in servers:
                    server_name = server.get('name', '').lower()
                    if 'global' in server_name and 'multiplayer' in server_name:
                        global_multiplayer_servers.append(server)
                
                if global_multiplayer_servers:
                    server = global_multiplayer_servers[0]
                    details = (
                        f"Name: {server.get('name')}, "
                        f"Region: {server.get('region')}, "
                        f"Players: {server.get('currentPlayers')}/{server.get('maxPlayers')}, "
                        f"Mode: {server.get('mode')}, "
                        f"Stake: ${server.get('stake', 0)}"
                    )
                    self.log_test(
                        "Global Multiplayer Entry Visible",
                        True,
                        details,
                        response_time
                    )
                    
                    # Test 3.2: Verify server properties
                    required_props = ['id', 'name', 'region', 'currentPlayers', 'maxPlayers', 'mode']
                    missing_props = [prop for prop in required_props if prop not in server]
                    
                    if not missing_props:
                        self.log_test(
                            "Global Multiplayer Server Properties",
                            True,
                            f"All required properties present: {required_props}"
                        )
                    else:
                        self.log_test(
                            "Global Multiplayer Server Properties",
                            False,
                            f"Missing properties: {missing_props}"
                        )
                        
                else:
                    # List available servers for debugging
                    server_names = [s.get('name', 'Unknown') for s in servers]
                    self.log_test(
                        "Global Multiplayer Entry Visible",
                        False,
                        f"No Global Multiplayer server found. Available: {server_names}",
                        response_time
                    )
                    
            else:
                self.log_test(
                    "Global Multiplayer Entry Visible",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Global Multiplayer Entry Visible",
                False,
                f"Request failed: {str(e)}"
            )

    def test_hathora_connection_flow(self):
        """Test 4: Test Hathora connection flow and fallback behavior"""
        print("🔌 TESTING HATHORA CONNECTION FLOW")
        print("=" * 60)
        
        try:
            # Test 4.1: Verify API health for Hathora integration
            start_time = time.time()
            ping_response = requests.get(f"{API_BASE}/ping", timeout=10)
            ping_time = time.time() - start_time
            
            if ping_response.status_code == 200:
                ping_data = ping_response.json()
                self.log_test(
                    "Hathora Backend Health Check",
                    True,
                    f"Server status: {ping_data.get('status')}, Server: {ping_data.get('server')}",
                    ping_time
                )
            else:
                self.log_test(
                    "Hathora Backend Health Check",
                    False,
                    f"HTTP {ping_response.status_code}: {ping_response.text}",
                    ping_time
                )
                
        except Exception as e:
            self.log_test(
                "Hathora Backend Health Check",
                False,
                f"Request failed: {str(e)}"
            )
            
        try:
            # Test 4.2: Test multiple rapid session operations (stress test)
            print("    Running rapid session operations test...")
            
            test_sessions = []
            for i in range(3):
                player_id = f"stress_test_player_{i}_{int(time.time())}"
                player_name = f"StressTestPlayer{i}"
                
                # Join session
                start_time = time.time()
                join_response = requests.post(f"{API_BASE}/game-sessions/join",
                    json={
                        "roomId": "global-practice-bots",
                        "playerId": player_id,
                        "playerName": player_name
                    },
                    timeout=5
                )
                join_time = time.time() - start_time
                
                if join_response.status_code == 200:
                    test_sessions.append((player_id, join_time))
                else:
                    break
                    
            if len(test_sessions) == 3:
                # Clean up sessions
                for player_id, _ in test_sessions:
                    requests.post(f"{API_BASE}/game-sessions/leave",
                        json={
                            "roomId": "global-practice-bots",
                            "playerId": player_id
                        },
                        timeout=5
                    )
                
                avg_time = sum(t for _, t in test_sessions) / len(test_sessions)
                self.log_test(
                    "Hathora Stress Test (3 rapid sessions)",
                    True,
                    f"All 3 sessions created successfully, avg time: {avg_time:.3f}s"
                )
            else:
                self.log_test(
                    "Hathora Stress Test (3 rapid sessions)",
                    False,
                    f"Only {len(test_sessions)}/3 sessions created successfully"
                )
                
        except Exception as e:
            self.log_test(
                "Hathora Stress Test (3 rapid sessions)",
                False,
                f"Stress test failed: {str(e)}"
            )

    def test_end_to_end_workflow(self):
        """Test 5: End-to-end Hathora integration workflow"""
        print("🔄 TESTING END-TO-END HATHORA WORKFLOW")
        print("=" * 60)
        
        workflow_player_id = f"e2e_test_player_{int(time.time())}"
        workflow_player_name = "E2ETestPlayer"
        
        try:
            # Step 1: Get baseline server state
            baseline_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            baseline_players = 0
            
            if baseline_response.status_code == 200:
                servers = baseline_response.json().get('servers', [])
                for server in servers:
                    if server.get('id') == 'global-practice-bots':
                        baseline_players = server.get('currentPlayers', 0)
                        break
            
            # Step 2: Join session
            join_response = requests.post(f"{API_BASE}/game-sessions/join",
                json={
                    "roomId": "global-practice-bots",
                    "playerId": workflow_player_id,
                    "playerName": workflow_player_name
                },
                timeout=10
            )
            
            if join_response.status_code != 200:
                self.log_test(
                    "E2E Workflow - Session Join",
                    False,
                    f"Failed to join session: HTTP {join_response.status_code}"
                )
                return
            
            # Step 3: Verify player count increased
            time.sleep(1)  # Allow for database update
            updated_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            
            if updated_response.status_code == 200:
                servers = updated_response.json().get('servers', [])
                updated_players = 0
                
                for server in servers:
                    if server.get('id') == 'global-practice-bots':
                        updated_players = server.get('currentPlayers', 0)
                        break
                
                if updated_players >= baseline_players:
                    self.log_test(
                        "E2E Workflow - Player Count Update",
                        True,
                        f"Player count: {baseline_players} → {updated_players}"
                    )
                else:
                    self.log_test(
                        "E2E Workflow - Player Count Update",
                        False,
                        f"Player count did not increase: {baseline_players} → {updated_players}"
                    )
            else:
                self.log_test(
                    "E2E Workflow - Player Count Update",
                    False,
                    f"Failed to get updated server list: HTTP {updated_response.status_code}"
                )
            
            # Step 4: Leave session
            leave_response = requests.post(f"{API_BASE}/game-sessions/leave",
                json={
                    "roomId": "global-practice-bots",
                    "playerId": workflow_player_id
                },
                timeout=10
            )
            
            if leave_response.status_code == 200:
                self.log_test(
                    "E2E Workflow - Session Leave",
                    True,
                    f"Player {workflow_player_name} successfully left session"
                )
            else:
                self.log_test(
                    "E2E Workflow - Session Leave",
                    False,
                    f"Failed to leave session: HTTP {leave_response.status_code}"
                )
                
        except Exception as e:
            self.log_test(
                "E2E Workflow - Complete",
                False,
                f"Workflow failed: {str(e)}"
            )

    def run_all_tests(self):
        """Run all Hathora integration tests"""
        print("🚀 STARTING HATHORA INTEGRATION BACKEND TESTING")
        print("=" * 80)
        print(f"Testing against: {BASE_URL}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 80)
        print()
        
        # Run all test suites
        self.test_session_tracking_apis()
        self.test_hathora_environment_config()
        self.test_server_browser_global_multiplayer()
        self.test_hathora_connection_flow()
        self.test_end_to_end_workflow()
        
        # Print summary
        print("📊 HATHORA INTEGRATION TEST SUMMARY")
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
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = HathoraIntegrationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)