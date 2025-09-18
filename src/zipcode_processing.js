/**
 * 郵便番号処理用ユーティリティ関数群
 *
 * @fileoverview 郵便番号API（https://digital-address.app）を利用し、指定郵便番号に対応する住所を取得します。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_zp_)で始める
// リソースの読み込み制限を行っている場合は、fetch通信を下記のURLに対して許可する必要があります
// https://digital-address.app
'use strict';
/**
 * 郵便番号APIベースURL
 * @type {string}
 */
const _zp_ADDRESS_API_BASE_URL = 'https://digital-address.app';
/**
 * 郵便番号の左側の桁数
 * @type {number}
 */
const _zp_ZIPCODE_LEFT = 3;
/**
 * 郵便番号の桁数
 * @type {number}
 */
const _zp_ZIPCODE_LENGTH = 7;
/**
 * 郵便番号エラー種別定数
 * @enum {string}
 */
const _zp_ERROR_TYPE = {
    LOGIC: 'logic',
    AJAX: 'ajax',
    VALIDATION: 'validation',
    UNKNOWN: 'unknown'
};
/**
 * 郵便番号処理用の独自エラークラス
 * @class
 * @extends {Error}
 * @param {string} message エラーメッセージ
 * @param {'logic'|'ajax'|'validation'|'unknown'} [type='unknown'] エラー種別
 * @property {string} name エラー名（ZipcodeProcessingError）
 * @property {'logic'|'ajax'|'validation'|'unknown'} type エラー種別
 *
 * typeの用途:
 *   - 'logic': ロジックエラー（引数不正など）
 *   - 'ajax': 通信・API関連エラー
 *   - 'validation': バリデーションエラー
 *   - 'unknown': その他
 */
