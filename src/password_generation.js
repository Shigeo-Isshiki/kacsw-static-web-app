// パスワード生成プログラム
// 作成者：一色
'use strict';
const password_generation = (length = 10, type = 0b1111) => {

    // パスワードを生成する関数
    // （入力値）
    // length = パスワード文字数（4文字以上）　標準10文字　
    // type = パスワードのイプ（4ビット表示）　標準0b1111
    //  typeの1ビット目:アルファベット小文字　あり=1　なし=0
    //  typeの2ビット目:アルファベット大文字　あり=1　なし=0
    //  typeの3ビット目:数字　あり=1　なし=0
    //  typeの4ビット目:記号　あり=1　なし=0
    // （出力値）=パスワード文字列
    const lowercase_letters = 'abcdefghijkmnopqrstuvwxyz'; // アルファベット小文字を定義（紛らわしいものは除く）
    const uppercase_letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // アルファベット大文字を定義（紛らわしいものは除く）
    const numeral = '23456789'; // 数字を定義（紛らわしいものは除く）
    const symbol = '#$%&=@+*/?'; // 記号を定義（紛らわしいものは除く）
    let length_set = length;
    if (length < 4) { // 4文字未満の時は4文字とする
        length_set = 4;
    }
    let lowercase_sw = false;
    let uppercase_sw = false;
    let numeral_sw = false;
    let symbol_sw = false;
    let minimum_length = 0;
    if (type) { // パスワードタイプの指定がある場合
        if ((type & 0b1000) !==0) { // アルファベット小文字ありの場合
            lowercase_sw = true;
            minimum_length++;
        }
        if ((type & 0b0100) !==0) { // アルファベット大文字ありの場合
            uppercase_sw = true;
            minimum_length++;
        }
        if ((type & 0b0010) !==0) { // 数字ありの場合
            numeral_sw = true;
            minimum_length++;
        }
        if ((type & 0b0001) !==0) { // 記号あり
            symbol_sw = true;
            minimum_length++;
        }
    } else { // パスワードタイプの指定がない場合
        lowercase_sw = true;
        uppercase_sw = true;
        numeral_sw = true;
        symbol_sw = true;
    }
    let lowercase_num = 0;
    let uppercase_num = 0;
    let numeral_num = 0;
    let symbol_num = 0;
    let password = '';
    for (let c = 0; c < length_set; c++) {
        const remaining_length = length_set - c;
        let letters_type = Math.floor(Math.random() * 4);
        if (letters_type === 3 && lowercase_sw) { // ランダムにアルファベット小文字生成を行う場合で、パスワードタイプとしてアルファベット小文字が指定されている場合
            if (lowercase_num && remaining_length === minimum_length) { // これ以上アルファベット小文字のパスワードを生成するとほかの文字のパスワードが作れない場合
                c--;
            } else { // アルファベット小文字のパスワードを生成する場合
                password += lowercase_letters.charAt(Math.floor(Math.random() * lowercase_letters.length));
                if (lowercase_num === 0) { // アルファベット小文字が初めてパスワードとして生成された場合
                    minimum_length--;
                }
                lowercase_num++;
            }
        } else if ((letters_type === 2) && (uppercase_sw)) { // ランダムにアルファベット大文字生成を行う場合で、パスワードタイプとしてアルファベット大文字が指定されている場合
            if (uppercase_num && (remaining_length === minimum_length)) { // これ以上アルファベット大文字のパスワードを生成するとほかの文字のパスワードが作れない場合
                c--;
            } else { // アルファベット大文字のパスワードを生成する場合
                password += uppercase_letters.charAt(Math.floor(Math.random() * uppercase_letters.length));
                if (uppercase_num === 0) { // アルファベット大文字が初めてパスワードとして生成された場合
                    minimum_length--;
                }
                uppercase_num++;
            }            
        } else if ((letters_type === 1) && (numeral_sw)) { // ランダムに数字生成を行う場合で、パスワードタイプとして数字が指定されている場合
            if (numeral_num && (remaining_length === minimum_length)) { // これ以上数字のパスワードを生成するとほかの文字のパスワードが作れない場合
                c--;
            } else { // 数字のパスワードを生成する場合
                password += numeral.charAt(Math.floor(Math.random() * numeral.length));
                if (numeral_num === 0) { // 数字が初めてパスワードとして生成された場合
                    minimum_length--;
                }
                numeral_num++;
            }            
        } else if ((letters_type === 0) && (symbol_sw)) { // ランダムに記号生成を行う場合で、パスワードタイプとして記号が指定されている場合
            if (symbol_num && (remaining_length === minimum_length)) { // これ以上記号のパスワードを生成するとほかの文字のパスワードが作れない場合
                c--;
            } else { // 記号のパスワードを生成する場合
                password += symbol.charAt(Math.floor(Math.random() * symbol.length));
                if (symbol_num === 0) { // 記号が初めてパスワードとして生成された場合
                    minimum_length--;
                }
                symbol_num++;
            }            
        } else { // パスワード生成条件に合致しない場合
            c--;
        }
    }
    const return_password = {
        'password': password,
        'reading': yomigana_generation(password)
    };
    return return_password
};

