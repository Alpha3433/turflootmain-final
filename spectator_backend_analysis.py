#!/usr/bin/env python3
"""
TurfLoot Spectator Mode Backend Analysis
Analyzes the backend implementation for spectator functionality without requiring live Socket.IO connections.
Tests code structure, method implementation, and API endpoint availability.
"""

import os
import re
import json
import time
import requests
from datetime import datetime

class SpectatorBackendAnalyzer:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.base_url = "http://localhost:3000"
        
    def log_test(self, test_name, passed, details="", error_msg=""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            self.failed_tests += 1
            status = "❌ FAILED"
            
        result = {
            'test_name': test_name,
            'status': status,
            'passed': passed,
            'details': details,
            'error': error_msg,
            'timestamp': datetime.now().isoformat()
        }
        
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error_msg:
            print(f"   Error: {error_msg}")
        print()

    def analyze_gameserver_code(self):
        """Analyze the gameServer.js file for spectator implementation"""
        print("🔍 Analyzing gameServer.js for Spectator Implementation...")
        
        try:
            with open('/app/lib/gameServer.js', 'r') as f:
                code = f.read()
            
            # Test 1: Check for spectator data structures
            spectator_map_found = 'this.spectators = new Map()' in code
            max_spectators_found = 'this.maxSpectators = 50' in code or 'maxSpectators' in code
            
            self.log_test("Spectator Data Structures", 
                         spectator_map_found and max_spectators_found,
                         f"Spectators Map: {spectator_map_found}, Max Spectators: {max_spectators_found}")
            
            # Test 2: Check for spectator management methods
            add_spectator_method = 'async addSpectator(socket, userInfo)' in code
            remove_spectator_method = 'removeSpectator(socketId)' in code
            
            self.log_test("Spectator Management Methods",
                         add_spectator_method and remove_spectator_method,
                         f"addSpectator: {add_spectator_method}, removeSpectator: {remove_spectator_method}")
            
            # Test 3: Check for spectator Socket.IO handlers
            join_as_spectator = "socket.on('join_as_spectator'" in code
            spectator_camera_control = "socket.on('spectator_camera_control'" in code
            spectator_join_game = "socket.on('spectator_join_game'" in code
            
            self.log_test("Spectator Socket.IO Handlers",
                         join_as_spectator and spectator_camera_control and spectator_join_game,
                         f"join_as_spectator: {join_as_spectator}, camera_control: {spectator_camera_control}, join_game: {spectator_join_game}")
            
            # Test 4: Check for enhanced game state broadcasting
            spectator_game_state = 'sendSpectatorGameState' in code
            enhanced_broadcast = 'spectator_game_state' in code
            leaderboard_method = 'getLeaderboard()' in code
            
            self.log_test("Enhanced Game State Broadcasting",
                         spectator_game_state and enhanced_broadcast and leaderboard_method,
                         f"sendSpectatorGameState: {spectator_game_state}, enhanced_broadcast: {enhanced_broadcast}, leaderboard: {leaderboard_method}")
            
            # Test 5: Check for spectator camera controls
            camera_modes = all(mode in code for mode in ['bird_eye', 'player_follow', 'free_camera'])
            camera_validation = 'setSpectatorCamera' in code
            world_bounds_validation = 'worldBounds' in code or 'halfWorld' in code
            
            self.log_test("Spectator Camera Controls",
                         camera_modes and camera_validation,
                         f"Camera modes: {camera_modes}, Camera validation: {camera_validation}, Bounds: {world_bounds_validation}")
            
            # Test 6: Check for spectator to player transition
            spectator_became_player = 'spectator_became_player' in code
            transition_logic = 'removeSpectator' in code and 'addPlayer' in code
            
            self.log_test("Spectator to Player Transition",
                         spectator_became_player and transition_logic,
                         f"Became player event: {spectator_became_player}, Transition logic: {transition_logic}")
            
            # Test 7: Check for room info integration
            spectator_count_in_room_info = 'spectatorCount: this.spectators.size' in code
            spectator_count_updates = 'broadcastSpectatorUpdate' in code
            
            self.log_test("Room Info Integration",
                         spectator_count_in_room_info and spectator_count_updates,
                         f"Spectator count in room info: {spectator_count_in_room_info}, Count updates: {spectator_count_updates}")
            
            # Test 8: Check for authentication and error handling
            auth_verification = 'verifyToken(token)' in code
            spectator_limit_check = 'spectator_limit_reached' in code
            error_handling = 'spectator_join_error' in code
            
            self.log_test("Authentication and Error Handling",
                         auth_verification and (spectator_limit_check or error_handling),
                         f"Auth verification: {auth_verification}, Limit check: {spectator_limit_check}, Error handling: {error_handling}")
            
        except Exception as e:
            self.log_test("Code Analysis", False, error_msg=str(e))

    def test_api_endpoints(self):
        """Test API endpoints that support spectator functionality"""
        print("🌐 Testing API Endpoints for Spectator Support...")
        
        # Test basic connectivity with timeout
        try:
            response = requests.get(f"{self.base_url}/api/ping", timeout=5)
            if response.status_code == 200:
                self.log_test("Basic API Connectivity", True, 
                             f"Ping successful ({response.elapsed.total_seconds():.3f}s)")
            else:
                self.log_test("Basic API Connectivity", False, 
                             f"Ping failed with status {response.status_code}")
        except Exception as e:
            self.log_test("Basic API Connectivity", False, error_msg=str(e))
        
        # Test server browser (supports spectator room discovery)
        try:
            response = requests.get(f"{self.base_url}/api/servers/lobbies", timeout=5)
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                self.log_test("Server Browser API", True,
                             f"Found {len(servers)} servers for spectator room discovery")
            else:
                self.log_test("Server Browser API", False,
                             f"Server browser failed with status {response.status_code}")
        except Exception as e:
            self.log_test("Server Browser API", False, error_msg=str(e))
        
        # Test live stats (supports spectator count tracking)
        try:
            response = requests.get(f"{self.base_url}/api/stats/live-players", timeout=5)
            if response.status_code == 200:
                data = response.json()
                has_count = 'count' in data
                self.log_test("Live Stats API", has_count,
                             f"Live stats available for spectator tracking: {data}")
            else:
                self.log_test("Live Stats API", False,
                             f"Live stats failed with status {response.status_code}")
        except Exception as e:
            self.log_test("Live Stats API", False, error_msg=str(e))

    def analyze_spectator_features(self):
        """Analyze specific spectator features implementation"""
        print("🎯 Analyzing Specific Spectator Features...")
        
        try:
            with open('/app/lib/gameServer.js', 'r') as f:
                code = f.read()
            
            # Feature 1: Spectator Limit Management
            limit_check_pattern = r'this\.spectators\.size >= this\.maxSpectators'
            limit_enforcement = bool(re.search(limit_check_pattern, code))
            limit_error_emission = 'spectator_limit_reached' in code
            
            self.log_test("Spectator Limit Management",
                         limit_enforcement and limit_error_emission,
                         f"Limit enforcement: {limit_enforcement}, Error emission: {limit_error_emission}")
            
            # Feature 2: Enhanced Player Data for Spectators
            enhanced_player_data = 'kills:' in code and 'deaths:' in code
            spectator_specific_state = 'spectator_game_state' in code
            
            self.log_test("Enhanced Player Data for Spectators",
                         enhanced_player_data and spectator_specific_state,
                         f"Enhanced data: {enhanced_player_data}, Spectator state: {spectator_specific_state}")
            
            # Feature 3: World Bounds Information
            world_bounds_data = 'worldBounds:' in code
            world_size_config = 'worldSize:' in code or 'config.worldSize' in code
            
            self.log_test("World Bounds Information",
                         world_bounds_data and world_size_config,
                         f"World bounds: {world_bounds_data}, World size config: {world_size_config}")
            
            # Feature 4: Leaderboard for Spectators
            leaderboard_generation = 'getLeaderboard()' in code
            leaderboard_sorting = '.sort((a, b) => b.mass - a.mass)' in code
            leaderboard_limit = '.slice(0, 10)' in code
            
            self.log_test("Leaderboard for Spectators",
                         leaderboard_generation and leaderboard_sorting,
                         f"Generation: {leaderboard_generation}, Sorting: {leaderboard_sorting}, Limit: {leaderboard_limit}")
            
            # Feature 5: Camera Position Validation
            camera_bounds_check = 'Math.max(-halfWorld, Math.min(halfWorld' in code
            camera_mode_validation = 'validModes.includes(mode)' in code
            
            self.log_test("Camera Position Validation",
                         camera_bounds_check and camera_mode_validation,
                         f"Bounds check: {camera_bounds_check}, Mode validation: {camera_mode_validation}")
            
            # Feature 6: Spectator Room Separation
            spectator_room_suffix = '_spectators' in code
            separate_broadcasting = 'this.io.to(this.id + \'_spectators\')' in code
            
            self.log_test("Spectator Room Separation",
                         spectator_room_suffix and separate_broadcasting,
                         f"Room suffix: {spectator_room_suffix}, Separate broadcasting: {separate_broadcasting}")
            
        except Exception as e:
            self.log_test("Feature Analysis", False, error_msg=str(e))

    def check_implementation_completeness(self):
        """Check if all required spectator features are implemented"""
        print("📋 Checking Implementation Completeness...")
        
        try:
            with open('/app/lib/gameServer.js', 'r') as f:
                code = f.read()
            
            # Required methods checklist
            required_methods = [
                'addSpectator',
                'removeSpectator', 
                'sendSpectatorGameState',
                'setSpectatorCamera',
                'broadcastSpectatorUpdate',
                'getLeaderboard'
            ]
            
            missing_methods = []
            for method in required_methods:
                if method not in code:
                    missing_methods.append(method)
            
            self.log_test("Required Methods Implementation",
                         len(missing_methods) == 0,
                         f"All methods implemented" if len(missing_methods) == 0 else f"Missing: {missing_methods}")
            
            # Required Socket.IO events checklist
            required_events = [
                'join_as_spectator',
                'spectator_camera_control',
                'spectator_join_game',
                'spectator_joined',
                'spectator_game_state',
                'spectator_count_update'
            ]
            
            missing_events = []
            for event in required_events:
                if event not in code:
                    missing_events.append(event)
            
            self.log_test("Required Socket.IO Events",
                         len(missing_events) == 0,
                         f"All events implemented" if len(missing_events) == 0 else f"Missing: {missing_events}")
            
            # Configuration completeness
            config_items = [
                'maxSpectators',
                'worldSize',
                'tickRate'
            ]
            
            missing_config = []
            for item in config_items:
                if item not in code:
                    missing_config.append(item)
            
            self.log_test("Configuration Completeness",
                         len(missing_config) == 0,
                         f"All config items present" if len(missing_config) == 0 else f"Missing: {missing_config}")
            
        except Exception as e:
            self.log_test("Completeness Check", False, error_msg=str(e))

    def run_analysis(self):
        """Run complete spectator backend analysis"""
        print("🚀 Starting TurfLoot Spectator Mode Backend Analysis")
        print("=" * 60)
        
        start_time = time.time()
        
        try:
            self.analyze_gameserver_code()
            self.test_api_endpoints()
            self.analyze_spectator_features()
            self.check_implementation_completeness()
            
        except Exception as e:
            print(f"❌ Critical error during analysis: {e}")
        
        # Calculate results
        end_time = time.time()
        duration = end_time - start_time
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        # Print summary
        print("=" * 60)
        print("🎯 SPECTATOR MODE BACKEND ANALYSIS SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        print()
        
        # Print detailed results
        print("📋 DETAILED ANALYSIS RESULTS:")
        print("-" * 40)
        for result in self.test_results:
            print(f"{result['status']}: {result['test_name']}")
            if result['details']:
                print(f"   Details: {result['details']}")
            if result['error']:
                print(f"   Error: {result['error']}")
        
        return {
            'total_tests': self.total_tests,
            'passed_tests': self.passed_tests,
            'failed_tests': self.failed_tests,
            'success_rate': success_rate,
            'duration': duration,
            'results': self.test_results
        }

def main():
    """Main analysis execution"""
    analyzer = SpectatorBackendAnalyzer()
    results = analyzer.run_analysis()
    
    # Return exit code based on results
    if results['failed_tests'] == 0:
        print("✅ All analysis tests passed!")
        return 0
    else:
        print(f"❌ {results['failed_tests']} analysis tests failed")
        return 1

if __name__ == "__main__":
    import sys
    exit_code = main()
    sys.exit(exit_code)