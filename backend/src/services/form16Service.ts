import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';
import { TDSCalculator } from './tdsCalculator';

export class Form16Service {
    /**
     * Generate Form 16 Part B for an employee
     */
    static async generatePartB(employeeId: string, financialYear: string, res: any) {
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                designation: true,
                department: true,
                tenant: true,
            }
        });

        if (!employee) throw new Error('Employee not found');

        // Fetch all payrolls for the financial year
        const [startYear, endYearSuffix] = financialYear.split('-');
        const fullEndYear = `20${endYearSuffix}`;

        const payrolls = await prisma.payroll.findMany({
            where: {
                employeeId,
                OR: [
                    { year: parseInt(startYear), month: { gte: 4 } },
                    { year: parseInt(fullEndYear), month: { lte: 3 } }
                ]
            }
        });

        // Fetch TDS Declaration
        const declaration = await prisma.tDSDeclaration.findUnique({
            where: {
                employeeId_financialYear_tenantId: {
                    employeeId,
                    financialYear,
                    tenantId: employee.tenantId
                }
            }
        });

        // Calculate Totals
        const grossSalary = payrolls.reduce((acc, p) => acc + (p.grossSalary || 0), 0);
        const basicAnnual = payrolls.reduce((acc, p) => acc + (p.basicPaid || 0), 0);
        const hraAnnual = payrolls.reduce((acc, p) => acc + (p.hraPaid || 0), 0);
        const allowancesAnnual = grossSalary - basicAnnual - hraAnnual;

        const taxPaid = payrolls.reduce((acc, p) => acc + (p.tdsDeduction || 0), 0);

        // Standard Deduction
        const standardDeduction = declaration?.taxRegime === 'NEW' ? 75000 : 50000;

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Form16_PartB_${employee.employeeCode}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(16).font('Helvetica-Bold').text('FORM NO. 16', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Part B (Annexure)', { align: 'center' });
        doc.moveDown();

        doc.fontSize(10).font('Helvetica-Bold').text('Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary');
        doc.moveDown();

        // Employer & Employee Table
        const tableTop = doc.y;
        doc.rect(50, tableTop, 500, 100).stroke();
        doc.lineCap('butt').moveTo(300, tableTop).lineTo(300, tableTop + 100).stroke();

        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('Name and address of the Employer', 60, tableTop + 10);
        doc.font('Helvetica').text(employee.tenant.name, 60, tableTop + 25);

        doc.font('Helvetica-Bold').text('Name and address of the Employee', 310, tableTop + 10);
        doc.font('Helvetica').text(`${employee.firstName} ${employee.lastName}`, 310, tableTop + 25);
        doc.text(employee.designation?.name || '', 310, tableTop + 35);

        doc.moveDown(6);

        // PAN/TAN Table
        const panTop = doc.y;
        doc.rect(50, panTop, 500, 40).stroke();
        doc.moveTo(175, panTop).lineTo(175, panTop + 40).stroke();
        doc.moveTo(300, panTop).lineTo(300, panTop + 40).stroke();
        doc.moveTo(425, panTop).lineTo(425, panTop + 40).stroke();

        doc.fontSize(7).font('Helvetica-Bold');
        doc.text('PAN of Employer', 55, panTop + 5);
        doc.text('TAN of Employer', 180, panTop + 5);
        doc.text('PAN of Employee', 305, panTop + 5);
        doc.text('Assessment Year', 430, panTop + 5);

        doc.font('Helvetica').fontSize(9);
        doc.text('XXXXX0000X', 55, panTop + 20); // Placeholder
        doc.text('XXXX00000X', 180, panTop + 20); // Placeholder
        doc.text(employee.panNumber || 'N/A', 305, panTop + 20);
        const ay = `${parseInt(startYear) + 1}-${(parseInt(startYear) + 2).toString().slice(-2)}`;
        doc.text(ay, 430, panTop + 20);

        doc.moveDown(4);

        // Details of Salary Paid
        doc.fontSize(10).font('Helvetica-Bold').text('Details of Salary Paid and any other income and tax deducted');
        doc.moveDown();

        const salaryTableTop = doc.y;
        const rowHeight = 20;
        let currentY = salaryTableTop;

        const drawRow = (label: string, amount: number, isBold = false) => {
            doc.rect(50, currentY, 500, rowHeight).stroke();
            doc.moveTo(400, currentY).lineTo(400, currentY + rowHeight).stroke();
            doc.fontSize(9).font(isBold ? 'Helvetica-Bold' : 'Helvetica').text(label, 60, currentY + 5);
            doc.text(amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 410, currentY + 5, { width: 130, align: 'right' });
            currentY += rowHeight;
        };

        drawRow('1. Gross Salary', grossSalary, true);
        drawRow('   (a) Salary as per provisions contained in sec. 17(1)', grossSalary);
        drawRow('   (b) Value of perquisites u/s 17(2)', 0);
        drawRow('   (c) Profits in lieu of salary u/s 17(3)', 0);

        drawRow('2. Less: Allowances to the extent exempt u/s 10', hraAnnual);

        const balance = grossSalary - hraAnnual;
        drawRow('3. Balance (1 - 2)', balance, true);

        drawRow('4. Less: Deductions u/s 16', standardDeduction);
        drawRow('   (a) Standard Deduction u/s 16(ia)', standardDeduction);
        drawRow('   (b) Entertainment allowance u/s 16(ii)', 0);
        drawRow('   (c) Tax on employment u/s 16(iii)', 0);

        const incomeChargeable = balance - standardDeduction;
        drawRow('5. Income Chargeable under the head "Salaries" (3 - 4)', incomeChargeable, true);

        // Deductions
        doc.moveDown();
        doc.fontSize(9).font('Helvetica-Bold').text('6. Deductions under Chapter VI-A');
        currentY = doc.y + 5;

        if (declaration) {
            if (declaration.ppf > 0) drawRow('   - Public Provident Fund (PPF)', declaration.ppf);
            if (declaration.lifeInsurance > 0) drawRow('   - Life Insurance Premium', declaration.lifeInsurance);
            if (declaration.section80D > 0) drawRow('   - Health Insurance (80D)', declaration.section80D);
        }

        const totalDeductions = (declaration?.ppf || 0) + (declaration?.lifeInsurance || 0) + (declaration?.section80D || 0);
        drawRow('7. Total amount of deductions under Chapter VI-A', totalDeductions, true);

        const taxableTotal = incomeChargeable - totalDeductions;
        drawRow('8. Total Income (5 - 7)', taxableTotal, true);

        // Tax Calculation (Simplified for the PDF)
        const taxOnTotal = TDSCalculator.calculateAnnualTax(
            { basicAnnual, hraAnnual, allowancesAnnual, otherEarnings: 0 },
            { ...declaration, taxRegime: (declaration?.taxRegime as any) || 'OLD' } as any
        );

        drawRow('9. Tax on Total Income', taxOnTotal, true);
        drawRow('10. Less: Rebate u/s 87A', taxableTotal <= 500000 ? Math.min(taxOnTotal, 12500) : 0);
        drawRow('11. Surcharge / Cess', taxOnTotal * 0.04);
        drawRow('12. Tax Payable', taxOnTotal, true);
        drawRow('13. Tax Deducted at Source', taxPaid, true);

        doc.moveDown(2);
        doc.fontSize(8).text('Verification: I, authorized signatory, do hereby certify that a sum of Rs. ' + taxPaid.toLocaleString() + ' has been deducted and deposited to the credit of the Central Government.', { align: 'justify' });

        doc.end();
    }
}
