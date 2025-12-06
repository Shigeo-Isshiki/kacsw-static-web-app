const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

// src/system-utils.js を VM に評価して関数を取り出す
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'system-utils.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
try {
	vm.runInContext(src, sandbox, { filename: 'system-utils.js' });
} catch (e) {
	throw new Error('system-utils.js の評価に失敗しました: ' + (e && e.message ? e.message : e));
}

let generatePassword, maskPassword, toKanaReading;
try {
	const exported = vm.runInContext('({generatePassword, maskPassword, toKanaReading})', sandbox);
	generatePassword =
		(exported && exported.generatePassword) ||
		sandbox.generatePassword ||
		(sandbox.window && sandbox.window.generatePassword);
	maskPassword =
		(exported && exported.maskPassword) ||
		sandbox.maskPassword ||
		(sandbox.window && sandbox.window.maskPassword);
	toKanaReading =
	(exported && exported.toKanaReading) ||
	sandbox.toKanaReading ||
	(sandbox.window && sandbox.window.toKanaReading);
} catch (e) {
	generatePassword =
		sandbox.generatePassword || (sandbox.window && sandbox.window.generatePassword);
	maskPassword = sandbox.maskPassword || (sandbox.window && sandbox.window.maskPassword);
	toKanaReading = sandbox.toKanaReading || (sandbox.window && sandbox.window.toKanaReading);
}

if (!generatePassword || !maskPassword || !toKanaReading)
	throw new Error('system-utils の関数が取得できませんでした');

// 許容されない文字の集合（除外された ambiguous chars）
const forbiddenLower = /[ilo]/i; // i,l,o and uppercase handled by regex
const forbiddenUpper = /[ILO]/; // explicit
const forbiddenDigits = /[01]/;
const allowedSymbols = new Set(['#', '$', '%', '&', '=', '@', '+', '*', '/', '?']);

try {
	// 生成長さと基本的な条件
	const pw = generatePassword({
		length: 16,
		useLower: true,
		useUpper: true,
		useNumbers: true,
		useSymbols: true,
	});
	assert.strictEqual(typeof pw, 'string');
	assert.strictEqual(pw.length, 16, 'generatePassword length');

	// 禁止文字が含まれていないことを複数回生成して確認
	for (let i = 0; i < 20; i++) {
		const p = generatePassword({
			length: 24,
			useLower: true,
			useUpper: true,
			useNumbers: true,
			useSymbols: true,
		});
		assert.ok(!forbiddenLower.test(p), '小文字の禁止文字が含まれている: ' + p);
		assert.ok(!forbiddenUpper.test(p), '大文字の禁止文字が含まれている: ' + p);
		assert.ok(!forbiddenDigits.test(p), '数字の禁止文字が含まれている: ' + p);
		// 記号は許可セットのみ
		for (const ch of p) {
			if (/[^A-Za-z0-9]/.test(ch)) {
				assert.ok(allowedSymbols.has(ch), '許可されていない記号が含まれている: ' + ch + ' in ' + p);
			}
		}
	}
	console.log('PASS: generatePassword charset and exclusions');
} catch (e) {
	console.error('FAIL: generatePassword tests', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// プール選択でそれぞれの文字種が少なくとも1つ含まれることを確認
	const p = generatePassword({
		length: 12,
		useLower: true,
		useUpper: true,
		useNumbers: true,
		useSymbols: true,
	});
	assert.ok(/[a-z]/.test(p), 'lower present');
	assert.ok(/[A-Z]/.test(p), 'upper present');
	assert.ok(/[2-9]/.test(p), 'numbers present');
	const symRe = /[#\$%&=@\+\*\/\?]/;
	assert.ok(symRe.test(p), 'symbols present');
	console.log('PASS: generatePassword includes at least one of each selected class');
} catch (e) {
	console.error('FAIL: generatePassword inclusion tests', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// maskPassword
	assert.strictEqual(maskPassword('Secr3tPW', 2), 'Se****PW');
	assert.strictEqual(maskPassword('abc', 1), 'a*c'); // visible keeps 1 char on each side
	assert.strictEqual(maskPassword('', 2), '');
	console.log('PASS: maskPassword cases');
} catch (e) {
	console.error('FAIL: maskPassword', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// toKanaReading: default map and middot
	const r = toKanaReading('A1@+');
	// Expect 'エイ・イチ・アットマーク・プラス' (map uses these readings)
	assert.strictEqual(r, 'エイ・イチ・アットマーク・プラス');
	console.log('PASS: toKanaReading default map and middot');
} catch (e) {
	console.error('FAIL: toKanaReading default', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// toKanaReading: strict mode throws on unmapped char
	let threw = false;
	try {
		toKanaReading('Aあ', { strict: true });
	} catch (e) {
		threw = true;
	}
	assert.ok(threw, 'strict mode should throw on unmapped char');
	console.log('PASS: toKanaReading strict mode');
} catch (e) {
	console.error('FAIL: toKanaReading strict', e && e.message ? e.message : e);
	process.exitCode = 2;
}

console.log('ALL SYSTEM-UTILS TESTS INVOKED');
