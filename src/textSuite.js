/** 文字列処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_ts_)で始める
'use strict';
//　ライブラリ内の共通定数・変換テーブル定義部
// ハイフン類を検出するための正規表現（全角・半角・ダッシュ類）
const _TS_HYPHEN_REGEX = /[－‐‑–—−ー―]/g;

/**
 * 変換用の文字リスト
 * 各種文字の変換ルールを定義します。
 * ひらがな、カタカナ、濁点・半濁点の変換をサポートします。
 * @typedef {object} _TS_CONVERT_CHARACTER_LIST
 * @property {object} halfWidthKana 全角カタカナから半角カタカナへの変換マップ
 * @property {object} fullWidthKana 半角カタカナから全角カタカナへの変換マップ
 * @property {object} turbidityKana 濁点・半濁点の変換マップ
 */
/** @type {_TS_CONVERT_CHARACTER_LIST} */
const _TS_CONVERT_CHARACTER_LIST = {
    halfWidthKana: {
        'ア': 'ｱ', 'イ': 'ｲ', 'ウ': 'ｳ', 'エ': 'ｴ', 'オ': 'ｵ',
        'カ': 'ｶ', 'キ': 'ｷ', 'ク': 'ｸ', 'ケ': 'ｹ', 'コ': 'ｺ',
        'サ': 'ｻ', 'シ': 'ｼ', 'ス': 'ｽ', 'セ': 'ｾ', 'ソ': 'ｿ',
        'タ': 'ﾀ', 'チ': 'ﾁ', 'ツ': 'ﾂ', 'テ': 'ﾃ', 'ト': 'ﾄ',
        'ナ': 'ﾅ', 'ニ': 'ﾆ', 'ヌ': 'ﾇ', 'ネ': 'ﾈ', 'ノ': 'ﾉ',
        'ハ': 'ﾊ', 'ヒ': 'ﾋ', 'フ': 'ﾌ', 'ヘ': 'ﾍ', 'ホ': 'ﾎ',
        'マ': 'ﾏ', 'ミ': 'ﾐ', 'ム': 'ﾑ', 'メ': 'ﾒ', 'モ': 'ﾓ',
        'ヤ': 'ﾔ', 'ユ': 'ﾕ', 'ヨ': 'ﾖ',
        'ラ': 'ﾗ', 'リ': 'ﾘ', 'ル': 'ﾙ', 'レ': 'ﾚ', 'ロ': 'ﾛ',
        'ワ': 'ﾜ', 'ヲ': 'ｦ', 'ン': 'ﾝ',
        'ガ': 'ｶﾞ', 'ギ': 'ｷﾞ', 'グ': 'ｸﾞ', 'ゲ': 'ｹﾞ', 'ゴ': 'ｺﾞ',
        'ザ': 'ｻﾞ', 'ジ': 'ｼﾞ', 'ズ': 'ｽﾞ', 'ゼ': 'ｾﾞ', 'ゾ': 'ｿﾞ',
        'ダ': 'ﾀﾞ', 'ヂ': 'ﾁﾞ', 'ヅ': 'ﾂﾞ', 'デ': 'ﾃﾞ', 'ド': 'ﾄﾞ',
        'バ': 'ﾊﾞ', 'ビ': 'ﾋﾞ', 'ブ': 'ﾌﾞ', 'ベ': 'ﾍﾞ', 'ボ': 'ﾎﾞ',
        'パ': 'ﾊﾟ', 'ピ': 'ﾋﾟ', 'プ': 'ﾌﾟ', 'ペ': 'ﾍﾟ', 'ポ': 'ﾎﾟ',
        'ヴ': 'ｳﾞ', 'ヷ': 'ﾜﾞ', 'ヺ': 'ｦﾞ',
        'ァ': 'ｧ', 'ィ': 'ｨ', 'ゥ': 'ｩ', 'ェ': 'ｪ', 'ォ': 'ｫ',
        'ッ': 'ｯ', 'ャ': 'ｬ', 'ュ': 'ｭ', 'ョ': 'ｮ',
        '゛': 'ﾞ', '゜': 'ﾟ', '　': ' '
    },
    fullWidthKana: {
        'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
        'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
        'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
        'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
        'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
        'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
        'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
        'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
        'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
        'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
        'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
        'ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
        'ﾞ': '゛', 'ﾟ': '゜', ' ': '　'
    },
    turbidityKana: {
        'カ゛': 'ガ', 'キ゛': 'ギ', 'ク゛': 'グ', 'ケ゛': 'ゲ', 'コ゛': 'ゴ',
        'サ゛': 'ザ', 'シ゛': 'ジ', 'ス゛': 'ズ', 'セ゛': 'ゼ', 'ソ゛': 'ゾ',
        'タ゛': 'ダ', 'チ゛': 'ヂ', 'ツ゛': 'ヅ', 'テ゛': 'デ', 'ト゛': 'ド',
        'ハ゛': 'バ', 'ヒ゛': 'ビ', 'フ゛': 'ブ', 'ヘ゛': 'ベ', 'ホ゛': 'ボ',
        'ハ゜': 'パ', 'ヒ゜': 'ピ', 'フ゜': 'プ', 'ヘ゜': 'ペ', 'ホ゜': 'ポ',
        'ウ゛': 'ヴ', 'ワ゛': 'ヷ', 'ヲ゛': 'ヺ'
    }
};
// 全角カタカナから半角カタカナへの変換テーブルから生成するマップ（各種変換処理で利用）
const _TS_HALF_WIDTH_KANA_MAP = new Map(Object.entries(_TS_CONVERT_CHARACTER_LIST.halfWidthKana));
// 半角カタカナから全角カタカナへの変換テーブルから生成するマップ（各種変換処理で利用）
const _TS_FULL_WIDTH_KANA_MAP = new Map(Object.entries(_TS_CONVERT_CHARACTER_LIST.fullWidthKana));
// 濁点・半濁点の変換テーブルから生成するマップ（各種変換処理で利用）
const _TS_TURBIDITY_KANA_MAP = new Map(Object.entries(_TS_CONVERT_CHARACTER_LIST.turbidityKana));

