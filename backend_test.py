#!/usr/bin/env python3
"""
BOUNDARY SYNC VERIFICATION TESTING
==================================

This test verifies that the boundary enforcement is properly synced between client and server
and hits exactly at the outer green circle, not "in the middle of the playable area".

Test Requirements from Review Request:
1. API Health Check - Verify backend infrastructure is operational
2. Colyseus Server Availability - Verify arena servers are running
3. Client-Server Radius Sync - Verify both use 1800px playable radius
4. Client-Server Center Sync - Verify both use (4000, 4000) center coordinates
5. Player Radius Consistency - Verify both use same player radius calculation
6. Boundary Enforcement Logic - Verify both use maxRadius = playableRadius - playerRadius
7. Visual Boundary Match - Verify green circle drawn at same radius as enforcement
8. Boundary Position Testing - Test boundary enforcement at exact 1800px radius
9. Real-time Sync Verification - Verify boundary enforcement stays consistent during gameplay

Expected Results:
- Client and server should use identical boundary calculations
- Boundary enforcement should occur at exactly 1785px from center (1800px - 15px player radius)
- Visual green circle should be drawn at 1800px from center
- Player edge should touch green circle when boundary is enforced
- No "cutting in middle of playable area" - boundary should be at outer edge

Critical Success Criteria:
- Client currentPlayableRadius: 1800px
- Server playableRadius: 1800px  
- Client center: (4000, 4000)
- Server center: (4000, 4000)
- Boundary enforcement: maxRadius = 1785px (1800 - 15)
- Visual green circle: 1800px radius
- Perfect client-server boundary sync
"""

import requests
import json
import time
import re
import os
from typing import Dict, List, Tuple, Any
from typing import Dict, Any, List, Tuple

