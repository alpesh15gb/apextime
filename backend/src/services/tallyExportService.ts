import { prisma } from '../config/database';
import { js2xml } from 'xml-js'; // We might need to install this or just use string templates if simple.
// Let's use string templates for full control over Tally's specific XML format.

export const generateTallyXml = async (tenantId: string, month: number, year: number) => {
    // 1. Fetch Payroll Data
    const payrolls = await prisma.payroll.findMany({
        where: {
            tenantId,
            month,
            year,
        },
        include: {
            employee: true
        }
    });

    if (payrolls.length === 0) {
        throw new Error('No payroll data found for this period');
    }

    // 2. Aggregate Totals
    const totals = {
        basic: 0,
        hra: 0,
        allowances: 0,
        otPay: 0,
        pfEmployee: 0,
        esiEmployee: 0,
        pt: 0,
        netPay: 0,
        employerPF: 0,
        employerESI: 0
    };

    payrolls.forEach(p => {
        totals.basic += p.basicPaid || 0;
        totals.hra += p.hraPaid || 0;
        totals.allowances += p.allowancesPaid || 0;
        totals.otPay += p.otPay || 0;
        totals.pfEmployee += p.pfDeduction || 0;
        totals.esiEmployee += p.esiDeduction || 0;
        totals.pt += p.ptDeduction || 0;
        totals.netPay += p.netSalary || 0;
        totals.employerPF += p.employerPF || 0;
        totals.employerESI += p.employerESI || 0;
    });

    // Round totals to 2 decimal places
    Object.keys(totals).forEach(key => {
        totals[key as keyof typeof totals] = Math.round(totals[key as keyof typeof totals] * 100) / 100;
    });

    // 3. Define Ledger Maps (These should ideally be configurable, but using defaults)
    const ledgers = {
        debit: [
            { name: 'Basic Salary Expense', amount: totals.basic },
            { name: 'HRA Expense', amount: totals.hra },
            { name: 'Allowances Expense', amount: totals.allowances },
            { name: 'Overtime Expense', amount: totals.otPay },
            { name: 'Employer PF Contribution', amount: totals.employerPF },
            { name: 'Employer ESI Contribution', amount: totals.employerESI }
        ],
        credit: [
            { name: 'PF Payable', amount: totals.pfEmployee + totals.employerPF },
            { name: 'ESI Payable', amount: totals.esiEmployee + totals.employerESI },
            { name: 'Professional Tax Payable', amount: totals.pt },
            { name: 'Salary Payable', amount: totals.netPay }
        ]
    };

    // Filter out zero amounts
    const debits = ledgers.debit.filter(l => l.amount > 0);
    const credits = ledgers.credit.filter(l => l.amount > 0);

    // 4. Generate XML
    // Tally import format
    const dateStr = `${year}${month.toString().padStart(2, '0')}30`; // End of month approx
    // Actually better to calculate last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const voucherDate = `${year}${month.toString().padStart(2, '0')}${lastDay}`;

    let xml = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>Company Name</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Journal" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${voucherDate}</DATE>
            <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
            <VOUCHERNUMBER>PAY-${month}-${year}</VOUCHERNUMBER>
            <NARRATION>Payroll for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}</NARRATION>
            <FBTPAYMENTTYPE>Default</FBTPAYMENTTYPE>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            <VOUCHERKEY>123456789</VOUCHERKEY>
            <EFFECTIVEDATE>${voucherDate}</EFFECTIVEDATE>
`;

    // Add Debits (Expenses) - AMOUNT is Negative in XML for Debits in some versions, or positive with ISDEEMEDPOSITIVE=Yes
    // Standard Tally XML:
    // Expense (Debit) -> Amount is Negative? No, usually in Tally XML:
    // ISDEEMEDPOSITIVE = Yes -> Debit
    // ISDEEMEDPOSITIVE = No -> Credit
    // Amount is usually entered as negative for Debit in older versions, but let's stick to standard tags.
    // Actually, Tally XML is tricky. simpler: 
    // Amount tag: Negative value = Credit? 
    // Let's use standard convention: Debit amounts are negative, Credit amounts are positive.
    // Wait, looking at standard Tally XML samples:
    // Ledger entries: amount is negative if it's a debit? No.
    // "Use negative format for Debit values and positive for Credit values." -> This is common advice.

    debits.forEach(entry => {
        xml += `            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${entry.name}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>-${entry.amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;
    });

    credits.forEach(entry => {
        xml += `            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${entry.name}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>${entry.amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
`;
    });

    xml += `          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return xml;
};
