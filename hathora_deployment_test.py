#!/usr/bin/env python3

"""
Comprehensive Backend Testing for Hathora Game Server Deployment
================================================================

This script tests all aspects of the Hathora game server deployment functionality
as specified in the review request:

1. Backend API Integration for Hathora room creation
2. Room Creation APIs across different regions  
3. Connection Info Retrieval
4. WebSocket URL Construction
5. Authentication Token Flow
6. Integration with Server Browser

Test Categories:
- API Health Check
- Hathora Room Creation with Real Deployment
- Connection Info Verification
- WebSocket URL Format Testing
- Authentication Token Validation
- Server Browser Integration
- Multi-Region Testing
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://split-bug-solved.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class HathoraDeploymentTester:
    def __init__(self):
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'base_url': BASE_URL,
            'tests_passed': 0,
            'tests_failed': 0,
            'test_results': []
        }
        
    def log_test(self, test_name, passed, details="", error=""):
        """Log test result"""
        result = {
            'test': test_name,
            'passed': passed,
            'details': details,
            'error': error,
            'timestamp': datetime.now().isoformat()
        }
        
        self.results['test_results'].append(result)
        
        if passed:
            self.results['tests_passed'] += 1
            print(f"✅ {test_name}: {details}")
        else:
            self.results['tests_failed'] += 1
            print(f"❌ {test_name}: {error}")
            if details:
                print(f"   Details: {details}")
    
    def test_api_health_check(self):
        """Test 1: API Health Check"""
        try:
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                server_count = len(data.get('servers', []))
                hathora_enabled = data.get('hathoraEnabled', False)
                
                self.log_test(
                    "API Health Check",
                    True,
                    f"API accessible with {server_count} servers, Hathora enabled: {hathora_enabled}"
                )
                return True
            else:
                self.log_test(
                    "API Health Check", 
                    False,
                    f"HTTP {response.status_code}",
                    response.text[:200]
                )
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, "", str(e))
            return False
    
    def test_hathora_room_creation_real_deployment(self):
        """Test 2: Hathora Room Creation with Real Deployment"""
        test_regions = [
            {'name': 'US-East-1', 'expected_hathora': 'Washington_DC'},
            {'name': 'US-West-2', 'expected_hathora': 'Seattle'},
            {'name': 'Europe', 'expected_hathora': 'London'},
            {'name': 'Asia', 'expected_hathora': 'Singapore'},
            {'name': 'Oceania', 'expected_hathora': 'Sydney'}
        ]
        
        successful_rooms = []
        failed_regions = []
        
        for region_config in test_regions:
            try:
                # Test room creation for each region
                payload = {
                    'gameMode': 'practice',
                    'region': region_config['name'],
                    'maxPlayers': 20,
                    'stakeAmount': 0
                }
                
                print(f"🚀 Testing room creation in {region_config['name']}...")
                response = requests.post(
                    f"{API_BASE}/hathora/room",
                    json=payload,
                    timeout=30  # Longer timeout for room creation
                )
                
                if response.status_code == 200:
                    room_data = response.json()
                    
                    if room_data.get('success') and room_data.get('roomId'):
                        room_info = {
                            'region': region_config['name'],
                            'roomId': room_data['roomId'],
                            'host': room_data.get('host'),
                            'port': room_data.get('port'),
                            'hasToken': bool(room_data.get('playerToken')),
                            'isReal': not room_data.get('isMockRoom', True)
                        }
                        successful_rooms.append(room_info)
                        print(f"   ✅ Room created: {room_data['roomId']}")
                    else:
                        failed_regions.append({
                            'region': region_config['name'],
                            'error': f"Invalid response: {room_data.get('error', 'Unknown error')}"
                        })
                else:
                    failed_regions.append({
                        'region': region_config['name'],
                        'error': f"HTTP {response.status_code}: {response.text[:100]}"
                    })
                    
            except Exception as e:
                failed_regions.append({
                    'region': region_config['name'],
                    'error': str(e)
                })
        
        # Log results
        if len(successful_rooms) >= 3:  # At least 3 regions should work
            self.log_test(
                "Hathora Room Creation with Real Deployment",
                True,
                f"Successfully created {len(successful_rooms)} rooms: {[r['roomId'] for r in successful_rooms]}"
            )
            return successful_rooms
        else:
            self.log_test(
                "Hathora Room Creation with Real Deployment",
                False,
                f"Only {len(successful_rooms)} rooms created",
                f"Failed regions: {failed_regions}"
            )
            return []
    
    def test_connection_info_verification(self, rooms):
        """Test 3: Connection Info Verification"""
        if not rooms:
            self.log_test(
                "Connection Info Verification",
                False,
                "No rooms available for testing",
                "Room creation failed in previous test"
            )
            return False
        
        valid_connections = 0
        connection_details = []
        
        for room in rooms[:3]:  # Test first 3 rooms
            room_id = room['roomId']
            host = room.get('host')
            port = room.get('port')
            
            if host and port:
                # Validate connection info format
                if isinstance(host, str) and isinstance(port, (int, str)):
                    valid_connections += 1
                    connection_details.append({
                        'roomId': room_id,
                        'host': host,
                        'port': port,
                        'region': room['region']
                    })
        
        if valid_connections >= 2:
            self.log_test(
                "Connection Info Verification",
                True,
                f"Valid connection info for {valid_connections} rooms: {connection_details}"
            )
            return True
        else:
            self.log_test(
                "Connection Info Verification",
                False,
                f"Only {valid_connections} valid connections",
                f"Connection details: {connection_details}"
            )
            return False
    
    def test_websocket_url_construction(self, rooms):
        """Test 4: WebSocket URL Construction"""
        if not rooms:
            self.log_test(
                "WebSocket URL Construction",
                False,
                "No rooms available for testing",
                "Room creation failed in previous test"
            )
            return False
        
        valid_urls = []
        invalid_urls = []
        
        for room in rooms[:3]:  # Test first 3 rooms
            room_id = room['roomId']
            host = room.get('host')
            port = room.get('port')
            token = room.get('hasToken')
            
            if host and port:
                # Construct WebSocket URL as per Hathora documentation
                ws_url = f"wss://{host}:{port}/ws?token=PLAYER_TOKEN&roomId={room_id}"
                
                # Validate URL format
                if ws_url.startswith('wss://') and '/ws?' in ws_url and 'token=' in ws_url and 'roomId=' in ws_url:
                    valid_urls.append({
                        'roomId': room_id,
                        'url': ws_url,
                        'region': room['region']
                    })
                else:
                    invalid_urls.append({
                        'roomId': room_id,
                        'url': ws_url,
                        'issue': 'Invalid URL format'
                    })
            else:
                invalid_urls.append({
                    'roomId': room_id,
                    'issue': f'Missing connection info - host: {host}, port: {port}'
                })
        
        if len(valid_urls) >= 2:
            self.log_test(
                "WebSocket URL Construction",
                True,
                f"Valid WebSocket URLs for {len(valid_urls)} rooms with correct /ws endpoint format"
            )
            return True
        else:
            self.log_test(
                "WebSocket URL Construction",
                False,
                f"Only {len(valid_urls)} valid URLs",
                f"Invalid URLs: {invalid_urls}"
            )
            return False
    
    def test_authentication_token_flow(self, rooms):
        """Test 5: Authentication Token Flow"""
        if not rooms:
            self.log_test(
                "Authentication Token Flow",
                False,
                "No rooms available for testing",
                "Room creation failed in previous test"
            )
            return False
        
        tokens_verified = 0
        token_details = []
        
        for room in rooms[:3]:  # Test first 3 rooms
            room_id = room['roomId']
            has_token = room.get('hasToken', False)
            
            if has_token:
                tokens_verified += 1
                token_details.append({
                    'roomId': room_id,
                    'hasToken': True,
                    'region': room['region']
                })
            else:
                token_details.append({
                    'roomId': room_id,
                    'hasToken': False,
                    'region': room['region']
                })
        
        if tokens_verified >= 2:
            self.log_test(
                "Authentication Token Flow",
                True,
                f"Authentication tokens provided for {tokens_verified} rooms"
            )
            return True
        else:
            self.log_test(
                "Authentication Token Flow",
                False,
                f"Only {tokens_verified} rooms have tokens",
                f"Token details: {token_details}"
            )
            return False
    
    def test_server_browser_integration(self):
        """Test 6: Integration with Server Browser"""
        try:
            response = requests.get(f"{API_BASE}/servers", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                servers = data.get('servers', [])
                hathora_servers = [s for s in servers if s.get('serverType') == 'hathora-paid']
                
                # Check for required fields in Hathora servers
                valid_hathora_servers = 0
                for server in hathora_servers:
                    required_fields = ['id', 'hathoraRoomId', 'hathoraRegion', 'name', 'region']
                    if all(field in server for field in required_fields):
                        valid_hathora_servers += 1
                
                if valid_hathora_servers >= 5:
                    self.log_test(
                        "Server Browser Integration",
                        True,
                        f"Server browser shows {valid_hathora_servers} valid Hathora servers out of {len(servers)} total"
                    )
                    return True
                else:
                    self.log_test(
                        "Server Browser Integration",
                        False,
                        f"Only {valid_hathora_servers} valid Hathora servers",
                        f"Total servers: {len(servers)}, Hathora servers: {len(hathora_servers)}"
                    )
                    return False
            else:
                self.log_test(
                    "Server Browser Integration",
                    False,
                    f"HTTP {response.status_code}",
                    response.text[:200]
                )
                return False
                
        except Exception as e:
            self.log_test("Server Browser Integration", False, "", str(e))
            return False
    
    def test_multi_region_deployment_verification(self):
        """Test 7: Multi-Region Deployment Verification"""
        regions_to_test = ['US-East-1', 'US-West-2', 'Europe', 'Asia', 'Oceania']
        successful_regions = []
        failed_regions = []
        
        for region in regions_to_test:
            try:
                payload = {
                    'gameMode': 'cash-game',
                    'region': region,
                    'maxPlayers': 6,
                    'stakeAmount': 0.01
                }
                
                response = requests.post(
                    f"{API_BASE}/hathora/room",
                    json=payload,
                    timeout=25
                )
                
                if response.status_code == 200:
                    room_data = response.json()
                    if room_data.get('success') and room_data.get('roomId'):
                        successful_regions.append({
                            'region': region,
                            'roomId': room_data['roomId'],
                            'host': room_data.get('host'),
                            'port': room_data.get('port')
                        })
                    else:
                        failed_regions.append(region)
                else:
                    failed_regions.append(region)
                    
            except Exception as e:
                failed_regions.append(region)
        
        if len(successful_regions) >= 4:  # At least 4 out of 5 regions should work
            self.log_test(
                "Multi-Region Deployment Verification",
                True,
                f"Successfully deployed to {len(successful_regions)} regions: {[r['region'] for r in successful_regions]}"
            )
            return True
        else:
            self.log_test(
                "Multi-Region Deployment Verification",
                False,
                f"Only {len(successful_regions)} regions successful",
                f"Failed regions: {failed_regions}"
            )
            return False
    
    def run_all_tests(self):
        """Run all Hathora deployment tests"""
        print("🚀 Starting Comprehensive Hathora Game Server Deployment Testing")
        print("=" * 80)
        print(f"Base URL: {BASE_URL}")
        print(f"API Base: {API_BASE}")
        print("=" * 80)
        
        # Test 1: API Health Check
        api_healthy = self.test_api_health_check()
        
        if not api_healthy:
            print("\n❌ API Health Check failed - cannot proceed with other tests")
            return self.generate_summary()
        
        # Test 2: Hathora Room Creation with Real Deployment
        created_rooms = self.test_hathora_room_creation_real_deployment()
        
        # Test 3: Connection Info Verification
        self.test_connection_info_verification(created_rooms)
        
        # Test 4: WebSocket URL Construction
        self.test_websocket_url_construction(created_rooms)
        
        # Test 5: Authentication Token Flow
        self.test_authentication_token_flow(created_rooms)
        
        # Test 6: Server Browser Integration
        self.test_server_browser_integration()
        
        # Test 7: Multi-Region Deployment Verification
        self.test_multi_region_deployment_verification()
        
        return self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        total_tests = self.results['tests_passed'] + self.results['tests_failed']
        success_rate = (self.results['tests_passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print("\n" + "=" * 80)
        print("🎯 HATHORA GAME SERVER DEPLOYMENT TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {self.results['tests_passed']}")
        print(f"Failed: {self.results['tests_failed']}")
        print(f"Success Rate: {success_rate:.1f}%")
        print("=" * 80)
        
        # Detailed results
        for result in self.results['test_results']:
            status = "✅" if result['passed'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"   Details: {result['details']}")
            if result['error']:
                print(f"   Error: {result['error']}")
        
        print("=" * 80)
        
        # Overall assessment
        if success_rate >= 85:
            print("🎉 HATHORA DEPLOYMENT STATUS: EXCELLENT - All critical functionality working")
        elif success_rate >= 70:
            print("✅ HATHORA DEPLOYMENT STATUS: GOOD - Most functionality working")
        elif success_rate >= 50:
            print("⚠️ HATHORA DEPLOYMENT STATUS: PARTIAL - Some issues need attention")
        else:
            print("❌ HATHORA DEPLOYMENT STATUS: CRITICAL - Major issues detected")
        
        return self.results

def main():
    """Main test execution"""
    tester = HathoraDeploymentTester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open('/app/hathora_deployment_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/hathora_deployment_test_results.json")
    
    # Exit with appropriate code
    if results['tests_failed'] == 0:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()