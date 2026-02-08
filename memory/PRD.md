# ApexTime Attendance & Payroll App - PRD

## Original Problem Statement
- Attendance App miscalculating attendance due to timezone handling issues
- Biometric devices send data in IST but PostgreSQL stores in UTC
- Multiple IST offset calculations causing miscalculations
- Reports section not respecting date and location filters

## Architecture
- **Backend**: Node.js/TypeScript with Express
- **Frontend**: React with Vite  
- **Database**: PostgreSQL with Prisma ORM
- **Biometric Integration**: SQL Server connection to biometric devices

## User Personas
1. **Admin**: Manages company settings, employees, attendance, payroll
2. **HR**: Views reports, manages leaves, processes payroll
3. **Employee**: Views own attendance (via linked account)

## Core Requirements (Static)
1. Proper IST timezone handling for attendance calculation
2. Night shift support (punches before 5 AM belong to previous day)
3. Reports must respect all filters (date, location, branch, department)
4. Real-time attendance sync from biometric devices

---

## What's Been Implemented - Feb 8, 2026

### Timezone Handling Fix (CRITICAL)
**Files Modified:**
- `/app/backend/src/services/logSyncService.ts`

**Changes:**
1. Created centralized `getLogicalDateFromPunch()` function
2. Removed incorrect IST_OFFSET (5.5 * 60 * 60 * 1000) calculations
3. Server is IST, devices send IST - no conversion needed
4. Punches before 5 AM now correctly assigned to previous day's shift

**Logic:**
```typescript
function getLogicalDateFromPunch(punchTime: Date) {
  const hour = punchTime.getHours(); // Local IST hour
  if (hour < 5) {
    // Belongs to PREVIOUS day's shift
    return previousDay;
  }
  return sameDay;
}
```

### Reports Filter Fix (HIGH)
**Files Modified:**
- `/app/backend/src/routes/reports.ts`

**Changes:**
1. Fixed location filter to cascade to employees from branches
2. Added proper date parsing for @db.Date columns
3. Added debug logging for filter tracking

**Logic:**
```typescript
if (locationId) {
  employeeWhere.OR = [
    { locationId: locationId },
    { branch: { locationId: locationId } }
  ];
}
```

### Frontend IST Display Fix
**Files Modified:**
- `/app/frontend/src/pages/Attendance.tsx`

**Changes:**
1. Added `timeZone: 'Asia/Kolkata'` to all date/time display
2. Consistent IST format across attendance table

### New Attendance Processing Service
**Files Created:**
- `/app/backend/src/services/attendanceProcessingService.ts`

**Purpose:** Clean implementation of attendance calculation with proper timezone handling

---

## Prioritized Backlog

### P0 (Critical)
- [ ] Database connection required (DATABASE_URL not configured in environment)

### P1 (High)
- [ ] Test attendance calculation with real biometric data
- [ ] Verify night shift attendance is correctly calculated

### P2 (Medium)
- [ ] Add unit tests for `getLogicalDateFromPunch()`
- [ ] Add integration tests for reports filtering

---

## Next Tasks
1. Configure DATABASE_URL environment variable
2. Test with real attendance data to verify timezone fixes
3. Verify reports show correct data with location filters
4. Test night shift scenarios (10 PM - 6 AM shifts)
