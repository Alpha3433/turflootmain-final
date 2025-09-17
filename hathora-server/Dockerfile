FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S gameserver -u 1001
USER gameserver

# Expose the port the app runs on
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 8080, path: '/health', timeout: 2000 }; const req = http.request(options, (res) => { console.log('Health check passed'); process.exit(0); }); req.on('error', () => { console.log('Health check failed'); process.exit(1); }); req.end();"

# Command to run the application
CMD ["node", "src/server.js"]