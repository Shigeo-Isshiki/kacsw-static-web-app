
/**
 * パスワード生成用ユーティリティ関数群
 *
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_pg_)で始める
'use strict';
// --- パスワードに関する初期設定 ---
// 生成するパスワードに使用する文字を定義（パスワードとして使用するとどちらの文字か紛らわしいものは除くことが望ましい）
/**
 * アルファベット小文字を定義
 * 除外文字: l（エル）, o（オー）, i（アイ）
 * 使用文字: a b c d e f g h j k m n p q r s t u v w x y z
 * @type {string}
 */
const _pg_lowerCaseLetters = 'abcdefghjkmnpqrstuvwxyz';
/**
 * アルファベット大文字を定義
 * 除外文字: I（アイ）, O（オー）, L（エル）
 * 使用文字: A B C D E F G H J K M N P Q R S T U V W X Y Z
 * @type {string}
 */
const _pg_upperCaseLetters = 'ABCDEFGHJKMNPQRSTUVWXYZ';
/**
 * 数字を定義
 * 除外文字: 0（ゼロ）, 1（イチ）
 * 使用文字: 2 3 4 5 6 7 8 9
 * @type {string}
 */
const _pg_numerals = '23456789';
/**
 * 記号を定義
 * 使用記号: # $ % & = @ + * / ?
 * 一般的なWebサービスで利用可能な記号のみを採用。
 * @type {string}
 */
const _pg_symbols = '#$%&=@+*/?';
// --- 変換用定数・マッピング ---
/** ヨミガナを定義
 * @type {Object<string, string>}
 */
const _pg_readingList = {
    'a': 'エイ', 'A': 'エイ',
    'b': 'ビー', 'B': 'ビー',
    'c': 'シー', 'C': 'シー',
    'd': 'ディー', 'D': 'ディー',
    'e': 'イー', 'E': 'イー',
    'f': 'エフ', 'F': 'エフ',
    'g': 'ジー', 'G': 'ジー',
    'h': 'エイチ', 'H': 'エイチ',
    'i': 'アイ', 'I': 'アイ',
    'j': 'ジェイ', 'J': 'ジェイ',
    'k': 'ケイ', 'K': 'ケイ',
    'l': 'エル', 'L': 'エル',
    'm': 'エム', 'M': 'エム',
    'n': 'エヌ', 'N': 'エヌ',
    'o': 'オー', 'O': 'オー',
    'p': 'ピー', 'P': 'ピー',
    'q': 'キュー', 'Q': 'キュー',
    'r': 'アール', 'R': 'アール',
    's': 'エス', 'S': 'エス',
    't': 'ティー', 'T': 'ティー',
    'u': 'ユー', 'U': 'ユー',
    'v': 'ブイ', 'V': 'ブイ',
    'w': 'ダブリュー', 'W': 'ダブリュー',
    'x': 'エックス', 'X': 'エックス',
    'y': 'ワイ', 'Y': 'ワイ',
    'z': 'ゼット', 'Z': 'ゼット',
    '1': 'イチ', '2': 'ニ', '3': 'サン', '4': 'ヨン', '5': 'ゴ',
    '6': 'ロク', '7': 'ナナ', '8': 'ハチ', '9': 'キュウ', '0': 'ゼロ',
    '!': 'エクスクラメーションマーク',
    '"': 'ダブルクォーテーション',
    '#': 'ハッシュ',
    '$': 'ドル',
    '%': 'パーセント',
    '&': 'アンパサンド',
    "'": 'アポストロフィー',
    '(': 'ヒダリカッコ',
    ')': 'ミギカッコ',
    '~': 'チルダ',
    '^': 'キャレット',
    '|': 'パイプライン',
    '@': 'アットマーク',
    '`': 'バッククオート',
    '[': 'ヒダリダイカッコ',
    '{': 'ヒダリチュウカッコ',
    ':': 'コロン',
    ';': 'セミコロン',
    '*': 'アスタリスク',
    ']': 'ミギダイカッコ',
    '}': 'ミギチュウカッコ',
    ',': 'カンマ',
    '.': 'ドット',
    '<': 'レスザン',
    '>': 'グレーターザン',
    '/': 'スラッシュ',
    '?': 'クエスチョンマーク',
    '_': 'アンダーバー',
    '=': 'イコール',
    '-': 'ハイフン',
    '+': 'プラス'
};
/**
 * 正規表現用に文字列をエスケープする関数
 * @param {string} str
 * @returns {string}
 */
