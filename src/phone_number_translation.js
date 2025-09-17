/**
 * 電話番号統一フォーマット処理用ユーティリティ関数群
 * このプログラムは、電話番号のフォーマットを統一するためのものです。
 * 電話番号の市外局番、携帯電話番号等の電気通信番号の指定通信番号の桁数、市内局番の桁数、もしくは局番の桁数を考慮してハイフン位置を修正します。
 * また、電話番号の入力に使用される可能性のある全角数字や記号を半角数字に変換し、不要な記号を削除します。
 * 電話番号データ（_pn_phoneNumberData関数内に格納）は、2025年8月1日現在の総務省の公開情報（https://www.soumu.go.jp/main_sosiki/joho_tsusin/top/tel_number/index.html）に基づいています。
 * なお、このプログラムは日本国内の利用者設備識別番号のうちIMSIを除いた番号に特化しており、国際電話番号には対応していません。
 * 
 * エラーハンドリング:
 * - 無効な電話番号入力に対しては、throw new Error()で適切なエラーメッセージを投げます。
 * - 従来のnull返却ではなく、例外ベースのエラーハンドリングを採用しています。
 * - 使用時はtry-catch文でエラーをキャッチしてください。
 * 
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// ==================== 電話番号データ定義ここから ====================
// ※この部分は総務省の最新データに合わせて随時差し替えてください
const _pn_phoneNumberData = {
    // 市外局番ごとの市内局番（もしくは局番）の桁数リスト        
    'areaCodeList': {
        '5': {
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
        '4': {
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
            '0120': 3,
            '0800': 3,
            '0170': 3,
            '0180': 3,
            '0570': 3,
            '0990': 3,
            '0200': 5,
            '0204': 3,
            '0600': 3
        },
        '3': {
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
            '020': 3,
            '060': 4,
            '070': 4,
            '080': 4,
            '090': 4,
            '050': 4,
            '091': 3
        },
        '2': {
            '03': 4,
            '04': 4,
            '06': 4
        }
    },
    // 電話番号市外局番ごとの市内局番（もしくは局番）の番号範囲リスト
    // 市内局番（もしくは局番）の最初の2桁が範囲に含まれる場合、その市外局番を適用する
    // 例：市外局番が0123の場合、市内局番の最初の2桁が20～50、52～60、62～70、72～80、82～99のいずれかに該当する場合に0123を適用
    'areaCodeRanges': {
        '011': '200-899',
        '0123': '20-50,52-60,62-70,72-80,82-99',
        '0124': '20,22-39',
        '0125': '20-99',
        '0126': '20-60,62-69',
        '01267': '2-9',
        '0133': '20,22-39,60,62-79',
        '0134': '20-99',
        '0135': '20-49,60-79',
        '0136': '20-79',
        '01372': '2-9',
        '01374': '2-9',
        '0137': '50-60,62-69,80,82-89',
        '01377': '2-9',
        '0138': '20-99',
        '01392': '2-9',
        '0139': '30-40,42-50,52-60,62-69',
        '01397': '2-9',
        '01398': '2-9',
        '0142': '20-99',
        '0143': '20-99',
        '0144': '20-99',
        '0145': '20,22-40,42-59',
        '01456': '2-9',
        '01457': '2-9',
        '0146': '20,22-30,32-40,42-59',
        '01466': '2-9',
        '0152': '20,22-70,72-89',
        '0153': '20,22-50,52-70,72-80,82-99',
        '015': '410-416,417-419,480,482-489,510-516,518-519,570,572-579',
        '0154': '20-69,90-99',
        '01547': '2-9',
        '0155': '20-69,90-99',
        '01558': '2-9',
        '0156': '20,22-39,60,62-79',
        '01564': '2-9',
        '0157': '20-99',
        '0158': '20,22-40,42-59,80,82-99',
        '01586': '2-9',
        '01587': '2-9',
        '0162': '20-99',
        '01632': '2-9',
        '01634': '2-9',
        '01635': '2-9',
        '0163': '60,62-80,82-99',
        '0164': '20,22-30,32-40,42-50,52-60,62-79',
        '01648': '2-9',
        '0165': '20,22-30,32-39',
        '01654': '2-9',
        '01655': '2-9',
        '01656': '2-9',
        '01658': '2-9',
        '0166': '20-99',
        '0167': '20-99',
        '0172': '20-99',
        '0173': '20-89',
        '0174': '20-99',
        '0175': '20-49,60-79',
        '0176': '20-99',
        '0177': '700-716,718-799',
        '0178': '20-99',
        '0179': '20-99',
        '0182': '20-99',
        '0183': '20-99',
        '0184': '20-99',
        '0185': '20-89',
        '0186': '20-99',
        '0187': '30-89',
        '018': '800-899',
        '0191': '20-99',
        '0192': '20-99',
        '0193': '20-99',
        '0194': '20-79',
        '0195': '20-89',
        '0196': '600-616,618-699,900-929',
        '0197': '20-89',
        '0198': '20-49,60-79',
        '0220': '20-99',
        '022': '200-309,340-399,700-799',
        '0223': '20-39',
        '0224': '20-89',
        '0225': '20-99',
        '0226': '20-99',
        '0228': '20-99',
        '0229': '20-99',
        '0233': '20-99',
        '0234': '20-99',
        '0235': '20-99',
        '023': '600-616,618-699',
        '0237': '20-89',
        '0238': '20-99',
        '0240': '20-49',
        '0241': '20-76,78-99',
        '0242': '20-99',
        '0243': '20-99',
        '0244': '20-99',
        '0245': '500-516,518-599,900-916,918-999',
        '0246': '20-99',
        '0247': '20-89',
        '0248': '20-99',
        '0250': '20-99',
        '025': '200-216,218-399,500-516,518-569,590,592-609,700-716,718-719,750-790,792-809',
        '0254': '20-90,92-99',
        '0255': '70-89',
        '0256': '20-99',
        '0257': '20-49',
        '0258': '20-99',
        '0259': '20-89',
        '0260': '20-39',
        '0261': '20-76,78-99',
        '026': '200-299,400-409,460-499',
        '0263': '20-99',
        '0264': '20-59',
        '0265': '20-99',
        '0266': '20-99',
        '0267': '20-99',
        '0268': '20-99',
        '0269': '20-89',
        '0270': '20-99',
        '027': '200-399,800-809,880-899',
        '0274': '20-89',
        '0276': '20-99',
        '0277': '20-99',
        '0278': '20-79',
        '0279': '20-99',
        '0280': '20-99',
        '0282': '20-99',
        '028': '300-309,330-349,600-699,900-909,920-959',
        '0283': '20-29,50-99',
        '0284': '20-99',
        '0285': '20-99',
        '0287': '20-99',
        '0288': '20-99',
        '0289': '60-99',
        '0291': '30-49',
        '029': '200-309,350-399,800-899',
        '0293': '20-49',
        '0294': '20-99',
        '0295': '50-70,72-79',
        '0296': '20-59,70-89',
        '0297': '20-99',
        '0299': '20-99',
        '03': '3100-3999,4200-4599,5000-5999,6100-6999',
        '04': '2000-2009,2900-2909,2920-2969,2990-2999,7000-7009,7090-7116,7118-7176,7178-7199',
        '042': '200-209,300-316,318-416,418-516,518-599,610-616,618-670,672-680,682-716,718-730,732-780,782-816,818-819,840-869,910-916,918-919,970-989',
        '0422': '20-99',
        '0428': '20-39,70-99',
        '043': '200-499',
        '0436': '20-99',
        '0438': '20-99',
        '0439': '20-99',
        '044': '200-999',
        '045': '200-999',
        '0460': '80-89',
        '046': '200-216,218-299,400-419,800-816,818-899',
        '0463': '20-99',
        '0465': '20-99',
        '0466': '20-99',
        '0467': '20-99',
        '0470': '20-89',
        '047': '300-499,700-729,750-779',
        '0475': '20-89',
        '0476': '20-99',
        '0478': '50-89',
        '0479': '20-89',
        '0480': '20-99',
        '048': '200-299,400-999',
        '049': '200-299',
        '0493': '20-99',
        '0494': '20-99',
        '0495': '20-99',
        '04992': '2-9',
        '04994': '2-9',
        '04996': '2-9',
        '04998': '2-9',
        '052': '200-999',
        '0531': '20-49',
        '0532': '20-99',
        '0533': '20-99',
        '053': '400-599,920-959,964-973,975-976,978-989',
        '0536': '20-39,60-89',
        '0537': '20-99',
        '0538': '20-99',
        '0539': '60-63,74,77,90-99',
        '054': '200-299,320-399,600-699,900-909',
        '0556': '20-60,62-69',
        '0544': '20-99',
        '0545': '20-99',
        '0547': '20-99',
        '0548': '20-99',
        '0550': '20-99',
        '0551': '20-76,78-99',
        '055': '200-216,218-299,900-916,918-999',
        '0553': '20-99',
        '0554': '20-99',
        '0555': '20-99',
        '0557': '20-99',
        '0558': '20-99',
        '0561': '20-76,78-99',
        '0562': '20-99',
        '0563': '20-99',
        '0564': '20-99',
        '0565': '20-99',
        '0566': '20-99',
        '0567': '20-99',
        '0568': '20-99',
        '0569': '20-99',
        '0572': '20-99',
        '0573': '20-89',
        '0574': '20-89',
        '0575': '20-89',
        '0576': '20-89',
        '05769': '2-9',
        '0577': '20-99',
        '0578': '70-89',
        '0581': '20-76,78-99',
        '058': '200-399',
        '0584': '20-99',
        '0585': '20-99',
        '0586': '20-99',
        '0587': '20-99',
        '059': '200-299,310-399,990-999',
        '0594': '20-99',
        '0595': '20-99',
        '0596': '20-79',
        '0597': '20-39,42-49,70-90,97-98',
        '05979': '2-6,9',
        '0598': '20-89',
        '0599': '20-89',
        '06': '4100-4999,6100-6999,7100-7999',
        '0721': '20-76,78-99',
        '072': '200-499,600-999',
        '0725': '20-99',
        '073': '400-499',
        '0735': '20-79',
        '0736': '20-89',
        '0737': '20-99',
        '0738': '20-99',
        '0739': '20-99',
        '0740': '20-39',
        '0742': '20-99',
        '0743': '20-99',
        '0744': '20-99',
        '0745': '20-99',
        '0746': '30-69',
        '07468': '2-9',
        '0747': '20-69',
        '0748': '20-89',
        '0749': '20-89',
        '075': '200-999',
        '0761': '20-84',
        '076': '200-216,218-299,400-416,418-499',
        '0763': '20-99',
        '0765': '20-99',
        '0766': '20-99',
        '0767': '20-89',
        '0768': '20-89',
        '0770': '20-79',
        '0771': '20-89',
        '0772': '20-89',
        '0773': '20-89',
        '0774': '20-99',
        '077': '500-516,518-599',
        '0776': '20-99',
        '0778': '20-99',
        '0779': '60-71,77-89',
        '078': '200-999',
        '0790': '20-89',
        '0791': '20-29,40-79',
        '079': '200-339,400-409,420-459,490-509,550-569,590-609,660-679',
        '0794': '60-89',
        '0795': '20-49,70-89',
        '0796': '20-59,80-99',
        '0797': '20-99',
        '0798': '20-99',
        '0799': '20-89',
        '0820': '20-89',
        '082': '200-299,400-409,420-439,490-599,800-909,921-929,941-943,960-969,990-999',
        '0823': '20-99',
        '0824': '40-89',
        '0826': '20-89',
        '0827': '20-50,52-99',
        '0829': '20,30-40,44-59,70-89',
        '083': '220-299,600-609,766-768,770-789,900-950,952-960,963,966,970-999',
        '0833': '20-99',
        '0834': '20-99',
        '0835': '20-99',
        '0836': '20-99',
        '0837': '20-65,69',
        '0838': '20-59',
        '08387': '2-9',
        '08388': '2-9',
        '08396': '2,4-5,7-9',
        '0845': '20-39',
        '0846': '20-49,60-79',
        '0847': '20-69,80-99',
        '08477': '2-9',
        '0848': '20-99',
        '084': '900-999',
        '08512': '2-9',
        '08514': '2-9',
        '0852': '20-99',
        '0853': '20-99',
        '0854': '20-99',
        '0855': '20-99',
        '0856': '20-59,70-89',
        '0857': '20-99',
        '0858': '20-89',
        '0859': '20-89',
        '086': '200-299,362-365,367-369,420-489,520-529,552-553,600-609,691,697-698,722-724,726,728,737-738,800-809,890-909,940-959,994-999',
        '0863': '20-59,66,70-89',
        '0865': '40-51,54-79',
        '0866': '20-90,92-96,99',
        '0867': '20-21,25,27,29-36,39-99',
        '0868': '20-89',
        '0869': '20-29,34,60-89,92-93',
        '0875': '20-99',
        '0877': '20-99',
        '087': '800-899',
        '0879': '20-89',
        '0880': '20-99',
        '0883': '20-89',
        '0884': '20-89',
        '0885': '30,32-40,42-49',
        '088': '600-616,618-699,800-816,818-899',
        '0887': '20,22-99',
        '0889': '20-69',
        '0892': '20-99',
        '0893': '20-99',
        '0894': '20-99',
        '0895': '20-89',
        '0896': '20-99',
        '0897': '20-89',
        '0898': '20-99',
        '089': '900-999',
        '0920': '40-59,80-89',
        '092': '200-999',
        '0930': '20-59',
        '093': '200-999',
        '0940': '20-99',
        '0942': '20-99',
        '0943': '20-59,70-89',
        '0944': '20-99',
        '0946': '20-99',
        '0947': '20-99',
        '0948': '20-99',
        '0949': '20-59,62-69',
        '0950': '20-99',
        '0952': '20-99',
        '0954': '20-49,60-79',
        '0955': '20-89',
        '0956': '20-99',
        '0957': '20-89',
        '095': '800-899',
        '0959': '20-99',
        '096': '200-399',
        '0964': '20-99',
        '0965': '20-99',
        '0966': '20,22-89',
        '0967': '20,22-99',
        '0968': '20-89',
        '0969': '20-89',
        '0972': '20-89',
        '0973': '20-59,70-89',
        '0974': '20,22-49,60,62-79',
        '097': '500-599',
        '0977': '20-99',
        '0978': '20,22-60,62-99',
        '0979': '20-99',
        '09802': '2-9',
        '0980': '30-70,72-80,82-99',
        '0982': '20-99',
        '0983': '20-99',
        '0984': '20-99',
        '0985': '20-99',
        '0986': '20-99',
        '0987': '20-99',
        '098': '800-999',
        '09912': '2-9',
        '09913': '2-9',
        '099': '200-216,218-299,331,343,345,347,400-409,470-489,800-839',
        '0993': '20-30,32-42,44,46,48-89',
        '0994': '20-69,90-99',
        '0995': '20-79',
        '0996': '20-89',
        '09969': '2-9',
        '0997': '20,22-99',
        '0120': '0-999',
        '0800': '0-999',
        '0570': '0-999',
        '0990': '0-999',
        '020': '100-399,500-999',
        '0200': '10000-10999',
        '060': '1000-9999',
        '070': '1000-9999',
        '080': '1000-9999',
        '090': '1000-9999',
        '050': '1000-9999'
    },
    // 11桁の表記の電気通信番号の市外局番リスト
    // これらの市外局番の場合、電話番号は11桁である必要がある
    // 例：0800、020、060、070、080、090、0204、050、0600　'0800', '020', '060', '070', '080', '090', '0204', '050', '0600'
    'digit11PhoneNumberRange': {
        'service': ['0800'],
        'm2m': ['020'],
        'mobile': ['060', '070', '080', '090'],
        'wireless': ['0204'],
        'ipphone': ['050'],
        'fmc': ['0600']
    },
    // 固定電話番号でない市外局番リスト
    // これらの市外局番の場合、固定電話番号としてのチェックを行わない
    // 例：0120、0170、0180、0570、0990
    'notLandlinePhoneNumberRange': [
        '0120', '0170', '0180', '0570', '0990'
    ]
};
// ==================== 電話番号データ定義ここまで ====================
// --- ここから下はロジック部分 ---
// データ参照用関数やメイン処理など
// データ参照用関数
const _pn_getAreaCodeInfo = (codeLength, code) => {
    return _pn_phoneNumberData.areaCodeList[codeLength]?.[code];
};
// --- areaCodeListの降順キャッシュ ---
let _pn_areaCodeListCache = null;
const _pn_getAreaCodeList = () => {
    if (_pn_areaCodeListCache) return _pn_areaCodeListCache;
    _pn_areaCodeListCache = Object.keys(_pn_phoneNumberData.areaCodeList).map(Number).sort((a, b) => b - a);
    return _pn_areaCodeListCache;
};
// 圧縮表現を配列に展開する関数
const _pn_expandRangeString = (rangeStr) => {
    if (!rangeStr) return null;
    return rangeStr.split(',').map(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            return [start, end];
        } else {
            const n = Number(part);
            return [n, n];
        }
    });
};
const _pn_getLocalAreaCodeRange = (code) => {
    const val = _pn_phoneNumberData.areaCodeRanges[code];
    if (!val) return undefined;
    if (Array.isArray(val)) return val; // 旧形式も一応サポート
    return _pn_expandRangeString(val);
};
// digit11PhoneNumberRange用途別リスト参照関数
const _pn_getDigit11PrefixList = (type) => {
    return (_pn_phoneNumberData.digit11PhoneNumberRange && _pn_phoneNumberData.digit11PhoneNumberRange[type])
        ? _pn_phoneNumberData.digit11PhoneNumberRange[type]
        : [];
};
const _pn_isDigit11PhoneNumberRange = (code) => {
    const allPrefixes = Object.values(_pn_phoneNumberData.digit11PhoneNumberRange).flat();
    return allPrefixes.includes(code);
};
const _pn_isNotLandlinePhoneNumberRange = (code) => {
    return _pn_phoneNumberData.notLandlinePhoneNumberRange.includes(code);
};
// サブ処理
// 正規表現の事前コンパイル
const _pn_removeSymbolsReg = /[()（）\-‐－―—.．\/／ 　]/g;
const _pn_zenkakuNumReg = /[０-９]/g;
/**
 * 電話番号として処理できる数字のみの文字列に変換する関数（正規化）
 * @param {string|number|null|undefined} str - 入力された文字列
 * @returns {string} 電話番号として処理できる数字のみの文字列
 * @throws {Error} 入力が空または数字を含まない場合にエラーを投げる
 */
