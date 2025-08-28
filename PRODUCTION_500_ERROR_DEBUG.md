# Production 500 Error Debug Guide

## 🚨 CURRENT ISSUE
**Error**: `POST https://turfloot.com/api/users/profile/update-name 500 (Internal Server Error)`

**Request Payload**: 
```json
{
  "userId": "did:privy:cme28s0fl085okz0bmxcr8cp0",
  "customName": "eerr",
  "privyId": "did:privy:cme28s0fl085okz0bmxcr8cp0", 
  "email": "james.paradisis@gmail.com"
}
```

## 🔍 SYSTEMATIC DEBUG APPROACH

### **Step 1: Check Production Backend Logs**

The backend code includes extensive logging. Check your production logs for:

```bash
# Look for these specific log messages:
🎯 ROUTE MATCHED: users/profile/update-name
📥 Request method: POST
📋 Request headers: {...}
✏️ Updating user profile name - Body received: {...}
🔍 Parsed fields: {...}
🔗 Attempting to connect to database...
✅ Database connection successful

# If you see an error, it will show:
❌ [Specific error details]
```

**How to access logs:**
- **DigitalOcean**: App Platform → Your App → Runtime Logs
- **Kubernetes**: `kubectl logs deployment/turfloot-deployment`
- **Docker**: `docker logs turfloot-container`
- **Traditional Server**: `/var/log/supervisor/nextjs.out.log` or similar

### **Step 2: Test API Route Deployment**

Verify the route is actually deployed in production:

```bash
# Test if route responds at all
curl -X POST https://turfloot.com/api/users/profile/update-name \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -v

# Expected: Should return 400 (validation error) NOT 404
# If 404: Route not deployed properly
# If 500: Route exists but failing
```

### **Step 3: Database Connection Test**

The most likely cause is database connection issues. Test with a simpler endpoint:

```bash
# Test a working endpoint that uses database
curl https://turfloot.com/api/friends/online-status?userId=test

# Expected: 200 OK with {"onlineFriends":[],"timestamp":"..."}
# If this fails: Database connection issue
# If this works: Specific issue with name update endpoint
```

### **Step 4: Field Mapping Verification**

Test if the issue is with field names by trying alternative payloads:

```bash
# Test 1: Minimal payload
curl -X POST https://turfloot.com/api/users/profile/update-name \
  -H "Content-Type: application/json" \
  -d '{"userId":"did:privy:test","customName":"TestName"}'

# Test 2: Try different field names (in case backend expects different fields)
curl -X POST https://turfloot.com/api/users/profile/update-name \
  -H "Content-Type: application/json" \
  -d '{"userId":"did:privy:test","displayName":"TestName"}'

curl -X POST https://turfloot.com/api/users/profile/update-name \
  -H "Content-Type: application/json" \
  -d '{"userId":"did:privy:test","username":"TestName"}'
```

### **Step 5: MongoDB Schema Verification**

The backend tries to update these fields:
```javascript
{
  customName: customName,
  username: customName, 
  displayName: customName,
  updated_at: new Date(),
  last_name_change: new Date()
}
```

**Check if these fields exist in production database:**
```bash
# Connect to your production MongoDB and check:
db.users.findOne()  # Look at field structure

# Common issues:
# - Collection 'users' doesn't exist
# - Fields have different names
# - Database permissions issue
```

---

## 🎯 MOST LIKELY CAUSES (In Order)

### **1. Database Connection Issue (70% probability)**
- **Symptoms**: All database operations fail
- **Check**: Test other database endpoints
- **Fix**: Verify MONGO_URL in production environment variables

### **2. MongoDB Collection Missing (20% probability)**  
- **Symptoms**: "Collection 'users' doesn't exist" in logs
- **Check**: Look for database initialization errors in logs
- **Fix**: Ensure database and collections are created

### **3. Environment Variables Missing (5% probability)**
- **Symptoms**: Database connection fails
- **Check**: Verify production has correct MONGO_URL
- **Fix**: Add missing environment variables to production

### **4. Route Not Deployed (3% probability)**
- **Symptoms**: 404 instead of 500, or route not found
- **Check**: Test if route responds at all
- **Fix**: Redeploy application with correct API routes

### **5. Field Validation Issue (2% probability)**
- **Symptoms**: Validation errors in logs
- **Check**: Look for "Invalid customName" errors
- **Fix**: Adjust validation logic if needed

---

## 🔧 QUICK DIAGNOSTIC COMMANDS

Run these commands to quickly identify the issue:

```bash
# 1. Test basic connectivity
curl -I https://turfloot.com/

# 2. Test database endpoint that works
curl https://turfloot.com/api/friends/online-status?userId=test

# 3. Test name update endpoint with minimal data
curl -X POST https://turfloot.com/api/users/profile/update-name \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","customName":"test"}' \
  -v

# 4. Check if it's a CORS issue
curl -X OPTIONS https://turfloot.com/api/users/profile/update-name -v
```

**Expected Results:**
- Test 1: Should return 200
- Test 2: Should return 200 with JSON response  
- Test 3: Should return 400 (validation) or 200 (success), NOT 500
- Test 4: Should return 200 with CORS headers

---

## 🚀 IMMEDIATE ACTION PLAN

### **Priority 1: Check Production Logs**
1. Access your production server logs
2. Look for the specific error when name update is attempted
3. Share the exact error message for targeted fix

### **Priority 2: Test Database Connectivity**
1. Verify other database endpoints work (friends/online-status)
2. If they fail: Database connection issue
3. If they work: Specific issue with name update logic

### **Priority 3: Verify Deployment**
1. Confirm the API route exists in production
2. Test with curl commands above
3. Check if returns 404 vs 500 vs 400

---

## 📋 EXPECTED BACKEND LOGS (What You Should See)

When the name update works correctly, logs should show:
```
🎯 ROUTE MATCHED: users/profile/update-name
📥 Request method: POST
✏️ Updating user profile name - Body received: {"userId":"did:privy:...","customName":"eerr",...}
🔍 Parsed fields: {userId: "did:privy:cme28s0fl085...",...}
🔗 Attempting to connect to database...
✅ Database connection successful
🔍 Searching for user with query: {...}
👤 User lookup result: NOT FOUND
👤 Creating new user...
✅ Insert operation completed. Inserted ID: ...
✅ Name update verified in database
📤 Sending success response: {"success":true,...}
```

**If you see an error instead, that's the exact issue to fix.**

---

*Once you check the production logs and run the diagnostic commands, we can identify the specific cause and implement the targeted fix.*