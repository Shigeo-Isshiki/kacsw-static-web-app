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
 * @param {string|Date} date 例: "令和元年5月1日", "平成元年1月8日", "2025-10-14", Date型
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
        // 前処理: 全角数字・英字→半角、漢数字→半角アラビア数字、元号漢字→イニシャル、区切りをYYYY-MM-DDに統一
        const toHankaku = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
        const toHankakuAlpha = s => s.replace(/[Ａ-Ｚａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
        // 漢数字→半角アラビア数字（1～3999程度まで対応）
        const kanjiNumReg = /[元一二三四五六七八九十百千〇]+/g;
        const kanjiToNumStr = s => s.replace(kanjiNumReg, m => _du_kanjiToNumber(m));
        // 元号漢字→イニシャル
        const eraInitials = _DU_ERAS.map(e => e.initial).join('');
        const eraNames = _DU_ERAS.map(e => e.name).join('|');
        const kanjiToInitial = s => {
            let result = s;
            _DU_ERAS.forEach(e => {
                result = result.replace(new RegExp(e.name, 'g'), e.initial);
            });
            return result;
        };
        // 区切りをYYYY-MM-DDに統一
        const normalizeDateSeparator = s => s
            .replace(/年|\/|\.|\s|月/g, '-')
            .replace(/日/g, '');
        let normalized = (typeof date === 'string') ? date : '';
        normalized = toHankakuAlpha(toHankaku(normalized));
        normalized = kanjiToNumStr(normalized);
        normalized = kanjiToInitial(normalized);
        normalized = normalizeDateSeparator(normalized);
        if (typeof normalized !== 'string') normalized = String(normalized ?? '');
        normalized = normalized.replace(/^-+|-+$/g, ''); // 先頭・末尾の余分な区切りを除去
        // 区切りで分割し、和暦パターン判定
        const parts = normalized.split('-').filter(Boolean);
        // 例: ["H", "1", "1", "8"] or ["H", "1", "8"]
        if (parts.length >= 3 && parts.length <= 4) {
            let initial = parts[0];
            let yearStr = '';
            // initialが2文字以上の場合（例: H1, R7, H13）
            if (initial.length > 1) {
                yearStr = initial.slice(1);
                initial = initial[0];
            }
            // 大文字・小文字両方対応
            let era = _DU_ERAS.find(e => e.initial.toUpperCase() === initial.toUpperCase());
            if (era) {
                let yearNum, monthNum, dayNum;
                if (yearStr) {
                    // initial+年パターン
                    yearNum = parseInt(yearStr, 10);
                    monthNum = parseInt(parts[1], 10);
                    dayNum = parseInt(parts[2], 10);
                } else {
                    // initial, 年, 月, 日パターン
                    yearNum = parseInt(parts[1], 10);
                    monthNum = parseInt(parts[2], 10);
                    dayNum = parts.length === 4 ? parseInt(parts[3], 10) : 1;
                }
                if (yearNum === 0) yearNum = 1;
                if (monthNum === 0) monthNum = 1;
                if (dayNum === 0) dayNum = 1;
                const year = era.start.getFullYear() + yearNum - 1;
                const resultDate = new Date(year, monthNum - 1, dayNum);
                return formatDate(resultDate);
            }
        }
        // 西暦（YYYY-MM-DD, YYYY/MM/DD, YYYY年MM月DD日）
        const ymdMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (ymdMatch) {
            const y = parseInt(ymdMatch[1], 10);
            const m = parseInt(ymdMatch[2], 10);
            const d0 = parseInt(ymdMatch[3], 10);
            // 日付部分が1～31以外はエラー
            if (d0 < 1 || d0 > 31) {
                throw new Error('存在しない日付です');
            }
            const d = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d0).padStart(2, '0')}`);
            return formatDate(d);
        }
    }
    throw new Error('不正な入力形式です');
};

/**
 * 日付から元号表記（和暦）に変換し、複数形式で返す
 * @param {Date|string} date 日付（Date型または'YYYY-MM-DD'形式の文字列）
 * @returns {object} 戻り値オブジェクトの内容:
 *   - kanji: 元号＋年（例: "令和7年"、"平成元年"）
 *   - initial: 元号イニシャル＋年（JIS X 0301:2019準拠、例: "R07"、"H01"、元年は"01"）
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
            const initial = `${era.initial}${eraYear === 1 ? '01' : String(eraYear).padStart(2, '0')}`;
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

/**
 * 様々な日付入力から西暦の年（数値）だけを取り出す
 * @param {string|Date} date 例: "令和元年5月1日", "R1/5/1", "2019-05-01", "2025", Date
 * @returns {number} 西暦年（例: 2019）
 * @throws {Error} 解釈できない場合
 */
const convertToYear = (date) => {
    // 1) Dateオブジェクトならそのまま
    if (date instanceof Date) {
        if (isNaN(date.getTime())) throw new Error('不正な日付です');
        return date.getFullYear();
    }

    // 2) まず既存のconvertToSeirekiでフル日付として解釈を試みる
    if (typeof date === 'string') {
        try {
            const seireki = convertToSeireki(date); // 'YYYY-MM-DD' 形式
            const y = parseInt(seireki.slice(0, 4), 10);
            if (!isNaN(y)) return y;
        } catch (e) {
            // フル日付として解釈できないケース（元号のみ、年のみ等）はここでフォールバックする
        }

        // フォールバック: 元号のみ / 年のみ / 全角数字や漢数字を含むケースを処理
        const toHankaku = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
        const toHankakuAlpha = s => s.replace(/[Ａ-Ｚａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
        const kanjiNumReg = /[元一二三四五六七八九十百千〇]+/g;
        const kanjiToNumStr = s => s.replace(kanjiNumReg, m => _du_kanjiToNumber(m));
        const kanjiToInitial = s => {
            let result = s;
            _DU_ERAS.forEach(e => {
                result = result.replace(new RegExp(e.name, 'g'), e.initial);
            });
            return result;
        };

        let normalized = toHankakuAlpha(toHankaku(String(date)));
        normalized = kanjiToNumStr(normalized);
        normalized = kanjiToInitial(normalized);
        // 年月日や区切りを '-' に統一（ただし日付の存在は問いません）
        normalized = normalized.replace(/年|日|\/|\.|\s|月|\//g, '-');
        normalized = normalized.replace(/^-+|-+$/g, '');

        // 4桁の西暦年単独
        let m = normalized.match(/^(\d{4})$/);
        if (m) return parseInt(m[1], 10);
        // 文字列先頭に4桁西暦がある場合（例: '2025-5' や '2025/05/01' の正規化不足ケース）
        m = normalized.match(/^(\d{4})(?:-|$)/);
        if (m) return parseInt(m[1], 10);

        // 元号（イニシャル）パターン: 先頭がイニシャルのとき 年が続くか、次のパートに年がある
        // 例: 'R1', 'R01', 'R-1-5-1', 'R-1' , 'R1-5-1'
        const parts = normalized.split('-').filter(Boolean);
        if (parts.length > 0) {
            // 先頭がイニシャル単体もしくはイニシャル＋数字のパターン
            const head = parts[0];
            const headMatch = head.match(/^([A-Za-z])(?:?(\d+))?/i);
            // headMatch may be null in some engines due to invalid group, do alternative
            let initial = null, yearNum = null;
            if (/^[A-Za-z]\d*$/.test(head)) {
                // 'R1' や 'R01' のような形
                initial = head[0];
                const rest = head.slice(1);
                if (rest) yearNum = parseInt(rest, 10);
            } else if (/^[A-Za-z]$/.test(head) && parts.length >= 2 && /^\d+$/.test(parts[1])) {
                // 'R' '-' '1' のように分かれている場合
                initial = head[0];
                yearNum = parseInt(parts[1], 10);
            }

            if (initial) {
                if (!yearNum) {
                    // 年が指定されていない（例: 'R' 単体）は解釈できない
                    throw new Error('元号のみの指定は年が不明です');
                }
                if (yearNum === 0) yearNum = 1; // 0 が来たら元年扱い
                const era = _DU_ERAS.find(e => e.initial.toUpperCase() === initial.toUpperCase());
                if (era) {
                    return era.start.getFullYear() + yearNum - 1;
                }
            }
        }

        // 最後の手段: 文字列中の4桁を探す
        m = normalized.match(/(\d{4})/);
        if (m) return parseInt(m[1], 10);
    }

    throw new Error('不正な入力形式です');
};