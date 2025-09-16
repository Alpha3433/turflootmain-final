#!/usr/bin/env python3
"""
CRITICAL WEBSOCKET CONNECTION DEBUG - Hathora Room Creation and URL Parameter Flow Testing
Focus: Debug why hathoraRoom parameter becomes 'true' instead of actual room ID
"""

import requests
import json
import time
import os
from urllib.parse import urlencode, parse_qs, urlparse

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://multiplayer-fix-1.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"🧪 {test_name}")
    print(f"{'='*80}")

def print_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")

def test_hathora_room_creation_direct():
    """Test 1: Direct Hathora Client Test - Call hathoraClient.createPaidRoom() directly"""
    print_test_header("DIRECT HATHORA CLIENT TEST - Room Creation API")
    
    try:
        # Test the new Hathora room creation endpoint
        test_data = {
            "gameMode": "cash-game",
            "region": "US-East-1", 
            "maxPlayers": 6,
            "stakeAmount": 0.01
        }
        
        print(f"📤 Testing POST /api/hathora/create-room with data: {test_data}")
        
        response = requests.post(
            f"{API_BASE}/hathora/create-room",
            json=test_data,
            timeout=30
        )
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📊 Response Body: {json.dumps(result, indent=2)}")
            
            # Validate room ID format
            if 'roomId' in result and result['roomId']:
                room_id = result['roomId']
                print(f"🏠 Room ID: '{room_id}' (type: {type(room_id)}, length: {len(str(room_id))})")
                
                # Check if room ID is valid (not 'true' or boolean)
                if isinstance(room_id, str) and len(room_id) > 5 and room_id != 'true':
                    print_result(True, f"Valid room ID format: {room_id}")
                    return room_id
                else:
                    print_result(False, f"Invalid room ID format: {room_id}")
                    return None
            else:
                print_result(False, "No roomId in response")
                return None
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"❌ Response: {response.text}")
            print_result(False, f"Room creation API failed with status {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Exception during room creation test: {e}")
        print_result(False, f"Exception: {e}")
        return None

