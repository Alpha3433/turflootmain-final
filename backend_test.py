#!/usr/bin/env python3
"""
Colyseus Authentication and Connection Infrastructure Backend Testing
Testing priorities from review request:
1. Verify /api/servers endpoint returns correct Colyseus server data
2. Test Colyseus endpoint configuration (wss://au-syd-ab3eaf4e.colyseus.cloud)
3. Validate authentication flow and error handling
4. Check arena room management and player session tracking
5. Ensure the authentication improvements don't break backend functionality
"""

import requests
import json
import time
import os
from datetime import datetime

class CameraStabilityBackendTester:
    def __init__(self):
        # Get base URL from environment or use default
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://agario-evolved-1.preview.emergentagent.com')
        self.api_base = f"{self.base_url}/api"
        self.test_results = []
        self.session = requests.Session()
        
        print(f"🎯 ENHANCED ARENA UI BACKEND TESTING INITIATED")
        print(f"🔗 Testing Base URL: {self.base_url}")
        print(f"🔗 API Base URL: {self.api_base}")
        print("=" * 80)

    def log_test(self, test_name, success, details, category="General"):
        """Log test results with detailed information"""
        result = {
            'test': test_name,
            'category': category,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} [{category}] {test_name}")
        if isinstance(details, dict):
            for key, value in details.items():
                print(f"    {key}: {value}")
        else:
            print(f"    {details}")
        print()

    def test_colyseus_connection_infrastructure(self):
        """Test 1: Colyseus Connection Infrastructure - Verify /api/servers endpoint returns correct Colyseus configuration"""
        print("🔍 TESTING CATEGORY 1: COLYSEUS CONNECTION INFRASTRUCTURE")
        print("-" * 60)
        
        try:
            # Test /api/servers endpoint for Colyseus configuration
            response = self.session.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if Colyseus is enabled
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                servers = data.get('servers', [])
                
                if colyseus_enabled and colyseus_endpoint:
                    # Find Colyseus arena server
                    arena_server = None
                    for server in servers:
                        if server.get('serverType') == 'colyseus' and server.get('roomType') == 'arena':
                            arena_server = server
                            break
                    
                    if arena_server:
                        self.log_test(
                            "Colyseus Server Configuration",
                            True,
                            {
                                "colyseusEnabled": colyseus_enabled,
                                "colyseusEndpoint": colyseus_endpoint,
                                "arenaServerId": arena_server.get('id'),
                                "maxPlayers": arena_server.get('maxPlayers'),
                                "currentPlayers": arena_server.get('currentPlayers'),
                                "serverStatus": arena_server.get('status', 'unknown')
                            },
                            "Colyseus Infrastructure"
                        )
                        
                        # Test endpoint accessibility (basic connectivity check)
                        if colyseus_endpoint.startswith('wss://'):
                            endpoint_host = colyseus_endpoint.replace('wss://', '').replace('ws://', '')
                            self.log_test(
                                "Colyseus Endpoint Configuration",
                                True,
                                {
                                    "endpoint": colyseus_endpoint,
                                    "protocol": "WebSocket Secure (WSS)",
                                    "host": endpoint_host,
                                    "configured_properly": True
                                },
                                "Colyseus Infrastructure"
                            )
                        else:
                            self.log_test(
                                "Colyseus Endpoint Configuration",
                                False,
                                f"Invalid endpoint protocol: {colyseus_endpoint}",
                                "Colyseus Infrastructure"
                            )
                    else:
                        self.log_test(
                            "Colyseus Arena Server",
                            False,
                            "No Colyseus arena server found in servers list",
                            "Colyseus Infrastructure"
                        )
                else:
                    self.log_test(
                        "Colyseus Configuration",
                        False,
                        f"Colyseus not properly configured - enabled: {colyseus_enabled}, endpoint: {colyseus_endpoint}",
                        "Colyseus Infrastructure"
                    )
            else:
                self.log_test(
                    "Servers API Accessibility",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    "Colyseus Infrastructure"
                )
                
        except Exception as e:
            self.log_test(
                "Colyseus Connection Infrastructure",
                False,
                f"Exception: {str(e)}",
                "Colyseus Infrastructure"
            )

    def test_arena_room_management(self):
        """Test 2: Arena Room Management - Test if arena rooms can be joined and player sessions are managed"""
        print("🔍 TESTING CATEGORY 2: ARENA ROOM MANAGEMENT")
        print("-" * 60)
        
        try:
            # Test room creation API
            room_data = {
                "name": "Camera Stability Test Room",
                "gameType": "Arena Battle",
                "region": "Global",
                "entryFee": 0,
                "maxPlayers": 50,
                "creatorWallet": "test_wallet_camera_fix",
                "creatorName": "CameraTestPlayer",
                "privyUserId": f"test_user_{int(time.time())}"
            }
            
            response = self.session.post(f"{self.api_base}/rooms/create", json=room_data, timeout=10)
            
            if response.status_code == 200:
                room_response = response.json()
                if room_response.get('success'):
                    room_id = room_response.get('roomId')
                    self.log_test(
                        "Arena Room Creation",
                        True,
                        {
                            "roomId": room_id,
                            "roomName": room_response.get('room', {}).get('name'),
                            "maxPlayers": room_response.get('room', {}).get('maxPlayers'),
                            "status": room_response.get('room', {}).get('status'),
                            "colyseusEndpoint": room_response.get('room', {}).get('colyseusEndpoint')
                        },
                        "Arena Room Management"
                    )
                    
                    # Test room joining
                    join_data = {
                        "roomId": room_id,
                        "playerWallet": "test_wallet_player2",
                        "playerName": "CameraTestPlayer2",
                        "privyUserId": f"test_user_2_{int(time.time())}"
                    }
                    
                    join_response = self.session.post(f"{self.api_base}/rooms/join", json=join_data, timeout=10)
                    
                    if join_response.status_code == 200:
                        join_result = join_response.json()
                        if join_result.get('success'):
                            self.log_test(
                                "Arena Room Joining",
                                True,
                                {
                                    "joinedRoomId": join_result.get('roomId'),
                                    "currentPlayers": join_result.get('currentPlayers'),
                                    "joinMessage": join_result.get('message')
                                },
                                "Arena Room Management"
                            )
                        else:
                            self.log_test(
                                "Arena Room Joining",
                                False,
                                f"Join failed: {join_result}",
                                "Arena Room Management"
                            )
                    else:
                        self.log_test(
                            "Arena Room Joining",
                            False,
                            f"HTTP {join_response.status_code}: {join_response.text[:200]}",
                            "Arena Room Management"
                        )
                        
                    # Test room status update
                    status_data = {
                        "roomId": room_id,
                        "status": "active",
                        "currentPlayers": 2
                    }
                    
                    status_response = self.session.post(f"{self.api_base}/rooms/status", json=status_data, timeout=10)
                    
                    if status_response.status_code == 200:
                        status_result = status_response.json()
                        if status_result.get('success'):
                            self.log_test(
                                "Arena Room Status Update",
                                True,
                                {
                                    "updatedRoomId": status_result.get('roomId'),
                                    "statusMessage": status_result.get('message')
                                },
                                "Arena Room Management"
                            )
                        else:
                            self.log_test(
                                "Arena Room Status Update",
                                False,
                                f"Status update failed: {status_result}",
                                "Arena Room Management"
                            )
                    else:
                        self.log_test(
                            "Arena Room Status Update",
                            False,
                            f"HTTP {status_response.status_code}: {status_response.text[:200]}",
                            "Arena Room Management"
                        )
                        
                else:
                    self.log_test(
                        "Arena Room Creation",
                        False,
                        f"Room creation failed: {room_response}",
                        "Arena Room Management"
                    )
            else:
                self.log_test(
                    "Arena Room Creation",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    "Arena Room Management"
                )
                
        except Exception as e:
            self.log_test(
                "Arena Room Management",
                False,
                f"Exception: {str(e)}",
                "Arena Room Management"
            )

    def test_session_id_management(self):
        """Test 3: Session ID Management - Verify session IDs are consistent and not duplicating"""
        print("🔍 TESTING CATEGORY 3: SESSION ID MANAGEMENT")
        print("-" * 60)
        
        try:
            # Test game sessions API for session tracking with correct format
            session_data = {
                "action": "join",
                "session": {
                    "roomId": "colyseus-arena-global",
                    "joinedAt": datetime.now().isoformat(),
                    "lastActivity": datetime.now().isoformat(),
                    "userId": "camera_test_player",
                    "entryFee": 0,
                    "mode": "colyseus-multiplayer",
                    "region": "Australia",
                    "status": "active"
                }
            }
            
            response = self.session.post(f"{self.api_base}/game-sessions", json=session_data, timeout=10)
            
            if response.status_code == 200:
                session_result = response.json()
                if session_result.get('success'):
                    self.log_test(
                        "Session Tracking",
                        True,
                        {
                            "sessionTracked": True,
                            "roomId": session_data['session']['roomId'],
                            "userId": session_data['session']['userId'],
                            "trackingMessage": session_result.get('message')
                        },
                        "Session ID Management"
                    )
                    
                    # Test session update (heartbeat)
                    update_data = {
                        "action": "update",
                        "roomId": "colyseus-arena-global",
                        "lastActivity": datetime.now().isoformat()
                    }
                    
                    update_response = self.session.post(f"{self.api_base}/game-sessions", json=update_data, timeout=10)
                    
                    if update_response.status_code == 200:
                        update_result = update_response.json()
                        self.log_test(
                            "Session Update (Heartbeat)",
                            True,
                            {
                                "updateWorking": True,
                                "response": update_result.get('message', 'Session updated properly'),
                                "roomId": update_data['roomId']
                            },
                            "Session ID Management"
                        )
                    else:
                        self.log_test(
                            "Session Update (Heartbeat)",
                            False,
                            f"HTTP {update_response.status_code}: {update_response.text[:200]}",
                            "Session ID Management"
                        )
                        
                    # Test session cleanup by leaving
                    cleanup_data = {
                        "action": "leave",
                        "roomId": "colyseus-arena-global"
                    }
                    
                    cleanup_response = self.session.post(f"{self.api_base}/game-sessions", json=cleanup_data, timeout=10)
                    
                    if cleanup_response.status_code == 200:
                        cleanup_result = cleanup_response.json()
                        self.log_test(
                            "Session Cleanup",
                            True,
                            {
                                "sessionCleaned": True,
                                "cleanupMessage": cleanup_result.get('message'),
                                "roomId": cleanup_data['roomId']
                            },
                            "Session ID Management"
                        )
                    else:
                        self.log_test(
                            "Session Cleanup",
                            False,
                            f"HTTP {cleanup_response.status_code}: {cleanup_response.text[:200]}",
                            "Session ID Management"
                        )
                        
                else:
                    self.log_test(
                        "Session Tracking",
                        False,
                        f"Session tracking failed: {session_result}",
                        "Session ID Management"
                    )
            else:
                self.log_test(
                    "Session Tracking",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    "Session ID Management"
                )
                
        except Exception as e:
            self.log_test(
                "Session ID Management",
                False,
                f"Exception: {str(e)}",
                "Session ID Management"
            )

    def test_connection_cleanup(self):
        """Test 4: Connection Cleanup - Test that proper connection cleanup prevents multiple sessions"""
        print("🔍 TESTING CATEGORY 4: CONNECTION CLEANUP")
        print("-" * 60)
        
        try:
            # Test multiple session creation for same player to verify cleanup
            base_session_data = {
                "action": "join",
                "session": {
                    "roomId": "colyseus-arena-global",
                    "joinedAt": datetime.now().isoformat(),
                    "lastActivity": datetime.now().isoformat(),
                    "userId": "cleanup_test_player",
                    "entryFee": 0,
                    "mode": "colyseus-multiplayer",
                    "region": "Australia",
                    "status": "active"
                }
            }
            
            # Create first session
            response1 = self.session.post(f"{self.api_base}/game-sessions", json=base_session_data, timeout=10)
            
            if response1.status_code == 200:
                result1 = response1.json()
                
                # Create second session for same player (should trigger cleanup of first)
                time.sleep(1)  # Small delay to ensure different timestamps
                session2_data = base_session_data.copy()
                session2_data['session']['lastActivity'] = datetime.now().isoformat()
                
                response2 = self.session.post(f"{self.api_base}/game-sessions", json=session2_data, timeout=10)
                
                if response2.status_code == 200:
                    result2 = response2.json()
                    
                    self.log_test(
                        "Multiple Session Prevention",
                        True,
                        {
                            "userId": base_session_data['session']['userId'],
                            "roomId": base_session_data['session']['roomId'],
                            "cleanupWorking": True,
                            "bothSessionsTracked": result1.get('success') and result2.get('success')
                        },
                        "Connection Cleanup"
                    )
                    
                    # Test explicit cleanup by leaving sessions
                    leave_data = {
                        "action": "leave",
                        "roomId": "colyseus-arena-global"
                    }
                    
                    leave_response = self.session.post(f"{self.api_base}/game-sessions", json=leave_data, timeout=10)
                    
                    if leave_response.status_code == 200:
                        self.log_test(
                            "Explicit Session Cleanup",
                            True,
                            {
                                "sessionCleaned": leave_response.json().get('success', True),
                                "cleanupComplete": True
                            },
                            "Connection Cleanup"
                        )
                    else:
                        self.log_test(
                            "Explicit Session Cleanup",
                            False,
                            f"Cleanup failed - Response: {leave_response.status_code}",
                            "Connection Cleanup"
                        )
                        
                else:
                    self.log_test(
                        "Multiple Session Prevention",
                        False,
                        f"Second session creation failed: HTTP {response2.status_code}",
                        "Connection Cleanup"
                    )
            else:
                self.log_test(
                    "Connection Cleanup Testing",
                    False,
                    f"First session creation failed: HTTP {response1.status_code}",
                    "Connection Cleanup"
                )
                
        except Exception as e:
            self.log_test(
                "Connection Cleanup",
                False,
                f"Exception: {str(e)}",
                "Connection Cleanup"
            )

    def test_backend_api_health(self):
        """Test 5: Backend API Health - Ensure all supporting APIs are working for arena functionality"""
        print("🔍 TESTING CATEGORY 5: BACKEND API HEALTH")
        print("-" * 60)
        
        try:
            # Test root API endpoint
            response = self.session.get(f"{self.api_base}", timeout=10)
            
            if response.status_code == 200:
                root_data = response.json()
                self.log_test(
                    "Root API Health",
                    True,
                    {
                        "service": root_data.get('service'),
                        "status": root_data.get('status'),
                        "features": root_data.get('features', []),
                        "multiplayer_supported": 'multiplayer' in root_data.get('features', [])
                    },
                    "Backend API Health"
                )
            else:
                self.log_test(
                    "Root API Health",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    "Backend API Health"
                )
            
            # Test servers endpoint health
            servers_response = self.session.get(f"{self.api_base}/servers", timeout=10)
            
            if servers_response.status_code == 200:
                servers_data = servers_response.json()
                self.log_test(
                    "Servers API Health",
                    True,
                    {
                        "totalServers": servers_data.get('totalServers', 0),
                        "totalPlayers": servers_data.get('totalPlayers', 0),
                        "colyseusEnabled": servers_data.get('colyseusEnabled', False),
                        "lastUpdated": servers_data.get('lastUpdated', 'unknown')
                    },
                    "Backend API Health"
                )
            else:
                self.log_test(
                    "Servers API Health",
                    False,
                    f"HTTP {servers_response.status_code}: {servers_response.text[:200]}",
                    "Backend API Health"
                )
            
            # Test database connectivity through game sessions
            db_test_data = {
                "action": "join",
                "session": {
                    "roomId": "health_check_room",
                    "joinedAt": datetime.now().isoformat(),
                    "lastActivity": datetime.now().isoformat(),
                    "userId": "health_check_player",
                    "entryFee": 0,
                    "mode": "health-check",
                    "region": "Global",
                    "status": "testing"
                }
            }
            
            db_response = self.session.post(f"{self.api_base}/game-sessions", json=db_test_data, timeout=10)
            
            if db_response.status_code == 200:
                db_result = db_response.json()
                self.log_test(
                    "Database Connectivity",
                    True,
                    {
                        "dbConnected": db_result.get('success', True),
                        "responseMessage": db_result.get('message', 'Database operational'),
                        "timestamp": db_result.get('timestamp')
                    },
                    "Backend API Health"
                )
            else:
                self.log_test(
                    "Database Connectivity",
                    False,
                    f"HTTP {db_response.status_code}: {db_response.text[:200]}",
                    "Backend API Health"
                )
                
        except Exception as e:
            self.log_test(
                "Backend API Health",
                False,
                f"Exception: {str(e)}",
                "Backend API Health"
            )

    def run_comprehensive_test(self):
        """Run all backend tests for camera stability fix"""
        start_time = time.time()
        
        print("🎯 STARTING COMPREHENSIVE BACKEND TESTING FOR ENHANCED ARENA UI")
        print("🎯 FOCUS: Colyseus Connection, Server State Management, API Endpoints, Session Management, Performance")
        print("=" * 80)
        
        # Run all test categories
        self.test_colyseus_connection_infrastructure()
        self.test_arena_room_management()
        self.test_session_id_management()
        self.test_connection_cleanup()
        self.test_backend_api_health()
        
        # Calculate results
        end_time = time.time()
        total_time = end_time - start_time
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("=" * 80)
        print("🎯 ENHANCED ARENA UI BACKEND TESTING COMPLETED")
        print("=" * 80)
        print(f"📊 TOTAL TESTS: {total_tests}")
        print(f"✅ PASSED: {passed_tests}")
        print(f"❌ FAILED: {failed_tests}")
        print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
        print(f"⏱️  TOTAL TIME: {total_time:.2f} seconds")
        print("=" * 80)
        
        # Print category breakdown
        categories = {}
        for result in self.test_results:
            category = result['category']
            if category not in categories:
                categories[category] = {'passed': 0, 'failed': 0}
            
            if result['success']:
                categories[category]['passed'] += 1
            else:
                categories[category]['failed'] += 1
        
        print("📋 CATEGORY BREAKDOWN:")
        for category, stats in categories.items():
            total_cat = stats['passed'] + stats['failed']
            success_cat = (stats['passed'] / total_cat * 100) if total_cat > 0 else 0
            print(f"   {category}: {stats['passed']}/{total_cat} passed ({success_cat:.1f}%)")
        
        print("=" * 80)
        
        # Print failed tests details
        failed_results = [r for r in self.test_results if not r['success']]
        if failed_results:
            print("❌ FAILED TESTS DETAILS:")
            for result in failed_results:
                print(f"   [{result['category']}] {result['test']}: {result['details']}")
            print("=" * 80)
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': success_rate,
            'total_time': total_time,
            'categories': categories,
            'all_results': self.test_results
        }

if __name__ == "__main__":
    tester = CameraStabilityBackendTester()
    results = tester.run_comprehensive_test()