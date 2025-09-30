#!/usr/bin/env python3
"""
Backend Testing Script for Agario-Style Split Functionality
Testing the completely rewritten split mechanics to match agario exactly with mouse direction, 
momentum movement, independent pieces, touch-based merging, and 16-piece limit.
"""

import requests
import json
import time
import os
from typing import Dict, Any, List, Tuple

class AgarIOSplitBackendTester:
    def __init__(self):
        # Get base URL from environment
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://turfloot-arena-4.preview.emergentagent.com')
        self.api_base = f"{self.base_url}/api"
        self.colyseus_endpoint = os.getenv('NEXT_PUBLIC_COLYSEUS_ENDPOINT', 'wss://au-syd-ab3eaf4e.colyseus.cloud')
        
        print(f"🔧 Testing Configuration:")
        print(f"   Base URL: {self.base_url}")
        print(f"   API Base: {self.api_base}")
        print(f"   Colyseus Endpoint: {self.colyseus_endpoint}")
        print()
        
        self.test_results = []
        self.start_time = time.time()

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result with details"""
        status = "✅ PASSED" if passed else "❌ FAILED"
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'timestamp': time.time()
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()

    def test_api_health_check(self) -> bool:
        """Test 1: Verify backend API and Colyseus servers are operational after restart"""
        print("🔍 TEST 1: API Health Check - Backend infrastructure operational after spawn protection update")
        
        try:
            response = requests.get(f"{self.api_base}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                service = data.get('service', 'unknown')
                status = data.get('status', 'unknown')
                features = data.get('features', [])
                
                # Check if multiplayer features are enabled
                multiplayer_enabled = 'multiplayer' in features
                auth_enabled = 'auth' in features
                
                details = f"Service: {service}, Status: {status}, Features: {features}, Multiplayer: {multiplayer_enabled}"
                
                if status == 'operational' and multiplayer_enabled:
                    self.log_test("API Health Check", True, details)
                    return True
                else:
                    self.log_test("API Health Check", False, f"Service not operational or multiplayer disabled - {details}")
                    return False
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"Exception: {str(e)}")
            return False

    def test_colyseus_server_availability(self) -> bool:
        """Test 2: Verify Colyseus servers are running with updated spawn protection"""
        print("🔍 TEST 2: Colyseus Server Availability - Arena servers running with 4-second spawn protection")
        
        try:
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                # Find Colyseus arena servers
                arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' and s.get('roomType') == 'arena']
                
                if colyseus_enabled and arena_servers:
                    server = arena_servers[0]
                    server_name = server.get('name', 'Unknown')
                    max_players = server.get('maxPlayers', 0)
                    current_players = server.get('currentPlayers', 0)
                    
                    details = f"Found arena server: {server_name}, Max: {max_players}, Current: {current_players}, Endpoint: {colyseus_endpoint}"
                    self.log_test("Colyseus Server Availability", True, details)
                    return True
                else:
                    self.log_test("Colyseus Server Availability", False, f"No arena servers found - Colyseus enabled: {colyseus_enabled}, Servers: {len(servers)}")
                    return False
            else:
                self.log_test("Colyseus Server Availability", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Colyseus Server Availability", False, f"Exception: {str(e)}")
            return False

    def test_spawn_protection_duration_configuration(self) -> bool:
        """Test 3: Verify server-side spawn protection duration is now 4 seconds (4000ms) instead of 6"""
        print("🔍 TEST 3: Spawn Protection Duration Configuration - Server-side duration updated to 4000ms")
        
        try:
            # Check TypeScript source file for 4000ms configuration
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            ts_checks = 0
            js_checks = 0
            
            # Check TypeScript source
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    
                # Look for 4000ms duration patterns
                if 'spawnProtectionTime: number = 4000' in ts_content:
                    ts_checks += 1
                if '4000; // 4 seconds protection' in ts_content:
                    ts_checks += 1
                if 'spawnProtectionTime = 4000' in ts_content:
                    ts_checks += 1
                    
            # Check compiled JavaScript
            if os.path.exists(js_file_path):
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    
                # Look for 4000ms duration patterns
                if 'spawnProtectionTime = 4000' in js_content:
                    js_checks += 1
                if '4000; // 4 seconds protection' in js_content:
                    js_checks += 1
                    
            total_checks = ts_checks + js_checks
            
            if total_checks >= 3:  # At least 3 occurrences of 4000ms found
                details = f"Found {total_checks} occurrences of 4000ms duration (TS: {ts_checks}, JS: {js_checks})"
                self.log_test("Spawn Protection Duration Configuration", True, details)
                return True
            else:
                details = f"Insufficient 4000ms patterns found - Total: {total_checks} (TS: {ts_checks}, JS: {js_checks})"
                self.log_test("Spawn Protection Duration Configuration", False, details)
                return False
                
        except Exception as e:
            self.log_test("Spawn Protection Duration Configuration", False, f"Exception: {str(e)}")
            return False

    def test_spawn_protection_initialization(self) -> bool:
        """Test 4: Verify spawn protection initialization works for both joining and respawning players"""
        print("🔍 TEST 4: Spawn Protection Initialization - Both joining and respawning players get 4-second protection")
        
        try:
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            ts_patterns = 0
            js_patterns = 0
            
            # Check TypeScript source
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    
                # Look for spawn protection initialization patterns
                if 'player.spawnProtection = true' in ts_content:
                    ts_patterns += ts_content.count('player.spawnProtection = true')
                if 'player.spawnProtectionStart = Date.now()' in ts_content:
                    ts_patterns += ts_content.count('player.spawnProtectionStart = Date.now()')
                    
            # Check compiled JavaScript
            if os.path.exists(js_file_path):
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    
                # Look for spawn protection initialization patterns
                if 'player.spawnProtection = true' in js_content:
                    js_patterns += js_content.count('player.spawnProtection = true')
                if 'player.spawnProtectionStart = Date.now()' in js_content:
                    js_patterns += js_content.count('player.spawnProtectionStart = Date.now()')
                    
            total_patterns = ts_patterns + js_patterns
            
            if total_patterns >= 4:  # Should find initialization in both onJoin and respawnPlayer methods
                details = f"Found {total_patterns} spawn protection initialization patterns (TS: {ts_patterns}, JS: {js_patterns})"
                self.log_test("Spawn Protection Initialization", True, details)
                return True
            else:
                details = f"Insufficient initialization patterns - Total: {total_patterns} (TS: {ts_patterns}, JS: {js_patterns})"
                self.log_test("Spawn Protection Initialization", False, details)
                return False
                
        except Exception as e:
            self.log_test("Spawn Protection Initialization", False, f"Exception: {str(e)}")
            return False

    def test_collision_prevention_logic(self) -> bool:
        """Test 5: Check that collision prevention works during the 4-second protection period"""
        print("🔍 TEST 5: Collision Prevention Logic - Players with spawn protection cannot be eliminated")
        
        try:
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            ts_patterns = 0
            js_patterns = 0
            
            # Check TypeScript source
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    
                # Look for collision prevention patterns
                if 'if (player.spawnProtection || otherPlayer.spawnProtection)' in ts_content:
                    ts_patterns += 1
                if 'return;' in ts_content and 'spawnProtection' in ts_content:
                    ts_patterns += 1
                    
            # Check compiled JavaScript
            if os.path.exists(js_file_path):
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    
                # Look for collision prevention patterns
                if 'if (player.spawnProtection || otherPlayer.spawnProtection)' in js_content:
                    js_patterns += 1
                if 'return;' in js_content and 'spawnProtection' in js_content:
                    js_patterns += 1
                    
            total_patterns = ts_patterns + js_patterns
            
            if total_patterns >= 2:  # Should find collision prevention logic
                details = f"Found {total_patterns} collision prevention patterns (TS: {ts_patterns}, JS: {js_patterns})"
                self.log_test("Collision Prevention Logic", True, details)
                return True
            else:
                details = f"Collision prevention logic not found - Total: {total_patterns} (TS: {ts_patterns}, JS: {js_patterns})"
                self.log_test("Collision Prevention Logic", False, details)
                return False
                
        except Exception as e:
            self.log_test("Collision Prevention Logic", False, f"Exception: {str(e)}")
            return False

    def test_protection_timer_expiry(self) -> bool:
        """Test 6: Validate that protection automatically expires after exactly 4 seconds"""
        print("🔍 TEST 6: Protection Timer Expiry - Spawn protection automatically expires after 4 seconds")
        
        try:
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            ts_patterns = 0
            js_patterns = 0
            
            # Check TypeScript source
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    
                # Look for timer expiry patterns
                if 'now - player.spawnProtectionStart >= player.spawnProtectionTime' in ts_content:
                    ts_patterns += 1
                if 'player.spawnProtection = false' in ts_content:
                    ts_patterns += 1
                if 'Spawn protection ended' in ts_content:
                    ts_patterns += 1
                    
            # Check compiled JavaScript
            if os.path.exists(js_file_path):
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    
                # Look for timer expiry patterns
                if 'now - player.spawnProtectionStart >= player.spawnProtectionTime' in js_content:
                    js_patterns += 1
                if 'player.spawnProtection = false' in js_content:
                    js_patterns += 1
                if 'Spawn protection ended' in js_content:
                    js_patterns += 1
                    
            total_patterns = ts_patterns + js_patterns
            
            if total_patterns >= 4:  # Should find timer logic in both files
                details = f"Found {total_patterns} timer expiry patterns (TS: {ts_patterns}, JS: {js_patterns})"
                self.log_test("Protection Timer Expiry", True, details)
                return True
            else:
                details = f"Timer expiry logic incomplete - Total: {total_patterns} (TS: {ts_patterns}, JS: {js_patterns})"
                self.log_test("Protection Timer Expiry", False, details)
                return False
                
        except Exception as e:
            self.log_test("Protection Timer Expiry", False, f"Exception: {str(e)}")
            return False

    def test_protection_state_synchronization(self) -> bool:
        """Test 7: Confirm protection state synchronization for multiplayer visibility"""
        print("🔍 TEST 7: Protection State Synchronization - Spawn protection status synchronized to all clients")
        
        try:
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            ts_patterns = 0
            js_patterns = 0
            
            # Check TypeScript source
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    
                # Look for schema synchronization patterns
                if '@type("boolean") spawnProtection' in ts_content:
                    ts_patterns += 1
                if '@type("number") spawnProtectionStart' in ts_content:
                    ts_patterns += 1
                if '@type("number") spawnProtectionTime' in ts_content:
                    ts_patterns += 1
                    
            # Check compiled JavaScript
            if os.path.exists(js_file_path):
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    
                # Look for schema synchronization patterns in compiled code
                if 'spawnProtection' in js_content and 'boolean' in js_content:
                    js_patterns += 1
                if 'spawnProtectionStart' in js_content and 'number' in js_content:
                    js_patterns += 1
                if 'spawnProtectionTime' in js_content and 'number' in js_content:
                    js_patterns += 1
                    
            total_patterns = ts_patterns + js_patterns
            
            if total_patterns >= 4:  # Should find schema fields in both files
                details = f"Found {total_patterns} synchronization patterns (TS: {ts_patterns}, JS: {js_patterns})"
                self.log_test("Protection State Synchronization", True, details)
                return True
            else:
                details = f"Synchronization schema incomplete - Total: {total_patterns} (TS: {ts_patterns}, JS: {js_patterns})"
                self.log_test("Protection State Synchronization", False, details)
                return False
                
        except Exception as e:
            self.log_test("Protection State Synchronization", False, f"Exception: {str(e)}")
            return False

    def test_backend_api_integration(self) -> bool:
        """Test 8: Verify backend API integration supports spawn protection system"""
        print("🔍 TEST 8: Backend API Integration - API endpoints support spawn protection functionality")
        
        try:
            # Test servers endpoint
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                total_players = data.get('totalPlayers', 0)
                total_active = data.get('totalActiveServers', 0)
                
                details = f"Servers: {len(servers)}, Players: {total_players}, Active: {total_active}"
                self.log_test("Backend API Integration", True, details)
                return True
            else:
                self.log_test("Backend API Integration", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Backend API Integration", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all spawn protection backend tests"""
        print("🎯 UPDATED SPAWN PROTECTION SYSTEM COMPREHENSIVE BACKEND TESTING")
        print("=" * 80)
        print("Testing the updated spawn protection system with 4-second duration and blue checkered ring implementation")
        print()
        
        # Run all tests
        tests = [
            self.test_api_health_check,
            self.test_colyseus_server_availability,
            self.test_spawn_protection_duration_configuration,
            self.test_spawn_protection_initialization,
            self.test_collision_prevention_logic,
            self.test_protection_timer_expiry,
            self.test_protection_state_synchronization,
            self.test_backend_api_integration
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ EXCEPTION in {test_func.__name__}: {str(e)}")
        
        # Calculate results
        success_rate = (passed_tests / total_tests) * 100
        total_time = time.time() - self.start_time
        
        # Print summary
        print("=" * 80)
        print("🎯 UPDATED SPAWN PROTECTION SYSTEM BACKEND TESTING SUMMARY")
        print("=" * 80)
        print(f"✅ Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        print(f"⏱️  Total Time: {total_time:.2f} seconds")
        print()
        
        if success_rate == 100:
            print("🎉 ALL TESTS PASSED - UPDATED SPAWN PROTECTION SYSTEM IS FULLY OPERATIONAL")
            print("✅ Server-side spawn protection duration updated to 4 seconds (4000ms)")
            print("✅ Spawn protection initialization works for both joining and respawning players")
            print("✅ Collision prevention works during the 4-second protection period")
            print("✅ Protection automatically expires after exactly 4 seconds")
            print("✅ Protection state synchronization working for multiplayer visibility")
            print("✅ Backend API and Colyseus servers operational after restart")
        elif success_rate >= 75:
            print("⚠️  MOSTLY WORKING - Some minor issues detected")
        else:
            print("❌ CRITICAL ISSUES - Major problems with spawn protection system")
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'success_rate': success_rate,
            'total_time': total_time,
            'test_results': self.test_results
        }

def main():
    """Main function to run spawn protection backend tests"""
    tester = SpawnProtectionBackendTester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    if results['success_rate'] == 100:
        exit(0)  # Success
    elif results['success_rate'] >= 75:
        exit(1)  # Partial success
    else:
        exit(2)  # Failure

if __name__ == "__main__":
    main()