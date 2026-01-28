
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany();
  const nameGroups = new Map<string, any[]>();

  for (const emp of employees) {
    const fullName = `${emp.firstName} ${emp.lastName}`.trim().toLowerCase();
    if (!nameGroups.has(fullName)) {
      nameGroups.set(fullName, []);
    }
    nameGroups.get(fullName)!.push(emp);
  }

  console.log('--- Duplicate Names Check ---');
  let duplicatesFound = false;
  for (const [name, emps] of nameGroups.entries()) {
    if (emps.length > 1) {
      duplicatesFound = true;
      console.log(`Name: "${name}"`);
      for (const emp of emps) {
        console.log(`  - ID: ${emp.id}, Code: ${emp.employeeCode}, DeviceUserId: ${emp.deviceUserId}`);
      }
    }
  }

  if (!duplicatesFound) {
    console.log('No duplicate names found.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
