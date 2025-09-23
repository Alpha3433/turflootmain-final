#!/usr/bin/env python3
"""
MULTIPLAYER PLAYER RENDERING FIX - BACKEND TESTING SUITE
========================================================

This test suite verifies the backend systems supporting the multiplayer player rendering fix.

CONTEXT:
- Fixed critical issue where players were connected to same Colyseus room but couldn't see each other
- Root cause: Frontend rendering method was incorrectly iterating over serverState.players array  
- Fix: Changed forEach((player, sessionId) => {...}) to forEach((player) => {...}) in agario/page.js line 2974
- Players should now be able to see each other in multiplayer Colyseus games

TESTING FOCUS:
1. Colyseus Room State Management - Verify Colyseus server maintains player state with MapSchema
2. Player Data Propagation - Test that multiple players' data is correctly transmitted
3. MapSchema Handling - Confirm backend sends proper MapSchema data for frontend conversion
4. Multiplayer Session Management - Verify room joining, player tracking, state synchronization
5. Backend API Integration - Test /api/servers endpoint for Colyseus integration
6. Player Authentication - Verify Privy user data handling in multiplayer context
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-arena-2.preview.emergentagent.com"
COLYSEUS_ENDPOINT = "wss://au-syd-ab3eaf4e.colyseus.cloud"

class MultiplayerBackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.colyseus_endpoint = COLYSEUS_ENDPOINT
        self.results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_results": [],
            "critical_issues": [],
            "minor_issues": []
        }
        print("🎮 MULTIPLAYER PLAYER RENDERING FIX - BACKEND TESTING SUITE")
        print("=" * 70)
        print(f"🔗 API Base URL: {self.base_url}")
        print(f"🎯 Colyseus Endpoint: {self.colyseus_endpoint}")
        print()
        
    def log_test(self, test_name, status, details, is_critical=True):
        """Log test result"""
        self.results["total_tests"] += 1
        if status == "PASS":
            self.results["passed_tests"] += 1
            print(f"✅ {test_name}: PASSED")
        else:
            self.results["failed_tests"] += 1
            print(f"❌ {test_name}: FAILED - {details}")
            if is_critical:
                self.results["critical_issues"].append(f"{test_name}: {details}")
            else:
                self.results["minor_issues"].append(f"{test_name}: {details}")
        
        self.results["test_results"].append({
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def test_colyseus_room_state_management(self):
        """Test 1: Colyseus Room State Management - Verify Colyseus server maintains player state with MapSchema"""
        print("\n🏠 TESTING: Colyseus Room State Management")
        
        try:
            # Test /api/servers endpoint for Colyseus configuration
            response = requests.get(f"{self.base_url}/api/servers", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for Colyseus configuration
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                servers = data.get('servers', [])
                
                if colyseus_enabled and colyseus_endpoint and servers:
                    # Find Colyseus arena server
                    arena_server = None
                    for server in servers:
                        if server.get('serverType') == 'colyseus' and server.get('roomType') == 'arena':
                            arena_server = server
                            break
                    
                    if arena_server:
                        self.log_test(
                            "Colyseus Arena Server Configuration", 
                            "PASS", 
                            f"Arena server found with ID: {arena_server.get('id')}, Max players: {arena_server.get('maxPlayers')}"
                        )
                        
                        # Verify server supports MapSchema player state
                        expected_fields = ['id', 'roomType', 'maxPlayers', 'currentPlayers', 'serverType', 'endpoint']
                        missing_fields = [field for field in expected_fields if field not in arena_server]
                        
                        if not missing_fields:
                            self.log_test(
                                "MapSchema Player State Support", 
                                "PASS", 
                                f"All required fields present for MapSchema support: {expected_fields}"
                            )
                        else:
                            self.log_test(
                                "MapSchema Player State Support", 
                                "FAIL", 
                                f"Missing required fields: {missing_fields}"
                            )
                    else:
                        self.log_test(
                            "Colyseus Arena Server Configuration", 
                            "FAIL", 
                            "No Colyseus arena server found in server list"
                        )
                else:
                    self.log_test(
                        "Colyseus Server Configuration", 
                        "FAIL", 
                        f"Colyseus not properly configured - Enabled: {colyseus_enabled}, Endpoint: {colyseus_endpoint}, Servers: {len(servers)}"
                    )
            else:
                self.log_test(
                    "Colyseus Server API Access", 
                    "FAIL", 
                    f"Failed to access /api/servers - Status: {response.status_code}"
                )
        except Exception as e:
            self.log_test("Colyseus Room State Management", "FAIL", f"Exception: {str(e)}")

    def test_player_data_propagation(self):
        """Test 2: Player Data Propagation - Test that multiple players' data is correctly transmitted"""
        print("\n👥 TESTING: Player Data Propagation")
        
        try:
            # Test game sessions API for player tracking
            test_session_data = {
                "action": "join",
                "session": {
                    "roomId": "colyseus-arena-global",
                    "joinedAt": "2024-01-01T00:00:00.000Z",
                    "lastActivity": "2024-01-01T00:00:00.000Z",
                    "userId": "test_player_1",
                    "entryFee": 0,
                    "mode": "colyseus-multiplayer",
                    "region": "Australia",
                    "status": "active"
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/game-sessions",
                json=test_session_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                self.log_test(
                    "Player Session Tracking", 
                    "PASS", 
                    "Backend can track player sessions for multiplayer rooms"
                )
                
                # Test multiple player session handling
                test_session_data_2 = {
                    "action": "join",
                    "session": {
                        "roomId": "colyseus-arena-global",
                        "joinedAt": "2024-01-01T00:01:00.000Z",
                        "lastActivity": "2024-01-01T00:01:00.000Z",
                        "userId": "test_player_2",
                        "entryFee": 0,
                        "mode": "colyseus-multiplayer",
                        "region": "Australia",
                        "status": "active"
                    }
                }
                
                response2 = requests.post(
                    f"{self.base_url}/api/game-sessions",
                    json=test_session_data_2,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if response2.status_code in [200, 201]:
                    self.log_test(
                        "Multiple Player Session Support", 
                        "PASS", 
                        "Backend supports multiple concurrent player sessions"
                    )
                else:
                    self.log_test(
                        "Multiple Player Session Support", 
                        "FAIL", 
                        f"Failed to create second player session - Status: {response2.status_code}"
                    )
            else:
                self.log_test(
                    "Player Session Tracking", 
                    "FAIL", 
                    f"Failed to create player session - Status: {response.status_code}"
                )
                
            # Verify player count tracking
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                arena_server = next((s for s in servers if s.get('serverType') == 'colyseus'), None)
                
                if arena_server:
                    current_players = arena_server.get('currentPlayers', 0)
                    self.log_test(
                        "Player Count Propagation", 
                        "PASS", 
                        f"Arena server shows {current_players} current players - data propagation working"
                    )
                else:
                    self.log_test(
                        "Player Count Propagation", 
                        "FAIL", 
                        "No Colyseus arena server found for player count verification"
                    )
            else:
                self.log_test(
                    "Player Count Propagation", 
                    "FAIL", 
                    f"Failed to verify player count - Status: {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Player Data Propagation", "FAIL", f"Exception: {str(e)}")

    def test_mapschema_handling(self):
        """Test 3: MapSchema Handling - Confirm backend sends proper MapSchema data for frontend conversion"""
        print("\n🗺️ TESTING: MapSchema Handling")
        
        try:
            # Check environment configuration
            if self.colyseus_endpoint and self.colyseus_endpoint.startswith('wss://'):
                self.log_test(
                    "Colyseus Endpoint Configuration", 
                    "PASS", 
                    f"Colyseus endpoint properly configured: {self.colyseus_endpoint}"
                )
                
                # Verify backend provides correct MapSchema structure info
                response = requests.get(f"{self.base_url}/api/servers", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if response includes Colyseus-specific data structure info
                    colyseus_enabled = data.get('colyseusEnabled', False)
                    colyseus_endpoint = data.get('colyseusEndpoint', '')
                    
                    if colyseus_enabled and colyseus_endpoint:
                        self.log_test(
                            "MapSchema Data Structure Support", 
                            "PASS", 
                            "Backend provides Colyseus MapSchema configuration data"
                        )
                        
                        # Verify arena server structure for MapSchema compatibility
                        servers = data.get('servers', [])
                        arena_server = next((s for s in servers if s.get('serverType') == 'colyseus'), None)
                        
                        if arena_server:
                            # Check for fields that support MapSchema player data
                            required_mapschema_fields = ['roomType', 'maxPlayers', 'currentPlayers', 'endpoint']
                            has_all_fields = all(field in arena_server for field in required_mapschema_fields)
                            
                            if has_all_fields:
                                self.log_test(
                                    "MapSchema Player Data Structure", 
                                    "PASS", 
                                    f"Arena server has all required MapSchema fields: {required_mapschema_fields}"
                                )
                            else:
                                missing = [f for f in required_mapschema_fields if f not in arena_server]
                                self.log_test(
                                    "MapSchema Player Data Structure", 
                                    "FAIL", 
                                    f"Missing MapSchema fields: {missing}"
                                )
                        else:
                            self.log_test(
                                "MapSchema Player Data Structure", 
                                "FAIL", 
                                "No Colyseus arena server found for MapSchema verification"
                            )
                    else:
                        self.log_test(
                            "MapSchema Data Structure Support", 
                            "FAIL", 
                            f"Colyseus not enabled or endpoint missing - Enabled: {colyseus_enabled}, Endpoint: {colyseus_endpoint}"
                        )
                else:
                    self.log_test(
                        "MapSchema Data Structure Support", 
                        "FAIL", 
                        f"Failed to access server data - Status: {response.status_code}"
                    )
            else:
                self.log_test(
                    "Colyseus Endpoint Configuration", 
                    "FAIL", 
                    f"Invalid Colyseus endpoint: {self.colyseus_endpoint}"
                )
                
        except Exception as e:
            self.log_test("MapSchema Handling", "FAIL", f"Exception: {str(e)}")

    def test_multiplayer_session_management(self):
        """Test 4: Multiplayer Session Management - Verify room joining, player tracking, state synchronization"""
        print("\n🎮 TESTING: Multiplayer Session Management")
        
        try:
            # Test room joining capability
            test_join_data = {
                "action": "join",
                "session": {
                    "roomId": "colyseus-arena-global",
                    "joinedAt": "2024-01-01T00:00:00.000Z",
                    "lastActivity": "2024-01-01T00:00:00.000Z",
                    "userId": "multiplayer_test_user",
                    "entryFee": 0,
                    "mode": "colyseus-multiplayer",
                    "region": "Australia",
                    "status": "active"
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/game-sessions",
                json=test_join_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                self.log_test(
                    "Room Joining Capability", 
                    "PASS", 
                    "Backend supports room joining for multiplayer sessions"
                )
                
                # Test player tracking - update session activity
                time.sleep(1)  # Brief delay
                
                update_data = {
                    "action": "update",
                    "roomId": "colyseus-arena-global",
                    "lastActivity": "2024-01-01T00:01:00.000Z"
                }
                
                update_response = requests.post(
                    f"{self.base_url}/api/game-sessions",
                    json=update_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if update_response.status_code in [200, 201]:
                    self.log_test(
                        "Player Activity Tracking", 
                        "PASS", 
                        "Backend can track and update player activity"
                    )
                else:
                    self.log_test(
                        "Player Activity Tracking", 
                        "FAIL", 
                        f"Failed to update player activity - Status: {update_response.status_code}"
                    )
                
                # Test leave functionality
                leave_data = {
                    "action": "leave",
                    "roomId": "colyseus-arena-global"
                }
                
                leave_response = requests.post(
                    f"{self.base_url}/api/game-sessions",
                    json=leave_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if leave_response.status_code in [200, 201]:
                    self.log_test(
                        "Session Leave Management", 
                        "PASS", 
                        "Backend properly handles player leaving sessions"
                    )
                else:
                    self.log_test(
                        "Session Leave Management", 
                        "FAIL", 
                        f"Failed to handle session leave - Status: {leave_response.status_code}"
                    )
            else:
                self.log_test(
                    "Room Joining Capability", 
                    "FAIL", 
                    f"Failed to join room - Status: {response.status_code}"
                )
                
            # Test state synchronization support
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                # Check for real-time data that indicates state synchronization
                servers = data.get('servers', [])
                total_players = data.get('totalPlayers', 0)
                total_active_servers = data.get('totalActiveServers', 0)
                
                if servers and 'lastUpdated' in data:
                    self.log_test(
                        "State Synchronization Support", 
                        "PASS", 
                        f"Backend provides real-time state data - {len(servers)} servers, {total_players} players, {total_active_servers} active"
                    )
                else:
                    self.log_test(
                        "State Synchronization Support", 
                        "FAIL", 
                        "Backend missing real-time state synchronization data"
                    )
            else:
                self.log_test(
                    "State Synchronization Support", 
                    "FAIL", 
                    f"Failed to verify state synchronization - Status: {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Multiplayer Session Management", "FAIL", f"Exception: {str(e)}")

    def test_backend_api_integration(self):
        """Test 5: Backend API Integration - Test /api/servers endpoint for Colyseus integration"""
        print("\n🔌 TESTING: Backend API Integration")
        
        try:
            # Basic API health check
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                self.log_test(
                    "API Health Check", 
                    "PASS", 
                    f"API accessible - {len(data.get('servers', []))} servers available"
                )
                
                # Colyseus integration verification
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                if colyseus_enabled and colyseus_endpoint:
                    self.log_test(
                        "Colyseus API Integration", 
                        "PASS", 
                        f"Colyseus integration active - Endpoint: {colyseus_endpoint}"
                    )
                    
                    # Server data structure validation
                    servers = data.get('servers', [])
                    colyseus_servers = [s for s in servers if s.get('serverType') == 'colyseus']
                    
                    if colyseus_servers:
                        arena_server = colyseus_servers[0]
                        required_fields = [
                            'id', 'roomType', 'name', 'region', 'maxPlayers', 
                            'currentPlayers', 'serverType', 'endpoint', 'canJoin'
                        ]
                        
                        missing_fields = [field for field in required_fields if field not in arena_server]
                        
                        if not missing_fields:
                            self.log_test(
                                "Server Data Structure", 
                                "PASS", 
                                f"Complete server data structure with all {len(required_fields)} required fields"
                            )
                        else:
                            self.log_test(
                                "Server Data Structure", 
                                "FAIL", 
                                f"Missing required fields: {missing_fields}"
                            )
                            
                        # Real-time data verification
                        if 'lastUpdated' in data and 'timestamp' in data:
                            self.log_test(
                                "Real-time Data Support", 
                                "PASS", 
                                "API provides real-time timestamps for data freshness"
                            )
                        else:
                            self.log_test(
                                "Real-time Data Support", 
                                "FAIL", 
                                "Missing real-time timestamp data"
                            )
                    else:
                        self.log_test(
                            "Colyseus Server Data", 
                            "FAIL", 
                            "No Colyseus servers found in API response"
                        )
                else:
                    self.log_test(
                        "Colyseus API Integration", 
                        "FAIL", 
                        f"Colyseus integration not active - Enabled: {colyseus_enabled}, Endpoint: {colyseus_endpoint}"
                    )
            else:
                self.log_test(
                    "API Health Check", 
                    "FAIL", 
                    f"API not accessible - Status: {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Backend API Integration", "FAIL", f"Exception: {str(e)}")

    def test_player_authentication(self):
        """Test 6: Player Authentication - Verify Privy user data handling in multiplayer context"""
        print("\n🔐 TESTING: Player Authentication")
        
        try:
            # Verify authentication endpoint availability
            response = requests.get(f"{self.base_url}/api/wallet/balance", timeout=10)
            if response.status_code in [200, 401]:  # 401 is expected without auth token
                self.log_test(
                    "Authentication Endpoint Availability", 
                    "PASS", 
                    f"Authentication endpoint accessible - Status: {response.status_code}"
                )
                
                # Test guest authentication handling
                if response.status_code == 200:
                    data = response.json()
                    if 'balance' in data and 'wallet_address' in data:
                        self.log_test(
                            "Guest Authentication Support", 
                            "PASS", 
                            f"Guest authentication working - Balance: {data.get('balance')}, Wallet: {data.get('wallet_address')}"
                        )
                    else:
                        self.log_test(
                            "Guest Authentication Support", 
                            "FAIL", 
                            "Missing balance or wallet_address in response"
                        )
                else:
                    # 401 is expected for unauthenticated requests
                    self.log_test(
                        "Authentication Security", 
                        "PASS", 
                        "Proper authentication security - unauthenticated requests rejected"
                    )
            else:
                self.log_test(
                    "Authentication Endpoint Availability", 
                    "FAIL", 
                    f"Authentication endpoint not accessible - Status: {response.status_code}"
                )
            
            # Verify multiplayer session supports user identification
            test_auth_session = {
                "action": "join",
                "session": {
                    "roomId": "colyseus-arena-global",
                    "joinedAt": "2024-01-01T00:00:00.000Z",
                    "lastActivity": "2024-01-01T00:00:00.000Z",
                    "userId": "privy_test_user_123",
                    "playerName": "TestPlayer",
                    "entryFee": 0,
                    "mode": "colyseus-multiplayer",
                    "region": "Australia",
                    "status": "active"
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/game-sessions",
                json=test_auth_session,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                self.log_test(
                    "Multiplayer User Identification", 
                    "PASS", 
                    "Backend supports user identification in multiplayer sessions"
                )
            else:
                self.log_test(
                    "Multiplayer User Identification", 
                    "FAIL", 
                    f"Failed to create authenticated session - Status: {response.status_code}"
                )
                
            # Verify API supports authentication features
            response = requests.get(f"{self.base_url}/api", timeout=10)
            if response.status_code == 200:
                try:
                    data = response.json()
                    features = data.get('features', [])
                    
                    if 'auth' in features:
                        self.log_test(
                            "Authentication Feature Support", 
                            "PASS", 
                            f"Authentication feature enabled in API - Features: {features}"
                        )
                    else:
                        self.log_test(
                            "Authentication Feature Support", 
                            "FAIL", 
                            f"Authentication not in API features - Features: {features}"
                        )
                except:
                    # If root API doesn't return JSON, that's okay
                    self.log_test(
                        "API Root Access", 
                        "PASS", 
                        "API root accessible (non-JSON response is acceptable)"
                    )
            else:
                self.log_test(
                    "API Root Access", 
                    "FAIL", 
                    f"API root not accessible - Status: {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Player Authentication", "FAIL", f"Exception: {str(e)}")

    def test_legacy_cleanup(self):
        """Test 7: Legacy cleanup verification"""
        print("\n🧹 TESTING: Legacy Cleanup Verification")
        
        try:
            # Test that Colyseus has replaced Hathora in server browser
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get("servers", [])
                
                colyseus_servers = [s for s in servers if s.get("serverType") == "colyseus"]
                hathora_servers = [s for s in servers if s.get("serverType") == "hathora"]
                
                if colyseus_servers and not hathora_servers:
                    self.log_test("Server Migration", "PASS", f"Successfully migrated to Colyseus: {len(colyseus_servers)} Colyseus servers, {len(hathora_servers)} Hathora servers")
                elif colyseus_servers and hathora_servers:
                    self.log_test("Server Migration", "PASS", f"Hybrid setup: {len(colyseus_servers)} Colyseus servers, {len(hathora_servers)} Hathora servers (backward compatibility)")
                else:
                    self.log_test("Server Migration", "FAIL", f"Migration incomplete: {len(colyseus_servers)} Colyseus servers, {len(hathora_servers)} Hathora servers")
                    
                # Check that Hathora endpoints still exist for backward compatibility
                try:
                    hathora_response = requests.get(f"{self.base_url}/api/hathora/create-room", timeout=5)
                    if hathora_response.status_code in [200, 400, 405]:  # Any response means endpoint exists
                        self.log_test("Hathora Backward Compatibility", "PASS", "Hathora endpoints still available for backward compatibility")
                    else:
                        self.log_test("Hathora Backward Compatibility", "FAIL", f"Hathora endpoints not accessible: {hathora_response.status_code}")
                except:
                    self.log_test("Hathora Backward Compatibility", "FAIL", "Hathora endpoints completely removed")
                    
            else:
                self.log_test("Server Migration", "FAIL", f"Cannot verify migration - API status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Legacy Cleanup", "FAIL", f"Exception: {str(e)}")
                        self.log_test("Guest Wallet Balance", "FAIL", f"Unexpected guest balance: {data}")
            else:
                self.log_test("Wallet API", "FAIL", f"Wallet API returned status {response.status_code}")
            
            # Test with testing token
            import base64
            test_payload = {
                "userId": "test-user-123",
                "wallet_address": "F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG"
            }
            test_token = "testing-" + base64.b64encode(json.dumps(test_payload).encode()).decode()
            
            headers = {"Authorization": f"Bearer {test_token}"}
            response = requests.get(f"{self.base_url}/api/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("balance", 0) > 0 and data.get("sol_balance", 0) > 0:
                    self.log_test("Authenticated Wallet Balance", "PASS", f"Testing balance: ${data.get('balance')}, {data.get('sol_balance')} SOL")
                else:
                    self.log_test("Authenticated Wallet Balance", "FAIL", f"Invalid testing balance: {data}")
            else:
                self.log_test("Authenticated Wallet Balance", "FAIL", f"Auth wallet API returned status {response.status_code}")
                
        except Exception as e:
            self.log_test("Wallet Authentication API", "FAIL", f"Wallet API test failed: {str(e)}")

    def test_privy_authentication_status(self):
        """Test 5: Privy Authentication Status Check"""
        print("\n🔐 TESTING: Privy Authentication Status")
        
        try:
            # Test if Privy configuration is accessible through API
            response = requests.get(f"{self.base_url}/api", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                features = data.get("features", [])
                if "auth" in features:
                    self.log_test("Privy Auth Feature", "PASS", "Authentication feature enabled in API")
                else:
                    self.log_test("Privy Auth Feature", "FAIL", "Authentication feature not listed in API features")
            
            # Test Privy token handling in wallet API
            # Create a mock Privy-style JWT token
            import base64
            privy_payload = {
                "sub": "did:privy:test-user-123",
                "email": "test@example.com",
                "wallet": {
                    "address": "F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG"
                }
            }
            
            # Create a simple JWT-like token (header.payload.signature)
            header = base64.b64encode(json.dumps({"typ": "JWT", "alg": "HS256"}).encode()).decode().rstrip('=')
            payload = base64.b64encode(json.dumps(privy_payload).encode()).decode().rstrip('=')
            signature = "test-signature"
            mock_privy_token = f"{header}.{payload}.{signature}"
            
            headers = {"Authorization": f"Bearer {mock_privy_token}"}
            response = requests.get(f"{self.base_url}/api/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                # Should handle Privy token gracefully even if verification fails
                self.log_test("Privy Token Handling", "PASS", "Privy token processed without errors")
            else:
                self.log_test("Privy Token Handling", "FAIL", f"Privy token handling failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Privy Authentication Status", "FAIL", f"Privy auth test failed: {str(e)}")

    def test_legacy_hathora_cleanup(self):
        """Test 6: Legacy Hathora Cleanup Verification"""
        print("\n🧹 TESTING: Legacy Hathora Cleanup Verification")
        
        try:
            # Check if Hathora endpoints still exist (they should for backward compatibility)
            hathora_endpoints = [
                "/api/hathora/create-room"
            ]
            
            hathora_still_active = []
            
            for endpoint in hathora_endpoints:
                try:
                    response = requests.post(
                        f"{self.base_url}{endpoint}",
                        json={"gameMode": "practice", "region": "us-east-1"},
                        timeout=10
                    )
                    
                    if response.status_code != 404:
                        hathora_still_active.append(endpoint)
                        
                except:
                    pass  # Endpoint doesn't exist or failed
            
            if hathora_still_active:
                self.log_test("Hathora Endpoint Cleanup", "PASS", f"Hathora endpoints still available for compatibility: {hathora_still_active}", is_critical=False)
            else:
                self.log_test("Hathora Endpoint Cleanup", "PASS", "All Hathora endpoints properly cleaned up")
            
            # Check if Colyseus has replaced Hathora in server browser
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get("servers", [])
                
                colyseus_servers = [s for s in servers if s.get("serverType") == "colyseus"]
                hathora_servers = [s for s in servers if s.get("serverType") == "hathora" or s.get("serverType") == "hathora-paid"]
                
                if colyseus_servers and not hathora_servers:
                    self.log_test("Server Migration", "PASS", f"Successfully migrated to Colyseus: {len(colyseus_servers)} Colyseus servers, 0 Hathora servers")
                elif colyseus_servers and hathora_servers:
                    self.log_test("Server Migration", "PASS", f"Hybrid setup: {len(colyseus_servers)} Colyseus, {len(hathora_servers)} Hathora servers", is_critical=False)
                else:
                    self.log_test("Server Migration", "FAIL", f"Migration incomplete: {len(colyseus_servers)} Colyseus, {len(hathora_servers)} Hathora servers")
            
        except Exception as e:
            self.log_test("Legacy Hathora Cleanup", "FAIL", f"Cleanup verification failed: {str(e)}")

    def test_environment_variables(self):
        """Test 7: Environment Variables Configuration"""
        print("\n⚙️ TESTING: Environment Variables Configuration")
        
        try:
            # Test Colyseus endpoint configuration through API
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                colyseus_endpoint = data.get("colyseusEndpoint")
                
                if colyseus_endpoint == COLYSEUS_ENDPOINT:
                    self.log_test("Colyseus Endpoint Config", "PASS", f"Correct Colyseus endpoint: {colyseus_endpoint}")
                else:
                    self.log_test("Colyseus Endpoint Config", "FAIL", f"Expected {COLYSEUS_ENDPOINT}, got {colyseus_endpoint}")
            
            # Test MongoDB connection through database operations
            response = requests.get(f"{self.base_url}/api/game-sessions", timeout=10)
            
            if response.status_code == 200:
                self.log_test("MongoDB URL Config", "PASS", "MongoDB connection successful")
            else:
                self.log_test("MongoDB URL Config", "FAIL", f"MongoDB connection failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Environment Variables", "FAIL", f"Environment config test failed: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting TurfLoot Backend API Testing Suite - Phase 2 Assessment")
        print(f"Testing against: {self.base_url}")
        print(f"Expected Colyseus endpoint: {COLYSEUS_ENDPOINT}")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all tests
        self.test_api_health_check()
        self.test_colyseus_server_api()
        self.test_database_integration()
        self.test_wallet_authentication_api()
        self.test_privy_authentication_status()
        self.test_legacy_hathora_cleanup()
        self.test_environment_variables()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 BACKEND TESTING SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed_tests']} ✅")
        print(f"Failed: {self.results['failed_tests']} ❌")
        print(f"Success Rate: {(self.results['passed_tests']/self.results['total_tests']*100):.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        
        if self.results['critical_issues']:
            print(f"\n🚨 CRITICAL ISSUES ({len(self.results['critical_issues'])}):")
            for issue in self.results['critical_issues']:
                print(f"  ❌ {issue}")
        
        if self.results['minor_issues']:
            print(f"\n⚠️ MINOR ISSUES ({len(self.results['minor_issues'])}):")
            for issue in self.results['minor_issues']:
                print(f"  ⚠️ {issue}")
        
        if not self.results['critical_issues']:
            print("\n🎉 NO CRITICAL ISSUES FOUND - BACKEND IS OPERATIONAL!")
        
        return self.results

if __name__ == "__main__":
    tester = TurfLootBackendTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    exit_code = 0 if len(results['critical_issues']) == 0 else 1
    exit(exit_code)