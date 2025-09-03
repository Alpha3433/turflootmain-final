#!/usr/bin/env python3
"""
Backend Testing Script for Party Lobby Username Issue Debug
Testing the specific issue where "WorkflowUser1" is displayed instead of "robiee"
"""

import requests
import json
import time
import os
from urllib.parse import urljoin

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/party-api"

# Test user data - using realistic Privy DID format
TEST_USER_ROBIEE = {
    'userId': 'did:privy:cme20s0fl005okz0bmxcr0cp0',  # Real user ID for robiee
    'username': 'robiee',
    'displayName': 'robiee'
}

TEST_USER_WORKFLOW = {
    'userId': 'did:privy:cmeksdeoe00gzl10bsienvnbk',  # Real user ID that might be showing as WorkflowUser1
    'username': 'WorkflowUser1',
    'displayName': 'WorkflowUser1'
}

def make_request(method, endpoint, data=None, params=None):
    """Make HTTP request with error handling"""
    url = f"{API_BASE}/{endpoint}" if not endpoint.startswith('http') else endpoint
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, params=params, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def test_current_party_status():
    """Test 1: Check current party status for robiee user"""
    print("\n" + "="*80)
    print("🔍 TEST 1: CHECKING CURRENT PARTY STATUS FOR ROBIEE")
    print("="*80)
    
    # Check party status for robiee
    print(f"📡 Checking party status for user: {TEST_USER_ROBIEE['userId']}")
    response = make_request('GET', 'current', params={'userId': TEST_USER_ROBIEE['userId']})
    
    if response and response.status_code == 200:
        data = response.json()
        print(f"✅ Party status response: {response.status_code}")
        print(f"📊 Response data: {json.dumps(data, indent=2)}")
        
        if data.get('hasParty') and data.get('party'):
            party = data['party']
            print(f"\n🎉 FOUND EXISTING PARTY:")
            print(f"   Party ID: {party.get('id')}")
            print(f"   Party Name: {party.get('name')}")
            print(f"   Owner ID: {party.get('ownerId')}")
            print(f"   Owner Username: {party.get('ownerUsername')}")
            print(f"   Member Count: {party.get('memberCount')}")
            
            if party.get('members'):
                print(f"   Members:")
                for member in party['members']:
                    print(f"     - ID: {member.get('id')}")
                    print(f"       Username: {member.get('username')}")
                    print(f"       Role: {member.get('role')}")
                    
                    # Check if this is where WorkflowUser1 is coming from
                    if member.get('username') == 'WorkflowUser1':
                        print(f"🚨 FOUND 'WorkflowUser1' IN PARTY MEMBERS!")
                        print(f"   Member ID: {member.get('id')}")
                        print(f"   This might be the source of the username issue")
            
            return party
        else:
            print("ℹ️ User is not currently in any party")
            return None
    else:
        print(f"❌ Failed to get party status: {response.status_code if response else 'No response'}")
        if response:
            print(f"   Error: {response.text}")
        return None

def test_database_cleanup_check():
    """Test 2: Check for stale party records"""
    print("\n" + "="*80)
    print("🧹 TEST 2: CHECKING FOR STALE PARTY RECORDS")
    print("="*80)
    
    # Check for both users to see if there are conflicting records
    users_to_check = [TEST_USER_ROBIEE, TEST_USER_WORKFLOW]
    
    for user in users_to_check:
        print(f"\n📡 Checking party status for user: {user['username']} ({user['userId']})")
        response = make_request('GET', 'current', params={'userId': user['userId']})
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('hasParty'):
                party = data['party']
                print(f"🎉 Found party for {user['username']}:")
                print(f"   Party ID: {party.get('id')}")
                print(f"   Party Name: {party.get('name')}")
                print(f"   Created: {party.get('createdAt')}")
                print(f"   Status: {party.get('status')}")
                
                # Check if this is a stale record
                created_time = party.get('createdAt')
                if created_time:
                    print(f"   Age: {created_time}")
            else:
                print(f"ℹ️ No party found for {user['username']}")
        else:
            print(f"❌ Failed to check party for {user['username']}")

