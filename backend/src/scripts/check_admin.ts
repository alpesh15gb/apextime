import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenantCode = 'pewec';

    const tenant = await prisma.tenant.findFirst({
        where: {
            OR: [{ code: tenantCode }, { slug: tenantCode }]
        }
    });

    if (!tenant) {
        console.log('❌ Tenant NOT found!');
        return;
    }
    console.log(`✅ Tenant Found: ${tenant.name} (${tenant.id})`);
    console.log(`   Slug: ${tenant.slug}`);
    console.log(`   Active: ${tenant.isActive}`);

    // List users
    const users = await prisma.user.findMany({
        where: { tenantId: tenant.id }
    });

    if (users.length === 0) {
        console.log('❌ No users found for this tenant. The script might have wiped them?');
        // If so, restore Admin
    } else {
        console.log(`✅ Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`   - ${u.username} (Role: ${u.role}) [EmpID: ${u.employeeId}]`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
