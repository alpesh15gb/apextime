# ApexTime Payroll - PRD

## Original Problem Statement
- Punches not showing properly - need First In & Last Out logic
- Wrong calculations in attendance
- Complete revamp of Reports section with charts, exports, filters
- Monthly report printout in vertical (portrait A4) matching physical register format
- Recalculation endpoint for existing attendance data

## Architecture
- **Backend**: Node.js/Express + Prisma ORM + PostgreSQL
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Chart.js
- **Proxy**: Python FastAPI proxy on port 8001 → Node.js on port 5001
- **Database**: PostgreSQL with 8 sample employees, 30 days attendance data

## What's Been Implemented

### Session 1 (Feb 8, 2026)
1. **Fixed Punch Logic (First In / Last Out)**
   - attendanceProcessingService.ts & attendanceCalculationService.ts rewritten
   - Working hours = Last OUT - First IN
   - Handles edge cases: single punch, duplicate timestamps, >24h cap

2. **Reports Section Complete Revamp**
   - Tabs: Daily / Weekly / Monthly
   - Charts: Doughnut (status), Bar (department), Line (trend)
   - Filters: Date, Department, Branch, Location
   - Export: PDF and Excel
   - Summary cards with 6 key metrics

3. **Recalculate Endpoint**
   - POST /api/attendance/recalculate - re-applies First In/Last Out logic
   - Button in Reports UI with confirmation dialog

4. **Monthly Print View (Portrait A4)**
   - Days as ROWS (1-31 vertically), Employees as COLUMNS (In/Out)
   - 4 employees per page, auto-paginated
   - Summary: Duration, Present, Absent per employee
   - Sundays highlighted, proper print CSS

## User Personas
- **Admin**: Full access to all reports, filters, exports, recalculation
- **Manager**: Department-level reports
- **Employee**: Self-attendance view

## Backlog
- P0: Custom date range printout for payroll cycles
- P1: Overtime report, department grouping in printout
- P2: Scheduled email reports, mobile responsive
