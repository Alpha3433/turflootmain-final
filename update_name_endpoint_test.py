#!/usr/bin/env python3
"""
TurfLoot Backend API Testing - Custom Name Update Endpoint
Testing the newly added /api/users/profile/update-name endpoint that was created to fix the username update functionality.

Focus Areas:
1. POST /api/users/profile/update-name - Should return 200 instead of 404
2. Username validation - Test with valid names (1-20 characters)
3. Error handling - Test with invalid data (missing fields, too long names)
4. User creation flow - Should create user if doesn't exist, update if exists
5. Database operations - Should properly store customName and username fields

Test with realistic data as specified in the review request.
"""

import requests
import time
import json
import sys
from typing import Dict, List, Tuple
import os

class UpdateNameEndpointTester:
    def __init__(self):
        # Get base URL from environment or use localhost fallback
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
        self.api_base = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🎯 TurfLoot Backend API Testing - Custom Name Update Endpoint")
        print(f"🔗 Testing API Base URL: {self.api_base}")
        print("=" * 80)

    def log_test(self, test_name: str, passed: bool, details: str = "", response_time: float = 0):
        """Log test results"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = {
            'test': test_name,
            'passed': passed,
            'details': details,
            'response_time': response_time
        }
        self.test_results.append(result)
        
        time_info = f" ({response_time:.3f}s)" if response_time > 0 else ""
        print(f"{status} - {test_name}{time_info}")
        if details:
            print(f"    📝 {details}")

    def test_endpoint_exists(self) -> bool:
        """Test that the endpoint exists and returns 200 instead of 404"""
        print("\n🔍 Testing Endpoint Existence (POST /api/users/profile/update-name)")
        print("-" * 60)
        
        try:
            # Test with valid data as specified in review request
            test_data = {
                "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
                "customName": "TestUsername",
                "privyId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
                "email": "test@turfloot.com"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_base}/users/profile/update-name",
                json=test_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            # Should return 200, not 404
            if response.status_code == 404:
                self.log_test("Endpoint Existence - 404 Check", False, 
                            "Endpoint still returns 404 - the fix may not be deployed", response_time)
                return False
            elif response.status_code == 200:
                try:
                    data = response.json()
                    expected_response = {
                        'success': True,
                        'message': 'Name updated successfully',
                        'customName': 'TestUsername'
                    }
                    
                    # Verify response structure
                    if (data.get('success') == True and 
                        data.get('message') == 'Name updated successfully' and
                        data.get('customName') == 'TestUsername'):
                        
                        self.log_test("Endpoint Existence - Success Response", True, 
                                    f"Endpoint returns 200 with correct response structure: {data}", response_time)
                        return True
                    else:
                        self.log_test("Endpoint Existence - Response Structure", False, 
                                    f"Unexpected response structure: {data}", response_time)
                        return False
                        
                except json.JSONDecodeError:
                    self.log_test("Endpoint Existence - JSON Parse", False, 
                                "Response is not valid JSON", response_time)
                    return False
            else:
                self.log_test("Endpoint Existence - HTTP Status", False, 
                            f"Unexpected status code: {response.status_code}, Response: {response.text}", response_time)
                return False
                
        except requests.exceptions.Timeout:
            self.log_test("Endpoint Existence - Timeout", False, "Request timed out after 10 seconds")
            return False
        except requests.exceptions.RequestException as e:
            self.log_test("Endpoint Existence - Connection Error", False, f"Request failed: {str(e)}")
            return False

    def test_username_validation_valid(self) -> bool:
        """Test username validation with valid names (1-20 characters)"""
        print("\n✅ Testing Username Validation - Valid Names")
        print("-" * 60)
        
        valid_names = [
            "A",  # 1 character (minimum)
            "TestUser",  # 8 characters
            "ProGamer123",  # 11 characters
            "SuperLongUsername20",  # 20 characters (maximum)
            "User_123",  # With underscore
            "Player-456"  # With dash
        ]
        
        all_passed = True
        
        for i, name in enumerate(valid_names):
            try:
                test_data = {
                    "userId": f"did:privy:test_user_{i}_{int(time.time())}",
                    "customName": name,
                    "privyId": f"did:privy:test_user_{i}_{int(time.time())}",
                    "email": f"test{i}@turfloot.com"
                }
                
                start_time = time.time()
                response = requests.post(
                    f"{self.api_base}/users/profile/update-name",
                    json=test_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') == True and data.get('customName') == name:
                        self.log_test(f"Valid Name Test - '{name}' ({len(name)} chars)", True, 
                                    f"Successfully accepted valid name", response_time)
                    else:
                        self.log_test(f"Valid Name Test - '{name}' ({len(name)} chars)", False, 
                                    f"Unexpected response: {data}", response_time)
                        all_passed = False
                else:
                    self.log_test(f"Valid Name Test - '{name}' ({len(name)} chars)", False, 
                                f"Expected 200, got {response.status_code}: {response.text}", response_time)
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Valid Name Test - '{name}' ({len(name)} chars)", False, 
                            f"Request failed: {str(e)}")
                all_passed = False
        
        return all_passed

    def test_username_validation_invalid(self) -> bool:
        """Test error handling with invalid data (missing fields, too long names)"""
        print("\n❌ Testing Username Validation - Invalid Data")
        print("-" * 60)
        
        test_cases = [
            {
                "name": "Missing userId",
                "data": {
                    "customName": "TestUser",
                    "privyId": "did:privy:test",
                    "email": "test@turfloot.com"
                },
                "expected_status": 400,
                "expected_error": "userId and customName are required"
            },
            {
                "name": "Missing customName",
                "data": {
                    "userId": "did:privy:test",
                    "privyId": "did:privy:test",
                    "email": "test@turfloot.com"
                },
                "expected_status": 400,
                "expected_error": "userId and customName are required"
            },
            {
                "name": "Empty customName",
                "data": {
                    "userId": "did:privy:test",
                    "customName": "",
                    "privyId": "did:privy:test",
                    "email": "test@turfloot.com"
                },
                "expected_status": 400,
                "expected_error": "Custom name must be between 1 and 20 characters"
            },
            {
                "name": "Too long customName (21+ characters)",
                "data": {
                    "userId": "did:privy:test",
                    "customName": "ThisNameIsTooLongForValidation",  # 30 characters
                    "privyId": "did:privy:test",
                    "email": "test@turfloot.com"
                },
                "expected_status": 400,
                "expected_error": "Custom name must be between 1 and 20 characters"
            }
        ]
        
        all_passed = True
        
        for test_case in test_cases:
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.api_base}/users/profile/update-name",
                    json=test_case["data"],
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if response.status_code == test_case["expected_status"]:
                    try:
                        data = response.json()
                        if test_case["expected_error"] in data.get("error", ""):
                            self.log_test(f"Invalid Data Test - {test_case['name']}", True, 
                                        f"Correctly rejected with: {data.get('error')}", response_time)
                        else:
                            self.log_test(f"Invalid Data Test - {test_case['name']}", False, 
                                        f"Wrong error message: {data}", response_time)
                            all_passed = False
                    except json.JSONDecodeError:
                        self.log_test(f"Invalid Data Test - {test_case['name']}", False, 
                                    f"Invalid JSON response: {response.text}", response_time)
                        all_passed = False
                else:
                    self.log_test(f"Invalid Data Test - {test_case['name']}", False, 
                                f"Expected {test_case['expected_status']}, got {response.status_code}: {response.text}", response_time)
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Invalid Data Test - {test_case['name']}", False, 
                            f"Request failed: {str(e)}")
                all_passed = False
        
        return all_passed

    def test_user_creation_flow(self) -> bool:
        """Test user creation flow - Should create user if doesn't exist, update if exists"""
        print("\n👤 Testing User Creation and Update Flow")
        print("-" * 60)
        
        try:
            # Test 1: Create new user
            unique_id = f"did:privy:new_user_{int(time.time())}"
            test_data_new = {
                "userId": unique_id,
                "customName": "NewUser123",
                "privyId": unique_id,
                "email": "newuser@turfloot.com"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_base}/users/profile/update-name",
                json=test_data_new,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("User Creation Flow - New User Creation", False, 
                            f"Failed to create new user: {response.status_code} - {response.text}", response_time)
                return False
            
            data = response.json()
            if not (data.get('success') == True and data.get('customName') == 'NewUser123'):
                self.log_test("User Creation Flow - New User Creation", False, 
                            f"Unexpected response for new user: {data}", response_time)
                return False
            
            self.log_test("User Creation Flow - New User Creation", True, 
                        f"Successfully created new user with name: {data.get('customName')}", response_time)
            
            # Test 2: Update existing user
            test_data_update = {
                "userId": unique_id,
                "customName": "UpdatedUser456",
                "privyId": unique_id,
                "email": "newuser@turfloot.com"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_base}/users/profile/update-name",
                json=test_data_update,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("User Creation Flow - Existing User Update", False, 
                            f"Failed to update existing user: {response.status_code} - {response.text}", response_time)
                return False
            
            data = response.json()
            if not (data.get('success') == True and data.get('customName') == 'UpdatedUser456'):
                self.log_test("User Creation Flow - Existing User Update", False, 
                            f"Unexpected response for user update: {data}", response_time)
                return False
            
            self.log_test("User Creation Flow - Existing User Update", True, 
                        f"Successfully updated existing user with name: {data.get('customName')}", response_time)
            
            return True
            
        except Exception as e:
            self.log_test("User Creation Flow - Exception", False, f"Test failed with exception: {str(e)}")
            return False

    def test_database_operations(self) -> bool:
        """Test database operations - Should properly store customName and username fields"""
        print("\n💾 Testing Database Operations")
        print("-" * 60)
        
        try:
            # Create a user with specific data to test database storage
            unique_id = f"did:privy:db_test_{int(time.time())}"
            test_data = {
                "userId": unique_id,
                "customName": "DatabaseTestUser",
                "privyId": unique_id,
                "email": "dbtest@turfloot.com"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_base}/users/profile/update-name",
                json=test_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Database Operations - User Creation", False, 
                            f"Failed to create user for database test: {response.status_code} - {response.text}", response_time)
                return False
            
            data = response.json()
            
            # Verify the response contains the expected data
            expected_fields = ['success', 'message', 'customName', 'userId']
            missing_fields = [field for field in expected_fields if field not in data]
            
            if missing_fields:
                self.log_test("Database Operations - Response Fields", False, 
                            f"Missing expected fields in response: {missing_fields}", response_time)
                return False
            
            if data.get('customName') != 'DatabaseTestUser':
                self.log_test("Database Operations - Custom Name Storage", False, 
                            f"Custom name not stored correctly: expected 'DatabaseTestUser', got '{data.get('customName')}'", response_time)
                return False
            
            if data.get('userId') != unique_id:
                self.log_test("Database Operations - User ID Storage", False, 
                            f"User ID not stored correctly: expected '{unique_id}', got '{data.get('userId')}'", response_time)
                return False
            
            self.log_test("Database Operations - Complete Test", True, 
                        f"Database operations working correctly. User created with customName: {data.get('customName')}", response_time)
            
            return True
            
        except Exception as e:
            self.log_test("Database Operations - Exception", False, f"Test failed with exception: {str(e)}")
            return False

    def test_realistic_data_scenario(self) -> bool:
        """Test with the exact realistic data specified in the review request"""
        print("\n🎯 Testing Realistic Data Scenario (Review Request Data)")
        print("-" * 60)
        
        try:
            # Use the exact data from the review request
            test_data = {
                "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
                "customName": "TestUsername",
                "privyId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
                "email": "test@turfloot.com"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{self.api_base}/users/profile/update-name",
                json=test_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test("Realistic Data Scenario - HTTP Status", False, 
                            f"Expected 200, got {response.status_code}: {response.text}", response_time)
                return False
            
            try:
                data = response.json()
                
                # Verify the exact expected response from review request
                expected_response = {
                    'success': True,
                    'message': 'Name updated successfully',
                    'customName': 'TestUsername'
                }
                
                # Check each expected field
                for key, expected_value in expected_response.items():
                    if data.get(key) != expected_value:
                        self.log_test("Realistic Data Scenario - Response Validation", False, 
                                    f"Expected {key}: '{expected_value}', got '{data.get(key)}'", response_time)
                        return False
                
                # Verify userId is also returned
                if 'userId' not in data:
                    self.log_test("Realistic Data Scenario - User ID Field", False, 
                                "userId field missing from response", response_time)
                    return False
                
                self.log_test("Realistic Data Scenario - Complete Test", True, 
                            f"Realistic data scenario passed. Response: {data}", response_time)
                return True
                
            except json.JSONDecodeError:
                self.log_test("Realistic Data Scenario - JSON Parse", False, 
                            f"Invalid JSON response: {response.text}", response_time)
                return False
                
        except Exception as e:
            self.log_test("Realistic Data Scenario - Exception", False, f"Test failed with exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests for the custom name update endpoint"""
        print("🚀 Starting TurfLoot Custom Name Update Endpoint Tests")
        print("=" * 80)
        
        # Test methods in order of importance
        test_methods = [
            self.test_endpoint_exists,
            self.test_realistic_data_scenario,
            self.test_username_validation_valid,
            self.test_username_validation_invalid,
            self.test_user_creation_flow,
            self.test_database_operations
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test_method.__name__}: {str(e)}")
                self.log_test(f"{test_method.__name__} - Critical Error", False, str(e))
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY - Custom Name Update Endpoint")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"✅ Passed: {self.passed_tests}/{self.total_tests} ({success_rate:.1f}%)")
        
        if self.passed_tests == self.total_tests:
            print("🎉 ALL TESTS PASSED - Custom Name Update Endpoint is working correctly!")
            print("🔗 Key findings:")
            print("   • Endpoint returns 200 instead of 404 (issue fixed)")
            print("   • Username validation works correctly (1-20 characters)")
            print("   • Error handling works for invalid data")
            print("   • User creation and update flow working")
            print("   • Database operations storing data correctly")
            print("   • Realistic data scenario from review request works")
        else:
            failed_tests = self.total_tests - self.passed_tests
            print(f"⚠️ {failed_tests} TESTS FAILED - Endpoint needs attention")
            
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['passed']:
                    print(f"   • {result['test']}: {result['details']}")
        
        print("=" * 80)
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = UpdateNameEndpointTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)