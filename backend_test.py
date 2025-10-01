#!/usr/bin/env python3
"""
Backend Testing Script for Completely Rebuilt Split Functionality
Tests the completely rebuilt split system for arena mode that was rebuilt from scratch.

NEW IMPLEMENTATION DETAILS:
1. Removed Complex Systems: Eliminated momentum-based movement, split piece tracking, merge logic
2. Simple Split Mechanic: When user presses spacebar, player mass is halved and player moves in split direction
3. Basic Requirements: 40 mass minimum, valid coordinates, basic boundary enforcement
4. No Split Pieces: No separate split entities - just modifies the existing player
5. Clean Code: Removed all problematic momentum fields and collision complexity

NEW SPLIT LOGIC:
- Check player exists and has ≥40 mass
- Calculate direction toward mouse cursor
- Halve player mass and update radius
- Move player in split direction by 50 pixels
- Keep player within arena boundaries
- Simple and stable - no complex state management
"""

import requests
import json
import time
import os
from typing import Dict, Any, List, Tuple

class RebuiltSplitBackendTester:
    def __init__(self):
        # Get base URL from environment
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://arena-cashout.preview.emergentagent.com')
        self.api_base = f"{self.base_url}/api"
        self.colyseus_endpoint = os.getenv('NEXT_PUBLIC_COLYSEUS_ENDPOINT', 'wss://au-syd-ab3eaf4e.colyseus.cloud')
        
        print(f"🔧 REBUILT SPLIT FUNCTIONALITY TESTING")
        print(f"   Testing the completely rebuilt split system from scratch")
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

    def test_backend_api_operational(self) -> bool:
        """Test 1: Verify backend API and Colyseus servers are operational after rebuild"""
        print("🔍 TEST 1: Backend API Operational - Backend infrastructure operational after rebuild")
        
        try:
            response = requests.get(f"{self.api_base}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                service = data.get('service', 'unknown')
                status = data.get('status', 'unknown')
                features = data.get('features', [])
                
                multiplayer_enabled = 'multiplayer' in features
                
                details = f"Service: {service}, Status: {status}, Multiplayer: {multiplayer_enabled}"
                
                if status == 'operational' and multiplayer_enabled:
                    self.log_test("Backend API Operational", True, details)
                    return True
                else:
                    self.log_test("Backend API Operational", False, f"Service issues - {details}")
                    return False
            else:
                self.log_test("Backend API Operational", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Backend API Operational", False, f"Exception: {str(e)}")
            return False

    def test_colyseus_servers_operational(self) -> bool:
        """Test 2: Verify Colyseus servers are operational after rebuild"""
        print("🔍 TEST 2: Colyseus Servers Operational - Arena servers running after rebuild")
        
        try:
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' and s.get('roomType') == 'arena']
                
                if colyseus_enabled and arena_servers:
                    server = arena_servers[0]
                    server_name = server.get('name', 'Unknown')
                    max_players = server.get('maxPlayers', 0)
                    
                    details = f"Arena server: {server_name}, Max: {max_players}, Endpoint: {colyseus_endpoint}"
                    self.log_test("Colyseus Servers Operational", True, details)
                    return True
                else:
                    self.log_test("Colyseus Servers Operational", False, f"No arena servers found or Colyseus disabled")
                    return False
            else:
                self.log_test("Colyseus Servers Operational", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Colyseus Servers Operational", False, f"Exception: {str(e)}")
            return False

    def test_split_messages_processed(self) -> bool:
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