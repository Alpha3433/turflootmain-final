#!/usr/bin/env python3
"""
Debug Cash Out API Issues
Investigate the specific failing test cases
"""

import requests
import json
import uuid
import time

BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

def authenticate_and_get_token():
    """Get auth token for testing"""
    test_email = f"debug.test.{int(time.time())}@turfloot.com"
    privy_user_data = {
        "privy_user": {
            "id": f"did:privy:cm{uuid.uuid4().hex[:20]}",
            "email": {
                "address": test_email
            }
        }
    }
    
    response = requests.post(
        f"{API_BASE}/auth/privy",
        json=privy_user_data,
        headers={'Content-Type': 'application/json'}
    )
    
    if response.status_code == 200:
        data = response.json()
        return data.get('token')
    return None

def test_usd_minimum():
    """Test USD minimum validation"""
    token = authenticate_and_get_token()
    if not token:
        print("❌ Failed to authenticate")
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test USD minimum validation
    print("🔍 Testing USD minimum validation...")
    usd_request = {
        "amount": 10.0,  # Below expected minimum of $20
        "currency": "USD",
        "recipient_address": "11111111111111111111111111111112"
    }
    
    response = requests.post(
        f"{API_BASE}/wallet/cash-out",
        json=usd_request,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Check what the backend actually validates
    print("\n🔍 Testing what happens with USD currency...")
    
def test_balance_check():
    """Test balance checking logic"""
    token = authenticate_and_get_token()
    if not token:
        print("❌ Failed to authenticate")
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # First get balance
    balance_response = requests.get(f"{API_BASE}/wallet/balance", headers=headers)
    if balance_response.status_code == 200:
        balance_data = balance_response.json()
        print(f"💰 Current Balance: ${balance_data['balance']} USD, {balance_data['sol_balance']} SOL")
        
        # Test insufficient balance with SOL
        print("\n🔍 Testing insufficient SOL balance...")
        large_sol_request = {
            "amount": balance_data['sol_balance'] + 10.0,  # More than available SOL
            "currency": "SOL",
            "recipient_address": "11111111111111111111111111111112"
        }
        
        response = requests.post(
            f"{API_BASE}/wallet/cash-out",
            json=large_sol_request,
            headers=headers
        )
        
        print(f"SOL Insufficient Balance - Status: {response.status_code}")
        print(f"SOL Insufficient Balance - Response: {response.json()}")
        
        # Test insufficient balance with USD
        print("\n🔍 Testing insufficient USD balance...")
        large_usd_request = {
            "amount": balance_data['balance'] + 1000.0,  # More than available USD
            "currency": "USD",
            "recipient_address": "11111111111111111111111111111112"
        }
        
        response = requests.post(
            f"{API_BASE}/wallet/cash-out",
            json=large_usd_request,
            headers=headers
        )
        
        print(f"USD Insufficient Balance - Status: {response.status_code}")
        print(f"USD Insufficient Balance - Response: {response.json()}")

if __name__ == "__main__":
    print("🔍 DEBUGGING CASH OUT API ISSUES")
    print("=" * 50)
    
    test_usd_minimum()
    print("\n" + "=" * 50)
    test_balance_check()