// 文字処理プログラム
// 作成者：一色
// 2025-08-10　convert_to_hiragana関数について、ひらがな以外が入力されている場合エラーを返すオプションを追加しました。
// 2025-05-26　convert_to_single_byte_characters関数について、ハイフンの文字を全角ハイフンに統一する処理を追加しました。
// 2025-05-26　convert_to_single_byte_characters関数について、ハイフンの文字を半角ハイフンに統一する処理を追加しました。
'use strict';
const convert_string_list = {
    // 文字の置き換えリスト関数
    // （入力値）　なし
    // （出力値）
    // .half_width_kana　全角カナと半角カナの対応を定義
    // .full_width_kana　半角カナと全角カナの対応を定義
    // .turbidity_kana　濁点・半濁点の対応を定義
    'half_width_kana': {
        'ア': 'ｱ', 'イ': 'ｲ', 'ウ': 'ｳ', 'エ': 'ｴ', 'オ': 'ｵ',
        'カ': 'ｶ', 'キ': 'ｷ', 'ク': 'ｸ', 'ケ': 'ｹ', 'コ': 'ｺ',
        'サ': 'ｻ', 'シ': 'ｼ', 'ス': 'ｽ', 'セ': 'ｾ', 'ソ': 'ｿ',
        'タ': 'ﾀ', 'チ': 'ﾁ', 'ツ': 'ﾂ', 'テ': 'ﾃ', 'ト': 'ﾄ',
        'ナ': 'ﾅ', 'ニ': 'ﾆ', 'ヌ': 'ﾇ', 'ネ': 'ﾈ', 'ノ': 'ﾉ',
        'ハ': 'ﾊ', 'ヒ': 'ﾋ', 'フ': 'ﾌ', 'ヘ': 'ﾍ', 'ホ': 'ﾎ',
        'マ': 'ﾏ', 'ミ': 'ﾐ', 'ム': 'ﾑ', 'メ': 'ﾒ', 'モ': 'ﾓ',
        'ヤ': 'ﾔ', 'ユ': 'ﾕ', 'ヨ': 'ﾖ',
        'ラ': 'ﾗ', 'リ': 'ﾘ', 'ル': 'ﾙ', 'レ': 'ﾚ', 'ロ': 'ﾛ',
        'ワ': 'ﾜ', 'ヲ': 'ｦ', 'ン': 'ﾝ',
        'ガ': 'ｶﾞ', 'ギ': 'ｷﾞ', 'グ': 'ｸﾞ', 'ゲ': 'ｹﾞ', 'ゴ': 'ｺﾞ',
        'ザ': 'ｻﾞ', 'ジ': 'ｼﾞ', 'ズ': 'ｽﾞ', 'ゼ': 'ｾﾞ', 'ゾ': 'ｿﾞ',
        'ダ': 'ﾀﾞ', 'ヂ': 'ﾁﾞ', 'ヅ': 'ﾂﾞ', 'デ': 'ﾃﾞ', 'ド': 'ﾄﾞ',
        'バ': 'ﾊﾞ', 'ビ': 'ﾋﾞ', 'ブ': 'ﾌﾞ', 'ベ': 'ﾍﾞ', 'ボ': 'ﾎﾞ',
        'パ': 'ﾊﾟ', 'ピ': 'ﾋﾟ', 'プ': 'ﾌﾟ', 'ペ': 'ﾍﾟ', 'ポ': 'ﾎﾟ',
        'ヴ': 'ｳﾞ', 'ヷ': 'ﾜﾞ', 'ヺ': 'ｦﾞ',
        'ァ': 'ｧ', 'ィ': 'ｨ', 'ゥ': 'ｩ', 'ェ': 'ｪ', 'ォ': 'ｫ',
        'ッ': 'ｯ', 'ャ': 'ｬ', 'ュ': 'ｭ', 'ョ': 'ｮ',
        '゛': 'ﾞ', '゜': 'ﾟ', '　': ' '
    },
    'full_width_kana': {
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
        'ﾞ': '゛', 'ﾟ': '゜', ' ': '　'
    },
    'turbidity_kana': {
        'カ゛': 'ガ', 'キ゛': 'ギ', 'ク゛': 'グ', 'ケ゛': 'ゲ', 'コ゛': 'ゴ',
        'サ゛': 'ザ', 'シ゛': 'ジ', 'ス゛': 'ズ', 'セ゛': 'ゼ', 'ソ゛': 'ゾ',
        'タ゛': 'ダ', 'チ゛': 'ヂ', 'ツ゛': 'ヅ', 'テ゛': 'デ', 'ト゛': 'ド',
        'ハ゛': 'バ', 'ヒ゛': 'ビ', 'フ゛': 'ブ', 'ヘ゛': 'ベ', 'ホ゛': 'ボ',
        'ハ゜': 'パ', 'ヒ゜': 'ピ', 'フ゜': 'プ', 'ヘ゜': 'ペ', 'ホ゜': 'ポ',
        'ウ゛': 'ヴ', 'ワ゛': 'ヷ', 'ヲ゛': 'ヺ'
    }
};
const build_pattern = (keys) => {

    // 入力された複数のマップキーに含まれる文字列のいずれかに一致する正規表現のパターンを作成する関数
    // （入力値）
    // keys = 複数のマップキー
    // （出力値） = 正規表現のパターン
    return new RegExp([...keys].map(char_one => char_one.replace(/[.*+?^${}()|[$\$\]]/g, '\\$&')).join('|'), 'g');
}
const half_width_kana_map = new Map(Object.entries(convert_string_list.half_width_kana));
const full_width_kana_map = new Map(Object.entries(convert_string_list.full_width_kana));
const turbidity_kana_map = new Map(Object.entries(convert_string_list.turbidity_kana));
const half_width_kana_pattern = build_pattern(half_width_kana_map.keys());
const full_width_kana_pattern = build_pattern(full_width_kana_map.keys());
const turbidity_kana_pattern = build_pattern(turbidity_kana_map.keys());
const replace_with_map = (char, pattern, map) => {

    // 文字列を正規表現で表記されたパターンに一致した場合マップにある文字列に置き換える処理をする関数
    // （入力値） = マップキー
    // char = 文字列
    // pattern = 正規表現のパターン
    // map = マップ
    // （出力値） = 置き換え後の文字列
    return char.replace(pattern, char_one => map.get(char_one) ?? char_one);
};
const convert_to_half_width_kana = (char) => {

    // 入力された文字から可能な限り半角カナ文字に変換する関数
    // （入力値）
    // char = 入力文字
    // （出力値） = 半角カナ文字（可能な限り）
    if (typeof char !== 'string' || char.length === 0) return ''; // 入力文字がないか、文字列ではない場合
    return replace_with_map(char, half_width_kana_pattern, half_width_kana_map);
};

