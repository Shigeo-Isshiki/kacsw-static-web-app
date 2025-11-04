/** 文字列処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.1.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_ch_)で始める
/* exported convert_to_hiragana, convert_to_double_byte_characters, convert_to_email_address, check_single_byte_numbers */
'use strict';
/**
 * 文字列が文字列型であることを確認する関数
 * @param {*} str - 確認する文字列
 * @returns {boolean} - 文字列である = true、文字でない = false
 */
const _ch_checkString = (str) => {
  return typeof str === 'string' && str !== null && str !== undefined;
};
/**
 * 変換用の文字リスト
 * 各種文字の変換ルールを定義します。
 * ひらがな、カタカナ、濁点・半濁点の変換をサポートします。
 * @typedef {object} _ch_convert_character_list
 * @property {object} half_width_kana 全角カタカナから半角カタカナへの変換マップ
 * @property {object} full_width_kana 半角カタカナから全角カタカナへの変換マップ
 * @property {object} turbidity_kana 濁点・半濁点の変換マップ
 */
/** @type {_ch_convert_character_list} */
const _ch_convert_character_list = {
  half_width_kana: {
    ア: 'ｱ',
    イ: 'ｲ',
    ウ: 'ｳ',
    エ: 'ｴ',
    オ: 'ｵ',
    カ: 'ｶ',
    キ: 'ｷ',
    ク: 'ｸ',
    ケ: 'ｹ',
    コ: 'ｺ',
    サ: 'ｻ',
    シ: 'ｼ',
    ス: 'ｽ',
    セ: 'ｾ',
    ソ: 'ｿ',
    タ: 'ﾀ',
    チ: 'ﾁ',
    ツ: 'ﾂ',
    テ: 'ﾃ',
    ト: 'ﾄ',
    ナ: 'ﾅ',
    ニ: 'ﾆ',
    ヌ: 'ﾇ',
    ネ: 'ﾈ',
    ノ: 'ﾉ',
    ハ: 'ﾊ',
    ヒ: 'ﾋ',
    フ: 'ﾌ',
    ヘ: 'ﾍ',
    ホ: 'ﾎ',
    マ: 'ﾏ',
    ミ: 'ﾐ',
    ム: 'ﾑ',
    メ: 'ﾒ',
    モ: 'ﾓ',
    ヤ: 'ﾔ',
    ユ: 'ﾕ',
    ヨ: 'ﾖ',
    ラ: 'ﾗ',
    リ: 'ﾘ',
    ル: 'ﾙ',
    レ: 'ﾚ',
    ロ: 'ﾛ',
    ワ: 'ﾜ',
    ヲ: 'ｦ',
    ン: 'ﾝ',
    ガ: 'ｶﾞ',
    ギ: 'ｷﾞ',
    グ: 'ｸﾞ',
    ゲ: 'ｹﾞ',
    ゴ: 'ｺﾞ',
    ザ: 'ｻﾞ',
    ジ: 'ｼﾞ',
    ズ: 'ｽﾞ',
    ゼ: 'ｾﾞ',
    ゾ: 'ｿﾞ',
    ダ: 'ﾀﾞ',
    ヂ: 'ﾁﾞ',
    ヅ: 'ﾂﾞ',
    デ: 'ﾃﾞ',
    ド: 'ﾄﾞ',
    バ: 'ﾊﾞ',
    ビ: 'ﾋﾞ',
    ブ: 'ﾌﾞ',
    ベ: 'ﾍﾞ',
    ボ: 'ﾎﾞ',
    パ: 'ﾊﾟ',
    ピ: 'ﾋﾟ',
    プ: 'ﾌﾟ',
    ペ: 'ﾍﾟ',
    ポ: 'ﾎﾟ',
    ヴ: 'ｳﾞ',
    ヷ: 'ﾜﾞ',
    ヺ: 'ｦﾞ',
    ァ: 'ｧ',
    ィ: 'ｨ',
    ゥ: 'ｩ',
    ェ: 'ｪ',
    ォ: 'ｫ',
    ッ: 'ｯ',
    ャ: 'ｬ',
    ュ: 'ｭ',
    ョ: 'ｮ',
    '゛': 'ﾞ',
    '゜': 'ﾟ',
    '　': ' ',
  },
  full_width_kana: {
    ｱ: 'ア',
    ｲ: 'イ',
    ｳ: 'ウ',
    ｴ: 'エ',
    ｵ: 'オ',
    ｶ: 'カ',
    ｷ: 'キ',
    ｸ: 'ク',
    ｹ: 'ケ',
    ｺ: 'コ',
    ｻ: 'サ',
    ｼ: 'シ',
    ｽ: 'ス',
    ｾ: 'セ',
    ｿ: 'ソ',
    ﾀ: 'タ',
    ﾁ: 'チ',
    ﾂ: 'ツ',
    ﾃ: 'テ',
    ﾄ: 'ト',
    ﾅ: 'ナ',
    ﾆ: 'ニ',
    ﾇ: 'ヌ',
    ﾈ: 'ネ',
    ﾉ: 'ノ',
    ﾊ: 'ハ',
    ﾋ: 'ヒ',
    ﾌ: 'フ',
    ﾍ: 'ヘ',
    ﾎ: 'ホ',
    ﾏ: 'マ',
    ﾐ: 'ミ',
    ﾑ: 'ム',
    ﾒ: 'メ',
    ﾓ: 'モ',
    ﾔ: 'ヤ',
    ﾕ: 'ユ',
    ﾖ: 'ヨ',
    ﾗ: 'ラ',
    ﾘ: 'リ',
    ﾙ: 'ル',
    ﾚ: 'レ',
    ﾛ: 'ロ',
    ﾜ: 'ワ',
    ｦ: 'ヲ',
    ﾝ: 'ン',
    ｧ: 'ァ',
    ｨ: 'ィ',
    ｩ: 'ゥ',
    ｪ: 'ェ',
    ｫ: 'ォ',
    ｯ: 'ッ',
    ｬ: 'ャ',
    ｭ: 'ュ',
    ｮ: 'ョ',
    ﾞ: '゛',
    ﾟ: '゜',
    ' ': '　',
  },
  turbidity_kana: {
    'カ゛': 'ガ',
    'キ゛': 'ギ',
    'ク゛': 'グ',
    'ケ゛': 'ゲ',
    'コ゛': 'ゴ',
    'サ゛': 'ザ',
    'シ゛': 'ジ',
    'ス゛': 'ズ',
    'セ゛': 'ゼ',
    'ソ゛': 'ゾ',
    'タ゛': 'ダ',
    'チ゛': 'ヂ',
    'ツ゛': 'ヅ',
    'テ゛': 'デ',
    'ト゛': 'ド',
    'ハ゛': 'バ',
    'ヒ゛': 'ビ',
    'フ゛': 'ブ',
    'ヘ゛': 'ベ',
    'ホ゛': 'ボ',
    'ハ゜': 'パ',
    'ヒ゜': 'ピ',
    'フ゜': 'プ',
    'ヘ゜': 'ペ',
    'ホ゜': 'ポ',
    'ウ゛': 'ヴ',
    'ワ゛': 'ヷ',
    'ヲ゛': 'ヺ',
  },
};

