import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';

async function syncEmployeesToUsers() {
    console.log('Starting sync of Employees to Users...');
    const employees = await prisma.employee.findMany({
        where: {
            user: { is: null }
        }
    });

    console.log(`Found ${employees.length} employees without user accounts.`);

    for (const emp of employees) {
        try {
            const hashedPassword = await bcrypt.hash(emp.employeeCode, 10);
            await prisma.user.create({
                data: {
                    username: emp.employeeCode,
                    password: hashedPassword,
                    role: 'employee',
                    employeeId: emp.id
                }
            });
            console.log(`Created user for ${emp.employeeCode}`);
        } catch (e) {
            console.error(`Failed to create user for ${emp.employeeCode}`, e);
        }
    }

    console.log('Sync completed.');
    process.exit(0);
}

syncEmployeesToUsers();
