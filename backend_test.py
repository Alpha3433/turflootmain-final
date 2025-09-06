#!/usr/bin/env python3
"""
JOIN PARTY Backend Integration Testing
=====================================

This script tests the backend integration for the JOIN PARTY implementation to verify:
1. API Health Check - verify core API endpoints are working for party-related operations
2. Party System Backend - test existing party-api endpoints to ensure JOIN PARTY can integrate
3. Party Discovery - test if backend can support party listing and discovery features
4. Session Management - verify session tracking works for party join operations
5. Backend Stability - ensure the new JOIN PARTY frontend implementation doesn't break existing backend functionality
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-tactical.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"
PARTY_API_BASE = f"{BASE_URL}/party-api"

# Test user data for realistic testing
TEST_USERS = [
    {
        "id": f"did:privy:clzxyz123test{uuid.uuid4().hex[:8]}",
        "username": "PartyHost",
        "email": "partyhost@test.com"
    },
    {
        "id": f"did:privy:clzxyz456test{uuid.uuid4().hex[:8]}",
        "username": "PartyJoiner",
        "email": "partyjoiner@test.com"
    },
    {
        "id": f"did:privy:clzxyz789test{uuid.uuid4().hex[:8]}",
        "username": "PartyMember",
        "email": "partymember@test.com"
    }
]

class JoinPartyBackendTester:
    def __init__(self):
        self.test_results = []
        self.party_id = None
        self.invitation_id = None
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "response_time": f"{response_time:.3f}s",
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name} ({response_time:.3f}s)")
        if details:
            print(f"    {details}")
    
    def test_api_health_check(self):
        """Test 1: API Health Check - verify core API endpoints are working"""
        print("\n🔍 TESTING 1: API Health Check")
        
        # Test root API endpoint
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                features = data.get('features', [])
                has_multiplayer = 'multiplayer' in features
                self.log_test(
                    "Root API Endpoint", 
                    True, 
                    f"API v{data.get('version', 'unknown')} - Multiplayer: {has_multiplayer}",
                    response_time
                )
            else:
                self.log_test("Root API Endpoint", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Root API Endpoint", False, f"Error: {str(e)}")
        
        # Test ping endpoint
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/ping", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Ping Endpoint", 
                    True, 
                    f"Status: {data.get('status', 'unknown')} - Server: {data.get('server', 'unknown')}",
                    response_time
                )
            else:
                self.log_test("Ping Endpoint", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Ping Endpoint", False, f"Error: {str(e)}")
        
        # Test server browser (for party integration)
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/servers/lobbies", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                self.log_test(
                    "Server Browser API", 
                    True, 
                    f"Found {len(servers)} servers available for party games",
                    response_time
                )
            else:
                self.log_test("Server Browser API", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Server Browser API", False, f"Error: {str(e)}")
    
    def test_party_system_backend(self):
        """Test 2: Party System Backend - test existing party-api endpoints"""
        print("\n🎉 TESTING 2: Party System Backend")
        
        user1 = TEST_USERS[0]  # Party host
        user2 = TEST_USERS[1]  # Party joiner
        
        # Test party status endpoint (should show no party initially)
        try:
            start_time = time.time()
            response = requests.get(f"{PARTY_API_BASE}/current", params={"userId": user1["id"]}, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                has_party = data.get('hasParty', False)
                self.log_test(
                    "Party Status Endpoint", 
                    True, 
                    f"User has party: {has_party} (expected: False initially)",
                    response_time
                )
            else:
                self.log_test("Party Status Endpoint", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Party Status Endpoint", False, f"Error: {str(e)}")
        
        # Test party creation endpoint
        try:
            start_time = time.time()
            party_data = {
                "ownerId": user1["id"],
                "ownerUsername": user1["username"],
                "partyName": "Test Join Party"
            }
            response = requests.post(f"{PARTY_API_BASE}/create", json=party_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.party_id = data.get('partyId')
                self.log_test(
                    "Party Creation Endpoint", 
                    True, 
                    f"Created party: {self.party_id}",
                    response_time
                )
            else:
                self.log_test("Party Creation Endpoint", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Party Creation Endpoint", False, f"Error: {str(e)}")
        
        # Test party invitations endpoint
        try:
            start_time = time.time()
            response = requests.get(f"{PARTY_API_BASE}/invitations", params={"userId": user2["id"]}, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                invitations = data.get('invitations', [])
                self.log_test(
                    "Party Invitations Endpoint", 
                    True, 
                    f"Found {len(invitations)} pending invitations",
                    response_time
                )
            else:
                self.log_test("Party Invitations Endpoint", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Party Invitations Endpoint", False, f"Error: {str(e)}")
        
        # Test party notifications endpoint
        try:
            start_time = time.time()
            response = requests.get(f"{PARTY_API_BASE}/notifications", params={"userId": user1["id"]}, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                notifications = data.get('notifications', [])
                self.log_test(
                    "Party Notifications Endpoint", 
                    True, 
                    f"Found {len(notifications)} notifications",
                    response_time
                )
            else:
                self.log_test("Party Notifications Endpoint", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Party Notifications Endpoint", False, f"Error: {str(e)}")
    
    def test_party_discovery_features(self):
        """Test 3: Party Discovery - test if backend can support party listing and discovery"""
        print("\n🔍 TESTING 3: Party Discovery Features")
        
        user1 = TEST_USERS[0]  # Party host
        user2 = TEST_USERS[1]  # Party joiner
        
        # Test party invitation sending (for discovery)
        if self.party_id:
            try:
                start_time = time.time()
                invite_data = {
                    "partyId": self.party_id,
                    "fromUserId": user1["id"],
                    "toUserId": user2["id"],
                    "toUsername": user2["username"]
                }
                response = requests.post(f"{PARTY_API_BASE}/invite", json=invite_data, timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    self.invitation_id = data.get('invitationId')
                    self.log_test(
                        "Party Invitation Sending", 
                        True, 
                        f"Sent invitation: {self.invitation_id}",
                        response_time
                    )
                else:
                    self.log_test("Party Invitation Sending", False, f"Status: {response.status_code}", response_time)
            except Exception as e:
                self.log_test("Party Invitation Sending", False, f"Error: {str(e)}")
        
        # Test invitable friends discovery
        if self.party_id:
            try:
                start_time = time.time()
                response = requests.get(f"{PARTY_API_BASE}/invitable-friends", 
                                      params={"userId": user1["id"], "partyId": self.party_id}, timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    friends = data.get('friends', [])
                    self.log_test(
                        "Invitable Friends Discovery", 
                        True, 
                        f"Found {len(friends)} invitable friends",
                        response_time
                    )
                else:
                    self.log_test("Invitable Friends Discovery", False, f"Status: {response.status_code}", response_time)
            except Exception as e:
                self.log_test("Invitable Friends Discovery", False, f"Error: {str(e)}")
        
        # Test party invitation acceptance (simulating JOIN PARTY action)
        if self.invitation_id:
            try:
                start_time = time.time()
                accept_data = {
                    "invitationId": self.invitation_id,
                    "userId": user2["id"]
                }
                response = requests.post(f"{PARTY_API_BASE}/accept-invitation", json=accept_data, timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    member_count = data.get('memberCount', 0)
                    self.log_test(
                        "Party Join (Accept Invitation)", 
                        True, 
                        f"Joined party successfully - Members: {member_count}",
                        response_time
                    )
                else:
                    self.log_test("Party Join (Accept Invitation)", False, f"Status: {response.status_code}", response_time)
            except Exception as e:
                self.log_test("Party Join (Accept Invitation)", False, f"Error: {str(e)}")
        
        # Verify party status after join
        try:
            start_time = time.time()
            response = requests.get(f"{PARTY_API_BASE}/current", params={"userId": user2["id"]}, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                has_party = data.get('hasParty', False)
                party_info = data.get('party', {})
                member_count = party_info.get('memberCount', 0)
                self.log_test(
                    "Party Status After Join", 
                    has_party, 
                    f"User in party: {has_party} - Members: {member_count}",
                    response_time
                )
            else:
                self.log_test("Party Status After Join", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Party Status After Join", False, f"Error: {str(e)}")
    
    def test_session_management(self):
        """Test 4: Session Management - verify session tracking works for party join operations"""
        print("\n🎮 TESTING 4: Session Management")
        
        user1 = TEST_USERS[0]
        
        # Test game session join (for party game coordination)
        try:
            start_time = time.time()
            session_data = {
                "roomId": "party-test-room",
                "playerId": user1["id"],
                "playerName": user1["username"]
            }
            response = requests.post(f"{API_BASE}/game-sessions/join", json=session_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test(
                    "Game Session Join", 
                    True, 
                    "Successfully joined game session for party coordination",
                    response_time
                )
            else:
                self.log_test("Game Session Join", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Game Session Join", False, f"Error: {str(e)}")
        
        # Test game session leave
        try:
            start_time = time.time()
            session_data = {
                "roomId": "party-test-room",
                "playerId": user1["id"]
            }
            response = requests.post(f"{API_BASE}/game-sessions/leave", json=session_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test(
                    "Game Session Leave", 
                    True, 
                    "Successfully left game session",
                    response_time
                )
            else:
                self.log_test("Game Session Leave", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Game Session Leave", False, f"Error: {str(e)}")
        
        # Test party game start (coordination feature)
        if self.party_id:
            try:
                start_time = time.time()
                game_data = {
                    "partyId": self.party_id,
                    "roomType": "FREE",
                    "entryFee": 0,
                    "ownerId": user1["id"]
                }
                response = requests.post(f"{PARTY_API_BASE}/start-game", json=game_data, timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    game_room_id = data.get('gameRoomId')
                    party_members = data.get('partyMembers', [])
                    self.log_test(
                        "Party Game Start Coordination", 
                        True, 
                        f"Started game room: {game_room_id} - Members: {len(party_members)}",
                        response_time
                    )
                else:
                    self.log_test("Party Game Start Coordination", False, f"Status: {response.status_code}", response_time)
            except Exception as e:
                self.log_test("Party Game Start Coordination", False, f"Error: {str(e)}")
    
    def test_backend_stability(self):
        """Test 5: Backend Stability - ensure JOIN PARTY doesn't break existing functionality"""
        print("\n🛡️ TESTING 5: Backend Stability")
        
        # Test live player statistics (should still work)
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/stats/live-players", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                live_players = data.get('livePlayersCount', 0)
                self.log_test(
                    "Live Player Statistics", 
                    True, 
                    f"Live players: {live_players}",
                    response_time
                )
            else:
                self.log_test("Live Player Statistics", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Live Player Statistics", False, f"Error: {str(e)}")
        
        # Test global winnings statistics
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/stats/global-winnings", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                global_winnings = data.get('totalWinnings', 0)
                self.log_test(
                    "Global Winnings Statistics", 
                    True, 
                    f"Global winnings: ${global_winnings}",
                    response_time
                )
            else:
                self.log_test("Global Winnings Statistics", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Global Winnings Statistics", False, f"Error: {str(e)}")
        
        # Test user balance endpoint (for party fee validation)
        try:
            start_time = time.time()
            balance_data = {"userId": TEST_USERS[0]["id"]}
            response = requests.post(f"{API_BASE}/users/balance", json=balance_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                balance = data.get('balance', 0)
                self.log_test(
                    "User Balance Endpoint", 
                    True, 
                    f"User balance: ${balance}",
                    response_time
                )
            else:
                self.log_test("User Balance Endpoint", False, f"Status: {response.status_code}", response_time)
        except Exception as e:
            self.log_test("User Balance Endpoint", False, f"Error: {str(e)}")
        
        # Test rapid API calls (stress test)
        try:
            start_time = time.time()
            success_count = 0
            total_calls = 5
            
            for i in range(total_calls):
                response = requests.get(f"{API_BASE}/ping", timeout=5)
                if response.status_code == 200:
                    success_count += 1
            
            response_time = time.time() - start_time
            success_rate = (success_count / total_calls) * 100
            
            self.log_test(
                "Rapid API Calls Stress Test", 
                success_rate >= 80, 
                f"Success rate: {success_rate}% ({success_count}/{total_calls})",
                response_time
            )
        except Exception as e:
            self.log_test("Rapid API Calls Stress Test", False, f"Error: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 CLEANING UP TEST DATA")
        
        # Leave party if we're in one
        if self.party_id:
            for user in TEST_USERS[:2]:  # Clean up for users who joined
                try:
                    leave_data = {
                        "partyId": self.party_id,
                        "userId": user["id"]
                    }
                    response = requests.post(f"{PARTY_API_BASE}/leave", json=leave_data, timeout=10)
                    if response.status_code == 200:
                        print(f"✅ Cleaned up party membership for {user['username']}")
                except Exception as e:
                    print(f"⚠️ Cleanup warning for {user['username']}: {str(e)}")
    
    def run_all_tests(self):
        """Run all JOIN PARTY backend integration tests"""
        print("🚀 STARTING JOIN PARTY BACKEND INTEGRATION TESTING")
        print("=" * 60)
        
        # Run all test categories
        self.test_api_health_check()
        self.test_party_system_backend()
        self.test_party_discovery_features()
        self.test_session_management()
        self.test_backend_stability()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print("📊 JOIN PARTY BACKEND INTEGRATION TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Category breakdown
        categories = {
            "API Health Check": [],
            "Party System Backend": [],
            "Party Discovery": [],
            "Session Management": [],
            "Backend Stability": []
        }
        
        for result in self.test_results:
            test_name = result['test']
            if any(keyword in test_name for keyword in ['Root API', 'Ping', 'Server Browser']):
                categories["API Health Check"].append(result)
            elif any(keyword in test_name for keyword in ['Party Status', 'Party Creation', 'Party Invitations', 'Party Notifications']):
                categories["Party System Backend"].append(result)
            elif any(keyword in test_name for keyword in ['Invitation Sending', 'Friends Discovery', 'Party Join', 'Status After Join']):
                categories["Party Discovery"].append(result)
            elif any(keyword in test_name for keyword in ['Game Session', 'Party Game Start']):
                categories["Session Management"].append(result)
            elif any(keyword in test_name for keyword in ['Live Player', 'Global Winnings', 'User Balance', 'Rapid API']):
                categories["Backend Stability"].append(result)
        
        print("\n📋 CATEGORY BREAKDOWN:")
        for category, tests in categories.items():
            if tests:
                category_passed = sum(1 for test in tests if test['success'])
                category_total = len(tests)
                category_rate = (category_passed / category_total * 100) if category_total > 0 else 0
                status = "✅" if category_rate >= 80 else "⚠️" if category_rate >= 60 else "❌"
                print(f"{status} {category}: {category_passed}/{category_total} ({category_rate:.1f}%)")
        
        # Failed tests details
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        # Overall assessment
        print(f"\n🎯 OVERALL ASSESSMENT:")
        if success_rate >= 90:
            print("🟢 EXCELLENT: JOIN PARTY backend integration is fully operational")
        elif success_rate >= 80:
            print("🟡 GOOD: JOIN PARTY backend integration is mostly working with minor issues")
        elif success_rate >= 60:
            print("🟠 FAIR: JOIN PARTY backend integration has some issues that need attention")
        else:
            print("🔴 POOR: JOIN PARTY backend integration has significant issues requiring fixes")
        
        print("\n✅ JOIN PARTY BACKEND INTEGRATION TESTING COMPLETED")

if __name__ == "__main__":
    tester = JoinPartyBackendTester()
    tester.run_all_tests()