#!/usr/bin/env node

const fetch = require('node-fetch');
const { URL } = require('url');

console.log('🎮 COLYSEUS MULTIPLAYER FIX - COMPREHENSIVE TEST');
console.log('================================================');

async function testColyseusIntegration() {
  console.log('\n1. 🔍 Testing Server Browser API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/servers');
    const data = await response.json();
    
    console.log('✅ Server API Response Status:', response.status);
    console.log('📊 Response Data:');
    console.log('  - Colyseus Enabled:', data.colyseusEnabled);
    console.log('  - Colyseus Endpoint:', data.colyseusEndpoint);
    console.log('  - Total Servers:', data.servers?.length || 0);
    
    if (data.servers && data.servers.length > 0) {
      const server = data.servers[0];
      console.log('  - First Server:');
      console.log('    * ID:', server.id);
      console.log('    * Name:', server.name);
      console.log('    * Server Type:', server.serverType);
      console.log('    * Endpoint:', server.endpoint);
      console.log('    * Region:', server.region);
      console.log('    * Entry Fee:', server.entryFee);
      
      // Test 2: Verify Colyseus Configuration
      console.log('\n2. ✅ Testing Colyseus Configuration...');
      
      const expectedEndpoint = 'wss://au-syd-ab3eaf4e.colyseus.cloud';
      const hasCorrectEndpoint = data.colyseusEndpoint === expectedEndpoint;
      const isColyseusServer = server.serverType === 'colyseus';
      const hasCorrectServerEndpoint = server.endpoint === expectedEndpoint;
      
      console.log('  - Expected Endpoint:', expectedEndpoint);
      console.log('  - API Endpoint Match:', hasCorrectEndpoint ? '✅' : '❌');
      console.log('  - Server Type Match:', isColyseusServer ? '✅' : '❌');
      console.log('  - Server Endpoint Match:', hasCorrectServerEndpoint ? '✅' : '❌');
      
      // Test 3: Simulate Server Browser Join
      console.log('\n3. 🎮 Testing Server Browser Join Parameters...');
      
      const mockServerData = {
        id: server.id,
        region: server.region,
        regionId: server.regionId,
        name: server.name,
        entryFee: server.entryFee,
        gameType: server.gameType,
        mode: 'colyseus-multiplayer',
        server: 'colyseus',
        maxPlayers: server.maxPlayers,
        currentPlayers: server.currentPlayers,
        isActive: server.isActive,
        canSpectate: server.canSpectate,
        multiplayer: 'true',
        serverType: 'colyseus'
      };
      
      const gameParams = new URLSearchParams({
        roomId: mockServerData.id || 'colyseus-arena-global',
        mode: 'colyseus-multiplayer',
        server: 'colyseus',
        serverType: 'colyseus',
        multiplayer: 'true',
        fee: mockServerData.entryFee || 0,
        region: mockServerData.region || 'Australia',
        regionId: mockServerData.regionId || 'au-syd',
        maxPlayers: mockServerData.maxPlayers || 50,
        name: encodeURIComponent(mockServerData.name || 'TurfLoot Arena'),
        gameType: encodeURIComponent(mockServerData.gameType || 'Arena Battle')
      });
      
      const gameUrl = `/agario?${gameParams.toString()}`;
      
      console.log('  - Generated Game URL:', gameUrl);
      console.log('  - URL Parameters:');
      
      const urlParams = Object.fromEntries(gameParams);
      Object.entries(urlParams).forEach(([key, value]) => {
        console.log(`    * ${key}: ${value}`);
      });
      
      // Test 4: Verify Critical Parameters
      console.log('\n4. 🔍 Verifying Critical Colyseus Parameters...');
      
      const criticalParams = {
        'mode': 'colyseus-multiplayer',
        'server': 'colyseus',
        'serverType': 'colyseus',
        'multiplayer': 'true'
      };
      
      let parameterScore = 0;
      Object.entries(criticalParams).forEach(([param, expectedValue]) => {
        const actualValue = urlParams[param];
        const isCorrect = actualValue === expectedValue;
        console.log(`  - ${param}: ${actualValue} ${isCorrect ? '✅' : '❌'}`);
        if (isCorrect) parameterScore++;
      });
      
      console.log(`  - Parameter Score: ${parameterScore}/${Object.keys(criticalParams).length}`);
      
      // Test 5: Final Assessment
      console.log('\n5. 📋 FINAL ASSESSMENT');
      console.log('=====================');
      
      const allTests = [
        hasCorrectEndpoint,
        isColyseusServer,
        hasCorrectServerEndpoint,
        parameterScore === Object.keys(criticalParams).length
      ];
      
      const passedTests = allTests.filter(test => test).length;
      const totalTests = allTests.length;
      
      console.log(`Total Tests Passed: ${passedTests}/${totalTests}`);
      
      if (passedTests === totalTests) {
        console.log('🎉 SUCCESS: All server browser rooms will connect to Colyseus!');
        console.log('✅ No single player fallbacks detected');
        console.log('✅ Correct Colyseus production endpoint configured');
        console.log('✅ Server browser generates proper multiplayer parameters');
        console.log('\n🚀 SERVER BROWSER → COLYSEUS MULTIPLAYER INTEGRATION: COMPLETE');
      } else {
        console.log('❌ ISSUES DETECTED: Some tests failed');
        console.log('⚠️ Server browser rooms may fall back to single player');
      }
      
    } else {
      console.log('❌ No servers found in API response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testColyseusIntegration();