#!/usr/bin/env python3
"""
JWT Token Validation Fix Testing Suite for Hathora WebSocket Connections
Testing the critical fix where Hathora game server expected tokens signed with 
'hathora-turfloot-secret' but the room creation API was returning Hathora SDK tokens 
with a different secret, causing Error 1006 WebSocket connection failures.
"""

import requests
import json
import time
import sys
import os
import jwt
from urllib.parse import urlparse, parse_qs

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://agar-clone-debug.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def test_jwt_token_validation_fix():
    """
    COMPREHENSIVE TESTING: JWT Token Validation Fix for WebSocket Connections
    
    Testing Requirements from Review Request:
    1. Room Creation with Custom Tokens - Test that room creation generates custom JWT tokens
    2. Token Format Validation - Verify tokens contain expected payload (type, id, name, iat)
    3. Token Secret Matching - Confirm tokens are signed with 'hathora-turfloot-secret'
    4. WebSocket Authentication - Test that game server can validate the custom tokens
    5. Complete Room Response - Verify room response includes host, port, roomId, and valid token
    """
    
    print("🧪 TESTING: JWT Token Validation Fix for WebSocket Connections")
    print("=" * 80)
    
    test_results = {
        'room_creation_with_custom_tokens': False,
        'token_format_validation': False,
        'token_secret_matching': False,
        'websocket_authentication': False,
        'complete_room_response': False
    }
    
    try:
        # TEST 1: Room Creation with Custom JWT Tokens
        print("\n1️⃣ TESTING: Room Creation with Custom JWT Token Generation")
        print("-" * 60)
        
        # Test room creation for Singapore region as mentioned in review request
        room_creation_data = {
            'gameMode': 'practice',
            'region': 'Singapore',
            'maxPlayers': 8,
            'stakeAmount': 0
        }
        
        print(f"📤 Creating room in Singapore region: {room_creation_data}")
        
        response = requests.post(
            f"{API_BASE}/hathora/room",
            json=room_creation_data,
            timeout=30
        )
        
        print(f"📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            room_data = response.json()
            print(f"📋 Room Response Keys: {list(room_data.keys())}")
            
            # Check for custom token fields as mentioned in the fix
            token_fields = ['playerToken', 'connectionToken', 'token']
            custom_token = None
            
            for field in token_fields:
                if field in room_data and room_data[field]:
                    custom_token = room_data[field]
                    print(f"✅ Found custom token in field '{field}': {custom_token[:50]}...")
                    break
            
            if custom_token:
                print("✅ PASS: Room creation generates custom JWT tokens")
                test_results['room_creation_with_custom_tokens'] = True
                
                # Store room data for further testing
                room_info = room_data
                jwt_token = custom_token
            else:
                print("❌ FAIL: No custom JWT token found in room response")
                print(f"Available fields: {list(room_data.keys())}")
                return test_results
        else:
            print(f"❌ FAIL: Room creation failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return test_results
            
        # TEST 2: Token Format Validation
        print("\n2️⃣ TESTING: JWT Token Format and Payload Validation")
        print("-" * 60)
        
        try:
            # Decode token without verification first to check structure
            decoded_payload = jwt.decode(jwt_token, options={"verify_signature": False})
            print(f"🔍 Token Payload: {json.dumps(decoded_payload, indent=2)}")
            
            # Check for expected payload fields from the fix
            expected_fields = ['type', 'id', 'name', 'iat']
            payload_valid = True
            
            for field in expected_fields:
                if field in decoded_payload:
                    value = decoded_payload[field]
                    print(f"   ✅ {field}: {value}")
                    
                    # Validate specific field formats
                    if field == 'type' and value != 'anonymous':
                        print(f"   ⚠️ Expected type 'anonymous', got '{value}'")
                        payload_valid = False
                    elif field == 'id' and not str(value).startswith('player_'):
                        print(f"   ⚠️ Expected id to start with 'player_', got '{value}'")
                        payload_valid = False
                    elif field == 'name' and not str(value).startswith('player-'):
                        print(f"   ⚠️ Expected name to start with 'player-', got '{value}'")
                        payload_valid = False
                    elif field == 'iat' and not isinstance(value, int):
                        print(f"   ⚠️ Expected iat to be integer timestamp, got {type(value)}")
                        payload_valid = False
                else:
                    print(f"   ❌ Missing required field: {field}")
                    payload_valid = False
            
            if payload_valid:
                print("✅ PASS: Token contains expected payload format")
                test_results['token_format_validation'] = True
            else:
                print("❌ FAIL: Token payload format invalid")
                
        except jwt.DecodeError as e:
            print(f"❌ FAIL: Token decode error: {str(e)}")
        except Exception as e:
            print(f"❌ FAIL: Token validation error: {str(e)}")
            
        # TEST 3: Token Secret Matching
        print("\n3️⃣ TESTING: JWT Token Secret Verification")
        print("-" * 60)
        
        try:
            # Try to decode with the expected secret from the fix
            expected_secret = 'hathora-turfloot-secret'
            
            print(f"🔐 Attempting to verify token with secret: '{expected_secret}'")
            
            # Decode and verify with the expected secret
            verified_payload = jwt.decode(jwt_token, expected_secret, algorithms=['HS256'])
            
            print("✅ PASS: Token successfully verified with 'hathora-turfloot-secret'")
            print(f"🎭 Verified Player ID: {verified_payload.get('id')}")
            print(f"🎭 Verified Player Name: {verified_payload.get('name')}")
            test_results['token_secret_matching'] = True
            
        except jwt.InvalidSignatureError:
            print("❌ FAIL: Token signature verification failed with 'hathora-turfloot-secret'")
            print("🚨 This indicates the token is NOT signed with the expected secret")
        except jwt.DecodeError as e:
            print(f"❌ FAIL: Token decode error with expected secret: {str(e)}")
        except Exception as e:
            print(f"❌ FAIL: Token secret verification error: {str(e)}")
            
        # TEST 4: WebSocket Authentication Readiness
        print("\n4️⃣ TESTING: WebSocket Authentication Token Compatibility")
        print("-" * 60)
        
        # Test WebSocket URL construction with the custom token
        if 'room_info' in locals():
            websocket_url = f"wss://{room_info['host']}:{room_info['port']}?token={jwt_token}&roomId={room_info['roomId']}"
            
            print(f"🔗 WebSocket URL with custom token:")
            print(f"   {websocket_url[:100]}...")
            
            # Parse URL to validate structure
            parsed_url = urlparse(websocket_url)
            query_params = parse_qs(parsed_url.query)
            
            # Check if token parameter is properly included
            if 'token' in query_params and query_params['token'][0] == jwt_token:
                print("✅ PASS: Custom JWT token properly included in WebSocket URL")
                
                # Verify the token in URL can be decoded with game server secret
                url_token = query_params['token'][0]
                try:
                    jwt.decode(url_token, 'hathora-turfloot-secret', algorithms=['HS256'])
                    print("✅ PASS: WebSocket URL token verifiable by game server")
                    test_results['websocket_authentication'] = True
                except:
                    print("❌ FAIL: WebSocket URL token not verifiable by game server")
            else:
                print("❌ FAIL: Custom token not properly included in WebSocket URL")
        else:
            print("❌ FAIL: No room info available for WebSocket URL construction")
            
        # TEST 5: Complete Room Response Validation
        print("\n5️⃣ TESTING: Complete Room Response with Valid Tokens")
        print("-" * 60)
        
        if 'room_info' in locals():
            # Check all required fields are present
            required_fields = ['host', 'port', 'roomId', 'playerToken']
            response_complete = True
            
            print("🔍 Validating complete room response:")
            for field in required_fields:
                if field in room_info and room_info[field]:
                    if field == 'playerToken':
                        # Verify this is our custom token
                        if room_info[field] == jwt_token:
                            print(f"   ✅ {field}: Custom JWT token present")
                        else:
                            print(f"   ⚠️ {field}: Different token than expected")
                            response_complete = False
                    else:
                        print(f"   ✅ {field}: {room_info[field]}")
                else:
                    print(f"   ❌ {field}: Missing or empty")
                    response_complete = False
            
            # Additional token aliases check
            token_aliases = ['connectionToken', 'token']
            for alias in token_aliases:
                if alias in room_info and room_info[alias] == jwt_token:
                    print(f"   ✅ {alias}: Custom JWT token alias present")
            
            if response_complete:
                print("✅ PASS: Complete room response includes host, port, roomId, and valid custom token")
                test_results['complete_room_response'] = True
            else:
                print("❌ FAIL: Room response incomplete or invalid")
        else:
            print("❌ FAIL: No room info available for response validation")
            
        # CRITICAL TEST SCENARIO: Test room creation for Singapore region specifically
        print("\n🌏 CRITICAL TEST: Singapore Region Room Creation")
        print("-" * 60)
        
        singapore_room_data = {
            'gameMode': 'cash-game',
            'region': 'Singapore',
            'maxPlayers': 6,
            'stakeAmount': 0.05
        }
        
        print(f"📤 Creating Singapore region room: {singapore_room_data}")
        
        singapore_response = requests.post(
            f"{API_BASE}/hathora/room",
            json=singapore_room_data,
            timeout=30
        )
        
        if singapore_response.status_code == 200:
            singapore_room = singapore_response.json()
            singapore_token = singapore_room.get('playerToken') or singapore_room.get('token')
            
            if singapore_token:
                try:
                    # Verify Singapore room token with game server secret
                    singapore_payload = jwt.decode(singapore_token, 'hathora-turfloot-secret', algorithms=['HS256'])
                    print("✅ CRITICAL SUCCESS: Singapore room token verified with game server secret")
                    print(f"   - Room ID: {singapore_room.get('roomId')}")
                    print(f"   - Host: {singapore_room.get('host')}")
                    print(f"   - Port: {singapore_room.get('port')}")
                    print(f"   - Player ID: {singapore_payload.get('id')}")
                    print(f"   - Player Name: {singapore_payload.get('name')}")
                except:
                    print("❌ CRITICAL FAIL: Singapore room token verification failed")
            else:
                print("❌ CRITICAL FAIL: No token in Singapore room response")
        else:
            print(f"❌ CRITICAL FAIL: Singapore room creation failed: {singapore_response.status_code}")
            
        # SUMMARY
        print("\n" + "=" * 80)
        print("📊 JWT TOKEN VALIDATION FIX - TEST SUMMARY")
        print("=" * 80)
        
        passed_tests = sum(test_results.values())
        total_tests = len(test_results)
        success_rate = (passed_tests / total_tests) * 100
        
        print(f"✅ Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            test_display = test_name.replace('_', ' ').title()
            print(f"   {status}: {test_display}")
            
        if success_rate == 100:
            print("\n🎉 ALL TESTS PASSED: JWT token validation fix is working correctly!")
            print("🔧 Custom tokens are properly signed with 'hathora-turfloot-secret'")
            print("🌐 WebSocket connections should succeed with game server validation")
            print("🚫 Error 1006 WebSocket connection failures should be resolved")
        elif success_rate >= 80:
            print(f"\n✅ MOSTLY SUCCESSFUL: {success_rate:.1f}% of tests passed")
            print("🔧 Core JWT token functionality working, minor issues detected")
        else:
            print(f"\n❌ SIGNIFICANT ISSUES: Only {success_rate:.1f}% of tests passed")
            print("🚨 JWT token validation fix needs immediate attention")
            print("⚠️ Error 1006 WebSocket connection failures may persist")
            
        return test_results
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR during JWT token testing: {str(e)}")
        import traceback
        traceback.print_exc()
        return test_results

def test_api_health_check():
    """Basic API health check to ensure backend is operational"""
    print("🏥 TESTING: API Health Check")
    print("-" * 40)
    
    try:
        # Test basic API connectivity
        response = requests.get(f"{API_BASE}/servers", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            server_count = len(data.get('servers', []))
            print(f"✅ API Health Check PASSED")
            print(f"   - Status: {response.status_code}")
            print(f"   - Servers available: {server_count}")
            print(f"   - Hathora enabled: {data.get('hathoraEnabled', False)}")
            return True
        else:
            print(f"❌ API Health Check FAILED: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ API Health Check ERROR: {str(e)}")
        return False

def test_jsonwebtoken_library_availability():
    """Test that jsonwebtoken library is properly installed and available"""
    print("📚 TESTING: JsonWebToken Library Availability")
    print("-" * 50)
    
    try:
        # Test if we can import jwt (PyJWT for Python testing)
        import jwt as python_jwt
        print("✅ Python JWT library available for testing")
        
        # Test basic JWT operations
        test_payload = {'test': 'data', 'iat': int(time.time())}
        test_secret = 'test-secret'
        
        # Encode
        test_token = python_jwt.encode(test_payload, test_secret, algorithm='HS256')
        print(f"✅ JWT encoding successful: {test_token[:30]}...")
        
        # Decode
        decoded = python_jwt.decode(test_token, test_secret, algorithms=['HS256'])
        print(f"✅ JWT decoding successful: {decoded}")
        
        return True
        
    except ImportError:
        print("❌ JWT library not available - installing...")
        try:
            import subprocess
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'PyJWT'])
            import jwt
            print("✅ JWT library installed successfully")
            return True
        except:
            print("❌ Failed to install JWT library")
            return False
    except Exception as e:
        print(f"❌ JWT library test error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 STARTING: JWT Token Validation Fix Testing for Hathora WebSocket Connections")
    print(f"🌐 Testing against: {BASE_URL}")
    print("=" * 80)
    
    start_time = time.time()
    
    # Check JWT library availability first
    if not test_jsonwebtoken_library_availability():
        print("❌ CRITICAL: JWT library not available - cannot proceed with token testing")
        sys.exit(1)
    
    # Run health check
    if not test_api_health_check():
        print("❌ CRITICAL: API health check failed - cannot proceed with testing")
        sys.exit(1)
    
    # Run main JWT token validation fix tests
    results = test_jwt_token_validation_fix()
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\n⏱️ Total test duration: {duration:.2f} seconds")
    
    # Exit with appropriate code
    passed_tests = sum(results.values())
    total_tests = len(results)
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED - JWT token validation fix is operational!")
        print("🔧 Error 1006 WebSocket connection failures should be resolved")
        sys.exit(0)
    else:
        print(f"⚠️ {total_tests - passed_tests} tests failed - review required")
        print("🚨 Error 1006 WebSocket connection failures may persist")
        sys.exit(1)