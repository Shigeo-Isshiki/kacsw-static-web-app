/** 日付処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
'use strict';
/** 文字列が文字列型であることを確認する関数
 * @param {*} str - 確認する文字列
 */
const assertString = (str) => {
    if (typeof str !== 'string') throw new Error(`[${str}] must be a string`);
};
/**
 * 漢数字をアラビア数字に変換する関数
 * @param {string} str - 漢数字を含む日付文字列
 * @returns {string} - アラビア数字に変換された日付文字列
 */
const convert_kanji_numerals = (str = '') => {
    assertString(str);
    const kanjiDigits = {
        '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4,
        '五': 5, '六': 6, '七': 7, '八': 8, '九': 9
    };
    const kanjiMultipliers = {
        '十': 10, '百': 100, '千': 1000
    };
    const parseKanjiNumber = (kanji) => {
        assertString(kanji);
        let total = 0;
        let current = 0;
        for (let c = 0; c < kanji.length; c++) {
            const char = kanji[c];
            if (char in kanjiDigits) {
                current = kanjiDigits[char];
            } else if (char in kanjiMultipliers) {
                if (current === 0) current = 1;
                total += current * kanjiMultipliers[char];
                current = 0;
            } else if (char === '元') {
                total += 1;
            }
        }
        total += current;
        return String(total);
    };
    return str.replace(/[〇一二三四五六七八九十百千元]+/g, parseKanjiNumber);
};
/**
 * 元号を表す配列
 */
const eraNames = ['明治', '大正', '昭和', '平成', '令和'];
/**
 * 元号略語を表す配列
 */
const eraInitials = ['M', 'T', 'S', 'H', 'R', 'm', 't', 's', 'h', 'r', 'Ｍ', 'Ｔ', 'Ｓ', 'Ｈ', 'Ｒ', 'ｍ', 'ｔ', 'ｓ', 'ｈ', 'ｒ'];
/**
 * 日付形式の正規表現テンプレート
 */
const regexTemplates = {
    seirekiKanji: '{{year}}年{{month}}月{{day}}日',
    seirekiSymbol: '{{year}}{{sep}}{{month}}{{sep}}{{day}}',
    warekiKanji: '{{era}}{{year}}年{{month}}月{{day}}日',
    warekiSymbol: '{{era}}{{year}}{{sep}}{{month}}{{sep}}{{day}}'
};
/**　
 * 特殊文字をエスケープする関数
 * @param {string} s - エスケープ対象の文字列
 * @returns {string} - エスケープされた文字列
 */
const escapeRegExp = (s) => s.replace(/[.*+?^=!:${}()|[\]\\]/g, '\\$&');
/**
 * テンプレートに値を適用する関数
 * @param {string} template - テンプレート文字列
 * @param {Object} values - 適用する値のオブジェクト
 * @returns {string} - 値が適用されたテンプレート文字列
 */
const applyTemplate = (template, values) => {
    assertString(template);
    if (typeof values !== 'object' || values === null) throw new Error('values must be an object');
    return template.replace(/{{(.*?)}}/g, (_, key) => values[key] ?? '');
};
/**
 * 正規表現を生成する関数
 * @param {string} template - 正規表現テンプレート
 * @param {Object} values - 適用する値のオブジェクト
 * @returns {RegExp} - 生成された正規表現
 */
const buildRegex = (template, values) => {
    assertString(template);
    if (typeof values !== 'object' || values === null) throw new Error('values must be an object');
    const escapedValues = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, escapeRegExp(v)])
    );
    const regexStr = '^' + applyTemplate(template, escapedValues) + '$';
    return new RegExp(regexStr);
};
/**
 * 和暦の年を表す正規表現パターン
 */
const warekiYearPattern = '(元|\\d{1,2})';
/**
 * 元号略語を正規化する関数
 * @param {string} initial - 元号略語の1文字
 * @returns {string} - 正規化された元号略語
 */
