/** 日付処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_dh_)で始める
'use strict';
/** 文字列が文字列型であることを確認する関数
 * @param {*} str - 確認する文字列
 * @returns {*} 特に何も返さない
 */
const _dh_assertString = (str) => {
    if (typeof str !== 'string') throw new Error(`[${str}] must be a string`);
};
/**
 * 文字列が文字列型であることを確認する関数
 * @param {*} str - 確認する文字列
 * @returns {boolean} 文字列である = true、文字でない = false
 */
const _dh_checkString = (str) => {
    if (typeof str !== 'string') return false;
    return true;
};
/**
 * 元号を表す配列
 * @constant {array} _dh_eraNames - 元号を表す配列
 */
const _dh_eraNames = ['明治', '大正', '昭和', '平成', '令和'];
/**
 * 和暦の年を表す正規表現パターン
 * @constant {string} _dh_warekiYearPattern - 和暦の年を表す正規表現パターン
 */
const _dh_warekiYearPattern = '(元|\\d{1,2})';
/**
 * 入力文字を全て大文字半角文字に変換する関数
 * @param {string} str 
 * @returns {string} 大文字半角文字に変換後の文字列
 */
const _dh_normalizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.normalize('NFKC').toUpperCase();
};
/**
 * 日付形式の正規表現パターンを生成する関数
 * @param {Array<string>} separators - 区切り文字の配列（例: ['/', '-', '.', '／', '‐', '．', '−', 'ー', '－']）
 * @param {boolean} includeDay - 日付を含めるかどうか
 * @returns {Array<RegExp>} - 正規表現の配列
 */
const _dh_createDatePattern = (separators = [''], includeDay = true, includeInitials = true) => {
    if (separators === null || separators === undefined || separators.length === 0) separators = [''];
    if (!Array.isArray(separators)) throw new Error('separators must be an array');
    separators.forEach(sep => { _dh_assertString(sep); });
    if (typeof includeDay !== 'boolean') throw new Error('includeDay must be a boolean');
    const regexTemplates = {
        seirekiKanji: '{{year}}年{{month}}月{{day}}日',
        seirekiSymbol: '{{year}}{{sep}}{{month}}{{sep}}{{day}}',
        warekiKanji: '{{era}}{{year}}年{{month}}月{{day}}日',
        warekiSymbol: '{{era}}{{year}}{{sep}}{{month}}{{sep}}{{day}}'
    };
    const buildRegex = (template, values) => {
        _dh_assertString(template);
        if (typeof values !== 'object' || values === null) throw new Error('values must be an object');
        const applyTemplate = (template, values) => {
            return template.replace(/{{(.*?)}}/g, (_, key) => values[key] || '');
        };
        const filteredValues = { ...values };
        if (!includeDay) {
            delete filteredValues.day;
        }
        const regexStr = '^' + applyTemplate(template, filteredValues) + '$';
        return new RegExp(regexStr);
    };
    const withSep = (defaultValues, sep) => ({ ...defaultValues, sep });
    const eraInitials = ['M', 'T', 'S', 'H', 'R'];
    const year = '\\d{4}';
    const month = '\\d{1,2}';
    const day = includeDay ? '\\d{1,2}' : null;
    const sepList = separators.length > 0 ? separators : [''];
    const seirekiKanjiTemplate = includeDay
    ? regexTemplates.seirekiKanji
    : '{{year}}年{{month}}月';
    const seirekiSymbolTemplate = includeDay
    ? regexTemplates.seirekiSymbol
    : '{{year}}{{sep}}{{month}}';
    const warekiKanjiTemplate = includeDay
    ? regexTemplates.warekiKanji
    : '{{era}}{{year}}年{{month}}月';
    const warekiSymbolTemplate = includeDay
    ? regexTemplates.warekiSymbol
    : '{{era}}{{year}}{{sep}}{{month}}';    
    const patterns = [];
    sepList.forEach(sep => {
        const seirekiDefaultValues = { year, month, day };
        patterns.push(buildRegex(seirekiKanjiTemplate, seirekiDefaultValues));
        patterns.push(buildRegex(seirekiSymbolTemplate, withSep(seirekiDefaultValues, sep)));
        _dh_eraNames.forEach(era => {
            const eraNamesDefaultValues = { era, year: _dh_warekiYearPattern, month, day };
            patterns.push(buildRegex(warekiKanjiTemplate,  eraNamesDefaultValues));
            patterns.push(buildRegex(warekiSymbolTemplate, withSep(eraNamesDefaultValues, sep)));
        });
        if (includeInitials) {
            eraInitials.forEach(initial => {
                const normalized = _dh_normalizeString(initial);
                const eraInitialsDefaultValues = { era: normalized, year: _dh_warekiYearPattern, month, day }
                patterns.push(buildRegex(warekiKanjiTemplate, eraInitialsDefaultValues));
                patterns.push(buildRegex(warekiSymbolTemplate, withSep(eraInitialsDefaultValues, sep)));
            });
        }
    });
    return patterns;
};
/**
 * 日付の区分けに使う記号をまとめた配列
 * @constant {array} _dh_commonSeparators - 日付の区分けに使う記号を表す配列
 */
