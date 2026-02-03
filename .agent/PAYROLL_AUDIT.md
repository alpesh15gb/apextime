# PAYROLL SYSTEM AUDIT & REDESIGN PLAN
**Date:** 2026-02-03  
**Scope:** Complete Payroll Module Overhaul  
**Company Size:** 550 Employees, Multi-State Operations

---

## CURRENT SYSTEM ANALYSIS

### ✅ What's Working:
1. **Core Payroll Engine** (`payrollEngine.ts`)
   - Attendance integration
   - LOP calculation
   - PF/ESI/PT deductions
   - Loan deductions
   - OT calculation

2. **Database Schema** (Prisma)
   - Payroll table with all statutory fields
   - Loan & LoanDeduction tables
   - Asset tables (recently added)
   - PayrollRun for batch processing

3. **Frontend Features**
   - Payroll run creation
   - Employee salary configuration
   - Payslip generation (printable)
   - Bank export (CSV)
   - Tally export (XML)

### ❌ Issues Found:

#### **1. SCHEMA ISSUES:**
- ❌ No TDS calculation/storage
- ❌ No Gratuity tracking
- ❌ No Leave Encashment
- ❌ No Bonus/Incentive fields in Payroll table
- ❌ No state-wise PT tracking (critical for multi-state)
- ❌ No CTC breakdown model
- ❌ Asset assignments not linked to payroll

#### **2. COMPLIANCE GAPS:**
- ❌ No Form 16 generation
- ❌ No PF ECR format export
- ❌ No ESI challan format
- ❌ No PT challan (state-wise)
- ❌ No salary register report
- ❌ No attendance register

#### **3. UI/UX ISSUES:**
- ❌ Payslip missing: Loan EMI breakdown, Asset details, Leave balance
- ❌ No bulk salary upload (CSV import)
- ❌ No salary revision history
- ❌ No arrears calculation
- ❌ No hold/freeze salary feature
- ❌ No reimbursement tracking

#### **4. INTEGRATION GAPS:**
- ❌ Loans not auto-deducting in payroll
- ❌ Assets not showing in payslip
- ❌ Leave encashment not calculated
- ❌ Attendance LOP logic unclear

---

## REDESIGN PLAN

### **PHASE 1: Schema Enhancements** (Priority: HIGH)

#### A. Enhance Payroll Table
```prisma
model Payroll {
  // ... existing fields ...
  
  // Add missing statutory
  tdsDeduction      Float @default(0)
  gratuity          Float @default(0)
  leaveEncashment   Float @default(0)
  bonus             Float @default(0)
  incentives        Float @default(0)
  reimbursements    Float @default(0)
  arrears           Float @default(0)
  
  // State tracking
  stateCode         String? // For PT
  
  // Status tracking
  isHold            Boolean @default(false)
  holdReason        String?
  
  // Relations
  reimbursementEntries ReimbursementEntry[]
}
```

#### B. New Models Needed

**1. CTC Structure**
```prisma
model CTCStructure {
  id          String @id @default(uuid())
  employeeId  String
  employee    Employee @relation(...)
  effectiveFrom DateTime
  
  // CTC Breakdown
  basicSalary Float
  hra         Float
  specialAllowance Float
  conveyance  Float
  medical     Float
  lta         Float
  
  // Employer contributions
  employerPF  Float
  employerESI Float
  gratuity    Float
  
  totalCTC    Float
  totalMonthly Float
  
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
}
```

**2. Reimbursements**
```prisma
model ReimbursementEntry {
  id          String @id @default(uuid())
  tenantId    String
  employeeId  String
  payrollId   String?
  
  type        String // TRAVEL, MEDICAL, FOOD, etc.
  amount      Float
  billDate    DateTime
  billNumber  String?
  attachment  String?
  
  status      String @default("PENDING") // PENDING, APPROVED, PAID
  approvedBy  String?
  approvedAt  DateTime?
  
  createdAt   DateTime @default(now())
}
```

**3. Salary Revision History**
```prisma
model SalaryRevision {
  id          String @id @default(uuid())
  employeeId  String
  oldCTC      Float
  newCTC      Float
  effectiveFrom DateTime
  reason      String?
  approvedBy  String?
  createdAt   DateTime @default(now())
}
```

### **PHASE 2: Payroll Engine Enhancements**

#### A. TDS Calculation (Section 192)
- Implement annual projection
- Old vs New tax regime
- Standard deduction (₹50,000)
- HRA exemption
- 80C deductions
- Monthly TDS calculation

