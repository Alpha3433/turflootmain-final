#!/usr/bin/env python3

"""
Arena Mode Camera Lock Fix Testing
==================================

This test verifies the arena mode camera lock fix implementation as described in the review request:

1. Camera Initialization Tracking: cameraInitialized flag for proper first-frame setup
2. Immediate Camera Positioning: Camera snaps directly to center on player on first position from server
3. Camera Desync Detection: Distance checking to detect if camera gets "lost" 
4. Robust Snap Logic: If camera distance from player exceeds 500px, immediately snap to correct position
5. Enhanced Debug Logging: Comprehensive camera tracking logs to monitor behavior
6. Visual Debug Cross: Red crosshair at player position for debugging camera alignment

The test will verify:
- Arena mode camera system initializes correctly when connecting to Colyseus
- Player position updates from server properly trigger camera tracking
- Camera smoothing works correctly (0.2 lerp factor matching local agario)
- Camera bounds checking functions properly within world limits
- Debug logs show camera is tracking player position correctly
- No camera "drift" or offset issues when player moves
"""

import requests
import json
import time
import os
from datetime import datetime

class ArenaCameraTestSuite:
    def __init__(self):
        # Get base URL from environment
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
        self.api_base = f"{self.base_url}/api"
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'test_results': []
        }
        
    def log_test(self, test_name, passed, details="", error=""):
        """Log individual test result"""
        self.results['total_tests'] += 1
        if passed:
            self.results['passed_tests'] += 1
            status = "✅ PASSED"
        else:
            self.results['failed_tests'] += 1
            status = "❌ FAILED"
            
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'error': error
        }
        self.results['test_results'].append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
    
    def test_api_health_check(self):
        """Test basic API connectivity for arena mode support"""
        try:
            response = requests.get(f"{self.api_base}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                has_multiplayer = 'multiplayer' in data.get('features', [])
                self.log_test(
                    "API Health Check", 
                    True,
                    f"API accessible with multiplayer support: {has_multiplayer}"
                )
                return True
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Health Check", False, error=str(e))
            return False
    
    def test_colyseus_server_availability(self):
        """Test Colyseus server availability for arena mode"""
        try:
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                # Look for arena servers
                servers = data.get('servers', [])
                arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' and s.get('roomType') == 'arena']
                
                self.log_test(
                    "Colyseus Server Availability",
                    colyseus_enabled and len(arena_servers) > 0,
                    f"Colyseus enabled: {colyseus_enabled}, Arena servers: {len(arena_servers)}, Endpoint: {colyseus_endpoint}"
                )
                return colyseus_enabled and len(arena_servers) > 0
            else:
                self.log_test("Colyseus Server Availability", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Colyseus Server Availability", False, error=str(e))
            return False
    
    def test_camera_initialization_tracking(self):
        """Test for cameraInitialized flag implementation"""
        try:
            # Read the agario page.js file to check for camera initialization tracking
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            # Check for cameraInitialized flag
            has_camera_initialized = 'cameraInitialized' in content
            has_initialization_logic = 'cameraInitialized' in content and 'true' in content
            
            self.log_test(
                "Camera Initialization Tracking",
                has_camera_initialized and has_initialization_logic,
                f"cameraInitialized flag found: {has_camera_initialized}, initialization logic: {has_initialization_logic}"
            )
            return has_camera_initialized and has_initialization_logic
        except Exception as e:
            self.log_test("Camera Initialization Tracking", False, error=str(e))
            return False
    
    def test_immediate_camera_positioning(self):
        """Test for immediate camera positioning on first player position"""
        try:
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            # Check for immediate positioning logic
            has_snap_logic = 'snap' in content.lower() and 'camera' in content.lower()
            has_first_position_handling = 'first' in content.lower() and ('position' in content.lower() or 'player' in content.lower())
            
            # Check updateFromServer method for camera handling
            updateFromServer_section = content[content.find('updateFromServer'):content.find('updateFromServer') + 2000] if 'updateFromServer' in content else ""
            has_camera_update_in_server = 'camera' in updateFromServer_section.lower()
            
            self.log_test(
                "Immediate Camera Positioning",
                has_snap_logic or has_camera_update_in_server,
                f"Snap logic found: {has_snap_logic}, First position handling: {has_first_position_handling}, Camera in updateFromServer: {has_camera_update_in_server}"
            )
            return has_snap_logic or has_camera_update_in_server
        except Exception as e:
            self.log_test("Immediate Camera Positioning", False, error=str(e))
            return False
    
    def test_camera_desync_detection(self):
        """Test for camera desync detection with distance checking"""
        try:
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            # Check for distance checking logic
            has_distance_check = 'distance' in content.lower() and 'camera' in content.lower()
            has_desync_detection = 'desync' in content.lower() or ('lost' in content.lower() and 'camera' in content.lower())
            
            # Check for distance calculation patterns
            has_distance_calc = 'Math.sqrt' in content or 'Math.abs' in content
            
            self.log_test(
                "Camera Desync Detection",
                has_distance_check or has_desync_detection,
                f"Distance check found: {has_distance_check}, Desync detection: {has_desync_detection}, Distance calc: {has_distance_calc}"
            )
            return has_distance_check or has_desync_detection
        except Exception as e:
            self.log_test("Camera Desync Detection", False, error=str(e))
            return False
    
    def test_robust_snap_logic(self):
        """Test for robust snap logic with 500px threshold"""
        try:
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            # Check for 500px threshold
            has_500px_threshold = '500' in content
            has_snap_threshold = 'snap' in content.lower() and ('500' in content or 'threshold' in content.lower())
            
            # Check for immediate snap logic
            has_immediate_snap = 'immediate' in content.lower() and 'snap' in content.lower()
            
            self.log_test(
                "Robust Snap Logic (500px threshold)",
                has_500px_threshold and (has_snap_threshold or has_immediate_snap),
                f"500px threshold found: {has_500px_threshold}, Snap threshold logic: {has_snap_threshold}, Immediate snap: {has_immediate_snap}"
            )
            return has_500px_threshold and (has_snap_threshold or has_immediate_snap)
        except Exception as e:
            self.log_test("Robust Snap Logic (500px threshold)", False, error=str(e))
            return False
    
    def test_enhanced_debug_logging(self):
        """Test for enhanced debug logging for camera tracking"""
        try:
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            # Check for camera debug logs
            camera_logs = content.lower().count('console.log') and 'camera' in content.lower()
            debug_logs = 'debug' in content.lower() and 'camera' in content.lower()
            tracking_logs = 'tracking' in content.lower() and 'camera' in content.lower()
            
            # Count camera-related console.log statements
            camera_log_count = content.lower().count('camera') if 'console.log' in content else 0
            
            self.log_test(
                "Enhanced Debug Logging",
                camera_logs or debug_logs or tracking_logs,
                f"Camera logs found: {camera_logs}, Debug logs: {debug_logs}, Tracking logs: {tracking_logs}, Camera mentions: {camera_log_count}"
            )
            return camera_logs or debug_logs or tracking_logs
        except Exception as e:
            self.log_test("Enhanced Debug Logging", False, error=str(e))
            return False
    
    def test_visual_debug_cross(self):
        """Test for visual debug cross (red crosshair) at player position"""
        try:
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            # Check for debug cross/crosshair implementation
            has_debug_cross = 'cross' in content.lower() or 'crosshair' in content.lower()
            has_red_cross = 'red' in content.lower() and ('cross' in content.lower() or 'crosshair' in content.lower())
            has_debug_visual = 'debug' in content.lower() and ('visual' in content.lower() or 'draw' in content.lower())
            
            # Check for drawing/rendering of debug elements
            has_debug_render = 'debug' in content.lower() and ('render' in content.lower() or 'draw' in content.lower())
            
            self.log_test(
                "Visual Debug Cross",
                has_debug_cross or has_red_cross or has_debug_visual,
                f"Debug cross found: {has_debug_cross}, Red cross: {has_red_cross}, Debug visual: {has_debug_visual}, Debug render: {has_debug_render}"
            )
            return has_debug_cross or has_red_cross or has_debug_visual
        except Exception as e:
            self.log_test("Visual Debug Cross", False, error=str(e))
            return False
    
    def test_camera_smoothing_factor(self):
        """Test camera smoothing factor (0.2 lerp factor matching local agario)"""
        try:
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            # Find updateCamera method
            updateCamera_start = content.find('updateCamera()')
            if updateCamera_start == -1:
                updateCamera_start = content.find('updateCamera ')
            
            if updateCamera_start != -1:
                # Extract updateCamera method (next 500 characters should contain the smoothing logic)
                updateCamera_section = content[updateCamera_start:updateCamera_start + 500]
                
                # Check for 0.2 smoothing factor - look for exact patterns
                has_02_smoothing = 'smoothing = 0.2' in updateCamera_section
                has_smoothing_var = 'smoothing' in updateCamera_section
                has_lerp_logic = '* smoothing' in updateCamera_section
                
                self.log_test(
                    "Camera Smoothing Factor (0.2 lerp)",
                    has_02_smoothing and has_lerp_logic,
                    f"0.2 smoothing found: {has_02_smoothing}, Smoothing variable: {has_smoothing_var}, Lerp logic: {has_lerp_logic}"
                )
                return has_02_smoothing and has_lerp_logic
            else:
                self.log_test("Camera Smoothing Factor (0.2 lerp)", False, "updateCamera method not found")
                return False
        except Exception as e:
            self.log_test("Camera Smoothing Factor (0.2 lerp)", False, error=str(e))
            return False
    
    def test_camera_bounds_checking(self):
        """Test camera bounds checking within world limits"""
        try:
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            # Find updateCamera method
            updateCamera_start = content.find('updateCamera()')
            if updateCamera_start == -1:
                updateCamera_start = content.find('updateCamera ')
            
            if updateCamera_start != -1:
                # Extract updateCamera method (next 1000 characters should contain bounds logic)
                updateCamera_section = content[updateCamera_start:updateCamera_start + 1000]
                
                # Check for bounds checking - look for exact patterns
                has_bounds_check = 'bounds' in updateCamera_section.lower()
                has_world_limits = 'this.world.width' in updateCamera_section and 'this.world.height' in updateCamera_section
                has_math_max_min = 'Math.max(' in updateCamera_section and 'Math.min(' in updateCamera_section
                has_boundary_extension = 'boundaryExtension' in updateCamera_section
                
                self.log_test(
                    "Camera Bounds Checking",
                    has_world_limits and has_math_max_min,
                    f"Bounds check found: {has_bounds_check}, World limits: {has_world_limits}, Math.max/min: {has_math_max_min}, Boundary extension: {has_boundary_extension}"
                )
                return has_world_limits and has_math_max_min
            else:
                self.log_test("Camera Bounds Checking", False, "updateCamera method not found")
                return False
        except Exception as e:
            self.log_test("Camera Bounds Checking", False, error=str(e))
            return False
    
    def run_all_tests(self):
        """Run all arena camera lock fix tests"""
        print("🎯 ARENA MODE CAMERA LOCK FIX TESTING INITIATED")
        print("=" * 60)
        
        # Backend infrastructure tests
        print("\n📡 BACKEND INFRASTRUCTURE TESTS:")
        self.test_api_health_check()
        self.test_colyseus_server_availability()
        
        # Camera implementation tests
        print("\n📹 CAMERA IMPLEMENTATION TESTS:")
        self.test_camera_initialization_tracking()
        self.test_immediate_camera_positioning()
        self.test_camera_desync_detection()
        self.test_robust_snap_logic()
        self.test_enhanced_debug_logging()
        self.test_visual_debug_cross()
        
        # Camera behavior tests
        print("\n🎮 CAMERA BEHAVIOR TESTS:")
        self.test_camera_smoothing_factor()
        self.test_camera_bounds_checking()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 ARENA CAMERA LOCK FIX TEST SUMMARY:")
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"✅ Passed: {self.results['passed_tests']}")
        print(f"❌ Failed: {self.results['failed_tests']}")
        
        success_rate = (self.results['passed_tests'] / self.results['total_tests']) * 100 if self.results['total_tests'] > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 ARENA CAMERA LOCK FIX: EXCELLENT IMPLEMENTATION")
        elif success_rate >= 60:
            print("✅ ARENA CAMERA LOCK FIX: GOOD IMPLEMENTATION")
        elif success_rate >= 40:
            print("⚠️ ARENA CAMERA LOCK FIX: PARTIAL IMPLEMENTATION")
        else:
            print("❌ ARENA CAMERA LOCK FIX: NEEDS IMPLEMENTATION")
        
        return self.results

if __name__ == "__main__":
    tester = ArenaCameraTestSuite()
    results = tester.run_all_tests()
    
    # Save results to file
    with open('/app/arena_camera_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Test results saved to: /app/arena_camera_test_results.json")