const _pn_getPhoneNumberOnly = (str) => {
    if (!str) {
        throw new Error('電話番号が入力されていません');
    }
    const result = String(str)
        .replace(_pn_removeSymbolsReg, '') // 記号除去
        .replace(_pn_zenkakuNumReg, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)); // 全角数字→半角
    
    if (!result || !/^\d+$/.test(result)) {
        throw new Error(`電話番号として無効です（数字以外の文字が含まれているか、数字が含まれていません）: ${str}`);
    }
    
    return result;
};
/**
 * 電話番号の種別を判定する関数
 * @param {string|number|null|undefined} number - 入力された電話番号
 * @returns {string} 'landline' | 'mobile' | 'special' | 'unknown'
 * @throws {Error} 無効な入力の場合にエラーを投げる
 */
const _pn_getPhoneType = (number) => {
    const num = _pn_getPhoneNumberOnly(number); // この時点でエラーが投げられる可能性あり
    
    // 14桁番号のtype判定
    if (num.length === 14) {
        const prefix4 = num.substring(0, 4);
        if (prefix4 === '0200') return 'm2m'; // 0200はM2M専用
    }
    // 11桁番号のtype判定（digit11PhoneNumberRangeの各typeに対応）
    if (num.length === 11) {
        // 4桁prefix優先
        const prefix4 = num.substring(0, 4);
        const prefix3 = num.substring(0, 3);
        if (_pn_getDigit11PrefixList('service').includes(prefix4)) return 'service';
        if (_pn_getDigit11PrefixList('wireless').includes(prefix4)) return 'wireless';
        if (_pn_getDigit11PrefixList('fmc').includes(prefix4)) return 'fmc';
        if (_pn_getDigit11PrefixList('m2m').includes(prefix3)) return 'm2m';
        if (_pn_getDigit11PrefixList('m2m').includes(prefix4)) return 'm2m';
        if (_pn_getDigit11PrefixList('mobile').includes(prefix3)) return 'mobile';
        if (_pn_getDigit11PrefixList('ipphone').includes(prefix3)) return 'ipphone';
    }
    // 10桁特殊番号
    if (num.length === 10 && _pn_isNotLandlinePhoneNumberRange(num.substring(0, 4))) {
        return 'special';
    }
    if (num.length === 10) {
        return 'landline';
    }
    return 'unknown';
};
/**
 * 電話番号の種別に応じたハイフンパターンを返す関数
 * @param {string|number|null|undefined} number - 入力された電話番号
 * @param {string} type - 電話番号種別
 * @returns {Array<number>} ハイフン位置の配列（例: [4,3,4]）
 */
