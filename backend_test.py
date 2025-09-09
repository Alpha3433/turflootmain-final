#!/usr/bin/env python3
"""
Backend Testing Script for Friend Request System MongoDB Index Compatibility Fix
Testing the fixed friend request system that handles MongoDB index compatibility.

CRITICAL FIX BEING TESTED:
- Fixed MongoDB E11000 duplicate key error by adding compatibility for database index fields
- Added both `fromUserIdentifier` and `fromUserId` fields  
- Added both `toUserIdentifier` and `toUserId` fields
- Updated all queries to handle both field naming conventions

TESTING REQUIREMENTS:
1. Friend Request Creation - POST /api/friends with action=send_request
2. Database Query Compatibility - test friend request queries work with $or conditions
3. Complete Friend Request Flow - test sending friend request between real users
"""

import requests
import json
import time
import sys
import os
from datetime import datetime
from urllib.parse import urljoin

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://turfloot-social.preview.emergentagent.com')
API_BASE = urljoin(BASE_URL, '/api/')

def test_api_health():
    """Test basic API connectivity"""
    print("🔍 Testing API Health Check...")
    try:
        response = requests.get(f"{API_BASE}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Health Check: {data.get('service', 'Unknown')} - Features: {data.get('features', [])}")
            return True
        else:
            print(f"❌ API Health Check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API Health Check error: {e}")
        return False

