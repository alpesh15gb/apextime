# USB Attendance Import Guide

## 📋 Overview

This script imports historical attendance data from USB `.dat` files exported from biometric devices.

## 📁 File Format

The `.dat` file should have tab-separated values:
```
[EmployeeID]  [Timestamp]           [1]  [255]  [PunchType]  [0]
HO033         2025-12-30 14:13:42   1    255    1            0
HO033         2025-12-30 14:13:43   1    255    15           0
```

**Punch Types:**
- `1` = Check-in (IN)
- `15` = Check-out (OUT)

## 🚀 Usage

### Step 1: Get Your Tenant ID

```bash
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log('Tenants:', JSON.stringify(tenants, null, 2));
  await prisma.\$disconnect();
})();
"
```

### Step 2: Upload the .dat file

Copy your USB `.dat` file to the server:
```bash
# On your local machine
scp attendance.dat root@your-server:/docker/apextime-saas/backend/scripts/
```

Or use WinSCP/FileZilla to upload to: `/docker/apextime-saas/backend/scripts/`

### Step 3: Run the Import

```bash
cd /docker/apextime-saas/backend
docker-compose exec backend node scripts/import_usb_attendance.js scripts/attendance.dat YOUR_TENANT_ID
```

**Example:**
```bash
docker-compose exec backend node scripts/import_usb_attendance.js scripts/attendance.dat 123e4567-e89b-12d3-a456-426614174000
```

## 📊 What It Does

1. ✅ Parses the `.dat` file
2. ✅ Maps device user IDs to employees
3. ✅ Converts timestamps to IST
4. ✅ Skips duplicate punches
5. ✅ Creates attendance records
6. ✅ Shows unmapped employee IDs

## ⚠️ Important Notes

### Employee Mapping

The script tries to match device IDs in multiple ways:
- Exact match
- Case-insensitive match
- Without leading zeros (e.g., `001` → `1`)

**If employees are not found:**
1. Check their `deviceUserId` in the database
2. Update employee records with correct device IDs
3. Re-run the import

### Unmapped IDs

If you see unmapped IDs like `91`, `96`, `H0003`:
- These are employees not in your database
- Add them first, then re-run the import

## 🔍 Troubleshooting

### "File not found"
Make sure the file path is correct and accessible inside the Docker container.

### "Unmapped Employee IDs"
Run this to see all employee device IDs:
```bash
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const employees = await prisma.employee.findMany({ 
    select: { deviceUserId: true, name: true } 
  });
  console.log(JSON.stringify(employees, null, 2));
  await prisma.\$disconnect();
})();
"
```

### Duplicates
The script automatically skips duplicate punches (same employee + same timestamp).

## 📈 After Import

Check imported data:
```bash
docker-compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const count = await prisma.attendance.count({ where: { source: 'USB_IMPORT' } });
  console.log('USB Imported Records:', count);
  await prisma.\$disconnect();
})();
"
```

## 🎯 Example Output

```
🚀 Starting USB Attendance Import...
📁 File: scripts/attendance.dat
🏢 Tenant: 123e4567-e89b-12d3-a456-426614174000

📊 Total lines: 4500

✅ Parsed 4500 punches
❌ Errors: 0

👥 Found 85 employees in database

🔄 Importing punches...

   Imported 100 punches...
   Imported 200 punches...
   ...
   Imported 4200 punches...

✅ Import Complete!

📊 Summary:
   Total Punches: 4500
   ✅ Imported: 4200
   ⏭️  Skipped (duplicates): 250
   ❌ Unmapped IDs: 5

⚠️  Unmapped Employee IDs:
   - 91
   - 96
   - H0003
   - HO100
   - HO101
```
