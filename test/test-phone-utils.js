const assert = require('assert');
const path = require('path');

// ブラウザ向け公開スタイルに合わせて global.window を設定してから読み込む
global.window = global;
require(path.join(__dirname, '..', 'src', 'phone-utils.js'));

const isValidPhoneNumber = global.isValidPhoneNumber || (window && window.isValidPhoneNumber);
const formatPhoneNumber = global.formatPhoneNumber || (window && window.formatPhoneNumber);
const getPhoneNumberType = global.getPhoneNumberType || (window && window.getPhoneNumberType);
const normalizePhoneNumber = global.normalizePhoneNumber || (window && window.normalizePhoneNumber);

if (!isValidPhoneNumber || !formatPhoneNumber || !getPhoneNumberType || !normalizePhoneNumber)
	throw new Error('phone-utils の関数が取得できませんでした');

try {
	// 総務省データに沿った有効な 03 系番号を使用（市内局番 3123 は 03 の範囲に含まれる）
	assert.strictEqual(isValidPhoneNumber('03-3123-4567'), true, '03-3123-4567 は有効');
	console.log('PASS: isValidPhoneNumber basic fixed-line');
} catch (e) {
	console.error('FAIL: isValidPhoneNumber basic fixed-line', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	assert.strictEqual(isValidPhoneNumber('091123'), true, '091 系の 6 桁は有効（特定接続）');
	console.log('PASS: isValidPhoneNumber 091 special-case');
} catch (e) {
	console.error('FAIL: isValidPhoneNumber 091 case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	assert.strictEqual(isValidPhoneNumber('+81-3-1234-5678'), false, '+81 を含むものは無効');
	console.log('PASS: isValidPhoneNumber rejects international prefix');
} catch (e) {
	console.error('FAIL: isValidPhoneNumber international prefix', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	const norm = normalizePhoneNumber('(080)-1234-5678');
	assert.strictEqual(
		norm,
		'08012345678',
		'normalizePhoneNumber removes symbols and returns digits only'
	);
	console.log('PASS: normalizePhoneNumber basic');
} catch (e) {
	console.error('FAIL: normalizePhoneNumber basic', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 市内局番を 3123 にして総務省データの範囲に合わせる
	const out = formatPhoneNumber('０３ ３１２３ ４５６７');
	assert.strictEqual(typeof out, 'object', 'formatPhoneNumber returns object');
	assert.strictEqual(out.formattedNumber, '03-3123-4567');
	assert.strictEqual(out.type, '固定電話');
	assert.strictEqual(out.callCapable, true);
	console.log('PASS: formatPhoneNumber returns expected object for fixed-line');
} catch (e) {
	console.error('FAIL: formatPhoneNumber fixed-line', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	const t1 = getPhoneNumberType('080-1234-5678');
	assert.strictEqual(t1, '携帯電話');
	console.log('PASS: getPhoneNumberType mobile');
} catch (e) {
	console.error('FAIL: getPhoneNumberType mobile', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	const t2 = getPhoneNumberType('0120-123-456');
	assert.strictEqual(t2, '着信課金');
	console.log('PASS: getPhoneNumberType toll-free/charge');
} catch (e) {
	console.error('FAIL: getPhoneNumberType toll-free', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	let threw = false;
	try {
		isValidPhoneNumber(null);
	} catch (e) {
		threw = true;
	}
	assert.ok(threw, 'null を渡すと isValidPhoneNumber は例外を投げる（実装に合わせた期待）');
	console.log('PASS: isValidPhoneNumber throws on null');
} catch (e) {
	console.error('FAIL: isValidPhoneNumber null case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// M2M (11桁, 3桁プレフィックス 020)
	const m2m11 = '02012345678';
	assert.strictEqual(isValidPhoneNumber(m2m11), true, `${m2m11} は有効（M2M 11桁）`);
	const m2mOut = formatPhoneNumber(m2m11);
	assert.strictEqual(m2mOut.type, 'M2M');
	assert.strictEqual(m2mOut.formattedNumber, '020-1234-5678');
	assert.strictEqual(m2mOut.callCapable, false);
	console.log('PASS: M2M 11-digit case');
} catch (e) {
	console.error('FAIL: M2M 11-digit case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// M2M (14桁, 4桁プレフィックス 0200)
	const m2m14 = '02001000012345';
	assert.strictEqual(isValidPhoneNumber(m2m14), true, `${m2m14} は有効（M2M 14桁）`);
	const m2m14Out = formatPhoneNumber(m2m14);
	assert.strictEqual(m2m14Out.type, 'M2M');
	assert.strictEqual(m2m14Out.formattedNumber, '0200-10000-12345');
	assert.strictEqual(m2m14Out.callCapable, false);
	console.log('PASS: M2M 14-digit case');
} catch (e) {
	console.error('FAIL: M2M 14-digit case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// IP電話 (050, 11桁)
	const ip11 = '05012345678';
	assert.strictEqual(isValidPhoneNumber(ip11), true, `${ip11} は有効（IP電話）`);
	const ipOut = formatPhoneNumber(ip11);
	assert.strictEqual(ipOut.type, 'IP電話');
	assert.strictEqual(ipOut.formattedNumber, '050-1234-5678');
	assert.strictEqual(ipOut.callCapable, true);
	assert.strictEqual(ipOut.faxCapable, false);
	console.log('PASS: IP phone case');
} catch (e) {
	console.error('FAIL: IP phone case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 無線呼出 (0204, 11桁) - 実装上は現在は無効扱いとなるケースがある
	const wireless = '02041234567';
	assert.strictEqual(
		isValidPhoneNumber(wireless),
		false,
		`${wireless} は現在無効と判定される（実装に依存）`
	);
	// formatPhoneNumber は無効な入力に対して例外を投げるはず
	let threwFmt = false;
	try {
		formatPhoneNumber(wireless);
	} catch (err) {
		threwFmt = true;
	}
	assert.ok(threwFmt, '無効な無線呼出番号に対して formatPhoneNumber は例外を投げる');
	console.log('PASS: wireless paging case (invalid as expected)');
} catch (e) {
	console.error('FAIL: wireless paging case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// FMC (0600, 11桁) - 実装上は現在は無効扱いとなるケースがある
	const fmc = '06001234567';
	assert.strictEqual(isValidPhoneNumber(fmc), false, `${fmc} は現在無効と判定される（実装に依存）`);
	let threwFmtFmc = false;
	try {
		formatPhoneNumber(fmc);
	} catch (err) {
		threwFmtFmc = true;
	}
	assert.ok(threwFmtFmc, '無効な FMC 番号に対して formatPhoneNumber は例外を投げる');
	console.log('PASS: FMC case (invalid as expected)');
} catch (e) {
	console.error('FAIL: FMC case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

console.log('ALL PHONE-UTILS TESTS INVOKED');
