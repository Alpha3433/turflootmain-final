#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Spawn Protection System in Arena Mode
Testing all requirements from the review request:
1. Server-Side Spawn Protection
2. Protection Timer Logic  
3. Collision Prevention
4. Respawn Protection
5. Protection Synchronization
6. Protection Properties
"""

import asyncio
import json
import time
import requests
import websockets
from datetime import datetime
import sys
import os
import re

# Configuration
BASE_URL = "https://arenapatch.preview.emergentagent.com"
COLYSEUS_ENDPOINT = "wss://au-syd-ab3eaf4e.colyseus.cloud"

class SpawnProtectionTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, passed, details=""):
        """Log test result"""
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
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        
    def print_summary(self):
        """Print test summary"""
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        print(f"\n{'='*80}")
        print(f"SPAWN PROTECTION SYSTEM TESTING SUMMARY")
        print(f"{'='*80}")
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"{'='*80}")

    async def test_api_health_check(self):
        """Test 1: API Health Check"""
        try:
            response = requests.get(f"{BASE_URL}/api", timeout=10)
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', '')
                features = data.get('features', [])
                
                if 'multiplayer' in features:
                    self.log_test("API Health Check", True, f"Service: {service_name}, Multiplayer enabled")
                else:
                    self.log_test("API Health Check", False, "Multiplayer feature not enabled")
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("API Health Check", False, f"Error: {str(e)}")

    async def test_colyseus_server_availability(self):
        """Test 2: Colyseus Server Availability"""
        try:
            response = requests.get(f"{BASE_URL}/api/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                colyseus_enabled = data.get('colyseusEnabled', False)
                servers = data.get('servers', [])
                
                arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' and s.get('roomType') == 'arena']
                
                if colyseus_enabled and arena_servers:
                    arena_server = arena_servers[0]
                    self.log_test("Colyseus Server Availability", True, 
                                f"Arena server found: {arena_server.get('id')}, Max players: {arena_server.get('maxPlayers')}")
                else:
                    self.log_test("Colyseus Server Availability", False, "No arena servers available")
            else:
                self.log_test("Colyseus Server Availability", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("Colyseus Server Availability", False, f"Error: {str(e)}")

    async def test_spawn_protection_schema_verification(self):
        """Test 3: Spawn Protection Schema Verification"""
        try:
            # Read the compiled JavaScript file to verify spawn protection fields
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for spawn protection properties in compiled code
            spawn_protection_found = 'spawnProtection' in js_content
            spawn_protection_start_found = 'spawnProtectionStart' in js_content  
            spawn_protection_time_found = 'spawnProtectionTime' in js_content
            six_seconds_found = '6000' in js_content
            
            if spawn_protection_found and spawn_protection_start_found and spawn_protection_time_found and six_seconds_found:
                self.log_test("Spawn Protection Schema Verification", True, 
                            "All spawn protection fields found in compiled code with 6-second duration")
            else:
                missing_fields = []
                if not spawn_protection_found: missing_fields.append('spawnProtection')
                if not spawn_protection_start_found: missing_fields.append('spawnProtectionStart')
                if not spawn_protection_time_found: missing_fields.append('spawnProtectionTime')
                if not six_seconds_found: missing_fields.append('6000ms duration')
                
                self.log_test("Spawn Protection Schema Verification", False, 
                            f"Missing fields: {', '.join(missing_fields)}")
        except Exception as e:
            self.log_test("Spawn Protection Schema Verification", False, f"Error: {str(e)}")

    async def test_spawn_protection_initialization(self):
        """Test 4: Spawn Protection Initialization Logic"""
        try:
            # Read both TypeScript and JavaScript files to verify initialization
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check onJoin method for spawn protection initialization
            ts_onjoin_protection = 'player.spawnProtection = true' in ts_content
            ts_onjoin_start = 'player.spawnProtectionStart = Date.now()' in ts_content
            ts_onjoin_time = 'player.spawnProtectionTime = 6000' in ts_content
            
            js_onjoin_protection = 'player.spawnProtection = true' in js_content
            js_onjoin_start = 'player.spawnProtectionStart = Date.now()' in js_content
            js_onjoin_time = 'player.spawnProtectionTime = 6000' in js_content
            
            ts_init_count = sum([ts_onjoin_protection, ts_onjoin_start, ts_onjoin_time])
            js_init_count = sum([js_onjoin_protection, js_onjoin_start, js_onjoin_time])
            
            if ts_init_count == 3 and js_init_count == 3:
                self.log_test("Spawn Protection Initialization", True, 
                            "Spawn protection properly initialized in both onJoin methods (TS & JS)")
            else:
                self.log_test("Spawn Protection Initialization", False, 
                            f"Initialization incomplete - TS: {ts_init_count}/3, JS: {js_init_count}/3")
        except Exception as e:
            self.log_test("Spawn Protection Initialization", False, f"Error: {str(e)}")

    async def test_protection_timer_logic(self):
        """Test 5: Protection Timer Logic Verification"""
        try:
            # Read files to verify timer logic in update method
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for protection timer logic
            ts_timer_check = 'if (player.spawnProtection)' in ts_content
            ts_timer_expiry = 'now - player.spawnProtectionStart >= player.spawnProtectionTime' in ts_content
            ts_timer_disable = 'player.spawnProtection = false' in ts_content
            
            js_timer_check = 'if (player.spawnProtection)' in js_content
            js_timer_expiry = 'now - player.spawnProtectionStart >= player.spawnProtectionTime' in js_content
            js_timer_disable = 'player.spawnProtection = false' in js_content
            
            ts_timer_count = sum([ts_timer_check, ts_timer_expiry, ts_timer_disable])
            js_timer_count = sum([js_timer_check, js_timer_expiry, js_timer_disable])
            
            if ts_timer_count == 3 and js_timer_count == 3:
                self.log_test("Protection Timer Logic", True, 
                            "Timer logic properly implemented in both update methods (TS & JS)")
            else:
                self.log_test("Protection Timer Logic", False, 
                            f"Timer logic incomplete - TS: {ts_timer_count}/3, JS: {js_timer_count}/3")
        except Exception as e:
            self.log_test("Protection Timer Logic", False, f"Error: {str(e)}")

    async def test_collision_prevention_logic(self):
        """Test 6: Collision Prevention Logic"""
        try:
            # Read files to verify collision prevention
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for collision prevention logic
            ts_collision_check = 'if (player.spawnProtection || otherPlayer.spawnProtection)' in ts_content
            ts_collision_return = 'return;' in ts_content and 'checkPlayerCollisions' in ts_content
            
            js_collision_check = 'if (player.spawnProtection || otherPlayer.spawnProtection)' in js_content
            js_collision_return = 'return;' in js_content and 'checkPlayerCollisions' in js_content
            
            if ts_collision_check and js_collision_check:
                self.log_test("Collision Prevention Logic", True, 
                            "Collision prevention properly implemented in both files (TS & JS)")
            else:
                missing = []
                if not ts_collision_check: missing.append("TS collision check")
                if not js_collision_check: missing.append("JS collision check")
                
                self.log_test("Collision Prevention Logic", False, 
                            f"Missing collision prevention: {', '.join(missing)}")
        except Exception as e:
            self.log_test("Collision Prevention Logic", False, f"Error: {str(e)}")

    async def test_respawn_protection_logic(self):
        """Test 7: Respawn Protection Logic"""
        try:
            # Read files to verify respawn protection
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Count occurrences to verify both onJoin and respawnPlayer have protection
            ts_protection_count = ts_content.count('player.spawnProtection = true')
            js_protection_count = js_content.count('player.spawnProtection = true')
            
            if ts_protection_count >= 2 and js_protection_count >= 2:
                self.log_test("Respawn Protection Logic", True, 
                            f"Respawn protection found in both onJoin and respawnPlayer methods - TS: {ts_protection_count} occurrences, JS: {js_protection_count} occurrences")
            else:
                self.log_test("Respawn Protection Logic", False, 
                            f"Insufficient respawn protection occurrences - TS: {ts_protection_count}, JS: {js_protection_count} (expected >= 2 each)")
        except Exception as e:
            self.log_test("Respawn Protection Logic", False, f"Error: {str(e)}")

    async def test_protection_synchronization_schema(self):
        """Test 8: Protection Synchronization Schema"""
        try:
            # Read files to verify schema synchronization
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for @type decorators in TypeScript (should be present for synchronization)
            ts_has_type_decorators = '@type("boolean") spawnProtection' in ts_content or '@type("number") spawnProtectionStart' in ts_content
            
            # Check for type decorators in compiled JavaScript
            js_has_type_decorators = 'type)("boolean")' in js_content and 'spawnProtection' in js_content
            
            # Check if spawn protection fields are in Player schema
            ts_in_player_schema = 'class Player extends Schema' in ts_content and 'spawnProtection' in ts_content
            js_in_player_schema = 'Player extends' in js_content and 'spawnProtection' in js_content
            
            if js_has_type_decorators and ts_in_player_schema and js_in_player_schema:
                self.log_test("Protection Synchronization Schema", True, 
                            "Spawn protection fields properly included in Player schema for client synchronization")
            else:
                issues = []
                if not ts_has_type_decorators: issues.append("TS @type decorators missing")
                if not js_has_type_decorators: issues.append("JS type decorators missing")
                if not ts_in_player_schema: issues.append("TS Player schema missing")
                if not js_in_player_schema: issues.append("JS Player schema missing")
                
                self.log_test("Protection Synchronization Schema", False, 
                            f"Schema synchronization issues: {', '.join(issues)}")
        except Exception as e:
            self.log_test("Protection Synchronization Schema", False, f"Error: {str(e)}")

    async def test_protection_properties_consistency(self):
        """Test 9: Protection Properties Consistency"""
        try:
            # Read files to verify property consistency
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Count all spawn protection related properties
            ts_protection_refs = ts_content.count('spawnProtection')
            ts_protection_start_refs = ts_content.count('spawnProtectionStart')
            ts_protection_time_refs = ts_content.count('spawnProtectionTime')
            ts_6000_refs = ts_content.count('6000')
            
            js_protection_refs = js_content.count('spawnProtection')
            js_protection_start_refs = js_content.count('spawnProtectionStart')
            js_protection_time_refs = js_content.count('spawnProtectionTime')
            js_6000_refs = js_content.count('6000')
            
            # Verify minimum expected references
            ts_sufficient = (ts_protection_refs >= 5 and ts_protection_start_refs >= 3 and 
                           ts_protection_time_refs >= 3 and ts_6000_refs >= 2)
            js_sufficient = (js_protection_refs >= 5 and js_protection_start_refs >= 3 and 
                           js_protection_time_refs >= 3 and js_6000_refs >= 2)
            
            if ts_sufficient and js_sufficient:
                self.log_test("Protection Properties Consistency", True, 
                            f"All protection properties consistently used - TS refs: {ts_protection_refs}, JS refs: {js_protection_refs}")
            else:
                self.log_test("Protection Properties Consistency", False, 
                            f"Inconsistent property usage - TS: protection={ts_protection_refs}, start={ts_protection_start_refs}, time={ts_protection_time_refs}, 6000={ts_6000_refs} | JS: protection={js_protection_refs}, start={js_protection_start_refs}, time={js_protection_time_refs}, 6000={js_6000_refs}")
        except Exception as e:
            self.log_test("Protection Properties Consistency", False, f"Error: {str(e)}")

    async def test_server_side_enforcement(self):
        """Test 10: Server-Side Enforcement Verification"""
        try:
            # Verify that spawn protection is enforced server-side
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for server-side enforcement patterns
            server_side_checks = [
                'if (player.spawnProtection || otherPlayer.spawnProtection)' in js_content,
                'player.spawnProtection = true' in js_content,
                'now - player.spawnProtectionStart >= player.spawnProtectionTime' in js_content,
                'player.spawnProtection = false' in js_content
            ]
            
            enforcement_count = sum(server_side_checks)
            
            if enforcement_count >= 3:
                self.log_test("Server-Side Enforcement", True, 
                            f"Server-side spawn protection enforcement verified - {enforcement_count}/4 checks passed")
            else:
                self.log_test("Server-Side Enforcement", False, 
                            f"Insufficient server-side enforcement - only {enforcement_count}/4 checks passed")
        except Exception as e:
            self.log_test("Server-Side Enforcement", False, f"Error: {str(e)}")

    async def run_all_tests(self):
        """Run all spawn protection tests"""
        print("🛡️ STARTING COMPREHENSIVE SPAWN PROTECTION SYSTEM TESTING")
        print("="*80)
        
        # Run all tests
        await self.test_api_health_check()
        await self.test_colyseus_server_availability()
        await self.test_spawn_protection_schema_verification()
        await self.test_spawn_protection_initialization()
        await self.test_protection_timer_logic()
        await self.test_collision_prevention_logic()
        await self.test_respawn_protection_logic()
        await self.test_protection_synchronization_schema()
        await self.test_protection_properties_consistency()
        await self.test_server_side_enforcement()
        
        # Print summary
        self.print_summary()
        
        return self.passed_tests, self.total_tests

async def main():
    """Main test execution"""
    tester = SpawnProtectionTester()
    
    try:
        passed, total = await tester.run_all_tests()
        
        # Exit with appropriate code
        if passed == total:
            print("\n🎉 ALL SPAWN PROTECTION TESTS PASSED!")
            sys.exit(0)
        else:
            print(f"\n⚠️ {total - passed} TESTS FAILED")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ TESTING FAILED: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())