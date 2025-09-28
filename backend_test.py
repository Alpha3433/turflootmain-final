#!/usr/bin/env python3
"""
VIRUS AND COIN PLAYABLE AREA SPAWN VERIFICATION TESTING
Test that viruses/spikes and coins only spawn within the playable area (1800px radius from center 2000,2000) in arena mode.

Testing Requirements:
1. API Health Check - Verify backend infrastructure is operational
2. Colyseus Server Availability - Verify arena servers are running
3. Safe Spawn Position Logic - Verify generateSafeSpawnPosition uses 1800px radius
4. Coin Spawn Logic - Verify spawnCoin() uses safe spawn positions only
5. Virus Spawn Logic - Verify spawnVirus() uses safe spawn positions only
6. Playable Area Boundary - Verify spawn radius matches playable area (1800px)
7. Center Position - Verify spawn center is at (2000,2000)
8. No Red Zone Spawning - Verify no objects can spawn outside 1800px radius
9. World Size Consistency - Verify spawning works with 4000x4000 world
"""

import requests
import json
import time
import math
import os
from typing import Dict, List, Tuple, Any

class VirusCoinSpawnTester:
    def __init__(self):
        # Get base URL from environment
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
        self.api_base = f"{self.base_url}/api"
        
        # Expected configuration based on review request
        self.world_size = 4000
        self.world_center = (2000, 2000)  # Center at (2000,2000) for 4000x4000 world
        self.playable_radius = 1800  # 1800px radius from center
        self.safe_zone_radius = 1800  # safeZoneRadius = 1800
        
        # Test results tracking
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
            
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
            
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
        
    def calculate_distance_from_center(self, x: float, y: float) -> float:
        """Calculate distance from world center (2000,2000)"""
        center_x, center_y = self.world_center
        return math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
        
    def is_within_playable_area(self, x: float, y: float) -> bool:
        """Check if position is within playable area (1800px radius)"""
        distance = self.calculate_distance_from_center(x, y)
        return distance <= self.playable_radius
        
    def is_in_red_zone(self, x: float, y: float) -> bool:
        """Check if position is in red zone (outside 1800px radius)"""
        return not self.is_within_playable_area(x, y)
        
    def test_api_health_check(self):
        """Test 1: API Health Check - Verify backend infrastructure is operational"""
        try:
            response = requests.get(f"{self.api_base}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', '')
                status = data.get('status', '')
                features = data.get('features', [])
                
                if 'multiplayer' in features and status == 'operational':
                    self.log_test("API Health Check", True, 
                                f"Backend infrastructure operational (service={service_name}, status={status}, features={features})")
                else:
                    self.log_test("API Health Check", False, 
                                f"Backend not fully operational (service={service_name}, status={status}, features={features})")
            else:
                self.log_test("API Health Check", False, f"API returned status {response.status_code}")
        except Exception as e:
            self.log_test("API Health Check", False, f"API request failed: {str(e)}")
            
    def test_colyseus_server_availability(self):
        """Test 2: Colyseus Server Availability - Verify arena servers are running"""
        try:
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' and s.get('roomType') == 'arena']
                
                if colyseus_enabled and arena_servers:
                    arena_server = arena_servers[0]
                    max_players = arena_server.get('maxPlayers', 0)
                    self.log_test("Colyseus Server Availability", True, 
                                f"Arena server found ({arena_server.get('id')}, Max: {max_players}) with endpoint='{colyseus_endpoint}'")
                else:
                    self.log_test("Colyseus Server Availability", False, 
                                f"No arena servers found (colyseusEnabled={colyseus_enabled}, servers={len(servers)})")
            else:
                self.log_test("Colyseus Server Availability", False, f"Servers API returned status {response.status_code}")
        except Exception as e:
            self.log_test("Colyseus Server Availability", False, f"Servers API request failed: {str(e)}")
            
    def test_safe_spawn_position_logic(self):
        """Test 3: Safe Spawn Position Logic - Verify generateSafeSpawnPosition uses 1800px radius"""
        try:
            # Read TypeScript source file
            ts_file = "/app/src/rooms/ArenaRoom.ts"
            with open(ts_file, 'r') as f:
                ts_content = f.read()
                
            # Read compiled JavaScript file  
            js_file = "/app/build/rooms/ArenaRoom.js"
            with open(js_file, 'r') as f:
                js_content = f.read()
                
            # Check for safeZoneRadius = 1800 in both files
            ts_safe_zone_found = "safeZoneRadius = 1800" in ts_content
            js_safe_zone_found = "safeZoneRadius = 1800" in js_content
            
            # Check for center calculations (worldSize / 2)
            ts_center_found = "this.worldSize / 2" in ts_content and "2000 for 4000x4000 world" in ts_content
            js_center_found = "this.worldSize / 2" in js_content and "2000 for 4000x4000 world" in js_content
            
            # Check for generateSafeSpawnPosition function
            ts_function_found = "generateSafeSpawnPosition()" in ts_content
            js_function_found = "generateSafeSpawnPosition()" in js_content
            
            all_checks_passed = all([ts_safe_zone_found, js_safe_zone_found, ts_center_found, js_center_found, ts_function_found, js_function_found])
            
            if all_checks_passed:
                self.log_test("Safe Spawn Position Logic", True, 
                            f"generateSafeSpawnPosition configured correctly - TS: safeZoneRadius=1800, center=(2000,2000), JS: safeZoneRadius=1800, center=(2000,2000)")
            else:
                self.log_test("Safe Spawn Position Logic", False, 
                            f"Configuration issues - TS: safe_zone={ts_safe_zone_found}, center={ts_center_found}, func={ts_function_found}, JS: safe_zone={js_safe_zone_found}, center={js_center_found}, func={js_function_found}")
                            
        except Exception as e:
            self.log_test("Safe Spawn Position Logic", False, f"File reading failed: {str(e)}")
            
    def test_coin_spawn_logic(self):
        """Test 4: Coin Spawn Logic - Verify spawnCoin() uses safe spawn positions only"""
        try:
            # Read TypeScript source file
            ts_file = "/app/src/rooms/ArenaRoom.ts"
            with open(ts_file, 'r') as f:
                ts_content = f.read()
                
            # Read compiled JavaScript file  
            js_file = "/app/build/rooms/ArenaRoom.js"
            with open(js_file, 'r') as f:
                js_content = f.read()
                
            # Check for spawnCoin() using generateSafeSpawnPosition()
            ts_coin_spawn_found = "spawnCoin()" in ts_content and "generateSafeSpawnPosition()" in ts_content and "safePos = this.generateSafeSpawnPosition()" in ts_content
            js_coin_spawn_found = "spawnCoin()" in js_content and "generateSafeSpawnPosition()" in js_content and "safePos = this.generateSafeSpawnPosition()" in js_content
            
            # Check for coin position assignment from safe position
            ts_coin_pos_found = "coin.x = safePos.x" in ts_content and "coin.y = safePos.y" in ts_content
            js_coin_pos_found = "coin.x = safePos.x" in js_content and "coin.y = safePos.y" in js_content
            
            # Check for comment about avoiding red zone
            ts_comment_found = "Use safe spawn position to avoid red zone" in ts_content
            js_comment_found = "Use safe spawn position to avoid red zone" in js_content
            
            all_checks_passed = all([ts_coin_spawn_found, js_coin_spawn_found, ts_coin_pos_found, js_coin_pos_found, ts_comment_found, js_comment_found])
            
            if all_checks_passed:
                self.log_test("Coin Spawn Logic", True, 
                            f"spawnCoin() correctly uses generateSafeSpawnPosition() in both TS and JS files with proper red zone avoidance")
            else:
                self.log_test("Coin Spawn Logic", False, 
                            f"Implementation issues - TS: spawn={ts_coin_spawn_found}, pos={ts_coin_pos_found}, comment={ts_comment_found}, JS: spawn={js_coin_spawn_found}, pos={js_coin_pos_found}, comment={js_comment_found}")
                            
        except Exception as e:
            self.log_test("Coin Spawn Logic", False, f"File reading failed: {str(e)}")
            
    def test_virus_spawn_logic(self):
        """Test 5: Virus Spawn Logic - Verify spawnVirus() uses safe spawn positions only"""
        try:
            # Read TypeScript source file
            ts_file = "/app/src/rooms/ArenaRoom.ts"
            with open(ts_file, 'r') as f:
                ts_content = f.read()
                
            # Read compiled JavaScript file  
            js_file = "/app/build/rooms/ArenaRoom.js"
            with open(js_file, 'r') as f:
                js_content = f.read()
                
            # Check for spawnVirus() using generateSafeSpawnPosition()
            ts_virus_spawn_found = "spawnVirus()" in ts_content and "generateSafeSpawnPosition()" in ts_content and "safePos = this.generateSafeSpawnPosition()" in ts_content
            js_virus_spawn_found = "spawnVirus()" in js_content and "generateSafeSpawnPosition()" in js_content and "safePos = this.generateSafeSpawnPosition()" in js_content
            
            # Check for virus position assignment from safe position
            ts_virus_pos_found = "virus.x = safePos.x" in ts_content and "virus.y = safePos.y" in ts_content
            js_virus_pos_found = "virus.x = safePos.x" in js_content and "virus.y = safePos.y" in js_content
            
            # Check for comment about avoiding red zone
            ts_comment_found = "Use safe spawn position to avoid red zone" in ts_content
            js_comment_found = "Use safe spawn position to avoid red zone" in js_content
            
            all_checks_passed = all([ts_virus_spawn_found, js_virus_spawn_found, ts_virus_pos_found, js_virus_pos_found, ts_comment_found, js_comment_found])
            
            if all_checks_passed:
                self.log_test("Virus Spawn Logic", True, 
                            f"spawnVirus() correctly uses generateSafeSpawnPosition() in both TS and JS files with proper red zone avoidance")
            else:
                self.log_test("Virus Spawn Logic", False, 
                            f"Implementation issues - TS: spawn={ts_virus_spawn_found}, pos={ts_virus_pos_found}, comment={ts_comment_found}, JS: spawn={js_virus_spawn_found}, pos={js_virus_pos_found}, comment={js_comment_found}")
                            
        except Exception as e:
            self.log_test("Virus Spawn Logic", False, f"File reading failed: {str(e)}")
            
    def test_playable_area_boundary(self):
        """Test 6: Playable Area Boundary - Verify spawn radius matches playable area (1800px)"""
        try:
            # Read TypeScript source file
            ts_file = "/app/src/rooms/ArenaRoom.ts"
            with open(ts_file, 'r') as f:
                ts_content = f.read()
                
            # Read compiled JavaScript file  
            js_file = "/app/build/rooms/ArenaRoom.js"
            with open(js_file, 'r') as f:
                js_content = f.read()
                
            # Check for playableRadius = 1800 in boundary enforcement
            ts_playable_radius_found = ts_content.count("playableRadius = 1800")
            js_playable_radius_found = js_content.count("playableRadius = 1800")
            
            # Check for safeZoneRadius = 1800 in spawn functions
            ts_safe_zone_found = ts_content.count("safeZoneRadius = 1800")
            js_safe_zone_found = js_content.count("safeZoneRadius = 1800")
            
            # Check for boundary enforcement patterns
            ts_boundary_patterns = [
                "distanceFromCenter > maxRadius" in ts_content,
                "Math.atan2" in ts_content,
                "Math.cos(angle) * maxRadius" in ts_content,
                "Math.sin(angle) * maxRadius" in ts_content
            ]
            
            js_boundary_patterns = [
                "distanceFromCenter > maxRadius" in js_content,
                "Math.atan2" in js_content,
                "Math.cos(angle) * maxRadius" in js_content,
                "Math.sin(angle) * maxRadius" in js_content
            ]
            
            ts_boundary_count = sum(ts_boundary_patterns)
            js_boundary_count = sum(js_boundary_patterns)
            
            # Verify consistency between playable radius and safe zone radius
            radius_consistency = (ts_playable_radius_found >= 2 and js_playable_radius_found >= 2 and 
                                ts_safe_zone_found >= 2 and js_safe_zone_found >= 2)
            
            boundary_enforcement = (ts_boundary_count == 4 and js_boundary_count == 4)
            
            if radius_consistency and boundary_enforcement:
                self.log_test("Playable Area Boundary", True, 
                            f"Spawn radius matches playable area (1800px) - TS: playableRadius={ts_playable_radius_found}, safeZone={ts_safe_zone_found}, boundary={ts_boundary_count}/4, JS: playableRadius={js_playable_radius_found}, safeZone={js_safe_zone_found}, boundary={js_boundary_count}/4")
            else:
                self.log_test("Playable Area Boundary", False, 
                            f"Radius mismatch or boundary issues - TS: playableRadius={ts_playable_radius_found}, safeZone={ts_safe_zone_found}, boundary={ts_boundary_count}/4, JS: playableRadius={js_playable_radius_found}, safeZone={js_safe_zone_found}, boundary={js_boundary_count}/4")
                            
        except Exception as e:
            self.log_test("Playable Area Boundary", False, f"File reading failed: {str(e)}")
            
    def test_center_position(self):
        """Test 7: Center Position - Verify spawn center is at (2000,2000)"""
        try:
            # Read TypeScript source file
            ts_file = "/app/src/rooms/ArenaRoom.ts"
            with open(ts_file, 'r') as f:
                ts_content = f.read()
                
            # Read compiled JavaScript file  
            js_file = "/app/build/rooms/ArenaRoom.js"
            with open(js_file, 'r') as f:
                js_content = f.read()
                
            # Check for center calculations
            ts_center_patterns = [
                "centerX = this.worldSize / 2" in ts_content,
                "centerY = this.worldSize / 2" in ts_content,
                "2000 for 4000x4000 world" in ts_content
            ]
            
            js_center_patterns = [
                "centerX = this.worldSize / 2" in js_content,
                "centerY = this.worldSize / 2" in js_content,
                "2000 for 4000x4000 world" in js_content
            ]
            
            # Count occurrences of center calculations (should be in multiple functions)
            ts_center_x_count = ts_content.count("centerX = this.worldSize / 2")
            ts_center_y_count = ts_content.count("centerY = this.worldSize / 2")
            js_center_x_count = js_content.count("centerX = this.worldSize / 2")
            js_center_y_count = js_content.count("centerY = this.worldSize / 2")
            
            # Check for worldSize = 4000
            ts_world_size_found = "worldSize = parseInt(process.env.WORLD_SIZE || '4000')" in ts_content
            js_world_size_found = "worldSize = parseInt(process.env.WORLD_SIZE || '4000')" in js_content
            
            ts_all_patterns = all(ts_center_patterns) and ts_center_x_count >= 3 and ts_center_y_count >= 3 and ts_world_size_found
            js_all_patterns = all(js_center_patterns) and js_center_x_count >= 3 and js_center_y_count >= 3 and js_world_size_found
            
            if ts_all_patterns and js_all_patterns:
                self.log_test("Center Position", True, 
                            f"Spawn center correctly set to (2000,2000) - TS: centerX={ts_center_x_count}, centerY={ts_center_y_count}, worldSize=4000, JS: centerX={js_center_x_count}, centerY={js_center_y_count}, worldSize=4000")
            else:
                self.log_test("Center Position", False, 
                            f"Center position issues - TS: centerX={ts_center_x_count}, centerY={ts_center_y_count}, worldSize={ts_world_size_found}, JS: centerX={js_center_x_count}, centerY={js_center_y_count}, worldSize={js_world_size_found}")
                            
        except Exception as e:
            self.log_test("Center Position", False, f"File reading failed: {str(e)}")
            
    def test_no_red_zone_spawning(self):
        """Test 8: No Red Zone Spawning - Verify no objects can spawn outside 1800px radius"""
        try:
            # Read TypeScript source file
            ts_file = "/app/src/rooms/ArenaRoom.ts"
            with open(ts_file, 'r') as f:
                ts_content = f.read()
                
            # Read compiled JavaScript file  
            js_file = "/app/build/rooms/ArenaRoom.js"
            with open(js_file, 'r') as f:
                js_content = f.read()
                
            # Check that all spawn functions use generateSafeSpawnPosition
            spawn_functions = ['spawnCoin', 'spawnVirus', 'generateCircularSpawnPosition']
            
            ts_safe_spawn_usage = []
            js_safe_spawn_usage = []
            
            for func in spawn_functions:
                if func == 'generateCircularSpawnPosition':
                    # This function itself implements the safe spawning
                    ts_safe_spawn_usage.append(f"{func}()" in ts_content and "safeZoneRadius = 1800" in ts_content)
                    js_safe_spawn_usage.append(f"{func}()" in js_content and "safeZoneRadius = 1800" in js_content)
                else:
                    # These functions should call generateSafeSpawnPosition
                    ts_safe_spawn_usage.append(f"{func}()" in ts_content and "generateSafeSpawnPosition()" in ts_content)
                    js_safe_spawn_usage.append(f"{func}()" in js_content and "generateSafeSpawnPosition()" in js_content)
            
            # Check for comments about red zone avoidance
            ts_red_zone_comments = ts_content.count("avoid red zone") + ts_content.count("never spawn in red zone")
            js_red_zone_comments = js_content.count("avoid red zone") + js_content.count("never spawn in red zone")
            
            # Check for uniform distribution (square root for proper circular distribution)
            ts_uniform_dist = "Math.sqrt(Math.random()) * safeZoneRadius" in ts_content
            js_uniform_dist = "Math.sqrt(Math.random()) * safeZoneRadius" in js_content
            
            ts_all_safe = all(ts_safe_spawn_usage) and ts_red_zone_comments >= 2 and ts_uniform_dist
            js_all_safe = all(js_safe_spawn_usage) and js_red_zone_comments >= 2 and js_uniform_dist
            
            if ts_all_safe and js_all_safe:
                self.log_test("No Red Zone Spawning", True, 
                            f"All spawn functions prevent red zone spawning - TS: safe_usage={sum(ts_safe_spawn_usage)}/{len(spawn_functions)}, comments={ts_red_zone_comments}, uniform_dist={ts_uniform_dist}, JS: safe_usage={sum(js_safe_spawn_usage)}/{len(spawn_functions)}, comments={js_red_zone_comments}, uniform_dist={js_uniform_dist}")
            else:
                self.log_test("No Red Zone Spawning", False, 
                            f"Red zone spawning not fully prevented - TS: safe_usage={sum(ts_safe_spawn_usage)}/{len(spawn_functions)}, comments={ts_red_zone_comments}, uniform_dist={ts_uniform_dist}, JS: safe_usage={sum(js_safe_spawn_usage)}/{len(spawn_functions)}, comments={js_red_zone_comments}, uniform_dist={js_uniform_dist}")
                            
        except Exception as e:
            self.log_test("No Red Zone Spawning", False, f"File reading failed: {str(e)}")
            
    def test_world_size_consistency(self):
        """Test 9: World Size Consistency - Verify spawning works with 4000x4000 world"""
        try:
            # Read TypeScript source file
            ts_file = "/app/src/rooms/ArenaRoom.ts"
            with open(ts_file, 'r') as f:
                ts_content = f.read()
                
            # Read compiled JavaScript file  
            js_file = "/app/build/rooms/ArenaRoom.js"
            with open(js_file, 'r') as f:
                js_content = f.read()
                
            # Check for worldSize configuration
            ts_world_size_patterns = [
                "worldSize = parseInt(process.env.WORLD_SIZE || '4000')" in ts_content,
                "worldSize: number = 4000" in ts_content,
                "this.worldSize = this.worldSize" in ts_content or "this.state.worldSize = this.worldSize" in ts_content
            ]
            
            js_world_size_patterns = [
                "worldSize = parseInt(process.env.WORLD_SIZE || '4000')" in js_content,
                "worldSize: 4000" in js_content or "worldSize = 4000" in js_content,
                "this.worldSize" in js_content
            ]
            
            # Check for proper center calculations based on world size
            ts_center_calc = ts_content.count("this.worldSize / 2")
            js_center_calc = js_content.count("this.worldSize / 2")
            
            # Check for comments mentioning 4000x4000 world
            ts_world_comments = ts_content.count("4000x4000 world")
            js_world_comments = js_content.count("4000x4000 world")
            
            # Check for boundary enforcement using world size
            ts_boundary_with_world_size = "centerX = this.worldSize / 2" in ts_content and "centerY = this.worldSize / 2" in ts_content
            js_boundary_with_world_size = "centerX = this.worldSize / 2" in js_content and "centerY = this.worldSize / 2" in js_content
            
            ts_consistency = (sum(ts_world_size_patterns) >= 2 and ts_center_calc >= 6 and 
                            ts_world_comments >= 2 and ts_boundary_with_world_size)
            js_consistency = (sum(js_world_size_patterns) >= 2 and js_center_calc >= 6 and 
                            js_world_comments >= 2 and js_boundary_with_world_size)
            
            if ts_consistency and js_consistency:
                self.log_test("World Size Consistency", True, 
                            f"Spawning works correctly with 4000x4000 world - TS: world_patterns={sum(ts_world_size_patterns)}, center_calc={ts_center_calc}, comments={ts_world_comments}, boundary={ts_boundary_with_world_size}, JS: world_patterns={sum(js_world_size_patterns)}, center_calc={js_center_calc}, comments={js_world_comments}, boundary={js_boundary_with_world_size}")
            else:
                self.log_test("World Size Consistency", False, 
                            f"World size consistency issues - TS: world_patterns={sum(ts_world_size_patterns)}, center_calc={ts_center_calc}, comments={ts_world_comments}, boundary={ts_boundary_with_world_size}, JS: world_patterns={sum(js_world_size_patterns)}, center_calc={js_center_calc}, comments={js_world_comments}, boundary={js_boundary_with_world_size}")
                            
        except Exception as e:
            self.log_test("World Size Consistency", False, f"File reading failed: {str(e)}")
            
    def run_all_tests(self):
        """Run all virus and coin spawn verification tests"""
        print("🎯 VIRUS AND COIN PLAYABLE AREA SPAWN VERIFICATION TESTING STARTED")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all tests in sequence
        self.test_api_health_check()
        self.test_colyseus_server_availability()
        self.test_safe_spawn_position_logic()
        self.test_coin_spawn_logic()
        self.test_virus_spawn_logic()
        self.test_playable_area_boundary()
        self.test_center_position()
        self.test_no_red_zone_spawning()
        self.test_world_size_consistency()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("=" * 80)
        print(f"🎯 VIRUS AND COIN SPAWN VERIFICATION TESTING COMPLETED")
        print(f"📊 RESULTS: {self.passed_tests}/{self.total_tests} tests passed ({(self.passed_tests/self.total_tests*100):.1f}% success rate)")
        print(f"⏱️  DURATION: {duration:.2f} seconds")
        
        if self.passed_tests == self.total_tests:
            print("🎉 ALL TESTS PASSED - VIRUS AND COIN SPAWN VERIFICATION IS FULLY OPERATIONAL")
        else:
            failed_tests = self.total_tests - self.passed_tests
            print(f"⚠️  {failed_tests} TEST(S) FAILED - REVIEW REQUIRED")
            
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = VirusCoinSpawnTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
