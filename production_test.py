#!/usr/bin/env python3
"""
Production URL Testing for Custom Name Update Endpoint
Testing against the actual production URL to reproduce the 500 error
"""

import requests
import json
import time
import sys

# Production URL from .env
PRODUCTION_URL = "https://solana-battle.preview.emergentagent.com"

def test_production_endpoint():
    """Test the production endpoint with exact user payload"""
    
    print("🌐 TESTING PRODUCTION CUSTOM NAME UPDATE ENDPOINT")
    print("=" * 80)
    print(f"🎯 Production URL: {PRODUCTION_URL}")
    
    # Test 1: Exact payload from console logs
    print("\n1️⃣ TESTING PRODUCTION WITH EXACT USER PAYLOAD")
    print("-" * 60)
    
    exact_payload = {
        "userId": "did:privy:cmetjchq5012yjr0bgxbe748i",
        "customName": "wwe",
        "privyId": "did:privy:cmetjchq5012yjr0bgxbe748i",
        "email": None
    }
    
    try:
        print(f"📤 Sending POST request to: {PRODUCTION_URL}/api/users/profile/update-name")
        print(f"📦 Payload: {json.dumps(exact_payload, indent=2)}")
        
        start_time = time.time()
        response = requests.post(
            f"{PRODUCTION_URL}/api/users/profile/update-name",
            json=exact_payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=30
        )
        response_time = time.time() - start_time
        
        print(f"⏱️  Response time: {response_time:.3f}s")
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        print(f"📄 Response Text: {response.text}")
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                print(f"✅ SUCCESS: {json.dumps(response_data, indent=2)}")
            except:
                print(f"✅ SUCCESS but non-JSON response: {response.text}")
        else:
            print(f"❌ ERROR Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"🚨 REQUEST EXCEPTION: {e}")
    except Exception as e:
        print(f"🚨 UNEXPECTED ERROR: {e}")
    
    # Test 2: Test other endpoints to see if it's a general issue
    print("\n2️⃣ TESTING OTHER PRODUCTION ENDPOINTS")
    print("-" * 60)
    
    test_endpoints = [
        "/api/",
        "/api/ping",
        "/api/stats/live-players"
    ]
    
    for endpoint in test_endpoints:
        try:
            print(f"🔗 Testing: {PRODUCTION_URL}{endpoint}")
            response = requests.get(f"{PRODUCTION_URL}{endpoint}", timeout=10)
            print(f"   Status: {response.status_code}")
            if response.status_code != 200:
                print(f"   Error: {response.text[:100]}...")
            else:
                print(f"   Success: Response received")
                
        except Exception as e:
            print(f"   Exception: {e}")

def main():
    """Main test execution"""
    print("🚀 STARTING PRODUCTION TESTING FOR CUSTOM NAME UPDATE ENDPOINT")
    print("🎯 Focus: Reproducing 500 Internal Server Error on production")
    print("📅 Test Date:", time.strftime("%Y-%m-%d %H:%M:%S"))
    
    test_production_endpoint()
    
    print("\n" + "=" * 80)
    print("🏁 PRODUCTION TESTING COMPLETED")
    print("📊 Check the output above for production vs localhost differences")

if __name__ == "__main__":
    main()