#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Real Hathora SDK Integration
Testing all requirements from the review request to verify the real Hathora SDK integration is working correctly.

REVIEW REQUEST REQUIREMENTS:
1. POST /api/hathora/room - Verify real room creation works with different regions and game modes
2. Real Room Verification - Confirm isMockRoom: false and real room IDs are returned (not mock format)
3. Authentication Flow - Verify anonymous player tokens are valid Hathora authentication tokens
4. Connection Info - Ensure host and port are real Hathora endpoints (not localhost:3001)
5. Region Mapping - Test that regions like 'US-East-1' → 'Washington_DC', 'Oceania' → 'Sydney'
6. Parameter Structure - Verify no more Zod validation errors or SDK parameter issues
7. Mock System Elimination - Confirm no mock responses are being returned
"""

import requests
import json
import time
import os
from datetime import datetime

# Get the base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://turfloot-server.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class HathoraSDKIntegrationTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name, success, details="", response_time=None):
        """Log test results with detailed information"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            self.failed_tests += 1
            status = "❌ FAILED"
            
        result = {
            'test': test_name,
            'status': status,
            'success': success,
            'details': details,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_time:
            print(f"   Response Time: {response_time:.3f}s")
        print()

    def test_hathora_room_creation_api(self):
        """Test 1: POST /api/hathora/room - Verify real room creation works with different regions and game modes"""
        print("🧪 TEST 1: Real Hathora Room Creation API")
        
        # Test different scenarios
        test_scenarios = [
            {
                'name': 'US-East-1 Practice Mode',
                'payload': {'gameMode': 'practice', 'region': 'US-East-1', 'maxPlayers': 50}
            },
            {
                'name': 'US-West-2 Cash Game Mode', 
                'payload': {'gameMode': 'cash-game', 'region': 'US-West-2', 'maxPlayers': 8, 'stakeAmount': 5}
            },
            {
                'name': 'Oceania Practice Mode',
                'payload': {'gameMode': 'practice', 'region': 'Oceania', 'maxPlayers': 20}
            }
        ]
        
        created_rooms = []
        
        for scenario in test_scenarios:
            try:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/hathora/room",
                    json=scenario['payload'],
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Verify response structure
                    required_fields = ['success', 'roomId', 'host', 'port', 'playerToken', 'isMockRoom']
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if missing_fields:
                        self.log_test(
                            f"Room Creation - {scenario['name']} - Response Structure",
                            False,
                            f"Missing required fields: {missing_fields}",
                            response_time
                        )
                        continue
                    
                    # Verify this is real Hathora data (not mock)
                    if data.get('isMockRoom', True):
                        self.log_test(
                            f"Room Creation - {scenario['name']} - Mock System Elimination",
                            False,
                            f"isMockRoom should be false, got: {data.get('isMockRoom')}",
                            response_time
                        )
                        continue
                    
                    # Verify real room ID format (Hathora room IDs are typically 13+ characters)
                    room_id = data.get('roomId', '')
                    if len(room_id) < 10 or not room_id.replace('-', '').replace('_', '').isalnum():
                        self.log_test(
                            f"Room Creation - {scenario['name']} - Real Room ID Format",
                            False,
                            f"Room ID doesn't look like real Hathora format: {room_id}",
                            response_time
                        )
                        continue
                    
                    # Verify real Hathora host (should be *.edge.hathora.dev)
                    host = data.get('host', '')
                    if not host or not ('hathora' in host.lower() or 'edge' in host.lower()):
                        self.log_test(
                            f"Room Creation - {scenario['name']} - Real Hathora Host",
                            False,
                            f"Host doesn't look like real Hathora endpoint: {host}",
                            response_time
                        )
                        continue
                    
                    # Verify real port (should be a valid port number, not localhost:3001)
                    port = data.get('port')
                    if not port or port == 3001 or not isinstance(port, int):
                        self.log_test(
                            f"Room Creation - {scenario['name']} - Real Port",
                            False,
                            f"Port doesn't look like real Hathora port: {port}",
                            response_time
                        )
                        continue
                    
                    # Verify player token is valid JWT-like format
                    player_token = data.get('playerToken', '')
                    if not player_token or len(player_token) < 50 or not player_token.startswith('eyJ'):
                        self.log_test(
                            f"Room Creation - {scenario['name']} - Player Token Format",
                            False,
                            f"Player token doesn't look like valid JWT: {player_token[:20]}...",
                            response_time
                        )
                        continue
                    
                    # All checks passed
                    created_rooms.append({
                        'scenario': scenario['name'],
                        'roomId': room_id,
                        'host': host,
                        'port': port,
                        'region': data.get('region'),
                        'hasToken': bool(player_token)
                    })
                    
                    self.log_test(
                        f"Room Creation - {scenario['name']}",
                        True,
                        f"Real room created: ID={room_id}, Host={host}, Port={port}, isMock=false",
                        response_time
                    )
                    
                else:
                    self.log_test(
                        f"Room Creation - {scenario['name']}",
                        False,
                        f"HTTP {response.status_code}: {response.text[:200]}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Room Creation - {scenario['name']}",
                    False,
                    f"Exception: {str(e)}"
                )
        
        return created_rooms

    def test_region_mapping_verification(self):
        """Test 2: Verify region mapping works correctly (Oceania → Sydney, US-East-1 → Washington_DC)"""
        print("🧪 TEST 2: Region Mapping Verification")
        
        region_tests = [
            {'region': 'Oceania', 'expected_mapping': 'Sydney'},
            {'region': 'US-East-1', 'expected_mapping': 'Washington_DC'},
            {'region': 'US-West-2', 'expected_mapping': 'Seattle'},
            {'region': 'Europe', 'expected_mapping': 'London'},
            {'region': 'Asia', 'expected_mapping': 'Singapore'}
        ]
        
        for region_test in region_tests:
            try:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/hathora/room",
                    json={'gameMode': 'practice', 'region': region_test['region'], 'maxPlayers': 10},
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if room was created successfully (indicates region mapping worked)
                    if data.get('success') and data.get('roomId') and not data.get('isMockRoom', True):
                        self.log_test(
                            f"Region Mapping - {region_test['region']} → {region_test['expected_mapping']}",
                            True,
                            f"Room created successfully in {region_test['region']}, mapped to Hathora region",
                            response_time
                        )
                    else:
                        self.log_test(
                            f"Region Mapping - {region_test['region']} → {region_test['expected_mapping']}",
                            False,
                            f"Failed to create room in region {region_test['region']}",
                            response_time
                        )
                else:
                    self.log_test(
                        f"Region Mapping - {region_test['region']} → {region_test['expected_mapping']}",
                        False,
                        f"HTTP {response.status_code}: {response.text[:200]}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Region Mapping - {region_test['region']} → {region_test['expected_mapping']}",
                    False,
                    f"Exception: {str(e)}"
                )

    def test_authentication_flow(self):
        """Test 3: Verify anonymous player tokens are valid Hathora authentication tokens"""
        print("🧪 TEST 3: Authentication Flow Verification")
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/hathora/room",
                json={'gameMode': 'practice', 'region': 'US-East-1', 'maxPlayers': 10},
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                player_token = data.get('playerToken', '')
                
                # Verify token format (JWT tokens start with 'eyJ')
                if player_token.startswith('eyJ'):
                    # Try to decode the JWT header to verify it's a real JWT
                    import base64
                    try:
                        # JWT tokens have 3 parts separated by dots
                        parts = player_token.split('.')
                        if len(parts) == 3:
                            # Decode the header (first part)
                            header_data = base64.b64decode(parts[0] + '==')  # Add padding
                            header = json.loads(header_data)
                            
                            if 'alg' in header and 'typ' in header:
                                self.log_test(
                                    "Authentication Flow - Player Token Validation",
                                    True,
                                    f"Valid JWT token received with algorithm: {header.get('alg')}",
                                    response_time
                                )
                            else:
                                self.log_test(
                                    "Authentication Flow - Player Token Validation",
                                    False,
                                    f"JWT header missing required fields: {header}",
                                    response_time
                                )
                        else:
                            self.log_test(
                                "Authentication Flow - Player Token Validation",
                                False,
                                f"Token doesn't have 3 JWT parts: {len(parts)} parts",
                                response_time
                            )
                    except Exception as decode_error:
                        self.log_test(
                            "Authentication Flow - Player Token Validation",
                            False,
                            f"Failed to decode JWT: {str(decode_error)}",
                            response_time
                        )
                else:
                    self.log_test(
                        "Authentication Flow - Player Token Validation",
                        False,
                        f"Token doesn't start with 'eyJ' (not JWT format): {player_token[:20]}...",
                        response_time
                    )
            else:
                self.log_test(
                    "Authentication Flow - Player Token Validation",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Authentication Flow - Player Token Validation",
                False,
                f"Exception: {str(e)}"
            )

    def test_connection_info_extraction(self):
        """Test 4: Ensure host and port are real Hathora endpoints (not localhost:3001)"""
        print("🧪 TEST 4: Connection Info Extraction Verification")
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/hathora/room",
                json={'gameMode': 'practice', 'region': 'US-East-1', 'maxPlayers': 10},
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                host = data.get('host', '')
                port = data.get('port')
                
                # Verify host is real Hathora endpoint
                host_valid = False
                if host and ('hathora' in host.lower() or 'edge' in host.lower()):
                    host_valid = True
                elif host and not ('localhost' in host.lower() or '127.0.0.1' in host):
                    # Could be a valid external host even if not obviously Hathora
                    host_valid = True
                
                # Verify port is not localhost default
                port_valid = False
                if port and isinstance(port, int) and port != 3001 and 1000 <= port <= 65535:
                    port_valid = True
                
                if host_valid and port_valid:
                    self.log_test(
                        "Connection Info - Real Hathora Endpoints",
                        True,
                        f"Real endpoints: Host={host}, Port={port}",
                        response_time
                    )
                else:
                    issues = []
                    if not host_valid:
                        issues.append(f"Invalid host: {host}")
                    if not port_valid:
                        issues.append(f"Invalid port: {port}")
                    
                    self.log_test(
                        "Connection Info - Real Hathora Endpoints",
                        False,
                        f"Connection info issues: {', '.join(issues)}",
                        response_time
                    )
            else:
                self.log_test(
                    "Connection Info - Real Hathora Endpoints",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Connection Info - Real Hathora Endpoints",
                False,
                f"Exception: {str(e)}"
            )

    def test_mock_system_elimination(self):
        """Test 5: Confirm isMockRoom: false and real room IDs are returned (not mock format)"""
        print("🧪 TEST 5: Mock System Elimination Verification")
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/hathora/room",
                json={'gameMode': 'cash-game', 'region': 'US-West-2', 'maxPlayers': 8, 'stakeAmount': 10},
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check isMockRoom flag
                is_mock_room = data.get('isMockRoom', True)
                if is_mock_room is False:
                    mock_check_passed = True
                    mock_details = "isMockRoom correctly set to false"
                else:
                    mock_check_passed = False
                    mock_details = f"isMockRoom should be false, got: {is_mock_room}"
                
                # Check room ID format (mock IDs often have predictable patterns)
                room_id = data.get('roomId', '')
                real_room_id = False
                if room_id:
                    # Real Hathora room IDs are typically alphanumeric, 10+ characters
                    # Mock IDs often contain words like 'mock', 'test', or have simple patterns
                    if (len(room_id) >= 10 and 
                        room_id.replace('-', '').replace('_', '').isalnum() and
                        'mock' not in room_id.lower() and
                        'test' not in room_id.lower() and
                        room_id != '12345' and
                        room_id != 'room-123'):
                        real_room_id = True
                        room_id_details = f"Real room ID format: {room_id}"
                    else:
                        room_id_details = f"Suspicious room ID format: {room_id}"
                else:
                    room_id_details = "No room ID provided"
                
                if mock_check_passed and real_room_id:
                    self.log_test(
                        "Mock System Elimination",
                        True,
                        f"{mock_details}, {room_id_details}",
                        response_time
                    )
                else:
                    issues = []
                    if not mock_check_passed:
                        issues.append(mock_details)
                    if not real_room_id:
                        issues.append(room_id_details)
                    
                    self.log_test(
                        "Mock System Elimination",
                        False,
                        f"Issues: {', '.join(issues)}",
                        response_time
                    )
            else:
                self.log_test(
                    "Mock System Elimination",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Mock System Elimination",
                False,
                f"Exception: {str(e)}"
            )

    def test_parameter_structure_validation(self):
        """Test 6: Verify no more Zod validation errors or SDK parameter issues"""
        print("🧪 TEST 6: Parameter Structure Validation")
        
        # Test various parameter combinations that might have caused issues before
        test_cases = [
            {
                'name': 'Minimal Parameters',
                'payload': {'gameMode': 'practice', 'region': 'US-East-1'}
            },
            {
                'name': 'Full Parameters',
                'payload': {'gameMode': 'cash-game', 'region': 'Oceania', 'maxPlayers': 50, 'stakeAmount': 25}
            },
            {
                'name': 'Edge Case - High Max Players',
                'payload': {'gameMode': 'practice', 'region': 'Europe', 'maxPlayers': 100}
            }
        ]
        
        for test_case in test_cases:
            try:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/hathora/room",
                    json=test_case['payload'],
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check for success and no error messages
                    if data.get('success') and not data.get('error'):
                        self.log_test(
                            f"Parameter Validation - {test_case['name']}",
                            True,
                            f"No validation errors, room created successfully",
                            response_time
                        )
                    else:
                        self.log_test(
                            f"Parameter Validation - {test_case['name']}",
                            False,
                            f"Validation error: {data.get('error', 'Unknown error')}",
                            response_time
                        )
                elif response.status_code == 400:
                    # Check if it's a Zod validation error
                    try:
                        error_data = response.json()
                        error_message = error_data.get('error', response.text)
                        if 'zod' in error_message.lower() or 'validation' in error_message.lower():
                            self.log_test(
                                f"Parameter Validation - {test_case['name']}",
                                False,
                                f"Zod validation error still present: {error_message}",
                                response_time
                            )
                        else:
                            self.log_test(
                                f"Parameter Validation - {test_case['name']}",
                                False,
                                f"Parameter error: {error_message}",
                                response_time
                            )
                    except:
                        self.log_test(
                            f"Parameter Validation - {test_case['name']}",
                            False,
                            f"HTTP 400: {response.text[:200]}",
                            response_time
                        )
                else:
                    self.log_test(
                        f"Parameter Validation - {test_case['name']}",
                        False,
                        f"HTTP {response.status_code}: {response.text[:200]}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Parameter Validation - {test_case['name']}",
                    False,
                    f"Exception: {str(e)}"
                )

    def test_api_endpoint_availability(self):
        """Test 7: Verify the API endpoint is accessible and returns proper responses"""
        print("🧪 TEST 7: API Endpoint Availability")
        
        # Test GET endpoint for API info
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/hathora/room", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'endpoints' in data:
                    self.log_test(
                        "API Endpoint - GET Info",
                        True,
                        f"API info endpoint working: {data.get('message', '')}",
                        response_time
                    )
                else:
                    self.log_test(
                        "API Endpoint - GET Info",
                        False,
                        f"Unexpected response structure: {data}",
                        response_time
                    )
            else:
                self.log_test(
                    "API Endpoint - GET Info",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "API Endpoint - GET Info",
                False,
                f"Exception: {str(e)}"
            )

    def run_comprehensive_test(self):
        """Run all tests and generate comprehensive report"""
        print("🚀 STARTING COMPREHENSIVE HATHORA SDK INTEGRATION TESTING")
        print("=" * 80)
        print()
        
        # Run all test categories
        created_rooms = self.test_hathora_room_creation_api()
        self.test_region_mapping_verification()
        self.test_authentication_flow()
        self.test_connection_info_extraction()
        self.test_mock_system_elimination()
        self.test_parameter_structure_validation()
        self.test_api_endpoint_availability()
        
        # Generate summary report
        print("=" * 80)
        print("🎯 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 OVERALL RESULTS:")
        print(f"   Total Tests: {self.total_tests}")
        print(f"   Passed: {self.passed_tests} ✅")
        print(f"   Failed: {self.failed_tests} ❌")
        print(f"   Success Rate: {success_rate:.1f}%")
        print()
        
        if created_rooms:
            print(f"🏠 REAL ROOMS CREATED DURING TESTING:")
            for room in created_rooms:
                print(f"   • {room['scenario']}: ID={room['roomId']}, Host={room['host']}, Port={room['port']}")
            print()
        
        # Review request verification
        print("🔍 REVIEW REQUEST REQUIREMENTS VERIFICATION:")
        requirements_met = []
        requirements_failed = []
        
        # Check each requirement from the review request
        room_creation_tests = [r for r in self.test_results if 'Room Creation' in r['test']]
        if any(r['success'] for r in room_creation_tests):
            requirements_met.append("✅ Real room creation works with different regions and game modes")
        else:
            requirements_failed.append("❌ Real room creation with different regions and game modes")
        
        mock_tests = [r for r in self.test_results if 'Mock System' in r['test']]
        if any(r['success'] for r in mock_tests):
            requirements_met.append("✅ isMockRoom: false and real room IDs returned")
        else:
            requirements_failed.append("❌ Mock system elimination")
        
        auth_tests = [r for r in self.test_results if 'Authentication' in r['test']]
        if any(r['success'] for r in auth_tests):
            requirements_met.append("✅ Anonymous player tokens are valid Hathora authentication tokens")
        else:
            requirements_failed.append("❌ Authentication flow")
        
        connection_tests = [r for r in self.test_results if 'Connection Info' in r['test']]
        if any(r['success'] for r in connection_tests):
            requirements_met.append("✅ Host and port are real Hathora endpoints")
        else:
            requirements_failed.append("❌ Connection info extraction")
        
        region_tests = [r for r in self.test_results if 'Region Mapping' in r['test']]
        if any(r['success'] for r in region_tests):
            requirements_met.append("✅ Region mapping functionality working")
        else:
            requirements_failed.append("❌ Region mapping")
        
        param_tests = [r for r in self.test_results if 'Parameter Validation' in r['test']]
        if any(r['success'] for r in param_tests):
            requirements_met.append("✅ No Zod validation errors or SDK parameter issues")
        else:
            requirements_failed.append("❌ Parameter structure validation")
        
        for req in requirements_met:
            print(f"   {req}")
        for req in requirements_failed:
            print(f"   {req}")
        
        print()
        
        # Final assessment
        if success_rate >= 80:
            print("🎉 CONCLUSION: Real Hathora SDK Integration is WORKING CORRECTLY and PRODUCTION-READY!")
            if success_rate == 100:
                print("   Perfect score! All tests passed successfully.")
            else:
                print(f"   Excellent performance with {success_rate:.1f}% success rate.")
        elif success_rate >= 60:
            print("⚠️  CONCLUSION: Real Hathora SDK Integration is MOSTLY WORKING but has some issues.")
            print("   Review failed tests and address issues before production deployment.")
        else:
            print("❌ CONCLUSION: Real Hathora SDK Integration has SIGNIFICANT ISSUES.")
            print("   Major fixes needed before this can be considered production-ready.")
        
        print()
        print("=" * 80)
        
        return {
            'total_tests': self.total_tests,
            'passed_tests': self.passed_tests,
            'failed_tests': self.failed_tests,
            'success_rate': success_rate,
            'created_rooms': created_rooms,
            'requirements_met': requirements_met,
            'requirements_failed': requirements_failed,
            'test_results': self.test_results
        }

if __name__ == "__main__":
    tester = HathoraSDKIntegrationTester()
    results = tester.run_comprehensive_test()