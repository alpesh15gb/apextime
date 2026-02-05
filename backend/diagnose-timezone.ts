const date = new Date('2026-01-08T03:53:37.000Z'); // 09:23 AM IST

console.log('--- TIMEZONE DIAGNOSTIC ---');
console.log('Current Date:', new Date().toString());
console.log('Test Date (UTC):', date.toISOString());
console.log('Test Date (LocaleString):', date.toLocaleString());
console.log('Test Date (en-CA):', date.toLocaleDateString('en-CA'));
console.log('Test Date (en-IN):', date.toLocaleDateString('en-IN'));
console.log('Timezone Offset:', date.getTimezoneOffset());
console.log('Intl TimeZone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('---------------------------');