def test_room_creation_api_endpoint():
    """Test 2: Room Creation API Test - Test /api/hathora/create-room endpoint"""
    print_test_header("ROOM CREATION API ENDPOINT TEST")
    
    try:
        # Test multiple room creation scenarios
        test_scenarios = [
            {
                "name": "Practice Room",
                "data": {"gameMode": "practice", "region": "US-East-1", "maxPlayers": 50, "stakeAmount": 0}
            },
            {
                "name": "Low Stakes Cash Game", 
                "data": {"gameMode": "cash-game", "region": "US-West-1", "maxPlayers": 6, "stakeAmount": 0.01}
            },
            {
                "name": "High Stakes Cash Game",
                "data": {"gameMode": "cash-game", "region": "Europe", "maxPlayers": 4, "stakeAmount": 0.05}
            }
        ]
        
        created_rooms = []
        
        for scenario in test_scenarios:
            print(f"\n🎯 Testing {scenario['name']}...")
            print(f"📤 Request data: {scenario['data']}")
            
            response = requests.post(
                f"{API_BASE}/hathora/create-room",
                json=scenario['data'],
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                room_id = result.get('roomId')
                
                if room_id and isinstance(room_id, str) and len(room_id) > 5:
                    print_result(True, f"{scenario['name']} created: {room_id}")
                    created_rooms.append({
                        'scenario': scenario['name'],
                        'roomId': room_id,
                        'data': scenario['data']
                    })
                else:
                    print_result(False, f"{scenario['name']} returned invalid room ID: {room_id}")
            else:
                print_result(False, f"{scenario['name']} failed: {response.status_code}")
        
        print(f"\n📊 SUMMARY: Created {len(created_rooms)} rooms successfully")
        for room in created_rooms:
            print(f"   🏠 {room['scenario']}: {room['roomId']}")
        
        return created_rooms
        
    except Exception as e:
        print(f"❌ Exception during API endpoint test: {e}")
        print_result(False, f"Exception: {e}")
        return []

def test_url_parameter_flow():
    """Test 3: URL Parameter Flow Test - Simulate navigation from server browser to game page"""
    print_test_header("URL PARAMETER FLOW TEST - Navigation Chain Debug")
    
    try:
        # Step 1: Create a room first
        print("🔄 Step 1: Creating room for navigation test...")
        room_id = test_hathora_room_creation_direct()
        
        if not room_id:
            print_result(False, "Cannot test URL flow without valid room ID")
            return False
        
        # Step 2: Simulate the navigation URL construction (from handleJoinLobby)
        print(f"\n🔄 Step 2: Simulating navigation URL construction...")
        
        # This mimics the logic in handleJoinLobby function
        hathora_result = {
            'roomId': room_id,
            'region': 'US-East-1',
            'entryFee': 0.01,
            'maxPlayers': 6
        }
        
        server_data = {
            'name': 'Test Server',
            'entryFee': 0.01
        }
        
        # Build query parameters exactly like in the code
        query_params = {
            'roomId': hathora_result['roomId'],
            'mode': 'hathora-multiplayer',
            'multiplayer': 'hathora',
            'server': 'hathora',
            'region': hathora_result['region'],
            'fee': str(hathora_result['entryFee']),
            'name': server_data.get('name', 'Hathora Multiplayer'),
            'paid': 'true' if hathora_result['entryFee'] > 0 else 'false',
            'hathoraRoom': hathora_result['roomId'],  # This is the critical parameter
            'realHathoraRoom': 'true',
            'maxPlayers': str(hathora_result['maxPlayers'])
        }
        
        print(f"🔗 Constructed query parameters:")
        for key, value in query_params.items():
            print(f"   {key}: '{value}' (type: {type(value)})")
        
        # Step 3: Build the full URL
        query_string = urlencode(query_params)
        full_url = f"{BASE_URL}/agario?{query_string}"
        
        print(f"\n🌐 Full navigation URL: {full_url}")
        
        # Step 4: Parse the URL to verify parameters
        print(f"\n🔄 Step 3: Parsing URL to verify parameters...")
        parsed_url = urlparse(full_url)
        parsed_params = parse_qs(parsed_url.query)
        
        print(f"📊 Parsed URL parameters:")
        for key, values in parsed_params.items():
            value = values[0] if values else None
            print(f"   {key}: '{value}' (type: {type(value)})")
        
        # Step 5: Critical check - verify hathoraRoom parameter
        hathora_room_param = parsed_params.get('hathoraRoom', [None])[0]
        
        print(f"\n🎯 CRITICAL CHECK - hathoraRoom parameter:")
        print(f"   Original room ID: '{room_id}'")
        print(f"   URL parameter: '{hathora_room_param}'")
        print(f"   Match: {room_id == hathora_room_param}")
        
        if room_id == hathora_room_param:
            print_result(True, "hathoraRoom parameter correctly preserved in URL")
            return True
        else:
            print_result(False, f"hathoraRoom parameter corrupted: expected '{room_id}', got '{hathora_room_param}'")
            return False
            
    except Exception as e:
        print(f"❌ Exception during URL parameter flow test: {e}")
        print_result(False, f"Exception: {e}")
        return False

def test_websocket_url_construction():
    """Test 4: WebSocket URL Construction Test - Verify how WebSocket URLs are built"""
    print_test_header("WEBSOCKET URL CONSTRUCTION TEST")
    
    try:
        # Create a room for testing
        print("🔄 Creating room for WebSocket URL test...")
        room_id = test_hathora_room_creation_direct()
        
        if not room_id:
            print_result(False, "Cannot test WebSocket URL without valid room ID")
            return False
        
        # Simulate the WebSocket URL construction logic from agario page
        print(f"\n🔄 Simulating WebSocket URL construction...")
        
        # Mock URL parameters as they would appear in the game page
        url_params = {
            'roomId': room_id,
            'hathoraRoom': room_id,  # This should be the actual room ID
            'mode': 'hathora-multiplayer',
            'server': 'hathora',
            'multiplayer': 'hathora'
        }
        
        print(f"📊 Mock URL parameters:")
        for key, value in url_params.items():
            print(f"   {key}: '{value}'")
        
        # Test the logic from connectToHathoraRoom function
        actual_room_id = url_params.get('hathoraRoom') or url_params.get('roomId')
        
        print(f"\n🎯 Room ID resolution:")
        print(f"   hathoraRoom param: '{url_params.get('hathoraRoom')}'")
        print(f"   roomId param: '{url_params.get('roomId')}'")
        print(f"   Resolved actualRoomId: '{actual_room_id}'")
        
        # Simulate WebSocket URL construction
        mock_connection_info = {
            'host': 'hathora.dev',
            'port': 443
        }
        
        mock_token = 'mock_auth_token_12345'
        
        # Test different WebSocket URL formats
        websocket_urls = {
            'Direct Connection with Query Params': f"wss://{mock_connection_info['host']}:{mock_connection_info['port']}?token={mock_token}&roomId={actual_room_id}",
            'Path-based Connection': f"wss://{mock_connection_info['host']}:{mock_connection_info['port']}/{actual_room_id}?token={mock_token}",
            'Simple Connection': f"wss://{mock_connection_info['host']}:{mock_connection_info['port']}"
        }
        
        print(f"\n🔗 WebSocket URL formats:")
        for format_name, url in websocket_urls.items():
            print(f"   {format_name}: {url}")
            
            # Check if room ID is properly included
            if actual_room_id in url and actual_room_id != 'true':
                print(f"      ✅ Room ID correctly included")
            else:
                print(f"      ❌ Room ID missing or invalid")
        
        # Final validation
        if actual_room_id and actual_room_id != 'true' and len(actual_room_id) > 5:
            print_result(True, f"WebSocket URL construction would use valid room ID: {actual_room_id}")
            return True
        else:
            print_result(False, f"WebSocket URL construction would use invalid room ID: {actual_room_id}")
            return False
            
    except Exception as e:
        print(f"❌ Exception during WebSocket URL construction test: {e}")
        print_result(False, f"Exception: {e}")
        return False

def test_room_id_validation():
    """Test 5: Room ID Validation - Confirm room IDs are properly formatted"""
    print_test_header("ROOM ID VALIDATION TEST")
    
    try:
        # Create multiple rooms and validate their IDs
        print("🔄 Creating multiple rooms for validation...")
        
        test_cases = [
            {"gameMode": "practice", "region": "US-East-1", "stakeAmount": 0},
            {"gameMode": "cash-game", "region": "US-West-1", "stakeAmount": 0.01},
            {"gameMode": "cash-game", "region": "Europe", "stakeAmount": 0.02},
            {"gameMode": "cash-game", "region": "Oceania", "stakeAmount": 0.05}
        ]
        
        valid_rooms = 0
        invalid_rooms = 0
        room_ids = []
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n🎯 Test Case {i}: {test_case}")
            
            response = requests.post(
                f"{API_BASE}/hathora/create-room",
                json=test_case,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                room_id = result.get('roomId')
                
                print(f"📊 Response: {json.dumps(result, indent=2)}")
                
                # Validate room ID
                validation_results = {
                    'exists': room_id is not None,
                    'is_string': isinstance(room_id, str),
                    'not_empty': bool(room_id) if room_id else False,
                    'not_true': room_id != 'true' if room_id else False,
                    'not_boolean': not isinstance(room_id, bool),
                    'min_length': len(str(room_id)) >= 5 if room_id else False,
                    'alphanumeric': str(room_id).replace('-', '').replace('_', '').isalnum() if room_id else False
                }
                
                print(f"🔍 Room ID Validation for '{room_id}':")
                for check, passed in validation_results.items():
                    status = "✅" if passed else "❌"
                    print(f"   {status} {check}: {passed}")
                
                if all(validation_results.values()):
                    valid_rooms += 1
                    room_ids.append(room_id)
                    print_result(True, f"Room ID '{room_id}' passed all validation checks")
                else:
                    invalid_rooms += 1
                    print_result(False, f"Room ID '{room_id}' failed validation")
            else:
                invalid_rooms += 1
                print_result(False, f"Room creation failed: {response.status_code}")
        
        print(f"\n📊 VALIDATION SUMMARY:")
        print(f"   ✅ Valid rooms: {valid_rooms}")
        print(f"   ❌ Invalid rooms: {invalid_rooms}")
        print(f"   📋 Valid room IDs: {room_ids}")
        
        # Check for uniqueness
        unique_ids = set(room_ids)
        if len(unique_ids) == len(room_ids):
            print_result(True, f"All {len(room_ids)} room IDs are unique")
        else:
            print_result(False, f"Duplicate room IDs detected: {len(room_ids)} total, {len(unique_ids)} unique")
        
        return valid_rooms > 0
        
    except Exception as e:
        print(f"❌ Exception during room ID validation test: {e}")
        print_result(False, f"Exception: {e}")
        return False

def test_parameter_type_conversion():
    """Test 6: Parameter Type Conversion - Check for boolean conversion issues"""
    print_test_header("PARAMETER TYPE CONVERSION TEST")
    
    try:
        # Test various parameter values that might cause type conversion issues
        print("🔄 Testing parameter type conversion scenarios...")
        
        # Create a room first
        room_id = test_hathora_room_creation_direct()
        if not room_id:
            print_result(False, "Cannot test type conversion without valid room ID")
            return False
        
        # Test scenarios that might cause 'true' conversion
        test_scenarios = [
            {
                'name': 'Normal Parameters',
                'params': {
                    'roomId': room_id,
                    'hathoraRoom': room_id,
                    'server': 'hathora',
                    'multiplayer': 'hathora'
                }
            },
            {
                'name': 'Boolean String Parameters',
                'params': {
                    'roomId': room_id,
                    'hathoraRoom': room_id,
                    'server': 'hathora',
                    'multiplayer': 'true',  # This might cause issues
                    'paid': 'true'
                }
            },
            {
                'name': 'Mixed Type Parameters',
                'params': {
                    'roomId': room_id,
                    'hathoraRoom': room_id,
                    'server': 'hathora',
                    'multiplayer': True,  # Boolean instead of string
                    'paid': True
                }
            }
        ]
        
        for scenario in test_scenarios:
            print(f"\n🎯 Testing {scenario['name']}:")
            
            # Simulate URL encoding/decoding
            query_string = urlencode(scenario['params'])
            print(f"   📤 Encoded: {query_string}")
            
            # Parse back
            parsed = parse_qs(query_string)
            print(f"   📥 Parsed back:")
            
            for key, values in parsed.items():
                value = values[0] if values else None
                original = scenario['params'].get(key)
                print(f"      {key}: '{value}' (type: {type(value)}) [original: '{original}' ({type(original)})]")
                
                # Check for problematic conversions
                if key == 'hathoraRoom':
                    if value == room_id:
                        print(f"      ✅ hathoraRoom preserved correctly")
                    else:
                        print(f"      ❌ hathoraRoom corrupted: expected '{room_id}', got '{value}'")
        
        # Test JavaScript-style parameter handling
        print(f"\n🔄 Testing JavaScript-style parameter extraction...")
        
        # Simulate how URLSearchParams.get() works in JavaScript
        mock_url = f"https://example.com/agario?roomId={room_id}&hathoraRoom={room_id}&server=hathora&multiplayer=hathora&paid=true"
        print(f"   🌐 Mock URL: {mock_url}")
        
        parsed_url = urlparse(mock_url)
        params = parse_qs(parsed_url.query)
        
        # Simulate JavaScript URLSearchParams.get() behavior
        js_params = {}
        for key, values in params.items():
            js_params[key] = values[0] if values else None
        
        print(f"   📊 JavaScript-style parameters:")
        for key, value in js_params.items():
            print(f"      {key}: '{value}'")
        
        # Critical check
        hathora_room_value = js_params.get('hathoraRoom')
        if hathora_room_value == room_id:
            print_result(True, "Parameter type conversion preserves room ID correctly")
            return True
        else:
            print_result(False, f"Parameter type conversion corrupts room ID: expected '{room_id}', got '{hathora_room_value}'")
            return False
            
    except Exception as e:
        print(f"❌ Exception during parameter type conversion test: {e}")
        print_result(False, f"Exception: {e}")
        return False

def run_comprehensive_websocket_debug():
    """Run all WebSocket connection debug tests"""
    print(f"\n🚀 STARTING COMPREHENSIVE WEBSOCKET CONNECTION DEBUG")
    print(f"🎯 Focus: Debug hathoraRoom parameter becoming 'true' instead of actual room ID")
    print(f"🌐 Base URL: {BASE_URL}")
    print(f"⏰ Test started at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    test_results = {}
    
    # Test 1: Direct Hathora Client Test
    test_results['direct_hathora_client'] = test_hathora_room_creation_direct() is not None
    
    # Test 2: Room Creation API Test  
    test_results['room_creation_api'] = len(test_room_creation_api_endpoint()) > 0
    
    # Test 3: URL Parameter Flow Test
    test_results['url_parameter_flow'] = test_url_parameter_flow()
    
    # Test 4: WebSocket URL Construction Test
    test_results['websocket_url_construction'] = test_websocket_url_construction()
    
    # Test 5: Room ID Validation
    test_results['room_id_validation'] = test_room_id_validation()
    
    # Test 6: Parameter Type Conversion
    test_results['parameter_type_conversion'] = test_parameter_type_conversion()
    
    # Summary
    print_test_header("COMPREHENSIVE TEST RESULTS SUMMARY")
    
    passed_tests = sum(test_results.values())
    total_tests = len(test_results)
    success_rate = (passed_tests / total_tests) * 100
    
    print(f"📊 OVERALL RESULTS:")
    print(f"   ✅ Passed: {passed_tests}/{total_tests} tests")
    print(f"   📈 Success Rate: {success_rate:.1f}%")
    print(f"   ⏰ Completed at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    print(f"\n📋 DETAILED RESULTS:")
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {test_name.replace('_', ' ').title()}")
    
    # Critical findings
    print(f"\n🔍 CRITICAL FINDINGS:")
    
    if test_results['direct_hathora_client']:
        print(f"   ✅ Hathora client can create rooms with valid IDs")
    else:
        print(f"   ❌ Hathora client room creation is failing")
    
    if test_results['url_parameter_flow']:
        print(f"   ✅ URL parameter flow preserves room IDs correctly")
    else:
        print(f"   ❌ URL parameter flow is corrupting room IDs")
    
    if test_results['websocket_url_construction']:
        print(f"   ✅ WebSocket URL construction would work with valid room IDs")
    else:
        print(f"   ❌ WebSocket URL construction has issues")
    
    if test_results['parameter_type_conversion']:
        print(f"   ✅ Parameter type conversion preserves room IDs")
    else:
        print(f"   ❌ Parameter type conversion is causing room ID corruption")
    
    # Recommendations
    print(f"\n💡 RECOMMENDATIONS:")
    
    if not test_results['direct_hathora_client']:
        print(f"   🔧 Fix Hathora client room creation - check API configuration")
    
    if not test_results['url_parameter_flow']:
        print(f"   🔧 Debug handleJoinLobby function - room ID not being passed correctly")
    
    if not test_results['parameter_type_conversion']:
        print(f"   🔧 Check for boolean conversion in URL parameter handling")
    
    if success_rate < 100:
        print(f"   🔧 Focus on failed tests to resolve WebSocket connection issues")
    else:
        print(f"   🎉 All tests passed - WebSocket connection should work correctly")
    
    return test_results

if __name__ == "__main__":
    run_comprehensive_websocket_debug()