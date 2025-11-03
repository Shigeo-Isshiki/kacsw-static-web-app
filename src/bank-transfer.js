// bank-transfer.js
// 単一ファイルで提供する銀行振込ユーティリティ（kintone向け、callback専用）
// 公開 API (window.KACSW.bankTransfer):
//  - getBank(input, callback)       // ※コールバック必須（同期返却は廃止）
//                                     // 銀行コード or 銀行名を自動判定して非同期で返す
//                                     // 戻り値の kana は半角カナに変換され、長音記号類は '-' に正規化されます
//  - getBranch(bankCode, branch)    // 支店コード or 支店名で支店を返す
//  - convertYucho(kigou, bangou)    // ゆうちょ記号/番号を全銀向け口座情報に変換（簡易）
//  - generateZenginTransfer(records) // 簡易CSV形式の振込データ生成
//  - loadBankByCode(bankCode, options?, callback) // BankKunスタイルの単一銀行取得（callbackのみ）
//  - loadBankDataFromBankKun(apiBaseUrl, options?, callback) // 全件取得系（callbackのみ、オプションでパス調整可）

// --- 内部キャッシュ（プレフィックス _bt_ ）
const _bt_BANKS = [
  { code: '0001', name: 'みずほ銀行', kana: 'ミズホギンコウ' },
  { code: '0005', name: '三菱UFJ銀行', kana: 'ミツビシUFJギンコウ' },
  { code: '0009', name: '三井住友銀行', kana: 'ミツイスミトモギンコウ' },
  { code: '9900', name: 'ゆうちょ銀行', kana: 'ユウチョギンコウ' },
];

const _bt_BRANCHES = {
  '0001': [
    { branchCode: '001', name: '本店営業部', kana: 'ホンテンエイギョウブ' },
    { branchCode: '002', name: '渋谷支店', kana: 'シブヤシテン' },
  ],
  9900: [{ branchCode: '001', name: 'ゆうちょ本店', kana: 'ユウチョホンテン' }],
};

/**
 * 変換用の文字リスト
 * 各種文字の変換ルールを定義します。
 * ひらがな、カタカナ、濁点・半濁点の変換をサポートします。
 * @typedef {object} _TS_CONVERT_CHARACTER_LIST
 * @property {object} halfWidthKana 全角カタカナから半角カタカナへの変換マップ
 * @property {object} fullWidthKana 半角カタカナから全角カタカナへの変換マップ
 * @property {object} turbidityKana 濁点・半濁点の変換マップ
 */
