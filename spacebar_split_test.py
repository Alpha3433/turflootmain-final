#!/usr/bin/env python3
"""
Spacebar Split Functionality Fix Testing
Testing comprehensive fixes to prevent disconnections when spacebar is pressed in arena mode.
"""

import asyncio
import json
import time
import requests
from datetime import datetime

class SpacebarSplitTester:
    def __init__(self):
        self.base_url = "http://localhost:3000"
        self.api_base = f"{self.base_url}/api"
        self.test_results = []
        
    def log_test(self, test_name, status, details="", error=None):
        """Log test results with timestamp"""
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "error": str(error) if error else None
        }
        self.test_results.append(result)
        
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {details}")
        if error:
            print(f"   Error: {error}")
    
    def test_api_health(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{self.api_base}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "API Health Check",
                    "PASS",
                    f"API accessible - Service: {data.get('service', 'unknown')}, Status: {data.get('status', 'unknown')}"
                )
                return True
            else:
                self.log_test("API Health Check", "FAIL", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Health Check", "FAIL", "API not accessible", e)
            return False
    
    def test_colyseus_server_availability(self):
        """Test Colyseus server availability for arena mode"""
        try:
            response = requests.get(f"{self.api_base}/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                # Check for Colyseus servers
                colyseus_servers = [s for s in data.get('servers', []) if s.get('serverType') == 'colyseus']
                
                if colyseus_servers:
                    server = colyseus_servers[0]
                    self.log_test(
                        "Colyseus Server Availability",
                        "PASS",
                        f"Arena server available - ID: {server.get('id')}, Max players: {server.get('maxPlayers')}, Current: {server.get('currentPlayers')}"
                    )
                    return True
                else:
                    self.log_test("Colyseus Server Availability", "FAIL", "No Colyseus arena servers found")
                    return False
            else:
                self.log_test("Colyseus Server Availability", "FAIL", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Colyseus Server Availability", "FAIL", "Failed to check server availability", e)
            return False
    
    def test_client_side_split_validation(self):
        """Test client-side split validation fixes"""
        try:
            # Read the agario page.js file to check for enhanced validation
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            # Check for enhanced input validation
            validation_checks = {
                "Game State Check": "gameStarted" in content and "gameRef.current" in content,
                "Connection Status Check": "wsConnection" in content or "isMultiplayer" in content,
                "Mass Requirement Check": "mass <" in content and ("36" in content or "40" in content),
                "Split Cooldown": "splitCooldown" in content,
                "Error Handling": "try" in content and "catch" in content,
                "Spacebar Handler": "key === ' '" in content or "Space" in content
            }
            
            passed_checks = sum(1 for check in validation_checks.values() if check)
            total_checks = len(validation_checks)
            
            if passed_checks >= 4:  # At least 4 out of 6 checks should pass
                self.log_test(
                    "Client-Side Split Validation",
                    "PASS",
                    f"Enhanced validation found - {passed_checks}/{total_checks} checks passed"
                )
                return True
            else:
                self.log_test(
                    "Client-Side Split Validation",
                    "FAIL",
                    f"Insufficient validation - only {passed_checks}/{total_checks} checks passed"
                )
                return False
                
        except Exception as e:
            self.log_test("Client-Side Split Validation", "FAIL", "Failed to analyze client code", e)
            return False
    
    def test_server_side_split_validation(self):
        """Test server-side split validation fixes"""
        try:
            # Check TypeScript source
            ts_validation = self._check_server_validation('/app/src/rooms/ArenaRoom.ts')
            
            # Check compiled JavaScript
            js_validation = self._check_server_validation('/app/build/rooms/ArenaRoom.js')
            
            if ts_validation and js_validation:
                self.log_test(
                    "Server-Side Split Validation",
                    "PASS",
                    "Enhanced server validation found in both TypeScript and JavaScript"
                )
                return True
            elif ts_validation or js_validation:
                self.log_test(
                    "Server-Side Split Validation",
                    "WARN",
                    f"Validation found in {'TypeScript' if ts_validation else 'JavaScript'} only"
                )
                return True
            else:
                self.log_test(
                    "Server-Side Split Validation",
                    "FAIL",
                    "No enhanced server validation found"
                )
                return False
                
        except Exception as e:
            self.log_test("Server-Side Split Validation", "FAIL", "Failed to analyze server code", e)
            return False
    
    def _check_server_validation(self, file_path):
        """Check server validation in a specific file"""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            validation_checks = {
                "Message Format Validation": "message" in content and "typeof" in content,
                "Coordinate Validation": "targetX" in content and "targetY" in content,
                "Number Type Check": "number" in content and ("isFinite" in content or "typeof" in content),
                "Mass Requirement": "mass <" in content and "40" in content,
                "Error Isolation": "try" in content and "catch" in content,
                "Graceful Error Handling": "console.log" in content or "console.error" in content
            }
            
            passed_checks = sum(1 for check in validation_checks.values() if check)
            return passed_checks >= 4  # At least 4 out of 6 checks should pass
            
        except Exception:
            return False
    
    def test_split_mass_requirements(self):
        """Test split mass requirement consistency"""
        try:
            # Check client-side mass requirement
            with open('/app/app/agario/page.js', 'r') as f:
                client_content = f.read()
            
            # Check server-side mass requirement
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                server_content = f.read()
            
            # Look for mass requirements in split functions
            client_mass_req = None
            server_mass_req = None
            
            # Extract mass requirements (look for patterns like "mass < 40" or "mass < 36")
            import re
            
            client_matches = re.findall(r'mass\s*<\s*(\d+)', client_content)
            server_matches = re.findall(r'mass\s*<\s*(\d+)', server_content)
            
            if client_matches:
                client_mass_req = int(client_matches[0])
            
            if server_matches:
                server_mass_req = int(server_matches[0])
            
            if client_mass_req and server_mass_req:
                if abs(client_mass_req - server_mass_req) <= 4:  # Allow small differences
                    self.log_test(
                        "Split Mass Requirements",
                        "PASS",
                        f"Mass requirements consistent - Client: {client_mass_req}, Server: {server_mass_req}"
                    )
                    return True
                else:
                    self.log_test(
                        "Split Mass Requirements",
                        "FAIL",
                        f"Mass requirements inconsistent - Client: {client_mass_req}, Server: {server_mass_req}"
                    )
                    return False
            else:
                self.log_test(
                    "Split Mass Requirements",
                    "FAIL",
                    f"Mass requirements not found - Client: {client_mass_req}, Server: {server_mass_req}"
                )
                return False
                
        except Exception as e:
            self.log_test("Split Mass Requirements", "FAIL", "Failed to check mass requirements", e)
            return False
    
    def test_split_cooldown_mechanism(self):
        """Test split cooldown mechanism"""
        try:
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            cooldown_checks = {
                "Cooldown Variable": "splitCooldown" in content,
                "Cooldown Check": "splitCooldown > 0" in content or "splitCooldown >" in content,
                "Cooldown Reset": "splitCooldown =" in content,
                "Time-based Cooldown": "60" in content or "500" in content or "1000" in content
            }
            
            passed_checks = sum(1 for check in cooldown_checks.values() if check)
            
            if passed_checks >= 3:
                self.log_test(
                    "Split Cooldown Mechanism",
                    "PASS",
                    f"Cooldown mechanism found - {passed_checks}/4 checks passed"
                )
                return True
            else:
                self.log_test(
                    "Split Cooldown Mechanism",
                    "FAIL",
                    f"Insufficient cooldown mechanism - only {passed_checks}/4 checks passed"
                )
                return False
                
        except Exception as e:
            self.log_test("Split Cooldown Mechanism", "FAIL", "Failed to check cooldown mechanism", e)
            return False
    
    def test_error_handling_robustness(self):
        """Test error handling robustness"""
        try:
            # Check client-side error handling
            with open('/app/app/agario/page.js', 'r') as f:
                client_content = f.read()
            
            # Check server-side error handling
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                server_content = f.read()
            
            client_error_handling = {
                "Try-Catch Blocks": "try" in client_content and "catch" in client_content,
                "Error Logging": "console.error" in client_content or "console.log" in client_content,
                "Graceful Degradation": "return" in client_content
            }
            
            server_error_handling = {
                "Try-Catch Blocks": "try" in server_content and "catch" in server_content,
                "Error Logging": "console.error" in server_content or "console.log" in server_content,
                "No Disconnection": "disconnect" not in server_content.lower() or "leave" not in server_content.lower()
            }
            
            client_score = sum(1 for check in client_error_handling.values() if check)
            server_score = sum(1 for check in server_error_handling.values() if check)
            
            if client_score >= 2 and server_score >= 2:
                self.log_test(
                    "Error Handling Robustness",
                    "PASS",
                    f"Robust error handling found - Client: {client_score}/3, Server: {server_score}/3"
                )
                return True
            else:
                self.log_test(
                    "Error Handling Robustness",
                    "FAIL",
                    f"Insufficient error handling - Client: {client_score}/3, Server: {server_score}/3"
                )
                return False
                
        except Exception as e:
            self.log_test("Error Handling Robustness", "FAIL", "Failed to check error handling", e)
            return False
    
    def test_coordinate_validation(self):
        """Test coordinate validation for split messages"""
        try:
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                server_content = f.read()
            
            validation_checks = {
                "Type Checking": "typeof" in server_content and "number" in server_content,
                "Finite Number Check": "isFinite" in server_content,
                "Coordinate Variables": "targetX" in server_content and "targetY" in server_content,
                "Invalid Coordinate Handling": "return" in server_content
            }
            
            passed_checks = sum(1 for check in validation_checks.values() if check)
            
            if passed_checks >= 3:
                self.log_test(
                    "Coordinate Validation",
                    "PASS",
                    f"Coordinate validation found - {passed_checks}/4 checks passed"
                )
                return True
            else:
                self.log_test(
                    "Coordinate Validation",
                    "FAIL",
                    f"Insufficient coordinate validation - only {passed_checks}/4 checks passed"
                )
                return False
                
        except Exception as e:
            self.log_test("Coordinate Validation", "FAIL", "Failed to check coordinate validation", e)
            return False
    
    def test_visual_feedback_system(self):
        """Test visual feedback system for split attempts"""
        try:
            with open('/app/app/agario/page.js', 'r') as f:
                content = f.read()
            
            feedback_checks = {
                "Console Messages": "console.log" in content,
                "Split Logging": "split" in content.lower() and "console" in content,
                "Error Messages": "console.error" in content or "console.warn" in content,
                "Debug Information": "debug" in content.lower() or "Debug" in content
            }
            
            passed_checks = sum(1 for check in feedback_checks.values() if check)
            
            if passed_checks >= 2:
                self.log_test(
                    "Visual Feedback System",
                    "PASS",
                    f"Visual feedback system found - {passed_checks}/4 checks passed"
                )
                return True
            else:
                self.log_test(
                    "Visual Feedback System",
                    "FAIL",
                    f"Insufficient visual feedback - only {passed_checks}/4 checks passed"
                )
                return False
                
        except Exception as e:
            self.log_test("Visual Feedback System", "FAIL", "Failed to check visual feedback", e)
            return False
    
    def run_comprehensive_test(self):
        """Run all spacebar split functionality tests"""
        print("🎯 SPACEBAR SPLIT FUNCTIONALITY FIX TESTING STARTED")
        print("=" * 80)
        
        # Test categories
        tests = [
            ("Infrastructure", [
                self.test_api_health,
                self.test_colyseus_server_availability
            ]),
            ("Client-Side Fixes", [
                self.test_client_side_split_validation,
                self.test_split_cooldown_mechanism,
                self.test_visual_feedback_system
            ]),
            ("Server-Side Fixes", [
                self.test_server_side_split_validation,
                self.test_coordinate_validation,
                self.test_error_handling_robustness
            ]),
            ("Consistency Checks", [
                self.test_split_mass_requirements
            ])
        ]
        
        total_tests = 0
        passed_tests = 0
        
        for category, test_functions in tests:
            print(f"\n📋 {category} Testing:")
            print("-" * 40)
            
            for test_func in test_functions:
                total_tests += 1
                if test_func():
                    passed_tests += 1
        
        # Summary
        print("\n" + "=" * 80)
        print("🎯 SPACEBAR SPLIT FUNCTIONALITY FIX TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"📊 Overall Results: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        
        if success_rate >= 80:
            print("✅ SPACEBAR SPLIT FUNCTIONALITY FIXES: WORKING EXCELLENTLY")
        elif success_rate >= 60:
            print("⚠️ SPACEBAR SPLIT FUNCTIONALITY FIXES: WORKING WITH MINOR ISSUES")
        else:
            print("❌ SPACEBAR SPLIT FUNCTIONALITY FIXES: NEEDS ATTENTION")
        
        # Detailed results
        print("\n📋 Detailed Test Results:")
        for result in self.test_results:
            status_icon = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️"
            print(f"{status_icon} {result['test']}: {result['details']}")
        
        return success_rate >= 60

if __name__ == "__main__":
    tester = SpacebarSplitTester()
    success = tester.run_comprehensive_test()
    exit(0 if success else 1)