# PAYROLL REDESIGN - PROGRESS REPORT

**Date:** 2026-02-03  
**Status:** IN PROGRESS

---

## ✅ COMPLETED (Phase 1 & 2)

### **1. Database Schema Enhancements** ✅
- ✅ Enhanced `Payroll` model with:
  - TDS, Gratuity, Leave Encashment fields
  - Bonus, Incentives, Reimbursements, Arrears
  - State tracking for PT
  - Hold/Freeze functionality
  - Approval workflow fields
  
- ✅ Added new models:
  - `CTCStructure` - Salary structure management
  - `ReimbursementEntry` - Expense claims
  - `SalaryRevision` - Audit trail for salary changes
  - `TDSDeclaration` - Tax planning (80C, 80D, etc.)
  
- ✅ Enhanced `Employee` model:
  - Added `state`, `city`, `pincode` for PT calculation
  
- ✅ All reverse relations added to `Tenant` and `Employee`

### **2. Statutory Calculators** ✅
- ✅ **TDS Calculator** (`tdsCalculator.ts`)
  - Supports Old & New Tax Regimes (FY 2025-26)
  - Section 80C, 80D, 80E, 80G, Section 24
  - HRA exemption calculation
  - Monthly TDS projection
  
- ✅ **PT Calculator** (`ptCalculator.ts`)
  - 12 states covered (KA, MH, WB, GJ, AP, TS, MP, AS, CG, OR, JH, TN)
  - Slab-based calculations
  - Special cases (MH February PT)

---

## 🔄 IN PROGRESS (Phase 3)

### **3. Enhanced Payroll Engine**
Need to update `payrollEngine.ts` to:
- ✅ Use `PTCalculator` instead of hardcoded PT
- ⏳ Integrate `TDSCalculator`
- ⏳ Auto-fetch and deduct active loans
- ⏳ Include approved reimbursements
- ⏳ Calculate gratuity accrual (4.81% of Basic)
- ⏳ Handle leave encashment
- ⏳ Process bonus/incentives
- ⏳ Support arrears

---

## 📋 PENDING (Phase 4 & 5)

### **4. API Routes**
Need to create/update:
- ⏳ `/api/payroll/reimbursements` - CRUD for reimbursements
- ⏳ `/api/payroll/ctc-structure` - Manage CTC
- ⏳ `/api/payroll/salary-revisions` - Track revisions
- ⏳ `/api/payroll/tds-declarations` - Employee tax declarations
- ⏳ `/api/payroll/form16` - Generate Form 16
- ⏳ `/api/payroll/pf-ecr` - PF ECR export
- ⏳ `/api/payroll/esi-challan` - ESI challan
- ⏳ `/api/payroll/pt-challan` - PT challan (state-wise)

### **5. Frontend Components**
Need to create/update:
- ⏳ Reimbursement Management Page
- ⏳ CTC Structure Page
- ⏳ TDS Declaration Form
- ⏳ Enhanced Payslip (with loans, assets, reimbursements)
- ⏳ Compliance Reports Dashboard
- ⏳ Form 16 Generator
- ⏳ Salary Revision History

### **6. Reports & Exports**
- ⏳ Form 16 (PDF)
- ⏳ PF ECR (Text file)
- ⏳ ESI Challan (Excel)
- ⏳ PT Challan (State-wise)
- ⏳ Salary Register
- ⏳ Attendance Register

---

## 🚀 NEXT IMMEDIATE STEPS

**Priority Order:**

1. **Update Payroll Engine** (2-3 hours)
   - Integrate TDS & PT calculators
   - Add loan auto-deduction
   - Add reimbursement processing
   - Add gratuity accrual

2. **Database Migration** (30 mins)
   - Run `npx prisma migrate dev` to apply schema changes
   - Regenerate Prisma client

3. **Test Payroll Calculation** (1 hour)
   - Create test payroll run
   - Verify TDS calculation
   - Verify PT (multi-state)
   - Verify loan deduction

4. **Update Frontend Payslip** (1 hour)
   - Show new fields (TDS, Gratuity, Loans, Reimbursements)
   - Add YTD summary
   - Add asset list

5. **Create Reimbursement Module** (2 hours)
   - Backend API
   - Frontend UI
   - Approval workflow

---

## 📊 ESTIMATED TIMELINE

- **Immediate Fixes** (Engine + Migration): 4 hours
- **Frontend Updates**: 3 hours
- **Reimbursement Module**: 2 hours
- **Compliance Reports**: 8 hours
- **Testing & Refinement**: 3 hours

**Total: ~20 hours of development**

---

## ⚠️ BLOCKERS

1. **Schema Migration Required**
   - Need to run migration on production
   - Backup database first
   - Downtime: ~5 minutes

2. **Employee State Data**
   - Need to populate `state` field for existing employees
   - Can be done via CSV import or manual update

3. **TDS Declarations**
   - Employees need to submit tax declarations
   - Can start with default (no deductions) for now

---

## 🎯 USER DECISION REQUIRED

**What should I prioritize next?**

A. **Complete the Payroll Engine** (integrate TDS, PT, loans)  
B. **Run Database Migration** (apply schema changes)  
C. **Create Reimbursement Module** (expense claims)  
D. **Generate Compliance Reports** (Form 16, PF ECR, etc.)

**Recommendation:** Do A → B → Test → Then C & D

Let me know and I'll continue!

---

**Files Modified So Far:**
- ✅ `backend/prisma/schema.prisma`
- ✅ `backend/src/services/tdsCalculator.ts` (NEW)
- ✅ `backend/src/services/ptCalculator.ts` (NEW)
- ✅ `.agent/PAYROLL_AUDIT.md` (NEW)

**Committed to Git:** ✅ Yes (Phase 1 complete)