const _pn_getHyphenPattern = (number, type) => {
    const num = _pn_getPhoneNumberOnly(number);
    if (!num) return [];
    // 11桁系番号
    if (
        type === 'mobile' ||
        type === 'service' ||
        type === 'm2m' ||
        type === 'wireless' ||
        type === 'fmc' ||
        type === 'ipphone'
    ) {
        // 4桁prefix（例: 0800, 0204, 0600）は[4,3,4]、3桁prefixは[3,4,4]
        if (num.length === 11 && _pn_isDigit11PhoneNumberRange(num.substring(0, 4))) {
            return [4, 3, 4];
        }
        return [3, 4, 4];
    }
    if (type === 'special') {
        // 例: 0120-123-456
        return [4, 3, 3];
    }
    if (type === 'landline') {
        // 市外局番・市内局番・加入者番号の長さを判定
        const areaCodeList = _pn_getAreaCodeList();
        for (let c = 0, l = areaCodeList.length; c < l; c++) {
            let areaCodeLen = areaCodeList[c];
            let areaCode = num.substring(0, areaCodeLen);
            let localLen = _pn_getAreaCodeInfo(areaCodeLen, areaCode);
            if (localLen) {
                const subscriberLen = num.length - areaCodeLen - localLen;
                return [areaCodeLen, localLen, subscriberLen];
            }
        }
        // 該当しない場合
        return [3, 3, 4];
    }
    return [];
};
/**
 * 電話番号を正規化し、ハイフン付きでフォーマットする関数
 * @param {string|number|null|undefined} str - 入力された電話番号
 * @returns {string} フォーマット済み電話番号
 * @throws {Error} 無効な電話番号の場合にエラーを投げる
 */
