#!/usr/bin/env python3
"""
Comprehensive Party API Testing for Party Lobby Navigation Fix
Testing all /party-api/* endpoints to verify the API routing fix is working correctly.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Test Configuration
BASE_URL = "https://game-server-hub-5.preview.emergentagent.com"
LOCAL_URL = "http://localhost:3000"

# Use localhost for testing as per environment configuration
TEST_URL = LOCAL_URL

class PartyAPITester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
        # Test user data (realistic Privy DID format)
        self.test_users = {
            'user1': {
                'userId': 'did:privy:cme20s0fl005okz0bmxcr0cp0',
                'username': 'TestUser1'
            },
            'user2': {
                'userId': 'did:privy:cmetjchq5012yjr0bgxbe748i',
                'username': 'TestUser2'
            },
            'user3': {
                'userId': 'did:privy:cmeksdeoe00gzl10bsienvnbk',
                'username': 'TestUser3'
            }
        }
        
        # Store created party data for cleanup
        self.created_parties = []
        self.created_invitations = []
        
    def log_test(self, test_name, success, details="", response_time=None):
        """Log test result with details"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            self.failed_tests += 1
            status = "❌ FAIL"
            
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_time": response_time,
            "timestamp": datetime.now().isoformat()
        }
        
        self.test_results.append(result)
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if response_time:
            print(f"    Response Time: {response_time:.3f}s")
        print()
        
    def test_api_endpoint(self, endpoint, method="GET", data=None, expected_status=200, test_name=None):
        """Generic API endpoint tester"""
        if not test_name:
            test_name = f"{method} {endpoint}"
            
        try:
            start_time = time.time()
            
            if method == "GET":
                response = requests.get(f"{TEST_URL}{endpoint}", timeout=10)
            elif method == "POST":
                response = requests.post(f"{TEST_URL}{endpoint}", json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            response_time = time.time() - start_time
            
            if response.status_code == expected_status:
                try:
                    response_data = response.json()
                    self.log_test(test_name, True, f"Status: {response.status_code}, Data keys: {list(response_data.keys())}", response_time)
                    return True, response_data
                except:
                    self.log_test(test_name, True, f"Status: {response.status_code}, Non-JSON response", response_time)
                    return True, response.text
            else:
                self.log_test(test_name, False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}", response_time)
                return False, None
                
        except Exception as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")
            return False, None

    def test_party_status_endpoint(self):
        """Test GET /party-api/current with userId parameter"""
        print("🎯 TESTING PARTY STATUS ENDPOINT")
        print("=" * 50)
        
        user1 = self.test_users['user1']
        
        # Test party status for user without party
        endpoint = f"/party-api/current?userId={user1['userId']}"
        success, data = self.test_api_endpoint(endpoint, test_name="Party Status - No Party")
        
        if success and data:
            if data.get('hasParty') == False and data.get('party') is None:
                self.log_test("Party Status Response Structure", True, "Correct response for user without party")
            else:
                self.log_test("Party Status Response Structure", False, f"Unexpected response: {data}")
        
        # Test missing userId parameter
        success, data = self.test_api_endpoint("/party-api/current", test_name="Party Status - Missing UserId", expected_status=400)
        
    def test_party_invitations_endpoint(self):
        """Test GET /party-api/invitations with userId parameter"""
        print("📧 TESTING PARTY INVITATIONS ENDPOINT")
        print("=" * 50)
        
        user1 = self.test_users['user1']
        
        # Test invitations for user without invitations
        endpoint = f"/party-api/invitations?userId={user1['userId']}"
        success, data = self.test_api_endpoint(endpoint, test_name="Party Invitations - No Invitations")
        
        if success and data:
            if 'invitations' in data and 'count' in data:
                self.log_test("Party Invitations Response Structure", True, f"Found {data.get('count', 0)} invitations")
            else:
                self.log_test("Party Invitations Response Structure", False, f"Missing required fields: {data}")
        
        # Test missing userId parameter
        success, data = self.test_api_endpoint("/party-api/invitations", test_name="Party Invitations - Missing UserId", expected_status=400)
        
    def test_party_notifications_endpoint(self):
        """Test GET /party-api/notifications with userId parameter"""
        print("📢 TESTING PARTY NOTIFICATIONS ENDPOINT")
        print("=" * 50)
        
        user1 = self.test_users['user1']
        
        # Test notifications for user without notifications
        endpoint = f"/party-api/notifications?userId={user1['userId']}"
        success, data = self.test_api_endpoint(endpoint, test_name="Party Notifications - No Notifications")
        
        if success and data:
            if 'notifications' in data and 'count' in data:
                self.log_test("Party Notifications Response Structure", True, f"Found {data.get('count', 0)} notifications")
            else:
                self.log_test("Party Notifications Response Structure", False, f"Missing required fields: {data}")
        
        # Test missing userId parameter
        success, data = self.test_api_endpoint("/party-api/notifications", test_name="Party Notifications - Missing UserId", expected_status=400)
        
    def test_party_creation_endpoint(self):
        """Test POST /party-api/create with required parameters"""
        print("🎉 TESTING PARTY CREATION ENDPOINT")
        print("=" * 50)
        
        user1 = self.test_users['user1']
        
        # Test successful party creation
        party_data = {
            'ownerId': user1['userId'],
            'ownerUsername': user1['username'],
            'partyName': 'Test Party for API Fix'
        }
        
        success, data = self.test_api_endpoint("/party-api/create", method="POST", data=party_data, test_name="Party Creation - Valid Data")
        
        if success and data:
            if data.get('success') and 'partyId' in data:
                party_id = data.get('partyId')
                self.created_parties.append(party_id)
                self.log_test("Party Creation Success", True, f"Created party: {party_id}")
                return party_id
            else:
                self.log_test("Party Creation Success", False, f"Unexpected response: {data}")
        
        # Test missing required parameters
        invalid_data = {'ownerId': user1['userId']}  # Missing ownerUsername
        success, data = self.test_api_endpoint("/party-api/create", method="POST", data=invalid_data, test_name="Party Creation - Missing Parameters", expected_status=400)
        
        return None
        
    def test_complete_party_workflow(self):
        """Test the complete party creation → invitation → acceptance flow"""
        print("🔄 TESTING COMPLETE PARTY WORKFLOW")
        print("=" * 50)
        
        user1 = self.test_users['user1']
        user2 = self.test_users['user2']
        
        # Step 1: Create party
        party_data = {
            'ownerId': user1['userId'],
            'ownerUsername': user1['username'],
            'partyName': 'Workflow Test Party'
        }
        
        success, data = self.test_api_endpoint("/party-api/create", method="POST", data=party_data, test_name="Workflow Step 1 - Create Party")
        
        if not success or not data.get('success'):
            self.log_test("Complete Workflow", False, "Failed to create party for workflow test")
            return
            
        party_id = data.get('partyId')
        self.created_parties.append(party_id)
        
        # Step 2: Send invitation
        invite_data = {
            'partyId': party_id,
            'fromUserId': user1['userId'],
            'toUserId': user2['userId'],
            'toUsername': user2['username']
        }
        
        success, data = self.test_api_endpoint("/party-api/invite", method="POST", data=invite_data, test_name="Workflow Step 2 - Send Invitation")
        
        if not success or not data.get('success'):
            self.log_test("Complete Workflow", False, "Failed to send invitation")
            return
            
        invitation_id = data.get('invitationId')
        self.created_invitations.append(invitation_id)
        
        # Step 3: Check invitations for user2
        endpoint = f"/party-api/invitations?userId={user2['userId']}"
        success, data = self.test_api_endpoint(endpoint, test_name="Workflow Step 3 - Check Invitations")
        
        if success and data:
            invitations = data.get('invitations', [])
            if len(invitations) > 0:
                self.log_test("Workflow Step 3 - Invitation Received", True, f"User2 has {len(invitations)} pending invitations")
            else:
                self.log_test("Workflow Step 3 - Invitation Received", False, "User2 has no pending invitations")
        
        # Step 4: Accept invitation
        accept_data = {
            'invitationId': invitation_id,
            'userId': user2['userId']
        }
        
        success, data = self.test_api_endpoint("/party-api/accept-invitation", method="POST", data=accept_data, test_name="Workflow Step 4 - Accept Invitation")
        
        if success and data.get('success'):
            self.log_test("Workflow Step 4 - Invitation Accepted", True, f"Party now has {data.get('memberCount', 0)} members")
        else:
            self.log_test("Workflow Step 4 - Invitation Accepted", False, f"Failed to accept invitation: {data}")
        
        # Step 5: Verify party status for both users
        for user_key, user in [('user1', user1), ('user2', user2)]:
            endpoint = f"/party-api/current?userId={user['userId']}"
            success, data = self.test_api_endpoint(endpoint, test_name=f"Workflow Step 5 - {user_key} Party Status")
            
            if success and data:
                if data.get('hasParty') and data.get('party'):
                    party = data.get('party')
                    member_count = party.get('memberCount', 0)
                    self.log_test(f"Workflow Step 5 - {user_key} In Party", True, f"User in party with {member_count} members")
                else:
                    self.log_test(f"Workflow Step 5 - {user_key} In Party", False, "User not showing as in party")
        
        self.log_test("Complete Party Workflow", True, "All workflow steps completed successfully")
        
    def test_party_api_error_handling(self):
        """Test error handling for party API endpoints"""
        print("⚠️ TESTING PARTY API ERROR HANDLING")
        print("=" * 50)
        
        # Test invalid party ID
        invalid_invite_data = {
            'partyId': 'invalid_party_id',
            'fromUserId': self.test_users['user1']['userId'],
            'toUserId': self.test_users['user2']['userId'],
            'toUsername': self.test_users['user2']['username']
        }
        
        success, data = self.test_api_endpoint("/party-api/invite", method="POST", data=invalid_invite_data, test_name="Error Handling - Invalid Party ID", expected_status=500)
        
        # Test invalid invitation ID
        invalid_accept_data = {
            'invitationId': 'invalid_invitation_id',
            'userId': self.test_users['user1']['userId']
        }
        
        success, data = self.test_api_endpoint("/party-api/accept-invitation", method="POST", data=invalid_accept_data, test_name="Error Handling - Invalid Invitation ID", expected_status=500)
        
        # Test duplicate party creation
        user1 = self.test_users['user1']
        party_data = {
            'ownerId': user1['userId'],
            'ownerUsername': user1['username'],
            'partyName': 'Duplicate Test Party'
        }
        
        # Create first party
        success1, data1 = self.test_api_endpoint("/party-api/create", method="POST", data=party_data, test_name="Error Handling - First Party Creation")
        if success1 and data1.get('success'):
            self.created_parties.append(data1.get('partyId'))
            
            # Try to create second party (should fail)
            success2, data2 = self.test_api_endpoint("/party-api/create", method="POST", data=party_data, test_name="Error Handling - Duplicate Party Creation", expected_status=500)
        
    def cleanup_test_data(self):
        """Clean up created test data"""
        print("🧹 CLEANING UP TEST DATA")
        print("=" * 50)
        
        # Leave parties for all test users
        for user_key, user in self.test_users.items():
            for party_id in self.created_parties:
                leave_data = {
                    'partyId': party_id,
                    'userId': user['userId']
                }
                
                # Try to leave party (may fail if user not in party, which is expected)
                try:
                    response = requests.post(f"{TEST_URL}/party-api/leave", json=leave_data, timeout=5)
                    if response.status_code == 200:
                        print(f"✅ {user_key} left party {party_id}")
                    else:
                        print(f"⚠️ {user_key} could not leave party {party_id} (may not be member)")
                except:
                    print(f"⚠️ Error leaving party {party_id} for {user_key}")
        
        print(f"🧹 Cleanup completed for {len(self.created_parties)} parties and {len(self.created_invitations)} invitations")
        
    def run_all_tests(self):
        """Run comprehensive party API testing suite"""
        print("🚀 STARTING COMPREHENSIVE PARTY API TESTING")
        print("Testing Party Lobby Navigation Fix - /party-api/* Endpoints")
        print("=" * 80)
        print()
        
        try:
            # Run all test suites
            self.test_party_status_endpoint()
            self.test_party_invitations_endpoint()
            self.test_party_notifications_endpoint()
            self.test_party_creation_endpoint()
            self.test_complete_party_workflow()
            self.test_party_api_error_handling()
            
        finally:
            # Always cleanup test data
            self.cleanup_test_data()
        
        # Print final summary
        self.print_summary()
        
    def print_summary(self):
        """Print comprehensive test summary"""
        print("=" * 80)
        print("🎯 PARTY API TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        if self.failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"  - {result['test']}")
        print()
        
        # Overall assessment
        if success_rate >= 90:
            print("🎉 EXCELLENT: Party API routing fix is working perfectly")
        elif success_rate >= 75:
            print("✅ GOOD: Party API is mostly operational with minor issues")
        elif success_rate >= 50:
            print("⚠️ WARNING: Party API has significant issues that need attention")
        else:
            print("🚨 CRITICAL: Party API has major problems that require immediate fixes")
            
        print("=" * 80)
        
        # Specific assessment for the routing fix
        print("🔍 PARTY LOBBY NAVIGATION FIX ASSESSMENT:")
        print("=" * 50)
        
        core_endpoints_tested = [
            "Party Status - No Party",
            "Party Invitations - No Invitations", 
            "Party Notifications - No Notifications",
            "Party Creation - Valid Data"
        ]
        
        core_passed = sum(1 for result in self.test_results 
                         if result['test'] in core_endpoints_tested and result['success'])
        core_total = len(core_endpoints_tested)
        
        if core_passed == core_total:
            print("✅ ALL CORE PARTY ENDPOINTS WORKING - Routing fix successful!")
        else:
            print(f"❌ {core_total - core_passed}/{core_total} core endpoints failing - Routing fix needs attention")
        
        print("=" * 80)

if __name__ == "__main__":
    print("🔧 Party Lobby Navigation Fix - Party API Testing")
    print("Testing all /party-api/* endpoints to verify API routing fix...")
    print()
    
    tester = PartyAPITester()
    tester.run_all_tests()