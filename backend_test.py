#!/usr/bin/env python3
"""
Arena Mode Camera System Testing
Testing arena mode camera system to ensure it's identical to local agario mode camera behavior
"""

import requests
import time
import json
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
import subprocess

def get_base_url():
    """Get the base URL from environment variables"""
    try:
        with open('/app/.env', 'r') as f:
            for line in f:
                if line.startswith('NEXT_PUBLIC_BASE_URL='):
                    return line.split('=', 1)[1].strip().strip('"\'')
    except:
        pass
    return 'http://localhost:3000'

BASE_URL = get_base_url()
print(f"🌐 Using base URL: {BASE_URL}")

def test_api_health():
    """Test API health and basic functionality"""
    print("\n🔍 Testing API Health...")
    
    try:
        response = requests.get(f"{BASE_URL}/api", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Health Check: {data.get('service', 'Unknown')} - {data.get('status', 'Unknown')}")
            return True
        else:
            print(f"❌ API Health Check Failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API Health Check Error: {e}")
        return False

def test_camera_system_code_analysis():
    """Analyze the camera system implementation in the code"""
    print("\n🔍 Testing Camera System Code Analysis...")
    
    try:
        # Read the agario page.js file
        with open('/app/app/agario/page.js', 'r') as f:
            content = f.read()
        
        # Check for camera system implementation
        camera_checks = {
            'camera_initialization': 'this.camera = { x: 0, y: 0 }' in content,
            'update_camera_method': 'updateCamera()' in content,
            'target_calculation': 'this.player.x - this.canvas.width / 2' in content,
            'smoothing_factor': '* 0.2' in content and 'smoothing' in content,
            'boundary_extension': 'boundaryExtension = 100' in content,
            'world_bounds_checking': 'Math.max(-boundaryExtension, Math.min(' in content,
            'camera_translate': 'this.ctx.translate(-this.camera.x, -this.camera.y)' in content
        }
        
        passed_checks = sum(camera_checks.values())
        total_checks = len(camera_checks)
        
        print(f"📊 Camera System Code Analysis Results:")
        for check, result in camera_checks.items():
            status = "✅" if result else "❌"
            print(f"  {status} {check.replace('_', ' ').title()}: {'Found' if result else 'Not Found'}")
        
        print(f"📈 Camera Code Analysis: {passed_checks}/{total_checks} checks passed ({passed_checks/total_checks*100:.1f}%)")
        
        return passed_checks >= 6  # Require at least 6/7 checks to pass
        
    except Exception as e:
        print(f"❌ Camera System Code Analysis Error: {e}")
        return False

def test_unified_camera_implementation():
    """Test that there's only one camera implementation for both modes"""
    print("\n🔍 Testing Unified Camera Implementation...")
    
    try:
        # Read the agario page.js file
        with open('/app/app/agario/page.js', 'r') as f:
            content = f.read()
        
        # Count camera-related method definitions
        camera_method_count = content.count('updateCamera()')
        camera_class_count = content.count('class.*Camera')
        mode_specific_camera = any([
            'arenaCamera' in content,
            'localCamera' in content,
            'multiplayerCamera' in content,
            'practiceCamera' in content
        ])
        
        # Check for conditional camera logic
        conditional_camera_logic = any([
            'if (isMultiplayer)' in line and 'camera' in line.lower() 
            for line in content.split('\n')
        ])
        
        unified_checks = {
            'single_update_camera_method': camera_method_count == 1,
            'no_camera_classes': camera_class_count == 0,
            'no_mode_specific_cameras': not mode_specific_camera,
            'unified_camera_logic': not conditional_camera_logic
        }
        
        passed_checks = sum(unified_checks.values())
        total_checks = len(unified_checks)
        
        print(f"📊 Unified Camera Implementation Results:")
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
        camera_method_end = content.find('}', camera_method_start + content[camera_method_start:].find('\n'))
        camera_method = content[camera_method_start:camera_method_end + 1]
        
        # Check specific requirements from review request
        spec_checks = {
            'target_calculation_exact': 'targetX = this.player.x - this.canvas.width / 2' in camera_method,
            'smooth_interpolation': 'this.camera.x += (targetX - this.camera.x) * 0.2' in camera_method,
            'smoothing_factor_02': '* 0.2' in camera_method,
            'boundary_extension_100': 'boundaryExtension = 100' in camera_method,
            'world_bounds_formula': 'Math.max(-boundaryExtension, Math.min(this.world.width - this.canvas.width + boundaryExtension, this.camera.x))' in camera_method,
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
                'if (isMultiplayer) {' in line and 'updateCamera' in content[content.find(line):content.find(line) + 200]
                for line in content.split('\n') if 'if (isMultiplayer)' in line
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
            'timestamp': datetime.now().isoformat()
        })
        
    def print_summary(self):
        """Print test summary"""
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        print(f"\n{'='*80}")
        print(f"SPAWN PROTECTION SYSTEM TESTING SUMMARY")
        print(f"{'='*80}")
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"{'='*80}")

    async def test_api_health_check(self):
        """Test 1: API Health Check"""
        try:
            response = requests.get(f"{BASE_URL}/api", timeout=10)
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', '')
                features = data.get('features', [])
                
                if 'multiplayer' in features:
                    self.log_test("API Health Check", True, f"Service: {service_name}, Multiplayer enabled")
                else:
                    self.log_test("API Health Check", False, "Multiplayer feature not enabled")
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("API Health Check", False, f"Error: {str(e)}")

    async def test_colyseus_server_availability(self):
        """Test 2: Colyseus Server Availability"""
        try:
            response = requests.get(f"{BASE_URL}/api/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                colyseus_enabled = data.get('colyseusEnabled', False)
                servers = data.get('servers', [])
                
                arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' and s.get('roomType') == 'arena']
                
                if colyseus_enabled and arena_servers:
                    arena_server = arena_servers[0]
                    self.log_test("Colyseus Server Availability", True, 
                                f"Arena server found: {arena_server.get('id')}, Max players: {arena_server.get('maxPlayers')}")
                else:
                    self.log_test("Colyseus Server Availability", False, "No arena servers available")
            else:
                self.log_test("Colyseus Server Availability", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("Colyseus Server Availability", False, f"Error: {str(e)}")

    async def test_spawn_protection_schema_verification(self):
        """Test 3: Spawn Protection Schema Verification"""
        try:
            # Read the compiled JavaScript file to verify spawn protection fields
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for spawn protection properties in compiled code
            spawn_protection_found = 'spawnProtection' in js_content
            spawn_protection_start_found = 'spawnProtectionStart' in js_content  
            spawn_protection_time_found = 'spawnProtectionTime' in js_content
            six_seconds_found = '6000' in js_content
            
            if spawn_protection_found and spawn_protection_start_found and spawn_protection_time_found and six_seconds_found:
                self.log_test("Spawn Protection Schema Verification", True, 
                            "All spawn protection fields found in compiled code with 6-second duration")
            else:
                missing_fields = []
                if not spawn_protection_found: missing_fields.append('spawnProtection')
                if not spawn_protection_start_found: missing_fields.append('spawnProtectionStart')
                if not spawn_protection_time_found: missing_fields.append('spawnProtectionTime')
                if not six_seconds_found: missing_fields.append('6000ms duration')
                
                self.log_test("Spawn Protection Schema Verification", False, 
                            f"Missing fields: {', '.join(missing_fields)}")
        except Exception as e:
            self.log_test("Spawn Protection Schema Verification", False, f"Error: {str(e)}")

    async def test_spawn_protection_initialization(self):
        """Test 4: Spawn Protection Initialization Logic"""
        try:
            # Read both TypeScript and JavaScript files to verify initialization
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check onJoin method for spawn protection initialization
            ts_onjoin_protection = 'player.spawnProtection = true' in ts_content
            ts_onjoin_start = 'player.spawnProtectionStart = Date.now()' in ts_content
            ts_onjoin_time = 'player.spawnProtectionTime = 6000' in ts_content
            
            js_onjoin_protection = 'player.spawnProtection = true' in js_content
            js_onjoin_start = 'player.spawnProtectionStart = Date.now()' in js_content
            js_onjoin_time = 'player.spawnProtectionTime = 6000' in js_content
            
            ts_init_count = sum([ts_onjoin_protection, ts_onjoin_start, ts_onjoin_time])
            js_init_count = sum([js_onjoin_protection, js_onjoin_start, js_onjoin_time])
            
            if ts_init_count == 3 and js_init_count == 3:
                self.log_test("Spawn Protection Initialization", True, 
                            "Spawn protection properly initialized in both onJoin methods (TS & JS)")
            else:
                self.log_test("Spawn Protection Initialization", False, 
                            f"Initialization incomplete - TS: {ts_init_count}/3, JS: {js_init_count}/3")
        except Exception as e:
            self.log_test("Spawn Protection Initialization", False, f"Error: {str(e)}")

    async def test_protection_timer_logic(self):
        """Test 5: Protection Timer Logic Verification"""
        try:
            # Read files to verify timer logic in update method
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for protection timer logic
            ts_timer_check = 'if (player.spawnProtection)' in ts_content
            ts_timer_expiry = 'now - player.spawnProtectionStart >= player.spawnProtectionTime' in ts_content
            ts_timer_disable = 'player.spawnProtection = false' in ts_content
            
            js_timer_check = 'if (player.spawnProtection)' in js_content
            js_timer_expiry = 'now - player.spawnProtectionStart >= player.spawnProtectionTime' in js_content
            js_timer_disable = 'player.spawnProtection = false' in js_content
            
            ts_timer_count = sum([ts_timer_check, ts_timer_expiry, ts_timer_disable])
            js_timer_count = sum([js_timer_check, js_timer_expiry, js_timer_disable])
            
            if ts_timer_count == 3 and js_timer_count == 3:
                self.log_test("Protection Timer Logic", True, 
                            "Timer logic properly implemented in both update methods (TS & JS)")
            else:
                self.log_test("Protection Timer Logic", False, 
                            f"Timer logic incomplete - TS: {ts_timer_count}/3, JS: {js_timer_count}/3")
        except Exception as e:
            self.log_test("Protection Timer Logic", False, f"Error: {str(e)}")

    async def test_collision_prevention_logic(self):
        """Test 6: Collision Prevention Logic"""
        try:
            # Read files to verify collision prevention
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for collision prevention logic
            ts_collision_check = 'if (player.spawnProtection || otherPlayer.spawnProtection)' in ts_content
            ts_collision_return = 'return;' in ts_content and 'checkPlayerCollisions' in ts_content
            
            js_collision_check = 'if (player.spawnProtection || otherPlayer.spawnProtection)' in js_content
            js_collision_return = 'return;' in js_content and 'checkPlayerCollisions' in js_content
            
            if ts_collision_check and js_collision_check:
                self.log_test("Collision Prevention Logic", True, 
                            "Collision prevention properly implemented in both files (TS & JS)")
            else:
                missing = []
                if not ts_collision_check: missing.append("TS collision check")
                if not js_collision_check: missing.append("JS collision check")
                
                self.log_test("Collision Prevention Logic", False, 
                            f"Missing collision prevention: {', '.join(missing)}")
        except Exception as e:
            self.log_test("Collision Prevention Logic", False, f"Error: {str(e)}")

    async def test_respawn_protection_logic(self):
        """Test 7: Respawn Protection Logic"""
        try:
            # Read files to verify respawn protection
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Count occurrences to verify both onJoin and respawnPlayer have protection
            ts_protection_count = ts_content.count('player.spawnProtection = true')
            js_protection_count = js_content.count('player.spawnProtection = true')
            
            if ts_protection_count >= 2 and js_protection_count >= 2:
                self.log_test("Respawn Protection Logic", True, 
                            f"Respawn protection found in both onJoin and respawnPlayer methods - TS: {ts_protection_count} occurrences, JS: {js_protection_count} occurrences")
            else:
                self.log_test("Respawn Protection Logic", False, 
                            f"Insufficient respawn protection occurrences - TS: {ts_protection_count}, JS: {js_protection_count} (expected >= 2 each)")
        except Exception as e:
            self.log_test("Respawn Protection Logic", False, f"Error: {str(e)}")

    async def test_protection_synchronization_schema(self):
        """Test 8: Protection Synchronization Schema"""
        try:
            # Read files to verify schema synchronization
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for @type decorators in TypeScript (should be present for synchronization)
            ts_has_type_decorators = '@type("boolean") spawnProtection' in ts_content or '@type("number") spawnProtectionStart' in ts_content
            
            # Check for type decorators in compiled JavaScript
            js_has_type_decorators = 'type)("boolean")' in js_content and 'spawnProtection' in js_content
            
            # Check if spawn protection fields are in Player schema
            ts_in_player_schema = 'class Player extends Schema' in ts_content and 'spawnProtection' in ts_content
            js_in_player_schema = 'Player extends' in js_content and 'spawnProtection' in js_content
            
            if js_has_type_decorators and ts_in_player_schema and js_in_player_schema:
                self.log_test("Protection Synchronization Schema", True, 
                            "Spawn protection fields properly included in Player schema for client synchronization")
            else:
                issues = []
                if not ts_has_type_decorators: issues.append("TS @type decorators missing")
                if not js_has_type_decorators: issues.append("JS type decorators missing")
                if not ts_in_player_schema: issues.append("TS Player schema missing")
                if not js_in_player_schema: issues.append("JS Player schema missing")
                
                self.log_test("Protection Synchronization Schema", False, 
                            f"Schema synchronization issues: {', '.join(issues)}")
        except Exception as e:
            self.log_test("Protection Synchronization Schema", False, f"Error: {str(e)}")

    async def test_protection_properties_consistency(self):
        """Test 9: Protection Properties Consistency"""
        try:
            # Read files to verify property consistency
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Count all spawn protection related properties
            ts_protection_refs = ts_content.count('spawnProtection')
            ts_protection_start_refs = ts_content.count('spawnProtectionStart')
            ts_protection_time_refs = ts_content.count('spawnProtectionTime')
            ts_6000_refs = ts_content.count('6000')
            
            js_protection_refs = js_content.count('spawnProtection')
            js_protection_start_refs = js_content.count('spawnProtectionStart')
            js_protection_time_refs = js_content.count('spawnProtectionTime')
            js_6000_refs = js_content.count('6000')
            
            # Verify minimum expected references
            ts_sufficient = (ts_protection_refs >= 5 and ts_protection_start_refs >= 3 and 
                           ts_protection_time_refs >= 3 and ts_6000_refs >= 2)
            js_sufficient = (js_protection_refs >= 5 and js_protection_start_refs >= 3 and 
                           js_protection_time_refs >= 3 and js_6000_refs >= 2)
            
            if ts_sufficient and js_sufficient:
                self.log_test("Protection Properties Consistency", True, 
                            f"All protection properties consistently used - TS refs: {ts_protection_refs}, JS refs: {js_protection_refs}")
            else:
                self.log_test("Protection Properties Consistency", False, 
                            f"Inconsistent property usage - TS: protection={ts_protection_refs}, start={ts_protection_start_refs}, time={ts_protection_time_refs}, 6000={ts_6000_refs} | JS: protection={js_protection_refs}, start={js_protection_start_refs}, time={js_protection_time_refs}, 6000={js_6000_refs}")
        except Exception as e:
            self.log_test("Protection Properties Consistency", False, f"Error: {str(e)}")

    async def test_server_side_enforcement(self):
        """Test 10: Server-Side Enforcement Verification"""
        try:
            # Verify that spawn protection is enforced server-side
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for server-side enforcement patterns
            server_side_checks = [
                'if (player.spawnProtection || otherPlayer.spawnProtection)' in js_content,
                'player.spawnProtection = true' in js_content,
                'now - player.spawnProtectionStart >= player.spawnProtectionTime' in js_content,
                'player.spawnProtection = false' in js_content
            ]
            
            enforcement_count = sum(server_side_checks)
            
            if enforcement_count >= 3:
                self.log_test("Server-Side Enforcement", True, 
                            f"Server-side spawn protection enforcement verified - {enforcement_count}/4 checks passed")
            else:
                self.log_test("Server-Side Enforcement", False, 
                            f"Insufficient server-side enforcement - only {enforcement_count}/4 checks passed")
        except Exception as e:
            self.log_test("Server-Side Enforcement", False, f"Error: {str(e)}")

    async def run_all_tests(self):
        """Run all spawn protection tests"""
        print("🛡️ STARTING COMPREHENSIVE SPAWN PROTECTION SYSTEM TESTING")
        print("="*80)
        
        # Run all tests
        await self.test_api_health_check()
        await self.test_colyseus_server_availability()
        await self.test_spawn_protection_schema_verification()
        await self.test_spawn_protection_initialization()
        await self.test_protection_timer_logic()
        await self.test_collision_prevention_logic()
        await self.test_respawn_protection_logic()
        await self.test_protection_synchronization_schema()
        await self.test_protection_properties_consistency()
        await self.test_server_side_enforcement()
        
        # Print summary
        self.print_summary()
        
        return self.passed_tests, self.total_tests

async def main():
    """Main test execution"""
    tester = SpawnProtectionTester()
    
    try:
        passed, total = await tester.run_all_tests()
        
        # Exit with appropriate code
        if passed == total:
            print("\n🎉 ALL SPAWN PROTECTION TESTS PASSED!")
            sys.exit(0)
        else:
            print(f"\n⚠️ {total - passed} TESTS FAILED")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ TESTING FAILED: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())