import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// --- SALARY COMPONENTS ---

// Get all salary components
router.get('/components', authenticate, async (req, res) => {
    try {
        const components = await prisma.salaryComponent.findMany({
            where: { tenantId: (req as any).user.tenantId },
            orderBy: { type: 'asc' } // Earnings first, then deductions? Or by creation
        });
        res.json(components);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Upsert (Create or Update) salary component
router.post('/components', authenticate, async (req, res) => {
    const {
        id, name, type, calculationType, value, formula,
        isEPF, isESI, isVariable,
        isActive, nameInPayslip, isPartOfStructure, isTaxable, isProRata,
        epfConfig, showInPayslip
    } = req.body;

    const tenantId = (req as any).user.tenantId;

    // Use a simplified code derived from name for internal uniqueness if not provided
    // For now, we trust the ID if provided, else create new

    // NOTE: The Schema might need updates if we added new fields in Frontend that don't exist in Prisma Schema yet
    // I noticed I added `nameInPayslip`, `isPartOfStructure` in frontend, but they are not in schema.prisma yet.
    // For this query, I will only map fields that EXIST in the schema I viewed earlier.
    // Schema has: name, code, type, calculationType, value, formula, isActive, isEPFApplicable, isESIApplicable, isVariable

    // I need to auto-generate specific codes if creating new
    const code = name.toUpperCase().replace(/\s+/g, '_');

    try {
        if (id) {
            // Update existing
            const updated = await prisma.salaryComponent.update({
                where: { id },
                data: {
                    name,
                    // code: code, // Usually code shouldn't change to avoid breaking history, but maybe allowed if careful
                    type,
                    calculationType,
                    value: parseFloat(value),
                    formula,
                    isActive: isActive !== undefined ? isActive : true,
                    isEPFApplicable: isEPF,
                    isESIApplicable: isESI,
                    isVariable: isVariable
                }
            });
            res.json(updated);
        } else {
            // Create new
            const created = await prisma.salaryComponent.create({
                data: {
                    tenantId,
                    name,
                    code,
                    type,
                    calculationType,
                    value: parseFloat(value),
                    formula,
                    isActive: true, // Default active
                    isEPFApplicable: isEPF || false,
                    isESIApplicable: isESI || false,
                    isVariable: isVariable || false
                }
            });
            res.json(created);
        }
    } catch (error: any) {
        console.error("Error saving component:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- PAYROLL GLOBAL SETTINGS (Schedule, Statutory IDs) ---

// Get all settings
router.get('/config', authenticate, async (req, res) => {
    try {
        const settings = await prisma.payrollSetting.findMany({
            where: { tenantId: (req as any).user.tenantId }
        });

        // Transform array to key-value object for frontend convenience
        const config: any = {};
        settings.forEach(s => {
            try {
                config[s.key] = JSON.parse(s.value);
            } catch (e) {
                config[s.key] = s.value;
            }
        });
        res.json(config);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Save settings (bulk or single)
router.post('/config', authenticate, async (req, res) => {
    const { settings } = req.body; // Expect { "PAY_SCHEDULE": {...}, "PF_CONFIG": {...} }
    const tenantId = (req as any).user.tenantId;

    try {
        const promises = Object.keys(settings).map(key => {
            const val = settings[key];
            const stringValue = typeof val === 'object' ? JSON.stringify(val) : String(val);

            return prisma.payrollSetting.upsert({
                where: {
                    key_tenantId: { key, tenantId }
                },
                update: { value: stringValue },
                create: {
                    tenantId,
                    key,
                    value: stringValue
                }
            });
        });

        await Promise.all(promises);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
