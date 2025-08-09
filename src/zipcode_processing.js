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