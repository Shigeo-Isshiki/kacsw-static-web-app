// 日付処理プログラム
// 作成者：一色
'use strict';
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
const convert_to_single_byte_numbers = (char) => {

    // 入力された文字列から全角数字を半角数字に直す関数
    // （入力値）
    // char = 文字列
    // （出力値） = 半角数字
    if (!str) return '';
    str = convert_kanji_numerals(str);
    return str.replace(/[０１２３４５６７８９]/g, (char_conv) => {
        return String.fromCodePoint(char_conv.charCodeAt(0) - 0xFEE0);
    });
};

const convert_to_anno_domini = (datechar) => {

    // 入力された西暦又は和暦の文字からISO 8601拡張形式の西暦表記（YYYY-MM-DD）に変換する関数
    // （入力値）
    // datechar = 西暦もしくは和暦の日付形式の文字列
    // （出力値）= ISO 8601拡張形式の西暦表記（YYYY-MM-DD）の文字列
    if (datechar) { // 日付形式の文字列がある場合
        const datechar_sbn = convert_to_single_byte_numbers(datechar);
        let date_type = 0;
        if ((datechar_sbn.match(/^\d{4}年\d{1,2}月\d{1,2}日$/)) || 
        (datechar_sbn.match(/^\D{1,2}元年\d{1,2}月\d{1,2}日$/)) || 
        (datechar_sbn.match(/^\D{1,2}\d{1,2}年\d{1,2}月\d{1,2}日$/))) { // 日付形式の文字列が西暦又は和暦の「YYYY年MM月DD日」のような表現の場合
            date_type = 1;
        } else if ((datechar_sbn.match(/^\d{4}[\/|\-|\.|／|‐|．]\d{1,2}[\/|\-|\.|／|‐|．]\d{1,2}$/)) || 
        (datechar_sbn.match(/^\D{1,2}元[\/|\-|\.|／|‐|．]\d{1,2}[\/|\-|\.|／|‐|．]\d{1,2}$/)) ||
        (datechar_sbn.match(/^\D{1,2}\d{1,2}[\/|\-|\.|／|‐|．]\d{1,2}[\/|\-|\.|／|‐|．]\d{1,2}$/))) { // 日付形式の文字列が西暦又は和暦の「YYYY/MM/DD」のような表現の場合
            date_type = 2;
        } else if ((datechar_sbn.match(/^\d{8}$/)) || 
        (datechar_sbn.match(/^\D{1,2}元\d{4}$/)) ||
        (datechar_sbn.match(/^\D{1,2}\d{5,6}$/))){ // 日付形式の文字列が西暦又は和暦の「YYYYMMDD」のような表現の場合
            date_type = 3;
        }
        let datechar_sbn_split = [];
        switch (date_type) {
            case 1: // 日付形式の文字列が西暦又は和暦の「YYYY年MM月DD日」のような表現の場合
                datechar_sbn_split = datechar_sbn.split(/[年|月]/);
                datechar_sbn_split[2] = datechar_sbn_split[2].replace(/日/g,'');
                break;
            case 2: // 日付形式の文字列が西暦又は和暦の「YYYY/MM/DD」のような表現の場合
                datechar_sbn_split = datechar_sbn.split(/[\/|\-|\.|／|‐|．]/);
                break;
            case 3: // 日付形式の文字列が西暦又は和暦の「YYYYMMDD」のような表現の場合
                const year_length = datechar_sbn.length - 4;
                datechar_sbn_split = [
                    datechar_sbn.substring(0, year_length),
                    datechar_sbn.substring(year_length, year_length + 2),
                    datechar_sbn.substring(year_length + 2, year_length + 4)
                ];
                break;
        }
        let conv_flag = true;
        if (datechar_sbn_split.length === 3) { // 日付形式の文字列である場合
            let era_type = 0;
            if ((datechar_sbn_split[0] === '明治元') || (datechar_sbn_split[0].match(/明治\d{1,2}$/)) || 
            (datechar_sbn_split[0].match(/[m|M|ｍ|Ｍ]元'$/)) || (datechar_sbn_split[0].match(/[m|M|ｍ|Ｍ]\d{1,2}$/))) { // 元号が明治の場合
                era_type = 1;
            } else if ((datechar_sbn_split[0] === '大正元') || (datechar_sbn_split[0].match(/大正\d{1,2}$/)) || 
            (datechar_sbn_split[0].match(/[t|T|ｔ|Ｔ]元'$/)) || (datechar_sbn_split[0].match(/[t|T|ｔ|Ｔ]\d{1,2}$/))) { // 元号が大正の場合
                era_type = 2;
            } else if ((datechar_sbn_split[0] === '昭和元') || (datechar_sbn_split[0].match(/昭和\d{1,2}$/)) || 
            (datechar_sbn_split[0].match(/[s|S|ｓ|Ｓ]元'$/)) || (datechar_sbn_split[0].match(/[s|S|ｓ|Ｓ]\d{1,2}$/))) { // 元号が昭和の場合
                era_type = 3;
            } else if ((datechar_sbn_split[0] === '平成元') || (datechar_sbn_split[0].match(/平成\d{1,2}$/)) || 
            (datechar_sbn_split[0].match(/[h|H|ｈ|Ｈ]元'$/)) || (datechar_sbn_split[0].match(/[h|H|ｈ|Ｈ]\d{1,2}$/))) { // 元号が平成の場合
                era_type = 4;
            } else if ((datechar_sbn_split[0] === '令和元') || (datechar_sbn_split[0].match(/令和\d{1,2}$/)) || 
            (datechar_sbn_split[0].match(/[r|R|ｒ|Ｒ]元'$/)) || (datechar_sbn_split[0].match(/[r|R|ｒ|Ｒ]\d{1,2}$/))) { // 元号が令和の場合
                era_type = 5;
            }
            let yearchar = '';
            if (era_type > 0) { // 日付形式の文字列が和暦表記の場合
                yearchar = datechar_sbn_split[0].replace(/明治/g,'').replace(/[m|M|ｍ|Ｍ]/g,'')
                .replace(/大正/g,'').replace(/[t|T|ｔ|Ｔ]/g,'')
                .replace(/昭和/g,'').replace(/[s|S|ｓ|Ｓ]/g,'')
                .replace(/平成/g,'').replace(/[h|H|ｈ|Ｈ]/g,'')
                .replace(/令和/g,'').replace(/[r|R|ｒ|Ｒ]/g,'');
            } else { // 日付形式の文字列が西暦表記の場合
                yearchar = datechar_sbn_split[0];
            }            
            if (yearchar === '元') { // 和暦の元年表記の場合
                yearchar = '1';
            }
            let yearnumber = '';
            switch (era_type) {
                case 1: // 元号が明治の場合
                    yearnumber = Number(yearchar) + 1867;
                    break;
                case 2: // 元号が大正の場合
                    yearnumber = Number(yearchar) + 1911;
                    break;
                case 3: // 元号が昭和の場合
                    yearnumber = Number(yearchar) + 1925;
                    break;
                case 4: // 元号が平成の場合
                    yearnumber = Number(yearchar) + 1988;
                    break;
                case 5: // 元号が令和の場合
                    yearnumber = Number(yearchar) + 2018;
                    break;
                default: // 西暦の場合
                    yearnumber = Number(yearchar);
            }
            datechar_sbn_split[0] = String(yearnumber);
            for (let c = 1; c <= 2; c++) {
                datechar_sbn_split[c] = ('0' + datechar_sbn_split[c]).slice(-2);
            }
            if ((Number(datechar_sbn_split[1]) >= 1) || (Number(datechar_sbn_split[1]) <= 12)) { // 月表記が1月～12月になっている場合
                switch (Number(datechar_sbn_split[1])) {
                    case 1:
                    case 3:
                    case 5:
                    case 7:
                    case 8:
                    case 10:
                    case 12: // 月日数が31日ある月の場合
                        if ((Number(datechar_sbn_split[2]) < 1) || (Number(datechar_sbn_split[2]) > 31)) { // 日表記が1未満もしくは31を超える場合
                            conv_flag = false;
                        }
                        break;
                    case 4:
                    case 6:
                    case 9:
                    case 11: // 月日数が30日ある月の場合
                        if ((Number(datechar_sbn_split[2]) < 1) || (Number(datechar_sbn_split[2]) > 30)) { // 日表記が1未満もしくは30を超える場合
                            conv_flag = false;
                        }
                        break;
                    case 2: // 2月の場合
                        if (Number(datechar_sbn_split[2]) < 1) { // 日表記が1未満の場合
                            conv_flag = false;
                        } else { // 日表記が1以上の場合
                            if (((yearnumber % 4) === 0) && (((yearnumber % 100) !== 0) || ((yearnumber % 400) === 0))) { // うるう年の場合
                                if (Number(datechar_sbn_split[2]) > 29) { // 日表記が29を超える場合
                                    conv_flag = false;
                                }
                            } else { // 平年の場合
                                if (Number(datechar_sbn_split[2]) > 28) { // 日表記が28を超える場合
                                    conv_flag = false;
                                }
                            }
                        }
                        break;
                    default :
                        conv_flag = false;
                        break;
                }
            } else { // 月表記が1月～12月になっていない場合
                conv_flag = false;
            }
        } else { // 日付形式の文字列ではない場合
            conv_flag = false;
        }
        if (conv_flag) { // 日付形式をISO 8601拡張形式に変換できた場合
            const datechar_iso = datechar_sbn_split[0] + '-' + datechar_sbn_split[1] + '-' + datechar_sbn_split[2];
            return datechar_iso;
        } else { // 日付形式をISO 8601拡張形式に変換できなかった場合
            return null;
        }
    } else {
        return null;
    }
};

const convert_to_year_month = (datechar) => {

    // 入力された西暦又は和暦の文字から「YYYY年MM月」と「YYYY/MM」の２形式に変換する関数
    // （入力値）
    // datechar = 西暦もしくは和暦の日付形式の文字列
    // （出力値）
    // .char = 「YYYY年MM月」形式の年月表記
    // .jacsw = 「YYYY/MM」形式の年月表記
    if (datechar) { // 日付形式の文字列がある場合
        let daychar = '';
        if (!convert_to_anno_domini(datechar)) { // 日付形式の文字列が年月日が入っている形式ではない場合
            const datechar_sbn = convert_to_single_byte_numbers(datechar);
            let date_type = 0;
            if ((datechar_sbn.match(/^\d{4}年\d{1,2}月$/)) || 
            (datechar_sbn.match(/^\D{1,2}元年\d{1,2}月$/)) || 
            (datechar_sbn.match(/^\D{1,2}\d{1,2}年\d{1,2}月$/))) { // 日付形式の文字列が西暦又は和暦の「YYYY年MM月」のような表現の場合
                date_type = 1;
            } else if ((datechar_sbn.match(/^\d{4}[\/|\-|\.|／|‐|．]\d{1,2}$/)) || 
            (datechar_sbn.match(/^\D{1,2}元[\/|\-|\.|／|‐|．]\d{1,2}$/)) ||
            (datechar_sbn.match(/^\D{1,2}\d{1,2}[\/|\-|\.|／|‐|．]\d{1,2}$/))) { // 日付形式の文字列が西暦又は和暦の「YYYY/MM」のような表現の場合
                date_type = 2;
            } else if ((datechar_sbn.match(/^\d{6}$/)) || 
            (datechar_sbn.match(/^\D{1,2}元\d{2}$/)) ||
            (datechar_sbn.match(/^\D{1,2}\d{3,4}$/))) { // 日付形式の文字列が西暦又は和暦の「YYYYMM」のような表現の場合
                date_type = 3;
            }
            switch (date_type) {
                case 1: // 日付形式の文字列が西暦又は和暦の「YYYY年MM月」のような表現の場合
                    daychar = '1日';
                    break;
                case 2: // 日付形式の文字列が西暦又は和暦の「YYYY/MM」のような表現の場合
                    daychar = '-01';
                    break;
                case 3: // 日付形式の文字列が西暦又は和暦の「YYYYMM」のような表現の場合
                    daychar = '01';
                    break;
            }
        }
        let datechar_ad = convert_to_anno_domini(datechar + daychar);
        if (datechar_ad) { // 日付形式の文字列の形式になっている場合
            const datechar_ad_split = datechar_ad.split('-');
            if (datechar_ad_split.length === 3) { // 日付形式の文字列が年月日に分けられる場合
                const datechar_year_month = {
                    'char': datechar_ad_split[0] + '年' + datechar_ad_split[1] + '月',
                    'jacsw': datechar_ad_split[0] + '/' + datechar_ad_split[1]
                };
                return datechar_year_month;
            } else { // 日付形式の文字列が年月日に分けられなかった場合
                const datechar_year_month = {
                    'char': datechar,
                    'jacsw': ''
                };
                return datechar_year_month;
            }
        } else { // 日付形式の文字列の形式になっていない場合
            const datechar_year_month = {
                'char': datechar,
                'jacsw': ''
            };
            return datechar_year_month;
        }
    } else { // 日付形式の文字列ではない場合
        const datechar_year_month = {
            'char': datechar,
            'jacsw': ''
        };
        return datechar_year_month;
    }
};

const convert_to_year = (datechar) => {

    // 入力された西暦又は和暦の文字から西暦の年形式に変換する関数
    // （入力値）
    // datechar = 西暦もしくは和暦の日付形式の文字列
    // （出力値） = 西暦の年形式の文字列
    if (datechar) { // 日付形式の文字列がある場合
        let daychar = '';
        if (!convert_to_anno_domini(datechar)) { // 日付形式の文字列が年月日形式ではない場合
            if (!convert_to_year_month(datechar).jacsw) { // 日付形式の文字列が年月形式ではない場合
                const datechar_sbn = convert_to_single_byte_numbers(datechar);
                let date_type = 0;
                if ((datechar_sbn.match(/^\d{4}年$/)) || 
                (datechar_sbn.match(/^\D{1,2}元年$/)) || 
                (datechar_sbn.match(/^\D{1,2}\d{1,2}年$/))) { // 日付形式の文字列が西暦又は和暦の「YYYY年」のような表現の場合
                    date_type = 1;
                } else if ((datechar_sbn.match(/^\d{4}$/)) || 
                (datechar_sbn.match(/^\D{1,2}元$/)) ||
                (datechar_sbn.match(/^\D{1,2}\d{1,2}$/))) { // 日付形式の文字列が西暦又は和暦の「YYYY」のような表現の場合
                    date_type = 2;
                }
                switch (date_type) {
                    case 1: // 日付形式の文字列が西暦又は和暦の「YYYY年」のような表現の場合
                        daychar = datechar_sbn + '1月1日';
                        break;
                    case 2: // 日付形式の文字列が西暦又は和暦の「YYYY」のような表現の場合
                        daychar = datechar_sbn + '-01-01';
                        break;
                }
            } else { // 日付形式の文字列が年月形式の場合
                const jacsw_split = convert_to_year_month(datechar).jacsw.split('/');
                daychar = jacsw_split[0] + '-01-01';
            }
        } else { // 日付形式の文字列が年月日形式の場合
            daychar = datechar;
        }
        let datechar_ad = convert_to_anno_domini(daychar);
        if (datechar_ad) { // 日付形式の文字列の形式になっている場合
            const datechar_ad_split = datechar_ad.split('-');
            if (datechar_ad_split.length === 3) { // 日付形式の文字列が年月日に分けられる場合
                return datechar_ad_split[0];
            } else { // 日付形式の文字列が年月日に分けられなかった場合
                return null;
            }
        } else { // 日付形式の文字列の形式になっていない場合
            return null;
        }
    } else { // 日付形式の文字列がない場合
        return null;
    }
};

const convert_to_era_year = (datechar) => {

    // 入力された西暦又は和暦の文字から和暦の年形式に変換する関数
    // （入力値）
    // datechar = 西暦もしくは和暦の日付形式の文字列
    // （出力値）
    // .full_era_year = 「漢字表記年号EE年」形式の和暦年表記
    // .initial_era_year = 「英字1文字EE」形式の和暦年表記
    // .era_year_number = 「EE」形式の和暦年のみ
    if (datechar) { // 日付形式の文字列がある場合
        let daychar = '';
        if (!convert_to_anno_domini(datechar)) { // 日付形式の文字列が年月日形式ではない場合
            if (!convert_to_year_month(datechar).jacsw) { // 日付形式の文字列が年月形式ではない場合
                const datechar_sbn = convert_to_single_byte_numbers(datechar);
                let date_type = 0;
                if ((datechar_sbn.match(/^\d{4}年$/)) || 
                (datechar_sbn.match(/^\D{1,2}元年$/)) || 
                (datechar_sbn.match(/^\D{1,2}\d{1,2}年$/))) { // 日付形式の文字列が西暦又は和暦の「YYYY年」のような表現の場合
                    date_type = 1;
                } else if ((datechar_sbn.match(/^\d{4}$/)) || 
                (datechar_sbn.match(/^\D{1,2}元$/)) ||
                (datechar_sbn.match(/^\D{1,2}\d{1,2}$/))) { // 日付形式の文字列が西暦又は和暦の「YYYY」のような表現の場合
                    date_type = 2;
                }
                switch (date_type) {
                    case 1: // 日付形式の文字列が西暦又は和暦の「YYYY年」のような表現の場合
                        daychar = datechar_sbn + '1月1日';
                        break;
                    case 2: // 日付形式の文字列が西暦又は和暦の「YYYY」のような表現の場合
                        daychar = datechar_sbn + '-01-01';
                        break;
                }
            } else { // 日付形式の文字列が年月形式の場合
                const jacsw_split = convert_to_year_month(datechar).jacsw.split('/');
                daychar = jacsw_split[0] + '-01-01';
            }
        } else { // 日付形式の文字列が年月日形式の場合
            daychar = datechar;
        }
        let datechar_ad = convert_to_anno_domini(daychar);
        if (datechar_ad) { // 日付形式の文字列の形式になっている場合
            const datechar_ad_split = datechar_ad.split('-');
            if (datechar_ad_split.length === 3) { // 日付形式の文字列が年月日に分けられる場合
                let ad_number = Number(datechar_ad_split[0]);
                let month_number = Number(datechar_ad_split[1]);
                let day_number = Number(datechar_ad_split[2]);
                let era_type = 0;
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
                let era_year_number = 0;
                switch (era_type) {
                    case 1: // 元号が明治の場合
                        full_era_name = '明治';
                        initial_era_year = 'M';
                        era_year_number = ad_number - 1867;
                        break;
                    case 2: // 元号が大正の場合
                        full_era_name = '大正';
                        initial_era_year = 'T';
                        era_year_number = ad_number - 1911;
                        break;
                    case 3: // 元号が昭和の場合
                        full_era_name = '昭和';
                        initial_era_year = 'S';
                        era_year_number = ad_number - 1925;
                        break;
                    case 4: // 元号が平成の場合
                        full_era_name = '平成';
                        initial_era_year = 'H';
                        era_year_number = ad_number - 1988;
                        break;
                    case 5: // 元号が令和の場合
                        full_era_name = '令和';
                        initial_era_year = 'R';
                        era_year_number = ad_number - 2018;
                        break;
                }
                if (era_type > 0 && era_year_number > 0) { // 和暦表記の計算にエラーがない場合
                    const era_datechar = {
                        'full_era_year': full_era_name + String(era_year_number) + '年',
                        'initial_era_year': initial_era_year + String(era_year_number) + '年',
                        'era_year_number': era_year_number,
                    };
                    return era_datechar;
                } else { // 和暦表記の計算にエラーがある場合
                    return null;
                }
                
            } else { // 日付形式の文字列が年月日に分けられなかった場合
                return null;
            }
        } else { // 日付形式の文字列の形式になっていない場合
            return null;
        }
    } else { // 日付形式の文字列がない場合
        return null;
    }
};