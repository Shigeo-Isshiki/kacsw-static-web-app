/** 郵便番号から住所などを出力する処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_zc_)で始める
'use strict';
//　ライブラリ内の共通定数・変換テーブル定義部
// 郵便番号APIベースURL
const _ZC_ZIPCODE_API_BASE_URL = 'https://digital-address.app';

// 郵便番号で使用される可能性のある記号を検出するための正規表現
const _ZC_SYMBOLS_REGEX = /[\-－‐‑–—−ー― 　]/g;

// 全角英数字を検出するための正規表現
const _ZC_ZENKAKU_ALPHA_NUM_REG = /[Ａ-Ｚａ-ｚ０-９]/g;

//　ライブラリ本体部
/**
 * 郵便番号をハイフン付き（123-4567）にフォーマットする関数
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @returns {string} ハイフン付き郵便番号（7桁でない場合は正規化した文字列をそのまま返す）
 * @throws {Error} 入力値が7桁の半角英数字でない場合は例外がthrowされます。
 */
const formatZipCode = (zipCode) => {
    const normalized = normalizeZipCode(zipCode);
    if (/^\d{7}$/.test(normalized)) {
        return normalized.slice(0, 3) + '-' + normalized.slice(3);
    }
    return normalized;
};

/**
 * 郵便番号が7桁の半角数字かどうか判定する関数
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @returns {boolean} 7桁の半角数字である場合はtrue、それ以外はfalse
 * @throws {Error} 入力値が7桁の半角英数字でない場合は例外がthrowされます。
 */
const isValidZipCode = (zipCode) => {
    const normalized = normalizeZipCode(zipCode);
    return /^\d{7}$/.test(normalized);
};

/**
 * 郵便番号を正規化（空白・記号除去、全角→半角）する関数
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @returns {string} 正規化された郵便番号（7桁の半角英数字）
 * @throws {Error} 入力値が7桁の半角英数字でない場合は例外がthrowされます。
 */
