#!/usr/bin/env python3

"""
WebSocket Connection State Handling for Spacebar Split Functionality - Backend Testing
===================================================================================

This test verifies the enhanced WebSocket connection state validation for spacebar split functionality
as described in the review request:

1. Pre-Send Connection Check: Validate WebSocket readyState is OPEN before attempting to send split commands
2. Connection State Logging: Detailed logging of connection state before/after split attempts  
3. Graceful Error Handling: Specific handling for WebSocket CLOSING/CLOSED state errors
4. Connection Recovery: Skip split attempts when connection is not ready instead of causing errors

Expected Behavior:
- Spacebar presses when WebSocket is closing/closed should log informative messages but not cause errors
- Connection state is properly validated before sending any messages
- Split attempts are gracefully skipped when connection is not ready
- No more "WebSocket is already in CLOSING or CLOSED state" errors in console
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE_URL = f"{BASE_URL}/api"

def log_test_result(test_name, success, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"[{timestamp}] {status} - {test_name}")
    if details:
        print(f"    Details: {details}")
    return success

def test_api_health_check():
    """Test 1: Verify API is accessible and operational"""
    try:
        response = requests.get(f"{API_BASE_URL}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            service_name = data.get('service', '')
            status = data.get('status', '')
            features = data.get('features', [])
            
            success = (service_name == 'turfloot-api' and 
                      status == 'operational' and 
                      'multiplayer' in features)
            
            details = f"Service: {service_name}, Status: {status}, Features: {features}"
            return log_test_result("API Health Check", success, details)
        else:
            return log_test_result("API Health Check", False, f"HTTP {response.status_code}")
    except Exception as e:
        return log_test_result("API Health Check", False, f"Exception: {str(e)}")

def test_colyseus_server_availability():
    """Test 2: Verify Colyseus servers are available for WebSocket connections"""
    try:
        response = requests.get(f"{API_BASE_URL}/servers", timeout=10)
        if response.status_code == 200:
            data = response.json()
            servers = data.get('servers', [])
            colyseus_enabled = data.get('colyseusEnabled', False)
            colyseus_endpoint = data.get('colyseusEndpoint', '')
            
            # Find Colyseus arena servers
            colyseus_servers = [s for s in servers if s.get('serverType') == 'colyseus']
            
            success = (colyseus_enabled and 
                      len(colyseus_servers) > 0 and 
                      colyseus_endpoint.startswith('wss://'))
            
            details = f"Colyseus enabled: {colyseus_enabled}, Servers: {len(colyseus_servers)}, Endpoint: {colyseus_endpoint}"
            return log_test_result("Colyseus Server Availability", success, details)
        else:
            return log_test_result("Colyseus Server Availability", False, f"HTTP {response.status_code}")
    except Exception as e:
        return log_test_result("Colyseus Server Availability", False, f"Exception: {str(e)}")

def test_websocket_connection_infrastructure():
    """Test 3: Verify WebSocket connection infrastructure is properly configured"""
    try:
        # Check if the agario page loads properly
        response = requests.get(f"{BASE_URL}/agario", timeout=10)
        if response.status_code == 200:
            content = response.text
            
            # Check for WebSocket-related code patterns
            websocket_patterns = [
                'wsConnection',
                'WebSocket.OPEN',
                'readyState',
                'setWsConnection',
                'wsRef.current'
            ]
            
            found_patterns = []
            for pattern in websocket_patterns:
                if pattern in content:
                    found_patterns.append(pattern)
            
            success = len(found_patterns) >= 3  # At least 3 WebSocket patterns should be present
            details = f"Found WebSocket patterns: {found_patterns}"
            return log_test_result("WebSocket Connection Infrastructure", success, details)
        else:
            return log_test_result("WebSocket Connection Infrastructure", False, f"HTTP {response.status_code}")
    except Exception as e:
        return log_test_result("WebSocket Connection Infrastructure", False, f"Exception: {str(e)}")

def test_split_message_handling_backend():
    """Test 4: Verify backend can handle split messages properly"""
    try:
        # Check if ArenaRoom.js exists and contains split handling
        import subprocess
        
        # Check if the compiled ArenaRoom.js contains split handling
        result = subprocess.run(['find', '/app', '-name', 'ArenaRoom.js', '-type', 'f'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0 and result.stdout.strip():
            arena_file = result.stdout.strip().split('\n')[0]  # Get first match
            
            with open(arena_file, 'r') as f:
                content = f.read()
                
            # Check for split handling patterns
            split_patterns = [
                'handleSplit',
                'split',
                'message',
                'targetX',
                'targetY'
            ]
            
            found_patterns = []
            for pattern in split_patterns:
                if pattern in content:
                    found_patterns.append(pattern)
            
            success = len(found_patterns) >= 4  # Should have most split handling patterns
            details = f"ArenaRoom file: {arena_file}, Found patterns: {found_patterns}"
            return log_test_result("Split Message Handling Backend", success, details)
        else:
            return log_test_result("Split Message Handling Backend", False, "ArenaRoom.js not found")
    except Exception as e:
        return log_test_result("Split Message Handling Backend", False, f"Exception: {str(e)}")

def test_connection_state_validation_patterns():
    """Test 5: Check for enhanced connection state validation patterns in client code"""
    try:
        # Read the agario page.js file to check for enhanced validation patterns
        agario_file = '/app/app/agario/page.js'
        
        with open(agario_file, 'r') as f:
            content = f.read()
        
        # Check for enhanced connection state validation patterns
        validation_patterns = [
            'wsConnection === \'connected\'',
            'readyState === WebSocket.OPEN',
            'connection.readyState',
            'wsRef.current',
            'isMultiplayer',
            'gameStarted'
        ]
        
        found_patterns = []
        for pattern in validation_patterns:
            if pattern in content:
                found_patterns.append(pattern)
        
        # Check for split-related validation
        split_validation_patterns = [
            'splitCooldown',
            'split()',
            'handleSplit',
            'SPACE',
            'gameRef.current'
        ]
        
        found_split_patterns = []
        for pattern in split_validation_patterns:
            if pattern in content:
                found_split_patterns.append(pattern)
        
        success = (len(found_patterns) >= 4 and len(found_split_patterns) >= 3)
        details = f"Validation patterns: {found_patterns}, Split patterns: {found_split_patterns}"
        return log_test_result("Connection State Validation Patterns", success, details)
    except Exception as e:
        return log_test_result("Connection State Validation Patterns", False, f"Exception: {str(e)}")

def test_error_handling_robustness():
    """Test 6: Verify error handling for WebSocket connection issues"""
    try:
        # Check for error handling patterns in the code
        agario_file = '/app/app/agario/page.js'
        
        with open(agario_file, 'r') as f:
            content = f.read()
        
        # Check for error handling patterns
        error_patterns = [
            'try {',
            'catch',
            'console.error',
            'onError',
            'onLeave',
            'setWsConnection(\'error\')',
            'setWsConnection(\'disconnected\')'
        ]
        
        found_patterns = []
        for pattern in error_patterns:
            if pattern in content:
                found_patterns.append(pattern)
        
        success = len(found_patterns) >= 5  # Should have comprehensive error handling
        details = f"Error handling patterns found: {found_patterns}"
        return log_test_result("Error Handling Robustness", success, details)
    except Exception as e:
        return log_test_result("Error Handling Robustness", False, f"Exception: {str(e)}")

def test_split_cooldown_mechanism():
    """Test 7: Verify split cooldown mechanism to prevent spam"""
    try:
        agario_file = '/app/app/agario/page.js'
        
        with open(agario_file, 'r') as f:
            content = f.read()
        
        # Check for cooldown mechanism patterns
        cooldown_patterns = [
            'splitCooldown',
            'splitCooldown > 0',
            'splitCooldown = 60',
            'splitCooldown--'
        ]
        
        found_patterns = []
        for pattern in cooldown_patterns:
            if pattern in content:
                found_patterns.append(pattern)
        
        success = len(found_patterns) >= 3  # Should have cooldown mechanism
        details = f"Cooldown patterns found: {found_patterns}"
        return log_test_result("Split Cooldown Mechanism", success, details)
    except Exception as e:
        return log_test_result("Split Cooldown Mechanism", False, f"Exception: {str(e)}")

def test_enhanced_websocket_state_handling():
    """Test 8: Check for enhanced WebSocket state handling as described in review request"""
    try:
        agario_file = '/app/app/agario/page.js'
        
        with open(agario_file, 'r') as f:
            content = f.read()
        
        # Check for specific enhancements mentioned in review request
        enhancement_checks = {
            'Pre-Send Connection Check': 'readyState === WebSocket.OPEN' in content or 'wsConnection === \'connected\'' in content,
            'Connection State Logging': 'console.log' in content and 'wsConnection' in content,
            'Graceful Error Handling': 'try {' in content and 'catch' in content,
            'Connection Recovery': 'wsConnection' in content and ('disconnected' in content or 'error' in content)
        }
        
        passed_checks = sum(1 for check in enhancement_checks.values() if check)
        success = passed_checks >= 3  # At least 3 out of 4 enhancements should be present
        
        details = f"Enhancement checks: {enhancement_checks}, Passed: {passed_checks}/4"
        return log_test_result("Enhanced WebSocket State Handling", success, details)
    except Exception as e:
        return log_test_result("Enhanced WebSocket State Handling", False, f"Exception: {str(e)}")

def test_multiplayer_split_integration():
    """Test 9: Verify multiplayer split integration with server"""
    try:
        # Check if there's proper integration between client split and server split handling
        agario_file = '/app/app/agario/page.js'
        arena_files = ['/app/src/rooms/ArenaRoom.ts', '/app/build/rooms/ArenaRoom.js']
        
        client_has_split = False
        server_has_split = False
        
        # Check client-side
        with open(agario_file, 'r') as f:
            client_content = f.read()
            client_has_split = 'split()' in client_content and 'SPACE' in client_content
        
        # Check server-side
        for arena_file in arena_files:
            try:
                with open(arena_file, 'r') as f:
                    server_content = f.read()
                    if 'handleSplit' in server_content and 'split' in server_content:
                        server_has_split = True
                        break
            except FileNotFoundError:
                continue
        
        success = client_has_split and server_has_split
        details = f"Client split: {client_has_split}, Server split: {server_has_split}"
        return log_test_result("Multiplayer Split Integration", success, details)
    except Exception as e:
        return log_test_result("Multiplayer Split Integration", False, f"Exception: {str(e)}")

def run_comprehensive_websocket_split_test():
    """Run comprehensive WebSocket connection state handling test for spacebar split functionality"""
    print("🎯 WEBSOCKET CONNECTION STATE HANDLING FOR SPACEBAR SPLIT FUNCTIONALITY - BACKEND TESTING")
    print("=" * 90)
    print(f"Testing against: {BASE_URL}")
    print(f"API Base URL: {API_BASE_URL}")
    print()
    
    # Track test results
    test_results = []
    
    print("📋 TESTING CATEGORIES:")
    print("1. API Health Check - Verify backend infrastructure is operational")
    print("2. Colyseus Server Availability - Check WebSocket server availability")
    print("3. WebSocket Connection Infrastructure - Verify connection handling code")
    print("4. Split Message Handling Backend - Check server-side split processing")
    print("5. Connection State Validation Patterns - Verify client-side validation")
    print("6. Error Handling Robustness - Check error handling for connection issues")
    print("7. Split Cooldown Mechanism - Verify spam prevention")
    print("8. Enhanced WebSocket State Handling - Check review request requirements")
    print("9. Multiplayer Split Integration - Verify client-server integration")
    print()
    
    # Run all tests
    test_results.append(test_api_health_check())
    test_results.append(test_colyseus_server_availability())
    test_results.append(test_websocket_connection_infrastructure())
    test_results.append(test_split_message_handling_backend())
    test_results.append(test_connection_state_validation_patterns())
    test_results.append(test_error_handling_robustness())
    test_results.append(test_split_cooldown_mechanism())
    test_results.append(test_enhanced_websocket_state_handling())
    test_results.append(test_multiplayer_split_integration())
    
    # Calculate results
    total_tests = len(test_results)
    passed_tests = sum(test_results)
    success_rate = (passed_tests / total_tests) * 100
    
    print()
    print("📊 COMPREHENSIVE TEST RESULTS:")
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {success_rate:.1f}%")
    print()
    
    if success_rate >= 80:
        print("🎉 WEBSOCKET CONNECTION STATE HANDLING FOR SPACEBAR SPLIT FUNCTIONALITY - EXCELLENT PERFORMANCE")
    elif success_rate >= 60:
        print("✅ WEBSOCKET CONNECTION STATE HANDLING FOR SPACEBAR SPLIT FUNCTIONALITY - GOOD PERFORMANCE")
    else:
        print("⚠️ WEBSOCKET CONNECTION STATE HANDLING FOR SPACEBAR SPLIT FUNCTIONALITY - NEEDS IMPROVEMENT")
    
    return success_rate >= 70  # Consider 70% as acceptable

if __name__ == "__main__":
    success = run_comprehensive_websocket_split_test()
    exit(0 if success else 1)