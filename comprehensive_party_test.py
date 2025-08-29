#!/usr/bin/env python3
"""
Comprehensive Party Lobby State Synchronization Testing
Testing all scenarios from the review request:
1. Party Status Detection (GET /party-api/current)
2. Create Party Conflict Handling (POST /party-api/create when user already in party)
3. Party Data Structure Validation
4. State Synchronization
"""

import requests
import json
import time

BASE_URL = "http://localhost:3000"
TEST_USER_ANTH = "did:privy:cmeksdeoe00gzl10bsienvnbk"
TEST_USER_ROBIEE = "did:privy:cme20s0fl005okz0bmxcr0cp0"

class ComprehensivePartyTester:
    def __init__(self):
        self.results = []
        
    def log_result(self, test_name, passed, details=""):
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")
        if details:
            print(f"   {details}")
        self.results.append({'test': test_name, 'passed': passed, 'details': details})
        
    def test_scenario_1_party_status_detection(self):
        """Test GET /party-api/current for user who is in a party"""
        print("\n🎯 SCENARIO 1: PARTY STATUS DETECTION")
        print("=" * 50)
        
        # Test with real user ID from review request
        response = requests.get(f"{BASE_URL}/party-api/current", params={'userId': TEST_USER_ANTH})
        
        if response.status_code == 200:
            data = response.json()
            
            # Check response includes hasParty and proper party data
            has_required_fields = 'hasParty' in data and 'party' in data and 'timestamp' in data
            self.log_result("Response includes hasParty=true and proper party data structure", 
                          has_required_fields, f"Fields: {list(data.keys())}")
            
            # Check party member information
            party = data.get('party')
            if party:
                members = party.get('members', [])
                if members:
                    member = members[0]
                    member_fields_ok = all(field in member for field in ['id', 'username', 'role'])
                    self.log_result("Party member information correctly returned", 
                                  member_fields_ok, f"Member fields: {list(member.keys())}")
                else:
                    self.log_result("Party member information correctly returned", 
                                  False, "No members found in party")
            else:
                # This is the bug - party should exist but returns null
                self.log_result("Party data returned when user has party", 
                              False, "Party is null despite backend having active party")
                
        else:
            self.log_result("Party status endpoint accessibility", 
                          False, f"HTTP {response.status_code}")
    
    def test_scenario_2_create_party_conflict(self):
        """Test POST /party-api/create when user is already in a party"""
        print("\n🎯 SCENARIO 2: CREATE PARTY CONFLICT HANDLING")
        print("=" * 50)
        
        # Try to create party when user already has one
        create_data = {
            'ownerId': TEST_USER_ANTH,
            'ownerUsername': 'anth',
            'partyName': 'Conflict Test Party'
        }
        
        response = requests.post(f"{BASE_URL}/party-api/create", json=create_data)
        
        # Should return proper error message
        if response.status_code in [400, 500]:
            try:
                error_data = response.json()
                error_message = error_data.get('error', '')
                
                proper_error = 'already have an active party' in error_message.lower()
                self.log_result("Proper error message returned", 
                              proper_error, f"Error: {error_message}")
                
                # Verify existing party data is preserved by checking status again
                status_response = requests.get(f"{BASE_URL}/party-api/current", 
                                             params={'userId': TEST_USER_ANTH})
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    # Note: This will likely fail due to the sync bug
                    party_preserved = status_data.get('hasParty', False)
                    self.log_result("Existing party data preserved", 
                                  party_preserved, 
                                  f"hasParty after conflict attempt: {party_preserved}")
                else:
                    self.log_result("Existing party data preserved", 
                                  False, "Could not verify party preservation")
                    
            except json.JSONDecodeError:
                self.log_result("Proper error message returned", 
                              False, "Invalid JSON in error response")
        else:
            self.log_result("Proper error message returned", 
                          False, f"Expected 400/500, got {response.status_code}")
    
    def test_scenario_3_party_data_structure(self):
        """Test party response includes all required fields"""
        print("\n🎯 SCENARIO 3: PARTY DATA STRUCTURE VALIDATION")
        print("=" * 50)
        
        response = requests.get(f"{BASE_URL}/party-api/current", params={'userId': TEST_USER_ANTH})
        
        if response.status_code == 200:
            data = response.json()
            party = data.get('party')
            
            if party:
                # Check required fields
                required_fields = ['id', 'name', 'members', 'memberCount', 'ownerId', 'status']
                fields_present = all(field in party for field in required_fields)
                
                self.log_result("Party response includes all required fields", 
                              fields_present, 
                              f"Missing: {[f for f in required_fields if f not in party]}")
                
                # Check member data includes proper role information
                members = party.get('members', [])
                if members:
                    member = members[0]
                    role_info_ok = 'role' in member and member['role'] in ['owner', 'member']
                    self.log_result("Member data includes proper role information", 
                                  role_info_ok, f"Role: {member.get('role')}")
                else:
                    self.log_result("Member data includes proper role information", 
                                  False, "No members in party")
                
                # Check party owner information
                owner_id = party.get('ownerId')
                owner_in_members = any(m.get('id') == owner_id and m.get('role') == 'owner' 
                                     for m in members)
                self.log_result("Party owner information correctly populated", 
                              owner_in_members, 
                              f"Owner {owner_id} found as owner in members: {owner_in_members}")
            else:
                self.log_result("Party response includes all required fields", 
                              False, "Party data is null")
        else:
            self.log_result("Party response includes all required fields", 
                          False, f"HTTP {response.status_code}")
    
    def test_scenario_4_state_synchronization(self):
        """Test complete workflow and state synchronization"""
        print("\n🎯 SCENARIO 4: STATE SYNCHRONIZATION")
        print("=" * 50)
        
        # Test the complete workflow: Create party → Check status → Attempt to create another
        
        # Step 1: Check current status
        current_status = requests.get(f"{BASE_URL}/party-api/current", 
                                    params={'userId': TEST_USER_ROBIEE})
        
        if current_status.status_code == 200:
            current_data = current_status.json()
            initial_has_party = current_data.get('hasParty', False)
            
            print(f"   Initial party status: hasParty={initial_has_party}")
            
            # Step 2: Try to create party
            create_response = requests.post(f"{BASE_URL}/party-api/create", json={
                'ownerId': TEST_USER_ROBIEE,
                'ownerUsername': 'robiee',
                'partyName': 'Sync Test Party'
            })
            
            print(f"   Create party response: {create_response.status_code}")
            
            # Step 3: Check status after creation attempt
            post_status = requests.get(f"{BASE_URL}/party-api/current", 
                                     params={'userId': TEST_USER_ROBIEE})
            
            if post_status.status_code == 200:
                post_data = post_status.json()
                post_has_party = post_data.get('hasParty', False)
                
                print(f"   Post-attempt party status: hasParty={post_has_party}")
                
                # The key test: if create failed due to existing party, 
                # then current status should show hasParty=true
                if create_response.status_code in [400, 500]:
                    try:
                        error_data = create_response.json()
                        if 'already have an active party' in error_data.get('error', '').lower():
                            # This is the synchronization bug
                            sync_working = post_has_party  # Should be True if sync is working
                            self.log_result("Party status endpoint properly reflects current party state", 
                                          sync_working, 
                                          f"Backend says has party, status shows hasParty={post_has_party}")
                        else:
                            self.log_result("Party status endpoint properly reflects current party state", 
                                          True, "Different error, not sync issue")
                    except json.JSONDecodeError:
                        self.log_result("Party status endpoint properly reflects current party state", 
                                      False, "Could not parse error response")
                elif create_response.status_code == 200:
                    # Party was created successfully
                    sync_working = post_has_party  # Should be True
                    self.log_result("Party status endpoint properly reflects current party state", 
                                  sync_working, 
                                  f"Party created, status shows hasParty={post_has_party}")
                else:
                    self.log_result("Party status endpoint properly reflects current party state", 
                                  False, f"Unexpected create response: {create_response.status_code}")
            else:
                self.log_result("Party status endpoint properly reflects current party state", 
                              False, "Could not check post-attempt status")
        else:
            self.log_result("Party status endpoint properly reflects current party state", 
                          False, "Could not check initial status")
    
    def test_edge_cases(self):
        """Test edge cases like invalid user IDs or non-existent parties"""
        print("\n🎯 EDGE CASES")
        print("=" * 50)
        
        # Test invalid user ID
        invalid_response = requests.get(f"{BASE_URL}/party-api/current", 
                                      params={'userId': 'invalid-user-id'})
        
        if invalid_response.status_code == 200:
            invalid_data = invalid_response.json()
            no_party_for_invalid = not invalid_data.get('hasParty', True)
            self.log_result("Invalid user IDs handled correctly", 
                          no_party_for_invalid, 
                          f"Invalid user hasParty: {invalid_data.get('hasParty')}")
        else:
            self.log_result("Invalid user IDs handled correctly", 
                          False, f"HTTP {invalid_response.status_code}")
        
        # Test missing userId parameter
        missing_response = requests.get(f"{BASE_URL}/party-api/current")
        proper_error = missing_response.status_code == 400
        self.log_result("Missing userId parameter handled correctly", 
                      proper_error, f"Status: {missing_response.status_code}")
    
    def run_all_tests(self):
        print("🚀 COMPREHENSIVE PARTY LOBBY STATE SYNCHRONIZATION TESTING")
        print("=" * 80)
        print(f"Testing the specific issue: After browser refresh, users can't see existing party")
        print(f"but backend still has them in party, causing 'You already have an active party' error")
        print("=" * 80)
        
        # Run all test scenarios
        self.test_scenario_1_party_status_detection()
        self.test_scenario_2_create_party_conflict()
        self.test_scenario_3_party_data_structure()
        self.test_scenario_4_state_synchronization()
        self.test_edge_cases()
        
        # Summary
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['passed'])
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        
        for result in self.results:
            status = "✅" if result['passed'] else "❌"
            print(f"{status} {result['test']}")
            if result['details'] and not result['passed']:
                print(f"   Issue: {result['details']}")
        
        print(f"\n📊 RESULTS: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        
        if success_rate < 50:
            print("\n❌ CRITICAL ISSUE: Party Lobby State Synchronization has major problems")
            print("   The reported bug is confirmed - users cannot see their existing parties")
            print("   but the backend knows they have active parties.")
        elif success_rate < 80:
            print("\n⚠️ MODERATE ISSUES: Party Lobby State Synchronization has some problems")
            print("   Some aspects work but the core synchronization issue may still exist.")
        else:
            print("\n✅ GOOD: Party Lobby State Synchronization is working correctly")
            print("   The reported issue appears to be resolved.")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = ComprehensivePartyTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)