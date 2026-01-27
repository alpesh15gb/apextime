"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function seed() {
    console.log('Seeding database...');
    // Create default admin user
    const hashedPassword = await bcryptjs_1.default.hash('admin', 10);
    await database_1.prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
        },
    });
    console.log('Default admin user created (username: admin, password: admin)');
    // Create default shift
    const defaultShift = await database_1.prisma.shift.upsert({
        where: { id: 'default-shift' },
        update: {},
        create: {
            id: 'default-shift',
            name: 'General Shift',
            startTime: '09:00',
            endTime: '18:00',
            gracePeriodIn: 15,
            gracePeriodOut: 15,
            isNightShift: false,
        },
    });
    console.log('Default shift created:', defaultShift.name);
    // Create sample categories
    const categories = [
        { name: 'Staff', code: 'STAFF' },
        { name: 'Worker', code: 'WORKER' },
        { name: 'Contract', code: 'CONTRACT' },
        { name: 'Intern', code: 'INTERN' },
    ];
    for (const category of categories) {
        await database_1.prisma.category.upsert({
            where: { code: category.code },
            update: {},
            create: category,
        });
    }
    console.log('Categories created');
    // Create sample leave types
    const leaveTypes = [
        { name: 'Casual Leave', code: 'CL', isPaid: true },
        { name: 'Sick Leave', code: 'SL', isPaid: true },
        { name: 'Earned Leave', code: 'EL', isPaid: true },
        { name: 'Unpaid Leave', code: 'UL', isPaid: false },
    ];
    for (const leaveType of leaveTypes) {
        await database_1.prisma.leaveType.upsert({
            where: { code: leaveType.code },
            update: {},
            create: leaveType,
        });
    }
    console.log('Leave types created');
    console.log('Seeding completed!');
}
seed()
    .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
})
    .finally(async () => {
    await database_1.prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map