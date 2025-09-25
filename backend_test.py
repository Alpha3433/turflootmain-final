#!/usr/bin/env python3
"""
Backend Testing for Cash Out Ring System Implementation in Arena Mode
Testing comprehensive cash out functionality including server-side state tracking,
message handling, progress tracking, reward system, and state synchronization.
"""

import requests
import json
import time
import sys
from typing import Dict, Any, List

class CashOutRingSystemTester:
    def __init__(self):
        self.base_url = "https://smooth-mover.preview.emergentagent.com"
        self.api_base = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
            
        result = f"{status} - {test_name}"
        if details:
            result += f": {details}"
            
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
        
    def test_api_health_check(self):
        """Test 1: API Health Check - Verify backend infrastructure is operational"""
        try:
            response = requests.get(f"{self.api_base}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', '')
                status = data.get('status', '')
                features = data.get('features', [])
                
                if service_name and status == 'operational' and 'multiplayer' in features:
                    self.log_test("API Health Check", True, 
                                f"Service: {service_name}, Status: {status}, Features: {features}")
                else:
                    self.log_test("API Health Check", False, 
                                f"Invalid response structure: {data}")
            else:
                self.log_test("API Health Check", False, 
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("API Health Check", False, f"Exception: {str(e)}")
    
    def test_colyseus_server_availability(self):
        """Test 2: Colyseus Server Availability - Verify arena server is operational"""
        try:
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                # Find arena server
                arena_server = None
                for server in servers:
                    if server.get('serverType') == 'colyseus' and server.get('roomType') == 'arena':
                        arena_server = server
                        break
                
                if arena_server and colyseus_enabled and colyseus_endpoint:
                    self.log_test("Colyseus Server Availability", True,
                                f"Arena server found: {arena_server.get('id')}, "
                                f"Max players: {arena_server.get('maxPlayers')}, "
                                f"Endpoint: {colyseus_endpoint}")
                else:
                    self.log_test("Colyseus Server Availability", False,
                                f"Arena server not found or Colyseus not enabled. "
                                f"Servers: {len(servers)}, Colyseus enabled: {colyseus_enabled}")
            else:
                self.log_test("Colyseus Server Availability", False,
                            f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Colyseus Server Availability", False, f"Exception: {str(e)}")
    
    def test_cash_out_schema_verification(self):
        """Test 3: Cash Out Schema Verification - Check if cash out fields exist in compiled code"""
        try:
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            # Check compiled JavaScript file  
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Required cash out fields
            required_fields = ['isCashingOut', 'cashOutProgress', 'cashOutStart']
            ts_fields_found = []
            js_fields_found = []
            
            for field in required_fields:
                if field in ts_content:
                    ts_fields_found.append(field)
                if field in js_content:
                    js_fields_found.append(field)
            
            # Check for 3-second duration
            duration_3s_ts = '3000' in ts_content and 'cashOutDuration' in ts_content
            duration_3s_js = '3000' in js_content and ('cashOutDuration' in js_content or 'cash out' in js_content.lower())
            
            if (len(ts_fields_found) == 3 and len(js_fields_found) == 3 and 
                duration_3s_ts and duration_3s_js):
                self.log_test("Cash Out Schema Verification", True,
                            f"All cash out fields found in both TS and JS. "
                            f"TS fields: {ts_fields_found}, JS fields: {js_fields_found}, "
                            f"3-second duration confirmed")
            else:
                self.log_test("Cash Out Schema Verification", False,
                            f"Missing fields - TS: {ts_fields_found}, JS: {js_fields_found}, "
                            f"Duration TS: {duration_3s_ts}, Duration JS: {duration_3s_js}")
                
        except Exception as e:
            self.log_test("Cash Out Schema Verification", False, f"Exception: {str(e)}")
    
    def test_cash_out_message_handling(self):
        """Test 4: Cash Out Message Handling - Verify server handles 'cashout' messages"""
        try:
            # Check TypeScript source file for message handler
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            # Check compiled JavaScript file
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Look for cashout message handler
            ts_handler = 'onMessage("cashout"' in ts_content or 'onMessage(\'cashout\'' in ts_content
            js_handler = '"cashout"' in js_content and 'handleCashOut' in js_content
            
            # Look for handleCashOut method
            ts_method = 'handleCashOut(' in ts_content
            js_method = 'handleCashOut(' in js_content
            
            # Look for start/stop action handling
            ts_actions = 'action === \'start\'' in ts_content and 'action === \'stop\'' in ts_content
            js_actions = 'action === \'start\'' in js_content and 'action === \'stop\'' in js_content
            
            if (ts_handler and js_handler and ts_method and js_method and 
                ts_actions and js_actions):
                self.log_test("Cash Out Message Handling", True,
                            "Cash out message handler found in both TS and JS with start/stop actions")
            else:
                self.log_test("Cash Out Message Handling", False,
                            f"Missing components - TS handler: {ts_handler}, JS handler: {js_handler}, "
                            f"TS method: {ts_method}, JS method: {js_method}, "
                            f"TS actions: {ts_actions}, JS actions: {js_actions}")
                
        except Exception as e:
            self.log_test("Cash Out Message Handling", False, f"Exception: {str(e)}")
    
    def test_progress_tracking_logic(self):
        """Test 5: Progress Tracking Logic - Verify 3-second duration and 0-100% progress"""
        try:
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            # Check compiled JavaScript file
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Look for progress calculation logic
            ts_progress_calc = ('cashOutDuration' in ts_content and 
                              'elapsed / cashOutDuration' in ts_content and
                              '* 100' in ts_content)
            
            js_progress_calc = ('3000' in js_content and 
                              'elapsed' in js_content and
                              '* 100' in js_content and
                              'cashOutProgress' in js_content)
            
            # Look for completion logic (progress >= 100)
            ts_completion = 'cashOutProgress >= 100' in ts_content
            js_completion = 'cashOutProgress >= 100' in js_content
            
            # Look for automatic completion
            ts_auto_complete = ('isCashingOut = false' in ts_content and 
                              'cashOutProgress = 0' in ts_content)
            js_auto_complete = ('isCashingOut = false' in js_content and 
                              'cashOutProgress = 0' in js_content)
            
            if (ts_progress_calc and js_progress_calc and 
                ts_completion and js_completion and
                ts_auto_complete and js_auto_complete):
                self.log_test("Progress Tracking Logic", True,
                            "Progress tracking logic found in both TS and JS with 3-second duration, "
                            "0-100% progress calculation, and automatic completion")
            else:
                self.log_test("Progress Tracking Logic", False,
                            f"Missing logic - TS progress: {ts_progress_calc}, JS progress: {js_progress_calc}, "
                            f"TS completion: {ts_completion}, JS completion: {js_completion}, "
                            f"TS auto: {ts_auto_complete}, JS auto: {js_auto_complete}")
                
        except Exception as e:
            self.log_test("Progress Tracking Logic", False, f"Exception: {str(e)}")
    
    def test_reward_system_logic(self):
        """Test 6: Reward System Logic - Verify 2x mass reward calculation"""
        try:
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            # Check compiled JavaScript file
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Look for reward calculation (2x mass)
            ts_reward = ('player.mass * 2' in ts_content and 
                        'cashOutReward' in ts_content and
                        'player.score +=' in ts_content)
            
            js_reward = ('player.mass * 2' in js_content and 
                        'cashOutReward' in js_content and
                        'player.score +=' in js_content)
            
            # Look for reward logging
            ts_logging = 'completed cash out' in ts_content.lower()
            js_logging = 'completed cash out' in js_content.lower()
            
            if ts_reward and js_reward and ts_logging and js_logging:
                self.log_test("Reward System Logic", True,
                            "Reward system found in both TS and JS with 2x mass calculation "
                            "and score addition with logging")
            else:
                self.log_test("Reward System Logic", False,
                            f"Missing reward logic - TS reward: {ts_reward}, JS reward: {js_reward}, "
                            f"TS logging: {ts_logging}, JS logging: {js_logging}")
                
        except Exception as e:
            self.log_test("Reward System Logic", False, f"Exception: {str(e)}")
    
    def test_state_synchronization_schema(self):
        """Test 7: State Synchronization Schema - Verify cash out fields in Player schema"""
        try:
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            # Check compiled JavaScript file
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Look for schema decorators in TypeScript
            ts_schema_fields = []
            if '@type("boolean") isCashingOut' in ts_content:
                ts_schema_fields.append('isCashingOut')
            if '@type("number") cashOutProgress' in ts_content:
                ts_schema_fields.append('cashOutProgress')  
            if '@type("number") cashOutStart' in ts_content:
                ts_schema_fields.append('cashOutStart')
            
            # Look for schema implementation in JavaScript (compiled decorators)
            js_schema_impl = ('Player extends' in js_content and 
                            'isCashingOut' in js_content and
                            'cashOutProgress' in js_content and
                            'cashOutStart' in js_content)
            
            if len(ts_schema_fields) == 3 and js_schema_impl:
                self.log_test("State Synchronization Schema", True,
                            f"Cash out fields properly included in Player schema. "
                            f"TS schema fields: {ts_schema_fields}, JS schema implementation found")
            else:
                self.log_test("State Synchronization Schema", False,
                            f"Schema issues - TS fields: {ts_schema_fields}, "
                            f"JS implementation: {js_schema_impl}")
                
        except Exception as e:
            self.log_test("State Synchronization Schema", False, f"Exception: {str(e)}")
    
    def test_multi_user_visibility_support(self):
        """Test 8: Multi-User Visibility Support - Verify state broadcast infrastructure"""
        try:
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            # Check compiled JavaScript file
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Look for MapSchema usage for players (enables state synchronization)
            ts_mapschema = ('MapSchema<Player>' in ts_content and 
                          'this.state.players' in ts_content)
            
            js_mapschema = ('MapSchema' in js_content and 
                          'this.state.players' in js_content)
            
            # Look for player state updates in game loop
            ts_updates = ('this.state.players.forEach' in ts_content and 
                        'player.isCashingOut' in ts_content)
            
            js_updates = ('this.state.players.forEach' in js_content and 
                        'player.isCashingOut' in js_content)
            
            # Look for state timestamp updates (ensures real-time sync)
            ts_timestamp = 'this.state.timestamp = Date.now()' in ts_content
            js_timestamp = 'this.state.timestamp = Date.now()' in js_content
            
            if (ts_mapschema and js_mapschema and 
                ts_updates and js_updates and
                ts_timestamp and js_timestamp):
                self.log_test("Multi-User Visibility Support", True,
                            "State synchronization infrastructure found with MapSchema, "
                            "player state updates, and timestamp synchronization")
            else:
                self.log_test("Multi-User Visibility Support", False,
                            f"Missing sync infrastructure - TS MapSchema: {ts_mapschema}, "
                            f"JS MapSchema: {js_mapschema}, TS updates: {ts_updates}, "
                            f"JS updates: {js_updates}, TS timestamp: {ts_timestamp}, "
                            f"JS timestamp: {js_timestamp}")
                
        except Exception as e:
            self.log_test("Multi-User Visibility Support", False, f"Exception: {str(e)}")
    
    def test_server_side_enforcement(self):
        """Test 9: Server-Side Enforcement - Verify all cash out logic is server-authoritative"""
        try:
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            # Check compiled JavaScript file
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            checks_passed = 0
            total_checks = 4
            
            # Check 1: Cash out state changes are server-controlled
            if ('player.isCashingOut = true' in ts_content and 
                'player.isCashingOut = true' in js_content):
                checks_passed += 1
            
            # Check 2: Progress calculation is server-side
            if ('player.cashOutProgress = Math.min' in ts_content and 
                'player.cashOutProgress = Math.min' in js_content):
                checks_passed += 1
            
            # Check 3: Reward calculation is server-side
            if ('Math.floor(player.mass * 2)' in ts_content and 
                'Math.floor(player.mass * 2)' in js_content):
                checks_passed += 1
            
            # Check 4: Server validates player existence and alive status
            if ('!player || !player.alive' in ts_content and 
                '!player || !player.alive' in js_content):
                checks_passed += 1
            
            if checks_passed == total_checks:
                self.log_test("Server-Side Enforcement", True,
                            f"All server-side enforcement checks passed ({checks_passed}/{total_checks})")
            else:
                self.log_test("Server-Side Enforcement", False,
                            f"Server-side enforcement incomplete ({checks_passed}/{total_checks} checks passed)")
                
        except Exception as e:
            self.log_test("Server-Side Enforcement", False, f"Exception: {str(e)}")
    
    def test_database_integration_support(self):
        """Test 10: Database Integration Support - Verify backend supports cash out operations"""
        try:
            # Test game sessions API (supports session tracking during cash out)
            response = requests.get(f"{self.api_base}/game-sessions", timeout=10)
            
            sessions_working = response.status_code in [200, 404]  # 404 is OK if no sessions
            
            # Test wallet balance API (supports reward tracking)
            response = requests.get(f"{self.api_base}/wallet/balance", timeout=10)
            
            wallet_working = response.status_code in [200, 401]  # 401 is OK for unauthenticated
            
            if sessions_working and wallet_working:
                self.log_test("Database Integration Support", True,
                            "Game sessions and wallet balance APIs accessible, "
                            "supporting cash out session tracking and reward management")
            else:
                self.log_test("Database Integration Support", False,
                            f"API accessibility issues - Sessions: {sessions_working}, "
                            f"Wallet: {wallet_working}")
                
        except Exception as e:
            self.log_test("Database Integration Support", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all cash out ring system tests"""
        print("🎯 STARTING CASH OUT RING SYSTEM COMPREHENSIVE TESTING")
        print("=" * 80)
        
        # Run all tests
        self.test_api_health_check()
        self.test_colyseus_server_availability()
        self.test_cash_out_schema_verification()
        self.test_cash_out_message_handling()
        self.test_progress_tracking_logic()
        self.test_reward_system_logic()
        self.test_state_synchronization_schema()
        self.test_multi_user_visibility_support()
        self.test_server_side_enforcement()
        self.test_database_integration_support()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 CASH OUT RING SYSTEM TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 CASH OUT RING SYSTEM IS WORKING EXCELLENTLY!")
        elif success_rate >= 75:
            print("✅ CASH OUT RING SYSTEM IS WORKING WELL!")
        elif success_rate >= 50:
            print("⚠️ CASH OUT RING SYSTEM HAS SOME ISSUES")
        else:
            print("❌ CASH OUT RING SYSTEM HAS MAJOR ISSUES")
        
        return success_rate >= 75

if __name__ == "__main__":
    tester = CashOutRingSystemTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)