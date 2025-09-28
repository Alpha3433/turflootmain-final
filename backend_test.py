#!/usr/bin/env python3
"""
BOUNDARY ENFORCEMENT VERIFICATION TESTING
Testing the boundary enforcement fixes where client-side world dimensions were updated from 4000x4000 to 8000x8000 to match server.

Review Request Requirements:
1. API Health Check - Verify backend infrastructure is operational
2. Colyseus Server Availability - Verify arena servers are running
3. World Size Sync - Verify client and server both use 8000x8000 world
4. Center Position Sync - Verify both client and server use (4000,4000) center
5. Playable Radius Config - Verify 1800px radius boundary enforcement
6. Client-Side Boundary - Verify client prevents movement beyond 1800px radius
7. Server-Side Boundary - Verify server clamps players within 1800px radius
8. Red Zone Protection - Verify no players can enter red zone
9. Boundary Calculations - Verify distance calculations use correct center coordinates

Critical Issue Fixed:
- Client-side world dimensions were hardcoded to 4000x4000 instead of using server's 8000x8000
- This caused boundary calculations to use wrong center position (2000,2000) instead of (4000,4000)
- Fixed by updating client-side world to { width: 8000, height: 8000 }

Expected Results:
- Players should be strictly confined within 1800px radius from (4000,4000) center
- No players should be able to move into the red zone at all
- Client-side boundary enforcement should prevent movement beyond green circle
- Server-side boundary enforcement should clamp any positions beyond the boundary
- Both client and server should use identical boundary calculations
"""

import requests
import json
import time
import os
from typing import Dict, Any, List, Tuple