class _zp_ZipcodeProcessingError extends Error {
    /**
     * @param {string} message
     * @param {'logic'|'ajax'|'validation'|'unknown'} [type='unknown']
     */
    constructor(message, type = 'unknown') {
        super(message);
        this.name = 'ZipcodeProcessingError';
        this.type = type;
        // Node.js環境用: スタックトレースを正しくする
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
// 正規表現の事前コンパイル
const _zp_removeSymbolsReg = /[()（）\-‐－―—.．\/／ 　]/g;
const _zp_zenkakuAlphaNumReg = /[Ａ-Ｚａ-ｚ０-９]/g;
/**
 * 郵便番号／デジタルアドレスとして処理できる文字列に変換する関数（正規化）
 * @param {string|number|null|undefined} str - 入力された郵便番号／デジタルアドレス
 * @returns {string} 郵便番号／デジタルアドレスとして処理できる文字列
 * @throws {Error} 入力が空または数字または大文字英字以外が含まれている場合にエラーを投げる
 */
const _zp_getZipcodeOnly = (str) => {
    if (!str) {
        throw new _zp_ZipcodeProcessingError('郵便番号は文字列である必要があります', _zp_ERROR_TYPE.LOGIC);
    }
    // 全角英数字→半角英数字
    const toHalfWidthAlphaNum = s => s.replace(_zp_zenkakuAlphaNumReg, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
    // 半角化→大文字化→記号除去
    const result = toHalfWidthAlphaNum(String(str)).toUpperCase().replace(_zp_removeSymbolsReg, '');
    if (!result || !/^\d+$|^[A-Z0-9]+$/.test(result)) {
        throw new _zp_ZipcodeProcessingError(`郵便番号として無効です（数字・大文字英字以外の文字が含まれているか、数字・英字が含まれていません）: ${str}`, _zp_ERROR_TYPE.LOGIC);
    }
    return result;
};
const _zp_isZipcode7 = (str) => {
    const zipcodeNO = _zp_getZipcodeOnly(str);
    if (zipcodeNO.length !== _zp_ZIPCODE_LENGTH) {
        throw new _zp_ZipcodeProcessingError('郵便番号は7桁である必要があります', _zp_ERROR_TYPE.LOGIC);
    }
    return zipcodeNO.length === _zp_ZIPCODE_LENGTH;
};
const _zp_buildAddressString = (addr) => {
    return [
        addr.pref_name,
        addr.city_name,
        addr.town_name,
        addr.block_name ? addr.block_name : ''
    ].filter(Boolean).join('');
};
// --- APIレスポンスバリデーション ---
/**
 * 郵便番号・デジタルアドレスAPIレスポンスのバリデーション（内部関数）
 * @function
 * @param {object} result APIレスポンス
 * @throws {Error} 不正なレスポンスの場合
 * @private
 */
const _zp_validateZipcodeResponse = (result) => {
    result.addresses.forEach((addr) => {
        if (
            !addr ||
            addr.zip_code == null || typeof addr.zip_code !== 'string' ||
            addr.pref_name == null || typeof addr.pref_name !== 'string' ||
            addr.city_name == null || typeof addr.city_name !== 'string' ||
            addr.town_name == null || typeof addr.town_name !== 'string' ||
            (addr.block_name != null && typeof addr.block_name !== 'string') ||
            (addr.other_name != null && typeof addr.other_name !== 'string') ||
            (addr.biz_name != null && typeof addr.biz_name !== 'string')
        ) {
            throw new _zp_ZipcodeProcessingError('APIレスポンスが不正です（郵便番号・デジタルアドレス情報）', _zp_ERROR_TYPE.AJAX);
        }
    });
};

// メイン処理
/**
 * 郵便番号を分解して配列にする関数
 * @param {string} zipcode - 郵便番号
 * @returns {string[]} 郵便番号の各桁を要素とする配列（0=先頭桁、6=末尾桁）
 */
const zipcodeSeparation = (zipcode) => {
    const zipcodeNO = _zp_getZipcodeOnly(zipcode);
    _zp_isZipcode7(zipcodeNO);
    let separation = [];
    for (let c = 0; c < zipcodeNO.length; c++) {
        separation.push(zipcodeNO[c]);
    }
    return separation;
};

/**
 * 郵便番号を整形する関数
 * @param {string} zipcode - 郵便番号
 * @returns {string} 整形された郵便番号（3桁-4桁）
 */
const zipcodeFormatting = (zipcode) => {
    const zipcodeNO = _zp_getZipcodeOnly(zipcode);
    _zp_isZipcode7(zipcodeNO);
    const zip_code_left = zipcodeNO.substring(0,_zp_ZIPCODE_LEFT);
    const zip_code_right = zipcodeNO.substring(_zp_ZIPCODE_LEFT,_zp_ZIPCODE_LENGTH);
    const result = zip_code_left + '-' + zip_code_right;
    return result;
};

/**
 * @typedef {Object} ZipcodeAddressResult
 * @property {string|null} zip_code         - 整形済み郵便番号（例: '123-4567'）
 * @property {string|null} address          - 住所（都道府県＋市区町村＋町名＋番地等）
 * @property {string|null} pref             - 都道府県名
 * @property {string|null} city             - 市区町村名
 * @property {string|null} town             - 町名
 * @property {string|null} block            - 番地
 * @property {string|null} other_address    - その他住所
 * @property {string|null} office           - 事業所名（APIのbiz_nameをofficeに変換）
 * @property {string|null} zip_code_1       - 郵便番号1桁目
 * @property {string|null} zip_code_2       - 郵便番号2桁目
 * @property {string|null} zip_code_3       - 郵便番号3桁目
 * @property {string|null} zip_code_4       - 郵便番号4桁目
 * @property {string|null} zip_code_5       - 郵便番号5桁目
 * @property {string|null} zip_code_6       - 郵便番号6桁目
 * @property {string|null} zip_code_7       - 郵便番号7桁目
 */
/**
 * 郵便番号から住所を取得する関数
 * @param {string} zipcode - 郵便番号
 * @param {(result: ZipcodeAddressResult) => void} successCallback - 住所取得後に呼び出されるコールバック
 * @param {(err: Error) => void} [failureCallback] - 住所取得失敗時に呼び出されるコールバック
 */
const getZipcodeAddress = (zipcode, successCallback, failureCallback) => {
    if (typeof successCallback !== 'function') throw new _zp_ZipcodeProcessingError('住所取得後に呼び出されるコールバックは関数である必要があります', _zp_ERROR_TYPE.LOGIC);
    if (failureCallback !== undefined && typeof failureCallback !== 'function') {
        throw new _zp_ZipcodeProcessingError('住所取得失敗時に呼び出されるコールバックは関数または未指定である必要があります', _zp_ERROR_TYPE.LOGIC);
    }
    const zipcodeNO = _zp_getZipcodeOnly(zipcode);
    if (zipcodeNO.length !== _zp_ZIPCODE_LEFT && zipcodeNO.length !== _zp_ZIPCODE_LENGTH) {
        throw new _zp_ZipcodeProcessingError('郵便番号は3桁または7桁である必要があります', _zp_ERROR_TYPE.LOGIC);
    }
        fetch(`${_zp_ADDRESS_API_BASE_URL}/${zipcodeNO}`)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new _zp_ZipcodeProcessingError(`郵便番号／デジタルアドレス「${zipcodeNO}」に該当する住所が見つかりません`, _zp_ERROR_TYPE.AJAX);
                    } else if (response.status >= 500) {
                        throw new _zp_ZipcodeProcessingError('サーバーエラーが発生しました', _zp_ERROR_TYPE.AJAX);
                    } else {
                        throw new _zp_ZipcodeProcessingError(`通信エラー（${response.status}）`, _zp_ERROR_TYPE.AJAX);
                    }
                }
                // JSONパースエラーも個別に捕捉
                return response.json().catch(() => {
                    throw new _zp_ZipcodeProcessingError('APIレスポンスのJSONパースに失敗しました', _zp_ERROR_TYPE.AJAX);
                });
            })
            .then(result => {
                _zp_validateZipcodeResponse(result);
                if (result.addresses.length === 1) {
                    const addr = result.addresses[0];
                    const address = _zp_buildAddressString(addr);
                    const zipcode_sep = zipcodeSeparation(addr.zip_code);
                    successCallback({
                        zip_code: addr.zip_code ? zipcodeFormatting(addr.zip_code) : null,
                        address: address ? address.replace(/[\u3000\u0020]/g, '') : null,
                        pref: addr.pref_name ? addr.pref_name.replace(/[\u3000\u0020]/g, '') : null,
                        city: addr.city_name ? addr.city_name.replace(/[\u3000\u0020]/g, '') : null,
                        town: addr.town_name ? addr.town_name.replace(/[\u3000\u0020]/g, '') : null,
                        block: addr.block_name ? addr.block_name.replace(/[\u3000\u0020]/g, '') : null,
                        other_address: addr.other_name ? addr.other_name.replace(/[\u3000\u0020]/g, '') : null,
                        office: addr.biz_name ? addr.biz_name.replace(/[\u3000\u0020]/g, '') : null, // APIのbiz_nameはofficeとして返却する
                        zip_code_1: zipcode_sep[0] || null,
                        zip_code_2: zipcode_sep[1] || null,
                        zip_code_3: zipcode_sep[2] || null,
                        zip_code_4: zipcode_sep[3] || null,
                        zip_code_5: zipcode_sep[4] || null,
                        zip_code_6: zipcode_sep[5] || null,
                        zip_code_7: zipcode_sep[6] || null
                    });
                } else {
                    if (failureCallback) {
                        failureCallback(new _zp_ZipcodeProcessingError(`郵便番号／デジタルアドレス「${zipcode}」に該当する住所が複数見つかりました。郵便番号／デジタルアドレスを確認して再検索してください。`, _zp_ERROR_TYPE.AJAX));
                    }
                }
            })
            .catch(err => {
                if (failureCallback) {
                    if (!(err instanceof _zp_ZipcodeProcessingError)) {
                        err = new _zp_ZipcodeProcessingError(err && err.message ? err.message : 'ネットワークエラーまたは不明なエラー', _zp_ERROR_TYPE.AJAX);
                    }
                    failureCallback(err);
                }
            });
};

