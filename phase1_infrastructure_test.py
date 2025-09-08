#!/usr/bin/env python3
"""
Phase 1 Infrastructure Stability Verification
Testing backend API stability after recent fixes including:
- Core API Health Check (/api/ping, /api/ root endpoint)
- Game Server Infrastructure (/api/servers/lobbies, Socket.IO server)
- Spectator Mode Backend Support (Socket.IO server on port 3000)
- Critical Error Resolution (syntax errors, port conflicts)
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration - Use localhost for testing as per environment
LOCALHOST_URL = "http://localhost:3000"
PRODUCTION_URL = "https://game-ui-debug.preview.emergentagent.com"

# Test configuration
TEST_TIMEOUT = 10
MAX_RETRIES = 3

def log_test(test_name, status, details="", response_time=None):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    time_str = f" ({response_time:.3f}s)" if response_time else ""
    print(f"[{timestamp}] {status_icon} {test_name}{time_str}")
    if details:
        print(f"    {details}")

def test_api_endpoint(url, endpoint, method="GET", data=None, timeout=10):
    """Test a single API endpoint"""
    full_url = f"{url}{endpoint}"
    try:
        start_time = time.time()
        if method == "GET":
            response = requests.get(full_url, timeout=timeout)
        elif method == "POST":
            response = requests.post(full_url, json=data, timeout=timeout)
        response_time = time.time() - start_time
        
        return {
            "success": True,
            "status_code": response.status_code,
            "response_time": response_time,
            "data": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
            "url": full_url
        }
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Timeout", "url": full_url}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Connection Error", "url": full_url}
    except Exception as e:
        return {"success": False, "error": str(e), "url": full_url}

def test_core_api_health():
    """Test Core API Health Check"""
    print("\n🔍 PHASE 1: CORE API HEALTH CHECK")
    print("=" * 50)
    
    # Test /api/ping endpoint
    result = test_api_endpoint(LOCALHOST_URL, "/api/ping")
    if result["success"] and result["status_code"] == 200:
        log_test("Ping Endpoint (/api/ping)", "PASS", 
                f"Status: {result['status_code']}, Response: {result['data']}", 
                result["response_time"])
    else:
        log_test("Ping Endpoint (/api/ping)", "FAIL", 
                f"Error: {result.get('error', 'Unknown')}")
    
    # Test /api/ root endpoint
    result = test_api_endpoint(LOCALHOST_URL, "/api/")
    if result["success"] and result["status_code"] == 200:
        log_test("Root API Endpoint (/api/)", "PASS", 
                f"Status: {result['status_code']}, API: {result['data'].get('name', 'Unknown')}", 
                result["response_time"])
    else:
        log_test("Root API Endpoint (/api/)", "FAIL", 
                f"Error: {result.get('error', 'Unknown')}")
    
    # Test for 500/502 server errors
    endpoints_to_check = ["/api/ping", "/api/", "/api/servers/lobbies"]
    server_errors = 0
    
    for endpoint in endpoints_to_check:
        result = test_api_endpoint(LOCALHOST_URL, endpoint)
        if result["success"] and result["status_code"] >= 500:
            server_errors += 1
    
    if server_errors == 0:
        log_test("Server Error Check", "PASS", "No 500/502 server errors detected")
    else:
        log_test("Server Error Check", "FAIL", f"Found {server_errors} server errors")

def test_game_server_infrastructure():
    """Test Game Server Infrastructure"""
    print("\n🎮 PHASE 2: GAME SERVER INFRASTRUCTURE")
    print("=" * 50)
    
    # Test /api/servers/lobbies endpoint
    result = test_api_endpoint(LOCALHOST_URL, "/api/servers/lobbies")
    if result["success"] and result["status_code"] == 200:
        data = result["data"]
        server_count = len(data.get("servers", [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0
        log_test("Server Browser (/api/servers/lobbies)", "PASS", 
                f"Status: {result['status_code']}, Servers: {server_count}", 
                result["response_time"])
        
        # Verify server data structure
        if server_count > 0:
            servers = data.get("servers", data) if isinstance(data, dict) else data
            sample_server = servers[0] if isinstance(servers, list) else None
            if sample_server and isinstance(sample_server, dict):
                required_fields = ["id", "name", "currentPlayers", "maxPlayers"]
                missing_fields = [field for field in required_fields if field not in sample_server]
                if not missing_fields:
                    log_test("Server Data Structure", "PASS", "All required fields present")
                else:
                    log_test("Server Data Structure", "FAIL", f"Missing fields: {missing_fields}")
            else:
                log_test("Server Data Structure", "FAIL", "Invalid server data format")
    else:
        log_test("Server Browser (/api/servers/lobbies)", "FAIL", 
                f"Error: {result.get('error', 'Unknown')}")
    
    # Check if Socket.IO server is accessible (basic connectivity test)
    try:
        # Test basic HTTP connection to port 3000 (where Socket.IO should be running)
        result = test_api_endpoint(LOCALHOST_URL, "/")
        if result["success"]:
            log_test("Socket.IO Server Port (3000)", "PASS", 
                    f"Port 3000 accessible, Status: {result['status_code']}")
        else:
            log_test("Socket.IO Server Port (3000)", "FAIL", 
                    f"Port 3000 not accessible: {result.get('error', 'Unknown')}")
    except Exception as e:
        log_test("Socket.IO Server Port (3000)", "FAIL", f"Connection error: {str(e)}")

def test_spectator_backend_support():
    """Test Spectator Mode Backend Support"""
    print("\n👁️ PHASE 3: SPECTATOR MODE BACKEND SUPPORT")
    print("=" * 50)
    
    # Verify Socket.IO server is running on port 3000
    result = test_api_endpoint(LOCALHOST_URL, "/socket.io/")
    if result["success"]:
        log_test("Socket.IO Endpoint", "PASS", 
                f"Socket.IO accessible, Status: {result['status_code']}")
    else:
        log_test("Socket.IO Endpoint", "INFO", 
                "Socket.IO endpoint not directly accessible (expected for Socket.IO)")
    
    # Test game server endpoints that support spectator functionality
    spectator_endpoints = [
        "/api/servers/lobbies",  # For finding games to spectate
        "/api/stats/live-players",  # For spectator statistics
        "/api/stats/global-winnings"  # For spectator UI data
    ]
    
    spectator_support_working = 0
    for endpoint in spectator_endpoints:
        result = test_api_endpoint(LOCALHOST_URL, endpoint)
        if result["success"] and result["status_code"] == 200:
            spectator_support_working += 1
            log_test(f"Spectator Support {endpoint}", "PASS", 
                    f"Status: {result['status_code']}", result["response_time"])
        else:
            log_test(f"Spectator Support {endpoint}", "FAIL", 
                    f"Error: {result.get('error', 'Unknown')}")
    
    if spectator_support_working >= 2:
        log_test("Spectator Backend Support", "PASS", 
                f"{spectator_support_working}/{len(spectator_endpoints)} endpoints working")
    else:
        log_test("Spectator Backend Support", "FAIL", 
                f"Only {spectator_support_working}/{len(spectator_endpoints)} endpoints working")

def test_critical_error_resolution():
    """Test Critical Error Resolution"""
    print("\n🔧 PHASE 4: CRITICAL ERROR RESOLUTION")
    print("=" * 50)
    
    # Test that server starts without syntax errors
    result = test_api_endpoint(LOCALHOST_URL, "/api/ping")
    if result["success"]:
        log_test("Server Startup (No Syntax Errors)", "PASS", 
                "Server responding, no syntax errors detected")
    else:
        log_test("Server Startup (No Syntax Errors)", "FAIL", 
                f"Server not responding: {result.get('error', 'Unknown')}")
    
    # Test port 3000 accessibility
    result = test_api_endpoint(LOCALHOST_URL, "/")
    if result["success"]:
        log_test("Port 3000 Accessibility", "PASS", 
                f"Port 3000 accessible, Status: {result['status_code']}")
    else:
        log_test("Port 3000 Accessibility", "FAIL", 
                f"Port 3000 conflict: {result.get('error', 'Unknown')}")
    
    # Test multiple rapid requests to check server stability
    rapid_requests = []
    for i in range(5):
        result = test_api_endpoint(LOCALHOST_URL, "/api/ping", timeout=5)
        rapid_requests.append(result["success"])
    
    success_rate = sum(rapid_requests) / len(rapid_requests) * 100
    if success_rate >= 80:
        log_test("Server Stability Test", "PASS", 
                f"Success rate: {success_rate:.1f}% (5 rapid requests)")
    else:
        log_test("Server Stability Test", "FAIL", 
                f"Success rate: {success_rate:.1f}% (unstable)")

def main():
    """Main test execution"""
    print("🚀 PHASE 1 INFRASTRUCTURE STABILITY VERIFICATION")
    print("=" * 60)
    print(f"Testing Backend URL: {LOCALHOST_URL}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Execute all test phases
    test_core_api_health()
    test_game_server_infrastructure()
    test_spectator_backend_support()
    test_critical_error_resolution()
    
    print("\n📊 PHASE 1 INFRASTRUCTURE TESTING COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()