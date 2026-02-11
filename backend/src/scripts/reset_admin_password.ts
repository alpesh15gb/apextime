import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const tenantCode = 'pewec';
    const newPassword = 'admin123'; // Default reset password

    console.log(`Resetting admin password for tenant: ${tenantCode}...`);

    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [{ code: tenantCode }, { slug: tenantCode }]
        }
    });

    if (!tenant) {
        console.error('❌ Tenant NOT found!');
        return;
    }

    // Find admin user
    const admin = await prisma.user.findFirst({
        where: {
            tenantId: tenant.id,
            role: 'admin'
        }
    });

    if (!admin) {
        console.error('❌ Admin user NOT found! Creating one...');
        // Create Default Admin
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                tenantId: tenant.id
                // Employee ID left null for super admin
            }
        });
        console.log(`✅ Created new admin user 'admin' with password '${newPassword}'`);
        return;
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword }
    });

    console.log(`✅ Password for user '${admin.username}' reset to '${newPassword}'`);
    console.log('👉 Please login and change it immediately.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
