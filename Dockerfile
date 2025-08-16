# syntax=docker/dockerfile:1
FROM node:20-alpine

# Ensure native deps work smoothly
RUN apk add --no-cache python3 make g++ git

# Use Yarn Classic (v1) to match project config and avoid workspace warnings
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app

# Copy lock and yarn config early for caching
COPY package.json yarn.lock .yarnrc.yml ./

# Deterministic install with Yarn v1
RUN yarn install --frozen-lockfile

# Copy the rest
COPY . .

# Build (adjust if your app uses a different script)
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN yarn build

# Web app default
EXPOSE 3000
CMD ["yarn","start"]