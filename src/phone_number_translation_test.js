/**
 * 電話番号統一フォーマット処理用ユーティリティ関数群
 * このプログラムは、電話番号のフォーマットを統一するためのものです。
 * 電話番号の市外局番、携帯電話番号等の電気通信番号の指定通信番号の桁数、市内局番の桁数、もしくは局番の桁数を考慮してハイフン位置を修正します。
 * また、電話番号の入力に使用される可能性のある全角数字や記号を半角数字に変換し、不要な記号を削除します。
 * 電話番号データのJSONファイル（phone_number_data.json）は、2025年8月1日現在の総務省の公開情報（https://www.soumu.go.jp/main_sosiki/joho_tsusin/top/tel_number/index.html）に基づいています。
 * なお、このプログラムは日本国内の利用者設備識別番号のうちIMSIを除いた番号に特化しており、国際電話番号には対応していません。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_pn_)で始める
'use strict';
import phoneNumberData from './phone_number_data.json';
// データ参照用関数
const _pn_getAreaCodeInfo = (codeLength, code) => {
    return phoneNumberData.areaCodeList[codeLength]?.[code];
}
const _pn_getAreaCodeList = () => {
    return Object.keys(phoneNumberData.areaCodeList).map(Number).sort((a, b) => b - a);
}
const _pn_getLocalAreaCodeRange = (code) => {
    return phoneNumberData.areaCodeRanges[code];
}
const _pn_isDigit11PhoneNumberRange = (code) => {
    return phoneNumberData.digit11PhoneNumberRange.includes(code);
}
const _pn_isNotLandlinePhoneNumberRange = (code) => {
    return phoneNumberData.notLandlinePhoneNumberRange.includes(code);
}
// --- サブ処理 ---
/**
 * 電話番号として処理できる数字のみの文字列に変換する関数
 * @param {string|number|null|undefined} str - 入力された文字列
 * @returns {string|null} 電話番号として処理できる数字のみの文字列、もしくはnull
 */
const _pn_getPhoneNumberOnly = (str) => {
    if (!str) return null;
    return String(str)
        .replace(/[()（）\-‐－]/g, '') // 記号除去
        .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)); // 全角数字→半角
};

// --- メイン処理 ---
/**
 * 電話番号のハイフン位置を修正する関数
 * @param {string|number|null|undefined} telephoneNumber - 入力された電話番号
 * @returns {string|null} ハイフン位置を修正した電話番号、もしくはnull
 */
const phone_number_formatting = (telephoneNumber) => {
    if (telephoneNumber) { // 電話番号文字列がある場合
        const telephoneNumberPNO = _pn_getPhoneNumberOnly(telephoneNumber);
        const areaCodeList = _pn_getAreaCodeList();
        for(let c = 0, l = areaCodeList.length; c < l; c++){
            let areaCodeLen = areaCodeList[c];
            let telephoneNumber_area_code = telephoneNumberPNO.substring(0, areaCodeLen);
            let localAreaCodeLen = _pn_getAreaCodeInfo(areaCodeLen, telephoneNumber_area_code);
            if (localAreaCodeLen) { // 市内局番等に相当する文字数がある場合
                let landlineFlag = false;
                let rejectFlag = false;
                const local_code = Number(telephoneNumberPNO.substring(areaCodeLen, areaCodeLen + localAreaCodeLen));
                if (_pn_isDigit11PhoneNumberRange(telephoneNumber_area_code)) {
                    // 11桁の表記の電気通信番号の場合
                    if (telephoneNumberPNO.length !== 11) { // 電話番号が11桁以外の場合
                        return telephoneNumberPNO;
                    }
                } else {
                    switch (telephoneNumber_area_code) { // 市外局番等別の処理
                        case '0200': // データ伝送携帯電話番号（14桁固定）
                            if (telephoneNumberPNO.length !== 14) { // 電話番号が14桁以外の場合
                                return telephoneNumberPNO;
                            }
                            break;
                        case '091': // 特定接続電話番号（6～13桁変動）
                            if (telephoneNumberPNO.length < 6 || telephoneNumberPNO.length > 13) { // 電話番号が6桁未満もしくは13桁以上の場合
                                return telephoneNumberPNO;
                            }
                            break;
                        default : // それ以外（10桁固定）
                            if (telephoneNumberPNO.length !== 10) { // 電話番号が10桁以外の場合
                                return telephoneNumberPNO;
                            } else if (!_pn_isNotLandlinePhoneNumberRange(telephoneNumber_area_code)) { // 電気通信番号が固定電話番号である場合
                                landlineFlag = true;
                            }
                            break;
                    }
                }
                if (landlineFlag) { // 固定電話の場合
                    if (Number(String(local_code).substring(0, 1)) <= 1) { // 市内局番の1桁目が0と1の場合
                        rejectFlag = true;
                    }
                    if (!rejectFlag) { // 変換拒否フラグが立っていない場合
                        const range = _pn_getLocalAreaCodeRange(telephoneNumber_area_code);
                        if (!range) { // 指定した市外局番が存在しない場合
                            rejectFlag = true;
                        } else { // 指定した市外局番が存在する場合
                            rejectFlag = !range.some(([min, max]) => local_code >= min && local_code <= max); // 市内局番として存在しない場合は、rejectFlagをtrueにする
                        }
                    }
                } else { // 固定電話以外の場合
                    const local_area_code_flag = _pn_getLocalAreaCodeRange(telephoneNumber_area_code);
                    if (!local_area_code_flag) { // 指定した電気通信番号が範囲指定が定められていない場合
                        return telephoneNumberPNO;
                    } else { // 指定した電気通信番号が存在する場合
                        if (!local_area_code_flag.some(([min, max]) => local_code >= min && local_code <= max)) { // 電気通信番号の局番として存在しない場合
                            return telephoneNumberPNO;
                        };
                    }
                }
                if (!rejectFlag) { // ハイフン位置が確定できる条件の場合
                    const subscriber_number = telephoneNumberPNO.substring(areaCodeLen + localAreaCodeLen);
                    return subscriber_number
                        ? `${telephoneNumber_area_code}-${local_code}-${subscriber_number}`
                        : `${telephoneNumber_area_code}-${local_code}`;
                }
            }   
        }
        return telephoneNumberPNO;
    } else { // 電話番号文字列がない場合
        return null;
    }
};