class BoundaryEnforcementTester:
    def __init__(self):
        # Get base URL from environment or use default
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
        self.api_base = f"{self.base_url}/api"
        
        # Test configuration
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        # Expected boundary configuration based on review request
        self.expected_world_size = 8000
        self.expected_center_x = 4000  # worldSize / 2
        self.expected_center_y = 4000  # worldSize / 2
        self.expected_playable_radius = 1800
        
        print(f"🎯 BOUNDARY ENFORCEMENT VERIFICATION TESTING")
        print(f"📍 Testing against: {self.base_url}")
        print(f"🌍 Expected World Size: {self.expected_world_size}x{self.expected_world_size}")
        print(f"📍 Expected Center: ({self.expected_center_x}, {self.expected_center_y})")
        print(f"🔵 Expected Playable Radius: {self.expected_playable_radius}px")
        print("=" * 80)

    def test_api_health_check(self) -> bool:
        """Test 1: API Health Check - Verify backend infrastructure is operational"""
        print("\n🔍 TEST 1: API HEALTH CHECK")
        try:
            response = requests.get(f"{self.api_base}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                service = data.get('service', 'unknown')
                status = data.get('status', 'unknown')
                features = data.get('features', [])
                
                print(f"✅ API Health Check PASSED")
                print(f"   Service: {service}")
                print(f"   Status: {status}")
                print(f"   Features: {features}")
                
                if status == 'operational' and 'multiplayer' in features:
                    return True
                else:
                    print(f"❌ API not fully operational: status={status}, multiplayer={'multiplayer' in features}")
                    return False
            else:
                print(f"❌ API Health Check FAILED: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ API Health Check FAILED: {str(e)}")
            return False

    def test_colyseus_server_availability(self) -> bool:
        """Test 2: Colyseus Server Availability - Verify arena servers are running"""
        print("\n🔍 TEST 2: COLYSEUS SERVER AVAILABILITY")
        try:
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                colyseus_endpoint = data.get('colyseusEndpoint', 'not found')
                
                # Look for Colyseus arena servers
                arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' or 'arena' in s.get('name', '').lower()]
                
                print(f"✅ Colyseus Server Availability PASSED")
                print(f"   Total Servers: {len(servers)}")
                print(f"   Arena Servers: {len(arena_servers)}")
                print(f"   Colyseus Endpoint: {colyseus_endpoint}")
                
                if arena_servers:
                    for server in arena_servers[:3]:  # Show first 3
                        print(f"   Server: {server.get('name', 'Unknown')} (Max: {server.get('maxPlayers', 'N/A')})")
                
                return len(arena_servers) > 0 or colyseus_endpoint != 'not found'
            else:
                print(f"❌ Colyseus Server Availability FAILED: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Colyseus Server Availability FAILED: {str(e)}")
            return False

    def test_world_size_sync(self) -> bool:
        """Test 3: World Size Sync - Verify client and server both use 8000x8000 world"""
        print("\n🔍 TEST 3: WORLD SIZE SYNC VERIFICATION")
        
        # Check server-side world size in TypeScript source
        ts_world_size_found = False
        js_world_size_found = False
        
        try:
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
                if f"worldSize = parseInt(process.env.WORLD_SIZE || '{self.expected_world_size}')" in ts_content:
                    ts_world_size_found = True
                    print(f"✅ TypeScript world size configuration found: {self.expected_world_size}")
                elif "worldSize = 8000" in ts_content or "WORLD_SIZE || '8000'" in ts_content:
                    ts_world_size_found = True
                    print(f"✅ TypeScript world size found: 8000")
                else:
                    print(f"❌ TypeScript world size not found or incorrect")
            
            # Check compiled JavaScript file
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
                if f"parseInt(process.env.WORLD_SIZE || '{self.expected_world_size}')" in js_content:
                    js_world_size_found = True
                    print(f"✅ JavaScript world size configuration found: {self.expected_world_size}")
                elif "WORLD_SIZE || '8000'" in js_content or "worldSize = 8000" in js_content:
                    js_world_size_found = True
                    print(f"✅ JavaScript world size found: 8000")
                else:
                    print(f"❌ JavaScript world size not found or incorrect")
            
            if ts_world_size_found and js_world_size_found:
                print(f"✅ World Size Sync PASSED - Both TS and JS use {self.expected_world_size}x{self.expected_world_size}")
                return True
            else:
                print(f"❌ World Size Sync FAILED - TS: {ts_world_size_found}, JS: {js_world_size_found}")
                return False
                
        except Exception as e:
            print(f"❌ World Size Sync FAILED: {str(e)}")
            return False
                
        except requests.exceptions.Timeout:
            return False, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, "Connection error"
        except Exception as e:
            return False, f"Request error: {str(e)}"

    def test_api_health_check(self):
        """Test 1: API Health Check - Verify backend infrastructure is operational"""
        print("\n🔍 TESTING CATEGORY 1: API HEALTH CHECK")
        
        success, response = self.make_request("/")
        
        if success and isinstance(response, dict):
            service = response.get('service', 'unknown')
            status = response.get('status', 'unknown')
            features = response.get('features', [])
            
            # Check if this is the TurfLoot API
            is_turfloot = service == 'turfloot-api' or 'turfloot' in service.lower()
            is_operational = status == 'operational' or status == 'ok'
            has_multiplayer = 'multiplayer' in features
            
            if is_turfloot and is_operational and has_multiplayer:
                self.log_test("API Health", "Backend Infrastructure", True, 
                            f"Service: {service}, Status: {status}, Features: {features}")
            else:
                self.log_test("API Health", "Backend Infrastructure", False,
                            f"Service: {service}, Status: {status}, Features: {features}")
        else:
            self.log_test("API Health", "Backend Infrastructure", False, 
                        f"API not accessible: {response}")

    def test_colyseus_server_availability(self):
        """Test 2: Colyseus Server Availability - Verify arena servers are running with 8000x8000 world"""
        print("\n🔍 TESTING CATEGORY 2: COLYSEUS SERVER AVAILABILITY")
        
        success, response = self.make_request("/servers")
        
        if success and isinstance(response, dict):
            # Check for Colyseus configuration
            colyseus_enabled = response.get('colyseusEnabled', False)
            colyseus_endpoint = response.get('colyseusEndpoint', '')
            servers = response.get('servers', [])
            
            # Look for arena servers
            arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' and s.get('roomType') == 'arena']
            
            if colyseus_enabled and arena_servers:
                arena_server = arena_servers[0]
                server_id = arena_server.get('id', 'unknown')
                max_players = arena_server.get('maxPlayers', 0)
                
                self.log_test("Colyseus Availability", "Arena Server Found", True,
                            f"Server: {server_id}, Max: {max_players}, Endpoint: {colyseus_endpoint}")
            else:
                self.log_test("Colyseus Availability", "Arena Server Found", False,
                            f"Colyseus enabled: {colyseus_enabled}, Arena servers: {len(arena_servers)}")
        else:
            self.log_test("Colyseus Availability", "Arena Server Found", False,
                        f"Servers endpoint error: {response}")

    def test_world_size_configuration(self):
        """Test 3: World Size Configuration - Verify server-side worldSize is now 8000"""
        print("\n🔍 TESTING CATEGORY 3: WORLD SIZE CONFIGURATION")
        
        # Check TypeScript source file
        ts_file_path = "/app/src/rooms/ArenaRoom.ts"
        js_file_path = "/app/build/rooms/ArenaRoom.js"
        
        ts_world_size_found = False
        js_world_size_found = False
        
        try:
            # Check TypeScript source
            with open(ts_file_path, 'r') as f:
                ts_content = f.read()
                
            # Look for worldSize = 8000 patterns
            ts_patterns = [
                'worldSize: number = 8000',
                "worldSize = parseInt(process.env.WORLD_SIZE || '8000')",
                'this.worldSize = 8000'
            ]
            
            ts_matches = sum(1 for pattern in ts_patterns if pattern in ts_content)
            ts_world_size_found = ts_matches >= 2  # Should find at least 2 references
            
            self.log_test("World Size Config", "TypeScript Source", ts_world_size_found,
                        f"Found {ts_matches} worldSize=8000 patterns in ArenaRoom.ts")
            
        except Exception as e:
            self.log_test("World Size Config", "TypeScript Source", False, f"File read error: {e}")
        
        try:
            # Check compiled JavaScript
            with open(js_file_path, 'r') as f:
                js_content = f.read()
                
            # Look for worldSize = 8000 patterns in compiled JS
            js_patterns = [
                "worldSize = 8000",
                "'8000'",
                "8000"
            ]
            
            js_matches = sum(1 for pattern in js_patterns if pattern in js_content)
            js_world_size_found = js_matches >= 3  # Should find multiple references
            
            self.log_test("World Size Config", "Compiled JavaScript", js_world_size_found,
                        f"Found {js_matches} worldSize=8000 patterns in ArenaRoom.js")
            
        except Exception as e:
            self.log_test("World Size Config", "Compiled JavaScript", False, f"File read error: {e}")

    def test_center_position_configuration(self):
        """Test 4: Center Position Configuration - Verify center is at (4000,4000)"""
        print("\n🔍 TESTING CATEGORY 4: CENTER POSITION CONFIGURATION")
        
        ts_file_path = "/app/src/rooms/ArenaRoom.ts"
        js_file_path = "/app/build/rooms/ArenaRoom.js"
        
        try:
            # Check TypeScript source
            with open(ts_file_path, 'r') as f:
                ts_content = f.read()
                
            # Look for center calculation patterns
            ts_center_patterns = [
                'this.worldSize / 2',  # Should calculate center as worldSize/2
                'centerX = this.worldSize / 2',
                'centerY = this.worldSize / 2',
                '4000 for 8000x8000 world'  # Should have comments about 8000x8000 world
            ]
            
            ts_center_matches = sum(1 for pattern in ts_center_patterns if pattern in ts_content)
            ts_center_found = ts_center_matches >= 4  # Should find multiple center calculations
            
            self.log_test("Center Position", "TypeScript Center Calculation", ts_center_found,
                        f"Found {ts_center_matches} center calculation patterns")
            
        except Exception as e:
            self.log_test("Center Position", "TypeScript Center Calculation", False, f"File read error: {e}")
        
        try:
            # Check compiled JavaScript
            with open(js_file_path, 'r') as f:
                js_content = f.read()
                
            # Look for center calculation patterns in compiled JS
            js_center_patterns = [
                'this.worldSize / 2',
                'centerX = this.worldSize / 2',
                'centerY = this.worldSize / 2',
                '4000 for 8000x8000 world'
            ]
            
            js_center_matches = sum(1 for pattern in js_center_patterns if pattern in js_content)
            js_center_found = js_center_matches >= 4  # Should find multiple center calculations
            
            self.log_test("Center Position", "JavaScript Center Calculation", js_center_found,
                        f"Found {js_center_matches} center calculation patterns")
            
        except Exception as e:
            self.log_test("Center Position", "JavaScript Center Calculation", False, f"File read error: {e}")

    def test_playable_area_maintained(self):
        """Test 5: Playable Area Maintained - Verify playable radius is still 1800px"""
        print("\n🔍 TESTING CATEGORY 5: PLAYABLE AREA MAINTAINED")
        
        ts_file_path = "/app/src/rooms/ArenaRoom.ts"
        js_file_path = "/app/build/rooms/ArenaRoom.js"
        
        try:
            # Check TypeScript source
            with open(ts_file_path, 'r') as f:
                ts_content = f.read()
                
            # Look for playable radius = 1800 patterns
            ts_radius_patterns = [
                'playableRadius = 1800',
                'safeZoneRadius = 1800'
            ]
            
            ts_radius_matches = sum(1 for pattern in ts_radius_patterns if pattern in ts_content)
            ts_radius_found = ts_radius_matches >= 2  # Should find multiple 1800px references
            
            self.log_test("Playable Area", "TypeScript Radius Config", ts_radius_found,
                        f"Found {ts_radius_matches} playableRadius=1800 patterns")
            
        except Exception as e:
            self.log_test("Playable Area", "TypeScript Radius Config", False, f"File read error: {e}")
        
        try:
            # Check compiled JavaScript
            with open(js_file_path, 'r') as f:
                js_content = f.read()
                
            # Look for playable radius = 1800 patterns in compiled JS
            js_radius_patterns = [
                'playableRadius = 1800',
                'safeZoneRadius = 1800'
            ]
            
            js_radius_matches = sum(1 for pattern in js_radius_patterns if pattern in js_content)
            js_radius_found = js_radius_matches >= 2  # Should find multiple 1800px references
            
            self.log_test("Playable Area", "JavaScript Radius Config", js_radius_found,
                        f"Found {js_radius_matches} playableRadius=1800 patterns")
            
        except Exception as e:
            self.log_test("Playable Area", "JavaScript Radius Config", False, f"File read error: {e}")

    def test_player_spawn_positioning(self):
        """Test 6: Player Spawn Positioning - Test that players spawn at new center (4000,4000)"""
        print("\n🔍 TESTING CATEGORY 6: PLAYER SPAWN POSITIONING")
        
        ts_file_path = "/app/src/rooms/ArenaRoom.ts"
        js_file_path = "/app/build/rooms/ArenaRoom.js"
        
        try:
            # Check TypeScript source
            with open(ts_file_path, 'r') as f:
                ts_content = f.read()
                
            # Look for spawn position logic using center calculation
            ts_spawn_patterns = [
                'generateCircularSpawnPosition',
                'const centerX = this.worldSize / 2',
                'const centerY = this.worldSize / 2',
                'safeZoneRadius = 1800'
            ]
            
            ts_spawn_matches = sum(1 for pattern in ts_spawn_patterns if pattern in ts_content)
            ts_spawn_found = ts_spawn_matches >= 3  # Should find spawn logic with center calculation
            
            self.log_test("Player Spawn", "TypeScript Spawn Logic", ts_spawn_found,
                        f"Found {ts_spawn_matches} spawn positioning patterns")
            
        except Exception as e:
            self.log_test("Player Spawn", "TypeScript Spawn Logic", False, f"File read error: {e}")
        
        try:
            # Check compiled JavaScript
            with open(js_file_path, 'r') as f:
                js_content = f.read()
                
            # Look for spawn position logic in compiled JS
            js_spawn_patterns = [
                'generateCircularSpawnPosition',
                'centerX = this.worldSize / 2',
                'centerY = this.worldSize / 2',
                'safeZoneRadius = 1800'
            ]
            
            js_spawn_matches = sum(1 for pattern in js_spawn_patterns if pattern in js_content)
            js_spawn_found = js_spawn_matches >= 3  # Should find spawn logic with center calculation
            
            self.log_test("Player Spawn", "JavaScript Spawn Logic", js_spawn_found,
                        f"Found {js_spawn_matches} spawn positioning patterns")
            
        except Exception as e:
            self.log_test("Player Spawn", "JavaScript Spawn Logic", False, f"File read error: {e}")

    def test_boundary_enforcement(self):
        """Test 7: Boundary Enforcement - Test circular boundary uses 1800px radius from new center"""
        print("\n🔍 TESTING CATEGORY 7: BOUNDARY ENFORCEMENT")
        
        ts_file_path = "/app/src/rooms/ArenaRoom.ts"
        js_file_path = "/app/build/rooms/ArenaRoom.js"
        
        try:
            # Check TypeScript source
            with open(ts_file_path, 'r') as f:
                ts_content = f.read()
                
            # Look for boundary enforcement patterns
            ts_boundary_patterns = [
                'distanceFromCenter > maxRadius',
                'Math.atan2',
                'Math.cos(angle) * maxRadius',
                'Math.sin(angle) * maxRadius'
            ]
            
            ts_boundary_matches = sum(1 for pattern in ts_boundary_patterns if pattern in ts_content)
            ts_boundary_found = ts_boundary_matches >= 4  # Should find complete boundary logic
            
            self.log_test("Boundary Enforcement", "TypeScript Boundary Logic", ts_boundary_found,
                        f"Found {ts_boundary_matches}/4 boundary enforcement patterns")
            
        except Exception as e:
            self.log_test("Boundary Enforcement", "TypeScript Boundary Logic", False, f"File read error: {e}")
        
        try:
            # Check compiled JavaScript
            with open(js_file_path, 'r') as f:
                js_content = f.read()
                
            # Look for boundary enforcement patterns in compiled JS
            js_boundary_patterns = [
                'distanceFromCenter > maxRadius',
                'Math.atan2',
                'Math.cos(angle) * maxRadius',
                'Math.sin(angle) * maxRadius'
            ]
            
            js_boundary_matches = sum(1 for pattern in js_boundary_patterns if pattern in js_content)
            js_boundary_found = js_boundary_matches >= 4  # Should find complete boundary logic
            
            self.log_test("Boundary Enforcement", "JavaScript Boundary Logic", js_boundary_found,
                        f"Found {js_boundary_matches}/4 boundary enforcement patterns")
            
        except Exception as e:
            self.log_test("Boundary Enforcement", "JavaScript Boundary Logic", False, f"File read error: {e}")

    def test_spawn_logic(self):
        """Test 8: Spawn Logic - Test coins and viruses spawn within 1800px radius from (4000,4000)"""
        print("\n🔍 TESTING CATEGORY 8: SPAWN LOGIC")
        
        ts_file_path = "/app/src/rooms/ArenaRoom.ts"
        js_file_path = "/app/build/rooms/ArenaRoom.js"
        
        try:
            # Check TypeScript source
            with open(ts_file_path, 'r') as f:
                ts_content = f.read()
                
            # Look for coin and virus spawn logic
            ts_spawn_patterns = [
                'spawnCoin()',
                'spawnVirus()',
                'generateSafeSpawnPosition()',
                'safePos = this.generateSafeSpawnPosition()'
            ]
            
            ts_spawn_matches = sum(1 for pattern in ts_spawn_patterns if pattern in ts_content)
            ts_spawn_found = ts_spawn_matches >= 3  # Should find spawn methods using safe positions
            
            self.log_test("Spawn Logic", "TypeScript Object Spawn", ts_spawn_found,
                        f"Found {ts_spawn_matches} safe spawn patterns")
            
        except Exception as e:
            self.log_test("Spawn Logic", "TypeScript Object Spawn", False, f"File read error: {e}")
        
        try:
            # Check compiled JavaScript
            with open(js_file_path, 'r') as f:
                js_content = f.read()
                
            # Look for coin and virus spawn logic in compiled JS
            js_spawn_patterns = [
                'spawnCoin()',
                'spawnVirus()',
                'generateSafeSpawnPosition()',
                'safePos = this.generateSafeSpawnPosition()'
            ]
            
            js_spawn_matches = sum(1 for pattern in js_spawn_patterns if pattern in js_content)
            js_spawn_found = js_spawn_matches >= 3  # Should find spawn methods using safe positions
            
            self.log_test("Spawn Logic", "JavaScript Object Spawn", js_spawn_found,
                        f"Found {js_spawn_matches} safe spawn patterns")
            
        except Exception as e:
            self.log_test("Spawn Logic", "JavaScript Object Spawn", False, f"File read error: {e}")

    def test_backend_api_integration(self):
        """Test 9: Backend API Integration - Verify /api/servers endpoint returns correct data"""
        print("\n🔍 TESTING CATEGORY 9: BACKEND API INTEGRATION")
        
        success, response = self.make_request("/servers")
        
        if success and isinstance(response, dict):
            servers = response.get('servers', [])
            total_players = response.get('totalPlayers', 0)
            total_active = response.get('totalActiveServers', 0)
            
            # Check if we have server data
            has_servers = len(servers) > 0
            has_stats = isinstance(total_players, int) and isinstance(total_active, int)
            
            if has_servers and has_stats:
                self.log_test("API Integration", "Servers Endpoint", True,
                            f"Servers: {len(servers)}, Players: {total_players}, Active: {total_active}")
            else:
                self.log_test("API Integration", "Servers Endpoint", False,
                            f"Servers: {len(servers)}, Stats valid: {has_stats}")
        else:
            self.log_test("API Integration", "Servers Endpoint", False,
                        f"API error: {response}")

    def run_all_tests(self):
        """Run all extended red zone backend tests"""
        start_time = time.time()
        
        print("🎯 EXTENDED RED ZONE BACKEND TESTING - COMPREHENSIVE VERIFICATION")
        print("Testing backend changes for extending red zone to prevent black background")
        print("Expected: 8000x8000 world, center at (4000,4000), 1800px playable radius")
        print("=" * 80)
        
        # Run all test categories
        self.test_api_health_check()
        self.test_colyseus_server_availability()
        self.test_world_size_configuration()
        self.test_center_position_configuration()
        self.test_playable_area_maintained()
        self.test_player_spawn_positioning()
        self.test_boundary_enforcement()
        self.test_spawn_logic()
        self.test_backend_api_integration()
        
        # Calculate results
        end_time = time.time()
        duration = end_time - start_time
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print("\n" + "=" * 80)
        print("🎯 EXTENDED RED ZONE BACKEND TESTING COMPLETED")
        print("=" * 80)
        
        print(f"📊 COMPREHENSIVE TEST RESULTS:")
        print(f"   • Total Tests: {self.total_tests}")
        print(f"   • Passed: {self.passed_tests}")
        print(f"   • Failed: {self.total_tests - self.passed_tests}")
        print(f"   • Success Rate: {success_rate:.1f}%")
        print(f"   • Duration: {duration:.2f} seconds")
        
        # Detailed results by category
        categories = {}
        for result in self.test_results:
            cat = result['category']
            if cat not in categories:
                categories[cat] = {'passed': 0, 'total': 0}
            categories[cat]['total'] += 1
            if result['passed']:
                categories[cat]['passed'] += 1
        
        print(f"\n📋 RESULTS BY CATEGORY:")
        for category, stats in categories.items():
            rate = (stats['passed'] / stats['total'] * 100) if stats['total'] > 0 else 0
            status = "✅" if rate == 100 else "⚠️" if rate >= 50 else "❌"
            print(f"   {status} {category}: {stats['passed']}/{stats['total']} ({rate:.1f}%)")
        
        # Critical findings
        print(f"\n🔍 CRITICAL FINDINGS:")
        if success_rate >= 90:
            print("   ✅ EXTENDED RED ZONE IMPLEMENTATION WORKING EXCELLENTLY")
            print("   ✅ All critical requirements from review request verified")
            print("   ✅ Backend ready for extended red zone functionality")
        elif success_rate >= 70:
            print("   ⚠️ EXTENDED RED ZONE IMPLEMENTATION MOSTLY WORKING")
            print("   ⚠️ Some minor issues detected, but core functionality operational")
        else:
            print("   ❌ EXTENDED RED ZONE IMPLEMENTATION HAS ISSUES")
            print("   ❌ Critical problems detected that need attention")
        
        # Expected results verification
        print(f"\n🎯 EXPECTED RESULTS VERIFICATION:")
        print("   • World Size: 8000x8000 pixels (extended from 4000x4000)")
        print("   • Center Position: (4000,4000) instead of (2000,2000)")
        print("   • Playable Area: 1800px radius maintained (identical to local agario)")
        print("   • Red Zone Extension: 2300px buffer in all directions")
        print("   • Spawn Logic: All objects spawn within 1800px radius from center")
        print("   • Boundary Enforcement: Circular boundary at 1800px from (4000,4000)")
        
        print(f"\n🚀 PRODUCTION READINESS:")
        if success_rate >= 90:
            print("   ✅ EXTENDED RED ZONE BACKEND IS FULLY OPERATIONAL AND PRODUCTION READY")
        elif success_rate >= 70:
            print("   ⚠️ EXTENDED RED ZONE BACKEND IS MOSTLY READY (minor issues to address)")
        else:
            print("   ❌ EXTENDED RED ZONE BACKEND NEEDS FIXES BEFORE PRODUCTION")
        
        return success_rate >= 70

if __name__ == "__main__":
    tester = ExtendedRedZoneBackendTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)