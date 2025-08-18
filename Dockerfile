# syntax=docker/dockerfile:1
FROM node:20-alpine

# Tools for native builds if needed
RUN apk add --no-cache python3 make g++ git

# Pin Yarn
RUN corepack enable && corepack prepare yarn@4.3.1 --activate

WORKDIR /app

# Copy only what's needed for install cache
COPY package.json yarn.lock .yarnrc.yml ./
# If you use Yarn Berry (.yarn dir), include it
COPY .yarn .yarn

# Deterministic install
RUN yarn install --immutable

# Copy the rest
COPY . .

# Increase build memory for TS/Next
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build your app (replace with your actual build script)
RUN yarn build

EXPOSE 3000
CMD ["yarn","start"]