const _dh_commonSeparators = [
    '/',    // 半角スラッシュ
    '-',    // 半角ハイフン（U+002D）
    '.',    // 半角ドット
    '／',   // 全角スラッシュ（U+FF0F）
    '‐',    // ハイフン（U+2010）
    '－',   // 全角ハイフン（U+FF0D）
    'ー',   // 長音符（U+30FC）※誤入力対策
    '−',    // マイナス記号（U+2212）
    '．'    // 全角ドット（U+FF0E）
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
    ymdCompact: [ // 「YYYYMMDD」形式の正規表現
        /^\d{8}$/,
        /^.{1,2}元\d{4}$/,
        /^.{1,2}\d{5,6}$/
    ],
    ymKanji: _dh_createDatePattern('', false), // 「YYYY年MM月」形式の正規表現
    ymSlash: _dh_createDatePattern(_dh_commonSeparators, false), // 「YYYY/MM」形式の正規表現
    ymCompact: [ // 「YYYYMM」形式の正規表現
        /^\d{6}$/,
        /^.{1,2}元\d{2}$/,
        /^.{1,2}\d{3,4}$/
    ],
    yKanji: [ // 「YYYY年」形式の正規表現
        /^\d{4}年$/,
        /^.{1,2}元年$/,
        /^.{1,2}\d{1,2}年$/
    ],
    yOnly: [ // 「YYYY」形式の正規表現
        /^\d{4}$/,
        /^.{1,2}元$/,
        /^.{1,2}\d{1,2}$/
    ]
};
/**
 * 月をDate関数にあわせて減算する（1月〜12月が0〜11で表されるため）
 * @param {number} month - 月を表す数字
 * @returns {number} Date関数にあわせた月の数値
 */