const normalizeZipCode = (zipCode) => {
    if (!zipCode) {
        throw new Error('郵便番号／デジタルアドレスが空です');
    }
    // 全角英数字→半角英数字
    const toHalfWidthAlphaNum = s => s.replace(_ZC_ZENKAKU_ALPHA_NUM_REG, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
    // 半角化→大文字化→記号除去
    const result = toHalfWidthAlphaNum(String(zipCode)).toUpperCase().replace(_ZC_SYMBOLS_REGEX, '');
    if (!result || !/^[A-Z0-9]{7}$/.test(result)) {
        throw new Error(`郵便番号／デジタルアドレスは半角英数字7桁のみである必要があります。不正な値: ${result}`);
    }
    return result;
};

/**
 * 郵便番号から都道府県名のみ取得する関数（API利用、コールバック型）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {function} callback - (prefName: string|null) => void 都道府県名（存在しない場合はnull）
 * @throws {Error} 入力値が7桁の半角英数字でない場合は例外がthrowされます。
 */
const getPrefectureByZipCode = (zipCode, callback) => {
    getAddressByZipCode(zipCode, result => {
        if (result && result.pref) {
            callback(result.pref);
        } else {
            callback(null);
        }
    });
};

/**
 * 郵便番号から市区町村名のみ取得する関数（API利用、コールバック型）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {function} callback - (cityName: string|null) => void 市区町村名（存在しない場合はnull）
 * @throws {Error} 入力値が7桁の半角英数字でない場合は例外がthrowされます。
 */
const getCityByZipCode = (zipCode, callback) => {
    getAddressByZipCode(zipCode, result => {
        if (result && result.city) {
            callback(result.city);
        } else {
            callback(null);
        }
    });
};

/**
 * 郵便番号の存在チェック（APIで該当データがあるかだけ返す）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {function} callback - (exists: boolean) => void 存在する場合はtrue、存在しない場合はfalse
 * @throws {Error} 入力値が7桁の半角英数字でない場合は例外がthrowされます。
 */
const checkZipCodeExists = (zipCode, callback) => {
    getAddressByZipCode(zipCode, result => {
        callback(!!(result && result.zip_code));
    });
};

/**
 * 郵便番号またはデジタルアドレスから住所情報を取得する関数（API利用、コールバック型）
 * 指定した7桁の半角英数字（郵便番号またはデジタルアドレス）をAPIに問い合わせ、該当する住所情報をコールバックで返します。
 *
 * @param {string|number} zipCode - 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {function} callback - 取得結果を受け取るコールバック関数。引数は以下のいずれか：
 *   - 住所情報オブジェクト（下記参照）
 *   - エラー時は { error: エラーメッセージ }
 *
 * 住所情報オブジェクトの例：
 * {
 *   zip_code: '123-4567', // ハイフン付き郵便番号
 *   address: '神奈川県横浜市西区みなとみらい', // 住所（都道府県＋市区町村＋町名＋番地等）
 *   pref: '神奈川県', // 都道府県
 *   city: '横浜市西区', // 市区町村
 *   town: 'みなとみらい', // 町名
 *   block: '1-1-1', // 番地（存在する場合）
 *   other_address: '○○マンション', // その他住所（存在する場合）
 *   office: '株式会社○○', // 事業所名（存在する場合）
 *   zip_code_1: '1', zip_code_2: '2', ... zip_code_7: '7' // 各桁分割
 * }
 *
 * エラー時の例：
 * {
 *   error: 'APIへの接続に失敗しました: ...' // エラーメッセージ
 * }
 *
 * @throws {Error} 入力値が7桁の半角英数字でない場合は例外がthrowされます。
 *         API通信やレスポンスエラーはcallbackで返却されます。
 */
const getAddressByZipCode = (zipCode, callback) => {
    const validatedZipCode = normalizeZipCode(zipCode); // 入力値不正はthrowで即座に例外
    fetch(`${_ZC_ZIPCODE_API_BASE_URL}/${validatedZipCode}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    callback({ error: `郵便番号／デジタルアドレス「${validatedZipCode}」に該当する住所が見つかりません` });
                    return;
                } else if (response.status >= 500) {
                    callback({ error: 'サーバーエラーが発生しました' });
                    return;
                } else {
                    callback({ error: `通信エラー（${response.status}）` });
                    return;
                }
            }
            // JSONパースエラーも個別に捕捉
            return response.json().catch(() => {
                callback({ error: 'APIレスポンスのJSONパースに失敗しました' });
                return null;
            });
        })
        .then(result => {
            if (!result) return;
            if (!result.addresses || result.addresses.length === 0) {
                callback({ error: '該当する住所データが見つかりませんでした。郵便番号／デジタルアドレスを確認してください。' });
                return;
            }
            let invalid = false;
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
                    invalid = true;
                }
            });
            if (invalid) {
                callback({ error: 'APIレスポンスが不正です（郵便番号・デジタルアドレス情報）' });
                return;
            }
            if (result.addresses.length === 1) {
                const addr = result.addresses[0];
                const address = [addr.pref_name, addr.city_name, addr.town_name, addr.block_name ? addr.block_name : ''].filter(Boolean).join('');
                let zipcode_left;
                let zipcode_right;
                let zipcode_sep = [];
                for (let c = 0; c < addr.zip_code.length; c++) {
                    zipcode_sep.push(addr.zip_code[c]);
                    if (c <= 2) {
                        zipcode_left = (zipcode_left || '') + addr.zip_code[c];
                    } else if (c >= 3) {
                        zipcode_right = (zipcode_right || '') + addr.zip_code[c];
                    }
                }
                callback({
                    zip_code: addr.zip_code ? formatZipCode(addr.zip_code) : null,
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
                callback({ error: `郵便番号／デジタルアドレス「${result.addresses[0].zip_code}」に該当する住所が複数見つかりました。郵便番号／デジタルアドレスを確認して再検索してください。` });
            }
        })
        .catch(error => {
            callback({ error: `APIへの接続に失敗しました: ${error.message}` });
        });
};