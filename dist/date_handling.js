/** 日付処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_dh_)で始める
// 元号改元時の対応: ERAS関数を定義しているところに新元号を追加してください。maxは終了する年がわからないため99と設定します。
'use strict';
/** 文字列が文字列型であることを確認する関数
 * @param {*} str - 確認する文字列
 * @returns {*} 特に何も返さない
 */
const _dh_assertString = (str) => {
  if (typeof str !== 'string' || str === null || str === undefined)
    throw new Error(`[${str}] must be a string`);
};
/**
 * 文字列が文字列型であることを確認する関数
 * @param {*} str - 確認する文字列
 * @returns {boolean} 文字列である = true、文字でない = false
 */
const _dh_checkString = (str) => {
  return typeof str === 'string' && str !== null && str !== undefined;
};
/**
 * 月をDate関数にあわせて減算する（1月〜12月が0〜11で表されるため）
 * @param {number} month - 月を表す数字
 * @returns {number} Date関数にあわせた月の数値
 */
const _dh_newDateMonth = (month) => month - 1;
/**
 * 元号データを一元管理する配列
 * 新元号追加時はこの配列に1行追加するだけでOK
 * ERAS配列のstartの月は「1始まり」で記述してください（例: 10月→10）。内部で0始まりに変換します。
 * @constant {Array} ERAS - 元号データを一元管理する配列
 * @property {string} name - 元号名
 * @property {string} initial - 元号イニシャル（大文字の半角英字1文字）
 * @property {Date} start - 元号の開始日を表すDateオブジェクト
 * @property {number} max - その元号で表せる和暦年の最大値
 */
const ERAS = [
  {
    name: '明治',
    initial: 'M',
    start: new Date(1868, _dh_newDateMonth(10), 23),
    max: 45,
  },
  {
    name: '大正',
    initial: 'T',
    start: new Date(1912, _dh_newDateMonth(7), 30),
    max: 15,
  },
  {
    name: '昭和',
    initial: 'S',
    start: new Date(1926, _dh_newDateMonth(12), 25),
    max: 64,
  },
  {
    name: '平成',
    initial: 'H',
    start: new Date(1989, _dh_newDateMonth(1), 8),
    max: 31,
  },
  {
    name: '令和',
    initial: 'R',
    start: new Date(2019, _dh_newDateMonth(5), 1),
    max: 99,
  }, // 令和は仮に99年まで対応
];
// 元号名・イニシャルのリストを自動生成
/**
 * 元号名のリストを表す配列
 * @constant {Array} _dh_eraNames - 元号名のリストを表す配列
 */
const _dh_eraNames = ERAS.map((e) => e.name);
/**
 * 元号イニシャルのリストを表す配列
 * @constant {Array} _dh_eraInitials - 元号イニシャルのリストを表す配列
 */
const _dh_eraInitials = ERAS.map((e) => e.initial);
/**
 * 和暦の年を表す正規表現パターン
 * @constant {string} _dh_warekiYearPattern - 和暦の年を表す正規表現パターン
 */
const _dh_warekiYearPattern = '(元\\d{1,2}|\\d{1,2})';
/**
 * 入力文字をすべて大文字の半角文字に変換する関数
 * @param {string} str
 * @returns {string} 大文字の半角文字に変換後の文字列
 */
const _dh_normalizeString = (str) => {
  if (!_dh_checkString(str)) throw new Error('入力値が文字列ではありません');
  return str.normalize('NFKC').toUpperCase();
};
/**
 * 日付形式の正規表現パターンを生成する関数
 * @param {Array<string>} separators - 区切り文字の配列
 * @param {boolean} includeDay - 日付を含めるかどうか
 * @param {boolean} includeInitials - 和暦イニシャルを含めるか
 * @returns {Array<RegExp>} - 正規表現の配列
 */
