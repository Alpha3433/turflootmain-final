#!/usr/bin/env python3
"""
Database Check for Custom Name Update
Verify that the user data was actually saved to MongoDB
"""

import pymongo
import json
import os
from datetime import datetime

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'turfloot_db')

def check_user_data():
    """Check if the user data was saved to MongoDB"""
    
    print("🗄️ CHECKING MONGODB DATABASE FOR USER DATA")
    print("=" * 80)
    print(f"📍 MongoDB URL: {MONGO_URL}")
    print(f"📊 Database: {DB_NAME}")
    
    try:
        # Connect to MongoDB
        client = pymongo.MongoClient(MONGO_URL)
        db = client[DB_NAME]
        users_collection = db['users']
        
        print(f"✅ Connected to MongoDB successfully")
        
        # Check for the specific user from our test
        test_user_id = "did:privy:cmetjchq5012yjr0bgxbe748i"
        
        print(f"\n🔍 Searching for user: {test_user_id}")
        
        user = users_collection.find_one({
            "$or": [
                {"id": test_user_id},
                {"privy_id": test_user_id}
            ]
        })
        
        if user:
            print(f"✅ USER FOUND IN DATABASE:")
            # Convert ObjectId to string for JSON serialization
            if '_id' in user:
                user['_id'] = str(user['_id'])
            print(json.dumps(user, indent=2, default=str))
        else:
            print(f"❌ User not found in database")
            
        # Check total users in collection
        total_users = users_collection.count_documents({})
        print(f"\n📊 Total users in collection: {total_users}")
        
        # Show recent users (last 5)
        print(f"\n📋 Recent users (last 5):")
        recent_users = users_collection.find().sort("created_at", -1).limit(5)
        
        for i, user in enumerate(recent_users, 1):
            if '_id' in user:
                user['_id'] = str(user['_id'])
            print(f"   {i}. {user.get('username', 'No username')} - {user.get('id', 'No ID')}")
            
        client.close()
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

def main():
    """Main execution"""
    print("🚀 STARTING DATABASE VERIFICATION")
    print("📅 Check Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    check_user_data()
    
    print("\n" + "=" * 80)
    print("🏁 DATABASE CHECK COMPLETED")

if __name__ == "__main__":
    main()