const normalizeEraInitial = (initial) => {
    assertString(initial);
    const map = {
        'Ｍ': 'M', 'ｍ': 'M', 'M': 'M',
        'Ｔ': 'T', 'ｔ': 'T', 'T': 'T',
        'Ｓ': 'S', 'ｓ': 'S', 'S': 'S',
        'Ｈ': 'H', 'ｈ': 'H', 'H': 'H',
        'Ｒ': 'R', 'ｒ': 'R', 'R': 'R'
    };
    return map[initial] ?? initial;
};
/**
 * 日付形式の正規表現パターンを生成する関数
 * @param {Array<string>} separators - 区切り文字の配列（例: ['/', '-', '.', '／', '‐', '．', '−', 'ー', '－']）
 * @param {boolean} includeDay - 日付を含めるかどうか
 * @returns {Array<RegExp>} - 正規表現の配列
 */
const createDatePattern = (separators = [''], includeDay = true) => {
    if (!Array.isArray(separators)) throw new Error('separators must be an array');
    separators.forEach(sep => { assertString(sep); });
    if (typeof includeDay !== 'boolean') throw new Error('includeDay must be a boolean');
    const year = '\\d{4}';
    const month = '\\d{1,2}';
    const day = includeDay ? '\\d{1,2}' : null;
    const sepList = separators.length > 0 ? separators : [''];
    const patterns = [];
    sepList.forEach(sep => {
        patterns.push(buildRegex(regexTemplates.seirekiKanji, { year, month, day }));
        patterns.push(buildRegex(regexTemplates.seirekiSymbol, { year, month, day, sep }));
        eraNames.forEach(era => {
            patterns.push(buildRegex(regexTemplates.warekiKanji, { era, year: warekiYearPattern, month, day }));
            patterns.push(buildRegex(regexTemplates.warekiSymbol, { era, year: warekiYearPattern, month, day, sep }));
        });
        eraInitials.forEach(initial => {
            const normalized = normalizeEraInitial(initial);
            patterns.push(buildRegex(regexTemplates.warekiKanji, { era: normalized, year: warekiYearPattern, month, day }));
            patterns.push(buildRegex(regexTemplates.warekiSymbol, { era: normalized, year: warekiYearPattern, month, day, sep }));
        });
    });
    return patterns;
};
/**
 * 日付形式の正規表現パターンをまとめたオブジェクト
 * @constant {object} patterns - 日付形式の正規表現パターン
 * @property {Array} ymdKanji - 「YYYY年MM月DD日」形式の正規表現
 * @property {Array} ymdSlash - 「YYYY/MM/DD」形式の正規表現
 * @property {Array} ymdCompact - 「YYYYMMDD」形式の正規表現
 * @property {Array} ymKanji - 「YYYY年MM月」形式の正規表現
 * @property {Array} ymSlash - 「YYYY/MM」形式の正規表現
 * @property {Array} ymCompact - 「YYYYMM」形式の正規表現
 * @property {Array} yKanji - 「YYYY年」形式の正規表現
 * @property {Array} yOnly - 「YYYY」形式の正規表現
 */