const convert_to_full_width_kana = (char, hiragana_sw = true) => {

    // 入力された文字から可能な限り全角カナ文字に変換する関数
    // （入力値）
    // char = 入力文字、hiragana_sw = ひらがな変換の可否を選択するスイッチ（trueで変換、falseで不変換）
    // （出力値）=全角カナ文字（可能な限り）
    if (typeof char !== 'string' || char.length === 0) return ''; // 入力文字がないか、文字列ではない場合
    let result = hiragana_sw ? char.replace(/[\u3041-\u3096]/g, char_one => String.fromCodePoint(char_one.charCodeAt(0) + 0x60)) : char; // 濁点と半濁点を除外して変換
    result = replace_with_map(result, full_width_kana_pattern, full_width_kana_map);
    result = replace_with_map(result, turbidity_kana_pattern, turbidity_kana_map);
    return result;
};

const convert_to_hiragana = (char, check = false) => {

    // 入力された文字から可能な限りひらがなに変換する関数
    // （入力値）
    // char = 入力文字
    // check = ひらがな以外が含まれる場合はエラーを返すか選択するスイッチ（trueでエラーを返す、falseでエラーを返さない）※無指定はエラーを返さない
    // （出力値）=ひらがな　※checkがtrueの場合、ひらがな以外の文字が含まれる場合はERRORを返す
    if (char) { // 文字がある場合
        const full_width_kana = convert_to_full_width_kana(char);
        const hiragana = String(full_width_kana).replace(/[\u30A1-\u30F3]/g, (char) => {
            return String.fromCharCode(char.charCodeAt(0) - 96);
        });
        if (check) { // ひらがなエラーチェックを行う場合
            const allow_symbol = ['ー', '・', 'ゝ', 'ゞ', '゛', '゜', '　'];
            const hiragana_check = [...hiragana].every(char => 
                (char >= 'ぁ' && char <= 'ん') || allow_symbol.includes(char)
            );
            if (!hiragana_check) { // ひらがな以外の文字が含まれている場合
                return 'ERROR';
            }
        }
        return hiragana;
    }
    return null;
};

