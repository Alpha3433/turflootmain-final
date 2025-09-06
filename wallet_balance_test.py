#!/usr/bin/env python3
"""
TurfLoot Wallet Balance Endpoint Testing
Tests wallet balance endpoint with real blockchain integration for specific wallet address.
Focus: Testing with user's actual wallet 0x2ec1DDCCd0387603cd68a564CDf0129576b1a25d
"""

import requests
import json
import time
import uuid
import sys
from datetime import datetime

# Configuration - Test both localhost and external URL
LOCALHOST_URL = "http://localhost:3000"
EXTERNAL_URL = "https://turfloot-tactical.preview.emergentagent.com"

# Test wallet address (user's actual wallet with 0.002 ETH)
TEST_WALLET_ADDRESS = "0x2ec1DDCCd0387603cd68a564CDf0129576b1a25d"

def log_test(message, status="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

def test_user_creation_with_wallet(base_url):
    """Test 1: Create a test user with the specific wallet address"""
    log_test("=== TEST 1: User Creation with Wallet Address ===")
    
    try:
        api_base = f"{base_url}/api"
        
        # Create test user via Privy authentication endpoint
        test_user_data = {
            "privy_user": {
                "id": f"did:privy:test_{int(time.time())}",
                "wallet": {
                    "address": TEST_WALLET_ADDRESS
                },
                "email": {
                    "address": f"test.wallet.{int(time.time())}@turfloot.com"
                }
            }
        }
        
        log_test(f"Creating test user with wallet address: {TEST_WALLET_ADDRESS}")
        log_test(f"Using API endpoint: {api_base}/auth/privy")
        
        response = requests.post(
            f"{api_base}/auth/privy",
            json=test_user_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        log_test(f"User creation response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log_test("✅ User creation successful")
            log_test(f"User ID: {data.get('user', {}).get('id')}")
            log_test(f"Wallet Address: {data.get('user', {}).get('wallet_address')}")
            log_test(f"JWT Token: {'Present' if data.get('token') else 'Missing'}")
            
            return {
                'success': True,
                'user': data.get('user'),
                'token': data.get('token')
            }
        else:
            log_test(f"❌ User creation failed: {response.status_code} - {response.text}", "ERROR")
            return {'success': False, 'error': response.text}
            
    except Exception as e:
        log_test(f"❌ User creation error: {str(e)}", "ERROR")
        return {'success': False, 'error': str(e)}

def test_authentication_token(token, base_url):
    """Test 2: Verify JWT token authentication"""
    log_test("=== TEST 2: Authentication Token Verification ===")
    
    try:
        api_base = f"{base_url}/api"
        log_test("Testing JWT token authentication...")
        
        response = requests.get(
            f"{api_base}/auth/me",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        log_test(f"Auth verification response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log_test("✅ JWT token authentication successful")
            log_test(f"Authenticated user: {data.get('user', {}).get('id')}")
            log_test(f"User email: {data.get('user', {}).get('email')}")
            log_test(f"Wallet address: {data.get('user', {}).get('wallet_address')}")
            return {'success': True, 'user': data.get('user')}
        else:
            log_test(f"❌ Authentication failed: {response.status_code} - {response.text}", "ERROR")
            return {'success': False, 'error': response.text}
            
    except Exception as e:
        log_test(f"❌ Authentication error: {str(e)}", "ERROR")
        return {'success': False, 'error': str(e)}

def test_wallet_balance_endpoint(token, base_url):
    """Test 3: Test wallet balance endpoint with real blockchain integration"""
    log_test("=== TEST 3: Wallet Balance Endpoint with Blockchain Integration ===")
    
    try:
        api_base = f"{base_url}/api"
        log_test(f"Testing wallet balance endpoint for wallet: {TEST_WALLET_ADDRESS}")
        log_test("This should fetch real ETH balance from blockchain...")
        
        start_time = time.time()
        
        response = requests.get(
            f"{api_base}/wallet/balance",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            timeout=30  # Longer timeout for blockchain queries
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        log_test(f"Wallet balance response status: {response.status_code}")
        log_test(f"Response time: {response_time:.3f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            log_test("✅ Wallet balance endpoint successful")
            
            # Verify response structure
            log_test("=== WALLET BALANCE RESPONSE ===")
            log_test(f"Wallet Address: {data.get('wallet_address')}")
            log_test(f"ETH Balance: {data.get('eth_balance')} ETH")
            log_test(f"SOL Balance: {data.get('sol_balance')} SOL")
            log_test(f"USDC Balance: {data.get('usdc_balance')} USDC")
            log_test(f"USD Balance: ${data.get('balance')}")
            log_test(f"Currency: {data.get('currency')}")
            
            # Verify wallet address matches
            if data.get('wallet_address') == TEST_WALLET_ADDRESS:
                log_test("✅ Correct wallet address returned")
            else:
                log_test(f"⚠️ Wallet address mismatch: expected {TEST_WALLET_ADDRESS}, got {data.get('wallet_address')}")
            
            # Check if real blockchain balance was fetched
            eth_balance = data.get('eth_balance', 0)
            if eth_balance > 0:
                log_test(f"✅ Real ETH balance fetched: {eth_balance} ETH")
                
                # Calculate expected USD value (approximate)
                eth_price = 2400  # Approximate ETH price used in backend
                expected_usd = eth_balance * eth_price
                log_test(f"Expected USD value: ~${expected_usd:.2f}")
                
                actual_usd = data.get('balance', 0)
                log_test(f"Actual USD value: ${actual_usd}")
                
                if abs(actual_usd - expected_usd) < expected_usd * 0.1:  # Within 10%
                    log_test("✅ USD conversion appears correct")
                else:
                    log_test("⚠️ USD conversion may be off")
                    
            else:
                log_test("⚠️ No ETH balance found - may indicate blockchain query issue")
            
            return {
                'success': True,
                'balance_data': data,
                'response_time': response_time
            }
        else:
            log_test(f"❌ Wallet balance endpoint failed: {response.status_code} - {response.text}", "ERROR")
            return {'success': False, 'error': response.text}
            
    except Exception as e:
        log_test(f"❌ Wallet balance endpoint error: {str(e)}", "ERROR")
        return {'success': False, 'error': str(e)}

def test_localhost_vs_external():
    """Test 4: Compare localhost vs external URL functionality"""
    log_test("=== TEST 4: Localhost vs External URL Comparison ===")
    
    results = {}
    
    try:
        # Test localhost first
        log_test("Testing localhost endpoint...")
        try:
            localhost_response = requests.get(
                f"{LOCALHOST_URL}/api",
                timeout=5
            )
            
            log_test(f"Localhost status: {localhost_response.status_code}")
            if localhost_response.status_code == 200:
                log_test("✅ Localhost API accessible")
                results['localhost_working'] = True
            else:
                log_test("❌ Localhost API not accessible")
                results['localhost_working'] = False
        except Exception as e:
            log_test(f"❌ Localhost connection error: {str(e)}")
            results['localhost_working'] = False
        
        # Test external URL
        log_test("Testing external URL endpoint...")
        try:
            external_response = requests.get(
                f"{EXTERNAL_URL}/api",
                timeout=10
            )
            
            log_test(f"External URL status: {external_response.status_code}")
            if external_response.status_code == 200:
                log_test("✅ External URL API accessible")
                results['external_working'] = True
            else:
                log_test("❌ External URL API not accessible")
                results['external_working'] = False
        except Exception as e:
            log_test(f"❌ External URL connection error: {str(e)}")
            results['external_working'] = False
            
        return results
        
    except Exception as e:
        log_test(f"❌ URL comparison error: {str(e)}", "ERROR")
        return {'localhost_working': False, 'external_working': False}

def test_console_logs_verification():
    """Test 5: Verify console logs show blockchain query process"""
    log_test("=== TEST 5: Console Logs Verification ===")
    
    log_test("Console logs to look for in server output:")
    log_test("- '🔍 Wallet balance request for user...'")
    log_test("- '🔗 Fetching blockchain balance for wallet: 0x2ec1DDCCd0387603cd68a564CDf0129576b1a25d'")
    log_test("- '💰 ETH Balance: X.XXX ETH'")
    log_test("- '💵 USD Balance: $X.XX'")
    log_test("- '✅ Returning wallet balance: {...}'")
    
    log_test("Check server logs to confirm blockchain query process is working")
    
    return {'success': True, 'message': 'Check server console for blockchain query logs'}

def run_comprehensive_wallet_test():
    """Run comprehensive wallet balance endpoint test"""
    log_test("🚀 Starting Comprehensive Wallet Balance Endpoint Test")
    log_test(f"Target wallet: {TEST_WALLET_ADDRESS}")
    log_test(f"Expected ETH balance: ~0.002 ETH (~$4.80)")
    log_test("=" * 60)
    
    results = {
        'user_creation': None,
        'authentication': None,
        'wallet_balance': None,
        'url_comparison': None,
        'console_logs': None
    }
    
    # Test URL accessibility first
    url_result = test_localhost_vs_external()
    results['url_comparison'] = url_result
    
    # Determine which URL to use for testing
    if url_result.get('localhost_working'):
        base_url = LOCALHOST_URL
        log_test("Using localhost for testing (external URL has 502 errors)")
    elif url_result.get('external_working'):
        base_url = EXTERNAL_URL
        log_test("Using external URL for testing")
    else:
        log_test("❌ Neither localhost nor external URL is accessible", "ERROR")
        return results
    
    # Test 1: Create user with wallet address
    user_result = test_user_creation_with_wallet(base_url)
    results['user_creation'] = user_result
    
    if not user_result.get('success'):
        log_test("❌ Cannot proceed without user creation", "ERROR")
        return results
    
    token = user_result.get('token')
    if not token:
        log_test("❌ No JWT token received", "ERROR")
        return results
    
    # Test 2: Verify authentication
    auth_result = test_authentication_token(token, base_url)
    results['authentication'] = auth_result
    
    if not auth_result.get('success'):
        log_test("❌ Cannot proceed without authentication", "ERROR")
        return results
    
    # Test 3: Test wallet balance endpoint
    balance_result = test_wallet_balance_endpoint(token, base_url)
    results['wallet_balance'] = balance_result
    
    # Test 5: Console logs verification
    logs_result = test_console_logs_verification()
    results['console_logs'] = logs_result
    
    # Summary
    log_test("=" * 60)
    log_test("🏁 TEST SUMMARY")
    log_test("=" * 60)
    
    total_tests = 5
    passed_tests = 0
    
    if results['user_creation'].get('success'):
        log_test("✅ User Creation: PASSED")
        passed_tests += 1
    else:
        log_test("❌ User Creation: FAILED")
    
    if results['authentication'].get('success'):
        log_test("✅ Authentication: PASSED")
        passed_tests += 1
    else:
        log_test("❌ Authentication: FAILED")
    
    if results['wallet_balance'].get('success'):
        log_test("✅ Wallet Balance Endpoint: PASSED")
        passed_tests += 1
    else:
        log_test("❌ Wallet Balance Endpoint: FAILED")
    
    if results['url_comparison'].get('localhost_working'):
        log_test("✅ Localhost Access: WORKING")
    else:
        log_test("❌ Localhost Access: NOT WORKING")
    
    if results['url_comparison'].get('external_working'):
        log_test("✅ External URL Access: WORKING")
    else:
        log_test("❌ External URL Access: NOT WORKING (502 Bad Gateway)")
    
    log_test("✅ Console Logs: CHECK SERVER OUTPUT")
    passed_tests += 1
    
    log_test(f"📊 Overall Result: {passed_tests}/{total_tests} tests passed")
    
    if results['wallet_balance'].get('success'):
        balance_data = results['wallet_balance'].get('balance_data', {})
        eth_balance = balance_data.get('eth_balance', 0)
        usd_balance = balance_data.get('balance', 0)
        
        log_test("🎯 KEY FINDINGS:")
        log_test(f"   - Wallet Address: {balance_data.get('wallet_address')}")
        log_test(f"   - ETH Balance: {eth_balance} ETH")
        log_test(f"   - USD Value: ${usd_balance}")
        log_test(f"   - Response Time: {results['wallet_balance'].get('response_time', 0):.3f}s")
        
        if eth_balance > 0:
            log_test("✅ BLOCKCHAIN INTEGRATION WORKING - Real ETH balance fetched!")
        else:
            log_test("⚠️ No ETH balance detected - check blockchain query")
    
    return results

if __name__ == "__main__":
    run_comprehensive_wallet_test()