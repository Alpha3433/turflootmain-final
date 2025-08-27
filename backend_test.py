#!/usr/bin/env python3
"""
Backend Test Suite for Custom Name Update Endpoint
Testing the specific 500 error scenario reported by user
"""

import requests
import json
import time
import sys
import os

# Get base URL from environment
BASE_URL = "http://localhost:3000"

def test_custom_name_update_endpoint():
    """Test the /api/users/profile/update-name endpoint with exact user payload"""
    
    print("🎯 TESTING CUSTOM NAME UPDATE ENDPOINT - DEBUGGING 500 ERROR")
    print("=" * 80)
    
    # Test 1: Exact payload from console logs
    print("\n1️⃣ TESTING WITH EXACT USER PAYLOAD FROM CONSOLE LOGS")
    print("-" * 60)
    
    exact_payload = {
        "userId": "did:privy:cmetjchq5012yjr0bgxbe748i",
        "customName": "wwe",
        "privyId": "did:privy:cmetjchq5012yjr0bgxbe748i",
        "email": None
    }
    
    try:
        print(f"📤 Sending POST request to: {BASE_URL}/api/users/profile/update-name")
        print(f"📦 Payload: {json.dumps(exact_payload, indent=2)}")
        
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
        
        print(f"⏱️  Response time: {response_time:.3f}s")
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(f"✅ SUCCESS: {json.dumps(response_data, indent=2)}")
        else:
            print(f"❌ ERROR Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"🚨 REQUEST EXCEPTION: {e}")
    except Exception as e:
        print(f"🚨 UNEXPECTED ERROR: {e}")
    
    # Test 2: Simpler payload to isolate issue
    print("\n2️⃣ TESTING WITH MINIMAL PAYLOAD")
    print("-" * 60)
    
    minimal_payload = {
        "userId": "did:privy:cmetjchq5012yjr0bgxbe748i",
        "customName": "wwe"
    }
    
    try:
        print(f"📤 Sending POST request with minimal payload")
        print(f"📦 Payload: {json.dumps(minimal_payload, indent=2)}")
        
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
        
        print(f"⏱️  Response time: {response_time:.3f}s")
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(f"✅ SUCCESS: {json.dumps(response_data, indent=2)}")
        else:
            print(f"❌ ERROR Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"🚨 REQUEST EXCEPTION: {e}")
    except Exception as e:
        print(f"🚨 UNEXPECTED ERROR: {e}")
    
    # Test 3: Test with different customName values
    print("\n3️⃣ TESTING WITH DIFFERENT CUSTOM NAMES")
    print("-" * 60)
    
    test_names = ["test", "player123", "a", "verylongusername123"]
    
    for name in test_names:
        test_payload = {
            "userId": "did:privy:cmetjchq5012yjr0bgxbe748i",
            "customName": name
        }
        
        try:
            print(f"🧪 Testing with customName: '{name}'")
            response = requests.post(
                f"{BASE_URL}/api/users/profile/update-name",
                json=test_payload,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            print(f"   Status: {response.status_code}")
            if response.status_code != 200:
                print(f"   Error: {response.text}")
            else:
                data = response.json()
                print(f"   Success: {data.get('message', 'No message')}")
                
        except Exception as e:
            print(f"   Exception: {e}")
    
    # Test 4: Verify MongoDB connection
    print("\n4️⃣ TESTING MONGODB CONNECTION VIA OTHER ENDPOINTS")
    print("-" * 60)
    
    try:
        # Test root endpoint
        response = requests.get(f"{BASE_URL}/api/", timeout=5)
        print(f"📡 Root API Status: {response.status_code}")
        
        # Test ping endpoint
        response = requests.get(f"{BASE_URL}/api/ping", timeout=5)
        print(f"🏓 Ping API Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ MongoDB connection appears to be working (other endpoints responding)")
        else:
            print("❌ Potential MongoDB connection issues")
            
    except Exception as e:
        print(f"🚨 Connection test failed: {e}")
    
    # Test 5: Test route matching
    print("\n5️⃣ TESTING ROUTE MATCHING")
    print("-" * 60)
    
    # Test with different URL formats
    test_urls = [
        f"{BASE_URL}/api/users/profile/update-name",
        f"{BASE_URL}/api/users/profile/update-name/",
        f"{BASE_URL}/api/users/profile/update-name?test=1"
    ]
    
    for url in test_urls:
        try:
            print(f"🔗 Testing URL: {url}")
            response = requests.post(
                url,
                json={"userId": "test", "customName": "test"},
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            print(f"   Status: {response.status_code}")
            
        except Exception as e:
            print(f"   Exception: {e}")
    
    # Test 6: Test with invalid data to trigger validation
    print("\n6️⃣ TESTING VALIDATION SCENARIOS")
    print("-" * 60)
    
    validation_tests = [
        {"payload": {}, "description": "Empty payload"},
        {"payload": {"userId": ""}, "description": "Empty userId"},
        {"payload": {"customName": ""}, "description": "Empty customName"},
        {"payload": {"userId": "test"}, "description": "Missing customName"},
        {"payload": {"customName": "test"}, "description": "Missing userId"},
        {"payload": {"userId": "test", "customName": ""}, "description": "Empty customName with userId"},
        {"payload": {"userId": "test", "customName": "a" * 25}, "description": "Too long customName"}
    ]
    
    for test in validation_tests:
        try:
            print(f"🧪 {test['description']}")
            response = requests.post(
                f"{BASE_URL}/api/users/profile/update-name",
                json=test["payload"],
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            print(f"   Status: {response.status_code}")
            if response.status_code != 200:
                print(f"   Response: {response.text[:100]}...")
                
        except Exception as e:
            print(f"   Exception: {e}")

def test_server_connectivity():
    """Test basic server connectivity"""
    print("\n🔌 TESTING SERVER CONNECTIVITY")
    print("=" * 80)
    
    try:
        response = requests.get(f"{BASE_URL}/api/", timeout=5)
        print(f"✅ Server is reachable: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"📋 Server info: {data}")
        return True
    except Exception as e:
        print(f"❌ Server connectivity failed: {e}")
        return False

def check_backend_logs():
    """Check backend logs for any errors"""
    print("\n📋 CHECKING BACKEND LOGS")
    print("=" * 80)
    
    try:
        # Check supervisor logs for backend
        import subprocess
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/nextjs.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            print("📄 Recent backend logs:")
            print(result.stdout)
        else:
            print("❌ Could not read backend logs")
            
    except Exception as e:
        print(f"🚨 Error reading logs: {e}")

def main():
    """Main test execution"""
    print("🚀 STARTING BACKEND TESTING FOR CUSTOM NAME UPDATE ENDPOINT")
    print("🎯 Focus: Debugging 500 Internal Server Error")
    print("📅 Test Date:", time.strftime("%Y-%m-%d %H:%M:%S"))
    print("🌐 Base URL:", BASE_URL)
    
    # Test server connectivity first
    if not test_server_connectivity():
        print("🚨 Cannot proceed - server is not reachable")
        sys.exit(1)
    
    # Check backend logs
    check_backend_logs()
    
    # Run the main test suite
    test_custom_name_update_endpoint()
    
    print("\n" + "=" * 80)
    print("🏁 TESTING COMPLETED")
    print("📊 Check the output above for detailed results")
    print("🔍 Look for any 500 errors or exceptions that match the user's report")

if __name__ == "__main__":
    main()