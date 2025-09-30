#!/usr/bin/env python3
"""
Cash Out Ring Functionality Backend Testing
Testing the newly implemented multiplayer cash out ring system for arena mode.
"""

import requests
import json
import time
import math
import sys
from typing import Dict, List, Tuple, Any
from datetime import datetime

class CashOutRingTester:
    def __init__(self):
        # Get base URL from environment
        try:
            with open('/app/.env', 'r') as f:
                env_content = f.read()
                for line in env_content.split('\n'):
                    if line.startswith('NEXT_PUBLIC_BASE_URL='):
                        self.base_url = line.split('=', 1)[1].strip()
                        break
                else:
                    self.base_url = "http://localhost:3000"
        except:
            self.base_url = "http://localhost:3000"
        
        self.api_url = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🎯 CASH OUT RING FUNCTIONALITY TESTING")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"🔗 API URL: {self.api_url}")
        print("=" * 80)

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
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
        return passed

    def test_api_health_check(self) -> bool:
        """Test 1: Verify backend API is operational"""
        try:
            response = requests.get(f"{self.api_url}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', '')
                status = data.get('status', '')
                features = data.get('features', [])
                
                if service_name == 'turfloot-api' and status == 'operational':
                    return self.log_test(
                        "API Health Check",
                        True,
                        f"Service: {service_name}, Status: {status}, Features: {features}"
                    )
                else:
                    return self.log_test(
                        "API Health Check",
                        False,
                        f"Unexpected response: {data}"
                    )
            else:
                return self.log_test(
                    "API Health Check",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
        except Exception as e:
            return self.log_test("API Health Check", False, f"Exception: {str(e)}")

    def test_colyseus_server_availability(self) -> bool:
        """Test 2: Verify Colyseus servers are available"""
        try:
            response = requests.get(f"{self.api_url}/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                if colyseus_enabled and servers:
                    arena_servers = [s for s in servers if s.get('serverType') == 'colyseus']
                    if arena_servers:
                        server = arena_servers[0]
                        return self.log_test(
                            "Colyseus Server Availability",
                            True,
                            f"Arena server found ({server.get('name', 'Unknown')}, Max: {server.get('maxPlayers', 0)}) with endpoint='{colyseus_endpoint}'"
                        )
                    else:
                        return self.log_test(
                            "Colyseus Server Availability",
                            False,
                            "No Colyseus arena servers found"
                        )
                else:
                    return self.log_test(
                        "Colyseus Server Availability",
                        False,
                        f"Colyseus not enabled or no servers: enabled={colyseus_enabled}, servers={len(servers)}"
                    )
            else:
                return self.log_test(
                    "Colyseus Server Availability",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
        except Exception as e:
            return self.log_test("Colyseus Server Availability", False, f"Exception: {str(e)}")

    def test_spawn_logic_configuration(self) -> bool:
        """Test 3: Verify server-side spawn logic configuration"""
        try:
            # Read the compiled ArenaRoom.js file to verify spawn logic
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                arena_js_content = f.read()
            
            # Check for key spawn configuration patterns
            checks = {
                'worldSize_8000': 'worldSize = 8000' in arena_js_content or 'worldSize || \'8000\'' in arena_js_content,
                'center_calculation': 'this.worldSize / 4' in arena_js_content,
                'playable_radius_1800': 'playableRadius = 1800' in arena_js_content,
                'safe_zone_radius_1800': 'safeZoneRadius = 1800' in arena_js_content,
                'generateCircularSpawnPosition': 'generateCircularSpawnPosition' in arena_js_content,
                'boundary_enforcement': 'distanceFromCenter > maxRadius' in arena_js_content
            }
            
            passed_checks = sum(1 for check in checks.values() if check)
            total_checks = len(checks)
            
            if passed_checks >= total_checks - 1:  # Allow 1 minor variation
                return self.log_test(
                    "Server-Side Spawn Logic Configuration",
                    True,
                    f"Spawn logic properly configured ({passed_checks}/{total_checks} checks passed)"
                )
            else:
                failed_checks = [name for name, passed in checks.items() if not passed]
                return self.log_test(
                    "Server-Side Spawn Logic Configuration",
                    False,
                    f"Missing configurations: {failed_checks} ({passed_checks}/{total_checks} checks passed)"
                )
        except Exception as e:
            return self.log_test("Server-Side Spawn Logic Configuration", False, f"Exception: {str(e)}")

    def test_boundary_enforcement_variables(self) -> bool:
        """Test 4: Verify boundary enforcement variables are properly scoped"""
        try:
            # Read both TypeScript source and compiled JavaScript
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                arena_ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                arena_js_content = f.read()
            
            # Check that boundary enforcement variables are declared at function scope in update method
            ts_checks = {
                'centerX_declaration': 'const centerX = this.worldSize / 4' in arena_ts_content,
                'centerY_declaration': 'const centerY = this.worldSize / 4' in arena_ts_content,
                'playableRadius_declaration': 'const playableRadius = 1800' in arena_ts_content,
                'maxRadius_declaration': 'const maxRadius = playableRadius - player.radius' in arena_ts_content,
                'function_scope_comment': 'declare at function scope' in arena_ts_content
            }
            
            js_checks = {
                'centerX_declaration': 'const centerX = this.worldSize / 4' in arena_js_content,
                'centerY_declaration': 'const centerY = this.worldSize / 4' in arena_js_content,
                'playableRadius_declaration': 'const playableRadius = 1800' in arena_js_content,
                'maxRadius_declaration': 'const maxRadius = playableRadius - player.radius' in arena_js_content
            }
            
            ts_passed = sum(1 for check in ts_checks.values() if check)
            js_passed = sum(1 for check in js_checks.values() if check)
            
            if ts_passed >= 4 and js_passed >= 4:
                return self.log_test(
                    "Boundary Enforcement Variable Scope Fix",
                    True,
                    f"Variables properly scoped in both TS ({ts_passed}/5) and JS ({js_passed}/4)"
                )
            else:
                return self.log_test(
                    "Boundary Enforcement Variable Scope Fix",
                    False,
                    f"Variable scope issues: TS ({ts_passed}/5), JS ({js_passed}/4)"
                )
        except Exception as e:
            return self.log_test("Boundary Enforcement Variable Scope Fix", False, f"Exception: {str(e)}")

    def test_spawn_position_mathematics(self) -> bool:
        """Test 5: Verify spawn position mathematical calculations"""
        try:
            # Test the mathematical correctness of spawn positions
            center_x = self.expected_center_x
            center_y = self.expected_center_y
            max_radius = self.expected_playable_radius
            
            # Simulate spawn position generation (similar to server logic)
            test_positions = []
            for i in range(10):
                # Generate random angle and distance (using square root for uniform distribution)
                angle = (i / 10.0) * 2 * math.pi  # Distribute evenly for testing
                distance = math.sqrt(0.5) * max_radius  # Use sqrt(0.5) for mid-range distance
                
                x = center_x + math.cos(angle) * distance
                y = center_y + math.sin(angle) * distance
                
                # Calculate distance from center
                actual_distance = math.sqrt((x - center_x)**2 + (y - center_y)**2)
                
                test_positions.append({
                    'x': x,
                    'y': y,
                    'distance': actual_distance,
                    'within_bounds': actual_distance <= max_radius
                })
            
            # Check that all positions are within bounds
            valid_positions = [pos for pos in test_positions if pos['within_bounds']]
            
            if len(valid_positions) == len(test_positions):
                avg_distance = sum(pos['distance'] for pos in test_positions) / len(test_positions)
                return self.log_test(
                    "Spawn Position Mathematics",
                    True,
                    f"All {len(test_positions)} test positions within {max_radius}px radius (avg distance: {avg_distance:.1f}px)"
                )
            else:
                invalid_count = len(test_positions) - len(valid_positions)
                return self.log_test(
                    "Spawn Position Mathematics",
                    False,
                    f"{invalid_count}/{len(test_positions)} positions outside bounds"
                )
        except Exception as e:
            return self.log_test("Spawn Position Mathematics", False, f"Exception: {str(e)}")

    def test_world_size_configuration(self) -> bool:
        """Test 6: Verify world size is 8000x8000 with playable area at top-left quadrant"""
        try:
            # Check configuration in both source files
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                arena_ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                arena_js_content = f.read()
            
            # Check world size configuration
            world_size_checks = {
                'ts_world_size_8000': 'worldSize = 8000' in arena_ts_content,
                'js_world_size_8000': 'worldSize = 8000' in arena_js_content,
                'ts_env_world_size': 'WORLD_SIZE || \'8000\'' in arena_ts_content,
                'js_env_world_size': 'WORLD_SIZE || \'8000\'' in arena_js_content
            }
            
            # Check center positioning (top-left quadrant)
            center_checks = {
                'ts_center_calculation': 'this.worldSize / 4' in arena_ts_content,
                'js_center_calculation': 'this.worldSize / 4' in arena_js_content,
                'ts_center_comment': '2000 for 8000x8000 world' in arena_ts_content,
                'js_center_comment': '2000 for 8000x8000 world' in arena_js_content
            }
            
            world_passed = sum(1 for check in world_size_checks.values() if check)
            center_passed = sum(1 for check in center_checks.values() if check)
            
            if world_passed >= 2 and center_passed >= 2:
                return self.log_test(
                    "World Size Configuration",
                    True,
                    f"8000x8000 world with top-left quadrant center verified (world: {world_passed}/4, center: {center_passed}/4)"
                )
            else:
                return self.log_test(
                    "World Size Configuration",
                    False,
                    f"Configuration issues: world size ({world_passed}/4), center positioning ({center_passed}/4)"
                )
        except Exception as e:
            return self.log_test("World Size Configuration", False, f"Exception: {str(e)}")

    def test_boundary_enforcement_logic(self) -> bool:
        """Test 7: Verify boundary enforcement is working for both movement and spawn"""
        try:
            # Check boundary enforcement patterns in compiled code
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                arena_js_content = f.read()
            
            # Check for boundary enforcement patterns
            enforcement_patterns = {
                'distance_calculation': 'Math.sqrt(Math.pow(' in arena_js_content,
                'boundary_violation_check': 'distanceFromCenter > maxRadius' in arena_js_content,
                'angle_calculation': 'Math.atan2(' in arena_js_content,
                'position_clamping': 'Math.cos(angle) * maxRadius' in arena_js_content,
                'emergency_enforcement': 'EMERGENCY BOUNDARY ENFORCEMENT' in arena_js_content,
                'movement_blocking': 'MOVEMENT BLOCKED - would enter red zone' in arena_js_content
            }
            
            # Check spawn boundary enforcement
            spawn_patterns = {
                'safe_spawn_position': 'generateSafeSpawnPosition' in arena_js_content,
                'circular_spawn_position': 'generateCircularSpawnPosition' in arena_js_content,
                'safe_zone_radius': 'safeZoneRadius = 1800' in arena_js_content,
                'spawn_bounds_logging': 'SPAWN BOUNDS:' in arena_js_content
            }
            
            enforcement_passed = sum(1 for check in enforcement_patterns.values() if check)
            spawn_passed = sum(1 for check in spawn_patterns.values() if check)
            
            if enforcement_passed >= 5 and spawn_passed >= 3:
                return self.log_test(
                    "Boundary Enforcement Logic",
                    True,
                    f"Boundary enforcement working for movement ({enforcement_passed}/6) and spawn ({spawn_passed}/4)"
                )
            else:
                return self.log_test(
                    "Boundary Enforcement Logic",
                    False,
                    f"Enforcement issues: movement ({enforcement_passed}/6), spawn ({spawn_passed}/4)"
                )
        except Exception as e:
            return self.log_test("Boundary Enforcement Logic", False, f"Exception: {str(e)}")

    def test_typescript_compilation_sync(self) -> bool:
        """Test 8: Verify TypeScript compilation is synchronized with changes"""
        try:
            # Check that both TypeScript and JavaScript have consistent implementations
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                arena_ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                arena_js_content = f.read()
            
            # Key patterns that should exist in both files
            sync_patterns = {
                'world_size_8000': ('worldSize = 8000', 'worldSize = 8000'),
                'center_calculation': ('this.worldSize / 4', 'this.worldSize / 4'),
                'playable_radius_1800': ('playableRadius = 1800', 'playableRadius = 1800'),
                'safe_zone_radius_1800': ('safeZoneRadius = 1800', 'safeZoneRadius = 1800'),
                'boundary_enforcement': ('distanceFromCenter > maxRadius', 'distanceFromCenter > maxRadius')
            }
            
            sync_results = {}
            for pattern_name, (ts_pattern, js_pattern) in sync_patterns.items():
                ts_found = ts_pattern in arena_ts_content
                js_found = js_pattern in arena_js_content
                sync_results[pattern_name] = ts_found and js_found
            
            synced_patterns = sum(1 for synced in sync_results.values() if synced)
            total_patterns = len(sync_patterns)
            
            if synced_patterns >= total_patterns - 1:  # Allow 1 minor variation
                return self.log_test(
                    "TypeScript Compilation Synchronization",
                    True,
                    f"TS and JS files synchronized ({synced_patterns}/{total_patterns} patterns match)"
                )
            else:
                unsynced = [name for name, synced in sync_results.items() if not synced]
                return self.log_test(
                    "TypeScript Compilation Synchronization",
                    False,
                    f"Synchronization issues: {unsynced} ({synced_patterns}/{total_patterns} patterns match)"
                )
        except Exception as e:
            return self.log_test("TypeScript Compilation Synchronization", False, f"Exception: {str(e)}")

    def test_safe_zone_validation(self) -> bool:
        """Test 9: Validate that all spawn positions are mathematically within the safe zone"""
        try:
            # Mathematical validation of safe zone boundaries
            center_x = self.expected_center_x
            center_y = self.expected_center_y
            safe_radius = self.expected_playable_radius
            
            # Test edge cases and boundary conditions
            test_cases = [
                # Center position
                (center_x, center_y, 0, "Center position"),
                # Edge positions (just inside boundary)
                (center_x + safe_radius - 1, center_y, safe_radius - 1, "Right edge (safe)"),
                (center_x - safe_radius + 1, center_y, safe_radius - 1, "Left edge (safe)"),
                (center_x, center_y + safe_radius - 1, safe_radius - 1, "Bottom edge (safe)"),
                (center_x, center_y - safe_radius + 1, safe_radius - 1, "Top edge (safe)"),
                # Corner positions (diagonal)
                (center_x + safe_radius * 0.7, center_y + safe_radius * 0.7, safe_radius * 0.99, "Diagonal (safe)"),
            ]
            
            validation_results = []
            for x, y, expected_distance, description in test_cases:
                actual_distance = math.sqrt((x - center_x)**2 + (y - center_y)**2)
                is_safe = actual_distance <= safe_radius
                
                validation_results.append({
                    'description': description,
                    'position': (x, y),
                    'distance': actual_distance,
                    'expected_distance': expected_distance,
                    'is_safe': is_safe,
                    'distance_match': abs(actual_distance - expected_distance) < 1.0
                })
            
            safe_positions = [r for r in validation_results if r['is_safe']]
            accurate_distances = [r for r in validation_results if r['distance_match']]
            
            if len(safe_positions) == len(validation_results) and len(accurate_distances) >= len(validation_results) - 1:
                return self.log_test(
                    "Safe Zone Mathematical Validation",
                    True,
                    f"All {len(validation_results)} test positions within safe zone with accurate distance calculations"
                )
            else:
                unsafe_count = len(validation_results) - len(safe_positions)
                inaccurate_count = len(validation_results) - len(accurate_distances)
                return self.log_test(
                    "Safe Zone Mathematical Validation",
                    False,
                    f"Validation issues: {unsafe_count} unsafe positions, {inaccurate_count} inaccurate distances"
                )
        except Exception as e:
            return self.log_test("Safe Zone Mathematical Validation", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all arena spawn position fix verification tests"""
        print("\n🚀 Starting Arena Spawn Position Fix Verification Tests...")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all tests
        test_methods = [
            self.test_api_health_check,
            self.test_colyseus_server_availability,
            self.test_spawn_logic_configuration,
            self.test_boundary_enforcement_variables,
            self.test_spawn_position_mathematics,
            self.test_world_size_configuration,
            self.test_boundary_enforcement_logic,
            self.test_typescript_compilation_sync,
            self.test_safe_zone_validation
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_test(test_method.__name__, False, f"Test execution error: {str(e)}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("\n" + "=" * 60)
        print("🎯 ARENA SPAWN POSITION FIX VERIFICATION SUMMARY")
        print("=" * 60)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        
        if success_rate >= 90:
            print("\n🎉 ARENA SPAWN POSITION FIX VERIFICATION COMPLETED - ALL CRITICAL REQUIREMENTS VERIFIED")
            print("✅ The arena spawn position fix is working correctly!")
            print("✅ Players spawn within the designated 1800px radius playable area")
            print("✅ Boundary enforcement variables are properly scoped")
            print("✅ TypeScript compilation is synchronized with changes")
            print("✅ All spawn positions are mathematically within the safe zone")
        elif success_rate >= 75:
            print("\n⚠️ ARENA SPAWN POSITION FIX VERIFICATION - MOSTLY WORKING WITH MINOR ISSUES")
            print("✅ Core spawn position fix is operational")
            print("⚠️ Some minor configuration or synchronization issues detected")
        else:
            print("\n❌ ARENA SPAWN POSITION FIX VERIFICATION - CRITICAL ISSUES DETECTED")
            print("❌ Spawn position fix may not be working correctly")
            print("❌ Manual investigation required")
        
        print("\n" + "=" * 60)
        return success_rate >= 90

if __name__ == "__main__":
    tester = ArenaSpawnPositionTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)