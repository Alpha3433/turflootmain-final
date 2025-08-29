#!/usr/bin/env python3
"""
Test Party Lobby State Synchronization on localhost
"""

import requests
import json
import time
from datetime import datetime

# Test configuration - using localhost
BASE_URL = "http://localhost:3000"
TEST_USER_ID = "did:privy:cmeksdeoe00gzl10bsienvnbk"
TEST_USER_USERNAME = "anth"

def log_test(message, level="INFO"):
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
            
        log_test(f"{method} {endpoint} -> {response.status_code}")
        
        try:
            response_data = response.json()
        except:
            response_data = {"text": response.text[:500]}
            
        return response.status_code, response_data
            
    except requests.exceptions.RequestException as e:
        return 0, {"error": f"Request failed: {str(e)}"}

def test_localhost_party_sync():
    """Test party synchronization on localhost"""
    log_test("🎯 TESTING PARTY SYNC ON LOCALHOST", "INFO")
    
    # Step 1: Check initial state
    log_test("--- Step 1: Check initial party state ---", "DEBUG")
    status, current_party = make_request("GET", "/party-api/current", params={"userId": TEST_USER_ID})
    log_test(f"Initial party state: hasParty={current_party.get('hasParty')}")
    
    # Step 2: Create a party
    log_test("--- Step 2: Create new party ---", "DEBUG")
    party_data = {
        "ownerId": TEST_USER_ID,
        "ownerUsername": TEST_USER_USERNAME,
        "partyName": "Localhost Test Party"
    }
    
    status, create_result = make_request("POST", "/party-api/create", data=party_data)
    
    if status == 200:
        party_id = create_result.get('partyId')
        log_test(f"✅ Party created successfully: {party_id}")
    else:
        log_test(f"❌ Party creation failed: {create_result}")
        return False
    
    # Step 3: Check party status immediately
    log_test("--- Step 3: Check party status after creation ---", "DEBUG")
    status, immediate_check = make_request("GET", "/party-api/current", params={"userId": TEST_USER_ID})
    
    has_party = immediate_check.get('hasParty', False)
    party_data = immediate_check.get('party')
    
    if has_party and party_data:
        log_test(f"✅ Party properly detected: {party_data.get('name')}")
        log_test(f"✅ Member count: {party_data.get('memberCount')}")
        
        # Step 4: Test conflict detection
        log_test("--- Step 4: Test conflict detection ---", "DEBUG")
        second_party_data = {
            "ownerId": TEST_USER_ID,
            "ownerUsername": TEST_USER_USERNAME,
            "partyName": "Second Party"
        }
        
        status, conflict_result = make_request("POST", "/party-api/create", data=second_party_data)
        
        if status != 200:
            error_msg = conflict_result.get('error', '')
            if 'already have an active party' in error_msg.lower():
                log_test(f"✅ Conflict detection working: {error_msg}")
                return True
            else:
                log_test(f"❌ Wrong error message: {error_msg}")
                return False
        else:
            log_test("❌ Conflict detection failed - second party created")
            return False
    else:
        log_test(f"❌ Party not detected: hasParty={has_party}, party={party_data}")
        return False

if __name__ == "__main__":
    success = test_localhost_party_sync()
    if success:
        log_test("✅ LOCALHOST TEST PASSED - Fix is working on localhost", "SUCCESS")
    else:
        log_test("❌ LOCALHOST TEST FAILED - Issue exists on localhost too", "ERROR")