#!/usr/bin/env python3
"""
Debug Party Lobby State Synchronization Issue
Detailed investigation of the synchronization problem
"""

import requests
import json
import time
from datetime import datetime

# Test configuration
BASE_URL = "https://game-server-hub-5.preview.emergentagent.com"
TEST_USER_ID = "did:privy:cmeksdeoe00gzl10bsienvnbk"
TEST_USER_USERNAME = "anth"

def log_debug(message, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def make_request(method, endpoint, data=None, params=None):
    """Make HTTP request with detailed logging"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        log_debug(f"{method} {endpoint} -> {response.status_code}")
        
        try:
            response_data = response.json()
        except:
            response_data = {"text": response.text[:500]}
            
        return response.status_code, response_data
            
    except requests.exceptions.RequestException as e:
        return 0, {"error": f"Request failed: {str(e)}"}

def debug_party_creation_and_detection():
    """Debug the party creation and detection issue"""
    log_debug("🔍 DEBUGGING PARTY CREATION AND DETECTION", "DEBUG")
    
    # Step 1: Check initial state
    log_debug("--- Step 1: Check initial party state ---", "DEBUG")
    status, current_party = make_request("GET", "/party-api/current", params={"userId": TEST_USER_ID})
    log_debug(f"Initial party state: {json.dumps(current_party, indent=2)}")
    
    # Step 2: Create a party
    log_debug("--- Step 2: Create new party ---", "DEBUG")
    party_data = {
        "ownerId": TEST_USER_ID,
        "ownerUsername": TEST_USER_USERNAME,
        "partyName": "Debug Test Party"
    }
    
    status, create_result = make_request("POST", "/party-api/create", data=party_data)
    log_debug(f"Create party result: {json.dumps(create_result, indent=2)}")
    
    if status == 200:
        party_id = create_result.get('partyId')
        log_debug(f"✅ Party created successfully: {party_id}")
    else:
        log_debug(f"❌ Party creation failed: {create_result}")
        return
    
    # Step 3: Immediately check party status
    log_debug("--- Step 3: Check party status immediately after creation ---", "DEBUG")
    status, immediate_check = make_request("GET", "/party-api/current", params={"userId": TEST_USER_ID})
    log_debug(f"Immediate party check: {json.dumps(immediate_check, indent=2)}")
    
    # Step 4: Wait and check again
    log_debug("--- Step 4: Wait 2 seconds and check again ---", "DEBUG")
    time.sleep(2)
    status, delayed_check = make_request("GET", "/party-api/current", params={"userId": TEST_USER_ID})
    log_debug(f"Delayed party check: {json.dumps(delayed_check, indent=2)}")
    
    # Step 5: Try to create another party to test conflict detection
    log_debug("--- Step 5: Test conflict detection ---", "DEBUG")
    second_party_data = {
        "ownerId": TEST_USER_ID,
        "ownerUsername": TEST_USER_USERNAME,
        "partyName": "Second Debug Party"
    }
    
    status, second_create = make_request("POST", "/party-api/create", data=second_party_data)
    log_debug(f"Second party creation attempt: {json.dumps(second_create, indent=2)}")
    
    # Step 6: Analysis
    log_debug("--- Step 6: Analysis ---", "DEBUG")
    
    has_party_immediate = immediate_check.get('hasParty', False)
    has_party_delayed = delayed_check.get('hasParty', False)
    second_create_success = status == 200
    
    log_debug(f"Party created: ✅")
    log_debug(f"Immediate detection: {'✅' if has_party_immediate else '❌'}")
    log_debug(f"Delayed detection: {'✅' if has_party_delayed else '❌'}")
    log_debug(f"Conflict detection: {'❌ FAILED' if second_create_success else '✅ WORKING'}")
    
    # Step 7: Check if the issue is in getUserParty vs createParty logic
    log_debug("--- Step 7: Root cause analysis ---", "DEBUG")
    
    if not has_party_immediate and not has_party_delayed:
        log_debug("🚨 ROOT CAUSE: getUserParty() is not finding the party that createParty() created")
        log_debug("🔍 This suggests the fix was not properly applied or there's still a collection mismatch")
    elif second_create_success:
        log_debug("🚨 ROOT CAUSE: createParty() is not checking for existing parties properly")
        log_debug("🔍 This suggests createParty() is not using the same logic as getUserParty()")
    else:
        log_debug("✅ Both methods appear to be working correctly")

def debug_api_endpoints():
    """Debug individual API endpoints"""
    log_debug("🔍 DEBUGGING INDIVIDUAL API ENDPOINTS", "DEBUG")
    
    # Test various endpoints to understand the system state
    endpoints_to_test = [
        ("GET", "/party-api/current", {"userId": TEST_USER_ID}),
        ("GET", "/party-api/invitations", {"userId": TEST_USER_ID}),
        ("GET", "/party-api/invitable-friends", {"userId": TEST_USER_ID, "partyId": "test"}),
    ]
    
    for method, endpoint, params in endpoints_to_test:
        log_debug(f"--- Testing {method} {endpoint} ---", "DEBUG")
        status, result = make_request(method, endpoint, params=params)
        log_debug(f"Status: {status}")
        log_debug(f"Response: {json.dumps(result, indent=2)}")
        print()

def run_debug():
    """Run all debug tests"""
    log_debug("🎯 PARTY LOBBY STATE SYNCHRONIZATION DEBUG STARTED", "INFO")
    log_debug(f"Testing with user: {TEST_USER_ID} ({TEST_USER_USERNAME})", "INFO")
    log_debug(f"Base URL: {BASE_URL}", "INFO")
    print()
    
    # Debug party creation and detection
    debug_party_creation_and_detection()
    print()
    
    # Debug API endpoints
    debug_api_endpoints()
    
    log_debug("🎯 DEBUG COMPLETED", "INFO")

if __name__ == "__main__":
    run_debug()