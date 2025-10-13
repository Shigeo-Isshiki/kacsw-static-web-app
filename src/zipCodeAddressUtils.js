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

//　ライブラリ内の共通関数定義部
/**
 * 郵便番号・デジタルアドレス入力値を正規化する内部関数
 * - 全角英数字を半角に変換
 * - 記号・空白を除去
 * - 英字を大文字化
 * @param {string|number} zipCode 入力値（郵便番号またはデジタルアドレス）
 * @returns {string} 正規化済みの半角英数字（記号除去・大文字化済み）
 */
const _zc_normalizeZipCodeInput = (zipCode) => {
    return String(zipCode)
        .replace(_ZC_ZENKAKU_ALPHA_NUM_REG, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
        .toUpperCase()
        .replace(_ZC_SYMBOLS_REGEX, '');
};

//　ライブラリ本体部
/**
 * 郵便番号をハイフン付き（123-4567）にフォーマットする関数（APIで存在確認、callback型）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。
 * @param {function} callback - (result: { zipCode: string } | { error: string }) => void
 */
const formatZipCode = (zipCode, callback) => {
    const result = _zc_normalizeZipCodeInput(zipCode);
    fetch(`${_ZC_ZIPCODE_API_BASE_URL}/${result}`)
        .then(response => {
            if (response.status === 404) {
                callback({ error: '郵便番号が存在しません' });
                return null;
            }
            if (!response.ok) {
                callback({ error: `APIエラー（${response.status}）` });
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.addresses || data.addresses.length === 0) {
                callback({ error: '郵便番号が存在しません' });
                return null;
            }
            // 数字7桁ならハイフン付き、それ以外はそのまま
            if (/^\d{7}$/.test(result)) {
                callback({ zipCode: result.slice(0, 3) + '-' + result.slice(3) });
            } else {
                callback({ zipCode: result });
            }
        })
        .catch(() => {
            callback({ error: 'API接続エラー' });
        });
};

/**
 * 郵便番号を正規化（空白・記号除去、全角→半角、APIで存在確認、callback型）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。
 * @param {function} callback - (result: { zipCode: string } | { error: string }) => void
 */
const normalizeZipCode = (zipCode, callback) => {
    const result = _zc_normalizeZipCodeInput(zipCode);
    fetch(`${_ZC_ZIPCODE_API_BASE_URL}/${result}`)
        .then(response => {
            if (response.status === 404) {
                callback({ error: '郵便番号が存在しません' });
                return null;
            }
            if (!response.ok) {
                callback({ error: `APIエラー（${response.status}）` });
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;
            if (!data.addresses || data.addresses.length === 0) {
                callback({ error: '郵便番号が存在しません' });
                return null;
            }
            callback({ zipCode: result });
        })
        .catch(() => {
            callback({ error: 'API接続エラー' });
        });
};

/**
 * 郵便番号から都道府県名のみ取得する関数（API利用、コールバック型）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {function} callback - (prefName: string|null) => void 都道府県名（存在しない場合はnull）
 */
const getPrefectureByZipCode = (zipCode, callback) => {
    const result = _zc_normalizeZipCodeInput(zipCode);
    fetch(`${_ZC_ZIPCODE_API_BASE_URL}/${result}`)
        .then(response => {
            if (response.status === 404) {
                callback(null);
                return null;
            }
            if (!response.ok) {
                callback(null);
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.addresses || data.addresses.length === 0) {
                callback(null);
                return null;
            }
            callback(data.addresses[0].pref_name || null);
        })
        .catch(() => {
            callback(null);
        });
};

/**
 * 郵便番号から市区町村名のみ取得する関数（API利用、コールバック型）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {function} callback - (cityName: string|null) => void 市区町村名（存在しない場合はnull）
 */
const getCityByZipCode = (zipCode, callback) => {
    const result = _zc_normalizeZipCodeInput(zipCode);
    fetch(`${_ZC_ZIPCODE_API_BASE_URL}/${result}`)
        .then(response => {
            if (response.status === 404) {
                callback(null);
                return null;
            }
            if (!response.ok) {
                callback(null);
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.addresses || data.addresses.length === 0) {
                callback(null);
                return null;
            }
            callback(data.addresses[0].city_name || null);
        })
        .catch(() => {
            callback(null);
        });
};

/**
 * 郵便番号の存在チェック（APIで該当データがあるかだけ返す）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {function} callback - (exists: boolean) => void 存在する場合はtrue、存在しない場合はfalse
 */
const checkZipCodeExists = (zipCode, callback) => {
    const result = _zc_normalizeZipCodeInput(zipCode);
    fetch(`${_ZC_ZIPCODE_API_BASE_URL}/${result}`)
        .then(response => {
            if (response.status === 404) {
                callback(false);
                return null;
            }
            if (!response.ok) {
                callback(false);
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.addresses || data.addresses.length === 0) {
                callback(false);
                return null;
            }
            callback(true);
        })
        .catch(() => {
            callback(false);
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
 *   originalZipCode: '１２３－４５６７', // 入力値（記号・全角含む）
 *   normalizedZipCode: '1234567',      // 正規化済み（半角・記号除去・大文字化）
 *   apiZipCode: '1234567',             // API返却値（7桁数字のみ）
 *   zipCode: '123-4567',               // ハイフン付き郵便番号（表示用）
 *   zipCode1: '1', zipCode2: '2', ... zipCode7: '7', // 各桁分割
 *   address: '神奈川県横浜市西区みなとみらい', // 住所（都道府県＋市区町村＋町名＋番地等）
 *   prefName: '神奈川県',               // 都道府県
 *   cityName: '横浜市西区',             // 市区町村
 *   townName: 'みなとみらい',           // 町名
 *   blockName: '1-1-1',                // 番地（存在する場合）
 *   otherName: '○○マンション',          // その他住所（存在する場合）
 *   bizName: '株式会社○○'               // 事業所名（存在する場合）
 * }
 *
 * エラー時の例：
 * {
 *   error: 'APIへの接続に失敗しました: ...' // エラーメッセージ
 * }
 *
 */
const getAddressByZipCode = (zipCode, callback) => {
    const normalized = _zc_normalizeZipCodeInput(zipCode);
    fetch(`${_ZC_ZIPCODE_API_BASE_URL}/${normalized}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    callback({ error: `郵便番号／デジタルアドレス「${validatedZipCode}」に該当する住所が見つかりません` });
                    return null;
                } else if (response.status >= 500) {
                    callback({ error: 'サーバーエラーが発生しました' });
                    return null;
                } else {
                    callback({ error: `通信エラー（${response.status}）` });
                    return null;
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
                return null;
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
                return null;
            }
            if (result.addresses.length === 1) {
                if (!result) return null;
                if (!result.addresses || result.addresses.length === 0) {
                    callback({ error: '該当する住所データが見つかりませんでした。郵便番号／デジタルアドレスを確認してください。' });
                    return null;
                }
                let isInvalid = false;
                result.addresses.forEach((addressObj) => {
                    if (
                        !addressObj ||
                        addressObj.zip_code == null || typeof addressObj.zip_code !== 'string' ||
                        addressObj.pref_name == null || typeof addressObj.pref_name !== 'string' ||
                        addressObj.city_name == null || typeof addressObj.city_name !== 'string' ||
                        addressObj.town_name == null || typeof addressObj.town_name !== 'string' ||
                        (addressObj.block_name != null && typeof addressObj.block_name !== 'string') ||
                        (addressObj.other_name != null && typeof addressObj.other_name !== 'string') ||
                        (addressObj.biz_name != null && typeof addressObj.biz_name !== 'string')
                    ) {
                        isInvalid = true;
                    }
                });
                if (isInvalid) {
                    callback({ error: 'APIレスポンスが不正です（郵便番号・デジタルアドレス情報）' });
                    return null;
                }
                const addressObj = result.addresses[0];
                const fullAddress = [addressObj.pref_name, addressObj.city_name, addressObj.town_name, addressObj.block_name ? addressObj.block_name : ''].filter(Boolean).join('');
                let zipCodeLeft;
                let zipCodeRight;
                let zipCodeArray = [];
                for (let i = 0; i < addressObj.zip_code.length; i++) {
                    zipCodeArray.push(addressObj.zip_code[i]);
                    if (i <= 2) {
                        zipCodeLeft = (zipCodeLeft || '') + addressObj.zip_code[i];
                    } else if (i >= 3) {
                        zipCodeRight = (zipCodeRight || '') + addressObj.zip_code[i];
                    }
                }
                formatZipCode(addressObj.zip_code, (zipResult) => {
                    callback({
                        originalZipCode: zipCode,
                        normalizedZipCode: normalized,
                        apiZipCode: addressObj.zip_code,
                        zipCode: zipResult.zipCode || null,
                        zipCode1: zipCodeArray[0] || null,
                        zipCode2: zipCodeArray[1] || null,
                        zipCode3: zipCodeArray[2] || null,
                        zipCode4: zipCodeArray[3] || null,
                        zipCode5: zipCodeArray[4] || null,
                        zipCode6: zipCodeArray[5] || null,
                        zipCode7: zipCodeArray[6] || null,
                        address: fullAddress ? fullAddress.replace(/[\u3000\u0020]/g, '') : null,
                        prefName: addressObj.pref_name ? addressObj.pref_name.replace(/[\u3000\u0020]/g, '') : null,
                        cityName: addressObj.city_name ? addressObj.city_name.replace(/[\u3000\u0020]/g, '') : null,
                        townName: addressObj.town_name ? addressObj.town_name.replace(/[\u3000\u0020]/g, '') : null,
                        blockName: addressObj.block_name ? addressObj.block_name.replace(/[\u3000\u0020]/g, '') : null,
                        otherName: addressObj.other_name ? addressObj.other_name.replace(/[\u3000\u0020]/g, '') : null,
                        bizName: addressObj.biz_name ? addressObj.biz_name.replace(/[\u3000\u0020]/g, '') : null
                    });
                });
            } else {
                callback({ error: `郵便番号／デジタルアドレス「${result.addresses[0].zip_code}」に該当する住所が複数見つかりました。郵便番号／デジタルアドレスを確認して再検索してください。` });
            }
        })
        .catch(error => {
            callback({ error: `APIへの接続に失敗しました: ${error.message}` });
        });
};

/**
 * kintoneのスペースフィールドに郵便番号の処理に関する説明を表示・非表示する関数
 * @function
 * @param {string} spaceField - スペースフィールドのフィールドコード
 * @param {string} id - 出力する要素のID名（任意のもの）
 * @param {boolean} display - 表示する場合はtrue、非表示はfalse
 * @returns {void}
 * @description innerHTMLがあれば表示、なければ削除して非表示にします。
 */
const kintoneZipSpaceFieldText = (spaceField, id, display) => {
    if (
        typeof spaceField !== 'string' || !spaceField.trim() ||
        typeof id !== 'string' || !id.trim() ||
        typeof display !== 'boolean'
    ) {
        return;
    }
    // 既存要素削除
    const spaceFieldElementById = document.getElementById(id);
    if (spaceFieldElementById) {
        spaceFieldElementById.remove();
    }
    const spaceElement = kintone.app.record.getSpaceElement(spaceField);
    if (display) {
        // 表示
        const createSpaceFieldElement = document.createElement('div');
        createSpaceFieldElement.id = id;
        createSpaceFieldElement.innerHTML = '<div>郵便番号の代わりにデジタルアドレスでも検索可能です。<br>デジタルアドレスの場合は郵便番号に変換されます。</div>';
        if (spaceElement) {
            spaceElement.appendChild(createSpaceFieldElement);
            spaceElement.parentNode.style.display = '';
        }
    } else {
        // 非表示
        spaceElement.parentNode.style.display = 'none';
    }
    return;
};

/**
 * kintoneのスペースフィールドに「郵便番号から住所取得」ボタンを追加・削除する関数
 *
 * @function
 * @param {string} spaceField - スペースフィールドのフィールドコード
 * @param {string} id - ボタン要素のID名（任意のもの）
 * @param {string|undefined|null} title - ボタンラベル用のタイトル名。
 *   - 文字列: 「郵便番号から{title}住所を取得」ラベルで表示
 *   - undefined: 「郵便番号から住所を取得」ラベルで表示（デフォルト文言）
 *   - null/空文字: ボタン非表示（削除）
 * @param {string|number} zipCode - 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {function} [callback] - 住所取得結果を受け取るコールバック関数（省略可）。
 *   - 引数: result（住所情報オブジェクト or エラーオブジェクト）
 *   - 住所情報オブジェクト例: {
 *       originalZipCode, normalizedZipCode, apiZipCode, zipCode, zipCode1...zipCode7,
 *       address, prefName, cityName, townName, blockName, otherName, bizName
 *     }
 *   - エラー時: { error: エラーメッセージ }
 * @returns {void}
 * @description titleの値により表示制御：
 *   - 文字列なら「郵便番号から{title}住所を取得」ラベルで表示
 *   - undefinedなら「郵便番号から住所を取得」ラベルで表示
 *   - null/空文字ならボタン非表示（削除）
 *   ボタン押下時、callbackコールバックで住所取得結果を返します。
 */
const kintoneZipSetSpaceFieldButton = (spaceField, id, title, zipCode, callback) => {
    if (
        typeof spaceField !== 'string' || !spaceField.trim() ||
        typeof id !== 'string' || !id.trim() ||
        (title !== null && typeof title !== 'string') ||
        (zipCode !== null && typeof zipCode !== 'string' && typeof zipCode !== 'number') ||
        (callback !== undefined && typeof callback !== 'function' && callback !== null)
    ) {
        return;
    }
    // 既存ボタン削除
    const buttonElementById = document.getElementById(id);
    if (buttonElementById) {
        buttonElementById.remove();
    }
    if (title !== undefined && title !== null && title !== '') {
        // ボタン追加
        const button = document.createElement('button');
        button.id = id;
        const label = '郵便番号から' + title + '住所を取得';
        button.textContent = label;
        button.addEventListener('click', () => {
            getAddressByZipCode(zipCode, (result) => {
                // 呼び出し元で処理できるようにコールバックで返す
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        });
        const spaceElement = kintone.app.record.getSpaceElement(spaceField);
        if (spaceElement) {
            spaceElement.appendChild(button);
            setSpaceFieldDisplay(spaceField, true);
        }
    } else if (title === undefined) {
        // titleがundefinedの場合はデフォルト文言
        const button = document.createElement('button');
        button.id = id;
        button.textContent = '郵便番号から住所を取得';
        button.addEventListener('click', () => {
            getAddressByZipCode(zipCode, (result) => {
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        });
        const spaceElement = kintone.app.record.getSpaceElement(spaceField);
        if (spaceElement) {
            spaceElement.appendChild(button);
            setSpaceFieldDisplay(spaceField, true);
        }
    } else {
        // 非表示
        setSpaceFieldDisplay(spaceField, false);
    }
    return;
};