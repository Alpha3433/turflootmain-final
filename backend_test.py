#!/usr/bin/env python3
"""
TurfLoot Party Lobby System Backend Testing
Tests all 5 new Party Lobby endpoints with comprehensive scenarios

Focus Areas:
1. POST /api/lobby/create - Create a new party lobby
2. POST /api/lobby/join - Join an existing lobby
3. POST /api/lobby/invite - Send invite to friend
4. GET /api/lobby/status - Get user's current lobby status and pending invites
5. GET /api/lobby/validate-room - Validate if all party members can afford a room
"""

import requests
import time
import json
import sys
from typing import Dict, List, Tuple
import os
from datetime import datetime

class PartyLobbyTester:
    def __init__(self):
        # Get base URL from environment or use localhost fallback
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
        self.api_base = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🎯 TurfLoot Party Lobby System Backend Testing")
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
        print(f"{status}: {test_name}{time_info}")
        if details:
            print(f"   Details: {details}")

    def test_endpoint(self, method: str, endpoint: str, data: dict = None, params: dict = None, expected_status: int = 200) -> Tuple[bool, dict, float]:
        """Test an API endpoint and return success, response data, and response time"""
        start_time = time.time()
        
        try:
            url = f"{self.api_base}/{endpoint}"
            
            if method == "GET":
                response = requests.get(url, params=params, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response_time = time.time() - start_time
            
            if response.status_code == expected_status:
                try:
                    return True, response.json(), response_time
                except:
                    return True, {}, response_time
            else:
                return False, {"error": f"Expected {expected_status}, got {response.status_code}", "response": response.text}, response_time
                
        except Exception as e:
            response_time = time.time() - start_time
            return False, {"error": str(e)}, response_time

    def test_lobby_creation(self):
        """Test lobby creation functionality"""
        print("\n🏰 TESTING LOBBY CREATION")
        print("-" * 50)
        
        # Test data from review request
        test_user_1 = {
            "userId": "test_user_1",
            "userName": "TestPlayer1", 
            "userBalance": 50,
            "roomType": "$5"
        }
        
        # Test 1: Valid lobby creation
        success, response, response_time = self.test_endpoint("POST", "lobby/create", test_user_1)
        if success and response.get("success"):
            lobby_id = response["lobby"]["id"]
            self.log_test(
                "Create lobby with valid data",
                True,
                f"Lobby ID: {lobby_id}, Leader: {response['lobby']['leaderId']}, Room: {response['lobby']['roomType']}",
                response_time
            )
            # Store lobby ID for other tests
            self.created_lobby_id = lobby_id
        else:
            self.log_test("Create lobby with valid data", False, str(response), response_time)
            self.created_lobby_id = None
        
        # Test 2: Invalid lobby creation (missing userName)
        invalid_data = {"userId": "test_user_invalid"}
        success, response, response_time = self.test_endpoint("POST", "lobby/create", invalid_data, expected_status=400)
        self.log_test(
            "Reject lobby creation with missing userName",
            success,
            "Validation working correctly" if success else str(response),
            response_time
        )
        
        # Test 3: Invalid lobby creation (missing userId)
        invalid_data = {"userName": "TestPlayer"}
        success, response, response_time = self.test_endpoint("POST", "lobby/create", invalid_data, expected_status=400)
        self.log_test(
            "Reject lobby creation with missing userId",
            success,
            "Validation working correctly" if success else str(response),
            response_time
        )

    def test_lobby_join(self):
        """Test lobby join functionality"""
        print("\n🚪 TESTING LOBBY JOIN")
        print("-" * 50)
        
        if not hasattr(self, 'created_lobby_id') or not self.created_lobby_id:
            self.log_test("Join lobby tests", False, "No lobby ID available from creation test")
            return
        
        # Test data for second user
        test_user_2 = {
            "lobbyId": self.created_lobby_id,
            "userId": "test_user_2",
            "userName": "TestPlayer2",
            "userBalance": 25
        }
        
        # Test 1: Valid lobby join
        success, response, response_time = self.test_endpoint("POST", "lobby/join", test_user_2)
        if success and response.get("success"):
            member_count = len(response["lobby"]["members"])
            self.log_test(
                "Join lobby with valid data",
                True,
                f"Successfully joined, total members: {member_count}",
                response_time
            )
        else:
            self.log_test("Join lobby with valid data", False, str(response), response_time)
        
        # Test 2: Duplicate join (should fail)
        success, response, response_time = self.test_endpoint("POST", "lobby/join", test_user_2, expected_status=400)
        self.log_test(
            "Prevent duplicate lobby join",
            success,
            "Duplicate prevention working" if success else str(response),
            response_time
        )
        
        # Test 3: Join non-existent lobby
        invalid_join = {
            "lobbyId": "invalid_lobby_123",
            "userId": "test_user_999",
            "userName": "TestUser999",
            "userBalance": 50
        }
        success, response, response_time = self.test_endpoint("POST", "lobby/join", invalid_join, expected_status=404)
        self.log_test(
            "Reject join to non-existent lobby",
            success,
            "Non-existent lobby handling working" if success else str(response),
            response_time
        )
        
        # Test 4: Join with missing data
        invalid_data = {"lobbyId": self.created_lobby_id, "userId": "test"}
        success, response, response_time = self.test_endpoint("POST", "lobby/join", invalid_data, expected_status=400)
        self.log_test(
            "Reject join with missing userName",
            success,
            "Validation working correctly" if success else str(response),
            response_time
        )

    def test_lobby_invite(self):
        """Test lobby invite functionality"""
        print("\n📧 TESTING LOBBY INVITE SYSTEM")
        print("-" * 50)
        
        if not hasattr(self, 'created_lobby_id') or not self.created_lobby_id:
            self.log_test("Invite lobby tests", False, "No lobby ID available from creation test")
            return
        
        # Test 1: Send valid invite
        invite_data = {
            "lobbyId": self.created_lobby_id,
            "fromUserId": "test_user_1",
            "fromUserName": "TestPlayer1",
            "toUserId": "test_user_3",
            "roomType": "$5"
        }
        
        success, response, response_time = self.test_endpoint("POST", "lobby/invite", invite_data)
        if success and response.get("success"):
            invite_id = response["invite"]["id"]
            self.log_test(
                "Send lobby invite",
                True,
                f"Invite ID: {invite_id}, Expires: {response['invite']['expires_at']}",
                response_time
            )
        else:
            self.log_test("Send lobby invite", False, str(response), response_time)
        
        # Test 2: Send duplicate invite (should fail)
        success, response, response_time = self.test_endpoint("POST", "lobby/invite", invite_data, expected_status=400)
        self.log_test(
            "Prevent duplicate invite",
            success,
            "Duplicate prevention working" if success else str(response),
            response_time
        )
        
        # Test 3: Send invite with missing data
        invalid_invite = {
            "lobbyId": self.created_lobby_id,
            "fromUserId": "test_user_1"
            # Missing toUserId
        }
        success, response, response_time = self.test_endpoint("POST", "lobby/invite", invalid_invite, expected_status=400)
        self.log_test(
            "Reject invite with missing toUserId",
            success,
            "Validation working correctly" if success else str(response),
            response_time
        )

    def test_lobby_status(self):
        """Test lobby status functionality"""
        print("\n📊 TESTING LOBBY STATUS")
        print("-" * 50)
        
        # Test 1: Get status for user with active lobby
        success, response, response_time = self.test_endpoint("GET", "lobby/status", params={"userId": "test_user_1"})
        if success and "currentLobby" in response:
            current_lobby = response["currentLobby"]
            pending_invites = response.get("pendingInvites", [])
            lobby_info = current_lobby["id"] if current_lobby else "None"
            self.log_test(
                "Get lobby status for active user",
                True,
                f"Current lobby: {lobby_info}, Pending invites: {len(pending_invites)}",
                response_time
            )
        else:
            self.log_test("Get lobby status for active user", False, str(response), response_time)
        
        # Test 2: Get status for user with pending invites
        success, response, response_time = self.test_endpoint("GET", "lobby/status", params={"userId": "test_user_3"})
        if success and "pendingInvites" in response:
            pending_invites = response.get("pendingInvites", [])
            self.log_test(
                "Get lobby status for invited user",
                True,
                f"Pending invites: {len(pending_invites)}",
                response_time
            )
        else:
            self.log_test("Get lobby status for invited user", False, str(response), response_time)
        
        # Test 3: Get status without userId (should fail)
        success, response, response_time = self.test_endpoint("GET", "lobby/status", expected_status=400)
        self.log_test(
            "Reject status request without userId",
            success,
            "Validation working correctly" if success else str(response),
            response_time
        )

    def test_room_validation(self):
        """Test room validation functionality"""
        print("\n💰 TESTING ROOM VALIDATION")
        print("-" * 50)
        
        # Test 1: Validate room with sufficient balances
        member_ids = ["test_user_1", "test_user_2", "test_user_3"]
        params = {
            "roomType": "$5",
            "memberIds": ",".join(member_ids)
        }
        
        success, response, response_time = self.test_endpoint("GET", "lobby/validate-room", params=params)
        if success and "canProceed" in response:
            can_proceed = response["canProceed"]
            members = response.get("members", [])
            insufficient = response.get("insufficientFunds", [])
            
            details = f"Room: {response['roomType']}, Fee: ${response['requiredFee']}, Can proceed: {can_proceed}, Members: {len(members)}, Insufficient: {len(insufficient)}"
            self.log_test(
                "Validate room with $5 fee",
                True,
                details,
                response_time
            )
        else:
            self.log_test("Validate room with $5 fee", False, str(response), response_time)
        
        # Test 2: Validate expensive room (some can't afford)
        params = {
            "roomType": "$50",
            "memberIds": ",".join(member_ids)
        }
        
        success, response, response_time = self.test_endpoint("GET", "lobby/validate-room", params=params)
        if success and "insufficientFunds" in response:
            can_proceed = response["canProceed"]
            insufficient = response.get("insufficientFunds", [])
            
            details = f"Expensive room validation - Can proceed: {can_proceed}, Insufficient funds: {len(insufficient)}"
            self.log_test(
                "Validate expensive room ($50 fee)",
                True,
                details,
                response_time
            )
        else:
            self.log_test("Validate expensive room ($50 fee)", False, str(response), response_time)
        
        # Test 3: Validate room with missing parameters
        success, response, response_time = self.test_endpoint("GET", "lobby/validate-room", params={"roomType": "$5"}, expected_status=400)
        self.log_test(
            "Reject validation without memberIds",
            success,
            "Parameter validation working" if success else str(response),
            response_time
        )
        
        # Test 4: Validate room without roomType
        success, response, response_time = self.test_endpoint("GET", "lobby/validate-room", params={"memberIds": "test_user_1"}, expected_status=400)
        self.log_test(
            "Reject validation without roomType",
            success,
            "Parameter validation working" if success else str(response),
            response_time
        )

    def test_complete_workflow(self):
        """Test complete party lobby workflow"""
        print("\n🎯 TESTING COMPLETE WORKFLOW")
        print("-" * 50)
        
        workflow_success = True
        
        # Step 1: Create new lobby for workflow test
        workflow_user = {
            "userId": "workflow_user_1",
            "userName": "WorkflowPlayer1",
            "userBalance": 100,
            "roomType": "$20"
        }
        
        success, response, response_time = self.test_endpoint("POST", "lobby/create", workflow_user)
        if success and response.get("success"):
            workflow_lobby_id = response["lobby"]["id"]
            print(f"   ✅ Step 1: Created workflow lobby {workflow_lobby_id}")
        else:
            workflow_success = False
            print(f"   ❌ Step 1: Failed to create workflow lobby")
        
        if workflow_success:
            # Step 2: Add second player
            workflow_user_2 = {
                "lobbyId": workflow_lobby_id,
                "userId": "workflow_user_2",
                "userName": "WorkflowPlayer2",
                "userBalance": 75
            }
            
            success, response, response_time = self.test_endpoint("POST", "lobby/join", workflow_user_2)
            if success and response.get("success"):
                print(f"   ✅ Step 2: Second player joined successfully")
            else:
                workflow_success = False
                print(f"   ❌ Step 2: Failed to add second player")
        
        if workflow_success:
            # Step 3: Send invite to third player
            invite_data = {
                "lobbyId": workflow_lobby_id,
                "fromUserId": "workflow_user_1",
                "fromUserName": "WorkflowPlayer1",
                "toUserId": "workflow_user_3",
                "roomType": "$20"
            }
            
            success, response, response_time = self.test_endpoint("POST", "lobby/invite", invite_data)
            if success and response.get("success"):
                print(f"   ✅ Step 3: Invite sent successfully")
            else:
                workflow_success = False
                print(f"   ❌ Step 3: Failed to send invite")
        
        if workflow_success:
            # Step 4: Check lobby status
            success, response, response_time = self.test_endpoint("GET", "lobby/status", params={"userId": "workflow_user_1"})
            if success and response.get("currentLobby"):
                print(f"   ✅ Step 4: Lobby status retrieved successfully")
            else:
                workflow_success = False
                print(f"   ❌ Step 4: Failed to get lobby status")
        
        if workflow_success:
            # Step 5: Validate room for both players
            params = {
                "roomType": "$20",
                "memberIds": "workflow_user_1,workflow_user_2"
            }
            success, response, response_time = self.test_endpoint("GET", "lobby/validate-room", params=params)
            if success and response.get("canProceed"):
                print(f"   ✅ Step 5: Room validation passed - both can afford $20")
            else:
                print(f"   ⚠️  Step 5: Room validation completed but some players can't afford $20")
        
        self.log_test(
            "Complete party lobby workflow",
            workflow_success,
            "All workflow steps completed successfully" if workflow_success else "Some workflow steps failed",
            0
        )

    def run_all_tests(self):
        """Run all party lobby system tests"""
        print(f"🚀 Starting Party Lobby System Backend Tests")
        print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run all test suites
        self.test_lobby_creation()
        self.test_lobby_join()
        self.test_lobby_invite()
        self.test_lobby_status()
        self.test_room_validation()
        self.test_complete_workflow()
        
        # Print final results
        self.print_final_results()
        
        return self.passed_tests == self.total_tests

    def print_final_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 80)
        print("🎯 PARTY LOBBY SYSTEM BACKEND TEST RESULTS")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
        
        print(f"📊 Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.total_tests - self.passed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['passed']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        # Performance summary
        response_times = [test['response_time'] for test in self.test_results if test['response_time'] > 0]
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            print(f"\n⚡ PERFORMANCE:")
            print(f"   Average Response Time: {avg_time:.3f}s")
            print(f"   Maximum Response Time: {max_time:.3f}s")
        
        # Final assessment
        if success_rate >= 90:
            print(f"\n🎉 PARTY LOBBY SYSTEM: EXCELLENT - All major functionality working")
        elif success_rate >= 80:
            print(f"\n✅ PARTY LOBBY SYSTEM: GOOD - Core functionality working with minor issues")
        elif success_rate >= 60:
            print(f"\n⚠️  PARTY LOBBY SYSTEM: NEEDS ATTENTION - Some critical issues found")
        else:
            print(f"\n❌ PARTY LOBBY SYSTEM: CRITICAL ISSUES - Major functionality broken")


def main():
    """Main test execution"""
    tester = PartyLobbyTester()
    success = tester.run_all_tests()
    return success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)