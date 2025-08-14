#!/usr/bin/env node

/**
 * TurfLoot Privy Configuration Debug Script
 */

console.log('🔍 TurfLoot Privy Configuration Debug');
console.log('=' .repeat(50));

// Check environment variables
const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privySecret = process.env.PRIVY_APP_SECRET;
const nodeEnv = process.env.NODE_ENV;

console.log('📋 Environment Variables:');
console.log(`NODE_ENV: ${nodeEnv || 'NOT SET'}`);
console.log(`NEXT_PUBLIC_PRIVY_APP_ID: ${privyAppId || 'NOT SET'}`);
console.log(`PRIVY_APP_SECRET length: ${privySecret ? privySecret.length : 0}`);
console.log('');

// Validate Privy App ID format
if (privyAppId) {
  console.log('✅ Privy App ID is set');
  
  // Check if it looks like a valid Privy App ID
  if (privyAppId.length > 20 && privyAppId.includes('clx')) {
    console.log('✅ Privy App ID format looks correct');
  } else {
    console.log('❌ Privy App ID format looks suspicious');
  }
} else {
  console.log('❌ NEXT_PUBLIC_PRIVY_APP_ID is not set!');
  console.log('💡 This is likely why the login button is stuck on "Loading..."');
}

console.log('');

// Test if we can load the environment from .env file
try {
  const fs = require('fs');
  const path = require('path');
  
  console.log('🔍 Checking .env file:');
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasPrivyAppId = envContent.includes('NEXT_PUBLIC_PRIVY_APP_ID');
    const hasPrivySecret = envContent.includes('PRIVY_APP_SECRET');
    
    console.log(`✅ .env file exists at: ${envPath}`);
    console.log(`✅ Contains NEXT_PUBLIC_PRIVY_APP_ID: ${hasPrivyAppId}`);
    console.log(`✅ Contains PRIVY_APP_SECRET: ${hasPrivySecret}`);
    
    if (hasPrivyAppId) {
      const privyMatch = envContent.match(/NEXT_PUBLIC_PRIVY_APP_ID=(.+)/);
      if (privyMatch) {
        console.log(`✅ Privy App ID in .env: ${privyMatch[1].substring(0, 10)}...`);
      }
    }
  } else {
    console.log('❌ .env file not found');
  }
} catch (error) {
  console.log('❌ Error reading .env file:', error.message);
}

console.log('');
console.log('🎯 Recommendations:');

if (!privyAppId) {
  console.log('1. ❌ Set NEXT_PUBLIC_PRIVY_APP_ID in your .env file');
  console.log('   Example: NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here');
  console.log('2. 🔄 Restart the Next.js server after updating .env');
  console.log('3. 🌐 Make sure you have a Privy account and app configured');
} else {
  console.log('1. ✅ Privy App ID is configured');
  console.log('2. 🔄 Try restarting the Next.js server');
  console.log('3. 🌐 Check if the Privy app is properly configured in their dashboard');
}

console.log('');
console.log('🔧 Quick Fix:');
console.log('If login is still stuck on "Loading...", the issue is likely:');
console.log('- Privy App ID not being loaded by Next.js');
console.log('- Network issues connecting to Privy servers');
console.log('- Invalid Privy App ID or configuration');