const _pn_formatPhoneNumber = (str) => {
    const num = _pn_getPhoneNumberOnly(str); // この時点でエラーが投げられる可能性あり
    
    // 091特殊番号は必ず091-以下全て
    if (num.startsWith('091') && num.length >= 6 && num.length <= 13) {
        return `${num.substring(0,3)}-${num.substring(3)}`;
    }
    const type = _pn_getPhoneType(num);
    const pattern = _pn_getHyphenPattern(num, type);
    if (!pattern.length) return num;
    let idx = 0;
    const parts = pattern.map(len => {
        const part = num.substring(idx, idx + len);
        idx += len;
        return part;
    });
    return parts.filter(Boolean).join('-');
};
// --- 以下、フォールバック用のサブ関数群 ---
const _pn_is11DigitMobile = (num) => {
    if (num.length !== 11) return false;
    const code4 = num.substring(0, 4);
    return _pn_isDigit11PhoneNumberRange(code4);
};
const _pn_format11DigitMobile = (num) => {
    const areaCodeList = _pn_getAreaCodeList();
    for(let c = 0, l = areaCodeList.length; c < l; c++){
        let areaCodeLen = areaCodeList[c];
        let telephoneNumberAreaCode = num.substring(0, areaCodeLen);
        let localAreaCodeLen = _pn_getAreaCodeInfo(areaCodeLen, telephoneNumberAreaCode);
        if (localAreaCodeLen && _pn_isDigit11PhoneNumberRange(telephoneNumberAreaCode)) {
            const local_code = Number(num.substring(areaCodeLen, areaCodeLen + localAreaCodeLen));
            const subscriber_number = num.substring(areaCodeLen + localAreaCodeLen);
            return subscriber_number
                ? `${telephoneNumberAreaCode}-${local_code}-${subscriber_number}`
                : `${telephoneNumberAreaCode}-${local_code}`;
        }
    }
    return num;
};
const _pn_isSpecial14DigitNumber = (num) => {
    return num.length === 14 && num.startsWith('0200');
};
const _pn_is10DigitSpecial = (num) => {
    if (num.length !== 10) return false;
    const code4 = num.substring(0,4);
    return _pn_isNotLandlinePhoneNumberRange(code4);
};
const _pn_is091SpecialNumber = (num) => {
    return num.startsWith('091') && (num.length >= 6 && num.length <= 13);
}
const _pn_fallbackLandlineFormat = (num) => {
    const areaCodeList = _pn_getAreaCodeList();
    for(let c = 0, l = areaCodeList.length; c < l; c++){
        let areaCodeLen = areaCodeList[c];
        let telephoneNumberAreaCode = num.substring(0, areaCodeLen);
        let localAreaCodeLen = _pn_getAreaCodeInfo(areaCodeLen, telephoneNumberAreaCode);
        if (localAreaCodeLen) {
            let landlineFlag = !_pn_isNotLandlinePhoneNumberRange(telephoneNumberAreaCode);
            let rejectFlag = false;
            const local_code = Number(num.substring(areaCodeLen, areaCodeLen + localAreaCodeLen));
            if (landlineFlag) {
                if (Number(String(local_code).substring(0, 1)) <= 1) {
                    rejectFlag = true;
                }
                if (!rejectFlag) {
                    const range = _pn_getLocalAreaCodeRange(telephoneNumberAreaCode);
                    if (!range) {
                        rejectFlag = true;
                    } else {
                        rejectFlag = !range.some(([min, max]) => local_code >= min && local_code <= max);
                    }
                }
            } else {
                const local_area_code_flag = _pn_getLocalAreaCodeRange(telephoneNumberAreaCode);
                if (!local_area_code_flag) {
                    return num;
                } else {
                    if (!local_area_code_flag.some(([min, max]) => local_code >= min && local_code <= max)) {
                        return num;
                    };
                }
            }
            if (!rejectFlag) {
                const subscriber_number = num.substring(areaCodeLen + localAreaCodeLen);
                return subscriber_number
                    ? `${telephoneNumberAreaCode}-${local_code}-${subscriber_number}`
                    : `${telephoneNumberAreaCode}-${local_code}`;
            }
        }
    }
    return num;
};
/**
 * 日本国内用電話番号バリデーション関数
 * @param {string|number|null|undefined} str
 * @returns {boolean}
 */
