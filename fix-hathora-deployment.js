#!/usr/bin/env node

// Fix Hathora Deployment Script
// This script will create and activate a deployment for Build ID 2

const https = require('https');
require('dotenv').config();

const HATHORA_TOKEN = process.env.HATHORA_TOKEN;
const APP_ID = process.env.NEXT_PUBLIC_HATHORA_APP_ID;

console.log('🔧 Hathora Deployment Fix Script');
console.log('=====================================');
console.log(`App ID: ${APP_ID}`);
console.log(`Token: ${HATHORA_TOKEN ? 'SET' : 'NOT SET'}`);
console.log('');

async function makeHathoraRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.hathora.dev',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${HATHORA_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TurfLoot-Deployment-Fix/1.0'
      }
    };

    if (data && method !== 'GET') {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function fixHathoraDeployment() {
  try {
    console.log('🔍 Step 1: Checking current deployments...');
    
    // Check deployments using v2 API
    const deploymentsResponse = await makeHathoraRequest('GET', `/deployments/v2/apps/${APP_ID}/deployments`);
    console.log(`   API Response: ${deploymentsResponse.status}`);
    
    if (deploymentsResponse.status === 200 && Array.isArray(deploymentsResponse.data)) {
      console.log(`   Found ${deploymentsResponse.data.length} existing deployments:`);
      deploymentsResponse.data.forEach((deployment, i) => {
        console.log(`   ${i+1}. Deployment ${deployment.deploymentId} (Build: ${deployment.buildId}) - ${deployment.status || 'unknown'}`);
      });
    } else {
      console.log(`   Deployments response: ${JSON.stringify(deploymentsResponse.data, null, 2)}`);
    }

    console.log('');
    console.log('🚀 Step 2: Creating new deployment for Build ID 2...');
    
    const deploymentConfig = {
      buildId: 2,
      roomsPerProcess: 10,
      planName: "tiny",
      transportType: "tcp",
      containerPort: 4000,
      env: [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "HATHORA_PORT", 
          "value": "4000"
        },
        {
          "name": "PORT",
          "value": "4000"
        }
      ]
    };

    console.log('   Deployment configuration:');
    console.log(JSON.stringify(deploymentConfig, null, 4));

    const createResponse = await makeHathoraRequest('POST', `/deployments/v2/apps/${APP_ID}/deployments`, deploymentConfig);
    console.log(`   Creation response status: ${createResponse.status}`);
    
    if (createResponse.status === 201 || createResponse.status === 200) {
      console.log('✅ Deployment created successfully!');
      console.log(`   Deployment details: ${JSON.stringify(createResponse.data, null, 2)}`);
      
      const deploymentId = createResponse.data.deploymentId;
      if (deploymentId) {
        console.log(`   New deployment ID: ${deploymentId}`);
        return deploymentId;
      }
    } else {
      console.log('❌ Deployment creation failed:');
      console.log(`   Status: ${createResponse.status}`);
      console.log(`   Response: ${JSON.stringify(createResponse.data, null, 2)}`);
      
      // Try with different configuration
      console.log('');
      console.log('🔄 Step 3: Trying alternative deployment configuration...');
      
      const altConfig = {
        buildId: 2,
        roomsPerProcess: 5,
        planName: "tiny",
        transportType: "tcp",
        containerPort: 4000
      };
      
      const altResponse = await makeHathoraRequest('POST', `/deployments/v2/apps/${APP_ID}/deployments`, altConfig);
      console.log(`   Alternative response status: ${altResponse.status}`);
      
      if (altResponse.status === 201 || altResponse.status === 200) {
        console.log('✅ Alternative deployment created!');
        console.log(`   Deployment: ${JSON.stringify(altResponse.data, null, 2)}`);
        return altResponse.data.deploymentId;
      } else {
        console.log('❌ Alternative deployment also failed:');
        console.log(`   Response: ${JSON.stringify(altResponse.data, null, 2)}`);
      }
    }

    // If deployment creation failed, try to manually start processes
    console.log('');
    console.log('🔄 Step 4: Attempting to start processes manually...');
    
    try {
      // Try to create a process in Washington DC region
      const processConfig = {
        region: "washington_dc"
      };
      
      const processResponse = await makeHathoraRequest('POST', `/processes/v1/apps/${APP_ID}/processes`, processConfig);
      console.log(`   Process creation status: ${processResponse.status}`);
      
      if (processResponse.status === 201 || processResponse.status === 200) {
        console.log('✅ Process started manually!');
        console.log(`   Process: ${JSON.stringify(processResponse.data, null, 2)}`);
      } else {
        console.log('❌ Manual process creation failed:');
        console.log(`   Response: ${JSON.stringify(processResponse.data, null, 2)}`);
      }
    } catch (processError) {
      console.log('❌ Process creation error:', processError.message);
    }

    return null;

  } catch (error) {
    console.log('❌ Deployment fix failed:', error.message);
    throw error;
  }
}

