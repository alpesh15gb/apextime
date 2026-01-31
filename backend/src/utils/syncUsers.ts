import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';

async function syncEmployeesToUsers() {
    console.log('Starting sync of Employees to Users...');
    const employees = await prisma.employee.findMany({
        where: {
            user: { is: null }
<<<<<<< HEAD
        },
        select: {
            id: true,
            employeeCode: true,
            tenantId: true
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
        }
    });

    console.log(`Found ${employees.length} employees without user accounts.`);

    for (const emp of employees) {
        try {
            const hashedPassword = await bcrypt.hash(emp.employeeCode, 10);
            await prisma.user.create({
                data: {
<<<<<<< HEAD
                    tenantId: emp.tenantId,
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
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
