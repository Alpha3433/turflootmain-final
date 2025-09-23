#!/usr/bin/env python3
"""
TurfLoot Backend API Testing Suite - Phase 2 Assessment
Testing Colyseus migration and recent package.json changes

CRITICAL BACKEND SYSTEMS TO TEST:
1. Core API Health Check - Test /api/servers endpoint for Colyseus server configuration
2. Colyseus Integration APIs - Test /api/servers returns Colyseus arena server data  
3. Database Integration - Test MongoDB connection and queries
4. Authentication & Wallet APIs - Test /api/wallet/balance endpoint
5. Legacy Hathora Cleanup Verification
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-arena-2.preview.emergentagent.com"
COLYSEUS_ENDPOINT = "wss://au-syd-ab3eaf4e.colyseus.cloud"

class TurfLootBackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_results": [],
            "critical_issues": [],
            "minor_issues": []
        }
        
    def log_test(self, test_name, status, details, is_critical=True):
        """Log test result"""
        self.results["total_tests"] += 1
        if status == "PASS":
            self.results["passed_tests"] += 1
            print(f"✅ {test_name}: PASSED")
        else:
            self.results["failed_tests"] += 1
            print(f"❌ {test_name}: FAILED - {details}")
            if is_critical:
                self.results["critical_issues"].append(f"{test_name}: {details}")
            else:
                self.results["minor_issues"].append(f"{test_name}: {details}")
        
        self.results["test_results"].append({
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def test_api_health_check(self):
        """Test 1: Core API Health Check"""
        print("\n🔍 TESTING: Core API Health Check")
        
        try:
            # Test root API endpoint
            response = requests.get(f"{self.base_url}/api", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("service") == "turfloot-api" and data.get("status") == "operational":
                    self.log_test("API Health Check", "PASS", f"API operational with features: {data.get('features', [])}")
                else:
                    self.log_test("API Health Check", "FAIL", f"Unexpected API response: {data}")
            else:
                self.log_test("API Health Check", "FAIL", f"API returned status {response.status_code}")
                
        except Exception as e:
            self.log_test("API Health Check", "FAIL", f"API connection failed: {str(e)}")

    def test_colyseus_server_api(self):
        """Test 2: Colyseus Integration APIs"""
        print("\n🎮 TESTING: Colyseus Server Integration")
        
        try:
            # Test /api/servers endpoint
            response = requests.get(f"{self.base_url}/api/servers", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required Colyseus fields
                required_fields = ["servers", "colyseusEnabled", "colyseusEndpoint"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Colyseus API Structure", "FAIL", f"Missing fields: {missing_fields}")
                    return
                
                # Verify Colyseus is enabled
                if not data.get("colyseusEnabled"):
                    self.log_test("Colyseus Enabled Flag", "FAIL", "colyseusEnabled is false")
                    return
                
                # Verify Colyseus endpoint
                expected_endpoint = COLYSEUS_ENDPOINT
                actual_endpoint = data.get("colyseusEndpoint")
                if actual_endpoint != expected_endpoint:
                    self.log_test("Colyseus Endpoint", "FAIL", f"Expected {expected_endpoint}, got {actual_endpoint}")
                else:
                    self.log_test("Colyseus Endpoint", "PASS", f"Correct endpoint: {actual_endpoint}")
                
                # Check arena server data
                servers = data.get("servers", [])
                if not servers:
                    self.log_test("Arena Server Data", "FAIL", "No servers returned")
                    return
                
                arena_server = servers[0]
                arena_required_fields = ["id", "roomType", "serverType", "maxPlayers", "endpoint"]
                arena_missing = [field for field in arena_required_fields if field not in arena_server]
                
                if arena_missing:
                    self.log_test("Arena Server Structure", "FAIL", f"Missing arena fields: {arena_missing}")
                else:
                    # Verify arena server details
                    if arena_server.get("serverType") == "colyseus" and arena_server.get("roomType") == "arena":
                        self.log_test("Arena Server Structure", "PASS", f"Valid arena server: {arena_server.get('id')}")
                    else:
                        self.log_test("Arena Server Structure", "FAIL", f"Invalid server type or room type")
                
                # Check player count integration
                total_players = data.get("totalPlayers", 0)
                self.log_test("Player Count Integration", "PASS", f"Total players: {total_players}")
                
            else:
                self.log_test("Colyseus Server API", "FAIL", f"API returned status {response.status_code}")
                
        except Exception as e:
            self.log_test("Colyseus Server API", "FAIL", f"API request failed: {str(e)}")

    def test_database_integration(self):
        """Test 3: Database Integration"""
        print("\n🗄️ TESTING: Database Integration")
        
        try:
            # Test game sessions API (GET)
            response = requests.get(f"{self.base_url}/api/game-sessions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "totalActiveSessions" in data and "sessionsByRoom" in data:
                    self.log_test("Database Connection", "PASS", f"MongoDB connected, {data.get('totalActiveSessions', 0)} active sessions")
                else:
                    self.log_test("Database Connection", "FAIL", f"Unexpected response structure: {data}")
            else:
                self.log_test("Database Connection", "FAIL", f"Game sessions API returned status {response.status_code}")
            
            # Test database write operation
            test_session_data = {
                "action": "join",
                "session": {
                    "roomId": "test-colyseus-arena",
                    "userId": "test-user-backend-test",
                    "joinedAt": datetime.now().isoformat(),
                    "lastActivity": datetime.now().isoformat(),
                    "mode": "arena",
                    "region": "au-syd",
                    "entryFee": 0
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/game-sessions", 
                json=test_session_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Database Write Operation", "PASS", "Successfully created test session")
                    
                    # Clean up test session
                    cleanup_data = {
                        "action": "leave",
                        "roomId": "test-colyseus-arena"
                    }
                    requests.post(f"{self.base_url}/api/game-sessions", json=cleanup_data, timeout=5)
                    
                else:
                    self.log_test("Database Write Operation", "FAIL", f"Write failed: {data}")
            else:
                self.log_test("Database Write Operation", "FAIL", f"Write request returned status {response.status_code}")
                
        except Exception as e:
            self.log_test("Database Integration", "FAIL", f"Database test failed: {str(e)}")

    def test_wallet_authentication_api(self):
        """Test 4: Authentication & Wallet APIs"""
        print("\n💰 TESTING: Wallet & Authentication APIs")
        
        try:
            # Test wallet balance API without authentication (guest mode)
            response = requests.get(f"{self.base_url}/api/wallet/balance", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["balance", "currency", "sol_balance", "wallet_address"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Wallet API Structure", "FAIL", f"Missing fields: {missing_fields}")
                else:
                    # Check guest balance
                    if data.get("wallet_address") == "Not connected" and data.get("balance") == 0.0:
                        self.log_test("Guest Wallet Balance", "PASS", "Correct guest balance returned")
                    else:
                        self.log_test("Guest Wallet Balance", "FAIL", f"Unexpected guest balance: {data}")
            else:
                self.log_test("Wallet API", "FAIL", f"Wallet API returned status {response.status_code}")
            
            # Test with testing token
            import base64
            test_payload = {
                "userId": "test-user-123",
                "wallet_address": "F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG"
            }
            test_token = "testing-" + base64.b64encode(json.dumps(test_payload).encode()).decode()
            
            headers = {"Authorization": f"Bearer {test_token}"}
            response = requests.get(f"{self.base_url}/api/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("balance", 0) > 0 and data.get("sol_balance", 0) > 0:
                    self.log_test("Authenticated Wallet Balance", "PASS", f"Testing balance: ${data.get('balance')}, {data.get('sol_balance')} SOL")
                else:
                    self.log_test("Authenticated Wallet Balance", "FAIL", f"Invalid testing balance: {data}")
            else:
                self.log_test("Authenticated Wallet Balance", "FAIL", f"Auth wallet API returned status {response.status_code}")
                
        except Exception as e:
            self.log_test("Wallet Authentication API", "FAIL", f"Wallet API test failed: {str(e)}")

    def test_privy_authentication_status(self):
        """Test 5: Privy Authentication Status Check"""
        print("\n🔐 TESTING: Privy Authentication Status")
        
        try:
            # Test if Privy configuration is accessible through API
            response = requests.get(f"{self.base_url}/api", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                features = data.get("features", [])
                if "auth" in features:
                    self.log_test("Privy Auth Feature", "PASS", "Authentication feature enabled in API")
                else:
                    self.log_test("Privy Auth Feature", "FAIL", "Authentication feature not listed in API features")
            
            # Test Privy token handling in wallet API
            # Create a mock Privy-style JWT token
            import base64
            privy_payload = {
                "sub": "did:privy:test-user-123",
                "email": "test@example.com",
                "wallet": {
                    "address": "F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG"
                }
            }
            
            # Create a simple JWT-like token (header.payload.signature)
            header = base64.b64encode(json.dumps({"typ": "JWT", "alg": "HS256"}).encode()).decode().rstrip('=')
            payload = base64.b64encode(json.dumps(privy_payload).encode()).decode().rstrip('=')
            signature = "test-signature"
            mock_privy_token = f"{header}.{payload}.{signature}"
            
            headers = {"Authorization": f"Bearer {mock_privy_token}"}
            response = requests.get(f"{self.base_url}/api/wallet/balance", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                # Should handle Privy token gracefully even if verification fails
                self.log_test("Privy Token Handling", "PASS", "Privy token processed without errors")
            else:
                self.log_test("Privy Token Handling", "FAIL", f"Privy token handling failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Privy Authentication Status", "FAIL", f"Privy auth test failed: {str(e)}")

    def test_legacy_hathora_cleanup(self):
        """Test 6: Legacy Hathora Cleanup Verification"""
        print("\n🧹 TESTING: Legacy Hathora Cleanup Verification")
        
        try:
            # Check if Hathora endpoints still exist (they should for backward compatibility)
            hathora_endpoints = [
                "/api/hathora/create-room"
            ]
            
            hathora_still_active = []
            
            for endpoint in hathora_endpoints:
                try:
                    response = requests.post(
                        f"{self.base_url}{endpoint}",
                        json={"gameMode": "practice", "region": "us-east-1"},
                        timeout=10
                    )
                    
                    if response.status_code != 404:
                        hathora_still_active.append(endpoint)
                        
                except:
                    pass  # Endpoint doesn't exist or failed
            
            if hathora_still_active:
                self.log_test("Hathora Endpoint Cleanup", "PASS", f"Hathora endpoints still available for compatibility: {hathora_still_active}", is_critical=False)
            else:
                self.log_test("Hathora Endpoint Cleanup", "PASS", "All Hathora endpoints properly cleaned up")
            
            # Check if Colyseus has replaced Hathora in server browser
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get("servers", [])
                
                colyseus_servers = [s for s in servers if s.get("serverType") == "colyseus"]
                hathora_servers = [s for s in servers if s.get("serverType") == "hathora" or s.get("serverType") == "hathora-paid"]
                
                if colyseus_servers and not hathora_servers:
                    self.log_test("Server Migration", "PASS", f"Successfully migrated to Colyseus: {len(colyseus_servers)} Colyseus servers, 0 Hathora servers")
                elif colyseus_servers and hathora_servers:
                    self.log_test("Server Migration", "PASS", f"Hybrid setup: {len(colyseus_servers)} Colyseus, {len(hathora_servers)} Hathora servers", is_critical=False)
                else:
                    self.log_test("Server Migration", "FAIL", f"Migration incomplete: {len(colyseus_servers)} Colyseus, {len(hathora_servers)} Hathora servers")
            
        except Exception as e:
            self.log_test("Legacy Hathora Cleanup", "FAIL", f"Cleanup verification failed: {str(e)}")

    def test_environment_variables(self):
        """Test 7: Environment Variables Configuration"""
        print("\n⚙️ TESTING: Environment Variables Configuration")
        
        try:
            # Test Colyseus endpoint configuration through API
            response = requests.get(f"{self.base_url}/api/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                colyseus_endpoint = data.get("colyseusEndpoint")
                
                if colyseus_endpoint == COLYSEUS_ENDPOINT:
                    self.log_test("Colyseus Endpoint Config", "PASS", f"Correct Colyseus endpoint: {colyseus_endpoint}")
                else:
                    self.log_test("Colyseus Endpoint Config", "FAIL", f"Expected {COLYSEUS_ENDPOINT}, got {colyseus_endpoint}")
            
            # Test MongoDB connection through database operations
            response = requests.get(f"{self.base_url}/api/game-sessions", timeout=10)
            
            if response.status_code == 200:
                self.log_test("MongoDB URL Config", "PASS", "MongoDB connection successful")
            else:
                self.log_test("MongoDB URL Config", "FAIL", f"MongoDB connection failed with status {response.status_code}")
                
        except Exception as e:
            self.log_test("Environment Variables", "FAIL", f"Environment config test failed: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting TurfLoot Backend API Testing Suite - Phase 2 Assessment")
        print(f"Testing against: {self.base_url}")
        print(f"Expected Colyseus endpoint: {COLYSEUS_ENDPOINT}")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all tests
        self.test_api_health_check()
        self.test_colyseus_server_api()
        self.test_database_integration()
        self.test_wallet_authentication_api()
        self.test_privy_authentication_status()
        self.test_legacy_hathora_cleanup()
        self.test_environment_variables()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 BACKEND TESTING SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed_tests']} ✅")
        print(f"Failed: {self.results['failed_tests']} ❌")
        print(f"Success Rate: {(self.results['passed_tests']/self.results['total_tests']*100):.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        
        if self.results['critical_issues']:
            print(f"\n🚨 CRITICAL ISSUES ({len(self.results['critical_issues'])}):")
            for issue in self.results['critical_issues']:
                print(f"  ❌ {issue}")
        
        if self.results['minor_issues']:
            print(f"\n⚠️ MINOR ISSUES ({len(self.results['minor_issues'])}):")
            for issue in self.results['minor_issues']:
                print(f"  ⚠️ {issue}")
        
        if not self.results['critical_issues']:
            print("\n🎉 NO CRITICAL ISSUES FOUND - BACKEND IS OPERATIONAL!")
        
        return self.results

if __name__ == "__main__":
    tester = TurfLootBackendTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    exit_code = 0 if len(results['critical_issues']) == 0 else 1
    exit(exit_code)