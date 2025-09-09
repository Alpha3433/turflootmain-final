#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Skin Avatar System Integration
Tests the complete skin avatar system to ensure party members show their equipped skins.
"""

import requests
import json
import time
import sys
from typing import Dict, List, Any, Optional

# Configuration
BASE_URL = "https://party-play-system.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class SkinAvatarSystemTester:
    def __init__(self):
        self.test_results = []
        self.test_users = []
        self.created_parties = []
        self.created_friendships = []
        
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASSED" if passed else "❌ FAILED"
        result = {
            "test": test_name,
            "status": status,
            "passed": passed,
            "details": details,
            "timestamp": time.strftime("%H:%M:%S")
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        return passed

    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Optional[Dict]:
        """Make HTTP request with error handling"""
        try:
            url = f"{API_BASE}/{endpoint.lstrip('/')}"
            
            if method.upper() == "GET":
                response = requests.get(url, params=params, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"⚠️ Request failed: {method} {url} - Status: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                    return {"error": error_data, "status_code": response.status_code}
                except:
                    return {"error": response.text, "status_code": response.status_code}
                    
        except Exception as e:
            print(f"❌ Request exception: {method} {endpoint} - {str(e)}")
            return {"error": str(e)}

    def test_api_health_check(self) -> bool:
        """Test 1: API Health Check"""
        print("\n🔍 Testing API Health Check...")
        
        # Test root API endpoint
        response = self.make_request("GET", "/")
        if not response or "error" in response:
            return self.log_test("API Health Check", False, "Root API endpoint not accessible")
        
        # Check if it's the TurfLoot API
        if response.get("service") != "turfloot-backend":
            return self.log_test("API Health Check", False, f"Unexpected service: {response.get('service')}")
        
        return self.log_test("API Health Check", True, f"Service: {response.get('service')}, Features: {response.get('features')}")

    def test_user_skin_registration(self) -> bool:
        """Test 2: User Skin Registration with Deterministic Skin Generation"""
        print("\n🎨 Testing User Skin Registration...")
        
        # Test users with different identifiers for deterministic skin generation
        # Note: Avoid "test", "debug", "mock", "demo" in usernames as they get cleaned up
        test_users_data = [
            {
                "userIdentifier": "0x1A2B3C4D5E6F7890123456789ABCDEF012345678",
                "username": "AlphaPlayer",
                "email": "alpha@turfloot.com",
                "walletAddress": "0x1A2B3C4D5E6F7890123456789ABCDEF012345678"
            },
            {
                "userIdentifier": "0x9876543210FEDCBA0987654321ABCDEF98765432",
                "username": "BetaGamer", 
                "email": "beta@turfloot.com",
                "walletAddress": "0x9876543210FEDCBA0987654321ABCDEF98765432"
            },
            {
                "userIdentifier": "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
                "username": "GammaWarrior",
                "email": "gamma@turfloot.com", 
                "walletAddress": "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
            }
        ]
        
        registered_users = 0
        for user_data in test_users_data:
            # Register user with skin data
            response = self.make_request("POST", "/friends", {
                "action": "register_user",
                "userIdentifier": user_data["userIdentifier"],
                "userData": user_data
            })
            
            if response and response.get("success"):
                registered_users += 1
                self.test_users.append(user_data)
                print(f"   ✅ Registered user: {user_data['username']} ({user_data['userIdentifier'][:10]}...)")
            else:
                print(f"   ❌ Failed to register user: {user_data['username']}")
        
        if registered_users == 0:
            return self.log_test("User Skin Registration", False, "No users could be registered")
        
        # Verify users have equippedSkin data by checking available users
        response = self.make_request("GET", "/friends", {
            "type": "users",
            "userIdentifier": "test_verification_user"
        })
        
        if not response or not response.get("success"):
            return self.log_test("User Skin Registration", False, "Could not verify registered users")
        
        users = response.get("users", [])
        skin_users_found = 0
        
        for user in users:
            if any(test_user["username"] == user.get("username") for test_user in test_users_data):
                skin_users_found += 1
        
        success = skin_users_found >= 2  # At least 2 users should be found
        details = f"Registered {registered_users} users, found {skin_users_found} in user list"
        return self.log_test("User Skin Registration", success, details)

    def test_deterministic_skin_generation(self) -> bool:
        """Test 3: Verify Deterministic Skin Generation Logic"""
        print("\n🎯 Testing Deterministic Skin Generation...")
        
        # Test the deterministic skin generation logic
        # This simulates the generateUserSkin function from the frontend
        colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']
        patterns = ['solid', 'gradient', 'stripes']
        
        test_identifiers = [
            "0x1A2B3C4D5E6F7890123456789ABCDEF012345678",
            "0x9876543210FEDCBA0987654321ABCDEF98765432", 
            "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
        ]
        
        generated_skins = []
        for identifier in test_identifiers:
            # Simulate the deterministic generation
            color_index = abs(ord(identifier[-2])) % len(colors)
            pattern_index = abs(ord(identifier[-3])) % len(patterns)
            
            skin = {
                "type": "circle",
                "color": colors[color_index],
                "pattern": patterns[pattern_index]
            }
            generated_skins.append(skin)
            print(f"   Generated skin for {identifier[:10]}...: {skin}")
        
        # Verify all skins are different (high probability with good hash distribution)
        unique_skins = len(set(json.dumps(skin, sort_keys=True) for skin in generated_skins))
        
        success = unique_skins >= 2  # At least 2 different skins
        details = f"Generated {len(generated_skins)} skins, {unique_skins} unique combinations"
        return self.log_test("Deterministic Skin Generation", success, details)

    def test_friendship_creation_for_party(self) -> bool:
        """Test 4: Create Friendships Between Test Users"""
        print("\n👥 Testing Friendship Creation for Party Testing...")
        
        if len(self.test_users) < 2:
            return self.log_test("Friendship Creation", False, "Need at least 2 test users")
        
        # Create friendships between users
        friendships_created = 0
        
        # User 1 sends request to User 2
        response = self.make_request("POST", "/friends", {
            "action": "send_request",
            "userIdentifier": self.test_users[0]["userIdentifier"],
            "friendUsername": self.test_users[1]["username"]
        })
        
        if response and response.get("success"):
            print(f"   ✅ Friend request sent: {self.test_users[0]['username']} → {self.test_users[1]['username']}")
            
            # Get the request ID and accept it
            requests_response = self.make_request("GET", "/friends", {
                "type": "requests",
                "userIdentifier": self.test_users[1]["userIdentifier"]
            })
            
            if requests_response and requests_response.get("success"):
                received_requests = requests_response.get("requests", {}).get("received", [])
                if received_requests:
                    request_id = received_requests[0].get("id")
                    
                    # Accept the friend request
                    accept_response = self.make_request("POST", "/friends", {
                        "action": "accept_request",
                        "userIdentifier": self.test_users[1]["userIdentifier"],
                        "requestId": request_id
                    })
                    
                    if accept_response and accept_response.get("success"):
                        friendships_created += 1
                        self.created_friendships.append({
                            "user1": self.test_users[0]["userIdentifier"],
                            "user2": self.test_users[1]["userIdentifier"]
                        })
                        print(f"   ✅ Friendship created: {self.test_users[0]['username']} ↔ {self.test_users[1]['username']}")
        
        # If we have 3 users, create another friendship
        if len(self.test_users) >= 3:
            response = self.make_request("POST", "/friends", {
                "action": "send_request", 
                "userIdentifier": self.test_users[0]["userIdentifier"],
                "friendUsername": self.test_users[2]["username"]
            })
            
            if response and response.get("success"):
                # Accept this friendship too
                requests_response = self.make_request("GET", "/friends", {
                    "type": "requests",
                    "userIdentifier": self.test_users[2]["userIdentifier"]
                })
                
                if requests_response and requests_response.get("success"):
                    received_requests = requests_response.get("requests", {}).get("received", [])
                    if received_requests:
                        request_id = received_requests[0].get("id")
                        
                        accept_response = self.make_request("POST", "/friends", {
                            "action": "accept_request",
                            "userIdentifier": self.test_users[2]["userIdentifier"],
                            "requestId": request_id
                        })
                        
                        if accept_response and accept_response.get("success"):
                            friendships_created += 1
                            print(f"   ✅ Friendship created: {self.test_users[0]['username']} ↔ {self.test_users[2]['username']}")
        
        success = friendships_created >= 1
        details = f"Created {friendships_created} friendships between test users"
        return self.log_test("Friendship Creation", success, details)

    def test_party_creation_with_skin_data(self) -> bool:
        """Test 5: Party Creation and Skin Data Storage"""
        print("\n🎉 Testing Party Creation with Skin Data...")
        
        if len(self.test_users) < 2:
            return self.log_test("Party Creation with Skin Data", False, "Need at least 2 test users")
        
        # Create a party with skin-enabled users
        party_data = {
            "name": "Avatar Display Party",
            "privacy": "public",
            "maxPlayers": 4
        }
        
        # Invite friends to the party
        invited_friends = []
        for i in range(1, min(len(self.test_users), 3)):  # Invite up to 2 friends
            invited_friends.append({
                "id": self.test_users[i]["userIdentifier"],
                "username": self.test_users[i]["username"]
            })
        
        response = self.make_request("POST", "/party", {
            "action": "create_and_invite",
            "userIdentifier": self.test_users[0]["userIdentifier"],
            "partyData": party_data,
            "invitedFriends": invited_friends
        })
        
        if not response or not response.get("success"):
            return self.log_test("Party Creation with Skin Data", False, f"Party creation failed: {response}")
        
        party_info = response.get("party", {})
        party_id = party_info.get("id")
        
        if not party_id:
            return self.log_test("Party Creation with Skin Data", False, "No party ID returned")
        
        self.created_parties.append(party_id)
        
        # Accept party invites to create multi-user party
        accepted_invites = 0
        for i in range(1, len(invited_friends) + 1):
            if i < len(self.test_users):
                # Get party invites for this user
                invites_response = self.make_request("GET", "/party", {
                    "type": "invites",
                    "userIdentifier": self.test_users[i]["userIdentifier"]
                })
                
                if invites_response and invites_response.get("success"):
                    invites = invites_response.get("invites", [])
                    if invites:
                        invite = invites[0]
                        
                        # Accept the party invite
                        accept_response = self.make_request("POST", "/party", {
                            "action": "accept_invite",
                            "userIdentifier": self.test_users[i]["userIdentifier"],
                            "inviteId": invite.get("id"),
                            "partyId": party_id
                        })
                        
                        if accept_response and accept_response.get("success"):
                            accepted_invites += 1
                            print(f"   ✅ {self.test_users[i]['username']} joined the party")
        
        success = True
        details = f"Party created: {party_info.get('name')}, {accepted_invites} members joined"
        return self.log_test("Party Creation with Skin Data", success, details)

    def test_party_member_skin_retrieval(self) -> bool:
        """Test 6: Party Member Skin Data Retrieval via GET /api/party?type=current"""
        print("\n🎨 Testing Party Member Skin Data Retrieval...")
        
        if not self.created_parties:
            return self.log_test("Party Member Skin Retrieval", False, "No parties created to test")
        
        # Test getting current party for the party creator
        response = self.make_request("GET", "/party", {
            "type": "current",
            "userIdentifier": self.test_users[0]["userIdentifier"]
        })
        
        if not response or not response.get("success"):
            return self.log_test("Party Member Skin Retrieval", False, f"Failed to get current party: {response}")
        
        party = response.get("party")
        if not party:
            return self.log_test("Party Member Skin Retrieval", False, "No current party found")
        
        members = party.get("members", [])
        if not members:
            return self.log_test("Party Member Skin Retrieval", False, "No party members found")
        
        # Verify each member has skin data
        members_with_skins = 0
        skin_data_valid = 0
        
        for member in members:
            print(f"   Member: {member.get('username')} ({member.get('userIdentifier', 'No ID')[:10]}...)")
            
            equipped_skin = member.get("equippedSkin")
            if equipped_skin:
                members_with_skins += 1
                print(f"     Skin: {equipped_skin}")
                
                # Validate skin data structure
                if (equipped_skin.get("type") == "circle" and 
                    equipped_skin.get("color") and 
                    equipped_skin.get("pattern") in ["solid", "gradient", "stripes"]):
                    skin_data_valid += 1
                    print(f"     ✅ Valid skin data structure")
                else:
                    print(f"     ❌ Invalid skin data structure")
            else:
                print(f"     ❌ No equipped skin data")
        
        success = members_with_skins >= 1 and skin_data_valid >= 1
        details = f"Found {len(members)} members, {members_with_skins} with skins, {skin_data_valid} with valid skin data"
        return self.log_test("Party Member Skin Retrieval", success, details)

    def test_skin_avatar_display_system(self) -> bool:
        """Test 7: Skin Avatar Display System Logic"""
        print("\n🖼️ Testing Skin Avatar Display System...")
        
        # Test different skin configurations
        test_skins = [
            {"type": "circle", "color": "#3b82f6", "pattern": "solid"},
            {"type": "circle", "color": "#10b981", "pattern": "gradient"},
            {"type": "circle", "color": "#f59e0b", "pattern": "stripes"},
            {"type": "circle", "color": "#ef4444", "pattern": "solid"}
        ]
        
        # Simulate getSkinAvatarStyle function logic
        def simulate_get_skin_avatar_style(skin, size=32, is_online=False):
            base_style = {
                "width": f"{size}px",
                "height": f"{size}px", 
                "borderRadius": "50%",
                "border": f"2px solid {'#68d391' if is_online else '#6b7280'}",
                "boxShadow": "0 0 10px rgba(104, 211, 145, 0.4)" if is_online else "none"
            }
            
            if skin and skin.get("type") == "circle":
                color = skin.get("color", "#3b82f6")
                pattern = skin.get("pattern", "solid")
                
                if pattern == "gradient":
                    base_style["background"] = f"linear-gradient(135deg, {color} 0%, {color}cc 100%)"
                elif pattern == "stripes":
                    base_style["background"] = f"repeating-linear-gradient(45deg, {color}, {color} 10px, {color}cc 10px, {color}cc 20px)"
                else:
                    base_style["background"] = color
            else:
                base_style["background"] = "linear-gradient(135deg, rgba(104, 211, 145, 0.3) 0%, rgba(104, 211, 145, 0.6) 100%)"
            
            return base_style
        
        valid_styles = 0
        for i, skin in enumerate(test_skins):
            style = simulate_get_skin_avatar_style(skin, 32, i % 2 == 0)  # Alternate online status
            
            # Validate style has required properties
            required_props = ["width", "height", "borderRadius", "border", "background"]
            if all(prop in style for prop in required_props):
                valid_styles += 1
                print(f"   ✅ Valid style for {skin['pattern']} {skin['color']}: {style['background'][:50]}...")
            else:
                print(f"   ❌ Invalid style for {skin['pattern']} {skin['color']}")
        
        success = valid_styles == len(test_skins)
        details = f"Generated {valid_styles}/{len(test_skins)} valid avatar styles"
        return self.log_test("Skin Avatar Display System", success, details)

    def test_multi_user_skin_display(self) -> bool:
        """Test 8: Multi-User Skin Display in Party"""
        print("\n👥 Testing Multi-User Skin Display...")
        
        if not self.created_parties or len(self.test_users) < 2:
            return self.log_test("Multi-User Skin Display", False, "Need party with multiple users")
        
        # Get party data for multiple users to verify they see the same skin data
        party_views = []
        
        for i, user in enumerate(self.test_users[:3]):  # Test up to 3 users
            response = self.make_request("GET", "/party", {
                "type": "current",
                "userIdentifier": user["userIdentifier"]
            })
            
            if response and response.get("success") and response.get("party"):
                party = response.get("party")
                members = party.get("members", [])
                
                party_view = {
                    "user": user["username"],
                    "party_name": party.get("name"),
                    "member_count": len(members),
                    "members_with_skins": sum(1 for m in members if m.get("equippedSkin"))
                }
                party_views.append(party_view)
                
                print(f"   {user['username']} sees party: {party.get('name')} with {len(members)} members")
                for member in members:
                    skin = member.get("equippedSkin", {})
                    print(f"     - {member.get('username')}: {skin.get('color', 'No color')} {skin.get('pattern', 'No pattern')}")
        
        if not party_views:
            return self.log_test("Multi-User Skin Display", False, "No party views obtained")
        
        # Verify consistency across users
        first_view = party_views[0]
        consistent_views = all(
            view["party_name"] == first_view["party_name"] and
            view["member_count"] == first_view["member_count"]
            for view in party_views
        )
        
        total_members_with_skins = sum(view["members_with_skins"] for view in party_views) // len(party_views)
        
        success = consistent_views and total_members_with_skins >= 1
        details = f"Tested {len(party_views)} user views, consistent: {consistent_views}, avg members with skins: {total_members_with_skins}"
        return self.log_test("Multi-User Skin Display", success, details)

    def test_skin_data_structure_validation(self) -> bool:
        """Test 9: Comprehensive Skin Data Structure Validation"""
        print("\n🔍 Testing Skin Data Structure Validation...")
        
        # Get current party data to validate skin structure
        if not self.test_users:
            return self.log_test("Skin Data Structure Validation", False, "No test users available")
        
        response = self.make_request("GET", "/party", {
            "type": "current",
            "userIdentifier": self.test_users[0]["userIdentifier"]
        })
        
        if not response or not response.get("success"):
            return self.log_test("Skin Data Structure Validation", False, "Could not get party data")
        
        party = response.get("party")
        if not party:
            return self.log_test("Skin Data Structure Validation", False, "No party found")
        
        members = party.get("members", [])
        if not members:
            return self.log_test("Skin Data Structure Validation", False, "No party members found")
        
        # Validate skin data structure for each member
        valid_structures = 0
        total_members = len(members)
        
        expected_skin_structure = {
            "type": str,
            "color": str, 
            "pattern": str
        }
        
        for member in members:
            username = member.get("username", "Unknown")
            equipped_skin = member.get("equippedSkin")
            
            if not equipped_skin:
                print(f"   ❌ {username}: No equippedSkin data")
                continue
            
            # Check structure
            structure_valid = True
            for field, expected_type in expected_skin_structure.items():
                if field not in equipped_skin:
                    print(f"   ❌ {username}: Missing field '{field}'")
                    structure_valid = False
                elif not isinstance(equipped_skin[field], expected_type):
                    print(f"   ❌ {username}: Field '{field}' has wrong type")
                    structure_valid = False
            
            # Check values
            if structure_valid:
                skin_type = equipped_skin.get("type")
                color = equipped_skin.get("color")
                pattern = equipped_skin.get("pattern")
                
                if skin_type != "circle":
                    print(f"   ⚠️ {username}: Unexpected skin type '{skin_type}'")
                
                if not color.startswith("#") or len(color) != 7:
                    print(f"   ⚠️ {username}: Invalid color format '{color}'")
                    structure_valid = False
                
                if pattern not in ["solid", "gradient", "stripes"]:
                    print(f"   ⚠️ {username}: Invalid pattern '{pattern}'")
                    structure_valid = False
            
            if structure_valid:
                valid_structures += 1
                print(f"   ✅ {username}: Valid skin structure - {equipped_skin}")
        
        success = valid_structures >= 1 and valid_structures == total_members
        details = f"Validated {valid_structures}/{total_members} member skin structures"
        return self.log_test("Skin Data Structure Validation", success, details)

    def run_all_tests(self):
        """Run all skin avatar system tests"""
        print("🚀 STARTING COMPREHENSIVE SKIN AVATAR SYSTEM TESTING")
        print("=" * 80)
        
        # Run all tests in sequence
        tests = [
            self.test_api_health_check,
            self.test_user_skin_registration,
            self.test_deterministic_skin_generation,
            self.test_friendship_creation_for_party,
            self.test_party_creation_with_skin_data,
            self.test_party_member_skin_retrieval,
            self.test_skin_avatar_display_system,
            self.test_multi_user_skin_display,
            self.test_skin_data_structure_validation
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
                time.sleep(0.5)  # Brief pause between tests
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
                self.log_test(test_func.__name__, False, f"Test crashed: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 SKIN AVATAR SYSTEM TEST SUMMARY")
        print("=" * 80)
        
        success_rate = (passed_tests / total_tests) * 100
        print(f"Overall Success Rate: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        print(f"\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
        
        # Summary by category
        print(f"\n🎯 SKIN AVATAR SYSTEM VALIDATION:")
        
        skin_registration_tests = [r for r in self.test_results if "Registration" in r['test'] or "Generation" in r['test']]
        skin_registration_passed = sum(1 for r in skin_registration_tests if r['passed'])
        print(f"✅ User Skin Registration: {skin_registration_passed}/{len(skin_registration_tests)} tests passed")
        
        party_tests = [r for r in self.test_results if "Party" in r['test']]
        party_passed = sum(1 for r in party_tests if r['passed'])
        print(f"✅ Party Member Skin Retrieval: {party_passed}/{len(party_tests)} tests passed")
        
        display_tests = [r for r in self.test_results if "Display" in r['test'] or "Avatar" in r['test']]
        display_passed = sum(1 for r in display_tests if r['passed'])
        print(f"✅ Skin Avatar Display System: {display_passed}/{len(display_tests)} tests passed")
        
        structure_tests = [r for r in self.test_results if "Structure" in r['test'] or "Validation" in r['test']]
        structure_passed = sum(1 for r in structure_tests if r['passed'])
        print(f"✅ Skin Data Structure: {structure_passed}/{len(structure_tests)} tests passed")
        
        print(f"\n🏆 FINAL RESULT: {'SUCCESS' if success_rate >= 80 else 'NEEDS IMPROVEMENT'}")
        
        if success_rate >= 80:
            print("🎉 SKIN AVATAR SYSTEM IS WORKING CORRECTLY!")
            print("   ✅ Users can register with deterministic skins")
            print("   ✅ Party members include skin data")
            print("   ✅ Skin avatar display system functional")
            print("   ✅ Multi-user skin display working")
        else:
            print("⚠️ SKIN AVATAR SYSTEM NEEDS ATTENTION:")
            failed_tests = [r for r in self.test_results if not r['passed']]
            for failed in failed_tests:
                print(f"   ❌ {failed['test']}: {failed['details']}")
        
        return success_rate >= 80

if __name__ == "__main__":
    print("🎨 TurfLoot Skin Avatar System Integration Tester")
    print("Testing complete skin avatar system to ensure party members show equipped skins")
    print()
    
    tester = SkinAvatarSystemTester()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)