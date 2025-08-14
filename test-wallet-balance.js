#!/usr/bin/env node

/**
 * TurfLoot Wallet Balance API Test Script
 * Tests both authenticated and unauthenticated wallet balance endpoints
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/wallet/balance`;

async function testWalletBalance() {
  console.log('🧪 TurfLoot Wallet Balance API Test');
  console.log('=' .repeat(50));
  console.log(`🔗 API URL: ${API_URL}`);
  console.log('');

  // Test 1: Unauthenticated request
  console.log('📋 Test 1: Unauthenticated Request');
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📊 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('');

  // Test 2: Testing token request
  console.log('📋 Test 2: Testing Token Request');
  try {
    const testingToken = `testing-${btoa(JSON.stringify({
      userId: 'test-user-123',
      privyId: 'test-privy-id',
      email: 'test@turfloot.com',
      wallet_address: '0x2ec1DDCCd0387603cd68a564CDf0129576b1a25d',
      timestamp: Date.now()
    }))}`;

    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${testingToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📊 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('');

  // Test 3: Invalid token request
  console.log('📋 Test 3: Invalid Token Request');
  try {
    const response = await fetch(API_URL, {
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📊 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('');

  // Test 4: Check server status
  console.log('📋 Test 4: Server Status Check');
  try {
    const response = await fetch(`${BASE_URL}/api`);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📊 Server Info:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('');
  console.log('🎯 Testing Complete!');
  console.log('💡 For production deployment:');
  console.log('   - Set NEXT_PUBLIC_TESTING_MODE=false');
  console.log('   - Configure proper blockchain RPC endpoints');
  console.log('   - Set up MongoDB Atlas connection');
  console.log('   - Configure Privy production app credentials');
}

// Run the test
testWalletBalance().catch(console.error);