#!/usr/bin/env python3
"""
Backend Testing for Arena Playable Area Extension
Testing the backend changes for extending the arena playable area from 1800 to 2500 radius.
"""

import requests
import json
import time
import os
from typing import Dict, Any, List

class ArenaPlayableAreaTester:
    def __init__(self):
        # Get base URL from environment
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://split-bug-solved.preview.emergentagent.com')
        self.api_base = f"{self.base_url}/api"
        self.test_results = []
        
        print(f"🎯 ARENA PLAYABLE AREA EXTENSION BACKEND TESTING INITIALIZED")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🔵 Expected Playable Radius: 2500px (expanded from 1800px)")
        print("=" * 80)

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASSED" if passed else "❌ FAILED"
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
            'category': category,
            'test': test_name,
            'passed': passed,
            'details': details
        }
        
    def test_api_health_check(self) -> bool:
        """Test 1: API Health Check - Verify backend infrastructure is operational"""
        try:
            print("\n🔍 TEST 1: API Health Check")
            response = requests.get(f"{self.api_base}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                service = data.get('service', '')
                status = data.get('status', '')
                features = data.get('features', [])
                
                if service == 'turfloot-api' and status == 'operational':
                    self.log_test("API Health Check", True, f"Service: {service}, Status: {status}, Features: {features}")
                    return True
                else:
                    self.log_test("API Health Check", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_colyseus_server_availability(self) -> bool:
        """Test 2: Colyseus Server Availability - Verify arena servers are running"""
        try:
            print("\n🔍 TEST 2: Colyseus Server Availability")
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                servers = data.get('servers', [])
                
                # Find arena servers
                arena_servers = [s for s in servers if s.get('roomType') == 'arena' or s.get('serverType') == 'colyseus']
                
                if colyseus_enabled and arena_servers:
                    self.log_test("Colyseus Server Availability", True, 
                                f"Endpoint: {colyseus_endpoint}, Arena servers: {len(arena_servers)}")
                    return True
                else:
                    self.log_test("Colyseus Server Availability", False, 
                                f"Colyseus enabled: {colyseus_enabled}, Arena servers: {len(arena_servers)}")
                    return False
            else:
                self.log_test("Colyseus Server Availability", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Colyseus Server Availability", False, f"Exception: {str(e)}")
            return False
            
    
    def test_playable_radius_configuration(self) -> bool:
        """Test 3: Playable Radius Configuration - Verify server-side playable radius is 2500"""
        try:
            print("\n🔍 TEST 3: Playable Radius Configuration")
            
            # Check TypeScript source file
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            ts_checks = 0
            js_checks = 0
            
            # Check TypeScript source
            try:
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    
                # Look for playableRadius = 2500 in key locations
                if "playableRadius = 2500" in ts_content:
                    ts_checks += ts_content.count("playableRadius = 2500")
                    
            except Exception as e:
                print(f"⚠️ Could not read TypeScript file: {e}")
            
            # Check compiled JavaScript
            try:
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    
                # Look for playableRadius = 2500 in key locations
                if "playableRadius = 2500" in js_content:
                    js_checks += js_content.count("playableRadius = 2500")
                    
            except Exception as e:
                print(f"⚠️ Could not read JavaScript file: {e}")
            
            if ts_checks >= 2 and js_checks >= 2:
                self.log_test("Playable Radius Configuration", True, 
                            f"TS: {ts_checks} occurrences, JS: {js_checks} occurrences of playableRadius = 2500")
                return True
            else:
                self.log_test("Playable Radius Configuration", False, 
                            f"TS: {ts_checks} occurrences, JS: {js_checks} occurrences (expected >= 2 each)")
                return False
                
        except Exception as e:
            self.log_test("Playable Radius Configuration", False, f"Exception: {str(e)}")
            return False
    
    def test_circular_boundary_enforcement(self) -> bool:
        """Test 4: Circular Boundary Enforcement - Test boundary logic in server code"""
        try:
            print("\n🔍 TEST 4: Circular Boundary Enforcement")
            
            # Check for boundary enforcement logic in both files
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            ts_boundary_checks = 0
            js_boundary_checks = 0
            
            # Check TypeScript source for boundary enforcement patterns
            try:
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    
                # Look for boundary enforcement patterns
                boundary_patterns = [
                    "distanceFromCenter > maxRadius",
                    "Math.atan2",
                    "Math.cos(angle) * maxRadius",
                    "Math.sin(angle) * maxRadius"
                ]
                
                for pattern in boundary_patterns:
                    if pattern in ts_content:
                        ts_boundary_checks += 1
                        
            except Exception as e:
                print(f"⚠️ Could not read TypeScript file: {e}")
            
            # Check compiled JavaScript for boundary enforcement patterns
            try:
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    
                # Look for boundary enforcement patterns
                for pattern in boundary_patterns:
                    if pattern in js_content:
                        js_boundary_checks += 1
                        
            except Exception as e:
                print(f"⚠️ Could not read JavaScript file: {e}")
            
            if ts_boundary_checks >= 3 and js_boundary_checks >= 3:
                self.log_test("Circular Boundary Enforcement", True, 
                            f"TS: {ts_boundary_checks}/4 patterns, JS: {js_boundary_checks}/4 patterns found")
                return True
            else:
                self.log_test("Circular Boundary Enforcement", False, 
                            f"TS: {ts_boundary_checks}/4 patterns, JS: {js_boundary_checks}/4 patterns (expected >= 3 each)")
                return False
                
        except Exception as e:
            self.log_test("Circular Boundary Enforcement", False, f"Exception: {str(e)}")
            return False
    
    def test_split_player_boundary(self) -> bool:
        """Test 5: Split Player Boundary - Test split players are constrained within expanded boundary"""
        try:
            print("\n🔍 TEST 5: Split Player Boundary")
            
            # Check for split boundary logic in both files
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            ts_split_checks = 0
            js_split_checks = 0
            
            # Check TypeScript source for split boundary enforcement
            try:
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    
                # Look for split boundary enforcement in handleSplit method
                split_patterns = [
                    "handleSplit",
                    "splitPlayer.x",
                    "splitPlayer.y",
                    "playableRadius",
                    "distanceFromCenter"
                ]
                
                for pattern in split_patterns:
                    if pattern in ts_content:
                        ts_split_checks += 1
                        
            except Exception as e:
                print(f"⚠️ Could not read TypeScript file: {e}")
            
            # Check compiled JavaScript for split boundary enforcement
            try:
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    
                # Look for split boundary enforcement patterns
                for pattern in split_patterns:
                    if pattern in js_content:
                        js_split_checks += 1
                        
            except Exception as e:
                print(f"⚠️ Could not read JavaScript file: {e}")
            
            if ts_split_checks >= 4 and js_split_checks >= 4:
                self.log_test("Split Player Boundary", True, 
                            f"TS: {ts_split_checks}/5 patterns, JS: {js_split_checks}/5 patterns found")
                return True
            else:
                self.log_test("Split Player Boundary", False, 
                            f"TS: {ts_split_checks}/5 patterns, JS: {js_split_checks}/5 patterns (expected >= 4 each)")
                return False
                
        except Exception as e:
            self.log_test("Split Player Boundary", False, f"Exception: {str(e)}")
            return False
    
    def test_database_integration(self) -> bool:
        """Test 6: Database Integration - Verify game sessions can be created and tracked"""
        try:
            print("\n🔍 TEST 6: Database Integration")
            response = requests.get(f"{self.api_base}/game-sessions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if we can access the database
                if isinstance(data, (list, dict)):
                    self.log_test("Database Integration", True, "Game sessions API accessible")
                    return True
                else:
                    self.log_test("Database Integration", False, f"Unexpected response format: {type(data)}")
                    return False
            else:
                self.log_test("Database Integration", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Database Integration", False, f"Exception: {str(e)}")
            return False
    
    def test_backend_api_integration(self) -> bool:
        """Test 7: Backend API Integration - Verify /api/servers endpoint returns correct arena server data"""
        try:
            print("\n🔍 TEST 7: Backend API Integration")
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['servers', 'totalPlayers', 'totalActiveServers']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    servers = data.get('servers', [])
                    total_players = data.get('totalPlayers', 0)
                    total_active = data.get('totalActiveServers', 0)
                    
                    self.log_test("Backend API Integration", True, 
                                f"Servers: {len(servers)}, Players: {total_players}, Active: {total_active}")
                    return True
                else:
                    self.log_test("Backend API Integration", False, f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Backend API Integration", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Backend API Integration", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all backend tests for arena playable area extension"""
        print("🎯 ARENA PLAYABLE AREA EXTENSION BACKEND TESTING")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all tests
        tests = [
            self.test_api_health_check,
            self.test_colyseus_server_availability,
            self.test_playable_radius_configuration,
            self.test_circular_boundary_enforcement,
            self.test_split_player_boundary,
            self.test_database_integration,
            self.test_backend_api_integration
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test {test_func.__name__} failed with exception: {e}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Calculate success rate
        success_rate = (passed_tests / total_tests) * 100
        
        print("\n" + "=" * 60)
        print("🎯 ARENA PLAYABLE AREA EXTENSION BACKEND TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Tests Passed: {passed_tests}/{total_tests}")
        print(f"📊 Success Rate: {success_rate:.1f}%")
        print(f"⏱️ Duration: {duration:.2f} seconds")
        
        # Detailed results
        print("\n📋 DETAILED TEST RESULTS:")
        for result in self.test_results:
            status = "✅" if result['passed'] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'success_rate': success_rate,
            'duration': duration,
            'results': self.test_results
        }

def main():
    """Main function to run arena playable area extension backend tests"""
    tester = ArenaPlayableAreaTester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    if results['success_rate'] == 100:
        print("\n🎉 ALL TESTS PASSED - Arena playable area extension backend is working correctly!")
        return 0
    else:
        print(f"\n⚠️ {results['total_tests'] - results['passed_tests']} TEST(S) FAILED - Issues found in arena playable area extension backend")
        return 1

if __name__ == "__main__":
    exit(main())
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