//　ライブラリ内の共通関数定義部
/**
 * 文字列が文字列型であることを確認する関数
 * @param {*} str 確認する文字列
 * @returns {boolean} 文字列である = true、文字でない = false
 */
const _ts_checkString = (str) => {
    return typeof str === 'string';
};

/**
 * boolean型であることを確認する関数
 * @param {*} val 確認する値
 * @returns {boolean} boolean型である = true、そうでない = false
 */
const _ts_checkBoolean = (val) => {
    return typeof val === 'boolean';
};

/**
 * イテラブルな文字列集合から正規表現パターンを構築する関数
 * @param {Iterable<string>} keys イテラブルな文字列集合
 * @returns {RegExp} 正規表現のパターン
 */
const _ts_buildPattern = (keys) => {
    if (!keys) throw new Error('keys is required');
    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!(keys && typeof keys[Symbol.iterator] === 'function')) throw new Error('keys must be an Iterable');
    const escapedKeys = [...keys].map(escapeRegExp);
    return new RegExp(escapedKeys.join('|'), 'g');
};

/**
 * 指定した1文字が全角（漢字・ひらがな・カタカナ・全角記号等）かどうかを判定する関数
 * @param {string} char 判定対象の1文字
 * @returns {boolean} 全角文字ならtrue、そうでなければfalse
 */
const _ts_isFullWidthChar = (char) => {
    if (!_ts_checkString(char) || char.length !== 1) return false;
    const code = char.charCodeAt(0);
    return (
        (code >= 0x4E00 && code <= 0x9FFF) || // 漢字
        (code >= 0x3040 && code <= 0x309F) || // ひらがな
        (code >= 0x30A0 && code <= 0x30FF) || // カタカナ
        (code >= 0xFF00 && code <= 0xFF60) || // 全角記号・英数字・スペースなど
        (code >= 0xFFA0 && code <= 0xFFEF)    // 全角記号など
    );
};