const _dh_createDatePattern = (separators = [''], includeDay = true, includeInitials = true) => {
  if (!Array.isArray(separators) || separators.length === 0) separators = [''];
  // 区切り文字を正規表現クラスにまとめる
  const sepClass =
    separators.length > 1
      ? `[${separators.map((s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('')}]`
      : separators[0]
        ? separators[0].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
        : '';
  const year = '\\d{4}';
  const month = '\\d{1,2}';
  const day = includeDay ? '\\d{1,2}' : '';
  const warekiYear = _dh_warekiYearPattern;
  const patterns = [];
  // 西暦
  patterns.push(new RegExp(`^${year}年${month}月${includeDay ? `${day}日` : ''}$`));
  if (sepClass) {
    patterns.push(
      new RegExp(`^${year}${sepClass}${month}${includeDay ? `${sepClass}${day}` : ''}$`)
    );
  }
  // 和暦
  [..._dh_eraNames, ...(includeInitials ? _dh_eraInitials : [])].forEach((era) => {
    patterns.push(new RegExp(`^${era}${warekiYear}年${month}月${includeDay ? `${day}日` : ''}$`));
    if (sepClass) {
      patterns.push(
        new RegExp(
          `^${era}${warekiYear}${sepClass}${month}${includeDay ? `${sepClass}${day}` : ''}$`
        )
      );
    }
  });
  return patterns;
};
/**
 * 日付の区分けに使う記号をまとめた配列
 * @constant {array} _dh_commonSeparators - 日付の区分けに使う記号を表す配列
 */
const _dh_commonSeparators = [
  '/', // 半角スラッシュ
  '-', // 半角ハイフン（U+002D）
  '.', // 半角ドット
  '／', // 全角スラッシュ（U+FF0F）
  '‐', // 全角ハイフン（U+2010）
  '－', // 全角ハイフン（U+FF0D）
  'ー', // 全角長音符（U+30FC）※誤入力対策
  '−', // 全角マイナス記号（U+2212）
  '．', // 全角ドット（U+FF0E）
];
/**
 * 日付形式の正規表現パターンをまとめたオブジェクト
 * @constant {object} _dh_patterns - 日付形式の正規表現パターン
 * @property {Array} ymdKanji - 「YYYY年MM月DD日」形式の正規表現
 * @property {Array} ymdSlash - 「YYYY/MM/DD」形式の正規表現
 * @property {Array} ymdCompact - 「YYYYMMDD」形式の正規表現
 * @property {Array} ymKanji - 「YYYY年MM月」形式の正規表現
 * @property {Array} ymSlash - 「YYYY/MM」形式の正規表現
 * @property {Array} ymCompact - 「YYYYMM」形式の正規表現
 * @property {Array} yKanji - 「YYYY年」形式の正規表現
 * @property {Array} yOnly - 「YYYY」形式の正規表現
 */
const _dh_patterns = {
  ymdKanji: _dh_createDatePattern('', true), // 「YYYY年MM月DD日」形式の正規表現
  ymdSlash: _dh_createDatePattern(_dh_commonSeparators, true), // 「YYYY/MM/DD」形式の正規表現
  ymdCompact: [
    // 「YYYYMMDD」形式の正規表現
    /^\d{8}$/,
    /^.{1,2}元\d{4}$/,
    /^.{1,2}\d{5,6}$/,
  ],
  ymKanji: _dh_createDatePattern('', false), // 「YYYY年MM月」形式の正規表現
  ymSlash: _dh_createDatePattern(_dh_commonSeparators, false), // 「YYYY/MM」形式の正規表現
  ymCompact: [
    // 「YYYYMM」形式の正規表現
    /^\d{6}$/,
    /^.{1,2}元\d{2}$/,
    /^.{1,2}\d{3,4}$/,
  ],
  yKanji: [
    // 「YYYY年」形式の正規表現
    /^\d{4}年$/,
    /^.{1,2}元年$/,
    /^.{1,2}\d{1,2}年$/,
  ],
  yOnly: [
    // 「YYYY」形式の正規表現
    /^\d{4}$/,
    /^.{1,2}元$/,
    /^.{1,2}\d{1,2}$/,
  ],
};
/**
 * 年月日が有効な日付かどうかを厳密に判定する関数（うるう年対応）
 * @param {number} year 年
 * @param {number} month 月
 * @param {number} day 日
 * @returns {boolean}
 */
const _dh_isValidDate = (year, month, day) => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const daysInMonth = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (day > daysInMonth[_dh_newDateMonth(month)]) return false;
  return true;
};
/**
 * 日付文字列を年月日の配列形式に分割する関数
 * @param {string} date_str 分割対象の日付文字列
 * @returns {object} 年月日の配列形式に分割したオブジェクト
 * @property {string} year - 年の文字列（分割できなかった場合は空白を返す）
 * @property {string} month - 月の文字列（分割できなかった場合は空白を返す）
 * @property {string} day - 日の文字列（分割できなかった場合は空白を返す）
 */
