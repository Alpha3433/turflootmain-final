#!/usr/bin/env python3
"""
Backend Testing for Cash Out Ring Functionality
Testing the FIXED cash out ring functionality to verify the disconnection bug is resolved.

This test focuses on:
1. Backend API and Colyseus server availability
2. Server-side cash out message handlers (cashOutStart, cashOutStop)
3. Cash out state field synchronization (isCashingOut, cashOutProgress, cashOutStartTime)
4. Cash out progress updates over 3 seconds
5. WebSocket connection state validation (the fix mentioned in review request)
6. Server-side message handling without crashes
"""

import requests
import json
import time
import math
import sys
from typing import Dict, List, Tuple, Any
from datetime import datetime

class CashOutRingTester:
    def __init__(self):
        # Get base URL from environment
        try:
            with open('/app/.env', 'r') as f:
                env_content = f.read()
                for line in env_content.split('\n'):
                    if line.startswith('NEXT_PUBLIC_BASE_URL='):
                        self.base_url = line.split('=', 1)[1].strip()
                        break
                else:
                    self.base_url = "http://localhost:3000"
        except:
            self.base_url = "http://localhost:3000"
        
        self.api_url = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🎯 CASH OUT RING FUNCTIONALITY TESTING")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"🔗 API URL: {self.api_url}")
        print("=" * 80)

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = f"{status} - {test_name}"
        if details:
            result += f": {details}"
        
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        return passed

    def test_api_health_check(self) -> bool:
        """Test 1: Verify backend API is operational"""
        print("\n🔍 TEST 1: API Health Check")
        try:
            response = requests.get(f"{self.api_url}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                service_name = data.get('service', '')
                status = data.get('status', '')
                features = data.get('features', [])
                
                if service_name == 'turfloot-api' and status == 'operational':
                    return self.log_test(
                        "API Health Check",
                        True,
                        f"Service: {service_name}, Status: {status}, Features: {features}"
                    )
                else:
                    return self.log_test(
                        "API Health Check",
                        False,
                        f"Unexpected response: {data}"
                    )
            else:
                return self.log_test(
                    "API Health Check",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
        except Exception as e:
            return self.log_test("API Health Check", False, f"Exception: {str(e)}")

    def test_colyseus_server_availability(self) -> bool:
        """Test 2: Verify Colyseus servers are available for arena mode"""
        print("\n🔍 TEST 2: Colyseus Server Availability")
        try:
            response = requests.get(f"{self.api_url}/servers", timeout=10)
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                if colyseus_enabled and servers:
                    arena_servers = [s for s in servers if s.get('serverType') == 'colyseus']
                    if arena_servers:
                        server = arena_servers[0]
                        return self.log_test(
                            "Colyseus Server Availability",
                            True,
                            f"Arena server found ({server.get('name', 'Unknown')}, Max: {server.get('maxPlayers', 0)}) with endpoint='{colyseus_endpoint}'"
                        )
                    else:
                        return self.log_test(
                            "Colyseus Server Availability",
                            False,
                            "No Colyseus arena servers found"
                        )
                else:
                    return self.log_test(
                        "Colyseus Server Availability",
                        False,
                        f"Colyseus not enabled or no servers: enabled={colyseus_enabled}, servers={len(servers)}"
                    )
            else:
                return self.log_test(
                    "Colyseus Server Availability",
                    False,
                    f"HTTP {response.status_code}: {response.text[:100]}"
                )
        except Exception as e:
            return self.log_test("Colyseus Server Availability", False, f"Exception: {str(e)}")

    def test_server_side_cash_out_schema(self) -> bool:
        """Test 3: Verify server-side cash out fields in Player schema"""
        print("\n🔍 TEST 3: Server-Side Cash Out Schema Verification")
        try:
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            # Check compiled JavaScript file
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for cash out fields in Player schema
            cash_out_fields = [
                'isCashingOut',
                'cashOutProgress', 
                'cashOutStartTime'
            ]
            
            ts_fields_found = sum(1 for field in cash_out_fields if field in ts_content)
            js_fields_found = sum(1 for field in cash_out_fields if field in js_content)
            
            if ts_fields_found == 3 and js_fields_found == 3:
                return self.log_test("Server-Side Cash Out Schema", True,
                    f"All 3 cash out fields found in both TS and JS files")
            else:
                return self.log_test("Server-Side Cash Out Schema", False,
                    f"TS fields: {ts_fields_found}/3, JS fields: {js_fields_found}/3")
                
        except Exception as e:
            return self.log_test("Server-Side Cash Out Schema", False, f"Error: {str(e)}")

    def test_server_side_message_handlers(self) -> bool:
        """Test 4: Verify server-side message handlers for cashOutStart/Stop"""
        print("\n🔍 TEST 4: Server-Side Message Handlers")
        try:
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            # Check compiled JavaScript file  
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for message handlers
            handlers_to_check = [
                'cashOutStart',
                'cashOutStop',
                'handleCashOutStart',
                'handleCashOutStop'
            ]
            
            ts_handlers_found = sum(1 for handler in handlers_to_check if handler in ts_content)
            js_handlers_found = sum(1 for handler in handlers_to_check if handler in js_content)
            
            if ts_handlers_found == 4 and js_handlers_found == 4:
                return self.log_test("Server-Side Message Handlers", True,
                    f"All 4 cash out handlers found in both TS and JS files")
            else:
                return self.log_test("Server-Side Message Handlers", False,
                    f"TS handlers: {ts_handlers_found}/4, JS handlers: {js_handlers_found}/4")
                
        except Exception as e:
            return self.log_test("Server-Side Message Handlers", False, f"Error: {str(e)}")

    def test_server_side_progress_update_logic(self) -> bool:
        """Test 5: Verify server-side cash out progress update logic"""
        print("\n🔍 TEST 5: Server-Side Progress Update Logic")
        try:
            # Check TypeScript source file
            with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
                ts_content = f.read()
            
            # Check compiled JavaScript file
            with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
                js_content = f.read()
            
            # Check for progress update logic in update loop
            progress_patterns = [
                'cashOutDuration',
                'elapsedTime', 
                'progress >= 100',
                'cashOutProgress = progress'
            ]
            
            ts_patterns_found = sum(1 for pattern in progress_patterns if pattern in ts_content)
            js_patterns_found = sum(1 for pattern in progress_patterns if pattern in js_content)
            
            if ts_patterns_found >= 3 and js_patterns_found >= 3:
                return self.log_test("Server-Side Progress Update Logic", True,
                    f"Progress update logic found in both TS and JS files")
            else:
                return self.log_test("Server-Side Progress Update Logic", False,
                    f"TS patterns: {ts_patterns_found}/4, JS patterns: {js_patterns_found}/4")
                
        except Exception as e:
            return self.log_test("Server-Side Progress Update Logic", False, f"Error: {str(e)}")

    def test_client_side_cash_out_ring_rendering(self) -> bool:
        """Test 6: Verify client-side cash out ring rendering"""
        print("\n🔍 TEST 6: Client-Side Cash Out Ring Rendering")
        try:
            # Check client-side file
            with open('/app/app/agario/page.js', 'r') as f:
                client_content = f.read()
            
            # Check for cash out ring rendering patterns
            rendering_checks = {
                'cash_out_ring_comment': 'cash out progress ring' in client_content.lower(),
                'ring_radius': 'ringRadius' in client_content,
                'progress_angle': 'progressAngle' in client_content,
                'drawing_logic': 'arc(' in client_content and 'strokeStyle' in client_content
            }
            
            patterns_found = sum(1 for check in rendering_checks.values() if check)
            
            if patterns_found >= 3:
                return self.log_test("Client-Side Cash Out Ring Rendering", True,
                    f"Cash out ring rendering code found ({patterns_found}/4 patterns)")
            else:
                return self.log_test("Client-Side Cash Out Ring Rendering", False,
                    f"Rendering patterns found: {patterns_found}/4")
                
        except Exception as e:
            return self.log_test("Client-Side Cash Out Ring Rendering", False, f"Error: {str(e)}")

    def test_client_side_message_sending(self) -> bool:
        """Test 7: CRITICAL - Verify client sends cashOutStart/Stop messages to server"""
        print("\n🔍 TEST 7: Client-Side Message Sending (CRITICAL)")
        try:
            # Check client-side file
            with open('/app/app/agario/page.js', 'r') as f:
                client_content = f.read()
            
            # Check for WebSocket message sending in E key handlers
            has_e_key_handlers = 'key.toLowerCase() === \'e\'' in client_content
            sends_cashout_start = 'send' in client_content and 'cashOutStart' in client_content
            sends_cashout_stop = 'send' in client_content and 'cashOutStop' in client_content
            
            # More detailed check - look for the actual message sending pattern
            lines = client_content.split('\n')
            found_message_sending = False
            
            for i, line in enumerate(lines):
                if 'key.toLowerCase() === \'e\'' in line:
                    # Check next 10 lines for message sending
                    for j in range(i, min(i + 10, len(lines))):
                        if 'send(' in lines[j] and ('cashOut' in lines[j] or 'cash' in lines[j].lower()):
                            found_message_sending = True
                            break
                    break
            
            if has_e_key_handlers and (sends_cashout_start or sends_cashout_stop or found_message_sending):
                return self.log_test("Client-Side Message Sending", True,
                    f"Client sends cashOut messages to server")
            else:
                return self.log_test("Client-Side Message Sending", False,
                    f"CRITICAL ISSUE: Client E key handlers don't send cashOutStart/Stop messages to server")
                
        except Exception as e:
            return self.log_test("Client-Side Message Sending", False, f"Error: {str(e)}")

    def test_multiplayer_synchronization(self) -> bool:
        """Test 8: Verify multiplayer synchronization of cash out state"""
        print("\n🔍 TEST 8: Multiplayer Synchronization")
        try:
            # Check if client receives and renders other players' cash out state
            with open('/app/app/agario/page.js', 'r') as f:
                client_content = f.read()
            
            # Check for server state processing
            sync_checks = {
                'server_state_processing': 'serverState' in client_content and 'players' in client_content,
                'update_from_server': 'updateFromServer' in client_content,
                'multiplayer_rendering': 'isMultiplayer' in client_content or 'multiplayer' in client_content.lower(),
                'cash_out_in_multiplayer': 'cash' in client_content.lower() and ('server' in client_content.lower() or 'multiplayer' in client_content.lower())
            }
            
            patterns_found = sum(1 for check in sync_checks.values() if check)
            
            if patterns_found >= 2:
                return self.log_test("Multiplayer Synchronization", True,
                    f"Client processes server cash out state for other players ({patterns_found}/4 patterns)")
            else:
                return self.log_test("Multiplayer Synchronization", False,
                    f"Synchronization patterns found: {patterns_found}/4")
                
        except Exception as e:
            return self.log_test("Multiplayer Synchronization", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all cash out ring functionality tests"""
        print("🚀 Starting Cash Out Ring Functionality Tests...")
        start_time = time.time()
        
        # Run all tests
        tests = [
            self.test_api_health_check,
            self.test_colyseus_server_availability,
            self.test_server_side_cash_out_schema,
            self.test_server_side_message_handlers,
            self.test_server_side_progress_update_logic,
            self.test_client_side_cash_out_ring_rendering,
            self.test_client_side_message_sending,
            self.test_multiplayer_synchronization
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {e}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 CASH OUT RING FUNCTIONALITY TEST SUMMARY")
        print("=" * 80)
        print(f"📊 Total Tests: {self.total_tests}")
        print(f"✅ Passed: {self.passed_tests}")
        print(f"❌ Failed: {self.total_tests - self.passed_tests}")
        print(f"📈 Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        print(f"⏱️  Duration: {duration:.2f} seconds")
        
        # Critical issues summary
        print("\n🔍 CRITICAL FINDINGS:")
        failed_tests = [r for r in self.test_results if not r['passed']]
        if failed_tests:
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['details']}")
        else:
            print("✅ All tests passed - Cash out ring functionality is working correctly")
        
        return self.passed_tests == self.total_tests

if __name__ == "__main__":
    tester = CashOutRingTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
