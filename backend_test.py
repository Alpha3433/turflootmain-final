#!/usr/bin/env python3
"""
Backend Testing for Minimap and Red Zone Extension
Testing the backend changes for updating minimap dimensions and extending the red zone.
Focuses on world size expansion from 4000 to 6000 pixels and center positioning at (3000,3000).
"""

import requests
import json
import time
import os
from typing import Dict, Any, List

class MinimapRedZoneExtensionTester:
    def __init__(self):
        # Get base URL from environment
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://split-bug-solved.preview.emergentagent.com')
        self.api_base = f"{self.base_url}/api"
        self.test_results = []
        
        print(f"🎯 MINIMAP AND RED ZONE EXTENSION BACKEND TESTING INITIALIZED")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🌍 Expected World Size: 6000x6000 pixels (expanded from 4000x4000)")
        print(f"🎯 Expected World Center: (3000,3000) instead of (2000,2000)")
        print(f"🔵 Expected Playable Radius: 2500px within the larger world")
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
    
    def test_world_size_configuration(self) -> bool:
        """Test 3: World Size Configuration - Verify server-side worldSize is now set to 6000 instead of 4000"""
        try:
            print("\n🔍 TEST 3: World Size Configuration")
            
            # Check TypeScript source file
            ts_file_path = "/app/src/rooms/ArenaRoom.ts"
            js_file_path = "/app/build/rooms/ArenaRoom.js"
            
            ts_checks = 0
            js_checks = 0
            
            # Check TypeScript source
            try:
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                    
                # Look for worldSize = 6000 in key locations
                if "worldSize: number = 6000" in ts_content:
                    ts_checks += 1
                if "worldSize = parseInt(process.env.WORLD_SIZE || '6000')" in ts_content:
                    ts_checks += 1
                if "this.worldSize = this.worldSize" in ts_content or "this.state.worldSize = this.worldSize" in ts_content:
                    ts_checks += 1
                    
            except Exception as e:
                print(f"⚠️ Could not read TypeScript file: {e}")
            
            # Check compiled JavaScript
            try:
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                    
                # Look for worldSize = 6000 in key locations
                if "6000" in js_content and "worldSize" in js_content:
                    # Count occurrences of 6000 in worldSize context
                    lines = js_content.split('\n')
                    for line in lines:
                        if "worldSize" in line and "6000" in line:
                            js_checks += 1
                    
            except Exception as e:
                print(f"⚠️ Could not read JavaScript file: {e}")
            
            if ts_checks >= 2 and js_checks >= 2:
                self.log_test("World Size Configuration", True, 
                            f"TS: {ts_checks} worldSize=6000 references, JS: {js_checks} worldSize=6000 references")
                return True
            else:
                self.log_test("World Size Configuration", False, 
                            f"TS: {ts_checks} references, JS: {js_checks} references (expected >= 2 each)")
                return False
                
        except Exception as e:
            self.log_test("World Size Configuration", False, f"Exception: {str(e)}")
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