async function testDeploymentWorking() {
  console.log('');
  console.log('🧪 Step 5: Testing if deployment is working...');
  
  try {
    const { HathoraClient } = require('@hathora/client-sdk');
    const client = new HathoraClient(APP_ID);
    
    await client.loginAnonymous();
    console.log('✅ Hathora client authenticated');
    
    // Try to create a test lobby
    console.log('🎯 Creating test lobby...');
    const result = await client.createPublicLobby('washington_dc', JSON.stringify({
      gameMode: 'deployment_test',
      maxPlayers: 2,
      roomName: 'Deployment Test Room'
    }));
    
    console.log('✅ Lobby creation successful!');
    
    // Wait and check if lobbies appear
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const lobbies = await client.getPublicLobbies();
    console.log(`✅ Found ${lobbies.length} lobbies after creation`);
    
    if (lobbies.length > 0) {
      const lobby = lobbies[0];
      console.log('🎉 DEPLOYMENT IS WORKING!');
      console.log(`   Room ID: ${lobby.roomId}`);
      console.log(`   Region: ${lobby.region}`);
      console.log(`   Players: ${lobby.numPlayers}`);
      
      // Test connection details
      try {
        const connDetails = await client.getConnectionDetailsForRoomId(lobby.roomId);
        if (connDetails && connDetails.exposedPort) {
          console.log('🌐 Connection details available:');
          console.log(`   Host: ${connDetails.exposedPort.host}`);
          console.log(`   Port: ${connDetails.exposedPort.port}`);
          console.log(`   Connection URL: wss://${connDetails.exposedPort.host}:${connDetails.exposedPort.port}`);
          
          console.log('');
          console.log('🎉🎉🎉 HATHORA DEPLOYMENT FULLY FIXED! 🎉🎉🎉');
          console.log('✅ Deployment: Active');
          console.log('✅ Room Creation: Working');
          console.log('✅ Process Allocation: Working');
          console.log('✅ Connection Details: Available');
          console.log('✅ Ready for production multiplayer!');
          
          return true;
        }
      } catch (connError) {
        console.log('⚠️  Connection details not ready yet:', connError.message);
        console.log('   This is normal for new rooms');
      }
    } else {
      console.log('❌ No lobbies found - deployment may still be starting up');
      console.log('   Wait a few more minutes and try again');
    }
    
  } catch (testError) {
    console.log('❌ Deployment test failed:', testError.message);
    return false;
  }
  
  return false;
}

// Main execution
async function main() {
  try {
    const deploymentId = await fixHathoraDeployment();
    
    if (deploymentId) {
      console.log('');
      console.log('⏳ Waiting 30 seconds for deployment to activate...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    const isWorking = await testDeploymentWorking();
    
    if (isWorking) {
      console.log('');
      console.log('✅ HATHORA DEPLOYMENT SUCCESSFULLY FIXED!');
      process.exit(0);
    } else {
      console.log('');
      console.log('⚠️  Deployment may need more time to activate');
      console.log('   Check the Hathora console in a few minutes');
      process.exit(1);
    }
    
  } catch (error) {
    console.log('');
    console.log('❌ DEPLOYMENT FIX FAILED:', error.message);
    process.exit(1);
  }
}

main();