const _dh_date_string_split = (date_str) => {
  _dh_assertString(date_str);
  if (!date_str) throw new Error('日付文字列が空です');
  // ERAS配列からeraPatternsを自動生成
  const _dh_generateEraPatterns = () => {
    const patterns = {};
    ERAS.forEach((e) => {
      // 全角・半角イニシャルも考慮
      const ascii = e.initial;
      const lower = ascii.toLowerCase();
      const zenkaku = String.fromCharCode(ascii.charCodeAt(0) + 0xfee0);
      const zenkakuLower = String.fromCharCode(lower.charCodeAt(0) + 0xfee0);
      const initials = [ascii, lower, zenkaku, zenkakuLower].join('');
      patterns[e.name] = [
        new RegExp(`^${e.name}元$`),
        new RegExp(`^${e.name}\\d{1,2}$`),
        new RegExp(`^[${initials}]元$`),
        new RegExp(`^[${initials}]\\d{1,2}$`),
      ];
    });
    return patterns;
  };
  const eraPatterns = _dh_generateEraPatterns();
  let date_str_split = {
    year: '',
    month: '',
    day: '',
  };
  const detectDateType = (str) => {
    for (const [type, regexList] of Object.entries(_dh_patterns)) {
      if (regexList.some((regex) => regex.test(str))) {
        return type;
      }
    }
    return '';
  };
  const _dh_splitDateString = (type, str) => {
    switch (type) {
      case 'ymdKanji':
      case 'ymKanji':
      case 'yKanji':
        return str.split(/[年月日]/).filter(Boolean);
      case 'ymdSlash':
      case 'ymSlash':
      case 'yOnly':
        return str.split(/[\/\-\.\／‐．−ー－]/);
      case 'ymdCompact':
        return [str.slice(0, 4), str.slice(4, 6), str.slice(6, 8)];
      case 'ymCompact':
        return [str.slice(0, 4), str.slice(4, 6)];
      default:
        return [];
    }
  };
  const convert_to_single_byte_numbers = (str = '') => {
    if (!str) return '';
    const convertKanjiNumerals = (str = '') => {
      const parseKanjiNumber = (kanji) => {
        const digits = {
          〇: 0,
          一: 1,
          二: 2,
          三: 3,
          四: 4,
          五: 5,
          六: 6,
          七: 7,
          八: 8,
          九: 9,
        };
        const multipliers = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
        let total = 0;
        let current = 0;
        let temp = 0;
        for (let c = 0; c < kanji.length; c++) {
          const char = kanji[c];
          if (char in digits) {
            current = digits[char];
          } else if (char in multipliers) {
            if (current === 0) current = 1;
            temp += current * multipliers[char];
            current = 0;
          }
        }
        total = temp + current;
        return total;
      };
      return str.replace(/[〇一二三四五六七八九十百千]+/g, (match) => parseKanjiNumber(match));
    };
    const convertFullWidthDigits = (str = '') => {
      return str.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
    };
    str = convertKanjiNumerals(str);
    str = convertFullWidthDigits(str);
    return str;
  };
  const convertWarekiToSeireki = (eraName, eraYear, month, day) => {
    // eraNameは元号名またはイニシャルどちらでもOK
    const era = ERAS.find((e) => e.name === eraName || e.initial === eraName);
    if (!era) throw new Error('不明な元号です');
    if (!Number.isInteger(eraYear) || eraYear < 1 || eraYear > era.max)
      throw new Error('和暦年の値が不正です');
    if (month < 1 || month > 12) throw new Error('月の値が不正です');
    if (day < 1 || day > 31) throw new Error('日の値が不正です');
    const convertedYear = era.start.getFullYear() + (eraYear - 1);
    if (!_dh_isValidDate(convertedYear, month, day)) throw new Error('日付が不正です');
    const convertedDate = new Date(convertedYear, _dh_newDateMonth(month), day);
    if (convertedDate < era.start) throw new Error('和暦の開始日より前の日付です');
    return convertedYear;
  };
  const date_str_ns = _dh_normalizeString(date_str);
  const date_str_sbn = convert_to_single_byte_numbers(date_str_ns);
  const date_type = detectDateType(date_str_sbn);
  if (/^\d{8}$/.test(date_str_sbn)) {
    // YYYYMMDD形式
    return {
      year: date_str_sbn.slice(0, 4),
      month: date_str_sbn.slice(4, 6),
      day: date_str_sbn.slice(6, 8),
    };
  }
  const date_str_sbn_split = _dh_splitDateString(date_type, date_str_sbn);
  let yearnumber = 0;
  if (date_str_sbn_split.length >= 1 && date_str_sbn_split[0]) {
    // 年の文字列がある場合
    let era_type = 0;
    for (const [eraName, patterns] of Object.entries(eraPatterns)) {
      if (patterns.some((pat) => pat.test(date_str_sbn_split[0]))) {
        era_type = _dh_eraNames.indexOf(eraName) + 1;
        break;
      }
    }
    let yearchar = '';
    if (era_type > 0) {
      // 日付形式の文字列が和暦表記の場合
      // ERAS配列から元号名・イニシャル（全角・半角）をすべて削除
      let tmp = date_str_sbn_split[0];
      ERAS.forEach((e) => {
        // 元号名
        tmp = tmp.replace(new RegExp(e.name, 'g'), '');
        // イニシャル（半角大・小、全角大・小）
        const ascii = e.initial;
        const lower = ascii.toLowerCase();
        const zenkaku = String.fromCharCode(ascii.charCodeAt(0) + 0xfee0);
        const zenkakuLower = String.fromCharCode(lower.charCodeAt(0) + 0xfee0);
        [ascii, lower, zenkaku, zenkakuLower].forEach((init) => {
          tmp = tmp.replace(new RegExp(init, 'g'), '');
        });
      });
      yearchar = tmp;
    } else {
      // 日付形式の文字列が西暦表記の場合
      yearchar = date_str_sbn_split[0];
    }
    if (yearchar === '元') {
      // 和暦の元年表記の場合
      yearchar = '1';
    }
    yearnumber = Number(yearchar);
    if (era_type > 0) {
      const eraName = _dh_eraNames[era_type - 1];
      const month =
        date_str_sbn_split.length >= 2 && date_str_sbn_split[1] ? Number(date_str_sbn_split[1]) : 1;
      const day =
        date_str_sbn_split.length >= 3 && date_str_sbn_split[2] ? Number(date_str_sbn_split[2]) : 1;
      const convertedYear = convertWarekiToSeireki(eraName, yearnumber, month, day);
      if (convertedYear > 0) {
        yearnumber = convertedYear;
      } else {
        yearnumber = 0;
      }
    }
    if (yearnumber >= 1) {
      // 年の数値が1以上の場合
      date_str_split.year = String(yearnumber);
    }
  }
  if (date_str_sbn_split.length >= 2 && date_str_sbn_split[1]) {
    // 月の文字列がある場合
    if (Number(date_str_sbn_split[1]) >= 1 && Number(date_str_sbn_split[1]) <= 12) {
      // 月表記が1月～12月になっている場合
      date_str_split.month = ('0' + date_str_sbn_split[1]).slice(-2);
    } else {
      // 月表記が1月～12月になっていない場合
      date_str_split.month = '';
    }
  }
  if (date_str_sbn_split.length >= 3 && date_str_sbn_split[2]) {
    // 日の文字列がある場合
    if (
      _dh_isValidDate(
        Number(yearnumber),
        Number(date_str_sbn_split[1]),
        Number(date_str_sbn_split[2])
      )
    ) {
      date_str_split.day = ('0' + date_str_sbn_split[2]).slice(-2);
    }
  }
  if (!date_str_split.year) throw new Error('年の抽出に失敗しました');
  return date_str_split;
};

