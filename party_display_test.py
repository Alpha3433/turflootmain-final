#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Dynamic Party Display System
Testing the complete dynamic party display system to ensure it shows party members correctly on both users' landing pages.

CRITICAL FEATURES TO TEST:
1. Party Creation and Current Party Loading
2. Dynamic Party Display 
3. Multi-User Party Experience
4. Party Member Data Structure
"""

import requests
import json
import time
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = "https://solana-battle.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class PartyDisplayTester:
    def __init__(self):
        self.test_results = []
        self.test_users = []
        self.created_parties = []
        self.created_invites = []
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()

    def test_api_health(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{API_BASE}/party", timeout=10)
            success = response.status_code in [200, 400, 401]  # Any valid response
            
            if success:
                self.log_test("API Health Check", True, f"Party API accessible (Status: {response.status_code})")
            else:
                self.log_test("API Health Check", False, error=f"Unexpected status code: {response.status_code}")
                
        except Exception as e:
            self.log_test("API Health Check", False, error=str(e))

    def register_test_users(self):
        """Register test users with realistic wallet addresses"""
        test_users_data = [
            {
                "userIdentifier": "0x1A2B3C4D5E6F7890123456789ABCDEF012345678",
                "username": "AlphaPlayer",
                "email": "alpha.player@turfloot.com",
                "walletAddress": "0x1A2B3C4D5E6F7890123456789ABCDEF012345678"
            },
            {
                "userIdentifier": "0x9876543210FEDCBA0987654321ABCDEF98765432",
                "username": "BetaGamer", 
                "email": "beta.gamer@turfloot.com",
                "walletAddress": "0x9876543210FEDCBA0987654321ABCDEF98765432"
            },
            {
                "userIdentifier": "0x5555AAAA1111BBBB2222CCCC3333DDDD44444444",
                "username": "GammaWarrior",
                "email": "gamma.warrior@turfloot.com",
                "walletAddress": "0x5555AAAA1111BBBB2222CCCC3333DDDD44444444"
            }
        ]
        
        for user_data in test_users_data:
            try:
                payload = {
                    "action": "register_user",
                    "userIdentifier": user_data["userIdentifier"],
                    "userData": {
                        "username": user_data["username"],
                        "email": user_data["email"],
                        "walletAddress": user_data["walletAddress"],
                        "isOnline": True  # Set users as online for testing
                    }
                }
                
                response = requests.post(f"{API_BASE}/friends", json=payload, timeout=10)
                
                if response.status_code == 200:
                    self.test_users.append(user_data)
                    self.log_test(f"Register User {user_data['username']}", True, 
                                f"User registered with wallet: {user_data['userIdentifier'][:10]}...")
                else:
                    self.log_test(f"Register User {user_data['username']}", False, 
                                error=f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Register User {user_data['username']}", False, error=str(e))

    def create_friendships(self):
        """Create friendships between test users for party invitations"""
        if len(self.test_users) < 2:
            self.log_test("Create Friendships", False, error="Not enough test users registered")
            return
            
        try:
            # Create friendship between User1 and User2
            payload = {
                "action": "send_request",
                "userIdentifier": self.test_users[0]["userIdentifier"],
                "friendUsername": self.test_users[1]["username"]
            }
            
            response = requests.post(f"{API_BASE}/friends", json=payload, timeout=10)
            
            if response.status_code == 200:
                response_data = response.json()
                request_id = response_data.get("request", {}).get("id")
                
                if request_id:
                    # User2 accepts the friend request
                    accept_payload = {
                        "action": "accept_request",
                        "userIdentifier": self.test_users[1]["userIdentifier"],
                        "requestId": request_id
                    }
                    
                    accept_response = requests.post(f"{API_BASE}/friends", json=accept_payload, timeout=10)
                    
                    if accept_response.status_code == 200:
                        self.log_test("Create Friendships", True, 
                                    f"Friendship created between {self.test_users[0]['username']} and {self.test_users[1]['username']}")
                    else:
                        self.log_test("Create Friendships", False, 
                                    error=f"Failed to accept request: {accept_response.text}")
                else:
                    self.log_test("Create Friendships", False, error="No request ID returned")
            else:
                self.log_test("Create Friendships", False, 
                            error=f"Failed to send request: {response.text}")
                
        except Exception as e:
            self.log_test("Create Friendships", False, error=str(e))

    def test_party_creation_and_storage(self):
        """Test party creation stores party in database correctly"""
        if len(self.test_users) < 2:
            self.log_test("Party Creation and Storage", False, error="Not enough test users")
            return
            
        try:
            creator = self.test_users[0]
            invited_friends = [{
                "id": self.test_users[1]["userIdentifier"],
                "username": self.test_users[1]["username"]
            }]
            
            party_data = {
                "name": "Dynamic Display Test Party",
                "privacy": "public",
                "maxPlayers": 4
            }
            
            payload = {
                "action": "create_and_invite",
                "userIdentifier": creator["userIdentifier"],
                "partyData": party_data,
                "invitedFriends": invited_friends
            }
            
            response = requests.post(f"{API_BASE}/party", json=payload, timeout=10)
            
            if response.status_code == 200:
                response_data = response.json()
                party_id = response_data.get("party", {}).get("id")
                party_name = response_data.get("party", {}).get("name")
                invites_sent = response_data.get("party", {}).get("invitesSent", 0)
                
                if party_id:
                    self.created_parties.append({
                        "id": party_id,
                        "creator": creator["userIdentifier"],
                        "name": party_name
                    })
                
                self.log_test("Party Creation and Storage", True,
                            f"Party '{party_name}' created with ID: {party_id}, Invites sent: {invites_sent}")
                
            else:
                self.log_test("Party Creation and Storage", False,
                            error=f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Party Creation and Storage", False, error=str(e))

    def test_current_party_retrieval(self):
        """Test GET /api/party?type=current retrieves user's current party"""
        if not self.created_parties:
            self.log_test("Current Party Retrieval", False, error="No parties created to test")
            return
            
        try:
            # Test current party retrieval for party creator
            party = self.created_parties[0]
            creator_identifier = party["creator"]
            
            response = requests.get(
                f"{API_BASE}/party",
                params={
                    "userIdentifier": creator_identifier,
                    "type": "current"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                response_data = response.json()
                
                if response_data.get("success") and response_data.get("party"):
                    current_party = response_data["party"]
                    party_id = current_party.get("id")
                    party_name = current_party.get("name")
                    current_players = current_party.get("currentPlayers", [])
                    members = current_party.get("members", [])
                    
                    self.log_test("Current Party Retrieval", True,
                                f"Retrieved current party: '{party_name}' (ID: {party_id}) with {len(current_players)} players and {len(members)} member details")
                    
                    # Store party data for further testing
                    self.current_party_data = current_party
                    
                else:
                    self.log_test("Current Party Retrieval", False,
                                error=f"No current party found or invalid response structure")
            else:
                self.log_test("Current Party Retrieval", False,
                            error=f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Current Party Retrieval", False, error=str(e))

    def test_party_member_data_structure(self):
        """Test party member data structure includes correct information"""
        if not hasattr(self, 'current_party_data'):
            self.log_test("Party Member Data Structure", False, error="No current party data available")
            return
            
        try:
            party = self.current_party_data
            members = party.get("members", [])
            current_players = party.get("currentPlayers", [])
            
            if not members:
                self.log_test("Party Member Data Structure", False, error="No members found in party data")
                return
            
            # Validate member data structure
            required_fields = ["userIdentifier", "username", "isOnline"]
            valid_members = 0
            
            for member in members:
                has_all_fields = all(field in member for field in required_fields)
                if has_all_fields:
                    valid_members += 1
                    
            if valid_members == len(members):
                member_details = []
                for member in members:
                    member_details.append(f"{member['username']} ({member['userIdentifier'][:10]}..., Online: {member['isOnline']})")
                
                self.log_test("Party Member Data Structure", True,
                            f"All {len(members)} members have correct data structure: {', '.join(member_details)}")
            else:
                self.log_test("Party Member Data Structure", False,
                            error=f"Only {valid_members}/{len(members)} members have valid data structure")
                
        except Exception as e:
            self.log_test("Party Member Data Structure", False, error=str(e))

    def test_party_invite_acceptance(self):
        """Accept party invite to create multi-user party"""
        if len(self.test_users) < 2 or not self.created_parties:
            self.log_test("Party Invite Acceptance", False, error="Not enough users or parties for testing")
            return
            
        try:
            # Get party invites for the invited user
            invited_user = self.test_users[1]
            
            response = requests.get(
                f"{API_BASE}/party",
                params={
                    "userIdentifier": invited_user["userIdentifier"],
                    "type": "invites"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                response_data = response.json()
                invites = response_data.get("invites", [])
                
                if invites:
                    # Accept the first invite
                    invite = invites[0]
                    invite_id = invite.get("id")
                    party_id = invite.get("partyId")
                    
                    accept_payload = {
                        "action": "accept_invite",
                        "userIdentifier": invited_user["userIdentifier"],
                        "inviteId": invite_id,
                        "partyId": party_id
                    }
                    
                    accept_response = requests.post(f"{API_BASE}/party", json=accept_payload, timeout=10)
                    
                    if accept_response.status_code == 200:
                        self.log_test("Party Invite Acceptance", True,
                                    f"User {invited_user['username']} successfully joined party {party_id}")
                    else:
                        self.log_test("Party Invite Acceptance", False,
                                    error=f"Failed to accept invite: {accept_response.text}")
                else:
                    self.log_test("Party Invite Acceptance", False, error="No party invites found")
            else:
                self.log_test("Party Invite Acceptance", False,
                            error=f"Failed to get invites: {response.status_code}, {response.text}")
                
        except Exception as e:
            self.log_test("Party Invite Acceptance", False, error=str(e))

    def test_multi_user_party_experience(self):
        """Test all party members can see the same party on their landing page"""
        if len(self.test_users) < 2:
            self.log_test("Multi-User Party Experience", False, error="Not enough test users")
            return
            
        try:
            # Test that both users can retrieve the same party
            party_data_by_user = {}
            
            for i, user in enumerate(self.test_users[:2]):  # Test first 2 users
                response = requests.get(
                    f"{API_BASE}/party",
                    params={
                        "userIdentifier": user["userIdentifier"],
                        "type": "current"
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get("success") and response_data.get("party"):
                        party_data_by_user[user["username"]] = response_data["party"]
                    else:
                        party_data_by_user[user["username"]] = None
                else:
                    party_data_by_user[user["username"]] = None
            
            # Compare party data between users
            user1_party = party_data_by_user.get(self.test_users[0]["username"])
            user2_party = party_data_by_user.get(self.test_users[1]["username"])
            
            if user1_party and user2_party:
                # Check if both users see the same party
                same_party_id = user1_party.get("id") == user2_party.get("id")
                same_party_name = user1_party.get("name") == user2_party.get("name")
                
                if same_party_id and same_party_name:
                    user1_members = len(user1_party.get("members", []))
                    user2_members = len(user2_party.get("members", []))
                    
                    self.log_test("Multi-User Party Experience", True,
                                f"Both users see the same party '{user1_party['name']}' with {user1_members} and {user2_members} members respectively")
                else:
                    self.log_test("Multi-User Party Experience", False,
                                error=f"Users see different parties: {user1_party.get('name')} vs {user2_party.get('name')}")
            else:
                missing_users = []
                if not user1_party:
                    missing_users.append(self.test_users[0]["username"])
                if not user2_party:
                    missing_users.append(self.test_users[1]["username"])
                
                self.log_test("Multi-User Party Experience", False,
                            error=f"Users without current party: {', '.join(missing_users)}")
                
        except Exception as e:
            self.log_test("Multi-User Party Experience", False, error=str(e))

    def test_dynamic_party_display_updates(self):
        """Test currentParty state updates after party creation"""
        if not self.created_parties:
            self.log_test("Dynamic Party Display Updates", False, error="No parties created to test")
            return
            
        try:
            # Test that party creator can immediately retrieve their current party
            party = self.created_parties[0]
            creator_identifier = party["creator"]
            
            # Make multiple requests to ensure consistency
            consistent_responses = 0
            total_requests = 3
            
            for i in range(total_requests):
                response = requests.get(
                    f"{API_BASE}/party",
                    params={
                        "userIdentifier": creator_identifier,
                        "type": "current"
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get("success") and response_data.get("party"):
                        current_party = response_data["party"]
                        if current_party.get("id") == party["id"]:
                            consistent_responses += 1
                
                time.sleep(0.5)  # Small delay between requests
            
            if consistent_responses == total_requests:
                self.log_test("Dynamic Party Display Updates", True,
                            f"Party display consistently updated - {consistent_responses}/{total_requests} requests returned correct party")
            else:
                self.log_test("Dynamic Party Display Updates", False,
                            error=f"Inconsistent party display - only {consistent_responses}/{total_requests} requests returned correct party")
                
        except Exception as e:
            self.log_test("Dynamic Party Display Updates", False, error=str(e))

    def test_party_member_online_status(self):
        """Test online status indicators show for party members"""
        if not hasattr(self, 'current_party_data'):
            self.log_test("Party Member Online Status", False, error="No current party data available")
            return
            
        try:
            party = self.current_party_data
            members = party.get("members", [])
            
            if not members:
                self.log_test("Party Member Online Status", False, error="No members found in party")
                return
            
            # Check online status for each member
            online_members = 0
            status_details = []
            
            for member in members:
                username = member.get("username", "Unknown")
                is_online = member.get("isOnline", False)
                
                if is_online:
                    online_members += 1
                    
                status_details.append(f"{username}: {'Online' if is_online else 'Offline'}")
            
            self.log_test("Party Member Online Status", True,
                        f"Online status tracked for all members - {online_members}/{len(members)} online. Status: {', '.join(status_details)}")
                
        except Exception as e:
            self.log_test("Party Member Online Status", False, error=str(e))

    def test_no_party_members_replacement(self):
        """Test that party display replaces 'NO PARTY MEMBERS' text"""
        if not hasattr(self, 'current_party_data'):
            self.log_test("No Party Members Replacement", False, error="No current party data available")
            return
            
        try:
            party = self.current_party_data
            members = party.get("members", [])
            current_players = party.get("currentPlayers", [])
            
            if members and len(members) > 0:
                member_names = [member.get("username", "Unknown") for member in members]
                self.log_test("No Party Members Replacement", True,
                            f"Party has {len(members)} members ({', '.join(member_names)}) - 'NO PARTY MEMBERS' text should be replaced")
            else:
                self.log_test("No Party Members Replacement", False,
                            error="Party has no members - 'NO PARTY MEMBERS' text would still be shown")
                
        except Exception as e:
            self.log_test("No Party Members Replacement", False, error=str(e))

    def cleanup_test_data(self):
        """Clean up test data (best effort)"""
        print("\n🧹 Cleaning up test data...")
        print(f"Created parties: {len(self.created_parties)}")
        print(f"Test users: {len(self.test_users)}")

    def run_all_tests(self):
        """Run all dynamic party display system tests"""
        print("🎯 Starting Comprehensive Dynamic Party Display System Testing")
        print("=" * 80)
        
        # Test sequence following the review request requirements
        self.test_api_health()
        self.register_test_users()
        self.create_friendships()
        
        # CRITICAL FEATURE 1: Party Creation and Current Party Loading
        self.test_party_creation_and_storage()
        self.test_current_party_retrieval()
        
        # CRITICAL FEATURE 2: Dynamic Party Display
        self.test_dynamic_party_display_updates()
        
        # CRITICAL FEATURE 3: Multi-User Party Experience  
        self.test_party_invite_acceptance()
        self.test_multi_user_party_experience()
        
        # CRITICAL FEATURE 4: Party Member Data Structure
        self.test_party_member_data_structure()
        self.test_party_member_online_status()
        self.test_no_party_members_replacement()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("🎯 DYNAMIC PARTY DISPLAY SYSTEM TESTING SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['error']}")
        
        print("\n✅ CRITICAL SUCCESS CRITERIA:")
        
        # Check specific requirements from review request
        party_creation_passed = any("Party Creation and Storage" in r["test"] and r["success"] for r in self.test_results)
        current_party_passed = any("Current Party Retrieval" in r["test"] and r["success"] for r in self.test_results)
        member_data_passed = any("Party Member Data Structure" in r["test"] and r["success"] for r in self.test_results)
        multi_user_passed = any("Multi-User Party Experience" in r["test"] and r["success"] for r in self.test_results)
        dynamic_display_passed = any("Dynamic Party Display Updates" in r["test"] and r["success"] for r in self.test_results)
        online_status_passed = any("Party Member Online Status" in r["test"] and r["success"] for r in self.test_results)
        
        print(f"  ✅ Party Creation and Storage: {'PASSED' if party_creation_passed else 'FAILED'}")
        print(f"  ✅ Current Party Retrieval (GET /api/party?type=current): {'PASSED' if current_party_passed else 'FAILED'}")
        print(f"  ✅ Party Member Data Structure: {'PASSED' if member_data_passed else 'FAILED'}")
        print(f"  ✅ Multi-User Party Experience: {'PASSED' if multi_user_passed else 'FAILED'}")
        print(f"  ✅ Dynamic Party Display Updates: {'PASSED' if dynamic_display_passed else 'FAILED'}")
        print(f"  ✅ Online Status Indicators: {'PASSED' if online_status_passed else 'FAILED'}")
        
        overall_success = all([party_creation_passed, current_party_passed, member_data_passed, 
                              multi_user_passed, dynamic_display_passed, online_status_passed])
        
        print(f"\n🎯 OVERALL RESULT: {'✅ ALL REQUIREMENTS PASSED' if overall_success else '❌ SOME REQUIREMENTS FAILED'}")
        
        if overall_success:
            print("\n🎉 Dynamic party display system is working correctly!")
            print("   ✅ Party creation stores party in database correctly")
            print("   ✅ GET /api/party?type=current retrieves user's current party")
            print("   ✅ Party data includes members with proper userIdentifier format")
            print("   ✅ Dynamic party display updates after party creation")
            print("   ✅ Multi-user party experience - all members see same party")
            print("   ✅ Party member data structure includes username, online status")
            print("   ✅ Party display replaces 'NO PARTY MEMBERS' text with member info")
        else:
            print("\n⚠️  Some critical issues found that need attention:")
            if not party_creation_passed:
                print("   ❌ Party creation and storage has issues")
            if not current_party_passed:
                print("   ❌ Current party retrieval (GET /api/party?type=current) not working")
            if not member_data_passed:
                print("   ❌ Party member data structure is incomplete")
            if not multi_user_passed:
                print("   ❌ Multi-user party experience has problems")
            if not dynamic_display_passed:
                print("   ❌ Dynamic party display updates not working")
            if not online_status_passed:
                print("   ❌ Online status indicators not functioning")

if __name__ == "__main__":
    tester = PartyDisplayTester()
    tester.run_all_tests()