// ここ以下は、従来のjQueryプラグインとして実装されていた郵便番号処理プログラムをレガシー互換のため残しているだけです。
// 互換性維持のため、呼び出し元にプログラム改修が完了しない限りはこのままにして下さい。
// 郵便番号処理プログラム
// 作成者：一色
// この処理プログラムを使用する場合は、jQueryを合わせて読み込む必要があります
// リソースの読み込み制限を行っている場合は、Ajax通信のhttps://digital-address.app/を許可する必要があります
(($) => {
    'use strict';
    const hyphen_removal = (char) => {

        // 入力された文字列から郵便番号に使われるハイフンを取り除く関数
        // （入力値）
        // char = 文字列
        // （出力値） = ハイフンが取り除かれた郵便番号文字列
        if (char) { // 文字列がある場合
            const result = char.replace(/[\-‐－]/g, '');
            return result;
        }
        return '';
    };

    $.zipcode_to_address = (zip_code) => {

        // 郵便番号もしくはデジタルアドレスに基づいた住所を取得する関数
        // （入力値）
        // zip_code = 郵便番号もしくはデジタルアドレスに相当する文字列
        // （出力値）
        // .zip_code = 3桁数字＋-＋4桁数字の郵便番号（デジタルアドレスは返さない）
        // .address = 郵便番号に該当する都道府県名＋市町村名＋町名（入力された郵便番号が個別事業所の場合、デジタルアドレスの場合は番地も含む全住所）
        // .pref = 郵便番号に該当する都道府県名
        // .city = 郵便番号に該当する市町村名
        // .town = 郵便番号に該当する町名
        // .block = （デジタルアドレスの場合のみ）番地
        // .other_address = （デジタルアドレスの場合のみ）番地よりも先の住所
        // .office = 大口事業所の個別番号の場合、郵便番号に該当する事業所名
        // .zip_code_1 = 郵便番号の1桁目の数字
        // .zip_code_2 = 郵便番号の2桁目の数字
        // .zip_code_3 = 郵便番号の3桁目の数字
        // .zip_code_4 = 郵便番号の4桁目の数字
        // .zip_code_5 = 郵便番号の5桁目の数字
        // .zip_code_6 = 郵便番号の6桁目の数字
        // .zip_code_7 = 郵便番号の7桁目の数字
        // zip_codeに間違いがある場合は、不要な記号を除去した値を返却
        // zip_code以外存在しない場合や間違いのある場合はnull値を返却
        let address = { // 返却する値を格納する変数
            'zip_code': null,
            'address': null,
            'pref': null,
            'city': null,
            'town': null,
            'block': null,
            'other_address': null,
            'office': null,
            'zip_code_1': null,
            'zip_code_2': null,
            'zip_code_3': null,
            'zip_code_4': null,
            'zip_code_5': null,
            'zip_code_6': null,
            'zip_code_7': null
        };
        const zip_code_f = $.zipcode_formatting(zip_code);
        address.zip_code = zip_code_f;
        const zip_code_f_hr = hyphen_removal(zip_code_f)
        if (zip_code_f && zip_code_f.length === 8) { // 郵便番号文字列が空白でなく、8文字である場合
            const url = 'https://digital-address.app/' + zip_code_f_hr;
            $.ajax({
                'url': url,
                'dataType': 'json',
                'async': false
            }).done((success) => {
                if (!success.error) { // 郵便番号を検索できた場合
                    if (success.addresses.length === 1) { // 結果が1件のみの時
                        const zip_code = success.addresses[0].zip_code;
                        if (zip_code.length === 7) { // 郵便番号が7桁の場合
                            address.zip_code = $.zipcode_formatting(zip_code);
                            const zipcode_sep = $.zipcode_separation(address.zip_code);
                            zipcode_sep.forEach((row, c) => {
                                const zipcode_c = c + 1;
                                const zipcode_fieldname = 'zip_code_' + zipcode_c;
                                address[zipcode_fieldname] = row;
                            });
                        }
                        address.address = success.addresses[0].pref_name + success.addresses[0].city_name + success.addresses[0].town_name;
                        if (success.addresses[0].block_name) { // データに番地がある場合
                            address.address += success.addresses[0].block_name;
                            address.block = success.addresses[0].block_name;
                            if (success.addresses[0].biz_name) { // 大口事業所の個別番号の場合
                                address.office = success.addresses[0].biz_name;
                            } else if (success.addresses[0].other_name) { // デジタルアドレスの場合
                                address.other_address = success.addresses[0].other_name;
                            }
                        }
                        address.address = address.address.replace(/[\u3000\u0020]/g, '');
                        address.pref = success.addresses[0].pref_name.replace(/[\u3000\u0020]/g, '');
                        address.city = success.addresses[0].city_name.replace(/[\u3000\u0020]/g, '');
                        address.town = success.addresses[0].town_name.replace(/[\u3000\u0020]/g, '');
                    }
                }
            });
        }
        return address;
    };

    $.zipcode_formatting = (zip_code) => {

        // 入力された郵便番号を3桁文字列＋-＋4桁文字列に変換する関数
        // （入力値）
        // zip_code = 郵便番号文字列
        // （出力値） = 3桁文字列＋-＋4桁文字列の郵便番号文字列
        const convert_to_single_byte_numbers = (char) => {

            // 入力された文字列から全角英数字を半角英数字に直す関数
            // （入力値）
            // char = 文字列
            // （出力値） = 半角数字
            const result = String(char).replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char_conv) => {
                return String.fromCharCode(char_conv.charCodeAt(0) - 0xFEE0);
            });
            return result;
        };
        if (zip_code) { // 郵便番号文字列がある場合
            const zip_code_hr = hyphen_removal(zip_code);
            const zip_code_sbn = convert_to_single_byte_numbers(zip_code_hr);
            if (zip_code_sbn.length === 7) { // ハイフンを除去し半角英数字に直した郵便番号文字列の文字数が7桁の場合
                const zip_code_left = zip_code_sbn.substring(0,3);
                const zip_code_right = zip_code_sbn.substring(3);
                const result = zip_code_left + '-' + zip_code_right;
                return result;
            }
            return zip_code_sbn;
        }
        return zip_code;
    };

    $.zipcode_separation = (zip_code) => {

        // 郵便番号の7桁の数字をすべて1文字ずつ分離する関数
        // （入力値）
        // zip_code = 郵便番号に相当する文字列
        // （出力値）
        // [0]～[6] = 郵便番号のうち数字部分の1桁目～7桁目（c桁目と出力される配列の数字が-1になることに注意）
        let separation = [];
        for (let c = 0; c < 8; c++) {
            if (zip_code && zip_code.length === 8) { // 郵便番号文字列が空白でなく、8文字である場合
                if (zip_code[c] !== '-') { // 郵便番号文字列のc文字目がハイフン以外の場合
                    separation.push(zip_code[c]);
                }
            } else if (c !== 4) { // 郵便番号文字列がなく、カウントが4ではない場合
                separation.push('');
            }
        }
        return separation;
    };
})(jQuery);