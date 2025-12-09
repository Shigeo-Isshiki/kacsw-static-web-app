const assert = require('assert');
const path = require('path');

// ブラウザ公開スタイルに合わせて global.window を設定してから読み込む
global.window = global;
require(path.join(__dirname, '..', 'src', 'csv-builder'));
const buildRow = global.CSV && global.CSV.buildRow ? global.CSV.buildRow : null;
const buildCSV = global.CSV && global.CSV.buildCSV ? global.CSV.buildCSV : null;
const buildCSVPlain = buildCSV; // alias
if (!buildRow || !buildCSV) throw new Error('buildRow/buildCSV が公開されていません');

const eq = (a, b, msg) => assert.strictEqual(a, b, msg || `Expected: ${b}\nGot: ${a}`);

// ----- test-csv.js (basic quoting/newline/comma handling) -----
try {
	const schema = [
		{ key: 'id', label: 'ID' },
		{ key: 'name', label: '名前' },
		{ key: 'bio', label: '備考' },
	];

	const data = [
		{ id: 1, name: '太郎', bio: 'Hello, "friend"\nNewline' },
		{ id: 2, name: '花子', bio: 'No comma' },
	];

	const csv = buildCSV(schema, data, { header: true });
	const expected = 'ID,名前,備考\n1,太郎,"Hello, ""friend""\nNewline"\n2,花子,No comma';
	assert.strictEqual(csv, expected, `CSV did not match.\nExpected:\n${expected}\n\nGot:\n${csv}`);
	console.log('PASS: basic CSV quoting/comma/newline handling');
} catch (e) {
	console.error('FAIL: basic CSV', e && e.message ? e.message : e);
	process.exitCode = 2;
}

// ----- test-csv-format.js (formatting/buildRow tests) -----
try {
	// 1) date formats
	const date = new Date(2025, 10, 9); // 2025-11-09
	const schemaDates = [
		{ key: 'd1', label: 'd1', type: 'date' },
		{ key: 'd2', label: 'd2', type: 'date', format: 'YYYY/MM/DD' },
		{ key: 'd3', label: 'd3', type: 'date', format: 'YYYYMMDD' },
		{ key: 'd4', label: 'd4', type: 'date', format: 'YMMDD' },
		{ key: 'd5', label: 'd5', type: 'date', format: 'UNIX' },
		{ key: 'd6', label: 'd6', type: 'date', format: 'UNIX_MS' },
		{ key: 'd7', label: 'd7', type: 'date', format: 'YYYY年MM月DD日' },
		{ key: 'd8', label: 'd8', type: 'date', format: 'YYYY年M月D日' },
	];
	const rowDates = { d1: date, d2: date, d3: date, d4: date, d5: date, d6: date };
	// include the two Japanese formats (padded and non-padded)
	rowDates.d7 = date;
	rowDates.d8 = date;
	const r = buildRow(schemaDates, rowDates, { delimiter: ',' });
	const expectDates = [
		'2025-11-09',
		'2025/11/09',
		'20251109',
		'51109',
		String(Math.floor(date.getTime() / 1000)),
		String(date.getTime()),
		'2025年11月09日',
		'2025年11月9日',
	].join(',');
	eq(r, expectDates, 'date formats mismatch');

	// 2) unix seconds input interpreted
	const unixSec = Math.floor(Date.UTC(2025, 10, 9, 0, 0, 0) / 1000);
	const schemaUnixInput = [
		{ key: 't', type: 'date', format: 'YYYY-MM-DD' },
		{ key: 'u', type: 'date', format: 'UNIX' },
	];
	const rowUnixInput = { t: unixSec, u: unixSec };
	const r2 = buildRow(schemaUnixInput, rowUnixInput);
	eq(
		r2,
		`${new Date(unixSec * 1000).toISOString().slice(0, 10)},${unixSec}`,
		'unix second input handling'
	);

	// 3) numbers zero-pad width etc
	const schemaNums = [
		{ key: 'a', type: 'number', format: { width: 5 } },
		{ key: 'b', type: 'number', format: { width: 5 } },
		{ key: 'c', type: 'number', format: { width: 5 } },
	];
	const rowNums = { a: 123, b: -42, c: 12.34 };
	const r3 = buildRow(schemaNums, rowNums);
	eq(r3, '00123,-00042,00012', 'number zero-pad/negative/decimal handling');

	// 4) leading zero preserved for strings
	const schemaZip = [{ key: 'zip', type: 'string' }];
	const r4 = buildRow(schemaZip, { zip: '01234' });
	eq(r4, '01234', 'leading zero string should be preserved');

	// 5) dot-path, default function, formatter
	const schemaExtra = [
		{ key: 'user.name', label: 'name' },
		{
			key: 'score',
			label: 'score',
			default: (rec) => (rec.user && rec.user.defaultScore ? rec.user.defaultScore : 0),
		},
		{ key: 'code', label: 'code', formatter: (v) => `X-${v}` },
	];
	const dataExtra = { user: { name: '太郎', defaultScore: 7 }, code: 99 };
	const r5 = buildRow(schemaExtra, dataExtra);
	eq(r5, '太郎,7,X-99', 'dot-path, default function, formatter');

	// 6) map object and function
	const schemaMap = [
		{
			key: 'product',
			label: 'prd',
			map: new Map([
				['りんご', 'A01'],
				['バナナ', 'B02'],
			]),
		},
		{ key: 'qty', label: 'qty' },
		{ key: 'code', label: 'code', map: (v) => (v == null ? '' : `C-${v}`) },
	];
	const dataMap = { product: 'りんご', qty: 3, code: 9 };
	const r6 = buildRow(schemaMap, dataMap);
	eq(r6, 'A01,3,C-9', 'map object and function handling');

	// 7) mapFinal
	const schemaMapFinal = [{ key: 'price', map: (v) => `¥${v}`, mapFinal: true }];
	const r7 = buildRow(schemaMapFinal, { price: 100 });
	eq(r7, '¥100', 'mapFinal should use mapped value as final output');

	// 8) mapMode string
	const schemaMapString = [
		{ key: 'prd', map: { apple: 'P1', orange: 'P2' }, mapMode: 'string' },
		{ key: 'cnt' },
	];
	const r8 = buildRow(schemaMapString, { prd: 'apple', cnt: 2 });
	eq(r8, 'P1,2', 'mapMode string should map via String(raw) keys');

	const schemaMapDefaultVal = [{ key: 'x', map: new Map([[1, 'ONE']]), mapDefault: 'UNKNOWN' }];
	const r9 = buildRow(schemaMapDefaultVal, { x: 2 });
	eq(r9, 'UNKNOWN', 'mapDefault value should be used when map misses');

	const schemaMapDefaultFn = [
		{ key: 'x', map: new Map([[1, 'ONE']]), mapDefault: (raw) => `DEF-${raw}` },
	];
	const r10 = buildRow(schemaMapDefaultFn, { x: 9 });
	eq(r10, 'DEF-9', 'mapDefault function should be used when map misses');

	// buildCSV header true/false
	const schemaHeader = [
		{ key: 'id', label: 'ID' },
		{ key: 'name', label: 'Name' },
	];
	const csvWithHeader = buildCSV(schemaHeader, [{ id: 1, name: 'A' }], { header: true });
	const csvWithoutHeader = buildCSV(schemaHeader, [{ id: 1, name: 'A' }], { header: false });
	eq(csvWithHeader, 'ID,Name\n1,A', 'header true output');
	eq(csvWithoutHeader, '1,A', 'header false output');

	console.log('ALL FORMAT TESTS PASS');
} catch (e) {
	console.error('FAIL: format tests', e && e.message ? e.message : e);
	process.exitCode = 2;
}

