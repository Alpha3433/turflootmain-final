#!/usr/bin/env python3
"""
TurfLoot Backend API Test Suite
Tests all backend APIs for the TurfLoot skill-based crypto land battles game.
"""

import requests
import json
import uuid
import time
import os
from typing import Dict, Any, Optional

class TurfLootAPITester:
    def __init__(self):
        # Get base URL from environment or use default
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://e5d8d9b7-5c3d-4314-a5cf-e029726b6a78.preview.emergentagent.com')
        self.api_url = f"{self.base_url}/api"
        
        # Test data
        self.test_wallet = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        self.test_wallet_2 = "9yMXtg3DX98e08UKTEqcE6kCifeTrB94UARvKpthBtV"
        self.stake_amounts = [1.0, 5.0, 20.0]
        
        # Store created resources for cleanup
        self.created_users = []
        self.created_games = []
        
        print(f"🚀 TurfLoot API Tester initialized")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🔗 API URL: {self.api_url}")
        print("=" * 60)

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    headers: Optional[Dict] = None) -> requests.Response:
        """Make HTTP request with proper error handling"""
        url = f"{self.api_url}{endpoint}"
        
        default_headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        if headers:
            default_headers.update(headers)
            
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            return response
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            raise

    def test_root_endpoint(self) -> bool:
        """Test GET /api/ - Root endpoint"""
        print("\n🧪 Testing Root Endpoint (GET /api/)")
        print("-" * 40)
        
        try:
            response = self.make_request('GET', '/')
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            # Check CORS headers
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            print("\n🔍 CORS Headers Check:")
            for header in cors_headers:
                value = response.headers.get(header, 'Not Present')
                print(f"  {header}: {value}")
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'TurfLoot API' in data['message']:
                    print("✅ Root endpoint test PASSED")
                    return True
                else:
                    print("❌ Root endpoint test FAILED - Invalid response format")
                    return False
            else:
                print(f"❌ Root endpoint test FAILED - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Root endpoint test FAILED - Error: {e}")
            return False

    def test_pots_endpoint(self) -> bool:
        """Test GET /api/pots - Game pot data"""
        print("\n🧪 Testing Pots Endpoint (GET /api/pots)")
        print("-" * 40)
        
        try:
            response = self.make_request('GET', '/pots')
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                if isinstance(data, list) and len(data) > 0:
                    expected_tables = ['$1', '$5', '$20']
                    found_tables = [pot.get('table') for pot in data]
                    
                    print(f"\n🔍 Found tables: {found_tables}")
                    
                    # Check if all expected tables are present
                    all_tables_present = all(table in found_tables for table in expected_tables)
                    
                    # Validate pot structure
                    valid_structure = all(
                        'table' in pot and 'pot' in pot and 'players' in pot 
                        for pot in data
                    )
                    
                    if all_tables_present and valid_structure:
                        print("✅ Pots endpoint test PASSED")
                        return True
                    else:
                        print("❌ Pots endpoint test FAILED - Invalid data structure")
                        return False
                else:
                    print("❌ Pots endpoint test FAILED - Invalid response format")
                    return False
            else:
                print(f"❌ Pots endpoint test FAILED - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Pots endpoint test FAILED - Error: {e}")
            return False

    def test_create_user(self) -> bool:
        """Test POST /api/users - Create user"""
        print("\n🧪 Testing Create User (POST /api/users)")
        print("-" * 40)
        
        try:
            # Test with valid wallet address
            user_data = {
                "wallet_address": self.test_wallet
            }
            
            response = self.make_request('POST', '/users', user_data)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ['id', 'wallet_address', 'balance_sol', 'total_winnings', 
                                 'games_played', 'created_at', 'updated_at']
                
                if all(field in data for field in required_fields):
                    # Check if ID is UUID format (not MongoDB ObjectId)
                    try:
                        uuid.UUID(data['id'])
                        print("✅ User ID is valid UUID format")
                    except ValueError:
                        print("❌ User ID is not UUID format")
                        return False
                    
                    # Store created user for later tests
                    self.created_users.append(data)
                    
                    print("✅ Create user test PASSED")
                    return True
                else:
                    print("❌ Create user test FAILED - Missing required fields")
                    return False
            else:
                print(f"❌ Create user test FAILED - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Create user test FAILED - Error: {e}")
            return False

    def test_create_user_validation(self) -> bool:
        """Test POST /api/users validation - Missing wallet_address"""
        print("\n🧪 Testing Create User Validation (POST /api/users)")
        print("-" * 40)
        
        try:
            # Test without wallet_address
            user_data = {}
            
            response = self.make_request('POST', '/users', user_data)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'wallet_address is required' in data['error']:
                    print("✅ Create user validation test PASSED")
                    return True
                else:
                    print("❌ Create user validation test FAILED - Wrong error message")
                    return False
            else:
                print(f"❌ Create user validation test FAILED - Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Create user validation test FAILED - Error: {e}")
            return False

    def test_get_user(self) -> bool:
        """Test GET /api/users/{wallet} - Get user profile"""
        print("\n🧪 Testing Get User (GET /api/users/{wallet})")
        print("-" * 40)
        
        try:
            # First ensure we have a user created
            if not self.created_users:
                print("⚠️  No users created yet, creating one first...")
                if not self.test_create_user():
                    print("❌ Failed to create user for get user test")
                    return False
            
            wallet_address = self.created_users[0]['wallet_address']
            response = self.make_request('GET', f'/users/{wallet_address}')
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ['id', 'wallet_address', 'balance_sol', 'total_winnings', 
                                 'games_played', 'created_at', 'updated_at']
                
                if all(field in data for field in required_fields):
                    if data['wallet_address'] == wallet_address:
                        print("✅ Get user test PASSED")
                        return True
                    else:
                        print("❌ Get user test FAILED - Wrong wallet address returned")
                        return False
                else:
                    print("❌ Get user test FAILED - Missing required fields")
                    return False
            else:
                print(f"❌ Get user test FAILED - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Get user test FAILED - Error: {e}")
            return False

    def test_get_user_not_found(self) -> bool:
        """Test GET /api/users/{wallet} - User not found"""
        print("\n🧪 Testing Get User Not Found (GET /api/users/{wallet})")
        print("-" * 40)
        
        try:
            # Use a non-existent wallet address
            fake_wallet = "NonExistentWalletAddress123456789"
            response = self.make_request('GET', f'/users/{fake_wallet}')
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 404:
                data = response.json()
                if 'error' in data and 'User not found' in data['error']:
                    print("✅ Get user not found test PASSED")
                    return True
                else:
                    print("❌ Get user not found test FAILED - Wrong error message")
                    return False
            else:
                print(f"❌ Get user not found test FAILED - Expected 404, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Get user not found test FAILED - Error: {e}")
            return False

    def test_create_game(self) -> bool:
        """Test POST /api/games - Create game session"""
        print("\n🧪 Testing Create Game (POST /api/games)")
        print("-" * 40)
        
        try:
            # Test with different stake amounts
            for stake_amount in self.stake_amounts:
                print(f"\n🎮 Testing with stake amount: ${stake_amount}")
                
                game_data = {
                    "wallet_address": self.test_wallet,
                    "stake_amount": stake_amount
                }
                
                response = self.make_request('POST', '/games', game_data)
                
                print(f"Status Code: {response.status_code}")
                print(f"Response: {response.text}")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    required_fields = ['id', 'wallet_address', 'stake_amount', 'territory_percent',
                                     'status', 'started_at', 'ended_at', 'final_winnings']
                    
                    if all(field in data for field in required_fields):
                        # Check if ID is UUID format
                        try:
                            uuid.UUID(data['id'])
                            print(f"✅ Game ID is valid UUID format: {data['id']}")
                        except ValueError:
                            print("❌ Game ID is not UUID format")
                            return False
                        
                        # Validate game data
                        if (data['wallet_address'] == self.test_wallet and 
                            data['stake_amount'] == stake_amount and
                            data['status'] == 'active' and
                            data['territory_percent'] == 0):
                            
                            # Store created game for later tests
                            self.created_games.append(data)
                            print(f"✅ Create game test PASSED for ${stake_amount}")
                        else:
                            print(f"❌ Create game test FAILED - Invalid game data for ${stake_amount}")
                            return False
                    else:
                        print(f"❌ Create game test FAILED - Missing required fields for ${stake_amount}")
                        return False
                else:
                    print(f"❌ Create game test FAILED - Status: {response.status_code} for ${stake_amount}")
                    return False
            
            print("✅ All create game tests PASSED")
            return True
                
        except Exception as e:
            print(f"❌ Create game test FAILED - Error: {e}")
            return False

    def test_create_game_validation(self) -> bool:
        """Test POST /api/games validation"""
        print("\n🧪 Testing Create Game Validation (POST /api/games)")
        print("-" * 40)
        
        try:
            # Test missing wallet_address
            game_data = {"stake_amount": 1.0}
            response = self.make_request('POST', '/games', game_data)
            
            print(f"Missing wallet_address - Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code != 400:
                print("❌ Create game validation test FAILED - Should return 400 for missing wallet_address")
                return False
            
            # Test missing stake_amount
            game_data = {"wallet_address": self.test_wallet}
            response = self.make_request('POST', '/games', game_data)
            
            print(f"Missing stake_amount - Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code != 400:
                print("❌ Create game validation test FAILED - Should return 400 for missing stake_amount")
                return False
            
            print("✅ Create game validation test PASSED")
            return True
                
        except Exception as e:
            print(f"❌ Create game validation test FAILED - Error: {e}")
            return False

    def test_update_game(self) -> bool:
        """Test PUT /api/games/{id} - Update game progress"""
        print("\n🧪 Testing Update Game (PUT /api/games/{id})")
        print("-" * 40)
        
        try:
            # First ensure we have a game created
            if not self.created_games:
                print("⚠️  No games created yet, creating one first...")
                if not self.test_create_game():
                    print("❌ Failed to create game for update game test")
                    return False
            
            game_id = self.created_games[0]['id']
            
            # Test updating game progress
            update_data = {
                "territory_percent": 75,
                "status": "active"
            }
            
            response = self.make_request('PUT', f'/games/{game_id}', update_data)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'Game updated successfully' in data['message']:
                    print("✅ Update game test PASSED")
                    return True
                else:
                    print("❌ Update game test FAILED - Wrong response message")
                    return False
            else:
                print(f"❌ Update game test FAILED - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Update game test FAILED - Error: {e}")
            return False

    def test_update_game_not_found(self) -> bool:
        """Test PUT /api/games/{id} - Game not found"""
        print("\n🧪 Testing Update Game Not Found (PUT /api/games/{id})")
        print("-" * 40)
        
        try:
            # Use a non-existent game ID
            fake_game_id = str(uuid.uuid4())
            
            update_data = {
                "territory_percent": 50,
                "status": "completed"
            }
            
            response = self.make_request('PUT', f'/games/{fake_game_id}', update_data)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 404:
                data = response.json()
                if 'error' in data and 'Game not found' in data['error']:
                    print("✅ Update game not found test PASSED")
                    return True
                else:
                    print("❌ Update game not found test FAILED - Wrong error message")
                    return False
            else:
                print(f"❌ Update game not found test FAILED - Expected 404, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Update game not found test FAILED - Error: {e}")
            return False

    def test_withdraw(self) -> bool:
        """Test POST /api/withdraw - Withdrawal request"""
        print("\n🧪 Testing Withdraw (POST /api/withdraw)")
        print("-" * 40)
        
        try:
            # Test withdrawal request
            withdraw_data = {
                "wallet_address": self.test_wallet,
                "amount": 2.5
            }
            
            response = self.make_request('POST', '/withdraw', withdraw_data)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ['message', 'withdrawal_id', 'status']
                
                if all(field in data for field in required_fields):
                    # Check if withdrawal_id is UUID format
                    try:
                        uuid.UUID(data['withdrawal_id'])
                        print(f"✅ Withdrawal ID is valid UUID format: {data['withdrawal_id']}")
                    except ValueError:
                        print("❌ Withdrawal ID is not UUID format")
                        return False
                    
                    if (data['status'] == 'pending' and 
                        'Withdrawal request submitted' in data['message']):
                        print("✅ Withdraw test PASSED")
                        return True
                    else:
                        print("❌ Withdraw test FAILED - Invalid response data")
                        return False
                else:
                    print("❌ Withdraw test FAILED - Missing required fields")
                    return False
            else:
                print(f"❌ Withdraw test FAILED - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Withdraw test FAILED - Error: {e}")
            return False

    def test_withdraw_validation(self) -> bool:
        """Test POST /api/withdraw validation"""
        print("\n🧪 Testing Withdraw Validation (POST /api/withdraw)")
        print("-" * 40)
        
        try:
            # Test missing wallet_address
            withdraw_data = {"amount": 1.0}
            response = self.make_request('POST', '/withdraw', withdraw_data)
            
            print(f"Missing wallet_address - Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code != 400:
                print("❌ Withdraw validation test FAILED - Should return 400 for missing wallet_address")
                return False
            
            # Test missing amount
            withdraw_data = {"wallet_address": self.test_wallet}
            response = self.make_request('POST', '/withdraw', withdraw_data)
            
            print(f"Missing amount - Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code != 400:
                print("❌ Withdraw validation test FAILED - Should return 400 for missing amount")
                return False
            
            print("✅ Withdraw validation test PASSED")
            return True
                
        except Exception as e:
            print(f"❌ Withdraw validation test FAILED - Error: {e}")
            return False

    def test_onramp_webhook(self) -> bool:
        """Test POST /api/onramp/webhook - Transak webhook"""
        print("\n🧪 Testing Onramp Webhook (POST /api/onramp/webhook)")
        print("-" * 40)
        
        try:
            # Mock Transak webhook data
            webhook_data = {
                "eventType": "ORDER_COMPLETED",
                "userData": {
                    "id": "user_123",
                    "email": "test@example.com"
                },
                "cryptoAmount": 0.1,
                "cryptoCurrency": "SOL",
                "status": "COMPLETED",
                "orderId": "order_123"
            }
            
            # Convert to JSON string as webhook would send
            webhook_payload = json.dumps(webhook_data)
            
            # Mock signature header
            headers = {
                'Content-Type': 'application/json',
                'x-transak-signature': 'mock_signature_123'
            }
            
            # Make request with raw JSON string
            url = f"{self.api_url}/onramp/webhook"
            response = requests.post(url, data=webhook_payload, headers=headers, timeout=30)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'Webhook processed' in data['message']:
                    print("✅ Onramp webhook test PASSED")
                    return True
                else:
                    print("❌ Onramp webhook test FAILED - Wrong response message")
                    return False
            else:
                print(f"❌ Onramp webhook test FAILED - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Onramp webhook test FAILED - Error: {e}")
            return False

    def run_all_tests(self) -> Dict[str, bool]:
        """Run all API tests and return results"""
        print("🚀 Starting TurfLoot Backend API Test Suite")
        print("=" * 60)
        
        test_results = {}
        
        # Define test methods and their names
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("Pots Endpoint", self.test_pots_endpoint),
            ("Create User", self.test_create_user),
            ("Create User Validation", self.test_create_user_validation),
            ("Get User", self.test_get_user),
            ("Get User Not Found", self.test_get_user_not_found),
            ("Create Game", self.test_create_game),
            ("Create Game Validation", self.test_create_game_validation),
            ("Update Game", self.test_update_game),
            ("Update Game Not Found", self.test_update_game_not_found),
            ("Withdraw", self.test_withdraw),
            ("Withdraw Validation", self.test_withdraw_validation),
            ("Onramp Webhook", self.test_onramp_webhook)
        ]
        
        # Run each test
        for test_name, test_method in tests:
            try:
                result = test_method()
                test_results[test_name] = result
                time.sleep(1)  # Small delay between tests
            except Exception as e:
                print(f"❌ {test_name} test FAILED with exception: {e}")
                test_results[test_name] = False
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = 0
        failed = 0
        
        for test_name, result in test_results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_name:<25} {status}")
            if result:
                passed += 1
            else:
                failed += 1
        
        print("-" * 60)
        print(f"Total Tests: {len(test_results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/len(test_results)*100):.1f}%")
        
        if failed == 0:
            print("\n🎉 ALL TESTS PASSED! TurfLoot Backend APIs are working correctly.")
        else:
            print(f"\n⚠️  {failed} test(s) failed. Please check the issues above.")
        
        return test_results


def main():
    """Main function to run the test suite"""
    tester = TurfLootAPITester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    failed_tests = sum(1 for result in results.values() if not result)
    exit(0 if failed_tests == 0 else 1)


if __name__ == "__main__":
    main()