/**
 * 文字列を正規表現で表記されたパターンに一致した場合、マップにある文字列に置き換える処理をする関数
 * @param {string} str 変換対象の文字列
 * @param {RegExp} pattern 正規表現のパターン
 * @param {Map} map 置き換えマップ
 * @returns {string} 置き換え後の文字列
 */
const _ts_replace_with_map = (str, pattern, map) => {
    if (!_ts_checkString(str)) throw new Error(`_ts_replace_with_mapの[${str}]は文字である必要があります`);
    if (!(pattern instanceof RegExp)) throw new Error('pattern must be a RegExp');
    if (!(map instanceof Map)) throw new Error('map must be a Map');
    return str.replace(pattern, char => map.get(char) ?? char);
};

/**
 * 文字列が半角数字のみ含まれるかをチェックする関数
 * @param {*} str チェック対象の文字列
 * @returns {boolean} 半角数字のみ含まれる場合はtrue、それ以外はfalse
 */
const check_single_byte_numbers = (str = '') => {
    if ((typeof str !== 'string' && typeof str !== 'number') || str === null || str === undefined) return false;
    const number_pattern = /^[0-9]+$/;
    return number_pattern.test(String(str));
};

/**
 * 文字列が半角カナ文字のみ含まれるかをチェックする関数
 * @param {string} str チェック対象の文字列
 * @returns {boolean} 半角カナ文字のみ含まれる場合はtrue、それ以外はfalse
 */
const check_single_byte_kana = (str = '') => {
    if (!_ts_checkString(str)) return false;
    const kana_pattern = /^[\uFF61-\uFF9F]+$/;
    return kana_pattern.test(str);
};

//　ライブラリ本体部
/**
 * 文字列を半角カタカナに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能な文字があった場合にエラーを投げるかどうか
 * @returns {string} 可能な限り半角カタカナに変換した文字列
 * @throws {Error} 変換不能な文字が含まれている場合（throwOnError=true時）
 */
const toHalfWidthKana = (str = '', throwOnError = true) => {
    if (!_ts_checkString(str)) throw new Error('変換対象は文字列である必要があります');
    if (!_ts_checkBoolean(throwOnError)) throw new Error('throwOnErrorはboolean型である必要があります');
    if (!str) throw new Error('変換対象の文字列が空です');
    // ひらがな→カタカナ変換を追加
    const katakanaStr = toFullWidthKatakana(str, false);
    const halfWidthKanaPattern = _ts_buildPattern(_TS_HALF_WIDTH_KANA_MAP.keys());
    let errorChar = null;
    const result = katakanaStr.replace(halfWidthKanaPattern, char => _TS_HALF_WIDTH_KANA_MAP.get(char) ?? char);
    // 変換後に半角カタカナ以外が含まれていればエラー（ただし変換テーブルの値は許容）
    const allowedValues = Object.values(_TS_CONVERT_CHARACTER_LIST.halfWidthKana);
    for (const char of result) {
        if (!allowedValues.includes(char)) {
            if (throwOnError) {
                errorChar = char;
                break;
            }
        }
    }
    if (errorChar) throw new Error(`半角カタカナ以外の文字が含まれています: ${errorChar}`);
    return result;
};

/**
 * 文字列を全角カタカナに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能な文字があった場合にエラーを投げるかどうか
 * @returns {string} 可能な限り全角カタカナに変換した文字列
 * @throws {Error} 変換不能な文字が含まれている場合（throwOnError=true時）
 */
