/** 金融機関処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_fi_)で始める
// この処理プログラムを使用する場合は、luxon、jQuery、national_holiday_handling.jsを合わせて読み込む必要があります
// リソースの読み込み制限を行っている場合は、Ajax通信のhttps://bank.teraren.com/を許可する必要があります
(($) => {
    'use strict';
    // --- 変換用定数・マッピング ---
    /** 全角カナ変換マッピング @type {Object} */
    const _fi_FULL_WIDTH_KANA_LIST = {
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
    /** 全角カナ変換用正規表現 @type {RegExp} */
    const _fi_FULL_WIDTH_KANA_LIST_REG = new RegExp('(' + Object.keys(_fi_FULL_WIDTH_KANA_LIST).join('|') + ')', 'g');
    /** 濁点・半濁点カナ変換マッピング @type {Object} */
    const _fi_TURBIDITY_KANA_LIST = {
        'カ゛': 'ガ', 'キ゛': 'ギ', 'ク゛': 'グ', 'ケ゛': 'ゲ', 'コ゛': 'ゴ',
        'サ゛': 'ザ', 'シ゛': 'ジ', 'ス゛': 'ズ', 'セ゛': 'ゼ', 'ソ゛': 'ゾ',
        'タ゛': 'ダ', 'チ゛': 'ヂ', 'ツ゛': 'ヅ', 'テ゛': 'デ', 'ト゛': 'ド',
        'ハ゛': 'バ', 'ヒ゛': 'ビ', 'フ゛': 'ブ', 'ヘ゛': 'ベ', 'ホ゛': 'ボ',
        'ハ゜': 'パ', 'ヒ゜': 'ピ', 'フ゜': 'プ', 'ヘ゜': 'ペ', 'ホ゜': 'ポ',
        'ウ゛': 'ヴ', 'ワ゛': 'ヷ', 'ヲ゛': 'ヺ'
    };
    /** 濁点・半濁点カナ変換用正規表現 @type {RegExp} */
    const _fi_TURBIDITY_KANA_LIST_REG = new RegExp('(' + Object.keys(_fi_TURBIDITY_KANA_LIST).join('|') + ')', 'g');
    /** 半角カナ変換マッピング @type {Object} */
    const _fi_HALF_WIDTH_KANA_LIST = {
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
    /** 半角カナ変換用正規表現 @type {RegExp} */
    const _fi_HALF_WIDTH_KANA_LIST_REG = new RegExp('(' + Object.keys(_fi_HALF_WIDTH_KANA_LIST).join('|') + ')', 'g');
    /** 銀行用カナ変換マッピング @type {Object} */
    const _fi_BANK_KANA_LIST = {
        'ｧ': 'ｱ', 'ｨ': 'ｲ', 'ｩ': 'ｳ', 'ｪ': 'ｴ', 'ｫ': 'ｵ',
        'ｯ': 'ﾂ', 'ｬ': 'ﾔ', 'ｭ': 'ﾕ', 'ｮ': 'ﾖ',
        '（': '(', '）': ')', '・': '.',
        'ー': '-', '‐': '-', '－': '-',
        '　': ' ', '゛': 'ﾞ', '゜': 'ﾟ'
    };
    /** 銀行用カナ変換用正規表現 @type {RegExp} */
    const _fi_BANK_KANA_LIST_REG = new RegExp('(' + Object.keys(_fi_BANK_KANA_LIST).join('|') + ')', 'g');
    /** 法人略語マッピング @type {Object} */
    const _fi_CORPORATE_ABBREVIATIONS_LIST = {
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
    /** 法人略語用正規表現 @type {RegExp} */
    const _fi_CORPORATE_ABBREVIATIONS_LIST_REG = new RegExp('(' + Object.keys(_fi_CORPORATE_ABBREVIATIONS_LIST).join('|') + ')', '');
    /** 営業所マッピング @type {Object} */
    const _fi_SALES_OFFICES_LIST = {
        '営業所': 'ｴｲ', 'ｴｲｷﾞﾖｳｼﾖ': 'ｴｲ', 'ｴｲｷﾞﾖｳｼﾞﾖ': 'ｴｲ',
        '出張所': 'ｼﾕﾂ', 'ｼﾕﾂﾁﾖｳｼﾖ': 'ｼﾕﾂ', 'ｼﾕﾂﾁﾖｳｼﾞﾖ': 'ｼﾕﾂ'
    };
    /** 営業所用正規表現 @type {RegExp} */
    const _fi_SALES_OFFICES_LIST_REG = new RegExp('(' + Object.keys(_fi_SALES_OFFICES_LIST).join('|') + ')', '');
    /** 事業マッピング @type {Object} */
    const _fi_BUSINESS_LIST = {
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
    /** 事業用正規表現 @type {RegExp} */
    const _fi_BUSINESS_LIST_REG = new RegExp('(' + Object.keys(_fi_BUSINESS_LIST).join('|') + ')', '');
    /**
     * 全角カナ、濁点・半濁点付きカナ、半角カナ、全角英数字を変換する関数
     * @param {string} char - 変換する文字列
     * @param {boolean} [hiragana_sw=true] - ひらがなをカタカナに変換するかどうかのフラグ（デフォルトはtrue）
     * @returns {string|null} - 変換後の文字列、または入力が無効な場合はnull
     */
    const _fi_convert_to_full_width_kana = (char, hiragana_sw = true) => {
        if (!char) return null;
        let full_width_kana = char;
        if (hiragana_sw) {
            full_width_kana = String(full_width_kana).replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 96));
        }
        full_width_kana = full_width_kana.replace(_fi_FULL_WIDTH_KANA_LIST_REG, (c) => _fi_FULL_WIDTH_KANA_LIST[c]);
        full_width_kana = full_width_kana.replace(_fi_TURBIDITY_KANA_LIST_REG, (c) => _fi_TURBIDITY_KANA_LIST[c]);
        return full_width_kana;
    };
    /**
     * 全角カナ、濁点・半濁点付きカナ、半角カナを変換する関数
     * @param {string} char - 変換する文字列
     * @returns {string|null} - 変換後の文字列、または入力が無効な場合はnull
     */
    const _fi_convert_to_half_width_kana = (char) => {
        if (!char) return null;
        const full_width_kana = _fi_convert_to_full_width_kana(char);
        return full_width_kana.replace(_fi_HALF_WIDTH_KANA_LIST_REG, (c) => _fi_HALF_WIDTH_KANA_LIST[c]);
    };
    /**
     * 全角英数字、全角カナ、濁点・半濁点付きカナ、半角カナを変換する関数
     * @param {string} char - 変換する文字列
     * @returns {string|null} - 変換後の文字列、または入力が無効な場合はnull
     */
    const _fi_convert_to_single_byte_characters = (char) => {
        if (!char) return null;
        const hyphen_process = char.replace(/[\uFF0D\u2010\u2011\u2013\u2014\u2212\u30FC\u2015\uFF70]/g, '-');
        const half_width_kana = _fi_convert_to_half_width_kana(hyphen_process);
        const single_byte_characters = half_width_kana.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).toUpperCase();
        return single_byte_characters;
    };
    /**
     * 全角数字を半角数字に変換する関数
     * @param {string} str - 変換する文字列
     * @returns {string} - 変換後の文字列
     */
    const _fi_convert_to_single_byte_numbers = (str = '') => {
        if (typeof str !== 'string' || str.length === 0) return '';
        const convertKanjiNumerals = (str = '') => {
            const parseKanjiNumber = (kanji) => {
                const digits = { '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
                const multipliers = { '十': 10, '百': 100, '千': 1000, '万': 10000 };
                let current = 0;
                let temp = 0;
                for (let c = 0; c < kanji.length; c++) {
                    const char = kanji[c];
                    if (char in digits) {
                        current = digits[char];
                    } else if (char in multipliers) {
                        if (current === 0) current = 1;
                        temp += current * multipliers[char];
                        current = 0;
                    }
                }
                return temp + current;
            };
            return str.replace(/[〇一二三四五六七八九十百千]+/g, (match) => parseKanjiNumber(match));
        };
        const convertFullWidthDigits = (str = '') => {
            return str.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));
        };
        str = convertKanjiNumerals(str);
        str = convertFullWidthDigits(str);
        return str;
    };
    /**
     * 全銀手順で許可される文字種のみ許可するバリデーション関数
     * @param {string} char - 入力文字列
     * @returns {boolean} - 許可される場合true、許可されない文字が含まれる場合false
     */
    const _fi_is_zengin_allowed_chars = (char) => {
        if (typeof char !== 'string') return false;
        // 半角英数字・半角カナ・許可記号のみ
        // 許可記号は用途に応じて調整可能
        const zenginReg = /^[0-9A-Z !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~｡｢｣､･\uFF61-\uFF9F]+$/;
        return zenginReg.test(char);
    };

    /**
     * 銀行番号または銀行名から銀行情報を取得します。
     * kintone API風のコールバック構文（成功・失敗分離）です。
     *
     * @param {string} bank_char - 銀行番号（4桁）または銀行名（部分一致可）
     * @param {function(Object)} successCallback - 正常時に呼ばれるコールバック。
     *   result: {
     *     bank_number: string,   // 銀行番号（4桁）
     *     bank_name: string,     // 銀行名
     *     bank_name_kana: string // 銀行名（カナ・半角）
     *   }
     * @param {function(Error)} failureCallback - エラー時に呼ばれるコールバック。
     *   error: Errorオブジェクト（messageにエラー内容）
     *
     * @example
     * $.bank_find('0001',
     *   (result) => {
     *     // 正常時処理 result.bank_name など
     *   },
     *   (error) => {
     *     // エラー時処理 error.message など
     *   }
     * );
     */
    const _fi_get_bank_info = (bank_char, successCallback, failureCallback) => {
        if (typeof bank_char !== 'string' || bank_char.length === 0) {
            if (failureCallback) failureCallback(new Error('銀行番号または銀行名が未入力です'));
            return;
        }
        const bank_char_sbn = Number(_fi_convert_to_single_byte_numbers(bank_char));
        if (bank_char_sbn >= 0 && bank_char_sbn <= 9999) {
            const bank_number_temp = '0000' + String(bank_char_sbn);
            const bank_number = bank_number_temp.slice(-4);
            $.ajax({
                'url': 'https://bank.teraren.com/banks/' + bank_number + '.json',
                'dataType': 'json',
                'success': (success) => {
                    if (success.length === 1) {
                        successCallback({
                            bank_number: success.code,
                            bank_name: success.normalize.name,
                            bank_name_kana: _fi_convert_to_account_holder(success.kana, false)
                        });
                    } else {
                        if (failureCallback) failureCallback(new Error('銀行を特定できません'));
                    }
                },
                'error': (xhr, status, err) => {
                    if (failureCallback) failureCallback(new Error('銀行が見つかりません'));
                }
            });
            return;
        }
        $.ajax({
            'url': 'https://bank.teraren.com/banks/search.json?name=' + bank_char,
            'dataType': 'json',
            'success': (success) => {
                if (success.length === 1) {
                    successCallback({
                        bank_number: success[0].code,
                        bank_name: success[0].normalize.name,
                        bank_name_kana: _fi_convert_to_account_holder(success[0].kana, false)
                    });
                } else {
                    if (failureCallback) failureCallback(new Error('銀行を特定できません'));
                }
            },
            'error': (xhr, status, err) => {
                if (failureCallback) failureCallback(new Error('銀行が見つかりません'));
            }
        });
    };
    $.bank_find = _fi_get_bank_info;

    /**
     * 銀行番号・銀行名と支店番号・支店名から支店情報を取得します。
     * kintone API風のコールバック構文（成功・失敗分離）です。
     *
     * @param {string} bank_char - 銀行番号（4桁）または銀行名
     * @param {string} bank_branch_char - 支店番号（3桁）または支店名
     * @param {function(Object)} successCallback - 正常時に呼ばれるコールバック。
     *   result: {
     *     bank_branch_number: string,   // 支店番号（3桁）
     *     bank_branch_name: string,     // 支店名
     *     bank_branch_name_kana: string // 支店名（カナ・半角）
     *   }
     * @param {function(Error)} failureCallback - エラー時に呼ばれるコールバック。
     *   error: Errorオブジェクト（messageにエラー内容）
     *
     * @example
     * $.bank_branch_find('0001', '001',
     *   (result) => {
     *     // 正常時処理 result.bank_branch_name など
     *   },
     *   (error) => {
     *     // エラー時処理 error.message など
     *   }
     * );
     */
    const _fi_get_bank_branch_info = (bank_char, bank_branch_char, successCallback, failureCallback) => {
        if (typeof bank_char !== 'string' || bank_char.length === 0 || typeof bank_branch_char !== 'string' || bank_branch_char.length === 0) {
            if (failureCallback) failureCallback(new Error('銀行番号、支店番号、支店名のいずれかが未入力です'));
            return;
        }
        const bank_char_sbn = _fi_convert_to_single_byte_numbers(bank_char);
        _fi_get_bank_info(bank_char_sbn, (bank_info) => {
            const bank_number = bank_info.bank_number;
            if (!bank_number) {
                if (failureCallback) failureCallback(new Error('銀行番号が未入力です'));
                return;
            }
            const bank_branch_char_sbn = Number(_fi_convert_to_single_byte_numbers(bank_branch_char));
            if ((bank_branch_char_sbn >= 0) && (bank_branch_char_sbn <= 999)) {
                const bank_branch_number_temp = '000' + String(bank_branch_char_sbn);
                const bank_branch_number = bank_branch_number_temp.slice(-3);
                $.ajax({
                    'url': 'https://bank.teraren.com/banks/' + bank_number + '/branches/' + bank_branch_number + '.json',
                    'dataType': 'json',
                    'success': (success) => {
                        if (success.length === 1) {
                            successCallback({
                                bank_branch_number: success.code,
                                bank_branch_name: success.normalize.name,
                                bank_branch_name_kana: _fi_convert_to_account_holder(success.kana, false)
                            });
                        } else {
                            if (failureCallback) failureCallback(new Error('支店を特定できません'));
                        }
                    },
                    'error': (xhr, status, err) => {
                        if (failureCallback) failureCallback(new Error('支店番号での取得に失敗しました'));
                    }
                });
                return;
            }
            $.ajax({
                'url': 'https://bank.teraren.com/banks/' + bank_number + '/branches/search.json?name=' + bank_branch_char,
                'dataType': 'json',
                'success': (success) => {
                    if (success.length === 1) {
                        successCallback({
                            bank_branch_number: success[0].code,
                            bank_branch_name: success[0].normalize.name,
                            bank_branch_name_kana: _fi_convert_to_account_holder(success[0].kana, false)
                        });
                    } else {
                        if (failureCallback) failureCallback(new Error('該当する支店が見つかりません'));
                    }
                },
                'error': (xhr, status, err) => {
                    if (failureCallback) failureCallback(new Error('支店名での取得に失敗しました'));
                }
            });
        }, (error) => {
            if (failureCallback) failureCallback(error || new Error('銀行が見つかりません'));
        });
    };
    $.bank_branch_find = _fi_get_bank_branch_info;

    /**
     * 銀行口座番号の書式を整える関数
     * @param {string} bank_account_char - 銀行口座番号
     * @returns {string|null} 銀行口座番号（7桁）またはnull
     */
    const _fi_get_bank_account_number = (bank_account_char) => {
        if (typeof bank_account_char !== 'string' || bank_account_char.length === 0) return null;
        const bank_account_number_temp = '0000000' + _fi_convert_to_single_byte_numbers(bank_account_char);
        const bank_account_number = bank_account_number_temp.slice(-7);
        return bank_account_number;
    };
    $.bank_account_number = _fi_get_bank_account_number;

    /**
     * ゆうちょ口座の記号番号から銀行名・支店名・口座番号等に変換します。
     * kintone API風のコールバック構文（成功・失敗分離）です。
     *
     * @param {string} symbol_char - ゆうちょ口座記号（5桁）
     * @param {string} number_char - ゆうちょ口座番号（最大8桁）
     * @param {function(Object)} successCallback - 正常時に呼ばれるコールバック。
     *   result: {
     *     symbol: string,                // ゆうちょ記号（5桁）
     *     number: string,                // ゆうちょ番号（6～8桁）
     *     bank_number: string,           // 銀行番号（4桁, ゆうちょは9900）
     *     bank_name: string,             // 銀行名
     *     bank_name_kana: string,        // 銀行名（カナ・半角）
     *     bank_branch_number: string,    // 支店番号（3桁）
     *     bank_branch_name: string,      // 支店名
     *     bank_branch_name_kana: string, // 支店名（カナ・半角）
     *     deposit_type: string,          // 預金種目（普通/当座）
     *     bank_account_number: string    // 銀行口座番号（7桁）
     *   }
     * @param {function(Error)} failureCallback - エラー時に呼ばれるコールバック。
     *   error: Errorオブジェクト（messageにエラー内容）
     *
     * @example
     * $.convert_japan_post_account_to_bank_account('12345', '6789012',
     *   (result) => {
     *     // 正常時処理 result.bank_account_number など
     *   },
     *   (error) => {
     *     // エラー時処理 error.message など
     *   }
     * );
     */
    const _fi_convert_japan_post_account_to_bank_account = (symbol_char, number_char, successCallback, failureCallback) => {
        if (typeof symbol_char !== 'string' || symbol_char.length === 0 || typeof number_char !== 'string' || number_char.length === 0) {
            if (failureCallback) failureCallback(new Error('ゆうちょ記号、ゆうちょ番号が未入力です'));
            return;
        }
        const symbol_char_sbn = _fi_convert_to_single_byte_numbers(symbol_char);
        const symbol_temp = '00000' + symbol_char_sbn;
        const symbol = symbol_temp.slice(-5);
        const number_char_sbn = _fi_convert_to_single_byte_numbers(number_char);
        const bank_branch_number_temp = symbol.substring(1, 3);
        const deposit_type_temp = symbol.substring(0, 1);
        let number = null;
        let bank_branch_number =  null;
        let deposit_type = null;
        let bank_account_number = null;
        switch (deposit_type_temp) {
            case '0':
                bank_branch_number = bank_branch_number_temp + '9';
                deposit_type = '当座';
                if (number_char_sbn.length <= 6) {
                    const number_temp = '000000' + number_char_sbn;
                    number = number_temp.slice(-6);
                    bank_account_number = _fi_get_bank_account_number(number);
                }
                break;
            case '1':
                bank_branch_number = bank_branch_number_temp + '8';
                deposit_type = '普通';
                const number_temp = '00000000' + number_char_sbn;
                number = number_temp.slice(-8);
                bank_account_number = number.substring(0, 7);
                break;
        }
        if (number && bank_branch_number && deposit_type && bank_account_number) {
            _fi_get_bank_branch_info('9900', bank_branch_number, (branch_info) => {
                const bank_branch_number = branch_info.bank_branch_number;
                if (!bank_branch_number) {
                    if (failureCallback) failureCallback(new Error('ゆうちょ記号が未入力です'));
                    return;
                }
                if (branch_info.bank_branch_number) {
                    successCallback({
                        symbol: symbol,
                        number: number,
                        bank_number: '9900',
                        bank_name: 'ゆうちょ銀行',
                        bank_name_kana: 'ﾕｳﾁﾖ',
                        bank_branch_number: branch_info.bank_branch_number,
                        bank_branch_name: branch_info.bank_branch_name,
                        bank_branch_name_kana: branch_info.bank_branch_name_kana,
                        deposit_type: deposit_type,
                        bank_account_number: bank_account_number
                    });
                } else {
                    if (failureCallback) failureCallback(new Error('ゆうちょ記号からゆうちょ支店情報に変換できませんでした'));
                }
            }, (error) => {
                if (failureCallback) failureCallback(error || new Error(error.message));
            });
        } else {
            if (failureCallback) failureCallback(new Error('ゆうちょ記号・番号の変換ができませんでした'));
        }
    };
    $.convert_japan_post_account_to_bank_account = _fi_convert_japan_post_account_to_bank_account;

    /**
     * 口座名義人を半角カナに変換する関数
     * @param {string} char - 口座名義人
     * @param {boolean} [acronym_sw=true] - 口座名義人を略語にする処理の有無（trueがあり、falseがなし）
     * @returns {string} 半角カナに変換した口座名義人
     */
    const _fi_convert_to_account_holder = (char, acronym_sw = true) => {
        if (typeof char !== 'string' || char.length === 0) return null;
        const acronym_replace = (char, list, regexp_char, position_sw) => {
            if (char) {
                const char_search = char.search(regexp_char);
                if (char_search !== -1) {
                    let parenthesis_position = 0;
                    if (position_sw) {
                        if (char_search === 0) {
                            parenthesis_position = 1;
                        } else {
                            const char_match = char.match(regexp_char);
                            if (char.length === (char_search + char_match[0].length)) {
                                parenthesis_position = 2;
                            } else {
                                parenthesis_position = 3;
                            }
                        }
                    }
                    return char.replace(regexp_char, (char) => {
                        switch (parenthesis_position) {
                            case 1:
                                return list[char] + ')';
                            case 2:
                                return '(' + list[char];
                            case 3:
                                return '(' + list[char] + ')';
                            default:
                                return list[char];
                        }
                    });
                } else {
                    return char;
                }
            }
        };
        const char_sbc = _fi_convert_to_single_byte_characters(char);
        const char_bank_kana = char_sbc.replace(_fi_BANK_KANA_LIST_REG, (c) => _fi_BANK_KANA_LIST[c]);
        let char_acronym = char_bank_kana;
        if (acronym_sw) {
            for (let c = 0; c < 3; c++) {
                let list = {};
                let regexp_char = '';
                let position_sw = true;
                switch (c) {
                    case 0:
                        list = _fi_CORPORATE_ABBREVIATIONS_LIST;
                        regexp_char = _fi_CORPORATE_ABBREVIATIONS_LIST_REG;
                        break;
                    case 1:
                        list = _fi_SALES_OFFICES_LIST;
                        regexp_char = _fi_SALES_OFFICES_LIST_REG;
                        break;
                    case 2:
                        list = _fi_BUSINESS_LIST;
                        regexp_char = _fi_BUSINESS_LIST_REG;
                        position_sw = false;
                        break;
                }
                char_acronym = acronym_replace(char_acronym, list, regexp_char, position_sw);
            }
        }
        const char_regexp = /^[()\-,./0-9A-Zｦ-ﾟ\s]+$/;
        if (char_regexp.test(char_acronym)) {
            return char_acronym;
        }
        return null;
    };
    $.convert_to_account_holder = _fi_convert_to_account_holder;

    /**
     * 振込指定日を確認する関数
     * @param {string} Designate_transfer_date - 振込指定日（kintoneの日付形式）
     * @param {boolean} today_sw - 今日との比較で振込指定日が問題ないか確認したい場合 = true
     * @returns {boolean} - 振込指定日として指定できる日 = true、 振込指定日として指定できない日 = false
     */
    const _fi_check_Designate_transfer_date = (Designate_transfer_date, today_sw = false) => {
        if (typeof Designate_transfer_date !== 'string' || Designate_transfer_date.length === 0) return false;
        let check_flag = true;
        const check_date = luxon.DateTime.fromISO(Designate_transfer_date);
        if (check_date) {
            if (today_sw) {
                let today = luxon.DateTime.local();
                if (today.hour >= 18) {
                    today = today.plus({'days': 1}).startOf('day');
                } else {
                    today = today.startOf('day');
                }
                let reject_flag = false;
                while (!reject_flag) {
                    reject_flag = _fi_check_Designate_transfer_date(today.toFormat('yyyy-MM-dd'));
                    if (!reject_flag) {
                        today = today.plus({'days': 1}).startOf('day');
                    }
                }
                const check_date_diff = check_date.diff(today, 'days').days;
                if (check_date_diff < 1 || check_date_diff >= 14) {
                    check_flag = false;
                }
            }
            switch (check_date.weekdayShort) {
                case '土':
                case '日':
                    check_flag = false;
                    break;
            }
            if ($.national_holiday(check_date.toFormat('yyyy-MM-dd'))) {
                check_flag = false;
            } else if (Number(check_date.toFormat('MM')) === 1 && Number(check_date.toFormat('dd')) <= 3) {
                check_flag = false;
            } else if (Number(check_date.toFormat('MM')) === 12 && Number(check_date.toFormat('dd')) === 31) {
                check_flag = false;
            }
            return check_flag;
        }
        return false;
    };
    $.check_Designate_transfer_date = _fi_check_Designate_transfer_date;
    
    /**
     * 文字列のバイト数を確認する関数
     * @param {string} char - 文字列
     * @returns {number|null} - バイト数、文字列がない場合はnull
     */
    const _fi_byte_number = (char) => {
        if (typeof char !== 'string' || char.length === 0) return null;
        if (!_fi_is_zengin_allowed_chars(char)) return null;
        let bytes = 0;
        for (let c = 0; c < char.length; c++) {
            const code = char.charCodeAt(c);
            // ASCII・半角カナは1バイト
            if (
                (code >= 0x00 && code <= 0x7F) || // ASCII
                (code >= 0xFF61 && code <= 0xFF9F) // 半角カナ
            ) {
                bytes += 1;
            } else {
                // それ以外（全角カナ・漢字など）は2バイト
                bytes += 2;
            }
        }
        return bytes;
    };
    $.byte_number = _fi_byte_number;
    
    /**
     * 文字列を指定したバイト数で切り取る関数（マルチバイト文字対応）
     * @param {string} char - 文字列
     * @param {number} byte_length - 切り取りたいバイト数
     * @returns {string|null} - 切り取った文字列、失敗した場合はnull
     */
    const _fi_byte_slice = (char, byte_length) => {
        if (typeof char !== 'string' || char.length === 0 || typeof byte_length !== 'number' || byte_length < 1) return null;
        let result = '';
        let length = 0;
        for (let char_slice of char) {
            const char_slice_byte = _fi_byte_number(char_slice);
            if (length + char_slice_byte > byte_length) break;
            result += char_slice;
            length += char_slice_byte;
        }
        return result;
    };
    $.byte_slice = _fi_byte_slice;
})(jQuery);