// 公開（kintone側でグローバル参照される可能性のあるシンボルを window に露出）
if (typeof window !== 'undefined') {
  window.convert_to_hiragana = convert_to_hiragana;
  window.convert_to_double_byte_characters = convert_to_double_byte_characters;
  window.convert_to_email_address = convert_to_email_address;
  window.check_single_byte_numbers = check_single_byte_numbers;
  window.check_single_byte_kana = check_single_byte_kana;
  window.assertEmailAddress = assertEmailAddress;
}
/**
 * イテラブルな文字列集合から正規表現パターンを構築する関数
 * @param {Iterable<string>} keys イテラブルな文字列集合
 * @returns {RegExp} 正規表現のパターン
 */
const _ch_buildPattern = (keys) => {
  if (!keys) throw new Error('keys is required');
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!(keys && typeof keys[Symbol.iterator] === 'function'))
    throw new Error('keys must be an Iterable');
  const escapedKeys = [...keys].map(escapeRegExp);
  return new RegExp(escapedKeys.join('|'), 'g');
};
/**
 * 半角カタカナ変換用のマップを作成する
 */
const _ch_halfWidthKanaMap = new Map(Object.entries(_ch_convert_character_list.half_width_kana));
/**
 * 全角カタカナ変換用のマップを作成する
 */