const toFullWidthKatakana = (str = '', throwOnError = true) => {
    if (!_ts_checkString(str)) throw new Error('変換対象は文字列である必要があります');
    if (!_ts_checkBoolean(throwOnError)) throw new Error('throwOnErrorはboolean型である必要があります');
    if (!str) throw new Error('変換対象の文字列が空です');
    const fullWidthKanaPattern = _ts_buildPattern(_TS_FULL_WIDTH_KANA_MAP.keys());
    const turbidityKanaPattern = _ts_buildPattern(_TS_TURBIDITY_KANA_MAP.keys());
    let errorChar = null;
    // ひらがな→全角カタカナ
    let work = str.replace(/[\u3041-\u3096]/g, char => String.fromCodePoint(char.charCodeAt(0) + 0x60));
    // 半角カタカナ→全角カタカナ
    work = work.replace(fullWidthKanaPattern, char => _TS_FULL_WIDTH_KANA_MAP.get(char) ?? char);
    // 合成濁点・半濁点（カ゛→ガ等）を変換
    work = work.replace(turbidityKanaPattern, pair => _TS_TURBIDITY_KANA_MAP.get(pair) ?? pair);
    // 変換後に全角カタカナ以外が含まれていればエラー（ただし変換テーブルの値は許容）
    const allowedValues = Object.values(_TS_CONVERT_CHARACTER_LIST.fullWidthKana);
    for (const char of work) {
        const code = char.charCodeAt(0);
        // allowedValuesに含まれるか、全角カタカナ範囲なら許容
        if (!allowedValues.includes(char) && !(code >= 0x30A1 && code <= 0x30FA)) {
            if (throwOnError) {
                errorChar = char;
                break;
            }
        }
    }
    if (errorChar) throw new Error(`全角カタカナ以外の文字が含まれています: ${errorChar}`);
    return work;
};

/**
 * 文字列を全角ひらがなに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能な文字があった場合にエラーを投げるかどうか
 * @returns {string} 可能な限り全角ひらがなに変換した文字列
 * @throws {Error} 変換不能な文字が含まれている場合（throwOnError=true時）
 */
const toFullWidthHiragana = (str = '', throwOnError = true) => {
    if (!_ts_checkString(str)) throw new Error('変換対象は文字列である必要があります');
    if (!_ts_checkBoolean(throwOnError)) throw new Error('throwOnErrorはboolean型である必要があります');
    if (!str) throw new Error('変換対象の文字列が空です');
    // 半角カタカナ→全角カタカナ
    let work = toFullWidthKatakana(str, false);
    // 全角カタカナ→ひらがな
    work = work.replace(/[\u30A1-\u30F6]/g, char => String.fromCodePoint(char.charCodeAt(0) - 0x60));
    let errorChar = null;
    // 変換後にひらがな以外が残っていればエラー
    for (const char of work) {
        const code = char.charCodeAt(0);
        // ひらがなUnicode範囲、または全角スペースなら許容
        if (!(code >= 0x3041 && code <= 0x3096) && char !== '\u3000') {
            if (throwOnError) {
                errorChar = char;
                break;
            }
        }
    }
    if (errorChar) throw new Error(`ひらがな以外の文字が含まれています: ${errorChar}`);
    return work;
};

/**
 * 文字列の中の各文字を半角文字（英数字・記号・スペース含む）に変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能な文字があった場合にエラーを投げるかどうか
 * @returns {string} 半角文字に変換した文字列
 * @throws {Error} 変換不能な文字が含まれている場合（throwOnError=true時）
 */
