/** 日付処理に関する処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_du_)で始める
'use strict';
//　ライブラリ内の共通定数・変換テーブル定義部
// 西暦から元号（和暦）への変換ユーティリティ
const _DU_ERAS = [
    { name: '令和', initial: 'R', number: 5, start: new Date('2019-05-01') },
    { name: '平成', initial: 'H', number: 4, start: new Date('1989-01-08') },
    { name: '昭和', initial: 'S', number: 3, start: new Date('1926-12-25') },
    { name: '大正', initial: 'T', number: 2, start: new Date('1912-07-30') },
    { name: '明治', initial: 'M', number: 1, start: new Date('1868-01-25') }
];
// 漢数字→アラビア数字変換テーブル
const _DU_KANJI_NUM = {
    '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100, '千': 1000
};

//　ライブラリ内の共通関数定義部
// 漢数字→アラビア数字変換関数（1～3999程度まで対応）
const _du_kanjiToNumber = (kanji) => {
    if (kanji === '元') return 1;
    let num = 0, tmp = 0, lastUnit = 1;
    for (let i = 0; i < kanji.length; i++) {
        const c = kanji[i];
        if (_DU_KANJI_NUM[c] >= 10) {
            if (tmp === 0) tmp = 1;
            num += tmp * _DU_KANJI_NUM[c];
            tmp = 0;
            lastUnit = _DU_KANJI_NUM[c];
        } else if (_DU_KANJI_NUM[c] >= 0) {
            tmp = tmp * 10 + _DU_KANJI_NUM[c];
        }
    }
    num += tmp;
    return num;
};

//　ライブラリ本体部
/**
 * 和暦・西暦表記（文字列）から西暦のDate型（年月日）に変換する
 * @param {string|Date} date 例: "令和7年10月14日", "平成元年1月8日", "2025-10-14", Date型
 * @returns {Date} 西暦のDate型
 * @throws {Error} 不正な形式の場合
 */