const commonSeparators = [
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
 * @constant {object} patterns - 日付形式の正規表現パターン
 * @property {Array} ymdKanji - 「YYYY年MM月DD日」形式の正規表現
 * @property {Array} ymdSlash - 「YYYY/MM/DD」形式の正規表現
 * @property {Array} ymdCompact - 「YYYYMMDD」形式の正規表現
 * @property {Array} ymKanji - 「YYYY年MM月」形式の正規表現
 * @property {Array} ymSlash - 「YYYY/MM」形式の正規表現
 * @property {Array} ymCompact - 「YYYYMM」形式の正規表現
 * @property {Array} yKanji - 「YYYY年」形式の正規表現
 * @property {Array} yOnly - 「YYYY」形式の正規表現
 */
const patterns = {
    ymdKanji: createDatePattern('', true),
    ymdSlash: [
        ...createDatePattern(commonSeparators, true),
        ...eraNames.flatMap(era => 
            commonSeparators.map(sep =>
                buildRegex(regexTemplates.warekiSymbol, {
                    era,
                    year: '(元|\\d{1,2})',
                    month: '\\d{1,2}',
                    day: '\\d{1,2}',
                    sep
                })
            )
        )
    ],
    ymdCompact: [
        /^\d{8}$/,
        /^.{1,2}元\d{4}$/,
        /^.{1,2}\d{5,6}$/
    ],
    ymKanji: createDatePattern('', false),
    ymSlash: createDatePattern(commonSeparators, false),
    ymCompact: [
        /^\d{6}$/,
        /^.{1,2}元\d{2}$/,
        /^.{1,2}\d{3,4}$/
    ],
    yKanji: [
        /^\d{4}年$/,
        /^.{1,2}元年$/,
        /^.{1,2}\d{1,2}年$/
    ],
    yOnly: [
        /^\d{4}$/,
        /^.{1,2}元$/,
        /^.{1,2}\d{1,2}$/
    ]
};
/**
 * 日付形式を判別する関数
 * @param {string} str - 判別対象の日付文字列
 * @returns {string} - 判別結果の文字列（該当する形式がない場合は空白を返す）
 */
const detectDateType = (str) => {
    assertString(str);
    for (const [type, regexList] of Object.entries(patterns)) {
        if (regexList.some((regex) => regex.test(str))) {
            return type;
        }
    }
    return '';
};
/**
 * 日付文字列を分割する関数
 * @param {string} type - 日付形式の種類
 * @param {string} str - 分割対象の日付文字列
 * @returns {Array} - 分割結果の配列
 */
const splitDateString = (type, str) => {
    assertString(type);
    assertString(str);
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
/**
 * 文字列の中の各文字を全角数字を半角数字に変換する関数
 * @param {string} str 変換対象の文字列
 * @returns {string} 半角数字に変換した文字列
 */
const convert_to_single_byte_numbers = (str = '') => {
    assertString(str);
    if (!str) return '';
    str = convert_kanji_numerals(str);
    return str.replace(/[０１２３４５６７８９]/g, (char_conv) => {
        return String.fromCodePoint(char_conv.charCodeAt(0) - 0xFEE0);
    });
};
/**
 * 日付文字列を年月日の配列形式に分割する関数
 * @param {string} date_str 分割対象の日付文字列
 * @returns {object} 年月日の配列形式に分割したオブジェクト
 * @property {string} year - 年の文字列（分割できなかった場合は空白を返す）
 * @property {string} month - 月の文字列（分割できなかった場合は空白を返す）
 * @property {string} day - 日の文字列（分割できなかった場合は空白を返す）
 */
const date_string_split = (date_str) => {
    assertString(date_str);
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
    const date_str_sbn = convert_to_single_byte_numbers(date_str);
    const date_type = detectDateType(date_str_sbn);
    if (/^\d{8}$/.test(date_str_sbn)) { // YYYYMMDD形式
        return {
            year: date_str_sbn.slice(0, 4),
            month: date_str_sbn.slice(4, 6),
            day: date_str_sbn.slice(6, 8)
        };
    }
    const date_str_sbn_split = splitDateString(date_type, date_str_sbn);
    if (date_str_sbn_split.length >= 1 && date_str_sbn_split[0]) { // 年の文字列がある場合
        let era_type = 0;
        for (const [eraName, patterns] of Object.entries(eraPatterns)) {
            if (patterns.some(pat => pat.test(date_str_sbn_split[0]))) {
                era_type = eraNames.indexOf(eraName) + 1;
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
        let yearnumber = Number(yearchar);
        switch (era_type) {
            case 1: // 元号が明治の場合
                if (yearnumber >= 1 && yearnumber <= 45) { // 明治元年～45年までの範囲
                    yearnumber += 1867;
                } else { // 明治の範囲外の場合
                    yearnumber = 0;
                }
                break;
            case 2: // 元号が大正の場合
                if (yearnumber >= 1 && yearnumber <= 15) { // 大正元年～15年までの範囲
                    yearnumber += 1911;
                } else { // 大正の範囲外の場合
                    yearnumber = 0;
                }
                break;
            case 3: // 元号が昭和の場合
                if (yearnumber >= 1 && yearnumber <= 64) { // 昭和元年～昭和64年までの範囲
                    yearnumber += 1925;
                } else { // 昭和の範囲外の場合
                    yearnumber = 0;
                }
                break;
            case 4: // 元号が平成の場合
                if (yearnumber >= 1 && yearnumber <= 31) { // 平成元年～平成31年までの範囲
                    yearnumber += 1988;
                } else { // 平成の範囲外の場合
                    yearnumber = 0;
                }
                break;
            case 5: // 元号が令和の場合
                if (yearnumber >= 1) { // 令和元年以降の範囲
                    yearnumber += 2018;
                } else { // 令和の範囲外の場合
                    yearnumber = 0;
                }
                break;
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
        let conv_flag = true;
        const daynumber = Number(date_str_sbn_split[2]);
        if ((daynumber >= 1) && (daynumber <= 31)) { // 日表記が1日～31日になっている場合
            const yearnumber = Number(date_str_split.year);
            const monthnumber = Number(date_str_split.month);
            if (yearnumber > 0 && monthnumber >= 1 && monthnumber <= 12) { // 年の文字列があり、月の文字列が1月～12月になっている場合
                switch (monthnumber) {
                    case 4:
                    case 6:
                    case 9:
                    case 11: // 月日数が30日ある月の場合
                        if (daynumber > 30) { // 日表記が30を超える場合
                            conv_flag = false;
                        }
                        break;
                    case 2: // 2月の場合
                        if (((yearnumber % 4) === 0) && (((yearnumber % 100) !== 0) || ((yearnumber % 400) === 0))) { // うるう年の場合
                            if (daynumber > 29) { // 日表記が29を超える場合
                                conv_flag = false;
                            }
                        } else { // 平年の場合
                            if (daynumber > 28) { // 日表記が28を超える場合
                                conv_flag = false;
                            }
                        }
                        break;
                }
            } else { // 年の文字列がない、もしくは月の文字列が1月～12月になっていない場合
                conv_flag = false;
            }
        } else { // 日表記が1日～31日になっていない場合
            conv_flag = false;
        }
        if (conv_flag) { // 日の数値が1以上で、月日数の範囲内の場合
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
    assertString(date_str);
    if (!date_str) return '';
    const date_str_split = date_string_split(date_str);
    if (date_str_split.year && date_str_split.month && date_str_split.day) { // 年、月、日の文字列がある場合
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
    assertString(date_str);
    if (!date_str) return { char: '', jacsw: '' };
    if (date_str) { // 日付形式の文字列がある場合
        const date_str_split = date_string_split(date_str);
        if (date_str_split.year && date_str_split.month) { // 年、月の文字列がある場合
            return {
                char: date_str_split.year + '年' + date_str_split.month + '月',
                jacsw: date_str_split.year + '/' + date_str_split.month
            };
        }
    }
    return { char: '', jacsw: '' };
};

/**
 * 西暦和暦を問わず日付文字列を西暦の年形式に変換する関数
 * @param {string} date_str 変換対象の日付文字列
 * @returns {string} 西暦の年形式の文字列（変換できなかった場合は空白を返す）
 */
const convert_to_year = (date_str) => {
    assertString(date_str);
    if (!date_str) return '';
    const date_str_split = date_string_split(date_str);
    if (date_str_split.year) return date_str_split.year;
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
    assertString(date_str);
    if (!date_str) return { full_era_year: '', initial_era_year: '', era_year_number: '' };
    const datachar_char = {
        'full_era_year': '',
        'initial_era_year': '',
        'era_year_number': ''
    }
    const date_str_split = date_string_split(date_str);
    if (date_str_split.year && date_str_split.month && date_str_split.day) { // 年、月、日の文字列がある場合
        let era_type = 0;
        const ad_number = Number(date_str_split.year);
        const month_number = Number(date_str_split.month);
        const day_number = Number(date_str_split.day);
        if (ad_number === 1868) { // 西暦が1868年の場合
            if (month_number === 10) { // 月が10月の場合
                if (day_number >= 23) { // 日が23日から先の場合
                    era_type = 1;
                }
            } else if (month_number >= 11) { // 月が11月から先の場合
                era_type = 1;
            }
        } else if (ad_number >= 1869 && ad_number <= 1911) { // 西暦が1869年から1911年の場合
            era_type = 1;
        } else if (ad_number === 1912) { // 西暦が1912年の場合
            if (month_number <= 6) { // 月が6月までの場合
                era_type = 1;
            } else if (month_number === 7) { // 月が7月の場合
                if (day_number <= 29) { // 日が29日までの場合
                    era_type = 1;
                } else if (day_number >= 30) { // 日が30日から先の場合
                    era_type = 2;
                }
            } else if (month_number >= 8) { // 月が8月から先の場合
                era_type = 2;
            }
        } else if (ad_number >= 1913 && ad_number <= 1925) { // 西暦が1913年から1925年の場合
            era_type = 2;
        } else if (ad_number === 1926) { // 西暦が1926年の場合
            if (month_number <= 11) { // 月が11月までの場合
                era_type = 2;
            } else if (month_number === 12) { // 月が12月の場合
                if (day_number <= 24) { // 日が24日までの場合
                    era_type = 2;
                } else if (day_number >= 25) { // 日が25日から先の場合
                    era_type = 3;
                }
            }
        } else if (ad_number >= 1927 && ad_number <= 1988) { // 西暦が1927年から1988年の場合
            era_type = 3;
        } else if (ad_number === 1989) { // 西暦が1989年の場合
            if (month_number === 1) { // 月が1月の場合
                if (day_number <= 7) { // 日が7日までの場合
                    era_type = 3;
                } else if (day_number >= 8) { // 日が8日から先の場合
                    era_type = 4;
                }
            } else if (month_number >= 2) { // 月が2月から先の場合
                era_type = 4;
            }
        } else if (ad_number >= 1990 && ad_number <= 2018) { // 西暦が1990年から2018年の場合
            era_type = 4;
        } else if (ad_number === 2019) { // 西暦が2019年の場合
            if (month_number <= 4) { // 月が4月までの場合
                era_type = 4;
            } else if (month_number >= 5) { // 月が5月から先の場合
                era_type = 5;
            }
        } else if (ad_number >= 2020) { // 西暦が2020年以降の場合
            era_type = 5;
        }
        let full_era_name = '';
        let initial_era_year = '';
        let era_year_number = ad_number;
        switch (era_type) {
            case 1: // 元号が明治の場合
                full_era_name = '明治';
                initial_era_year = 'M';
                era_year_number -= 1867;
                break;
            case 2: // 元号が大正の場合
                full_era_name = '大正';
                initial_era_year = 'T';
                era_year_number -= 1911;
                break;
            case 3: // 元号が昭和の場合
                full_era_name = '昭和';
                initial_era_year = 'S';
                era_year_number -= 1925;
                break;
            case 4: // 元号が平成の場合
                full_era_name = '平成';
                initial_era_year = 'H';
                era_year_number -= 1988;
                break;
            case 5: // 元号が令和の場合
                full_era_name = '令和';
                initial_era_year = 'R';
                era_year_number -= 2018;
                break;
        }
        if (era_type > 0 && era_year_number > 0) { // 和暦表記の計算にエラーがない場合
            return {
                full_era_year: full_era_name + String(era_year_number) + '年',
                initial_era_year: initial_era_year + String(era_year_number) + '年',
                era_year_number: era_year_number
            };
        }
    }
    return { full_era_year: '', initial_era_year: '', era_year_number: '' };
};