const _ch_full_width_kana_map = new Map(Object.entries(_ch_convert_character_list.full_width_kana));
/**
 * 濁点・半濁点変換用のマップを作成する
 */
const _ch_turbidity_kana_map = new Map(Object.entries(_ch_convert_character_list.turbidity_kana));
/**
 * 文字列を正規表現で表記されたパターンに一致した場合、マップにある文字列に置き換える処理をする関数
 * @param {string} str 変換対象の文字列
 * @param {RegExp} pattern 正規表現のパターン
 * @param {Map} map 置き換えマップ
 * @returns {string} 置き換え後の文字列
 */
const _ch_replace_with_map = (str, pattern, map) => {
  if (!_ch_checkString(str))
    throw new Error(`_ch_replace_with_mapの[${str}]は文字である必要があります`);
  if (!(pattern instanceof RegExp)) throw new Error('pattern must be a RegExp');
  if (!(map instanceof Map)) throw new Error('map must be a Map');
  return str.replace(pattern, (char) => map.get(char) ?? char);
};

/**
 * 文字列の中の各文字を半角カタカナに変換する関数
 * @param {string} str 変換対象の文字列
 * @returns {string} 可能な限り半角カタカナに変換した文字列
 */
const convert_to_half_width_kana = (str = '') => {
  if (!_ch_checkString(str)) return '';
  const half_width_kana_pattern = _ch_buildPattern(_ch_halfWidthKanaMap.keys());
  return _ch_replace_with_map(str, half_width_kana_pattern, _ch_halfWidthKanaMap);
};

/**
 * 文字列の中の各文字を全角カタカナに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} hiragana_sw ひらがな変換の可否を選択するスイッチ（trueで変換、falseで不変換）
 * @returns {string} 可能な限り全角カタカナに変換した文字列
 */
const convert_to_full_width_kana = (str = '', hiragana_sw = true) => {
  if (!_ch_checkString(str)) return '';
  if (typeof hiragana_sw !== 'boolean') return '';
  const hiraganaToKatakana = (str) => {
    return str.replace(/[\u3041-\u3096]/g, (char) =>
      String.fromCodePoint(char.charCodeAt(0) + 0x60)
    );
  };
  const full_width_kana_pattern = _ch_buildPattern(_ch_full_width_kana_map.keys());
  const turbidity_kana_pattern = _ch_buildPattern(_ch_turbidity_kana_map.keys());
  let result = hiragana_sw ? hiraganaToKatakana(str) : str;
  result = _ch_replace_with_map(result, full_width_kana_pattern, _ch_full_width_kana_map);
  result = _ch_replace_with_map(result, turbidity_kana_pattern, _ch_turbidity_kana_map);
  return result;
};

/**
 * 文字列の中の各文字をひらがなに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} check ひらがな以外が含まれる場合はエラーを返すか選択するスイッチ（trueでエラーを返す、falseでエラーを返さない）
 * @returns {string} ひらがなに変換した文字列。エラー時は例外をスローします。
 */
const convert_to_hiragana = (str = '', check = false) => {
  if (!_ch_checkString(str)) return '';
  if (typeof check !== 'boolean') return '';
  if (!str) return '';
  const katakanaToHiragana = (str) => {
    return str.replace(/[\u30A1-\u30F6]/g, (char) =>
      String.fromCodePoint(char.charCodeAt(0) - 0x60)
    );
  };
  const full_width_kana = convert_to_full_width_kana(str);
  const hiragana = katakanaToHiragana(full_width_kana);
  if (check) {
    const allow_symbol = ['ー', '・', 'ゝ', 'ゞ', '゛', '゜', '　'];
    const hiragana_check = [...hiragana].every(
      (char) => (char >= 'ぁ' && char <= 'ん') || allow_symbol.includes(char)
    );
    if (!hiragana_check) {
      throw new Error('ひらがな以外の文字が含まれています');
    }
  }
  return hiragana;
};

