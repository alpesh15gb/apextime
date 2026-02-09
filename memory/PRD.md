# ApexTime - HRMS & Payroll System PRD

## Original Problem Statement
User requested:
1. "Black Card In Dashboard Should attendance even one punch" - Dashboard's Today Attendance count should include employees who have only one punch
2. Review payroll system and fix what's missing
3. Industry-grade robust payroll

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

### Bug Fixes
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

### Files Modified
- `/app/backend/src/services/logSyncService.ts`
- `/app/backend/src/services/attendanceCalculationService.ts`
- `/app/backend/src/services/payrollEngine.ts`
- `/app/frontend/src/pages/Attendance.tsx`
- `/app/backend/prisma/schema.prisma` (binary targets)

## Prioritized Backlog

### P0 - Critical (Done)
- [x] Single punch counts as Present for attendance
- [x] Dashboard counts single punch employees
- [x] Payroll counts all present/shift_incomplete statuses

### P1 - High Priority
- [ ] Payroll review sheet improvements
- [ ] Overtime calculation refinements
- [ ] Leave balance integration with payroll

### P2 - Medium Priority  
- [ ] Attendance regularization workflow
- [ ] Bulk payroll reprocessing for historical data
- [ ] Mobile app for employee self-service

### P3 - Nice to Have
- [ ] WhatsApp integration for payslip delivery
- [ ] Advanced reporting dashboards
- [ ] Shift scheduling optimization

## Next Tasks
1. Test with production data to verify single-punch employees now show in Dashboard count
2. Run payroll processing and verify single-punch days count as paid
3. Review any existing "Shift Incomplete" records and potentially batch-update them to "Present"
