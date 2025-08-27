#!/usr/bin/env python3
"""
Backend API Testing for TurfLoot - Custom Name Update Endpoint
Testing the enhanced error logging for /api/users/profile/update-name endpoint
Focus: Testing exact payload from user console logs with enhanced backend logging
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
PRODUCTION_URL = "https://lobby-party.preview.emergentagent.com"

def log_test(message, status="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] {status}: {message}")

def test_enhanced_error_logging():
    """Test the enhanced error logging for the custom name update endpoint"""
    
    log_test("🎯 TESTING ENHANCED ERROR LOGGING FOR CUSTOM NAME UPDATE ENDPOINT", "START")
    log_test("=" * 80)
    
    # Test 1: Exact payload from user's console logs
    log_test("1️⃣ TESTING WITH EXACT USER PAYLOAD FROM CONSOLE LOGS")
    log_test("-" * 60)
    
    exact_payload = {
        "userId": "did:privy:cmetjchq5012yjr0bgxbe748i",
        "customName": "wwe",
        "privyId": "did:privy:cmetjchq5012yjr0bgxbe748i",
        "email": None
    }
    
    log_test(f"📦 Exact payload from user: {json.dumps(exact_payload, indent=2)}")
    
    try:
        log_test(f"📤 Sending POST request to: {BASE_URL}/api/users/profile/update-name")
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/users/profile/update-name",
            json=exact_payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=10
        )
        response_time = time.time() - start_time
        
        log_test(f"⏱️ Response time: {response_time:.3f}s")
        log_test(f"📊 Status Code: {response.status_code}")
        log_test(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            response_data = response.json()
            log_test(f"✅ SUCCESS - Enhanced logging worked! Response: {json.dumps(response_data, indent=2)}")
            
            # Verify response structure
            required_fields = ['success', 'message', 'customName', 'userId', 'timestamp']
            for field in required_fields:
                if field in response_data:
                    log_test(f"✅ Required field '{field}': {response_data[field]}")
                else:
                    log_test(f"❌ Missing required field: {field}", "ERROR")
                    
        elif response.status_code == 500:
            log_test(f"❌ 500 ERROR DETECTED - Enhanced logging should show details:", "ERROR")
            log_test(f"Response body: {response.text}")
            
        else:
            log_test(f"❌ Unexpected status code: {response.status_code}", "ERROR")
            log_test(f"Response body: {response.text}")
            
    except requests.exceptions.RequestException as e:
        log_test(f"❌ Request failed: {str(e)}", "ERROR")
    
    # Test 2: Production URL comparison
    log_test("\n2️⃣ TESTING PRODUCTION URL FOR COMPARISON")
    log_test("-" * 60)
    
    try:
        log_test(f"📤 Sending POST request to: {PRODUCTION_URL}/api/users/profile/update-name")
        
        response = requests.post(
            f"{PRODUCTION_URL}/api/users/profile/update-name",
            json=exact_payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=10
        )
        
        log_test(f"📊 Production Status Code: {response.status_code}")
        if response.status_code != 200:
            log_test(f"❌ Production error (expected): {response.text}")
            
    except requests.exceptions.RequestException as e:
        log_test(f"✅ Expected production failure: {str(e)}")
    
    # Test 3: Minimal payload test
    log_test("\n3️⃣ TESTING MINIMAL PAYLOAD")
    log_test("-" * 60)
    
    minimal_payload = {
        "userId": "did:privy:cmetjchq5012yjr0bgxbe748i",
        "customName": "test"
    }
    
    try:
        log_test(f"📦 Minimal payload: {json.dumps(minimal_payload, indent=2)}")
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/users/profile/update-name",
            json=minimal_payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=10
        )
        response_time = time.time() - start_time
        
        log_test(f"⏱️ Response time: {response_time:.3f}s")
        log_test(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            log_test(f"✅ Minimal payload SUCCESS: {response.json()}")
        else:
            log_test(f"❌ Minimal payload FAILED: {response.text}", "ERROR")
            
    except requests.exceptions.RequestException as e:
        log_test(f"❌ Minimal payload request failed: {str(e)}", "ERROR")

def test_various_custom_names():
    """Test various custom name scenarios"""
    
    log_test("\n4️⃣ TESTING VARIOUS CUSTOM NAME SCENARIOS")
    log_test("-" * 60)
    
    test_names = ["player123", "a", "verylongusername123", "wwe", "test"]
    
    for name in test_names:
        log_test(f"🎮 Testing custom name: '{name}'...")
        test_data = {
            "userId": "did:privy:cmetjchq5012yjr0bgxbe748i",
            "customName": name
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/users/profile/update-name",
                json=test_data,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                log_test(f"✅ Name '{name}' SUCCESS")
            else:
                log_test(f"❌ Name '{name}' FAILED: {response.status_code} - {response.text}", "ERROR")
                
        except requests.exceptions.RequestException as e:
            log_test(f"❌ Name '{name}' request failed: {str(e)}", "ERROR")

def test_error_scenarios():
    """Test error scenarios to verify validation"""
    
    log_test("\n5️⃣ TESTING ERROR SCENARIOS")
    log_test("-" * 60)
    
    error_tests = [
        {"payload": {}, "description": "Empty payload"},
        {"payload": {"userId": ""}, "description": "Empty userId"},
        {"payload": {"userId": "test", "customName": ""}, "description": "Empty customName"},
        {"payload": {"userId": "test", "customName": "a" * 25}, "description": "Too long customName"},
    ]
    
    for test_case in error_tests:
        log_test(f"🔍 Testing: {test_case['description']}")
        try:
            response = requests.post(
                f"{BASE_URL}/api/users/profile/update-name",
                json=test_case["payload"],
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout=10
            )
            
            if response.status_code == 400:
                log_test(f"✅ Expected 400 error for {test_case['description']}")
            else:
                log_test(f"❌ Unexpected status {response.status_code} for {test_case['description']}", "ERROR")
                log_test(f"Response: {response.text}")
                
        except requests.exceptions.RequestException as e:
            log_test(f"❌ Error test request failed: {str(e)}", "ERROR")

def test_database_connectivity():
    """Test database connectivity through other endpoints"""
    
    log_test("\n6️⃣ TESTING DATABASE CONNECTIVITY")
    log_test("-" * 60)
    
    # Test ping endpoint
    try:
        response = requests.get(f"{BASE_URL}/api/ping", timeout=5)
        if response.status_code == 200:
            log_test("✅ Ping endpoint working - server is responsive")
        else:
            log_test(f"❌ Ping endpoint failed: {response.status_code}", "ERROR")
    except requests.exceptions.RequestException as e:
        log_test(f"❌ Ping request failed: {str(e)}", "ERROR")
    
    # Test root endpoint
    try:
        response = requests.get(f"{BASE_URL}/api/", timeout=5)
        if response.status_code == 200:
            log_test("✅ Root API endpoint working")
        else:
            log_test(f"❌ Root API endpoint failed: {response.status_code}", "ERROR")
    except requests.exceptions.RequestException as e:
        log_test(f"❌ Root API request failed: {str(e)}", "ERROR")

def main():
    """Main test execution"""
    log_test("🚀 STARTING ENHANCED ERROR LOGGING TESTS FOR CUSTOM NAME UPDATE ENDPOINT", "START")
    log_test("=" * 80)
    
    # Run all tests
    test_database_connectivity()
    test_enhanced_error_logging()
    test_various_custom_names()
    test_error_scenarios()
    
    log_test("🏁 ENHANCED ERROR LOGGING TESTS COMPLETED", "END")
    log_test("=" * 80)

if __name__ == "__main__":
    main()