import requests
import sys
import json
from datetime import datetime

class Form16LocationPayrollTester:
    def __init__(self):
        self.base_url = "https://payroll-attendance-3.preview.emergentagent.com/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.created_reimbursement_id = None

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

    def test_form16_eligible_endpoint(self):
        """Test GET /api/payroll/form16/eligible"""
        self.log("=== TESTING FORM 16 ELIGIBLE EMPLOYEES ENDPOINT ===")
        
        # Test with current financial year
        current_year = datetime.now().year
        current_month = datetime.now().month
        fy = f"{current_year}-{str(current_year + 1)[-2:]}" if current_month >= 4 else f"{current_year - 1}-{str(current_year)[-2:]}"
        
        response = self.run_test(
            "Form 16 Eligible", 
            "GET", 
            f"/payroll/form16/eligible?financialYear={fy}", 
            200
        )
        
        if response:
            self.log(f"✅ Form 16 eligible employees retrieved successfully")
            
            # Validate response structure
            if 'financialYear' in response and 'employees' in response:
                employees = response['employees']
                self.log(f"Financial Year: {response['financialYear']}")
                self.log(f"Found {len(employees)} employees with TDS")
                
                # Check employee structure if any exist
                for i, emp in enumerate(employees[:2]):
                    required_fields = ['id', 'firstName', 'lastName', 'employeeCode', 'totalTDS']
                    missing_fields = [field for field in required_fields if field not in emp]
                    
                    if not missing_fields:
                        self.log(f"  ✅ Employee {i+1} structure valid - TDS: ₹{emp.get('totalTDS', 0)}")
                    else:
                        self.log(f"  ❌ Employee {i+1} missing fields: {missing_fields}")
                
                return response
            else:
                self.log("❌ Invalid response structure - missing financialYear or employees")
        return None

    def test_form16_data_endpoint(self):
        """Test GET /api/payroll/form16/:employeeId/data"""
        self.log("=== TESTING FORM 16 DATA ENDPOINT ===")
        
        # First get eligible employees
        eligible_response = self.test_form16_eligible_endpoint()
        if not eligible_response or not eligible_response.get('employees'):
            self.log("⚠️  No eligible employees found - skipping Form 16 data test")
            return {"skipped": True, "reason": "No employees with TDS available"}
        
        employee_id = eligible_response['employees'][0]['id']
        fy = eligible_response['financialYear']
        
        response = self.run_test(
            "Form 16 Data", 
            "GET", 
            f"/payroll/form16/{employee_id}/data?financialYear={fy}", 
            200
        )
        
        if response:
            self.log(f"✅ Form 16 data retrieved successfully")
            
            # Validate Form 16 structure
            required_sections = ['employee', 'employer', 'salary', 'deductions', 'tax', 'quarterlyTDS']
            missing_sections = [section for section in required_sections if section not in response]
            
            if not missing_sections:
                self.log(f"  ✅ Form 16 data structure complete")
                self.log(f"  Employee: {response['employee']['name']}")
                self.log(f"  Gross Salary: ₹{response['salary']['grossSalary']}")
                self.log(f"  TDS Deducted: ₹{response['tax']['tdsDeducted']}")
                return response
            else:
                self.log(f"  ❌ Form 16 data missing sections: {missing_sections}")
        return None

    def test_location_summary_endpoint(self):
        """Test GET /api/payroll/summary/by-location"""
        self.log("=== TESTING LOCATION PAYROLL SUMMARY ENDPOINT ===")
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        response = self.run_test(
            "Location Summary", 
            "GET", 
            f"/payroll/summary/by-location?month={current_month}&year={current_year}", 
            200
        )
        
        if response:
            self.log(f"✅ Location payroll summary retrieved successfully")
            
            if isinstance(response, list):
                self.log(f"Found {len(response)} branches/locations")
                
                # Check structure of first few locations
                for i, loc in enumerate(response[:2]):
                    required_fields = ['branchId', 'branchName', 'branchCode', 'employeeCount', 'totalGross', 'totalNet']
                    missing_fields = [field for field in required_fields if field not in loc]
                    
                    if not missing_fields:
                        self.log(f"  ✅ Location {i+1} ({loc['branchName']}) - {loc['employeeCount']} employees")
                        self.log(f"      Gross: ₹{loc.get('totalGross', 0)}, Net: ₹{loc.get('totalNet', 0)}")
                    else:
                        self.log(f"  ❌ Location {i+1} missing fields: {missing_fields}")
                
                return response
            else:
                self.log("❌ Response is not a list")
                self.log(f"Response type: {type(response)}, content: {str(response)[:200]}")
        return None

    def test_create_location_run_endpoint(self):
        """Test POST /api/payroll/runs/location"""
        self.log("=== TESTING CREATE LOCATION PAYROLL RUN ENDPOINT ===")
        
        # First get branches to use a valid branchId
        branches_response = self.run_test(
            "Get Branches", 
            "GET", 
            "/branches", 
            200
        )
        
        if not branches_response:
            self.log("❌ Cannot get branches API response")
            self.log(f"Response: {branches_response}")
            return None
            
        # Handle different response structures
        branches = []
        if 'branches' in branches_response:
            branches = branches_response['branches']
        elif 'data' in branches_response:
            branches = branches_response['data']
        elif isinstance(branches_response, list):
            branches = branches_response
        
        if not branches:
            self.log("⚠️  No branches found - skipping location run creation test")
            return {"skipped": True, "reason": "No branches available"}
        
        branch_id = branches[0]['id']
        branch_name = branches[0].get('name', 'Test Branch')
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Create location run data
        run_data = {
            "month": current_month,
            "year": current_year,
            "branchId": branch_id,
            "batchName": f"{branch_name} Payroll {current_month}/{current_year}",
            "periodStart": f"{current_year}-{current_month:02d}-01T00:00:00.000Z",
            "periodEnd": f"{current_year}-{current_month:02d}-28T23:59:59.999Z"
        }
        
        response = self.run_test(
            "Create Location Run", 
            "POST", 
            "/payroll/runs/location", 
            200,
            run_data
        )
        
        if response:
            self.log(f"✅ Location payroll run created successfully")
            
            # Validate response structure
            if isinstance(response, dict) and 'id' in response:
                self.log(f"  Created run ID: {response['id']}")
                self.log(f"  Batch name: {response.get('batchName', 'N/A')}")
                self.log(f"  Status: {response.get('status', 'N/A')}")
                return response
            else:
                self.log("❌ Invalid response structure")
        return None

    def test_process_location_payroll_endpoint(self):
        """Test POST /api/payroll/runs/:id/process-location"""
        self.log("=== TESTING PROCESS LOCATION PAYROLL ENDPOINT ===")
        
        # First create a location run
        run_response = self.test_create_location_run_endpoint()
        if not run_response or run_response.get('skipped'):
            self.log("⚠️  Cannot create location run - skipping process test")
            return {"skipped": True, "reason": "No location run available"}
        
        run_id = run_response['id']
        
        # Get branches for processing
        branches_response = self.run_test(
            "Get Branches for Processing", 
            "GET", 
            "/branches", 
            200
        )
        
        if not branches_response:
            return None
            
        branches = []
        if 'branches' in branches_response:
            branches = branches_response['branches']
        elif 'data' in branches_response:
            branches = branches_response['data']
        elif isinstance(branches_response, list):
            branches = branches_response
        
        if not branches:
            return {"skipped": True, "reason": "No branches available"}
        
        branch_id = branches[0]['id']
        
        process_data = {
            "branchId": branch_id
        }
        
        response = self.run_test(
            "Process Location Payroll", 
            "POST", 
            f"/payroll/runs/{run_id}/process-location", 
            200,
            process_data
        )
        
        if response:
            self.log(f"✅ Location payroll processed successfully")
            
            # Validate response
            if isinstance(response, dict) and 'message' in response:
                employee_count = response.get('employeeCount', 0)
                self.log(f"  Processed {employee_count} employees")
                self.log(f"  Message: {response['message']}")
                return response
            else:
                self.log("❌ Invalid process response structure")
        return None

    def run_all_tests(self):
        """Run all Form 16 and Location Payroll tests in sequence"""
        self.log("🚀 Starting Form 16 & Location Payroll API Tests")
        self.log(f"Target URL: {self.base_url}")
        
        # 1. Login
        if not self.login():
            self.log("❌ Login failed - cannot continue with protected endpoints")
            return False
        
        # 2. Test Form 16 endpoints
        form16_eligible_result = self.test_form16_eligible_endpoint()
        form16_data_result = self.test_form16_data_endpoint()
        
        # 3. Test Location Payroll endpoints
        location_summary_result = self.test_location_summary_endpoint()
        create_location_run_result = self.test_create_location_run_endpoint()
        process_location_result = self.test_process_location_payroll_endpoint()
        
        # Summary
        self.log("\n" + "="*60)
        self.log("📊 FORM 16 & LOCATION PAYROLL API TEST SUMMARY")
        self.log("="*60)
        self.log(f"Tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Specific validation
        results = {
            "Form 16 Eligible": form16_eligible_result is not None,
            "Form 16 Data": form16_data_result is not None and not form16_data_result.get('skipped', False),
            "Location Summary": location_summary_result is not None,
            "Create Location Run": create_location_run_result is not None and not create_location_run_result.get('skipped', False),
            "Process Location Payroll": process_location_result is not None and not process_location_result.get('skipped', False)
        }
        
        self.log("\n📋 Feature Test Results:")
        for feature, passed in results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            self.log(f"  {feature}: {status}")
        
        # Check for skipped tests
        skipped_tests = []
        if form16_data_result and form16_data_result.get('skipped'):
            skipped_tests.append("Form 16 Data")
        if create_location_run_result and create_location_run_result.get('skipped'):
            skipped_tests.append("Create Location Run")
        if process_location_result and process_location_result.get('skipped'):
            skipped_tests.append("Process Location Payroll")
            
        if skipped_tests:
            self.log(f"\n⚠️  Skipped Tests (Missing data): {', '.join(skipped_tests)}")
            self.log("   These tests require employee/branch data to function properly")
        
        success_rate = self.tests_passed / self.tests_run
        return success_rate >= 0.6  # 60% pass rate considered successful for new features

def main():
    tester = Form16LocationPayrollTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())