def test_party_creation_username():
    """Test 3: Test party creation with robiee username"""
    print("\n" + "="*80)
    print("🎯 TEST 3: TESTING PARTY CREATION WITH ROBIEE USERNAME")
    print("="*80)
    
    # First, try to leave any existing party
    print("🚪 Attempting to leave any existing party first...")
    leave_response = make_request('POST', 'leave', data={
        'partyId': 'any',  # This should be handled gracefully
        'userId': TEST_USER_ROBIEE['userId']
    })
    
    if leave_response:
        print(f"   Leave response: {leave_response.status_code}")
    
    # Create new party with robiee username
    print(f"\n🎉 Creating new party for {TEST_USER_ROBIEE['username']}")
    create_data = {
        'ownerId': TEST_USER_ROBIEE['userId'],
        'ownerUsername': TEST_USER_ROBIEE['username'],
        'partyName': f"{TEST_USER_ROBIEE['username']}'s Party"
    }
    
    print(f"📤 Party creation data: {json.dumps(create_data, indent=2)}")
    
    response = make_request('POST', 'create', data=create_data)
    
    if response and response.status_code == 200:
        data = response.json()
        print(f"✅ Party created successfully!")
        print(f"📊 Response: {json.dumps(data, indent=2)}")
        
        # Immediately check the party status to see what username is stored
        print(f"\n🔍 Immediately checking party status to verify username...")
        status_response = make_request('GET', 'current', params={'userId': TEST_USER_ROBIEE['userId']})
        
        if status_response and status_response.status_code == 200:
            status_data = status_response.json()
            if status_data.get('party'):
                party = status_data['party']
                print(f"✅ Party verification:")
                print(f"   Owner Username: {party.get('ownerUsername')}")
                print(f"   Party Name: {party.get('name')}")
                
                if party.get('members'):
                    for member in party['members']:
                        print(f"   Member: {member.get('username')} (Role: {member.get('role')})")
                        
                        # Check if the username matches what we expect
                        if member.get('role') == 'owner':
                            expected_username = TEST_USER_ROBIEE['username']
                            actual_username = member.get('username')
                            
                            if actual_username == expected_username:
                                print(f"✅ Username matches expected: {actual_username}")
                            else:
                                print(f"🚨 USERNAME MISMATCH!")
                                print(f"   Expected: {expected_username}")
                                print(f"   Actual: {actual_username}")
                                print(f"   This could be the source of the issue!")
                
                return party
        
    else:
        print(f"❌ Failed to create party: {response.status_code if response else 'No response'}")
        if response:
            print(f"   Error: {response.text}")
        return None

