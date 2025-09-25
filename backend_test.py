#!/usr/bin/env python3

"""
Backend Testing Script for Player Starting Mass in Arena Mode
Testing Requirements:
1. Player Starting Mass: Test that new players spawn with exactly 25 mass when joining the arena
2. Player Schema Default: Verify that the Player schema initializes with mass = 25 by default  
3. Respawn Mass: Test that when players respawn, their mass is reset to 25
4. Mass Consistency: Check that there are no other code paths that might override the mass value
5. Arena Server Configuration: Verify that the arena server is properly creating players with the correct starting mass
"""

import asyncio
import aiohttp
import json
import os
import sys
import time
import re
from typing import Dict, List, Any, Optional

class PlayerMassTestSuite:
    def __init__(self):
        # Get base URL from environment
        self.base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
        self.api_base = f"{self.base_url}/api"
        
        # Test results tracking
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        print(f"🧪 Player Starting Mass Test Suite Initialized")
        print(f"🌐 API Base URL: {self.api_base}")
        print(f"📋 Testing Requirements: Player spawn mass = 25, respawn mass = 25, schema default = 25")
        print("=" * 80)

    async def run_all_tests(self):
        """Run all player starting mass tests"""
        print("🚀 Starting Player Starting Mass Testing...")
        start_time = time.time()
        
        test_categories = [
            ("API Health Check", self.test_api_health),
            ("Colyseus Server Integration", self.test_colyseus_server_integration),
            ("Player Schema Default Mass Verification", self.test_player_schema_default_mass),
            ("Arena Server Player Creation", self.test_arena_server_player_creation),
            ("Player Starting Mass Code Analysis", self.test_player_starting_mass_code),
            ("Player Respawn Mass Code Analysis", self.test_player_respawn_mass_code),
            ("Mass Consistency Verification", self.test_mass_consistency_verification),
            ("Arena Server Configuration Verification", self.test_arena_server_configuration)
        ]
        
        for category_name, test_func in test_categories:
            print(f"\n📊 TESTING CATEGORY: {category_name}")
            print("-" * 60)
            try:
                await test_func()
                print(f"✅ {category_name} - COMPLETED")
            except Exception as e:
                print(f"❌ {category_name} - FAILED: {str(e)}")
                self.record_test_result(category_name, False, f"Exception: {str(e)}")
        
        # Print final results
        end_time = time.time()
        duration = end_time - start_time
        
        print("\n" + "=" * 80)
        print("🎯 PLAYER STARTING MASS TESTING RESULTS")
        print("=" * 80)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"📈 Overall Success Rate: {success_rate:.1f}% ({self.passed_tests}/{self.total_tests} tests passed)")
        print(f"⏱️  Total Test Duration: {duration:.2f} seconds")
        
        # Detailed results
        print(f"\n📋 DETAILED TEST RESULTS:")
        for result in self.test_results:
            status = "✅ PASS" if result['passed'] else "❌ FAIL"
            print(f"{status} - {result['test_name']}: {result['message']}")
        
        return success_rate >= 85  # Consider 85%+ as success

    def record_test_result(self, test_name: str, passed: bool, message: str):
        """Record a test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            
        self.test_results.append({
            'test_name': test_name,
            'passed': passed,
            'message': message
        })

    async def make_request(self, method: str, endpoint: str, data: Dict = None, timeout: int = 10) -> Dict:
        """Make HTTP request with error handling"""
        url = f"{self.api_base}/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
                if method.upper() == 'GET':
                    async with session.get(url) as response:
                        response_data = await response.json()
                        return {
                            'status': response.status,
                            'data': response_data,
                            'success': response.status == 200
                        }
                elif method.upper() == 'POST':
                    async with session.post(url, json=data) as response:
                        response_data = await response.json()
                        return {
                            'status': response.status,
                            'data': response_data,
                            'success': response.status == 200
                        }
        except Exception as e:
            return {
                'status': 0,
                'data': {'error': str(e)},
                'success': False
            }

    async def test_api_health(self):
        """Test API health and availability"""
        print("🏥 Testing API health and backend availability...")
        
        # Test root API endpoint
        response = await self.make_request('GET', '')
        
        if response['success']:
            data = response['data']
            service_name = data.get('service', 'unknown')
            status = data.get('status', 'unknown')
            features = data.get('features', [])
            
            print(f"✅ API Health Check: Service={service_name}, Status={status}")
            print(f"📋 Available Features: {', '.join(features)}")
            
            # Check if multiplayer feature is available
            if 'multiplayer' in features:
                self.record_test_result("API Health - Multiplayer Feature", True, "Multiplayer feature available for arena testing")
            else:
                self.record_test_result("API Health - Multiplayer Feature", False, "Multiplayer feature not available")
                
            self.record_test_result("API Health Check", True, f"API operational - {service_name}")
        else:
            error_msg = response['data'].get('error', 'Unknown error')
            print(f"❌ API Health Check Failed: {error_msg}")
            self.record_test_result("API Health Check", False, f"API not accessible: {error_msg}")

    async def test_colyseus_server_integration(self):
        """Test Colyseus server integration for arena mode"""
        print("🎮 Testing Colyseus server integration...")
        
        # Test servers endpoint
        response = await self.make_request('GET', 'servers')
        
        if response['success']:
            data = response['data']
            
            # Check for Colyseus configuration
            colyseus_enabled = data.get('colyseusEnabled', False)
            colyseus_endpoint = data.get('colyseusEndpoint', '')
            servers = data.get('servers', [])
            
            print(f"🔧 Colyseus Enabled: {colyseus_enabled}")
            print(f"🌐 Colyseus Endpoint: {colyseus_endpoint}")
            print(f"🖥️  Available Servers: {len(servers)}")
            
            if colyseus_enabled:
                self.record_test_result("Colyseus Integration - Enabled", True, "Colyseus integration is enabled")
            else:
                self.record_test_result("Colyseus Integration - Enabled", False, "Colyseus integration is disabled")
            
            # Look for arena servers
            arena_servers = [s for s in servers if s.get('roomType') == 'arena' or s.get('gameType') == 'Arena Battle']
            if arena_servers:
                arena_server = arena_servers[0]
                max_players = arena_server.get('maxPlayers', 0)
                print(f"🏟️  Arena Server Found: Max Players = {max_players}")
                self.record_test_result("Arena Server Available", True, f"Arena server found with {max_players} max players")
            else:
                print("⚠️  No arena servers found")
                self.record_test_result("Arena Server Available", False, "No arena servers found")
                
        else:
            error_msg = response['data'].get('error', 'Unknown error')
            print(f"❌ Colyseus Server Integration Failed: {error_msg}")
            self.record_test_result("Colyseus Server Integration", False, f"Failed to get server info: {error_msg}")

    async def test_player_schema_default_mass(self):
        """Test Player schema default mass value by analyzing source code"""
        print("📋 Testing Player schema default mass value...")
        
        try:
            # Read TypeScript source file
            ts_file_path = '/app/src/rooms/ArenaRoom.ts'
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                
                # Look for Player schema mass default
                mass_pattern = r'@type\("number"\)\s+mass:\s*number\s*=\s*(\d+)'
                mass_match = re.search(mass_pattern, ts_content)
                
                if mass_match:
                    default_mass = int(mass_match.group(1))
                    print(f"📊 Player Schema Default Mass: {default_mass}")
                    
                    if default_mass == 25:
                        self.record_test_result("Player Schema Default Mass", True, f"Schema default mass is correctly set to {default_mass}")
                    else:
                        self.record_test_result("Player Schema Default Mass", False, f"Schema default mass is {default_mass}, expected 25")
                else:
                    self.record_test_result("Player Schema Default Mass", False, "Could not find mass default in Player schema")
            else:
                print("⚠️  TypeScript source file not found")
                self.record_test_result("Player Schema Default Mass", False, "TypeScript source file not accessible")
            
            # Also check compiled JavaScript
            js_file_path = '/app/build/rooms/ArenaRoom.js'
            if os.path.exists(js_file_path):
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                
                # Look for mass initialization in compiled JS
                mass_init_pattern = r'_mass_initializers,\s*(\d+)'
                mass_init_match = re.search(mass_init_pattern, js_content)
                
                if mass_init_match:
                    compiled_mass = int(mass_init_match.group(1))
                    print(f"🔧 Compiled JS Default Mass: {compiled_mass}")
                    
                    if compiled_mass == 25:
                        self.record_test_result("Compiled JS Default Mass", True, f"Compiled default mass is correctly set to {compiled_mass}")
                    else:
                        self.record_test_result("Compiled JS Default Mass", False, f"Compiled default mass is {compiled_mass}, expected 25")
                else:
                    self.record_test_result("Compiled JS Default Mass", False, "Could not find mass initialization in compiled JS")
            else:
                print("⚠️  Compiled JavaScript file not found")
                self.record_test_result("Compiled JS Default Mass", False, "Compiled JavaScript file not accessible")
                
        except Exception as e:
            print(f"❌ Error analyzing Player schema: {str(e)}")
            self.record_test_result("Player Schema Analysis", False, f"Error reading source files: {str(e)}")

    async def test_arena_server_player_creation(self):
        """Test arena server player creation logic"""
        print("👤 Testing arena server player creation logic...")
        
        try:
            # Read TypeScript source file for onJoin method
            ts_file_path = '/app/src/rooms/ArenaRoom.ts'
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                
                # Look for player creation in onJoin method
                onjoin_pattern = r'onJoin\(.*?\{(.*?)\}(?=\s*handleInput|\s*onLeave|\s*$)'
                onjoin_match = re.search(onjoin_pattern, ts_content, re.DOTALL)
                
                if onjoin_match:
                    onjoin_content = onjoin_match.group(1)
                    
                    # Check for player.mass = 25 assignment
                    mass_assignment_pattern = r'player\.mass\s*=\s*(\d+)'
                    mass_assignments = re.findall(mass_assignment_pattern, onjoin_content)
                    
                    print(f"🔍 Found {len(mass_assignments)} mass assignments in onJoin")
                    
                    if mass_assignments:
                        for i, mass_value in enumerate(mass_assignments):
                            mass_val = int(mass_value)
                            print(f"📊 Mass Assignment {i+1}: {mass_val}")
                            
                            if mass_val == 25:
                                self.record_test_result(f"Player Creation Mass Assignment {i+1}", True, f"Player mass correctly set to {mass_val} in onJoin")
                            else:
                                self.record_test_result(f"Player Creation Mass Assignment {i+1}", False, f"Player mass set to {mass_val}, expected 25")
                    else:
                        self.record_test_result("Player Creation Mass Assignment", False, "No mass assignments found in onJoin method")
                        
                    # Check for radius calculation based on mass
                    radius_pattern = r'player\.radius\s*=\s*Math\.sqrt\(player\.mass\)\s*\*\s*(\d+)'
                    radius_match = re.search(radius_pattern, onjoin_content)
                    
                    if radius_match:
                        radius_multiplier = int(radius_match.group(1))
                        expected_radius = int(25**0.5 * radius_multiplier)  # √25 * multiplier
                        print(f"📐 Radius Calculation: √mass * {radius_multiplier} = √25 * {radius_multiplier} = {expected_radius}")
                        self.record_test_result("Player Radius Calculation", True, f"Radius correctly calculated as √mass * {radius_multiplier}")
                    else:
                        self.record_test_result("Player Radius Calculation", False, "Radius calculation not found or incorrect")
                        
                else:
                    self.record_test_result("Player Creation Analysis", False, "Could not find onJoin method in source code")
            else:
                self.record_test_result("Player Creation Analysis", False, "TypeScript source file not accessible")
                
        except Exception as e:
            print(f"❌ Error analyzing player creation: {str(e)}")
            self.record_test_result("Player Creation Analysis", False, f"Error analyzing source: {str(e)}")

    async def test_player_starting_mass_code(self):
        """Test player starting mass in all code paths"""
        print("🔍 Testing player starting mass in all code paths...")
        
        try:
            # Check both TypeScript and compiled JavaScript
            files_to_check = [
                ('/app/src/rooms/ArenaRoom.ts', 'TypeScript Source'),
                ('/app/build/rooms/ArenaRoom.js', 'Compiled JavaScript')
            ]
            
            for file_path, file_type in files_to_check:
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    print(f"📄 Analyzing {file_type}...")
                    
                    # Look for all mass assignments
                    mass_patterns = [
                        r'player\.mass\s*=\s*(\d+)',  # Direct assignment
                        r'mass:\s*number\s*=\s*(\d+)',  # Schema default
                        r'_mass_initializers,\s*(\d+)'  # Compiled JS initialization
                    ]
                    
                    all_mass_values = []
                    for pattern in mass_patterns:
                        matches = re.findall(pattern, content)
                        all_mass_values.extend([int(m) for m in matches])
                    
                    print(f"🔢 Found mass values in {file_type}: {all_mass_values}")
                    
                    # Check if all mass values are 25
                    correct_mass_count = sum(1 for mass in all_mass_values if mass == 25)
                    total_mass_count = len(all_mass_values)
                    
                    if total_mass_count > 0:
                        if correct_mass_count == total_mass_count:
                            self.record_test_result(f"{file_type} Mass Consistency", True, f"All {total_mass_count} mass values are correctly set to 25")
                        else:
                            incorrect_values = [mass for mass in all_mass_values if mass != 25]
                            self.record_test_result(f"{file_type} Mass Consistency", False, f"Found incorrect mass values: {incorrect_values}")
                    else:
                        self.record_test_result(f"{file_type} Mass Values", False, f"No mass values found in {file_type}")
                else:
                    print(f"⚠️  {file_type} file not found: {file_path}")
                    self.record_test_result(f"{file_type} Accessibility", False, f"File not accessible: {file_path}")
                    
        except Exception as e:
            print(f"❌ Error analyzing starting mass code: {str(e)}")
            self.record_test_result("Starting Mass Code Analysis", False, f"Error: {str(e)}")

    async def test_player_respawn_mass_code(self):
        """Test player respawn mass logic"""
        print("🔄 Testing player respawn mass logic...")
        
        try:
            # Read TypeScript source file
            ts_file_path = '/app/src/rooms/ArenaRoom.ts'
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                
                # Look for respawnPlayer method
                respawn_pattern = r'respawnPlayer\(.*?\)\s*\{(.*?)\}(?=\s*generateCoins|\s*generateViruses|\s*$)'
                respawn_match = re.search(respawn_pattern, ts_content, re.DOTALL)
                
                if respawn_match:
                    respawn_content = respawn_match.group(1)
                    
                    # Check for player.mass = 25 in respawn
                    mass_assignment_pattern = r'player\.mass\s*=\s*(\d+)'
                    mass_assignments = re.findall(mass_assignment_pattern, respawn_content)
                    
                    print(f"🔄 Found {len(mass_assignments)} mass assignments in respawnPlayer")
                    
                    if mass_assignments:
                        for i, mass_value in enumerate(mass_assignments):
                            mass_val = int(mass_value)
                            print(f"📊 Respawn Mass Assignment {i+1}: {mass_val}")
                            
                            if mass_val == 25:
                                self.record_test_result(f"Respawn Mass Assignment {i+1}", True, f"Respawn mass correctly set to {mass_val}")
                            else:
                                self.record_test_result(f"Respawn Mass Assignment {i+1}", False, f"Respawn mass set to {mass_val}, expected 25")
                    else:
                        self.record_test_result("Respawn Mass Assignment", False, "No mass assignments found in respawnPlayer method")
                        
                    # Check for radius recalculation in respawn
                    radius_pattern = r'player\.radius\s*=\s*Math\.sqrt\(player\.mass\)\s*\*\s*(\d+)'
                    radius_match = re.search(radius_pattern, respawn_content)
                    
                    if radius_match:
                        radius_multiplier = int(radius_match.group(1))
                        print(f"📐 Respawn Radius Calculation: √mass * {radius_multiplier}")
                        self.record_test_result("Respawn Radius Calculation", True, f"Respawn radius correctly calculated")
                    else:
                        self.record_test_result("Respawn Radius Calculation", False, "Respawn radius calculation not found")
                        
                else:
                    self.record_test_result("Respawn Method Analysis", False, "Could not find respawnPlayer method")
            else:
                self.record_test_result("Respawn Method Analysis", False, "TypeScript source file not accessible")
            
            # Also check compiled JavaScript
            js_file_path = '/app/build/rooms/ArenaRoom.js'
            if os.path.exists(js_file_path):
                with open(js_file_path, 'r') as f:
                    js_content = f.read()
                
                # Look for respawnPlayer in compiled JS
                if 'respawnPlayer' in js_content:
                    # Find mass assignments in the vicinity of respawnPlayer
                    respawn_js_pattern = r'respawnPlayer\(.*?\)\s*\{(.*?)(?=\s*generateCoins|\s*generateViruses|\s*\})'
                    respawn_js_match = re.search(respawn_js_pattern, js_content, re.DOTALL)
                    
                    if respawn_js_match:
                        respawn_js_content = respawn_js_match.group(1)
                        mass_assignments_js = re.findall(r'\.mass\s*=\s*(\d+)', respawn_js_content)
                        
                        if mass_assignments_js:
                            for mass_val in mass_assignments_js:
                                if int(mass_val) == 25:
                                    self.record_test_result("Compiled JS Respawn Mass", True, f"Compiled respawn mass correctly set to {mass_val}")
                                else:
                                    self.record_test_result("Compiled JS Respawn Mass", False, f"Compiled respawn mass set to {mass_val}, expected 25")
                        else:
                            self.record_test_result("Compiled JS Respawn Mass", False, "No mass assignments found in compiled respawnPlayer")
                    else:
                        self.record_test_result("Compiled JS Respawn Method", False, "Could not parse respawnPlayer in compiled JS")
                else:
                    self.record_test_result("Compiled JS Respawn Method", False, "respawnPlayer method not found in compiled JS")
            else:
                self.record_test_result("Compiled JS Respawn Analysis", False, "Compiled JavaScript file not accessible")
                
        except Exception as e:
            print(f"❌ Error analyzing respawn mass: {str(e)}")
            self.record_test_result("Respawn Mass Analysis", False, f"Error: {str(e)}")

    async def test_mass_consistency_verification(self):
        """Test mass consistency across all game mechanics"""
        print("⚖️  Testing mass consistency across all game mechanics...")
        
        try:
            # Read TypeScript source file
            ts_file_path = '/app/src/rooms/ArenaRoom.ts'
            if os.path.exists(ts_file_path):
                with open(ts_file_path, 'r') as f:
                    ts_content = f.read()
                
                # Check virus collision damage minimum mass
                virus_pattern = r'player\.mass\s*=\s*Math\.max\((\d+),.*?\)'
                virus_matches = re.findall(virus_pattern, ts_content)
                
                print(f"🦠 Virus collision minimum mass values: {virus_matches}")
                
                if virus_matches:
                    for min_mass in virus_matches:
                        if int(min_mass) == 25:
                            self.record_test_result("Virus Collision Minimum Mass", True, f"Minimum mass after virus damage is correctly {min_mass}")
                        else:
                            self.record_test_result("Virus Collision Minimum Mass", False, f"Minimum mass after virus damage is {min_mass}, expected 25")
                else:
                    self.record_test_result("Virus Collision Minimum Mass", False, "No minimum mass constraints found for virus collisions")
                
                # Check split functionality minimum mass requirement
                split_pattern = r'if\s*\(\s*player\.mass\s*<\s*(\d+)\s*\)'
                split_matches = re.findall(split_pattern, ts_content)
                
                print(f"✂️  Split minimum mass requirements: {split_matches}")
                
                if split_matches:
                    for min_split_mass in split_matches:
                        min_val = int(min_split_mass)
                        if min_val >= 25:  # Should be at least 25 to allow splitting from starting mass
                            self.record_test_result("Split Minimum Mass Requirement", True, f"Split requires minimum {min_val} mass (>= 25)")
                        else:
                            self.record_test_result("Split Minimum Mass Requirement", False, f"Split requires minimum {min_val} mass (< 25)")
                else:
                    self.record_test_result("Split Minimum Mass Requirement", False, "No split minimum mass requirements found")
                
                # Check for any hardcoded mass values that might conflict
                all_mass_numbers = re.findall(r'\b(\d+)\b', ts_content)
                mass_values = [int(m) for m in all_mass_numbers if 20 <= int(m) <= 30]  # Focus on values near 25
                
                print(f"🔢 Mass-related values found (20-30 range): {set(mass_values)}")
                
                if 25 in mass_values:
                    mass_25_count = mass_values.count(25)
                    self.record_test_result("Mass Value 25 Usage", True, f"Value 25 appears {mass_25_count} times in code")
                else:
                    self.record_test_result("Mass Value 25 Usage", False, "Value 25 not found in expected mass range")
                    
            else:
                self.record_test_result("Mass Consistency Analysis", False, "TypeScript source file not accessible")
                
        except Exception as e:
            print(f"❌ Error analyzing mass consistency: {str(e)}")
            self.record_test_result("Mass Consistency Analysis", False, f"Error: {str(e)}")

    async def test_arena_server_configuration(self):
        """Test arena server configuration for proper player mass handling"""
        print("⚙️  Testing arena server configuration...")
        
        try:
            # Test if we can get server configuration
            response = await self.make_request('GET', 'servers')
            
            if response['success']:
                data = response['data']
                servers = data.get('servers', [])
                
                # Look for arena/colyseus servers
                arena_servers = [s for s in servers if 
                               s.get('roomType') == 'arena' or 
                               s.get('gameType') == 'Arena Battle' or
                               s.get('serverType') == 'colyseus']
                
                if arena_servers:
                    arena_server = arena_servers[0]
                    server_id = arena_server.get('id', 'unknown')
                    max_players = arena_server.get('maxPlayers', 0)
                    endpoint = arena_server.get('colyseusEndpoint', arena_server.get('endpoint', ''))
                    
                    print(f"🏟️  Arena Server Configuration:")
                    print(f"   ID: {server_id}")
                    print(f"   Max Players: {max_players}")
                    print(f"   Endpoint: {endpoint}")
                    
                    self.record_test_result("Arena Server Configuration", True, f"Arena server configured with {max_players} max players")
                    
                    # Check if endpoint is accessible (basic connectivity test)
                    if endpoint and ('colyseus' in endpoint or 'ws' in endpoint):
                        self.record_test_result("Arena Server Endpoint", True, f"Arena server endpoint configured: {endpoint}")
                    else:
                        self.record_test_result("Arena Server Endpoint", False, f"Arena server endpoint not properly configured: {endpoint}")
                        
                else:
                    self.record_test_result("Arena Server Configuration", False, "No arena servers found in configuration")
                    
                # Check Colyseus configuration
                colyseus_enabled = data.get('colyseusEnabled', False)
                colyseus_endpoint = data.get('colyseusEndpoint', '')
                
                if colyseus_enabled and colyseus_endpoint:
                    print(f"🎮 Colyseus Configuration: {colyseus_endpoint}")
                    self.record_test_result("Colyseus Configuration", True, f"Colyseus properly configured: {colyseus_endpoint}")
                else:
                    self.record_test_result("Colyseus Configuration", False, "Colyseus not properly configured")
                    
            else:
                error_msg = response['data'].get('error', 'Unknown error')
                self.record_test_result("Arena Server Configuration", False, f"Failed to get server configuration: {error_msg}")
            
            # Test if arena room files exist and are accessible
            arena_files = [
                ('/app/src/rooms/ArenaRoom.ts', 'TypeScript Arena Room'),
                ('/app/build/rooms/ArenaRoom.js', 'Compiled Arena Room')
            ]
            
            for file_path, file_desc in arena_files:
                if os.path.exists(file_path):
                    file_size = os.path.getsize(file_path)
                    print(f"📄 {file_desc}: {file_size} bytes")
                    self.record_test_result(f"{file_desc} Availability", True, f"File exists and accessible ({file_size} bytes)")
                else:
                    self.record_test_result(f"{file_desc} Availability", False, f"File not found: {file_path}")
                    
        except Exception as e:
            print(f"❌ Error testing arena server configuration: {str(e)}")
            self.record_test_result("Arena Server Configuration", False, f"Error: {str(e)}")

async def main():
    """Main test execution function"""
    print("🎯 PLAYER STARTING MASS IN ARENA MODE - BACKEND TESTING")
    print("=" * 80)
    print("📋 Testing Requirements:")
    print("   1. Player Starting Mass: New players spawn with exactly 25 mass")
    print("   2. Player Schema Default: Player schema initializes with mass = 25")
    print("   3. Respawn Mass: Players respawn with mass reset to 25")
    print("   4. Mass Consistency: No code paths override the mass value incorrectly")
    print("   5. Arena Server Configuration: Server creates players with correct starting mass")
    print("=" * 80)
    
    # Initialize test suite
    test_suite = PlayerMassTestSuite()
    
    # Run all tests
    success = await test_suite.run_all_tests()
    
    # Exit with appropriate code
    if success:
        print("\n🎉 PLAYER STARTING MASS TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\n⚠️  PLAYER STARTING MASS TESTING COMPLETED WITH ISSUES!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())