const yomigana_generation = (char) => {

    // 入力文字のヨミガナを生成する関数
    // （入力値）
    // char = ヨミガナを生成する元の半角英数字と半角記号
    // （出力値）=ヨミガナ文字列
    const reading_list = { // ヨミガナを定義
        'a': 'エイ', 'b': 'ビー', 'c': 'シー', 'd': 'ディー', 'e': 'イー', 'f': 'エフ', 'g': 'ジー',
        'h': 'エイチ', 'i': 'アイ', 'j': 'ジェイ', 'k': 'ケイ', 'l': 'エル', 'm': 'エム', 'n': 'エヌ',
        'o': 'オー', 'p': 'ピー', 'q': 'キュー', 'r': 'アール', 's': 'エス', 't': 'ティー', 'u': 'ユー',
        'v': 'ヴィー', 'w': 'ダブリュー', 'x': 'エックス', 'y': 'ワイ', 'z': 'ゼッド',
        'A': 'エイ', 'B': 'ビー', 'C': 'シー', 'D': 'ディー', 'E': 'イー', 'F': 'エフ', 'G': 'ジー',
        'H': 'エイチ', 'I': 'アイ', 'J': 'ジェイ', 'K': 'ケイ', 'L': 'エル', 'M': 'エム', 'N': 'エヌ',
        'O': 'オー', 'P': 'ピー', 'Q': 'キュー', 'R': 'アール', 'S': 'エス', 'T': 'ティー', 'U': 'ユー',
        'V': 'ヴィー', 'W': 'ダブリュー', 'X': 'エックス', 'Y': 'ワイ', 'Z': 'ゼッド',        
        '1': 'イチ', '2': 'ニ', '3': 'サン', '4': 'ヨン', '5': 'ゴ',
        '6': 'ロク', '7': 'ナナ', '8': 'ハチ', '9': 'キュウ', '0': 'ゼロ',
        '\\!': 'エクスクラメーションマーク',
        '"': 'ダブルクォーテーション',
        '#': 'ハッシュ',
        '\\$': 'ドル',
        '%': 'パーセント',
        '&': 'アンパサンド',
        '\'': 'アポストロフィー',
        '\\(': 'ヒダリカッコ',
        '\\)': 'ミギカッコ',
        '~': 'チルダ',
        '\\^': 'キャレット',
        '\\|': 'パイプライン',
        '@': 'アットマーク',
        '`': 'バッククオート',
        '\\[': 'ヒダリダイカッコ',
        '\\{': 'ヒダリチュウカッコ',
        ':': 'コロン',
        ';': 'セミコロン',
        '\\*': 'アスタリスク',
        '\\]': 'ミギダイカッコ',
        '\\}': 'ミギチュウカッコ',
        '\\,': 'カンマ',
        '\\.': 'ドット',
        '\\<': 'レスザン',
        '\\>': 'グレーターザン',
        '/': 'スラッシュ',
        '\\?': 'クエスチョンマーク',
        '_': 'アンダーバー',
        '\\=': 'イコール',
        '\\-': 'ハイフン',
        '\\+': 'プラス'
    };
    let reading_list_reg = new RegExp('(' + Object.keys(reading_list).join('|') + ')', 'g');
    if (char) { // ヨミガナを生成する元の半角英数字と半角記号がある場合
        const reading_char = char.replace(reading_list_reg, (char_conv) => {
            if (reading_list[char_conv]) { // 定義されたヨミガナに合致する場合
              return reading_list[char_conv] + '・';
            } else { // 定義されたヨミガナに合致しない場合
                switch (char_conv) { // 該当する記号がある場合
                    case '!':
                        return 'エクスクラメーションマーク・';
                    case '$':
                        return 'ドル・';
                    case '\'':
                        return 'アポストロフィー・';
                    case '(':
                        return 'ヒダリカッコ・';
                    case ')':
                        return 'ミギカッコ・';
                    case '^':
                        return 'キャレット・';
                    case '|':
                        return 'パイプライン・';
                    case '[':
                        return 'ヒダリダイカッコ・';
                    case '{':
                        return 'ヒダリチュウカッコ・';
                    case '*':
                        return 'アスタリスク・';
                    case ']':
                        return 'ミギダイカッコ・';
                    case '}':
                        return 'ミギチュウカッコ・';
                    case ',':
                        return 'カンマ・';
                    case '.':
                        return 'ドット・';
                    case '<':
                        return 'レスザン・';
                    case '>':
                        return 'グレーターザン・';
                    case '?':
                        return 'クエスチョンマーク・';
                    case '=':
                        return 'イコール・';
                    case '-':
                        return 'ハイフン・';
                    case '+':
                        return 'プラス・';
                    default :
                        return '';
                }
            }
        }).slice(0, -1);        
        return reading_char;
    }
    return null;
};