const _dh_newDateMonth = (month) => month - 1;
const _dh_isValidDate = (year, month, day) => {
    const newDateMonth = _dh_newDateMonth(month)
    const date = new Date(year, newDateMonth, day);
    return date.getFullYear() === year && date.getMonth() === newDateMonth && date.getDate() === day;
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
    if (!date_str) return { year: '', month: '', day: '' };
    const eraPatterns = {
        '明治': [/^明治元$/, /^明治\d{1,2}$/, /^[mMｍＭ]元$/, /^[mMｍＭ]\d{1,2}$/],
        '大正': [/^大正元$/, /^大正\d{1,2}$/, /^[tTｔＴ]元$/, /^[tTｔＴ]\d{1,2}$/],
        '昭和': [/^昭和元$/, /^昭和\d{1,2}$/, /^[sSｓＳ]元$/, /^[sSｓＳ]\d{1,2}$/],
        '平成': [/^平成元$/, /^平成\d{1,2}$/, /^[hHｈＨ]元$/, /^[hHｈＨ]\d{1,2}$/],
        '令和': [/^令和元$/, /^令和\d{1,2}$/, /^[rRｒＲ]元$/, /^[rRｒＲ]\d{1,2}$/]
    };
    let date_str_split = {
        'year': '',
        'month': '',
        'day': ''
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
            const kanjiDigits = { '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
            const kanjiMultipliers = { '十': 10, '百': 100, '千': 1000 };
            const parseKanjiNumber = (kanji) => {
                let total = 0, current = 0;
                for (const char of kanji) {
                    if (char in kanjiDigits) {
                        current = kanjiDigits[char];
                    } else if (char in kanjiMultipliers) {
                        if (current === 0) current = 1;
                        total += current * kanjiMultipliers[char];
                        current = 0;
                    }
                }
                return total + current;
            };
            return str.replace(/[〇一二三四五六七八九十百千]+/g, (match) => parseKanjiNumber(match));
        };
        const convertFullWidthDigits = (str = '') => {
            return str.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));
        };
        str = convertKanjiNumerals(str);
        str = convertFullWidthDigits(str);
        return str
    };
    const convertWarekiToSeireki = (eraName, eraYear, month, day) => {
        const eraStartDates = {
            '明治': new Date(1868, _dh_newDateMonth(10), 23),
            '大正': new Date(1912, _dh_newDateMonth(7), 30),
            '昭和': new Date(1926, _dh_newDateMonth(12), 25),
            '平成': new Date(1989, _dh_newDateMonth(1), 8),
            '令和': new Date(2019, _dh_newDateMonth(5), 1)
        };
        const maxYears = {
            '明治': 45,
            '大正': 15,
            '昭和': 64,
            '平成': 31,
            '令和': 99 // 仮の上限
        };
        const eraStart = eraStartDates[eraName];
        const maxYear = maxYears[eraName];
        if (!eraStart || !Number.isInteger(eraYear) || eraYear < 1 || eraYear > maxYear) return 0;
        const convertedYear = eraStart.getFullYear() + (eraYear - 1);
        if (!_dh_isValidDate(convertedYear, month, day)) return 0;
        const convertedDate = new Date(convertedYear, _dh_newDateMonth(month), day);
        return convertedDate >= eraStart ? convertedYear : 0;
    };
    const date_str_ns = _dh_normalizeString(date_str);
    const date_str_sbn = convert_to_single_byte_numbers(date_str_ns);    
    const date_type = detectDateType(date_str_sbn);
    if (/^\d{8}$/.test(date_str_sbn)) { // YYYYMMDD形式
        return {
            year: date_str_sbn.slice(0, 4),
            month: date_str_sbn.slice(4, 6),
            day: date_str_sbn.slice(6, 8)
        };
    }
    const date_str_sbn_split = _dh_splitDateString(date_type, date_str_sbn);
    let yearnumber = 0;
    if (date_str_sbn_split.length >= 1 && date_str_sbn_split[0]) { // 年の文字列がある場合
        let era_type = 0;
        for (const [eraName, patterns] of Object.entries(eraPatterns)) {
            if (patterns.some(pat => pat.test(date_str_sbn_split[0]))) {
                era_type = _dh_eraNames.indexOf(eraName) + 1;
                break;
            }
        }
        let yearchar = '';
        if (era_type > 0) { // 日付形式の文字列が和暦表記の場合
            yearchar = date_str_sbn_split[0].replace(/明治/g,'').replace(/[mMｍＭ]/g,'')
            .replace(/大正/g,'').replace(/[tTｔＴ]/g,'')
            .replace(/昭和/g,'').replace(/[sSｓＳ]/g,'')
            .replace(/平成/g,'').replace(/[hHｈＨ]/g,'')
            .replace(/令和/g,'').replace(/[rRｒＲ]/g,'');
        } else { // 日付形式の文字列が西暦表記の場合
            yearchar = date_str_sbn_split[0];
        }
        if (yearchar === '元') { // 和暦の元年表記の場合
            yearchar = '1';
        }
        yearnumber = Number(yearchar);
        if (era_type > 0) {
            const eraName = _dh_eraNames[era_type - 1];
            const convertedYear = convertWarekiToSeireki(eraName, yearnumber, month, day);
            if (convertedYear > 0) {
                yearnumber = convertedYear;
            } else {
                yearnumber = 0;
            }
        }
        if (yearnumber >= 1) { // 年の数値が1以上の場合
            date_str_split.year = String(yearnumber);
        }
    }
    if (date_str_sbn_split.length >= 2 && date_str_sbn_split[1]) { // 月の文字列がある場合
        if ((Number(date_str_sbn_split[1]) >= 1) && (Number(date_str_sbn_split[1]) <= 12)) { // 月表記が1月～12月になっている場合
            date_str_split.month = ('0' + date_str_sbn_split[1]).slice(-2);
        } else { // 月表記が1月～12月になっていない場合
            date_str_split.month = '';
        }
    }
    if (date_str_sbn_split.length >= 3 && date_str_sbn_split[2]) { // 日の文字列がある場合
        if (_dh_isValidDate(Number(yearnumber), Number(date_str_sbn_split[1]), Number(date_str_sbn_split[2]))) {
            date_str_split.day = ('0' + date_str_sbn_split[2]).slice(-2);
        }
    }
    return date_str_split;
};

/**
 * 西暦和暦を問わず日付文字列をISO 8601拡張形式の西暦表記（YYYY-MM-DD）に変換する関数
 * @param {string} date_str 変換対象の日付文字列
 * @returns {string} ISO 8601拡張形式の西暦表記（YYYY-MM-DD）の文字列（変換できなかった場合は空白を返す）
 */
