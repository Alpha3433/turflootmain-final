#!/usr/bin/env python3
"""
Production Deployment Verification Test for API Routing Fix
Testing custom name change flow and major API endpoints to verify production deployment fix
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration - Test both production and localhost
PRODUCTION_URL = "https://game-server-hub-5.preview.emergentagent.com"
LOCALHOST_URL = "http://localhost:3000"

# Test data for production deployment verification
TEST_USER_DATA = {
    "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
    "customName": "TestUsername",
    "privyId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
    "email": None
}

REALISTIC_TEST_DATA = [
    {"userId": "did:privy:test001", "customName": "PlayerOne", "privyId": "did:privy:test001"},
    {"userId": "did:privy:test002", "customName": "GamerPro2024", "privyId": "did:privy:test002"},
    {"userId": "did:privy:test003", "customName": "FlowTestUser", "privyId": "did:privy:test003"}
]

class ProductionDeploymentTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_result(self, test_name, status, message, response_time=None, url_type="localhost"):
        """Log test result"""
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "response_time": response_time,
            "url_type": url_type,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        self.total_tests += 1
        
        if status == "PASS":
            self.passed_tests += 1
            print(f"✅ {test_name} - {message}")
        else:
            self.failed_tests += 1
            print(f"❌ {test_name} - {message}")
            
        if response_time:
            print(f"   ⏱️  Response time: {response_time:.3f}s")
        print(f"   🌐 URL: {url_type}")
        print()

    def test_endpoint(self, method, endpoint, base_url, data=None, params=None, test_name="", expected_status=200):
        """Generic endpoint testing function"""
        url = f"{base_url}/api/{endpoint}"
        url_type = "production" if "emergentagent.com" in base_url else "localhost"
        
        try:
            start_time = time.time()
            
            if method.upper() == "GET":
                response = requests.get(url, params=params, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, timeout=10)
            else:
                response = requests.request(method, url, json=data, params=params, timeout=10)
                
            response_time = time.time() - start_time
            
            if response.status_code == expected_status:
                try:
                    response_data = response.json()
                    self.log_result(
                        test_name, 
                        "PASS", 
                        f"Status {response.status_code} - Response received successfully",
                        response_time,
                        url_type
                    )
                    return True, response_data, response_time
                except json.JSONDecodeError:
                    self.log_result(
                        test_name,
                        "FAIL", 
                        f"Status {response.status_code} but invalid JSON response",
                        response_time,
                        url_type
                    )
                    return False, None, response_time
            else:
                self.log_result(
                    test_name,
                    "FAIL", 
                    f"Expected status {expected_status}, got {response.status_code} - {response.text[:200]}",
                    response_time,
                    url_type
                )
                return False, None, response_time
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                test_name,
                "FAIL", 
                f"Request failed: {str(e)}",
                None,
                url_type
            )
            return False, None, None

    def test_custom_name_update_flow(self, base_url):
        """Test 1: Custom Name Change Flow (Primary Issue)"""
        print(f"🎯 TESTING CUSTOM NAME UPDATE FLOW ON {base_url}")
        print("=" * 60)
        
        # Test 1.1: POST /api/users/profile/update-name with realistic data
        success, response_data, response_time = self.test_endpoint(
            "POST",
            "users/profile/update-name",
            base_url,
            data=TEST_USER_DATA,
            test_name="Custom Name Update - Realistic Data"
        )
        
        if not success:
            return False
            
        # Test 1.2: Verify name persistence with GET /api/users/profile
        time.sleep(1)  # Brief delay to ensure database consistency
        
        success, profile_data, response_time = self.test_endpoint(
            "GET",
            "users/profile",
            base_url,
            params={"userId": TEST_USER_DATA["userId"]},
            test_name="Profile Retrieval After Name Update"
        )
        
        if success and profile_data:
            if profile_data.get("username") == TEST_USER_DATA["customName"]:
                self.log_result(
                    "Name Persistence Verification",
                    "PASS",
                    f"Custom name '{TEST_USER_DATA['customName']}' persisted correctly",
                    None,
                    "production" if "emergentagent.com" in base_url else "localhost"
                )
            else:
                self.log_result(
                    "Name Persistence Verification",
                    "FAIL",
                    f"Expected '{TEST_USER_DATA['customName']}', got '{profile_data.get('username')}'",
                    None,
                    "production" if "emergentagent.com" in base_url else "localhost"
                )
                return False
        
        # Test 1.3: Session persistence simulation
        print("🔄 Testing session persistence simulation...")
        for i in range(3):
            time.sleep(1)
            success, profile_data, response_time = self.test_endpoint(
                "GET",
                "users/profile",
                base_url,
                params={"userId": TEST_USER_DATA["userId"]},
                test_name=f"Session Persistence Check #{i+1}"
            )
            
            if not success or profile_data.get("username") != TEST_USER_DATA["customName"]:
                self.log_result(
                    "Session Persistence Simulation",
                    "FAIL",
                    f"Name reverted on check #{i+1}",
                    None,
                    "production" if "emergentagent.com" in base_url else "localhost"
                )
                return False
        
        self.log_result(
            "Session Persistence Simulation",
            "PASS",
            "Custom name persisted across 3 session refresh simulations",
            None,
            "production" if "emergentagent.com" in base_url else "localhost"
        )
        
        return True

    def test_multiple_users_flow(self, base_url):
        """Test realistic multi-user scenarios"""
        print(f"👥 TESTING MULTIPLE USERS FLOW ON {base_url}")
        print("=" * 60)
        
        for i, user_data in enumerate(REALISTIC_TEST_DATA):
            # Update name
            success, response_data, response_time = self.test_endpoint(
                "POST",
                "users/profile/update-name",
                base_url,
                data=user_data,
                test_name=f"Multi-User Test {i+1} - Name Update ({user_data['customName']})"
            )
            
            if not success:
                return False
                
            # Verify retrieval
            time.sleep(0.5)
            success, profile_data, response_time = self.test_endpoint(
                "GET",
                "users/profile",
                base_url,
                params={"userId": user_data["userId"]},
                test_name=f"Multi-User Test {i+1} - Profile Retrieval ({user_data['customName']})"
            )
            
            if not success or profile_data.get("username") != user_data["customName"]:
                return False
        
        return True

    def test_major_api_endpoints(self, base_url):
        """Test 2: API Endpoint Functionality"""
        print(f"🔌 TESTING MAJOR API ENDPOINTS ON {base_url}")
        print("=" * 60)
        
        # Core endpoints
        endpoints_to_test = [
            ("GET", "", "Root API Endpoint"),
            ("GET", "ping", "Ping Endpoint"),
            ("GET", "servers/lobbies", "Server Browser API"),
            ("GET", "stats/live-players", "Live Players Statistics"),
            ("GET", "stats/global-winnings", "Global Winnings Statistics"),
            ("GET", "users/leaderboard", "Leaderboard API"),
            ("GET", "friends/list", "Friends List API"),
        ]
        
        all_passed = True
        
        for method, endpoint, test_name in endpoints_to_test:
            success, response_data, response_time = self.test_endpoint(
                method,
                endpoint,
                base_url,
                test_name=test_name
            )
            
            if not success:
                all_passed = False
                
        return all_passed

    def test_production_mode_verification(self, base_url):
        """Test 3: Production Mode Verification"""
        print(f"⚙️  TESTING PRODUCTION MODE VERIFICATION ON {base_url}")
        print("=" * 60)
        
        # Test API performance and stability
        start_time = time.time()
        
        # Rapid fire test to check stability
        rapid_tests = []
        for i in range(5):
            success, response_data, response_time = self.test_endpoint(
                "GET",
                "ping",
                base_url,
                test_name=f"Stability Test #{i+1}"
            )
            rapid_tests.append(success)
            
        total_time = time.time() - start_time
        
        if all(rapid_tests):
            self.log_result(
                "Production Stability Test",
                "PASS",
                f"All 5 rapid requests succeeded in {total_time:.3f}s",
                total_time,
                "production" if "emergentagent.com" in base_url else "localhost"
            )
            return True
        else:
            self.log_result(
                "Production Stability Test",
                "FAIL",
                f"Only {sum(rapid_tests)}/5 rapid requests succeeded",
                total_time,
                "production" if "emergentagent.com" in base_url else "localhost"
            )
            return False

    def run_comprehensive_test(self):
        """Run all tests on both localhost and production"""
        print("🚀 STARTING COMPREHENSIVE PRODUCTION DEPLOYMENT VERIFICATION")
        print("=" * 80)
        print(f"📅 Test started at: {datetime.now().isoformat()}")
        print()
        
        # Test localhost first (should work)
        print("🏠 TESTING LOCALHOST (Expected to work)")
        print("=" * 80)
        
        localhost_results = {
            "custom_name_flow": self.test_custom_name_update_flow(LOCALHOST_URL),
            "multi_user_flow": self.test_multiple_users_flow(LOCALHOST_URL),
            "major_endpoints": self.test_major_api_endpoints(LOCALHOST_URL),
            "production_mode": self.test_production_mode_verification(LOCALHOST_URL)
        }
        
        print("\n" + "=" * 80)
        print("🌐 TESTING PRODUCTION URL (Verifying deployment fix)")
        print("=" * 80)
        
        # Test production URL (verifying the fix)
        production_results = {
            "custom_name_flow": self.test_custom_name_update_flow(PRODUCTION_URL),
            "multi_user_flow": self.test_multiple_users_flow(PRODUCTION_URL),
            "major_endpoints": self.test_major_api_endpoints(PRODUCTION_URL),
            "production_mode": self.test_production_mode_verification(PRODUCTION_URL)
        }
        
        return localhost_results, production_results

    def generate_summary(self, localhost_results, production_results):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        
        print(f"📈 Total Tests Run: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.failed_tests}")
        print(f"📊 Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        print()
        
        print("🏠 LOCALHOST RESULTS:")
        for test_name, result in localhost_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"   {status} {test_name.replace('_', ' ').title()}")
        
        print("\n🌐 PRODUCTION URL RESULTS:")
        for test_name, result in production_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"   {status} {test_name.replace('_', ' ').title()}")
        
        print("\n🎯 KEY FINDINGS:")
        
        # Check if production deployment fix worked
        if production_results["custom_name_flow"]:
            print("   ✅ PRODUCTION DEPLOYMENT FIX SUCCESSFUL - Custom name changes working")
        else:
            print("   ❌ PRODUCTION DEPLOYMENT FIX FAILED - Custom name changes still failing")
            
        if all(production_results.values()):
            print("   ✅ ALL PRODUCTION TESTS PASSED - Deployment is fully operational")
        else:
            failed_tests = [k for k, v in production_results.items() if not v]
            print(f"   ⚠️  PRODUCTION ISSUES DETECTED in: {', '.join(failed_tests)}")
        
        print(f"\n📅 Test completed at: {datetime.now().isoformat()}")
        
        return all(production_results.values())

def main():
    """Main test execution"""
    tester = ProductionDeploymentTester()
    
    try:
        localhost_results, production_results = tester.run_comprehensive_test()
        overall_success = tester.generate_summary(localhost_results, production_results)
        
        # Save results to file
        results_data = {
            "test_start_time": datetime.now().isoformat(),
            "localhost_results": localhost_results,
            "production_results": production_results,
            "total_tests": tester.total_tests,
            "passed_tests": tester.passed_tests,
            "failed_tests": tester.failed_tests,
            "success_rate": (tester.passed_tests / tester.total_tests * 100) if tester.total_tests > 0 else 0,
            "detailed_results": tester.results
        }
        
        with open('/app/production_deployment_test_results.json', 'w') as f:
            json.dump(results_data, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: /app/production_deployment_test_results.json")
        
        # Return appropriate exit code
        return 0 if overall_success else 1
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR during testing: {str(e)}")
        return 1

if __name__ == "__main__":
    exit(main())