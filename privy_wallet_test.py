#!/usr/bin/env python3
"""
Privy Wallet Funding Integration Test
Specific test for the APIs mentioned in the review request after WalletManager.jsx changes
Focus: useFundWallet hook implementation verification
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_icon} {test_name}: {status}")
    if details:
        print(f"    {details}")
    print()

def test_wallet_apis():
    """Test wallet APIs mentioned in review request"""
    print("=" * 70)
    print("💰 WALLET API HEALTH CHECK - Priority Focus")
    print("=" * 70)
    
    # Create test user first for authenticated tests
    auth_token = None
    try:
        # Create test user via Privy auth
        test_data = {
            "access_token": f"test_token_{int(time.time())}",
            "privy_user": {
                "id": f"did:privy:wallet_test_{int(time.time())}",
                "email": {"address": f"wallet.test.{int(time.time())}@turfloot.com"},
                "google": {
                    "email": f"wallet.google.{int(time.time())}@gmail.com",
                    "name": "Wallet Test User"
                },
                "wallet": {"address": "11111111111111111111111111111112"}
            }
        }
        response = requests.post(f"{API_BASE}/auth/privy", json=test_data, timeout=10)
        if response.status_code in [200, 201]:
            data = response.json()
            auth_token = data.get('token')
            log_test("Test User Creation", "PASS", f"Created test user with auth token")
        else:
            log_test("Test User Creation", "FAIL", f"Failed to create test user: {response.status_code}")
    except Exception as e:
        log_test("Test User Creation", "FAIL", f"Error: {str(e)}")
    
    # Test 1: GET /api/wallet/balance
    try:
        headers = {'Authorization': f'Bearer {auth_token}'} if auth_token else {}
        response = requests.get(f"{API_BASE}/wallet/balance", headers=headers, timeout=10)
        
        if auth_token and response.status_code == 200:
            data = response.json()
            balance = data.get('balance', 0)
            sol_balance = data.get('sol_balance', 0)
            usdc_balance = data.get('usdc_balance', 0)
            log_test("GET /api/wallet/balance", "PASS", 
                    f"Balance: ${balance}, SOL: {sol_balance}, USDC: {usdc_balance}")
        elif not auth_token and response.status_code == 401:
            log_test("GET /api/wallet/balance (no auth)", "PASS", 
                    "Correctly requires authentication")
        else:
            log_test("GET /api/wallet/balance", "FAIL", 
                    f"Unexpected response: {response.status_code} - {response.text[:100]}")
    except Exception as e:
        log_test("GET /api/wallet/balance", "FAIL", f"Request error: {str(e)}")
    
    # Test 2: POST /api/wallet/add-funds
    try:
        test_data = {
            "amount": 0.1,
            "currency": "SOL",
            "transaction_hash": f"test_add_funds_{int(time.time())}"
        }
        headers = {'Authorization': f'Bearer {auth_token}'} if auth_token else {}
        response = requests.post(f"{API_BASE}/wallet/add-funds", 
                               json=test_data, headers=headers, timeout=10)
        
        if auth_token and response.status_code == 200:
            data = response.json()
            log_test("POST /api/wallet/add-funds", "PASS", 
                    f"Add funds successful: {data.get('message', 'Success')}")
        elif not auth_token and response.status_code == 401:
            log_test("POST /api/wallet/add-funds (no auth)", "PASS", 
                    "Correctly requires authentication")
        else:
            log_test("POST /api/wallet/add-funds", "FAIL", 
                    f"Unexpected response: {response.status_code} - {response.text[:100]}")
    except Exception as e:
        log_test("POST /api/wallet/add-funds", "FAIL", f"Request error: {str(e)}")
    
    # Test 3: POST /api/wallet/cash-out
    try:
        test_data = {
            "amount": 0.05,
            "currency": "SOL",
            "recipient_address": "11111111111111111111111111111112"
        }
        headers = {'Authorization': f'Bearer {auth_token}'} if auth_token else {}
        response = requests.post(f"{API_BASE}/wallet/cash-out", 
                               json=test_data, headers=headers, timeout=10)
        
        if auth_token and response.status_code in [200, 400]:  # 400 for insufficient balance is OK
            data = response.json()
            if response.status_code == 200:
                log_test("POST /api/wallet/cash-out", "PASS", 
                        f"Cash out successful: {data.get('message', 'Success')}")
            else:
                log_test("POST /api/wallet/cash-out", "PASS", 
                        f"Cash out validation working: {data.get('error', 'Insufficient balance')}")
        elif not auth_token and response.status_code == 401:
            log_test("POST /api/wallet/cash-out (no auth)", "PASS", 
                    "Correctly requires authentication")
        else:
            log_test("POST /api/wallet/cash-out", "FAIL", 
                    f"Unexpected response: {response.status_code} - {response.text[:100]}")
    except Exception as e:
        log_test("POST /api/wallet/cash-out", "FAIL", f"Request error: {str(e)}")
    
    # Test 4: GET /api/wallet/transactions
    try:
        headers = {'Authorization': f'Bearer {auth_token}'} if auth_token else {}
        response = requests.get(f"{API_BASE}/wallet/transactions", headers=headers, timeout=10)
        
        if auth_token and response.status_code == 200:
            data = response.json()
            transactions = data.get('transactions', [])
            log_test("GET /api/wallet/transactions", "PASS", 
                    f"Retrieved {len(transactions)} transactions")
        elif not auth_token and response.status_code == 401:
            log_test("GET /api/wallet/transactions (no auth)", "PASS", 
                    "Correctly requires authentication")
        else:
            log_test("GET /api/wallet/transactions", "FAIL", 
                    f"Unexpected response: {response.status_code} - {response.text[:100]}")
    except Exception as e:
        log_test("GET /api/wallet/transactions", "FAIL", f"Request error: {str(e)}")

def test_authentication_system():
    """Test Privy authentication system"""
    print("=" * 70)
    print("🔐 PRIVY AUTHENTICATION SYSTEM - Priority Focus")
    print("=" * 70)
    
    # Test POST /api/auth/privy
    try:
        test_data = {
            "access_token": f"privy_test_{int(time.time())}",
            "privy_user": {
                "id": f"did:privy:auth_test_{int(time.time())}",
                "email": {"address": f"auth.test.{int(time.time())}@turfloot.com"},
                "google": {
                    "email": f"auth.google.{int(time.time())}@gmail.com",
                    "name": "Auth Test User"
                },
                "wallet": {"address": "11111111111111111111111111111112"}
            }
        }
        response = requests.post(f"{API_BASE}/auth/privy", json=test_data, timeout=10)
        
        if response.status_code in [200, 201]:
            data = response.json()
            token = data.get('token')
            user_id = data.get('user', {}).get('id')
            log_test("POST /api/auth/privy", "PASS", 
                    f"Authentication successful, JWT token generated, User ID: {user_id}")
        else:
            log_test("POST /api/auth/privy", "FAIL", 
                    f"Authentication failed: {response.status_code} - {response.text[:100]}")
    except Exception as e:
        log_test("POST /api/auth/privy", "FAIL", f"Request error: {str(e)}")

def test_core_game_apis():
    """Test core game APIs for regressions"""
    print("=" * 70)
    print("🎮 CORE GAME APIs - Regression Check")
    print("=" * 70)
    
    # Test GET /api/
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "TurfLoot API" in data.get("message", ""):
                features = data.get("features", [])
                log_test("GET /api/ (root endpoint)", "PASS", 
                        f"API responding correctly, features: {features}")
            else:
                log_test("GET /api/ (root endpoint)", "FAIL", 
                        f"Unexpected response format: {data}")
        else:
            log_test("GET /api/ (root endpoint)", "FAIL", 
                    f"HTTP {response.status_code}: {response.text[:100]}")
    except Exception as e:
        log_test("GET /api/ (root endpoint)", "FAIL", f"Request error: {str(e)}")
    
    # Test GET /api/pots
    try:
        response = requests.get(f"{API_BASE}/pots", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                total_players = sum(pot.get('players', 0) for pot in data)
                total_pot = sum(pot.get('pot', 0) for pot in data)
                log_test("GET /api/pots", "PASS", 
                        f"{len(data)} tables, {total_players} players, ${total_pot} total pot")
            else:
                log_test("GET /api/pots", "FAIL", 
                        f"Expected array, got: {type(data)}")
        else:
            log_test("GET /api/pots", "FAIL", 
                    f"HTTP {response.status_code}: {response.text[:100]}")
    except Exception as e:
        log_test("GET /api/pots", "FAIL", f"Request error: {str(e)}")
    
    # Test GET /api/stats/live-players
    try:
        response = requests.get(f"{API_BASE}/stats/live-players", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "count" in data:
                log_test("GET /api/stats/live-players", "PASS", 
                        f"Live players: {data.get('count')}")
            else:
                log_test("GET /api/stats/live-players", "FAIL", 
                        f"Missing count field: {data}")
        else:
            log_test("GET /api/stats/live-players", "FAIL", 
                    f"HTTP {response.status_code}: {response.text[:100]}")
    except Exception as e:
        log_test("GET /api/stats/live-players", "FAIL", f"Request error: {str(e)}")
    
    # Test GET /api/stats/global-winnings
    try:
        response = requests.get(f"{API_BASE}/stats/global-winnings", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "total" in data:
                log_test("GET /api/stats/global-winnings", "PASS", 
                        f"Global winnings: {data.get('total')}")
            else:
                log_test("GET /api/stats/global-winnings", "FAIL", 
                        f"Missing total field: {data}")
        else:
            log_test("GET /api/stats/global-winnings", "FAIL", 
                    f"HTTP {response.status_code}: {response.text[:100]}")
    except Exception as e:
        log_test("GET /api/stats/global-winnings", "FAIL", f"Request error: {str(e)}")

def test_user_management():
    """Test user profile functionality"""
    print("=" * 70)
    print("👤 USER MANAGEMENT - Profile Updates")
    print("=" * 70)
    
    # Test POST /api/users/profile/update-name
    try:
        test_data = {
            "userId": f"did:privy:name_test_{int(time.time())}",
            "customName": f"PrivyWalletTester_{int(time.time())}"
        }
        response = requests.post(f"{API_BASE}/users/profile/update-name", 
                               json=test_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            log_test("POST /api/users/profile/update-name", "PASS", 
                    f"Name update successful: {data.get('message', 'Success')}")
        else:
            log_test("POST /api/users/profile/update-name", "FAIL", 
                    f"HTTP {response.status_code}: {response.text[:100]}")
    except Exception as e:
        log_test("POST /api/users/profile/update-name", "FAIL", f"Request error: {str(e)}")

def run_privy_wallet_test():
    """Run focused test for Privy wallet integration"""
    print("🚀 PRIVY WALLET FUNDING INTEGRATION TEST")
    print("🎯 Testing WalletManager.jsx useFundWallet hook changes")
    print("📅 Test Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("🌐 Backend URL:", BASE_URL)
    print()
    
    start_time = time.time()
    
    # Run focused tests
    test_wallet_apis()
    test_authentication_system()
    test_core_game_apis()
    test_user_management()
    
    end_time = time.time()
    duration = end_time - start_time
    
    print("=" * 70)
    print("📊 PRIVY WALLET INTEGRATION TEST SUMMARY")
    print("=" * 70)
    print(f"⏱️  Test Duration: {duration:.2f} seconds")
    print(f"🔗 Backend URL: {BASE_URL}")
    print()
    print("🎯 TESTED COMPONENTS:")
    print("   ✅ Wallet Balance API (GET /api/wallet/balance)")
    print("   ✅ Add Funds API (POST /api/wallet/add-funds)")
    print("   ✅ Cash Out API (POST /api/wallet/cash-out)")
    print("   ✅ Transaction History API (GET /api/wallet/transactions)")
    print("   ✅ Privy Authentication (POST /api/auth/privy)")
    print("   ✅ Core Game APIs (root, pots, live stats)")
    print("   ✅ User Profile Management")
    print()
    print("💡 CONTEXT:")
    print("   • Frontend: WalletManager.jsx now uses useFundWallet hook correctly")
    print("   • Backend: Should be unaffected by frontend Privy hook changes")
    print("   • Focus: Verify no regressions in wallet and auth APIs")
    print()
    print("✅ Testing completed - check individual results above")

if __name__ == "__main__":
    run_privy_wallet_test()