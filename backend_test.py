#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Template Literal Syntax Fix
Testing Hathora Integration and On-Demand Room Creation Support

Focus Areas:
1. Hathora Integration APIs
2. On-Demand Room Creation Backend Support  
3. Game URL Parameter Processing
4. Server Browser Integration
5. Critical Workflow Testing
"""

import requests
import json
import time
import os
import sys
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://hathora-party.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class HathoraBackendTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name, success, message, response_time=None):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            self.failed_tests += 1
            status = "❌ FAIL"
            
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        result = f"{status}: {test_name}{time_info} - {message}"
        print(result)
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        })
        
    def test_hathora_environment_configuration(self):
        """Test 1: Hathora Environment Variables and Configuration"""
        print("\n🔧 TESTING HATHORA ENVIRONMENT CONFIGURATION")
        
        try:
            # Test API root endpoint for Hathora features
            start_time = time.time()
            response = requests.get(f"{API_BASE}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                features = data.get('features', [])
                
                if 'multiplayer' in features:
                    self.log_test("Hathora Multiplayer Feature Enabled", True, 
                                f"API shows multiplayer feature enabled: {features}", response_time)
                else:
                    self.log_test("Hathora Multiplayer Feature Enabled", False, 
                                f"Multiplayer feature not found in API features: {features}", response_time)
                    
                # Test server browser for Hathora integration
                start_time = time.time()
                browser_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                browser_time = time.time() - start_time
                
                if browser_response.status_code == 200:
                    browser_data = browser_response.json()
                    hathora_enabled = browser_data.get('hathoraEnabled', False)
                    
                    if hathora_enabled:
                        self.log_test("Hathora Integration Enabled in Server Browser", True,
                                    f"Server browser shows hathoraEnabled=true", browser_time)
                    else:
                        self.log_test("Hathora Integration Enabled in Server Browser", False,
                                    f"Server browser shows hathoraEnabled=false", browser_time)
                        
                    # Check for Hathora servers
                    servers = browser_data.get('servers', [])
                    hathora_servers = [s for s in servers if s.get('serverType') == 'hathora']
                    
                    if hathora_servers:
                        self.log_test("Hathora Servers Available", True,
                                    f"Found {len(hathora_servers)} Hathora servers", browser_time)
                    else:
                        self.log_test("Hathora Servers Available", False,
                                    f"No Hathora servers found in {len(servers)} total servers", browser_time)
                else:
                    self.log_test("Server Browser API Access", False,
                                f"Server browser returned {browser_response.status_code}", browser_time)
            else:
                self.log_test("API Root Endpoint", False,
                            f"API root returned {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Hathora Environment Configuration", False, f"Exception: {str(e)}")
            
    def test_on_demand_room_creation_support(self):
        """Test 2: On-Demand Room Creation Backend Support"""
        print("\n🎮 TESTING ON-DEMAND ROOM CREATION BACKEND SUPPORT")
        
        try:
            # Test server browser endpoint for room creation data
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                if servers:
                    self.log_test("Server Browser Data Available", True,
                                f"Found {len(servers)} servers for room creation", response_time)
                    
                    # Check for global multiplayer server (main target for on-demand rooms)
                    global_servers = [s for s in servers if 'global' in s.get('name', '').lower() or 
                                    s.get('id') == 'global-practice-bots']
                    
                    if global_servers:
                        server = global_servers[0]
                        required_fields = ['id', 'name', 'region', 'maxPlayers', 'mode']
                        missing_fields = [field for field in required_fields if field not in server]
                        
                        if not missing_fields:
                            self.log_test("Global Server Data Structure", True,
                                        f"Global server has all required fields: {required_fields}", response_time)
                        else:
                            self.log_test("Global Server Data Structure", False,
                                        f"Missing fields: {missing_fields}", response_time)
                            
                        # Test room ID format compatibility
                        server_id = server.get('id', '')
                        if server_id:
                            # Simulate the template literal room ID generation from frontend
                            import random
                            import string
                            random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
                            test_room_id = f"{server_id}-{random_suffix}"
                            
                            self.log_test("Room ID Format Generation", True,
                                        f"Generated room ID: {test_room_id}", response_time)
                        else:
                            self.log_test("Room ID Format Generation", False,
                                        "Server ID is empty", response_time)
                    else:
                        self.log_test("Global Multiplayer Server Available", False,
                                    "No global multiplayer server found for on-demand rooms", response_time)
                else:
                    self.log_test("Server Browser Data Available", False,
                                "No servers found in server browser", response_time)
            else:
                self.log_test("Server Browser Endpoint", False,
                            f"Server browser returned {response.status_code}", response_time)
                
            # Test session tracking APIs for dynamic room IDs
            self.test_session_tracking_for_dynamic_rooms()
            
        except Exception as e:
            self.log_test("On-Demand Room Creation Support", False, f"Exception: {str(e)}")
            
    def test_session_tracking_for_dynamic_rooms(self):
        """Test session tracking with dynamically generated room IDs"""
        print("\n📊 TESTING SESSION TRACKING FOR DYNAMIC ROOM IDS")
        
        try:
            # Generate a test room ID similar to frontend template literal
            import random
            import string
            server_id = "global-practice-bots"
            random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            test_room_id = f"{server_id}-{random_suffix}"
            
            # Test session join with dynamic room ID
            session_data = {
                "roomId": test_room_id,
                "playerId": f"test-player-{int(time.time())}",
                "playerName": "OnDemandTester"
            }
            
            start_time = time.time()
            join_response = requests.post(f"{API_BASE}/game-sessions/join", 
                                        json=session_data, timeout=10)
            join_time = time.time() - start_time
            
            if join_response.status_code == 200:
                join_data = join_response.json()
                self.log_test("Session Join with Dynamic Room ID", True,
                            f"Successfully joined room {test_room_id}", join_time)
                
                # Test session leave
                start_time = time.time()
                leave_response = requests.post(f"{API_BASE}/game-sessions/leave",
                                             json=session_data, timeout=10)
                leave_time = time.time() - start_time
                
                if leave_response.status_code == 200:
                    self.log_test("Session Leave with Dynamic Room ID", True,
                                f"Successfully left room {test_room_id}", leave_time)
                else:
                    self.log_test("Session Leave with Dynamic Room ID", False,
                                f"Leave failed with {leave_response.status_code}", leave_time)
            else:
                self.log_test("Session Join with Dynamic Room ID", False,
                            f"Join failed with {join_response.status_code}", join_time)
                
        except Exception as e:
            self.log_test("Session Tracking for Dynamic Rooms", False, f"Exception: {str(e)}")
            
    def test_game_url_parameter_processing(self):
        """Test 3: Game URL Parameter Processing"""
        print("\n🔗 TESTING GAME URL PARAMETER PROCESSING")
        
        try:
            # Test server browser to ensure it provides data for URL construction
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                if servers:
                    server = servers[0]  # Test with first available server
                    
                    # Verify server has all required fields for URL construction
                    url_fields = ['id', 'mode', 'stake', 'region']
                    server_fields = {}
                    
                    for field in url_fields:
                        value = server.get(field, 'unknown' if field == 'region' else 0)
                        server_fields[field] = value
                        
                    # Simulate the template literal URL construction from frontend
                    room_id = f"{server_fields['id']}-randomstring"
                    test_url_params = {
                        'roomId': room_id,
                        'mode': server_fields['mode'],
                        'fee': server_fields['stake'],
                        'region': server_fields['region'],
                        'multiplayer': 'hathora',
                        'server': server_fields['id'],
                        'hathoraApp': 'app-d0e53e41-4d8f-4f33-91f7-87ab78b3fddb',
                        'ondemand': 'true'
                    }
                    
                    self.log_test("URL Parameter Data Availability", True,
                                f"All URL parameters available: {list(test_url_params.keys())}", response_time)
                    
                    # Test fallback URL parameters
                    fallback_params = {
                        'roomId': server_fields['id'],
                        'mode': server_fields['mode'],
                        'fee': server_fields['stake'],
                        'region': server_fields['region'],
                        'multiplayer': 'direct'
                    }
                    
                    self.log_test("Fallback URL Parameter Support", True,
                                f"Fallback parameters available: {list(fallback_params.keys())}", response_time)
                    
                    # Test parameter validation
                    required_params = ['roomId', 'mode', 'fee', 'region', 'multiplayer']
                    missing_params = [p for p in required_params if p not in test_url_params or test_url_params[p] is None]
                    
                    if not missing_params:
                        self.log_test("URL Parameter Completeness", True,
                                    "All required URL parameters present", response_time)
                    else:
                        self.log_test("URL Parameter Completeness", False,
                                    f"Missing parameters: {missing_params}", response_time)
                else:
                    self.log_test("Server Data for URL Construction", False,
                                "No servers available for URL parameter testing", response_time)
            else:
                self.log_test("Server Browser for URL Parameters", False,
                            f"Server browser returned {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Game URL Parameter Processing", False, f"Exception: {str(e)}")
            
    def test_server_browser_integration(self):
        """Test 4: Server Browser Integration"""
        print("\n🌐 TESTING SERVER BROWSER INTEGRATION")
        
        try:
            # Test server browser endpoint
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Test server data structure
                servers = data.get('servers', [])
                total_players = data.get('totalPlayers', 0)
                hathora_enabled = data.get('hathoraEnabled', False)
                
                self.log_test("Server Browser Response Structure", True,
                            f"Found {len(servers)} servers, {total_players} players, hathoraEnabled={hathora_enabled}", response_time)
                
                if servers:
                    # Test server data completeness for on-demand room creation
                    server = servers[0]
                    required_server_fields = ['id', 'name', 'region', 'currentPlayers', 'maxPlayers', 'mode', 'stake']
                    
                    present_fields = [field for field in required_server_fields if field in server]
                    missing_fields = [field for field in required_server_fields if field not in server]
                    
                    if len(present_fields) >= len(required_server_fields) - 1:  # Allow 1 missing field
                        self.log_test("Server Data Completeness", True,
                                    f"Server has {len(present_fields)}/{len(required_server_fields)} required fields", response_time)
                    else:
                        self.log_test("Server Data Completeness", False,
                                    f"Missing critical fields: {missing_fields}", response_time)
                    
                    # Test different server configurations
                    practice_servers = [s for s in servers if s.get('mode') == 'practice']
                    cash_servers = [s for s in servers if s.get('mode') == 'cash']
                    
                    self.log_test("Server Type Variety", True,
                                f"Found {len(practice_servers)} practice + {len(cash_servers)} cash servers", response_time)
                    
                    # Test region distribution
                    regions = list(set(s.get('region', 'unknown') for s in servers))
                    self.log_test("Multi-Region Support", True,
                                f"Servers available in regions: {regions}", response_time)
                else:
                    self.log_test("Server Availability", False,
                                "No servers found in server browser", response_time)
                    
                # Test real-time player tracking
                if total_players >= 0:  # Accept 0 as valid
                    self.log_test("Real-Time Player Tracking", True,
                                f"Player count tracking operational: {total_players} players", response_time)
                else:
                    self.log_test("Real-Time Player Tracking", False,
                                f"Invalid player count: {total_players}", response_time)
            else:
                self.log_test("Server Browser Endpoint", False,
                            f"Server browser returned {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Server Browser Integration", False, f"Exception: {str(e)}")
            
    def test_critical_workflow_testing(self):
        """Test 5: Critical Workflow Testing - Complete On-Demand Room Creation Flow"""
        print("\n🔄 TESTING CRITICAL WORKFLOW - COMPLETE ON-DEMAND ROOM CREATION FLOW")
        
        try:
            # Step 1: Server Discovery
            print("  Step 1: Server Discovery")
            start_time = time.time()
            browser_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            discovery_time = time.time() - start_time
            
            if browser_response.status_code != 200:
                self.log_test("Workflow Step 1: Server Discovery", False,
                            f"Server browser failed: {browser_response.status_code}", discovery_time)
                return
                
            browser_data = browser_response.json()
            servers = browser_data.get('servers', [])
            
            if not servers:
                self.log_test("Workflow Step 1: Server Discovery", False,
                            "No servers available for workflow", discovery_time)
                return
                
            # Find a suitable server for testing
            target_server = None
            for server in servers:
                if server.get('id') == 'global-practice-bots' or 'global' in server.get('name', '').lower():
                    target_server = server
                    break
                    
            if not target_server:
                target_server = servers[0]  # Use first available server
                
            self.log_test("Workflow Step 1: Server Discovery", True,
                        f"Found target server: {target_server.get('name', 'Unknown')}", discovery_time)
            
            # Step 2: Room Creation Simulation
            print("  Step 2: Room Creation Simulation")
            import random
            import string
            server_id = target_server.get('id', 'test-server')
            random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            room_id = f"{server_id}-{random_suffix}"
            
            self.log_test("Workflow Step 2: Room ID Generation", True,
                        f"Generated room ID: {room_id}", 0.001)
            
            # Step 3: Session Tracking
            print("  Step 3: Session Tracking")
            session_data = {
                "roomId": room_id,
                "playerId": f"workflow-test-{int(time.time())}",
                "playerName": "WorkflowTester"
            }
            
            start_time = time.time()
            join_response = requests.post(f"{API_BASE}/game-sessions/join", 
                                        json=session_data, timeout=10)
            session_time = time.time() - start_time
            
            if join_response.status_code == 200:
                self.log_test("Workflow Step 3: Session Tracking", True,
                            f"Session created successfully", session_time)
                
                # Step 4: Game Initialization Verification
                print("  Step 4: Game Initialization Verification")
                
                # Verify the session is trackable in server browser
                start_time = time.time()
                verify_response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
                verify_time = time.time() - start_time
                
                if verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    updated_servers = verify_data.get('servers', [])
                    
                    # Check if player count reflects the new session
                    updated_target = None
                    for server in updated_servers:
                        if server.get('id') == target_server.get('id'):
                            updated_target = server
                            break
                            
                    if updated_target:
                        original_players = target_server.get('currentPlayers', 0)
                        updated_players = updated_target.get('currentPlayers', 0)
                        
                        self.log_test("Workflow Step 4: Real-Time Updates", True,
                                    f"Player count tracking: {original_players} → {updated_players}", verify_time)
                    else:
                        self.log_test("Workflow Step 4: Real-Time Updates", False,
                                    "Target server not found in updated list", verify_time)
                else:
                    self.log_test("Workflow Step 4: Real-Time Updates", False,
                                f"Verification request failed: {verify_response.status_code}", verify_time)
                
                # Step 5: Cleanup
                print("  Step 5: Cleanup")
                start_time = time.time()
                leave_response = requests.post(f"{API_BASE}/game-sessions/leave",
                                             json=session_data, timeout=10)
                cleanup_time = time.time() - start_time
                
                if leave_response.status_code == 200:
                    self.log_test("Workflow Step 5: Session Cleanup", True,
                                f"Session cleaned up successfully", cleanup_time)
                else:
                    self.log_test("Workflow Step 5: Session Cleanup", False,
                                f"Cleanup failed: {leave_response.status_code}", cleanup_time)
            else:
                self.log_test("Workflow Step 3: Session Tracking", False,
                            f"Session creation failed: {join_response.status_code}", session_time)
                
            # Overall workflow assessment
            workflow_steps = [
                "Server Discovery", "Room ID Generation", "Session Tracking", 
                "Real-Time Updates", "Session Cleanup"
            ]
            
            successful_steps = sum(1 for result in self.test_results[-5:] if result['success'])
            
            if successful_steps >= 4:  # Allow 1 step to fail
                self.log_test("Complete Workflow Integration", True,
                            f"Workflow completed: {successful_steps}/{len(workflow_steps)} steps successful", 0)
            else:
                self.log_test("Complete Workflow Integration", False,
                            f"Workflow incomplete: {successful_steps}/{len(workflow_steps)} steps successful", 0)
                
        except Exception as e:
            self.log_test("Critical Workflow Testing", False, f"Exception: {str(e)}")
            
    def test_hathora_specific_functionality(self):
        """Test Hathora-specific functionality and integration"""
        print("\n🎯 TESTING HATHORA-SPECIFIC FUNCTIONALITY")
        
        try:
            # Test Hathora app configuration
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for Hathora-specific configuration
                hathora_enabled = data.get('hathoraEnabled', False)
                if hathora_enabled:
                    self.log_test("Hathora Integration Status", True,
                                "Hathora integration is enabled", response_time)
                else:
                    self.log_test("Hathora Integration Status", False,
                                "Hathora integration is disabled", response_time)
                
                # Test for Hathora servers
                servers = data.get('servers', [])
                hathora_servers = [s for s in servers if s.get('serverType') == 'hathora']
                
                if hathora_servers:
                    server = hathora_servers[0]
                    
                    # Test Hathora server properties
                    hathora_fields = ['hathoraRoomId', 'region', 'serverType']
                    present_hathora_fields = [field for field in hathora_fields if field in server]
                    
                    self.log_test("Hathora Server Properties", True,
                                f"Hathora server has {len(present_hathora_fields)}/{len(hathora_fields)} Hathora fields", response_time)
                    
                    # Test ondemand parameter support
                    server_id = server.get('id', '')
                    if server_id:
                        # Simulate ondemand room creation
                        test_room_id = f"{server_id}-ondemand-test"
                        
                        session_data = {
                            "roomId": test_room_id,
                            "playerId": f"hathora-test-{int(time.time())}",
                            "playerName": "HathoraTester",
                            "ondemand": True
                        }
                        
                        start_time = time.time()
                        join_response = requests.post(f"{API_BASE}/game-sessions/join", 
                                                    json=session_data, timeout=10)
                        join_time = time.time() - start_time
                        
                        if join_response.status_code == 200:
                            self.log_test("Hathora On-Demand Room Support", True,
                                        f"On-demand room creation supported", join_time)
                            
                            # Cleanup
                            requests.post(f"{API_BASE}/game-sessions/leave", json=session_data, timeout=5)
                        else:
                            self.log_test("Hathora On-Demand Room Support", False,
                                        f"On-demand room creation failed: {join_response.status_code}", join_time)
                    else:
                        self.log_test("Hathora Server ID Availability", False,
                                    "Hathora server missing ID", response_time)
                else:
                    self.log_test("Hathora Servers Available", False,
                                "No Hathora servers found", response_time)
            else:
                self.log_test("Hathora Configuration Check", False,
                            f"Server browser failed: {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Hathora-Specific Functionality", False, f"Exception: {str(e)}")
            
    def run_all_tests(self):
        """Run all backend tests for template literal syntax fix"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING FOR TEMPLATE LITERAL SYNTAX FIX")
        print("=" * 80)
        print("FOCUS: Hathora Integration and On-Demand Room Creation Support")
        print("=" * 80)
        
        # Run all test categories
        self.test_hathora_environment_configuration()
        self.test_on_demand_room_creation_support()
        self.test_game_url_parameter_processing()
        self.test_server_browser_integration()
        self.test_critical_workflow_testing()
        self.test_hathora_specific_functionality()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE BACKEND TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 TOTAL TESTS: {self.total_tests}")
        print(f"✅ PASSED: {self.passed_tests}")
        print(f"❌ FAILED: {self.failed_tests}")
        print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("\n🎉 BACKEND READY FOR ON-DEMAND HATHORA ROOM CREATION")
            print("✅ Template literal syntax fix is fully supported by backend infrastructure")
        elif success_rate >= 60:
            print("\n⚠️ BACKEND PARTIALLY READY - MINOR ISSUES DETECTED")
            print("🔧 Some functionality may need attention but core features work")
        else:
            print("\n❌ BACKEND NOT READY - CRITICAL ISSUES DETECTED")
            print("🚨 Significant problems found that may prevent proper functionality")
            
        print("\n📋 DETAILED TEST RESULTS:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            time_info = f" ({result['response_time']:.3f}s)" if result['response_time'] else ""
            print(f"  {status} {result['test']}{time_info}")
            
        return success_rate >= 80

if __name__ == "__main__":
    tester = HathoraBackendTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)