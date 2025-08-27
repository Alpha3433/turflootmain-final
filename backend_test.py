#!/usr/bin/env python3
"""
Comprehensive Party Lobby Backend Endpoints Testing - ROUND 2
Tests all 5 Party Lobby endpoints with complete workflow scenarios

ALL 5 ENDPOINTS TO TEST:
1. POST /api/lobby/create - ✅ NEWLY IMPLEMENTED with full functionality
2. POST /api/lobby/join - ✅ Previously verified as working
3. POST /api/lobby/invite - ✅ Previously verified as working
4. GET /api/lobby/status - ✅ Previously verified as working
5. GET /api/lobby/validate-room - ✅ Previously verified as working
"""

import requests
import time
import json
import sys
import uuid
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
        self.created_lobbies = []
        self.test_users = []
        
        print(f"🚀 COMPREHENSIVE PARTY LOBBY BACKEND ENDPOINTS TESTING - ROUND 2")
        print(f"🔗 Testing API Base URL: {self.api_base}")
        print(f"⏰ Test started at: {datetime.now().isoformat()}")
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

    def create_test_user(self, user_id, balance=100):
        """Create test user data"""
        return {
            'userId': user_id,
            'userName': f'TestUser_{user_id[-8:]}',
            'userBalance': balance
        }

    def test_lobby_create_endpoint(self):
        """Test POST /api/lobby/create endpoint"""
        print("\n🎯 Testing POST /api/lobby/create endpoint...")
        
        # Test 1: Create FREE lobby
        start_time = time.time()
        try:
            user1 = self.create_test_user(f"user_{uuid.uuid4()}", 100)
            self.test_users.append(user1)
            
            payload = {
                'userId': user1['userId'],
                'userName': user1['userName'],
                'roomType': 'FREE',
                'maxPlayers': 6,
                'userBalance': user1['userBalance']
            }
            
            response = requests.post(f"{self.api_base}/lobby/create", json=payload, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('lobby') and data.get('roomCode'):
                    lobby = data['lobby']
                    self.created_lobbies.append(lobby)
                    details = f"Created FREE lobby {lobby['id']} with room code {data['roomCode']}"
                    self.log_test("Create FREE lobby", True, details, response_time)
                else:
                    self.log_test("Create FREE lobby", False, f"Invalid response structure: {data}", response_time)
            else:
                self.log_test("Create FREE lobby", False, f"Status {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_test("Create FREE lobby", False, f"Exception: {str(e)}", time.time() - start_time)

        # Test 2: Create $5 paid lobby with sufficient balance
        start_time = time.time()
        try:
            user2 = self.create_test_user(f"user_{uuid.uuid4()}", 50)
            self.test_users.append(user2)
            
            payload = {
                'userId': user2['userId'],
                'userName': user2['userName'],
                'roomType': '$5',
                'maxPlayers': 4,
                'userBalance': user2['userBalance']
            }
            
            response = requests.post(f"{self.api_base}/lobby/create", json=payload, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('lobby'):
                    lobby = data['lobby']
                    self.created_lobbies.append(lobby)
                    details = f"Created $5 lobby {lobby['id']} with entry fee validation"
                    self.log_test("Create $5 paid lobby", True, details, response_time)
                else:
                    self.log_test("Create $5 paid lobby", False, f"Invalid response: {data}", response_time)
            else:
                self.log_test("Create $5 paid lobby", False, f"Status {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_test("Create $5 paid lobby", False, f"Exception: {str(e)}", time.time() - start_time)

        # Test 3: Create $20 lobby with insufficient balance (should fail)
        start_time = time.time()
        try:
            user3 = self.create_test_user(f"user_{uuid.uuid4()}", 10)  # Only $10 balance
            
            payload = {
                'userId': user3['userId'],
                'userName': user3['userName'],
                'roomType': '$20',
                'maxPlayers': 6,
                'userBalance': user3['userBalance']
            }
            
            response = requests.post(f"{self.api_base}/lobby/create", json=payload, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                data = response.json()
                if 'Insufficient balance' in data.get('error', ''):
                    details = f"Correctly rejected insufficient balance: {data['error']}"
                    self.log_test("Insufficient balance validation", True, details, response_time)
                else:
                    self.log_test("Insufficient balance validation", False, f"Wrong error: {data}", response_time)
            else:
                self.log_test("Insufficient balance validation", False, f"Expected 400, got {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Insufficient balance validation", False, f"Exception: {str(e)}", time.time() - start_time)

        # Test 4: Missing required parameters
        start_time = time.time()
        try:
            payload = {'userId': 'test', 'roomType': 'FREE'}  # Missing userName
            
            response = requests.post(f"{self.api_base}/lobby/create", json=payload, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 400:
                details = "Correctly validated missing parameters"
                self.log_test("Missing parameters validation", True, details, response_time)
            else:
                self.log_test("Missing parameters validation", False, f"Expected 400, got {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Missing parameters validation", False, f"Exception: {str(e)}", time.time() - start_time)

    def test_lobby_join_endpoint(self):
        """Test POST /api/lobby/join endpoint"""
        print("\n🚪 Testing POST /api/lobby/join endpoint...")
        
        if not self.created_lobbies:
            self.log_test("Join lobby - no lobbies available", False, "No lobbies created to join")
            return
            
        # Test 1: Join existing lobby
        start_time = time.time()
        try:
            lobby = self.created_lobbies[0]  # Use first created lobby
            user_joiner = self.create_test_user(f"user_{uuid.uuid4()}", 100)
            self.test_users.append(user_joiner)
            
            payload = {
                'lobbyId': lobby['id'],
                'userId': user_joiner['userId'],
                'userName': user_joiner['userName'],
                'userBalance': user_joiner['userBalance']
            }
            
            response = requests.post(f"{self.api_base}/lobby/join", json=payload, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('lobby'):
                    updated_lobby = data['lobby']
                    member_count = len(updated_lobby.get('members', []))
                    details = f"Successfully joined lobby {lobby['id']}, now has {member_count} members"
                    self.log_test("Join existing lobby", True, details, response_time)
                else:
                    self.log_test("Join existing lobby", False, f"Invalid response: {data}", response_time)
            else:
                self.log_test("Join existing lobby", False, f"Status {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_test("Join existing lobby", False, f"Exception: {str(e)}", time.time() - start_time)

        # Test 2: Join non-existent lobby
        start_time = time.time()
        try:
            fake_lobby_id = str(uuid.uuid4())
            user_joiner = self.create_test_user(f"user_{uuid.uuid4()}", 100)
            
            payload = {
                'lobbyId': fake_lobby_id,
                'userId': user_joiner['userId'],
                'userName': user_joiner['userName'],
                'userBalance': user_joiner['userBalance']
            }
            
            response = requests.post(f"{self.api_base}/lobby/join", json=payload, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 404:
                details = "Correctly rejected non-existent lobby"
                self.log_test("Join non-existent lobby", True, details, response_time)
            else:
                self.log_test("Join non-existent lobby", False, f"Expected 404, got {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Join non-existent lobby", False, f"Exception: {str(e)}", time.time() - start_time)

    def test_lobby_invite_endpoint(self):
        """Test POST /api/lobby/invite endpoint"""
        print("\n📧 Testing POST /api/lobby/invite endpoint...")
        
        if not self.created_lobbies or len(self.test_users) < 2:
            self.log_test("Send lobby invite - insufficient test data", False, "Need lobbies and users")
            return
            
        # Test 1: Send valid invite
        start_time = time.time()
        try:
            lobby = self.created_lobbies[0]
            from_user = self.test_users[0]
            to_user = self.test_users[1]
            
            payload = {
                'lobbyId': lobby['id'],
                'fromUserId': from_user['userId'],
                'fromUserName': from_user['userName'],
                'toUserId': to_user['userId'],
                'roomType': lobby['roomType']
            }
            
            response = requests.post(f"{self.api_base}/lobby/invite", json=payload, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('invite'):
                    invite = data['invite']
                    details = f"Sent invite {invite['id']} from {from_user['userName']} to {to_user['userId']}"
                    self.log_test("Send valid lobby invite", True, details, response_time)
                else:
                    self.log_test("Send valid lobby invite", False, f"Invalid response: {data}", response_time)
            else:
                self.log_test("Send valid lobby invite", False, f"Status {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_test("Send valid lobby invite", False, f"Exception: {str(e)}", time.time() - start_time)

    def test_lobby_status_endpoint(self):
        """Test GET /api/lobby/status endpoint"""
        print("\n📊 Testing GET /api/lobby/status endpoint...")
        
        if not self.test_users:
            self.log_test("Get lobby status - no test users", False, "No test users available")
            return
            
        # Test 1: Get status for user in lobby
        start_time = time.time()
        try:
            user = self.test_users[0]  # User who created lobby
            
            response = requests.get(f"{self.api_base}/lobby/status?userId={user['userId']}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if 'currentLobby' in data and 'pendingInvites' in data and 'timestamp' in data:
                    current_lobby = data.get('currentLobby')
                    pending_invites = data.get('pendingInvites', [])
                    details = f"Status retrieved: lobby={bool(current_lobby)}, invites={len(pending_invites)}"
                    self.log_test("Get user lobby status", True, details, response_time)
                else:
                    self.log_test("Get user lobby status", False, f"Invalid response structure: {data}", response_time)
            else:
                self.log_test("Get user lobby status", False, f"Status {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_test("Get user lobby status", False, f"Exception: {str(e)}", time.time() - start_time)

    def test_lobby_validate_room_endpoint(self):
        """Test GET /api/lobby/validate-room endpoint"""
        print("\n✅ Testing GET /api/lobby/validate-room endpoint...")
        
        if not self.test_users:
            self.log_test("Validate room - no test users", False, "No test users available")
            return
            
        # Test 1: Validate room with sufficient balances
        start_time = time.time()
        try:
            user_ids = [user['userId'] for user in self.test_users[:2]]  # First 2 users
            member_ids_str = ','.join(user_ids)
            
            response = requests.get(
                f"{self.api_base}/lobby/validate-room?roomType=$5&memberIds={member_ids_str}", 
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['roomType', 'requiredFee', 'members', 'canProceed', 'insufficientFunds']
                if all(field in data for field in required_fields):
                    can_proceed = data.get('canProceed')
                    member_count = len(data.get('members', []))
                    details = f"Validated $5 room: {member_count} members, canProceed={can_proceed}"
                    self.log_test("Validate room requirements", True, details, response_time)
                else:
                    self.log_test("Validate room requirements", False, f"Missing fields: {data}", response_time)
            else:
                self.log_test("Validate room requirements", False, f"Status {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_test("Validate room requirements", False, f"Exception: {str(e)}", time.time() - start_time)

    def test_complete_workflow(self):
        """Test complete Party Lobby workflow: Create → Join → Invite → Status → Validate"""
        print("\n🔄 Testing Complete Party Lobby Workflow...")
        
        start_time = time.time()
        try:
            # Step 1: Create a new lobby for workflow test
            workflow_user = self.create_test_user(f"workflow_{uuid.uuid4()}", 100)
            
            create_payload = {
                'userId': workflow_user['userId'],
                'userName': workflow_user['userName'],
                'roomType': '$5',
                'maxPlayers': 4,
                'userBalance': workflow_user['userBalance']
            }
            
            create_response = requests.post(f"{self.api_base}/lobby/create", json=create_payload, timeout=10)
            
            if create_response.status_code != 200:
                self.log_test("Workflow - Create lobby", False, f"Create failed: {create_response.status_code}")
                return
                
            lobby_data = create_response.json()
            workflow_lobby = lobby_data['lobby']
            
            # Step 2: Another user joins the lobby
            joiner_user = self.create_test_user(f"joiner_{uuid.uuid4()}", 100)
            
            join_payload = {
                'lobbyId': workflow_lobby['id'],
                'userId': joiner_user['userId'],
                'userName': joiner_user['userName'],
                'userBalance': joiner_user['userBalance']
            }
            
            join_response = requests.post(f"{self.api_base}/lobby/join", json=join_payload, timeout=10)
            
            if join_response.status_code != 200:
                self.log_test("Workflow - Join lobby", False, f"Join failed: {join_response.status_code}")
                return
                
            # Step 3: Send invite to third user
            invite_user = self.create_test_user(f"invitee_{uuid.uuid4()}", 100)
            
            invite_payload = {
                'lobbyId': workflow_lobby['id'],
                'fromUserId': workflow_user['userId'],
                'fromUserName': workflow_user['userName'],
                'toUserId': invite_user['userId'],
                'roomType': '$5'
            }
            
            invite_response = requests.post(f"{self.api_base}/lobby/invite", json=invite_payload, timeout=10)
            
            if invite_response.status_code != 200:
                self.log_test("Workflow - Send invite", False, f"Invite failed: {invite_response.status_code}")
                return
                
            # Step 4: Check status for invited user
            status_response = requests.get(f"{self.api_base}/lobby/status?userId={invite_user['userId']}", timeout=10)
            
            if status_response.status_code != 200:
                self.log_test("Workflow - Check status", False, f"Status failed: {status_response.status_code}")
                return
                
            status_data = status_response.json()
            pending_invites = status_data.get('pendingInvites', [])
            
            # Step 5: Validate room requirements
            all_user_ids = [workflow_user['userId'], joiner_user['userId'], invite_user['userId']]
            member_ids_str = ','.join(all_user_ids)
            
            validate_response = requests.get(
                f"{self.api_base}/lobby/validate-room?roomType=$5&memberIds={member_ids_str}", 
                timeout=10
            )
            
            if validate_response.status_code != 200:
                self.log_test("Workflow - Validate room", False, f"Validate failed: {validate_response.status_code}")
                return
                
            validate_data = validate_response.json()
            
            # Workflow success
            response_time = time.time() - start_time
            details = f"Complete workflow: lobby created, user joined, invite sent ({len(pending_invites)} pending), room validated (canProceed={validate_data.get('canProceed')})"
            self.log_test("Complete Party Lobby Workflow", True, details, response_time)
            
        except Exception as e:
            self.log_test("Complete Party Lobby Workflow", False, f"Exception: {str(e)}", time.time() - start_time)

    def run_all_tests(self):
        """Run all Party Lobby endpoint tests"""
        print("🚀 Starting Comprehensive Party Lobby Backend Endpoints Testing")
        print(f"🌐 Base URL: {self.api_base}")
        print(f"⏰ Test started at: {datetime.now().isoformat()}")
        print("=" * 80)
        
        # Test all endpoints
        self.test_lobby_create_endpoint()
        self.test_lobby_join_endpoint()
        self.test_lobby_invite_endpoint()
        self.test_lobby_status_endpoint()
        self.test_lobby_validate_room_endpoint()
        self.test_complete_workflow()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 PARTY LOBBY BACKEND TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        print(f"\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅ PASS" if result['passed'] else "❌ FAIL"
            print(f"{status} - {result['test']} ({result['response_time']:.3f}s)")
            if result['details']:
                print(f"    {result['details']}")
        
        print(f"\n🏁 Testing completed at: {datetime.now().isoformat()}")
        
        # Return summary for test_result.md update
        return {
            'total_tests': self.total_tests,
            'passed_tests': self.passed_tests,
            'failed_tests': self.total_tests - self.passed_tests,
            'success_rate': success_rate,
            'test_results': self.test_results,
            'created_lobbies': len(self.created_lobbies),
            'test_users': len(self.test_users)
        }

def main():
    """Main test execution"""
    tester = PartyLobbyTester()
    summary = tester.run_all_tests()
    return summary

if __name__ == "__main__":
    summary = main()
    sys.exit(0 if summary['success_rate'] >= 80 else 1)