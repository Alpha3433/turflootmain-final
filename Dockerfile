# syntax=docker/dockerfile:1
FROM node:20-alpine

# Ensure native deps work smoothly
RUN apk add --no-cache python3 make g++ git

# Use the same Yarn version everywhere
RUN corepack enable && corepack prepare yarn@4.3.1 --activate

WORKDIR /app

# Copy lock and yarn config early for caching
COPY package.json yarn.lock .yarnrc.yml ./
# If using Yarn Berry repo metadata:
COPY .yarn .yarn

# Deterministic install
RUN yarn install --immutable

# Copy the rest
COPY . .

# Build (adjust if your app uses a different script)
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN yarn build

# Web app default
EXPOSE 3000
CMD ["yarn","start"]