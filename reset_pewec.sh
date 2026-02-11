#!/bin/bash

echo "WARNING: This will DELETE ALL DATA (Employees, Attendance, Students, Settings, Devices) for 'pewec' tenant."
echo "The Admin User will be preserved."
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

docker exec -i apextime-postgres psql -U apextime -d apextime <<'EOF'
DO $$
DECLARE
    t_id TEXT;
BEGIN
    -- Find Tenant ID for PEWEC (Cast to text just in case)
    SELECT id::text INTO t_id FROM "Tenant" WHERE code = 'pewec' OR name ILIKE '%Princess Esin%';
    
    IF t_id IS NULL THEN
        RAISE NOTICE 'Tenant PEWEC not found!';
        RETURN;
    END IF;

    RAISE NOTICE 'Wiping data for tenant: % (Preserving Admin User)', t_id;

    -- 1. Unlink Users (Set employeeId to NULL so we can delete employees)
    UPDATE "User" SET "employeeId" = NULL WHERE "tenantId" = t_id;
    
    -- 2. Clean up self-referencing Employee/Dept/Leave constraints
    UPDATE "Employee" SET "reportToId" = NULL, "managerOfDeptId" = NULL WHERE "tenantId" = t_id;
    UPDATE "Department" SET "managerOfDeptId" = NULL WHERE "tenantId" = t_id;
    UPDATE "LeaveEntry" SET "managerId" = NULL, "ceoId" = NULL WHERE "tenantId" = t_id;

    -- 3. Delete Logs & Transactions (Reverse dependency order)
    DELETE FROM "AuditLog" WHERE "tenantId" = t_id;
    DELETE FROM "SyncLog" WHERE "tenantId" = t_id;
    DELETE FROM "Notification" WHERE "tenantId" = t_id;
    DELETE FROM "RawDeviceLog" WHERE "tenantId" = t_id;
    DELETE FROM "DeviceCommand" WHERE "tenantId" = t_id;
    -- DeviceLog if table exists (ignore error if not)
    BEGIN
        DELETE FROM "DeviceLog" WHERE "tenantId" = t_id;
    EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'DeviceLog table not found, skipping'; END;
    
    DELETE FROM "AttendanceLog" WHERE "tenantId" = t_id;
    
    -- Hikvision Logs (No tenantId, map by device serial)
    DELETE FROM "HikvisionLogs" WHERE "serial_no" IN (SELECT "deviceId" FROM "Device" WHERE "tenantId" = t_id);

    -- 4. Delete Payroll Data
    DELETE FROM "Payslip" WHERE "tenantId" = t_id;
    DELETE FROM "Payroll" WHERE "tenantId" = t_id;
    DELETE FROM "PayrollRun" WHERE "tenantId" = t_id;
    DELETE FROM "EmployeeSalaryComponent" WHERE "tenantId" = t_id;
    DELETE FROM "SalaryComponent" WHERE "tenantId" = t_id;
    DELETE FROM "PayrollSetting" WHERE "tenantId" = t_id;
    DELETE FROM "LoanDeduction" WHERE "tenantId" = t_id;
    DELETE FROM "Loan" WHERE "tenantId" = t_id;
    DELETE FROM "ReimbursementEntry" WHERE "tenantId" = t_id;
    DELETE FROM "SalaryRevision" WHERE "tenantId" = t_id;
    DELETE FROM "TDSDeclaration" WHERE "tenantId" = t_id;
    DELETE FROM "CTCStructure" WHERE "tenantId" = t_id;

    -- 5. Delete Modules
    DELETE FROM "LeaveEntry" WHERE "tenantId" = t_id;
    DELETE FROM "LeaveBalance" WHERE "tenantId" = t_id;
    DELETE FROM "LeaveType" WHERE "tenantId" = t_id;
    DELETE FROM "Holiday" WHERE "tenantId" = t_id;
    DELETE FROM "VisitorLog" WHERE "tenantId" = t_id;
    DELETE FROM "Goal" WHERE "tenantId" = t_id;
    DELETE FROM "Ticket" WHERE "tenantId" = t_id;
    DELETE FROM "OnboardingTask" WHERE "tenantId" = t_id;
    DELETE FROM "Announcement" WHERE "tenantId" = t_id;
    DELETE FROM "Feedback" WHERE "tenantId" = t_id;
    DELETE FROM "Appraisal" WHERE "tenantId" = t_id;
    DELETE FROM "TrainingSession" WHERE "tenantId" = t_id;
    DELETE FROM "TrainingCourse" WHERE "tenantId" = t_id;
    DELETE FROM "Candidate" WHERE "tenantId" = t_id;
    DELETE FROM "JobOpening" WHERE "tenantId" = t_id;
    
    -- Assets
    DELETE FROM "AssetAssignment" WHERE "tenantId" = t_id;
    DELETE FROM "AssetRequest" WHERE "tenantId" = t_id;
    DELETE FROM "MaintenanceLog" WHERE "tenantId" = t_id;
    DELETE FROM "Asset" WHERE "tenantId" = t_id;
    DELETE FROM "AssetCategory" WHERE "tenantId" = t_id;

    -- School Data 
    DELETE FROM "FeeRecord" WHERE "tenantId" = t_id;
    DELETE FROM "FeeStructure" WHERE "tenantId" = t_id;
    DELETE FROM "FeeHead" WHERE "tenantId" = t_id;
    DELETE FROM "ExamMark" WHERE "tenantId" = t_id;
    DELETE FROM "StudentAttendance" WHERE "tenantId" = t_id;
    DELETE FROM "StudentFieldLog" WHERE "tenantId" = t_id;
    DELETE FROM "StudentDocument" WHERE "tenantId" = t_id;
    
    -- Delete Students and School Structure
    DELETE FROM "Student" WHERE "tenantId" = t_id;
    DELETE FROM "Guardian" WHERE "tenantId" = t_id;
    DELETE FROM "TimetableEntry" WHERE "tenantId" = t_id;
    DELETE FROM "Subject" WHERE "tenantId" = t_id;
    DELETE FROM "Batch" WHERE "tenantId" = t_id;
    DELETE FROM "Course" WHERE "tenantId" = t_id;
    DELETE FROM "AcademicSession" WHERE "tenantId" = t_id;
    DELETE FROM "TransportRoute" WHERE "tenantId" = t_id;
    DELETE FROM "LibraryBook" WHERE "tenantId" = t_id;

    -- 6. Delete Devices (Including 'ral')
    DELETE FROM "Device" WHERE "tenantId" = t_id;

    -- 7. Delete Employees & Org Structure
    DELETE FROM "FieldLog" WHERE "tenantId" = t_id;
    DELETE FROM "EmployeeShift" WHERE "tenantId" = t_id;
    DELETE FROM "EmployeeDocument" WHERE "tenantId" = t_id;
    DELETE FROM "Employee" WHERE "tenantId" = t_id;
    DELETE FROM "Department" WHERE "tenantId" = t_id;
    DELETE FROM "Designation" WHERE "tenantId" = t_id;
    DELETE FROM "Branch" WHERE "tenantId" = t_id;
    DELETE FROM "Location" WHERE "tenantId" = t_id;
    DELETE FROM "Shift" WHERE "tenantId" = t_id;
    DELETE FROM "Category" WHERE "tenantId" = t_id;
    
    -- Field Log/Project
    DELETE FROM "Project" WHERE "tenantId" = t_id;

    RAISE NOTICE 'Done! Tenant data wiped successfully.';
END $$;
EOF
