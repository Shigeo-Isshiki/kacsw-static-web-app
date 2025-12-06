/*
 * src/system-utils.js
 *
 * kintone のカスタマイズ向けに、システム関連のユーティリティ関数をまとめた小さなライブラリ。
 * - ユーザ名のフォーマット/読み取り
 * - セキュアなパスワード生成
 * - パスワードのマスク表示
 *
 * ブラウザ（kintone カスタマイズ）でも Node 環境でも使えるように、軽い抽象化をしています。
 */

//　ライブラリ内の共通定数・変換テーブル定義部
// 既定の読み仮名マップ
/**
 * _su_defaultReadingMap - 文字列内の英数字・記号を日本語読み（ヨミガナ）に変換するための既定マップ
 */
const _su_defaultReadingMap = {
	// 大文字・小文字
	A: 'エイ',
	a: 'エイ',
	B: 'ビー',
	b: 'ビー',
	C: 'シー',
	c: 'シー',
	D: 'ディー',
	d: 'ディー',
	E: 'イー',
	e: 'イー',
	F: 'エフ',
	f: 'エフ',
	G: 'ジー',
	g: 'ジー',
	H: 'エイチ',
	h: 'エイチ',
	I: 'アイ',
	i: 'アイ',
	J: 'ジェイ',
	j: 'ジェイ',
	K: 'ケイ',
	k: 'ケイ',
	L: 'エル',
	l: 'エル',
	M: 'エム',
	m: 'エム',
	N: 'エヌ',
	n: 'エヌ',
	O: 'オー',
	o: 'オー',
	P: 'ピー',
	p: 'ピー',
	Q: 'キュー',
	q: 'キュー',
	R: 'アール',
	r: 'アール',
	S: 'エス',
	s: 'エス',
	T: 'ティー',
	t: 'ティー',
	U: 'ユー',
	u: 'ユー',
	V: 'ブイ',
	v: 'ブイ',
	W: 'ダブリュー',
	w: 'ダブリュー',
	X: 'エックス',
	x: 'エックス',
	Y: 'ワイ',
	y: 'ワイ',
	Z: 'ゼット',
	z: 'ゼット',

	// 数字
	0: 'ゼロ',
	1: 'イチ',
	2: 'ニ',
	3: 'サン',
	4: 'ヨン',
	5: 'ゴ',
	6: 'ロク',
	7: 'ナナ',
	8: 'ハチ',
	9: 'キュウ',

	// 記号
	'!': 'エクスクラメーションマーク',
	'"': 'ダブルクォーテーション',
	'#': 'ハッシュ',
	$: 'ドル',
	'%': 'パーセント',
	'&': 'アンパサンド',
	"'": 'アポストロフィー',
	'(': 'ヒダリカッコ',
	')': 'ミギカッコ',
	'-': 'ハイフン',
	'=': 'イコール',
	'^': 'キャレット',
	'~': 'チルダ',
	'¥': 'エンマーク',
	'\\': 'バックスラッシュ',
	'|': 'パイプライン',
	'@': 'アットマーク',
	'`': 'バッククォート',
	'[': 'ヒダリダイカッコ',
	'{': 'ヒダリチュウカッコ',
	';': 'セミコロン',
	'+': 'プラス',
	':': 'コロン',
	'*': 'アスタリスク',
	']': 'ミギダイカッコ',
	'}': 'ミギチュウカッコ',
	',': 'カンマ',
	'<': 'レスザン',
	'.': 'ドット',
	'>': 'グレーターザン',
	'/': 'スラッシュ',
	'?': 'クエスチョンマーク',
	_: 'アンダーバー',
};

// --- 環境判定 ---
/** ブラウザ環境かどうか */
const _su_isBrowser =
	typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues;

// 内部: 共通ユーティリティ関数群
/**
 * セキュアなランダムバイト列を取得する（Uint8Array を返す）
 * ブラウザ: window.crypto.getRandomValues
 * Node: crypto.randomBytes
 */
const _su_secureRandomBytes = (len) => {
	if (!len || len <= 0) return new Uint8Array(0);
	if (_su_isBrowser) {
		const arr = new Uint8Array(len);
		window.crypto.getRandomValues(arr);
		return arr;
	}
	try {
		// Node 環境
		const crypto = require('crypto');
		return crypto.randomBytes(len);
	} catch (e) {
		// フォールバック（非推奨）: Math.random
		const fallback = new Uint8Array(len);
		for (let i = 0; i < len; i++) fallback[i] = Math.floor(Math.random() * 256);
		return fallback;
	}
};

/**
 * 0..(n-1) の均等な乱数インデックスを返す（拒否サンプリング）
 * - 内部で 1 バイトずつ取得し、バイアスが生じないように上限を切り捨てます。
 */
const _su_randomIndex = (n) => {
	if (!Number.isInteger(n) || n <= 0)
		throw new Error('_su_randomIndex: n must be positive integer');
	const max = 256;
	const limit = max - (max % n);
	while (true) {
		const b = _su_secureRandomBytes(1)[0];
		if (b < limit) return b % n;
		// otherwise retry
	}
};

/**
 * 文字列内の英数字や記号を日本語読み（ヨミガナ）に置き換えて返す
 * - `str` は入力文字列
 * - `options` はオプションで次を含めることができます:
 *   - `map`: 置換マップ（例: { 'A': 'エー', '1': 'いち', '@': 'アット' }）。省略時は既定マップを使用。
 *   - `strict`: true の場合、マップにない文字が見つかると例外を投げます。
 */