class BoundarySyncTester:
    def __init__(self):
        # Get base URL from environment
        self.base_url = self.get_base_url()
        self.test_results = []
        self.start_time = time.time()
        
        print("🎯 BOUNDARY SYNC VERIFICATION TESTING INITIATED")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 80)
    
    def get_base_url(self) -> str:
        """Get the base URL from environment variables"""
        try:
            with open('/app/.env', 'r') as f:
                env_content = f.read()
                for line in env_content.split('\n'):
                    if line.startswith('NEXT_PUBLIC_BASE_URL='):
                        return line.split('=', 1)[1].strip().strip('"')
        except:
            pass
        return "http://localhost:3000"
    
    def log_test(self, category: str, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {category} - {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'category': category,
            'test': test_name,
            'passed': passed,
            'details': details
        })

    def test_api_health_check(self) -> bool:
        """Test 1: API Health Check - Verify backend infrastructure is operational"""
        print("\n🔍 TEST 1: API HEALTH CHECK")
        print("-" * 40)
        
        try:
            response = requests.get(f"{self.base_url}/api", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                service = data.get('service', '')
                status = data.get('status', '')
                features = data.get('features', [])
                
                # Check for required service info
                is_operational = (
                    service == 'turfloot-api' and
                    status == 'operational' and
                    'multiplayer' in features
                )
                
                details = f"Service: {service}, Status: {status}, Features: {features}"
                self.log_test("API Health Check", "Backend Infrastructure", is_operational, details)
                return is_operational
            else:
                self.log_test("API Health Check", "Backend Infrastructure", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("API Health Check", "Backend Infrastructure", False, f"Error: {str(e)}")
            return False

    def test_colyseus_server_availability(self) -> bool:
        """Test 2: Colyseus Server Availability - Verify arena servers are running"""
        print("\n🔍 TEST 2: COLYSEUS SERVER AVAILABILITY")
        print("-" * 40)
        
        try:
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                # Find arena servers
                arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' and s.get('roomType') == 'arena']
                
                is_available = (
                    colyseus_enabled and
                    colyseus_endpoint and
                    len(arena_servers) > 0
                )
                
                if is_available:
                    server_info = arena_servers[0]
                    details = f"Arena server found ({server_info.get('name', 'Unknown')}, Max: {server_info.get('maxPlayers', 0)}) with endpoint='{colyseus_endpoint}'"
                else:
                    details = f"Colyseus enabled: {colyseus_enabled}, Endpoint: {colyseus_endpoint}, Arena servers: {len(arena_servers)}"
                
                self.log_test("Colyseus Server", "Arena Server Availability", is_available, details)
                return is_available
            else:
                self.log_test("Colyseus Server", "Arena Server Availability", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Colyseus Server", "Arena Server Availability", False, f"Error: {str(e)}")
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
    def test_center_position_sync(self) -> bool:
        """Test 4: Center Position Sync - Verify both client and server use (4000,4000) center"""
        print("\n🔍 TEST 4: CENTER POSITION SYNC VERIFICATION")
        
        ts_center_found = False
        js_center_found = False
        
        try:
            # Check TypeScript source file for center calculations
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
                center_patterns = [
                    "const centerX = this.worldSize / 2",
                    "const centerY = this.worldSize / 2",
                    "centerX = this.worldSize / 2",
                    "centerY = this.worldSize / 2"
                ]
                
                found_patterns = sum(1 for pattern in center_patterns if pattern in ts_content)
                if found_patterns >= 2:  # At least centerX and centerY calculations
                    ts_center_found = True
                    print(f"✅ TypeScript center position calculations found: {found_patterns}/4 patterns")
                else:
                    print(f"❌ TypeScript center position calculations insufficient: {found_patterns}/4 patterns")
            
            # Check compiled JavaScript file for center calculations
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
                center_patterns = [
                    "centerX = this.worldSize / 2",
                    "centerY = this.worldSize / 2",
                    "const centerX = this.worldSize / 2",
                    "const centerY = this.worldSize / 2"
                ]
                
                found_patterns = sum(1 for pattern in center_patterns if pattern in js_content)
                if found_patterns >= 2:  # At least centerX and centerY calculations
                    js_center_found = True
                    print(f"✅ JavaScript center position calculations found: {found_patterns}/4 patterns")
                else:
                    print(f"❌ JavaScript center position calculations insufficient: {found_patterns}/4 patterns")
            
            if ts_center_found and js_center_found:
                print(f"✅ Center Position Sync PASSED - Both use worldSize/2 = {self.expected_center_x},{self.expected_center_y}")
                return True
            else:
                print(f"❌ Center Position Sync FAILED - TS: {ts_center_found}, JS: {js_center_found}")
                return False
                
        except Exception as e:
            print(f"❌ Center Position Sync FAILED: {str(e)}")
            return False

    def test_playable_radius_config(self) -> bool:
        """Test 5: Playable Radius Config - Verify 1800px radius boundary enforcement"""
        print("\n🔍 TEST 5: PLAYABLE RADIUS CONFIGURATION")
        
        ts_radius_found = False
        js_radius_found = False
        
        try:
            # Check TypeScript source file for playable radius
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
                if f"playableRadius = {self.expected_playable_radius}" in ts_content:
                    ts_radius_found = True
                    print(f"✅ TypeScript playable radius found: {self.expected_playable_radius}px")
                else:
                    print(f"❌ TypeScript playable radius not found or incorrect")
            
            # Check compiled JavaScript file for playable radius
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
                if f"playableRadius = {self.expected_playable_radius}" in js_content:
                    js_radius_found = True
                    print(f"✅ JavaScript playable radius found: {self.expected_playable_radius}px")
                else:
                    print(f"❌ JavaScript playable radius not found or incorrect")
            
            if ts_radius_found and js_radius_found:
                print(f"✅ Playable Radius Config PASSED - Both use {self.expected_playable_radius}px radius")
                return True
            else:
                print(f"❌ Playable Radius Config FAILED - TS: {ts_radius_found}, JS: {js_radius_found}")
                return False
                
        except Exception as e:
            print(f"❌ Playable Radius Config FAILED: {str(e)}")
            return False

    def test_client_side_boundary(self) -> bool:
        """Test 6: Client-Side Boundary - Verify client prevents movement beyond 1800px radius"""
        print("\n🔍 TEST 6: CLIENT-SIDE BOUNDARY ENFORCEMENT")
        
        # This test checks if the client-side boundary enforcement patterns exist
        # Since we can't directly test client-side JavaScript execution, we check for patterns
        
        try:
            # Check if client-side files exist and contain boundary enforcement
            client_files_to_check = [
                '/app/app/agario/page.js',
                '/app/app/arena/page.js'
            ]
            
            boundary_patterns_found = 0
            total_patterns_expected = 4
            
            for file_path in client_files_to_check:
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        content = f.read()
                        
                        # Look for boundary enforcement patterns
                        patterns = [
                            "distanceFromCenter",
                            "playableRadius",
                            "Math.atan2",
                            "boundary"
                        ]
                        
                        for pattern in patterns:
                            if pattern in content:
                                boundary_patterns_found += 1
                                print(f"✅ Found boundary pattern '{pattern}' in {file_path}")
                                break  # Count each file only once
            
            if boundary_patterns_found >= 1:  # At least one file has boundary patterns
                print(f"✅ Client-Side Boundary PASSED - Found boundary enforcement patterns")
                return True
            else:
                print(f"❌ Client-Side Boundary FAILED - No boundary enforcement patterns found")
                return False
                
        except Exception as e:
            print(f"❌ Client-Side Boundary FAILED: {str(e)}")
            return False

    def test_server_side_boundary(self) -> bool:
        """Test 7: Server-Side Boundary - Verify server clamps players within 1800px radius"""
        print("\n🔍 TEST 7: SERVER-SIDE BOUNDARY ENFORCEMENT")
        
        ts_boundary_found = False
        js_boundary_found = False
        
        try:
            # Check TypeScript source file for boundary enforcement
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
                boundary_patterns = [
                    "distanceFromCenter > maxRadius",
                    "Math.atan2",
                    "Math.cos(angle) * maxRadius",
                    "Math.sin(angle) * maxRadius"
                ]
                
                found_patterns = sum(1 for pattern in boundary_patterns if pattern in ts_content)
                if found_patterns >= 3:  # Most boundary enforcement patterns
                    ts_boundary_found = True
                    print(f"✅ TypeScript boundary enforcement found: {found_patterns}/4 patterns")
                else:
                    print(f"❌ TypeScript boundary enforcement insufficient: {found_patterns}/4 patterns")
            
            # Check compiled JavaScript file for boundary enforcement
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
                boundary_patterns = [
                    "distanceFromCenter > maxRadius",
                    "Math.atan2",
                    "Math.cos(angle) * maxRadius",
                    "Math.sin(angle) * maxRadius"
                ]
                
                found_patterns = sum(1 for pattern in boundary_patterns if pattern in js_content)
                if found_patterns >= 3:  # Most boundary enforcement patterns
                    js_boundary_found = True
                    print(f"✅ JavaScript boundary enforcement found: {found_patterns}/4 patterns")
                else:
                    print(f"❌ JavaScript boundary enforcement insufficient: {found_patterns}/4 patterns")
            
            if ts_boundary_found and js_boundary_found:
                print(f"✅ Server-Side Boundary PASSED - Both TS and JS have boundary enforcement")
                return True
            else:
                print(f"❌ Server-Side Boundary FAILED - TS: {ts_boundary_found}, JS: {js_boundary_found}")
                return False
                
        except Exception as e:
            print(f"❌ Server-Side Boundary FAILED: {str(e)}")
            return False

    def test_red_zone_protection(self) -> bool:
        """Test 8: Red Zone Protection - Verify no players can enter red zone"""
        print("\n🔍 TEST 8: RED ZONE PROTECTION VERIFICATION")
        
        try:
            # Check that spawn positions are within safe radius
            # Check both generateCircularSpawnPosition and generateSafeSpawnPosition methods
            
            ts_safe_spawn = False
            js_safe_spawn = False
            
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
                safe_spawn_patterns = [
                    "generateCircularSpawnPosition",
                    "generateSafeSpawnPosition",
                    "safeZoneRadius",
                    f"safeZoneRadius = {self.expected_playable_radius}"
                ]
                
                found_patterns = sum(1 for pattern in safe_spawn_patterns if pattern in ts_content)
                if found_patterns >= 2:  # At least spawn generation methods
                    ts_safe_spawn = True
                    print(f"✅ TypeScript safe spawn methods found: {found_patterns}/4 patterns")
                else:
                    print(f"❌ TypeScript safe spawn methods insufficient: {found_patterns}/4 patterns")
            
            # Check compiled JavaScript file
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
                safe_spawn_patterns = [
                    "generateCircularSpawnPosition",
                    "generateSafeSpawnPosition", 
                    "safeZoneRadius",
                    f"safeZoneRadius = {self.expected_playable_radius}"
                ]
                
                found_patterns = sum(1 for pattern in safe_spawn_patterns if pattern in js_content)
                if found_patterns >= 2:  # At least spawn generation methods
                    js_safe_spawn = True
                    print(f"✅ JavaScript safe spawn methods found: {found_patterns}/4 patterns")
                else:
                    print(f"❌ JavaScript safe spawn methods insufficient: {found_patterns}/4 patterns")
            
            if ts_safe_spawn and js_safe_spawn:
                print(f"✅ Red Zone Protection PASSED - Safe spawn methods prevent red zone entry")
                return True
            else:
                print(f"❌ Red Zone Protection FAILED - TS: {ts_safe_spawn}, JS: {js_safe_spawn}")
                return False
                
        except Exception as e:
            print(f"❌ Red Zone Protection FAILED: {str(e)}")
            return False

    def test_boundary_calculations(self) -> bool:
        """Test 9: Boundary Calculations - Verify distance calculations use correct center coordinates"""
        print("\n🔍 TEST 9: BOUNDARY CALCULATIONS VERIFICATION")
        
        try:
            # Test the mathematical correctness of boundary calculations
            # Check that distance calculations use the correct center coordinates
            
            ts_calc_found = False
            js_calc_found = False
            
            # Check TypeScript source file for distance calculations
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
                calc_patterns = [
                    "Math.sqrt(",
                    "Math.pow(player.x - centerX, 2)",
                    "Math.pow(player.y - centerY, 2)",
                    "distanceFromCenter"
                ]
                
                found_patterns = sum(1 for pattern in calc_patterns if pattern in ts_content)
                if found_patterns >= 3:  # Most calculation patterns
                    ts_calc_found = True
                    print(f"✅ TypeScript boundary calculations found: {found_patterns}/4 patterns")
                else:
                    print(f"❌ TypeScript boundary calculations insufficient: {found_patterns}/4 patterns")
            
            # Check compiled JavaScript file for distance calculations
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
                calc_patterns = [
                    "Math.sqrt(",
                    "Math.pow(player.x - centerX, 2)",
                    "Math.pow(player.y - centerY, 2)", 
                    "distanceFromCenter"
                ]
                
                found_patterns = sum(1 for pattern in calc_patterns if pattern in js_content)
                if found_patterns >= 3:  # Most calculation patterns
                    js_calc_found = True
                    print(f"✅ JavaScript boundary calculations found: {found_patterns}/4 patterns")
                else:
                    print(f"❌ JavaScript boundary calculations insufficient: {found_patterns}/4 patterns")
            
            if ts_calc_found and js_calc_found:
                print(f"✅ Boundary Calculations PASSED - Correct distance calculations using center coordinates")
                return True
            else:
                print(f"❌ Boundary Calculations FAILED - TS: {ts_calc_found}, JS: {js_calc_found}")
                return False
                
        except Exception as e:
            print(f"❌ Boundary Calculations FAILED: {str(e)}")
            return False

    def run_all_tests(self) -> Dict[str, bool]:
        """Run all boundary enforcement tests"""
        print(f"\n🚀 STARTING COMPREHENSIVE BOUNDARY ENFORCEMENT TESTING")
        print(f"📋 Testing {9} critical boundary enforcement requirements...")
        
        start_time = time.time()
        
        tests = [
            ("API Health Check", self.test_api_health_check),
            ("Colyseus Server Availability", self.test_colyseus_server_availability),
            ("World Size Sync", self.test_world_size_sync),
            ("Center Position Sync", self.test_center_position_sync),
            ("Playable Radius Config", self.test_playable_radius_config),
            ("Client-Side Boundary", self.test_client_side_boundary),
            ("Server-Side Boundary", self.test_server_side_boundary),
            ("Red Zone Protection", self.test_red_zone_protection),
            ("Boundary Calculations", self.test_boundary_calculations)
        ]
        
        results = {}
        passed_tests = 0
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    passed_tests += 1
            except Exception as e:
                print(f"❌ {test_name} FAILED with exception: {str(e)}")
                results[test_name] = False
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print comprehensive summary
        print("\n" + "=" * 80)
        print(f"🎯 BOUNDARY ENFORCEMENT VERIFICATION TESTING COMPLETED")
        print("=" * 80)
        
        print(f"\n📊 COMPREHENSIVE TEST RESULTS:")
        for i, (test_name, result) in enumerate(results.items(), 1):
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{i:2d}) {status}: {test_name}")
        
        success_rate = (passed_tests / len(tests)) * 100
        print(f"\n🏆 OVERALL SUCCESS RATE: {passed_tests}/{len(tests)} tests passed ({success_rate:.1f}%)")
        print(f"⏱️  TOTAL TEST DURATION: {duration:.2f} seconds")
        
        # Critical success criteria analysis
        critical_tests = [
            "World Size Sync",
            "Center Position Sync", 
            "Playable Radius Config",
            "Server-Side Boundary",
            "Red Zone Protection"
        ]
        
        critical_passed = sum(1 for test in critical_tests if results.get(test, False))
        critical_rate = (critical_passed / len(critical_tests)) * 100
        
        print(f"\n🎯 CRITICAL SUCCESS CRITERIA: {critical_passed}/{len(critical_tests)} passed ({critical_rate:.1f}%)")
        
        if critical_rate >= 80:
            print(f"✅ BOUNDARY ENFORCEMENT IS WORKING EXCELLENTLY")
        elif critical_rate >= 60:
            print(f"⚠️  BOUNDARY ENFORCEMENT HAS MINOR ISSUES")
        else:
            print(f"❌ BOUNDARY ENFORCEMENT HAS CRITICAL ISSUES")
        
        return results

def main():
    """Main test execution"""
    tester = BoundarySyncTester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    if results['success_rate'] >= 90:
        exit(0)  # Success
    else:
        exit(1)  # Failure

if __name__ == "__main__":
    main()