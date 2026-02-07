const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Find the SalaryComponent model definition
const modelRegex = /model SalaryComponent \{([\s\S]*?)\}/;
const match = content.match(modelRegex);

if (match) {
    const modelBody = match[1];

    // Check if fields already exist
    if (!modelBody.includes('isEPFApplicable')) {
        // Find a suitable insertion point, e.g., after isActive
        const isActiveRegex = /(\s+isActive\s+Boolean\s+@default\(true\))/;
        const newFields = `\n  isEPFApplicable   Boolean  @default(false)\n  isESIApplicable   Boolean  @default(false)\n  isVariable        Boolean  @default(false)`;

        const newModelBody = modelBody.replace(isActiveRegex, `$1${newFields}`);

        // Replace in full content
        content = content.replace(modelBody, newModelBody);
        fs.writeFileSync(schemaPath, content, 'utf8');
        console.log('Successfully updated SalaryComponent schema.');
    } else {
        console.log('Fields already exist.');
    }
} else {
    console.error('SalaryComponent model not found.');
}
