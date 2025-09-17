const jwt = require('jsonwebtoken');

// Generate a test JWT token for local development
const JWT_SECRET = 'hathora-turfloot-secret';

const payload = {
  type: 'anonymous',
  id: 'test-player-123',
  name: 'TestPlayer',
  iat: Math.floor(Date.now() / 1000)
};

const token = jwt.sign(payload, JWT_SECRET);

console.log('🔑 Test JWT Token:');
console.log(token);
console.log('\n📋 Test WebSocket Connection:');
console.log(`wscat -c "ws://localhost:8080/ws?token=${token}"`);
console.log('\n🧪 Send test message:');
console.log('{"type":"move","x":1000,"y":500}');