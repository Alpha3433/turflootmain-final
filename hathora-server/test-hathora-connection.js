const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Generate test token (matching the JWT secret used in the deployed server)
const JWT_SECRET = 'hathora-turfloot-secret';
const payload = {
  type: 'anonymous',
  id: 'test-hathora-player-789',
  name: 'HathoraTestPlayer',
  iat: Math.floor(Date.now() / 1000)
};
const token = jwt.sign(payload, JWT_SECRET);

console.log('🧪 Testing Hathora Cloud WebSocket Connection...');
console.log(`🔑 Token: ${token.substring(0, 50)}...`);
console.log('🌐 Connecting to Hathora server: spghgd.edge.hathora.dev:49014');

// Create WebSocket connection to Hathora Cloud
const ws = new WebSocket(`wss://spghgd.edge.hathora.dev:49014/ws?token=${token}`);

ws.on('open', function open() {
  console.log('✅ Hathora WebSocket connection established!');
  
  // Send a move command
  const moveCommand = {
    type: 'move',
    x: 2000,
    y: 1500,
    timestamp: Date.now()
  };
  
  console.log('📤 Sending move command:', moveCommand);
  ws.send(JSON.stringify(moveCommand));
  
  // Send a ping after 2 seconds
  setTimeout(() => {
    const pingCommand = {
      type: 'ping',
      timestamp: Date.now()
    };
    console.log('📤 Sending ping:', pingCommand);
    ws.send(JSON.stringify(pingCommand));
  }, 2000);
  
  // Send a chat message
  setTimeout(() => {
    const chatCommand = {
      type: 'chat',
      message: 'Hello from Hathora Cloud test!'
    };
    console.log('📤 Sending chat:', chatCommand);
    ws.send(JSON.stringify(chatCommand));
  }, 3000);
  
  // Close connection after 10 seconds
  setTimeout(() => {
    console.log('🔚 Closing Hathora connection...');
    ws.close();
  }, 10000);
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    console.log('📥 Received from Hathora:', parsed.type, parsed);
  } catch (error) {
    console.log('📥 Received raw from Hathora:', data.toString());
  }
});

ws.on('close', function close(code, reason) {
  console.log(`👋 Hathora connection closed: ${code} - ${reason}`);
  process.exit(0);
});

ws.on('error', function error(err) {
  console.error('❌ Hathora WebSocket error:', err);
  process.exit(1);
});