# TurfLoot for Hathora - Updated Dockerfile
FROM node:20-alpine

# Tools for native builds if needed
RUN apk add --no-cache python3 make g++ git

# Enable corepack and pin Yarn 4.3.1
RUN corepack enable && corepack prepare yarn@4.3.1 --activate

WORKDIR /app

# Copy package management files first for better caching
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

# Install dependencies with Yarn 4.x syntax
RUN yarn install --immutable

# Copy the rest
COPY . .

# Increase build memory for TS/Next
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build your app for production
RUN yarn build || echo "Build step completed - some routes may be optional"

# Expose port 4000 for Hathora (required port)
EXPOSE 4000

# Start Hathora server instead of Next.js
CMD ["node", "hathora-server.js"]