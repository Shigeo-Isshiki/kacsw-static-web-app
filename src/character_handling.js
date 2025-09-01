/** 文字列処理をまとめたJavaScriptの関数群です。
 * 2025-09-01 Version 1.0
 */
'use strict';
/**
 * 変換用の文字リスト
 * 各種文字の変換ルールを定義します。
 * ひらがな、カタカナ、濁点・半濁点の変換をサポートします。
 * @typedef {object} convert_charactor_list
 * @property {object} half_width_kana - 全角カタカナから半角カタカナへの変換マップ
 * @property {object} full_width_kana - 半角カタカナから全角カタカナへの変換マップ
 * @property {object} turbidity_kana - 濁点・半濁点の変換マップ
 */
/** @type {convert_charactor_list} */
const convert_charactor_list = {
    'half_width_kana': {
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
    'full_width_kana': {
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
    'turbidity_kana': {
        'カ゛': 'ガ', 'キ゛': 'ギ', 'ク゛': 'グ', 'ケ゛': 'ゲ', 'コ゛': 'ゴ',
        'サ゛': 'ザ', 'シ゛': 'ジ', 'ス゛': 'ズ', 'セ゛': 'ゼ', 'ソ゛': 'ゾ',
        'タ゛': 'ダ', 'チ゛': 'ヂ', 'ツ゛': 'ヅ', 'テ゛': 'デ', 'ト゛': 'ド',
        'ハ゛': 'バ', 'ヒ゛': 'ビ', 'フ゛': 'ブ', 'ヘ゛': 'ベ', 'ホ゛': 'ボ',
        'ハ゜': 'パ', 'ヒ゜': 'ピ', 'フ゜': 'プ', 'ヘ゜': 'ペ', 'ホ゜': 'ポ',
        'ウ゛': 'ヴ', 'ワ゛': 'ヷ', 'ヲ゛': 'ヺ'
    }
};

/**
 * 正規表現用に文字列をエスケープする関数
 * @param {string} str エスケープ対象の文字列
 * @returns {string} エスケープ後の文字列
 */
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * イテラブルな文字列集合から正規表現パターンを構築する関数
 * @param {Iterable<string>} keys イテラブルな文字列集合
 * @returns {RegExp} 正規表現のパターン
 */
const buildPattern = (keys) => {
  if (!(keys && typeof keys[Symbol.iterator] === 'function')) throw new Error('keys must be an Iterable');
  const escapedKeys = [...keys].map(escapeRegExp);
  return new RegExp(escapedKeys.join('|'), 'g');
};

/**
 * 半角カナ変換用のマップを作成する
 */
const half_width_kana_map = new Map(Object.entries(convert_charactor_list.half_width_kana));

/**
 * 全角カナ変換用のマップを作成する
 */
const full_width_kana_map = new Map(Object.entries(convert_charactor_list.full_width_kana));

/**
 * 濁点・半濁点変換用のマップを作成する
 */
const turbidity_kana_map = new Map(Object.entries(convert_charactor_list.turbidity_kana));

/**
 * 半角カナ変換用の正規表現のパターンを作成する
 */
const half_width_kana_pattern = buildPattern(half_width_kana_map.keys());

/**
 * 全角カナ変換用の正規表現のパターンを作成する
 */
const full_width_kana_pattern = buildPattern(full_width_kana_map.keys());

/**
 * 濁点・半濁点変換用の正規表現のパターンを作成する
 */
const turbidity_kana_pattern = buildPattern(turbidity_kana_map.keys());

/**
 * 文字列を正規表現で表記されたパターンに一致した場合、マップにある文字列に置き換える処理をする関数
 * @param {string} str 変換対象の文字列
 * @param {RegExp} pattern 正規表現のパターン
 * @param {Map} map 置き換えマップ
 * @returns {string} 置き換え後の文字列
 */
const replace_with_map = (str, pattern, map) => {
    if (typeof str !== 'string') throw new Error('str must be a string');
    if (!(pattern instanceof RegExp)) throw new Error('pattern must be a RegExp');
    if (!(map instanceof Map)) throw new Error('map must be a Map');
    return str.replace(pattern, char => map.get(char) ?? char);
};

/**
 * ひらがな文字をカタカナに変換する
 * @param {string} str 変換対象の文字列
 * @returns {string} カタカナに変換した文字列
 */
const hiraganaToKatakana = (str) => {
  return str.replace(/[\u3041-\u3096]/g, char => 
    String.fromCodePoint(char.charCodeAt(0) + 0x60)
  );
};

/**
 * カタカナ文字をひらがなに変換する
 * @param {string} str 変換対象の文字列
 * @returns {string} ひらがなに変換した文字列
 */
const katakanaToHiragana = (str) => {
  return str.replace(/[\u30A1-\u30F6]/g, char => 
    String.fromCodePoint(char.charCodeAt(0) - 0x60)
  );
};

/**
 * 文字列の中の各文字を半角カナ文字に変換する関数
 * @param {string} str 変換対象の文字列 
 * @returns {string} 可能な限り半角カナ文字に変換した文字列
 */
const convert_to_half_width_kana = (str = '') => {
    if (typeof str !== 'string') throw new Error('str must be a string');
    return replace_with_map(str, half_width_kana_pattern, half_width_kana_map);
};

/**
 * 文字列の中の各文字を全角カナ文字に変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} hiragana_sw ひらがな変換の可否を選択するスイッチ（trueで変換、falseで不変換）
 * @returns {string} 可能な限り全角カナ文字に変換した文字列
 */
const convert_to_full_width_kana = (str = '', hiragana_sw = true) => {
    if (typeof str !== 'string') throw new Error('str must be a string');
    if (typeof hiragana_sw !== 'boolean') throw new Error('hiragana_sw must be a boolean');
    let result = hiragana_sw ? hiraganaToKatakana(str) : str;
    result = replace_with_map(result, full_width_kana_pattern, full_width_kana_map);
    result = replace_with_map(result, turbidity_kana_pattern, turbidity_kana_map);
    return result;
};

/**
 * 文字列の中の各文字をひらがなに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} check ひらがな以外が含まれる場合はエラーを返すか選択するスイッチ（trueでエラーを返す、falseでエラーを返さない）
 * @returns {string} ひらがなに変換した文字列、またはエラー（エラーの場合はERRORを返す）
 */
const convert_to_hiragana = (str = '', check = false) => {
    if (typeof str !== 'string') throw new Error('str must be a string');
    if (typeof check !== 'boolean') throw new Error('check must be a boolean');
    if (!str) return '';
    const full_width_kana = convert_to_full_width_kana(str);
    const hiragana = katakanaToHiragana(full_width_kana);
    if (check) {
        const allow_symbol = ['ー', '・', 'ゝ', 'ゞ', '゛', '゜', '　'];
        const hiragana_check = [...hiragana].every(char => 
            (char >= 'ぁ' && char <= 'ん') || allow_symbol.includes(char)
        );
        if (!hiragana_check) {
            return 'ERROR';// TODO: 将来的に 'ERROR' ではなく null または例外に変更する
        }
    }
    return hiragana;
};

/**
 * 文字列の中の各文字を半角文字に変換する関数
 * @param {string} str 変換対象の文字列
 * @returns {string} 半角文字に変換した文字列
 */
const convert_to_single_byte_characters = (str = '') => {
    if (typeof str !== 'string') throw new Error('str must be a string');
    if (!str) return '';
    const hyphen_processed = str.replace(/[－‐‑–—−ー―]/g, '-');
    const half_width_kana = convert_to_half_width_kana(hyphen_processed);
    const single_byte_characters = [...half_width_kana].map((char) => {
        const code = char.charCodeAt(0);
        if (
            (code >= 0xFF01 && code <= 0xFF5E) // 全角記号・英数字
        ) {
            return String.fromCodePoint(code - 0xFEE0);
        }
        if (char === '\u3000') return ' '; // 全角スペースを半角に
        return char;
    }).join('');
    return single_byte_characters;
};

/**
 * 文字列の中の各文字を全角文字に変換する関数
 * @param {string} str 変換対象の文字列
 * @returns {string} 全角文字に変換した文字列
 */
const convert_to_double_byte_characters = (str = '') => {
    if (typeof str !== 'string') throw new Error('str must be a string');
    if (!str) return '';
    const hyphen_processed = str.replace(/[‐‑–—−ー―]/g, '－');
    const full_width_kana = convert_to_full_width_kana(hyphen_processed, false);
    const double_byte_characters = [...full_width_kana].map((char) => {
        if (char === '\\') return '￥';
        if (char === ' ') return '\u3000';
        const code = char.charCodeAt(0);
        if (
            (code >= 0x21 && code <= 0x7E) || // 半角記号・英数字
            (code >= 0x30 && code <= 0x39) || // 数字
            (code >= 0x41 && code <= 0x5A) || // 英大文字
            (code >= 0x61 && code <= 0x7A)    // 英小文字
        ) {
            return String.fromCodePoint(code + 0xFEE0);
        }
        return char;
    }).join('');
    return double_byte_characters;
};

/**
 * メールアドレスの表記を半角文字に変換した上で、RFC 5322に基づいた形式であるかを簡易判定する関数
 * @param {string} email_address メールアドレスとして変換対象の文字列
 * @returns {string} メールアドレス文字（メールアドレスとして正しくない場合は空白を返す）
 */
const convert_to_email_address = (email_address = '') => {
    if (typeof email_address !== 'string') throw new Error('email_address must be a string');
    const email_pattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!email_address) return '';
    const single_byte_characters = convert_to_single_byte_characters(email_address);
    return email_pattern.test(single_byte_characters) ? single_byte_characters : '';
};

/**
 * 文字列が半角数字のみ含まれるかをチェックする関数
 * @param {*} str チェック対象の文字列
 * @returns {boolean} 半角数字のみ含まれる場合はtrue、それ以外はfalse
 */
const check_single_byte_numbers = (str = '') => {
    if (typeof str !== 'string' && typeof str !== 'number') throw new Error('str must be a string or number');
    const number_pattern = /^[0-9]+$/;
    return number_pattern.test(String(str));
};

/**
 * 文字列が半角カナ文字のみ含まれるかをチェックする関数
 * @param {string} str チェック対象の文字列
 * @returns {boolean} 半角カナ文字のみ含まれる場合はtrue、それ以外はfalse
 */
const check_single_byte_kana = (str = '') => {
    if (typeof str !== 'string') throw new Error('str must be a string');
    const kana_pattern = /^[\uFF61-\uFF9F]+$/;
    return kana_pattern.test(str);
};