const _pn_isValidJapanesePhoneNumber = (str) => {
    if (!str) return false;
    const s = String(str).trim();
    // 国番号(+81)や+で始まるものはNG
    if (s.startsWith('+') || s.startsWith('81')) return false;
    // 記号・全角数字除去
    const num = _pn_getPhoneNumberOnly(s);
    if (!num) return false;
    // 先頭0でなければNG
    if (!num.startsWith('0')) return false;
    // 0200で始まる場合は14桁以外NG（最優先）
    if (num.startsWith('0200')) {
        return num.length === 14;
    }
    // 11桁必要なprefixで10桁しかない場合はNG
    if (num.length === 10) {
        const prefix4 = num.substring(0, 4);
        const prefix3 = num.substring(0, 3);
        const digit11Prefixes = Object.values(_pn_phoneNumberData.digit11PhoneNumberRange).flat();
        if (digit11Prefixes.includes(prefix4) || digit11Prefixes.includes(prefix3)) {
            return false;
        }
        // 10桁は市外局番リストに該当しなければfalse
        const areaCodeList = _pn_getAreaCodeList();
        let found = false;
        for (let c = 0, l = areaCodeList.length; c < l; c++) {
            let areaCodeLen = areaCodeList[c];
            let areaCode = num.substring(0, areaCodeLen);
            if (_pn_getAreaCodeInfo(areaCodeLen, areaCode)) {
                found = true;
                break;
            }
        }
        if (!found) return false;
        return true;
    }
    // 091で始まる6～13桁の特殊番号を許可
    if (num.startsWith('091') && num.length >= 6 && num.length <= 13) return true;
    // 11桁は携帯・PHS等のprefixのみ許可
    if (num.length === 11) {
        const prefix4 = num.substring(0, 4);
        const prefix3 = num.substring(0, 3);
        const digit11Prefixes = Object.values(_pn_phoneNumberData.digit11PhoneNumberRange).flat();
        if (digit11Prefixes.includes(prefix4) || digit11Prefixes.includes(prefix3)) {
            return true;
        }
        return false;
    }
    return false;
};
/**
 * フォールバック用の従来詳細ロジック
 * @param {string|number|null|undefined} telephoneNumber
 * @returns {string} フォーマット済み電話番号
 * @throws {Error} フォーマットに失敗した場合にエラーを投げる
 */
