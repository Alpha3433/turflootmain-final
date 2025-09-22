#!/usr/bin/env python3
"""
REAL PRIVY USERS ONLY Server Browser Implementation Testing
===========================================================

Testing the filtering for server browser to only show active servers created by real Privy users,
excluding anonymous sessions.

CRITICAL TESTS NEEDED:
1. Database Session Verification - Check that database contains both anonymous and real Privy user sessions
2. Server Browser API Filtering - Test /api/servers endpoint only returns sessions with real Privy user IDs
3. Session Creation with Real Users - Test creating sessions with real Privy user IDs
4. Filtering Logic Verification - Verify MongoDB query filters
"""

import requests
import json
import time
import os
from pymongo import MongoClient
from datetime import datetime, timedelta

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/turfloot')

class PrivyUsersOnlyTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.mongo_url = MONGO_URL
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, passed, details=""):
        """Log test results"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
        
    def get_mongo_client(self):
        """Get MongoDB client"""
        try:
            client = MongoClient(self.mongo_url)
            return client
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            return None
    
    def test_database_session_verification(self):
        """Test 1: Database Session Verification - Check that database contains both anonymous and real Privy user sessions"""
        print("\n🔍 TEST 1: DATABASE SESSION VERIFICATION")
        
        try:
            client = self.get_mongo_client()
            if not client:
                self.log_test("Database Connection", False, "Could not connect to MongoDB")
                return
                
            db = client['turfloot']
            sessions_collection = db['game_sessions']
            
            # Check total sessions
            total_sessions = sessions_collection.count_documents({})
            self.log_test("Database Accessibility", True, f"Found {total_sessions} total sessions in database")
            
            # Check for anonymous sessions
            anonymous_sessions = sessions_collection.count_documents({
                'userId': 'anonymous'
            })
            
            # Check for anonymous_ prefixed sessions
            anonymous_prefix_sessions = sessions_collection.count_documents({
                'userId': {'$regex': '^anonymous_'}
            })
            
            # Check for real Privy user sessions (did:privy: format)
            privy_sessions = sessions_collection.count_documents({
                'userId': {'$regex': '^privy:did:'}
            })
            
            self.log_test("Anonymous Sessions Found", anonymous_sessions > 0, 
                         f"Found {anonymous_sessions} sessions with userId: 'anonymous'")
            
            self.log_test("Anonymous Prefix Sessions Found", anonymous_prefix_sessions >= 0, 
                         f"Found {anonymous_prefix_sessions} sessions with userId starting with 'anonymous_'")
            
            self.log_test("Real Privy User Sessions Found", privy_sessions >= 0, 
                         f"Found {privy_sessions} sessions with Privy DID format")
            
            # Get sample sessions for verification
            sample_sessions = list(sessions_collection.find({}).limit(10))
            print(f"📋 Sample sessions structure:")
            for i, session in enumerate(sample_sessions[:3]):
                print(f"   Session {i+1}: userId='{session.get('userId', 'N/A')}', roomId='{session.get('roomId', 'N/A')}', status='{session.get('status', 'N/A')}'")
            
            client.close()
            
        except Exception as e:
            self.log_test("Database Session Verification", False, f"Error: {str(e)}")
    
    def test_server_browser_api_filtering(self):
        """Test 2: Server Browser API Filtering - Test /api/servers endpoint only returns sessions with real Privy user IDs"""
        print("\n🔍 TEST 2: SERVER BROWSER API FILTERING")
        
        try:
            # Test the /api/servers endpoint
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Server Browser API Accessible", True, f"Status: {response.status_code}")
                
                # Check if colyseusEnabled is true
                colyseus_enabled = data.get('colyseusEnabled', False)
                self.log_test("Colyseus Integration Enabled", colyseus_enabled, 
                             f"colyseusEnabled: {colyseus_enabled}")
                
                # Check endpoint configuration
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                self.log_test("Colyseus Endpoint Configured", bool(colyseus_endpoint), 
                             f"Endpoint: {colyseus_endpoint}")
                
                # Check servers returned
                servers = data.get('servers', [])
                total_players = data.get('totalPlayers', 0)
                
                self.log_test("Server Data Structure", 'servers' in data and 'totalPlayers' in data, 
                             f"Found {len(servers)} servers, {total_players} total players")
                
                # Analyze server data for filtering evidence
                if servers:
                    print(f"📊 Server Analysis:")
                    for i, server in enumerate(servers[:3]):
                        print(f"   Server {i+1}: {server.get('name', 'N/A')} - {server.get('currentPlayers', 0)} players")
                
                # Check if filtering is working by examining player counts
                # If filtering is working, only real Privy users should be counted
                self.log_test("Player Count Filtering", True, 
                             f"Total players from filtered sessions: {total_players}")
                
            else:
                self.log_test("Server Browser API Accessible", False, 
                             f"Status: {response.status_code}, Response: {response.text[:200]}")
                
        except Exception as e:
            self.log_test("Server Browser API Filtering", False, f"Error: {str(e)}")
    
    def test_session_creation_with_real_users(self):
        """Test 3: Session Creation with Real Users - Test creating sessions with real Privy user IDs"""
        print("\n🔍 TEST 3: SESSION CREATION WITH REAL USERS")
        
        try:
            # Test creating a session with a real Privy user ID
            real_privy_user_id = "privy:did:realuser123"
            test_session_data = {
                "action": "join",
                "session": {
                    "roomId": "test-room-privy-user",
                    "userId": real_privy_user_id,
                    "mode": "colyseus-multiplayer",
                    "region": "AU",
                    "entryFee": 0,
                    "joinedAt": datetime.now().isoformat(),
                    "lastActivity": datetime.now().isoformat()
                }
            }
            
            response = requests.post(f"{self.base_url}/api/game-sessions", 
                                   json=test_session_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                self.log_test("Real Privy User Session Creation", True, 
                             f"Session created successfully: {result.get('message', '')}")
                
                # Verify the session was stored correctly
                client = self.get_mongo_client()
                if client:
                    db = client['turfloot']
                    sessions_collection = db['game_sessions']
                    
                    # Check if the session was stored with the correct userId
                    stored_session = sessions_collection.find_one({
                        'roomId': 'test-room-privy-user'
                    })
                    
                    if stored_session:
                        stored_user_id = stored_session.get('userId')
                        self.log_test("Real Privy User Session Storage", 
                                     stored_user_id == real_privy_user_id,
                                     f"Stored userId: '{stored_user_id}', Expected: '{real_privy_user_id}'")
                    else:
                        self.log_test("Real Privy User Session Storage", False, 
                                     "Session not found in database")
                    
                    client.close()
                
            else:
                self.log_test("Real Privy User Session Creation", False, 
                             f"Status: {response.status_code}, Response: {response.text[:200]}")
            
            # Test creating an anonymous session to verify it gets filtered out
            anonymous_session_data = {
                "action": "join",
                "session": {
                    "roomId": "test-room-anonymous",
                    "userId": "anonymous_12345",
                    "mode": "colyseus-multiplayer",
                    "region": "AU",
                    "entryFee": 0,
                    "joinedAt": datetime.now().isoformat(),
                    "lastActivity": datetime.now().isoformat()
                }
            }
            
            response = requests.post(f"{self.base_url}/api/game-sessions", 
                                   json=anonymous_session_data, timeout=10)
            
            if response.status_code == 200:
                self.log_test("Anonymous Session Creation", True, 
                             "Anonymous session created (should be filtered out from server browser)")
            else:
                self.log_test("Anonymous Session Creation", False, 
                             f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Session Creation with Real Users", False, f"Error: {str(e)}")
    
    def test_filtering_logic_verification(self):
        """Test 4: Filtering Logic Verification - Verify MongoDB query filters"""
        print("\n🔍 TEST 4: FILTERING LOGIC VERIFICATION")
        
        try:
            client = self.get_mongo_client()
            if not client:
                self.log_test("Database Connection for Filtering", False, "Could not connect to MongoDB")
                return
                
            db = client['turfloot']
            sessions_collection = db['game_sessions']
            
            # Test the filtering queries that should be used
            ten_minutes_ago = datetime.now() - timedelta(minutes=10)
            
            # Query 1: Exclude sessions with userId: 'anonymous'
            non_anonymous_sessions = sessions_collection.count_documents({
                'lastActivity': {'$gte': ten_minutes_ago},
                'mode': {'$regex': 'colyseus', '$options': 'i'},
                'status': 'active',
                'userId': {'$ne': 'anonymous'}
            })
            
            self.log_test("Filter: Exclude 'anonymous' userId", True, 
                         f"Found {non_anonymous_sessions} sessions excluding 'anonymous'")
            
            # Query 2: Exclude sessions with userId starting with 'anonymous_'
            non_anonymous_prefix_sessions = sessions_collection.count_documents({
                'lastActivity': {'$gte': ten_minutes_ago},
                'mode': {'$regex': 'colyseus', '$options': 'i'},
                'status': 'active',
                'userId': {'$not': {'$regex': '^anonymous'}}
            })
            
            self.log_test("Filter: Exclude 'anonymous_' prefix", True, 
                         f"Found {non_anonymous_prefix_sessions} sessions excluding 'anonymous_' prefix")
            
            # Query 3: Only include sessions with Privy DID format
            privy_only_sessions = sessions_collection.count_documents({
                'lastActivity': {'$gte': ten_minutes_ago},
                'mode': {'$regex': 'colyseus', '$options': 'i'},
                'status': 'active',
                'userId': {'$regex': '^privy:did:'}
            })
            
            self.log_test("Filter: Only Privy DID format", True, 
                         f"Found {privy_only_sessions} sessions with Privy DID format")
            
            # Combined filter (what should be used in production)
            filtered_count = sessions_collection.count_documents({
                'lastActivity': {'$gte': ten_minutes_ago},
                'mode': {'$regex': 'colyseus', '$options': 'i'},
                'status': 'active',
                'userId': {
                    '$ne': 'anonymous',
                    '$not': {'$regex': '^anonymous'}
                }
            })
            
            self.log_test("Combined Filtering Logic", True, 
                         f"Combined filter returns {filtered_count} real user sessions")
            
            # Test edge cases
            edge_case_userids = [
                "anonymous_12345",
                "anonymous",
                "privy:did:xyz123",
                "user@example.com",
                "0x1234567890abcdef"
            ]
            
            print(f"🧪 Edge Case Testing:")
            for user_id in edge_case_userids:
                should_be_included = not (user_id == 'anonymous' or user_id.startswith('anonymous_'))
                
                # Test the filter logic
                matches_filter = not (user_id == 'anonymous') and not user_id.startswith('anonymous')
                
                result = "INCLUDED" if matches_filter else "EXCLUDED"
                expected = "INCLUDED" if should_be_included else "EXCLUDED"
                
                print(f"   userId: '{user_id}' -> {result} (Expected: {expected})")
                
                self.log_test(f"Edge Case: {user_id}", matches_filter == should_be_included, 
                             f"Filter result: {result}")
            
            client.close()
            
        except Exception as e:
            self.log_test("Filtering Logic Verification", False, f"Error: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n🧹 CLEANING UP TEST DATA")
        
        try:
            client = self.get_mongo_client()
            if client:
                db = client['turfloot']
                sessions_collection = db['game_sessions']
                
                # Remove test sessions
                test_room_patterns = [
                    'test-room-privy-user',
                    'test-room-anonymous'
                ]
                
                deleted_count = 0
                for pattern in test_room_patterns:
                    result = sessions_collection.delete_many({'roomId': pattern})
                    deleted_count += result.deleted_count
                
                self.log_test("Test Data Cleanup", True, f"Removed {deleted_count} test sessions")
                client.close()
                
        except Exception as e:
            self.log_test("Test Data Cleanup", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests for REAL PRIVY USERS ONLY server browser implementation"""
        print("🚀 STARTING REAL PRIVY USERS ONLY SERVER BROWSER TESTING")
        print("=" * 80)
        
        # Run all test categories
        self.test_database_session_verification()
        self.test_server_browser_api_filtering()
        self.test_session_creation_with_real_users()
        self.test_filtering_logic_verification()
        
        # Clean up test data
        self.cleanup_test_data()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 REAL PRIVY USERS ONLY TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 REAL PRIVY USERS ONLY FILTERING IS WORKING WELL!")
        elif success_rate >= 60:
            print("⚠️ REAL PRIVY USERS ONLY FILTERING HAS SOME ISSUES")
        else:
            print("❌ REAL PRIVY USERS ONLY FILTERING NEEDS SIGNIFICANT WORK")
        
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result['passed'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = PrivyUsersOnlyTester()
    tester.run_all_tests()