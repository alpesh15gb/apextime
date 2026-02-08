#!/usr/bin/env python3

import requests
import sys
from datetime import datetime, timedelta
import json

class AttendanceAPITester:
    def __init__(self, base_url="https://542fce52-fcdd-4fc9-9f47-a0b52af1ab6c.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tenant_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
                        print(f"   Response: {response_data}")
                except:
                    pass
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw response: {response.text[:200]}")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test health first
        success, _ = self.test_health_check()
        if not success:
            print("❌ Health check failed - server may not be running properly")
            return False

        # Test login endpoint (should fail without credentials but return proper error)
        success, response = self.run_test(
            "Login Endpoint (No Credentials)", 
            "POST", 
            "api/auth/login", 
            400,  # Expecting validation error
            data={}
        )
        
        # Test with invalid credentials
        success, response = self.run_test(
            "Login with Invalid Credentials", 
            "POST", 
            "api/auth/login", 
            401,  # Expecting unauthorized
            data={"email": "test@test.com", "password": "wrongpassword"}
        )

        return True

    def test_attendance_endpoints(self):
        """Test attendance-related endpoints"""
        print("\n=== ATTENDANCE ENDPOINTS TESTS ===")
        
        # Test attendance endpoint without auth (should require auth)
        success, response = self.run_test(
            "Attendance Logs (No Auth)", 
            "GET", 
            "api/attendance", 
            401  # Should require authentication
        )

        # Test with date parameters (still no auth)
        today = datetime.now().strftime('%Y-%m-%d')
        success, response = self.run_test(
            "Attendance with Date Filter (No Auth)", 
            "GET", 
            f"api/attendance?startDate={today}&endDate={today}", 
            401
        )

        return True

    def test_reports_endpoints(self):
        """Test reports endpoints"""
        print("\n=== REPORTS ENDPOINTS TESTS ===")
        
        # Test daily report endpoint
        today = datetime.now().strftime('%Y-%m-%d')
        success, response = self.run_test(
            "Daily Report (No Auth)", 
            "GET", 
            f"api/reports/daily?date={today}", 
            401  # Should require authentication
        )

        # Test reports with IST date
        success, response = self.run_test(
            "Reports with IST Date Filter", 
            "GET", 
            f"api/reports/daily?date={today}&format=json", 
            401
        )

        return True

    def test_filter_endpoints(self):
        """Test filter-related endpoints (departments, branches, locations)"""
        print("\n=== FILTER ENDPOINTS TESTS ===")
        
        # Test departments endpoint
        success, response = self.run_test(
            "Departments Endpoint", 
            "GET", 
            "api/departments", 
            401  # Should require auth
        )

        # Test branches endpoint  
        success, response = self.run_test(
            "Branches Endpoint", 
            "GET", 
            "api/branches", 
            401
        )

        # Test locations endpoint
        success, response = self.run_test(
            "Locations Endpoint", 
            "GET", 
            "api/locations", 
            401
        )

        return True

    def test_timezone_handling(self):
        """Test timezone-related functionality"""
        print("\n=== TIMEZONE HANDLING TESTS ===")
        
        # Test if server responds with proper IST timestamps
        success, response = self.run_test(
            "Server Health with Timestamp", 
            "GET", 
            "api/health", 
            200
        )
        
        if success and response.get('timestamp'):
            timestamp = response['timestamp']
            print(f"   Server timestamp: {timestamp}")
            
            # Parse timestamp and check if it looks reasonable
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                print(f"   Parsed datetime: {dt}")
                print("✅ Timestamp parsing successful")
            except Exception as e:
                print(f"❌ Timestamp parsing failed: {e}")

        return True

def main():
    print("🚀 Starting Attendance & Payroll App Backend Testing...")
    print("=" * 60)
    
    tester = AttendanceAPITester()
    
    # Run all test suites
    test_suites = [
        tester.test_auth_endpoints,
        tester.test_attendance_endpoints, 
        tester.test_reports_endpoints,
        tester.test_filter_endpoints,
        tester.test_timezone_handling
    ]
    
    for test_suite in test_suites:
        try:
            test_suite()
        except Exception as e:
            print(f"❌ Test suite failed with error: {e}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - check server configuration")
        return 1

if __name__ == "__main__":
    sys.exit(main())