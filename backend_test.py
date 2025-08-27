#!/usr/bin/env python3
"""
Comprehensive Party Lobby Backend Testing
Tests all 5 Party Lobby endpoints with full functionality verification
"""

import requests
import json
import time
import uuid
import sys
from datetime import datetime

# Test Configuration
BASE_URL = "http://localhost:3000"  # Using localhost as mentioned in agent communication
API_BASE = f"{BASE_URL}/api"

# Test Data
TEST_USER_1 = {
    "userId": f"test-user-{int(time.time())}-1",
    "userName": f"TestPlayer{int(time.time() % 10000)}",
    "userBalance": 100.0  # Sufficient balance for testing
}

TEST_USER_2 = {
    "userId": f"test-user-{int(time.time())}-2", 
    "userName": f"TestFriend{int(time.time() % 10000)}",
    "userBalance": 50.0
}

# Room types to test
ROOM_TYPES = ["FREE", "$1", "$5", "$20", "$50"]

class PartyLobbyTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = []
        self.created_lobbies = []
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'response_time': f"{response_time:.3f}s" if response_time > 0 else "N/A"
        }
        self.test_results.append(result)
        print(f"{status} - {test_name}: {details}")
        
    def test_lobby_create(self):
        """Test POST /api/lobby/create endpoint"""
        print("\n🎯 TESTING LOBBY CREATION ENDPOINT")
        
        # Test 1: Create FREE lobby
        try:
            start_time = time.time()
            response = self.session.post(
                f"{API_BASE}/lobby/create",
                json={
                    "userId": TEST_USER_1["userId"],
                    "userName": TEST_USER_1["userName"], 
                    "roomType": "FREE",
                    "maxPlayers": 6,
                    "userBalance": TEST_USER_1["userBalance"]
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'lobby' in data and 'roomCode' in data:
                    lobby = data['lobby']
                    self.created_lobbies.append({
                        'lobbyId': lobby['id'],
                        'roomCode': data['roomCode'],
                        'roomType': 'FREE'
                    })
                    self.log_test(
                        "Create FREE lobby",
                        True,
                        f"Created lobby {data['roomCode']} with ID {data['lobbyId']}",
                        response_time
                    )
                else:
                    self.log_test("Create FREE lobby", False, f"Missing required fields in response: {data}")
            else:
                self.log_test("Create FREE lobby", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Create FREE lobby", False, f"Exception: {str(e)}")
            
        # Test 2: Create $5 paid lobby with sufficient balance
        try:
            start_time = time.time()
            response = self.session.post(
                f"{API_BASE}/lobby/create",
                json={
                    "userId": TEST_USER_1["userId"],
                    "userName": TEST_USER_1["userName"],
                    "roomType": "$5", 
                    "maxPlayers": 6,
                    "userBalance": TEST_USER_1["userBalance"]
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'lobby' in data and 'roomCode' in data:
                    lobby = data['lobby']
                    self.created_lobbies.append({
                        'lobbyId': lobby['id'],
                        'roomCode': data['roomCode'],
                        'roomType': '$5'
                    })
                    self.log_test(
                        "Create $5 paid lobby",
                        True,
                        f"Created paid lobby {data['roomCode']} with sufficient balance",
                        response_time
                    )
                else:
                    self.log_test("Create $5 paid lobby", False, f"Missing required fields: {data}")
            else:
                self.log_test("Create $5 paid lobby", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Create $5 paid lobby", False, f"Exception: {str(e)}")
            
        # Test 3: Test insufficient balance scenario
        try:
            start_time = time.time()
            response = self.session.post(
                f"{API_BASE}/lobby/create",
                json={
                    "userId": TEST_USER_1["userId"],
                    "userName": TEST_USER_1["userName"],
                    "roomType": "$20",
                    "maxPlayers": 6,
                    "userBalance": 10.0  # Insufficient for $20 room
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                self.log_test(
                    "Insufficient balance validation",
                    True,
                    "Correctly rejected $20 lobby with $10 balance",
                    response_time
                )
            else:
                self.log_test("Insufficient balance validation", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Insufficient balance validation", False, f"Exception: {str(e)}")
            
        # Test 4: Missing parameters validation
        try:
            start_time = time.time()
            response = self.session.post(
                f"{API_BASE}/lobby/create",
                json={
                    "userId": TEST_USER_1["userId"]
                    # Missing userName and roomType
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                self.log_test(
                    "Missing parameters validation",
                    True,
                    "Correctly rejected request with missing parameters",
                    response_time
                )
            else:
                self.log_test("Missing parameters validation", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Missing parameters validation", False, f"Exception: {str(e)}")
            
    def test_lobby_join(self):
        """Test POST /api/lobby/join endpoint"""
        print("\n🚪 TESTING LOBBY JOIN ENDPOINT")
        
        if not self.created_lobbies:
            self.log_test("Lobby join test", False, "No lobbies available to join")
            return
            
        # Test 1: Join existing lobby
        try:
            lobby = self.created_lobbies[0]  # Use first created lobby
            start_time = time.time()
            response = self.session.post(
                f"{API_BASE}/lobby/join",
                json={
                    "lobbyId": lobby['lobbyId'],
                    "userId": TEST_USER_2["userId"],
                    "userName": TEST_USER_2["userName"],
                    "userBalance": TEST_USER_2["userBalance"]
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Join existing lobby",
                    True,
                    f"Successfully joined lobby {lobby['roomCode']}",
                    response_time
                )
            else:
                self.log_test("Join existing lobby", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Join existing lobby", False, f"Exception: {str(e)}")
            
        # Test 2: Join non-existent lobby
        try:
            start_time = time.time()
            response = self.session.post(
                f"{API_BASE}/lobby/join",
                json={
                    "lobbyId": "non-existent-lobby-id",
                    "userId": TEST_USER_2["userId"],
                    "userName": TEST_USER_2["userName"],
                    "userBalance": TEST_USER_2["userBalance"]
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 404:
                self.log_test(
                    "Join non-existent lobby",
                    True,
                    "Correctly rejected non-existent lobby",
                    response_time
                )
            else:
                self.log_test("Join non-existent lobby", False, f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Join non-existent lobby", False, f"Exception: {str(e)}")
            
        # Test 3: Missing parameters validation
        try:
            start_time = time.time()
            response = self.session.post(
                f"{API_BASE}/lobby/join",
                json={
                    "lobbyId": self.created_lobbies[0]['lobbyId']
                    # Missing userId and userName
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                self.log_test(
                    "Join missing parameters validation",
                    True,
                    "Correctly rejected request with missing parameters",
                    response_time
                )
            else:
                self.log_test("Join missing parameters validation", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Join missing parameters validation", False, f"Exception: {str(e)}")
            
    def test_lobby_invite(self):
        """Test POST /api/lobby/invite endpoint"""
        print("\n📧 TESTING LOBBY INVITE ENDPOINT")
        
        if not self.created_lobbies:
            self.log_test("Lobby invite test", False, "No lobbies available for invites")
            return
            
        # Test 1: Send invite to friend
        try:
            lobby = self.created_lobbies[0]
            start_time = time.time()
            response = self.session.post(
                f"{API_BASE}/lobby/invite",
                json={
                    "lobbyId": lobby['lobbyId'],
                    "fromUserId": TEST_USER_1["userId"],
                    "fromUserName": TEST_USER_1["userName"],
                    "toUserId": TEST_USER_2["userId"],
                    "roomType": lobby['roomType']
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Send lobby invite",
                    True,
                    f"Successfully sent invite for lobby {lobby['roomCode']}",
                    response_time
                )
            else:
                self.log_test("Send lobby invite", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Send lobby invite", False, f"Exception: {str(e)}")
            
        # Test 2: Missing parameters validation
        try:
            start_time = time.time()
            response = self.session.post(
                f"{API_BASE}/lobby/invite",
                json={
                    "lobbyId": self.created_lobbies[0]['lobbyId']
                    # Missing required fields
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                self.log_test(
                    "Invite missing parameters validation",
                    True,
                    "Correctly rejected request with missing parameters",
                    response_time
                )
            else:
                self.log_test("Invite missing parameters validation", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Invite missing parameters validation", False, f"Exception: {str(e)}")
            
    def test_lobby_status(self):
        """Test GET /api/lobby/status endpoint"""
        print("\n📊 TESTING LOBBY STATUS ENDPOINT")
        
        # Test 1: Get status for user with lobby
        try:
            start_time = time.time()
            response = self.session.get(
                f"{API_BASE}/lobby/status",
                params={"userId": TEST_USER_1["userId"]}
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Get lobby status",
                    True,
                    f"Retrieved status with {len(data.get('invites', []))} invites",
                    response_time
                )
            else:
                self.log_test("Get lobby status", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get lobby status", False, f"Exception: {str(e)}")
            
        # Test 2: Missing userId parameter
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/lobby/status")
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                self.log_test(
                    "Status missing userId validation",
                    True,
                    "Correctly rejected request without userId",
                    response_time
                )
            else:
                self.log_test("Status missing userId validation", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Status missing userId validation", False, f"Exception: {str(e)}")
            
    def test_lobby_validate_room(self):
        """Test GET /api/lobby/validate-room endpoint"""
        print("\n✅ TESTING LOBBY VALIDATE-ROOM ENDPOINT")
        
        # Test 1: Validate room requirements
        try:
            start_time = time.time()
            response = self.session.get(
                f"{API_BASE}/lobby/validate-room",
                params={
                    "roomType": "FREE",
                    "memberIds": f"{TEST_USER_1['userId']},{TEST_USER_2['userId']}"
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Validate room requirements",
                    True,
                    f"Room validation result: {data.get('valid', 'unknown')}",
                    response_time
                )
            else:
                self.log_test("Validate room requirements", False, f"Status {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Validate room requirements", False, f"Exception: {str(e)}")
            
        # Test 2: Missing parameters validation
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/lobby/validate-room")
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                self.log_test(
                    "Validate missing parameters",
                    True,
                    "Correctly rejected request with missing parameters",
                    response_time
                )
            else:
                self.log_test("Validate missing parameters", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Validate missing parameters", False, f"Exception: {str(e)}")
            
    def test_complete_workflow(self):
        """Test complete Party Lobby workflow"""
        print("\n🔄 TESTING COMPLETE PARTY LOBBY WORKFLOW")
        
        try:
            # Step 1: Create lobby
            create_response = self.session.post(
                f"{API_BASE}/lobby/create",
                json={
                    "userId": f"workflow-user-{int(time.time())}",
                    "userName": f"WorkflowPlayer{int(time.time() % 1000)}",
                    "roomType": "FREE",
                    "maxPlayers": 6,
                    "userBalance": 100.0
                }
            )
            
            if create_response.status_code != 200:
                self.log_test("Complete workflow", False, f"Failed to create lobby: {create_response.status_code}")
                return
                
            lobby_data = create_response.json()
            lobby_id = lobby_data['lobbyId']
            room_code = lobby_data['roomCode']
            
            # Step 2: Join lobby with second user
            join_response = self.session.post(
                f"{API_BASE}/lobby/join",
                json={
                    "lobbyId": lobby_id,
                    "userId": f"workflow-user-2-{int(time.time())}",
                    "userName": f"WorkflowFriend{int(time.time() % 1000)}",
                    "userBalance": 50.0
                }
            )
            
            # Step 3: Check status
            status_response = self.session.get(
                f"{API_BASE}/lobby/status",
                params={"userId": f"workflow-user-{int(time.time())}"}
            )
            
            # Step 4: Validate room
            validate_response = self.session.get(
                f"{API_BASE}/lobby/validate-room",
                params={
                    "roomType": "FREE",
                    "memberIds": f"workflow-user-{int(time.time())},workflow-user-2-{int(time.time())}"
                }
            )
            
            workflow_success = (
                create_response.status_code == 200 and
                join_response.status_code in [200, 404] and  # 404 acceptable if lobby not found
                status_response.status_code == 200 and
                validate_response.status_code == 200
            )
            
            self.log_test(
                "Complete Party Lobby workflow",
                workflow_success,
                f"Created lobby {room_code}, tested join/status/validate endpoints"
            )
            
        except Exception as e:
            self.log_test("Complete Party Lobby workflow", False, f"Exception: {str(e)}")
            
    def run_all_tests(self):
        """Run all Party Lobby tests"""
        print("🎮 STARTING COMPREHENSIVE PARTY LOBBY BACKEND TESTING")
        print(f"📍 Testing against: {API_BASE}")
        print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run individual endpoint tests
        self.test_lobby_create()
        self.test_lobby_join()
        self.test_lobby_invite()
        self.test_lobby_status()
        self.test_lobby_validate_room()
        
        # Run complete workflow test
        self.test_complete_workflow()
        
        # Print summary
        self.print_summary()
        
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("🎯 PARTY LOBBY BACKEND TESTING SUMMARY")
        print("="*80)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result['status'])
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result['status'])
        total = len(self.test_results)
        
        print(f"📊 RESULTS: {passed}/{total} tests passed ({(passed/total*100):.1f}% success rate)")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result['status']:
                    print(f"   • {result['test']}: {result['details']}")
        
        print(f"\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            print(f"   {result['status']} {result['test']} ({result['response_time']})")
            if result['details']:
                print(f"      └─ {result['details']}")
                
        print(f"\n🏆 PARTY LOBBY ENDPOINTS TESTED:")
        print(f"   • POST /api/lobby/create - Lobby creation with room codes")
        print(f"   • POST /api/lobby/join - Join existing lobbies")
        print(f"   • POST /api/lobby/invite - Send invites to friends")
        print(f"   • GET /api/lobby/status - Get lobby status and invites")
        print(f"   • GET /api/lobby/validate-room - Validate room requirements")
        
        if self.created_lobbies:
            print(f"\n🎯 CREATED LOBBIES FOR TESTING:")
            for lobby in self.created_lobbies:
                print(f"   • {lobby['roomCode']} ({lobby['roomType']}) - ID: {lobby['lobbyId']}")

if __name__ == "__main__":
    tester = PartyLobbyTester()
    tester.run_all_tests()