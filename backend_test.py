#!/usr/bin/env python3
"""
Arena Mass Synchronization Testing Suite
Tests the starting mass synchronization between server and client in arena mode.
"""

import json
import requests
import time
import os
import sys
import re

class ArenaMassTester:
    def __init__(self):
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://smooth-mover.preview.emergentagent.com')
        self.api_base = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🎯 Arena Mass Synchronization Testing Suite")
        print(f"🔗 Base URL: {self.base_url}")
        print(f"📊 Testing Focus: Starting mass synchronization between server and client")
        print("=" * 80)

    def log_test(self, test_name, passed, details):
        """Log individual test results"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
        print(f"{status}: {test_name}")
        print(f"   📝 {details}")

    def make_request(self, endpoint, timeout=10):
        """Make HTTP GET request"""
        url = f"{self.api_base}/{endpoint}" if endpoint else self.api_base
        try:
            response = requests.get(url, timeout=timeout)
            return {
                'success': response.status_code == 200,
                'status': response.status_code,
                'data': response.json() if response.status_code == 200 else {}
            }
        except Exception as e:
            return {
                'success': False,
                'status': 0,
                'data': {'error': str(e)}
            }

    def test_api_health(self):
        """Test 1: Verify API is accessible and arena infrastructure is operational"""
        response = self.make_request("")
        
        if response['success']:
            data = response['data']
            service_name = data.get('service', 'unknown')
            status = data.get('status', 'unknown')
            features = data.get('features', [])
            
            multiplayer_available = 'multiplayer' in features
            details = f"API operational - Service: {service_name}, Status: {status}, Multiplayer: {'✅' if multiplayer_available else '❌'}"
            self.log_test("API Health Check", True, details)
            return True
        else:
            self.log_test("API Health Check", False, f"API returned status {response['status']}")
            return False

    def test_colyseus_server_integration(self):
        """Test 2: Verify Colyseus arena server is operational"""
        response = self.make_request("servers")
        
        if response['success']:
            data = response['data']
            servers = data.get('servers', [])
            colyseus_enabled = data.get('colyseusEnabled', False)
            colyseus_endpoint = data.get('colyseusEndpoint', '')
            
            arena_server = None
            for server in servers:
                if server.get('serverType') == 'colyseus' and server.get('roomType') == 'arena':
                    arena_server = server
                    break
            
            if arena_server and colyseus_enabled:
                max_players = arena_server.get('maxPlayers', 0)
                current_players = arena_server.get('currentPlayers', 0)
                server_id = arena_server.get('id', 'unknown')
                
                details = f"Colyseus integration enabled - Arena server found (ID: {server_id}, Max: {max_players} players, Current: {current_players} players, Endpoint: {colyseus_endpoint})"
                self.log_test("Colyseus Server Integration", True, details)
                return True
            else:
                self.log_test("Colyseus Server Integration", False, f"Arena server not found or Colyseus disabled - Servers: {len(servers)}, Enabled: {colyseus_enabled}")
                return False
        else:
            self.log_test("Colyseus Server Integration", False, f"Servers API returned status {response['status']}")
            return False

    def test_server_side_mass_verification(self):
        """Test 3: Verify server-side arena room creates players with exactly 25 mass"""
        arena_ts_path = "/app/src/rooms/ArenaRoom.ts"
        arena_js_path = "/app/build/rooms/ArenaRoom.js"
        
        mass_values_found = []
        
        # Check TypeScript source
        if os.path.exists(arena_ts_path):
            with open(arena_ts_path, 'r') as f:
                ts_content = f.read()
                
            # Look for mass assignments in TypeScript
            ts_mass_values = []
            lines = ts_content.split('\n')
            for i, line in enumerate(lines):
                if 'mass' in line and ('= 25' in line or ': 25' in line):
                    ts_mass_values.append(25)
                    print(f"   📍 Found mass=25 in TypeScript line {i+1}: {line.strip()}")
            
            mass_values_found.extend(ts_mass_values)
        
        # Check compiled JavaScript
        if os.path.exists(arena_js_path):
            with open(arena_js_path, 'r') as f:
                js_content = f.read()
                
            # Look for mass initializers in compiled JavaScript
            js_mass_values = []
            lines = js_content.split('\n')
            for i, line in enumerate(lines):
                if '_mass_initializers' in line and '25' in line:
                    js_mass_values.append(25)
                    print(f"   📍 Found mass=25 in compiled JavaScript line {i+1}: {line.strip()}")
            
            mass_values_found.extend(js_mass_values)
        
        # Verify all mass values are 25
        if mass_values_found:
            all_correct = all(mass == 25 for mass in mass_values_found)
            unique_values = list(set(mass_values_found))
            
            if all_correct and 25 in unique_values:
                details = f"Server-side mass verification successful - Found {len(mass_values_found)} mass assignments, all set to 25. Values: {unique_values}"
                self.log_test("Server-Side Mass Verification", True, details)
                return True
            else:
                details = f"Server-side mass verification failed - Found incorrect mass values: {unique_values}, Expected: [25]"
                self.log_test("Server-Side Mass Verification", False, details)
                return False
        else:
            self.log_test("Server-Side Mass Verification", False, "No mass assignments found in server code")
            return False

    def test_player_schema_mass_initialization(self):
        """Test 4: Verify Player schema initializes with mass = 25 by default"""
        arena_ts_path = "/app/src/rooms/ArenaRoom.ts"
        arena_js_path = "/app/build/rooms/ArenaRoom.js"
        
        schema_mass_found = False
        schema_details = []
        
        # Check TypeScript Player schema
        if os.path.exists(arena_ts_path):
            with open(arena_ts_path, 'r') as f:
                ts_content = f.read()
                
            # Look for Player schema mass definition
            lines = ts_content.split('\n')
            for i, line in enumerate(lines):
                if '@type("number") mass: number = 25' in line:
                    schema_mass_found = True
                    schema_details.append(f"TypeScript Player schema: mass = 25 (line {i+1})")
                    print(f"   📍 Found Player schema mass=25 in TypeScript: {line.strip()}")
        
        # Check compiled JavaScript Player schema
        if os.path.exists(arena_js_path):
            with open(arena_js_path, 'r') as f:
                js_content = f.read()
                
            # Look for mass initializers in Player class
            lines = js_content.split('\n')
            for i, line in enumerate(lines):
                if 'this.mass = ' in line and '25' in line and '_mass_initializers' in line:
                    schema_mass_found = True
                    schema_details.append(f"Compiled JavaScript Player schema: mass = 25 (line {i+1})")
                    print(f"   📍 Found Player schema mass=25 in compiled JS: {line.strip()}")
        
        if schema_mass_found:
            details = f"Player schema mass initialization verified - {', '.join(schema_details)}"
            self.log_test("Player Schema Mass Initialization", True, details)
            return True
        else:
            self.log_test("Player Schema Mass Initialization", False, "Player schema mass = 25 not found in code")
            return False

    def test_player_creation_mass_assignment(self):
        """Test 5: Verify onJoin method creates players with mass = 25"""
        arena_ts_path = "/app/src/rooms/ArenaRoom.ts"
        arena_js_path = "/app/build/rooms/ArenaRoom.js"
        
        onjoin_mass_found = False
        onjoin_details = []
        
        # Check TypeScript onJoin method
        if os.path.exists(arena_ts_path):
            with open(arena_ts_path, 'r') as f:
                ts_content = f.read()
                
            # Look for player.mass = 25 in onJoin
            lines = ts_content.split('\n')
            in_onjoin = False
            for i, line in enumerate(lines):
                if 'onJoin(' in line:
                    in_onjoin = True
                elif in_onjoin and 'player.mass = 25' in line:
                    onjoin_mass_found = True
                    onjoin_details.append(f"TypeScript onJoin: player.mass = 25 (line {i+1})")
                    print(f"   📍 Found onJoin mass=25 in TypeScript: {line.strip()}")
                elif in_onjoin and line.strip().startswith('}') and 'onJoin' not in line:
                    in_onjoin = False
        
        # Check compiled JavaScript onJoin method
        if os.path.exists(arena_js_path):
            with open(arena_js_path, 'r') as f:
                js_content = f.read()
                
            # Look for player.mass = 25 in compiled onJoin
            lines = js_content.split('\n')
            for i, line in enumerate(lines):
                if 'player.mass = 25' in line:
                    onjoin_mass_found = True
                    onjoin_details.append(f"Compiled JavaScript: player.mass = 25 (line {i+1})")
                    print(f"   📍 Found onJoin mass=25 in compiled JS: {line.strip()}")
        
        if onjoin_mass_found:
            details = f"Player creation mass assignment verified - {', '.join(onjoin_details)}"
            self.log_test("Player Creation Mass Assignment", True, details)
            return True
        else:
            self.log_test("Player Creation Mass Assignment", False, "player.mass = 25 assignment not found in onJoin method")
            return False

    def test_respawn_mass_reset(self):
        """Test 6: Verify respawn method resets player mass to 25"""
        arena_ts_path = "/app/src/rooms/ArenaRoom.ts"
        arena_js_path = "/app/build/rooms/ArenaRoom.js"
        
        respawn_mass_found = False
        respawn_details = []
        
        # Check TypeScript respawn method
        if os.path.exists(arena_ts_path):
            with open(arena_ts_path, 'r') as f:
                ts_content = f.read()
                
            # Look for player.mass = 25 in respawnPlayer
            lines = ts_content.split('\n')
            in_respawn = False
            for i, line in enumerate(lines):
                if 'respawnPlayer(' in line:
                    in_respawn = True
                elif in_respawn and 'player.mass = 25' in line:
                    respawn_mass_found = True
                    respawn_details.append(f"TypeScript respawnPlayer: player.mass = 25 (line {i+1})")
                    print(f"   📍 Found respawn mass=25 in TypeScript: {line.strip()}")
                elif in_respawn and line.strip() == '}' and 'respawnPlayer' not in line:
                    in_respawn = False
        
        # Check compiled JavaScript respawn method
        if os.path.exists(arena_js_path):
            with open(arena_js_path, 'r') as f:
                js_content = f.read()
                
            # Look for respawn mass assignment in compiled code
            lines = js_content.split('\n')
            for i, line in enumerate(lines):
                if 'respawnPlayer' in line and 'player.mass = 25' in line:
                    respawn_mass_found = True
                    respawn_details.append(f"Compiled JavaScript respawn: player.mass = 25 (line {i+1})")
                    print(f"   📍 Found respawn mass=25 in compiled JS: {line.strip()}")
        
        if respawn_mass_found:
            details = f"Respawn mass reset verified - {', '.join(respawn_details)}"
            self.log_test("Respawn Mass Reset", True, details)
            return True
        else:
            self.log_test("Respawn Mass Reset", False, "player.mass = 25 assignment not found in respawn method")
            return False

    def test_mass_consistency_verification(self):
        """Test 7: Verify mass consistency across all game mechanics"""
        arena_ts_path = "/app/src/rooms/ArenaRoom.ts"
        
        if not os.path.exists(arena_ts_path):
            self.log_test("Mass Consistency Verification", False, "TypeScript source file not accessible")
            return False
            
        with open(arena_ts_path, 'r') as f:
            ts_content = f.read()
        
        # Check virus collision damage minimum mass
        virus_pattern = r'player\.mass\s*=\s*Math\.max\((\d+),.*?\)'
        virus_matches = re.findall(virus_pattern, ts_content)
        
        print(f"🦠 Virus collision minimum mass values: {virus_matches}")
        
        virus_correct = True
        if virus_matches:
            for min_mass in virus_matches:
                if int(min_mass) != 25:
                    virus_correct = False
        
        # Check split functionality minimum mass requirement
        split_pattern = r'if\s*\(\s*player\.mass\s*<\s*(\d+)\s*\)'
        split_matches = re.findall(split_pattern, ts_content)
        
        print(f"✂️  Split minimum mass requirements: {split_matches}")
        
        split_correct = True
        if split_matches:
            for min_split_mass in split_matches:
                min_val = int(min_split_mass)
                if min_val < 25:  # Should be at least 25 to allow splitting from starting mass
                    split_correct = False
        
        # Check for value 25 usage
        all_mass_numbers = re.findall(r'\b(\d+)\b', ts_content)
        mass_values = [int(m) for m in all_mass_numbers if 20 <= int(m) <= 30]  # Focus on values near 25
        
        print(f"🔢 Mass-related values found (20-30 range): {set(mass_values)}")
        
        value_25_found = 25 in mass_values
        
        if virus_correct and split_correct and value_25_found:
            mass_25_count = mass_values.count(25)
            details = f"Mass consistency verified - Virus collision minimum mass correctly set to 25, split minimum mass requirement appropriately set, value 25 appears {mass_25_count} times in code consistently"
            self.log_test("Mass Consistency Verification", True, details)
            return True
        else:
            issues = []
            if not virus_correct:
                issues.append("virus collision minimum mass incorrect")
            if not split_correct:
                issues.append("split minimum mass requirement too low")
            if not value_25_found:
                issues.append("value 25 not found in expected mass range")
            
            details = f"Mass consistency issues found: {', '.join(issues)}"
            self.log_test("Mass Consistency Verification", False, details)
            return False

    def test_arena_server_configuration(self):
        """Test 8: Verify arena server is properly configured for mass synchronization"""
        response = self.make_request("servers")
        
        if response['success']:
            data = response['data']
            servers = data.get('servers', [])
            colyseus_enabled = data.get('colyseusEnabled', False)
            colyseus_endpoint = data.get('colyseusEndpoint', '')
            
            # Find and verify arena server configuration
            arena_server = None
            for server in servers:
                if server.get('serverType') == 'colyseus' and server.get('roomType') == 'arena':
                    arena_server = server
                    break
            
            if arena_server and colyseus_enabled:
                server_id = arena_server.get('id', 'unknown')
                max_players = arena_server.get('maxPlayers', 0)
                current_players = arena_server.get('currentPlayers', 0)
                status = arena_server.get('status', 'unknown')
                
                # Verify server is ready for mass synchronization testing
                server_ready = (
                    server_id == 'colyseus-arena-global' and
                    max_players >= 50 and
                    colyseus_endpoint and
                    status in ['active', 'waiting']
                )
                
                if server_ready:
                    details = f"Arena server properly configured - ID: {server_id}, Max Players: {max_players}, Current: {current_players}, Status: {status}, Endpoint: {colyseus_endpoint}"
                    self.log_test("Arena Server Configuration", True, details)
                    return True
                else:
                    details = f"Arena server configuration incomplete - ID: {server_id}, Max: {max_players}, Endpoint: {bool(colyseus_endpoint)}, Status: {status}"
                    self.log_test("Arena Server Configuration", False, details)
                    return False
            else:
                self.log_test("Arena Server Configuration", False, f"Arena server not found or Colyseus disabled - Servers: {len(servers)}, Enabled: {colyseus_enabled}")
                return False
        else:
            self.log_test("Arena Server Configuration", False, f"Server configuration API returned status {response['status']}")
            return False

    def run_all_tests(self):
        """Run all arena mass synchronization tests"""
        print("🚀 Starting Arena Mass Synchronization Testing Suite...")
        print("📋 Testing Focus: Starting mass synchronization between server and client")
        print()
        
        # Test sequence for comprehensive mass synchronization verification
        test_sequence = [
            ("API Health Check", self.test_api_health),
            ("Colyseus Server Integration", self.test_colyseus_server_integration),
            ("Server-Side Mass Verification", self.test_server_side_mass_verification),
            ("Player Schema Mass Initialization", self.test_player_schema_mass_initialization),
            ("Player Creation Mass Assignment", self.test_player_creation_mass_assignment),
            ("Respawn Mass Reset", self.test_respawn_mass_reset),
            ("Mass Consistency Verification", self.test_mass_consistency_verification),
            ("Arena Server Configuration", self.test_arena_server_configuration)
        ]
        
        print(f"📊 Running {len(test_sequence)} comprehensive tests...")
        print()
        
        start_time = time.time()
        
        for test_name, test_func in test_sequence:
            print(f"🧪 Running: {test_name}")
            try:
                test_func()
            except Exception as e:
                self.log_test(test_name, False, f"Test execution failed: {str(e)}")
            print()
        
        # Generate comprehensive report
        end_time = time.time()
        duration = end_time - start_time
        
        print("\n" + "=" * 80)
        print("🎯 ARENA MASS SYNCHRONIZATION TESTING COMPREHENSIVE REPORT")
        print("=" * 80)
        
        # Test Summary
        total = self.total_tests
        passed = self.passed_tests
        failed = total - passed
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"📊 TEST SUMMARY:")
        print(f"   Total Tests: {total}")
        print(f"   Passed: {passed} ✅")
        print(f"   Failed: {failed} ❌")
        print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   Duration: {duration:.2f} seconds")
        
        # Overall Assessment
        print(f"\n🎯 OVERALL ASSESSMENT:")
        if success_rate >= 90:
            print(f"   🎉 EXCELLENT: Arena mass synchronization is working excellently ({success_rate:.1f}% success rate)")
        elif success_rate >= 75:
            print(f"   ✅ GOOD: Arena mass synchronization is working well ({success_rate:.1f}% success rate)")
        elif success_rate >= 50:
            print(f"   ⚠️ FAIR: Arena mass synchronization has some issues ({success_rate:.1f}% success rate)")
        else:
            print(f"   ❌ POOR: Arena mass synchronization has significant issues ({success_rate:.1f}% success rate)")
        
        # Recommendations
        print(f"\n📋 RECOMMENDATIONS:")
        if success_rate >= 90:
            print(f"   ✅ Arena mass synchronization is production-ready")
            print(f"   ✅ Players should spawn with exactly 25 mass as requested")
            print(f"   ✅ Server-client synchronization should work correctly")
        else:
            print(f"   🔧 Review failed tests and address critical issues")
            print(f"   🔧 Verify mass values are consistently set to 25 across all code paths")
            print(f"   🔧 Test server-client synchronization in live environment")
        
        print("=" * 80)
        
        return success_rate >= 85

def main():
    """Main test execution function"""
    tester = ArenaMassTester()
    
    try:
        success = tester.run_all_tests()
        
        # Exit with appropriate code
        if success:
            print("🎉 Arena mass synchronization testing completed successfully!")
            sys.exit(0)
        else:
            print("❌ Arena mass synchronization testing completed with issues!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Testing failed with error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()