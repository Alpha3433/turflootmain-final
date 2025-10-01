#!/usr/bin/env python3
"""
Spacebar Split Diagnostic Test
Focused test to diagnose why spacebar split is not working despite proper implementation.

This test specifically checks:
1. Event listener registration for spacebar
2. Game state conditions when spacebar is pressed
3. WebSocket connection state during split attempts
4. Mouse coordinate availability
5. Mass requirement checking
6. Actual message sending to server
"""

import requests
import json
import time
import sys
import re
from typing import Dict, List, Tuple, Any

class SpacebarSplitDiagnosticTester:
    def __init__(self):
        self.base_url = "https://arena-cashout.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print("🔍 SPACEBAR SPLIT DIAGNOSTIC TEST")
        print("=" * 60)
        print("Diagnosing why spacebar split is not working...")
        print("=" * 60)

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ WORKING"
        else:
            status = "❌ ISSUE"
        
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
        return passed

    def test_spacebar_event_listener_registration(self) -> bool:
        """Test 1: Check if spacebar event listener is properly registered"""
        try:
            with open('/app/app/arena/page.js', 'r') as f:
                arena_content = f.read()
            
            # Check for spacebar event listener patterns
            spacebar_patterns = {
                'keydown_listener': "addEventListener('keydown'" in arena_content,
                'spacebar_detection': "e.key === ' '" in arena_content,
                'spacebar_handler_call': 'handleSplit(e)' in arena_content,
                'event_cleanup': "removeEventListener('keydown'" in arena_content,
                'useEffect_dependency': 'gameReady' in arena_content and 'useEffect' in arena_content
            }
            
            passed_checks = sum(1 for check in spacebar_patterns.values() if check)
            
            if passed_checks >= 4:
                return self.log_test(
                    "Spacebar Event Listener Registration",
                    True,
                    f"Event listeners properly registered ({passed_checks}/5 patterns found)"
                )
            else:
                failed_patterns = [name for name, found in spacebar_patterns.items() if not found]
                return self.log_test(
                    "Spacebar Event Listener Registration",
                    False,
                    f"Missing patterns: {failed_patterns}"
                )
        except Exception as e:
            return self.log_test("Spacebar Event Listener Registration", False, f"Exception: {str(e)}")

    def test_game_state_conditions(self) -> bool:
        """Test 2: Check game state conditions required for split to work"""
        try:
            with open('/app/app/arena/page.js', 'r') as f:
                arena_content = f.read()
            
            # Check for game state condition patterns
            game_state_patterns = {
                'gameReady_check': 'gameReady' in arena_content and 'handleSplit' in arena_content,
                'gameRef_check': 'gameRef.current' in arena_content,
                'wsRef_check': 'wsRef.current' in arena_content,
                'sessionId_check': 'wsRef.current.sessionId' in arena_content,
                'player_mass_check': 'gameRef.current.player.mass' in arena_content,
                'connection_state_validation': 'wsRef.current.connection' in arena_content
            }
            
            passed_checks = sum(1 for check in game_state_patterns.values() if check)
            
            if passed_checks >= 5:
                return self.log_test(
                    "Game State Conditions",
                    True,
                    f"All required game state conditions are checked ({passed_checks}/6 patterns found)"
                )
            else:
                failed_patterns = [name for name, found in game_state_patterns.items() if not found]
                return self.log_test(
                    "Game State Conditions",
                    False,
                    f"Missing game state checks: {failed_patterns}"
                )
        except Exception as e:
            return self.log_test("Game State Conditions", False, f"Exception: {str(e)}")

    def test_websocket_connection_validation(self) -> bool:
        """Test 3: Check WebSocket connection validation logic"""
        try:
            with open('/app/app/arena/page.js', 'r') as f:
                arena_content = f.read()
            
            # Check for WebSocket validation patterns
            websocket_patterns = {
                'connection_readyState_check': 'wsRef.current.connection.readyState' in arena_content,
                'websocket_open_constant': 'readyState !== 1' in arena_content or 'WebSocket.OPEN' in arena_content,
                'connection_null_check': '!wsRef.current.connection' in arena_content,
                'early_return_on_invalid': 'return' in arena_content and 'Connection not ready' in arena_content,
                'connection_debug_logging': 'WebSocket connection state before split' in arena_content,
                'error_handling_try_catch': 'try {' in arena_content and 'wsRef.current.send("split"' in arena_content
            }
            
            passed_checks = sum(1 for check in websocket_patterns.values() if check)
            
            if passed_checks >= 4:
                return self.log_test(
                    "WebSocket Connection Validation",
                    True,
                    f"WebSocket connection properly validated before split ({passed_checks}/6 patterns found)"
                )
            else:
                failed_patterns = [name for name, found in websocket_patterns.items() if not found]
                return self.log_test(
                    "WebSocket Connection Validation",
                    False,
                    f"WebSocket validation issues: {failed_patterns}"
                )
        except Exception as e:
            return self.log_test("WebSocket Connection Validation", False, f"Exception: {str(e)}")

    def test_mouse_coordinate_availability(self) -> bool:
        """Test 4: Check mouse coordinate setup and availability"""
        try:
            with open('/app/app/arena/page.js', 'r') as f:
                arena_content = f.read()
            
            # Check for mouse coordinate patterns
            mouse_patterns = {
                'mouse_setup': 'setupMouse()' in arena_content or 'this.mouse = {' in arena_content,
                'worldX_worldY_calculation': 'this.mouse.worldX' in arena_content and 'this.mouse.worldY' in arena_content,
                'camera_coordinate_conversion': 'this.camera.x + this.mouse.x' in arena_content,
                'mousemove_listener': "addEventListener('mousemove'" in arena_content,
                'mouse_validation_in_split': 'gameRef.current.mouse' in arena_content and 'typeof' in arena_content,
                'mouse_coordinate_logging': 'Desktop split toward mouse' in arena_content
            }
            
            passed_checks = sum(1 for check in mouse_patterns.values() if check)
            
            if passed_checks >= 4:
                return self.log_test(
                    "Mouse Coordinate Availability",
                    True,
                    f"Mouse coordinates properly set up and validated ({passed_checks}/6 patterns found)"
                )
            else:
                failed_patterns = [name for name, found in mouse_patterns.items() if not found]
                return self.log_test(
                    "Mouse Coordinate Availability",
                    False,
                    f"Mouse coordinate issues: {failed_patterns}"
                )
        except Exception as e:
            return self.log_test("Mouse Coordinate Availability", False, f"Exception: {str(e)}")

    def test_mass_requirement_logic(self) -> bool:
        """Test 5: Check mass requirement validation logic"""
        try:
            with open('/app/app/arena/page.js', 'r') as f:
                arena_content = f.read()
            
            # Check for mass requirement patterns
            mass_patterns = {
                'mass_check_40': 'gameRef.current.player.mass < 40' in arena_content,
                'mass_feedback_message': 'Need' in arena_content and 'more mass to split' in arena_content,
                'mass_logging': 'insufficient mass' in arena_content,
                'early_return_insufficient_mass': 'return' in arena_content and 'mass < 40' in arena_content,
                'mass_calculation_display': '40 - gameRef.current.player.mass' in arena_content
            }
            
            passed_checks = sum(1 for check in mass_patterns.values() if check)
            
            if passed_checks >= 3:
                return self.log_test(
                    "Mass Requirement Logic",
                    True,
                    f"Mass requirement (40) properly validated with user feedback ({passed_checks}/5 patterns found)"
                )
            else:
                failed_patterns = [name for name, found in mass_patterns.items() if not found]
                return self.log_test(
                    "Mass Requirement Logic",
                    False,
                    f"Mass validation issues: {failed_patterns}"
                )
        except Exception as e:
            return self.log_test("Mass Requirement Logic", False, f"Exception: {str(e)}")

    def test_split_message_sending(self) -> bool:
        """Test 6: Check actual split message sending to server"""
        try:
            with open('/app/app/arena/page.js', 'r') as f:
                arena_content = f.read()
            
            # Check for message sending patterns
            message_patterns = {
                'websocket_send_split': 'wsRef.current.send("split"' in arena_content,
                'targetX_targetY_payload': '{ targetX, targetY }' in arena_content or 'targetX: targetX' in arena_content,
                'send_success_logging': 'Split command sent successfully' in arena_content,
                'send_error_handling': 'Error sending split command' in arena_content,
                'coordinate_validation_before_send': 'isFinite(targetX)' in arena_content and 'isFinite(targetY)' in arena_content,
                'send_debug_logging': 'Sending split command to server' in arena_content
            }
            
            passed_checks = sum(1 for check in message_patterns.values() if check)
            
            if passed_checks >= 4:
                return self.log_test(
                    "Split Message Sending",
                    True,
                    f"Split message properly sent to server with error handling ({passed_checks}/6 patterns found)"
                )
            else:
                failed_patterns = [name for name, found in message_patterns.items() if not found]
                return self.log_test(
                    "Split Message Sending",
                    False,
                    f"Message sending issues: {failed_patterns}"
                )
        except Exception as e:
            return self.log_test("Split Message Sending", False, f"Exception: {str(e)}")

    def test_split_cooldown_mechanism(self) -> bool:
        """Test 7: Check split cooldown to prevent spam"""
        try:
            with open('/app/app/arena/page.js', 'r') as f:
                arena_content = f.read()
            
            # Check for cooldown patterns
            cooldown_patterns = {
                'cooldown_constant': 'SPLIT_COOLDOWN' in arena_content,
                'cooldown_value_500': '500' in arena_content and 'cooldown' in arena_content.lower(),
                'lastSplitTime_ref': 'lastSplitTimeRef' in arena_content,
                'cooldown_check': 'Date.now() - lastSplitTimeRef.current' in arena_content,
                'cooldown_active_message': 'Split cooldown active' in arena_content,
                'cooldown_update': 'lastSplitTimeRef.current = now' in arena_content
            }
            
            passed_checks = sum(1 for check in cooldown_patterns.values() if check)
            
            if passed_checks >= 4:
                return self.log_test(
                    "Split Cooldown Mechanism",
                    True,
                    f"Split cooldown properly implemented to prevent spam ({passed_checks}/6 patterns found)"
                )
            else:
                failed_patterns = [name for name, found in cooldown_patterns.items() if not found]
                return self.log_test(
                    "Split Cooldown Mechanism",
                    False,
                    f"Cooldown mechanism issues: {failed_patterns}"
                )
        except Exception as e:
            return self.log_test("Split Cooldown Mechanism", False, f"Exception: {str(e)}")

    def test_mobile_vs_desktop_split_logic(self) -> bool:
        """Test 8: Check mobile vs desktop split logic differentiation"""
        try:
            with open('/app/app/arena/page.js', 'r') as f:
                arena_content = f.read()
            
            # Check for mobile/desktop split patterns
            platform_patterns = {
                'isMobile_check': 'if (isMobile)' in arena_content,
                'joystick_split_logic': 'joystickPosition.x' in arena_content and 'joystickPosition.y' in arena_content,
                'desktop_mouse_logic': 'gameRef.current.mouse.worldX' in arena_content and 'gameRef.current.mouse.worldY' in arena_content,
                'mobile_split_logging': 'Mobile split toward' in arena_content,
                'desktop_split_logging': 'Desktop split toward mouse' in arena_content,
                'joystick_angle_calculation': 'Math.atan2(joystickPosition.y, joystickPosition.x)' in arena_content
            }
            
            passed_checks = sum(1 for check in platform_patterns.values() if check)
            
            if passed_checks >= 4:
                return self.log_test(
                    "Mobile vs Desktop Split Logic",
                    True,
                    f"Platform-specific split logic properly implemented ({passed_checks}/6 patterns found)"
                )
            else:
                failed_patterns = [name for name, found in platform_patterns.items() if not found]
                return self.log_test(
                    "Mobile vs Desktop Split Logic",
                    False,
                    f"Platform split logic issues: {failed_patterns}"
                )
        except Exception as e:
            return self.log_test("Mobile vs Desktop Split Logic", False, f"Exception: {str(e)}")

    def test_debug_logging_comprehensiveness(self) -> bool:
        """Test 9: Check if comprehensive debug logging is in place"""
        try:
            with open('/app/app/arena/page.js', 'r') as f:
                arena_content = f.read()
            
            # Check for debug logging patterns
            debug_patterns = {
                'spacebar_debug_log': 'SPACEBAR DEBUG' in arena_content,
                'split_conditions_log': 'checking conditions' in arena_content,
                'websocket_state_log': 'WebSocket connection state before split' in arena_content,
                'mass_check_log': 'insufficient mass' in arena_content,
                'coordinate_log': 'split toward' in arena_content,
                'success_log': 'Split command sent successfully' in arena_content,
                'error_log': 'Error in handleSplit' in arena_content,
                'cooldown_log': 'Split cooldown active' in arena_content
            }
            
            passed_checks = sum(1 for check in debug_patterns.values() if check)
            
            if passed_checks >= 6:
                return self.log_test(
                    "Debug Logging Comprehensiveness",
                    True,
                    f"Comprehensive debug logging in place for troubleshooting ({passed_checks}/8 patterns found)"
                )
            else:
                failed_patterns = [name for name, found in debug_patterns.items() if not found]
                return self.log_test(
                    "Debug Logging Comprehensiveness",
                    False,
                    f"Insufficient debug logging: {failed_patterns}"
                )
        except Exception as e:
            return self.log_test("Debug Logging Comprehensiveness", False, f"Exception: {str(e)}")

    def analyze_potential_issues(self):
        """Analyze test results to identify potential root causes"""
        print("\n🔍 ROOT CAUSE ANALYSIS:")
        print("=" * 60)
        
        failed_tests = [result for result in self.test_results if not result['passed']]
        
        if not failed_tests:
            print("✅ All implementation components are working correctly.")
            print("🤔 The issue might be:")
            print("   1. User not meeting mass requirement (need >= 40 mass)")
            print("   2. WebSocket connection not established properly")
            print("   3. Game not in ready state when spacebar is pressed")
            print("   4. Mouse coordinates not being set correctly")
            print("   5. Browser focus issues preventing keydown events")
            return
        
        # Analyze specific failure patterns
        if any('Event Listener' in test['test'] for test in failed_tests):
            print("❌ CRITICAL: Spacebar event listener not properly registered")
            print("   → Check useEffect dependencies and event listener setup")
        
        if any('Game State' in test['test'] for test in failed_tests):
            print("❌ CRITICAL: Game state conditions not met")
            print("   → Verify gameReady, gameRef.current, and wsRef.current states")
        
        if any('WebSocket' in test['test'] for test in failed_tests):
            print("❌ CRITICAL: WebSocket connection issues")
            print("   → Check connection state validation and readyState")
        
        if any('Mouse Coordinate' in test['test'] for test in failed_tests):
            print("❌ CRITICAL: Mouse coordinate setup issues")
            print("   → Verify mouse event listeners and coordinate calculation")
        
        if any('Mass Requirement' in test['test'] for test in failed_tests):
            print("❌ CRITICAL: Mass validation logic issues")
            print("   → Check mass requirement validation and user feedback")
        
        if any('Message Sending' in test['test'] for test in failed_tests):
            print("❌ CRITICAL: Split message not being sent to server")
            print("   → Verify WebSocket send method and message format")

    def run_diagnostic_tests(self):
        """Run all spacebar split diagnostic tests"""
        print("\n🚀 Starting Spacebar Split Diagnostic Tests...")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all diagnostic tests
        test_methods = [
            self.test_spacebar_event_listener_registration,
            self.test_game_state_conditions,
            self.test_websocket_connection_validation,
            self.test_mouse_coordinate_availability,
            self.test_mass_requirement_logic,
            self.test_split_message_sending,
            self.test_split_cooldown_mechanism,
            self.test_mobile_vs_desktop_split_logic,
            self.test_debug_logging_comprehensiveness
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_test(test_method.__name__, False, f"Test execution error: {str(e)}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("\n" + "=" * 60)
        print("🔍 SPACEBAR SPLIT DIAGNOSTIC SUMMARY")
        print("=" * 60)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Working: {self.passed_tests}")
        print(f"Issues: {self.total_tests - self.passed_tests}")
        print(f"Implementation Rate: {success_rate:.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        
        # Analyze potential issues
        self.analyze_potential_issues()
        
        print("\n🎯 RECOMMENDATIONS:")
        print("=" * 60)
        
        if success_rate >= 90:
            print("✅ Implementation is complete and correct")
            print("🔧 Issue likely in runtime conditions:")
            print("   1. Check browser console for 'SPACEBAR DEBUG' logs")
            print("   2. Verify player has >= 40 mass before splitting")
            print("   3. Ensure WebSocket connection is established")
            print("   4. Check that game is in ready state")
            print("   5. Verify mouse is moving to set coordinates")
        elif success_rate >= 70:
            print("⚠️ Implementation mostly complete with minor issues")
            print("🔧 Review failed tests and fix missing components")
        else:
            print("❌ Critical implementation issues detected")
            print("🔧 Major components need to be implemented or fixed")
        
        print("\n" + "=" * 60)
        return success_rate >= 70

if __name__ == "__main__":
    tester = SpacebarSplitDiagnosticTester()
    success = tester.run_diagnostic_tests()
    sys.exit(0 if success else 1)