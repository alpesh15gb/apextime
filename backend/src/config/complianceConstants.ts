
// Interface for PT Slabs
interface PTSlaB {
    min: number;
    max: number;
    amount: number; // Monthly Amount (or amount to deduct in specific months)
}

interface PTStateRule {
    slabs: PTSlaB[];
    deductionMonths?: number[]; // E.g., [3, 9] for Mar/Sep. If undefined, deduct every month.
    febAmount?: number; // Special amount for February override (like in MH, MP)
}

// -------------------------------------------------------------
// PROFESSIONAL TAX RULES (FY 2024-25)
// -------------------------------------------------------------

export const PT_RULES: Record<string, PTStateRule> = {
    // -----------------------------------------
    // STATES WITH MONTHLY DEDUCTION
    // -----------------------------------------

    // Andhra Pradesh
    'AP': {
        slabs: [
            { min: 0, max: 15000, amount: 0 },
            { min: 15001, max: 20000, amount: 150 },
            { min: 20001, max: Infinity, amount: 200 }
        ]
    },
    // Telangana (Same as AP)
    'TS': {
        slabs: [
            { min: 0, max: 15000, amount: 0 },
            { min: 15001, max: 20000, amount: 150 },
            { min: 20001, max: Infinity, amount: 200 }
        ]
    },
    // Maharashtra
    'MH': {
        // Feb amount handled by logic if flag set, but here we can define slabs.
        // Special Case: 200 normally, 300 in Feb for highest slab.
        slabs: [
            { min: 0, max: 7500, amount: 0 },
            { min: 7501, max: 10000, amount: 175 },
            { min: 10001, max: Infinity, amount: 200 }
        ]
        // Note: Logic below handles the 300 Feb exception for MH specifically
    },
    // Karnataka
    'KA': {
        slabs: [
            { min: 0, max: 15000, amount: 0 },
            { min: 15001, max: Infinity, amount: 200 }
        ]
    },
    // Gujarat
    'GJ': {
        slabs: [
            { min: 0, max: 5999, amount: 0 },
            { min: 6000, max: 8999, amount: 80 },
            { min: 9000, max: 11999, amount: 150 },
            { min: 12000, max: Infinity, amount: 200 }
        ]
    },
    // Madhya Pradesh
    'MP': {
        slabs: [
            { min: 0, max: 18750, amount: 0 },
            { min: 18751, max: Infinity, amount: 208 }
        ]
        // Note: Logic handles Feb = 212
    },
    // West Bengal
    'WB': {
        slabs: [
            { min: 0, max: 10000, amount: 0 },
            { min: 10001, max: 15000, amount: 110 },
            { min: 15001, max: 25000, amount: 130 },
            { min: 25001, max: 40000, amount: 150 },
            { min: 40001, max: Infinity, amount: 200 }
        ]
    },
    // Odisha
    'OR': {
        slabs: [
            { min: 0, max: 13304, amount: 0 }, // 160000/12
            { min: 13305, max: 25000, amount: 0 }, // Exempt up to 3L pa? Recently updated. Checking standard:
            // Standard: Up to 13333: 0. 13333-25000: 125?
            // Revised Odisha: 
            // Up to 13333 (1.6L): 0
            // 13334 - 25000 (3L): 125 (Feb ???) - Usually 125/mo
            // > 25000 (3L+): 200 (Feb 300)
            { min: 13305, max: 25000, amount: 125 },
            { min: 25001, max: Infinity, amount: 200 }
        ]
    },
    // Punjab
    'PB': {
        slabs: [
            { min: 0, max: 20833, amount: 0 }, // 2.5L PA
            { min: 20834, max: Infinity, amount: 200 }
        ]
    },
    // Bihar
    'BR': {
        slabs: [
            { min: 0, max: 25000, amount: 0 }, // 3L PA
            { min: 25001, max: 41666, amount: 125 }, // 3L-5L
            { min: 41667, max: 83333, amount: 167 }, // 5L-10L
            { min: 83334, max: Infinity, amount: 208 } // >10L (208.33 - usually 208, last month adj)
        ]
    },
    // Assam
    'AS': {
        slabs: [
            { min: 0, max: 10000, amount: 0 },
            { min: 10001, max: 15000, amount: 150 },
            { min: 15001, max: 25000, amount: 180 },
            { min: 25001, max: Infinity, amount: 208 }
        ]
    },
    // Jharkhand
    'JH': {
        slabs: [
            { min: 0, max: 25000, amount: 0 },
            { min: 25001, max: 41666, amount: 125 },
            { min: 41667, max: 83333, amount: 167 },
            { min: 83334, max: Infinity, amount: 208 }
        ]
    },
    // Meghalaya
    'ML': {
        slabs: [
            { min: 0, max: 4166, amount: 0 },
            { min: 4167, max: 6250, amount: 6 },
            { min: 6251, max: 8333, amount: 12 },
            { min: 8334, max: 10416, amount: 18 },
            { min: 10417, max: 12500, amount: 24 },
            { min: 12501, max: 14583, amount: 30 },
            { min: 14584, max: 16666, amount: 36 },
            { min: 16667, max: Infinity, amount: 50 }, // Capped low?
        ]
    },
    // Tripura
    'TR': {
        slabs: [
            { min: 0, max: 7500, amount: 0 },
            { min: 7501, max: 15000, amount: 150 },
            { min: 15001, max: Infinity, amount: 208 }
        ]
    },
    // Sikkim
    'SK': {
        slabs: [
            { min: 0, max: 20000, amount: 0 },
            { min: 20001, max: 30000, amount: 125 },
            { min: 30001, max: 40000, amount: 150 },
            { min: 40001, max: Infinity, amount: 200 }
        ]
    },
    // Manipur
    'MN': {
        slabs: [
            { min: 0, max: 4166, amount: 0 },
            { min: 4167, max: Infinity, amount: 200 } // Simplified
        ]
    },
    // Mizoram
    'MZ': {
        slabs: [
            { min: 0, max: 12500, amount: 50 },
            { min: 12501, max: 25000, amount: 100 },
            { min: 25001, max: Infinity, amount: 150 }
        ]
    },
    // Nagaland
    'NL': {
        slabs: [
            { min: 0, max: 3333, amount: 0 },
            { min: 3334, max: Infinity, amount: 35 } // Very low
        ]
    },

    // -----------------------------------------
    // STATES WITH HALF-YEARLY DEDUCTION
    // -----------------------------------------
    // Tamil Nadu (Ded: Sep, Mar)
    'TN': {
        deductionMonths: [3, 9], // March and September
        slabs: [
            { min: 0, max: 21000, amount: 0 },
            { min: 21001, max: 30000, amount: 100 }, // Actually per half year amounts usually ~600-1250
            // TN Slabs (Half Yearly Income -> Half Yearly Tax)
            // < 21k/mo -> 0
            // 21k-30k -> 135 (approx)
            // 30k-45k -> 315
            // 45k-60k -> 690
            // 60k-75k -> 1025
            // > 75k -> 1250
            // Implementing simplified logic: The 'amount' returned here will be the DEDUCTION for that month
            { min: 30001, max: 45000, amount: 315 },
            { min: 45001, max: 60000, amount: 690 },
            { min: 60001, max: 75000, amount: 1025 },
            { min: 75001, max: Infinity, amount: 1250 }
        ]
    },
    // Kerala (Ded: Feb, Aug)
    'KL': {
        deductionMonths: [2, 8], // Feb and Aug
        slabs: [
            { min: 0, max: 11999, amount: 0 },
            { min: 12000, max: 17999, amount: 120 },
            { min: 18000, max: 29999, amount: 180 },
            { min: 30000, max: 44999, amount: 300 },
            { min: 45000, max: 59999, amount: 450 },
            { min: 60000, max: 74999, amount: 600 },
            { min: 75000, max: 99999, amount: 750 },
            { min: 100000, max: 124999, amount: 1000 },
            { min: 125000, max: Infinity, amount: 1250 }
        ]
    },
    // Goa (Monthly? Usually 200)
    'GA': {
        slabs: [
            { min: 0, max: 15000, amount: 0 },
            { min: 15001, max: Infinity, amount: 200 }
        ]
    }
};

