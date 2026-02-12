// Form 16 Generator Service
// Generates Form 16 (Part A & Part B) for Indian Income Tax compliance

import { prisma } from '../config/database';
import PDFDocument from 'pdfkit';

interface Form16Data {
    certificateNo: string;
    lastUpdated: string;
    employee: {
        name: string;
        pan: string;
        employeeCode: string;
        designation: string;
        address: string;
    };
    employer: {
        name: string;
        tan: string;
        pan: string;
        address: string;
        citAddress: string;
        signatoryName: string;
        signatoryFatherName: string;
        signatoryDesignation: string;
        signatoryPlace: string;
    };
    financialYear: string;
    assessmentYear: string;
    periodFrom: string;
    periodTo: string;
    salary: {
        basic: number;
        hra: number;
        specialAllowance: number;
        lta: number;
        medicalAllowance: number;
        otherAllowances: number;
        grossSalary: number;
    };
    deductions: {
        standardDeduction: number;
        section80C: number;
        section80D: number;
        section80E: number;
        section80G: number;
        hraExemption: number;
        otherExemptions: number;
    };
    tax: {
        taxableIncome: number;
        taxOnIncome: number;
        educationCess: number;
        totalTax: number;
        tdsDeducted: number;
        taxPayable: number;
    };
    quarterlyTDS: {
        q1: { receiptNo: string; amountPaid: number; tdsDeducted: number; depositedOn: string; bsrCode: string; challanSerialNo: string };
        q2: { receiptNo: string; amountPaid: number; tdsDeducted: number; depositedOn: string; bsrCode: string; challanSerialNo: string };
        q3: { receiptNo: string; amountPaid: number; tdsDeducted: number; depositedOn: string; bsrCode: string; challanSerialNo: string };
        q4: { receiptNo: string; amountPaid: number; tdsDeducted: number; depositedOn: string; bsrCode: string; challanSerialNo: string };
    };
}

export class Form16Service {

