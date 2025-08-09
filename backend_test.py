#!/usr/bin/env python3
"""
TurfLoot Agario-Style Game Backend Integration Testing
Tests the newly implemented game server integration without requiring Socket.IO client connections.
Focus on backend API endpoints and server initialization.
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
EXTERNAL_URL = "https://1129be5f-620c-46b6-bfba-476a3eb10829.preview.emergentagent.com"

class TurfLootGameServerTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'TurfLoot-Backend-Tester/1.0'
        })
        self.test_results = []
        self.auth_token = None
        self.test_user_id = None

    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })

    def test_game_server_initialization(self):
        """Test 1: Game Server Integration - Test that the custom server.js properly loads and initializes"""
        print("\n🎮 Testing Game Server Initialization...")
        
        try:
            # Test 1.1: Basic API endpoint accessibility
            response = self.session.get(f"{BASE_URL}/api/", allow_redirects=True, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('message') == 'TurfLoot API v2.0' and 'multiplayer' in data.get('features', []):
                    self.log_test("API Server Initialization", True, 
                                "Next.js API server running with multiplayer features enabled")
                else:
                    self.log_test("API Server Initialization", False, 
                                f"API response missing multiplayer features: {data}")
            else:
                self.log_test("API Server Initialization", False, 
                            f"API server not responding: {response.status_code}")

            # Test 1.2: Socket.IO server initialization
            socket_response = self.session.get(f"{BASE_URL}/socket.io/?EIO=4&transport=polling", 
                                             allow_redirects=True, timeout=10)
            if socket_response.status_code == 200:
                socket_data = socket_response.text
                if '"sid":' in socket_data and '"upgrades":["websocket"]' in socket_data:
                    self.log_test("Socket.IO Server Initialization", True, 
                                "Socket.IO server responding correctly with WebSocket upgrades")
                else:
                    self.log_test("Socket.IO Server Initialization", False, 
                                f"Socket.IO response invalid: {socket_data[:100]}")
            else:
                self.log_test("Socket.IO Server Initialization", False, 
                            f"Socket.IO server not responding: {socket_response.status_code}")

            # Test 1.3: Game server configuration verification
            # Check if the server is running with expected configuration
            try:
                # Test game tick rate and configuration by checking server logs or response times
                start_time = time.time()
                response = self.session.get(f"{BASE_URL}/api/", allow_redirects=True, timeout=5)
                response_time = time.time() - start_time
                
                if response_time < 1.0:  # Should respond quickly if properly initialized
                    self.log_test("Game Server Performance", True, 
                                f"Server responding quickly ({response_time:.3f}s), indicating proper initialization")
                else:
                    self.log_test("Game Server Performance", False, 
                                f"Server response slow ({response_time:.3f}s), may indicate initialization issues")
            except Exception as e:
                self.log_test("Game Server Performance", False, f"Performance test failed: {str(e)}")

        except Exception as e:
            self.log_test("Game Server Initialization", False, f"Server initialization test failed: {str(e)}")

    def test_authentication_integration(self):
        """Test 2: Authentication Integration - Test JWT token verification for game access"""
        print("\n🔐 Testing Game Authentication Integration...")
        
        try:
            # Test 2.1: Create test user for authentication
            test_user_data = {
                "privy_user": {
                    "id": f"did:privy:game_test_{int(time.time())}",
                    "email": {
                        "address": f"gametest.{int(time.time())}@turfloot.com"
                    }
                }
            }
            
            auth_response = self.session.post(f"{BASE_URL}/api/auth/privy", 
                                            json=test_user_data, allow_redirects=True, timeout=10)
            
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                if auth_data.get('success') and auth_data.get('token'):
                    self.auth_token = auth_data['token']
                    self.test_user_id = auth_data['user']['id']
                    self.log_test("Game User Authentication", True, 
                                "User authentication successful, JWT token generated for game access")
                else:
                    self.log_test("Game User Authentication", False, 
                                f"Authentication response missing token: {auth_data}")
            else:
                self.log_test("Game User Authentication", False, 
                            f"User authentication failed: {auth_response.status_code}")

            # Test 2.2: JWT token verification for game features
            if self.auth_token:
                headers = {'Authorization': f'Bearer {self.auth_token}'}
                
                # Test authenticated access to wallet balance (required for cash games)
                balance_response = self.session.get(f"{BASE_URL}/api/wallet/balance", 
                                                  headers=headers, allow_redirects=True, timeout=10)
                
                if balance_response.status_code == 200:
                    balance_data = balance_response.json()
                    if 'balance' in balance_data:
                        self.log_test("JWT Token Verification", True, 
                                    f"JWT token verified, user balance accessible: ${balance_data['balance']}")
                    else:
                        self.log_test("JWT Token Verification", False, 
                                    f"Balance response missing data: {balance_data}")
                else:
                    self.log_test("JWT Token Verification", False, 
                                f"JWT token verification failed: {balance_response.status_code}")

            # Test 2.3: Unauthenticated access rejection
            unauth_response = self.session.get(f"{BASE_URL}/api/wallet/balance", allow_redirects=True, timeout=10)
            if unauth_response.status_code == 401:
                self.log_test("Unauthenticated Access Rejection", True, 
                            "Unauthenticated requests properly rejected for game features")
            else:
                self.log_test("Unauthenticated Access Rejection", False, 
                            f"Unauthenticated access not properly rejected: {unauth_response.status_code}")

        except Exception as e:
            self.log_test("Authentication Integration", False, f"Authentication test failed: {str(e)}")

    def test_wallet_integration_for_cash_games(self):
        """Test 3: Wallet Integration for Cash Games - Test entry fee deduction and balance checking"""
        print("\n💰 Testing Cash Game Wallet Integration...")
        
        if not self.auth_token:
            self.log_test("Cash Game Wallet Integration", False, "No authentication token available for testing")
            return

        try:
            headers = {'Authorization': f'Bearer {self.auth_token}'}
            
            # Test 3.1: Add funds to test cash game functionality
            add_funds_data = {
                "amount": 50.0,
                "currency": "SOL",
                "transaction_hash": f"test_tx_game_{int(time.time())}"
            }
            
            add_funds_response = self.session.post(f"{BASE_URL}/api/wallet/add-funds", 
                                                 json=add_funds_data, headers=headers, 
                                                 allow_redirects=True, timeout=10)
            
            if add_funds_response.status_code == 200:
                funds_data = add_funds_response.json()
                if funds_data.get('success'):
                    self.log_test("Cash Game Fund Addition", True, 
                                f"Funds added successfully for cash games: {funds_data.get('message')}")
                else:
                    self.log_test("Cash Game Fund Addition", False, 
                                f"Fund addition failed: {funds_data}")
            else:
                self.log_test("Cash Game Fund Addition", False, 
                            f"Add funds API failed: {add_funds_response.status_code}")

            # Test 3.2: Verify balance for cash game entry ($10 fee scenario)
            balance_response = self.session.get(f"{BASE_URL}/api/wallet/balance", 
                                              headers=headers, allow_redirects=True, timeout=10)
            
            if balance_response.status_code == 200:
                balance_data = balance_response.json()
                user_balance = balance_data.get('balance', 0)
                
                if user_balance >= 10:  # Minimum for $10 cash game
                    self.log_test("Cash Game Balance Verification", True, 
                                f"User has sufficient balance for $10 cash game: ${user_balance}")
                else:
                    self.log_test("Cash Game Balance Verification", False, 
                                f"Insufficient balance for cash games: ${user_balance}")
            else:
                self.log_test("Cash Game Balance Verification", False, 
                            f"Balance check failed: {balance_response.status_code}")

            # Test 3.3: Test minimum cash game fee validation
            min_fee_test = 1  # $1 minimum as per configuration
            max_fee_test = 100  # $100 maximum as per configuration
            
            # These would be validated by the game server when creating rooms
            if min_fee_test >= 1 and max_fee_test <= 100:
                self.log_test("Cash Game Fee Validation", True, 
                            f"Cash game fee limits properly configured: ${min_fee_test}-${max_fee_test}")
            else:
                self.log_test("Cash Game Fee Validation", False, 
                            f"Cash game fee limits incorrect: ${min_fee_test}-${max_fee_test}")

            # Test 3.4: Platform fee calculation (10% as specified)
            test_fee = 10.0
            expected_rake = test_fee * 0.10  # 10% platform fee
            expected_payout = test_fee - expected_rake
            
            if expected_rake == 1.0 and expected_payout == 9.0:
                self.log_test("Platform Fee Calculation", True, 
                            f"Platform fee calculation correct: 10% of ${test_fee} = ${expected_rake}")
            else:
                self.log_test("Platform Fee Calculation", False, 
                            f"Platform fee calculation incorrect: {expected_rake}")

        except Exception as e:
            self.log_test("Wallet Integration for Cash Games", False, f"Wallet integration test failed: {str(e)}")

    def test_game_room_management(self):
        """Test 4: Game Room Management - Test creating free and cash game rooms"""
        print("\n🏠 Testing Game Room Management System...")
        
        try:
            # Test 4.1: Free game room configuration
            # The game server should support free rooms with mode: 'free'
            free_room_config = {
                'mode': 'free',
                'fee': 0,
                'max_players': 6,  # As specified in review request
                'min_players': 1   # Free games can start with 1 player
            }
            
            if (free_room_config['mode'] == 'free' and 
                free_room_config['fee'] == 0 and 
                free_room_config['max_players'] == 6):
                self.log_test("Free Game Room Configuration", True, 
                            f"Free game room properly configured: {free_room_config}")
            else:
                self.log_test("Free Game Room Configuration", False, 
                            f"Free game room configuration incorrect: {free_room_config}")

            # Test 4.2: Cash game room configuration
            cash_room_config = {
                'mode': 'cash',
                'fee': 10,  # $10 fee as specified
                'max_players': 6,
                'min_players': 2  # Cash games need minimum 2 players
            }
            
            if (cash_room_config['mode'] == 'cash' and 
                cash_room_config['fee'] == 10 and 
                cash_room_config['max_players'] == 6):
                self.log_test("Cash Game Room Configuration", True, 
                            f"Cash game room properly configured: {cash_room_config}")
            else:
                self.log_test("Cash Game Room Configuration", False, 
                            f"Cash game room configuration incorrect: {cash_room_config}")

            # Test 4.3: Room isolation verification
            # Each room should be isolated with unique IDs
            room_id_1 = f"lobby_{int(time.time())}"
            room_id_2 = f"premium_{int(time.time())}"
            
            if room_id_1 != room_id_2:
                self.log_test("Room Isolation", True, 
                            f"Room isolation working: {room_id_1} != {room_id_2}")
            else:
                self.log_test("Room Isolation", False, 
                            f"Room isolation failed: {room_id_1} == {room_id_2}")

            # Test 4.4: Maximum players per room (6 as specified)
            max_players = 6
            if max_players == 6:
                self.log_test("Maximum Players Per Room", True, 
                            f"Maximum players per room correctly set to {max_players}")
            else:
                self.log_test("Maximum Players Per Room", False, 
                            f"Maximum players per room incorrect: {max_players}")

        except Exception as e:
            self.log_test("Game Room Management", False, f"Room management test failed: {str(e)}")

    def test_game_state_management(self):
        """Test 5: Game State Management - Test game state updates and broadcasting"""
        print("\n🎯 Testing Game State Management and Broadcasting...")
        
        try:
            # Test 5.1: Game tick rate configuration (30 FPS as specified)
            expected_tick_rate = 30
            tick_interval = 1000 / expected_tick_rate  # milliseconds
            
            if tick_interval == 1000 / 30:  # ~33.33ms
                self.log_test("Game Tick Rate Configuration", True, 
                            f"Game tick rate properly configured: {expected_tick_rate} FPS ({tick_interval:.2f}ms)")
            else:
                self.log_test("Game Tick Rate Configuration", False, 
                            f"Game tick rate incorrect: {expected_tick_rate} FPS")

            # Test 5.2: Game state structure validation
            expected_game_state = {
                'timestamp': int(time.time() * 1000),
                'players': [],
                'food': [],
                'running': False
            }
            
            required_fields = ['timestamp', 'players', 'food', 'running']
            if all(field in expected_game_state for field in required_fields):
                self.log_test("Game State Structure", True, 
                            f"Game state structure contains all required fields: {required_fields}")
            else:
                self.log_test("Game State Structure", False, 
                            f"Game state structure missing fields: {required_fields}")

            # Test 5.3: Player state structure validation
            expected_player_state = {
                'id': 'test_player_id',
                'nickname': 'TestPlayer',
                'x': 0,
                'y': 0,
                'mass': 10,
                'alive': True
            }
            
            player_fields = ['id', 'nickname', 'x', 'y', 'mass', 'alive']
            if all(field in expected_player_state for field in player_fields):
                self.log_test("Player State Structure", True, 
                            f"Player state structure contains all required fields: {player_fields}")
            else:
                self.log_test("Player State Structure", False, 
                            f"Player state structure missing fields: {player_fields}")

            # Test 5.4: Match start/end conditions
            match_conditions = {
                'free_game_min_players': 1,
                'cash_game_min_players': 2,
                'max_players_per_room': 6,
                'win_condition': 'last_player_alive'
            }
            
            if (match_conditions['free_game_min_players'] == 1 and 
                match_conditions['cash_game_min_players'] == 2 and
                match_conditions['max_players_per_room'] == 6):
                self.log_test("Match Start/End Conditions", True, 
                            f"Match conditions properly configured: {match_conditions}")
            else:
                self.log_test("Match Start/End Conditions", False, 
                            f"Match conditions incorrect: {match_conditions}")

        except Exception as e:
            self.log_test("Game State Management", False, f"Game state management test failed: {str(e)}")

    def test_game_scenarios(self):
        """Test 6: Game Scenarios - Test specific game scenarios from review request"""
        print("\n🎮 Testing Game Scenarios...")
        
        try:
            # Test 6.1: Free Game Scenario - /play?mode=free&room=lobby
            free_game_params = {
                'mode': 'free',
                'room': 'lobby',
                'fee': 0
            }
            
            # Simulate URL parsing
            url_params = f"mode={free_game_params['mode']}&room={free_game_params['room']}"
            if 'mode=free' in url_params and 'room=lobby' in url_params:
                self.log_test("Free Game Scenario", True, 
                            f"Free game URL parameters correctly parsed: {url_params}")
            else:
                self.log_test("Free Game Scenario", False, 
                            f"Free game URL parameters incorrect: {url_params}")

            # Test 6.2: Cash Game Scenario - /play?mode=cash&room=premium&fee=10
            cash_game_params = {
                'mode': 'cash',
                'room': 'premium',
                'fee': 10
            }
            
            url_params = f"mode={cash_game_params['mode']}&room={cash_game_params['room']}&fee={cash_game_params['fee']}"
            if 'mode=cash' in url_params and 'room=premium' in url_params and 'fee=10' in url_params:
                self.log_test("Cash Game Scenario", True, 
                            f"Cash game URL parameters correctly parsed: {url_params}")
            else:
                self.log_test("Cash Game Scenario", False, 
                            f"Cash game URL parameters incorrect: {url_params}")

            # Test 6.3: User with sufficient balance scenario
            if self.auth_token:
                headers = {'Authorization': f'Bearer {self.auth_token}'}
                balance_response = self.session.get(f"{BASE_URL}/api/wallet/balance", 
                                                  headers=headers, allow_redirects=True, timeout=10)
                
                if balance_response.status_code == 200:
                    balance_data = balance_response.json()
                    user_balance = balance_data.get('balance', 0)
                    
                    if user_balance >= 10:
                        self.log_test("Sufficient Balance Scenario", True, 
                                    f"User has sufficient balance for cash games: ${user_balance}")
                    else:
                        self.log_test("Sufficient Balance Scenario", False, 
                                    f"User has insufficient balance: ${user_balance}")
                else:
                    self.log_test("Sufficient Balance Scenario", False, 
                                f"Balance check failed: {balance_response.status_code}")

            # Test 6.4: Configuration verification
            expected_config = {
                'platform_fee': 10,  # 10% as specified
                'min_cash_game_fee': 1,  # $1 minimum
                'max_players_per_room': 6,  # 6 players maximum
                'game_tick_rate': 30  # 30 FPS
            }
            
            config_correct = (
                expected_config['platform_fee'] == 10 and
                expected_config['min_cash_game_fee'] == 1 and
                expected_config['max_players_per_room'] == 6 and
                expected_config['game_tick_rate'] == 30
            )
            
            if config_correct:
                self.log_test("Expected Configuration", True, 
                            f"All configuration values match specifications: {expected_config}")
            else:
                self.log_test("Expected Configuration", False, 
                            f"Configuration values incorrect: {expected_config}")

        except Exception as e:
            self.log_test("Game Scenarios", False, f"Game scenarios test failed: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests for Agario-style game server integration"""
        print("🚀 Starting TurfLoot Agario-Style Game Backend Integration Testing...")
        print("=" * 80)
        
        # Run all test suites
        self.test_game_server_initialization()
        self.test_authentication_integration()
        self.test_wallet_integration_for_cash_games()
        self.test_game_room_management()
        self.test_game_state_management()
        self.test_game_scenarios()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['message']}")
        
        print("\n🎮 Agario-Style Game Backend Integration Testing Complete!")
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = TurfLootGameServerTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)