const _pn_fallbackFormatPhoneNumber = (telephoneNumber) => {
    const telephoneNumberPNO = _pn_getPhoneNumberOnly(telephoneNumber); // この時点でエラーが投げられる可能性あり
    
    // 11桁の携帯・PHS等
    if (_pn_is11DigitMobile(telephoneNumberPNO)) {
        return _pn_format11DigitMobile(telephoneNumberPNO);
    }
    // 14桁の特殊番号（0200...）
    if (_pn_isSpecial14DigitNumber(telephoneNumberPNO)) {
        return `${telephoneNumberPNO.substring(0,4)}-${telephoneNumberPNO.substring(4,9)}-${telephoneNumberPNO.substring(9)}`;
    }
    // notLandlinePhoneNumberRange（0120, 0800, 0570, 0990等）の特殊番号（10桁）
    if (_pn_is10DigitSpecial(telephoneNumberPNO)) {
        return `${telephoneNumberPNO.substring(0,4)}-${telephoneNumberPNO.substring(4,7)}-${telephoneNumberPNO.substring(7)}`;
    }
    // 091 の特殊番号（6～13桁）は091-以下全て
    if (_pn_is091SpecialNumber(telephoneNumberPNO)) {
        return `${telephoneNumberPNO.substring(0,3)}-${telephoneNumberPNO.substring(3)}`;
    }
    // 10桁以外はそのまま返す
    if (telephoneNumberPNO.length !== 10) {
        return telephoneNumberPNO;
    }
    // 固定電話番号の詳細判定
    return _pn_fallbackLandlineFormat(telephoneNumberPNO);
};

