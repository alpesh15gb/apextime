import requests
import sys
import json
from datetime import datetime

class PayrollSystemTester:
    def __init__(self):
        self.base_url = "https://payroll-reports-hub.preview.emergentagent.com/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()

    def log(self, message, test_name=None):
        if test_name:
            print(f"\n🔍 [{test_name}] {message}")
        else:
            print(f"ℹ️  {message}")

    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing: {method} {endpoint}", name)
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}", name)
                try:
                    return response.json() if response.content else {}
                except:
                    return {"raw_response": response.text}
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", name)
                self.log(f"Response: {response.text[:200]}...", name)
                return None

        except Exception as e:
            self.log(f"❌ ERROR - {str(e)}", name)
            return None

    def login(self):
        """Test login with the specified credentials"""
        credentials = {
            "username": "admin", 
            "password": "admin",
            "companyCode": "apextime"
        }
        
        self.log("Attempting login with required credentials...")
        response = self.run_test("Login", "POST", "/auth/login", 200, credentials)
        
        if response and 'token' in response:
            self.token = response['token']
            self.log(f"✅ Login successful! Token acquired.")
            return True
        else:
            self.log(f"❌ Login failed - no token received")
            return False

    def test_recalculate_endpoint(self):
        """Test the new POST /api/attendance/recalculate endpoint"""
        self.log("=== TESTING NEW RECALCULATE ENDPOINT ===")
        
        # Test recalculate endpoint with empty body (should recalculate all)
        response = self.run_test(
            "Recalculate All Attendance", 
            "POST", 
            "/attendance/recalculate", 
            200, 
            {}
        )
        
        if response:
            self.log(f"✅ Recalculate Response: {json.dumps(response, indent=2)}")
            if 'updated' in response and 'total' in response:
                self.log(f"✅ Recalculation completed: {response.get('updated')} updated out of {response.get('total')} total")
                return response
            else:
                self.log("❌ Response missing expected fields (updated/total)")
        return None

    def test_daily_reports_after_recalculate(self):
        """Test daily reports to verify 8 employee records with correct calculations"""
        self.log("=== TESTING DAILY REPORTS AFTER RECALCULATE ===")
        
        response = self.run_test(
            "Daily Report for 2026-02-07",
            "GET",
            "/reports/daily?date=2026-02-07",
            200
        )
        
        if response:
            logs = response.get('logs', [])
            self.log(f"✅ Retrieved {len(logs)} employee records")
            
            if len(logs) != 8:
                self.log(f"⚠️  Expected 8 records, got {len(logs)}")
            
            # Check data structure for each employee
            for i, log in enumerate(logs[:3]):  # Check first 3 records for details
                emp_name = f"{log.get('employee', {}).get('firstName', 'N/A')} {log.get('employee', {}).get('lastName', '')}"
                first_in = log.get('firstIn')
                last_out = log.get('lastOut')
                working_hours = log.get('workingHours')
                
                self.log(f"Employee {i+1}: {emp_name}")
                self.log(f"  - First In: {first_in}")
                self.log(f"  - Last Out: {last_out}")
                self.log(f"  - Working Hours: {working_hours}")
                
            return response
        return None

    def test_monthly_print_endpoint(self):
        """Test the monthly report endpoint that feeds MonthlyPrintView"""
        self.log("=== TESTING MONTHLY REPORT ENDPOINT ===")
        
        response = self.run_test(
            "Monthly Report February 2026",
            "GET", 
            "/attendance/monthly-report?month=2&year=2026",
            200
        )
        
        if response:
            report_data = response.get('reportData', [])
            self.log(f"✅ Monthly report has {len(report_data)} employees")
            
            # Check structure for print view
            if report_data:
                first_emp = report_data[0]
                daily_data = first_emp.get('dailyData', [])
                self.log(f"✅ Each employee has {len(daily_data)} daily records")
                
                # Check a few daily records have proper In/Out times
                for day_record in daily_data[:3]:
                    day = day_record.get('day')
                    first_in = day_record.get('firstIn')
                    last_out = day_record.get('lastOut')
                    self.log(f"  Day {day}: In={first_in}, Out={last_out}")
                    
            return response
        return None

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting Payroll System Testing (Iteration 3)")
        self.log(f"Target URL: {self.base_url}")
        
        # 1. Login
        if not self.login():
            self.log("❌ Login failed - cannot continue with protected endpoints")
            return False
        
        # 2. Test new recalculate endpoint
        recalc_result = self.test_recalculate_endpoint()
        
        # 3. Test daily reports after recalculation
        daily_result = self.test_daily_reports_after_recalculate()
        
        # 4. Test monthly report for print view
        monthly_result = self.test_monthly_print_endpoint()
        
        # Summary
        self.log("\n" + "="*50)
        self.log("📊 TEST SUMMARY")
        self.log("="*50)
        self.log(f"Tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        success_rate = self.tests_passed / self.tests_run
        return success_rate >= 0.8  # 80% pass rate considered successful

def main():
    tester = PayrollSystemTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())