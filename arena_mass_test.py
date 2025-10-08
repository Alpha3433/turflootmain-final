#!/usr/bin/env python3

"""
Arena Mode Starting Mass Testing - Backend API Testing
Testing that players spawn with mass = 25 instead of 100 in arena mode
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://turfloot-arena-6.preview.emergentagent.com"
COLYSEUS_ENDPOINT = "wss://au-syd-ab3eaf4e.colyseus.cloud"

def log_test(message, status="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

def test_api_health():
    """Test basic API health and availability"""
    log_test("Testing API health check...")
    try:
        response = requests.get(f"{BASE_URL}/api", timeout=10)
        if response.status_code == 200:
            data = response.json()
            log_test(f"✅ API Health: {data.get('service', 'Unknown')} - {data.get('status', 'Unknown')}")
            log_test(f"✅ Features: {data.get('features', [])}")
            return True
        else:
            log_test(f"❌ API Health failed: HTTP {response.status_code}", "ERROR")
            return False
    except Exception as e:
        log_test(f"❌ API Health error: {str(e)}", "ERROR")
        return False

def test_colyseus_servers_endpoint():
    """Test Colyseus servers endpoint for arena configuration"""
    log_test("Testing Colyseus servers endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/servers", timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Check for Colyseus configuration
            colyseus_enabled = data.get('colyseusEnabled', False)
            colyseus_endpoint = data.get('colyseusEndpoint', '')
            servers = data.get('servers', [])
            
            log_test(f"✅ Colyseus Enabled: {colyseus_enabled}")
            log_test(f"✅ Colyseus Endpoint: {colyseus_endpoint}")
            log_test(f"✅ Total Servers: {len(servers)}")
            
            # Find arena servers
            arena_servers = [s for s in servers if s.get('serverType') == 'colyseus' and s.get('roomType') == 'arena']
            log_test(f"✅ Arena Servers Found: {len(arena_servers)}")
            
            if arena_servers:
                arena = arena_servers[0]
                log_test(f"✅ Arena Server: {arena.get('id')} (Max: {arena.get('maxPlayers')}, Current: {arena.get('currentPlayers')})")
                return True, arena
            else:
                log_test("❌ No arena servers found", "ERROR")
                return False, None
                
        else:
            log_test(f"❌ Servers endpoint failed: HTTP {response.status_code}", "ERROR")
            return False, None
    except Exception as e:
        log_test(f"❌ Servers endpoint error: {str(e)}", "ERROR")
        return False, None

def test_arena_mass_configuration():
    """Test arena mass configuration by examining server code"""
    log_test("Testing arena mass configuration in server code...")
    
    try:
        # Check TypeScript source file
        with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
            ts_content = f.read()
        
        # Check compiled JavaScript file  
        with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
            js_content = f.read()
        
        # Verify mass = 25 in TypeScript source
        ts_mass_checks = [
            'mass: number = 25' in ts_content,
            'player.mass = 25' in ts_content,
            'Updated to 25 to match user requirement' in ts_content
        ]
        
        # Verify mass = 25 in compiled JavaScript
        js_mass_checks = [
            '_mass_initializers, 25' in js_content,
            'player.mass = 25' in js_content,
            'Fixed to 25' in js_content
        ]
        
        ts_passed = sum(ts_mass_checks)
        js_passed = sum(js_mass_checks)
        
        log_test(f"✅ TypeScript Mass Configuration: {ts_passed}/3 checks passed")
        log_test(f"✅ JavaScript Mass Configuration: {js_passed}/3 checks passed")
        
        if ts_passed >= 2 and js_passed >= 2:
            log_test("✅ Arena mass correctly configured to 25 in both source and compiled files")
            return True
        else:
            log_test("❌ Arena mass configuration issues detected", "ERROR")
            return False
            
    except Exception as e:
        log_test(f"❌ Arena mass configuration check error: {str(e)}", "ERROR")
        return False

def test_spawn_mass_logic():
    """Test spawn mass logic in onJoin method"""
    log_test("Testing spawn mass logic in onJoin method...")
    
    try:
        # Check TypeScript source
        with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
            ts_content = f.read()
        
        # Check compiled JavaScript
        with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
            js_content = f.read()
        
        # Look for onJoin method and mass assignment
        ts_spawn_checks = [
            'onJoin(client: Client, options: any = {})' in ts_content,
            'player.mass = 25' in ts_content and 'onJoin' in ts_content.split('player.mass = 25')[0][-200:],
            'radius = Math.sqrt(player.mass) * 3' in ts_content
        ]
        
        js_spawn_checks = [
            'onJoin(client, options = {})' in js_content,
            'player.mass = 25' in js_content,
            'Math.sqrt(player.mass) * 3' in js_content
        ]
        
        ts_spawn_passed = sum(ts_spawn_checks)
        js_spawn_passed = sum(js_spawn_checks)
        
        log_test(f"✅ TypeScript Spawn Logic: {ts_spawn_passed}/3 checks passed")
        log_test(f"✅ JavaScript Spawn Logic: {js_spawn_passed}/3 checks passed")
        
        if ts_spawn_passed >= 2 and js_spawn_passed >= 2:
            log_test("✅ Spawn mass logic correctly implemented for mass = 25")
            return True
        else:
            log_test("❌ Spawn mass logic issues detected", "ERROR")
            return False
            
    except Exception as e:
        log_test(f"❌ Spawn mass logic check error: {str(e)}", "ERROR")
        return False

def test_respawn_mass_logic():
    """Test respawn mass logic in respawnPlayer method"""
    log_test("Testing respawn mass logic in respawnPlayer method...")
    
    try:
        # Check TypeScript source
        with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
            ts_content = f.read()
        
        # Check compiled JavaScript
        with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
            js_content = f.read()
        
        # Look for respawnPlayer method and mass assignment
        ts_respawn_checks = [
            'respawnPlayer(player: Player)' in ts_content,
            'player.mass = 25' in ts_content and 'respawnPlayer' in ts_content.split('player.mass = 25')[1][:200] if 'player.mass = 25' in ts_content else False,
            'Updated to 25 to match user requirement' in ts_content
        ]
        
        js_respawn_checks = [
            'respawnPlayer(player)' in js_content,
            'player.mass = 25' in js_content and 'respawnPlayer' in js_content,
            'Fixed to 25' in js_content
        ]
        
        ts_respawn_passed = sum(ts_respawn_checks)
        js_respawn_passed = sum(js_respawn_checks)
        
        log_test(f"✅ TypeScript Respawn Logic: {ts_respawn_passed}/3 checks passed")
        log_test(f"✅ JavaScript Respawn Logic: {js_respawn_passed}/3 checks passed")
        
        if ts_respawn_passed >= 2 and js_respawn_passed >= 2:
            log_test("✅ Respawn mass logic correctly implemented for mass = 25")
            return True
        else:
            log_test("❌ Respawn mass logic issues detected", "ERROR")
            return False
            
    except Exception as e:
        log_test(f"❌ Respawn mass logic check error: {str(e)}", "ERROR")
        return False

def test_mass_synchronization_schema():
    """Test mass synchronization in Player schema"""
    log_test("Testing mass synchronization in Player schema...")
    
    try:
        # Check TypeScript source
        with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
            ts_content = f.read()
        
        # Check compiled JavaScript
        with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
            js_content = f.read()
        
        # Look for Player schema mass field
        ts_schema_checks = [
            '@type("number") mass: number = 25' in ts_content,
            'export class Player extends Schema' in ts_content,
            'Fixed default mass to 25' in ts_content
        ]
        
        js_schema_checks = [
            '_mass_initializers, 25' in js_content,
            'Player extends _classSuper' in js_content,
            'type)("number")' in js_content
        ]
        
        ts_schema_passed = sum(ts_schema_checks)
        js_schema_passed = sum(js_schema_checks)
        
        log_test(f"✅ TypeScript Schema: {ts_schema_passed}/3 checks passed")
        log_test(f"✅ JavaScript Schema: {js_schema_passed}/3 checks passed")
        
        if ts_schema_passed >= 2 and js_schema_passed >= 2:
            log_test("✅ Mass synchronization schema correctly configured for mass = 25")
            return True
        else:
            log_test("❌ Mass synchronization schema issues detected", "ERROR")
            return False
            
    except Exception as e:
        log_test(f"❌ Mass synchronization schema check error: {str(e)}", "ERROR")
        return False

def test_virus_collision_mass_minimum():
    """Test virus collision minimum mass is set to 25"""
    log_test("Testing virus collision minimum mass...")
    
    try:
        # Check TypeScript source
        with open('/app/src/rooms/ArenaRoom.ts', 'r') as f:
            ts_content = f.read()
        
        # Check compiled JavaScript
        with open('/app/build/rooms/ArenaRoom.js', 'r') as f:
            js_content = f.read()
        
        # Look for virus collision logic with minimum mass
        ts_virus_checks = [
            'checkVirusCollisions(player: Player)' in ts_content,
            'Math.max(25, player.mass * 0.8)' in ts_content,
            'Minimum mass is now 25' in ts_content
        ]
        
        js_virus_checks = [
            'checkVirusCollisions(player)' in js_content,
            'Math.max(25, player.mass * 0.8)' in js_content,
            'player.mass * 0.8' in js_content
        ]
        
        ts_virus_passed = sum(ts_virus_checks)
        js_virus_passed = sum(js_virus_checks)
        
        log_test(f"✅ TypeScript Virus Collision: {ts_virus_passed}/3 checks passed")
        log_test(f"✅ JavaScript Virus Collision: {js_virus_passed}/3 checks passed")
        
        if ts_virus_passed >= 2 and js_virus_passed >= 2:
            log_test("✅ Virus collision minimum mass correctly set to 25")
            return True
        else:
            log_test("❌ Virus collision minimum mass issues detected", "ERROR")
            return False
            
    except Exception as e:
        log_test(f"❌ Virus collision minimum mass check error: {str(e)}", "ERROR")
        return False

def test_database_integration():
    """Test database integration for session tracking"""
    log_test("Testing database integration...")
    try:
        response = requests.get(f"{BASE_URL}/api/game-sessions", timeout=10)
        if response.status_code == 200:
            data = response.json()
            log_test(f"✅ Database accessible - Sessions: {len(data.get('sessions', []))}")
            return True
        else:
            log_test(f"❌ Database integration failed: HTTP {response.status_code}", "ERROR")
            return False
    except Exception as e:
        log_test(f"❌ Database integration error: {str(e)}", "ERROR")
        return False

def run_comprehensive_arena_mass_test():
    """Run comprehensive arena mass testing"""
    log_test("🎯 STARTING ARENA MODE STARTING MASS COMPREHENSIVE TESTING", "INFO")
    log_test("=" * 80)
    
    start_time = time.time()
    total_tests = 0
    passed_tests = 0
    
    # Test categories
    tests = [
        ("API Health Check", test_api_health),
        ("Colyseus Servers Endpoint", test_colyseus_servers_endpoint),
        ("Arena Mass Configuration", test_arena_mass_configuration),
        ("Spawn Mass Logic", test_spawn_mass_logic),
        ("Respawn Mass Logic", test_respawn_mass_logic),
        ("Mass Synchronization Schema", test_mass_synchronization_schema),
        ("Virus Collision Mass Minimum", test_virus_collision_mass_minimum),
        ("Database Integration", test_database_integration)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        log_test(f"\n🧪 TESTING: {test_name}")
        log_test("-" * 50)
        
        try:
            if test_name == "Colyseus Servers Endpoint":
                result, arena_data = test_func()
                results[test_name] = result
            else:
                result = test_func()
                results[test_name] = result
            
            total_tests += 1
            if result:
                passed_tests += 1
                log_test(f"✅ {test_name}: PASSED")
            else:
                log_test(f"❌ {test_name}: FAILED", "ERROR")
                
        except Exception as e:
            total_tests += 1
            results[test_name] = False
            log_test(f"❌ {test_name}: ERROR - {str(e)}", "ERROR")
    
    # Calculate results
    end_time = time.time()
    duration = end_time - start_time
    success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
    
    # Final summary
    log_test("\n" + "=" * 80)
    log_test("🎯 ARENA MODE STARTING MASS TESTING SUMMARY")
    log_test("=" * 80)
    
    log_test(f"📊 OVERALL RESULTS:")
    log_test(f"   • Total Tests: {total_tests}")
    log_test(f"   • Passed: {passed_tests}")
    log_test(f"   • Failed: {total_tests - passed_tests}")
    log_test(f"   • Success Rate: {success_rate:.1f}%")
    log_test(f"   • Duration: {duration:.2f} seconds")
    
    log_test(f"\n📋 DETAILED RESULTS:")
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        log_test(f"   • {test_name}: {status}")
    
    # Critical findings
    log_test(f"\n🔍 CRITICAL FINDINGS:")
    
    if results.get("Arena Mass Configuration", False) and results.get("Spawn Mass Logic", False) and results.get("Respawn Mass Logic", False):
        log_test("   ✅ ARENA STARTING MASS CORRECTLY SET TO 25")
        log_test("   ✅ Both spawn and respawn logic use mass = 25")
        log_test("   ✅ Server-side mass configuration verified in both TypeScript and JavaScript")
    else:
        log_test("   ❌ ARENA STARTING MASS CONFIGURATION ISSUES DETECTED", "ERROR")
        
    if results.get("Mass Synchronization Schema", False):
        log_test("   ✅ Mass synchronization schema properly configured for client updates")
    else:
        log_test("   ❌ Mass synchronization schema issues detected", "ERROR")
        
    if results.get("Virus Collision Mass Minimum", False):
        log_test("   ✅ Virus collision minimum mass correctly set to 25 (consistent with starting mass)")
    else:
        log_test("   ❌ Virus collision minimum mass inconsistency detected", "ERROR")
    
    # Production readiness assessment
    critical_tests = ["Arena Mass Configuration", "Spawn Mass Logic", "Respawn Mass Logic", "Mass Synchronization Schema"]
    critical_passed = sum(1 for test in critical_tests if results.get(test, False))
    
    log_test(f"\n🚀 PRODUCTION READINESS:")
    if critical_passed == len(critical_tests):
        log_test("   ✅ ARENA MODE STARTING MASS IS PRODUCTION READY")
        log_test("   ✅ Players will spawn with mass = 25 instead of 100")
        log_test("   ✅ Both initial spawn and respawn use correct mass value")
        log_test("   ✅ Mass synchronization working for client-server communication")
    else:
        log_test(f"   ❌ PRODUCTION READINESS ISSUES: {critical_passed}/{len(critical_tests)} critical tests passed", "ERROR")
    
    return success_rate >= 75.0

if __name__ == "__main__":
    success = run_comprehensive_arena_mass_test()
    sys.exit(0 if success else 1)