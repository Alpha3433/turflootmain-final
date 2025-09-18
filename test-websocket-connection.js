const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Generate test token (same secret as server)
const JWT_SECRET = 'hathora-turfloot-secret';
const payload = {
  type: 'anonymous',
  id: 'test-connection-debug',
  name: 'ConnectionTest',
  iat: Math.floor(Date.now() / 1000)
};
const token = jwt.sign(payload, JWT_SECRET);

console.log('🧪 Testing WebSocket Connection to new room...');
console.log('🏠 Room: 2a1gkbxa6qxgw');
console.log('🌐 Host: spghgd.edge.hathora.dev:46529');

// Test both ws:// and wss://
const testUrls = [
  `ws://spghgd.edge.hathora.dev:46529/ws?token=${token}`,
  `wss://spghgd.edge.hathora.dev:46529/ws?token=${token}`,
  `ws://spghgd.edge.hathora.dev:46529?token=${token}`,
  `wss://spghgd.edge.hathora.dev:46529?token=${token}`
];

async function testConnection(url) {
  return new Promise((resolve) => {
    console.log(`\n🔗 Testing: ${url}`);
    
    const ws = new WebSocket(url);
    let connected = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        console.log('❌ Connection timeout');
        ws.close();
        resolve(false);
      }
    }, 5000);
    
    ws.on('open', () => {
      connected = true;
      console.log('✅ Connection successful!');
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (error) => {
      console.log('❌ Connection failed:', error.message);
      clearTimeout(timeout);
      resolve(false);
    });
    
    ws.on('close', (code) => {
      console.log(`🔚 Connection closed: ${code}`);
    });
  });
}

async function runTests() {
  for (const url of testUrls) {
    const success = await testConnection(url);
    if (success) {
      console.log('\n🎉 Found working connection!');
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

runTests().then(() => {
  console.log('\n✅ Connection test completed');
  process.exit(0);
});