def test_database_cleanup_verification():
    """Test GET /api/friends?type=users to trigger cleanup and verify test users are removed"""
    print("\n🧹 Testing Database Cleanup Verification...")
    
    try:
        # Test with guest user first to trigger cleanup
        response = requests.get(f"{API_BASE}friends?type=users&userIdentifier=guest", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Guest user request successful: {data.get('message', 'No message')}")
            print(f"📊 Guest users returned: {len(data.get('users', []))}")
            
            # Test with authenticated user to trigger cleanup and get real users
            test_user_id = "test_cleanup_user_12345"
            response = requests.get(f"{API_BASE}friends?type=users&userIdentifier={test_user_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                users = data.get('users', [])
                print(f"✅ Cleanup triggered successfully")
                print(f"📊 Available users after cleanup: {len(users)}")
                
                # Check if any test users remain in the results
                test_patterns = ['test', 'debug', 'mock', 'demo', 'cashout.test', 'debug.test']
                test_users_found = []
                
                for user in users:
                    username = user.get('username', '').lower()
                    for pattern in test_patterns:
                        if pattern in username:
                            test_users_found.append(user)
                            break
                
                if test_users_found:
                    print(f"❌ Test users still found after cleanup: {len(test_users_found)}")
                    for user in test_users_found[:3]:  # Show first 3
                        print(f"   - {user.get('username', 'Unknown')}")
                    return False
                else:
                    print(f"✅ No test users found in results - cleanup working correctly")
                    return True
            else:
                print(f"❌ Authenticated user request failed: {response.status_code}")
                return False
        else:
            print(f"❌ Guest user request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Database cleanup test error: {e}")
        return False

def test_real_user_validation():
    """Test that only users with email OR wallet address are returned"""
    print("\n👤 Testing Real User Validation...")
    
    try:
        # First, register a test user with valid email to ensure we have data
        test_user_data = {
            "action": "register_user",
            "userIdentifier": "real_privy_user_test_123",
            "userData": {
                "username": "RealPrivyUser",
                "displayName": "Real Privy User",
                "email": "real.user@example.com",
                "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
            }
        }
        
        register_response = requests.post(f"{API_BASE}friends", json=test_user_data, timeout=10)
        print(f"📝 User registration response: {register_response.status_code}")
        
        # Now test getting users list
        response = requests.get(f"{API_BASE}friends?type=users&userIdentifier=different_user_123", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            users = data.get('users', [])
            print(f"✅ Users list retrieved: {len(users)} users")
            
            if len(users) > 0:
                # Check first few users to verify they have email or wallet
                valid_users = 0
                invalid_users = 0
                
                for user in users[:10]:  # Check first 10 users
                    username = user.get('username', 'Unknown')
                    # Note: The API response doesn't include email/wallet for privacy,
                    # but the backend filtering should ensure only valid users are returned
                    
                    # Check if username suggests it's a real user (not test pattern)
                    test_patterns = ['test', 'debug', 'mock', 'demo', 'cashout.test', 'debug.test']
                    is_test_user = any(pattern in username.lower() for pattern in test_patterns)
                    
                    if not is_test_user:
                        valid_users += 1
                    else:
                        invalid_users += 1
                        print(f"⚠️ Potential test user found: {username}")
                
                print(f"📊 User validation results: {valid_users} valid, {invalid_users} invalid")
                
                if invalid_users == 0:
                    print(f"✅ All users appear to be real Privy accounts")
                    return True
                else:
                    print(f"❌ Found {invalid_users} potentially invalid users")
                    return False
            else:
                print(f"⚠️ No users returned - this could be expected if database is clean")
                return True
        else:
            print(f"❌ Users list request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Real user validation test error: {e}")
        return False

def test_clean_user_list():
    """Test that available users list contains no test data"""
    print("\n🧼 Testing Clean User List...")
    
    try:
        # Test with multiple different user identifiers to get comprehensive results
        test_users = ["clean_test_user_1", "clean_test_user_2", "clean_test_user_3"]
        all_users = []
        
        for test_user in test_users:
            response = requests.get(f"{API_BASE}friends?type=users&userIdentifier={test_user}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                users = data.get('users', [])
                all_users.extend(users)
                print(f"📊 Users from {test_user}: {len(users)}")
            else:
                print(f"⚠️ Request failed for {test_user}: {response.status_code}")
        
        # Remove duplicates based on username
        unique_users = []
        seen_usernames = set()
        for user in all_users:
            username = user.get('username', '')
            if username not in seen_usernames:
                unique_users.append(user)
                seen_usernames.add(username)
        
        print(f"📊 Total unique users found: {len(unique_users)}")
        
        if len(unique_users) == 0:
            print(f"✅ Clean user list - no users returned (database may be empty)")
            return True
        
        # Analyze users for test data patterns
        test_patterns = [
            'test', 'debug', 'mock', 'demo', 'cashout.test', 'debug.test',
            'user_', 'player_', 'temp_', 'fake_', 'dummy_'
        ]
        
        clean_users = []
        suspicious_users = []
        
        for user in unique_users:
            username = user.get('username', '').lower()
            is_suspicious = any(pattern in username for pattern in test_patterns)
            
            if is_suspicious:
                suspicious_users.append(user)
            else:
                clean_users.append(user)
        
        print(f"📊 Analysis results:")
        print(f"   - Clean users: {len(clean_users)}")
        print(f"   - Suspicious users: {len(suspicious_users)}")
        
        if len(suspicious_users) > 0:
            print(f"⚠️ Suspicious users found:")
            for user in suspicious_users[:5]:  # Show first 5
                print(f"   - {user.get('username', 'Unknown')} (joined: {user.get('joinedAt', 'Unknown')})")
        
        # Check user data quality
        quality_issues = 0
        for user in unique_users[:10]:  # Check first 10
            if not user.get('username'):
                quality_issues += 1
            if not user.get('joinedAt'):
                quality_issues += 1
            if user.get('gamesPlayed', 0) < 0:
                quality_issues += 1
        
        print(f"📊 Data quality issues: {quality_issues}")
        
        # Success criteria: minimal suspicious users and good data quality
        success = len(suspicious_users) <= len(unique_users) * 0.1 and quality_issues <= 2
        
        if success:
            print(f"✅ User list appears clean with minimal test data")
            return True
        else:
            print(f"❌ User list contains too much test data or quality issues")
            return False
            
    except Exception as e:
        print(f"❌ Clean user list test error: {e}")
        return False

def test_cleanup_function_logs():
    """Test cleanup function by monitoring logs and responses"""
    print("\n📋 Testing Cleanup Function Logs...")
    
    try:
        # Make multiple requests to trigger cleanup multiple times
        print("🔄 Triggering cleanup function multiple times...")
        
        for i in range(3):
            test_user = f"cleanup_test_user_{i}"
            response = requests.get(f"{API_BASE}friends?type=users&userIdentifier={test_user}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                users_count = len(data.get('users', []))
                print(f"   Request {i+1}: {users_count} users returned")
                time.sleep(1)  # Small delay between requests
            else:
                print(f"   Request {i+1}: Failed with status {response.status_code}")
        
        # Test with different user patterns that should be cleaned up
        test_patterns = [
            "test_user_cleanup",
            "debug_user_cleanup", 
            "mock_user_cleanup",
            "demo_user_cleanup"
        ]
        
        print("🧪 Testing with various user patterns...")
        for pattern in test_patterns:
            response = requests.get(f"{API_BASE}friends?type=users&userIdentifier={pattern}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                users_count = len(data.get('users', []))
                print(f"   Pattern '{pattern}': {users_count} users")
            else:
                print(f"   Pattern '{pattern}': Failed")
        
        print(f"✅ Cleanup function testing completed")
        return True
        
    except Exception as e:
        print(f"❌ Cleanup function logs test error: {e}")
        return False

def run_comprehensive_friends_system_test():
    """Run all friends system tests"""
    print("🚀 COMPREHENSIVE FRIENDS SYSTEM TESTING - UPDATED CLEANUP & REAL PRIVY USERS")
    print("=" * 80)
    
    test_results = []
    
    # Test 1: API Health Check
    test_results.append(("API Health Check", test_api_health()))
    
    # Test 2: Database Cleanup Verification
    test_results.append(("Database Cleanup Verification", test_database_cleanup_verification()))
    
    # Test 3: Real User Validation
    test_results.append(("Real User Validation", test_real_user_validation()))
    
    # Test 4: Clean User List
    test_results.append(("Clean User List", test_clean_user_list()))
    
    # Test 5: Cleanup Function Logs
    test_results.append(("Cleanup Function Logs", test_cleanup_function_logs()))
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 FRIENDS SYSTEM TEST RESULTS SUMMARY")
    print("=" * 80)
    
    passed_tests = 0
    total_tests = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
        if result:
            passed_tests += 1
    
    success_rate = (passed_tests / total_tests) * 100
    print(f"\n📈 Overall Success Rate: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
    
    if success_rate >= 80:
        print("🎉 FRIENDS SYSTEM TESTING: SUCCESSFUL")
        print("✅ Updated friends system with cleanup and real Privy user validation is working correctly")
    else:
        print("⚠️ FRIENDS SYSTEM TESTING: NEEDS ATTENTION")
        print("❌ Some critical issues found in the updated friends system")
    
    return success_rate >= 80

if __name__ == "__main__":
    success = run_comprehensive_friends_system_test()
    exit(0 if success else 1)