def test_username_verification():
    """Test 4: Verify username handling in party system"""
    print("\n" + "="*80)
    print("🔍 TEST 4: USERNAME VERIFICATION IN PARTY SYSTEM")
    print("="*80)
    
    # Test different username scenarios
    test_scenarios = [
        {
            'name': 'Robiee User',
            'userId': TEST_USER_ROBIEE['userId'],
            'username': TEST_USER_ROBIEE['username']
        },
        {
            'name': 'WorkflowUser1 User',
            'userId': TEST_USER_WORKFLOW['userId'],
            'username': TEST_USER_WORKFLOW['username']
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\n📋 Testing scenario: {scenario['name']}")
        print(f"   User ID: {scenario['userId']}")
        print(f"   Username: {scenario['username']}")
        
        # Check current party status
        response = make_request('GET', 'current', params={'userId': scenario['userId']})
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('hasParty'):
                party = data['party']
                print(f"   ✅ Has party: {party.get('name')}")
                print(f"   Owner Username: {party.get('ownerUsername')}")
                
                # Check member usernames
                if party.get('members'):
                    for member in party['members']:
                        if member.get('id') == scenario['userId']:
                            print(f"   Member Username: {member.get('username')}")
                            
                            # Verify username consistency
                            if member.get('username') != scenario['username']:
                                print(f"   🚨 USERNAME INCONSISTENCY DETECTED!")
                                print(f"      Expected: {scenario['username']}")
                                print(f"      Found: {member.get('username')}")
            else:
                print(f"   ℹ️ No party found")
        else:
            print(f"   ❌ Failed to check party status")

def test_party_data_inspection():
    """Test 5: Deep inspection of party data"""
    print("\n" + "="*80)
    print("🔬 TEST 5: DEEP PARTY DATA INSPECTION")
    print("="*80)
    
    # Get current party for robiee
    response = make_request('GET', 'current', params={'userId': TEST_USER_ROBIEE['userId']})
    
    if response and response.status_code == 200:
        data = response.json()
        
        print("📊 COMPLETE PARTY DATA DUMP:")
        print(json.dumps(data, indent=2))
        
        if data.get('party'):
            party = data['party']
            
            print(f"\n🔍 DETAILED ANALYSIS:")
            print(f"Party ID: {party.get('id')}")
            print(f"Owner ID: {party.get('ownerId')}")
            print(f"Owner Username: {party.get('ownerUsername')}")
            print(f"Party Name: {party.get('name')}")
            print(f"Status: {party.get('status')}")
            print(f"Member Count: {party.get('memberCount')}")
            print(f"Max Members: {party.get('maxMembers')}")
            print(f"Created At: {party.get('createdAt')}")
            print(f"Updated At: {party.get('updatedAt')}")
            
            print(f"\n👥 MEMBER ANALYSIS:")
            if party.get('members'):
                for i, member in enumerate(party['members']):
                    print(f"Member {i+1}:")
                    print(f"  ID: {member.get('id')}")
                    print(f"  Username: {member.get('username')}")
                    print(f"  Role: {member.get('role')}")
                    print(f"  Joined At: {member.get('joinedAt')}")
                    
                    # Check for WorkflowUser1
                    if member.get('username') == 'WorkflowUser1':
                        print(f"  🚨 FOUND WORKFLOWUSER1!")
                        print(f"     This member has the problematic username")
                        print(f"     Member ID: {member.get('id')}")
                        print(f"     Role: {member.get('role')}")
                        
                        # Check if this member ID matches robiee's user ID
                        if member.get('id') == TEST_USER_ROBIEE['userId']:
                            print(f"     🎯 THIS IS THE ISSUE!")
                            print(f"     Robiee's user ID ({TEST_USER_ROBIEE['userId']}) is associated with username 'WorkflowUser1'")
                            print(f"     Expected username: {TEST_USER_ROBIEE['username']}")
            else:
                print("  No members found in party")
        else:
            print("ℹ️ No party data found")
    else:
        print(f"❌ Failed to get party data")

def cleanup_stale_parties():
    """Test 6: Cleanup stale party data"""
    print("\n" + "="*80)
    print("🧹 TEST 6: CLEANUP STALE PARTY DATA")
    print("="*80)
    
    # Try to leave any existing parties for robiee
    print(f"🚪 Attempting to leave all parties for robiee...")
    
    # First get current party
    response = make_request('GET', 'current', params={'userId': TEST_USER_ROBIEE['userId']})
    
    if response and response.status_code == 200:
        data = response.json()
        if data.get('hasParty') and data.get('party'):
            party = data['party']
            party_id = party.get('id')
            
            print(f"📤 Leaving party: {party_id}")
            leave_response = make_request('POST', 'leave', data={
                'partyId': party_id,
                'userId': TEST_USER_ROBIEE['userId']
            })
            
            if leave_response and leave_response.status_code == 200:
                leave_data = leave_response.json()
                print(f"✅ Successfully left party")
                print(f"   Response: {json.dumps(leave_data, indent=2)}")
                
                # Verify party is gone
                verify_response = make_request('GET', 'current', params={'userId': TEST_USER_ROBIEE['userId']})
                if verify_response and verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    if not verify_data.get('hasParty'):
                        print(f"✅ Confirmed: User is no longer in any party")
                    else:
                        print(f"⚠️ User still appears to be in a party")
                        print(f"   Party: {verify_data.get('party', {}).get('name')}")
            else:
                print(f"❌ Failed to leave party: {leave_response.status_code if leave_response else 'No response'}")
                if leave_response:
                    print(f"   Error: {leave_response.text}")
        else:
            print("ℹ️ No party to leave")
    else:
        print(f"❌ Failed to check current party status")

def run_all_tests():
    """Run all debug tests"""
    print("🚀 STARTING PARTY LOBBY USERNAME DEBUG TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test User (Robiee): {TEST_USER_ROBIEE['userId']}")
    print(f"Test User (Workflow): {TEST_USER_WORKFLOW['userId']}")
    
    results = {}
    
    try:
        # Test 1: Check current party status
        results['current_party'] = test_current_party_status()
        
        # Test 2: Check for stale records
        results['stale_check'] = test_database_cleanup_check()
        
        # Test 3: Test party creation with correct username
        results['party_creation'] = test_party_creation_username()
        
        # Test 4: Username verification
        results['username_verification'] = test_username_verification()
        
        # Test 5: Deep data inspection
        results['data_inspection'] = test_party_data_inspection()
        
        # Test 6: Cleanup if needed
        results['cleanup'] = cleanup_stale_parties()
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Summary
    print("\n" + "="*80)
    print("📋 TEST SUMMARY")
    print("="*80)
    
    print("🔍 INVESTIGATION RESULTS:")
    print("1. Current Party Status: Checked for existing parties")
    print("2. Stale Records: Searched for conflicting party data")
    print("3. Party Creation: Tested username handling in new parties")
    print("4. Username Verification: Verified username consistency")
    print("5. Data Inspection: Deep dive into party data structure")
    print("6. Cleanup: Attempted to clean stale data")
    
    print("\n🎯 KEY FINDINGS:")
    if any('WorkflowUser1' in str(result) for result in results.values() if result):
        print("- Found 'WorkflowUser1' in party data")
        print("- This appears to be the source of the username display issue")
        print("- Recommend cleaning up stale party records")
    else:
        print("- No 'WorkflowUser1' found in current party data")
        print("- Issue may be in frontend display logic or cached data")
    
    print("\n✅ Debug tests completed!")
    return results

if __name__ == "__main__":
    run_all_tests()
                self.log_test("Hathora Environment Config", True, "API responding normally, environment likely configured")
        
    def test_game_server_integration(self):
        """Test game server integration hasn't been broken"""
        print("🎮 TESTING GAME SERVER INTEGRATION")
        print("=" * 50)
        
        # Test server browser for game server data
        success, data = self.test_api_endpoint("/api/servers/lobbies", test_name="Game Server Data Retrieval")
        
        if success and data:
            servers = data.get('servers', [])
            if servers:
                self.log_test("Game Servers Available", True, f"Found {len(servers)} servers")
                
                # Check server data structure
                first_server = servers[0]
                required_fields = ['id', 'name', 'region', 'currentPlayers', 'maxPlayers']
                missing_fields = [field for field in required_fields if field not in first_server]
                
                if not missing_fields:
                    self.log_test("Server Data Structure", True, "All required server fields present")
                else:
                    self.log_test("Server Data Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Game Servers Available", False, "No servers found in response")
    
    def test_authentication_endpoints(self):
        """Test authentication-related endpoints"""
        print("🔐 TESTING AUTHENTICATION ENDPOINTS")
        print("=" * 50)
        
        # Test wallet balance (requires auth handling)
        self.test_api_endpoint("/api/wallet/balance", test_name="Authentication Wallet Balance")
        
        # Test user profile endpoint
        self.test_api_endpoint("/api/users/profile?userId=test-user", test_name="User Profile Endpoint", expected_status=404)
        
    def test_database_connectivity(self):
        """Test database connectivity through API endpoints"""
        print("🗄️ TESTING DATABASE CONNECTIVITY")
        print("=" * 50)
        
        # Test endpoints that require database access
        self.test_api_endpoint("/api/users/leaderboard", test_name="Database Leaderboard Query")
        self.test_api_endpoint("/api/users/search?q=test&userId=test-user", test_name="Database User Search")
        
    def test_performance_after_changes(self):
        """Test API performance hasn't degraded after UI changes"""
        print("⚡ TESTING API PERFORMANCE")
        print("=" * 50)
        
        # Test multiple rapid requests to check for performance issues
        start_time = time.time()
        rapid_tests = []
        
        for i in range(5):
            success, _ = self.test_api_endpoint("/api/ping", test_name=f"Performance Test {i+1}")
            rapid_tests.append(success)
            
        total_time = time.time() - start_time
        success_rate = sum(rapid_tests) / len(rapid_tests) * 100
        
        if success_rate >= 80 and total_time < 10:
            self.log_test("API Performance Test", True, f"Success rate: {success_rate}%, Total time: {total_time:.3f}s")
        else:
            self.log_test("API Performance Test", False, f"Success rate: {success_rate}%, Total time: {total_time:.3f}s")
    
    def test_hathora_specific_functionality(self):
        """Test functionality specific to Hathora integration"""
        print("🌐 TESTING HATHORA-SPECIFIC FUNCTIONALITY")
        print("=" * 50)
        
        # Test server browser for global servers (Hathora integration)
        success, data = self.test_api_endpoint("/api/servers/lobbies", test_name="Hathora Global Servers")
        
        if success and data:
            servers = data.get('servers', [])
            regions = data.get('regions', [])
            
            # Check for global/multi-region setup (indicates Hathora integration)
            if len(regions) > 1:
                self.log_test("Global Multi-Region Setup", True, f"Found {len(regions)} regions: {regions}")
            else:
                self.log_test("Global Multi-Region Setup", False, f"Only {len(regions)} region(s) found")
                
            # Check for different server types (free/cash games)
            game_types = set()
            for server in servers:
                if server.get('mode'):
                    game_types.add(server['mode'])
                    
            if len(game_types) > 1:
                self.log_test("Multiple Game Types", True, f"Found game types: {list(game_types)}")
            else:
                self.log_test("Multiple Game Types", False, f"Only found: {list(game_types)}")

    def run_all_tests(self):
        """Run comprehensive backend testing suite"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING")
        print("Testing Hathora Global Connection UI Updates - Backend Regression Testing")
        print("=" * 80)
        print()
        
        # Run all test suites
        self.test_core_api_endpoints()
        self.test_hathora_environment_config()
        self.test_game_server_integration()
        self.test_authentication_endpoints()
        self.test_database_connectivity()
        self.test_performance_after_changes()
        self.test_hathora_specific_functionality()
        
        # Print final summary
        self.print_summary()
        
    def print_summary(self):
        """Print comprehensive test summary"""
        print("=" * 80)
        print("🎯 COMPREHENSIVE BACKEND TESTING SUMMARY")
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
            print("🎉 EXCELLENT: Backend is fully operational after Hathora UI updates")
        elif success_rate >= 75:
            print("✅ GOOD: Backend is mostly operational with minor issues")
        elif success_rate >= 50:
            print("⚠️ WARNING: Backend has significant issues that need attention")
        else:
            print("🚨 CRITICAL: Backend has major problems that require immediate fixes")
            
        print("=" * 80)

if __name__ == "__main__":
    print("🔧 Hathora Global Connection UI Updates - Backend Testing")
    print("Testing all core API endpoints to ensure no regressions...")
    print()
    
    tester = BackendTester()
    tester.run_all_tests()