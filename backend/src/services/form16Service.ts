// Form 16 Generator Service
// Generates Form 16 (Part A & Part B) for Indian Income Tax compliance

import { prisma } from '../config/database';
import PDFDocument from 'pdfkit';

interface Form16Data {
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
        q1: { tdsDeducted: number; depositedOn: string; challanNo: string };
        q2: { tdsDeducted: number; depositedOn: string; challanNo: string };
        q3: { tdsDeducted: number; depositedOn: string; challanNo: string };
        q4: { tdsDeducted: number; depositedOn: string; challanNo: string };
    };
}

export class Form16Service {

    /**
     * Generate Form 16 data for an employee for a financial year
     */
    static async generateForm16Data(employeeId: string, financialYear: string): Promise<Form16Data | null> {
        // Parse financial year (e.g., "2025-26" -> startYear=2025, endYear=2026)
        const [startYear, endYearShort] = financialYear.split('-');
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

        // Get all payroll records for the financial year (April to March)
        const payrolls = await prisma.payroll.findMany({
            where: {
                employeeId,
                OR: [
                    // April to December of start year
                    { year: fyStartYear, month: { gte: 4, lte: 12 } },
                    // January to March of end year
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
            allowances: acc.allowances + (p.allowancesPaid || 0),
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

        // Calculate quarterly TDS
        const q1Payrolls = payrolls.filter(p =>
            (p.year === fyStartYear && p.month >= 4 && p.month <= 6));
        const q2Payrolls = payrolls.filter(p =>
            (p.year === fyStartYear && p.month >= 7 && p.month <= 9));
        const q3Payrolls = payrolls.filter(p =>
            (p.year === fyStartYear && p.month >= 10 && p.month <= 12));
        const q4Payrolls = payrolls.filter(p =>
            (p.year === fyEndYear && p.month >= 1 && p.month <= 3));

        const sumTDS = (ps: typeof payrolls) => ps.reduce((sum, p) => sum + (p.tdsDeduction || 0), 0);

        // Standard deduction (as per tax regime)
        const standardDeduction = 75000; // FY 2025-26 new regime

        // Calculate section 80C (PF contribution counts)
        const section80C = Math.min(150000, totals.pfDeduction * 12);

        // Calculate taxable income
        const taxableIncome = Math.max(0,
            totals.gross - standardDeduction - section80C -
            (tdsDeclaration?.section80D || 0) -
            (tdsDeclaration?.section80E || 0)
        );

        return {
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
                address: companyProfile?.address || 'N/A'
            },
            financialYear: `${fyStartYear}-${fyEndYear.toString().slice(-2)}`,
            assessmentYear: `${fyEndYear}-${(fyEndYear + 1).toString().slice(-2)}`,
            periodFrom: `01-Apr-${fyStartYear}`,
            periodTo: `31-Mar-${fyEndYear}`,
            salary: {
                basic: totals.basic,
                hra: totals.hra,
                specialAllowance: totals.allowances * 0.6,
                lta: totals.allowances * 0.1,
                medicalAllowance: totals.allowances * 0.1,
                otherAllowances: totals.allowances * 0.2,
                grossSalary: totals.gross
            },
            deductions: {
                standardDeduction,
                section80C,
                section80D: tdsDeclaration?.section80D || 0,
                section80E: tdsDeclaration?.section80E || 0,
                section80G: tdsDeclaration?.section80G || 0,
                hraExemption: 0, // Calculated from rentPaid if needed
                otherExemptions: 0
            },
            tax: {
                taxableIncome,
                taxOnIncome: totals.tdsDeducted / 1.04, // Remove cess
                educationCess: totals.tdsDeducted - (totals.tdsDeducted / 1.04),
                totalTax: totals.tdsDeducted,
                tdsDeducted: totals.tdsDeducted,
                taxPayable: 0 // Assuming TDS = Tax
            },
            quarterlyTDS: {
                q1: { tdsDeducted: sumTDS(q1Payrolls), depositedOn: `15-Jul-${fyStartYear}`, challanNo: `Q1/${fyStartYear}` },
                q2: { tdsDeducted: sumTDS(q2Payrolls), depositedOn: `15-Oct-${fyStartYear}`, challanNo: `Q2/${fyStartYear}` },
                q3: { tdsDeducted: sumTDS(q3Payrolls), depositedOn: `15-Jan-${fyEndYear}`, challanNo: `Q3/${fyStartYear}` },
                q4: { tdsDeducted: sumTDS(q4Payrolls), depositedOn: `15-May-${fyEndYear}`, challanNo: `Q4/${fyStartYear}` }
            }
        };
    }

    /**
     * Generate Form 16 PDF
     */
    static async generateForm16PDF(employeeId: string, financialYear: string): Promise<Buffer> {
        const data = await this.generateForm16Data(employeeId, financialYear);

        if (!data) {
            throw new Error('No payroll data found for this employee and financial year');
        }

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Header
            doc.fontSize(16).font('Helvetica-Bold')
                .text('FORM NO. 16', { align: 'center' });
            doc.fontSize(10).font('Helvetica')
                .text('[See rule 31(1)(a)]', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(11)
                .text('Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary', { align: 'center' });
            doc.moveDown();

            // Part A Header
            doc.fontSize(12).font('Helvetica-Bold')
                .text('PART A', { align: 'center' });
            doc.moveDown(0.5);

            // Employer & Employee Info Box
            doc.rect(50, doc.y, 250, 120).stroke();
            doc.rect(300, doc.y, 245, 120).stroke();

            const leftBoxY = doc.y + 5;
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('EMPLOYER', 55, leftBoxY);
            doc.font('Helvetica').fontSize(8);
            doc.text(`Name: ${data.employer.name}`, 55, leftBoxY + 15);
            doc.text(`TAN: ${data.employer.tan}`, 55, leftBoxY + 30);
            doc.text(`PAN: ${data.employer.pan}`, 55, leftBoxY + 45);
            doc.text(`Address: ${data.employer.address.substring(0, 40)}`, 55, leftBoxY + 60);

            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('EMPLOYEE', 305, leftBoxY);
            doc.font('Helvetica').fontSize(8);
            doc.text(`Name: ${data.employee.name}`, 305, leftBoxY + 15);
            doc.text(`PAN: ${data.employee.pan}`, 305, leftBoxY + 30);
            doc.text(`Emp Code: ${data.employee.employeeCode}`, 305, leftBoxY + 45);
            doc.text(`Designation: ${data.employee.designation}`, 305, leftBoxY + 60);
            doc.text(`Period: ${data.periodFrom} to ${data.periodTo}`, 305, leftBoxY + 75);

            doc.y = leftBoxY + 130;
            doc.moveDown();

            // Assessment Year
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text(`Financial Year: ${data.financialYear}    Assessment Year: ${data.assessmentYear}`, { align: 'center' });
            doc.moveDown();

            // Quarterly TDS Table
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Summary of Tax Deducted at Source (Quarterly)', 50);
            doc.moveDown(0.5);

            const tableTop = doc.y;
            const tableHeaders = ['Quarter', 'TDS Deducted (₹)', 'Deposited On', 'Challan No.'];
            const colWidths = [80, 120, 120, 120];
            let xPos = 50;

            // Table header
            doc.fontSize(8).font('Helvetica-Bold');
            tableHeaders.forEach((h, i) => {
                doc.rect(xPos, tableTop, colWidths[i], 20).stroke();
                doc.text(h, xPos + 5, tableTop + 6, { width: colWidths[i] - 10 });
                xPos += colWidths[i];
            });

            // Table rows
            const quarters = [
                { name: 'Q1 (Apr-Jun)', ...data.quarterlyTDS.q1 },
                { name: 'Q2 (Jul-Sep)', ...data.quarterlyTDS.q2 },
                { name: 'Q3 (Oct-Dec)', ...data.quarterlyTDS.q3 },
                { name: 'Q4 (Jan-Mar)', ...data.quarterlyTDS.q4 }
            ];

            let rowY = tableTop + 20;
            doc.font('Helvetica');
            quarters.forEach(q => {
                xPos = 50;
                doc.rect(xPos, rowY, colWidths[0], 18).stroke();
                doc.text(q.name, xPos + 5, rowY + 5);
                xPos += colWidths[0];

                doc.rect(xPos, rowY, colWidths[1], 18).stroke();
                doc.text(q.tdsDeducted.toLocaleString('en-IN'), xPos + 5, rowY + 5);
                xPos += colWidths[1];

                doc.rect(xPos, rowY, colWidths[2], 18).stroke();
                doc.text(q.depositedOn, xPos + 5, rowY + 5);
                xPos += colWidths[2];

                doc.rect(xPos, rowY, colWidths[3], 18).stroke();
                doc.text(q.challanNo, xPos + 5, rowY + 5);

                rowY += 18;
            });

            // Total row
            xPos = 50;
            doc.font('Helvetica-Bold');
            doc.rect(xPos, rowY, colWidths[0], 18).stroke();
            doc.text('TOTAL', xPos + 5, rowY + 5);
            xPos += colWidths[0];
            doc.rect(xPos, rowY, colWidths[1], 18).stroke();
            doc.text(data.tax.tdsDeducted.toLocaleString('en-IN'), xPos + 5, rowY + 5);
            xPos += colWidths[1];
            doc.rect(xPos, rowY, colWidths[2] + colWidths[3], 18).stroke();

            doc.y = rowY + 30;

            // Part B
            doc.addPage();
            doc.fontSize(12).font('Helvetica-Bold')
                .text('PART B (Annexure)', { align: 'center' });
            doc.fontSize(10)
                .text('Details of Salary Paid and any other income and tax deducted', { align: 'center' });
            doc.moveDown();

            // Salary Breakdown Table
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('1. Gross Salary', 50);
            doc.moveDown(0.5);

            const salaryItems = [
                ['(a) Salary as per Section 17(1)', data.salary.basic],
                ['(b) Value of perquisites u/s 17(2)', 0],
                ['(c) Profits in lieu of salary u/s 17(3)', 0],
                ['(d) Total (a + b + c)', data.salary.grossSalary]
            ];

            doc.font('Helvetica').fontSize(9);
            salaryItems.forEach(([label, amount]) => {
                doc.text(`${label}`, 60);
                doc.text(`₹ ${(amount as number).toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });
            });

            doc.moveDown();
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('2. Less: Allowances exempt u/s 10', 50);
            doc.font('Helvetica').fontSize(9);
            doc.text('HRA Exemption', 60);
            doc.text(`₹ ${data.deductions.hraExemption.toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.moveDown();
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('3. Balance (1-2)', 50);
            doc.font('Helvetica').fontSize(9);
            doc.text(`₹ ${(data.salary.grossSalary - data.deductions.hraExemption).toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.moveDown();
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('4. Deductions under Chapter VI-A', 50);
            doc.font('Helvetica').fontSize(9);

            const deductionItems = [
                ['(a) Standard Deduction u/s 16(ia)', data.deductions.standardDeduction],
                ['(b) Section 80C (PF, PPF, etc.)', data.deductions.section80C],
                ['(c) Section 80D (Health Insurance)', data.deductions.section80D],
                ['(d) Section 80E (Education Loan)', data.deductions.section80E],
                ['(e) Section 80G (Donations)', data.deductions.section80G]
            ];

            deductionItems.forEach(([label, amount]) => {
                doc.text(`${label}`, 60);
                doc.text(`₹ ${(amount as number).toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });
            });

            doc.moveDown();
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('5. Total Taxable Income (3-4)', 50);
            doc.text(`₹ ${data.tax.taxableIncome.toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.moveDown();
            doc.text('6. Tax on Total Income', 50);
            doc.text(`₹ ${data.tax.taxOnIncome.toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.moveDown();
            doc.text('7. Health & Education Cess @ 4%', 50);
            doc.text(`₹ ${data.tax.educationCess.toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.moveDown();
            doc.text('8. Total Tax Payable (6+7)', 50);
            doc.text(`₹ ${data.tax.totalTax.toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.moveDown();
            doc.text('9. Tax Deducted at Source', 50);
            doc.text(`₹ ${data.tax.tdsDeducted.toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            doc.moveDown();
            doc.text('10. Tax Payable / Refundable (8-9)', 50);
            doc.text(`₹ ${data.tax.taxPayable.toLocaleString('en-IN')}`, 400, doc.y - 12, { align: 'right' });

            // Verification
            doc.moveDown(2);
            doc.fontSize(9).font('Helvetica');
            doc.text('VERIFICATION', { align: 'center' });
            doc.moveDown(0.5);
            doc.text(`I, __________________, son/daughter of __________________, working as __________________ `);
            doc.text(`(designation) do hereby certify that a sum of Rs. ${data.tax.tdsDeducted.toLocaleString('en-IN')} `);
            doc.text(`[Rupees __________________ only] has been deducted at source and paid to the credit of `);
            doc.text(`the Central Government. I further certify that the information given above is true, complete and `);
            doc.text(`correct and is based on the books of account, documents, TDS statements and other available `);
            doc.text(`records.`);

            doc.moveDown(2);
            doc.text('Place: __________________', 50);
            doc.text('Date: __________________', 50);
            doc.text('Signature of the person responsible', 350);
            doc.text('for deducting tax at source', 350);

            doc.moveDown(2);
            doc.fontSize(8).text('Note: This is a computer generated Form 16 and does not require signature if generated electronically.', { align: 'center' });

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

        // Find employees who had TDS deducted in the financial year
        const employeesWithTDS = await prisma.payroll.findMany({
            where: {
                tenantId,
                // tdsDeduction: { gt: 0 }, // Allow all employees to be searchable
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
        for (const record of employeesWithTDS) {
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
