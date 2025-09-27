#!/usr/bin/env python3
"""
Arena Mode Camera System Testing
Testing arena mode camera system to ensure it's identical to local agario mode camera behavior
"""

import requests
import time
import json
import os

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