// ----- test-csv-doc-samples.js (doc examples) -----
try {
	// formatter toFixed(2)
	const schemaFmt = [
		{
			key: 'price',
			label: '価格',
			formatter: (v) => (v == null || v === '' ? '' : Number(v).toFixed(2)),
		},
	];
	const rowsFmt = [{ price: 123.456 }, { price: 7 }];
	const csvFmt = buildCSV(schemaFmt, rowsFmt, { header: true });
	eq(csvFmt, '価格\n123.46\n7.00', 'formatter toFixed(2) mismatch');

	// nested path with array index
	const schemaNest = [
		{ key: 'user.profile.contact.city', label: '市' },
		{ key: 'items.0.name', label: '第1商品' },
	];
	const rec = {
		user: { profile: { contact: { city: '横浜市' } } },
		items: [{ name: 'りんご' }, { name: 'バナナ' }],
	};
	const rowNest = buildRow(schemaNest, rec);
	eq(rowNest, '横浜市,りんご', 'nested path or array index handling');

	// mapDefault function
	const schemaMapDef = [
		{
			key: 'category',
			label: 'カテゴリ',
			map: new Map([['食料', 'F']]),
			mapDefault: (raw) => (raw ? `UNK-${String(raw).slice(0, 2).toUpperCase()}` : ''),
		},
	];
	const csvMapDef = buildCSV(schemaMapDef, [
		{ category: '食料' },
		{ category: '電子' },
		{ category: null },
	]);
	const parts = csvMapDef.split('\n');
	eq(parts.length, 4, 'mapDefault sample should produce header + 3 rows');
	eq(parts[0], 'カテゴリ', 'header label check');
	eq(parts[1], 'F', 'map hit should produce F');
	assert.ok(parts[2].startsWith('UNK-'), 'mapDefault function should produce UNK- prefix');
	eq(parts[3], '', 'null category should map to empty string via mapDefault');

	// mapMode string plain object map example
	const schemaMapStr = [
		{ key: 'status', label: '状態', map: { OK: '1', NG: '0' }, mapMode: 'string' },
	];
	const csvMapStr = buildCSV(schemaMapStr, [{ status: 'OK' }, { status: 'UNKNOWN' }], {
		header: false,
	});
	eq(
		csvMapStr,
		'1\nUNKNOWN',
		'mapMode string mapping should map OK->1 and leave unknown as original'
	);

	console.log('DOC SAMPLES PASS');
} catch (e) {
	console.error('FAIL: doc samples', e && e.message ? e.message : e);
	process.exitCode = 2;
}

// ----- test-csv-fixed-column (integrated) -----
try {
	const schemaFixed = [
		{ key: 'id', label: 'ID' },
		{ label: '注記', default: 'N/A' }, // fixed column (no key)
		{ key: 'amount', label: '金額', type: 'number' },
	];
	const rowsFixed = [{ id: 'A1', amount: 100 }];
	const csvFixed = buildCSV(schemaFixed, rowsFixed, { header: true });
	const linesFixed = csvFixed.split('\n');
	eq(linesFixed[0], 'ID,注記,金額', 'fixed column header mismatch');
	eq(linesFixed[1], 'A1,N/A,100', 'fixed column row value mismatch');
	console.log('PASS: test-csv-fixed-column');
} catch (e) {
	console.error('FAIL: test-csv-fixed-column', e && e.message ? e.message : e);
	process.exitCode = 2;
}

console.log('ALL CSV TESTS INVOKED');
