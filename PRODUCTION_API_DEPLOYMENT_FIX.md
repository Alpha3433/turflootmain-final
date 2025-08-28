# Production API Deployment Fix - Complete Solution

## Problem Identified ✅

**Root Cause**: Production deployment running in development mode instead of proper production build, causing 404/500 errors for API routes.

**Evidence**:
- ✅ Backend API code works perfectly (100% success on localhost)
- ❌ Production URL (turfloot.com) returns 404/500 for `/api/users/profile/update-name`
- ❌ Supervisor configured for `yarn dev` instead of `yarn start` (production)
- ❌ Missing proper production build deployment

## Complete Production Deployment Solution

### 1. Update Supervisor Configuration

**File**: `/etc/supervisor/conf.d/supervisord.conf`

**Replace**:
```ini
[program:nextjs]
command = yarn dev
directory = /app
environment=HOST="0.0.0.0",PORT="3000"
```

**With**:
```ini
[program:nextjs]
command = yarn start
directory = /app
environment=NODE_ENV="production",HOST="0.0.0.0",PORT="3000"
```

### 2. Production Build Process

**Commands to run in order**:
```bash
# 1. Clean previous builds
cd /app
rm -rf .next

# 2. Build production version
yarn build

# 3. Update supervisor configuration (see step 1)
sudo nano /etc/supervisor/conf.d/supervisord.conf

# 4. Reload supervisor and restart
sudo supervisorctl reread
sudo supervisorctl update  
sudo supervisorctl restart nextjs
```

### 3. Kubernetes Ingress Configuration

**Check your Kubernetes ingress rules ensure API routing**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: turfloot-ingress
spec:
  rules:
  - host: turfloot.com
    http:
      paths:
      - path: /api/
        pathType: Prefix
        backend:
          service:
            name: nextjs-service
            port:
              number: 3000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nextjs-service
            port:
              number: 3000
```

### 4. Docker Production Configuration

**If using Docker, ensure your Dockerfile builds correctly**:
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Production stage  
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### 5. Environment Variables

**Ensure production environment has**:
```bash
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://turfloot.com
MONGO_URL=mongodb://localhost:27017/turfloot
```

### 6. Verification Commands

**After deployment, verify with**:
```bash
# Check if production build exists
ls -la /app/.next/

# Test API endpoint locally
curl -X POST http://localhost:3000/api/users/profile/update-name \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","customName":"test","privyId":"test","email":null}'

# Test production URL  
curl -X POST https://turfloot.com/api/users/profile/update-name \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","customName":"test","privyId":"test","email":null}'
```

## Expected Results After Fix

### ✅ What Should Work:
- Custom name changes save permanently server-side
- Names persist across session refreshes  
- All API endpoints (`/api/*`) accessible on production
- Friends system and social features functional
- Real-time updates working correctly

### 🔧 Production vs Development:
- **Development** (`yarn dev`): Hot reload, dev tools, slower
- **Production** (`yarn start`): Optimized build, faster, production-ready

## Immediate Workaround (If Infrastructure Access Limited)

If you can't immediately access Kubernetes/Docker configs:

1. **Temporary local storage fallback** (until production fixed)
2. **Use development URL** for testing
3. **Implement session backup** to prevent data loss

## Priority Actions

1. **HIGH**: Update supervisor from `yarn dev` to `yarn start`
2. **HIGH**: Ensure production build (`yarn build`) completes successfully
3. **MEDIUM**: Verify Kubernetes ingress routes `/api/*` correctly
4. **MEDIUM**: Check Docker/container configuration
5. **LOW**: Add monitoring for production API endpoints

## Success Criteria

✅ **Fixed when**:
- `curl https://turfloot.com/api/users/profile/update-name` returns 200 (not 404/500)
- Custom name changes save and persist across sessions
- All social features work on production URL
- No difference between localhost and production behavior

This comprehensive solution addresses the root deployment configuration issue causing the API routing problems.