const assert = require('assert');
const path = require('path');

// ブラウザ向け公開スタイルに合わせて global.window を設定してから読み込む
global.window = global;
require(path.join(__dirname, '..', 'src', 'text-suite.js'));

const isSingleByteAlnumOnly =
	global.isSingleByteAlnumOnly || (window && window.isSingleByteAlnumOnly);
const toFullWidthKatakana = global.toFullWidthKatakana || (window && window.toFullWidthKatakana);
const toFullWidthHiragana = global.toFullWidthHiragana || (window && window.toFullWidthHiragana);
const toHalfWidthKana = global.toHalfWidthKana || (window && window.toHalfWidthKana);
const toFullWidth = global.toFullWidth || (window && window.toFullWidth);
const toHalfWidth = global.toHalfWidth || (window && window.toHalfWidth);
const assertEmailAddress = global.assertEmailAddress || (window && window.assertEmailAddress);

if (
	!isSingleByteAlnumOnly ||
	!toFullWidthKatakana ||
	!toFullWidthHiragana ||
	!toHalfWidthKana ||
	!toFullWidth ||
	!toHalfWidth ||
	!assertEmailAddress
)
	throw new Error('text-suite の関数が取得できませんでした');

try {
	assert.strictEqual(isSingleByteAlnumOnly('Hello123!'), true, 'ASCII 文字のみは true');
	console.log('PASS: isSingleByteAlnumOnly true case');
} catch (e) {
	console.error('FAIL: isSingleByteAlnumOnly true case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	assert.strictEqual(isSingleByteAlnumOnly('あいう'), false, '全角かなは false');
	console.log('PASS: isSingleByteAlnumOnly false case');
} catch (e) {
	console.error('FAIL: isSingleByteAlnumOnly false case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// ひらがな -> 全角カタカナ
	const k = toFullWidthKatakana('ひらがな');
	assert.strictEqual(k, 'ヒラガナ');
	console.log('PASS: toFullWidthKatakana hiragana -> katakana');
} catch (e) {
	console.error('FAIL: toFullWidthKatakana hiragana -> katakana', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 全角カタカナ -> 半角カナ
	const hw = toHalfWidthKana('カタカナ');
	assert.strictEqual(hw, 'ｶﾀｶﾅ');
	console.log('PASS: toHalfWidthKana fullwidth -> halfwidth');
} catch (e) {
	console.error('FAIL: toHalfWidthKana fullwidth -> halfwidth', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 半角カナ -> 全角ひらがな（間接的）
	const hwkana = 'ｶﾀｶﾅ';
	const hiragana = toFullWidthHiragana(hwkana);
	assert.strictEqual(hiragana, 'かたかな');
	console.log('PASS: toFullWidthHiragana halfwidth kana -> hiragana');
} catch (e) {
	console.error(
		'FAIL: toFullWidthHiragana halfwidth kana -> hiragana',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// 半角英数字・記号 -> 全角
	const fw = toFullWidth('\\~A');
	// バックスラッシュ -> ￥, チルダ -> ～, A -> Ａ
	assert.strictEqual(fw, '￥～Ａ');
	console.log('PASS: toFullWidth symbols and ASCII');
} catch (e) {
	console.error('FAIL: toFullWidth symbols and ASCII', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 全角スペースと全角英字 -> 半角
	const hw = toHalfWidth('　ＡＢＣ');
	assert.strictEqual(hw, ' ABC');
	console.log('PASS: toHalfWidth fullwidth space and letters');
} catch (e) {
	console.error('FAIL: toHalfWidth fullwidth space and letters', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	const email = assertEmailAddress('ＴＥＳＴ@Example.COM');
	assert.strictEqual(email, 'test@example.com');
	console.log('PASS: assertEmailAddress normalizes and validates');
} catch (e) {
	console.error('FAIL: assertEmailAddress', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 異常系: toFullWidthKatakana はラテン文字を変換できないため例外を投げる
	let threw = false;
	try {
		toFullWidthKatakana('A');
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'toFullWidthKatakana はラテン文字で例外を投げる');
	console.log('PASS: toFullWidthKatakana throws on invalid input');
} catch (e) {
	console.error(
		'FAIL: toFullWidthKatakana throws on invalid input',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// 異常系: toHalfWidthKana は漢字を変換できないため例外を投げる
	let threw2 = false;
	try {
		toHalfWidthKana('漢字');
	} catch (err) {
		threw2 = true;
	}
	assert.ok(threw2, 'toHalfWidthKana は漢字で例外を投げる');
	console.log('PASS: toHalfWidthKana throws on invalid input');
} catch (e) {
	console.error('FAIL: toHalfWidthKana throws on invalid input', e && e.message ? e.message : e);
	process.exitCode = 2;
}

console.log('ALL TEXT-SUITE TESTS INVOKED');