/** @type {_BT_CONVERT_CHARACTER_LIST} */
const _BT_CONVERT_CHARACTER_LIST = {
  halfWidthKana: {
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
  fullWidthKana: {
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
  turbidityKana: {
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
// 全角カタカナから半角カタカナへの変換テーブルから生成するマップ（各種変換処理で利用）
const _BT_HALF_WIDTH_KANA_MAP = new Map(Object.entries(_BT_CONVERT_CHARACTER_LIST.halfWidthKana));
// 半角カタカナから全角カタカナへの変換テーブルから生成するマップ（各種変換処理で利用）
const _BT_FULL_WIDTH_KANA_MAP = new Map(Object.entries(_BT_CONVERT_CHARACTER_LIST.fullWidthKana));
// 濁点・半濁点の変換テーブルから生成するマップ（各種変換処理で利用）
const _BT_TURBIDITY_KANA_MAP = new Map(Object.entries(_BT_CONVERT_CHARACTER_LIST.turbidityKana));

// 内部ユーティリティ
const _bt_toStr = (v) => (v == null ? '' : String(v));

// 安全なログ貯め: kintone 等で console が捕まらない場合に備えて
const _bt_safeLog = (msg) => {
  try {
    if (typeof window !== 'undefined') {
      window.KACSW = window.KACSW || {};
      window.KACSW._bt_debugLogs = window.KACSW._bt_debugLogs || [];
      window.KACSW._bt_debugLogs.push(String(msg));
    }
  } catch (e) {}
  try {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug(msg);
  } catch (e) {}
};

/**
 * 文字列が文字列型であることを確認する関数
 * @param {*} str 確認する文字列
 * @returns {boolean} 文字列である = true、文字でない = false
 */
const _bt_checkString = (str) => {
  return typeof str === 'string';
};

/**
 * boolean型であることを確認する関数
 * @param {*} val 確認する値
 * @returns {boolean} boolean型である = true、そうでない = false
 */
const _bt_checkBoolean = (val) => {
  return typeof val === 'boolean';
};

// callback 呼び出しの互換ヘルパ
// - cb に宣言引数が 2 個以上ある場合は (err, res) シグネチャで呼ぶ
// - そうでない場合は zip-code utils と同様に single-arg result を渡す
const _bt_invokeCallback = (cb, err, res) => {
  try {
    if (typeof cb !== 'function') return;
    if ((cb && typeof cb.length === 'number' && cb.length >= 2) || false) {
      // Node 風
      cb(err || null, res || null);
    } else {
      // single-arg スタイル（成功時はオブジェクト、失敗時は { error: '...' }）
      if (err) {
        // err は { success:false, error: '...' } 形式で来る想定
        const out =
          err && err.error
            ? { error: err.error }
            : { error: err && err.message ? err.message : String(err) };
        cb(out);
      } else if (res) {
        // res は { success:true, bank } 形式のことが多い -> zip-style の期待に合わせて bank オブジェクトを返す
        if (res && res.bank) cb(res.bank);
        else cb(res);
      } else {
        cb(null);
      }
    }
  } catch (e) {
    try {
      _bt_safeLog(
        '[KACSW.bankTransfer] _bt_invokeCallback error: ' + (e && e.message ? e.message : e)
      );
    } catch (e2) {}
  }
};

/**
 * イテラブルな文字列集合から正規表現パターンを構築する関数
 * @param {Iterable<string>} keys イテラブルな文字列集合
 * @returns {RegExp} 正規表現のパターン
 */
const _bt_buildPattern = (keys) => {
  try {
    if (!keys) {
      _bt_safeLog('[KACSW.bankTransfer] _bt_buildPattern: keys is required');
      return /(?:)/g;
    }
    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!(keys && typeof keys[Symbol.iterator] === 'function')) {
      _bt_safeLog('[KACSW.bankTransfer] _bt_buildPattern: keys must be an Iterable');
      return /(?:)/g;
    }
    const escapedKeys = [...keys].map(escapeRegExp);
    return new RegExp(escapedKeys.join('|'), 'g');
  } catch (e) {
    try {
      _bt_safeLog(
        '[KACSW.bankTransfer] _bt_buildPattern error: ' + (e && e.message ? e.message : e)
      );
    } catch (e2) {}
    return /(?:)/g;
  }
};

/**
 * 文字列を全角カタカナに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能な文字があった場合にエラーを投げるかどうか
 * @returns {string} 可能な限り全角カタカナに変換した文字列
 * @throws {Error} 変換不能な文字が含まれている場合（throwOnError=true時）
 */
const _bt_toFullWidthKatakana = (str = '', throwOnError = true) => {
  try {
    if (!_bt_checkString(str)) {
      _bt_safeLog('[KACSW.bankTransfer] _bt_toFullWidthKatakana: input is not a string');
      return str;
    }
    if (!_bt_checkBoolean(throwOnError)) {
      _bt_safeLog('[KACSW.bankTransfer] _bt_toFullWidthKatakana: throwOnError is not boolean');
      return str;
    }
    if (!str) {
      _bt_safeLog('[KACSW.bankTransfer] _bt_toFullWidthKatakana: input string is empty');
      return str;
    }
    const fullWidthKanaPattern = _bt_buildPattern(_BT_FULL_WIDTH_KANA_MAP.keys());
    const turbidityKanaPattern = _bt_buildPattern(_BT_TURBIDITY_KANA_MAP.keys());
    let errorChar = null;
    // ひらがな→全角カタカナ
    let work = str.replace(/[\u3041-\u3096]/g, (char) =>
      String.fromCodePoint(char.charCodeAt(0) + 0x60)
    );
    // 半角カタカナ→全角カタカナ
    work = work.replace(fullWidthKanaPattern, (char) => _BT_FULL_WIDTH_KANA_MAP.get(char) ?? char);
    // 合成濁点・半濁点（カ゛→ガ等）を変換
    work = work.replace(turbidityKanaPattern, (pair) => _BT_TURBIDITY_KANA_MAP.get(pair) ?? pair);
    // 変換後に全角カタカナ以外が含まれていればエラー（ただし変換テーブルの値は許容）
    const allowedValues = Object.values(_BT_CONVERT_CHARACTER_LIST.fullWidthKana);
    for (const char of work) {
      const code = char.charCodeAt(0);
      // allowedValuesに含まれるか、全角カタカナ範囲なら許容
      if (!allowedValues.includes(char) && !(code >= 0x30a1 && code <= 0x30fa)) {
        if (throwOnError) {
          errorChar = char;
          break;
        }
      }
    }
    if (errorChar) {
      _bt_safeLog('[KACSW.bankTransfer] _bt_toFullWidthKatakana: invalid char ' + errorChar);
      return str;
    }
    return work;
  } catch (e) {
    // DevTools の "pause on exceptions" による停止を避けるため、同期的な throw は
    // キャッチして入力文字列を返す。（副作用が心配な場合は個別に見直し可）
    try {
      if (typeof console !== 'undefined' && typeof console.warn === 'function')
        console.warn(
          '[KACSW.bankTransfer] _bt_toFullWidthKatakana fallback on error',
          e && e.message ? e.message : e
        );
    } catch (e2) {}
    return str;
  }
};

/**
 * 文字列を半角カタカナに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能な文字があった場合にエラーを投げるかどうか
 * @returns {string} 可能な限り半角カタカナに変換した文字列
 * @throws {Error} 変換不能な文字が含まれている場合（throwOnError=true時）
 */
const _bt_toHalfWidthKana = (str = '', throwOnError = true) => {
  try {
    if (!_bt_checkString(str)) {
      _bt_safeLog('[KACSW.bankTransfer] _bt_toHalfWidthKana: input is not a string');
      return str;
    }
    if (!_bt_checkBoolean(throwOnError)) {
      _bt_safeLog('[KACSW.bankTransfer] _bt_toHalfWidthKana: throwOnError is not boolean');
      return str;
    }
    if (!str) {
      _bt_safeLog('[KACSW.bankTransfer] _bt_toHalfWidthKana: input string is empty');
      return str;
    }
    // ひらがな→カタカナ変換を追加
    const katakanaStr = _bt_toFullWidthKatakana(str, false);
    // 全角英数字（例: ＵＦＪ）を半角に変換して英字は大文字化する。
    // これにより、例えば 'ミツビシＵＦＪギンコウ' の 'ＵＦＪ' が 'UFJ' になる。
    let asciiNormalized = katakanaStr.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    );
    // 英小文字が混じる場合は大文字化（銀行名の表記揺れ防止）
    asciiNormalized = asciiNormalized.replace(/[a-z]/g, (c) => c.toUpperCase());
    const halfWidthKanaPattern = _bt_buildPattern(_BT_HALF_WIDTH_KANA_MAP.keys());
    let errorChar = null;
    let result = asciiNormalized.replace(
      halfWidthKanaPattern,
      (char) => _BT_HALF_WIDTH_KANA_MAP.get(char) ?? char
    );
    // 長音記号や類似文字をすべて半角ハイフンに正規化
    // 対象: 全角カタカナ長音 'ー' (U+30FC), 全角ハイフンマイナス '－' (U+FF0D),
    // 半角長音 'ｰ' と各種ダッシュ類
    result = result.replace(/[ー－ｰ‐−–—―─━]/g, '-');
    // 変換後に半角カタカナ以外が含まれていればエラー（ただし変換テーブルの値は許容）
    const allowedValues = Object.values(_BT_CONVERT_CHARACTER_LIST.halfWidthKana).concat('-');
    for (const char of result) {
      if (!allowedValues.includes(char)) {
        if (throwOnError) {
          errorChar = char;
          break;
        }
      }
    }
    if (errorChar) {
      _bt_safeLog('[KACSW.bankTransfer] _bt_toHalfWidthKana: invalid char ' + errorChar);
      return str;
    }
    return result;
  } catch (e) {
    try {
      if (typeof console !== 'undefined' && typeof console.warn === 'function')
        console.warn(
          '[KACSW.bankTransfer] _bt_toHalfWidthKana fallback on error',
          e && e.message ? e.message : e
        );
    } catch (e2) {}
    return str;
  }
};

// -------------------------
// 公開: BankKun 単一銀行取得（/banks/{code}.json） callback-only
// - loadBankByCode('0001', options?, callback)
// - callback(err, result)  result: { success:true, bank } or error
// -------------------------
// internal: _bt_loadBankByCode - not exposed to window.KACSW
const _bt_loadBankByCode = (bankCode, options = {}, callback) => {
  try {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    const {
      apiBaseUrl = 'https://bank.teraren.com',
      apiKey,
      timeout = 5000,
      pathTemplate = '/banks/{code}.json',
    } = options;
    const code = _bt_toStr(bankCode).padStart(4, '0');
    const base = apiBaseUrl.replace(/\/$/, '');
    const path = pathTemplate.replace('{code}', code);
    const url = base + path;
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    _bt_safeLog('[KACSW.bankTransfer] _bt_loadBankByCode: enter');
    const abortController = (function () {
      try {
        if (typeof console !== 'undefined' && typeof console.debug === 'function')
          console.debug(
            '[KACSW.bankTransfer] _bt_loadBankByCode: attempting to create AbortController'
          );
        return typeof AbortController !== 'undefined' ? new AbortController() : null;
      } catch (e) {
        try {
          if (typeof console !== 'undefined' && typeof console.warn === 'function')
            console.warn(
              '[KACSW.bankTransfer] _bt_loadBankByCode: AbortController ctor threw',
              e && e.message ? e.message : e
            );
        } catch (e2) {}
        return null;
      }
    })();
    let timer = null;
    try {
      if (abortController && typeof abortController.abort === 'function') {
        if (typeof console !== 'undefined' && typeof console.debug === 'function')
          console.debug('[KACSW.bankTransfer] _bt_loadBankByCode: scheduling abort timer', timeout);
        _bt_safeLog('[KACSW.bankTransfer] _bt_loadBankByCode: scheduling abort timer ' + timeout);
        timer = setTimeout(() => {
          try {
            if (typeof console !== 'undefined' && typeof console.warn === 'function')
              console.warn('[KACSW.bankTransfer] _bt_loadBankByCode: abort timer fired');
            _bt_safeLog('[KACSW.bankTransfer] _bt_loadBankByCode: abort timer fired');
            abortController.abort();
          } catch (e) {
            try {
              if (typeof console !== 'undefined' && typeof console.warn === 'function')
                console.warn(
                  '[KACSW.bankTransfer] _bt_loadBankByCode: abort failed',
                  e && e.message ? e.message : e
                );
            } catch (e2) {}
          }
        }, timeout);
      }
    } catch (e) {
      timer = null;
    }

    // fetch に signal を渡すと一部環境で同期的に例外が出ることがあるため、
    // まず signal を渡して試行し、同期例外が出たら signal を除いて再試行する
    const _bt_performFetch = (fetchPromise) => {
      try {
        return fetchPromise
          .then((res) => {
            if (!res.ok) {
              return Promise.reject(
                new Error(`銀行情報の取得に失敗しました（HTTPステータス: ${res.status}）`)
              );
            }
            return res.json();
          })
          .then((j) => {
            let bankObj = {
              code: _bt_toStr(j.code).padStart(4, '0'),
              name: _bt_toStr(j.normalize && j.normalize.name ? j.normalize.name : j.name),
              kana: _bt_toStr(j.normalize && j.normalize.kana ? j.normalize.kana : j.kana),
              url: _bt_toStr(j.url || url),
              branches_url: _bt_toStr(j.branches_url || base + `/banks/${code}/branches.json`),
            };
            // API からの kana を可能な限り半角カナ化＋全角英数字は半角化して大文字化
            try {
              bankObj.kana = _bt_toHalfWidthKana(bankObj.kana, false);
            } catch (e) {}
            let idx = _bt_BANKS.findIndex((b) => {
              return b.code === bankObj.code;
            });
            if (idx >= 0) _bt_BANKS[idx] = bankObj;
            else _bt_BANKS.push(bankObj);
            try {
              _bt_safeLog('[KACSW.bankTransfer] _bt_loadBankByCode: fetch success ' + bankObj.code);
            } catch (e) {}
            if (typeof callback === 'function') callback(bankObj);
          })
          .catch((err) => {
            let message = null;
            try {
              if (err && err.name === 'AbortError') {
                message = '取得がタイムアウトしました（指定時間内に応答がありません）';
              } else if (err && err.message) {
                // ブラウザの fetch が失敗すると 'Failed to fetch' や TypeError になることがある
                var m = String(err.message || err);
                if (/failed to fetch/i.test(m) || /network/i.test(m) || err instanceof TypeError) {
                  message =
                    '銀行情報の取得に失敗しました。ネットワークまたは外部サービスの問題が考えられます。接続を確認してください。';
                } else {
                  message = m;
                }
              } else {
                message = '銀行情報の取得中に不明なエラーが発生しました';
              }
            } catch (e2) {
              message = '銀行情報の取得中にエラーが発生しました';
            }
            let e = { error: message };
            if (typeof callback === 'function') callback(e);
          })
          .finally(() => {
            if (timer) clearTimeout(timer);
          });
      } catch (syncErr) {
        // 同期例外が発生した場合はコールバックで返す
        let se = { error: syncErr && syncErr.message ? syncErr.message : String(syncErr) };
        if (typeof callback === 'function') callback(se);
      }
    };

    try {
      // signal を渡して試行
      try {
        if (typeof console !== 'undefined' && typeof console.debug === 'function')
          console.debug(
            '[KACSW.bankTransfer] _bt_loadBankByCode: attempting fetch with signal',
            url
          );
      } catch (e) {}
      _bt_safeLog('[KACSW.bankTransfer] _bt_loadBankByCode: attempting fetch with signal ' + url);
      _bt_performFetch(
        fetch(url, { headers, signal: abortController ? abortController.signal : undefined })
      );
    } catch (e) {
      // 一部環境では fetch に signal を渡すと同期例外が発生することがあるため、
      // signal を除いて再試行する
      try {
        try {
          if (typeof console !== 'undefined' && typeof console.warn === 'function')
            console.warn(
              '[KACSW.bankTransfer] _bt_loadBankByCode: fetch with signal threw sync exception, retrying without signal',
              e && e.message ? e.message : e
            );
        } catch (e3) {}
        _bt_safeLog(
          '[KACSW.bankTransfer] _bt_loadBankByCode: fetch with signal threw sync exception, retrying without signal ' +
            (e && e.message ? e.message : e)
        );
        if (typeof console !== 'undefined' && typeof console.debug === 'function')
          console.debug(
            '[KACSW.bankTransfer] _bt_loadBankByCode: attempting fetch without signal',
            url
          );
        _bt_safeLog(
          '[KACSW.bankTransfer] _bt_loadBankByCode: attempting fetch without signal ' + url
        );
        _bt_performFetch(fetch(url, { headers }));
      } catch (e2) {
        // 最悪同期的に fetch が失敗する場合はエラーハンドリングへ送る
        try {
          if (typeof console !== 'undefined' && typeof console.error === 'function')
            console.error(
              '[KACSW.bankTransfer] _bt_loadBankByCode: fetch without signal also threw',
              e2 && e2.message ? e2.message : e2
            );
        } catch (e4) {}
        _bt_safeLog(
          '[KACSW.bankTransfer] _bt_loadBankByCode: fetch without signal also threw ' +
            (e2 && e2.message ? e2.message : e2)
        );
        const err = { success: false, error: e2 && e2.message ? e2.message : String(e2) };
        if (typeof callback === 'function') callback(err, null);
        if (timer) clearTimeout(timer);
      }
    }
  } catch (topErr) {
    try {
      if (typeof console !== 'undefined' && typeof console.error === 'function')
        console.error(
          '[KACSW.bankTransfer] _bt_loadBankByCode: top-level sync error',
          topErr && topErr.message ? topErr.message : topErr
        );
    } catch (e) {}
    if (typeof callback === 'function')
      callback(
        { success: false, error: topErr && topErr.message ? topErr.message : String(topErr) },
        null
      );
  }
};

// -------------------------
// internal: 銀行名で検索（BankKun の search API を使う）
// URL: {apiBaseUrl}/banks/search.json?name={bank_name}
// レスポンスは配列。複数件の場合は完全一致を探し、それが1件あればそれを採用。
// それでも複数 or 完全一致なしの場合はエラーを返す。
// callback(err, { success:true, bank }) または callback({ success:false, error }, null)
// -------------------------
const _bt_searchBankByName = (name, options = {}, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const { apiBaseUrl = 'https://bank.teraren.com', apiKey, timeout = 5000 } = options;
  const q = _bt_toStr(name).trim();
  if (!q) {
    if (typeof callback === 'function') callback({ success: false, error: '検索語が空です' }, null);
    return;
  }
  const base = apiBaseUrl.replace(/\/$/, '');
  const url = base + '/banks/search.json?name=' + encodeURIComponent(q);
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  if (abortController) timer = setTimeout(() => abortController.abort(), timeout);

  fetch(url, { headers, signal: abortController ? abortController.signal : undefined })
    .then((res) => {
      if (!res.ok)
        return Promise.reject(
          new Error(`銀行名検索の実行に失敗しました（HTTPステータス: ${res.status}）`)
        );
      return res.json();
    })
    .then((arr) => {
      if (!Array.isArray(arr)) return Promise.reject(new Error('検索結果の形式が不正です'));
      if (arr.length === 0) {
        if (typeof callback === 'function')
          callback({ success: false, error: '該当する銀行が見つかりませんでした' }, null);
        return;
      }
      // 単一結果はそのまま採用
      if (arr.length === 1) {
        const j = arr[0];
        const bankObj = {
          code: _bt_toStr(j.code).padStart(4, '0'),
          name: _bt_toStr(j.normalize && j.normalize.name ? j.normalize.name : j.name),
          kana: _bt_toStr(j.normalize && j.normalize.kana ? j.normalize.kana : j.kana),
          url: _bt_toStr(j.url || url),
          branches_url: _bt_toStr(
            j.branches_url || base + `/banks/${_bt_toStr(j.code).padStart(4, '0')}/branches.json`
          ),
        };
        try {
          bankObj.kana = _bt_toHalfWidthKana(bankObj.kana, false);
        } catch (e) {}
        const idx = _bt_BANKS.findIndex((b) => b.code === bankObj.code);
        if (idx >= 0) _bt_BANKS[idx] = bankObj;
        else _bt_BANKS.push(bankObj);
        try {
          _bt_safeLog('[KACSW.bankTransfer] _bt_searchBankByName: success ' + bankObj.code);
        } catch (e) {}
        if (typeof callback === 'function') callback(null, { success: true, bank: bankObj });
        return;
      }
      // 複数件: 完全一致を探す（normalize.name / name の両方をチェック）
      const exact = arr.filter((j) => {
        const n1 = _bt_toStr(j.normalize && j.normalize.name ? j.normalize.name : j.name).trim();
        const n2 = _bt_toStr(j.name).trim();
        return n1 === q || n2 === q;
      });
      if (exact.length === 1) {
        const j = exact[0];
        const bankObj = {
          code: _bt_toStr(j.code).padStart(4, '0'),
          name: _bt_toStr(j.normalize && j.normalize.name ? j.normalize.name : j.name),
          kana: _bt_toStr(j.normalize && j.normalize.kana ? j.normalize.kana : j.kana),
          url: _bt_toStr(j.url || url),
          branches_url: _bt_toStr(
            j.branches_url || base + `/banks/${_bt_toStr(j.code).padStart(4, '0')}/branches.json`
          ),
        };
        try {
          bankObj.kana = _bt_toHalfWidthKana(bankObj.kana, false);
        } catch (e) {}
        const idx = _bt_BANKS.findIndex((b) => b.code === bankObj.code);
        if (idx >= 0) _bt_BANKS[idx] = bankObj;
        else _bt_BANKS.push(bankObj);
        if (typeof callback === 'function') callback(null, { success: true, bank: bankObj });
        return;
      }
      if (exact.length > 1) {
        if (typeof callback === 'function')
          callback(
            {
              success: false,
              error: '検索結果が複数あります（完全一致の候補が複数見つかりました）',
            },
            null
          );
        return;
      }
      // 完全一致なし -> エラーとする（仕様）
      if (typeof callback === 'function')
        callback(
          { success: false, error: '検索結果が複数あります（完全一致する銀行名が見つかりません）' },
          null
        );
    })
    .catch((err) => {
      let message = null;
      try {
        if (err && err.name === 'AbortError')
          message = '検索がタイムアウトしました（指定時間内に応答がありません）';
        else if (err && err.message) {
          const m = String(err.message || err);
          if (/failed to fetch/i.test(m) || /network/i.test(m) || err instanceof TypeError) {
            message =
              '銀行名検索に失敗しました。ネットワークまたは外部サービスの問題が考えられます。接続を確認してください。';
          } else {
            message = m;
          }
        } else message = '銀行名検索中に不明なエラーが発生しました';
      } catch (e2) {
        message = '銀行名検索中にエラーが発生しました';
      }
      const e = { success: false, error: message };
      if (typeof callback === 'function') callback(e, null);
    })
    .finally(() => {
      if (timer) clearTimeout(timer);
    });
};

// -------------------------
// 公開: 銀行取得（自動判定）
// 入力が数字のみ（<=4桁）ならコード検索して単一オブジェクトまたは null を返す
// そうでなければ名前で部分一致検索して配列を返す
// -------------------------
// getBank: kintone 向け single-arg コールバック専用版
// 使い方: getBank('0138', (result) => { 成功: {code,name,kana} / 失敗: { error: '...' } })
const getBank = (input, callback) => {
  const s = _bt_toStr(input).trim();
  if (typeof callback !== 'function') {
    // 既存と同じくコールバック必須で早期返却（エラーオブジェクトを返す）
    return { success: false, error: '第二引数はコールバック関数である必要があります' };
  }
  if (!s) {
    // single-arg スタイルでエラーを返す
    _bt_invokeCallback(callback, { error: '検索語が空です' }, null);
    return;
  }

  const digitsOnly = /^[0-9]+$/.test(s);

  if (digitsOnly && s.length <= 4) {
    const key = s.padStart(4, '0');
    _bt_loadBankByCode(key, {}, function (/* flexible args from loader */) {
      // 内部ローダーが single-arg を返す場合
      if (arguments.length === 1) {
        const out = arguments[0];
        if (!out) {
          _bt_invokeCallback(callback, { error: '銀行情報の取得結果が空です' }, null);
          return;
        }
        if (out && out.error) {
          _bt_invokeCallback(callback, out, null);
          return;
        }
        // out が { success:true, bank } 形式の可能性にも対応
        const b = out && out.bank ? out.bank : out;
        let kanaOut = _bt_toStr(b.kana);
        try {
          kanaOut = _bt_toHalfWidthKana(kanaOut, false);
        } catch (e) {
          kanaOut = _bt_toStr(b.kana);
        }
        _bt_invokeCallback(callback, null, { code: b.code, name: b.name, kana: kanaOut });
        return;
      }
      // node-style (err, res) が来た場合の保険（可能なら使わない前提）
      const err = arguments[0];
      const res = arguments[1];
      if (err) {
        _bt_invokeCallback(
          callback,
          { error: err && err.error ? err.error : err && err.message ? err.message : String(err) },
          null
        );
        return;
      }
      if (!res) {
        _bt_invokeCallback(callback, { error: '銀行情報の取得結果が空です' }, null);
        return;
      }
      if (res && res.success === false) {
        _bt_invokeCallback(callback, { error: res.error || '取得エラー' }, null);
        return;
      }
      if (!res.bank) {
        _bt_invokeCallback(callback, { error: '銀行データがレスポンスに含まれていません' }, null);
        return;
      }
      const b = res.bank;
      let kanaOut = _bt_toStr(b.kana);
      try {
        kanaOut = _bt_toHalfWidthKana(kanaOut, false);
      } catch (e) {
        kanaOut = _bt_toStr(b.kana);
      }
      _bt_invokeCallback(callback, null, { code: b.code, name: b.name, kana: kanaOut });
      return;
    });
    return;
  }

  // 名前検索（非同期）
  _bt_searchBankByName(s, {}, function (/* flexible args from search */) {
    if (arguments.length === 1) {
      const out = arguments[0];
      if (!out) {
        _bt_invokeCallback(callback, { error: '検索結果が空です' }, null);
        return;
      }
      if (out && out.error) {
        _bt_invokeCallback(callback, out, null);
        return;
      }
      const b = out && out.bank ? out.bank : out;
      let kanaOut2 = _bt_toStr(b.kana);
      try {
        kanaOut2 = _bt_toHalfWidthKana(kanaOut2, false);
      } catch (e) {
        kanaOut2 = _bt_toStr(b.kana);
      }
      _bt_invokeCallback(callback, null, { code: b.code, name: b.name, kana: kanaOut2 });
      return;
    }
    const err = arguments[0];
    const res = arguments[1];
    if (err) {
      _bt_invokeCallback(
        callback,
        { error: err && err.error ? err.error : err && err.message ? err.message : String(err) },
        null
      );
      return;
    }
    if (!res || res.success === false) {
      _bt_invokeCallback(callback, { error: res && res.error ? res.error : '検索エラー' }, null);
      return;
    }
    const b = res.bank;
    let kanaOut2 = _bt_toStr(b.kana);
    try {
      kanaOut2 = _bt_toHalfWidthKana(kanaOut2, false);
    } catch (e) {
      kanaOut2 = _bt_toStr(b.kana);
    }
    _bt_invokeCallback(callback, null, { code: b.code, name: b.name, kana: kanaOut2 });
    return;
  });
  return;
};

// -------------------------
// 公開: 支店取得
// -------------------------
const getBranch = (bankCode, branchCodeOrName) => {
  const bankKey = _bt_toStr(bankCode).padStart(4, '0');
  const list = _bt_BRANCHES[bankKey] || [];
  const q = _bt_toStr(branchCodeOrName).toLowerCase();
  if (!q) return null;
  const byCode = list.find((b) => _bt_toStr(b.branchCode) === q.padStart(3, '0'));
  if (byCode) return byCode;
  return (
    list.find(
      (b) =>
        _bt_toStr(b.name).toLowerCase().includes(q) || _bt_toStr(b.kana).toLowerCase().includes(q)
    ) || null
  );
};

// -------------------------
// 公開: ゆうちょ変換（簡易）
// -------------------------
const convertYucho = (kigou, bangou) => {
  const k = _bt_toStr(kigou).replace(/[^0-9]/g, '');
  const b = _bt_toStr(bangou).replace(/[^0-9]/g, '');
  if (k.length < 1 || b.length < 1) {
    return { error: 'invalid_format', message: '記号/番号の形式が不正です' };
  }
  const bankCode = '9900';
  const branchCode = k.padStart(5, '0').slice(0, 3);
  const accountNumber = b.slice(-7).padStart(7, '0');
  const accountType = 'ordinary';
  return {
    bankCode,
    branchCode,
    accountType,
    accountNumber,
    note: 'この変換は簡易実装です。全銀仕様に従い必ず確認してください。',
  };
};

// -------------------------
// 公開: 振込データ（簡易CSV）
// -------------------------
const generateZenginTransfer = (records = []) => {
  const lines = [];
  lines.push(
    'from_bank,from_branch,from_type,from_account,to_bank,to_branch,to_type,to_account,amount,customer_name,customer_kana,reference'
  );
  for (const r of records) {
    const from = r.fromAccount || {};
    const cols = [
      _bt_toStr(from.bankCode),
      _bt_toStr(from.branchCode),
      _bt_toStr(from.accountType),
      _bt_toStr(from.accountNumber),
      _bt_toStr(r.toBankCode),
      _bt_toStr(r.toBranchCode),
      _bt_toStr(r.toAccountType),
      _bt_toStr(r.toAccountNumber),
      String(r.amount || 0),
      '"' + (r.customerName || '') + '"',
      '"' + (r.customerKana || '') + '"',
      '"' + (r.reference || '') + '"',
    ];
    lines.push(cols.join(','));
  }
  return lines.join('\n');
};

// -------------------------
// 公開: BankKun から全件取得してキャッシュ更新（callback-only）
// - apiBaseUrl: 例 'https://bank.teraren.com'
// - options: { apiKey, timeout(ms)=5000, banksPath='/banks', branchesPath='/branches' }
// - callback: function(err, result)
// result: { success:true, loadedBanks, loadedBranches } or on error { success:false, error }
// -------------------------
const loadBankDataFromBankKun = (apiBaseUrl, options = {}, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (!apiBaseUrl) {
    if (typeof callback === 'function')
      callback({ success: false, error: 'apiBaseUrl required' }, null);
    return;
  }
  const { apiKey, timeout = 5000, banksPath = '/banks', branchesPath = '/branches' } = options;
  const base = apiBaseUrl.replace(/\/$/, '');
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  if (abortController) timer = setTimeout(() => abortController.abort(), timeout);

  fetch(base + banksPath, { headers, signal: abortController ? abortController.signal : undefined })
    .then((banksRes) => {
      if (!banksRes.ok) return Promise.reject(new Error(`banks fetch failed: ${banksRes.status}`));
      return banksRes.json();
    })
    .then((banksJson) => {
      if (!Array.isArray(banksJson)) return Promise.reject(new Error('banks response not array'));
      _bt_BANKS.length = 0;
      for (const b of banksJson) {
        _bt_BANKS.push({
          code: _bt_toStr(b.code).padStart(4, '0'),
          name: _bt_toStr(b.name),
          kana: (function () {
            try {
              return _bt_toHalfWidthKana(_bt_toStr(b.kana), false);
            } catch (e) {
              return _bt_toStr(b.kana);
            }
          })(),
        });
      }
      return fetch(base + branchesPath, {
        headers,
        signal: abortController ? abortController.signal : undefined,
      });
    })
    .then((branchesRes) => {
      if (!branchesRes.ok) {
        const resObj = { success: true, loadedBanks: _bt_BANKS.length, loadedBranches: 0 };
        if (typeof callback === 'function') callback(null, resObj);
        return;
      }
      return branchesRes.json().then((branchesJson) => {
        if (!Array.isArray(branchesJson))
          return Promise.reject(new Error('branches response not array'));
        // clear
        for (const k in _bt_BRANCHES) delete _bt_BRANCHES[k];
        for (const br of branchesJson) {
          const bk = _bt_toStr(br.bankCode).padStart(4, '0');
          if (!_bt_BRANCHES[bk]) _bt_BRANCHES[bk] = [];
          _bt_BRANCHES[bk].push({
            branchCode: _bt_toStr(br.branchCode).padStart(3, '0'),
            name: _bt_toStr(br.name),
            kana: (function () {
              try {
                return _bt_toHalfWidthKana(_bt_toStr(br.kana), false);
              } catch (e) {
                return _bt_toStr(br.kana);
              }
            })(),
          });
        }
        const resObj = {
          success: true,
          loadedBanks: _bt_BANKS.length,
          loadedBranches: Object.keys(_bt_BRANCHES).reduce(
            (acc, k) => acc + (_bt_BRANCHES[k] ? _bt_BRANCHES[k].length : 0),
            0
          ),
        };
        if (typeof callback === 'function') callback(null, resObj);
      });
    })
    .catch((err) => {
      let message = null;
      try {
        if (err && err.name === 'AbortError') {
          message = '取得がタイムアウトしました（指定時間内に応答がありません）';
        } else if (err && err.message) {
          const m = String(err.message || err);
          if (/failed to fetch/i.test(m) || /network/i.test(m) || err instanceof TypeError) {
            message =
              '銀行データの取得に失敗しました。ネットワークまたは外部サービスの問題が考えられます。接続を確認してください。';
          } else {
            message = m;
          }
        } else {
          message = '銀行データ取得中に不明なエラーが発生しました';
        }
      } catch (e2) {
        message = '銀行データ取得中にエラーが発生しました';
      }
      const e = { success: false, error: message };
      if (typeof callback === 'function') callback(e, null);
    })
    .catch((err) => {
      const e = { success: false, error: err && err.message ? err.message : String(err) };
      if (typeof callback === 'function') callback(e, null);
    })
    .finally(() => {
      if (timer) clearTimeout(timer);
    });
};

// expose to window for kintone
if (typeof window !== 'undefined') {
  window.KACSW = window.KACSW || {};
  window.KACSW.bankTransfer = window.KACSW.bankTransfer || {};
  Object.assign(window.KACSW.bankTransfer, {
    getBank,
    getBranch,
    convertYucho,
    generateZenginTransfer,
    loadBankDataFromBankKun,
  });
}
