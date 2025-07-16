// 電話番号フォーマット修正プログラム（2025年6月1日現在版）
// 作成者：一色
'use strict';
const phone_number_formatting = (telephone_number) => {

    // 入力された電話番号のハイフン位置を修正する関数
    // （入力値）
    // telephone_number = 電話番号文字列
    // （出力値） = ハイフン位置を修正した電話番号文字列
    const symbol_removal = (char) => {

        // 入力された文字列から電話番号に使われる記号を取り除く関数
        // （入力値）
        // char = 文字列
        // （出力値） = 記号が取り除かれた文字列
        if (char) { // 文字列がある場合
            const result = char.replace(/[()（）\-‐－]/g, '');
            return result;
        }
        return null;
    };
    const convert_to_single_byte_numbers = (char) => {

        // 入力された文字列から全角数字を半角数字に直す関数
        // （入力値）
        // char = 文字列
        // （出力値） = 半角数字
        const result = String(char).replace(/[０-９]/g, (char_conv) => {
            return String.fromCharCode(char_conv.charCodeAt(0) - 0xFEE0);
        });
        return result;
    };
    const area_code_list = { // 市外局番桁数.市外局番.市内局番桁数が格納されている
        5: {
            // 固定電話
            '01267': 1,
            '01372': 1,
            '01374': 1,
            '01377': 1,
            '01392': 1,
            '01397': 1,
            '01398': 1,
            '01456': 1,
            '01457': 1,
            '01466': 1,
            '01547': 1,
            '01558': 1,
            '01564': 1,
            '01586': 1,
            '01587': 1,
            '01632': 1,
            '01634': 1,
            '01635': 1,
            '01648': 1,
            '01654': 1,
            '01655': 1,
            '01656': 1,
            '01658': 1,
            '04992': 1,
            '04994': 1,
            '04996': 1,
            '04998': 1,
            '05769': 1,
            '05979': 1,
            '07468': 1,
            '08512': 1,
            '08514': 1,
            '08477': 1,
            '08387': 1,
            '08388': 1,
            '08396': 1,
            '09802': 1,
            '09912': 1,
            '09913': 1,
            '09969': 1
        },
        4: {
            // 固定電話
            '0123': 2,
            '0124': 2,
            '0125': 2,
            '0126': 2,
            '0133': 2,
            '0134': 2,
            '0135': 2,
            '0136': 2,
            '0137': 2,
            '0138': 2,
            '0139': 2,
            '0142': 2,
            '0143': 2,
            '0144': 2,
            '0145': 2,
            '0146': 2,
            '0152': 2,
            '0153': 2,
            '0154': 2,
            '0155': 2,
            '0156': 2,
            '0157': 2,
            '0158': 2,
            '0162': 2,
            '0163': 2,
            '0164': 2,
            '0165': 2,
            '0166': 2,
            '0167': 2,
            '0172': 2,
            '0173': 2,
            '0174': 2,
            '0175': 2,
            '0176': 2,
            '0178': 2,
            '0179': 2,
            '0182': 2,
            '0183': 2,
            '0184': 2,
            '0185': 2,
            '0186': 2,
            '0187': 2,
            '0191': 2,
            '0192': 2,
            '0193': 2,
            '0194': 2,
            '0195': 2,
            '0197': 2,
            '0198': 2,
            '0220': 2,
            '0223': 2,
            '0224': 2,
            '0225': 2,
            '0226': 2,
            '0228': 2,
            '0229': 2,
            '0233': 2,
            '0234': 2,
            '0235': 2,
            '0237': 2,
            '0238': 2,
            '0240': 2,
            '0241': 2,
            '0242': 2,
            '0243': 2,
            '0244': 2,
            '0246': 2,
            '0247': 2,
            '0248': 2,
            '0250': 2,
            '0254': 2,
            '0255': 2,
            '0256': 2,
            '0257': 2,
            '0258': 2,
            '0259': 2,
            '0260': 2,
            '0261': 2,
            '0263': 2,
            '0264': 2,
            '0265': 2,
            '0266': 2,
            '0267': 2,
            '0268': 2,
            '0269': 2,
            '0270': 2,
            '0274': 2,
            '0276': 2,
            '0277': 2,
            '0278': 2,
            '0279': 2,
            '0280': 2,
            '0282': 2,
            '0283': 2,
            '0284': 2,
            '0285': 2,
            '0287': 2,
            '0288': 2,
            '0289': 2,
            '0291': 2,
            '0293': 2,
            '0294': 2,
            '0295': 2,
            '0296': 2,
            '0297': 2,
            '0299': 2,
            '0422': 2,
            '0428': 2,
            '0436': 2,
            '0438': 2,
            '0439': 2,
            '0460': 2,
            '0463': 2,
            '0465': 2,
            '0466': 2,
            '0467': 2,
            '0470': 2,
            '0475': 2,
            '0476': 2,
            '0478': 2,
            '0479': 2,
            '0480': 2,
            '0493': 2,
            '0494': 2,
            '0495': 2,
            '0531': 2,
            '0532': 2,
            '0533': 2,
            '0536': 2,
            '0537': 2,
            '0538': 2,
            '0539': 2,
            '0544': 2,
            '0545': 2,
            '0547': 2,
            '0548': 2,
            '0550': 2,
            '0551': 2,
            '0553': 2,
            '0554': 2,
            '0555': 2,
            '0556': 2,
            '0557': 2,
            '0558': 2,
            '0561': 2,
            '0562': 2,
            '0563': 2,
            '0564': 2,
            '0565': 2,
            '0566': 2,
            '0567': 2,
            '0568': 2,
            '0569': 2,
            '0572': 2,
            '0573': 2,
            '0574': 2,
            '0575': 2,
            '0576': 2,
            '0577': 2,
            '0578': 2,
            '0581': 2,
            '0584': 2,
            '0585': 2,
            '0586': 2,
            '0587': 2,
            '0594': 2,
            '0595': 2,
            '0596': 2,
            '0597': 2,
            '0598': 2,
            '0599': 2,
            '0721': 2,
            '0725': 2,
            '0735': 2,
            '0736': 2,
            '0737': 2,
            '0738': 2,
            '0739': 2,
            '0740': 2,
            '0742': 2,
            '0743': 2,
            '0744': 2,
            '0745': 2,
            '0746': 2,
            '0747': 2,
            '0748': 2,
            '0749': 2,
            '0761': 2,
            '0763': 2,
            '0765': 2,
            '0766': 2,
            '0767': 2,
            '0768': 2,
            '0770': 2,
            '0771': 2,
            '0772': 2,
            '0773': 2,
            '0774': 2,
            '0776': 2,
            '0778': 2,
            '0779': 2,
            '0790': 2,
            '0791': 2,
            '0794': 2,
            '0795': 2,
            '0796': 2,
            '0797': 2,
            '0798': 2,
            '0799': 2,
            '0820': 2,
            '0823': 2,
            '0824': 2,
            '0826': 2,
            '0827': 2,
            '0829': 2,
            '0833': 2,
            '0834': 2,
            '0835': 2,
            '0836': 2,
            '0837': 2,
            '0838': 2,
            '0845': 2,
            '0846': 2,
            '0847': 2,
            '0848': 2,
            '0852': 2,
            '0853': 2,
            '0854': 2,
            '0855': 2,
            '0856': 2,
            '0857': 2,
            '0858': 2,
            '0859': 2,
            '0863': 2,
            '0865': 2,
            '0866': 2,
            '0867': 2,
            '0868': 2,
            '0869': 2,
            '0875': 2,
            '0877': 2,
            '0879': 2,
            '0880': 2,
            '0883': 2,
            '0884': 2,
            '0885': 2,
            '0887': 2,
            '0889': 2,
            '0892': 2,
            '0893': 2,
            '0894': 2,
            '0895': 2,
            '0896': 2,
            '0897': 2,
            '0898': 2,
            '0920': 2,
            '0930': 2,
            '0940': 2,
            '0942': 2,
            '0943': 2,
            '0944': 2,
            '0946': 2,
            '0947': 2,
            '0948': 2,
            '0949': 2,
            '0950': 2,
            '0952': 2,
            '0954': 2,
            '0955': 2,
            '0956': 2,
            '0957': 2,
            '0959': 2,
            '0964': 2,
            '0965': 2,
            '0966': 2,
            '0967': 2,
            '0968': 2,
            '0969': 2,
            '0972': 2,
            '0973': 2,
            '0974': 2,
            '0977': 2,
            '0978': 2,
            '0979': 2,
            '0980': 2,
            '0982': 2,
            '0983': 2,
            '0984': 2,
            '0985': 2,
            '0986': 2,
            '0987': 2,
            '0993': 2,
            '0994': 2,
            '0995': 2,
            '0996': 2,
            '0997': 2,
            // 着信課金用
            '0120': 3,
            '0800': 3,
            // 特定者向けメッセージ蓄積・再生機能
            '0170': 3,
            // 大量呼受付機能
            '0180': 3,
            // 統一番号機能
            '0570': 3,
            // 情報料代理徴収機能
            '0990': 3,
            // データ伝送携帯電話番号
            '0200': 5,
            // 無線呼出番号
            '0204': 3,
            // FMC電話番号
            '0600': 3
        },
        3: {
            // 固定電話
            '011': 3,
            '015': 3,
            '017': 3,
            '018': 3,
            '019': 3,
            '022': 3,
            '023': 3,
            '024': 3,
            '025': 3,
            '026': 3,
            '027': 3,
            '028': 3,
            '029': 3,
            '042': 3,
            '043': 3,
            '044': 3,
            '045': 3,
            '046': 3,
            '047': 3,
            '048': 3,
            '049': 3,
            '052': 3,
            '053': 3,
            '054': 3,
            '055': 3,
            '058': 3,
            '059': 3,
            '072': 3,
            '073': 3,
            '075': 3,
            '076': 3,
            '077': 3,
            '078': 3,
            '079': 3,
            '082': 3,
            '083': 3,
            '084': 3,
            '086': 3,
            '087': 3,
            '088': 3,
            '089': 3,
            '092': 3,
            '093': 3,
            '095': 3,
            '096': 3,
            '097': 3,
            '098': 3,
            '099': 3,
            // データ伝送携帯電話番号
            '020': 3,
            // 音声伝送携帯電話番号
            '060': 4,
            '070': 4,
            '080': 4,
            '090': 4,
            // 特定IP電話番号
            '050': 4,
            // 特定接続電話番号
            '091': 3,
        },
        2: {
            // 固定電話
            '03': 4,
            '04': 4,
            '06': 4
        }
    };
    let area_code = [];
    for(let number in area_code_list){
        area_code.push(number * 1);
    }
    area_code.sort(($current, $next) => {
        return ($next - $current); 
    });
    if (telephone_number) { // 電話番号文字列がある場合
        const telephone_number_sr = symbol_removal(telephone_number);
        const telephone_number_sbn = convert_to_single_byte_numbers(telephone_number_sr);
        for(let c = 0, l = area_code.length; c < l; c++){
            let area_code_len = area_code[c];
            let telephone_number_area_code = telephone_number_sbn.substring(0, area_code_len);
            let local_area_code_len = area_code_list[area_code_len][telephone_number_area_code];
            if (local_area_code_len) { // 市内局番等に相当する文字数がある場合
                let landline_flag = false;
                let reject_flag = false;
                const local_code = Number(telephone_number_sbn.substring(area_code_len, area_code_len + local_area_code_len));
                switch (telephone_number_area_code) { // 市外局番等別の処理
                    case '0200': // データ伝送携帯電話番号（14桁固定）
                        if (telephone_number_sbn.length !== 14) { // 電話番号が14桁以外の場合
                            return telephone_number_sbn;
                        }
                        break;
                    case '0800': // 着信課金用（11桁固定）
                    case '020': // データ伝送携帯電話番号（11桁固定）
                    case '060': // 音声伝送携帯電話番号（11桁固定）
                    case '070': // 音声伝送携帯電話番号（11桁固定）
                    case '080': // 音声伝送携帯電話番号（11桁固定）
                    case '090': // 音声伝送携帯電話番号（11桁固定）
                    case '0204': // 無線呼出番号（11桁固定）
                    case '050': // 特定IP電話番号（11桁固定）
                    case '0600': // FMC電話番号（11桁固定）
                        if (telephone_number_sbn.length !== 11) { // 電話番号が11桁以外の場合
                            return telephone_number_sbn;
                        }
                        break;
                    case '091': // 特定接続電話番号（6～13桁変動）
                        if (telephone_number_sbn.length < 6 || telephone_number_sbn.length > 13) { // 電話番号が6桁未満もしくは13桁以上の場合
                            return telephone_number_sbn;
                        }
                        break;
                    default : // それ以外（10桁固定）
                        if (telephone_number_sbn.length !== 10) { // 電話番号が10桁以外の場合
                            return telephone_number_sbn;
                        } else if ((telephone_number_area_code !== '0120') && (telephone_number_area_code !== '0170') && (telephone_number_area_code !== '0180') && (telephone_number_area_code !== '0570') && (telephone_number_area_code !== '0990')) { // 固定電話番号の場合
                            landline_flag = true;
                        }
                        break;
                }
                if (landline_flag) { // 固定電話の場合
                    if (Number(String(local_code).substring(0, 1)) <= 1) { // 市内局番の1桁目が0と1の場合
                        reject_flag = true;
                    }
                    if (!reject_flag) { // 変換拒否フラグが立っていない場合
                        reject_flag = true;
                        switch (telephone_number_area_code) { // 市外局番別の処理
                            case '01267': // 一般的な5桁市外局番の処理を実行
                            case '01372':
                            case '01374':
                            case '01377':
                            case '01392':
                            case '01397':
                            case '01398':
                            case '01456':
                            case '01457':
                            case '01466':
                            case '01547':
                            case '01558':
                            case '01564':
                            case '01586':
                            case '01587':
                            case '01632':
                            case '01634':
                            case '01635':
                            case '01648':
                            case '01654':
                            case '01655':
                            case '01656':
                            case '01658':
                            case '04992': // 一般的な5桁市外局番の処理を実行
                            case '04994':
                            case '04996':
                            case '04998':
                            case '05769': // 一般的な5桁市外局番の処理を実行
                            case '07468': // 一般的な5桁市外局番の処理を実行
                            case '08387': // 一般的な5桁市外局番の処理を実行
                            case '08388':
                            case '08477':
                            case '08512':
                            case '08514':
                            case '09802': // 一般的な5桁市外局番の処理を実行
                            case '09912':
                            case '09913':
                            case '09969':
                                if (local_code >= 2 && local_code <= 9) { // 市内局番が2～9の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0125': // 一般的な4桁市外局番の処理を実行
                            case '0134':
                            case '0138':
                            case '0142':
                            case '0143':
                            case '0144':
                            case '0157':
                            case '0162':
                            case '0166':
                            case '0167':
                            case '0172':
                            case '0174':
                            case '0176':
                            case '0178':
                            case '0179':
                            case '0182':
                            case '0183':
                            case '0184':
                            case '0186':
                            case '0191':
                            case '0192':
                            case '0193':
                            case '0220': // 一般的な4桁市外局番の処理を実行
                            case '0225':
                            case '0226':
                            case '0228':
                            case '0229':
                            case '0233':
                            case '0234':
                            case '0235':
                            case '0238':
                            case '0242':
                            case '0243':
                            case '0244':
                            case '0246':
                            case '0248':
                            case '0250':
                            case '0256':
                            case '0258':
                            case '0263':
                            case '0265':
                            case '0266':
                            case '0267':
                            case '0268':
                            case '0270':
                            case '0276':
                            case '0277':
                            case '0279':
                            case '0280':
                            case '0282':
                            case '0284':
                            case '0285':
                            case '0287':
                            case '0288':
                            case '0294':
                            case '0297':
                            case '0299':
                            case '0422': // 一般的な4桁市外局番の処理を実行
                            case '0436':
                            case '0438':
                            case '0439':
                            case '0463':
                            case '0465':
                            case '0466':
                            case '0467':
                            case '0476':
                            case '0480':
                            case '0493':
                            case '0494':
                            case '0495':
                            case '0532': // 一般的な4桁市外局番の処理を実行
                            case '0533':
                            case '0537':
                            case '0538':
                            case '0544':
                            case '0545':
                            case '0547':
                            case '0548':
                            case '0550':
                            case '0553':
                            case '0554':
                            case '0555':
                            case '0557':
                            case '0558':
                            case '0562':
                            case '0563':
                            case '0564':
                            case '0565':
                            case '0566':
                            case '0567':
                            case '0568':
                            case '0569':
                            case '0572':
                            case '0577':
                            case '0584':
                            case '0585':
                            case '0586':
                            case '0587':
                            case '0594':
                            case '0595':
                            case '0725': // 一般的な4桁市外局番の処理を実行
                            case '0737':
                            case '0738':
                            case '0739':
                            case '0742':
                            case '0743':
                            case '0744':
                            case '0745':
                            case '0763':
                            case '0765':
                            case '0766':
                            case '0774':
                            case '0776':
                            case '0778':
                            case '0797':
                            case '0798':
                            case '0823': // 一般的な4桁市外局番の処理を実行
                            case '0833':
                            case '0834':
                            case '0835':
                            case '0836':
                            case '0848':
                            case '0852':
                            case '0853':
                            case '0854':
                            case '0855':
                            case '0857':
                            case '0875':
                            case '0877':
                            case '0880':
                            case '0892':
                            case '0893':
                            case '0894':
                            case '0896':
                            case '0898':
                            case '0940': // 一般的な4桁市外局番の処理を実行
                            case '0942':
                            case '0944':
                            case '0946':
                            case '0947':
                            case '0948':
                            case '0950':
                            case '0952':
                            case '0956':
                            case '0959':
                            case '0964':
                            case '0965':
                            case '0977':
                            case '0979':
                            case '0982':
                            case '0983':
                            case '0984':
                            case '0985':
                            case '0986':
                            case '0987':
                                if (local_code >= 20 && local_code <= 99) { // 市内局番が20～99の場合
                                    reject_flag = false;
                                }
                                break;
                            case '044': // 一般的な3桁市外局番の処理を実行
                            case '045':
                            case '052':
                            case '075':
                            case '078':
                            case '092':
                            case '093':
                                if (local_code >= 200 && local_code <= 999) { // 市内局番が200～999の場合
                                    reject_flag = false;
                                }
                                break;
                            // 以下は通常より市内局番が少ない市外局番
                            case '0223':
                            case '0260':
                            case '0740':
                            case '0845':
                                if (local_code >= 20 && local_code <= 39) { // 市内局番が20～39の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0240':
                            case '0257':
                            case '0293':
                            case '0531':
                                if (local_code >= 20 && local_code <= 49) { // 市内局番が20～49の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0264':
                            case '0838':
                            case '0930':
                                if (local_code >= 20 && local_code <= 59) { // 市内局番が20～59の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0747':
                            case '0889':
                                if (local_code >= 20 && local_code <= 69) { // 市内局番が20～69の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0136':
                            case '0194':
                            case '0278':
                            case '0596':
                            case '0735':
                            case '0770':
                            case '0995':
                                if (local_code >= 20 && local_code <= 79) { // 市内局番が20～79の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0761':
                                if (local_code >= 20 && local_code <= 84) { // 市内局番が20～84の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0173': // 市内局番が20～89の4桁市外局番の処理を実行
                            case '0185':
                            case '0195':
                            case '0197':
                            case '0224': // 市内局番が20～89の4桁市外局番の処理を実行
                            case '0237':
                            case '0247':
                            case '0259':
                            case '0269':
                            case '0274':
                            case '0470': // 市内局番が20～89の4桁市外局番の処理を実行
                            case '0475':
                            case '0479':
                            case '0573': // 市内局番が20～89の4桁市外局番の処理を実行
                            case '0574':
                            case '0575':
                            case '0576':
                            case '0598':
                            case '0599':
                            case '0736': // 市内局番が20～89の4桁市外局番の処理を実行
                            case '0748':
                            case '0749':
                            case '0767':
                            case '0768':
                            case '0771':
                            case '0772':
                            case '0773':
                            case '0790':
                            case '0799':
                            case '0820': // 市内局番が20～89の4桁市外局番の処理を実行
                            case '0826':
                            case '0858':
                            case '0859':
                            case '0868':
                            case '0879':
                            case '0883':
                            case '0884':
                            case '0895':
                            case '0897':
                            case '0955': // 市内局番が20～89の4桁市外局番の処理を実行
                            case '0957':
                            case '0968':
                            case '0969':
                            case '0972':
                            case '0996':
                                if (local_code >= 20 && local_code <= 89) { // 市内局番が20～89の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0291':
                                if (local_code >= 30 && local_code <= 49) { // 市内局番が30～49の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0746':
                                if (local_code >= 30 && local_code <= 69) { // 市内局番が30～69の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0187':
                                if (local_code >= 30 && local_code <= 89) { // 市内局番が30～89の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0824':
                                if (local_code >= 40 && local_code <= 89) { // 市内局番が40～89の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0478':
                                if (local_code >= 50 && local_code <= 89) { // 市内局番が50～89の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0794':
                                if (local_code >= 60 && local_code <= 89) { // 市内局番が60～89の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0289':
                                if (local_code >= 60 && local_code <= 99) { // 市内局番が60～99の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0255':
                            case '0578':
                                if (local_code >= 70 && local_code <= 89) { // 市内局番が70～89の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0460':
                                if (local_code >= 80 && local_code <= 89) { // 市内局番が80～89の場合
                                    reject_flag = false;
                                }
                                break;
                            case '049':
                                if (local_code >= 200 && local_code <= 299) { // 市内局番が200～299の場合
                                    reject_flag = false;
                                }
                                break;
                            case '058':
                            case '096':
                                if (local_code >= 200 && local_code <= 399) { // 市内局番が200～399の場合
                                    reject_flag = false;
                                }
                                break;
                            case '043':
                                if (local_code >= 200 && local_code <= 499) { // 市内局番が200～499の場合
                                    reject_flag = false;
                                }
                                break;
                            case '011':
                                if (local_code >= 200 && local_code <= 899) { // 市内局番が200～899の場合
                                    reject_flag = false;
                                }
                                break;
                            case '073':
                                if (local_code >= 400 && local_code <= 499) { // 市内局番が400～499の場合
                                    reject_flag = false;
                                }
                                break;
                            case '097':
                                if (local_code >= 500 && local_code <= 599) { // 市内局番が500～599の場合
                                    reject_flag = false;
                                }
                                break;
                            case '018':
                            case '087':
                            case '095':
                                if (local_code >= 800 && local_code <= 899) { // 市内局番が800～899の場合
                                    reject_flag = false;
                                }
                                break;
                            case '098':
                                if (local_code >= 800 && local_code <= 999) { // 市内局番が800～999の場合
                                    reject_flag = false;
                                }
                                break;
                            case '084':
                            case '089':
                                if (local_code >= 900 && local_code <= 999) { // 市内局番が900～999の場合
                                    reject_flag = false;
                                }
                                break;
                            // その他の例外処理がある市外局番
                            case '0123':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 51 && local_code !== 61 && local_code !== 71 && local_code !== 81) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0124':
                                if (local_code >= 20 && local_code <= 39 && local_code !== 21) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0126':
                                if (local_code >= 20 && local_code <= 69 && local_code !== 61) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0133':
                                if ((local_code >= 20 && local_code <= 39 && local_code !== 21) || (local_code >= 60 && local_code <= 79 && local_code !== 61)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0135':
                                if ((local_code >= 20 && local_code <= 49) || (local_code >= 60 && local_code <= 79)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0137':
                                if ((local_code >= 50 && local_code <= 69 && local_code !== 61) || (local_code >= 80 && local_code <= 89 && local_code !== 81)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0139':
                                if (local_code >= 30 && local_code <= 69 && local_code !== 41 && local_code !== 51 && local_code !== 61) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0145':
                                if (local_code >= 20 && local_code <= 59 && local_code !== 21 && local_code !== 41) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0146':
                                if (local_code >= 20 && local_code <= 59 && local_code !== 21 && local_code !== 31 && local_code !== 41) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0152':
                                if (local_code >= 20 && local_code <= 89 && local_code !== 21 && local_code !== 71) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0153':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 21 && local_code !== 51 && local_code !== 71 && local_code !== 81) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '015':
                                if ((local_code >= 410 && local_code <= 419 && local_code !== 417) || (local_code >= 480 && local_code <= 489 && local_code !== 481) || (local_code >= 510 && local_code <= 519 && local_code !== 517) || (local_code >= 570 && local_code <= 579 && local_code !== 571)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0154':
                                if ((local_code >= 20 && local_code <= 69) || (local_code >= 90 && local_code <= 99)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0155':
                                if ((local_code >= 20 && local_code <= 69) || (local_code >= 90 && local_code <= 99)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0156':
                                if ((local_code >= 20 && local_code <= 39 && local_code !== 21) || (local_code >= 60 && local_code <= 79 && local_code !== 61)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0158':
                                if ((local_code >= 20 && local_code <= 59 && local_code !== 21 && local_code !== 41) || (local_code >= 80 && local_code <= 99 && local_code !== 81)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0163':
                                if (local_code >= 60 && local_code <= 99 && local_code !== 61 && local_code !== 81) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0164':
                                if (local_code >= 20 && local_code <= 79 && local_code !== 21 && local_code !== 31 && local_code !== 41 && local_code !== 51 && local_code !== 61) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0165':
                                if (local_code >= 20 && local_code <= 39 && local_code !== 21 && local_code !== 31) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0175':
                                if ((local_code >= 20 && local_code <= 49) || (local_code >= 60 && local_code <= 79)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '017':
                                if (local_code >= 700 && local_code <= 799 && local_code !== 717) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '019':
                                if ((local_code >= 600 && local_code <= 699 && local_code !== 617) || (local_code >= 900 && local_code <= 929)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0198':
                                if ((local_code >= 20 && local_code <= 49) || (local_code >= 60 && local_code <= 79)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '022':
                                if ((local_code >= 200 && local_code <= 309) || (local_code >= 340 && local_code <= 399) || (local_code >= 700 && local_code <= 799)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '023':
                                if (local_code >= 600 && local_code <= 699 && local_code !== 617) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0241':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 77) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '024':
                                if ((local_code >= 500 && local_code <= 599 && local_code !== 517) || (local_code >= 900 && local_code <= 999 && local_code !== 917)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '025':
                                if ((local_code >= 200 && local_code <= 399 && local_code !== 217) || (local_code >= 500 && local_code <= 569 && local_code !== 517) || (local_code >= 590 && local_code <= 609 && local_code !== 591) || (local_code >= 700 && local_code <= 719 && local_code !== 717) || (local_code >= 750 && local_code <= 809 && local_code !== 791)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0254':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 91) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0261':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 77) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '026':
                                if ((local_code >= 200 && local_code <= 299) || (local_code >= 400 && local_code <= 409) || (local_code >= 460 && local_code <= 499)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '027':
                                if ((local_code >= 200 && local_code <= 399) || (local_code >= 800 && local_code <= 809) || (local_code >= 880 && local_code <= 899)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '028':
                                if ((local_code >= 300 && local_code <= 309) || (local_code >= 330 && local_code <= 349) || (local_code >= 600 && local_code <= 699) || (local_code >= 900 && local_code <= 909) || (local_code >= 920 && local_code <= 959)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0283':
                                if ((local_code >= 20 && local_code <= 29) || (local_code >= 50 && local_code <= 99)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '029':
                                if ((local_code >= 200 && local_code <= 309) || (local_code >= 350 && local_code <= 399) || (local_code >= 800 && local_code <= 899)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0295':
                                if (local_code >= 50 && local_code <= 79 && local_code !== 71) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0296':
                                if ((local_code >= 20 && local_code <= 59) || (local_code >= 70 && local_code <= 89)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '03':
                                if ((local_code >= 3100 && local_code <= 3999) || (local_code >= 4200 && local_code <= 4599) || (local_code >= 5000 && local_code <= 5999) || (local_code >= 6100 && local_code <= 6999)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '04':
                                if ((local_code >= 2000 && local_code <= 2009) || (local_code >= 2900 && local_code <= 2909) || (local_code >= 2920 && local_code <= 2969) || (local_code >= 2990 && local_code <= 2999) || (local_code >= 7000 && local_code <= 7009) || (local_code >= 7090 && local_code <= 7199 && local_code !== 7117 && local_code !== 7177)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '042':
                                if ((local_code >= 200 && local_code <= 209) || (local_code >= 300 && local_code <= 599 && local_code !== 317 && local_code !== 417 && local_code !== 517) || (local_code >= 610 && local_code <= 819 && local_code !== 617 && local_code !== 671 && local_code !== 681 && local_code !== 717 && local_code !== 731 && local_code !== 781 && local_code !== 817) || (local_code >= 840 && local_code <= 869) || (local_code >= 910 && local_code <= 919 && local_code !== 917) || (local_code >= 970 && local_code <= 989)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0428':
                                if ((local_code >= 20 && local_code <= 39) || (local_code >= 70 && local_code <= 99)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '046':
                                if ((local_code >= 200 && local_code <= 299 && local_code !== 217) || (local_code >= 400 && local_code <= 419) || (local_code >= 800 && local_code <= 899 && local_code !== 817)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '047':
                                if ((local_code >= 300 && local_code <= 499) || (local_code >= 700 && local_code <= 729) || (local_code >= 750 && local_code <= 779)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '048':
                                if ((local_code >= 200 && local_code <= 299) || (local_code >= 400 && local_code <= 999)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '053':
                                if ((local_code >= 400 && local_code <= 599) || (local_code >= 920 && local_code <= 959) || (local_code >= 964 && local_code <= 989 && local_code !== 974 && local_code !== 977)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0536':
                                if ((local_code >= 20 && local_code <= 39) || (local_code >= 60 && local_code <= 89)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0539':
                                if ((local_code >= 60 && local_code <= 63) || local_code === 74 || local_code === 77 || (local_code >= 90 && local_code <= 99)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '054':
                                if ((local_code >= 200 && local_code <= 299) || (local_code >= 320 && local_code <= 399) || (local_code >= 600 && local_code <= 699) || (local_code >= 900 && local_code <= 909)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0551':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 77) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '055':
                                if ((local_code >= 200 && local_code <= 299 && local_code !== 217) || (local_code >= 900 && local_code <= 999 && local_code !== 917)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0556':
                                if (local_code >= 20 && local_code <= 69 && local_code !== 61) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0561':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 77) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0581':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 77) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '059':
                                if ((local_code >= 200 && local_code <= 299) || (local_code >= 310 && local_code <= 399) || (local_code >= 990 && local_code <= 999)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0597':
                                if ((local_code >= 20 && local_code <= 39) || (local_code >= 42 && local_code <= 49) || (local_code >= 70 && local_code <= 90) || local_code === 97 || local_code === 98) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '05979':
                                if ((local_code >= 2 && local_code <= 6) || local_code === 9) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '06':
                                if ((local_code >= 4100 && local_code <= 4999) || (local_code >= 6100 && local_code <= 6999) || (local_code >= 7100 && local_code <= 7999)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0721':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 77) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '072':
                                if ((local_code >= 200 && local_code <= 499) || (local_code >= 600 && local_code <= 999)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '076':
                                if ((local_code >= 200 && local_code <= 299 && local_code !== 217) || (local_code >= 400 && local_code <= 499 && local_code !== 417)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '077':
                                if (local_code >= 500 && local_code <= 599 && local_code !== 517) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0779'://?
                                if ((local_code >= 60 && local_code <= 71) || (local_code >= 77 && local_code <= 89)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0791':
                                if ((local_code >= 20 && local_code <= 29) || (local_code >= 40 && local_code <= 79)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '079':
                                if ((local_code >= 200 && local_code <= 339) || (local_code >= 400 && local_code <= 409) || (local_code >= 420 && local_code <= 459) || (local_code >= 490 && local_code <= 509) || (local_code >= 550 && local_code <= 569) || (local_code >= 590 && local_code <= 609) || (local_code >= 660 && local_code <= 679)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0795':
                                if ((local_code >= 20 && local_code <= 49) || (local_code >= 70 && local_code <= 89)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0796':
                                if ((local_code >= 20 && local_code <= 59) || (local_code >= 80 && local_code <= 99)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '082':
                                if ((local_code >= 200 && local_code <= 299) || (local_code >= 400 && local_code <= 409) || (local_code >= 420 && local_code <= 439) || (local_code >= 490 && local_code <= 599) || (local_code >= 800 && local_code <= 909) || (local_code >= 921 && local_code <= 929) || (local_code >= 941 && local_code <= 943) || (local_code >= 960 && local_code <= 969) || (local_code >= 990 && local_code <= 999)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0827':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 51) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0829':
                                if (local_code === 20 || (local_code >= 30 && local_code <= 40) || (local_code >= 44 && local_code <= 59) || (local_code >= 70 && local_code <= 89)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '083':
                                if ((local_code >= 220 && local_code <= 299) || (local_code >= 600 && local_code <= 609) || (local_code >= 766 && local_code <= 768) || (local_code >= 770 && local_code <= 789) || (local_code >= 900 && local_code <= 960 && local_code !== 951) || local_code === 963 || local_code === 966 || (local_code >= 970 && local_code <= 999)) {
                                    reject_flag = false;
                                }
                                break;
                            case '0837':
                                if ((local_code >= 20 && local_code <= 65) || local_code === 69) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '08396':
                                if (local_code >= 2 && local_code <= 9 && local_code !== 3 && local_code !== 6) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0846':
                                if ((local_code >= 20 && local_code <= 49) || (local_code >= 60 && local_code <= 79)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0847':
                                if ((local_code >= 20 && local_code <= 69) || (local_code >= 80 && local_code <= 99)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0856':
                                if ((local_code >= 20 && local_code <= 59) || (local_code >= 70 && local_code <= 89)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '086':
                                if ((local_code >= 200 && local_code <= 299) || (local_code >= 362 && local_code <= 369 && local_code !== 366) || (local_code >= 420 && local_code <= 489) || (local_code >= 520 && local_code <= 529) || local_code === 552 || local_code === 553 || (local_code >= 600 && local_code <= 609) || local_code === 691 || local_code === 697 || local_code === 698 || (local_code >= 722 && local_code <= 728 && local_code !== 725 && local_code !== 727) || local_code === 737 || local_code === 738 || (local_code >= 800 && local_code <= 809) || (local_code >= 890 && local_code <= 909) || (local_code >= 940 && local_code <= 959) || (local_code >= 994 && local_code <= 999)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0863':
                                if ((local_code >= 20 && local_code <= 59) || local_code === 66 || (local_code >= 70 && local_code <= 89)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0865':
                                if ((local_code >= 40 && local_code <= 51) || (local_code >= 54 && local_code <= 79)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0866':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 91 && local_code !== 97 && local_code !== 98) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0867':
                                if (local_code === 20 || local_code === 21 || local_code === 25 || local_code === 27 || (local_code >= 29 && local_code <= 36) || (local_code >= 39 && local_code <= 99)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0869':
                                if ((local_code >= 20 && local_code <= 29) || local_code === 34 || (local_code >= 60 && local_code <= 89) || local_code === 92 || local_code === 93) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0885':
                                if (local_code >= 30 && local_code <= 49 && local_code !== 31 && local_code !== 41) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '088':
                                if ((local_code >= 600 && local_code <= 699 && local_code !== 617) || (local_code >= 800 && local_code <= 899 && local_code !== 817)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0887':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 21) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0920':
                                if ((local_code >= 40 && local_code <= 59) || (local_code >= 80 && local_code <= 89)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0943':
                                if ((local_code >= 20 && local_code <= 59) || (local_code >= 70 && local_code <= 89)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0949':
                                if ((local_code >= 20 && local_code <= 59) || (local_code >= 62 && local_code <= 69)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0954':
                                if ((local_code >= 20 && local_code <= 49) || (local_code >= 60 && local_code <= 79)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0966':
                                if (local_code >= 20 && local_code <= 89 && local_code !== 21) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0967':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 21) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0973':
                                if ((local_code >= 20 && local_code <= 59) || (local_code >= 70 && local_code <= 89)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0974':
                                if ((local_code >= 20 && local_code <= 49 && local_code !== 21) || (local_code >= 60 && local_code <= 79 && local_code !== 61)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0978':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 21 && local_code !== 61) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0980':
                                if (local_code >= 30 && local_code <= 99 && local_code !== 71 && local_code !== 81) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '099':
                                if ((local_code >= 200 && local_code <= 299 && local_code !== 217) || local_code === 331 || local_code === 343 || local_code === 345 || local_code === 347 || (local_code >= 400 && local_code <= 409) || (local_code >= 470 && local_code <= 489) || (local_code >= 800 && local_code <= 839)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0993':
                                if (local_code >= 20 && local_code <= 89 && local_code !== 31 && local_code !== 43 && local_code !== 45 && local_code !== 47) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0994':
                                if ((local_code >= 20 && local_code <= 69) || (local_code >= 90 && local_code <= 99)) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                            case '0997':
                                if (local_code >= 20 && local_code <= 99 && local_code !== 21) { // 左に記載の条件の場合
                                    reject_flag = false;
                                }
                                break;
                        }
                    }
                } else if (telephone_number_area_code === '0170') { // 電気通信番号指定が特定者向けメッセージ蓄積・再生機能の場合
                    return telephone_number_sbn;
                } else if (telephone_number_area_code === '0180') { // 電気通信番号指定が大量呼受付機能の場合
                    return telephone_number_sbn;
                } else if (telephone_number_area_code === '020' && ((local_code >= 0 && local_code <= 99) || (local_code >= 400 && local_code <= 499))) { // 電気通信番号指定がデータ伝送携帯電話番号の場合で指定に含まれない番号の範囲の場合
                    return telephone_number_sbn;
                } else if (telephone_number_area_code === '0200' && ((local_code >= 0 && local_code <= 9999) || (local_code >= 11000 && local_code <= 99999))) { // 電気通信番号指定がデータ伝送携帯電話番号の場合で指定に含まれない番号の範囲の場合
                    return telephone_number_sbn;
                } else if ((telephone_number_area_code === '060' || telephone_number_area_code === '070' || telephone_number_area_code === '080' || telephone_number_area_code === '090') && local_code >= 0 && local_code <= 999) { // 電気通信番号指定が音声伝送携帯電話番号の場合で指定に含まれない番号の範囲の場合
                    return telephone_number_sbn;
                } else if (telephone_number_area_code === '0204') { // 電気通信番号指定が無線呼出番号の場合
                    return telephone_number_sbn;
                } else if (telephone_number_area_code === '050' && local_code >= 0 && local_code <= 999) { // 電気通信番号指定が特定IP電話番号の場合で指定に含まれない番号の範囲の場合
                    return telephone_number_sbn;
                } else if (telephone_number_area_code === '0600') { // 電気通信番号指定がFMC電話番号の場合
                    return telephone_number_sbn;
                } else if (telephone_number_area_code === '091') { // 電気通信番号指定が特定接続電話番号の場合
                    return telephone_number_sbn;
                }
                if (!reject_flag) { // ハイフン位置を修正できる条件の場合
                    return telephone_number_area_code + "-" + local_code + (telephone_number_sbn.substring(area_code_len + local_area_code_len) !== "" ? "-" + telephone_number_sbn.substring(area_code_len + local_area_code_len) : "");
                }
            }   
        }
        return telephone_number_sbn;
    } else { // 電話番号文字列がない場合
        return null;
    }
};