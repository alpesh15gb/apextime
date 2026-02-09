# ApexTime - HRMS & Payroll System PRD

## Original Problem Statement
User requested:
1. "Black Card In Dashboard Should attendance even one punch" - Dashboard's Today Attendance count should include employees who have only one punch
2. Review payroll system and fix what's missing
3. Industry-grade robust payroll with: Arrears, Reimbursements, Incentives
4. Multiple bank export formats

## Architecture & Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Proxy**: Python FastAPI proxy layer

## User Personas
1. **HR Admin**: Manages employees, payroll, attendance configuration
2. **Manager**: Views reports, approves leaves
3. **Employee**: Views own attendance and payslips
4. **Super Admin**: Multi-tenant management

## Core Requirements (Static)
- Multi-tenant SaaS architecture
- Biometric device integration (iClock, Hikvision)
- Real-time attendance sync
- Payroll calculation with Indian statutory compliance (PF, ESI, PT, TDS)
- Leave management
- Employee management
- Reports & exports

## What's Been Implemented (Feb 9, 2026)

### Session 1 - Single Punch Fix
1. **Single Punch Attendance Counting** ✅
   - Changed `logSyncService.ts`: Single punch now marks status as "Present" instead of "Shift Incomplete"
   - Changed `attendanceCalculationService.ts`: Same fix for calculation service
   - Dashboard already included "Shift Incomplete" in status array for counting

2. **Payroll Engine Backward Compatibility** ✅
   - Updated `payrollEngine.ts`: Now counts `shift_incomplete` status as full paid day
   - Added proper industry-grade status handling comments

3. **Attendance Page UI** ✅
   - Updated badge logic to show "Checked In" for single-punch records (firstIn && !lastOut)
   - Added "Half Day" status badge
   - Improved late/early departure time display

### Session 2 - Payroll Enhancements
4. **Reimbursements Module** ✅
   - Create reimbursement claims (Travel, Medical, Food, Internet, Mobile, Fuel, etc.)
   - Approve/Reject workflow
   - Automatic integration with payroll processing

5. **Arrears Management** ✅
   - Add salary adjustments for previous months
   - Tracks reason and effective period
   - Auto-adds to next payroll run

6. **Incentives Management** ✅
   - Add performance bonuses, spot awards, referral bonus, project bonus
   - Track amount and reason
   - Auto-adds to next payroll run

7. **Multiple Bank Export Formats** ✅
   - Generic CSV
   - HDFC Bank format
   - ICICI Bank format
   - SBI CMP format
   - Axis Bank format
   - Kotak Mahindra format
   - Yes Bank format
   - IDFC First Bank format

### Files Created/Modified
- `/app/backend/src/routes/payrollAdjustments.ts` (NEW)
- `/app/backend/src/index.ts` (Updated - new route)
- `/app/frontend/src/pages/PayrollAdjustments.tsx` (NEW)
- `/app/frontend/src/App.tsx` (Updated - new route)
- `/app/frontend/src/components/Layout.tsx` (Updated - navigation)
- `/app/frontend/src/services/api.ts` (Updated - new API methods)
- `/app/backend/src/services/logSyncService.ts`
- `/app/backend/src/services/attendanceCalculationService.ts`
- `/app/backend/src/services/payrollEngine.ts`
- `/app/frontend/src/pages/Attendance.tsx`

## Prioritized Backlog

### P0 - Critical (Done)
- [x] Single punch counts as Present for attendance
- [x] Dashboard counts single punch employees
- [x] Payroll counts all present/shift_incomplete statuses
- [x] Reimbursements module
- [x] Arrears management
- [x] Incentives management
- [x] Bank export formats (8 banks)

### P1 - High Priority
- [ ] Payroll review sheet improvements
- [ ] Overtime calculation refinements
- [ ] Leave balance integration with payroll
- [ ] Bulk arrears upload via Excel

### P2 - Medium Priority  
- [ ] Attendance regularization workflow
- [ ] Bulk payroll reprocessing for historical data
- [ ] Mobile app for employee self-service
- [ ] More bank formats as needed

### P3 - Nice to Have
- [ ] WhatsApp integration for payslip delivery
- [ ] Advanced reporting dashboards
- [ ] Shift scheduling optimization

## Next Tasks
1. Test payroll run with arrears/incentives to verify amounts flow correctly
2. Add reimbursement approval workflow with email notifications
3. Consider adding bulk import for arrears (Excel upload)