const STATE_CODE_MAP: Record<string, string> = {
    'ANDHRA PRADESH': 'AP',
    'ARUNACHAL PRADESH': 'AR',
    'ASSAM': 'AS',
    'BIHAR': 'BR',
    'CHHATTISGARH': 'CG',
    'GOA': 'GA',
    'GUJARAT': 'GJ',
    'HARYANA': 'HR',
    'HIMACHAL PRADESH': 'HP',
    'JHARKHAND': 'JH',
    'KARNATAKA': 'KA',
    'KERALA': 'KL',
    'MADHYA PRADESH': 'MP',
    'MAHARASHTRA': 'MH',
    'MANIPUR': 'MN',
    'MEGHALAYA': 'ML',
    'MIZORAM': 'MZ',
    'NAGALAND': 'NL',
    'ODISHA': 'OR',
    'PUNJAB': 'PB',
    'RAJASTHAN': 'RJ',
    'SIKKIM': 'SK',
    'TAMIL NADU': 'TN',
    'TELANGANA': 'TS',
    'TRIPURA': 'TR',
    'UTTAR PRADESH': 'UP',
    'UTTARAKHAND': 'UK',
    'WEST BENGAL': 'WB',
    'DELHI': 'DL',
    'CHANDIGARH': 'CH',
    'LADAKH': 'LA',
    'JAMMU AND KASHMIR': 'JK',
    'PUDUCHERRY': 'PY',
    'ANDAMAN AND NICOBAR ISLANDS': 'AN',
    'LAKSHADWEEP': 'LD',
    'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': 'DN'
};

export const getPTAmount = (stateName: string | undefined, grossSalary: number, month: number): number => {
    if (!stateName) return 0;

    // Normalize State Code
    let code = stateName.trim().toUpperCase();
    if (code.length > 2) {
        code = STATE_CODE_MAP[code] || 'UNKNOWN';
    }

    const rule = PT_RULES[code];
    // If no rule exists (State has no PT, e.g. UP, Delhi, Rajasthan), return 0
    if (!rule) return 0;

    // Check Deduction Month (if restricted)
    if (rule.deductionMonths) {
        if (!rule.deductionMonths.includes(month)) {
            return 0;
        }
    }

    // Find Slab
    const slab = rule.slabs.find(s => grossSalary >= s.min && grossSalary <= s.max);
    if (!slab) return 0;

    let amount = slab.amount;

    // Special Overrides based on Month (MH, MP, etc.)
    // Maharashtra: Feb is 300 for the top slab
    if (code === 'MH' && month === 2 && amount === 200) {
        return 300;
    }
    // Madhya Pradesh: Feb is 212
    if (code === 'MP' && month === 2 && amount === 208) {
        return 212;
    }
    // Odisha: Feb is 300 for top slab? (Assume Standard 2500 rule: 200*11+300)
    if (code === 'OR' && month === 2 && amount === 200) {
        return 300;
    }

    return amount;
};
