import sql from 'mssql';
import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare const getSqlPool: () => Promise<sql.ConnectionPool>;
export declare const closeSqlPool: () => Promise<void>;
declare const _default: {
    prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
    getSqlPool: () => Promise<sql.ConnectionPool>;
    closeSqlPool: () => Promise<void>;
};
export default _default;
//# sourceMappingURL=database.d.ts.map