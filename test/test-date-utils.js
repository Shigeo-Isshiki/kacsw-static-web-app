const assert = require('assert');
const path = require('path');

// date-utils はトップレベルで直接 module.exports を出していないため、
// テスト側でファイルを読み込みVMコンテキストに評価して関数を取得する
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'date-utils.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
try {
	vm.runInContext(src, sandbox, { filename: 'date-utils.js' });
} catch (e) {
	throw new Error('date-utils.js の評価に失敗しました: ' + (e && e.message ? e.message : e));
}
// VM 内で評価されたスクリプトが `const`/`let` で関数を定義していると、
// その識別子は sandbox オブジェクトの直接のプロパティになりません。
// そこでここでは評価式を使って同一コンテキストから関数を取得します。
let convertToSeireki, convertToEra, convertToYear;
try {
	const exported = vm.runInContext('({convertToSeireki, convertToEra, convertToYear})', sandbox);
	convertToSeireki =
		(exported && exported.convertToSeireki) || (sandbox.window && sandbox.window.DATE && sandbox.window.DATE.convertToSeireki);
	convertToEra =
		(exported && exported.convertToEra) || (sandbox.window && sandbox.window.DATE && sandbox.window.DATE.convertToEra);
	convertToYear =
		(exported && exported.convertToYear) || (sandbox.window && sandbox.window.DATE && sandbox.window.DATE.convertToYear);
} catch (e) {
	// 評価に失敗した場合は既存のsandbox直参照も試みる
	convertToSeireki =
		sandbox.convertToSeireki || (sandbox.window && sandbox.window.DATE && sandbox.window.DATE.convertToSeireki);
	convertToEra = sandbox.convertToEra || (sandbox.window && sandbox.window.DATE && sandbox.window.DATE.convertToEra);
	convertToYear = sandbox.convertToYear || (sandbox.window && sandbox.window.DATE && sandbox.window.DATE.convertToYear);
}

if (!convertToSeireki || !convertToEra || !convertToYear)
	throw new Error('date-utils の関数が取得できませんでした');

try {
	// Date オブジェクト入力（VM 内で Date を生成して呼び出す）
	const s = vm.runInContext('convertToSeireki(new Date(2019,4,1))', sandbox);
	assert.strictEqual(s, '2019-05-01', 'Date -> YYYY-MM-DD');
	console.log('PASS: convertToSeireki with Date input');
} catch (e) {
	console.error('FAIL: convertToSeireki Date', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 和暦文字列（漢字） -> 西暦
	const s2 = convertToSeireki('令和元年5月1日');
	assert.strictEqual(s2, '2019-05-01', '令和元年5月1日 -> 2019-05-01');
	const s3 = convertToSeireki('平成二年3月1日');
	assert.strictEqual(s3, '1990-03-01', '平成二年3月1日 -> 1990-03-01');
	console.log('PASS: convertToSeireki with era-kanji inputs');
} catch (e) {
	console.error('FAIL: convertToSeireki era-kanji', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 西暦文字列入力
	const s4 = convertToSeireki('2025年10月14日');
	assert.strictEqual(s4, '2025-10-14', 'YYYY年MM月DD日 -> YYYY-MM-DD');
	const s5 = convertToSeireki('2025-10-14');
	assert.strictEqual(s5, '2025-10-14', 'YYYY-MM-DD passthrough');
	console.log('PASS: convertToSeireki with seireki strings');
} catch (e) {
	console.error('FAIL: convertToSeireki seireki', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// convertToEra: Reiwa 7 -> 2025
	const era = convertToEra('2025-10-14');
	assert.strictEqual(era.kanji, '令和7年');
	assert.strictEqual(era.initial, 'R07');
	assert.strictEqual(era.initialOnly, 'R');
	assert.strictEqual(era.numberOnly, '07');
	console.log('PASS: convertToEra for Reiwa 7');
} catch (e) {
	console.error('FAIL: convertToEra Reiwa', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// convertToEra: Reiwa 元年
	const era2 = convertToEra('2019-05-01');
	assert.strictEqual(era2.kanji, '令和元年');
	assert.strictEqual(era2.initial, 'R01');
	assert.strictEqual(era2.numberOnly, '01');
	console.log('PASS: convertToEra for Reiwa 1 (gannen)');
} catch (e) {
	console.error('FAIL: convertToEra gannen', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// convertToYear: various inputs (Date は VM 内で生成して呼び出す)
	assert.strictEqual(
		vm.runInContext('convertToYear(new Date(1990,2,1))', sandbox),
		1990,
		'Date -> year'
	);
	assert.strictEqual(convertToYear('令和元年'), 2019, '令和元年 -> 2019');
	assert.strictEqual(convertToYear('R1'), 2019, 'R1 -> 2019');
	assert.strictEqual(convertToYear('2025'), 2025, 'YYYY string -> year');
	assert.strictEqual(convertToYear('H02'), 1990, 'H02 -> 1990');
	console.log('PASS: convertToYear various inputs');
} catch (e) {
	console.error('FAIL: convertToYear cases', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// invalid cases should throw
	let threw = false;
	try {
		convertToSeireki('invalid-date-string');
	} catch (e) {
		threw = true;
	}
	assert.ok(threw, 'invalid string should throw for convertToSeireki');
	let threw2 = false;
	try {
		convertToYear('R');
	} catch (e) {
		threw2 = true;
	}
	assert.ok(threw2, '元号のみ指定は年が不明でエラー');
	console.log('PASS: date-utils invalid input exceptions');
} catch (e) {
	console.error('FAIL: date-utils invalid cases', e && e.message ? e.message : e);
	process.exitCode = 2;
}

console.log('ALL DATE-UTILS TESTS INVOKED');
