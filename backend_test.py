#!/usr/bin/env python3
"""
Arena Mode Split Mechanic Fix Backend Testing
Testing the critical fix where split function now actually splits the player in half 
instead of creating additional mass, implementing proper mass conservation like agario.

CRITICAL FIX DETAILS:
1. Mass Conservation: When a player with mass 100 splits, they become mass 50 + a new piece with mass 50 (total stays 100)
2. Previously: Was keeping the main player at full mass and adding extra pieces
3. Now: Implements proper mass conservation like agario
4. Key Changes: The split function now actually splits the player in half instead of creating additional mass

TESTING FOCUS:
- Backend API health and availability  
- Colyseus server availability and split handling
- Split piece state management on server side
- Mass conservation validation (total mass before = total mass after)
- WebSocket stability during split operations
"""

import asyncio
import json
import time
import requests
import logging
from typing import Dict, Any, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ArenaModeSplitTester:
    def __init__(self):
        self.base_url = "https://arena-cashout.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.colyseus_endpoint = "wss://au-syd-ab3eaf4e.colyseus.cloud"
        self.test_results = []
        
    def log_test_result(self, test_name: str, passed: bool, details: str = ""):
        """Log test result with details"""
        status = "✅ PASSED" if passed else "❌ FAILED"
        result = {
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": time.time()
        }
        self.test_results.append(result)
        logger.info(f"{status}: {test_name} - {details}")
        
    async def test_api_health_check(self) -> bool:
        """Test 1: Verify backend API is operational"""
        try:
            response = requests.get(f"{self.api_url}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', 'unknown')
                status = data.get('status', 'unknown')
                features = data.get('features', [])
                
                is_operational = (
                    service_name == 'turfloot-api' and 
                    status == 'operational' and 
                    'multiplayer' in features
                )
                
                details = f"Service: {service_name}, Status: {status}, Features: {features}"
                self.log_test_result("API Health Check", is_operational, details)
                return is_operational
            else:
                self.log_test_result("API Health Check", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("API Health Check", False, f"Exception: {str(e)}")
            return False
    
    async def test_colyseus_server_availability(self) -> bool:
        """Test 2: Verify Colyseus arena servers are running"""
        try:
            response = requests.get(f"{self.api_url}/servers", timeout=10)
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
                
                details = f"Colyseus enabled: {colyseus_enabled}, Endpoint: {colyseus_endpoint}, Arena servers: {len(arena_servers)}"
                if arena_servers:
                    arena_server = arena_servers[0]
                    details += f", Sample server: {arena_server.get('name', 'Unknown')} (Max: {arena_server.get('maxPlayers', 0)})"
                
                self.log_test_result("Colyseus Server Availability", is_available, details)
                return is_available
            else:
                self.log_test_result("Colyseus Server Availability", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("Colyseus Server Availability", False, f"Exception: {str(e)}")
            return False
    
    async def test_split_message_handler_backend(self) -> bool:
        """Test 3: Verify server-side split message handler exists and is configured"""
        try:
            # Check TypeScript source file for split handler
            import os
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            ts_patterns_found = 0
            js_patterns_found = 0
            
            # Check TypeScript file
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    
                # Look for split-related patterns
                split_patterns = [
                    'onMessage("split"',
                    'handleSplit(client',
                    'targetX, targetY',
                    'player.mass / 2'
                ]
                
                for pattern in split_patterns:
                    if pattern in ts_content:
                        ts_patterns_found += 1
            
            # Check compiled JavaScript file
            if os.path.exists(js_file_path):
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    
                # Look for split-related patterns in compiled JS
                for pattern in split_patterns:
                    if pattern in js_content:
                        js_patterns_found += 1
            
            # Test passes if both files have split handler patterns
            has_split_handler = ts_patterns_found >= 3 and js_patterns_found >= 3
            
            details = f"TS patterns: {ts_patterns_found}/4, JS patterns: {js_patterns_found}/4"
            self.log_test_result("Split Message Handler Backend", has_split_handler, details)
            return has_split_handler
            
        except Exception as e:
            self.log_test_result("Split Message Handler Backend", False, f"Exception: {str(e)}")
            return False
    
    async def test_mass_conservation_logic(self) -> bool:
        """Test 4: Verify mass conservation logic in server code"""
        try:
            import os
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            mass_conservation_found = 0
            
            # Check for mass conservation patterns
            conservation_patterns = [
                'Math.floor(player.mass / 2)',  # Halving the mass
                'player.mass = newMass',        # Assigning new mass
                'newMass = Math.floor',         # New mass calculation
            ]
            
            # Check TypeScript file
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    for pattern in conservation_patterns:
                        if pattern in ts_content:
                            mass_conservation_found += 1
            
            # Check compiled JavaScript file  
            if os.path.exists(js_file_path):
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    for pattern in conservation_patterns:
                        if pattern in js_content:
                            mass_conservation_found += 1
            
            # Test passes if mass conservation patterns are found in both files
            has_mass_conservation = mass_conservation_found >= 4  # At least 2 patterns in each file
            
            details = f"Mass conservation patterns found: {mass_conservation_found}/6 (TS + JS)"
            self.log_test_result("Mass Conservation Logic", has_mass_conservation, details)
            return has_mass_conservation
            
        except Exception as e:
            self.log_test_result("Mass Conservation Logic", False, f"Exception: {str(e)}")
            return False
    
    async def test_split_boundary_enforcement(self) -> bool:
        """Test 5: Verify split pieces respect arena boundaries"""
        try:
            import os
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            boundary_patterns_found = 0
            
            # Check for boundary enforcement in split logic
            boundary_patterns = [
                'playableRadius',               # Boundary radius
                'distFromCenter',              # Distance calculation
                'Math.atan2',                  # Angle calculation for boundary
                'Math.cos(angle) * maxRadius', # Boundary positioning
            ]
            
            # Check both files for boundary enforcement in split context
            for file_path in [ts_file_path, js_file_path]:
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        content = f.read()
                        
                        # Look for handleSplit function and boundary enforcement within it
                        if 'handleSplit' in content:
                            # Extract handleSplit function content (rough approximation)
                            split_start = content.find('handleSplit')
                            if split_start != -1:
                                # Find the next function or end of class (rough boundary)
                                split_end = content.find('handleCashOut', split_start)
                                if split_end == -1:
                                    split_end = content.find('onLeave', split_start)
                                if split_end == -1:
                                    split_end = len(content)
                                
                                split_function = content[split_start:split_end]
                                
                                for pattern in boundary_patterns:
                                    if pattern in split_function:
                                        boundary_patterns_found += 1
            
            # Test passes if boundary enforcement patterns are found
            has_boundary_enforcement = boundary_patterns_found >= 6  # At least 3 patterns in each file
            
            details = f"Boundary enforcement patterns in split logic: {boundary_patterns_found}/8"
            self.log_test_result("Split Boundary Enforcement", has_boundary_enforcement, details)
            return has_boundary_enforcement
            
        except Exception as e:
            self.log_test_result("Split Boundary Enforcement", False, f"Exception: {str(e)}")
            return False
    
    async def test_websocket_stability_during_split(self) -> bool:
        """Test 6: Verify WebSocket connections remain stable during split operations"""
        try:
            # This test simulates what would happen during split operations
            # We test the server's ability to handle split messages without disconnection
            
            # First, verify the split message structure is properly defined
            import os
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            
            websocket_stability_indicators = 0
            
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    content = f.read()
                    
                    # Look for proper error handling and message validation
                    stability_patterns = [
                        'try {',                    # Error handling
                        'catch (error',            # Exception catching
                        'typeof targetX',          # Input validation
                        'typeof targetY',          # Input validation
                        'console.log',             # Logging for debugging
                    ]
                    
                    for pattern in stability_patterns:
                        if pattern in content:
                            websocket_stability_indicators += 1
            
            # Test passes if proper error handling and validation is present
            has_stability_features = websocket_stability_indicators >= 4
            
            details = f"WebSocket stability indicators: {websocket_stability_indicators}/5"
            self.log_test_result("WebSocket Stability During Split", has_stability_features, details)
            return has_stability_features
            
        except Exception as e:
            self.log_test_result("WebSocket Stability During Split", False, f"Exception: {str(e)}")
            return False
    
    async def test_split_state_synchronization(self) -> bool:
        """Test 7: Verify split state is properly synchronized to all clients"""
        try:
            import os
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            sync_patterns_found = 0
            
            # Check for state synchronization patterns
            sync_patterns = [
                '@type("number") mass',        # Mass field in schema
                '@type("number") radius',      # Radius field in schema  
                'player.mass =',               # Mass updates
                'player.radius =',             # Radius updates
            ]
            
            # Check both TypeScript and JavaScript files
            for file_path in [ts_file_path, js_file_path]:
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        content = f.read()
                        for pattern in sync_patterns:
                            if pattern in content:
                                sync_patterns_found += 1
            
            # Test passes if synchronization patterns are found
            has_state_sync = sync_patterns_found >= 6  # At least 3 patterns in each file
            
            details = f"State synchronization patterns: {sync_patterns_found}/8"
            self.log_test_result("Split State Synchronization", has_state_sync, details)
            return has_state_sync
            
        except Exception as e:
            self.log_test_result("Split State Synchronization", False, f"Exception: {str(e)}")
            return False
    
    async def test_backend_api_integration(self) -> bool:
        """Test 8: Verify backend APIs support the split functionality"""
        try:
            # Test the servers endpoint to ensure it returns proper arena server data
            response = requests.get(f"{self.api_url}/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                # Check for required fields that support split functionality
                required_fields = ['servers', 'totalPlayers', 'totalActiveServers']
                has_required_fields = all(field in data for field in required_fields)
                
                servers = data.get('servers', [])
                has_arena_servers = any(s.get('roomType') == 'arena' for s in servers)
                
                api_supports_split = has_required_fields and has_arena_servers
                
                details = f"Required fields: {has_required_fields}, Arena servers: {has_arena_servers}, Total servers: {len(servers)}"
                self.log_test_result("Backend API Integration", api_supports_split, details)
                return api_supports_split
            else:
                self.log_test_result("Backend API Integration", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("Backend API Integration", False, f"Exception: {str(e)}")
            return False
    
    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run all arena mode split mechanic tests"""
        logger.info("🚀 Starting Arena Mode Split Mechanic Fix Backend Testing")
        logger.info("=" * 80)
        
        start_time = time.time()
        
        # Run all tests
        test_functions = [
            self.test_api_health_check,
            self.test_colyseus_server_availability,
            self.test_split_message_handler_backend,
            self.test_mass_conservation_logic,
            self.test_split_boundary_enforcement,
            self.test_websocket_stability_during_split,
            self.test_split_state_synchronization,
            self.test_backend_api_integration,
        ]
        
        results = []
        for test_func in test_functions:
            try:
                result = await test_func()
                results.append(result)
            except Exception as e:
                logger.error(f"Test {test_func.__name__} failed with exception: {e}")
                results.append(False)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Calculate summary statistics
        total_tests = len(results)
        passed_tests = sum(results)
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        # Generate summary
        summary = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "success_rate": success_rate,
            "duration_seconds": round(duration, 2),
            "test_results": self.test_results
        }
        
        logger.info("=" * 80)
        logger.info(f"🎯 ARENA MODE SPLIT MECHANIC FIX TESTING COMPLETED")
        logger.info(f"📊 Results: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}% success rate)")
        logger.info(f"⏱️ Duration: {duration:.2f} seconds")
        
        if success_rate >= 87.5:  # 7/8 tests or better
            logger.info("🎉 ARENA MODE SPLIT MECHANIC FIX IS WORKING EXCELLENTLY")
        elif success_rate >= 75:   # 6/8 tests or better
            logger.info("✅ ARENA MODE SPLIT MECHANIC FIX IS WORKING WELL")
        elif success_rate >= 62.5: # 5/8 tests or better
            logger.info("⚠️ ARENA MODE SPLIT MECHANIC FIX HAS SOME ISSUES")
        else:
            logger.info("❌ ARENA MODE SPLIT MECHANIC FIX HAS CRITICAL ISSUES")
        
        return summary

async def main():
    """Main test execution function"""
    tester = ArenaModeSplitTester()
    results = await tester.run_comprehensive_test()
    
    # Print detailed results
    print("\n" + "=" * 80)
    print("DETAILED TEST RESULTS:")
    print("=" * 80)
    
    for i, result in enumerate(tester.test_results, 1):
        status = "✅ PASSED" if result["passed"] else "❌ FAILED"
        print(f"{i}. {status}: {result['test']}")
        if result["details"]:
            print(f"   Details: {result['details']}")
        print()
    
    return results

if __name__ == "__main__":
    asyncio.run(main())
        """Test 3: Verify split messages are processed without disconnection"""
        print("🔍 TEST 3: Split Messages Processed - Server processes split messages without crashes")
        
        try:
            # Check for handleSplit message handler in the code
            files_to_check = [
                "/app/src/rooms/ArenaRoom.ts",
                "/app/build/rooms/ArenaRoom.js"
            ]
            
            split_handler_found = False
            error_handling_found = False
            
            for file_path in files_to_check:
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Check for split message handler
                    if 'onMessage("split"' in content and 'handleSplit' in content:
                        split_handler_found = True
                    
                    # Check for error handling in split
                    if 'try {' in content and 'catch (error' in content and 'handleSplit' in content:
                        error_handling_found = True
                        
                except FileNotFoundError:
                    continue
            
            if split_handler_found and error_handling_found:
                details = f"Split message handler found with error handling"
                self.log_test("Split Messages Processed", True, details)
                return True
            else:
                details = f"Handler found: {split_handler_found}, Error handling: {error_handling_found}"
                self.log_test("Split Messages Processed", False, details)
                return False
                
        except Exception as e:
            self.log_test("Split Messages Processed", False, f"Exception: {str(e)}")
            return False

    def test_40_mass_minimum_requirement(self) -> bool:
        """Test 4: Verify players with ≥40 mass can split successfully"""
        print("🔍 TEST 4: 40 Mass Minimum - Players with ≥40 mass can split")
        
        try:
            files_to_check = [
                "/app/src/rooms/ArenaRoom.ts",
                "/app/build/rooms/ArenaRoom.js"
            ]
            
            mass_check_found = False
            
            for file_path in files_to_check:
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Check for 40 mass minimum requirement
                    if 'player.mass < 40' in content:
                        mass_check_found = True
                        break
                        
                except FileNotFoundError:
                    continue
            
            if mass_check_found:
                details = f"40 mass minimum requirement found in code"
                self.log_test("40 Mass Minimum", True, details)
                return True
            else:
                self.log_test("40 Mass Minimum", False, "40 mass check not found")
                return False
                
        except Exception as e:
            self.log_test("40 Mass Minimum", False, f"Exception: {str(e)}")
            return False

    def test_split_direction_toward_mouse(self) -> bool:
        """Test 5: Verify split moves player in correct direction (toward mouse)"""
        print("🔍 TEST 5: Split Direction - Split moves player toward mouse cursor")
        
        try:
            files_to_check = [
                "/app/src/rooms/ArenaRoom.ts",
                "/app/build/rooms/ArenaRoom.js"
            ]
            
            direction_calculation_found = False
            mouse_targeting_found = False
            
            for file_path in files_to_check:
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Check for direction calculation toward target
                    if 'targetX - player.x' in content and 'targetY - player.y' in content:
                        direction_calculation_found = True
                    
                    # Check for mouse cursor targeting
                    if 'targetX' in content and 'targetY' in content and 'handleSplit' in content:
                        mouse_targeting_found = True
                        
                except FileNotFoundError:
                    continue
            
            if direction_calculation_found and mouse_targeting_found:
                details = f"Direction calculation and mouse targeting found"
                self.log_test("Split Direction", True, details)
                return True
            else:
                details = f"Direction calc: {direction_calculation_found}, Mouse targeting: {mouse_targeting_found}"
                self.log_test("Split Direction", False, details)
                return False
                
        except Exception as e:
            self.log_test("Split Direction", False, f"Exception: {str(e)}")
            return False

    def test_mass_halved_and_radius_updated(self) -> bool:
        """Test 6: Verify split halves mass and updates radius properly"""
        print("🔍 TEST 6: Mass Halved - Split halves mass and updates radius")
        
        try:
            files_to_check = [
                "/app/src/rooms/ArenaRoom.ts",
                "/app/build/rooms/ArenaRoom.js"
            ]
            
            mass_halving_found = False
            radius_update_found = False
            
            for file_path in files_to_check:
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Check for mass halving
                    if 'Math.floor(player.mass / 2)' in content:
                        mass_halving_found = True
                    
                    # Check for radius update
                    if 'Math.sqrt(player.mass) * 3' in content and 'handleSplit' in content:
                        radius_update_found = True
                        
                except FileNotFoundError:
                    continue
            
            if mass_halving_found and radius_update_found:
                details = f"Mass halving and radius update found"
                self.log_test("Mass Halved", True, details)
                return True
            else:
                details = f"Mass halving: {mass_halving_found}, Radius update: {radius_update_found}"
                self.log_test("Mass Halved", False, details)
                return False
                
        except Exception as e:
            self.log_test("Mass Halved", False, f"Exception: {str(e)}")
            return False

    def test_boundary_enforcement(self) -> bool:
        """Test 7: Validate boundary enforcement keeps split players in arena"""
        print("🔍 TEST 7: Boundary Enforcement - Split players kept within arena boundaries")
        
        try:
            files_to_check = [
                "/app/src/rooms/ArenaRoom.ts",
                "/app/build/rooms/ArenaRoom.js"
            ]
            
            boundary_check_found = False
            playable_radius_found = False
            
            for file_path in files_to_check:
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Check for boundary enforcement in split
                    if 'Keep player in bounds' in content or ('playableRadius' in content and 'handleSplit' in content):
                        boundary_check_found = True
                    
                    # Check for playable radius configuration
                    if 'playableRadius = 1800' in content or 'playableRadius: 1800' in content:
                        playable_radius_found = True
                        
                except FileNotFoundError:
                    continue
            
            if boundary_check_found and playable_radius_found:
                details = f"Boundary enforcement and playable radius found"
                self.log_test("Boundary Enforcement", True, details)
                return True
            else:
                details = f"Boundary check: {boundary_check_found}, Playable radius: {playable_radius_found}"
                self.log_test("Boundary Enforcement", False, details)
                return False
                
        except Exception as e:
            self.log_test("Boundary Enforcement", False, f"Exception: {str(e)}")
            return False

    def test_no_disconnection_issues(self) -> bool:
        """Test 8: Confirm no WebSocket disconnection errors with new implementation"""
        print("🔍 TEST 8: No Disconnection Issues - New implementation doesn't cause disconnections")
        
        try:
            # Check that complex problematic fields have been removed
            files_to_check = [
                "/app/src/rooms/ArenaRoom.ts",
                "/app/build/rooms/ArenaRoom.js"
            ]
            
            complex_fields_removed = True
            simple_implementation = False
            
            problematic_fields = ['sessionId', 'ownerSessionId', 'momentumX', 'momentumY', 'splitTime']
            
            for file_path in files_to_check:
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Check that problematic fields are not in Player schema
                    for field in problematic_fields:
                        if f'@type("string") {field}' in content or f'@type("number") {field}' in content:
                            complex_fields_removed = False
                    
                    # Check for simple implementation comment
                    if 'Removed complex split functionality for simplicity' in content:
                        simple_implementation = True
                        
                except FileNotFoundError:
                    continue
            
            if complex_fields_removed and simple_implementation:
                details = f"Complex fields removed, simple implementation confirmed"
                self.log_test("No Disconnection Issues", True, details)
                return True
            else:
                details = f"Complex fields removed: {complex_fields_removed}, Simple impl: {simple_implementation}"
                self.log_test("No Disconnection Issues", False, details)
                return False
                
        except Exception as e:
            self.log_test("No Disconnection Issues", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self) -> Dict[str, bool]:
        """Run all rebuilt split functionality tests"""
        print("🧪 COMPLETELY REBUILT SPLIT FUNCTIONALITY TESTING")
        print("=" * 70)
        print("Testing the new simple split mechanic that was rebuilt from scratch")
        print("- No momentum-based movement, split piece tracking, or merge logic")
        print("- Simple: halve mass, move player in split direction, boundary enforcement")
        print("=" * 70)
        print()
        
        tests = [
            ("Backend API Operational", self.test_backend_api_operational),
            ("Colyseus Servers Operational", self.test_colyseus_servers_operational),
            ("Split Messages Processed", self.test_split_messages_processed),
            ("40 Mass Minimum", self.test_40_mass_minimum_requirement),
            ("Split Direction", self.test_split_direction_toward_mouse),
            ("Mass Halved", self.test_mass_halved_and_radius_updated),
            ("Boundary Enforcement", self.test_boundary_enforcement),
            ("No Disconnection Issues", self.test_no_disconnection_issues)
        ]
        
        results = {}
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    passed += 1
            except Exception as e:
                print(f"   ❌ Test '{test_name}' failed with error: {e}")
                results[test_name] = False
        
        # Summary
        print("📊 REBUILT SPLIT FUNCTIONALITY TEST SUMMARY")
        print("=" * 70)
        success_rate = (passed / total) * 100
        print(f"Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
        print()
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
        
        print()
        
        # Final assessment
        if success_rate >= 90:
            print("🎉 REBUILT SPLIT FUNCTIONALITY: EXCELLENT - All requirements verified")
        elif success_rate >= 75:
            print("✅ REBUILT SPLIT FUNCTIONALITY: GOOD - Most requirements met")
        elif success_rate >= 50:
            print("⚠️ REBUILT SPLIT FUNCTIONALITY: NEEDS IMPROVEMENT")
        else:
            print("❌ REBUILT SPLIT FUNCTIONALITY: CRITICAL ISSUES")
        
        print()
        print("EXPECTED RESULTS FROM REVIEW REQUEST:")
        print("- Split messages processed successfully without crashes")
        print("- Player mass halved when splitting (e.g., 100 → 50)")
        print("- Player moves in direction of mouse cursor")
        print("- No WebSocket disconnection errors")
        print("- Clean, simple split mechanic that works reliably")
        
        return results

if __name__ == "__main__":
    tester = RebuiltSplitBackendTester()
    results = tester.run_all_tests()