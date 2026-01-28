import dotenv from 'dotenv';
dotenv.config();

import { prisma } from './src/config/database';

async function check() {
  const codes = ['18', '38', '8', '72', '98', '102', '37', '65', '36', '40', '64', '7', '95', '45', '15', '96', '92', '103', '100', '101', '6', '53'];

  console.log('=== PostgreSQL Employees ===\n');

  for (const code of codes) {
    const emp = await prisma.employee.findFirst({
      where: { deviceUserId: code }
    });

    if (emp) {
      console.log(`${code}: ${emp.firstName} ${emp.lastName} (${emp.employeeCode})`);
    } else {
      console.log(`${code}: NOT FOUND in PostgreSQL`);
    }
  }

  process.exit(0);
}

check();