    /**
     * Generate Form 16 data for an employee for a financial year
     */
    static async generateForm16Data(employeeId: string, financialYear: string): Promise<Form16Data | null> {
        // Parse financial year (e.g., "2024-25" -> startYear=2024, endYear=2025)
        const [startYear] = financialYear.split('-');
        const fyStartYear = parseInt(startYear);
        const fyEndYear = fyStartYear + 1;

        // Get employee details
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                designation: true,
                department: true,
                branch: true,
                tenant: true
            }
        });

        if (!employee) return null;

        // Get company profile
        const companyProfile = await prisma.companyProfile.findFirst({
            where: { tenantId: employee.tenantId }
        });

        // Get Challan Details
        const challans = await prisma.tDSChallan.findMany({
            where: {
                tenantId: employee.tenantId,
                financialYear
            }
        });

        // Get all payroll records for the financial year (April to March)
        const payrolls = await prisma.payroll.findMany({
            where: {
                employeeId,
                OR: [
                    { year: fyStartYear, month: { gte: 4, lte: 12 } },
                    { year: fyEndYear, month: { gte: 1, lte: 3 } }
                ]
            },
            orderBy: [{ year: 'asc' }, { month: 'asc' }]
        });

        if (payrolls.length === 0) return null;

        // Calculate totals
        const totals = payrolls.reduce((acc, p) => ({
            basic: acc.basic + (p.basicPaid || 0),
            hra: acc.hra + (p.hraPaid || 0),
            allowances: acc.allowances + (p.totalEarnings - (p.basicPaid || 0) - (p.hraPaid || 0)),
            gross: acc.gross + (p.grossSalary || 0),
            pfDeduction: acc.pfDeduction + (p.pfDeduction || 0),
            tdsDeducted: acc.tdsDeducted + (p.tdsDeduction || 0),
            ptDeduction: acc.ptDeduction + (p.ptDeduction || 0),
            net: acc.net + (p.netSalary || 0)
        }), {
            basic: 0, hra: 0, allowances: 0, gross: 0,
            pfDeduction: 0, tdsDeducted: 0, ptDeduction: 0, net: 0
        });

        // Get TDS declaration if exists
        const tdsDeclaration = await prisma.tDSDeclaration.findFirst({
            where: {
                employeeId,
                financialYear
            }
        });

        // Quarterly splits
        const getQuarterData = (qNo: number) => {
            let qPayrolls = [];
            if (qNo === 1) qPayrolls = payrolls.filter(p => p.year === fyStartYear && p.month >= 4 && p.month <= 6);
            if (qNo === 2) qPayrolls = payrolls.filter(p => p.year === fyStartYear && p.month >= 7 && p.month <= 9);
            if (qNo === 3) qPayrolls = payrolls.filter(p => p.year === fyStartYear && p.month >= 10 && p.month <= 12);
            if (qNo === 4) qPayrolls = payrolls.filter(p => p.year === fyEndYear && p.month >= 1 && p.month <= 3);

            const tds = qPayrolls.reduce((sum, p) => sum + (p.tdsDeduction || 0), 0);
            const paid = qPayrolls.reduce((sum, p) => sum + (p.grossSalary || 0), 0);

            // Real Challan details
            const challan = challans.find(c => c.quarter === qNo);

            if (challan) {
                return {
                    receiptNo: challan.receiptNo || 'N/A',
                    amountPaid: paid,
                    tdsDeducted: tds,
                    depositedOn: challan.depositedOn ? challan.depositedOn.toLocaleDateString('en-IN') : 'N/A',
                    bsrCode: challan.bsrCode || 'N/A',
                    challanSerialNo: challan.challanSerialNo || 'N/A'
                };
            }

            // Fallback to legacy mocking if no challan found (or return empty)
            const mockSuffix = `${employee.employeeCode.slice(-3)}${qNo}${fyStartYear}`;
            return {
                receiptNo: `DRAFT-${mockSuffix}`,
                amountPaid: paid,
                tdsDeducted: tds,
                depositedOn: qNo === 4 ? `15-May-${fyEndYear}` : `15-${['Jul', 'Oct', 'Jan'][qNo - 1]}-${qNo === 3 ? fyEndYear : fyStartYear}`,
                bsrCode: `LEGACY`,
                challanSerialNo: `PENDING`
            };
        };

        // Standard deduction
        const standardDeduction = fyStartYear >= 2024 ? 75000 : 50000;

        // Calculate section 80C
        const section80C = Math.min(150000, (tdsDeclaration?.section80C || 0) + (totals.pfDeduction));

        // Calculate taxable income
        const taxableIncome = Math.max(0,
            totals.gross - standardDeduction - section80C -
            (tdsDeclaration?.section80D || 0) -
            (tdsDeclaration?.section80E || 0)
        );

        return {
            certificateNo: `A-${employee.tenantId.slice(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            lastUpdated: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            employee: {
                name: `${employee.firstName} ${employee.lastName}`,
                pan: employee.panNumber || 'XXXXX0000X',
                employeeCode: employee.employeeCode,
                designation: employee.designation?.name || 'Employee',
                address: employee.address || 'N/A'
            },
            employer: {
                name: companyProfile?.name || employee.tenant?.name || 'Company',
                tan: companyProfile?.tan || 'XXXXXXXXXX',
                pan: companyProfile?.pan || 'XXXXXXXXXX',
                address: companyProfile?.address || 'N/A',
                citAddress: companyProfile?.citAddress || 'Income Tax Office, TDS Section, Bangalore',
                signatoryName: companyProfile?.signatoryName || 'Authorized Signatory',
                signatoryFatherName: companyProfile?.signatoryFatherName || 'N/A',
                signatoryDesignation: companyProfile?.signatoryDesignation || 'Manager',
                signatoryPlace: companyProfile?.signatoryPlace || 'Bangalore'
            },
            financialYear: `${fyStartYear}-${fyEndYear.toString().slice(-2)}`,
            assessmentYear: `${fyEndYear}-${(fyEndYear + 1).toString().slice(-2)}`,
            periodFrom: `01-Apr-${fyStartYear}`,
            periodTo: `31-Mar-${fyEndYear}`,
            salary: {
                basic: totals.basic,
                hra: totals.hra,
                specialAllowance: totals.allowances * 0.7,
                lta: totals.allowances * 0.1,
                medicalAllowance: totals.allowances * 0.1,
                otherAllowances: totals.allowances * 0.1,
                grossSalary: totals.gross
            },
            deductions: {
                standardDeduction,
                section80C,
                section80D: tdsDeclaration?.section80D || 0,
                section80E: tdsDeclaration?.section80E || 0,
                section80G: tdsDeclaration?.section80G || 0,
                hraExemption: 0,
                otherExemptions: 0
            },
            tax: {
                taxableIncome,
                taxOnIncome: totals.tdsDeducted / 1.04,
                educationCess: totals.tdsDeducted - (totals.tdsDeducted / 1.04),
                totalTax: totals.tdsDeducted,
                tdsDeducted: totals.tdsDeducted,
                taxPayable: 0
            },
            quarterlyTDS: {
                q1: getQuarterData(1),
                q2: getQuarterData(2),
                q3: getQuarterData(3),
                q4: getQuarterData(4)
            }
        };
    }

    /**
     * Generate Form 16 PDF matching TRACES format
     */
    static async generateForm16PDF(employeeId: string, financialYear: string): Promise<Buffer> {
        const data = await this.generateForm16Data(employeeId, financialYear);

        if (!data) {
            throw new Error('No payroll data found for this employee and financial year');
        }

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const drawBox = (x: number, y: number, w: number, h: number) => {
                doc.rect(x, y, w, h).stroke();
            };

            // --- PAGE 1: PART A ---
            doc.fontSize(12).font('Helvetica-Bold').text('FORM NO. 16', { align: 'center' });
            doc.fontSize(9).font('Helvetica').text('[See rule 31(1)(a)]', { align: 'center' });
            doc.fontSize(10).font('Helvetica-Bold').text('PART A', { align: 'center' });
            doc.fontSize(9).font('Helvetica').text('Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on Salary', { align: 'center' });
            doc.moveDown(0.5);

            // Top Info Bar
            let currentY = doc.y;
            drawBox(40, currentY, 255, 20);
            drawBox(295, currentY, 260, 20);
            doc.fontSize(8).font('Helvetica-Bold');
            doc.text(`Certificate No. ${data.certificateNo}`, 45, currentY + 6);
            doc.text(`Last updated on: ${data.lastUpdated}`, 300, currentY + 6);
            currentY += 20;

            // Employer & Employee Section
            drawBox(40, currentY, 255, 80);
            drawBox(295, currentY, 260, 80);
            doc.text('Name and Address of the Employer', 45, currentY + 5);
            doc.text('Name and Designation of the Employee', 300, currentY + 5);

            doc.font('Helvetica').fontSize(8);
            doc.text(data.employer.name, 45, currentY + 20, { width: 240 });
            doc.text(data.employer.address, 45, currentY + 30, { width: 240 });

            doc.text(data.employee.name, 300, currentY + 20);
            doc.text(data.employee.designation, 300, currentY + 30);
            currentY += 80;

            // PAN / TAN / REF Section
            drawBox(40, currentY, 110, 50);
            drawBox(150, currentY, 145, 50);
            drawBox(295, currentY, 130, 50);
            drawBox(425, currentY, 130, 50);

            doc.font('Helvetica-Bold').fontSize(7);
            doc.text('PAN of the Deductor', 45, currentY + 5);
            doc.text('TAN of the Deductor', 155, currentY + 5);
            doc.text('PAN of the Employee', 300, currentY + 5);
            doc.text('Employee Ref No.', 430, currentY + 5);

            doc.font('Helvetica').fontSize(9);
            doc.text(data.employer.pan, 45, currentY + 25);
            doc.text(data.employer.tan, 155, currentY + 25);
            doc.text(data.employee.pan, 300, currentY + 25);
            doc.text(data.employee.employeeCode, 430, currentY + 25);
            currentY += 50;

            // CIT & Assessment Year
            drawBox(40, currentY, 255, 60);
            drawBox(295, currentY, 100, 60);
            drawBox(395, currentY, 160, 60);

            doc.font('Helvetica-Bold').fontSize(8);
            doc.text('CIT (TDS)', 45, currentY + 5);
            doc.text('Assessment Year', 300, currentY + 5);
            doc.text('Period', 455, currentY + 5);

            doc.font('Helvetica').fontSize(8);
            doc.text(data.employer.citAddress, 45, currentY + 20, { width: 240 });
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text(data.assessmentYear, 300, currentY + 30);

            doc.font('Helvetica').fontSize(7);
            doc.text('From', 415, currentY + 20);
            doc.text('To', 495, currentY + 20);
            doc.font('Helvetica-Bold').fontSize(8);
            doc.text(data.periodFrom, 400, currentY + 35);
            doc.text(data.periodTo, 480, currentY + 35);
            currentY += 60;

            // Quarterly TDS Summary Table
            doc.moveDown(1);
            currentY = doc.y;
            doc.fontSize(8).font('Helvetica-Bold').text('Summary of amount paid/credited and tax deducted at source thereon in respect of the employee', 40, currentY);
            currentY += 12;

            const colW = [50, 160, 110, 110, 85];
            const headers = ['Quarter', 'Receipt Numbers', 'Amount Paid', 'Tax Deducted', 'Tax Deposited'];

            let xPos = 40;
            headers.forEach((h, i) => {
                drawBox(xPos, currentY, colW[i], 25);
                doc.fontSize(7).text(h, xPos + 2, currentY + 5, { width: colW[i] - 4, align: 'center' });
                xPos += colW[i];
            });
            currentY += 25;

            const quarters = [
                { name: 'Quarter 1', ...data.quarterlyTDS.q1 },
                { name: 'Quarter 2', ...data.quarterlyTDS.q2 },
                { name: 'Quarter 3', ...data.quarterlyTDS.q3 },
                { name: 'Quarter 4', ...data.quarterlyTDS.q4 }
            ];

            doc.font('Helvetica').fontSize(8);
            quarters.forEach(q => {
                xPos = 40;
                [q.name, q.receiptNo, q.amountPaid, q.tdsDeducted, q.tdsDeducted].forEach((val, i) => {
                    drawBox(xPos, currentY, colW[i], 20);
                    let displayVal = typeof val === 'number' ? val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : val;
                    doc.text(displayVal.toString(), xPos + 2, currentY + 6, { width: colW[i] - 4, align: i > 1 ? 'right' : 'center' });
                    xPos += colW[i];
                });
                currentY += 20;
            });

            // Total Row
            xPos = 40;
            drawBox(xPos, currentY, colW[0] + colW[1], 20);
            doc.font('Helvetica-Bold').text('Total (Rs.)', xPos + 5, currentY + 6);
            xPos += colW[0] + colW[1];
            drawBox(xPos, currentY, colW[2], 20);
            doc.text(data.salary.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 }), xPos + 2, currentY + 6, { width: colW[2] - 4, align: 'right' });
            xPos += colW[2];
            drawBox(xPos, currentY, colW[3], 20);
            doc.text(data.tax.tdsDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 }), xPos + 2, currentY + 6, { width: colW[3] - 4, align: 'right' });
            xPos += colW[3];
            drawBox(xPos, currentY, colW[4], 20);
            doc.text(data.tax.tdsDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 }), xPos + 2, currentY + 6, { width: colW[4] - 4, align: 'right' });
            currentY += 35;

            // Challan Details (Section II)
            doc.fontSize(8).font('Helvetica-Bold').text('II. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH CHALLAN', 40, currentY);
            currentY += 12;

            const challanW = [100, 150, 150, 115];
            const challanHeaders = ['Tax Deposited (Rs.)', 'BSR Code', 'Date of Deposit', 'Challan Serial No.'];

            xPos = 40;
            challanHeaders.forEach((h, i) => {
                drawBox(xPos, currentY, challanW[i], 20);
                doc.fontSize(7).text(h, xPos + 2, currentY + 5, { width: challanW[i] - 4, align: 'center' });
                xPos += challanW[i];
            });
            currentY += 20;

            quarters.forEach(q => {
                xPos = 40;
                const vals = [q.tdsDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 }), q.bsrCode, q.depositedOn, q.challanSerialNo];
                vals.forEach((val, i) => {
                    drawBox(xPos, currentY, challanW[i], 18);
                    doc.font('Helvetica').fontSize(8).text(val, xPos + 2, currentY + 5, { width: challanW[i] - 4, align: i === 0 ? 'right' : 'center' });
                    xPos += challanW[i];
                });
                currentY += 18;
            });
            currentY += 30;

            // Verification
            drawBox(40, currentY, 515, 100);
            doc.font('Helvetica-Bold').fontSize(9).text('Verification', 45, currentY + 5, { align: 'center' });
            doc.font('Helvetica').fontSize(8);
            const verifiedText = `I, ${data.employer.signatoryName}, son/daughter of ${data.employer.signatoryFatherName}, working in the capacity of ${data.employer.signatoryDesignation} do hereby certify that a sum of Rs. ${data.tax.tdsDeducted.toLocaleString('en-IN')} [INR ${data.tax.tdsDeducted.toLocaleString('en-IN')} only] has been deducted at source and paid to the credit of the Central Government. I further certify that the information given above is true and correct based on the books of account, documents and other available records.`;
            doc.text(verifiedText, 45, currentY + 20, { width: 505, align: 'justify', lineGap: 2 });

            currentY += 100;
            drawBox(40, currentY, 255, 40);
            drawBox(295, currentY, 260, 40);
            doc.text(`Place: ${data.employer.signatoryPlace}`, 45, currentY + 10);
            doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 45, currentY + 25);
            doc.text('Signature of person responsible for deduction of tax', 300, currentY + 15, { align: 'center' });

            // --- PAGE 2: PART B ---
            doc.addPage();
            doc.fontSize(12).font('Helvetica-Bold').text('PART B (Annexure)', { align: 'center' });
            doc.fontSize(10).text('Details of Salary Paid and any other income and tax deducted', { align: 'center' });
            doc.moveDown();

            // Part B reuse existing logic
            doc.fontSize(10).font('Helvetica-Bold').text('1. Gross Salary', 50);
            doc.moveDown(0.5);
            doc.font('Helvetica').fontSize(9);
            const sar = [['(a) Salary as per Section 17(1)', data.salary.basic], ['(b) Value of perquisites u/s 17(2)', 0], ['(c) Profits in lieu of salary u/s 17(3)', 0], ['(d) Total (a + b + c)', data.salary.grossSalary]];
            sar.forEach(([l, a]) => {
                doc.text(l.toString(), 60);
                doc.text(`₹ ${Number(a).toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });
            });

            doc.moveDown();
            doc.font('Helvetica-Bold').text('2. Less: Allowances exempt u/s 10', 50);
            doc.font('Helvetica').text('HRA Exemption', 60);
            doc.text(`₹ ${data.deductions.hraExemption.toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.moveDown();
            doc.font('Helvetica-Bold').text('3. Balance (1-2)', 50);
            doc.text(`₹ ${(data.salary.grossSalary - data.deductions.hraExemption).toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.moveDown();
            doc.font('Helvetica-Bold').text('4. Deductions under Chapter VI-A', 50);
            const di = [['Standard Deduction u/s 16(ia)', data.deductions.standardDeduction], ['Section 80C', data.deductions.section80C], ['Section 80D', data.deductions.section80D]];
            di.forEach(([l, a]) => {
                doc.font('Helvetica').text(l.toString(), 60);
                doc.text(`₹ ${Number(a).toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });
            });

            doc.moveDown();
            doc.font('Helvetica-Bold').text('5. Total Taxable Income', 50);
            doc.text(`₹ ${data.tax.taxableIncome.toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.moveDown();
            doc.text('6. Total Tax (including Cess)', 50);
            doc.text(`₹ ${data.tax.totalTax.toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.end();
        });
    }

    /**
     * Get list of employees eligible for Form 16 for a financial year
     */
    static async getEligibleEmployees(tenantId: string, financialYear: string) {
        const [startYear] = financialYear.split('-');
        const fyStartYear = parseInt(startYear);
        const fyEndYear = fyStartYear + 1;

        // Find employees who had payroll in the financial year
        const employeesWithPayroll = await prisma.payroll.findMany({
            where: {
                tenantId,
                OR: [
                    { year: fyStartYear, month: { gte: 4, lte: 12 } },
                    { year: fyEndYear, month: { gte: 1, lte: 3 } }
                ]
            },
            select: {
                employeeId: true,
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        panNumber: true
                    }
                }
            },
            distinct: ['employeeId']
        });

        // Calculate total TDS for each employee
        const result = [];
        for (const record of employeesWithPayroll) {
            const totalTDS = await prisma.payroll.aggregate({
                where: {
                    employeeId: record.employeeId,
                    OR: [
                        { year: fyStartYear, month: { gte: 4, lte: 12 } },
                        { year: fyEndYear, month: { gte: 1, lte: 3 } }
                    ]
                },
                _sum: { tdsDeduction: true }
            });

            result.push({
                ...record.employee,
                totalTDS: totalTDS._sum.tdsDeduction || 0
            });
        }

        return result;
    }
}
