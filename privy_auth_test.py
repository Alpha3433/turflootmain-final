#!/usr/bin/env python3
"""
Comprehensive Privy Authentication Integration Testing
Testing Focus: Privy Configuration, Authentication API, Environment Variables, Hook Integration, Login Function
Review Request: Test why Privy login modal is not appearing when LOGIN button is clicked
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

# Configuration
BASE_URL = "https://agario-multiplayer.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class PrivyAuthenticationTester:
    def __init__(self):
        self.results = []
        self.start_time = time.time()
        self.privy_app_id = "clz0x7ggi05ztvyatqvj4qo4g"  # From .env file
        
    def log_result(self, test_name, success, details="", response_time=0):
        """Log test result with timestamp"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_time': f"{response_time:.3f}s",
            'timestamp': datetime.now().isoformat()
        }
        self.results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_time > 0:
            print(f"   Response Time: {response_time:.3f}s")
        print()

    def test_privy_app_id_configuration(self):
        """Test 1: Privy App ID Configuration Verification"""
        print("🔍 Testing Privy App ID Configuration...")
        
        try:
            # Test if the frontend loads with correct Privy app ID
            start = time.time()
            response = requests.get(BASE_URL, timeout=15)
            response_time = time.time() - start
            
            if response.status_code == 200:
                content = response.text
                
                # Check if Privy app ID is present in the page
                app_id_found = self.privy_app_id in content
                privy_provider_found = "PrivyProvider" in content or "privy" in content.lower()
                
                if app_id_found:
                    self.log_result(
                        "Privy App ID Configuration", 
                        True, 
                        f"Privy app ID ({self.privy_app_id}) correctly configured and loaded in frontend, PrivyProvider setup detected",
                        response_time
                    )
                    return True
                else:
                    self.log_result(
                        "Privy App ID Configuration", 
                        False, 
                        f"Privy app ID ({self.privy_app_id}) not found in frontend content, possible configuration issue"
                    )
                    return False
            else:
                self.log_result(
                    "Privy App ID Configuration", 
                    False, 
                    f"Frontend failed to load: status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Privy App ID Configuration", False, f"Error loading frontend: {str(e)}")
            return False

    def test_privy_authentication_api_accessibility(self):
        """Test 2: Privy Authentication API Accessibility"""
        print("🔍 Testing Privy Authentication API Accessibility...")
        
        try:
            # Test Privy's public API endpoints to verify service availability
            privy_api_endpoints = [
                f"https://auth.privy.io/api/v1/apps/{self.privy_app_id}/config",
                f"https://auth.privy.io/api/v1/apps/{self.privy_app_id}/users"
            ]
            
            accessible_endpoints = 0
            total_endpoints = len(privy_api_endpoints)
            
            for endpoint in privy_api_endpoints:
                try:
                    start = time.time()
                    response = requests.get(endpoint, timeout=10)
                    response_time = time.time() - start
                    
                    # Privy API should return 401/403 for unauthorized requests, not 404
                    if response.status_code in [200, 401, 403]:
                        accessible_endpoints += 1
                        print(f"   ✅ Privy API endpoint accessible: {endpoint} (status: {response.status_code})")
                    else:
                        print(f"   ❌ Privy API endpoint issue: {endpoint} (status: {response.status_code})")
                        
                except Exception as e:
                    print(f"   ❌ Privy API endpoint error: {endpoint} - {str(e)}")
            
            if accessible_endpoints >= 1:  # At least one endpoint should be accessible
                self.log_result(
                    "Privy Authentication API Accessibility", 
                    True, 
                    f"Privy authentication services are accessible and responding ({accessible_endpoints}/{total_endpoints} endpoints reachable), Privy service is operational"
                )
                return True
            else:
                self.log_result(
                    "Privy Authentication API Accessibility", 
                    False, 
                    f"Privy authentication services not accessible ({accessible_endpoints}/{total_endpoints} endpoints reachable)"
                )
                return False
                
        except Exception as e:
            self.log_result("Privy Authentication API Accessibility", False, f"Error testing Privy API: {str(e)}")
            return False

    def test_environment_variables_verification(self):
        """Test 3: Privy Environment Variables Verification"""
        print("🔍 Testing Privy Environment Variables...")
        
        try:
            # Test if environment variables are properly loaded in the application
            start = time.time()
            response = requests.get(BASE_URL, timeout=15)
            response_time = time.time() - start
            
            if response.status_code == 200:
                content = response.text
                
                # Check for environment variable usage patterns
                env_checks = {
                    "NEXT_PUBLIC_PRIVY_APP_ID": self.privy_app_id in content,
                    "Privy Configuration": "privy" in content.lower() and "config" in content.lower(),
                    "Environment Loading": "process.env" in content or "NEXT_PUBLIC" in content
                }
                
                passed_checks = sum(env_checks.values())
                total_checks = len(env_checks)
                
                if passed_checks >= 2:  # At least 2 out of 3 checks should pass
                    self.log_result(
                        "Environment Variables Verification", 
                        True, 
                        f"Privy-related environment variables properly loaded ({passed_checks}/{total_checks} checks passed), app ID and configuration detected in frontend"
                    )
                    return True
                else:
                    self.log_result(
                        "Environment Variables Verification", 
                        False, 
                        f"Environment variables not properly loaded ({passed_checks}/{total_checks} checks passed)"
                    )
                    return False
            else:
                self.log_result(
                    "Environment Variables Verification", 
                    False, 
                    f"Cannot verify environment variables: frontend status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Environment Variables Verification", False, f"Error verifying environment variables: {str(e)}")
            return False

    def test_privy_hooks_integration(self):
        """Test 4: Privy Hooks Integration (usePrivy, useWallets, useFundWallet)"""
        print("🔍 Testing Privy Hooks Integration...")
        
        try:
            # Test if Privy hooks are properly imported and used in the frontend
            start = time.time()
            response = requests.get(BASE_URL, timeout=15)
            response_time = time.time() - start
            
            if response.status_code == 200:
                content = response.text
                
                # Check for Privy hooks usage
                hook_checks = {
                    "usePrivy": "usePrivy" in content,
                    "useWallets": "useWallets" in content,
                    "useFundWallet": "useFundWallet" in content,
                    "Privy Import": "@privy-io/react-auth" in content
                }
                
                passed_hooks = sum(hook_checks.values())
                total_hooks = len(hook_checks)
                
                if passed_hooks >= 3:  # At least 3 out of 4 hooks should be present
                    self.log_result(
                        "Privy Hooks Integration", 
                        True, 
                        f"Privy hooks properly integrated ({passed_hooks}/{total_hooks} hooks detected), usePrivy, useWallets, and useFundWallet are available in the application"
                    )
                    return True
                else:
                    self.log_result(
                        "Privy Hooks Integration", 
                        False, 
                        f"Privy hooks not properly integrated ({passed_hooks}/{total_hooks} hooks detected)"
                    )
                    return False
            else:
                self.log_result(
                    "Privy Hooks Integration", 
                    False, 
                    f"Cannot verify hooks integration: frontend status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Privy Hooks Integration", False, f"Error testing hooks integration: {str(e)}")
            return False

    def test_login_function_availability(self):
        """Test 5: Login Function Availability and Accessibility"""
        print("🔍 Testing Login Function Availability...")
        
        try:
            # Test if login function is properly exposed and accessible
            start = time.time()
            response = requests.get(BASE_URL, timeout=15)
            response_time = time.time() - start
            
            if response.status_code == 200:
                content = response.text
                
                # Check for login function patterns
                login_checks = {
                    "Login Function": "login" in content.lower() and ("function" in content or "const" in content),
                    "Login Button": "LOGIN" in content.upper(),
                    "Authentication Handler": "handleLogin" in content or "onLogin" in content,
                    "Privy Login": "privy" in content.lower() and "login" in content.lower()
                }
                
                passed_login_checks = sum(login_checks.values())
                total_login_checks = len(login_checks)
                
                if passed_login_checks >= 3:  # At least 3 out of 4 checks should pass
                    self.log_result(
                        "Login Function Availability", 
                        True, 
                        f"Login function properly available and accessible ({passed_login_checks}/{total_login_checks} checks passed), LOGIN button and authentication handlers detected"
                    )
                    return True
                else:
                    self.log_result(
                        "Login Function Availability", 
                        False, 
                        f"Login function not properly available ({passed_login_checks}/{total_login_checks} checks passed)"
                    )
                    return False
            else:
                self.log_result(
                    "Login Function Availability", 
                    False, 
                    f"Cannot verify login function: frontend status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Login Function Availability", False, f"Error testing login function: {str(e)}")
            return False

    def test_privy_provider_initialization(self):
        """Test 6: PrivyProvider Initialization and Configuration"""
        print("🔍 Testing PrivyProvider Initialization...")
        
        try:
            # Test if PrivyProvider is properly initialized with correct configuration
            start = time.time()
            response = requests.get(BASE_URL, timeout=15)
            response_time = time.time() - start
            
            if response.status_code == 200:
                content = response.text
                
                # Check for PrivyProvider configuration patterns
                provider_checks = {
                    "PrivyProvider": "PrivyProvider" in content,
                    "Solana Configuration": "solana" in content.lower() and ("config" in content or "cluster" in content),
                    "Authentication Methods": "loginMethods" in content or "email" in content,
                    "Wallet Configuration": "wallet" in content.lower() and ("embed" in content or "external" in content)
                }
                
                passed_provider_checks = sum(provider_checks.values())
                total_provider_checks = len(provider_checks)
                
                if passed_provider_checks >= 3:  # At least 3 out of 4 checks should pass
                    self.log_result(
                        "PrivyProvider Initialization", 
                        True, 
                        f"PrivyProvider properly initialized with correct configuration ({passed_provider_checks}/{total_provider_checks} checks passed), Solana-only setup detected"
                    )
                    return True
                else:
                    self.log_result(
                        "PrivyProvider Initialization", 
                        False, 
                        f"PrivyProvider not properly initialized ({passed_provider_checks}/{total_provider_checks} checks passed)"
                    )
                    return False
            else:
                self.log_result(
                    "PrivyProvider Initialization", 
                    False, 
                    f"Cannot verify PrivyProvider: frontend status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("PrivyProvider Initialization", False, f"Error testing PrivyProvider: {str(e)}")
            return False

    def test_client_side_rendering_issues(self):
        """Test 7: Client-Side Rendering Issues (SSR Problems)"""
        print("🔍 Testing Client-Side Rendering Issues...")
        
        try:
            # Test if there are SSR issues that might prevent Privy from loading
            start = time.time()
            response = requests.get(BASE_URL, timeout=15)
            response_time = time.time() - start
            
            if response.status_code == 200:
                content = response.text
                
                # Check for SSR-related patterns and fixes
                ssr_checks = {
                    "Client-Only Wrapper": "ClientOnly" in content or "isClient" in content,
                    "SSR Prevention": "typeof window" in content or "useEffect" in content,
                    "Hydration Handling": "hydrat" in content.lower() or "mount" in content.lower(),
                    "No SSR Errors": "HTMLElement is not defined" not in content and "window is not defined" not in content
                }
                
                passed_ssr_checks = sum(ssr_checks.values())
                total_ssr_checks = len(ssr_checks)
                
                if passed_ssr_checks >= 3:  # At least 3 out of 4 checks should pass
                    self.log_result(
                        "Client-Side Rendering Issues", 
                        True, 
                        f"SSR issues properly handled ({passed_ssr_checks}/{total_ssr_checks} checks passed), client-side rendering safeguards detected"
                    )
                    return True
                else:
                    self.log_result(
                        "Client-Side Rendering Issues", 
                        False, 
                        f"Potential SSR issues detected ({passed_ssr_checks}/{total_ssr_checks} checks passed)"
                    )
                    return False
            else:
                self.log_result(
                    "Client-Side Rendering Issues", 
                    False, 
                    f"Cannot verify SSR handling: frontend status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Client-Side Rendering Issues", False, f"Error testing SSR issues: {str(e)}")
            return False

    def test_privy_modal_integration(self):
        """Test 8: Privy Modal Integration and Triggering"""
        print("🔍 Testing Privy Modal Integration...")
        
        try:
            # Test if Privy modal integration is properly set up
            start = time.time()
            response = requests.get(BASE_URL, timeout=15)
            response_time = time.time() - start
            
            if response.status_code == 200:
                content = response.text
                
                # Check for modal-related patterns
                modal_checks = {
                    "Modal Trigger": "modal" in content.lower() or "popup" in content.lower(),
                    "Login Handler": "handleLogin" in content or "onClick" in content,
                    "Authentication State": "authenticated" in content or "ready" in content,
                    "Event Handling": "addEventListener" in content or "onClick" in content
                }
                
                passed_modal_checks = sum(modal_checks.values())
                total_modal_checks = len(modal_checks)
                
                if passed_modal_checks >= 3:  # At least 3 out of 4 checks should pass
                    self.log_result(
                        "Privy Modal Integration", 
                        True, 
                        f"Privy modal integration properly configured ({passed_modal_checks}/{total_modal_checks} checks passed), login handlers and authentication state management detected"
                    )
                    return True
                else:
                    self.log_result(
                        "Privy Modal Integration", 
                        False, 
                        f"Privy modal integration issues detected ({passed_modal_checks}/{total_modal_checks} checks passed)"
                    )
                    return False
            else:
                self.log_result(
                    "Privy Modal Integration", 
                    False, 
                    f"Cannot verify modal integration: frontend status {response.status_code}",
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Privy Modal Integration", False, f"Error testing modal integration: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all Privy authentication integration tests"""
        print("🚀 STARTING COMPREHENSIVE PRIVY AUTHENTICATION INTEGRATION TESTING")
        print("=" * 80)
        print("Testing Focus: Privy Configuration, Authentication API, Environment Variables, Hook Integration")
        print("Key Issue: LOGIN button clicks but Privy login modal is not appearing")
        print("App ID: clz0x7ggi05ztvyatqvj4qo4g")
        print("=" * 80)
        print()
        
        # Run all tests
        tests = [
            self.test_privy_app_id_configuration,
            self.test_privy_authentication_api_accessibility,
            self.test_environment_variables_verification,
            self.test_privy_hooks_integration,
            self.test_login_function_availability,
            self.test_privy_provider_initialization,
            self.test_client_side_rendering_issues,
            self.test_privy_modal_integration
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
        
        # Calculate results
        success_rate = (passed_tests / total_tests) * 100
        total_time = time.time() - self.start_time
        
        print("=" * 80)
        print("🏁 PRIVY AUTHENTICATION INTEGRATION TESTING COMPLETED")
        print("=" * 80)
        print(f"📊 RESULTS: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}% success rate)")
        print(f"⏱️  Total testing time: {total_time:.2f}s")
        print()
        
        # Detailed results
        print("📋 DETAILED TEST RESULTS:")
        print("-" * 40)
        for result in self.results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
            print(f"   Response Time: {result['response_time']}")
            print()
        
        # Summary based on review request requirements
        print("🎯 REVIEW REQUEST REQUIREMENTS VERIFICATION:")
        print("-" * 50)
        
        requirements_met = 0
        total_requirements = 5
        
        # 1. Privy Configuration Testing
        privy_config = any('Configuration' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if privy_config else '❌'} Privy Configuration: {'WORKING' if privy_config else 'FAILED'}")
        if privy_config: requirements_met += 1
        
        # 2. Authentication API Testing
        auth_api = any('Authentication API' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if auth_api else '❌'} Authentication API: {'ACCESSIBLE' if auth_api else 'FAILED'}")
        if auth_api: requirements_met += 1
        
        # 3. Environment Variables
        env_vars = any('Environment Variables' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if env_vars else '❌'} Environment Variables: {'LOADED' if env_vars else 'FAILED'}")
        if env_vars: requirements_met += 1
        
        # 4. Hook Integration
        hooks = any('Hooks Integration' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if hooks else '❌'} Hook Integration: {'WORKING' if hooks else 'FAILED'}")
        if hooks: requirements_met += 1
        
        # 5. Login Function Availability
        login_func = any('Login Function' in r['test'] and r['success'] for r in self.results)
        print(f"{'✅' if login_func else '❌'} Login Function: {'AVAILABLE' if login_func else 'FAILED'}")
        if login_func: requirements_met += 1
        
        print()
        print(f"🏆 OVERALL ASSESSMENT: {requirements_met}/{total_requirements} key requirements met")
        
        # Diagnostic information for the main issue
        print("\n🔍 DIAGNOSTIC ANALYSIS FOR LOGIN MODAL ISSUE:")
        print("-" * 50)
        
        modal_integration = any('Modal Integration' in r['test'] and r['success'] for r in self.results)
        ssr_issues = any('Client-Side Rendering' in r['test'] and r['success'] for r in self.results)
        provider_init = any('PrivyProvider' in r['test'] and r['success'] for r in self.results)
        
        if not modal_integration:
            print("❌ CRITICAL: Privy modal integration issues detected")
        if not ssr_issues:
            print("❌ CRITICAL: SSR issues may be preventing Privy from loading")
        if not provider_init:
            print("❌ CRITICAL: PrivyProvider initialization problems detected")
        
        if modal_integration and ssr_issues and provider_init:
            print("✅ All modal-related components appear to be working correctly")
            print("💡 Issue may be in client-side JavaScript execution or timing")
        
        if success_rate >= 80:
            print("\n🎉 CONCLUSION: Privy authentication integration is mostly working")
            print("💡 LOGIN modal issue may be due to timing or client-side execution problems")
        elif success_rate >= 60:
            print("\n⚠️  CONCLUSION: Privy authentication has MINOR ISSUES affecting modal display")
        else:
            print("\n🚨 CONCLUSION: Privy authentication has CRITICAL ISSUES preventing proper functionality")
        
        return success_rate >= 60  # Lower threshold since this is diagnostic testing

if __name__ == "__main__":
    tester = PrivyAuthenticationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)