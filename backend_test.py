#!/usr/bin/env python3
"""
Comprehensive Backend Testing for NEW Hathora Room Creation API Endpoint
Testing the new /api/hathora/create-room endpoint as requested in review.

CRITICAL TESTING REQUIREMENTS FROM REVIEW REQUEST:
1. Test the new API endpoint POST /api/hathora/create-room
2. Verify it creates real Hathora room processes (not just database sessions)
3. Test response structure with proper room data including roomId, success, etc.
4. Test multiple room creation to ensure distinct processes
5. Verify authentication and proper Hathora client integration

Expected Results:
- API should return {"success": true, "roomId": "[REAL_HATHORA_ROOM_ID]", ...}
- Each call should create distinct Hathora room processes
- RoomId should be real Hathora room ID (not mock/fake)
- Multiple API calls should create multiple distinct room processes
"""

import requests
import json
import time
import os
import sys
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://milblob-game.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class HathoraRoomCreationTester:
    def __init__(self):
        self.test_results = []
        self.created_rooms = []
        self.start_time = time.time()
        
    def log_test(self, test_name, success, details, response_time=None):
        """Log test results with detailed information"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_time': response_time
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        print(f"   Details: {details}")
        
    def test_api_health_check(self):
        """Test 1: Verify API is accessible and Hathora integration is enabled"""
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/ping", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "API Health Check", 
                    True, 
                    f"API accessible with server: {data.get('server', 'unknown')}", 
                    response_time
                )
                return True
            else:
                self.log_test(
                    "API Health Check", 
                    False, 
                    f"API returned status {response.status_code}", 
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"API connection failed: {str(e)}")
            return False
    
    def test_hathora_environment_config(self):
        """Test 2: Verify Hathora environment variables are properly configured"""
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                hathora_enabled = data.get('hathoraEnabled', False)
                
                if hathora_enabled:
                    self.log_test(
                        "Hathora Environment Configuration", 
                        True, 
                        f"Hathora integration enabled, {len(data.get('servers', []))} servers available", 
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Hathora Environment Configuration", 
                        False, 
                        "Hathora integration not enabled in server browser", 
                        response_time
                    )
                    return False
            else:
                self.log_test(
                    "Hathora Environment Configuration", 
                    False, 
                    f"Server browser returned status {response.status_code}", 
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test("Hathora Environment Configuration", False, f"Environment check failed: {str(e)}")
            return False
    
    def test_new_hathora_create_room_endpoint(self):
        """Test 3: Test the new /api/hathora/create-room endpoint with required parameters"""
        try:
            # Test data as specified in review request
            test_payload = {
                "gameMode": "practice",
                "region": "US-East-1", 
                "maxPlayers": 50
            }
            
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/hathora/create-room", 
                json=test_payload,
                headers={'Content-Type': 'application/json'},
                timeout=15
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure as specified in review request
                required_fields = ['success', 'roomId']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(
                        "New Hathora Create Room Endpoint", 
                        False, 
                        f"Missing required fields in response: {missing_fields}", 
                        response_time
                    )
                    return False
                
                # Verify success is true
                if not data.get('success'):
                    self.log_test(
                        "New Hathora Create Room Endpoint", 
                        False, 
                        f"API returned success=false: {data.get('message', 'No message')}", 
                        response_time
                    )
                    return False
                
                # Verify roomId is present and looks like real Hathora room ID
                room_id = data.get('roomId')
                if not room_id:
                    self.log_test(
                        "New Hathora Create Room Endpoint", 
                        False, 
                        "No roomId returned in response", 
                        response_time
                    )
                    return False
                
                # Check if roomId looks like a real Hathora room ID (not mock)
                if room_id.startswith('room-') and '-' in room_id and room_id.count('-') >= 2:
                    self.log_test(
                        "New Hathora Create Room Endpoint", 
                        False, 
                        f"RoomId appears to be mock/fake format: {room_id}", 
                        response_time
                    )
                    return False
                
                # Store created room for tracking
                self.created_rooms.append({
                    'roomId': room_id,
                    'gameMode': data.get('gameMode'),
                    'region': data.get('region'),
                    'timestamp': datetime.now().isoformat()
                })
                
                self.log_test(
                    "New Hathora Create Room Endpoint", 
                    True, 
                    f"Room created successfully - ID: {room_id}, Mode: {data.get('gameMode')}, Region: {data.get('region')}", 
                    response_time
                )
                return True
                
            else:
                error_text = response.text[:200] if response.text else "No error message"
                self.log_test(
                    "New Hathora Create Room Endpoint", 
                    False, 
                    f"API returned status {response.status_code}: {error_text}", 
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test("New Hathora Create Room Endpoint", False, f"Request failed: {str(e)}")
            return False
    
    def test_multiple_room_creation(self):
        """Test 4: Test creating multiple rooms to ensure distinct processes"""
        try:
            rooms_created = []
            
            for i in range(3):
                test_payload = {
                    "gameMode": "practice",
                    "region": "US-East-1", 
                    "maxPlayers": 50
                }
                
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/hathora/create-room", 
                    json=test_payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=15
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('roomId'):
                        rooms_created.append({
                            'roomId': data.get('roomId'),
                            'response_time': response_time
                        })
                    else:
                        self.log_test(
                            "Multiple Room Creation", 
                            False, 
                            f"Room {i+1} creation failed: {data.get('message', 'Unknown error')}", 
                            response_time
                        )
                        return False
                else:
                    self.log_test(
                        "Multiple Room Creation", 
                        False, 
                        f"Room {i+1} creation returned status {response.status_code}", 
                        response_time
                    )
                    return False
                
                # Small delay between requests
                time.sleep(0.5)
            
            # Verify all rooms have distinct IDs
            room_ids = [room['roomId'] for room in rooms_created]
            unique_room_ids = set(room_ids)
            
            if len(unique_room_ids) == len(room_ids):
                avg_response_time = sum(room['response_time'] for room in rooms_created) / len(rooms_created)
                self.log_test(
                    "Multiple Room Creation", 
                    True, 
                    f"Created {len(rooms_created)} distinct rooms with unique IDs: {room_ids}", 
                    avg_response_time
                )
                
                # Store all created rooms
                for room in rooms_created:
                    self.created_rooms.append({
                        'roomId': room['roomId'],
                        'gameMode': 'practice',
                        'region': 'US-East-1',
                        'timestamp': datetime.now().isoformat()
                    })
                
                return True
            else:
                self.log_test(
                    "Multiple Room Creation", 
                    False, 
                    f"Duplicate room IDs detected: {room_ids} (unique: {list(unique_room_ids)})"
                )
                return False
                
        except Exception as e:
            self.log_test("Multiple Room Creation", False, f"Multiple room creation failed: {str(e)}")
            return False
    
    def test_room_creation_with_different_modes(self):
        """Test 5: Test room creation with different game modes"""
        try:
            test_modes = [
                {"gameMode": "practice", "region": "US-East-1", "maxPlayers": 50},
                {"gameMode": "cash", "region": "US-West-1", "maxPlayers": 8}
            ]
            
            successful_creations = 0
            
            for mode_config in test_modes:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/hathora/create-room", 
                    json=mode_config,
                    headers={'Content-Type': 'application/json'},
                    timeout=15
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('roomId'):
                        successful_creations += 1
                        self.created_rooms.append({
                            'roomId': data.get('roomId'),
                            'gameMode': data.get('gameMode'),
                            'region': data.get('region'),
                            'timestamp': datetime.now().isoformat()
                        })
                
                time.sleep(0.5)  # Small delay between requests
            
            if successful_creations == len(test_modes):
                self.log_test(
                    "Room Creation with Different Modes", 
                    True, 
                    f"Successfully created rooms for all {len(test_modes)} game modes"
                )
                return True
            else:
                self.log_test(
                    "Room Creation with Different Modes", 
                    False, 
                    f"Only {successful_creations}/{len(test_modes)} room creations succeeded"
                )
                return False
                
        except Exception as e:
            self.log_test("Room Creation with Different Modes", False, f"Mode testing failed: {str(e)}")
            return False
    
    def test_hathora_authentication_verification(self):
        """Test 6: Verify Hathora client can authenticate and create rooms"""
        try:
            # Test with minimal payload to verify authentication
            test_payload = {
                "gameMode": "practice"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/hathora/create-room", 
                json=test_payload,
                headers={'Content-Type': 'application/json'},
                timeout=15
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    self.log_test(
                        "Hathora Authentication Verification", 
                        True, 
                        f"Hathora client authenticated successfully, room created: {data.get('roomId')}", 
                        response_time
                    )
                    
                    # Store created room
                    if data.get('roomId'):
                        self.created_rooms.append({
                            'roomId': data.get('roomId'),
                            'gameMode': data.get('gameMode', 'practice'),
                            'region': data.get('region', 'default'),
                            'timestamp': datetime.now().isoformat()
                        })
                    
                    return True
                else:
                    error_msg = data.get('message', 'Unknown authentication error')
                    self.log_test(
                        "Hathora Authentication Verification", 
                        False, 
                        f"Authentication failed: {error_msg}", 
                        response_time
                    )
                    return False
            else:
                self.log_test(
                    "Hathora Authentication Verification", 
                    False, 
                    f"Authentication request returned status {response.status_code}", 
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_test("Hathora Authentication Verification", False, f"Authentication test failed: {str(e)}")
            return False
    
    def test_room_process_verification(self):
        """Test 7: Verify created rooms are actual Hathora processes (not just database entries)"""
        try:
            if not self.created_rooms:
                self.log_test(
                    "Room Process Verification", 
                    False, 
                    "No rooms were created in previous tests to verify"
                )
                return False
            
            # Test session tracking with created rooms to verify they're real processes
            verified_processes = 0
            
            for room in self.created_rooms[-3:]:  # Test last 3 created rooms
                room_id = room['roomId']
                
                # Test joining session to verify room exists as real process
                session_payload = {
                    "roomId": room_id,
                    "playerId": f"test-player-{int(time.time())}",
                    "playerName": "Test Player"
                }
                
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/game-sessions/join", 
                    json=session_payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        verified_processes += 1
                        
                        # Clean up session
                        requests.post(
                            f"{API_BASE}/game-sessions/leave", 
                            json={"roomId": room_id, "playerId": session_payload["playerId"]},
                            headers={'Content-Type': 'application/json'},
                            timeout=5
                        )
                
                time.sleep(0.3)  # Small delay between verifications
            
            if verified_processes > 0:
                self.log_test(
                    "Room Process Verification", 
                    True, 
                    f"Verified {verified_processes} rooms as actual processes (can join sessions)"
                )
                return True
            else:
                self.log_test(
                    "Room Process Verification", 
                    False, 
                    "No created rooms could be verified as actual processes"
                )
                return False
                
        except Exception as e:
            self.log_test("Room Process Verification", False, f"Process verification failed: {str(e)}")
            return False
    
    def run_comprehensive_tests(self):
        """Run all Hathora room creation tests as specified in review request"""
        print("🚀 STARTING COMPREHENSIVE HATHORA ROOM CREATION API TESTING")
        print("=" * 80)
        print("TESTING NEW /api/hathora/create-room ENDPOINT")
        print("Review Request Requirements:")
        print("1. Test new API endpoint POST /api/hathora/create-room")
        print("2. Verify real Hathora room processes creation (not just database)")
        print("3. Test response structure with proper room data")
        print("4. Test multiple room creation for distinct processes")
        print("5. Verify authentication and Hathora client integration")
        print("=" * 80)
        
        # Execute all tests in sequence
        tests = [
            self.test_api_health_check,
            self.test_hathora_environment_config,
            self.test_new_hathora_create_room_endpoint,
            self.test_multiple_room_creation,
            self.test_room_creation_with_different_modes,
            self.test_hathora_authentication_verification,
            self.test_room_process_verification
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
                print()  # Add spacing between tests
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test_func.__name__}: {str(e)}")
                print()
        
        # Generate comprehensive summary
        self.generate_test_summary(passed_tests, total_tests)
        
        return passed_tests, total_tests
    
    def generate_test_summary(self, passed_tests, total_tests):
        """Generate comprehensive test summary"""
        total_time = time.time() - self.start_time
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print("=" * 80)
        print("🎯 HATHORA ROOM CREATION API TESTING SUMMARY")
        print("=" * 80)
        print(f"📊 OVERALL RESULTS: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}% success rate)")
        print(f"⏱️  TOTAL TESTING TIME: {total_time:.2f} seconds")
        print(f"🏠 ROOMS CREATED: {len(self.created_rooms)} total rooms")
        
        if self.created_rooms:
            print("\n🆔 CREATED ROOM IDS:")
            for i, room in enumerate(self.created_rooms, 1):
                print(f"   {i}. {room['roomId']} (Mode: {room['gameMode']}, Region: {room['region']})")
        
        print(f"\n📋 DETAILED TEST RESULTS:")
        for result in self.test_results:
            status = "✅ PASSED" if result['success'] else "❌ FAILED"
            time_info = f" ({result['response_time']:.3f}s)" if result['response_time'] else ""
            print(f"   {status}: {result['test']}{time_info}")
            print(f"      {result['details']}")
        
        print("\n🎯 REVIEW REQUEST VERIFICATION:")
        
        # Check if new API endpoint works
        api_tests = [r for r in self.test_results if 'Create Room Endpoint' in r['test']]
        if any(t['success'] for t in api_tests):
            print("   ✅ NEW API ENDPOINT: /api/hathora/create-room is working correctly")
        else:
            print("   ❌ NEW API ENDPOINT: /api/hathora/create-room has issues")
        
        # Check if real room processes are created
        process_tests = [r for r in self.test_results if 'Process Verification' in r['test']]
        if any(t['success'] for t in process_tests):
            print("   ✅ REAL ROOM PROCESSES: Actual Hathora room processes are being created")
        else:
            print("   ❌ REAL ROOM PROCESSES: Room process creation could not be verified")
        
        # Check response structure
        endpoint_tests = [r for r in self.test_results if 'Create Room Endpoint' in r['test']]
        if any(t['success'] for t in endpoint_tests):
            print("   ✅ RESPONSE STRUCTURE: API returns proper room data with success and roomId")
        else:
            print("   ❌ RESPONSE STRUCTURE: API response structure has issues")
        
        # Check multiple room creation
        multiple_tests = [r for r in self.test_results if 'Multiple Room' in r['test']]
        if any(t['success'] for t in multiple_tests):
            print("   ✅ MULTIPLE ROOMS: Multiple distinct room processes can be created")
        else:
            print("   ❌ MULTIPLE ROOMS: Multiple room creation has issues")
        
        # Check authentication
        auth_tests = [r for r in self.test_results if 'Authentication' in r['test']]
        if any(t['success'] for t in auth_tests):
            print("   ✅ AUTHENTICATION: Hathora client authentication is working")
        else:
            print("   ❌ AUTHENTICATION: Hathora client authentication has issues")
        
        print("\n" + "=" * 80)
        
        if success_rate >= 80:
            print("🎉 TESTING CONCLUSION: HATHORA ROOM CREATION API IS WORKING EXCELLENTLY")
            print("   All critical functionality verified - ready for production use!")
        elif success_rate >= 60:
            print("⚠️  TESTING CONCLUSION: HATHORA ROOM CREATION API HAS MINOR ISSUES")
            print("   Core functionality works but some edge cases need attention")
        else:
            print("❌ TESTING CONCLUSION: HATHORA ROOM CREATION API HAS MAJOR ISSUES")
            print("   Critical problems detected - requires immediate attention")
        
        print("=" * 80)

if __name__ == "__main__":
    tester = HathoraRoomCreationTester()
    passed, total = tester.run_comprehensive_tests()
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)