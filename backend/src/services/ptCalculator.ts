// Professional Tax Calculator - State-wise (India)
// Updated rates as of FY 2025-26

export class PTCalculator {

    /**
     * Calculate monthly PT based on state and gross salary
     */
    static calculatePT(stateCode: string | null, monthlyGross: number): number {
        if (!stateCode) return 0;

        const state = stateCode.toUpperCase();

        switch (state) {
            case 'KA': // Karnataka
            case 'KARNATAKA':
                return this.calculateKarnatakaPT(monthlyGross);

            case 'MH': // Maharashtra
            case 'MAHARASHTRA':
                return this.calculateMaharashtraPT(monthlyGross);

            case 'WB': // West Bengal
            case 'WEST BENGAL':
                return this.calculateWestBengalPT(monthlyGross);

            case 'TN': // Tamil Nadu (Abolished from 2011)
            case 'TAMIL NADU':
                return 0;

            case 'AP': // Andhra Pradesh
            case 'ANDHRA PRADESH':
                return this.calculateAndhraPradeshPT(monthlyGross);

            case 'TS': // Telangana
            case 'TELANGANA':
                return this.calculateTelanganaPT(monthlyGross);

            case 'GJ': // Gujarat
            case 'GUJARAT':
                return this.calculateGujaratPT(monthlyGross);

            case 'MP': // Madhya Pradesh
            case 'MADHYA PRADESH':
                return this.calculateMadhyaPradeshPT(monthlyGross);

            case 'AS': // Assam
            case 'ASSAM':
                return this.calculateAssamPT(monthlyGross);

            case 'CG': // Chhattisgarh
            case 'CHHATTISGARH':
                return this.calculateChhattisgarhPT(monthlyGross);

            case 'OR': // Odisha
            case 'ODISHA':
                return this.calculateOdishaPT(monthlyGross);

            case 'JH': // Jharkhand
            case 'JHARKHAND':
                return this.calculateJharkhandPT(monthlyGross);

            default:
                return 0; // States without PT
        }
    }

    /**
     * Karnataka PT
     * Flat ₹200/month for salary > ₹15,000
     */
    private static calculateKarnatakaPT(monthlyGross: number): number {
        if (monthlyGross <= 15000) return 0;
        return 200;
    }

    /**
     * Maharashtra PT (Slab-based)
     */
    private static calculateMaharashtraPT(monthlyGross: number): number {
        if (monthlyGross <= 7500) return 0;
        if (monthlyGross <= 10000) return 175;
        if (monthlyGross <= 25000) return 200; // Feb: 300
        return 200; // Feb: 300
    }

    /**
     * West Bengal PT (Slab-based)
     */
    private static calculateWestBengalPT(monthlyGross: number): number {
        if (monthlyGross <= 8500) return 0;
        if (monthlyGross <= 10000) return 110;
        if (monthlyGross <= 15000) return 130;
        if (monthlyGross <= 25000) return 150;
        if (monthlyGross <= 40000) return 160;
        return 200; // Above 40,000
    }

    /**
     * Andhra Pradesh PT
     */
    private static calculateAndhraPradeshPT(monthlyGross: number): number {
        if (monthlyGross <= 15000) return 0;
        if (monthlyGross <= 20000) return 150;
        return 200;
    }

    /**
     * Telangana PT
     */
    private static calculateTelanganaPT(monthlyGross: number): number {
        if (monthlyGross <= 15000) return 0;
        if (monthlyGross <= 20000) return 150;
        return 200;
    }

    /**
     * Gujarat PT
     */
    private static calculateGujaratPT(monthlyGross: number): number {
        if (monthlyGross <= 5999) return 0;
        if (monthlyGross <= 8999) return 20;
        if (monthlyGross <= 11999) return 40;
        if (monthlyGross <= 14999) return 60;
        if (monthlyGross <= 17999) return 80;
        return 200; // Above 18,000
    }

    /**
     * Madhya Pradesh PT
     */
    private static calculateMadhyaPradeshPT(monthlyGross: number): number {
        if (monthlyGross <= 15000) return 0;
        if (monthlyGross <= 20000) return 150;
        return 200;
    }

    /**
     * Assam PT
     */
    private static calculateAssamPT(monthlyGross: number): number {
        if (monthlyGross <= 10000) return 0;
        if (monthlyGross <= 15000) return 150;
        if (monthlyGross <= 25000) return 180;
        return 208;
    }

    /**
     * Chhattisgarh PT
     */
    private static calculateChhattisgarhPT(monthlyGross: number): number {
        if (monthlyGross <= 12500) return 0;
        if (monthlyGross <= 16666) return 150;
        return 200;
    }

    /**
     * Odisha PT
     */
    private static calculateOdishaPT(monthlyGross: number): number {
        if (monthlyGross <= 5000) return 0;
        if (monthlyGross <= 8000) return 30;
        if (monthlyGross <= 12000) return 50;
        if (monthlyGross <= 20000) return 75;
        if (monthlyGross <= 40000) return 100;
        return 200;
    }

    /**
     * Jharkhand PT
     */
    private static calculateJharkhandPT(monthlyGross: number): number {
        if (monthlyGross <= 10000) return 0;
        if (monthlyGross <= 15000) return 150;
        if (monthlyGross <= 25000) return 180;
        return 200;
    }

    /**
     * Get annual PT (some states have different Feb calculation)
     */
    static calculateAnnualPT(stateCode: string | null, monthlyGross: number): number {
        if (!stateCode) return 0;

        const state = stateCode.toUpperCase();
        const regularMonthPT = this.calculatePT(stateCode, monthlyGross);

        // Maharashtra has higher PT in February
        if (state === 'MH' || state === 'MAHARASHTRA') {
            if (monthlyGross > 10000) {
                return (regularMonthPT * 11) + 300; // Feb is 300
            }
        }

        return regularMonthPT * 12;
    }
}
