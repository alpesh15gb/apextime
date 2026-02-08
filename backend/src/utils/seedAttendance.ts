import { basePrisma } from '../config/database';
import { runWithTenant } from './tenantContext';

async function seedAttendance() {
  const tenant = await basePrisma.tenant.findFirst({ where: { slug: 'apextime' } });
  if (!tenant) { console.log('No tenant found'); return; }

  await runWithTenant(tenant.id, async () => {
    // Create departments
    const dept1 = await basePrisma.department.upsert({
      where: { code_branchId_tenantId: { code: 'ENG', branchId: null as any, tenantId: tenant.id } },
      update: {},
      create: { tenantId: tenant.id, name: 'Engineering', code: 'ENG' }
    }).catch(async () => {
      return basePrisma.department.findFirst({ where: { tenantId: tenant.id, code: 'ENG' } });
    });

    const dept2 = await basePrisma.department.upsert({
      where: { code_branchId_tenantId: { code: 'HR', branchId: null as any, tenantId: tenant.id } },
      update: {},
      create: { tenantId: tenant.id, name: 'Human Resources', code: 'HR' }
    }).catch(async () => {
      return basePrisma.department.findFirst({ where: { tenantId: tenant.id, code: 'HR' } });
    });

    const dept3 = await basePrisma.department.upsert({
      where: { code_branchId_tenantId: { code: 'FIN', branchId: null as any, tenantId: tenant.id } },
      update: {},
      create: { tenantId: tenant.id, name: 'Finance', code: 'FIN' }
    }).catch(async () => {
      return basePrisma.department.findFirst({ where: { tenantId: tenant.id, code: 'FIN' } });
    });

    // Create sample employees
    const empData = [
      { employeeCode: 'EMP001', firstName: 'Rahul', lastName: 'Sharma', departmentId: dept1?.id },
      { employeeCode: 'EMP002', firstName: 'Priya', lastName: 'Patel', departmentId: dept1?.id },
      { employeeCode: 'EMP003', firstName: 'Arun', lastName: 'Kumar', departmentId: dept2?.id },
      { employeeCode: 'EMP004', firstName: 'Sneha', lastName: 'Reddy', departmentId: dept2?.id },
      { employeeCode: 'EMP005', firstName: 'Vikram', lastName: 'Singh', departmentId: dept3?.id },
      { employeeCode: 'EMP006', firstName: 'Meera', lastName: 'Nair', departmentId: dept3?.id },
      { employeeCode: 'EMP007', firstName: 'Karan', lastName: 'Joshi', departmentId: dept1?.id },
      { employeeCode: 'EMP008', firstName: 'Anita', lastName: 'Desai', departmentId: dept2?.id },
    ];

    const employees: any[] = [];
    for (const emp of empData) {
      const e = await basePrisma.employee.upsert({
        where: { employeeCode_tenantId: { employeeCode: emp.employeeCode, tenantId: tenant.id } },
        update: {},
        create: { tenantId: tenant.id, ...emp, isActive: true, status: 'active' }
      });
      employees.push(e);
    }
    console.log(`Created ${employees.length} employees`);

    // Create attendance data for the last 30 days
    const now = new Date();
    for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      const dayOfWeek = date.getDay();
      
      // Skip Sundays
      if (dayOfWeek === 0) continue;

      const dateUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

      for (const emp of employees) {
        // Random attendance patterns
        const rand = Math.random();
        
        // 10% chance absent
        if (rand < 0.10) continue;

        // Generate punch times
        const baseHour = 9 + Math.floor(Math.random() * 2); // 9 or 10
        const baseMin = Math.floor(Math.random() * 30);
        const firstIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), baseHour, baseMin);
        
        // Some employees have no out punch (5% chance)
        const hasOut = Math.random() > 0.05;
        const outHour = 17 + Math.floor(Math.random() * 3); // 17-19
        const outMin = Math.floor(Math.random() * 60);
        const lastOut = hasOut ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), outHour, outMin) : null;

        let workingHours = 0;
        if (lastOut) {
          workingHours = (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
        }

        // Build punch logs
        const punches = [firstIn.toISOString()];
        // Add some intermediate punches (lunch break)
        if (Math.random() > 0.5) {
          const lunchOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 13, Math.floor(Math.random() * 30));
          const lunchIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14, Math.floor(Math.random() * 30));
          punches.push(lunchOut.toISOString());
          punches.push(lunchIn.toISOString());
        }
        if (lastOut) punches.push(lastOut.toISOString());

        // Calculate late arrival (shift starts at 9:30)
        const shiftStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 30);
        let lateArrival = 0;
        if (firstIn > shiftStart) {
          lateArrival = (firstIn.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
        }

        // Status
        let status = 'Present';
        if (!hasOut) status = 'Shift Incomplete';
        else if (workingHours < 4) status = 'Half Day';

        try {
          await basePrisma.attendanceLog.upsert({
            where: {
              employeeId_date_tenantId: {
                employeeId: emp.id,
                date: dateUtc,
                tenantId: tenant.id
              }
            },
            update: {
              firstIn,
              lastOut,
              workingHours: Math.round(workingHours * 100) / 100,
              totalHours: Math.round(workingHours * 100) / 100,
              lateArrival: Math.round(lateArrival * 100) / 100,
              status,
              totalPunches: punches.length,
              logs: JSON.stringify(punches)
            },
            create: {
              tenantId: tenant.id,
              employeeId: emp.id,
              date: dateUtc,
              firstIn,
              lastOut,
              workingHours: Math.round(workingHours * 100) / 100,
              totalHours: Math.round(workingHours * 100) / 100,
              lateArrival: Math.round(lateArrival * 100) / 100,
              status,
              totalPunches: punches.length,
              logs: JSON.stringify(punches)
            }
          });
        } catch (e: any) {
          // ignore dups
        }
      }
    }
    console.log('Attendance data seeded for 30 days');
  });
}

seedAttendance()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => basePrisma.$disconnect());
