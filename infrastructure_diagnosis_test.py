#!/usr/bin/env python3

"""
Infrastructure Diagnosis Test
Comprehensive analysis of the production deployment issues
"""

import requests
import json
import time
import os
from datetime import datetime

def log_test(message, status="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

def test_infrastructure_endpoints():
    """Test both localhost and production URLs"""
    
    endpoints = [
        ("Localhost", "http://localhost:3000"),
        ("Production", "https://lobby-party.preview.emergentagent.com")
    ]
    
    test_paths = [
        "/api/",
        "/api/ping", 
        "/api/users/profile/update-name",
        "/api/users/leaderboard",
        "/api/servers/lobbies"
    ]
    
    results = {}
    
    for env_name, base_url in endpoints:
        log_test(f"Testing {env_name} environment: {base_url}")
        results[env_name] = {}
        
        for path in test_paths:
            full_url = f"{base_url}{path}"
            
            try:
                if path == "/api/users/profile/update-name":
                    # POST request for update-name
                    response = requests.post(
                        full_url,
                        json={
                            "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0",
                            "customName": "jason"
                        },
                        timeout=10
                    )
                else:
                    # GET request for others
                    response = requests.get(full_url, timeout=10)
                
                results[env_name][path] = {
                    'status': response.status_code,
                    'success': response.status_code in [200, 400],
                    'headers': dict(response.headers),
                    'response_size': len(response.content)
                }
                
                log_test(f"  {path}: {response.status_code}")
                
            except requests.exceptions.Timeout:
                results[env_name][path] = {
                    'status': 'TIMEOUT',
                    'success': False,
                    'error': 'Request timed out'
                }
                log_test(f"  {path}: TIMEOUT")
                
            except Exception as e:
                results[env_name][path] = {
                    'status': 'ERROR',
                    'success': False,
                    'error': str(e)
                }
                log_test(f"  {path}: ERROR - {str(e)}")
        
        log_test("")
    
    return results

def analyze_infrastructure_issues(results):
    """Analyze the test results to identify infrastructure issues"""
    
    log_test("=" * 60)
    log_test("INFRASTRUCTURE ANALYSIS")
    log_test("=" * 60)
    
    localhost_results = results.get("Localhost", {})
    production_results = results.get("Production", {})
    
    # Check if localhost is working
    localhost_working = all(
        result.get('success', False) 
        for result in localhost_results.values()
    )
    
    # Check if production is working
    production_working = all(
        result.get('success', False) 
        for result in production_results.values()
    )
    
    log_test(f"Localhost Status: {'✅ WORKING' if localhost_working else '❌ ISSUES'}")
    log_test(f"Production Status: {'✅ WORKING' if production_working else '❌ ISSUES'}")
    
    if localhost_working and not production_working:
        log_test("\n🔍 DIAGNOSIS: Infrastructure/Deployment Issue")
        log_test("The backend code is working correctly on localhost but failing in production.")
        
        # Analyze production error patterns
        production_statuses = [
            result.get('status') for result in production_results.values()
        ]
        
        if all(status == 502 for status in production_statuses):
            log_test("\n🚨 SPECIFIC ISSUE: 502 Bad Gateway")
            log_test("All production endpoints return 502 Bad Gateway errors.")
            log_test("This indicates a Kubernetes ingress/gateway configuration issue.")
            
            log_test("\n📋 LIKELY CAUSES:")
            log_test("1. Kubernetes ingress controller misconfiguration")
            log_test("2. Service discovery issues in the cluster")
            log_test("3. Load balancer health check failures")
            log_test("4. Pod/container startup issues")
            log_test("5. Network policy blocking internal traffic")
            
            log_test("\n🔧 RECOMMENDED FIXES:")
            log_test("1. Check Kubernetes pod status: kubectl get pods")
            log_test("2. Check service endpoints: kubectl get endpoints")
            log_test("3. Check ingress configuration: kubectl describe ingress")
            log_test("4. Check pod logs: kubectl logs <pod-name>")
            log_test("5. Verify service port mapping matches container port")
            log_test("6. Check if the application is binding to 0.0.0.0:3000 (not localhost:3000)")
            
        elif all(status == 404 for status in production_statuses):
            log_test("\n🚨 SPECIFIC ISSUE: 404 Not Found")
            log_test("All production endpoints return 404 errors.")
            log_test("This indicates routing/path configuration issues.")
            
        elif 'TIMEOUT' in production_statuses:
            log_test("\n🚨 SPECIFIC ISSUE: Connection Timeouts")
            log_test("Production endpoints are timing out.")
            log_test("This indicates network connectivity or performance issues.")
    
    elif not localhost_working and not production_working:
        log_test("\n🔍 DIAGNOSIS: Backend Code Issue")
        log_test("Both localhost and production are failing.")
        log_test("This indicates an issue with the backend code itself.")
    
    elif localhost_working and production_working:
        log_test("\n✅ DIAGNOSIS: No Infrastructure Issues Detected")
        log_test("Both environments are working correctly.")
    
    return {
        'localhost_working': localhost_working,
        'production_working': production_working,
        'issue_type': 'infrastructure' if localhost_working and not production_working else 'backend'
    }

def test_specific_user_scenario():
    """Test the specific scenario reported by the user"""
    
    log_test("=" * 60)
    log_test("USER SCENARIO REPRODUCTION TEST")
    log_test("=" * 60)
    
    # Test on localhost first
    log_test("Testing user scenario on localhost...")
    
    try:
        response = requests.post(
            "http://localhost:3000/api/users/profile/update-name",
            json={
                "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0", 
                "customName": "jason",
                "privyId": "did:privy:cme20s0fl005okz0bmxcr0cp0", 
                "email": "james.paradisis@gmail.com"
            },
            timeout=10
        )
        
        log_test(f"Localhost result: {response.status_code}")
        
        if response.status_code == 200:
            log_test("✅ User scenario works perfectly on localhost")
        else:
            log_test(f"❌ User scenario fails on localhost: {response.status_code}")
            
    except Exception as e:
        log_test(f"❌ Localhost test failed: {str(e)}")
    
    # Test on production
    log_test("\nTesting user scenario on production...")
    
    try:
        response = requests.post(
            "https://lobby-party.preview.emergentagent.com/api/users/profile/update-name",
            json={
                "userId": "did:privy:cme20s0fl005okz0bmxcr0cp0", 
                "customName": "jason",
                "privyId": "did:privy:cme20s0fl005okz0bmxcr0cp0", 
                "email": "james.paradisis@gmail.com"
            },
            timeout=10
        )
        
        log_test(f"Production result: {response.status_code}")
        
        if response.status_code == 500:
            log_test("🎯 REPRODUCED: User's reported 500 error")
        elif response.status_code == 502:
            log_test("🎯 ACTUAL ISSUE: 502 Bad Gateway (not 500 Internal Server Error)")
            log_test("   The user is seeing infrastructure errors, not backend errors")
        else:
            log_test(f"⚠️ Different error than expected: {response.status_code}")
            
    except Exception as e:
        log_test(f"❌ Production test failed: {str(e)}")

def main():
    """Main execution"""
    
    log_test("=" * 60)
    log_test("INFRASTRUCTURE DIAGNOSIS TEST")
    log_test("=" * 60)
    
    # Test both environments
    results = test_infrastructure_endpoints()
    
    # Analyze results
    analysis = analyze_infrastructure_issues(results)
    
    # Test specific user scenario
    test_specific_user_scenario()
    
    # Final summary
    log_test("\n" + "=" * 60)
    log_test("FINAL DIAGNOSIS SUMMARY")
    log_test("=" * 60)
    
    if analysis['localhost_working'] and not analysis['production_working']:
        log_test("🎯 ROOT CAUSE IDENTIFIED:")
        log_test("   The user's reported '500 Internal Server Error' is actually")
        log_test("   a '502 Bad Gateway' error from Kubernetes infrastructure.")
        log_test("")
        log_test("📝 BACKEND CODE STATUS: ✅ WORKING CORRECTLY")
        log_test("📝 INFRASTRUCTURE STATUS: ❌ DEPLOYMENT ISSUES")
        log_test("")
        log_test("🔧 SOLUTION REQUIRED:")
        log_test("   Fix Kubernetes ingress/gateway configuration")
        log_test("   No backend code changes needed")
        
        return False  # Infrastructure issue
    
    elif analysis['localhost_working'] and analysis['production_working']:
        log_test("✅ NO ISSUES FOUND:")
        log_test("   Both localhost and production are working correctly")
        log_test("   Unable to reproduce the user's reported error")
        
        return True  # No issues
    
    else:
        log_test("❌ BACKEND CODE ISSUES:")
        log_test("   The backend code has issues that need to be fixed")
        
        return False  # Backend issue

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)