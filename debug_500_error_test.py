#!/usr/bin/env python3

"""
Debug 500 Internal Server Error for /api/users/profile/update-name endpoint
Testing with exact user data from the review request to reproduce the issue.
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/api"

def log_test(message, status="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

def test_database_connectivity():
    """Test basic database connectivity through other endpoints"""
    log_test("Testing database connectivity...")
    
    try:
        # Test root endpoint
        response = requests.get(f"{API_BASE}/", timeout=10)
        log_test(f"Root endpoint: {response.status_code} - {response.text[:100]}")
        
        # Test ping endpoint
        response = requests.get(f"{API_BASE}/ping", timeout=10)
        log_test(f"Ping endpoint: {response.status_code} - {response.text[:100]}")
        
        # Test leaderboard endpoint (uses MongoDB)
        response = requests.get(f"{API_BASE}/users/leaderboard", timeout=10)
        log_test(f"Leaderboard endpoint: {response.status_code} - {response.text[:100]}")
        
        if response.status_code == 200:
            log_test("✅ Database connectivity appears to be working", "SUCCESS")
            return True
        else:
            log_test("❌ Database connectivity issues detected", "ERROR")
            return False
            
    except Exception as e:
        log_test(f"❌ Database connectivity test failed: {str(e)}", "ERROR")
        return False

def test_exact_user_data():
    """Test with the exact user data from the review request"""
    log_test("Testing with exact user data from review request...")
    
    # Exact data from the user's logs
    test_data = {
        "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0", 
        "customName": "jason",
        "privyId": "did:privy:cme20s0fl005okz0bmxcr0cp0", 
        "email": "james.paradisis@gmail.com"
    }
    
    try:
        log_test(f"Sending POST request to /api/users/profile/update-name")
        log_test(f"Request data: {json.dumps(test_data, indent=2)}")
        
        response = requests.post(
            f"{API_BASE}/users/profile/update-name",
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        log_test(f"Response status: {response.status_code}")
        log_test(f"Response headers: {dict(response.headers)}")
        
        try:
            response_json = response.json()
            log_test(f"Response body: {json.dumps(response_json, indent=2)}")
        except:
            log_test(f"Response body (raw): {response.text}")
        
        if response.status_code == 500:
            log_test("❌ REPRODUCED: 500 Internal Server Error as reported", "ERROR")
            return False
        elif response.status_code == 200:
            log_test("✅ SUCCESS: Endpoint working correctly", "SUCCESS")
            return True
        else:
            log_test(f"⚠️ UNEXPECTED: Got status {response.status_code}", "WARNING")
            return False
            
    except requests.exceptions.Timeout:
        log_test("❌ Request timed out after 30 seconds", "ERROR")
        return False
    except Exception as e:
        log_test(f"❌ Request failed: {str(e)}", "ERROR")
        return False

def test_variations():
    """Test variations to isolate the issue"""
    log_test("Testing variations to isolate the issue...")
    
    variations = [
        {
            "name": "Minimal required fields only",
            "data": {
                "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
                "customName": "jason"
            }
        },
        {
            "name": "Different customName",
            "data": {
                "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
                "customName": "TestUser123"
            }
        },
        {
            "name": "Different userId format",
            "data": {
                "userId": "test-user-123",
                "customName": "TestName"
            }
        },
        {
            "name": "Empty customName (should fail validation)",
            "data": {
                "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
                "customName": ""
            }
        },
        {
            "name": "Missing userId (should fail validation)",
            "data": {
                "customName": "jason"
            }
        }
    ]
    
    results = []
    
    for variation in variations:
        log_test(f"Testing: {variation['name']}")
        
        try:
            response = requests.post(
                f"{API_BASE}/users/profile/update-name",
                json=variation['data'],
                headers={'Content-Type': 'application/json'},
                timeout=15
            )
            
            log_test(f"  Status: {response.status_code}")
            
            try:
                response_json = response.json()
                if 'error' in response_json:
                    log_test(f"  Error: {response_json['error']}")
                else:
                    log_test(f"  Success: {response_json.get('message', 'OK')}")
            except:
                log_test(f"  Raw response: {response.text[:100]}")
            
            results.append({
                'name': variation['name'],
                'status': response.status_code,
                'success': response.status_code in [200, 400]  # 400 is expected for validation errors
            })
            
        except Exception as e:
            log_test(f"  ❌ Failed: {str(e)}")
            results.append({
                'name': variation['name'],
                'status': 'ERROR',
                'success': False
            })
        
        time.sleep(1)  # Brief pause between requests
    
    return results

def test_mongodb_operations():
    """Test MongoDB operations through other endpoints"""
    log_test("Testing MongoDB operations through other endpoints...")
    
    try:
        # Test user profile get endpoint
        response = requests.get(
            f"{API_BASE}/users/profile?userId=did:privy:cme20s0fl005okz0bmxcr0cp0",
            timeout=10
        )
        log_test(f"User profile GET: {response.status_code}")
        
        if response.status_code == 200:
            try:
                profile_data = response.json()
                log_test(f"Profile data: {json.dumps(profile_data, indent=2)}")
            except:
                log_test(f"Profile response: {response.text}")
        
        # Test friends list endpoint (also uses MongoDB)
        response = requests.get(
            f"{API_BASE}/friends/list?userId=did:privy:cme20s0fl005okz0bmxcr0cp0",
            timeout=10
        )
        log_test(f"Friends list: {response.status_code}")
        
        return True
        
    except Exception as e:
        log_test(f"❌ MongoDB operations test failed: {str(e)}", "ERROR")
        return False

def check_environment_variables():
    """Check if required environment variables are set"""
    log_test("Checking environment variables...")
    
    env_vars = [
        'MONGO_URL',
        'MONGODB_URI', 
        'DB_NAME',
        'JWT_SECRET'
    ]
    
    missing_vars = []
    
    for var in env_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if 'SECRET' in var or 'PASSWORD' in var:
                log_test(f"  {var}: [SET - MASKED]")
            elif 'MONGO' in var:
                log_test(f"  {var}: {value[:20]}...")
            else:
                log_test(f"  {var}: {value}")
        else:
            log_test(f"  {var}: [NOT SET]")
            missing_vars.append(var)
    
    if missing_vars:
        log_test(f"⚠️ Missing environment variables: {missing_vars}", "WARNING")
    else:
        log_test("✅ All required environment variables are set", "SUCCESS")
    
    return len(missing_vars) == 0

def main():
    """Main test execution"""
    log_test("=" * 60)
    log_test("DEBUG 500 ERROR TEST - /api/users/profile/update-name")
    log_test("=" * 60)
    
    log_test(f"Testing against: {BASE_URL}")
    
    # Step 1: Check environment variables
    env_ok = check_environment_variables()
    
    # Step 2: Test database connectivity
    db_ok = test_database_connectivity()
    
    # Step 3: Test MongoDB operations
    mongo_ok = test_mongodb_operations()
    
    # Step 4: Test exact user data (main test)
    main_test_ok = test_exact_user_data()
    
    # Step 5: Test variations
    variation_results = test_variations()
    
    # Summary
    log_test("=" * 60)
    log_test("TEST SUMMARY")
    log_test("=" * 60)
    
    log_test(f"Environment Variables: {'✅ OK' if env_ok else '❌ ISSUES'}")
    log_test(f"Database Connectivity: {'✅ OK' if db_ok else '❌ ISSUES'}")
    log_test(f"MongoDB Operations: {'✅ OK' if mongo_ok else '❌ ISSUES'}")
    log_test(f"Main Test (Exact Data): {'✅ OK' if main_test_ok else '❌ FAILED'}")
    
    log_test("\nVariation Test Results:")
    for result in variation_results:
        status_icon = "✅" if result['success'] else "❌"
        log_test(f"  {status_icon} {result['name']}: {result['status']}")
    
    # Diagnosis
    log_test("\n" + "=" * 60)
    log_test("DIAGNOSIS")
    log_test("=" * 60)
    
    if not main_test_ok:
        if not db_ok:
            log_test("🔍 LIKELY CAUSE: Database connectivity issues")
            log_test("   - Check MongoDB connection string")
            log_test("   - Verify MongoDB service is running")
            log_test("   - Check network connectivity to database")
        elif not mongo_ok:
            log_test("🔍 LIKELY CAUSE: MongoDB operation issues")
            log_test("   - Check database permissions")
            log_test("   - Verify collection exists and is accessible")
        else:
            log_test("🔍 LIKELY CAUSE: Specific issue with update-name endpoint")
            log_test("   - Check server logs for detailed error messages")
            log_test("   - Verify MongoDB write permissions")
            log_test("   - Check for data validation issues in the backend code")
    else:
        log_test("✅ ENDPOINT IS WORKING: Unable to reproduce the 500 error")
        log_test("   - The issue may be intermittent or environment-specific")
        log_test("   - Check production vs development environment differences")
    
    log_test("\n" + "=" * 60)
    log_test("RECOMMENDATIONS")
    log_test("=" * 60)
    
    if not main_test_ok:
        log_test("1. Check server logs immediately after running this test")
        log_test("2. Verify MongoDB connection and permissions")
        log_test("3. Test with a fresh database connection")
        log_test("4. Check for any middleware or proxy issues")
        log_test("5. Verify all required environment variables are set correctly")
    
    return main_test_ok

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)