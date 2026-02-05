import { PrismaClient } from '@prisma/client';
import { reprocessHistoricalLogs } from './src/services/logSyncService';

const prisma = new PrismaClient();

async function debugReprocess() {
    console.log('🐞 DEBUG REPROCESS FOR HO004...');

    // 1. Get Employee ID
    const emp = await prisma.employee.findFirst({ where: { deviceUserId: 'HO004' } });
    if (!emp) {
        console.error('Child HO004 not found');
        return;
    }
    console.log(`✅ Target Employee: ${emp.id} (HO004)`);

    // 2. Clear their logs for clean test
    await prisma.attendanceLog.deleteMany({ where: { employeeId: emp.id } });
    console.log('🧹 Cleared existing attendance logs for HO004');

    // 3. Run Re-process just for this user (we hack the service to processing everyone but we watch logs)
    // Actually, let's call the internal function if possible, or just run the global one and filter logs
    console.log('🔄 Running Global Reprocess...');

    // We can't easily isolate one user in the current service structure without modifying it.
    // So we will run the global reprocess, but I've updated the service logic to be robust.

    await reprocessHistoricalLogs(new Date('2026-01-01'));

    // 4. Verify Result
    const logs = await prisma.attendanceLog.findMany({
        where: { employeeId: emp.id },
        orderBy: { date: 'asc' }
    });

    console.log(`\n📊 FINAL DATABASE AUDIT (HO004):`);
    logs.forEach(l => {
        console.log(`[${l.date.toISOString().split('T')[0]}] In: ${l.firstIn?.toISOString()} | Out: ${l.lastOut?.toISOString()} | Status: ${l.status}`);
    });
}

debugReprocess()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