/**
 * 文字列の中の各文字を半角文字（英数字・記号・スペース含む）に変換する関数
 * @param {string} str 変換対象の文字列
 * @returns {string} 半角文字に変換した文字列
 */
const convert_to_single_byte_characters = (str = '') => {
  if (!_ch_checkString(str)) return '';
  if (!str) return '';
  const hyphen_processed = str.replace(/[－‐‑–—−ー―]/g, '-');
  const half_width_kana = convert_to_half_width_kana(hyphen_processed);
  const single_byte_characters = [...half_width_kana]
    .map((char) => {
      const code = char.charCodeAt(0);
      if (
        code >= 0xff01 &&
        code <= 0xff5e // 全角記号・英数字
      ) {
        return String.fromCodePoint(code - 0xfee0);
      }
      if (char === '\u3000') return ' '; // 全角スペースを半角に
      return char;
    })
    .join('');
  return single_byte_characters;
};

/**
 * 文字列の中の各文字を全角文字（英数字・記号・スペース含む）に変換する関数
 * @param {string} str 変換対象の文字列
 * @returns {string} 全角文字に変換した文字列
 */
const convert_to_double_byte_characters = (str = '') => {
  if (!_ch_checkString(str)) return '';
  if (!str) return '';
  const hyphen_processed = str.replace(/[‐‑–—−ー―]/g, '－');
  const full_width_kana = convert_to_full_width_kana(hyphen_processed, false);
  const double_byte_characters = [...full_width_kana]
    .map((char) => {
      if (char === '\\') return '￥'; // 半角バックスラッシュを全角円マークに
      if (char === ' ') return '\u3000'; // 半角スペースを全角に
      const code = char.charCodeAt(0);
      if (
        (code >= 0x21 && code <= 0x7e) || // 半角記号・英数字
        (code >= 0x30 && code <= 0x39) || // 数字
        (code >= 0x41 && code <= 0x5a) || // 英大文字
        (code >= 0x61 && code <= 0x7a) // 英小文字
      ) {
        return String.fromCodePoint(code + 0xfee0);
      }
      return char;
    })
    .join('');
  return double_byte_characters;

  // 公開
  if (typeof window !== 'undefined') {
    window.convert_to_hiragana = convert_to_hiragana;
    window.convert_to_double_byte_characters = convert_to_double_byte_characters;
    window.convert_to_email_address = convert_to_email_address;
    window.check_single_byte_numbers = check_single_byte_numbers;
  }
};

/**
 * メールアドレスの表記を半角文字に変換した上で、RFC 5322に基づいた形式であるかを簡易判定する関数
 * @param {string} email_address メールアドレスとして変換対象の文字列
 * @returns {string} メールアドレス文字（メールアドレスとして正しくない場合は空白を返す）
 */
const convert_to_email_address = (email_address = '') => {
  if (!_ch_checkString(email_address)) return '';
  if (!email_address) return '';
  // 前後空白除去
  const trimmed = email_address.trim();
  const single_byte_characters = convert_to_single_byte_characters(trimmed);
  // 連続ドットや@直前・直後のドット禁止
  if (/\.\.|^\.|\.@|@\.|\.$/.test(single_byte_characters)) return '';
  const email_pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return email_pattern.test(single_byte_characters) ? single_byte_characters : '';
};

/**
 * 文字列が半角数字のみ含まれるかをチェックする関数
 * @param {*} str チェック対象の文字列
 * @returns {boolean} 半角数字のみ含まれる場合はtrue、それ以外はfalse
 */
const check_single_byte_numbers = (str = '') => {
  if ((typeof str !== 'string' && typeof str !== 'number') || str === null || str === undefined)
    return false;
  const number_pattern = /^[0-9]+$/;
  return number_pattern.test(String(str));
};

/**
 * 文字列が半角カナ文字のみ含まれるかをチェックする関数
 * @param {string} str チェック対象の文字列
 * @returns {boolean} 半角カナ文字のみ含まれる場合はtrue、それ以外はfalse
 */
const check_single_byte_kana = (str = '') => {
  if (!_ch_checkString(str)) return false;
  const kana_pattern = /^[\uFF61-\uFF9F]+$/;
  return kana_pattern.test(str);
};

