import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTable() {
    console.log('🛠️ Creating "HikvisionLogs" table manually...');

    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "HikvisionLogs" (
                "id" TEXT NOT NULL,
                "person_id" TEXT,
                "access_datetime" TEXT,
                "access_date" TEXT,
                "access_time" TEXT,
                "auth_result" TEXT,
                "device_name" TEXT,
                "serial_no" TEXT,
                "person_name" TEXT,
                "emp_dept" TEXT,
                "card_no" TEXT,
                "direction" TEXT,
                "mask_status" TEXT,
                "auth_type" TEXT,
                "temp_status" TEXT,
                "reader_name" TEXT,
                "resource_name" TEXT,
                "pic_url" TEXT,
                "is_processed" BOOLEAN NOT NULL DEFAULT false,
                "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "HikvisionLogs_pkey" PRIMARY KEY ("id")
            );
        `);

        // Also try ALTER just in case it already existed
        await prisma.$executeRawUnsafe(`ALTER TABLE "HikvisionLogs" ADD COLUMN IF NOT EXISTS "auth_type" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "HikvisionLogs" ADD COLUMN IF NOT EXISTS "temp_status" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "HikvisionLogs" ADD COLUMN IF NOT EXISTS "reader_name" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "HikvisionLogs" ADD COLUMN IF NOT EXISTS "resource_name" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "HikvisionLogs" ADD COLUMN IF NOT EXISTS "pic_url" TEXT;`);

        console.log('✅ Table "HikvisionLogs" updated successfully!');

        // ALSO Create LOWERCASE version to handle case-sensitivity issues
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "hikvisionlogs" (
                "id" TEXT NOT NULL,
                "person_id" TEXT,
                "access_datetime" TEXT,
                "access_date" TEXT,
                "access_time" TEXT,
                "auth_result" TEXT,
                "device_name" TEXT,
                "serial_no" TEXT,
                "person_name" TEXT,
                "emp_dept" TEXT,
                "card_no" TEXT,
                "direction" TEXT,
                "mask_status" TEXT,
                "auth_type" TEXT,
                "temp_status" TEXT,
                "reader_name" TEXT,
                "resource_name" TEXT,
                "pic_url" TEXT,
                "temp_val" TEXT,
                "is_processed" BOOLEAN NOT NULL DEFAULT false,
                "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "hikvisionlogs_pkey" PRIMARY KEY ("id")
            );
        `);
        console.log('✅ Table "hikvisionlogs" (lowercase) created successfully!');

        // ALSO Create MINIMAL version for testing
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "hik_minimal" (
                "id" TEXT NOT NULL,
                "person_id" TEXT,
                "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "hik_minimal_pkey" PRIMARY KEY ("id")
            );
        `);
        console.log('✅ Table "hik_minimal" created successfully!');


    } catch (e) {
        console.error('❌ Error creating table:', e);
    }
}

createTable()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
