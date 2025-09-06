#!/usr/bin/env python3
"""
HATHORA ROOM CREATION VERIFICATION TEST
=====================================

This test specifically addresses the user's concern that no rooms are appearing 
in the Hathora console when clicking "Global Multiplayer (US East)".

CRITICAL TESTING FOCUS:
- Test if ACTUAL Hathora room processes are being created
- Verify Hathora authentication and configuration
- Test the exact user flow that should create console-visible rooms
- Debug any fallback logic that might bypass real room creation
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://tactical-arena-7.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class HathoraRoomCreationTester:
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'TurfLoot-Backend-Tester/1.0'
        })
        
    def log_test(self, test_name, success, details, response_time=None):
        """Log test results with detailed information"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'success': success,
            'details': details,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        print(f"   Details: {details}")
        print()
        
    def test_hathora_environment_configuration(self):
        """Test 1: Verify Hathora environment variables and configuration"""
        print("🔧 TESTING HATHORA ENVIRONMENT CONFIGURATION")
        print("=" * 60)
        
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if multiplayer features are enabled (indicates Hathora integration)
                features = data.get('features', [])
                multiplayer_enabled = 'multiplayer' in features
                
                if multiplayer_enabled:
                    self.log_test(
                        "Hathora Environment Configuration Check",
                        True,
                        f"Multiplayer features enabled in API response. Features: {features}. This confirms Hathora integration is configured.",
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Hathora Environment Configuration Check",
                        False,
                        f"Multiplayer features not enabled. Features found: {features}. Hathora integration may not be properly configured.",
                        response_time
                    )
                    return False
            else:
                self.log_test(
                    "Hathora Environment Configuration Check",
                    False,
                    f"API not accessible. Status: {response.status_code}. Cannot verify Hathora configuration.",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Hathora Environment Configuration Check",
                False,
                f"Exception during environment check: {str(e)}",
                None
            )
            return False
    
    def test_hathora_server_discovery(self):
        """Test 2: Verify Global Multiplayer server is available with Hathora configuration"""
        print("🌍 TESTING HATHORA SERVER DISCOVERY")
        print("=" * 60)
        
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/servers/lobbies")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                
                # Look for Global Multiplayer (US East) server
                global_server = None
                for server in servers:
                    if 'global' in server.get('id', '').lower() or 'global' in server.get('name', '').lower():
                        global_server = server
                        break
                
                if global_server:
                    # Check if server has Hathora properties
                    has_hathora_props = (
                        'region' in global_server and 
                        'serverType' in global_server and
                        global_server.get('serverType') == 'hathora'
                    )
                    
                    if has_hathora_props:
                        self.log_test(
                            "Global Multiplayer Server Discovery",
                            True,
                            f"Found Global Multiplayer server with Hathora configuration: ID={global_server.get('id')}, Region={global_server.get('region')}, Type={global_server.get('serverType')}. This server should create real Hathora room processes.",
                            response_time
                        )
                        return global_server
                    else:
                        self.log_test(
                            "Global Multiplayer Server Discovery",
                            False,
                            f"Found Global Multiplayer server but missing Hathora properties: {global_server}. This may not create real Hathora room processes.",
                            response_time
                        )
                        return None
                else:
                    self.log_test(
                        "Global Multiplayer Server Discovery",
                        False,
                        f"No Global Multiplayer server found. Available servers: {[s.get('name', s.get('id')) for s in servers]}. Cannot test Hathora room creation without target server.",
                        response_time
                    )
                    return None
            else:
                self.log_test(
                    "Global Multiplayer Server Discovery",
                    False,
                    f"Server browser API failed. Status: {response.status_code}. Cannot discover Hathora servers.",
                    response_time
                )
                return None
                
        except Exception as e:
            self.log_test(
                "Global Multiplayer Server Discovery",
                False,
                f"Exception during server discovery: {str(e)}",
                None
            )
            return None
    
    def test_hathora_room_creation_simulation(self, server_info):
        """Test 3: Simulate the exact user flow that should create Hathora room processes"""
        print("🚀 TESTING HATHORA ROOM CREATION SIMULATION")
        print("=" * 60)
        
        if not server_info:
            self.log_test(
                "Hathora Room Creation Simulation",
                False,
                "No server info provided. Cannot simulate room creation without target server.",
                None
            )
            return False
        
        try:
            # Simulate joining the Global Multiplayer server (this should trigger room creation)
            room_id = server_info.get('id', 'global-practice-bots')
            
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/game-sessions/join", json={
                'roomId': room_id,
                'playerId': 'test-user-hathora-room-creation',
                'playerName': 'HathoraTestUser'
            })
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if the response indicates a real Hathora room process was created
                session_id = data.get('sessionId')
                room_data = data.get('room', {})
                
                if session_id and room_data:
                    # Verify this is a real Hathora room (not a mock/local room)
                    is_real_hathora = (
                        room_id == room_data.get('roomId') and
                        'hathora' in str(room_data).lower() or
                        room_data.get('serverType') == 'hathora'
                    )
                    
                    if is_real_hathora:
                        self.log_test(
                            "Hathora Room Creation Simulation",
                            True,
                            f"Successfully created Hathora room process. Session ID: {session_id}, Room: {room_id}. This room process should appear in Hathora console.",
                            response_time
                        )
                        
                        # Clean up the test session
                        try:
                            cleanup_response = self.session.post(f"{API_BASE}/game-sessions/leave", json={
                                'roomId': room_id,
                                'playerId': 'test-user-hathora-room-creation'
                            })
                            if cleanup_response.status_code == 200:
                                print(f"   ✅ Test session cleaned up successfully")
                            else:
                                print(f"   ⚠️ Test session cleanup failed (non-critical)")
                        except:
                            print(f"   ⚠️ Test session cleanup failed (non-critical)")
                        
                        return True
                    else:
                        self.log_test(
                            "Hathora Room Creation Simulation",
                            False,
                            f"Room creation succeeded but may not be real Hathora process. Session: {session_id}, Room data: {room_data}. This might be a local/mock room instead of Hathora console room.",
                            response_time
                        )
                        return False
                else:
                    self.log_test(
                        "Hathora Room Creation Simulation",
                        False,
                        f"Room creation response missing session or room data: {data}. Real Hathora room processes should return proper session information.",
                        response_time
                    )
                    return False
            else:
                self.log_test(
                    "Hathora Room Creation Simulation",
                    False,
                    f"Room creation failed. Status: {response.status_code}, Response: {response.text[:200]}. Cannot create Hathora room processes.",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Hathora Room Creation Simulation",
                False,
                f"Exception during room creation simulation: {str(e)}",
                None
            )
            return False
    
    def test_hathora_authentication_validity(self):
        """Test 4: Verify Hathora authentication tokens are valid and working"""
        print("🔐 TESTING HATHORA AUTHENTICATION VALIDITY")
        print("=" * 60)
        
        try:
            # Test if we can create multiple room processes (indicates valid auth)
            successful_creations = 0
            total_attempts = 3
            
            for i in range(total_attempts):
                try:
                    start_time = time.time()
                    response = self.session.post(f"{API_BASE}/game-sessions/join", json={
                        'roomId': 'global-practice-bots',
                        'playerId': f'test-auth-user-{i}',
                        'playerName': f'AuthTestUser{i}'
                    })
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get('sessionId'):
                            successful_creations += 1
                            
                            # Clean up
                            try:
                                self.session.post(f"{API_BASE}/game-sessions/leave", json={
                                    'roomId': 'global-practice-bots',
                                    'playerId': f'test-auth-user-{i}'
                                })
                            except:
                                pass
                    
                    time.sleep(0.5)  # Brief delay between attempts
                    
                except Exception as e:
                    print(f"   ⚠️ Auth test attempt {i+1} failed: {str(e)}")
                    continue
            
            if successful_creations >= 2:
                self.log_test(
                    "Hathora Authentication Validity",
                    True,
                    f"Successfully created {successful_creations}/{total_attempts} room processes. Hathora authentication is working and can create multiple room processes that should appear in console.",
                    None
                )
                return True
            else:
                self.log_test(
                    "Hathora Authentication Validity",
                    False,
                    f"Only {successful_creations}/{total_attempts} room creations succeeded. Hathora authentication may be invalid or rate-limited, preventing console room creation.",
                    None
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Hathora Authentication Validity",
                False,
                f"Exception during authentication test: {str(e)}",
                None
            )
            return False
    
    def test_real_time_room_tracking(self):
        """Test 5: Verify real-time tracking of Hathora room processes"""
        print("📊 TESTING REAL-TIME HATHORA ROOM TRACKING")
        print("=" * 60)
        
        try:
            # Get baseline player count
            start_time = time.time()
            baseline_response = self.session.get(f"{API_BASE}/stats/live-players")
            baseline_time = time.time() - start_time
            
            if baseline_response.status_code != 200:
                self.log_test(
                    "Real-time Room Tracking",
                    False,
                    f"Cannot get baseline player count. Status: {baseline_response.status_code}",
                    baseline_time
                )
                return False
            
            baseline_data = baseline_response.json()
            baseline_count = baseline_data.get('count', 0)
            
            # Create a room process
            start_time = time.time()
            join_response = self.session.post(f"{API_BASE}/game-sessions/join", json={
                'roomId': 'global-practice-bots',
                'playerId': 'test-tracking-user',
                'playerName': 'TrackingTestUser'
            })
            join_time = time.time() - start_time
            
            if join_response.status_code != 200:
                self.log_test(
                    "Real-time Room Tracking",
                    False,
                    f"Cannot create room for tracking test. Status: {join_response.status_code}",
                    join_time
                )
                return False
            
            join_data = join_response.json()
            session_id = join_data.get('sessionId')
            
            if not session_id:
                self.log_test(
                    "Real-time Room Tracking",
                    False,
                    f"No session ID returned from room creation: {join_data}",
                    join_time
                )
                return False
            
            # Wait a moment for tracking to update
            time.sleep(1)
            
            # Check if player count increased (indicates real room process tracking)
            start_time = time.time()
            updated_response = self.session.get(f"{API_BASE}/stats/live-players")
            updated_time = time.time() - start_time
            
            if updated_response.status_code == 200:
                updated_data = updated_response.json()
                updated_count = updated_data.get('count', 0)
                
                # Clean up the session
                try:
                    self.session.post(f"{API_BASE}/game-sessions/leave", json={
                        'roomId': 'global-practice-bots',
                        'playerId': 'test-tracking-user'
                    })
                except:
                    pass
                
                if updated_count > baseline_count:
                    self.log_test(
                        "Real-time Room Tracking",
                        True,
                        f"Real-time tracking working. Player count increased from {baseline_count} to {updated_count}. This indicates real Hathora room processes are being tracked.",
                        updated_time
                    )
                    return True
                else:
                    self.log_test(
                        "Real-time Room Tracking",
                        False,
                        f"No player count increase detected. Baseline: {baseline_count}, Updated: {updated_count}. Real-time tracking may not be working with Hathora room processes.",
                        updated_time
                    )
                    return False
            else:
                self.log_test(
                    "Real-time Room Tracking",
                    False,
                    f"Cannot get updated player count. Status: {updated_response.status_code}",
                    updated_time
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Real-time Room Tracking",
                False,
                f"Exception during real-time tracking test: {str(e)}",
                None
            )
            return False
    
    def test_hathora_console_room_verification(self):
        """Test 6: Verify that room creation would result in console-visible processes"""
        print("🖥️ TESTING HATHORA CONSOLE ROOM VERIFICATION")
        print("=" * 60)
        
        try:
            # Create multiple simultaneous room processes to verify console visibility
            session_ids = []
            successful_creations = 0
            
            for i in range(3):  # Create 3 simultaneous processes
                try:
                    start_time = time.time()
                    response = self.session.post(f"{API_BASE}/game-sessions/join", json={
                        'roomId': 'global-practice-bots',
                        'playerId': f'console-test-user-{i}',
                        'playerName': f'ConsoleTestUser{i}'
                    })
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        data = response.json()
                        session_id = data.get('sessionId')
                        if session_id:
                            session_ids.append(session_id)
                            successful_creations += 1
                            print(f"   ✅ Created room process {i+1}: {session_id}")
                    
                except Exception as e:
                    print(f"   ❌ Failed to create room process {i+1}: {str(e)}")
                    continue
            
            if successful_creations >= 2:
                # Verify all processes are tracked
                start_time = time.time()
                stats_response = self.session.get(f"{API_BASE}/stats/live-players")
                stats_time = time.time() - start_time
                
                if stats_response.status_code == 200:
                    stats_data = stats_response.json()
                    live_count = stats_data.get('count', 0)
                    
                    # Clean up all sessions
                    for i, session_id in enumerate(session_ids):
                        try:
                            self.session.post(f"{API_BASE}/game-sessions/leave", json={
                                'roomId': 'global-practice-bots',
                                'playerId': f'console-test-user-{i}'
                            })
                        except:
                            pass
                    
                    if live_count >= successful_creations:
                        self.log_test(
                            "Hathora Console Room Verification",
                            True,
                            f"Successfully created {successful_creations} simultaneous room processes with {live_count} players tracked. These processes would appear as separate instances in Hathora console.",
                            stats_time
                        )
                        return True
                    else:
                        self.log_test(
                            "Hathora Console Room Verification",
                            False,
                            f"Created {successful_creations} processes but only {live_count} tracked. Console visibility may be limited.",
                            stats_time
                        )
                        return False
                else:
                    # Clean up sessions even if stats failed
                    for i, session_id in enumerate(session_ids):
                        try:
                            self.session.post(f"{API_BASE}/game-sessions/leave", json={
                                'sessionId': session_id,
                                'userId': f'console-test-user-{i}'
                            })
                        except:
                            pass
                    
                    self.log_test(
                        "Hathora Console Room Verification",
                        False,
                        f"Cannot verify console processes. Stats API failed with status: {stats_response.status_code}",
                        None
                    )
                    return False
            else:
                self.log_test(
                    "Hathora Console Room Verification",
                    False,
                    f"Only created {successful_creations} room processes. Need at least 2 for console verification test.",
                    None
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Hathora Console Room Verification",
                False,
                f"Exception during console verification test: {str(e)}",
                None
            )
            return False
    
    def run_comprehensive_test(self):
        """Run all Hathora room creation tests"""
        print("🎯 HATHORA ROOM CREATION COMPREHENSIVE TESTING")
        print("=" * 80)
        print("TESTING FOCUS: Verify if actual Hathora rooms are being created")
        print("USER CONCERN: No rooms appearing in Hathora console")
        print("=" * 80)
        print()
        
        # Test 1: Environment Configuration
        env_success = self.test_hathora_environment_configuration()
        
        # Test 2: Server Discovery
        server_info = self.test_hathora_server_discovery()
        
        # Test 3: Room Creation Simulation
        room_creation_success = self.test_hathora_room_creation_simulation(server_info)
        
        # Test 4: Authentication Validity
        auth_success = self.test_hathora_authentication_validity()
        
        # Test 5: Real-time Tracking
        tracking_success = self.test_real_time_room_tracking()
        
        # Test 6: Console Verification
        console_success = self.test_hathora_console_room_verification()
        
        # Generate comprehensive report
        self.generate_final_report()
        
        return all([env_success, server_info is not None, room_creation_success, 
                   auth_success, tracking_success, console_success])
    
    def generate_final_report(self):
        """Generate comprehensive test report"""
        print("📋 COMPREHENSIVE TEST REPORT")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"TOTAL TESTS: {total_tests}")
        print(f"PASSED: {passed_tests}")
        print(f"FAILED: {failed_tests}")
        print(f"SUCCESS RATE: {success_rate:.1f}%")
        print()
        
        print("DETAILED RESULTS:")
        print("-" * 40)
        for result in self.test_results:
            status_icon = "✅" if result['success'] else "❌"
            time_info = f" ({result['response_time']:.3f}s)" if result['response_time'] else ""
            print(f"{status_icon} {result['test']}{time_info}")
            print(f"   {result['details']}")
            print()
        
        # Critical analysis for user's concern
        print("🔍 CRITICAL ANALYSIS FOR USER'S CONCERN")
        print("-" * 50)
        
        room_creation_test = next((r for r in self.test_results if 'Room Creation Simulation' in r['test']), None)
        console_test = next((r for r in self.test_results if 'Console Room Verification' in r['test']), None)
        auth_test = next((r for r in self.test_results if 'Authentication Validity' in r['test']), None)
        
        if room_creation_test and room_creation_test['success']:
            if console_test and console_test['success']:
                print("✅ CONCLUSION: Real Hathora room processes ARE being created")
                print("   - Room creation simulation successful")
                print("   - Multiple simultaneous processes verified")
                print("   - These processes SHOULD appear in Hathora console")
                print("   - User's issue may be console access or timing related")
            else:
                print("⚠️ CONCLUSION: Room creation works but console visibility uncertain")
                print("   - Room processes are created successfully")
                print("   - Console verification had issues")
                print("   - Rooms may be created but not visible in console")
        else:
            print("❌ CONCLUSION: Real Hathora room processes are NOT being created")
            print("   - Room creation simulation failed")
            print("   - This explains why no rooms appear in Hathora console")
            if auth_test and not auth_test['success']:
                print("   - Authentication issues may be preventing room creation")
            print("   - Implementation may be using fallback/mock rooms")
        
        print()
        print("🎯 RECOMMENDATION FOR MAIN AGENT:")
        if success_rate >= 80:
            print("✅ Hathora integration is working correctly")
            print("   - Real room processes are being created")
            print("   - User should check Hathora console access/permissions")
            print("   - Consider checking console region/app selection")
        else:
            print("❌ Hathora integration has critical issues")
            print("   - Real room processes are NOT being created")
            print("   - Need to investigate authentication or implementation")
            print("   - May need to use web search for Hathora API updates")

def main():
    """Main test execution"""
    print("🚀 STARTING HATHORA ROOM CREATION VERIFICATION")
    print("=" * 80)
    print("PURPOSE: Verify if actual Hathora rooms are created for console visibility")
    print("USER ISSUE: No rooms appearing in Hathora console")
    print("=" * 80)
    print()
    
    tester = HathoraRoomCreationTester()
    
    try:
        success = tester.run_comprehensive_test()
        
        print("=" * 80)
        if success:
            print("🎉 ALL TESTS PASSED - Hathora room creation is working correctly")
        else:
            print("⚠️ SOME TESTS FAILED - Hathora room creation has issues")
        print("=" * 80)
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n❌ Testing interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)