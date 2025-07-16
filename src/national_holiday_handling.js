// 国民の祝日処理プログラム
// 作成者：一色
// この処理プログラムを使用する場合は、luxonとjQueryを合わせて読み込む必要があります
// リソースの読み込み制限を行っている場合は、Ajax通信のhttps://api.national-holidays.jp/を許可する必要があります
(($) => {
    'use strict';
    $.national_holiday = (date_char) => {

        // 入力された日付に該当する国民の祝日・休日を返す関数
        // （入力値）
        // datechar = ISO 8601拡張形式の西暦表記（YYYY-MM-DD）の文字列
        // （出力値） = 国民の祝日・休日の名称（該当するものがなければNULL値を返却）
        let holiday_name = null;
        if (date_char) { // 日付の文字列がある場合
            let year_char = luxon.DateTime.fromISO(date_char).toFormat('yyyy');
            if (date_char >= '1948-07-20') { // 国民の休日に関する法律の施行日以降の場合
                jQuery.ajax({ // ajax通信でhttps://api.national-holidays.jp/から国民の祝日・休日データをJSON形式で取得
                    'url': 'https://api.national-holidays.jp/' + year_char,
                    'dataType': 'json',
                    'async': false,
                }).done((success) => { // 通信成功時
                    if (success.length >= 1) {
                        success.forEach((row) => { // 国民の祝日・休日を検索できた場合は、国民の祝日・休日の名称を返却する
                            if (date_char === row.date) {
                                holiday_name = row.name;
                            }
                        });
                    }
                });
            }
        }
        return holiday_name;
    };
})(jQuery);