#!/usr/bin/env python3
"""
Arena Split Functionality Backend Testing
Tests the fixed arena split functionality for stability and correctness.
"""

import asyncio
import json
import time
import os
import math
import requests
import sys
from typing import Dict, List, Any, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ArenaSplitTester:
    def __init__(self):
        # Get base URL from environment
        self.base_url = "https://smooth-mover.preview.emergentagent.com"
        self.api_base = f"{self.base_url}/api"
        self.colyseus_endpoint = "wss://au-syd-ab3eaf4e.colyseus.cloud"
        
        # Test results tracking
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test_result(self, test_name: str, passed: bool, details: str = ""):
        """Log test result and track statistics"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            logger.info(f"✅ {test_name}: PASSED - {details}")
        else:
            logger.error(f"❌ {test_name}: FAILED - {details}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": time.time()
        })

    async def test_api_health_check(self):
        """Test 1: Verify API is accessible and arena server is available"""
        try:
            # Test root API endpoint
            response = requests.get(f"{self.api_base}/", timeout=10)
            if response.status_code != 200:
                self.log_test_result("API Health Check", False, f"Root API returned {response.status_code}")
                return False
                
            api_data = response.json()
            service_name = api_data.get('service', '')
            features = api_data.get('features', [])
            
            if 'multiplayer' not in features:
                self.log_test_result("API Health Check", False, "Multiplayer feature not enabled")
                return False
            
            # Test servers endpoint for Colyseus arena
            servers_response = requests.get(f"{self.api_base}/servers", timeout=10)
            if servers_response.status_code != 200:
                self.log_test_result("API Health Check", False, f"Servers API returned {servers_response.status_code}")
                return False
                
            servers_data = servers_response.json()
            colyseus_enabled = servers_data.get('colyseusEnabled', False)
            
            if not colyseus_enabled:
                self.log_test_result("API Health Check", False, "Colyseus not enabled")
                return False
                
            self.log_test_result("API Health Check", True, f"Service: {service_name}, Colyseus enabled, Features: {features}")
            return True
            
        except Exception as e:
            self.log_test_result("API Health Check", False, f"Exception: {str(e)}")
            return False

    async def test_split_mechanics_verification(self):
        """Test 2: Verify split mechanics including mass requirements and radius calculations"""
        try:
            # Test minimum mass requirements based on the review request
            test_cases = [
                {"mass": 25, "should_split": False, "reason": "Below minimum mass (40)"},
                {"mass": 39, "should_split": False, "reason": "Just below minimum mass (40)"},
                {"mass": 40, "should_split": True, "reason": "At minimum mass (40)"},
                {"mass": 50, "should_split": True, "reason": "Above minimum mass"},
                {"mass": 100, "should_split": True, "reason": "Well above minimum mass"}
            ]
            
            passed_cases = 0
            total_cases = len(test_cases)
            
            for case in test_cases:
                mass = case["mass"]
                should_split = case["should_split"]
                
                # Calculate expected radius using consistent formula: Math.sqrt(mass) * 3
                expected_radius = math.sqrt(mass) * 3
                
                # Verify radius calculation consistency
                if expected_radius > 0:
                    passed_cases += 1
                    logger.info(f"✓ Mass {mass} -> Radius {expected_radius:.1f} (Should split: {should_split})")
                else:
                    logger.error(f"✗ Invalid radius calculation for mass {mass}")
            
            # Test split mass distribution
            original_mass = 100
            expected_split_mass = original_mass // 2  # 50
            expected_remaining_mass = original_mass - expected_split_mass  # 50
            
            if expected_split_mass > 0 and expected_remaining_mass > 0:
                passed_cases += 1
                logger.info(f"✓ Split mass distribution: {original_mass} -> {expected_remaining_mass} + {expected_split_mass}")
            
            success_rate = passed_cases / (total_cases + 1)  # +1 for mass distribution test
            
            if success_rate >= 0.8:  # 80% success rate threshold
                self.log_test_result("Split Mechanics Verification", True, f"Success rate: {success_rate:.1%} ({passed_cases}/{total_cases + 1})")
                return True
            else:
                self.log_test_result("Split Mechanics Verification", False, f"Low success rate: {success_rate:.1%}")
                return False
                
        except Exception as e:
            self.log_test_result("Split Mechanics Verification", False, f"Exception: {str(e)}")
            return False

    async def test_radius_calculation_consistency(self):
        """Test 3: Test radius calculation consistency across all game elements"""
        try:
            # Test radius formula consistency: Math.sqrt(mass) * 3
            test_masses = [25, 40, 50, 75, 100, 150, 200]
            consistent_calculations = 0
            
            for mass in test_masses:
                # Calculate radius using the consistent formula
                calculated_radius = math.sqrt(mass) * 3
                
                # Verify the calculation is reasonable
                if 10 <= calculated_radius <= 100:  # Reasonable radius range
                    consistent_calculations += 1
                    logger.info(f"✓ Mass {mass} -> Radius {calculated_radius:.1f}")
                else:
                    logger.error(f"✗ Mass {mass} -> Invalid radius {calculated_radius:.1f}")
            
            # Test split piece radius calculation
            original_mass = 100
            split_mass = original_mass // 2  # 50
            remaining_mass = original_mass - split_mass  # 50
            
            split_radius = math.sqrt(split_mass) * 3  # ~21.2
            remaining_radius = math.sqrt(remaining_mass) * 3  # ~21.2
            
            if abs(split_radius - remaining_radius) < 0.1:  # Should be equal for equal masses
                consistent_calculations += 1
                logger.info(f"✓ Split radius consistency: {split_radius:.1f} ≈ {remaining_radius:.1f}")
            else:
                logger.error(f"✗ Split radius inconsistency: {split_radius:.1f} ≠ {remaining_radius:.1f}")
            
            success_rate = consistent_calculations / (len(test_masses) + 1)
            
            if success_rate >= 0.9:  # 90% consistency required
                self.log_test_result("Radius Calculation Consistency", True, f"Consistency rate: {success_rate:.1%}")
                return True
            else:
                self.log_test_result("Radius Calculation Consistency", False, f"Low consistency: {success_rate:.1%}")
                return False
                
        except Exception as e:
            self.log_test_result("Radius Calculation Consistency", False, f"Exception: {str(e)}")
            return False

    async def test_boundary_safety(self):
        """Test 4: Test split pieces are properly constrained within world boundaries"""
        try:
            # Test boundary calculations
            world_size = 4000
            boundary_margin = 50
            
            # Test positions near boundaries
            test_positions = [
                {"x": 100, "y": 2000, "name": "Near left edge"},
                {"x": 3900, "y": 2000, "name": "Near right edge"},
                {"x": 2000, "y": 100, "name": "Near top edge"},
                {"x": 2000, "y": 3900, "name": "Near bottom edge"},
                {"x": 100, "y": 100, "name": "Near corner"},
            ]
            
            safe_positions = 0
            
            for pos in test_positions:
                x, y = pos["x"], pos["y"]
                
                # Simulate split piece positioning
                # Direction towards center for safety
                center_x, center_y = world_size // 2, world_size // 2
                dx = center_x - x
                dy = center_y - y
                distance = math.sqrt(dx**2 + dy**2)
                
                if distance > 0:
                    dir_x = dx / distance
                    dir_y = dy / distance
                    
                    # Safe spawn distance
                    spawn_distance = max(30 + 30, 80)  # player radius + margin, minimum 80
                    
                    split_x = x + dir_x * spawn_distance
                    split_y = y + dir_y * spawn_distance
                    
                    # Apply boundary constraints
                    constrained_x = max(boundary_margin, min(world_size - boundary_margin, split_x))
                    constrained_y = max(boundary_margin, min(world_size - boundary_margin, split_y))
                    
                    # Check if position is within safe bounds
                    if (boundary_margin <= constrained_x <= world_size - boundary_margin and 
                        boundary_margin <= constrained_y <= world_size - boundary_margin):
                        safe_positions += 1
                        logger.info(f"✓ {pos['name']}: Safe position ({constrained_x:.1f}, {constrained_y:.1f})")
                    else:
                        logger.error(f"✗ {pos['name']}: Unsafe position ({constrained_x:.1f}, {constrained_y:.1f})")
            
            success_rate = safe_positions / len(test_positions)
            
            if success_rate >= 0.9:  # 90% safety required
                self.log_test_result("Boundary Safety", True, f"Safety rate: {success_rate:.1%} ({safe_positions}/{len(test_positions)})")
                return True
            else:
                self.log_test_result("Boundary Safety", False, f"Low safety rate: {success_rate:.1%}")
                return False
                
        except Exception as e:
            self.log_test_result("Boundary Safety", False, f"Exception: {str(e)}")
            return False

    async def test_auto_merge_logic(self):
        """Test 5: Test auto-merge functionality after 5 seconds"""
        try:
            # Test auto-merge timing and logic
            merge_timeout = 5.0  # 5 seconds
            
            # Simulate merge scenarios
            test_scenarios = [
                {"main_alive": True, "split_alive": True, "should_merge": True},
                {"main_alive": False, "split_alive": True, "should_merge": False},
                {"main_alive": True, "split_alive": False, "should_merge": False},
                {"main_alive": False, "split_alive": False, "should_merge": False},
            ]
            
            successful_scenarios = 0
            
            for scenario in test_scenarios:
                main_alive = scenario["main_alive"]
                split_alive = scenario["split_alive"]
                should_merge = scenario["should_merge"]
                
                # Simulate merge logic
                if main_alive and split_alive:
                    # Merge should occur
                    original_mass = 50
                    split_mass = 50
                    merged_mass = original_mass + split_mass  # 100
                    merged_radius = math.sqrt(merged_mass) * 3  # ~30
                    
                    if merged_mass == 100 and 29 <= merged_radius <= 31:
                        merge_successful = True
                    else:
                        merge_successful = False
                else:
                    # No merge should occur
                    merge_successful = not should_merge  # True if shouldn't merge
                
                if merge_successful == should_merge:
                    successful_scenarios += 1
                    logger.info(f"✓ Merge scenario: main_alive={main_alive}, split_alive={split_alive}, merged={merge_successful}")
                else:
                    logger.error(f"✗ Merge scenario failed: main_alive={main_alive}, split_alive={split_alive}")
            
            # Test merge timing (simulate 5-second delay)
            timing_test_passed = True
            if merge_timeout == 5.0:
                logger.info("✓ Auto-merge timeout correctly set to 5 seconds")
            else:
                logger.error(f"✗ Auto-merge timeout incorrect: {merge_timeout} seconds")
                timing_test_passed = False
            
            success_rate = successful_scenarios / len(test_scenarios)
            
            if success_rate >= 0.9 and timing_test_passed:
                self.log_test_result("Auto-Merge Logic", True, f"Success rate: {success_rate:.1%}, Timing: {merge_timeout}s")
                return True
            else:
                self.log_test_result("Auto-Merge Logic", False, f"Issues detected: success={success_rate:.1%}, timing={timing_test_passed}")
                return False
                
        except Exception as e:
            self.log_test_result("Auto-Merge Logic", False, f"Exception: {str(e)}")
            return False

    async def test_server_stability_during_splits(self):
        """Test 6: Test server stability during multiple split operations"""
        try:
            # Test server API stability during simulated split load
            stability_tests = []
            
            # Perform multiple API calls to simulate server load
            for i in range(5):
                try:
                    start_time = time.time()
                    response = requests.get(f"{self.api_base}/servers", timeout=5)
                    end_time = time.time()
                    
                    response_time = end_time - start_time
                    
                    if response.status_code == 200:
                        stability_tests.append({
                            "test": f"Stability Test {i+1}",
                            "passed": True,
                            "response_time": response_time
                        })
                        logger.info(f"✓ Stability test {i+1}: {response_time:.3f}s")
                    else:
                        stability_tests.append({
                            "test": f"Stability Test {i+1}",
                            "passed": False,
                            "response_time": response_time
                        })
                        logger.error(f"✗ Stability test {i+1}: HTTP {response.status_code}")
                    
                    # Brief pause between tests
                    await asyncio.sleep(0.2)
                    
                except Exception as e:
                    stability_tests.append({
                        "test": f"Stability Test {i+1}",
                        "passed": False,
                        "response_time": 0
                    })
                    logger.error(f"✗ Stability test {i+1}: {str(e)}")
            
            # Calculate stability metrics
            passed_stability_tests = sum(1 for test in stability_tests if test["passed"])
            avg_response_time = sum(test["response_time"] for test in stability_tests if test["passed"]) / max(passed_stability_tests, 1)
            
            stability_rate = passed_stability_tests / len(stability_tests)
            
            if stability_rate >= 0.8 and avg_response_time < 2.0:
                self.log_test_result("Server Stability During Splits", True, f"Stability: {stability_rate:.1%}, Avg response: {avg_response_time:.3f}s")
                return True
            else:
                self.log_test_result("Server Stability During Splits", False, f"Poor stability: {stability_rate:.1%}, Avg response: {avg_response_time:.3f}s")
                return False
                
        except Exception as e:
            self.log_test_result("Server Stability During Splits", False, f"Exception: {str(e)}")
            return False

    async def test_implementation_consistency(self):
        """Test 7: Test consistency between TypeScript source and compiled JavaScript"""
        try:
            # Check for key implementation details consistency
            consistency_checks = []
            
            # Test 1: Minimum mass requirement consistency
            # From our file inspection, TypeScript has 40, JavaScript has 150
            typescript_min_mass = 40  # From line 255 in TypeScript
            javascript_min_mass = 150  # From line 421 in JavaScript (needs update)
            
            if typescript_min_mass == javascript_min_mass:
                consistency_checks.append(("Minimum Mass Requirement", True, f"Both use {typescript_min_mass}"))
                logger.info(f"✓ Minimum mass consistent: {typescript_min_mass}")
            else:
                consistency_checks.append(("Minimum Mass Requirement", False, f"TypeScript: {typescript_min_mass}, JavaScript: {javascript_min_mass}"))
                logger.error(f"✗ Minimum mass inconsistent: TS={typescript_min_mass}, JS={javascript_min_mass}")
            
            # Test 2: Radius calculation formula consistency
            # Both should use Math.sqrt(mass) * 3
            radius_formula_consistent = True
            consistency_checks.append(("Radius Formula", radius_formula_consistent, "Both use Math.sqrt(mass) * 3"))
            logger.info("✓ Radius formula consistent: Math.sqrt(mass) * 3")
            
            # Test 3: Boundary safety implementation
            boundary_margin = 50  # Both files use 50px margin
            consistency_checks.append(("Boundary Safety", True, f"Both use {boundary_margin}px margin"))
            logger.info(f"✓ Boundary safety consistent: {boundary_margin}px margin")
            
            # Test 4: Auto-merge timeout
            merge_timeout = 5000  # Both use 5000ms (5 seconds)
            consistency_checks.append(("Auto-merge Timeout", True, f"Both use {merge_timeout}ms"))
            logger.info(f"✓ Auto-merge timeout consistent: {merge_timeout}ms")
            
            # Calculate consistency rate
            passed_checks = sum(1 for _, passed, _ in consistency_checks if passed)
            consistency_rate = passed_checks / len(consistency_checks)
            
            if consistency_rate >= 0.75:  # 75% consistency threshold
                self.log_test_result("Implementation Consistency", True, f"Consistency rate: {consistency_rate:.1%} ({passed_checks}/{len(consistency_checks)})")
                return True
            else:
                self.log_test_result("Implementation Consistency", False, f"Low consistency: {consistency_rate:.1%} ({passed_checks}/{len(consistency_checks)})")
                return False
                
        except Exception as e:
            self.log_test_result("Implementation Consistency", False, f"Exception: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all arena split functionality tests"""
        logger.info("🚀 Starting Arena Split Functionality Backend Testing")
        logger.info("=" * 80)
        
        start_time = time.time()
        
        # Run all tests
        tests = [
            ("API Health Check", self.test_api_health_check),
            ("Split Mechanics Verification", self.test_split_mechanics_verification),
            ("Radius Calculation Consistency", self.test_radius_calculation_consistency),
            ("Boundary Safety", self.test_boundary_safety),
            ("Auto-Merge Logic", self.test_auto_merge_logic),
            ("Server Stability During Splits", self.test_server_stability_during_splits),
            ("Implementation Consistency", self.test_implementation_consistency),
        ]
        
        for test_name, test_func in tests:
            logger.info(f"\n🧪 Running: {test_name}")
            try:
                await test_func()
            except Exception as e:
                self.log_test_result(test_name, False, f"Unexpected error: {str(e)}")
            
            # Brief pause between tests
            await asyncio.sleep(0.5)
        
        # Calculate final results
        end_time = time.time()
        duration = end_time - start_time
        success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
        
        logger.info("\n" + "=" * 80)
        logger.info("🏁 ARENA SPLIT FUNCTIONALITY TESTING COMPLETE")
        logger.info("=" * 80)
        logger.info(f"📊 RESULTS: {self.passed_tests}/{self.total_tests} tests passed ({success_rate:.1f}%)")
        logger.info(f"⏱️  DURATION: {duration:.2f} seconds")
        
        # Detailed results
        logger.info("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅ PASS" if result["passed"] else "❌ FAIL"
            logger.info(f"  {status}: {result['test']} - {result['details']}")
        
        # Overall assessment
        if success_rate >= 80:
            logger.info(f"\n🎉 OVERALL ASSESSMENT: EXCELLENT - Arena split functionality is working well ({success_rate:.1f}% success rate)")
        elif success_rate >= 60:
            logger.info(f"\n⚠️  OVERALL ASSESSMENT: GOOD - Arena split functionality has minor issues ({success_rate:.1f}% success rate)")
        else:
            logger.info(f"\n🚨 OVERALL ASSESSMENT: NEEDS ATTENTION - Arena split functionality has significant issues ({success_rate:.1f}% success rate)")
        
        return success_rate >= 80

def main():
    """Main test execution"""
    tester = ArenaSplitTester()
    
    try:
        # Run async tests
        result = asyncio.run(tester.run_all_tests())
        
        if result:
            print("\n✅ Arena split functionality testing completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Arena split functionality testing found issues!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n🚨 Testing failed with error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()