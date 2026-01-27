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
