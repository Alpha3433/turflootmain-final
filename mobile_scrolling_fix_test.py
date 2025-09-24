#!/usr/bin/env python3
"""
TurfLoot Mobile Scrolling Fix Verification Backend Testing
Testing backend systems after mobile scrolling fixes implementation:
1. Backend API Stability - Verify all APIs remain stable after CSS changes
2. Page Loading Verification - Ensure page loads correctly with new mobile styles
3. Server-Side Rendering - Test that CSS changes don't break SSR
4. API Health Check - Verify critical endpoints are operational
5. No Regressions - Ensure existing functionality remains intact
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://agario-multiplayer.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class MobileScrollingFixTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.start_time = time.time()
        
    def log_test(self, test_name, passed, details="", error_msg=""):
        """Log test result with detailed information"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            self.failed_tests += 1
            status = "❌ FAILED"
            
        result = {
            'test': test_name,
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

    def test_api_health_check(self):
        """Test 1: API Health Check - Verify backend is operational after mobile fixes"""
        try:
            response = requests.get(f"{API_BASE}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', 'unknown')
                status = data.get('status', 'unknown')
                features = data.get('features', [])
                
                details = f"Service: {service_name}, Status: {status}, Features: {features}"
                self.log_test("API Health Check", True, details)
                return True
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}", response.text[:200])
                return False
        except Exception as e:
            self.log_test("API Health Check", False, "", str(e))
            return False

    def test_page_loading_verification(self):
        """Test 2: Page Loading Verification - Ensure main page loads with mobile fixes"""
        try:
            response = requests.get(BASE_URL, timeout=15)
            if response.status_code == 200:
                content = response.text
                
                # Check for key mobile scrolling fix indicators
                mobile_fixes_found = []
                
                # Check for conditional overflow fix
                if "overflow: isMobile ? 'auto' : 'hidden'" in content:
                    mobile_fixes_found.append("Conditional overflow fix")
                
                # Check for mobile-specific properties
                if "overflowY: 'auto'" in content:
                    mobile_fixes_found.append("Mobile overflowY property")
                
                if "WebkitOverflowScrolling: 'touch'" in content:
                    mobile_fixes_found.append("iOS smooth scrolling")
                
                # Check for global CSS media query
                if "@media (max-width: 768px)" in content:
                    mobile_fixes_found.append("Mobile media query")
                
                if "-webkit-overflow-scrolling: touch" in content:
                    mobile_fixes_found.append("Global webkit scrolling")
                
                if len(mobile_fixes_found) >= 3:
                    details = f"Mobile fixes detected: {', '.join(mobile_fixes_found)}"
                    self.log_test("Page Loading Verification", True, details)
                    return True
                else:
                    details = f"Only {len(mobile_fixes_found)} mobile fixes found: {', '.join(mobile_fixes_found)}"
                    self.log_test("Page Loading Verification", False, details)
                    return False
            else:
                self.log_test("Page Loading Verification", False, f"HTTP {response.status_code}", response.text[:200])
                return False
        except Exception as e:
            self.log_test("Page Loading Verification", False, "", str(e))
            return False

    def test_server_browser_api(self):
        """Test 3: Server Browser API - Verify servers endpoint works after mobile fixes"""
        try:
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                total_players = data.get('totalPlayers', 0)
                total_active = data.get('totalActiveServers', 0)
                
                details = f"Servers: {len(servers)}, Players: {total_players}, Active: {total_active}"
                self.log_test("Server Browser API", True, details)
                return True
            else:
                self.log_test("Server Browser API", False, f"HTTP {response.status_code}", response.text[:200])
                return False
        except Exception as e:
            self.log_test("Server Browser API", False, "", str(e))
            return False

    def test_wallet_balance_api(self):
        """Test 4: Wallet Balance API - Verify wallet endpoint works after mobile fixes"""
        try:
            response = requests.get(f"{API_BASE}/wallet/balance", timeout=10)
            if response.status_code == 200:
                data = response.json()
                balance = data.get('balance', 0)
                currency = data.get('currency', 'unknown')
                wallet_address = data.get('wallet_address', 'unknown')
                
                details = f"Balance: {balance}, Currency: {currency}, Wallet: {wallet_address}"
                self.log_test("Wallet Balance API", True, details)
                return True
            else:
                self.log_test("Wallet Balance API", False, f"HTTP {response.status_code}", response.text[:200])
                return False
        except Exception as e:
            self.log_test("Wallet Balance API", False, "", str(e))
            return False

    def test_css_compilation_check(self):
        """Test 5: CSS Compilation Check - Verify styles compile correctly"""
        try:
            response = requests.get(BASE_URL, timeout=15)
            if response.status_code == 200:
                content = response.text
                
                # Check for CSS compilation indicators
                css_indicators = []
                
                # Check for Next.js CSS compilation
                if "_next/static" in content:
                    css_indicators.append("Next.js static assets")
                
                # Check for inline styles (JSX styles)
                if "jsx global" in content:
                    css_indicators.append("JSX global styles")
                
                # Check for Tailwind CSS
                if "tailwind" in content.lower():
                    css_indicators.append("Tailwind CSS")
                
                # Check for font imports
                if "fonts.googleapis.com" in content:
                    css_indicators.append("Google Fonts")
                
                if len(css_indicators) >= 2:
                    details = f"CSS compilation indicators: {', '.join(css_indicators)}"
                    self.log_test("CSS Compilation Check", True, details)
                    return True
                else:
                    details = f"Limited CSS indicators: {', '.join(css_indicators)}"
                    self.log_test("CSS Compilation Check", False, details)
                    return False
            else:
                self.log_test("CSS Compilation Check", False, f"HTTP {response.status_code}", response.text[:200])
                return False
        except Exception as e:
            self.log_test("CSS Compilation Check", False, "", str(e))
            return False

    def test_responsive_design_elements(self):
        """Test 6: Responsive Design Elements - Verify mobile-specific elements are present"""
        try:
            response = requests.get(BASE_URL, timeout=15)
            if response.status_code == 200:
                content = response.text
                
                # Check for responsive design elements
                responsive_elements = []
                
                # Check for viewport meta tag
                if "viewport" in content and "width=device-width" in content:
                    responsive_elements.append("Viewport meta tag")
                
                # Check for mobile container styles
                if "mobileContainerStyle" in content:
                    responsive_elements.append("Mobile container styles")
                
                # Check for isMobile detection
                if "isMobile" in content:
                    responsive_elements.append("Mobile detection")
                
                # Check for mobile-specific CSS
                if "max-width: 768px" in content:
                    responsive_elements.append("Mobile breakpoint")
                
                if len(responsive_elements) >= 3:
                    details = f"Responsive elements found: {', '.join(responsive_elements)}"
                    self.log_test("Responsive Design Elements", True, details)
                    return True
                else:
                    details = f"Limited responsive elements: {', '.join(responsive_elements)}"
                    self.log_test("Responsive Design Elements", False, details)
                    return False
            else:
                self.log_test("Responsive Design Elements", False, f"HTTP {response.status_code}", response.text[:200])
                return False
        except Exception as e:
            self.log_test("Responsive Design Elements", False, "", str(e))
            return False

    def test_no_server_errors(self):
        """Test 7: No Server Errors - Verify no 500 errors after mobile fixes"""
        try:
            # Test multiple endpoints to ensure no server errors
            endpoints = [
                "/api",
                "/api/servers", 
                "/api/wallet/balance"
            ]
            
            server_errors = []
            successful_endpoints = []
            
            for endpoint in endpoints:
                try:
                    response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
                    if response.status_code >= 500:
                        server_errors.append(f"{endpoint}: HTTP {response.status_code}")
                    else:
                        successful_endpoints.append(f"{endpoint}: HTTP {response.status_code}")
                except Exception as e:
                    server_errors.append(f"{endpoint}: {str(e)}")
            
            if len(server_errors) == 0:
                details = f"All endpoints stable: {', '.join(successful_endpoints)}"
                self.log_test("No Server Errors", True, details)
                return True
            else:
                details = f"Server errors found: {', '.join(server_errors)}"
                self.log_test("No Server Errors", False, details)
                return False
        except Exception as e:
            self.log_test("No Server Errors", False, "", str(e))
            return False

    def run_all_tests(self):
        """Run all mobile scrolling fix verification tests"""
        print("🎯 MOBILE SCROLLING FIX VERIFICATION BACKEND TESTING STARTED")
        print("=" * 80)
        print()
        
        # Run all tests
        tests = [
            self.test_api_health_check,
            self.test_page_loading_verification,
            self.test_server_browser_api,
            self.test_wallet_balance_api,
            self.test_css_compilation_check,
            self.test_responsive_design_elements,
            self.test_no_server_errors
        ]
        
        for test in tests:
            test()
        
        # Calculate results
        end_time = time.time()
        duration = end_time - self.start_time
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print("=" * 80)
        print("🎉 MOBILE SCROLLING FIX VERIFICATION TESTING COMPLETED")
        print(f"📊 RESULTS: {self.passed_tests}/{self.total_tests} tests passed ({success_rate:.1f}% success rate)")
        print(f"⏱️  Duration: {duration:.2f} seconds")
        print()
        
        if success_rate >= 85:
            print("✅ MOBILE SCROLLING FIX VERIFICATION: EXCELLENT - Backend systems stable after mobile fixes")
        elif success_rate >= 70:
            print("✅ MOBILE SCROLLING FIX VERIFICATION: GOOD - Backend systems working well after mobile fixes")
        elif success_rate >= 50:
            print("⚠️  MOBILE SCROLLING FIX VERIFICATION: PARTIAL - Some issues detected after mobile fixes")
        else:
            print("❌ MOBILE SCROLLING FIX VERIFICATION: CRITICAL ISSUES - Backend problems after mobile fixes")
        
        return success_rate

if __name__ == "__main__":
    tester = MobileScrollingFixTester()
    success_rate = tester.run_all_tests()
    
    # Exit with appropriate code
    if success_rate >= 70:
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure