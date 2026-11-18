const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'csv-parser.js'), 'utf8');
const FixedDate = class extends Date {
	constructor(...args) {
		super(...(args.length ? args : ['2026-11-10T12:00:00']));
	}
};
const sandbox = { Date: FixedDate };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'csv-parser.js' });

const parseDate = vm.runInContext('_cp_parseDateFromFormat', sandbox);
const convertByType = vm.runInContext('_cp_convertByType', sandbox);
const assertParsedDate = (input, format, year, month, day) => {
	const parsed = parseDate(input, format);
	assert.ok(parsed instanceof FixedDate, `${input} should parse as a date`);
	assert.strictEqual(parsed.getFullYear(), year, `${input} should use the nearest year`);
	assert.strictEqual(parsed.getMonth() + 1, month);
	assert.strictEqual(parsed.getDate(), day);
};

assertParsedDate('10/01', 'MM/DD', 2026, 10, 1);
assertParsedDate('2/1', 'M/D', 2027, 2, 1);
assertParsedDate('02-01', 'MM-DD', 2027, 2, 1);
assertParsedDate('3-1', 'M-D', 2027, 3, 1);
assertParsedDate('02.01', 'MM.DD', 2027, 2, 1);
assertParsedDate('3.1', 'M.D', 2027, 3, 1);
assertParsedDate('02月01日', 'MM月DD日', 2027, 2, 1);
assertParsedDate('3月1日', 'M月D日', 2027, 3, 1);
assertParsedDate('02/29', 'MM/DD', 2028, 2, 29);
assert.strictEqual(convertByType('date', '10/01', 'MM/DD'), '2026-10-01');
assert.strictEqual(parseDate('02/30', 'MM/DD'), null);
assert.strictEqual(parseDate('13/01', 'MM/DD'), null);
assert.strictEqual(parseDate('2026/10/01', 'MM/DD'), null);
assert.strictEqual(parseDate('10/01', 'DD/MM'), null);
assert.strictEqual(parseDate('02月01', 'MM月DD日'), null);

console.log('test-csv-parser: OK');
