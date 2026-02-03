// TDS Calculator for Indian Income Tax
// Supports both Old and New Tax Regimes (FY 2025-26)

export interface TDSDeclaration {
    // Section 80C
    ppf: number;
    elss: number;
    lifeInsurance: number;
    homeLoanPrincipal: number;
    tuitionFees: number;
    nsc: number;

    // Other Sections
    section80D: number; // Health Insurance
    section80E: number; // Education Loan Interest
    section80G: number; // Donations
    section24: number;  // Home Loan Interest

    // HRA
    rentPaid: number;

    // Regime
    taxRegime: 'OLD' | 'NEW';
}

export interface AnnualSalaryBreakup {
    basicAnnual: number;
    hraAnnual: number;
    allowancesAnnual: number;
    otherEarnings: number;
}

export class TDSCalculator {

    /**
     * Calculate monthly TDS based on annual projection
     */
    static calculateMonthlyTDS(
        salaryBreakup: AnnualSalaryBreakup,
        declaration: TDSDeclaration,
        currentMonth: number // 1-12
    ): number {
        const annualTax = this.calculateAnnualTax(salaryBreakup, declaration);
        const monthlyTDS = annualTax / 12;
        return Math.round(monthlyTDS);
    }

    /**
     * Calculate annual tax liability
     */
    static calculateAnnualTax(
        salaryBreakup: AnnualSalaryBreakup,
        declaration: TDSDeclaration
    ): number {
        const grossIncome = salaryBreakup.basicAnnual +
            salaryBreakup.hraAnnual +
            salaryBreakup.allowancesAnnual +
            salaryBreakup.otherEarnings;

        if (declaration.taxRegime === 'NEW') {
            return this.calculateNewRegimeTax(grossIncome);
        } else {
            return this.calculateOldRegimeTax(grossIncome, salaryBreakup, declaration);
        }
    }

    /**
     * New Tax Regime (FY 2025-26) - No deductions except Standard Deduction
     */
    private static calculateNewRegimeTax(grossIncome: number): number {
        const standardDeduction = 75000; // Updated for FY 2025-26
        const taxableIncome = Math.max(0, grossIncome - standardDeduction);

        let tax = 0;

        // New Regime Slabs (FY 2025-26)
        if (taxableIncome <= 300000) {
            tax = 0;
        } else if (taxableIncome <= 700000) {
            tax = (taxableIncome - 300000) * 0.05;
        } else if (taxableIncome <= 1000000) {
            tax = 20000 + (taxableIncome - 700000) * 0.10;
        } else if (taxableIncome <= 1200000) {
            tax = 50000 + (taxableIncome - 1000000) * 0.15;
        } else if (taxableIncome <= 1500000) {
            tax = 80000 + (taxableIncome - 1200000) * 0.20;
        } else {
            tax = 140000 + (taxableIncome - 1500000) * 0.30;
        }

        // Add 4% Health & Education Cess
        tax = tax * 1.04;

        return Math.round(tax);
    }

    /**
     * Old Tax Regime - With all deductions
     */
    private static calculateOldRegimeTax(
        grossIncome: number,
        salaryBreakup: AnnualSalaryBreakup,
        declaration: TDSDeclaration
    ): number {
        const standardDeduction = 50000;

        // Calculate HRA Exemption
        const hraExemption = this.calculateHRAExemption(
            salaryBreakup.basicAnnual,
            salaryBreakup.hraAnnual,
            declaration.rentPaid
        );

        // Income after standard deduction and HRA exemption
        let taxableIncome = grossIncome - standardDeduction - hraExemption;

        // Section 80C (Max 1.5L)
        const section80C = Math.min(150000,
            declaration.ppf +
            declaration.elss +
            declaration.lifeInsurance +
            declaration.homeLoanPrincipal +
            declaration.tuitionFees +
            declaration.nsc
        );
        taxableIncome -= section80C;

        // Section 80D (Health Insurance)
        taxableIncome -= Math.min(25000, declaration.section80D);

        // Section 80E (Education Loan Interest - No limit)
        taxableIncome -= declaration.section80E;

        // Section 80G (Donations - 50% or 100% depending on institution)
        taxableIncome -= Math.min(declaration.section80G * 0.5, declaration.section80G);

        // Section 24 (Home Loan Interest - Max 2L)
        taxableIncome -= Math.min(200000, declaration.section24);

        taxableIncome = Math.max(0, taxableIncome);

        let tax = 0;

        // Old Regime Slabs
        if (taxableIncome <= 250000) {
            tax = 0;
        } else if (taxableIncome <= 500000) {
            tax = (taxableIncome - 250000) * 0.05;
        } else if (taxableIncome <= 1000000) {
            tax = 12500 + (taxableIncome - 500000) * 0.20;
        } else {
            tax = 112500 + (taxableIncome - 1000000) * 0.30;
        }

        // Rebate under Section 87A (if taxable income <= 5L)
        if (taxableIncome <= 500000) {
            tax = Math.max(0, tax - 12500);
        }

        // Add 4% Health & Education Cess
        tax = tax * 1.04;

        return Math.round(tax);
    }

    /**
     * Calculate HRA Exemption
     * Minimum of:
     * 1. Actual HRA received
     * 2. Rent paid - 10% of Basic
     * 3. 50% of Basic (Metro) or 40% of Basic (Non-Metro)
     */
    private static calculateHRAExemption(
        basicAnnual: number,
        hraAnnual: number,
        rentPaid: number
    ): number {
        if (rentPaid === 0) return 0;

        const actualHRA = hraAnnual;
        const rentMinusBasic = Math.max(0, rentPaid - (basicAnnual * 0.10));
        const metroLimit = basicAnnual * 0.50; // Assuming metro

        return Math.min(actualHRA, rentMinusBasic, metroLimit);
    }
}
