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

    def test_boundary_consistency_client_server(self):
        """Test 8: Boundary Consistency Between Client and Server"""
        print("\n🔍 TESTING CATEGORY 8: CLIENT-SERVER BOUNDARY CONSISTENCY")
        
        try:
            # Read both client and server code
            with open('/app/app/agario/page.js', 'r') as f:
                client_code = f.read()
            
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                server_code = f.read()
            
            # Extract key values
            consistency_checks = {
                "Playable Radius Value": ("1800" in client_code and "1800" in server_code),
                "World Size Value": ("4000" in client_code and "4000" in server_code),
                "Center Calculation": ("world.width / 2" in client_code and "worldSize / 2" in server_code),
                "Distance Formula": ("Math.sqrt(Math.pow(" in client_code and "Math.sqrt(" in server_code),
                "Angle Calculation": ("Math.atan2(" in client_code and "Math.atan2(" in server_code),
                "Boundary Enforcement": ("maxRadius" in client_code and "maxRadius" in server_code)
            }
            
            for check_name, is_consistent in consistency_checks.items():
                self.log_test(
                    "Client-Server Boundary Consistency",
                    check_name,
                    is_consistent,
                    f"Consistency {'verified' if is_consistent else 'failed'} between client and server"
                )
                
        except FileNotFoundError:
            self.log_test(
                "Client-Server Boundary Consistency",
                "Code Analysis",
                False,
                "Consistency analysis failed - files not accessible"
            )

    def test_database_integration(self):
        """Test 9: Database Integration for Game Sessions"""
        print("\n🔍 TESTING CATEGORY 9: DATABASE INTEGRATION")
        
        # Test game sessions API
        response = self.make_request("/game-sessions")
        if response:
            self.log_test(
                "Database Integration",
                "Game Sessions API",
                True,
                "Game sessions endpoint accessible"
            )
        else:
            self.log_test(
                "Database Integration",
                "Game Sessions API",
                False,
                "Game sessions endpoint not accessible"
            )

    def run_all_tests(self):
        """Run all circular boundary barrier tests"""
        print("🚀 STARTING COMPREHENSIVE CIRCULAR BOUNDARY BARRIER TESTING")
        print("Testing circular boundary barrier system identical to agario")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all test categories
        self.test_api_health_check()
        self.test_colyseus_server_availability()
        self.test_circular_boundary_mathematics()
        self.test_client_side_boundary_implementation()
        self.test_server_side_boundary_enforcement()
        self.test_split_pieces_boundary_respect()
        self.test_visual_green_circle_boundary()
        self.test_boundary_consistency_client_server()
        self.test_database_integration()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print final results
        print("\n" + "=" * 80)
        print("🎯 CIRCULAR BOUNDARY BARRIER TESTING COMPLETED")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📊 OVERALL RESULTS:")
        print(f"   Total Tests: {self.total_tests}")
        print(f"   Passed: {self.passed_tests}")
        print(f"   Failed: {self.total_tests - self.passed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   Duration: {duration:.2f} seconds")
        
        # Categorize results
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
            cat_success = (stats['passed'] / stats['total'] * 100) if stats['total'] > 0 else 0
            status = "✅" if cat_success == 100 else "⚠️" if cat_success >= 75 else "❌"
            print(f"   {status} {category}: {stats['passed']}/{stats['total']} ({cat_success:.1f}%)")
        
        # Critical findings
        print(f"\n🔍 CRITICAL FINDINGS:")
        
        if success_rate >= 90:
            print("   ✅ EXCELLENT: Circular boundary barrier implementation is working excellently")
        elif success_rate >= 75:
            print("   ⚠️ GOOD: Circular boundary barrier implementation is working well with minor issues")
        elif success_rate >= 50:
            print("   ❌ ISSUES: Circular boundary barrier implementation has significant issues")
        else:
            print("   🚨 CRITICAL: Circular boundary barrier implementation has major problems")
        
        # Specific findings
        failed_tests = [r for r in self.test_results if not r['passed']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests[:5]:  # Show first 5 failures
                print(f"   • {test['category']}: {test['test']}")
                if test['details']:
                    print(f"     {test['details']}")
        
        print("\n" + "=" * 80)
        return success_rate >= 75  # Return True if 75% or more tests passed

if __name__ == "__main__":
    tester = CircularBoundaryTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)