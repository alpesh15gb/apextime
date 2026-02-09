import requests
import sys
import json
from datetime import datetime

class PayrollAdjustmentsTester:
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

    def test_bank_formats_endpoint(self):
        """Test GET /api/payroll-adjustments/bank-formats"""
        self.log("=== TESTING BANK FORMATS ENDPOINT ===")
        
        response = self.run_test(
            "Bank Formats", 
            "GET", 
            "/payroll-adjustments/bank-formats", 
            200
        )
        
        if response:
            self.log(f"✅ Bank formats retrieved successfully")
            
            # Validate response structure
            if isinstance(response, list):
                self.log(f"Found {len(response)} bank formats")
                
                # Check for required bank formats
                expected_banks = ['HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK']
                found_banks = [fmt.get('id', '') for fmt in response]
                
                for bank in expected_banks:
                    if bank in found_banks:
                        self.log(f"  ✅ {bank} format available")
                    else:
                        self.log(f"  ❌ {bank} format missing")
                
                # Validate format structure
                for fmt in response[:3]:  # Check first 3 formats
                    if all(key in fmt for key in ['id', 'name', 'description']):
                        self.log(f"  ✅ Format structure valid: {fmt['name']}")
                    else:
                        self.log(f"  ❌ Invalid format structure: {fmt}")
                
                return response
            else:
                self.log("❌ Response is not a list")
        return None

    def test_get_reimbursements_endpoint(self):
        """Test GET /api/payroll-adjustments/reimbursements"""
        self.log("=== TESTING GET REIMBURSEMENTS ENDPOINT ===")
        
        response = self.run_test(
            "Get Reimbursements", 
            "GET", 
            "/payroll-adjustments/reimbursements", 
            200
        )
        
        if response:
            self.log(f"✅ Reimbursements retrieved successfully")
            
            if isinstance(response, list):
                self.log(f"Found {len(response)} reimbursement records")
                
                # Check structure of first few records
                for i, reimb in enumerate(response[:2]):
                    if isinstance(reimb, dict):
                        required_fields = ['id', 'employeeId', 'type', 'amount', 'status']
                        missing_fields = [field for field in required_fields if field not in reimb]
                        
                        if not missing_fields:
                            self.log(f"  ✅ Reimbursement {i+1} structure valid")
                        else:
                            self.log(f"  ❌ Reimbursement {i+1} missing fields: {missing_fields}")
                
                return response
            else:
                self.log("❌ Response is not a list")
        return None

    def test_create_reimbursement_endpoint(self):
        """Test POST /api/payroll-adjustments/reimbursements"""
        self.log("=== TESTING CREATE REIMBURSEMENT ENDPOINT ===")
        
        # First get employees to use a valid employeeId
        employees_response = self.run_test(
            "Get Employees", 
            "GET", 
            "/employees", 
            200
        )
        
        if not employees_response or not employees_response.get('data'):
            self.log("❌ Cannot get employees for reimbursement test")
            return None
        
        employees = employees_response['data']
        if not employees:
            self.log("❌ No employees found for reimbursement test")
            return None
        
        employee_id = employees[0]['id']
        self.log(f"Using employee ID: {employee_id}")
        
        # Create test reimbursement
        reimbursement_data = {
            "employeeId": employee_id,
            "type": "TRAVEL",
            "amount": 1500.00,
            "billDate": "2025-01-15",
            "billNumber": "TEST001",
            "description": "Test travel reimbursement"
        }
        
        response = self.run_test(
            "Create Reimbursement", 
            "POST", 
            "/payroll-adjustments/reimbursements", 
            200,
            reimbursement_data
        )
        
        if response:
            self.log(f"✅ Reimbursement created successfully")
            
            # Validate response structure
            if isinstance(response, dict) and 'id' in response:
                self.created_reimbursement_id = response['id']
                self.log(f"  Created reimbursement ID: {self.created_reimbursement_id}")
                
                # Validate created data
                if response.get('amount') == 1500.0 and response.get('type') == 'TRAVEL':
                    self.log(f"  ✅ Reimbursement data matches input")
                else:
                    self.log(f"  ❌ Reimbursement data mismatch")
                
                return response
            else:
                self.log("❌ Invalid response structure")
        return None

    def test_add_arrears_endpoint(self):
        """Test POST /api/payroll-adjustments/arrears"""
        self.log("=== TESTING ADD ARREARS ENDPOINT ===")
        
        # Get employees for arrears test
        employees_response = self.run_test(
            "Get Employees for Arrears", 
            "GET", 
            "/employees", 
            200
        )
        
        if not employees_response or not employees_response.get('data'):
            self.log("❌ Cannot get employees for arrears test")
            return None
        
        employees = employees_response['data']
        if not employees:
            self.log("❌ No employees found for arrears test")
            return None
        
        employee_id = employees[0]['id']
        self.log(f"Using employee ID: {employee_id}")
        
        # Create test arrears
        arrears_data = {
            "employeeId": employee_id,
            "amount": 5000.00,
            "reason": "Salary revision with retrospective effect from Dec 2024",
            "forMonth": 12,
            "forYear": 2024
        }
        
        response = self.run_test(
            "Add Arrears", 
            "POST", 
            "/payroll-adjustments/arrears", 
            200,
            arrears_data
        )
        
        if response:
            self.log(f"✅ Arrears added successfully")
            
            # Validate response
            if isinstance(response, dict) and response.get('success'):
                total_arrears = response.get('totalArrears', 0)
                self.log(f"  Total arrears for employee: ₹{total_arrears}")
                return response
            else:
                self.log("❌ Invalid arrears response structure")
        return None

    def test_add_incentive_endpoint(self):
        """Test POST /api/payroll-adjustments/incentives"""
        self.log("=== TESTING ADD INCENTIVE ENDPOINT ===")
        
        # Get employees for incentive test
        employees_response = self.run_test(
            "Get Employees for Incentive", 
            "GET", 
            "/employees", 
            200
        )
        
        if not employees_response or not employees_response.get('data'):
            self.log("❌ Cannot get employees for incentive test")
            return None
        
        employees = employees_response['data']
        if not employees:
            self.log("❌ No employees found for incentive test")
            return None
        
        employee_id = employees[0]['id']
        self.log(f"Using employee ID: {employee_id}")
        
        # Create test incentive
        incentive_data = {
            "employeeId": employee_id,
            "amount": 10000.00,
            "reason": "Q4 Performance Bonus - Exceeded targets"
        }
        
        response = self.run_test(
            "Add Incentive", 
            "POST", 
            "/payroll-adjustments/incentives", 
            200,
            incentive_data
        )
        
        if response:
            self.log(f"✅ Incentive added successfully")
            
            # Validate response
            if isinstance(response, dict) and response.get('success'):
                total_incentives = response.get('totalIncentives', 0)
                self.log(f"  Total incentives for employee: ₹{total_incentives}")
                return response
            else:
                self.log("❌ Invalid incentive response structure")
        return None

    def run_all_tests(self):
        """Run all payroll adjustments tests in sequence"""
        self.log("🚀 Starting Payroll Adjustments API Tests")
        self.log(f"Target URL: {self.base_url}")
        
        # 1. Login
        if not self.login():
            self.log("❌ Login failed - cannot continue with protected endpoints")
            return False
        
        # 2. Test bank formats endpoint
        bank_formats_result = self.test_bank_formats_endpoint()
        
        # 3. Test get reimbursements endpoint
        get_reimbursements_result = self.test_get_reimbursements_endpoint()
        
        # 4. Test create reimbursement endpoint
        create_reimbursement_result = self.test_create_reimbursement_endpoint()
        
        # 5. Test add arrears endpoint
        add_arrears_result = self.test_add_arrears_endpoint()
        
        # 6. Test add incentive endpoint
        add_incentive_result = self.test_add_incentive_endpoint()
        
        # Summary
        self.log("\n" + "="*60)
        self.log("📊 PAYROLL ADJUSTMENTS API TEST SUMMARY")
        self.log("="*60)
        self.log(f"Tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Specific validation
        results = {
            "Bank Formats": bank_formats_result is not None,
            "Get Reimbursements": get_reimbursements_result is not None,
            "Create Reimbursement": create_reimbursement_result is not None,
            "Add Arrears": add_arrears_result is not None,
            "Add Incentive": add_incentive_result is not None
        }
        
        self.log("\n📋 Feature Test Results:")
        for feature, passed in results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            self.log(f"  {feature}: {status}")
        
        success_rate = self.tests_passed / self.tests_run
        return success_rate >= 0.8  # 80% pass rate considered successful

def main():
    tester = AttendanceCountingTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())