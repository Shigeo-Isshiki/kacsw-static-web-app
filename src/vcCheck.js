/** ビデオ会議ツールに関する処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_vc_)で始める
'use strict';
//　ライブラリ内の共通定数・変換テーブル定義部

//　ライブラリ内の共通関数定義部
/**
 * 文字列が文字列型であることを確認する関数
 * @param {*} str 確認する文字列
 * @returns {boolean} 文字列である = true、文字でない = false
 */
const _vc_checkString = (str) => {
    return typeof str === 'string';
};

/**
 * 文字列の中の全角英数字・記号・スペースを半角に変換し、
 * 変換後に半角英数字・記号・スペース以外が含まれていればエラーを投げる関数
 * @param {string} str 変換対象の文字列
 * @returns {string} 半角英数字・記号・スペースに変換した文字列
 * @throws {Error} 半角英数字・記号・スペース以外が含まれている場合
 */
const _vc_toHalfWidth = (str = '') => {
    if (!_vc_checkString(str)) throw new Error('変換対象は文字列である必要があります');
    if (!str) throw new Error('変換対象の文字列が空です');
    const hyphenProcessed = str.replace(_TS_HYPHEN_REGEX, '-');
    // 全角英数字・記号・スペースを半角に変換
    const converted = hyphenProcessed.replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                        .replace(/\u3000/g, ' ');
    // 半角英数字・記号・スペース以外が含まれていればエラー
    if (/[^\x20-\x7E]/.test(converted)) {
        const invalid = converted.match(/[^\x20-\x7E]/)[0];
        throw new Error(`半角英数字・記号・スペース以外の文字が含まれています: ${invalid}`);
    }
    return converted;
};

//　ライブラリ本体部

/**
 * ZoomミーティングIDまたはウェビナーIDを半角化し、正しい形式かどうかを判定する関数
 * 半角数字と空白のみ許容し、空白を除いた数字がミーティングIDなら10桁または11桁、
 * ウェビナーIDなら11桁のみ許容。不正ならthrow。
 * @param {string} id チェック対象のID
 * @param {boolean} [isWebinar=false] ウェビナーIDの場合はtrue（省略時はミーティングIDとして判定）
 * @returns {string} 変換後のID（正しい場合）
 * @throws {Error} 不正な場合は例外
 */
const validateZoomMeetingId = (id, isWebinar = false) => {
    if (!_vc_checkString(id)) throw new Error('IDは文字列である必要があります');
    if (typeof isWebinar !== 'boolean') throw new Error('isWebinarはboolean型である必要があります');
    const halfWidthId = _vc_toHalfWidth(id);
    if (!/^[0-9 ]+$/.test(halfWidthId)) throw new Error('IDは半角数字と空白のみ許容されます');
    const digits = halfWidthId.replace(/ /g, '');
    if (isWebinar) {
        if (digits.length !== 11) throw new Error('ウェビナーIDは空白を除いて11桁の半角数字である必要があります');
    } else {
        if (!(digits.length === 10 || digits.length === 11)) throw new Error('ミーティングIDは空白を除いて10桁または11桁の半角数字である必要があります');
    }
    return halfWidthId;
};
