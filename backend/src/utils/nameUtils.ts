
/**
 * Normalizes a name for comparison by:
 * 1. Trimming whitespace
 * 2. Converting to lowercase
 * 3. Removing all special characters (dots, commas, hyphens, etc.)
 * 4. Removing all spaces
 */
export function normalizeName(firstName: string, lastName: string = ''): string {
    const full = `${firstName} ${lastName}`.trim().toLowerCase();
    return full.replace(/[^a-z0-9]/g, '');
}

/**
 * Parses a full name into first and last name components.
 */
export function parseEmployeeName(fullName: string): { firstName: string, lastName: string } {
    if (!fullName || fullName.trim() === '') {
        return { firstName: 'Employee', lastName: 'Unknown' };
    }

    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }

    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
}
