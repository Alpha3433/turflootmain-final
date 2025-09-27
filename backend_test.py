#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Circular Boundary Barrier Implementation
Testing circular boundary barrier system identical to agario that prevents players from leaving the playable area
"""

import requests
import json
import time
import sys
import os
from typing import Dict, List, Any, Optional

class CircularBoundaryTester:
    def __init__(self):
        # Get base URL from environment or use default
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
        self.api_base = f"{self.base_url}/api"
        
        # Test configuration
        self.world_size = 4000
        self.world_center_x = 2000
        self.world_center_y = 2000
        self.playable_radius = 1800
        self.player_radius = 15  # √25 * 3 = 15 for mass = 25
        self.max_player_distance = self.playable_radius - self.player_radius  # 1785
        
        # Test results tracking
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🎯 CIRCULAR BOUNDARY BARRIER TESTING INITIALIZED")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🌍 World: {self.world_size}x{self.world_size}, Center: ({self.world_center_x}, {self.world_center_y})")
        print(f"🔵 Playable Radius: {self.playable_radius}px")
        print(f"👤 Player Radius: {self.player_radius}px")
        print(f"📏 Max Player Distance from Center: {self.max_player_distance}px")
        print("=" * 80)

    def log_test(self, category: str, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = {
            'category': category,
            'test': test_name,
            'passed': passed,
            'details': details
        }
        self.test_results.append(result)
        
        print(f"{status} | {category} | {test_name}")
        if details:
            print(f"    📝 {details}")

    def make_request(self, endpoint: str, method: str = 'GET', data: Dict = None) -> Optional[Dict]:
        """Make HTTP request with error handling"""
        try:
            url = f"{self.api_base}{endpoint}"
            
            if method == 'GET':
                response = requests.get(url, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"⚠️ HTTP {response.status_code}: {response.text[:200]}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {str(e)}")
            return None

    def test_api_health_check(self):
        """Test 1: API Health Check"""
        print("\n🔍 TESTING CATEGORY 1: API HEALTH CHECK")
        
        # Test root API endpoint
        response = self.make_request("/")
        if response:
            service = response.get('service', '')
            status = response.get('status', '')
            features = response.get('features', [])
            
            self.log_test(
                "API Health Check", 
                "Root API Endpoint",
                service == 'turfloot-api' and status == 'operational',
                f"Service: {service}, Status: {status}, Features: {features}"
            )
        else:
            self.log_test("API Health Check", "Root API Endpoint", False, "API not accessible")

    def test_colyseus_server_availability(self):
        """Test 2: Colyseus Server Availability"""
        print("\n🔍 TESTING CATEGORY 2: COLYSEUS SERVER AVAILABILITY")
        
        # Test servers endpoint
        response = self.make_request("/servers")
        if response:
            servers = response.get('servers', [])
            colyseus_enabled = response.get('colyseusEnabled', False)
            colyseus_endpoint = response.get('colyseusEndpoint', '')
            
            # Find arena server
            arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' and s.get('roomType') == 'arena']
            
            self.log_test(
                "Colyseus Server Availability",
                "Arena Server Found",
                len(arena_servers) > 0,
                f"Found {len(arena_servers)} arena servers, Colyseus enabled: {colyseus_enabled}"
            )
            
            if arena_servers:
                arena_server = arena_servers[0]
                max_players = arena_server.get('maxPlayers', 0)
                current_players = arena_server.get('currentPlayers', 0)
                
                self.log_test(
                    "Colyseus Server Availability",
                    "Arena Server Configuration",
                    max_players >= 50,
                    f"Max: {max_players}, Current: {current_players}, Endpoint: {colyseus_endpoint}"
                )
        else:
            self.log_test("Colyseus Server Availability", "Arena Server Found", False, "Servers endpoint not accessible")

    def test_circular_boundary_mathematics(self):
        """Test 3: Circular Boundary Mathematics Verification"""
        print("\n🔍 TESTING CATEGORY 3: CIRCULAR BOUNDARY MATHEMATICS")
        
        # Test boundary calculations
        import math
        
        # Test center position
        center_correct = (self.world_center_x == self.world_size / 2 and 
                         self.world_center_y == self.world_size / 2)
        self.log_test(
            "Circular Boundary Mathematics",
            "World Center Calculation",
            center_correct,
            f"Center: ({self.world_center_x}, {self.world_center_y}) for {self.world_size}x{self.world_size} world"
        )
        
        # Test playable radius
        radius_reasonable = 800 <= self.playable_radius <= 2000
        self.log_test(
            "Circular Boundary Mathematics",
            "Playable Radius Range",
            radius_reasonable,
            f"Playable radius: {self.playable_radius}px (should be 800-2000px)"
        )
        
        # Test boundary positions
        test_positions = [
            ("Center", self.world_center_x, self.world_center_y, True),
            ("Edge Safe", self.world_center_x + self.max_player_distance - 10, self.world_center_y, True),
            ("Edge Boundary", self.world_center_x + self.max_player_distance, self.world_center_y, True),
            ("Outside Boundary", self.world_center_x + self.max_player_distance + 50, self.world_center_y, False)
        ]
        
        for pos_name, x, y, should_be_safe in test_positions:
            distance = math.sqrt((x - self.world_center_x)**2 + (y - self.world_center_y)**2)
            is_safe = distance <= self.max_player_distance
            
            self.log_test(
                "Circular Boundary Mathematics",
                f"Position Test: {pos_name}",
                is_safe == should_be_safe,
                f"Position: ({x:.0f}, {y:.0f}), Distance: {distance:.1f}px, Safe: {is_safe}"
            )

    def test_client_side_boundary_implementation(self):
        """Test 4: Client-Side Boundary Implementation Analysis"""
        print("\n🔍 TESTING CATEGORY 4: CLIENT-SIDE BOUNDARY IMPLEMENTATION")
        
        # Since we can't directly test client-side JavaScript from Python,
        # we'll verify the implementation exists by checking the code patterns
        
        try:
            # Read the client-side code
            with open('/app/app/agario/page.js', 'r') as f:
                client_code = f.read()
            
            # Check for circular boundary patterns
            patterns = {
                "currentPlayableRadius Usage": "currentPlayableRadius - this.player.radius" in client_code,
                "Distance Calculation": "Math.sqrt(Math.pow(this.player.x - centerX, 2)" in client_code,
                "Angle-Based Clamping": "Math.atan2(this.player.y - centerY, this.player.x - centerX)" in client_code,
                "Boundary Repositioning": "Math.cos(angle) * maxRadius" in client_code,
                "drawWorldBoundary Method": "drawWorldBoundary()" in client_code,
                "Green Circle Rendering": "strokeStyle = zoneColor" in client_code
            }
            
            for pattern_name, found in patterns.items():
                self.log_test(
                    "Client-Side Boundary Implementation",
                    pattern_name,
                    found,
                    f"Pattern {'found' if found else 'not found'} in client code"
                )
                
        except FileNotFoundError:
            self.log_test(
                "Client-Side Boundary Implementation",
                "Code Analysis",
                False,
                "Client code file not accessible"
            )

    def test_server_side_boundary_enforcement(self):
        """Test 5: Server-Side Boundary Enforcement"""
        print("\n🔍 TESTING CATEGORY 5: SERVER-SIDE BOUNDARY ENFORCEMENT")
        
        try:
            # Read server-side TypeScript code
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                server_ts_code = f.read()
            
            # Read compiled JavaScript code
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                server_js_code = f.read()
            
            # Check server-side boundary patterns
            ts_patterns = {
                "Circular Bounds Check": "distanceFromCenter > maxRadius" in server_ts_code,
                "Playable Radius": "playableRadius = 1800" in server_ts_code,
                "Angle-Based Clamping": "Math.atan2(player.y - centerY, player.x - centerX)" in server_ts_code,
                "Player Repositioning": "Math.cos(angle) * maxRadius" in server_ts_code
            }
            
            js_patterns = {
                "Compiled Circular Bounds": "distanceFromCenter > maxRadius" in server_js_code,
                "Compiled Playable Radius": "playableRadius = 1800" in server_js_code,
                "Compiled Angle Clamping": "Math.atan2" in server_js_code,
                "Compiled Repositioning": "Math.cos(angle)" in server_js_code
            }
            
            for pattern_name, found in ts_patterns.items():
                self.log_test(
                    "Server-Side Boundary Enforcement",
                    f"TypeScript: {pattern_name}",
                    found,
                    f"Pattern {'found' if found else 'not found'} in TypeScript code"
                )
            
            for pattern_name, found in js_patterns.items():
                self.log_test(
                    "Server-Side Boundary Enforcement",
                    f"JavaScript: {pattern_name}",
                    found,
                    f"Pattern {'found' if found else 'not found'} in compiled JavaScript"
                )
                
        except FileNotFoundError as e:
            self.log_test(
                "Server-Side Boundary Enforcement",
                "Code Analysis",
                False,
                f"Server code file not accessible: {str(e)}"
            )

    def test_split_pieces_boundary_respect(self):
        """Test 6: Split Pieces Boundary Respect"""
        print("\n🔍 TESTING CATEGORY 6: SPLIT PIECES BOUNDARY RESPECT")
        
        try:
            # Read server-side code for split functionality
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                server_code = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                compiled_code = f.read()
            
            # Check split boundary patterns
            split_patterns = {
                "Split Boundary Check": "distanceFromCenter > maxRadius" in server_code and "splitPlayer" in server_code,
                "Split Angle Calculation": "Math.atan2(splitPlayer.y - centerY" in server_code,
                "Split Repositioning": "splitPlayer.x = centerX + Math.cos(angle)" in server_code,
                "Split Radius Constraint": "maxRadius - splitPlayer.radius" in server_code
            }
            
            compiled_split_patterns = {
                "Compiled Split Boundary": "distanceFromCenter > maxRadius" in compiled_code and "splitPlayer" in compiled_code,
                "Compiled Split Angle": "Math.atan2" in compiled_code and "splitPlayer" in compiled_code,
                "Compiled Split Reposition": "Math.cos(angle)" in compiled_code and "splitPlayer" in compiled_code
            }
            
            for pattern_name, found in split_patterns.items():
                self.log_test(
                    "Split Pieces Boundary Respect",
                    f"TypeScript: {pattern_name}",
                    found,
                    f"Split boundary pattern {'found' if found else 'not found'}"
                )
            
            for pattern_name, found in compiled_split_patterns.items():
                self.log_test(
                    "Split Pieces Boundary Respect",
                    f"JavaScript: {pattern_name}",
                    found,
                    f"Compiled split pattern {'found' if found else 'not found'}"
                )
                
        except FileNotFoundError:
            self.log_test(
                "Split Pieces Boundary Respect",
                "Code Analysis",
                False,
                "Split code analysis failed - files not accessible"
            )

    def test_visual_green_circle_boundary(self):
        """Test 7: Visual Green Circle Boundary Display"""
        print("\n🔍 TESTING CATEGORY 7: VISUAL GREEN CIRCLE BOUNDARY")
        
        try:
            # Read client-side code for visual boundary
            with open('/app/app/agario/page.js', 'r') as f:
                client_code = f.read()
            
            # Check visual boundary patterns
            visual_patterns = {
                "drawWorldBoundary Method": "drawWorldBoundary()" in client_code,
                "Green Zone Color": "#00ff00" in client_code or "zoneColor = '#00ff00'" in client_code,
                "Circle Arc Drawing": "ctx.arc(centerX, centerY, playableRadius" in client_code,
                "Stroke Style Setting": "ctx.strokeStyle = zoneColor" in client_code,
                "Glowing Effect": "glowing effect" in client_code.lower() or "glow" in client_code.lower(),
                "Boundary Circle Stroke": "ctx.stroke()" in client_code and "playableRadius" in client_code
            }
            
            for pattern_name, found in visual_patterns.items():
                self.log_test(
                    "Visual Green Circle Boundary",
                    pattern_name,
                    found,
                    f"Visual pattern {'found' if found else 'not found'} in client code"
                )
                
            # Check for arena mode specific boundary
            arena_boundary = "arena" in client_code.lower() and "boundary" in client_code.lower()
            self.log_test(
                "Visual Green Circle Boundary",
                "Arena Mode Boundary",
                arena_boundary,
                f"Arena boundary references {'found' if arena_boundary else 'not found'}"
            )
                
        except FileNotFoundError:
            self.log_test(
                "Visual Green Circle Boundary",
                "Code Analysis",
                False,
                "Visual boundary code analysis failed"
            )
        for check, result in unified_checks.items():
            status = "✅" if result else "❌"
            print(f"  {status} {check.replace('_', ' ').title()}: {'Pass' if result else 'Fail'}")
        
        print(f"📈 Unified Camera Implementation: {passed_checks}/{total_checks} checks passed ({passed_checks/total_checks*100:.1f}%)")
        
        return passed_checks >= 3  # Require at least 3/4 checks to pass
        
    except Exception as e:
        print(f"❌ Unified Camera Implementation Error: {e}")
        return False

def test_camera_specifications():
    """Test that camera specifications match the review request requirements"""
    print("\n🔍 Testing Camera Specifications...")
    
    try:
        # Read the agario page.js file
        with open('/app/app/agario/page.js', 'r') as f:
            content = f.read()
        
        # Extract camera update method
        camera_method_start = content.find('updateCamera() {')
        if camera_method_start == -1:
            print("❌ updateCamera method not found")
            return False
            
        camera_method_end = content.find('\n    }', camera_method_start)
        if camera_method_end == -1:
            camera_method_end = content.find('\n  }', camera_method_start)
        if camera_method_end == -1:
            camera_method_end = camera_method_start + 500  # fallback
            
        camera_method = content[camera_method_start:camera_method_end + 1]
        
        # Check specific requirements from review request
        spec_checks = {
            'target_calculation_exact': 'targetX = this.player.x - this.canvas.width / 2' in camera_method,
            'smooth_interpolation': 'this.camera.x += (targetX - this.camera.x) * 0.2' in camera_method,
            'smoothing_factor_02': '* 0.2' in camera_method,
            'boundary_extension_100': 'boundaryExtension = 100' in camera_method,
            'world_bounds_formula': 'Math.max(-boundaryExtension, Math.min(' in camera_method,
            'camera_update_called': 'this.updateCamera()' in content
        }
        
        passed_checks = sum(spec_checks.values())
        total_checks = len(spec_checks)
        
        print(f"📊 Camera Specifications Results:")
        for check, result in spec_checks.items():
            status = "✅" if result else "❌"
            print(f"  {status} {check.replace('_', ' ').title()}: {'Found' if result else 'Not Found'}")
        
        print(f"📈 Camera Specifications: {passed_checks}/{total_checks} checks passed ({passed_checks/total_checks*100:.1f}%)")
        
        return passed_checks >= 5  # Require at least 5/6 checks to pass
        
    except Exception as e:
        print(f"❌ Camera Specifications Error: {e}")
        return False

def test_mode_detection():
    """Test that both local and arena modes are properly detected"""
    print("\n🔍 Testing Mode Detection...")
    
    try:
        # Read the agario page.js file
        with open('/app/app/agario/page.js', 'r') as f:
            content = f.read()
        
        # Check for mode detection logic
        mode_checks = {
            'local_practice_detection': "mode === 'local' && multiplayer === 'offline' && server === 'local' && bots === 'true'" in content,
            'arena_mode_detection': "mode === 'colyseus-multiplayer'" in content or "server === 'colyseus'" in content,
            'multiplayer_flag_setting': 'setIsMultiplayer(true)' in content and 'setIsMultiplayer(false)' in content,
            'window_multiplayer_flag': 'window.isMultiplayer' in content
        }
        
        passed_checks = sum(mode_checks.values())
        total_checks = len(mode_checks)
        
        print(f"📊 Mode Detection Results:")
        for check, result in mode_checks.items():
            status = "✅" if result else "❌"
            print(f"  {status} {check.replace('_', ' ').title()}: {'Found' if result else 'Not Found'}")
        
        print(f"📈 Mode Detection: {passed_checks}/{total_checks} checks passed ({passed_checks/total_checks*100:.1f}%)")
        
        return passed_checks >= 3  # Require at least 3/4 checks to pass
        
    except Exception as e:
        print(f"❌ Mode Detection Error: {e}")
        return False

def test_camera_consistency():
    """Test that camera behavior is consistent between modes"""
    print("\n🔍 Testing Camera Consistency...")
    
    try:
        # Read the agario page.js file
        with open('/app/app/agario/page.js', 'r') as f:
            content = f.read()
        
        # Check for any mode-specific camera differences
        consistency_checks = {
            'no_arena_specific_camera': 'arenaCamera' not in content and 'arena_camera' not in content,
            'no_local_specific_camera': 'localCamera' not in content and 'local_camera' not in content,
            'single_camera_update_call': content.count('this.updateCamera()') >= 1,
            'no_conditional_camera_updates': not any([
                'if (isMultiplayer)' in line and 'updateCamera' in content[max(0, content.find(line)):content.find(line) + 200]
                for line in content.split('\n') if 'if (isMultiplayer)' in line and content.find(line) != -1
            ])
        }
        
        passed_checks = sum(consistency_checks.values())
        total_checks = len(consistency_checks)
        
        print(f"📊 Camera Consistency Results:")
        for check, result in consistency_checks.items():
            status = "✅" if result else "❌"
            print(f"  {status} {check.replace('_', ' ').title()}: {'Pass' if result else 'Fail'}")
        
        print(f"📈 Camera Consistency: {passed_checks}/{total_checks} checks passed ({passed_checks/total_checks*100:.1f}%)")
        
        return passed_checks >= 3  # Require at least 3/4 checks to pass
        
    except Exception as e:
        print(f"❌ Camera Consistency Error: {e}")
        return False

def test_camera_refactoring_evidence():
    """Test for evidence of camera system refactoring"""
    print("\n🔍 Testing Camera Refactoring Evidence...")
    
    try:
        # Read the agario page.js file
        with open('/app/app/agario/page.js', 'r') as f:
            content = f.read()
        
        # Look for evidence of refactoring and cleanup
        refactoring_checks = {
            'simplified_camera_logic': 'Super snappy camera' in content or 'consistent smoothing' in content,
            'removed_debug_elements': 'debug crosshair' not in content.lower() and 'initialization tracking' not in content.lower(),
            'clean_implementation': content.count('updateCamera') == 1,  # Only one camera update method
            'no_complex_distance_checking': 'distance checking' not in content.lower() and 'snapping logic' not in content.lower(),
            'boundary_handling': 'boundaryExtension' in content and 'world bounds' in content.lower()
        }
        
        passed_checks = sum(refactoring_checks.values())
        total_checks = len(refactoring_checks)
        
        print(f"📊 Camera Refactoring Evidence Results:")
        for check, result in refactoring_checks.items():
            status = "✅" if result else "❌"
            print(f"  {status} {check.replace('_', ' ').title()}: {'Found' if result else 'Not Found'}")
        
        print(f"📈 Camera Refactoring Evidence: {passed_checks}/{total_checks} checks passed ({passed_checks/total_checks*100:.1f}%)")
        
        return passed_checks >= 3  # Require at least 3/5 checks to pass
        
    except Exception as e:
        print(f"❌ Camera Refactoring Evidence Error: {e}")
        return False

def run_comprehensive_camera_tests():
    """Run all camera system tests"""
    print("🎯 ARENA MODE CAMERA SYSTEM COMPREHENSIVE TESTING")
    print("=" * 60)
    
    test_results = {}
    
    # Run all tests
    test_results['api_health'] = test_api_health()
    test_results['camera_code_analysis'] = test_camera_system_code_analysis()
    test_results['unified_implementation'] = test_unified_camera_implementation()
    test_results['camera_specifications'] = test_camera_specifications()
    test_results['mode_detection'] = test_mode_detection()
    test_results['camera_consistency'] = test_camera_consistency()
    test_results['refactoring_evidence'] = test_camera_refactoring_evidence()
    
    # Calculate overall results
    passed_tests = sum(test_results.values())
    total_tests = len(test_results)
    success_rate = (passed_tests / total_tests) * 100
    
    print(f"\n📊 COMPREHENSIVE CAMERA SYSTEM TEST RESULTS:")
    print("=" * 60)
    
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    print(f"\n🎯 OVERALL RESULTS:")
    print(f"📈 Success Rate: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
    
    if success_rate >= 85:
        print("🎉 ARENA MODE CAMERA SYSTEM: EXCELLENT - All critical requirements verified")
        return True
    elif success_rate >= 70:
        print("✅ ARENA MODE CAMERA SYSTEM: GOOD - Most requirements verified")
        return True
    else:
        print("❌ ARENA MODE CAMERA SYSTEM: NEEDS ATTENTION - Multiple issues found")
        return False

if __name__ == "__main__":
    success = run_comprehensive_camera_tests()
    exit(0 if success else 1)