const toHalfWidth = (str = '', throwOnError = true) => {
    if (!_ts_checkString(str)) throw new Error('変換対象は文字列である必要があります');
    if (!_ts_checkBoolean(throwOnError)) throw new Error('throwOnErrorはboolean型である必要があります');
    if (!str) throw new Error('変換対象の文字列が空です');
    const hyphenProcessed = str.replace(_TS_HYPHEN_REGEX, '-');
    try {
        const halfWidthKana = toHalfWidthKana(hyphenProcessed, false);
        let errorChar = null;
        const halfWidthStr = [...halfWidthKana].map((char) => {
            const code = char.charCodeAt(0);
            // 半角英数字・記号・スペース・カナ以外は変換不能とみなす
            // 全角円マーク→半角バックスラッシュ
            if (char === '￥') return '\\';
            // 全角チルダ→半角チルダ
            if (char === '～') return '~';
            if (
                (code >= 0xFF01 && code <= 0xFF5E) // 全角記号・英数字
            ) {
                return String.fromCodePoint(code - 0xFEE0);
            }
            if (char === '\u3000') return ' '; // 全角スペースを半角に
            // 変換後が全角カナ・ひらがな・漢字・その他全角文字の場合はエラーまたはそのまま
            if (_ts_isFullWidthChar(char)) {
                if (throwOnError) errorChar = char;
                // throwOnError=falseならそのまま返す
            }
            return char;
        }).join('');
        if (errorChar) throw new Error(`半角文字に変換不能な文字が含まれています: ${errorChar}`);
        return halfWidthStr;
    } catch (error) {
        throw error;
    }
};

/**
 * 文字列の中の各文字を全角文字列に変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能文字があった場合に例外を投げるか（true:投げる, false:そのまま返す）
 * @returns {string} 変換後の文字列
 * @throws {Error} 変換不能文字が含まれる場合（throwOnError=true時）
 */
const toFullWidth = (str = '', throwOnError = true) => {
    if (!_ts_checkString(str)) throw new Error('変換対象は文字列である必要があります');
    if (!_ts_checkBoolean(throwOnError)) throw new Error('throwOnErrorはboolean型である必要があります');
    if (!str) throw new Error('変換対象の文字列が空です');
    try {
        let errorChar = null;
        // 半角カタカナの連続部分をまとめて変換
        const replaced = str.replace(/([\uFF61-\uFF9F]+)/g, (kana) => {
            try {
                return toFullWidthKatakana(kana, throwOnError);
            } catch (e) {
                if (throwOnError) errorChar = kana;
                return kana;
            }
        });
        const fullWidthStr = [...replaced].map((char) => {
            const code = char.charCodeAt(0);
            // ひらがなはそのまま
            if (code >= 0x3041 && code <= 0x3096) {
                return char;
            }
            // バックスラッシュ→円マーク
            if (char === '\\') return '￥';
            // チルダ→全角チルダ
            if (char === '~') return '～';
            // 半角英数字・記号
            if (code >= 0x21 && code <= 0x7E) {
                return String.fromCodePoint(code + 0xFEE0);
            }
            if (char === ' ') return '\u3000'; // 半角スペースを全角に
            // 変換後が半角カナ・その他半角文字の場合はエラーまたはそのまま
            if (!_ts_isFullWidthChar(char)) {
                if (throwOnError) errorChar = char;
                // throwOnError=falseならそのまま返す
            }
            return char;
        }).join('');
        if (errorChar) throw new Error(`全角文字に変換不能な文字が含まれています: ${errorChar}`);
        return fullWidthStr;
    } catch (error) {
        throw error;
    }
};

/**
 * メールアドレスの表記を半角文字に変換し、RFC 5322に基づいた形式であるかを判定し、正しくない場合は例外を投げる関数
 * @param {string} emailAddress
 * @returns {string} 正常な場合は変換済みメールアドレス
 * @throws {Error} 不正な場合は例外
 */
const assertEmailAddress = (emailAddress = '') => {
    // 簡易的なRFC5322準拠の正規表現（一般的な用途で十分）
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!_ts_checkString(emailAddress)) throw new Error('メールアドレスは文字列である必要があります');
    if (!emailAddress) throw new Error('メールアドレスが空です');
    const trimmed = emailAddress.trim();
    try {
        const singleByteCharacters = toHalfWidth(trimmed);
        if (/\.\.|^\.|\.@|@\.|\.$/.test(singleByteCharacters)) throw new Error('メールアドレスは連続ドットや@直前・直後のドットを含めることはできません');
        if (!emailPattern.test(singleByteCharacters)) throw new Error('メールアドレスの形式が正しくありません');
        return singleByteCharacters.toLowerCase();
    } catch (error) {
        throw error;
    }
};