// メイン処理
/**
 * 日本国内用バリデーションを強化した電話番号フォーマット関数
 * @param {string|number|null|undefined} telephoneNumber - 入力された電話番号
 * @returns {string} ハイフン位置を修正した電話番号
 * @throws {Error} 無効な電話番号の場合にエラーを投げる
 */
const phone_number_formatting = (telephoneNumber) => {
    if (!telephoneNumber) {
        throw new Error('電話番号が入力されていません');
    }
    // まず日本国内用バリデーション
    if (!_pn_isValidJapanesePhoneNumber(telephoneNumber)) {
        throw new Error(`無効な日本国内電話番号です（桁数・形式が不正です）: ${telephoneNumber}`);
    }
    // 正規化
    const num = _pn_getPhoneNumberOnly(telephoneNumber);
    // 市外局番リスト取得（最長一致優先）
    const areaCodeList = _pn_getAreaCodeList();
    let found = false;
    let matchedAreaCodeLen = null;
    let matchedAreaCode = null;
    let matchedLocalLen = null;
    for (let c = 0, l = areaCodeList.length; c < l; c++) {
        let areaCodeLen = areaCodeList[c];
        let areaCode = num.substring(0, areaCodeLen);
        let localLen = _pn_getAreaCodeInfo(areaCodeLen, areaCode);
        if (localLen) {
            // 最初に見つかった最長一致を記録
            matchedAreaCodeLen = areaCodeLen;
            matchedAreaCode = areaCode;
            matchedLocalLen = localLen;
            found = true;
            break;
        }
    }
    if (!found) {
        throw new Error(`無効な日本国内電話番号です（桁数・形式が不正です）: ${telephoneNumber}`);
    }
    // areaCodeRangesに範囲が定義されている場合は必ず範囲チェック
    const range = _pn_getLocalAreaCodeRange(matchedAreaCode);
    if (range) {
        const local_code_str = num.substring(matchedAreaCodeLen, matchedAreaCodeLen + matchedLocalLen);
        // ゼロパディング長
        const padLen = local_code_str.length;
        // 文字列比較で範囲チェック
        if (!range.some(([min, max]) => {
            const minStr = String(min).padStart(padLen, '0');
            const maxStr = String(max).padStart(padLen, '0');
            return local_code_str >= minStr && local_code_str <= maxStr;
        })) {
            throw new Error(`無効な日本国内電話番号です（桁数・形式が不正です）: ${telephoneNumber}`);
        }
    }
    // まず新しい汎用ロジックで判定・フォーマット
    const formatted = _pn_formatPhoneNumber(telephoneNumber);
    if (formatted && formatted !== num) {
        return formatted;
    }
    // フォールバックとして従来の詳細ロジックを分離関数で適用
    const fallbackResult = _pn_fallbackFormatPhoneNumber(telephoneNumber);
    if (!fallbackResult) {
        throw new Error(`有効な電話番号ではありません: ${telephoneNumber}`);
    }
    return fallbackResult;
};

/**
 * フォーマット済み電話番号と携帯判定を返す拡張関数
 * @param {string|number|null|undefined} telephoneNumber
 * @returns {{ formatted: string, isMobile: boolean, type: string }}
 * @throws {Error} 無効な電話番号の場合にエラーを投げる
 */
const phone_number_formatting_with_type = (telephoneNumber) => {
    const formatted = phone_number_formatting(telephoneNumber); // この時点でエラーが投げられる可能性あり
    const num = _pn_getPhoneNumberOnly(telephoneNumber);
    const type = _pn_getPhoneType(num);
    return {
        formatted,
        isMobile: type === 'mobile',
        // type: 'mobile', 'service', 'm2m', 'wireless', 'fmc', 'ipphone', 'landline', 'special', 'unknown'
        type
    };
};