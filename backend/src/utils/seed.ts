import { prisma, basePrisma } from '../config/database';
import bcrypt from 'bcryptjs';
import { runWithTenant } from './tenantContext';

async function seed() {
  console.log('Seeding database for SaaS...');

  // 1. Create the Reserved 'global' tenant
  await basePrisma.tenant.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      name: 'System Global',
      slug: 'system',
      code: 'SYS',
      isActive: true,
    }
  });
  console.log('System Global Tenant created/verified');

  // 2. Create Super Admin (Global)
  const superPassword = await bcrypt.hash('superadmin', 10);
  await basePrisma.user.upsert({
    where: { username_tenantId: { username: 'superadmin', tenantId: 'global' } },
    update: {},
    create: {
      username: 'superadmin',
      password: superPassword,
      role: 'superadmin',
      tenantId: 'global',
    },
  });
  console.log('Super Admin created (username: superadmin, password: superadmin)');

  // 3. Create Default Tenant
  const tenant = await basePrisma.tenant.upsert({
    where: { slug: 'apextime' },
    update: {},
    create: {
      name: 'ApexTime Default',
      slug: 'apextime',
      code: 'AT',
      isActive: true,
      settings: {
        biometric: {
          server: process.env.SQL_SERVER_HOST || '115.98.2.20',
          port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
          user: process.env.SQL_SERVER_USER || 'essl',
          database: process.env.SQL_SERVER_DATABASE || 'etimetracklite1',
        }
      }
    },
  });

  console.log(`Default tenant created/verified: ${tenant.name} (${tenant.id})`);

  // 5. Populate all active tenants (Loop for safety)
  const allTenants = await basePrisma.tenant.findMany({ where: { isActive: true } });

  for (const tenant of allTenants) {
    console.log(`Processing seed data for tenant: ${tenant.name}...`);
    await runWithTenant(tenant.id, async () => {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin', 10);
      await prisma.user.upsert({
        where: {
          username_tenantId: {
            username: 'admin',
            tenantId: tenant.id
          }
        },
        update: {},
        create: {
          tenantId: tenant.id,
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
        },
      });
      console.log('Default admin user created for tenant (username: admin, password: admin, companyCode: apextime)');

      // Create default shift with valid ISO DateTimes
      const defaultShift = await prisma.shift.upsert({
        where: {
          code_tenantId: {
            code: 'GS',
            tenantId: tenant.id
          }
        },
        update: {},
        create: {
          tenantId: tenant.id,
          name: 'General Shift',
          code: 'GS',
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T18:00:00Z'),
          gracePeriodIn: 15,
          gracePeriodOut: 15,
          isNightShift: false,
        },
      });
      console.log('Default shift created:', defaultShift.name);

      // Create sample categories
      const categories = [
        { name: 'Staff', code: 'STAFF' },
        { name: 'Worker', code: 'WORKER' },
        { name: 'Contract', code: 'CONTRACT' },
        { name: 'Intern', code: 'INTERN' },
      ];

      for (const category of categories) {
        await prisma.category.upsert({
          where: {
            code_tenantId: {
              code: category.code,
              tenantId: tenant.id
            }
          },
          update: {},
          create: {
            ...category,
            tenantId: tenant.id
          },
        });
      }
      console.log('Categories created');

      // Create sample leave types
      const leaveTypes = [
        { name: 'Casual Leave', code: 'CL', isPaid: true },
        { name: 'Sick Leave', code: 'SL', isPaid: true },
        { name: 'Earned Leave', code: 'EL', isPaid: true },
        { name: 'Unpaid Leave', code: 'UL', isPaid: false },
      ];

      for (const leaveType of leaveTypes) {
        await prisma.leaveType.upsert({
          where: {
            code_tenantId: {
              code: leaveType.code,
              tenantId: tenant.id
            }
          },
          update: {},
          create: {
            ...leaveType,
            tenantId: tenant.id
          },
        });
      }
      console.log('Leave types created');

      // Create Salary Components based on the User's provided structure
      const salaryComponents = [
        { name: 'Basic', code: 'BASIC', type: 'EARNING', calculationType: 'PERCENTAGE', value: 50, formula: 'CTC * 0.50', isEPFApplicable: true, isESIApplicable: true },
        { name: 'House Rent Allowance', code: 'HRA', type: 'EARNING', calculationType: 'PERCENTAGE', value: 50, formula: 'BASIC * 0.50', isEPFApplicable: false, isESIApplicable: true },
        { name: 'Conveyance Allowance', code: 'CONVEYANCE_ALLOWANCE', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: true, isESIApplicable: false },
        { name: 'Fixed Allowance', code: 'FIXED_ALLOWANCE', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: true, isESIApplicable: true },
        { name: 'Bonus', code: 'BONUS', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: false, isESIApplicable: false, isVariable: true },
        { name: 'Commission', code: 'COMMISSION', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: false, isESIApplicable: true, isVariable: true },
        { name: 'Children Education Allowance', code: 'CHILDREN_EDUCATION', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: true, isESIApplicable: true, isActive: false },
        { name: 'Transport Allowance', code: 'TRANSPORT_ALLOWANCE', type: 'EARNING', calculationType: 'FLAT', value: 1600, isEPFApplicable: true, isESIApplicable: true, isActive: false },
        { name: 'Travelling Allowance', code: 'TRAVELLING_ALLOWANCE', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: true, isESIApplicable: false, isActive: false },
        { name: 'Leave Encashment', code: 'LEAVE_ENCASHMENT', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: false, isESIApplicable: false, isVariable: true },
        { name: 'Gratuity', code: 'GRATUITY', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: false, isESIApplicable: false, isVariable: true },
        { name: 'Overtime Allowance', code: 'OVERTIME_ALLOWANCE', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: false, isESIApplicable: true, isVariable: true, isActive: false },
        { name: 'Notice Pay', code: 'NOTICE_PAY', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: false, isESIApplicable: false, isVariable: true },
        { name: 'Hold Salary', code: 'HOLD_SALARY', type: 'EARNING', calculationType: 'FLAT', value: 0, isEPFApplicable: false, isESIApplicable: false, isVariable: true },
      ];

      for (const comp of salaryComponents) {
        await (prisma.salaryComponent as any).upsert({
          where: { code_tenantId: { code: comp.code, tenantId: tenant.id } },
          update: {
            name: comp.name,
            type: comp.type,
            calculationType: comp.calculationType,
            value: comp.value,
            formula: (comp as any).formula,
            isEPFApplicable: comp.isEPFApplicable,
            isESIApplicable: comp.isESIApplicable,
            isVariable: (comp as any).isVariable || false,
            isActive: comp.isActive !== undefined ? comp.isActive : true
          },
          create: {
            ...comp,
            tenantId: tenant.id
          }
        });
      }
      console.log('Salary components created/updated for tenant');
    });
  }
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