const convert_to_anno_domini = (date_str) => {
    if (!_dh_checkString(date_str)) return '';
    if (!date_str) return '';
    const date_str_split = _dh_date_string_split(date_str);
    const year = Number(date_str_split.year);
    const month = Number(date_str_split.month);
    const day = Number(date_str_split.day);
    if (year && month && day && _dh_isValidDate(year, month, day)) {
        return date_str_split.year + '-' + date_str_split.month + '-' + date_str_split.day;
    }
    return '';
};

/**
 * 西暦和暦を問わず日付文字列を、西暦の「YYYY年MM月」と「YYYY/MM」の２形式に変換する関数
 * @param {string} date_str 変換対象の日付文字列
 * @returns {object} 西暦の２形式に変換したオブジェクト
 * @property {string} char - 「YYYY年MM月」形式の年月表記（分割できなかった場合は空白を返す）
 * @property {string} jacsw - 「YYYY/MM」形式の年月表記（分割できなかった場合は空白を返す）
 */
const convert_to_year_month = (date_str) => {
    const nullReturn = { char: '', jacsw: '' }
    if (!_dh_checkString(date_str)) return nullReturn;
    if (!date_str) return nullReturn;
    const date_str_split = _dh_date_string_split(date_str);
    const year = Number(date_str_split.year);
    const month = Number(date_str_split.month);
    if (year && month && _dh_isValidDate(year, month, 1)) {
        return {
            char: date_str_split.year + '年' + date_str_split.month + '月',
            jacsw: date_str_split.year + '/' + date_str_split.month
        };
    }
    return nullReturn;
};

/**
 * 西暦和暦を問わず日付文字列を西暦の年形式に変換する関数
 * @param {string} date_str 変換対象の日付文字列
 * @returns {string} 西暦の年形式の文字列（変換できなかった場合は空白を返す）
 */
const convert_to_year = (date_str) => {
    if (!_dh_checkString(date_str)) return '';
    if (!date_str) return '';
    const date_str_split = _dh_date_string_split(date_str);
    const year = Number(date_str_split.year);
    if (year && _dh_isValidDate(year, 1, 1)) return date_str_split.year;
    return '';
};

/**
 * 西暦和暦を問わず日付文字列を、和暦の「漢字表記年号EE年」、「英字1文字EE」、「EE」の３形式に変換する関数
 * @param {string} date_str 変換対象の日付文字列
 * @returns {object} 和暦の３形式に変換したオブジェクト
 * @property {string} full_era_year - 「漢字表記年号EE年」形式の和暦表記の文字列（分割できなかった場合は空白を返す）
 * @property {string} initial_era_year - 「英字1文字EE」形式の和暦年表記の文字列（分割できなかった場合は空白を返す）
 * @property {string} era_year_number - 「EE」形式の和暦年のみ表記の文字列（分割できなかった場合は空白を返す）
 */

const convert_to_era_year = (date_str) => {
    const nullReturn = { full_era_year: '', initial_era_year: '', era_year_number: '' };
    if (!_dh_checkString(date_str)) return nullReturn;
    if (!date_str) return nullReturn;
    const eraTransitions = [
        { name: '明治', initial: 'M', start: new Date(1868, _dh_newDateMonth(10), 23) },
        { name: '大正', initial: 'T', start: new Date(1912, _dh_newDateMonth(7), 30) },
        { name: '昭和', initial: 'S', start: new Date(1926, _dh_newDateMonth(12), 25) },
        { name: '平成', initial: 'H', start: new Date(1989, _dh_newDateMonth(1), 8) },
        { name: '令和', initial: 'R', start: new Date(2019, _dh_newDateMonth(5), 1) }
    ];
    const getEraFromDate = (date) => {
        for (let c = eraTransitions.length - 1; c >= 0; c--) {
            if (date >= eraTransitions[c].start) return eraTransitions[c];
        }
        return null;
    };
    const date_str_split = _dh_date_string_split(date_str);
    if (!(date_str_split.year && date_str_split.month && date_str_split.day)) return nullReturn;
    const date = new Date(date_str_split.year, _dh_newDateMonth(date_str_split.month), date_str_split.day);
    if (isNaN(date.getTime())) return nullReturn;
    const era = getEraFromDate(date);
    if (!era) return nullReturn;
    const eraYear = date.getFullYear() - era.start.getFullYear() + 1;
    return {
        full_era_year: `${era.name}${eraYear}年`,
        initial_era_year: `${era.initial}${eraYear}年`,
        era_year_number: `${eraYear}`
    };
};