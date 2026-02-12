import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configure Multer for Receipts
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/receipts');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and Images (JPG/PNG) are allowed.'));
        }
    }
});

// ============================================
// REIMBURSEMENTS
// ============================================

// Get all reimbursements (with filters)
router.get('/reimbursements', authenticate, async (req, res) => {
    try {
        const { employeeId, status, month, year } = req.query;
        const tenantId = (req as any).user.tenantId;

        const where: any = { tenantId };
        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;
        if (month && year) {
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            const endDate = new Date(Number(year), Number(month), 0);
            where.billDate = { gte: startDate, lte: endDate };
        }

        const reimbursements = await prisma.reimbursementEntry.findMany({
            where,
            include: {
                employee: {
                    select: { firstName: true, lastName: true, employeeCode: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(reimbursements);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create reimbursement request (Multipart)
router.post('/reimbursements', authenticate, upload.single('file'), async (req, res) => {
    try {
        const { employeeId, type, amount, billDate, billNumber, description } = req.body;
        const tenantId = (req as any).user.tenantId;

        const reimbursement = await prisma.reimbursementEntry.create({
            data: {
                tenantId,
                employeeId,
                type,
                amount: parseFloat(amount),
                billDate: new Date(billDate),
                billNumber,
                description,
                attachment: req.file ? `/uploads/receipts/${req.file.filename}` : undefined,
                status: 'PENDING'
            }
        });

        res.json(reimbursement);
    } catch (error: any) {
        console.error('Reimbursement error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Approve/Reject reimbursement
router.put('/reimbursements/:id/status', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectedReason } = req.body;
        const user = (req as any).user;

        const updateData: any = { status };
        if (status === 'APPROVED') {
            updateData.approvedBy = user.username;
            updateData.approvedAt = new Date();
        } else if (status === 'REJECTED') {
            updateData.rejectedReason = rejectedReason;
        }

        const updated = await prisma.reimbursementEntry.update({
            where: { id },
            data: updateData
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ARREARS
// ============================================

// Get arrears entries for an employee
router.get('/arrears', authenticate, async (req, res) => {
    try {
        const { employeeId, month, year } = req.query;
        const tenantId = (req as any).user.tenantId;

        // Arrears are stored in payroll details JSON
        const where: any = { tenantId };
        if (employeeId) where.employeeId = employeeId;
        if (month) where.month = Number(month);
        if (year) where.year = Number(year);

        const payrolls = await prisma.payroll.findMany({
            where,
            select: {
                id: true,
                employeeId: true,
                month: true,
                year: true,
                arrears: true,
                details: true,
                employee: {
                    select: { firstName: true, lastName: true, employeeCode: true }
                }
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        // Parse arrears details from JSON
        const arrearsData = payrolls.map(p => {
            let arrearsBreakdown = [];
            if (p.details) {
                try {
                    const details = JSON.parse(p.details);
                    arrearsBreakdown = details.ARREARS_BREAKDOWN || [];
                } catch (e) { }
            }
            return {
                ...p,
                arrearsBreakdown
            };
        });

        res.json(arrearsData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Add arrears to upcoming payroll
router.post('/arrears', authenticate, async (req, res) => {
    try {
        const { employeeId, amount, reason, forMonth, forYear } = req.body;
        const tenantId = (req as any).user.tenantId;

        // Get current month/year for processing
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Find or create current month's payroll
        let payroll = await prisma.payroll.findFirst({
            where: {
                tenantId,
                employeeId,
                month: currentMonth,
                year: currentYear
            }
        });

        if (!payroll) {
            // Create placeholder payroll
            payroll = await prisma.payroll.create({
                data: {
                    tenantId,
                    employeeId,
                    month: currentMonth,
                    year: currentYear,
                    status: 'draft'
                }
            });
        }

        // Update arrears
        let details: any = {};
        if (payroll.details) {
            try { details = JSON.parse(payroll.details); } catch (e) { }
        }

        if (!details.ARREARS_BREAKDOWN) details.ARREARS_BREAKDOWN = [];
        details.ARREARS_BREAKDOWN.push({
            amount: parseFloat(amount),
            reason,
            forMonth,
            forYear,
            addedAt: new Date().toISOString()
        });

        const totalArrears = details.ARREARS_BREAKDOWN.reduce((sum: number, a: any) => sum + a.amount, 0);

        await prisma.payroll.update({
            where: { id: payroll.id },
            data: {
                arrears: totalArrears,
                details: JSON.stringify(details)
            }
        });

        res.json({ success: true, totalArrears });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// INCENTIVES
// ============================================

// Add incentive to employee's payroll
router.post('/incentives', authenticate, async (req, res) => {
    try {
        const { employeeId, amount, reason, month, year } = req.body;
        const tenantId = (req as any).user.tenantId;

        const targetMonth = month || (new Date().getMonth() + 1);
        const targetYear = year || new Date().getFullYear();

        // Find or create payroll
        let payroll = await prisma.payroll.findFirst({
            where: {
                tenantId,
                employeeId,
                month: targetMonth,
                year: targetYear
            }
        });

        if (!payroll) {
            payroll = await prisma.payroll.create({
                data: {
                    tenantId,
                    employeeId,
                    month: targetMonth,
                    year: targetYear,
                    status: 'draft'
                }
            });
        }

        // Update incentives
        let details: any = {};
        if (payroll.details) {
            try { details = JSON.parse(payroll.details); } catch (e) { }
        }

        if (!details.INCENTIVES_BREAKDOWN) details.INCENTIVES_BREAKDOWN = [];
        details.INCENTIVES_BREAKDOWN.push({
            amount: parseFloat(amount),
            reason,
            addedAt: new Date().toISOString(),
            addedBy: (req as any).user.username
        });

        const totalIncentives = details.INCENTIVES_BREAKDOWN.reduce((sum: number, i: any) => sum + i.amount, 0);

        await prisma.payroll.update({
            where: { id: payroll.id },
            data: {
                incentives: totalIncentives,
                details: JSON.stringify(details)
            }
        });

        res.json({ success: true, totalIncentives });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get incentives for employee
router.get('/incentives', authenticate, async (req, res) => {
    try {
        const { employeeId, month, year } = req.query;
        const tenantId = (req as any).user.tenantId;

        const where: any = { tenantId };
        if (employeeId) where.employeeId = employeeId;
        if (month) where.month = Number(month);
        if (year) where.year = Number(year);

        const payrolls = await prisma.payroll.findMany({
            where,
            select: {
                id: true,
                employeeId: true,
                month: true,
                year: true,
                incentives: true,
                details: true,
                employee: {
                    select: { firstName: true, lastName: true, employeeCode: true }
                }
            }
        });

        const incentivesData = payrolls.map(p => {
            let incentivesBreakdown = [];
            if (p.details) {
                try {
                    const details = JSON.parse(p.details);
                    incentivesBreakdown = details.INCENTIVES_BREAKDOWN || [];
                } catch (e) { }
            }
            return { ...p, incentivesBreakdown };
        });

        res.json(incentivesData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BANK EXPORT FORMATS
// ============================================

// Get available bank formats
router.get('/bank-formats', authenticate, async (req, res) => {
    const formats = [
        { id: 'GENERIC', name: 'Generic CSV', description: 'Standard CSV format' },
        { id: 'HDFC', name: 'HDFC Bank', description: 'HDFC Bulk Upload Format' },
        { id: 'ICICI', name: 'ICICI Bank', description: 'ICICI Corporate Banking Format' },
        { id: 'SBI', name: 'State Bank of India', description: 'SBI CMP Format' },
        { id: 'AXIS', name: 'Axis Bank', description: 'Axis Corporate Net Banking' },
        { id: 'KOTAK', name: 'Kotak Mahindra', description: 'Kotak Business Banking' },
        { id: 'YES', name: 'Yes Bank', description: 'Yes Bank Corporate Format' },
        { id: 'IDFC', name: 'IDFC First Bank', description: 'IDFC Bulk Payment Format' }
    ];
    res.json(formats);
});

// Export in specific bank format
router.get('/runs/:id/export-bank/:format', authenticate, async (req, res) => {
    try {
        const { id, format } = req.params;

        const payrolls = await prisma.payroll.findMany({
            where: { payrollRunId: id },
            include: {
                employee: {
                    select: {
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        accountNumber: true,
                        bankName: true,
                        ifscCode: true,
                        email: true,
                        phone: true
                    }
                }
            }
        });

        const run = await prisma.payrollRun.findUnique({ where: { id } });
        if (!run) return res.status(404).json({ error: 'Run not found' });

        let output = '';
        let filename = '';
        let contentType = 'text/csv';

        switch (format.toUpperCase()) {
            case 'HDFC':
                output = generateHDFCFormat(payrolls, run);
                filename = `HDFC_Salary_${run.month}_${run.year}.txt`;
                break;

            case 'ICICI':
                output = generateICICIFormat(payrolls, run);
                filename = `ICICI_Salary_${run.month}_${run.year}.csv`;
                break;

            case 'SBI':
                output = generateSBIFormat(payrolls, run);
                filename = `SBI_CMP_${run.month}_${run.year}.txt`;
                break;

            case 'AXIS':
                output = generateAxisFormat(payrolls, run);
                filename = `AXIS_Salary_${run.month}_${run.year}.csv`;
                break;

            case 'KOTAK':
                output = generateKotakFormat(payrolls, run);
                filename = `KOTAK_Salary_${run.month}_${run.year}.csv`;
                break;

            default:
                output = generateGenericFormat(payrolls, run);
                filename = `Bank_Export_${run.month}_${run.year}.csv`;
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.status(200).send(output);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BANK FORMAT GENERATORS
// ============================================

function generateGenericFormat(payrolls: any[], run: any): string {
    let csv = 'Beneficiary Name,Account Number,IFSC Code,Amount,Email,Mobile,Narration\n';

    payrolls.forEach(p => {
        const name = `${p.employee.firstName} ${p.employee.lastName}`.replace(/,/g, '');
        const amount = (p.finalTakeHome || p.netSalary).toFixed(2);
        csv += `"${name}","${p.employee.accountNumber || ''}","${p.employee.ifscCode || ''}",${amount},"${p.employee.email || ''}","${p.employee.phone || ''}","Salary ${run.month}/${run.year}"\n`;
    });

    return csv;
}

function generateHDFCFormat(payrolls: any[], run: any): string {
    // HDFC Bulk Upload Format (Fixed Width)
    // Format: Debit Account, Beneficiary Name (35), Beneficiary Account (34), Amount (17), IFSC, Remarks
    let output = '';
    const debitAccount = '50200012345678'; // Company's HDFC Account - should be from settings

    payrolls.forEach(p => {
        const name = `${p.employee.firstName} ${p.employee.lastName}`.substring(0, 35).padEnd(35);
        const acc = (p.employee.accountNumber || '').padEnd(34);
        const amount = (p.finalTakeHome || p.netSalary).toFixed(2).padStart(17);
        const ifsc = (p.employee.ifscCode || '').padEnd(11);
        const remarks = `SAL${run.month}${run.year}`.padEnd(20);

        output += `${debitAccount}${name}${acc}${amount}${ifsc}${remarks}\n`;
    });

    return output;
}

function generateICICIFormat(payrolls: any[], run: any): string {
    // ICICI Corporate Internet Banking Format
    let csv = 'Payment Type,Beneficiary Code,Beneficiary Name,Beneficiary Account No,Amount,IFSC Code,Email ID,Mobile No,Debit Narration,Credit Narration\n';

    payrolls.forEach((p, idx) => {
        const name = `${p.employee.firstName} ${p.employee.lastName}`.replace(/,/g, '');
        const amount = (p.finalTakeHome || p.netSalary).toFixed(2);
        const beneficiaryCode = p.employee.employeeCode || `EMP${idx + 1}`;

        csv += `NEFT,${beneficiaryCode},"${name}",${p.employee.accountNumber || ''},${amount},${p.employee.ifscCode || ''},${p.employee.email || ''},${p.employee.phone || ''},SALARY ${run.month}/${run.year},SALARY ${run.month}/${run.year}\n`;
    });

    return csv;
}

function generateSBIFormat(payrolls: any[], run: any): string {
    // SBI CMP (Corporate Multi-Pay) Format
    // Record Type|Beneficiary Name|Account Number|Amount|IFSC|Purpose
    let output = 'H|SALARY|' + new Date().toISOString().split('T')[0].replace(/-/g, '') + '\n';

    payrolls.forEach(p => {
        const name = `${p.employee.firstName} ${p.employee.lastName}`.substring(0, 40);
        const amount = (p.finalTakeHome || p.netSalary).toFixed(2);
        output += `D|${name}|${p.employee.accountNumber || ''}|${amount}|${p.employee.ifscCode || ''}|SALARY\n`;
    });

    // Trailer with count and total
    const total = payrolls.reduce((sum, p) => sum + (p.finalTakeHome || p.netSalary), 0);
    output += `T|${payrolls.length}|${total.toFixed(2)}\n`;

    return output;
}

function generateAxisFormat(payrolls: any[], run: any): string {
    // Axis Bank Corporate Banking Format
    let csv = 'Sr No,Beneficiary Name,Beneficiary Account Number,Amount,IFSC Code,Payment Mode,Beneficiary Email,Beneficiary Mobile,Remarks\n';

    payrolls.forEach((p, idx) => {
        const name = `${p.employee.firstName} ${p.employee.lastName}`.replace(/,/g, '');
        const amount = (p.finalTakeHome || p.netSalary).toFixed(2);
        const ifsc = p.employee.ifscCode || '';
        const paymentMode = ifsc.startsWith('UTIB') ? 'I' : 'N'; // I=Internal, N=NEFT

        csv += `${idx + 1},"${name}",${p.employee.accountNumber || ''},${amount},${ifsc},${paymentMode},${p.employee.email || ''},${p.employee.phone || ''},SALARY ${run.month}/${run.year}\n`;
    });

    return csv;
}

function generateKotakFormat(payrolls: any[], run: any): string {
    // Kotak Mahindra Business Banking Format
    let csv = 'Transaction Type,Beneficiary Name,Beneficiary Account,Bank Name,IFSC,Amount,Purpose Code,Remarks,Email,Mobile\n';

    payrolls.forEach(p => {
        const name = `${p.employee.firstName} ${p.employee.lastName}`.replace(/,/g, '');
        const amount = (p.finalTakeHome || p.netSalary).toFixed(2);
        const txnType = (p.employee.ifscCode || '').startsWith('KKBK') ? 'IFT' : 'NEFT';

        csv += `${txnType},"${name}",${p.employee.accountNumber || ''},${p.employee.bankName || ''},${p.employee.ifscCode || ''},${amount},SALA,SALARY ${run.month}/${run.year},${p.employee.email || ''},${p.employee.phone || ''}\n`;
    });

    return csv;
}

export default router;