const _pg_escapeRegExp = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * パスワードを生成する
 * @function getPassword
 * @param {number} [length=10] - 生成するパスワードの文字数（4文字以上）
 * @param {number} [type=0b1111] - 生成するパスワードのタイプ（4ビット表示）
 *  - 1ビット目:アルファベット小文字　あり=1　なし=0
 *  - 2ビット目:アルファベット大文字　あり=1　なし=0
 *  - 3ビット目:数字　あり=1　なし=0
 *  - 4ビット目:記号　あり=1　なし=0
 * @returns {{password: string, reading: string|null}} 生成されたパスワードとそのヨミガナ
 * @example
 * const result = getPassword(12, 0b1111);
 * console.log(result.password); // 生成されたパスワード
 * console.log(result.reading);  // 生成されたパスワードのヨミガナ
 * @public
 * @remarks
 * - lengthが4未満の場合は4として扱います。
 * - typeが0の場合は全ての文字種を使用します。
 * - 選択した文字種数より短い長さを指定した場合はエラーとなります。
 */
const getPassword = (length = 10, type = 0b1111) => {
    if (typeof length !== 'number' || isNaN(length) || length < 1 || !Number.isInteger(length)) {
        throw new TypeError('生成するパスワードの長さは1以上の整数で指定してください');
    }
    if (typeof type !== 'number' || isNaN(type) || type < 0 || type > 0b1111 || !Number.isInteger(type)) {
        throw new TypeError('生成するパスワードのタイプは0から15までの整数で指定してください');
    }    
    let passwordLength = length;
    if (length < 4) { // 4文字未満の時は4文字とする
        passwordLength = 4;
    }
    let lowerLetterSwitch = false;
    let upperLetterSwitch = false;
    let numeralSwitch = false;
    let symbolSwitch = false;
    if (type) {
        if ((type & 0b1000) !== 0) lowerLetterSwitch = true;
        if ((type & 0b0100) !== 0) upperLetterSwitch = true;
        if ((type & 0b0010) !== 0) numeralSwitch = true;
        if ((type & 0b0001) !== 0) symbolSwitch = true;
    } else {
        lowerLetterSwitch = upperLetterSwitch = numeralSwitch = symbolSwitch = true;
    }

    // 有効な文字種を配列で管理
    const charTypes = [];
    if (lowerLetterSwitch) charTypes.push(_pg_lowerCaseLetters);
    if (upperLetterSwitch) charTypes.push(_pg_upperCaseLetters);
    if (numeralSwitch) charTypes.push(_pg_numerals);
    if (symbolSwitch) charTypes.push(_pg_symbols);

    // 各種1文字ずつ確保
    let passwordArr = [];
    if (lowerLetterSwitch) passwordArr.push(_pg_lowerCaseLetters.charAt(Math.floor(Math.random() * _pg_lowerCaseLetters.length)));
    if (upperLetterSwitch) passwordArr.push(_pg_upperCaseLetters.charAt(Math.floor(Math.random() * _pg_upperCaseLetters.length)));
    if (numeralSwitch) passwordArr.push(_pg_numerals.charAt(Math.floor(Math.random() * _pg_numerals.length)));
    if (symbolSwitch) passwordArr.push(_pg_symbols.charAt(Math.floor(Math.random() * _pg_symbols.length)));

    // エラー処理: 選択した文字種数より短い長さは不可
    if (passwordLength < charTypes.length) {
        throw new Error(`選択された文字種の数（${charTypes.length}種）以上の長さを指定してください`);
    }

    // 残りをランダムで埋める
    while (passwordArr.length < passwordLength) {
        const chars = charTypes[Math.floor(Math.random() * charTypes.length)];
        passwordArr.push(chars.charAt(Math.floor(Math.random() * chars.length)));
    }
    // パスワード全体をシャッフル
    for (let i = passwordArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [passwordArr[i], passwordArr[j]] = [passwordArr[j], passwordArr[i]];
    }
    const password = passwordArr.join('');
    return {
        'password': password,
        'reading': getPasswordReading(password)
    };
};

/** * ヨミガナを生成する
 * @function getPasswordReading
 * @param {string} str - ヨミガナを生成する元の半角英数字と半角記号
 * @returns {string|null} ヨミガナ文字列
 * @example
 * const reading = getPasswordReading('Abc123!');
 * console.log(reading); // エイ・ビー・シー・イチ・ニ・サン・エクスクラメーションマーク
 * @public
 * @remarks
 * - 定義されていない文字は無視されます。
 */
const getPasswordReading = (str) => {
    if (typeof str !== 'string') {
        throw new TypeError('ヨミガナを生成する元の文字列は文字列で指定してください');
    }
    const keys = Object.keys(_pg_readingList).map(_pg_escapeRegExp);
    const readingListRReg = new RegExp(keys.join('|'), 'g');
    if (typeof str !== 'string' || str.length === 0) return null;
    const replaced = str.replace(readingListRReg, (match) => {
        if (_pg_readingList[match] !== undefined) return _pg_readingList[match] + '・';
        if (_pg_readingList['\\' + match] !== undefined) return _pg_readingList['\\' + match] + '・';
        return '';
    });
    return replaced === '' ? null : replaced.endsWith('・') ? replaced.slice(0, -1) : replaced;
};