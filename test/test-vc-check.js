const assert = require('assert');
const path = require('path');

// ブラウザ向け公開スタイルに合わせて global.window を設定してから読み込む
global.window = global;
require(path.join(__dirname, '..', 'src', 'vc-check.js'));

const validateZoomMeetingId =
	global.validateZoomMeetingId || (window && window.validateZoomMeetingId);
const validateZoomPasscode = global.validateZoomPasscode || (window && window.validateZoomPasscode);
const validateZoomUrl = global.validateZoomUrl || (window && window.validateZoomUrl);

if (!validateZoomMeetingId || !validateZoomPasscode || !validateZoomUrl) {
	throw new Error('vc-check の関数が取得できませんでした');
}

try {
	// 正常: ミーティングID 10桁（半角）
	const id = validateZoomMeetingId('1234567890');
	assert.strictEqual(id, '1234567890');
	console.log('PASS: validateZoomMeetingId 10-digit');
} catch (e) {
	console.error('FAIL: validateZoomMeetingId 10-digit', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 正常: ウェビナー 11桁を isWebinar=true で検証
	const wid = validateZoomMeetingId('１２３４５６７８９０１', true);
	assert.strictEqual(wid, '12345678901');
	console.log('PASS: validateZoomMeetingId webinar 11-digit (fullwidth -> halfwidth)');
} catch (e) {
	console.error('FAIL: validateZoomMeetingId webinar 11-digit', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 失敗: 不正な長さ
	let threw = false;
	try {
		validateZoomMeetingId('123');
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, '短すぎるIDで例外');
	console.log('PASS: validateZoomMeetingId throws on invalid length');
} catch (e) {
	console.error(
		'FAIL: validateZoomMeetingId throws on invalid length',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// 正常: パスコード（全角を含む -> 半角に変換）
	const pc = validateZoomPasscode('ＡＢC１２3!');
	assert.strictEqual(pc, 'ABC123!');
	console.log('PASS: validateZoomPasscode fullwidth -> halfwidth and allowed chars');
} catch (e) {
	console.error('FAIL: validateZoomPasscode normal', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 失敗: パスコードが短すぎる
	let threw2 = false;
	try {
		validateZoomPasscode('abc');
	} catch (err) {
		threw2 = true;
	}
	assert.ok(threw2, '短すぎるパスコードで例外');
	console.log('PASS: validateZoomPasscode throws on too short');
} catch (e) {
	console.error('FAIL: validateZoomPasscode throws on too short', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 失敗: 変換後に非ASCII文字が残る（例: ひらがな）
	let threw3 = false;
	try {
		validateZoomPasscode('あいうえおか');
	} catch (err) {
		threw3 = true;
	}
	assert.ok(threw3, '非ASCII文字を含むパスコードで例外');
	console.log('PASS: validateZoomPasscode throws on non-ASCII after conversion');
} catch (e) {
	console.error(
		'FAIL: validateZoomPasscode throws on non-ASCII after conversion',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	// 正常: URL 正規化（全角を含む・大文字のZOOM.USを含む）
	const url = validateZoomUrl('ｈｔｔｐｓ：//Example.ZOOM.US/j/１２３４５６７８９０?pwd=ＡＢＣ');
	// 期待: https://Example.zoom.us/j/1234567890?pwd=ABC
	assert.strictEqual(url, 'https://Example.zoom.us/j/1234567890?pwd=ABC');
	console.log('PASS: validateZoomUrl fullwidth + case-insensitive domain -> normalized');
} catch (e) {
	console.error('FAIL: validateZoomUrl normal', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 失敗: https で始まらない -> 例外
	let threw4 = false;
	try {
		validateZoomUrl('http://zoom.us/j/1234567890');
	} catch (err) {
		threw4 = true;
	}
	assert.ok(threw4, 'https で始まらない URL は例外');
	console.log('PASS: validateZoomUrl throws when not https');
} catch (e) {
	console.error('FAIL: validateZoomUrl throws when not https', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	// 失敗: zoom.us を含まない -> 例外
	let threw5 = false;
	try {
		validateZoomUrl('https://example.com/j/1234567890');
	} catch (err) {
		threw5 = true;
	}
	assert.ok(threw5, 'zoom.us を含まない URL は例外');
	console.log('PASS: validateZoomUrl throws when missing zoom.us');
} catch (e) {
	console.error(
		'FAIL: validateZoomUrl throws when missing zoom.us',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

console.log('ALL VC-CHECK TESTS INVOKED');
