import dotenv from 'dotenv';
dotenv.config();

import { prisma } from './src/config/database';

async function check() {
  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Satyanarayana', mode: 'insensitive' } },
        { firstName: { contains: 'Praveen', mode: 'insensitive' } },
        { firstName: { contains: 'Baji', mode: 'insensitive' } },
        { deviceUserId: { in: ['38', '18', '8', '72', '98', '102', 'HO038', 'HO018', 'HO008', 'HO072', 'HO098'] } }
      ]
    },
    orderBy: { firstName: 'asc' }
  });

  console.log('=== Relevant Employees ===\n');
  employees.forEach(e => {
    console.log(`${e.firstName} ${e.lastName}`);
    console.log(`  Code: ${e.employeeCode} | deviceUserId: ${e.deviceUserId} | Dept: ${e.departmentId || 'null'}`);
    console.log('');
  });

  process.exit(0);
}

check();
