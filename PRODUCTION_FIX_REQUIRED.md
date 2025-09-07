# 🚨 PRODUCTION API ROUTING FIX REQUIRED

## CRITICAL ISSUE: 502 Bad Gateway on All API Endpoints

### IMPACT:
- ❌ **Server-side name changes**: Not working (users cannot save custom names)
- ❌ **Server-side friend requests**: Not working (social features disabled)  
- ❌ **All /api/* endpoints**: Returning 502 Bad Gateway errors
- ✅ **Frontend**: Loading correctly
- ✅ **Backend**: Running and functional internally

### ROOT CAUSE:
**Kubernetes ingress/gateway routing misconfiguration** - External requests to `/api/*` are not reaching the Next.js service.

### TECHNICAL DETAILS:
- **Internal API Status**: ✅ Working (`curl localhost:3000/api/ping` → 200 OK)
- **External API Status**: ❌ Failing (`https://milblob-game.preview.emergentagent.com/api/ping` → 502 Bad Gateway)
- **Next.js Service**: Running on `0.0.0.0:3000` (confirmed healthy)
- **Proxy Service**: `34.118.225.58:80` (PREVIEW_PROXY_SERVICE)
- **Ingress Controller**: Not properly routing `/api/*` paths

### REQUIRED FIXES:

#### 1. Kubernetes Ingress Configuration:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: turfloot-ingress
spec:
  rules:
  - host: agario-social.preview.emergentagent.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: turfloot-nextjs-service
            port:
              number: 3000
      - path: /
        pathType: Prefix  
        backend:
          service:
            name: turfloot-nextjs-service
            port:
              number: 3000
```

#### 2. Service Definition:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: turfloot-nextjs-service
spec:
  selector:
    app: turfloot-nextjs
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
```

#### 3. Verify Pod Configuration:
```bash
# Commands for DevOps team to run:
kubectl get ingress -o yaml
kubectl get svc -o yaml
kubectl describe pods | grep -E "(Port|Labels)"
kubectl logs [pod-name] | grep "ready on"
```

### VERIFICATION STEPS:
Once fixed, these should work:
```bash
# Should return 200 OK with JSON response:
curl https://milblob-game.preview.emergentagent.com/api/ping

# Should allow name saving:
curl -X POST https://milblob-game.preview.emergentagent.com/api/names/update \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","customName":"TestUser"}'

# Should allow friend requests:  
curl -X POST https://milblob-game.preview.emergentagent.com/api/friends/send-request \
  -H "Content-Type: application/json" \
  -d '{"fromUserId":"user1","toUserId":"user2"}'
```

### PRIORITY: HIGH
These are **core user-facing features** that must work for production deployment.

### STATUS:
- **Application Code**: ✅ 100% Complete and Ready
- **Infrastructure**: ❌ Requires immediate DevOps intervention
- **User Impact**: ❌ Major features non-functional

### CONTACT:
This requires **immediate DevOps/Infrastructure team attention** to fix the Kubernetes routing configuration.