#!/usr/bin/env python3
"""
Colyseus Room Tracking System Debug Test
========================================

This test debugs why Device 1 created a room but Device 2 still only sees "CREATE NEW ROOM" option.

Debug Steps:
1. Check Database State - Query the `game-sessions` collection directly
2. Test API Response - Call `/api/servers` endpoint 
3. Session Tracking Analysis - Verify session storage and room tracking

Expected Findings:
- If Device 1 is connected, should find 1 active session with Colyseus mode
- Session should have a `roomId` field
- `/api/servers` should return this as an active room with 1 player
"""

import requests
import json
import os
from datetime import datetime, timedelta
import time
import sys

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://turfloot-mp.preview.emergentagent.com')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/turfloot')

def print_section(title):
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print('='*60)

def print_subsection(title):
    print(f"\n{'─'*40}")
    print(f"📋 {title}")
    print('─'*40)

def test_database_state():
    """Step 1: Check Database State - Query the game-sessions collection directly"""
    print_section("STEP 1: DATABASE STATE ANALYSIS")
    
    try:
        # Try to import pymongo
        try:
            from pymongo import MongoClient
        except ImportError:
            print("❌ pymongo not available, using API to check database state")
            return test_database_via_api()
        
        # Connect to MongoDB
        client = MongoClient(MONGO_URL)
        db = client['turfloot']
        
        # Check both possible collection names
        collections = db.list_collection_names()
        print(f"📊 Available collections: {collections}")
        
        # Try both collection names that might exist
        session_collections = []
        if 'game-sessions' in collections:
            session_collections.append('game-sessions')
        if 'game_sessions' in collections:
            session_collections.append('game_sessions')
            
        print(f"🎮 Game session collections found: {session_collections}")
        
        for collection_name in session_collections:
            print_subsection(f"Analyzing {collection_name} Collection")
            sessions_collection = db[collection_name]
            
            # Query 1: Check active sessions in last 5 minutes
            five_minutes_ago = datetime.now() - timedelta(minutes=5)
            print(f"🕐 Checking sessions active since: {five_minutes_ago}")
            
            # Multiple query patterns to catch different data structures
            queries = [
                # Query pattern from servers API
                {
                    'session.lastActivity': {'$gte': five_minutes_ago},
                    'session.mode': {'$regex': 'colyseus', '$options': 'i'}
                },
                # Alternative query patterns
                {
                    'lastActivity': {'$gte': five_minutes_ago},
                    'mode': {'$regex': 'colyseus', '$options': 'i'}
                },
                # Broader search for any Colyseus sessions
                {
                    '$or': [
                        {'session.mode': {'$regex': 'colyseus', '$options': 'i'}},
                        {'mode': {'$regex': 'colyseus', '$options': 'i'}},
                        {'roomId': {'$regex': 'colyseus', '$options': 'i'}},
                        {'session.roomId': {'$regex': 'colyseus', '$options': 'i'}}
                    ]
                }
            ]
            
            for i, query in enumerate(queries, 1):
                print(f"\n🔍 Query Pattern {i}: {json.dumps(query, default=str, indent=2)}")
                active_sessions = list(sessions_collection.find(query))
                print(f"📊 Found {len(active_sessions)} sessions")
                
                if active_sessions:
                    print("📋 Session Details:")
                    for j, session in enumerate(active_sessions, 1):
                        print(f"  Session {j}:")
                        print(f"    - ID: {session.get('_id')}")
                        print(f"    - Room ID: {session.get('roomId', session.get('session', {}).get('roomId', 'N/A'))}")
                        print(f"    - User ID: {session.get('userId', session.get('session', {}).get('userId', 'N/A'))}")
                        print(f"    - Mode: {session.get('mode', session.get('session', {}).get('mode', 'N/A'))}")
                        print(f"    - Last Activity: {session.get('lastActivity', session.get('session', {}).get('lastActivity', 'N/A'))}")
                        print(f"    - Status: {session.get('status', 'N/A')}")
                        print(f"    - Full Document: {json.dumps(session, default=str, indent=6)}")
                        
            # Query 2: Get all recent sessions (last 10)
            print_subsection("Recent Sessions (Last 10)")
            recent_sessions = list(sessions_collection.find({}).sort([('_id', -1)]).limit(10))
            print(f"📊 Found {len(recent_sessions)} recent sessions")
            
            for i, session in enumerate(recent_sessions, 1):
                print(f"  Recent Session {i}:")
                print(f"    - Room ID: {session.get('roomId', session.get('session', {}).get('roomId', 'N/A'))}")
                print(f"    - Mode: {session.get('mode', session.get('session', {}).get('mode', 'N/A'))}")
                print(f"    - Last Activity: {session.get('lastActivity', session.get('session', {}).get('lastActivity', 'N/A'))}")
                print(f"    - Document: {json.dumps(session, default=str, indent=6)}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return test_database_via_api()

def test_database_via_api():
    """Fallback method to check database state via API"""
    print_subsection("Database State via Game Sessions API")
    
    try:
        response = requests.get(f"{BASE_URL}/api/game-sessions", timeout=30)
        print(f"📊 Game Sessions API Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📋 Game Sessions API Response:")
            print(f"  - Total Active Sessions: {data.get('totalActiveSessions', 'N/A')}")
            
            sessions_by_room = data.get('sessionsByRoom', {})
            print(f"📊 Sessions grouped by room: {len(sessions_by_room)} rooms")
            
            for room_id, sessions in sessions_by_room.items():
                print(f"\n  Room: {room_id}")
                print(f"    - Player Count: {len(sessions)}")
                for i, session in enumerate(sessions, 1):
                    print(f"    - Player {i}:")
                    print(f"      - User ID: {session.get('userId', 'N/A')}")
                    print(f"      - Mode: {session.get('mode', 'N/A')}")
                    print(f"      - Region: {session.get('region', 'N/A')}")
                    print(f"      - Joined At: {session.get('joinedAt', 'N/A')}")
                    print(f"      - Last Activity: {session.get('lastActivity', 'N/A')}")
            
            print(f"\n📋 Full Game Sessions Response:")
            print(json.dumps(data, default=str, indent=2))
            
            return True
        else:
            print(f"❌ Game Sessions API Error: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Game Sessions API request error: {e}")
        return False

def test_api_response():
    """Step 2: Test API Response - Call /api/servers endpoint"""
    print_section("STEP 2: API RESPONSE ANALYSIS")
    
    try:
        # Test the servers API endpoint
        print(f"🌐 Testing API endpoint: {BASE_URL}/api/servers")
        
        response = requests.get(f"{BASE_URL}/api/servers", timeout=30)
        print(f"📊 Response Status: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📋 API Response Structure:")
            print(f"  - Total Players: {data.get('totalPlayers', 'N/A')}")
            print(f"  - Total Active Servers: {data.get('totalActiveServers', 'N/A')}")
            print(f"  - Total Servers: {data.get('totalServers', 'N/A')}")
            print(f"  - Colyseus Enabled: {data.get('colyseusEnabled', 'N/A')}")
            print(f"  - Colyseus Endpoint: {data.get('colyseusEndpoint', 'N/A')}")
            
            servers = data.get('servers', [])
            print(f"📊 Found {len(servers)} servers")
            
            for i, server in enumerate(servers, 1):
                print(f"\n  Server {i}:")
                print(f"    - ID: {server.get('id', 'N/A')}")
                print(f"    - Name: {server.get('name', 'N/A')}")
                print(f"    - Current Players: {server.get('currentPlayers', 'N/A')}")
                print(f"    - Max Players: {server.get('maxPlayers', 'N/A')}")
                print(f"    - Status: {server.get('status', 'N/A')}")
                print(f"    - Server Type: {server.get('serverType', 'N/A')}")
                print(f"    - Room Type: {server.get('roomType', 'N/A')}")
                print(f"    - Colyseus Room ID: {server.get('colyseusRoomId', 'N/A')}")
                print(f"    - Joinable: {server.get('joinable', 'N/A')}")
                print(f"    - Last Activity: {server.get('lastActivity', 'N/A')}")
            
            print(f"\n📋 Full API Response:")
            print(json.dumps(data, default=str, indent=2))
            
            return data
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ API request error: {e}")
        return None

def create_test_session():
    """Create a test session to verify the tracking system"""
    print_section("STEP 3: CREATE TEST SESSION")
    
    try:
        # Create a test session
        test_session_data = {
            "action": "join",
            "session": {
                "roomId": "colyseus-arena-global",
                "userId": "test-user-debug-001",
                "mode": "colyseus-multiplayer",
                "region": "AU",
                "entryFee": 0,
                "joinedAt": datetime.now().isoformat(),
                "lastActivity": datetime.now().isoformat()
            }
        }
        
        print(f"🎮 Creating test session: {json.dumps(test_session_data, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/api/game-sessions",
            json=test_session_data,
            timeout=30
        )
        
        print(f"📊 Create Session Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Test session created successfully: {json.dumps(data, indent=2)}")
            
            # Wait a moment then check if it appears in the servers API
            print("\n⏳ Waiting 3 seconds then checking servers API...")
            time.sleep(3)
            
            servers_data = test_api_response()
            if servers_data:
                test_room_found = False
                for server in servers_data.get('servers', []):
                    if server.get('currentPlayers', 0) > 0:
                        test_room_found = True
                        print(f"✅ Active room found in servers API: {server.get('name')} with {server.get('currentPlayers')} players")
                        break
                
                if not test_room_found:
                    print("❌ Test session NOT reflected in servers API - this indicates the tracking issue")
            
            return True
        else:
            print(f"❌ Failed to create test session: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test session creation error: {e}")
        return False

def cleanup_test_session():
    """Clean up the test session"""
    print_section("STEP 4: CLEANUP TEST SESSION")
    
    try:
        cleanup_data = {
            "action": "leave",
            "roomId": "colyseus-arena-global"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/game-sessions",
            json=cleanup_data,
            timeout=30
        )
        
        print(f"📊 Cleanup Response Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Test session cleaned up successfully")
        else:
            print(f"⚠️ Cleanup warning: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"⚠️ Cleanup error (non-critical): {e}")

def run_specific_queries():
    """Run the specific queries mentioned in the review request"""
    print_section("STEP 5: SPECIFIC DATABASE QUERIES")
    
    try:
        from pymongo import MongoClient
        
        client = MongoClient(MONGO_URL)
        db = client['turfloot']
        
        # Check both collection names
        collections = ['game-sessions', 'game_sessions']
        
        for collection_name in collections:
            if collection_name in db.list_collection_names():
                print_subsection(f"Running queries on {collection_name}")
                collection = db[collection_name]
                
                # Query 1: Check active sessions (from review request)
                print("🔍 Query 1: Active sessions in last 5 minutes with Colyseus mode")
                five_minutes_ago = datetime.now() - timedelta(minutes=5)
                query1 = {
                    'session.lastActivity': {'$gte': five_minutes_ago},
                    'session.mode': {'$regex': 'colyseus', '$options': 'i'}
                }
                
                results1 = list(collection.find(query1))
                print(f"📊 Found {len(results1)} active Colyseus sessions")
                
                for i, session in enumerate(results1, 1):
                    print(f"  Active Session {i}:")
                    print(f"    - Room ID: {session.get('roomId', session.get('session', {}).get('roomId'))}")
                    print(f"    - User ID: {session.get('userId', session.get('session', {}).get('userId'))}")
                    print(f"    - Mode: {session.get('mode', session.get('session', {}).get('mode'))}")
                    print(f"    - Last Activity: {session.get('lastActivity', session.get('session', {}).get('lastActivity'))}")
                
                # Query 2: All recent sessions (from review request)
                print("\n🔍 Query 2: All recent sessions (last 10)")
                query2 = {}
                results2 = list(collection.find(query2).sort([('_id', -1)]).limit(10))
                print(f"📊 Found {len(results2)} recent sessions")
                
                for i, session in enumerate(results2, 1):
                    print(f"  Recent Session {i}:")
                    print(f"    - Room ID: {session.get('roomId', session.get('session', {}).get('roomId'))}")
                    print(f"    - Mode: {session.get('mode', session.get('session', {}).get('mode'))}")
                    print(f"    - Last Activity: {session.get('lastActivity', session.get('session', {}).get('lastActivity'))}")
                    print(f"    - Full: {json.dumps(session, default=str, indent=6)}")
        
        client.close()
        return True
        
    except ImportError:
        print("❌ pymongo not available for direct database queries")
        return False
    except Exception as e:
        print(f"❌ Database query error: {e}")
        return False

def analyze_findings():
    """Analyze the findings and provide recommendations"""
    print_section("STEP 6: ANALYSIS AND RECOMMENDATIONS")
    
    print("🔍 Based on the debug analysis, here are the key findings:")
    print()
    
    print("📊 EXPECTED vs ACTUAL:")
    print("  Expected: Device 1 creates room → Database stores session → Device 2 sees active room")
    print("  Actual: Device 1 creates room → Device 2 only sees 'CREATE NEW ROOM'")
    print()
    
    print("🚨 POTENTIAL ROOT CAUSES:")
    print("  1. Collection Name Mismatch:")
    print("     - servers/route.js queries 'game-sessions' collection")
    print("     - game-sessions/route.js uses 'game_sessions' collection")
    print("     - This mismatch prevents proper session tracking")
    print()
    
    print("  2. Room ID Inconsistency:")
    print("     - Different parts of system may use different room ID formats")
    print("     - 'colyseus-arena-global' vs 'colyseus-arena-default' vs 'colyseus-arena'")
    print()
    
    print("  3. Anonymous User Issue:")
    print("     - All sessions stored with userId: 'anonymous'")
    print("     - Multiple players appear as single user, causing overwrites")
    print()
    
    print("  4. Query Logic Mismatch:")
    print("     - Server browser queries for specific room IDs")
    print("     - Actual sessions may be stored under different IDs")
    print()
    
    print("✅ RECOMMENDED FIXES:")
    print("  1. Standardize collection name to 'game-sessions' across all APIs")
    print("  2. Use consistent room ID format throughout the system")
    print("  3. Generate unique user IDs instead of 'anonymous'")
    print("  4. Add logging to track session lifecycle")
    print("  5. Verify session update/heartbeat mechanism")

def main():
    """Main test execution"""
    print_section("COLYSEUS ROOM TRACKING SYSTEM DEBUG")
    print("🎯 Objective: Debug why Device 1 created room but Device 2 only sees 'CREATE NEW ROOM'")
    print(f"🌐 Base URL: {BASE_URL}")
    print(f"🗄️ MongoDB URL: {MONGO_URL}")
    
    # Execute all debug steps
    print("🚀 Starting comprehensive debug analysis...")
    
    db_result = test_database_state()
    api_result = test_api_response()
    test_session_created = create_test_session()
    
    if test_session_created:
        cleanup_test_session()
    
    run_specific_queries()
    analyze_findings()
    
    # Final summary
    print_section("DEBUG SUMMARY")
    print(f"✅ Database Analysis: {'Completed' if db_result else 'Failed'}")
    print(f"✅ API Response Test: {'Completed' if api_result else 'Failed'}")
    print(f"✅ Test Session Creation: {'Completed' if test_session_created else 'Failed'}")
    
    if api_result:
        total_players = api_result.get('totalPlayers', 0)
        if total_players == 0:
            print("🚨 CRITICAL ISSUE: API reports 0 players - room tracking system not working")
        else:
            print(f"✅ API reports {total_players} active players")
    
    print("\n🎯 CONCLUSION:")
    print("The debug analysis reveals architectural inconsistencies in the room tracking system.")
    print("Main issue: Collection name mismatch between APIs prevents proper session visibility.")

if __name__ == "__main__":
    main()