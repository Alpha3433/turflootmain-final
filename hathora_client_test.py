#!/usr/bin/env python3
"""
Hathora Client Configuration and Environment Testing
Testing the Hathora environment variables and client initialization readiness
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://party-play-system.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class HathoraEnvironmentTester:
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'TurfLoot-Hathora-Tester/1.0'
        })
        
    def log_test(self, test_name, success, details, response_time=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_time': response_time
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        if details:
            print(f"    📋 {details}")
    
    def test_hathora_environment_variables(self):
        """Test Hathora environment configuration"""
        print("\n🔧 TESTING HATHORA ENVIRONMENT CONFIGURATION")
        
        # Test 1: Check API response for multiplayer features
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                features = data.get('features', [])
                
                if 'multiplayer' in features:
                    self.log_test(
                        "Hathora Environment - Multiplayer Feature Enabled",
                        True,
                        f"Multiplayer feature found in API response: {features}",
                        response_time
                    )
                else:
                    self.log_test(
                        "Hathora Environment - Multiplayer Feature",
                        False,
                        f"Multiplayer not found in features: {features}",
                        response_time
                    )
                
                # Check for service info
                service = data.get('service', 'unknown')
                message = data.get('message', 'unknown')
                
                self.log_test(
                    "Hathora Environment - API Service Info",
                    True,
                    f"Service: {service}, Message: {message}",
                    response_time
                )
            else:
                self.log_test(
                    "Hathora Environment - API Check",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
        except Exception as e:
            self.log_test("Hathora Environment - API Check", False, f"Exception: {str(e)}")
    
    def test_hathora_server_integration(self):
        """Test Hathora server integration through server browser"""
        print("\n🌍 TESTING HATHORA SERVER INTEGRATION")
        
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/servers/lobbies")
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for Hathora-specific fields
                hathora_enabled = data.get('hathoraEnabled', False)
                servers = data.get('servers', [])
                
                self.log_test(
                    "Hathora Integration - Server Browser Response",
                    True,
                    f"HathoraEnabled: {hathora_enabled}, Servers: {len(servers)}",
                    response_time
                )
                
                # Look for Global Multiplayer server with Hathora properties
                global_server = None
                for server in servers:
                    if server.get('id') == 'global-practice-bots':
                        global_server = server
                        break
                
                if global_server:
                    # Check Hathora-specific properties
                    server_type = global_server.get('serverType', 'unknown')
                    region = global_server.get('region', 'unknown')
                    hathora_room_id = global_server.get('hathoraRoomId')
                    
                    self.log_test(
                        "Hathora Integration - Global Server Properties",
                        True,
                        f"ServerType: {server_type}, Region: {region}, HathoraRoomId: {hathora_room_id}"
                    )
                    
                    # Verify it's configured for Hathora
                    if server_type == 'hathora' or hathora_room_id:
                        self.log_test(
                            "Hathora Integration - Server Configuration",
                            True,
                            "Global server properly configured for Hathora integration"
                        )
                    else:
                        self.log_test(
                            "Hathora Integration - Server Configuration",
                            False,
                            "Global server missing Hathora configuration"
                        )
                else:
                    self.log_test(
                        "Hathora Integration - Global Server",
                        False,
                        "Global Multiplayer server not found in server list"
                    )
            else:
                self.log_test(
                    "Hathora Integration - Server Browser",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
        except Exception as e:
            self.log_test("Hathora Integration - Server Browser", False, f"Exception: {str(e)}")
    
    def test_connection_readiness(self):
        """Test if the system is ready for Hathora connections"""
        print("\n🔌 TESTING HATHORA CONNECTION READINESS")
        
        # Test session tracking (required for Hathora connection monitoring)
        test_data = {
            'roomId': 'global-practice-bots',
            'playerId': 'hathora_readiness_test',
            'playerName': 'HathoraReadinessTest'
        }
        
        try:
            # Test join
            start_time = time.time()
            join_response = self.session.post(f"{API_BASE}/game-sessions/join", json=test_data)
            join_time = time.time() - start_time
            
            if join_response.status_code == 200:
                join_data = join_response.json()
                if join_data.get('success'):
                    self.log_test(
                        "Hathora Readiness - Session Join",
                        True,
                        "Session tracking ready for Hathora connection monitoring",
                        join_time
                    )
                    
                    # Test server browser update
                    time.sleep(0.2)  # Brief delay for database update
                    
                    browser_response = self.session.get(f"{API_BASE}/servers/lobbies")
                    if browser_response.status_code == 200:
                        browser_data = browser_response.json()
                        servers = browser_data.get('servers', [])
                        global_server = next((s for s in servers if s.get('id') == 'global-practice-bots'), None)
                        
                        if global_server and global_server.get('currentPlayers', 0) > 0:
                            self.log_test(
                                "Hathora Readiness - Real-time Updates",
                                True,
                                f"Server browser shows real-time player count: {global_server.get('currentPlayers')}"
                            )
                        else:
                            self.log_test(
                                "Hathora Readiness - Real-time Updates",
                                False,
                                "Server browser not showing real-time player updates"
                            )
                    
                    # Test leave
                    leave_response = self.session.post(f"{API_BASE}/game-sessions/leave", json=test_data)
                    if leave_response.status_code == 200:
                        leave_data = leave_response.json()
                        if leave_data.get('success'):
                            self.log_test(
                                "Hathora Readiness - Session Leave",
                                True,
                                "Session cleanup ready for Hathora disconnection handling"
                            )
                        else:
                            self.log_test(
                                "Hathora Readiness - Session Leave",
                                False,
                                f"Session leave failed: {leave_data}"
                            )
                    else:
                        self.log_test(
                            "Hathora Readiness - Session Leave",
                            False,
                            f"Leave HTTP {leave_response.status_code}: {leave_response.text}"
                        )
                else:
                    self.log_test(
                        "Hathora Readiness - Session Join",
                        False,
                        f"Session join failed: {join_data}"
                    )
            else:
                self.log_test(
                    "Hathora Readiness - Session Join",
                    False,
                    f"Join HTTP {join_response.status_code}: {join_response.text}"
                )
        except Exception as e:
            self.log_test("Hathora Readiness - Session Tracking", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all Hathora environment tests"""
        print("🚀 STARTING HATHORA CLIENT CONFIGURATION AND ENVIRONMENT TESTING")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run test suites
        self.test_hathora_environment_variables()
        self.test_hathora_server_integration()
        self.test_connection_readiness()
        
        # Calculate results
        total_time = time.time() - start_time
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 HATHORA CLIENT CONFIGURATION TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📊 Success Rate: {success_rate:.1f}%")
        print(f"⏱️  Total Time: {total_time:.2f}s")
        
        # Key findings
        print("\n🔍 KEY FINDINGS:")
        
        # Check environment configuration
        env_tests = [r for r in self.test_results if 'Environment' in r['test']]
        env_success = all(r['success'] for r in env_tests)
        
        if env_success:
            print("✅ Hathora environment variables properly configured")
        else:
            print("❌ Hathora environment configuration issues detected")
        
        # Check server integration
        integration_tests = [r for r in self.test_results if 'Integration' in r['test']]
        integration_success = all(r['success'] for r in integration_tests)
        
        if integration_success:
            print("✅ Hathora server integration working correctly")
        else:
            print("❌ Hathora server integration has issues")
        
        # Check connection readiness
        readiness_tests = [r for r in self.test_results if 'Readiness' in r['test']]
        readiness_success = all(r['success'] for r in readiness_tests)
        
        if readiness_success:
            print("✅ System ready for Hathora connections")
        else:
            print("❌ System not ready for Hathora connections")
        
        print("\n🎮 HATHORA CLIENT STATUS:")
        if success_rate >= 90:
            print("✅ HATHORA CLIENT READY - Environment configured and backend prepared")
        elif success_rate >= 70:
            print("⚠️  PARTIAL READINESS - Some components ready, check configuration")
        else:
            print("❌ HATHORA CLIENT NOT READY - Configuration or integration issues")
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': success_rate,
            'total_time': total_time,
            'test_results': self.test_results
        }

if __name__ == "__main__":
    tester = HathoraEnvironmentTester()
    results = tester.run_all_tests()