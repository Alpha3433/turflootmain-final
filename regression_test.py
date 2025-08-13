#!/usr/bin/env python3
"""
TurfLoot Backend API Regression Test
Testing core backend APIs after frontend customization modal enhancements.
Focus: Verify no regressions occurred during frontend visual enhancement work.
"""

import requests
import json
import time
import uuid
import sys
from datetime import datetime

# Configuration - Use localhost for testing (external URL has ingress issues)
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class TurfLootRegressionTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
    
    def test_root_api_endpoint(self):
        """Test root API endpoint (GET /api/)"""
        print("\n🏠 ROOT API ENDPOINT TESTING")
        print("=" * 50)
        
        try:
            response = self.session.get(f"{API_BASE}/")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for expected fields
                expected_fields = ['message', 'service', 'features', 'timestamp']
                if all(field in data for field in expected_fields):
                    # Check specific values
                    if (data.get('message') == 'TurfLoot API v2.0' and 
                        data.get('service') == 'turfloot-backend' and
                        'auth' in data.get('features', []) and
                        'blockchain' in data.get('features', []) and
                        'multiplayer' in data.get('features', [])):
                        
                        self.log_test(
                            "Root API Endpoint Structure and Content", 
                            True, 
                            f"Message: {data['message']}, Features: {data['features']}"
                        )
                    else:
                        self.log_test(
                            "Root API Endpoint Content", 
                            False, 
                            f"Unexpected content: {data}"
                        )
                else:
                    missing = [f for f in expected_fields if f not in data]
                    self.log_test(
                        "Root API Endpoint Structure", 
                        False, 
                        f"Missing fields: {missing}"
                    )
            else:
                self.log_test(
                    "Root API Endpoint", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Root API Endpoint", False, f"Exception: {str(e)}")
    
    def test_live_statistics_endpoints(self):
        """Test live statistics endpoints"""
        print("\n📊 LIVE STATISTICS ENDPOINTS TESTING")
        print("=" * 50)
        
        # Test live players endpoint
        try:
            response = self.session.get(f"{API_BASE}/stats/live-players")
            
            if response.status_code == 200:
                data = response.json()
                
                if 'count' in data and 'timestamp' in data:
                    self.log_test(
                        "Live Players Endpoint", 
                        True, 
                        f"Player count: {data['count']}, Timestamp: {data['timestamp']}"
                    )
                else:
                    self.log_test(
                        "Live Players Endpoint Structure", 
                        False, 
                        f"Missing required fields in response: {data}"
                    )
            else:
                self.log_test(
                    "Live Players Endpoint", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Live Players Endpoint", False, f"Exception: {str(e)}")
        
        # Test global winnings endpoint
        try:
            response = self.session.get(f"{API_BASE}/stats/global-winnings")
            
            if response.status_code == 200:
                data = response.json()
                
                if 'total' in data and 'timestamp' in data:
                    self.log_test(
                        "Global Winnings Endpoint", 
                        True, 
                        f"Total winnings: {data['total']}, Timestamp: {data['timestamp']}"
                    )
                else:
                    self.log_test(
                        "Global Winnings Endpoint Structure", 
                        False, 
                        f"Missing required fields in response: {data}"
                    )
            else:
                self.log_test(
                    "Global Winnings Endpoint", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Global Winnings Endpoint", False, f"Exception: {str(e)}")
    
    def test_game_pots_endpoint(self):
        """Test game pots endpoint (GET /api/pots)"""
        print("\n🎯 GAME POTS ENDPOINT TESTING")
        print("=" * 50)
        
        try:
            response = self.session.get(f"{API_BASE}/pots")
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return an array of pot data
                if isinstance(data, list) and len(data) > 0:
                    # Check structure of first pot
                    first_pot = data[0]
                    expected_fields = ['table', 'pot', 'players']
                    
                    if all(field in first_pot for field in expected_fields):
                        # Count total players and pot
                        total_players = sum(pot.get('players', 0) for pot in data)
                        total_pot = sum(pot.get('pot', 0) for pot in data)
                        
                        self.log_test(
                            "Game Pots Endpoint", 
                            True, 
                            f"Found {len(data)} tables, {total_players} total players, ${total_pot} total pot"
                        )
                        
                        # Verify expected tables exist
                        table_names = [pot.get('table') for pot in data]
                        expected_tables = ['$1', '$5', '$20']
                        
                        if all(table in table_names for table in expected_tables):
                            self.log_test(
                                "Game Pots Table Structure", 
                                True, 
                                f"All expected tables present: {table_names}"
                            )
                        else:
                            missing = [t for t in expected_tables if t not in table_names]
                            self.log_test(
                                "Game Pots Table Structure", 
                                False, 
                                f"Missing tables: {missing}, Found: {table_names}"
                            )
                    else:
                        missing = [f for f in expected_fields if f not in first_pot]
                        self.log_test(
                            "Game Pots Data Structure", 
                            False, 
                            f"Missing fields in pot data: {missing}"
                        )
                else:
                    self.log_test(
                        "Game Pots Endpoint Response", 
                        False, 
                        f"Expected array with data, got: {type(data)} with length {len(data) if isinstance(data, list) else 'N/A'}"
                    )
            else:
                self.log_test(
                    "Game Pots Endpoint", 
                    False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Game Pots Endpoint", False, f"Exception: {str(e)}")
    
    def test_privy_authentication_basic(self):
        """Test unified Privy authentication endpoint - basic validation"""
        print("\n🔑 PRIVY AUTHENTICATION BASIC TESTING")
        print("=" * 50)
        
        # Test 1: Missing privy_user validation
        try:
            response = self.session.post(
                f"{API_BASE}/auth/privy",
                json={},  # Empty request
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 400:
                data = response.json()
                if 'privy' in data.get('error', '').lower():
                    self.log_test(
                        "Privy Auth Missing Data Validation", 
                        True, 
                        f"Correctly rejected empty request: {data.get('error')}"
                    )
                else:
                    self.log_test(
                        "Privy Auth Missing Data Validation", 
                        False, 
                        f"Wrong error message: {data.get('error')}"
                    )
            else:
                self.log_test(
                    "Privy Auth Missing Data Validation", 
                    False, 
                    f"Expected 400, got {response.status_code}"
                )
                
        except Exception as e:
            self.log_test("Privy Auth Missing Data Validation", False, f"Exception: {str(e)}")
        
        # Test 2: Basic endpoint accessibility and structure
        try:
            # Test with minimal valid structure (will likely fail auth but should show endpoint works)
            test_request = {
                "privy_user": {
                    "id": "test-regression-id",
                    "email": {
                        "address": f"regression.test.{int(time.time())}@turfloot.com"
                    }
                }
            }
            
            response = self.session.post(
                f"{API_BASE}/auth/privy",
                json=test_request,
                headers={'Content-Type': 'application/json'}
            )
            
            # Should get either 200 (success) or structured error response
            if response.status_code in [200, 400, 401]:
                data = response.json()
                
                if response.status_code == 200:
                    # Check for expected success fields
                    if 'success' in data and 'user' in data and 'token' in data:
                        self.log_test(
                            "Privy Auth Endpoint Structure", 
                            True, 
                            f"Endpoint working, user created successfully"
                        )
                    else:
                        self.log_test(
                            "Privy Auth Success Structure", 
                            False, 
                            f"Missing expected fields in success response"
                        )
                else:
                    # Structured error response is also good
                    if 'error' in data:
                        self.log_test(
                            "Privy Auth Endpoint Accessibility", 
                            True, 
                            f"Endpoint accessible, returned structured error: {data.get('error')[:50]}"
                        )
                    else:
                        self.log_test(
                            "Privy Auth Error Structure", 
                            False, 
                            f"Unstructured error response: {data}"
                        )
            else:
                self.log_test(
                    "Privy Auth Endpoint", 
                    False, 
                    f"Unexpected status: {response.status_code}, Response: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test("Privy Auth Endpoint Basic Test", False, f"Exception: {str(e)}")
    
    def run_regression_tests(self):
        """Run all regression tests"""
        print("🔄 TURFLOOT BACKEND REGRESSION TEST")
        print("=" * 60)
        print(f"Testing against: {BASE_URL}")
        print(f"Focus: Core APIs after frontend customization modal enhancements")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 60)
        
        # Test 1: Root API endpoint
        self.test_root_api_endpoint()
        
        # Test 2: Live statistics endpoints
        self.test_live_statistics_endpoints()
        
        # Test 3: Game pots endpoint
        self.test_game_pots_endpoint()
        
        # Test 4: Unified Privy authentication (basic validation)
        self.test_privy_authentication_basic()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📋 REGRESSION TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"✅ Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
        
        if passed == total:
            print("🎉 ALL REGRESSION TESTS PASSED!")
            print("✅ No regressions detected after frontend customization modal enhancements")
        else:
            print("⚠️  Some regression tests failed - see details above")
            failed_tests = [r for r in self.test_results if not r['success']]
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['details']}")
        
        print("\n🔍 CORE APIS TESTED:")
        print("   • Root API endpoint (GET /api/) - TurfLoot API message")
        print("   • Live statistics (GET /api/stats/live-players)")
        print("   • Live statistics (GET /api/stats/global-winnings)")
        print("   • Game pots (GET /api/pots) - game table data")
        print("   • Unified Privy authentication (POST /api/auth/privy) - basic validation")
        
        print(f"\n⏰ Regression test completed at: {datetime.now().isoformat()}")
        
        return passed == total

if __name__ == "__main__":
    tester = TurfLootRegressionTester()
    success = tester.run_regression_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)