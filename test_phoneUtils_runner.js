const fs = require('fs');
const vm = require('vm');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'phoneUtils.js');
const code = fs.readFileSync(filePath, 'utf8');

const sandbox = { console };
vm.createContext(sandbox);
// Wrap the module code so that top-level const/let declarations can be returned explicitly.
const wrapped = `(function(){\n${code}\nreturn {\n  formatPhoneNumber: (typeof formatPhoneNumber !== 'undefined') ? formatPhoneNumber : undefined,\n  getPhoneNumberType: (typeof getPhoneNumberType !== 'undefined') ? getPhoneNumberType : undefined\n};\n})()`;
let exports;
try {
    exports = vm.runInContext(wrapped, sandbox, { filename: filePath });
} catch (e) {
    console.error('Error evaluating phoneUtils.js in wrapper:', e);
    process.exit(1);
}

if (!exports || typeof exports.formatPhoneNumber !== 'function') {
    console.error('formatPhoneNumber not found in evaluated exports.');
    process.exit(1);
}

const tests = [
    { label: 'mobile (090)', num: '09012345678' },
    { label: 'fixed (03)', num: '0312345678' },
    { label: 'tollfree (0120)', num: '0120123456' },
    { label: 'ipphone (050)', num: '05012345678' },
    { label: 'service 0800 (11-digit)', num: '08001234567' },
    { label: 'special 091', num: '09112345' },
    { label: 'invalid (starts +81)', num: '+811234567890' }
];

for (const t of tests) {
    try {
        const res = sandbox.formatPhoneNumber(t.num);
        console.log(t.label, t.num, '=>', JSON.stringify(res));
    } catch (err) {
        console.log(t.label, t.num, '=> ERROR:', err.message);
    }
}
