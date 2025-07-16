// 金融機関処理プログラム
// 作成者：一色
// この処理プログラムを使用する場合は、luxon、jQuery、national_holiday_handling.jsを合わせて読み込む必要があります
// リソースの読み込み制限を行っている場合は、Ajax通信のhttps://bank.teraren.com/を許可する必要があります
// 2025-07-04 法人略語のうち社会福祉協議会について、略語を使うと名義人エラーになることがあるため使用しないように変更しました。
// 2025-06-28 $.convert_to_account_holder関数について、ハイフンの文字を半角ハイフンに統一する処理を追加しました。
// 2025-06-28 $.check_Designate_transfer_date（振込指定日が銀行営業日であるかどうかを確認する関数）、$.byte_number（入力された文字列のバイト数を返す関数）、$.byte_slice（入力された文字列を指定したバイト数で近似で切り取る関数）、各関数を追加しました。
(($) => {
    'use strict';
    const convert_to_single_byte_number = (char) => {

        // 入力された文字列から全角数字を半角数字に直す関数
        // （入力値）
        // char = 文字列
        // （出力値） = 半角数字
        const result = String(char).replace(/[０-９]/g, (char_conv) => {
            return String.fromCharCode(char_conv.charCodeAt(0) - 0xFEE0);
        });
        return result;
    };

    $.bank_find = (bank_char) => {

        // 銀行番号若しくは銀行名のいずれかの文字列から銀行番号・銀行名・銀行名（カナ）を返す関数
        // （入力値）
        // bank_char = 銀行文字列
        // （出力値）
        // .bank_number = 銀行番号
        // .bank_name = 銀行名
        // .bank_name_kana = 銀行名（カナ）
        // bankcharに該当するものがなければ、すべてnull値を返却する
        let bank_info = {
            'bank_number': null,
            'bank_name': null,
            'bank_name_kana': null
        };
        if (bank_char) { // 銀行文字列がある場合
            const bank_char_sbn = Number(convert_to_single_byte_number(bank_char));
            if (bank_char_sbn >= 0 && bank_char_sbn <= 9999) { // 銀行文字列が銀行番号と思われる文字列の場合
                const bank_number_temp = '0000' + String(bank_char_sbn);
                const bank_number = bank_number_temp.slice(-4);
                $.ajax({ // ajax通信でhttps://bank.teraren.com/banks/から銀行番号で銀行データをJSON形式で取得
                    'url': 'https://bank.teraren.com/banks/' + bank_number + '.json',
                    'dataType': 'json',
                    'async': false,
                }).done((success) => { // 通信に成功した場合
                    bank_info = {
                        'bank_number': success.code,
                        'bank_name': success.normalize.name,
                        'bank_name_kana': success.kana
                    };
                });
            } else { // 銀行文字列が銀行名と思われる文字列の場合
                $.ajax({ // ajax通信でhttps://bank.teraren.com/banks/から銀行名で銀行データをJSON形式で取得
                    'url': 'https://bank.teraren.com/banks/search.json?name=' + bank_char,
                    'dataType': 'json',
                    'async': false,
                }).done((success) => { // 通信に成功した場合
                    if (success.length === 1) { // 検索結果が1件だった場合
                        bank_info = {
                            'bank_number': success[0].code,
                            'bank_name': success[0].normalize.name,
                            'bank_name_kana': success[0].kana
                        };
                    }
                });
            }
            if (bank_info.bank_name_kana) { // 銀行名（カナ）を取得できた場合は返却する
                bank_info.bank_name_kana = $.convert_to_account_holder(bank_info.bank_name_kana, false);
            }
        }
        return bank_info;
    };

    $.bank_branch_find = (bank_char, bank_branch_char) => {

        // 銀行番号若しくは銀行名のいずれかの文字列及び支店番号若しくは支店名のいずれかの文字列から支店番号・支店名・支店名（カナ）を返す関数
        // （入力値）
        // bank_char = 銀行文字列
        // bank_branch_char = 支店文字列 
        // （出力値）
        // .bank_branch_number = 支店番号
        // .bank_branch_name = 支店名
        // .bank_branch_name_kana = 支店名（カナ）
        // bankcharとbank_branch_charに該当するものがなければ、すべてnull値を返却する
        let branch_info = {
            'bank_branch_number': null,
            'bank_branch_name': null,
            'bank_branch_name_kana': null
        };
        if (bank_char && bank_branch_char) { // 銀行文字列、支店文字列ともある場合
            const bank_char_sbn = convert_to_single_byte_number(bank_char);
            const bank_number = $.bank_find(bank_char_sbn).bank_number;
            const bank_branch_char_sbn = Number(convert_to_single_byte_number(bank_branch_char));
            if ((bank_branch_char_sbn >= 0) && (bank_branch_char_sbn <= 999)) { // 支店文字列が支店コードと思われるデータの場合
                const bank_branch_number_temp = '000' + String(bank_branch_char_sbn);
                const bank_branch_number = bank_branch_number_temp.slice(-3);
                $.ajax({ // ajax通信でhttps://postcode.teraren.com/banks/から銀行コードと支店コードに基づいたで銀行データをJSON形式で取得
                    'url': 'https://bank.teraren.com/banks/' + bank_number + '/branches/' + bank_branch_number + '.json',
                    'dataType': 'json',
                    'async': false,
                }).done((success) => { // 通信に成功した場合
                    branch_info = {
                        'bank_branch_number': success.code,
                        'bank_branch_name': success.normalize.name,
                        'bank_branch_name_kana': success.kana
                    };
                });
            } else { // 支店文字列が支店名と思われるデータの場合
                $.ajax({
                    'url': 'https://bank.teraren.com/banks/' + bank_number + '/branches/search.json?name=' + bank_branch_char,
                    'dataType': 'json',
                    'async': false,
                }).done((success) => { // 通信に成功した場合
                    if (success.length === 1) { // 検索結果が1件だった場合
                        branch_info = {
                            'bank_branch_number': success[0].code,
                            'bank_branch_name': success[0].normalize.name,
                            'bank_branch_name_kana': success[0].kana
                        };
                    }
                });
            }
            if (branch_info.bank_branch_name_kana) { // 支店名を取得できた場合は返却する
                branch_info.bank_branch_name_kana = $.convert_to_account_holder(branch_info.bank_branch_name_kana, false);
            }
        }
        return branch_info;
    };

    $.bank_account_number = (bank_account_char) => {

        // 銀行口座番号の書式を整える関数
        // （入力値）
        // bank_account_char = 口座番号文字列
        // （出力値） = 7桁の口座番号文字列
        if (bank_account_char) { // 口座番号文字列がある場合
            const bank_account_number_temp = '0000000' + convert_to_single_byte_number(bank_account_char);
            const bank_account_number = bank_account_number_temp.slice(-7);
            return bank_account_number;
        }
        return null;
    };

    $.convert_japan_post_account_to_bank_account = (symbol_char, number_char) => {

        // ゆうちょ口座の記号番号から銀行名支店名等に変換する関数
        // （入力値）
        // symbol_char = ゆうちょ口座記号文字列
        // number_char = ゆうちょ口座番号文字列
        // （出力値）
        // .symbol = ゆうちょ口座記号
        // .number = ゆうちょ口座番号
        // .bank_number = 銀行番号
        // .bank_name = 銀行名
        // .bank_name_kana = 銀行名（カナ）
        // .bank_branch_number = 支店番号
        // .bank_branch_name = 支店名
        // .bank_branch_name_kana = 支店名（カナ）
        // .deposit_type = 預金種目
        // .bank_account_number = 銀行口座番号
        // symbol_charとnumber_charに該当するものがなければ、すべてnull値を返却する
        let convert_info = { // 返却する値を返す
            'symbol': null,
            'number': null,
            'bank_number': null,
            'bank_name': null,
            'bank_name_kana': null,
            'bank_branch_number': null,
            'bank_branch_name': null,
            'bank_branch_name_kana': null,
            'deposit_type': null,
            'bank_account_number': null
        };
        if (symbol_char && number_char) { // ゆうちょ口座記号文字列・ゆうちょ口座番号文字列ともある場合
            const symbol_char_sbn = convert_to_single_byte_number(symbol_char);
            const symbol_temp = '00000' + symbol_char_sbn;
            const symbol = symbol_temp.slice(-5);
            const number_char_sbn = convert_to_single_byte_number(number_char);
            const bank_branch_number_temp = symbol.substring(1, 3);
            const deposit_type_temp = symbol.substring(0, 1);
            let number = null;
            let bank_branch_number =  null;
            let deposit_type = null;
            let bank_account_number = null;
            switch (deposit_type_temp) {
                case '0': // 郵便振替口座の場合
                    bank_branch_number = bank_branch_number_temp + '9';
                    deposit_type = '当座';
                    if (number_char_sbn.length <= 6) { // 口座番号が6桁以下の場合
                        const number_temp = '000000' + number_char_sbn;
                        number = number_temp.slice(-6);
                        bank_account_number = $.bank_account_number(number);
                    }
                    break;
                case '1': // 総合口座の場合
                    bank_branch_number = bank_branch_number_temp + '8';
                    deposit_type = '普通';
                    const number_temp = '00000000' + number_char_sbn;
                    number = number_temp.slice(-8);
                    bank_account_number = number.substring(0, 7);
                    break;
            }
            if (number && bank_branch_number && deposit_type && bank_account_number) { // 変換すべきゆうちょ口座番号、銀行支店番号、預金種目、銀行口座番号のすべてがそろった場合
                const branch_info = $.bank_branch_find('9900', bank_branch_number);
                if (branch_info.bank_branch_number) { // 支店を検索できた場合
                    convert_info.symbol = symbol;
                    convert_info.number = number;
                    convert_info.bank_number = '9900';
                    convert_info.bank_name = 'ゆうちょ銀行';
                    convert_info.bank_name_kana = 'ﾕｳﾁﾖ';
                    convert_info.bank_branch_number = branch_info.bank_branch_number;
                    convert_info.bank_branch_name = branch_info.bank_branch_name;
                    convert_info.bank_branch_name_kana = branch_info.bank_branch_name_kana;
                    convert_info.deposit_type = deposit_type;
                    convert_info.bank_account_number = bank_account_number;
                }
            }
        }
        return convert_info;
    };

    $.convert_to_account_holder = (char, acronym_sw = true) => {

        // 口座名義人を半角カナに変換する関数
        // （入力値）
        // char = 口座名義人
        // acronym_sw = 口座名義人を略語にする処理の有無（trueがあり、falseがなし）
        // （出力値） = 半角カナに変換した口座名義人
        const convert_to_single_byte_characters = (char) => {

            // 入力された文字から英数字も含めて可能な限り半角文字に変換する関数
            // （入力値）
            // char = 入力文字
            // （出力値）= 英数字も含めた半角文字（可能な限り）
            const convert_to_half_width_kana = (char) => {

                // 入力された文字から可能な限り半角カナ文字に変換する関数
                // （入力値）
                // char = 入力文字
                // （出力値）=半角カナ文字（可能な限り）
                const convert_to_full_width_kana = (char, hiragana_sw = true) => {

                    // 入力された文字から可能な限り全角カナ文字に変換する関数
                    // （入力値）
                    // char = 入力文字、hiragana_sw = ひらがな変換の可否を選択するスイッチ（trueで変換、falseで不変換）
                    // （出力値）=全角カナ文字（可能な限り）
                    const full_width_kana_list = { // 半角カナと全角カナの対応を定義
                        'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
                        'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
                        'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
                        'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
                        'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
                        'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
                        'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
                        'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
                        'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
                        'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
                        'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
                        'ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
                        'ﾞ': '゛', 'ﾟ': '゜'
                    };
                    let full_width_kana_list_reg = new RegExp('(' + Object.keys(full_width_kana_list).join('|') + ')', 'g');
                    const turbidity_kana_list = { // 濁点・半濁点の対応を定義
                        'カ゛': 'ガ', 'キ゛': 'ギ', 'ク゛': 'グ', 'ケ゛': 'ゲ', 'コ゛': 'ゴ',
                        'サ゛': 'ザ', 'シ゛': 'ジ', 'ス゛': 'ズ', 'セ゛': 'ゼ', 'ソ゛': 'ゾ',
                        'タ゛': 'ダ', 'チ゛': 'ヂ', 'ツ゛': 'ヅ', 'テ゛': 'デ', 'ト゛': 'ド',
                        'ハ゛': 'バ', 'ヒ゛': 'ビ', 'フ゛': 'ブ', 'ヘ゛': 'ベ', 'ホ゛': 'ボ',
                        'ハ゜': 'パ', 'ヒ゜': 'ピ', 'フ゜': 'プ', 'ヘ゜': 'ペ', 'ホ゜': 'ポ',
                        'ウ゛': 'ヴ', 'ワ゛': 'ヷ', 'ヲ゛': 'ヺ'
                    };
                    let turbidity_kana_list_reg = new RegExp('(' + Object.keys(turbidity_kana_list).join('|') + ')', 'g');
                    if (char) { // 文字がある場合
                        let full_width_kana = char;
                        if (hiragana_sw) { // ひらがなをカタカタに変換する場合
                            full_width_kana = String(full_width_kana).replace(/[\u3041-\u3096]/g, (char) => {
                                return String.fromCharCode(char.charCodeAt(0) + 96);
                            }); 
                        }
                        full_width_kana = full_width_kana.replace(full_width_kana_list_reg, (char) => {
                            return full_width_kana_list[char];
                        });
                        full_width_kana = full_width_kana.replace(turbidity_kana_list_reg, (char) => {
                            return turbidity_kana_list[char];
                        });
                        return full_width_kana;
                    }
                    return null;
                };
                const half_width_kana_list = { // 全角カナと半角カナの対応を定義（銀行特有のカナ遣いを反映）
                    'ア': 'ｱ', 'イ': 'ｲ', 'ウ': 'ｳ', 'エ': 'ｴ', 'オ': 'ｵ',
                    'カ': 'ｶ', 'キ': 'ｷ', 'ク': 'ｸ', 'ケ': 'ｹ', 'コ': 'ｺ',
                    'サ': 'ｻ', 'シ': 'ｼ', 'ス': 'ｽ', 'セ': 'ｾ', 'ソ': 'ｿ',
                    'タ': 'ﾀ', 'チ': 'ﾁ', 'ツ': 'ﾂ', 'テ': 'ﾃ', 'ト': 'ﾄ',
                    'ナ': 'ﾅ', 'ニ': 'ﾆ', 'ヌ': 'ﾇ', 'ネ': 'ﾈ', 'ノ': 'ﾉ',
                    'ハ': 'ﾊ', 'ヒ': 'ﾋ', 'フ': 'ﾌ', 'ヘ': 'ﾍ', 'ホ': 'ﾎ',
                    'マ': 'ﾏ', 'ミ': 'ﾐ', 'ム': 'ﾑ', 'メ': 'ﾒ', 'モ': 'ﾓ',
                    'ヤ': 'ﾔ', 'ユ': 'ﾕ', 'ヨ': 'ﾖ',
                    'ラ': 'ﾗ', 'リ': 'ﾘ', 'ル': 'ﾙ', 'レ': 'ﾚ', 'ロ': 'ﾛ',
                    'ワ': 'ﾜ', 'ヲ': 'ｵ', 'ン': 'ﾝ',
                    'ガ': 'ｶﾞ', 'ギ': 'ｷﾞ', 'グ': 'ｸﾞ', 'ゲ': 'ｹﾞ', 'ゴ': 'ｺﾞ',
                    'ザ': 'ｻﾞ', 'ジ': 'ｼﾞ', 'ズ': 'ｽﾞ', 'ゼ': 'ｾﾞ', 'ゾ': 'ｿﾞ',
                    'ダ': 'ﾀﾞ', 'ヂ': 'ﾁﾞ', 'ヅ': 'ﾂﾞ', 'デ': 'ﾃﾞ', 'ド': 'ﾄﾞ',
                    'バ': 'ﾊﾞ', 'ビ': 'ﾋﾞ', 'ブ': 'ﾌﾞ', 'ベ': 'ﾍﾞ', 'ボ': 'ﾎﾞ',
                    'パ': 'ﾊﾟ', 'ピ': 'ﾋﾟ', 'プ': 'ﾌﾟ', 'ペ': 'ﾍﾟ', 'ポ': 'ﾎﾟ',
                    'ヴ': 'ｳﾞ', 'ヷ': 'ﾜﾞ', 'ヺ': 'ｵﾞ',
                    'ァ': 'ｱ', 'ィ': 'ｲ', 'ゥ': 'ｳ', 'ェ': 'ｴ', 'ォ': 'ｵ',
                    'ッ': 'ﾂ', 'ャ': 'ﾔ', 'ュ': 'ﾕ', 'ョ': 'ﾖ',
                    '゛': 'ﾞ', '゜': 'ﾟ'
                };
                let half_width_kana_list_reg = new RegExp('(' + Object.keys(half_width_kana_list).join('|') + ')', 'g');
                if (char) { // 文字がある場合
                    const full_width_kana = convert_to_full_width_kana(char);
                    const half_with_kana = full_width_kana.replace(half_width_kana_list_reg, (char) => {
                        return half_width_kana_list[char];
                    });
                    return half_with_kana;
                }
                return null;
            };
            if (char) { // 文字がある場合
                const hyphen_process = char.replace(/[\uFF0D\u2010\u2011\u2013\u2014\u2212\u30FC\u2015\uFF70]/g, '-');
                const half_width_kana = convert_to_half_width_kana(hyphen_process) ;
                const single_byte_characters = half_width_kana.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, (char) => {
                    return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
                }).toUpperCase();
                return single_byte_characters;
            }
            return null;
        };
        const bank_kana_list = { // 銀行特有の半角カナ処理の対応を定義
            'ｧ': 'ｱ', 'ｨ': 'ｲ', 'ｩ': 'ｳ', 'ｪ': 'ｴ', 'ｫ': 'ｵ',
            'ｯ': 'ﾂ', 'ｬ': 'ﾔ', 'ｭ': 'ﾕ', 'ｮ': 'ﾖ',
            '（': '(', '）': ')', '・': '.',
            'ー': '-', '‐': '-', '－': '-',
            '　': ' ', '゛': 'ﾞ', '゜': 'ﾟ'
        };
        let bank_kana_list_reg = new RegExp('(' + Object.keys(bank_kana_list).join('|') + ')', 'g');
        const corporate_abbreviations_list = { // 法人略語の対応を定義（漢字と半角カナの両方で定義する必要あり）
            '株式会社': 'ｶ', 'ｶﾌﾞｼｷｶﾞｲｼﾔ': 'ｶ',
            '有限会社': 'ﾕ', 'ﾕｳｹﾞﾝｶﾞｲｼﾔ': 'ﾕ',
            '合名会社': 'ﾒ', 'ｺﾞｳﾒｲｶﾞｲｼﾔ': 'ﾒ',
            '合資会社': 'ｼ', 'ｺﾞｳｼｶﾞｲｼﾔ': 'ｼ',
            '合同会社': 'ﾄﾞ', 'ｺﾞｳﾄﾞｳｶﾞｲｼﾔ': 'ﾄﾞ',
            '医療法人社団': 'ｲ', 'ｲﾘﾖｳﾎｳｼﾞﾝｼﾔﾀﾞﾝ': 'ｲ',
            '医療法人財団': 'ｲ', 'ｲﾘﾖｳﾎｳｼﾞﾝｻﾞｲﾀﾞﾝ': 'ｲ',
            '社会医療法人': 'ｲ', 'ｼﾔｶｲｲﾘﾖｳﾎｳｼﾞﾝ': 'ｲ',
            '医療法人': 'ｲ', 'ｲﾘﾖｳﾎｳｼﾞﾝ': 'ｲ',
            '一般財団法人': 'ｻﾞｲ', 'ｲﾂﾊﾟﾝｻﾞｲﾀﾞﾝﾎｳｼﾞﾝ': 'ｻﾞｲ',
            '公益財団法人': 'ｻﾞｲ', 'ｺｳｴｷｻﾞｲﾀﾞﾝﾎｳｼﾞﾝ': 'ｻﾞｲ',
            '財団法人': 'ｻﾞｲ', 'ｻﾞｲﾀﾞﾝﾎｳｼﾞﾝ': 'ｻﾞｲ',
            '一般社団法人': 'ｼﾔ', 'ｲﾂﾊﾟﾝｼﾔﾀﾞﾝﾎｳｼﾞﾝ': 'ｼﾔ',
            '公益社団法人': 'ｼﾔ', 'ｺｳｴｷｼﾔﾀﾞﾝﾎｳｼﾞﾝ': 'ｼﾔ',
            '社団法人': 'ｼﾔ', 'ｼﾔﾀﾞﾝﾎｳｼﾞﾝ': 'ｼﾔ',
            '宗教法人': 'ｼﾕｳ', 'ｼﾕｳｷﾖｳﾎｳｼﾞﾝ': 'ｼﾕｳ',
            '学校法人': 'ｶﾞｸ', 'ｶﾞﾂｺｳﾎｳｼﾞﾝ': 'ｶﾞｸ',
            '社会福祉法人': 'ﾌｸ', 'ｼﾔｶｲﾌｸｼﾎｳｼﾞﾝ': 'ﾌｸ',
            '更生保護法人': 'ﾎｺﾞ', 'ｺｳｾｲﾎｺﾞﾎｳｼﾞﾝ': 'ﾎｺﾞ',
            '相互会社': 'ｿ', 'ｿｳｺﾞｶﾞｲｼﾔ': 'ｿ',
            '特定非営利活動法人': 'ﾄｸﾋ', 'ﾄｸﾃｲﾋｴｲﾘｶﾂﾄﾞｳﾎｳｼﾞﾝ': 'ﾄｸﾋ',
            '地方独立行政法人': 'ﾁﾄﾞｸ', 'ﾁﾎｳﾄﾞｸﾘﾂｷﾞﾖｳｾｲﾎｳｼﾞﾝ': 'ﾁﾄﾞｸ',
            '独立行政法人': 'ﾄﾞｸ', 'ﾄﾞｸﾘﾂｷﾞﾖｳｾｲﾎｳｼﾞﾝ': 'ﾄﾞｸ',
            '中期目標管理法人': 'ﾓｸ', 'ﾁﾕｳｷﾓｸﾋﾖｳｶﾝﾘﾎｳｼﾞﾝ': 'ﾓｸ',
            '国立研究開発法人': 'ｹﾝ', 'ｺｸﾘﾂｹﾝｷﾕｳｶｲﾊﾂﾎｳｼﾞﾝ': 'ｹﾝ',
            '行政執行法人': 'ｼﾂ', 'ｷﾞﾖｳｾｲｼﾂｺｳﾎｳｼﾞﾝ': 'ｼﾂ',
            '弁護士法人': 'ﾍﾞﾝ', 'ﾍﾞﾝｺﾞｼﾎｳｼﾞﾝ': 'ﾍﾞﾝ',
            '有限責任中間法人': 'ﾁﾕｳ', 'ﾕｳｹﾞﾝｾｷﾆﾝﾁﾕｳｶﾝﾎｳｼﾞﾝ': 'ﾁﾕｳ',
            '無限責任中間法人': 'ﾁﾕｳ', 'ﾑｹﾞﾝｾｷﾆﾝﾁﾕｳｶﾝﾎｳｼﾞﾝ': 'ﾁﾕｳ',
            '行政書士法人': 'ｷﾞﾖ', 'ｷﾞﾖｳｾｲｼﾖｼﾎｳｼﾞﾝ': 'ｷﾞﾖ',
            '司法書士法人': 'ｼﾎｳ', 'ｼﾎｳｼﾖｼﾎｳｼﾞﾝ': 'ｼﾎｳ',
            '税理士法人': 'ｾﾞｲ', 'ｾﾞｲﾘｼﾎｳｼﾞﾝ': 'ｾﾞｲ',
            '国立大学法人': 'ﾀﾞｲ', 'ｺｸﾘﾂﾀﾞｲｶﾞｸﾎｳｼﾞﾝ': 'ﾀﾞｲ',
            '公立大学法人': 'ﾀﾞｲ', 'ｺｳﾘﾂﾀﾞｲｶﾞｸﾎｳｼﾞﾝ': 'ﾀﾞｲ',
            '農事組合法人': 'ﾉｳ', 'ﾉｳｼﾞｸﾐｱｲﾎｳｼﾞﾝ': 'ﾉｳ',
            '管理組合法人': 'ｶﾝﾘ', 'ｶﾝﾘｸﾐｱｲﾎｳｼﾞﾝ': 'ｶﾝﾘ',
            '社会保険労務士法人': 'ﾛｳﾑ', 'ｼﾔｶｲﾎｹﾝﾛｳﾑｼﾎｳｼﾞﾝ': 'ﾛｳﾑ'
        };
        let corporate_abbreviations_list_reg = new RegExp('(' + Object.keys(corporate_abbreviations_list).join('|') + ')', '');
        const sales_offices_list = { // 営業所の対応を定義（漢字と半角カナの両方で定義する必要あり）
            '営業所': 'ｴｲ', 'ｴｲｷﾞﾖｳｼﾖ': 'ｴｲ', 'ｴｲｷﾞﾖｳｼﾞﾖ': 'ｴｲ',
            '出張所': 'ｼﾕﾂ', 'ｼﾕﾂﾁﾖｳｼﾖ': 'ｼﾕﾂ', 'ｼﾕﾂﾁﾖｳｼﾞﾖ': 'ｼﾕﾂ'
        };
        let sales_offices_list_reg = new RegExp('(' + Object.keys(sales_offices_list).join('|') + ')', '');
        const business_list = { // 事業の対応を定義（漢字と半角カナの両方で定義する必要あり）
            '国民健康保険団体連合会': 'ｺｸﾎﾚﾝ', 'ｺｸﾐﾝｹﾝｺｳﾎｹﾝﾀﾞﾝﾀｲﾚﾝｺﾞｳｶｲ': 'ｺｸﾎﾚﾝ',
            '国家公務員共済組合連合会': 'ｺｸｷﾖｳﾚﾝ', 'ｺﾂｶｺｳﾑｲﾝｷﾖｳｻｲｸﾐｱｲﾚﾝｺﾞｳｶｲ': 'ｺｸｷﾖｳﾚﾝ',
            '経済農業協同組合連合会': 'ｹｲｻﾞｲﾚﾝ', 'ｹｲｻﾞｲﾉｳｷﾞﾖｳｷﾖｳﾄﾞｳｸﾐｱｲﾚﾝｺﾞｳｶｲ': 'ｹｲｻﾞｲﾚﾝ',
            '共済農業協同組合連合会': 'ｷﾖｳｻｲﾚﾝ', 'ｷﾖｳｻｲﾉｳｷﾞﾖｳｷﾖｳﾄﾞｳｸﾐｱｲﾚﾝｺﾞｳｶｲ': 'ｷﾖｳｻｲﾚﾝ',
            '農業協同組合連合会': 'ﾉｳｷﾖｳﾚﾝ', 'ﾉｳｷﾞﾖｳｷﾖｳﾄﾞｳｸﾐｱｲﾚﾝｺﾞｳｶｲ': 'ﾉｳｷﾖｳﾚﾝ',
            '漁業協同組合連合会': 'ｷﾞﾖﾚﾝ', 'ｷﾞﾖｷﾞﾖｳｷﾖｳﾄﾞｳｸﾐｱｲﾚﾝｺﾞｳｶｲ': 'ｷﾞﾖﾚﾝ',
            '連合会': 'ﾚﾝ', 'ﾚﾝｺﾞｳｶｲ': 'ﾚﾝ',
            '共済組合': 'ｷﾖｳｻｲ', 'ｷﾖｳｻｲｸﾐｱｲ': 'ｷﾖｳｻｲ',
            '生活協同組合': 'ｾｲｷﾖｳ', 'ｾｲｶﾂｷﾖｳﾄﾞｳｸﾐｱｲ': 'ｾｲｷﾖｳ',
            '食糧販売協同組合': 'ｼﾖｸﾊﾝｷﾖｳ', 'ｼﾖｸﾘﾖｳﾊﾝﾊﾞｲｷﾖｳﾄﾞｳｸﾐｱｲ': 'ｼﾖｸﾊﾝｷﾖｳ',
            '漁業協同組合': 'ｷﾞﾖｷﾖｳ', 'ｷﾞﾖｷﾞﾖｳｷﾖｳﾄﾞｳｸﾐｱｲ': 'ｷﾞﾖｷﾖｳ',
            '協同組合': 'ｷﾖｳｸﾐ', 'ｷﾖｳﾄﾞｳｸﾐｱｲ': 'ｷﾖｳｸﾐ',
            '生命保険': 'ｾｲﾒｲ', 'ｾｲﾒｲﾎｹﾝ': 'ｾｲﾒｲ',
            '海上火災保険': 'ｶｲｼﾞﾖｳ', 'ｶｲｼﾞﾖｳｶｻｲﾎｹﾝ': 'ｶｲｼﾞﾖｳ',
            '火災海上保険': 'ｶｻｲ', 'ｶｻｲｶｲｼﾞﾖｳﾎｹﾝ': 'ｶｻｲ',
            '国民健康保険組合': 'ｺｸﾎ', 'ｺｸﾐﾝｹﾝｺｳﾎｹﾝｸﾐｱｲ': 'ｺｸﾎ',
            '健康保険組合': 'ｹﾝﾎﾟ', 'ｹﾝｺｳﾎｹﾝｸﾐｱｲ': 'ｹﾝﾎﾟ',
            '社会保険診療報酬支払基金': 'ｼﾔﾎ', 'ｼﾔｶｲﾎｹﾝｼﾝﾘﾖｳﾎｳｼﾕｳｼﾊﾗｲｷｷﾝ': 'ｼﾔﾎ',
            '厚生年金基金': 'ｺｳﾈﾝ', 'ｺｳｾｲﾈﾝｷﾝｷｷﾝ': 'ｺｳﾈﾝ',
            '従業員組合': 'ｼﾞﾕｳｸﾐ', 'ｼﾞﾕｳｷﾞﾖｳｲﾝｸﾐｱｲ': 'ｼﾞﾕｳｸﾐ',
            '労働組合': 'ﾛｳｸﾐ', 'ﾛｳﾄﾞｳｸﾐｱｲ': 'ﾛｳｸﾐ',
            '公共職業安定所': 'ｼﾖｸｱﾝ', 'ｺｳｷﾖｳｼﾖｸｷﾞﾖｳｱﾝﾃｲｼﾖ': 'ｼﾖｸｱﾝ', 'ｺｳｷﾖｳｼﾖｸｷﾞﾖｳｱﾝﾃｲｼﾞﾖ': 'ｼﾖｸｱﾝ',
            '特別養護老人ホーム': 'ﾄｸﾖｳ', 'ﾄｸﾍﾞﾂﾖｳｺﾞﾛｳｼﾞﾝﾎｰﾑ': 'ﾄｸﾖｳ',
            '有限責任事業組合': 'ﾕｳｸﾐ', 'ﾕｳｹﾞﾝｾｷﾆﾝｼﾞｷﾞﾖｳｸﾐｱｲ': 'ﾕｳｸﾐ',
        };
        let business_list_reg = new RegExp('(' + Object.keys(business_list).join('|') + ')', '');
        const acronym_replace = (char, list, regexp_char, position_sw) => {

            // 該当する文字列を半角カナの法人略語に変換する関数
            // （入力値）
            // char = 入力文字
            // list = 置き換え対応するリスト（「'置き換え元文字': '置き換え文字'」で入っている配列データ）
            // regexp_char = パターン照合用文字列
            // position_sw = 略語区切り付けの有無（trueがあり、falseがなし）
            // （出力値）= 法人略語変換後の文字列
            if (char) { // 入力文字がある場合
                const char_search = char.search(regexp_char);
                if (char_search !== -1) { // 入力文字からパターン照合用文字列で照合できた場合
                    let parenthesis_position = 0;
                    if (position_sw) { // 略語区切り付け処理がある場合
                        if (char_search === 0) { // 先頭に略語がある場合
                            parenthesis_position = 1;
                        } else {
                            const char_match = char.match(regexp_char);
                            if (char.length === (char_search + char_match[0].length)) { // 末尾に略語がある場合
                                parenthesis_position = 2;
                            } else { // 中間に略語がある場合
                                parenthesis_position = 3;
                            }
                        }
                    }
                    return char.replace(regexp_char, (char) => {
                        switch (parenthesis_position) {
                            case 1: // 先頭に略語がある場合
                                return list[char] + ')';
                            case 2: // 末尾に略語がある場合
                                return '(' + list[char];
                            case 3: // 中間に略語がある場合
                                return '(' + list[char] + ')';
                            default: // 略語区切り付け処理をしない場合
                                return list[char];
                        }
                    });
                } else { // パターン照合できなければ元の文字列のまま返す
                    return char;
                }
            }
        };
        const char_sbc = convert_to_single_byte_characters(char);
        const char_bank_kana = char_sbc.replace(bank_kana_list_reg, (char) => {
            return bank_kana_list[char];
        });
        let char_acronym = char_bank_kana;
        if (acronym_sw) { // 略語処理をする場合
            for (let c = 0; c < 3; c++) {
                let list = {};
                let regexp_char = '';
                let position_sw = true;
                switch (c) {
                    case 0: // 法人略語
                        list = corporate_abbreviations_list;
                        regexp_char = corporate_abbreviations_list_reg;
                        break;
                    case 1: // 営業所
                        list = sales_offices_list;
                        regexp_char = sales_offices_list_reg;
                        break;
                    case 2: // 事業
                        list = business_list;
                        regexp_char = business_list_reg;
                        position_sw = false;
                        break;
                }
                char_acronym = acronym_replace(char_acronym, list, regexp_char, position_sw);
            }
        }
        const char_regexp = /^[()\-,./0-9A-Zｦ-ﾟ\s]+$/;
        if (char_regexp.test(char_acronym)) { // 口座名義人が銀行指定の文字列のみで構成されている場合
            return char_acronym;
        }
        return null;
    };

    $.check_Designate_transfer_date = (Designate_transfer_date, today_sw = false) => {

        // 振込指定日が銀行営業日であるかどうかを確認する関数
        // （入力値）
        // Designate_transfer_date = 振込指定日（kintoneの日付形式）
        // today_sw = 今日との比較で振込指定日が問題ないか確認したい場合 = true
        // （出力値） 振込指定日として指定できる日 = true、 振込指定日として指定できない日 = false
        if (Designate_transfer_date) { // 振込指定日の値がある場合
            let check_flag = true;
            const check_date = luxon.DateTime.fromISO(Designate_transfer_date);
            if (check_date) { // 振込指定日に値がある場合
                if (today_sw) { // 今日との比較で振込指定日が問題ないか確認したい場合
                    let today = luxon.DateTime.local();
                    if (today.hour >= 18) { // 現在時が18時以降の場合
                        today = today.plus({'days': 1}).startOf('day');
                    } else { // 現在時が18時以前の場合
                        today = today.startOf('day');
                    }
                    let reject_flag = false;
                    while (!reject_flag) {
                        reject_flag = $.check_Designate_transfer_date(today.toFormat('yyyy-MM-dd'));
                        if (!reject_flag) { // 振込指定日としてふさわしくない日程の場合
                            today = today.plus({'days': 1}).startOf('day');
                        }
                    }
                    const check_date_diff = check_date.diff(today, 'days').days;
                    if (check_date_diff < 1 || check_date_diff >= 14) { // 今日と振込指定日の間が1日未満か、14日以上離れている場合
                        check_flag = false;
                    }
                }
                switch (check_date.weekdayShort) {
                    case '土': // 振込指定日が土曜日の場合
                    case '日': // 振込指定日が日曜日の場合
                        check_flag = false;
                        break;
                }
                if ($.national_holiday(check_date.toFormat('yyyy-MM-dd'))) { // 振込指定日が国民の祝日の場合
                    check_flag = false;
                } else if (Number(check_date.toFormat('MM')) === 1 && Number(check_date.toFormat('dd')) <= 3) { // 振込指定日が1月1日～1月3日までの場合
                    check_flag = false;
                } else if (Number(check_date.toFormat('MM')) === 12 && Number(check_date.toFormat('dd')) === 31) { // 振込指定日が12月31日の場合
                    check_flag = false;
                }
                return check_flag;
            }
        }
        return false;
    };
    
    $.byte_number = (char) => {
        
        // 入力された文字列のバイト数を返す関数
        // （入力値）
        // char = 文字列
        // （出力値） バイト数
        if (char) { // 文字列がある場合
            return [...char].length;
        }
        return null;
    };
    
    $.byte_slice = (char, byte_length) => {
        
        // 入力された文字列を指定したバイト数で近似で切り取る関数
        // （入力値）
        // char = 指定したバイト数で切り取りたい文字列
        // byte_length = 切りたいバイト数
        // （出力値） 切り取った文字列
        let result = '';
        let length = 0;
        if (char && byte_length >= 1) { // 指定したバイト数で切り取りたい文字列があり、切りたいバイト数は1以上の場合
            for (let char_slice of char) {
                const char_slice_byte = $.byte_number(char_slice);
                if (length + char_slice_byte > byte_length) break; // 切り取った文字列のバイト数と1文字だけ抽出した文字列のバイト数が、切りたいバイト数を超過する場合
                result += char_slice;
                length += char_slice_byte;
            }
            return result;
        }
        return null;
    };
})(jQuery);