const convert_to_single_byte_characters = (char) => {

    // 入力された文字から英数字も含めて可能な限り半角文字に変換する関数
    // （入力値）
    // char = 入力文字
    // （出力値）= 英数字も含めた半角文字（可能な限り）
    if (char) { // 文字がある場合
        const hyphen_process = char.replace(/[－‐‑–—−ー―]/g, '-');
        const half_width_kana = convert_to_half_width_kana(hyphen_process) ;
        const single_byte_characters = half_width_kana.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, (char) => {
            return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
        });
        return single_byte_characters;
    }
    return null;
};

const convert_to_double_byte_characters = (char) => {

    // 入力された文字から英数字も含めて可能な限り全角文字に変換する関数
    // （入力値）
    // char = 入力文字
    // （出力値）= 英数字も含めた全角文字（可能な限り）
    if (char) { // 文字がある場合
        const hyphen_process = char.replace(/[-‐‑–—−ー―]/g, '－');
        const full_width_kana = convert_to_full_width_kana(hyphen_process, false);
        const double_byte_characters = full_width_kana.replace(/[A-Za-z0-9!-~\s\\]/g, (char) => {
            if (char === '\\') { // 文字が￥マークの場合
                return '￥';
            } else if (char.match(/\s/)) { // 文字が空白の場合
                return '　';
            } else { // 文字が￥マークや空白以外の場合
                return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
            }
        });
        return double_byte_characters;
    }
    return null;
};

const convert_to_email_address = (email_address) => {

    // 入力された文字から英数字も含めて可能な限り半角文字に変換したうえで、RFC 5322に基づいたメールアドレスの形式であるかを判定する
    // （入力値）
    // email_address = メールアドレス文字
    // （出力値）= メールアドレス文字（メールアドレスとして正しくない場合はnull値を返す）
    const email_pattern = /^([\w!#$%&'*+\-\/=?^`{|}~]+(\.[\w!#$%&'*+\-\/=?^`{|}~]+)*|"([\w!#$%&'*+\-\/=?^`{|}~. ()<>\[\]:;@,]|\\[\\"])+")@(([a-zA-Z\d\-]+\.)+[a-zA-Z]+|\[((25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3}|IPv6:(:(((:[\da-fA-F]{1,4}){1,7})|((:[\da-fA-F]{1,4}){0,5}:(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3})|:)|([\da-fA-F]{1,4}:){1}(((:[\da-fA-F]{1,4}){1,6})|((:[\da-fA-F]{1,4}){0,4}:(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3})|:)|([\da-fA-F]{1,4}:){2}(((:[\da-fA-F]{1,4}){1,5})|((:[\da-fA-F]{1,4}){0,3}:(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3})|:)|([\da-fA-F]{1,4}:){3}(((:[\da-fA-F]{1,4}){1,4})|((:[\da-fA-F]{1,4}){0,2}:(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3})|:)|([\da-fA-F]{1,4}:){4}(((:[\da-fA-F]{1,4}){1,3})|((:[\da-fA-F]{1,4}){0,1}:(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3})|:)|([\da-fA-F]{1,4}:){5}(((:[\da-fA-F]{1,4}){1,2})|:(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3}|:)|([\da-fA-F]{1,4}:){6}(:[\da-fA-F]{1,4}|(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})){3}|:)|([\da-fA-F]{1,4}:){7}([\da-fA-F]{1,4}|:)))\])$/;
    if (email_address) { // メールアドレス文字がある場合
        const single_byte_characters = convert_to_single_byte_characters(email_address);
        if (email_pattern.test(single_byte_characters)) { // メールアドレスとして正しい場合
            return single_byte_characters;
        }
        return null;
    }
    return null;
};

const check_single_byte_numbers = (char) => {

    // 入力された文字が半角数字のみが含まれるかをチェックする関数
    // （入力値）
    // char = 入力文字
    // （出力値）= 半角数字のみはtrue、それ以外はfalseを返す
    const number_pattern = /^[0-9]+$/;
    if (number_pattern.test(char)) { // 入力文字が半角数字のみの場合
        return true;
    }
    return false;
};

const check_single_byte_kana = (char) => {

    // 入力された文字が半角カナ文字のみが含まれるかをチェックする関数
    // （入力値）
    // char = 入力文字
    // （出力値）= 半角数字のみはtrue、それ以外はfalseを返す
    const kana_pattern = /^[\uFF61-\uFF9F]+$/;
    if (kana_pattern.test(char)) { // 入力文字が半角カナ文字のみの場合
        return true;
    }
    return false;
};