/**
 * 西暦和暦を問わず日付文字列をISO 8601拡張形式の西暦表記（YYYY-MM-DD）に変換する関数
 * @param {string} date_str 変換対象の日付文字列
 * @returns {string} ISO 8601拡張形式の西暦表記（YYYY-MM-DD）の文字列
 * @throws 変換できなかった場合は例外を投げる
 */
const convert_to_anno_domini = (date_str) => {
  if (!_dh_checkString(date_str)) throw new Error('日付文字列が不正です');
  if (!date_str) throw new Error('日付文字列が空です');
  const date_str_split = _dh_date_string_split(date_str);
  const year = Number(date_str_split.year);
  const month = Number(date_str_split.month);
  const day = Number(date_str_split.day);
  if (year && month && day && _dh_isValidDate(year, month, day)) {
    return `${year}-${('0' + month).slice(-2)}-${('0' + day).slice(-2)}`;
  }
  throw new Error('日付の変換に失敗しました');
};

/**
 * 西暦和暦を問わず日付文字列を、西暦の「YYYY年MM月」と「YYYY/MM」の２形式に変換する関数
 * @param {string} date_str 変換対象の日付文字列
 * @returns {object} 西暦の２形式に変換したオブジェクト
 * @property {string} char - 「YYYY年MM月」形式の年月表記
 * @property {string} jacsw - 「YYYY/MM」形式の年月表記
 * @throws 変換できなかった場合は例外を投げる
 */
