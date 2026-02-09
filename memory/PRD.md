# ApexTime Attendance System - PRD

## Original Problem Statement
Today attendance black card showing wrong numbers - should be above 300, showing 4.

## Architecture
- **Frontend**: React/TypeScript with Vite, Tailwind CSS
- **Backend**: Node.js/TypeScript with Express, Prisma ORM
- **Database**: PostgreSQL
- **Proxy**: FastAPI Python server proxying to Node.js backend

## Core Requirements
- Multi-tenant attendance management system
- Real-time attendance tracking
- Dashboard with employee counts, attendance stats, pending leaves

## What's Been Implemented (2026-02-09)

### Bug Fix: Today Attendance Count
**Issue**: The "Today Attendance" card was showing only 4 employees as present instead of 300+.

**Root Cause**: The dashboard query was filtering attendance logs by status `['Present', 'present', 'Half Day', 'half day', 'Late', 'late']` but was NOT including `'Shift Incomplete'` status.

Employees who have:
- Checked IN but not checked OUT yet
- Have only one punch for the day

...are marked with status `'Shift Incomplete'` in the system. These employees were being excluded from the "present" count, causing the number to be artificially low.

**Fix Applied**:
1. Updated `/app/backend/src/routes/dashboard.ts` to include `'Shift Incomplete'` status in present count
2. Applied fix to:
   - Today's attendance count (line ~118-127)
   - Yesterday's attendance count (line ~101-113)
   - Chart data present count (line ~290-340)

**Files Modified**:
- `/app/backend/src/routes/dashboard.ts`

## Prioritized Backlog

### P0 (Critical)
- ✅ Fix Today Attendance count (COMPLETED)

### P1 (High)
- Validate attendance data sync with biometric devices
- Test with production data to confirm fix works with real employee counts

### P2 (Medium)
- Add better status normalization (case-insensitive matching)
- Add dashboard data caching for performance

## Next Tasks
1. Deploy to production and verify fix with real data
2. Monitor attendance counts to ensure accuracy