/**
 * 文字列の中の各文字を半角カタカナに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能な文字があった場合にエラーを投げるかどうか
 * @returns {string} 可能な限り半角カタカナに変換した文字列
 * @throws {Error} 変換不能な文字が含まれている場合（throwOnError=true時）
 */
const toHalfWidthKana = (str = '', throwOnError = true) => {
  if (!_ch_checkString(str)) throw new Error('変換対象は文字列である必要があります');
  if (!str) throw new Error('変換対象の文字列が空です');
  const halfWidthKanaPattern = _ch_buildPattern(_ch_halfWidthKanaMap.keys());
  let errorChar = null;
  const result = str.replace(
    halfWidthKanaPattern,
    (char) => _ch_halfWidthKanaMap.get(char) ?? char
  );
  // 変換後に全角カタカナ・ひらがな・漢字・その他全角文字が残っていればエラー
  for (const char of result) {
    const code = char.charCodeAt(0);
    if (
      (code >= 0x4e00 && code <= 0x9fff) || // 漢字
      (code >= 0x3040 && code <= 0x309f) || // ひらがな
      (code >= 0x30a0 && code <= 0x30ff) || // カタカナ
      (code >= 0xff00 && code <= 0xffef) // その他全角
    ) {
      if (throwOnError) {
        errorChar = char;
        break;
      }
    }
  }
  if (errorChar) throw new Error(`変換不能な文字が含まれています: ${errorChar}`);
  return result;
};

/**
 * 文字列の中の各文字を半角文字（英数字・記号・スペース含む）に変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能な文字があった場合にエラーを投げるかどうか
 * @returns {string} 半角文字に変換した文字列
 * @throws {Error} 変換不能な文字が含まれている場合（throwOnError=true時）
 */
const toHalfWidth = (str = '', throwOnError = true) => {
  if (!_ch_checkString(str)) throw new Error('変換対象は文字列である必要があります');
  if (!str) throw new Error('変換対象の文字列が空です');
  const hyphenProcessed = str.replace(/[－‐‑–—−ー―]/g, '-');
  try {
    const halfWidthKana = toHalfWidthKana(hyphenProcessed, false);
    let errorChar = null;
    const singleByteCharacters = [...halfWidthKana]
      .map((char) => {
        const code = char.charCodeAt(0);
        // 半角英数字・記号・スペース・カナ以外は変換不能とみなす
        if (
          code >= 0xff01 &&
          code <= 0xff5e // 全角記号・英数字
        ) {
          return String.fromCodePoint(code - 0xfee0);
        }
        if (char === '\u3000') return ' '; // 全角スペースを半角に
        // 変換後が全角カナ・ひらがな・漢字・その他全角文字の場合はエラーまたはそのまま
        if (
          (code >= 0x4e00 && code <= 0x9fff) || // 漢字
          (code >= 0x3040 && code <= 0x309f) || // ひらがな
          (code >= 0x30a0 && code <= 0x30ff) || // カタカナ
          (code >= 0xff00 && code <= 0xffef) // その他全角
        ) {
          if (throwOnError) errorChar = char;
          // throwOnError=falseならそのまま返す
        }
        return char;
      })
      .join('');
    if (errorChar) throw new Error(`変換不能な文字が含まれています: ${errorChar}`);
    return singleByteCharacters;
  } catch (error) {
    throw new Error(error.message);
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
  if (!_ch_checkString(emailAddress)) throw new Error('メールアドレスは文字列である必要があります');
  if (!emailAddress) throw new Error('メールアドレスが空です');
  const trimmed = emailAddress.trim();
  try {
    const singleByteCharacters = toHalfWidth(trimmed);
    if (/\.\.|^\.|\.@|@\.|\.$/.test(singleByteCharacters))
      throw new Error('メールアドレスは連続ドットや@直前・直後のドットを含めることはできません');
    if (!emailPattern.test(singleByteCharacters))
      throw new Error('メールアドレスの形式が正しくありません');
    return singleByteCharacters;
  } catch (error) {
    const _error = error;
    throw new Error(
      `メールアドレスの形式が正しくありません: ${_error && _error.message ? _error.message : ''}`
    );
  }
};