const toKanaReading = (str, options) => {
	if (str === null || str === undefined) return '';
	if (typeof str !== 'string') str = String(str);

	options = options && typeof options === 'object' ? options : {};
	const replacer =
		options.map && typeof options.map === 'object' ? options.map : _su_defaultReadingMap;
	const strict = !!options.strict;

	// 1文字ずつ走査して、マップにあれば置換、なければそのまま（strict の場合はエラー）
	// 置換された読み仮名同士は「・」で区切る。非置換文字との間には挿入しない。
	const chars = Array.from(str);
	const out = [];
	let lastWasReplacement = false;
	for (let i = 0; i < chars.length; i++) {
		const ch = chars[i];
		if (replacer && Object.prototype.hasOwnProperty.call(replacer, ch)) {
			if (lastWasReplacement) out.push('・');
			out.push(replacer[ch]);
			lastWasReplacement = true;
		} else {
			if (strict) {
				throw new Error(
					'toKanaReading: 置換マップに存在しない文字「' +
						ch +
						'」が見つかりました（インデックス: ' +
						i +
						'）'
				);
			}
			out.push(ch);
			lastWasReplacement = false;
		}
	}
	return out.join('');
};

/**
 * セキュアなパスワードを生成する
 * options = { length=12, useLower=true, useUpper=true, useNumbers=true, useSymbols=false }
 * ブラウザでは crypto.getRandomValues を使い、安全な乱数を生成します。
 */
const generatePassword = (options) => {
	options = options || {};
	let length = Math.max(4, options.length || 12);
	const useLower = options.useLower !== false;
	const useUpper = options.useUpper !== false;
	const useNumbers = options.useNumbers !== false;
	const useSymbols = !!options.useSymbols;

	// アルファベット小文字のうち視認で間違いやすい文字を除外（i, l, o）
	const lower = 'abcdefghjkmnpqrstuvwxyz';
	// アルファベット大文字のうち視認で間違いやすい文字を除外（I, L, O）
	const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
	// 視認で間違いやすい数字は除外（0, 1）
	const numbers = '23456789';
	// 記号は視認で混同しやすいため、指定のセットのみに限定
	const symbols = '#$%&=@+*/?';

	// 選択されたプールを配列で保持
	const pools = [];
	if (useLower) pools.push(lower);
	if (useUpper) pools.push(upper);
	if (useNumbers) pools.push(numbers);
	if (useSymbols) pools.push(symbols);

	// 必要に応じて長さを選択されたプール数以上にする
	if (length < pools.length) length = pools.length;

	// 合成文字セット
	let charset = '';
	for (let p = 0; p < pools.length; p++) charset += pools[p];
	if (!charset.length) charset = lower + upper + numbers;

	const result = [];

	// まず各選択プールから1文字ずつ確保する
	for (let p = 0; p < pools.length; p++) {
		const pool = pools[p];
		const idx = _su_randomIndex(pool.length);
		result.push(pool.charAt(idx));
	}

	// 残りを合成文字セットから生成
	const remaining = length - result.length;
	if (remaining > 0) {
		for (let i = 0; i < remaining; i++) {
			const idx = _su_randomIndex(charset.length);
			result.push(charset.charAt(idx));
		}
	}

	// 結果をセキュアにシャッフル（Fisher-Yates）
	for (let i = result.length - 1; i > 0; i--) {
		const j = _su_randomIndex(i + 1);
		const tmp = result[i];
		result[i] = result[j];
		result[j] = tmp;
	}

	return result.join('');
};

/**
 * パスワードをマスクして返す
 * 例: maskPassword('Secr3tPW', 2) => 'Se******PW'（左右に visible を残す）
 */
const maskPassword = (pw, visible) => {
	if (typeof pw !== 'string') return '';
	visible = typeof visible === 'number' ? Math.max(0, visible) : 2;
	if (pw.length <= visible * 2) return pw.replace(/./g, '*');
	const left = pw.slice(0, visible);
	const right = pw.slice(pw.length - visible);
	const middle = '*'.repeat(pw.length - visible * 2);
	return left + middle + right;
};

const exports = {
	generatePassword: generatePassword,
	maskPassword: maskPassword,
	toKanaReading: toKanaReading,
};

// CommonJS
if (typeof module !== 'undefined' && module.exports) {
	module.exports = exports;
}

// AMD
if (typeof define === 'function' && define.amd) {
	define(function () {
		return exports;
	});
}

// 公開: 他ライブラリと同じスタイルで個別関数をグローバルに露出（安全に上書きしない）
if (typeof window !== 'undefined') {
	try {
		window.generatePassword =
			typeof generatePassword !== 'undefined' ? generatePassword : undefined;
	} catch {}
	try {
		window.maskPassword = typeof maskPassword !== 'undefined' ? maskPassword : undefined;
	} catch {}
	try {
		window.toKanaReading = typeof toKanaReading !== 'undefined' ? toKanaReading : undefined;
	} catch {}
}

/*
 * セキュリティ注意:
 * - 平文でパスワードを保存しないでください。
 * - ブラウザ上で生成したパスワードをサーバに送る場合は TLS を使用してください。
 * - 永続化する場合はハッシュ化（bcrypt 等）や安全なシークレット管理を検討してください。
 */
