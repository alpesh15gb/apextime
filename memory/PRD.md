# ApexTime Payroll - PRD

## Original Problem Statement
- Punches not showing properly - need First In & Last Out logic
- Wrong calculations in attendance  
- Complete revamp of Reports section
- Monthly report printout matching physical register format
- Custom date range with department/branch grouping

## Architecture
- **Backend**: Node.js/Express + Prisma ORM + PostgreSQL
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Chart.js
- **Proxy**: Python FastAPI on port 8001 → Node.js on port 5001
- **Database**: PostgreSQL (3 departments, 8 employees, 30 days data)

## What's Been Implemented

### Session 1 (Feb 8, 2026)
1. **Fixed Punch Logic** - First In / Last Out with robust edge case handling
2. **Reports Revamp** - Daily/Weekly/Monthly tabs with charts, filters, export
3. **Recalculate Endpoint** - POST /api/attendance/recalculate

### Session 2 (Feb 8, 2026)  
4. **Custom Date Range Report** - GET /api/attendance/date-range-report
   - Accepts startDate, endDate, groupBy (department|branch)
   - Returns employees grouped by department or branch with daily In/Out data
5. **Horizontal Print Register**
   - Days 1-31 as horizontal columns, employees as rows
   - Department-wise / Branch-wise grouping (separate table per group)
   - Custom From/To date picker + Generate button
   - Summary: P (Present), A (Absent), Hrs per employee
   - Sunday highlighting, A4 Landscape, auto-pagination
   - Print/Save PDF button
6. **Department Setup** - Engineering, Human Resources, Finance with employee assignments

## Testing Status
- All tests passed (100% backend, 100% frontend) across 3 iterations

## Backlog
- P1: Add overtime and leave columns to register printout
- P1: Branch data assignment for branch-wise reports
- P2: Scheduled auto-email reports
- P2: Mobile responsive optimization