#### B. State-wise PT
- Karnataka: ₹200/month
- Maharashtra: Slab-based
- West Bengal: Slab-based
- Tamil Nadu: ₹0 (abolished)
- Auto-detect from employee state

#### C. Gratuity Accrual
- 4.81% of Basic (15/26 * Basic)
- Track monthly accrual
- Show in payslip

#### D. Leave Encashment
- Integrate with leave balance
- Calculate based on basic
- Add to earnings

### **PHASE 3: Compliance Reports**

#### A. Statutory Reports
1. **Form 16** (PDF)
   - Part A & B
   - Salary breakup
   - Tax computation
   - Deductions claimed

2. **PF ECR** (Text file)
   - Format: UAN|Name|Gross|EPF|EPS|EDLI
   - Monthly upload to EPFO portal

3. **ESI Challan** (Excel)
   - Employee-wise contribution
   - Employer contribution
   - Total payable

4. **PT Challan** (State-wise)
   - Monthly/Quarterly as per state
   - Employee list
   - Total payable

5. **Salary Register** (Excel/PDF)
   - Month-wise
   - Department-wise
   - Earnings & Deductions

#### B. Bank Integration
- NEFT/RTGS bulk file format
- HDFC/ICICI/SBI formats
- Validation before export

### **PHASE 4: UI Enhancements**

#### A. Payroll Dashboard
- Monthly payroll summary
- Pending approvals
- Compliance calendar
- Cost center analysis

#### B. Payslip Improvements
- Add Loan EMI details
- Add Asset assignments
- Add Leave balance
- Add YTD (Year-to-date) summary
- Add QR code for verification

#### C. Bulk Operations
- CSV upload for salary changes
- Bulk bonus/incentive
- Bulk hold/unhold
- Bulk reimbursement approval

### **PHASE 5: Integration**

#### A. Loans Auto-Deduction
- Fetch active loans
- Calculate EMI
- Deduct from payroll
- Update loan balance
- Mark as paid

#### B. Assets in Payslip
- List assigned assets
- Show asset value
- Recovery on resignation

#### C. Attendance Integration
- LOP calculation (already done)
- OT hours (already done)
- Late/Early deductions
- Weekend/Holiday pay

---

## IMPLEMENTATION PRIORITY

### **IMMEDIATE (This Week)**
1. ✅ Fix Loan auto-deduction
2. ✅ Add TDS field to Payroll
3. ✅ Add Bonus/Incentive fields
4. ✅ Show Assets in Payslip
5. ✅ Fix PT state-wise logic

### **SHORT TERM (Next 2 Weeks)**
1. ⏳ Implement TDS calculation
2. ⏳ Add Reimbursement module
3. ⏳ Generate Form 16
4. ⏳ PF ECR export
5. ⏳ ESI challan export

### **MEDIUM TERM (Next Month)**
1. ⏳ CTC Structure module
2. ⏳ Salary Revision tracking
3. ⏳ Gratuity accrual
4. ⏳ Leave encashment
5. ⏳ Arrears calculation

---

## TECHNICAL DEBT

### **Code Quality Issues:**
1. Payroll.tsx is 806 lines (too large)
   - **Solution:** Split into components
     - `PayrollRuns.tsx`
     - `PayrollDetails.tsx`
     - `Payslip.tsx`
     - `EmployeeSalaryConfig.tsx`

2. payrollEngine.ts needs refactoring
   - **Solution:** Separate concerns
     - `attendanceCalculator.ts`
     - `statutoryCalculator.ts`
     - `loanCalculator.ts`
     - `tdsCalculator.ts`

3. No unit tests
   - **Solution:** Add Jest tests for payroll calculations

---

## COMPLIANCE CHECKLIST (Multi-State)

### **Central Acts:**
- ✅ EPF Act, 1952 (12% employee + 12% employer)
- ✅ ESI Act, 1948 (0.75% employee + 3.25% employer)
- ❌ Payment of Gratuity Act, 1972
- ❌ Income Tax Act, 1961 (TDS)
- ❌ Payment of Bonus Act, 1965

### **State Acts:**
- ❌ Professional Tax (varies by state)
- ❌ Shops & Establishments Act
- ❌ Minimum Wages Act (state-wise)

---

## NEXT STEPS

**User Decision Required:**
1. Should I start with **IMMEDIATE** fixes first?
2. Or do you want a **complete redesign** in one go?
3. Any specific compliance report needed urgently?

**Recommendation:**
Start with IMMEDIATE fixes (Loans, TDS fields, Assets in Payslip) to make the system functional, then tackle compliance reports in phases.

---

**End of Audit Report**