const convertToSeireki = (date) => {
    const formatDate = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    if (date instanceof Date) {
        if (isNaN(date.getTime())) throw new Error('不正な日付です');
        return formatDate(date);
    }
    if (typeof date === 'string') {
        // 漢数字をアラビア数字に変換（年・月・日）
    // 全角数字→半角数字変換
    const toHankaku = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
    let normalized = toHankaku(date);
        // 和暦（漢数字含む）パターン: "元号+年+月+日" 例: "昭和五十三年七月二十九日"
    const eraNames = _DU_ERAS.map(e => e.name).join('|');
        // 年・月・日それぞれ漢数字または数字
    const waKanjiReg = new RegExp(`^(${eraNames})([元一二三四五六七八九十百千〇\d]+)年([元一二三四五六七八九十百千〇\d]+)月([元一二三四五六七八九十百千〇\d]+)日$`);
        // 変換前（漢数字含む）で判定
        let matchKanji = date.match(waKanjiReg);
        if (matchKanji) {
            const eraKanji = matchKanji[1];
            const eraYearStr = matchKanji[2];
            const monthStr = matchKanji[3];
            const dayStr = matchKanji[4];
            const era = _DU_ERAS.find(e => e.name.startsWith(eraKanji));
            if (!era) throw new Error('不正な元号です');
            // 年・月・日を漢数字→数字変換
            let yearNum = _du_kanjiToNumber(eraYearStr);
            let monthNum = _du_kanjiToNumber(monthStr);
            let dayNum = _du_kanjiToNumber(dayStr);
            // 0は不正なので1に補正
            if (yearNum === 0) yearNum = 1;
            if (monthNum === 0) monthNum = 1;
            if (dayNum === 0) dayNum = 1;
            const year = era.start.getFullYear() + yearNum - 1;
            const resultDate = new Date(year, monthNum - 1, dayNum);
            return formatDate(resultDate);
        }
        // 変換後（数字化済み）でも判定
        // normalizedも半角化
        normalized = toHankaku(normalized);
        matchKanji = normalized.match(waKanjiReg);
        if (matchKanji) {
            const eraKanji = matchKanji[1];
            const eraYearStr = matchKanji[2];
            const monthStr = matchKanji[3];
            const dayStr = matchKanji[4];
            const era = _DU_ERAS.find(e => e.name.startsWith(eraKanji));
            if (!era) throw new Error('不正な元号です');
            // 年・月・日を数字変換
            let yearNum = _du_kanjiToNumber(eraYearStr);
            let monthNum = _du_kanjiToNumber(monthStr);
            let dayNum = _du_kanjiToNumber(dayStr);
            if (yearNum === 0) yearNum = 1;
            if (monthNum === 0) monthNum = 1;
            if (dayNum === 0) dayNum = 1;
            const year = era.start.getFullYear() + yearNum - 1;
            const resultDate = new Date(year, monthNum - 1, dayNum);
            return formatDate(resultDate);
        }
        // 漢数字をアラビア数字に変換（年・月・日）
        normalized = normalized.replace(/[一二三四五六七八九十百千〇元]+/g, (m) => _du_kanjiToNumber(m));
        // 日本語表記（YYYY年MM月DD日）をISO形式に変換
        normalized = normalized.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, '$1-$2-$3');
        // 西暦（YYYY-MM-DD, YYYY/MM/DD, YYYY年MM月DD日）
        let d = new Date(normalized);
        if (!isNaN(d.getTime())) return formatDate(d);
        
        // 動的に元号名・イニシャルを取得
        const eraInitials = _DU_ERAS.map(e => e.initial).join('');
        // 和暦パターン1: "元号+年+年+月+日" 例: "令和7年10月14日", "平成元年1月8日", "昭和53年7月29日"
        const waReg1 = new RegExp(`^(${eraNames})([元\d]+)年([\d]+)月([\d]+)日$`);
        const match1 = normalized.match(waReg1);
        if (match1) {
            const eraKanji = match1[1];
            const eraYearStr = match1[2];
            const month = parseInt(match1[3], 10);
            const day = parseInt(match1[4], 10);
            const era = _DU_ERAS.find(e => e.name.startsWith(eraKanji));
            if (!era) throw new Error('不正な元号です');
            let yearNum = _du_kanjiToNumber(eraYearStr);
            const year = era.start.getFullYear() + yearNum - 1;
            const resultDate = new Date(year, month - 1, day);
            return formatDate(resultDate);
        }

        // 和暦パターン2: "元号イニシャル+年+区切り+月+区切り+日" 例: S53-07-29, s53/7/29, H1.1.8
        const waReg2 = new RegExp(`^([${eraInitials}${eraInitials.toLowerCase()}])\s*(\d{1,2,3}|元)[-/\.年 ](\d{1,2})[-/\.月 ](\d{1,2})`);
        const match2 = normalized.match(waReg2);
        if (match2) {
            const initial = match2[1].toUpperCase();
            const eraYearStr = match2[2];
            const month = parseInt(match2[3], 10);
            const day = parseInt(match2[4], 10);
            const era = _DU_ERAS.find(e => e.initial === initial);
            if (!era) throw new Error('不正な元号イニシャルです');
            let yearNum = _du_kanjiToNumber(eraYearStr);
            const year = era.start.getFullYear() + yearNum - 1;
            const resultDate = new Date(year, month - 1, day);
            return formatDate(resultDate);
        }

        // 和暦パターン3: "元号漢字+年+区切り+月+区切り+日" 例: 昭和53/7/29, 平成1-1-8
        const waReg3 = new RegExp(`^([${eraNames}])\s*(\d{1,2,3}|元)[-/\.年 ](\d{1,2})[-/\.月 ](\d{1,2})`);
        const match3 = normalized.match(waReg3);
        if (match3) {
            const eraKanji = match3[1];
            const eraYearStr = match3[2];
            const month = parseInt(match3[3], 10);
            const day = parseInt(match3[4], 10);
            const era = _DU_ERAS.find(e => e.name.startsWith(eraKanji));
            if (!era) throw new Error('不正な元号です');
            let yearNum = _du_kanjiToNumber(eraYearStr);
            const year = era.start.getFullYear() + yearNum - 1;
            const resultDate = new Date(year, month - 1, day);
            return formatDate(resultDate);
        }
    }
    throw new Error('不正な入力形式です');
};

/**
 * 日付から元号表記（和暦）に変換し、複数形式で返す
 * @param {Date|string} date 日付（Date型または'YYYY-MM-DD'形式の文字列）
 * @returns {object} 戻り値オブジェクトの内容:
 *   - kanji: 元号＋年（例: "令和7年"、"平成元年"）
 *   - initial: 元号イニシャル＋年（例: "R7"、"H1"）
 *   - initialOnly: 元号イニシャルのみ（例: "R"、"H"）
 *   - numberOnly: 元号年の2桁（例: "07"、"53"、元年は"01"）
 */
const convertToEra = (date) => {
    // まずconvertToSeirekiで西暦日付（YYYY-MM-DD）に変換
    let seirekiStr;
    if (date instanceof Date) {
        seirekiStr = convertToSeireki(date);
    } else if (typeof date === 'string') {
        seirekiStr = convertToSeireki(date);
    } else {
        throw new Error('日付不正: Date型または文字列で指定してください');
    }
    // 変換した値をDate型に
    const d = new Date(seirekiStr);
    if (isNaN(d.getTime())) {
        throw new Error('日付不正: 有効な日付形式を指定してください');
    }
    for (const era of _DU_ERAS) {
        if (d >= era.start) {
            // 年号の開始年のみで計算（+1）
            const eraYear = d.getFullYear() - era.start.getFullYear() + 1;
            const kanji = `${era.name}${eraYear === 1 ? '元' : eraYear}年`;
            const initial = `${era.initial}${eraYear === 1 ? '1' : eraYear}`;
            const initialOnly = `${era.initial}`;
            const numberOnly = `${eraYear === 1 ? '01' : String(eraYear).padStart(2, '0')}`;
            return {
                kanji,
                initial,
                initialOnly,
                numberOnly
            };
        }
    }
    throw new Error('明治以前の日付は対応していません');
};