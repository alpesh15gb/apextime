import requests
import sys
import json
from datetime import datetime

class AttendanceCountingTester:
    def __init__(self):
        self.base_url = "https://card-accuracy.preview.emergentagent.com/api"
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

    def test_date_range_report_endpoint(self):
        """Test the NEW date range report endpoint used by MonthlyPrintView"""
        self.log("=== TESTING DATE RANGE REPORT ENDPOINT ===")
        
        # Test the specific endpoint mentioned in requirements
        response = self.run_test(
            "Date Range Report (Department Wise)",
            "GET", 
            "/attendance/date-range-report?startDate=2026-01-15&endDate=2026-02-08&groupBy=department",
            200
        )
        
        if response:
            groups = response.get('groups', [])
            self.log(f"✅ Date range report returned {len(groups)} department groups")
            
            # Check for the 3 expected departments
            expected_depts = ['Engineering', 'Finance', 'Human Resources']
            found_depts = [group.get('name', '') for group in groups]
            self.log(f"Found departments: {found_depts}")
            
            for dept in expected_depts:
                if dept in found_depts:
                    self.log(f"✅ Found expected department: {dept}")
                else:
                    self.log(f"❌ Missing department: {dept}")
            
            # Check structure of each group
            for group in groups:
                dept_name = group.get('name', 'Unknown')
                employees = group.get('employees', [])
                self.log(f"Department '{dept_name}' has {len(employees)} employees")
                
                # Check first employee structure
                if employees:
                    first_emp = employees[0]
                    daily_data = first_emp.get('dailyData', [])
                    summary = first_emp.get('summary', {})
                    
                    self.log(f"  Employee has {len(daily_data)} daily records")
                    self.log(f"  Summary: Present={summary.get('presentDays', 0)}, Absent={summary.get('absentDays', 0)}, Hours={summary.get('totalWorkingHours', 0)}")
                    
                    # Check daily data structure
                    if daily_data:
                        sample_day = daily_data[0]
                        self.log(f"  Sample day data: Day={sample_day.get('day')}, DayName={sample_day.get('dayName')}")
                        self.log(f"    FirstIn={sample_day.get('firstIn')}, LastOut={sample_day.get('lastOut')}")
            
            # Check dates array
            dates = response.get('dates', [])
            self.log(f"✅ Date range has {len(dates)} dates")
            if dates:
                first_date = dates[0]
                last_date = dates[-1]
                self.log(f"  Date range: {first_date.get('day')}/{first_date.get('month')} to {last_date.get('day')}/{last_date.get('month')}")
                
            return response
        return None

    def test_branch_wise_grouping(self):
        """Test branch wise grouping option"""
        self.log("=== TESTING BRANCH WISE GROUPING ===")
        
        response = self.run_test(
            "Date Range Report (Branch Wise)",
            "GET", 
            "/attendance/date-range-report?startDate=2026-01-15&endDate=2026-02-08&groupBy=branch",
            200
        )
        
        if response:
            groups = response.get('groups', [])
            self.log(f"✅ Branch wise report returned {len(groups)} branch groups")
            
            group_names = [group.get('name', '') for group in groups]
            self.log(f"Found branches: {group_names}")
            
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
        
        # 2. Test new date range report endpoint (key for MonthlyPrintView)
        date_range_result = self.test_date_range_report_endpoint()
        
        # 3. Test branch wise grouping
        branch_result = self.test_branch_wise_grouping()
        
        # 4. Test recalculate endpoint
        recalc_result = self.test_recalculate_endpoint()
        
        # 5. Test daily reports after recalculation
        daily_result = self.test_daily_reports_after_recalculate()
        
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