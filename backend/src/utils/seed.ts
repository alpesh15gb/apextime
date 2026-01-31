<<<<<<< HEAD
import { prisma, basePrisma } from '../config/database';
import bcrypt from 'bcryptjs';
import { runWithTenant } from './tenantContext';

async function seed() {
  console.log('Seeding database for SaaS...');

  // 1. Create Super Admin (Global)
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

  // 1b. Create the Reserved 'global' tenant
  await basePrisma.tenant.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      name: 'System Global',
      slug: 'system',
      isActive: true,
    }
  });

  // 1c. Create Default Tenant
  const tenant = await basePrisma.tenant.upsert({
    where: { slug: 'apextime' },
    update: {},
    create: {
      name: 'ApexTime Default',
      slug: 'apextime',
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

  // 2. Run everything else within this tenant context
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

    // Create default shift
    const defaultShift = await prisma.shift.upsert({
      where: {
        id: 'default-shift'
      },
      update: {},
      create: {
        tenantId: tenant.id,
        id: 'default-shift',
        name: 'General Shift',
        startTime: '09:00',
        endTime: '18:00',
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
  });
=======
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log('Default admin user created (username: admin, password: admin)');

  // Create default shift
  const defaultShift = await prisma.shift.upsert({
    where: { id: 'default-shift' },
    update: {},
    create: {
      id: 'default-shift',
      name: 'General Shift',
      startTime: '09:00',
      endTime: '18:00',
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
      where: { code: category.code },
      update: {},
      create: category,
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
      where: { code: leaveType.code },
      update: {},
      create: leaveType,
    });
  }
  console.log('Leave types created');
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e

  console.log('Seeding completed!');
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
