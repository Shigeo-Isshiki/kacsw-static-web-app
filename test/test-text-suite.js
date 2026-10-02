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
const registerFullWidthHiraganaHandler =
	global.registerFullWidthHiraganaHandler || (window && window.registerFullWidthHiraganaHandler);

if (
	!isSingleByteAlnumOnly ||
	!toFullWidthKatakana ||
	!toFullWidthHiragana ||
	!toHalfWidthKana ||
	!toFullWidth ||
	!toHalfWidth ||
	!assertEmailAddress ||
	!registerFullWidthHiraganaHandler
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

// --- registerFullWidthHandler ---
// kintone-custom-lib.js を読み込まずに kintone.events.on のみをスタブ化して検証する
const registerFullWidthHandler =
	global.registerFullWidthHandler || (window && window.registerFullWidthHandler);
if (!registerFullWidthHandler) throw new Error('registerFullWidthHandler が取得できませんでした');

/** 直近の登録内容を保持するスタブ */
let lastRegistration = null;
global.kintone = {
	events: {
		on: (events, handler) => {
			lastRegistration = { events, handler };
		},
	},
};

/**
 * ハンドラを登録して呼び出すヘルパー
 * @param {string} fieldCode フィールドコード
 * @param {object} options registerFullWidthHandler のオプション
 * @param {*} value フィールド値
 * @returns {object} 実行後のイベントオブジェクト
 */
const runHandler = (fieldCode, options, value) => {
	registerFullWidthHandler(fieldCode, options);
	const event = { record: { [fieldCode]: { value } } };
	return lastRegistration.handler(event);
};

try {
	const event = runHandler('name', {}, 'abc');
	assert.strictEqual(event.record.name.value, 'ａｂｃ');
	assert.strictEqual(event.record.name.error, null);
	console.log('PASS: registerFullWidthHandler converts value');
} catch (e) {
	console.error('FAIL: registerFullWidthHandler converts value', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	const errorMessages = {};
	const event = runHandler('name', { throwOnError: true, errorMessages }, 'a\tb');
	assert.strictEqual(event.record.name.value, 'a\tb', '変換失敗時は元の値を維持する');
	assert.ok(event.record.name.error, 'フィールドエラーが設定される');
	assert.strictEqual(errorMessages.name, event.record.name.error, 'エラーマップにも設定される');
	console.log('PASS: registerFullWidthHandler throwOnError=true sets error');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler throwOnError=true sets error',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// throwOnError=false（既定）では変換不能文字をそのまま残しエラーにしない
	const event = runHandler('name', {}, 'a\tb');
	assert.strictEqual(event.record.name.value, 'ａ\tｂ');
	assert.strictEqual(event.record.name.error, null);
	console.log('PASS: registerFullWidthHandler throwOnError=false keeps unconvertible chars');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler throwOnError=false keeps unconvertible chars',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	const errorMessages = {};
	registerFullWidthHandler('name', { throwOnError: true, errorMessages });
	const handler = lastRegistration.handler;
	['', null, undefined].forEach((empty) => {
		const event = handler({ record: { name: { value: empty } } });
		assert.strictEqual(event.record.name.value, empty, '空欄は変換しない');
		assert.strictEqual(event.record.name.error, null);
		assert.strictEqual(errorMessages.name, null);
	});
	console.log('PASS: registerFullWidthHandler skips empty values');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler skips empty values',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// 対象フィールドがイベントに存在しない場合も例外を出さない
	registerFullWidthHandler('name', {});
	const event = lastRegistration.handler({ record: {} });
	assert.ok(event, 'フィールド欠落時もイベントを返す');
	console.log('PASS: registerFullWidthHandler tolerates missing field');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler tolerates missing field',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// エラー後の次の変更で成功した場合、エラー状態が解除される
	const errorMessages = {};
	registerFullWidthHandler('name', { throwOnError: true, errorMessages });
	const handler = lastRegistration.handler;
	const field = { value: 'a\tb' };
	handler({ record: { name: field } });
	assert.ok(field.error, 'まずエラーになる');
	field.value = 'abc';
	const event = handler({ record: { name: field } });
	assert.strictEqual(event.record.name.value, 'ａｂｃ');
	assert.strictEqual(event.record.name.error, null);
	assert.strictEqual(errorMessages.name, null);
	console.log('PASS: registerFullWidthHandler clears previous error');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler clears previous error',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// removeWhitespace 既定値(false)では空白を残す（半角スペースは全角スペースへ変換）
	const event = runHandler('name', {}, 'a b');
	assert.strictEqual(event.record.name.value, 'ａ\u3000ｂ');
	console.log('PASS: registerFullWidthHandler removeWhitespace default keeps spaces');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler removeWhitespace default keeps spaces',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// 半角空白・全角空白・タブ・改行をすべて削除する
	const event = runHandler('name', { removeWhitespace: true }, 'a b\u3000c\td\ne');
	assert.strictEqual(event.record.name.value, 'ａｂｃｄｅ');
	console.log('PASS: registerFullWidthHandler removeWhitespace removes all whitespace');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler removeWhitespace removes all whitespace',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// maxLength 未指定なら文字数制限なし
	const event = runHandler('name', {}, 'abcdefghij');
	assert.strictEqual(event.record.name.value, 'ａｂｃｄｅｆｇｈｉｊ');
	console.log('PASS: registerFullWidthHandler without maxLength');
} catch (e) {
	console.error('FAIL: registerFullWidthHandler without maxLength', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	const event = runHandler('addr', { maxLength: 3 }, 'abc');
	assert.strictEqual(event.record.addr.value, 'ａｂｃ');
	assert.strictEqual(event.record.addr.error, null);
	console.log('PASS: registerFullWidthHandler maxLength within limit');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler maxLength within limit',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	const errorMessages = {};
	const event = runHandler(
		'addr',
		{ maxLength: 3, maxLengthErrorMessage: '住所は3文字以内で入力してください。', errorMessages },
		'abcd'
	);
	assert.strictEqual(event.record.addr.value, 'abcd', '超過時は元の値を維持する');
	assert.strictEqual(event.record.addr.error, '住所は3文字以内で入力してください。');
	assert.strictEqual(errorMessages.addr, '住所は3文字以内で入力してください。');
	console.log('PASS: registerFullWidthHandler maxLength exceeded');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler maxLength exceeded',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	const event = runHandler('addr', { maxLength: 3 }, 'abcde');
	assert.strictEqual(event.record.addr.error, '全角変換後、3文字以内で入力してください。');
	console.log('PASS: registerFullWidthHandler default maxLength message');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler default maxLength message',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// 空白除去後の文字数で判定する
	const event = runHandler('addr', { maxLength: 3, removeWhitespace: true }, 'a b c');
	assert.strictEqual(event.record.addr.value, 'ａｂｃ');
	assert.strictEqual(event.record.addr.error, null);
	console.log('PASS: registerFullWidthHandler maxLength counts after whitespace removal');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler maxLength counts after whitespace removal',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	let threw = false;
	try {
		registerFullWidthHandler('name', { maxLength: 0 });
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'maxLength=0 は登録時にエラー');
	threw = false;
	try {
		registerFullWidthHandler('name', { maxLength: '3' });
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'maxLength が文字列なら登録時にエラー');
	console.log('PASS: registerFullWidthHandler rejects invalid maxLength');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler rejects invalid maxLength',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	registerFullWidthHandler('name', {});
	assert.deepStrictEqual(lastRegistration.events, [
		'app.record.create.change.name',
		'app.record.edit.change.name',
	]);
	registerFullWidthHandler('name', { devices: 'mobile' });
	assert.deepStrictEqual(lastRegistration.events, [
		'mobile.app.record.create.change.name',
		'mobile.app.record.edit.change.name',
	]);
	registerFullWidthHandler('name', { devices: 'both' });
	assert.deepStrictEqual(lastRegistration.events, [
		'app.record.create.change.name',
		'app.record.edit.change.name',
		'mobile.app.record.create.change.name',
		'mobile.app.record.edit.change.name',
	]);
	console.log('PASS: registerFullWidthHandler devices option');
} catch (e) {
	console.error('FAIL: registerFullWidthHandler devices option', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// errorMessages はオブジェクト自体を差し替えず、該当キーのみ更新する
	const errorMessages = { other: '別のエラー' };
	runHandler('name', { throwOnError: true, errorMessages }, 'a\tb');
	assert.strictEqual(errorMessages.other, '別のエラー', '他キーは保持される');
	assert.ok(errorMessages.name);
	console.log('PASS: registerFullWidthHandler updates errorMessages in place');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHandler updates errorMessages in place',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

console.log('ALL registerFullWidthHandler TESTS INVOKED');

// --- registerFullWidthHiraganaHandler ---
const runHiraganaHandler = (fieldCode, options, value) => {
	registerFullWidthHiraganaHandler(fieldCode, options);
	const event = { record: { [fieldCode]: { value } } };
	return lastRegistration.handler(event);
};

try {
	const event = runHiraganaHandler('kana', {}, 'ｶﾀｶﾅ ひらがな\u3000');
	assert.strictEqual(event.record.kana.value, 'かたかな\u3000ひらがな\u3000');
	assert.strictEqual(event.record.kana.error, null);
	console.log('PASS: registerFullWidthHiraganaHandler converts value by default');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHiraganaHandler converts value by default',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	const event = runHiraganaHandler('kana', { removeWhitespace: true }, 'ｶﾅ ひらがな\u3000\tあ\n');
	assert.strictEqual(event.record.kana.value, 'かなひらがなあ');
	console.log('PASS: registerFullWidthHiraganaHandler removes whitespace');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHiraganaHandler removes whitespace',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	const errorMessages = {};
	registerFullWidthHiraganaHandler('kana', { throwOnError: true, errorMessages });
	const field = { value: 'あA' };
	const handler = lastRegistration.handler;
	handler({ record: { kana: field } });
	assert.strictEqual(field.value, 'あA', '変換失敗時は元の値を維持する');
	assert.ok(field.error);
	assert.strictEqual(errorMessages.kana, field.error);
	field.value = 'あ';
	handler({ record: { kana: field } });
	assert.strictEqual(field.error, null);
	assert.strictEqual(errorMessages.kana, null);
	field.value = '';
	field.error = 'old error';
	errorMessages.kana = 'old error';
	handler({ record: { kana: field } });
	assert.strictEqual(field.error, null);
	assert.strictEqual(errorMessages.kana, null);
	console.log('PASS: registerFullWidthHiraganaHandler updates errors');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHiraganaHandler updates errors',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	const withoutLimit = runHiraganaHandler('kana', {}, 'あいうえおかきくけこさ');
	assert.strictEqual(withoutLimit.record.kana.error, null);
	const exceeded = runHiraganaHandler(
		'kana',
		{ maxLength: 2, maxLengthErrorMessage: '2文字までです。' },
		'あいう'
	);
	assert.strictEqual(exceeded.record.kana.value, 'あいう');
	assert.strictEqual(exceeded.record.kana.error, '2文字までです。');
	const afterWhitespaceRemoval = runHiraganaHandler(
		'kana',
		{ maxLength: 2, removeWhitespace: true },
		'あ い'
	);
	assert.strictEqual(afterWhitespaceRemoval.record.kana.value, 'あい');
	assert.strictEqual(afterWhitespaceRemoval.record.kana.error, null);
	console.log('PASS: registerFullWidthHiraganaHandler maxLength options');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHiraganaHandler maxLength options',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	registerFullWidthHiraganaHandler('kana', { devices: 'both' });
	assert.deepStrictEqual(lastRegistration.events, [
		'app.record.create.change.kana',
		'app.record.edit.change.kana',
		'mobile.app.record.create.change.kana',
		'mobile.app.record.edit.change.kana',
	]);
	console.log('PASS: registerFullWidthHiraganaHandler devices option');
} catch (e) {
	console.error(
		'FAIL: registerFullWidthHiraganaHandler devices option',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

console.log('ALL registerFullWidthHiraganaHandler TESTS INVOKED');
