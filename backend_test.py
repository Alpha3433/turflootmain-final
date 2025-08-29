#!/usr/bin/env python3
"""
Backend Testing Suite for Party Lobby State Synchronization Fix
Testing the specific issue where after refreshing the browser, users can't see their existing party
but the backend still has them in the party, causing a "You already have an active party" error.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
PARTY_API_BASE = f"{BASE_URL}/party-api"

# Test user IDs from review request
TEST_USER_ANTH = "did:privy:cmeksdeoe00gzl10bsienvnbk"
TEST_USER_ROBIEE = "did:privy:cme20s0fl005okz0bmxcr0cp0"

class PartyLobbyStateSyncTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, passed, details="", response_time=None):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
            
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        if details:
            print(f"   Details: {details}")
            
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        })
        
    def make_request(self, method, url, data=None, params=None):
        """Make HTTP request with error handling"""
        try:
            start_time = time.time()
            
            if method.upper() == 'GET':
                response = requests.get(url, params=params, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            response_time = time.time() - start_time
            
            return {
                'success': True,
                'response': response,
                'response_time': response_time,
                'status_code': response.status_code
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e),
                'response_time': time.time() - start_time if 'start_time' in locals() else 0
            }
    
    def test_party_status_detection(self):
        """Test 1: Party Status Detection - GET /party-api/current"""
        print("\n🎯 TEST CATEGORY 1: PARTY STATUS DETECTION")
        print("=" * 60)
        
        # Test 1.1: Get current party status for user with existing party
        result = self.make_request('GET', f"{PARTY_API_BASE}/current", params={'userId': TEST_USER_ANTH})
        
        if not result['success']:
            self.log_test("Party Status Detection - API Connectivity", False, 
                         f"Failed to connect: {result['error']}", result['response_time'])
            return False
            
        response = result['response']
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check response structure
                has_required_fields = all(field in data for field in ['party', 'hasParty', 'timestamp'])
                self.log_test("Party Status Response Structure", has_required_fields,
                             f"Response fields: {list(data.keys())}", result['response_time'])
                
                # Check if user has party
                has_party = data.get('hasParty', False)
                party_data = data.get('party')
                
                if has_party and party_data:
                    # Validate party data structure
                    required_party_fields = ['id', 'name', 'members', 'memberCount', 'ownerId', 'status']
                    party_fields_present = all(field in party_data for field in required_party_fields)
                    
                    self.log_test("Party Data Structure Validation", party_fields_present,
                                 f"Party fields: {list(party_data.keys()) if party_data else 'None'}", 
                                 result['response_time'])
                    
                    # Check member information
                    members = party_data.get('members', [])
                    if members:
                        member = members[0]
                        member_fields = ['id', 'username', 'role']
                        member_structure_valid = all(field in member for field in member_fields)
                        
                        self.log_test("Party Member Data Structure", member_structure_valid,
                                     f"Member fields: {list(member.keys()) if member else 'None'}")
                        
                        # Check if user is properly identified as party owner/member
                        user_in_party = any(m['id'] == TEST_USER_ANTH for m in members)
                        self.log_test("User Party Membership Detection", user_in_party,
                                     f"User {TEST_USER_ANTH} found in party members: {user_in_party}")
                    else:
                        self.log_test("Party Member Data Structure", False, "No members found in party")
                        
                    return True
                else:
                    self.log_test("Party Status Detection - User Has Party", False,
                                 f"hasParty: {has_party}, party_data: {bool(party_data)}")
                    return False
                    
            except json.JSONDecodeError:
                self.log_test("Party Status Response JSON", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Party Status Detection - HTTP Status", False, 
                         f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    
    def test_create_party_conflict_handling(self):
        """Test 2: Create Party Conflict Handling - POST /party-api/create when user already in party"""
        print("\n🎯 TEST CATEGORY 2: CREATE PARTY CONFLICT HANDLING")
        print("=" * 60)
        
        # First, ensure user has a party by creating one
        create_data = {
            'ownerId': TEST_USER_ANTH,
            'ownerUsername': 'anth',
            'partyName': 'Test Party for Conflict'
        }
        
        result = self.make_request('POST', f"{PARTY_API_BASE}/create", data=create_data)
        
        if result['success'] and result['response'].status_code in [200, 400]:
            # Now try to create another party (should fail with proper error)
            conflict_data = {
                'ownerId': TEST_USER_ANTH,
                'ownerUsername': 'anth',
                'partyName': 'Second Party Attempt'
            }
            
            conflict_result = self.make_request('POST', f"{PARTY_API_BASE}/create", data=conflict_data)
            
            if conflict_result['success']:
                response = conflict_result['response']
                
                if response.status_code == 400 or response.status_code == 500:
                    try:
                        error_data = response.json()
                        error_message = error_data.get('error', '').lower()
                        
                        # Check for proper conflict error message
                        conflict_detected = any(phrase in error_message for phrase in [
                            'already have an active party',
                            'already have a party',
                            'existing party',
                            'active party'
                        ])
                        
                        self.log_test("Create Party Conflict Detection", conflict_detected,
                                     f"Error message: {error_data.get('error', 'No error message')}", 
                                     conflict_result['response_time'])
                        
                        # Verify existing party data is preserved
                        status_check = self.make_request('GET', f"{PARTY_API_BASE}/current", 
                                                       params={'userId': TEST_USER_ANTH})
                        
                        if status_check['success'] and status_check['response'].status_code == 200:
                            status_data = status_check['response'].json()
                            party_preserved = status_data.get('hasParty', False)
                            
                            self.log_test("Existing Party Data Preservation", party_preserved,
                                         f"Party still exists after conflict: {party_preserved}")
                        else:
                            self.log_test("Existing Party Data Preservation", False,
                                         "Could not verify party preservation")
                        
                        return conflict_detected
                        
                    except json.JSONDecodeError:
                        self.log_test("Create Party Conflict Response JSON", False, "Invalid JSON in error response")
                        return False
                else:
                    self.log_test("Create Party Conflict HTTP Status", False,
                                 f"Expected 400/500, got {response.status_code}")
                    return False
            else:
                self.log_test("Create Party Conflict Request", False, 
                             f"Request failed: {conflict_result['error']}")
                return False
        else:
            self.log_test("Initial Party Creation for Conflict Test", False,
                         f"Could not create initial party: {result.get('error', 'Unknown error')}")
            return False
    
    def test_party_data_structure_validation(self):
        """Test 3: Party Data Structure Validation"""
        print("\n🎯 TEST CATEGORY 3: PARTY DATA STRUCTURE VALIDATION")
        print("=" * 60)
        
        # Get current party data
        result = self.make_request('GET', f"{PARTY_API_BASE}/current", params={'userId': TEST_USER_ANTH})
        
        if not result['success']:
            self.log_test("Party Data Structure - API Access", False, 
                         f"API request failed: {result['error']}")
            return False
            
        response = result['response']
        
        if response.status_code == 200:
            try:
                data = response.json()
                party = data.get('party')
                
                if not party:
                    self.log_test("Party Data Structure - Party Exists", False, "No party data returned")
                    return False
                
                # Test required fields
                required_fields = {
                    'id': str,
                    'name': str,
                    'members': list,
                    'memberCount': int,
                    'ownerId': str,
                    'status': str,
                    'maxMembers': int
                }
                
                all_fields_valid = True
                missing_fields = []
                type_errors = []
                
                for field, expected_type in required_fields.items():
                    if field not in party:
                        missing_fields.append(field)
                        all_fields_valid = False
                    elif not isinstance(party[field], expected_type):
                        type_errors.append(f"{field}: expected {expected_type.__name__}, got {type(party[field]).__name__}")
                        all_fields_valid = False
                
                self.log_test("Party Required Fields Validation", all_fields_valid,
                             f"Missing: {missing_fields}, Type errors: {type_errors}", 
                             result['response_time'])
                
                # Test member data structure
                members = party.get('members', [])
                if members:
                    member = members[0]
                    member_required_fields = ['id', 'username', 'role']
                    
                    member_fields_valid = all(field in member for field in member_required_fields)
                    self.log_test("Party Member Fields Validation", member_fields_valid,
                                 f"Member fields: {list(member.keys())}")
                    
                    # Test role information
                    valid_roles = ['owner', 'member']
                    role_valid = member.get('role') in valid_roles
                    self.log_test("Party Member Role Validation", role_valid,
                                 f"Role: {member.get('role')}, Valid roles: {valid_roles}")
                else:
                    self.log_test("Party Member Data Validation", False, "No members in party")
                
                # Test party owner information
                owner_id = party.get('ownerId')
                owner_in_members = any(m.get('id') == owner_id and m.get('role') == 'owner' 
                                     for m in members)
                self.log_test("Party Owner Information Validation", owner_in_members,
                             f"Owner ID {owner_id} found as owner in members: {owner_in_members}")
                
                return all_fields_valid and member_fields_valid and role_valid and owner_in_members
                
            except json.JSONDecodeError:
                self.log_test("Party Data Structure - JSON Parsing", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Party Data Structure - HTTP Status", False,
                         f"Status: {response.status_code}")
            return False
    
    def test_state_synchronization_workflow(self):
        """Test 4: State Synchronization - Complete workflow testing"""
        print("\n🎯 TEST CATEGORY 4: STATE SYNCHRONIZATION WORKFLOW")
        print("=" * 60)
        
        # Step 1: Create party
        create_data = {
            'ownerId': TEST_USER_ROBIEE,
            'ownerUsername': 'robiee',
            'partyName': 'Sync Test Party'
        }
        
        create_result = self.make_request('POST', f"{PARTY_API_BASE}/create", data=create_data)
        
        if not create_result['success'] or create_result['response'].status_code not in [200, 400]:
            self.log_test("State Sync - Party Creation", False,
                         f"Failed to create party: {create_result.get('error', 'Unknown error')}")
            return False
        
        # If party already exists, that's fine for this test
        party_created = create_result['response'].status_code == 200
        
        # Step 2: Check status immediately after creation
        immediate_status = self.make_request('GET', f"{PARTY_API_BASE}/current", 
                                           params={'userId': TEST_USER_ROBIEE})
        
        if immediate_status['success'] and immediate_status['response'].status_code == 200:
            immediate_data = immediate_status['response'].json()
            immediate_has_party = immediate_data.get('hasParty', False)
            
            self.log_test("State Sync - Immediate Status Check", immediate_has_party,
                         f"Party detected immediately after creation: {immediate_has_party}",
                         immediate_status['response_time'])
        else:
            self.log_test("State Sync - Immediate Status Check", False,
                         "Failed to check status after creation")
            return False
        
        # Step 3: Simulate refresh delay and check again
        time.sleep(1)  # Brief delay to simulate refresh
        
        refresh_status = self.make_request('GET', f"{PARTY_API_BASE}/current", 
                                         params={'userId': TEST_USER_ROBIEE})
        
        if refresh_status['success'] and refresh_status['response'].status_code == 200:
            refresh_data = refresh_status['response'].json()
            refresh_has_party = refresh_data.get('hasParty', False)
            
            self.log_test("State Sync - Post-Refresh Status Check", refresh_has_party,
                         f"Party detected after refresh: {refresh_has_party}",
                         refresh_status['response_time'])
            
            # Step 4: Attempt to create another party (should fail)
            if refresh_has_party:
                conflict_attempt = self.make_request('POST', f"{PARTY_API_BASE}/create", 
                                                   data={
                                                       'ownerId': TEST_USER_ROBIEE,
                                                       'ownerUsername': 'robiee',
                                                       'partyName': 'Conflict Party'
                                                   })
                
                if conflict_attempt['success']:
                    conflict_response = conflict_attempt['response']
                    conflict_prevented = conflict_response.status_code in [400, 500]
                    
                    self.log_test("State Sync - Conflict Prevention", conflict_prevented,
                                 f"Conflict properly prevented: {conflict_prevented}, Status: {conflict_response.status_code}")
                else:
                    self.log_test("State Sync - Conflict Prevention", False,
                                 "Failed to test conflict prevention")
            
            return immediate_has_party and refresh_has_party
        else:
            self.log_test("State Sync - Post-Refresh Status Check", False,
                         "Failed to check status after refresh")
            return False
    
    def test_edge_cases(self):
        """Test 5: Edge Cases and Error Handling"""
        print("\n🎯 TEST CATEGORY 5: EDGE CASES AND ERROR HANDLING")
        print("=" * 60)
        
        # Test 5.1: Invalid user ID
        invalid_user_result = self.make_request('GET', f"{PARTY_API_BASE}/current", 
                                              params={'userId': 'invalid-user-id'})
        
        if invalid_user_result['success']:
            response = invalid_user_result['response']
            # Should return valid response even for non-existent user (no party)
            if response.status_code == 200:
                try:
                    data = response.json()
                    has_party = data.get('hasParty', True)  # Should be False for non-existent user
                    
                    self.log_test("Edge Case - Invalid User ID", not has_party,
                                 f"Non-existent user correctly shows no party: {not has_party}",
                                 invalid_user_result['response_time'])
                except json.JSONDecodeError:
                    self.log_test("Edge Case - Invalid User ID JSON", False, "Invalid JSON response")
            else:
                self.log_test("Edge Case - Invalid User ID HTTP", False,
                             f"Unexpected status: {response.status_code}")
        else:
            self.log_test("Edge Case - Invalid User ID Request", False,
                         f"Request failed: {invalid_user_result['error']}")
        
        # Test 5.2: Missing userId parameter
        missing_param_result = self.make_request('GET', f"{PARTY_API_BASE}/current")
        
        if missing_param_result['success']:
            response = missing_param_result['response']
            proper_error = response.status_code == 400
            
            self.log_test("Edge Case - Missing userId Parameter", proper_error,
                         f"Proper 400 error for missing userId: {proper_error}, Status: {response.status_code}",
                         missing_param_result['response_time'])
        else:
            self.log_test("Edge Case - Missing userId Parameter Request", False,
                         f"Request failed: {missing_param_result['error']}")
        
        # Test 5.3: Empty userId parameter
        empty_param_result = self.make_request('GET', f"{PARTY_API_BASE}/current", 
                                             params={'userId': ''})
        
        if empty_param_result['success']:
            response = empty_param_result['response']
            proper_error = response.status_code == 400
            
            self.log_test("Edge Case - Empty userId Parameter", proper_error,
                         f"Proper 400 error for empty userId: {proper_error}, Status: {response.status_code}",
                         empty_param_result['response_time'])
        else:
            self.log_test("Edge Case - Empty userId Parameter Request", False,
                         f"Request failed: {empty_param_result['error']}")
    
    def run_all_tests(self):
        """Run all test categories"""
        print("🚀 STARTING PARTY LOBBY STATE SYNCHRONIZATION TESTING")
        print("=" * 80)
        print(f"Testing against: {BASE_URL}")
        print(f"Test User (ANTH): {TEST_USER_ANTH}")
        print(f"Test User (ROBIEE): {TEST_USER_ROBIEE}")
        print("=" * 80)
        
        # Run all test categories
        test_categories = [
            ("Party Status Detection", self.test_party_status_detection),
            ("Create Party Conflict Handling", self.test_create_party_conflict_handling),
            ("Party Data Structure Validation", self.test_party_data_structure_validation),
            ("State Synchronization Workflow", self.test_state_synchronization_workflow),
            ("Edge Cases and Error Handling", self.test_edge_cases)
        ]
        
        category_results = []
        
        for category_name, test_method in test_categories:
            try:
                result = test_method()
                category_results.append((category_name, result))
            except Exception as e:
                print(f"❌ CATEGORY FAILED: {category_name} - {str(e)}")
                category_results.append((category_name, False))
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 PARTY LOBBY STATE SYNCHRONIZATION TEST SUMMARY")
        print("=" * 80)
        
        for category_name, result in category_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{status}: {category_name}")
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   Total Tests: {self.total_tests}")
        print(f"   Passed: {self.passed_tests}")
        print(f"   Failed: {self.total_tests - self.passed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        # Determine overall status
        if success_rate >= 90:
            print(f"\n🎉 EXCELLENT: Party Lobby State Synchronization is working correctly!")
        elif success_rate >= 75:
            print(f"\n✅ GOOD: Party Lobby State Synchronization is mostly working with minor issues.")
        elif success_rate >= 50:
            print(f"\n⚠️ MODERATE: Party Lobby State Synchronization has some issues that need attention.")
        else:
            print(f"\n❌ CRITICAL: Party Lobby State Synchronization has major issues requiring immediate fixes.")
        
        return success_rate >= 75

if __name__ == "__main__":
    tester = PartyLobbyStateSyncTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)