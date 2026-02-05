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
                "is_processed" BOOLEAN NOT NULL DEFAULT false,
                "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "HikvisionLogs_pkey" PRIMARY KEY ("id")
            );
        `);
        console.log('✅ Table "HikvisionLogs" created successfully!');
    } catch (e) {
        console.error('❌ Error creating table:', e);
    }
}

createTable()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
