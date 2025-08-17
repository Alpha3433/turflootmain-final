# syntax=docker/dockerfile:1
FROM node:20-alpine

# Ensure native deps work smoothly
RUN apk add --no-cache python3 make g++ git

# Use Yarn Classic (v1) to match project config and avoid workspace warnings
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app

# Cache-bust knob (pass --build-arg CACHEBUST=$(date +%s))
ARG CACHEBUST=1

# Copy lock and yarn config early for caching (include .yarnrc for ignore-engines)
COPY package.json yarn.lock .yarnrc.yml .yarnrc ./

# Deterministic, tolerant install with Yarn v1
ENV YARN_ENABLE_IMMUTABLE_INSTALLS=false
ENV YARN_IGNORE_ENGINES=true
ENV YARN_IGNORE_PLATFORM=true
ENV YARN_IGNORE_OPTIONAL=true
RUN yarn install --ignore-engines --ignore-platform --ignore-optional --network-timeout 600000 --frozen-lockfile --silent

# Copy the rest
COPY . .

# Build (adjust if your app uses a different script)
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN yarn build

# Web app default
EXPOSE 3000
CMD ["yarn","start"]