const convert_to_year_month = (date_str) => {
  if (!_dh_checkString(date_str)) throw new Error('日付文字列が不正です');
  if (!date_str) throw new Error('日付文字列が空です');
  const date_str_split = _dh_date_string_split(date_str);
  const year = Number(date_str_split.year);
  const month = Number(date_str_split.month);
  if (year && month && _dh_isValidDate(year, month, 1)) {
    return {
      char: `${year}年${('0' + month).slice(-2)}月`,
      jacsw: `${year}/${('0' + month).slice(-2)}`,
    };
  }
  throw new Error('年月の変換に失敗しました');
};

/**
 * 西暦和暦を問わず日付文字列を西暦の年形式に変換する関数
 * @param {string} date_str 変換対象の日付文字列
 * @returns {string} 西暦の年形式の文字列
 * @throws 変換できなかった場合は例外を投げる
 */
const convert_to_year = (date_str) => {
  if (!_dh_checkString(date_str)) throw new Error('日付文字列が不正です');
  if (!date_str) throw new Error('日付文字列が空です');
  const date_str_split = _dh_date_string_split(date_str);
  const year = Number(date_str_split.year);
  if (year && _dh_isValidDate(year, 1, 1)) return date_str_split.year;
  throw new Error('年の変換に失敗しました');
};

/**
 * 西暦和暦を問わず日付文字列を、和暦の「漢字表記年号EE年」、「英字1文字EE」、「EE」の３形式に変換する関数
 * @param {string} date_str 変換対象の日付文字列
 * @returns {object} 和暦の３形式に変換したオブジェクト
 * @property {string} full_era_year - 「漢字表記年号EE年」形式の和暦表記の文字列
 * @property {string} initial_era_year - 「英字1文字EE」形式の和暦年表記の文字列
 * @property {string} era_year_number - 「EE」形式の和暦年のみ表記の文字列
 * @throws 変換できなかった場合は例外を投げる
 */
const convert_to_era_year = (date_str) => {
  if (!_dh_checkString(date_str)) throw new Error('日付文字列が不正です');
  if (!date_str) throw new Error('日付文字列が空です');
  // ERAS配列を利用
  const getEraFromDate = (date) => {
    for (let c = ERAS.length - 1; c >= 0; c--) {
      if (date >= ERAS[c].start) return ERAS[c];
    }
    return null;
  };
  const date_str_split = _dh_date_string_split(date_str);
  const year = Number(date_str_split.year);
  const month = Number(date_str_split.month);
  const day = Number(date_str_split.day);
  if (!(year && month && day && _dh_isValidDate(year, month, day)))
    throw new Error('和暦変換に失敗しました');
  const date = new Date(year, _dh_newDateMonth(month), day);
  const era = getEraFromDate(date);
  if (!era) throw new Error('和暦変換に失敗しました');
  const eraYear = date.getFullYear() - era.start.getFullYear() + 1;
  return {
    full_era_year: `${era.name}${eraYear}年`,
    initial_era_year: `${era.initial}${eraYear}年`,
    era_year_number: `${eraYear}`,
  };
};

// 公開: kintone から参照されることがある変換関数をグローバルに露出
if (typeof window !== 'undefined') {
  window.convert_to_anno_domini = convert_to_anno_domini;
  window.convert_to_year_month = convert_to_year_month;
  window.convert_to_year = convert_to_year;
  window.convert_to_era_year = convert_to_era_year;
}
