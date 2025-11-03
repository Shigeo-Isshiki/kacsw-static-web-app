/** 金融機関処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_fi_)で始める
/* exported convertAccountHolderKana, getByteLength, sliceByByteLength, convertJapanPostAccount, isValidTransferDate */
// リソースの読み込み制限を行っている場合は、fetch通信を下記のURLに対して許可する必要があります
// https://bank.teraren.com
// https://api.national-holidays.jp
'use strict';
// --- 外部APIエンドポイント定数 ---
/** 銀行APIベースURL @type {string} */
const _fi_BANK_API_BASE_URL = 'https://bank.teraren.com';
/** 祝日APIベースURL @type {string} */
const _fi_HOLIDAY_API_BASE_URL = 'https://api.national-holidays.jp';
/**
 * 金融機関処理用の統一エラークラス
 * @class
 * @extends {Error}
 * @param {string} message エラーメッセージ
 * @param {'logic'|'ajax'|'validation'|'unknown'} [type='unknown'] エラー種別
 * @property {string} name エラー名（NationalHolidayError）
 * @property {'logic'|'ajax'|'validation'|'unknown'} type エラー種別
 * @throws {Error} 継承元Errorの例外
 * @private
 */
class _fi_FinancialInstitutionError extends Error {
  constructor(message, type = 'unknown') {
    super(message);
    this.name = 'FinancialInstitutionError';
    this.type = type;
  }
}

// 公開: kintone から利用される可能性のある関数/定数をグローバルに露出
if (typeof window !== 'undefined') {
  try {
    window.convertJapanPostAccount =
      typeof convertJapanPostAccount !== 'undefined' ? convertJapanPostAccount : undefined;
  } catch {}
  try {
    window.isValidTransferDate =
      typeof isValidTransferDate !== 'undefined' ? isValidTransferDate : undefined;
  } catch {}
}
// --- Magic Number 定数 ---
const _fi_BANK_CODE_LENGTH = 4;
const _fi_BRANCH_CODE_LENGTH = 3;
const _fi_ACCOUNT_NUMBER_LENGTH = 7;
const _fi_JAPAN_POST_SYMBOL_LENGTH = 5;
const _fi_JAPAN_POST_NUMBER_MAX_LENGTH = 8;
const _fi_TRANSFER_DATE_MIN_DAYS = 1;
const _fi_TRANSFER_DATE_MAX_DAYS = 14;
/* _fi_DEPOSIT_TYPE_* は内部定数のため非公開化 */
const _fi_CUTOFF_HOUR_FOR_NEXT_DAY = 18;
const _fi_SUNDAY = 0;
const _fi_SATURDAY = 6;
const _fi_JANUARY = 0;
const _fi_DECEMBER = 11;
const _fi_NEW_YEAR_EVE = 31;
const _fi_NEW_YEAR_DAYS = [1, 2, 3];
// --- 変換用定数・マッピング ---
/** 全角カナ変換マッピング @type {Object} */
const _fi_FULL_WIDTH_KANA_LIST = {
  ｱ: 'ア',
  ｲ: 'イ',
  ｳ: 'ウ',
  ｴ: 'エ',
  ｵ: 'オ',
  ｶ: 'カ',
  ｷ: 'キ',
  ｸ: 'ク',
  ｹ: 'ケ',
  ｺ: 'コ',
  ｻ: 'サ',
  ｼ: 'シ',
  ｽ: 'ス',
  ｾ: 'セ',
  ｿ: 'ソ',
  ﾀ: 'タ',
  ﾁ: 'チ',
  ﾂ: 'ツ',
  ﾃ: 'テ',
  ﾄ: 'ト',
  ﾅ: 'ナ',
  ﾆ: 'ニ',
  ﾇ: 'ヌ',
  ﾈ: 'ネ',
  ﾉ: 'ノ',
  ﾊ: 'ハ',
  ﾋ: 'ヒ',
  ﾌ: 'フ',
  ﾍ: 'ヘ',
  ﾎ: 'ホ',
  ﾏ: 'マ',
  ﾐ: 'ミ',
  ﾑ: 'ム',
  ﾒ: 'メ',
  ﾓ: 'モ',
  ﾔ: 'ヤ',
  ﾕ: 'ユ',
  ﾖ: 'ヨ',
  ﾗ: 'ラ',
  ﾘ: 'リ',
  ﾙ: 'ル',
  ﾚ: 'レ',
  ﾛ: 'ロ',
  ﾜ: 'ワ',
  ｦ: 'ヲ',
  ﾝ: 'ン',
  ｧ: 'ァ',
  ｨ: 'ィ',
  ｩ: 'ゥ',
  ｪ: 'ェ',
  ｫ: 'ォ',
  ｯ: 'ッ',
  ｬ: 'ャ',
  ｭ: 'ュ',
  ｮ: 'ョ',
  ﾞ: '゛',
  ﾟ: '゜',
};
/** 全角カナ変換用正規表現 @type {RegExp} */
const _fi_FULL_WIDTH_KANA_LIST_REG = new RegExp(
  '(' + Object.keys(_fi_FULL_WIDTH_KANA_LIST).join('|') + ')',
  'g'
);
/** 濁点・半濁点カナ変換マッピング @type {Object} */
const _fi_TURBIDITY_KANA_LIST = {
  'カ゛': 'ガ',
  'キ゛': 'ギ',
  'ク゛': 'グ',
  'ケ゛': 'ゲ',
  'コ゛': 'ゴ',
  'サ゛': 'ザ',
  'シ゛': 'ジ',
  'ス゛': 'ズ',
  'セ゛': 'ゼ',
  'ソ゛': 'ゾ',
  'タ゛': 'ダ',
  'チ゛': 'ヂ',
  'ツ゛': 'ヅ',
  'テ゛': 'デ',
  'ト゛': 'ド',
  'ハ゛': 'バ',
  'ヒ゛': 'ビ',
  'フ゛': 'ブ',
  'ヘ゛': 'ベ',
  'ホ゛': 'ボ',
  'ハ゜': 'パ',
  'ヒ゜': 'ピ',
  'フ゜': 'プ',
  'ヘ゜': 'ペ',
  'ホ゜': 'ポ',
  'ウ゛': 'ヴ',
  'ワ゛': 'ヷ',
  'ヲ゛': 'ヺ',
};
/** 濁点・半濁点カナ変換用正規表現 @type {RegExp} */
const _fi_TURBIDITY_KANA_LIST_REG = new RegExp(
  '(' + Object.keys(_fi_TURBIDITY_KANA_LIST).join('|') + ')',
  'g'
);
/** 半角カナ変換マッピング @type {Object} */
const _fi_HALF_WIDTH_KANA_LIST = {
  ア: 'ｱ',
  イ: 'ｲ',
  ウ: 'ｳ',
  エ: 'ｴ',
  オ: 'ｵ',
  カ: 'ｶ',
  キ: 'ｷ',
  ク: 'ｸ',
  ケ: 'ｹ',
  コ: 'ｺ',
  サ: 'ｻ',
  シ: 'ｼ',
  ス: 'ｽ',
  セ: 'ｾ',
  ソ: 'ｿ',
  タ: 'ﾀ',
  チ: 'ﾁ',
  ツ: 'ﾂ',
  テ: 'ﾃ',
  ト: 'ﾄ',
  ナ: 'ﾅ',
  ニ: 'ﾆ',
  ヌ: 'ﾇ',
  ネ: 'ﾈ',
  ノ: 'ﾉ',
  ハ: 'ﾊ',
  ヒ: 'ﾋ',
  フ: 'ﾌ',
  ヘ: 'ﾍ',
  ホ: 'ﾎ',
  マ: 'ﾏ',
  ミ: 'ﾐ',
  ム: 'ﾑ',
  メ: 'ﾒ',
  モ: 'ﾓ',
  ヤ: 'ﾔ',
  ユ: 'ﾕ',
  ヨ: 'ﾖ',
  ラ: 'ﾗ',
  リ: 'ﾘ',
  ル: 'ﾙ',
  レ: 'ﾚ',
  ロ: 'ﾛ',
  ワ: 'ﾜ',
  ヲ: 'ｵ',
  ン: 'ﾝ',
  ガ: 'ｶﾞ',
  ギ: 'ｷﾞ',
  グ: 'ｸﾞ',
  ゲ: 'ｹﾞ',
  ゴ: 'ｺﾞ',
  ザ: 'ｻﾞ',
  ジ: 'ｼﾞ',
  ズ: 'ｽﾞ',
  ゼ: 'ｾﾞ',
  ゾ: 'ｿﾞ',
  ダ: 'ﾀﾞ',
  ヂ: 'ﾁﾞ',
  ヅ: 'ﾂﾞ',
  デ: 'ﾃﾞ',
  ド: 'ﾄﾞ',
  バ: 'ﾊﾞ',
  ビ: 'ﾋﾞ',
  ブ: 'ﾌﾞ',
  ベ: 'ﾍﾞ',
  ボ: 'ﾎﾞ',
  パ: 'ﾊﾟ',
  ピ: 'ﾋﾟ',
  プ: 'ﾌﾟ',
  ペ: 'ﾍﾟ',
  ポ: 'ﾎﾟ',
  ヴ: 'ｳﾞ',
  ヷ: 'ﾜﾞ',
  ヺ: 'ｵﾞ',
  ァ: 'ｱ',
  ィ: 'ｲ',
  ゥ: 'ｳ',
  ェ: 'ｴ',
  ォ: 'ｵ',
  ッ: 'ﾂ',
  ャ: 'ﾔ',
  ュ: 'ﾕ',
  ョ: 'ﾖ',
  '゛': 'ﾞ',
  '゜': 'ﾟ',
};
/** 半角カナ変換用正規表現 @type {RegExp} */
const _fi_HALF_WIDTH_KANA_LIST_REG = new RegExp(
  '(' + Object.keys(_fi_HALF_WIDTH_KANA_LIST).join('|') + ')',
  'g'
);
/** 銀行用カナ変換マッピング @type {Object} */
const _fi_BANK_KANA_LIST = {
  ｧ: 'ｱ',
  ｨ: 'ｲ',
  ｩ: 'ｳ',
  ｪ: 'ｴ',
  ｫ: 'ｵ',
  ｯ: 'ﾂ',
  ｬ: 'ﾔ',
  ｭ: 'ﾕ',
  ｮ: 'ﾖ',
  '（': '(',
  '）': ')',
  '・': '.',
  ー: '-',
  '‐': '-',
  '－': '-',
  '　': ' ',
  '゛': 'ﾞ',
  '゜': 'ﾟ',
};
/** 銀行用カナ変換用正規表現 @type {RegExp} */
const _fi_BANK_KANA_LIST_REG = new RegExp(
  '(' + Object.keys(_fi_BANK_KANA_LIST).join('|') + ')',
  'g'
);
/** 法人略語マッピング @type {Object} */
const _fi_CORPORATE_ABBREVIATIONS_LIST = {
  株式会社: 'ｶ',
  ｶﾌﾞｼｷｶﾞｲｼﾔ: 'ｶ',
  有限会社: 'ﾕ',
  ﾕｳｹﾞﾝｶﾞｲｼﾔ: 'ﾕ',
  合名会社: 'ﾒ',
  ｺﾞｳﾒｲｶﾞｲｼﾔ: 'ﾒ',
  合資会社: 'ｼ',
  ｺﾞｳｼｶﾞｲｼﾔ: 'ｼ',
  合同会社: 'ﾄﾞ',
  ｺﾞｳﾄﾞｳｶﾞｲｼﾔ: 'ﾄﾞ',
  医療法人社団: 'ｲ',
  ｲﾘﾖｳﾎｳｼﾞﾝｼﾔﾀﾞﾝ: 'ｲ',
  医療法人財団: 'ｲ',
  ｲﾘﾖｳﾎｳｼﾞﾝｻﾞｲﾀﾞﾝ: 'ｲ',
  社会医療法人: 'ｲ',
  ｼﾔｶｲｲﾘﾖｳﾎｳｼﾞﾝ: 'ｲ',
  医療法人: 'ｲ',
  ｲﾘﾖｳﾎｳｼﾞﾝ: 'ｲ',
  一般財団法人: 'ｻﾞｲ',
  ｲﾂﾊﾟﾝｻﾞｲﾀﾞﾝﾎｳｼﾞﾝ: 'ｻﾞｲ',
  公益財団法人: 'ｻﾞｲ',
  ｺｳｴｷｻﾞｲﾀﾞﾝﾎｳｼﾞﾝ: 'ｻﾞｲ',
  財団法人: 'ｻﾞｲ',
  ｻﾞｲﾀﾞﾝﾎｳｼﾞﾝ: 'ｻﾞｲ',
  一般社団法人: 'ｼﾔ',
  ｲﾂﾊﾟﾝｼﾔﾀﾞﾝﾎｳｼﾞﾝ: 'ｼﾔ',
  公益社団法人: 'ｼﾔ',
  ｺｳｴｷｼﾔﾀﾞﾝﾎｳｼﾞﾝ: 'ｼﾔ',
  社団法人: 'ｼﾔ',
  ｼﾔﾀﾞﾝﾎｳｼﾞﾝ: 'ｼﾔ',
  宗教法人: 'ｼﾕｳ',
  ｼﾕｳｷﾖｳﾎｳｼﾞﾝ: 'ｼﾕｳ',
  学校法人: 'ｶﾞｸ',
  ｶﾞﾂｺｳﾎｳｼﾞﾝ: 'ｶﾞｸ',
  社会福祉法人: 'ﾌｸ',
  ｼﾔｶｲﾌｸｼﾎｳｼﾞﾝ: 'ﾌｸ',
  更生保護法人: 'ﾎｺﾞ',
  ｺｳｾｲﾎｺﾞﾎｳｼﾞﾝ: 'ﾎｺﾞ',
  相互会社: 'ｿ',
  ｿｳｺﾞｶﾞｲｼﾔ: 'ｿ',
  特定非営利活動法人: 'ﾄｸﾋ',
  ﾄｸﾃｲﾋｴｲﾘｶﾂﾄﾞｳﾎｳｼﾞﾝ: 'ﾄｸﾋ',
  地方独立行政法人: 'ﾁﾄﾞｸ',
  ﾁﾎｳﾄﾞｸﾘﾂｷﾞﾖｳｾｲﾎｳｼﾞﾝ: 'ﾁﾄﾞｸ',
  独立行政法人: 'ﾄﾞｸ',
  ﾄﾞｸﾘﾂｷﾞﾖｳｾｲﾎｳｼﾞﾝ: 'ﾄﾞｸ',
  中期目標管理法人: 'ﾓｸ',
  ﾁﾕｳｷﾓｸﾋﾖｳｶﾝﾘﾎｳｼﾞﾝ: 'ﾓｸ',
  国立研究開発法人: 'ｹﾝ',
  ｺｸﾘﾂｹﾝｷﾕｳｶｲﾊﾂﾎｳｼﾞﾝ: 'ｹﾝ',
  行政執行法人: 'ｼﾂ',
  ｷﾞﾖｳｾｲｼﾂｺｳﾎｳｼﾞﾝ: 'ｼﾂ',
  弁護士法人: 'ﾍﾞﾝ',
  ﾍﾞﾝｺﾞｼﾎｳｼﾞﾝ: 'ﾍﾞﾝ',
  有限責任中間法人: 'ﾁﾕｳ',
  ﾕｳｹﾞﾝｾｷﾆﾝﾁﾕｳｶﾝﾎｳｼﾞﾝ: 'ﾁﾕｳ',
  無限責任中間法人: 'ﾁﾕｳ',
  ﾑｹﾞﾝｾｷﾆﾝﾁﾕｳｶﾝﾎｳｼﾞﾝ: 'ﾁﾕｳ',
  行政書士法人: 'ｷﾞﾖ',
  ｷﾞﾖｳｾｲｼﾖｼﾎｳｼﾞﾝ: 'ｷﾞﾖ',
  司法書士法人: 'ｼﾎｳ',
  ｼﾎｳｼﾖｼﾎｳｼﾞﾝ: 'ｼﾎｳ',
  税理士法人: 'ｾﾞｲ',
  ｾﾞｲﾘｼﾎｳｼﾞﾝ: 'ｾﾞｲ',
  国立大学法人: 'ﾀﾞｲ',
  ｺｸﾘﾂﾀﾞｲｶﾞｸﾎｳｼﾞﾝ: 'ﾀﾞｲ',
  公立大学法人: 'ﾀﾞｲ',
  ｺｳﾘﾂﾀﾞｲｶﾞｸﾎｳｼﾞﾝ: 'ﾀﾞｲ',
  農事組合法人: 'ﾉｳ',
  ﾉｳｼﾞｸﾐｱｲﾎｳｼﾞﾝ: 'ﾉｳ',
  管理組合法人: 'ｶﾝﾘ',
  ｶﾝﾘｸﾐｱｲﾎｳｼﾞﾝ: 'ｶﾝﾘ',
  社会保険労務士法人: 'ﾛｳﾑ',
  ｼﾔｶｲﾎｹﾝﾛｳﾑｼﾎｳｼﾞﾝ: 'ﾛｳﾑ',
};
/** 法人略語用正規表現 @type {RegExp} */
const _fi_CORPORATE_ABBREVIATIONS_LIST_REG = new RegExp(
  '(' + Object.keys(_fi_CORPORATE_ABBREVIATIONS_LIST).join('|') + ')',
  ''
);
/** 営業所マッピング @type {Object} */
const _fi_SALES_OFFICES_LIST = {
  営業所: 'ｴｲ',
  ｴｲｷﾞﾖｳｼﾖ: 'ｴｲ',
  ｴｲｷﾞﾖｳｼﾞﾖ: 'ｴｲ',
  出張所: 'ｼﾕﾂ',
  ｼﾕﾂﾁﾖｳｼﾖ: 'ｼﾕﾂ',
  ｼﾕﾂﾁﾖｳｼﾞﾖ: 'ｼﾕﾂ',
};
/** 営業所用正規表現 @type {RegExp} */
const _fi_SALES_OFFICES_LIST_REG = new RegExp(
  '(' + Object.keys(_fi_SALES_OFFICES_LIST).join('|') + ')',
  ''
);
/** 事業マッピング @type {Object} */
const _fi_BUSINESS_LIST = {
  国民健康保険団体連合会: 'ｺｸﾎﾚﾝ',
  ｺｸﾐﾝｹﾝｺｳﾎｹﾝﾀﾞﾝﾀｲﾚﾝｺﾞｳｶｲ: 'ｺｸﾎﾚﾝ',
  国家公務員共済組合連合会: 'ｺｸｷﾖｳﾚﾝ',
  ｺﾂｶｺｳﾑｲﾝｷﾖｳｻｲｸﾐｱｲﾚﾝｺﾞｳｶｲ: 'ｺｸｷﾖｳﾚﾝ',
  経済農業協同組合連合会: 'ｹｲｻﾞｲﾚﾝ',
  ｹｲｻﾞｲﾉｳｷﾞﾖｳｷﾖｳﾄﾞｳｸﾐｱｲﾚﾝｺﾞｳｶｲ: 'ｹｲｻﾞｲﾚﾝ',
  共済農業協同組合連合会: 'ｷﾖｳｻｲﾚﾝ',
  ｷﾖｳｻｲﾉｳｷﾞﾖｳｷﾖｳﾄﾞｳｸﾐｱｲﾚﾝｺﾞｳｶｲ: 'ｷﾖｳｻｲﾚﾝ',
  農業協同組合連合会: 'ﾉｳｷﾖｳﾚﾝ',
  ﾉｳｷﾞﾖｳｷﾖｳﾄﾞｳｸﾐｱｲﾚﾝｺﾞｳｶｲ: 'ﾉｳｷﾖｳﾚﾝ',
  漁業協同組合連合会: 'ｷﾞﾖﾚﾝ',
  ｷﾞﾖｷﾞﾖｳｷﾖｳﾄﾞｳｸﾐｱｲﾚﾝｺﾞｳｶｲ: 'ｷﾞﾖﾚﾝ',
  連合会: 'ﾚﾝ',
  ﾚﾝｺﾞｳｶｲ: 'ﾚﾝ',
  共済組合: 'ｷﾖｳｻｲ',
  ｷﾖｳｻｲｸﾐｱｲ: 'ｷﾖｳｻｲ',
  生活協同組合: 'ｾｲｷﾖｳ',
  ｾｲｶﾂｷﾖｳﾄﾞｳｸﾐｱｲ: 'ｾｲｷﾖｳ',
  食糧販売協同組合: 'ｼﾖｸﾊﾝｷﾖｳ',
  ｼﾖｸﾘﾖｳﾊﾝﾊﾞｲｷﾖｳﾄﾞｳｸﾐｱｲ: 'ｼﾖｸﾊﾝｷﾖｳ',
  漁業協同組合: 'ｷﾞﾖｷﾖｳ',
  ｷﾞﾖｷﾞﾖｳｷﾖｳﾄﾞｳｸﾐｱｲ: 'ｷﾞﾖｷﾖｳ',
  協同組合: 'ｷﾖｳｸﾐ',
  ｷﾖｳﾄﾞｳｸﾐｱｲ: 'ｷﾖｳｸﾐ',
  生命保険: 'ｾｲﾒｲ',
  ｾｲﾒｲﾎｹﾝ: 'ｾｲﾒｲ',
  海上火災保険: 'ｶｲｼﾞﾖｳ',
  ｶｲｼﾞﾖｳｶｻｲﾎｹﾝ: 'ｶｲｼﾞﾖｳ',
  火災海上保険: 'ｶｻｲ',
  ｶｻｲｶｲｼﾞﾖｳﾎｹﾝ: 'ｶｻｲ',
  国民健康保険組合: 'ｺｸﾎ',
  ｺｸﾐﾝｹﾝｺｳﾎｹﾝｸﾐｱｲ: 'ｺｸﾎ',
  健康保険組合: 'ｹﾝﾎﾟ',
  ｹﾝｺｳﾎｹﾝｸﾐｱｲ: 'ｹﾝﾎﾟ',
  社会保険診療報酬支払基金: 'ｼﾔﾎ',
  ｼﾔｶｲﾎｹﾝｼﾝﾘﾖｳﾎｳｼﾕｳｼﾊﾗｲｷｷﾝ: 'ｼﾔﾎ',
  厚生年金基金: 'ｺｳﾈﾝ',
  ｺｳｾｲﾈﾝｷﾝｷｷﾝ: 'ｺｳﾈﾝ',
  従業員組合: 'ｼﾞﾕｳｸﾐ',
  ｼﾞﾕｳｷﾞﾖｳｲﾝｸﾐｱｲ: 'ｼﾞﾕｳｸﾐ',
  労働組合: 'ﾛｳｸﾐ',
  ﾛｳﾄﾞｳｸﾐｱｲ: 'ﾛｳｸﾐ',
  公共職業安定所: 'ｼﾖｸｱﾝ',
  ｺｳｷﾖｳｼﾖｸｷﾞﾖｳｱﾝﾃｲｼﾖ: 'ｼﾖｸｱﾝ',
  ｺｳｷﾖｳｼﾖｸｷﾞﾖｳｱﾝﾃｲｼﾞﾖ: 'ｼﾖｸｱﾝ',
  特別養護老人ホーム: 'ﾄｸﾖｳ',
  ﾄｸﾍﾞﾂﾖｳｺﾞﾛｳｼﾞﾝﾎｰﾑ: 'ﾄｸﾖｳ',
  有限責任事業組合: 'ﾕｳｸﾐ',
  ﾕｳｹﾞﾝｾｷﾆﾝｼﾞｷﾞﾖｳｸﾐｱｲ: 'ﾕｳｸﾐ',
};
/** 事業用正規表現 @type {RegExp} */
const _fi_BUSINESS_LIST_REG = new RegExp('(' + Object.keys(_fi_BUSINESS_LIST).join('|') + ')', '');
/**
 * 文字列を全角カナ（濁点・半濁点付き含む）に変換します。
 * @function
 * @param {string} inputStr 変換する文字列
 * @param {boolean} [hiraganaSw=true] ひらがなをカタカナに変換するか（true:変換する/false:変換しない）
 * @returns {string} 全角カナに変換された文字列
 * @throws {Error} 変換対象が文字列でない場合
 * @private
 * @example
 *   _fi_convert_to_full_width_kana('ﾀﾛｳ'); // => 'タロウ'
 */
const _fi_convert_to_full_width_kana = (inputStr, hiraganaSw = true) => {
  if (typeof inputStr !== 'string')
    throw new _fi_FinancialInstitutionError('変換する文字列は文字列である必要があります', 'logic');
  let fullWidthKana = inputStr;
  if (hiraganaSw) {
    fullWidthKana = String(fullWidthKana).replace(/[\u3041-\u3096]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) + 96)
    );
  }
  fullWidthKana = fullWidthKana.replace(
    _fi_FULL_WIDTH_KANA_LIST_REG,
    (c) => _fi_FULL_WIDTH_KANA_LIST[c]
  );
  fullWidthKana = fullWidthKana.replace(
    _fi_TURBIDITY_KANA_LIST_REG,
    (c) => _fi_TURBIDITY_KANA_LIST[c]
  );
  return fullWidthKana;
};
/**
 * 文字列を半角カナに変換します。
 * @function
 * @param {string} inputStr 変換する文字列
 * @returns {string} 半角カナに変換された文字列
 * @throws {Error} 変換対象が文字列でない場合
 * @private
 * @example
 *   _fi_convert_to_half_width_kana('タロウ'); // => 'ﾀﾛｳ'
 */
const _fi_convert_to_half_width_kana = (inputStr) => {
  if (typeof inputStr !== 'string')
    throw new _fi_FinancialInstitutionError('変換する文字列は文字列である必要があります', 'logic');
  const fullWidthKana = _fi_convert_to_full_width_kana(inputStr);
  return fullWidthKana.replace(_fi_HALF_WIDTH_KANA_LIST_REG, (c) => _fi_HALF_WIDTH_KANA_LIST[c]);
};
/**
 * 文字列を半角英数字・半角カナ・記号に変換します。
 * @function
 * @param {string} inputStr 変換する文字列
 * @returns {string} 半角英数字・半角カナ・記号に変換された文字列（大文字化）
 * @throws {Error} 変換対象が文字列でない場合
 * @private
 * @example
 *   _fi_convert_to_single_byte_characters('ＡＢＣ１２３'); // => 'ABC123'
 */
const _fi_convert_to_single_byte_characters = (inputStr) => {
  if (typeof inputStr !== 'string')
    throw new _fi_FinancialInstitutionError('変換する文字列は文字列である必要があります', 'logic');
  const hyphenProcess = inputStr.replace(
    /[\uFF0D\u2010\u2011\u2013\u2014\u2212\u30FC\u2015\uFF70]/g,
    '-'
  );
  const halfWidthKana = _fi_convert_to_half_width_kana(hyphenProcess);
  const singleByteCharacters = halfWidthKana
    .replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toUpperCase();
  return singleByteCharacters;
};
/**
 * 全角数字や漢数字を半角数字に変換します。
 * @function
 * @param {string} inputStr 変換する文字列
 * @returns {string} 半角数字に変換された文字列
 * @throws {Error} 変換対象が文字列でない場合、または未入力の場合
 * @private
 * @example
 *   _fi_convert_to_single_byte_numbers('１２３四五'); // => '12345'
 */
const _fi_convert_to_single_byte_numbers = (inputStr = '') => {
  if (typeof inputStr !== 'string')
    throw new _fi_FinancialInstitutionError('変換する文字列は文字列である必要があります', 'logic');
  if (inputStr.length === 0)
    throw new _fi_FinancialInstitutionError('変換対象の文字列が未入力です', 'logic');
  const _fi_convertKanjiNumerals = (kanjiStr = '') => {
    const _fi_parseKanjiNumber = (kanji) => {
      const digits = {
        〇: 0,
        一: 1,
        二: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        七: 7,
        八: 8,
        九: 9,
      };
      const multipliers = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
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
    return kanjiStr.replace(/[〇一二三四五六七八九十百千]+/g, (match) =>
      _fi_parseKanjiNumber(match)
    );
  };
  const _fi_convertFullWidthDigits = (numStr = '') => {
    return numStr.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
  };
  let result = _fi_convertKanjiNumerals(inputStr);
  result = _fi_convertFullWidthDigits(result);
  return result;
};
// --- APIレスポンスバリデーション ---
/**
 * 銀行APIレスポンスのバリデーション（内部関数）
 * @function
 * @param {object} result APIレスポンス
 * @throws {Error} 不正なレスポンスの場合
 * @private
 */
const _fi_validateBankResponse = (result) => {
  if (
    !result ||
    typeof result.code !== 'string' ||
    typeof result.normalize !== 'object' ||
    typeof result.normalize.name !== 'string' ||
    typeof result.kana !== 'string'
  ) {
    throw new _fi_FinancialInstitutionError('APIレスポンスが不正です（銀行情報）', 'ajax');
  }
};
/**
 * 銀行APIレスポンス（配列）のバリデーション（内部関数）
 * @function
 * @param {object[]} result APIレスポンス配列
 * @throws {Error} 不正なレスポンスの場合
 * @private
 */
const _fi_validateBankArrayResponse = (result) => {
  if (
    !Array.isArray(result) ||
    result.length === 0 ||
    !result.every(
      (row) =>
        typeof row.code === 'string' &&
        typeof row.normalize === 'object' &&
        typeof row.normalize.name === 'string' &&
        typeof row.kana === 'string'
    )
  ) {
    throw new _fi_FinancialInstitutionError('APIレスポンスが不正です（銀行情報リスト）', 'ajax');
  }
};
/**
 * 支店APIレスポンスのバリデーション（内部関数）
 * @function
 * @param {object} result APIレスポンス
 * @throws {Error} 不正なレスポンスの場合
 * @private
 */
const _fi_validateBranchResponse = (result) => {
  if (
    !result ||
    typeof result.code !== 'string' ||
    typeof result.normalize !== 'object' ||
    typeof result.normalize.name !== 'string' ||
    typeof result.kana !== 'string'
  ) {
    throw new _fi_FinancialInstitutionError('APIレスポンスが不正です（支店情報）', 'ajax');
  }
};
/**
 * 支店APIレスポンス（配列）のバリデーション（内部関数）
 * @function
 * @param {object[]} result APIレスポンス配列
 * @throws {Error} 不正なレスポンスの場合
 * @private
 */
const _fi_validateBranchArrayResponse = (result) => {
  if (
    !Array.isArray(result) ||
    result.length === 0 ||
    !result.every(
      (row) =>
        typeof row.code === 'string' &&
        typeof row.normalize === 'object' &&
        typeof row.normalize.name === 'string' &&
        typeof row.kana === 'string'
    )
  ) {
    throw new _fi_FinancialInstitutionError('APIレスポンスが不正です（支店情報リスト）', 'ajax');
  }
};
/**
 * 全銀手順で許可される文字種のみ許可するバリデーション関数。
 * @function
 * @param {string} str 入力文字列
 * @returns {boolean} 許可される場合true、許可されない文字が含まれる場合false
 * @throws {Error} 入力が文字列でない場合
 * @private
 * @example
 *   _fi_is_zengin_allowed_chars('ﾀﾛｳ123'); // => true
 */
const _fi_is_zengin_allowed_chars = (str) => {
  if (typeof str !== 'string')
    throw new _fi_FinancialInstitutionError('入力文字列は文字列である必要があります', 'logic');
  // 半角英数字・半角カナ・許可記号のみ
  // 許可記号は用途に応じて調整可能
  const zenginReg = /^[0-9A-Z !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~｡｢｣､･\uFF61-\uFF9F]+$/;
  return zenginReg.test(str);
};
/**
 * 指定した日付が国民の祝日かどうかを判定し、祝日名またはnullをコールバックで返す（非同期）
 *
 * @function _fi_getNationalHolidayName
 * @param {string} date_str - ISO 8601拡張形式（YYYY-MM-DD）の日付文字列
 * @param {(holidayName: string|null) => void} callback - 祝日名（該当しなければnull）を返すコールバック関数
 * @returns {void}
 * @throws {_nh_FinancialInstitutionError} date_strやcallbackの型が不正な場合
 * @private
 * @example
 * _fi_getNationalHolidayName('2025-09-15', (name) => {
 *   if (name) {
 *     console.log('祝日:', name);
 *   } else {
 *     console.log('祝日ではありません');
 *   }
 * });
 *
 * @remarks
 * - 1948-07-20以前の日付は祝日判定対象外です。
 * - APIレスポンスの型チェックを行い、不正なデータは無視します。
 * - fetch通信エラーやAPI異常時は必ずnullを返します。
 */
const _fi_getNationalHolidayName = (date_str, callback) => {
  if (typeof date_str !== 'string')
    throw new _fi_FinancialInstitutionError('検索対象の日付は文字列である必要があります', 'logic');
  if (typeof callback !== 'function')
    throw new _fi_FinancialInstitutionError('コールバックは関数である必要があります', 'logic');
  if (!date_str) return callback(null);
  if (date_str < '1948-07-20') return callback(null);
  fetch(_fi_HOLIDAY_API_BASE_URL + '/' + date_str)
    .then((res) => {
      if (!res.ok) {
        throw new Error('祝日APIのレスポンスが不正です: ' + res.status);
      }
      return res.json();
    })
    .then((result) => {
      // 祝日でない場合 { error: "not_found" }
      if (result && typeof result === 'object') {
        if (result.error === 'not_found') {
          callback(null);
          return;
        }
        if (typeof result.date === 'string' && typeof result.name === 'string') {
          callback(result.name);
          return;
        }
      }
      // それ以外はnull
      callback(null);
    })
    .catch((_err) => {
      // 通信エラーやAPI異常時も必ずnullで抜ける
      callback(null);
    });
};

/**
 * 銀行番号（4桁）または銀行名（部分一致可）から銀行情報を取得します。
 * @function
 * @param {string} bankChar - 銀行番号（4桁の数字文字列）または銀行名（部分一致可）。
 * @param {(result: {bank_number: string, bank_name: string, bank_name_kana: string}) => void} successCallback - 正常時に呼ばれるコールバック。引数 result の内容:
 *   - bank_number: 銀行番号（4桁）
 *   - bank_name: 銀行名（正規化済み）
 *   - bank_name_kana: 銀行名カナ（半角カナ）
 * @param {(err: Error & {type?: 'logic'|'ajax'}) => void} failureCallback - エラー時に呼ばれるコールバック。err.type でエラー種別（logic:入力不備/ajax:API通信・データ不備）を判別。
 * @returns {void}
 * @throws {Error} 引数の型が不正な場合
 * @public
 * @example <caption>銀行番号で取得</caption>
 * findBank('0005',
 *   (result) => {
 *     console.log(result.bank_number); // '0005'
 *     console.log(result.bank_name);   // '三菱ＵＦＪ銀行'
 *     console.log(result.bank_name_kana); // 'ﾐﾂﾋﾞｼﾕｰｴﾌｼﾞｪｲｷﾞﾝｺｳ'
 *   },
 *   (err) => {
 *     alert(err.message);
 *   }
 * );
 *
 * @example <caption>銀行名で取得（部分一致）</caption>
 * findBank('みずほ',
 *   (result) => {
 *     // ...
 *   },
 *   (err) => {
 *     // ...
 *   }
 * );
 *
 * @example <caption>エラー時のコールバック</caption>
 * findBank('',
 *   (result) => {},
 *   (err) => {
 *     if (err.type === 'logic') {
 *       alert('入力エラー: ' + err.message);
 *     } else {
 *       alert('APIエラー: ' + err.message);
 *     }
 *   }
 * );
 */
const findBank = (bankChar, successCallback, failureCallback) => {
  if (typeof bankChar !== 'string')
    throw new _fi_FinancialInstitutionError(
      '銀行番号（4桁）または銀行名（部分一致可）は文字列である必要があります',
      'logic'
    );
  if (typeof successCallback !== 'function')
    throw new _fi_FinancialInstitutionError(
      '正常時に呼ばれるコールバックは関数である必要があります',
      'logic'
    );
  if (typeof failureCallback !== 'function')
    throw new _fi_FinancialInstitutionError(
      'エラー時に呼ばれるコールバックは関数である必要があります',
      'logic'
    );
  if (bankChar.length === 0) {
    if (failureCallback) {
      failureCallback(
        new _fi_FinancialInstitutionError('銀行番号または銀行名が未入力です', 'logic')
      );
    }
    return;
  }
  const bankCharSbn = Number(_fi_convert_to_single_byte_numbers(bankChar));
  // 銀行番号で検索
  if (bankCharSbn >= 0 && bankCharSbn <= Number('9'.repeat(_fi_BANK_CODE_LENGTH))) {
    const bankNumberTemp = '0'.repeat(_fi_BANK_CODE_LENGTH) + String(bankCharSbn);
    const bankNumber = bankNumberTemp.slice(-_fi_BANK_CODE_LENGTH);
    fetch(_fi_BANK_API_BASE_URL + '/banks/' + bankNumber + '.json')
      .then((response) => {
        if (!response.ok) {
          if (response.status === 404) {
            throw new _fi_FinancialInstitutionError(
              `銀行番号「${bankNumber}」に該当する銀行が見つかりません`,
              'ajax'
            );
          } else if (response.status >= 500) {
            throw new _fi_FinancialInstitutionError('サーバーエラーが発生しました', 'ajax');
          } else {
            throw new _fi_FinancialInstitutionError(`通信エラー（${response.status}）`, 'ajax');
          }
        }
        return response.json();
      })
      .then((result) => {
        _fi_validateBankResponse(result);
        successCallback({
          bank_number: result.code,
          bank_name: result.normalize.name,
          bank_name_kana: convertAccountHolderKana(result.kana, false),
        });
      })
      .catch((err) => {
        if (failureCallback) {
          // fetch失敗時も「銀行が見つかりません」と返す
          let message = '銀行が見つかりません';
          if (err instanceof _fi_FinancialInstitutionError) {
            message = err.message;
          }
          failureCallback(new _fi_FinancialInstitutionError(message, 'ajax'));
        }
      });
    return;
  }
  // 銀行名で検索
  fetch(_fi_BANK_API_BASE_URL + '/banks/search.json?name=' + encodeURIComponent(bankChar))
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          throw new _fi_FinancialInstitutionError(
            `銀行名「${bankChar}」に該当する銀行が見つかりません`,
            'ajax'
          );
        } else if (response.status >= 500) {
          throw new _fi_FinancialInstitutionError('サーバーエラーが発生しました', 'ajax');
        } else {
          throw new _fi_FinancialInstitutionError(`通信エラー（${response.status}）`, 'ajax');
        }
      }
      return response.json();
    })
    .then((result) => {
      try {
        _fi_validateBankArrayResponse(result);
      } catch (e) {
        if (failureCallback) return failureCallback(e);
        return;
      }
      if (result.length === 1) {
        successCallback({
          bank_number: result[0].code,
          bank_name: result[0].normalize.name,
          bank_name_kana: convertAccountHolderKana(result[0].kana, false),
        });
      } else {
        if (failureCallback) {
          failureCallback(
            new _fi_FinancialInstitutionError(
              `銀行名「${bankChar}」に該当する銀行が複数見つかりました。より詳細な名称で再検索してください。`,
              'ajax'
            )
          );
        }
      }
    })
    .catch((err) => {
      if (failureCallback) {
        if (!(err instanceof _fi_FinancialInstitutionError)) {
          err = new _fi_FinancialInstitutionError(
            err && err.message ? err.message : 'ネットワークエラーまたは不明なエラー',
            'ajax'
          );
        }
        failureCallback(err);
      }
    });
};

/**
 * 銀行番号（4桁）または銀行名、および支店番号（3桁）または支店名から支店情報を取得します。
 * @function
 * @param {string} bankChar - 銀行番号（4桁の数字文字列）または銀行名（部分一致可）。
 * @param {string} bankBranchChar - 支店番号（3桁の数字文字列）または支店名（部分一致可）。
 * @param {(result: {bank_branch_number: string, bank_branch_name: string, bank_branch_name_kana: string}) => void} successCallback - 正常時に呼ばれるコールバック。引数 result の内容:
 *   - bank_branch_number: 支店番号（3桁）
 *   - bank_branch_name: 支店名（正規化済み）
 *   - bank_branch_name_kana: 支店名カナ（半角カナ）
 * @param {(err: Error & {type?: 'logic'|'ajax'}) => void} failureCallback - エラー時に呼ばれるコールバック。err.type でエラー種別（logic:入力不備/ajax:API通信・データ不備）を判別。
 * @returns {void}
 * @throws {Error} 引数の型が不正な場合
 * @public
 * @example <caption>支店番号で取得</caption>
 * findBankBranch('0005', '123',
 *   (result) => {
 *     console.log(result.bank_branch_number); // '123'
 *     console.log(result.bank_branch_name);   // '本店'
 *     console.log(result.bank_branch_name_kana); // 'ﾎﾝﾃﾝ'
 *   },
 *   (err) => {
 *     alert(err.message);
 *   }
 * );
 *
 * @example <caption>支店名で取得（部分一致）</caption>
 * findBankBranch('みずほ', '渋谷',
 *   (result) => {
 *     // ...
 *   },
 *   (err) => {
 *     // ...
 *   }
 * );
 *
 * @example <caption>エラー時のコールバック</caption>
 * findBankBranch('', '',
 *   (result) => {},
 *   (err) => {
 *     if (err.type === 'logic') {
 *       alert('入力エラー: ' + err.message);
 *     } else {
 *       alert('APIエラー: ' + err.message);
 *     }
 *   }
 * );
 */
const findBankBranch = (bankChar, bankBranchChar, successCallback, failureCallback) => {
  if (typeof bankChar !== 'string')
    throw new _fi_FinancialInstitutionError(
      '銀行番号（4桁）または銀行名（部分一致可）は文字列である必要があります',
      'logic'
    );
  if (typeof bankBranchChar !== 'string')
    throw new _fi_FinancialInstitutionError(
      '支店番号（3桁）または支店名（部分一致可）は文字列である必要があります',
      'logic'
    );
  if (typeof successCallback !== 'function')
    throw new _fi_FinancialInstitutionError(
      '正常時に呼ばれるコールバックは関数である必要があります',
      'logic'
    );
  if (typeof failureCallback !== 'function')
    throw new _fi_FinancialInstitutionError(
      'エラー時に呼ばれるコールバックは関数である必要があります',
      'logic'
    );
  if (bankChar.length === 0 || bankBranchChar.length === 0) {
    if (failureCallback)
      failureCallback(
        new _fi_FinancialInstitutionError(
          '銀行番号、支店番号、支店名のいずれかが未入力です',
          'logic'
        )
      );
    return;
  }
  const bankCharSbn = _fi_convert_to_single_byte_numbers(bankChar);
  findBank(
    bankCharSbn,
    (bankInfo) => {
      const bankNumber = bankInfo.bank_number;
      if (!bankNumber) {
        if (failureCallback)
          failureCallback(new _fi_FinancialInstitutionError('銀行番号が未入力です', 'ajax'));
        return;
      }
      const bankBranchCharSbn = Number(_fi_convert_to_single_byte_numbers(bankBranchChar));
      // 支店番号で検索
      if (
        bankBranchCharSbn >= 0 &&
        bankBranchCharSbn <= Number('9'.repeat(_fi_BRANCH_CODE_LENGTH))
      ) {
        const bankBranchNumberTemp = '0'.repeat(_fi_BRANCH_CODE_LENGTH) + String(bankBranchCharSbn);
        const bankBranchNumber = bankBranchNumberTemp.slice(-_fi_BRANCH_CODE_LENGTH);
        fetch(
          _fi_BANK_API_BASE_URL + '/banks/' + bankNumber + '/branches/' + bankBranchNumber + '.json'
        )
          .then((response) => {
            if (!response.ok) {
              if (response.status === 404) {
                throw new _fi_FinancialInstitutionError(
                  `銀行番号「${bankNumber}」支店番号「${bankBranchNumber}」に該当する支店が見つかりません`,
                  'ajax'
                );
              } else if (response.status >= 500) {
                throw new _fi_FinancialInstitutionError('サーバーエラーが発生しました', 'ajax');
              } else {
                throw new _fi_FinancialInstitutionError(`通信エラー（${response.status}）`, 'ajax');
              }
            }
            return response.json();
          })
          .then((result) => {
            _fi_validateBranchResponse(result);
            successCallback({
              bank_branch_number: result.code,
              bank_branch_name: result.normalize.name,
              bank_branch_name_kana: convertAccountHolderKana(result.kana, false),
            });
          })
          .catch((err) => {
            if (failureCallback) {
              // fetch失敗時も「支店が見つかりません」と返す
              let message = '支店が見つかりません';
              if (err instanceof _fi_FinancialInstitutionError) {
                message = err.message;
              }
              failureCallback(new _fi_FinancialInstitutionError(message, 'ajax'));
            }
          });
        return;
      }
      // 支店名で検索
      fetch(
        _fi_BANK_API_BASE_URL +
          '/banks/' +
          bankNumber +
          '/branches/search.json?name=' +
          encodeURIComponent(bankBranchChar)
      )
        .then((response) => {
          if (!response.ok) {
            if (response.status === 404) {
              throw new _fi_FinancialInstitutionError(
                `銀行番号「${bankNumber}」支店名「${bankBranchChar}」に該当する支店が見つかりません`,
                'ajax'
              );
            } else if (response.status >= 500) {
              throw new _fi_FinancialInstitutionError('サーバーエラーが発生しました', 'ajax');
            } else {
              throw new _fi_FinancialInstitutionError(`通信エラー（${response.status}）`, 'ajax');
            }
          }
          return response.json();
        })
        .then((result) => {
          try {
            _fi_validateBranchArrayResponse(result);
          } catch (e) {
            if (failureCallback) return failureCallback(e);
            return;
          }
          if (result.length === 1) {
            successCallback({
              bank_branch_number: result[0].code,
              bank_branch_name: result[0].normalize.name,
              bank_branch_name_kana: convertAccountHolderKana(result[0].kana, false),
            });
          } else {
            if (failureCallback)
              failureCallback(
                new _fi_FinancialInstitutionError(
                  `銀行番号「${bankNumber}」支店名「${bankBranchChar}」に該当する支店が複数見つかりました。より詳細な名称で再検索してください。`,
                  'ajax'
                )
              );
          }
        })
        .catch((err) => {
          if (failureCallback) {
            if (!(err instanceof _fi_FinancialInstitutionError))
              err = new _fi_FinancialInstitutionError(
                err && err.message ? err.message : 'ネットワークエラーまたは不明なエラー',
                'ajax'
              );
            failureCallback(err);
          }
        });
    },
    (err) => {
      if (failureCallback) {
        if (!(err instanceof _fi_FinancialInstitutionError))
          err = new _fi_FinancialInstitutionError(
            err && err.message ? err.message : 'ネットワークエラーまたは不明なエラー',
            'ajax'
          );
        failureCallback(err);
      }
    }
  );
};

/**
 * 銀行口座番号の書式を7桁の半角数字に整形します。
 * @function
 * @param {string} bankAccountChar - 銀行口座番号（全角・漢数字・半角混在可）
 * @returns {string} 7桁の銀行口座番号（先頭ゼロ埋め、半角数字）
 * @throws {Error} 引数が文字列でない場合、未入力の場合、数字以外が含まれる場合
 * @public
 * @example
 *   formatBankAccountNumber('１２３４５'); // => '0001234'
 *   formatBankAccountNumber('五六七八九'); // => '0005678'
 *   formatBankAccountNumber('1234567'); // => '1234567'
 */
const formatBankAccountNumber = (bankAccountChar) => {
  if (typeof bankAccountChar !== 'string')
    throw new _fi_FinancialInstitutionError('銀行口座番号は文字列である必要があります', 'logic');
  if (bankAccountChar.length === 0)
    throw new _fi_FinancialInstitutionError('銀行口座番号が未入力です', 'logic');
  const singleByte = _fi_convert_to_single_byte_numbers(bankAccountChar);
  if (!/^[0-9]+$/.test(singleByte)) {
    throw new _fi_FinancialInstitutionError(
      '口座番号に数字以外の文字が含まれています',
      'validation'
    );
  }
  const bankAccountNumberTemp = '0'.repeat(_fi_ACCOUNT_NUMBER_LENGTH) + singleByte;
  const bankAccountNumber = bankAccountNumberTemp.slice(-_fi_ACCOUNT_NUMBER_LENGTH);
  return bankAccountNumber;
};

/**
 * ゆうちょ口座の記号番号・番号から、銀行名・支店名・口座番号等の情報を変換・取得します。
 *
 * kintone API風のコールバック構文（成功・失敗分離）です。
 * @function
 * @param {string} symbolChar - ゆうちょ口座記号（5桁、全角・半角・漢数字混在可）。
 * @param {string} numberChar - ゆうちょ口座番号（最大8桁、全角・半角・漢数字混在可）。
 * @param {(result: {
 *   symbol: string,                  // 変換後の記号（5桁、半角数字）
 *   number: string,                  // 変換後の番号（6～8桁、半角数字）
 *   bank_number: string,             // 銀行番号（ゆうちょは'9900'固定）
 *   bank_name: string,               // 銀行名（'ゆうちょ銀行'固定）
 *   bank_name_kana: string,          // 銀行名カナ（'ﾕｳﾁﾖ'固定）
 *   bank_branch_number: string,      // 支店番号（3桁、半角数字）
 *   bank_branch_name: string,        // 支店名
 *   bank_branch_name_kana: string,   // 支店名カナ
 *   deposit_type: string,            // 預金種別（'普通'または'当座'）
 *   bank_account_number: string      // 7桁の銀行口座番号（半角数字）
 * }) => void} successCallback - 正常時に呼ばれるコールバック。変換結果オブジェクトを受け取る。
 * @param {(err: Error & {type?: 'logic'|'ajax'}) => void} failureCallback - エラー時に呼ばれるコールバック。err.typeでエラー種別（logic:入力不備/ajax:API通信・データ不備）を判別。
 * @returns {void}
 * @throws {Error} 引数の型が不正な場合
 * @public
 * @example <caption>ゆうちょ記号・番号から銀行情報を取得</caption>
 * convertJapanPostAccount('12345', '6789012',
 *   (result) => {
 *     console.log(result.bank_number); // '9900'
 *     console.log(result.bank_name);   // 'ゆうちょ銀行'
 *     console.log(result.bank_branch_number); // '239'または'238'など
 *     console.log(result.bank_account_number); // '6789012'など
 *   },
 *   (err) => {
 *     alert(err.message);
 *   }
 * );
 *
 * @example <caption>入力不備時のエラー</caption>
 * convertJapanPostAccount('', '',
 *   (result) => {},
 *   (err) => {
 *     if (err.type === 'logic') {
 *       alert('入力エラー: ' + err.message);
 *     } else {
 *       alert('APIエラー: ' + err.message);
 *     }
 *   }
 * );
 *
 * @example <caption>API通信エラー時</caption>
 * convertJapanPostAccount('12345', '6789012',
 *   (result) => {},
 *   (err) => {
 *     if (err.type === 'ajax') {
 *       alert('APIエラー: ' + err.message);
 *     }
 *   }
 * );
 */
const convertJapanPostAccount = (symbolChar, numberChar, successCallback, failureCallback) => {
  if (typeof symbolChar !== 'string')
    throw new _fi_FinancialInstitutionError(
      'ゆうちょ口座記号（5桁）は文字列である必要があります',
      'logic'
    );
  if (typeof numberChar !== 'string')
    throw new _fi_FinancialInstitutionError(
      'ゆうちょ口座番号（最大8桁）は文字列である必要があります',
      'logic'
    );
  if (typeof successCallback !== 'function')
    throw new _fi_FinancialInstitutionError(
      '正常時に呼ばれるコールバックは関数である必要があります',
      'logic'
    );
  if (typeof failureCallback !== 'function')
    throw new _fi_FinancialInstitutionError(
      'エラー時に呼ばれるコールバックは関数である必要があります',
      'logic'
    );
  if (symbolChar.length === 0 || numberChar.length === 0) {
    if (failureCallback)
      failureCallback(
        new _fi_FinancialInstitutionError('ゆうちょ記号、ゆうちょ番号が未入力です', 'logic')
      );
    return;
  }
  const symbolCharSbn = _fi_convert_to_single_byte_numbers(symbolChar);
  if (!/^[0-9]+$/.test(symbolCharSbn)) {
    if (failureCallback)
      failureCallback(
        new _fi_FinancialInstitutionError(
          'ゆうちょ口座記号に数字以外の文字が含まれています',
          'validation'
        )
      );
    return;
  }
  const symbol = symbolCharSbn.slice(-_fi_JAPAN_POST_SYMBOL_LENGTH);
  const numberCharSbn = _fi_convert_to_single_byte_numbers(numberChar);
  if (!/^[0-9]+$/.test(numberCharSbn)) {
    if (failureCallback)
      failureCallback(
        new _fi_FinancialInstitutionError(
          'ゆうちょ口座番号に数字以外の文字が含まれています',
          'validation'
        )
      );
    return;
  }
  const bankBranchNumberTemp = symbol.substring(1, 3);
  const depositTypeTemp = symbol.substring(0, 1);
  let number = null;
  let bankBranchNumber = null;
  let depositType = null;
  let bankAccountNumber = null;
  switch (depositTypeTemp) {
    case '0':
      bankBranchNumber = bankBranchNumberTemp + '9';
      depositType = '当座';
      if (numberCharSbn.length <= 6) {
        const numberTemp = '0'.repeat(6) + numberCharSbn;
        number = numberTemp.slice(-6);
        bankAccountNumber = formatBankAccountNumber(number);
      }
      break;
    case '1':
      bankBranchNumber = bankBranchNumberTemp + '8';
      depositType = '普通';
      const numberTemp = '0'.repeat(_fi_JAPAN_POST_NUMBER_MAX_LENGTH) + numberCharSbn;
      number = numberTemp.slice(-_fi_JAPAN_POST_NUMBER_MAX_LENGTH);
      bankAccountNumber = number.substring(0, _fi_ACCOUNT_NUMBER_LENGTH);
      break;
  }
  if (number && bankBranchNumber && depositType && bankAccountNumber) {
    findBankBranch(
      '9900',
      bankBranchNumber,
      (branchInfo) => {
        if (branchInfo.bank_branch_number) {
          successCallback({
            symbol: symbol,
            number: number,
            bank_number: '9900',
            bank_name: 'ゆうちょ銀行',
            bank_name_kana: 'ﾕｳﾁﾖ',
            bank_branch_number: branchInfo.bank_branch_number,
            bank_branch_name: branchInfo.bank_branch_name,
            bank_branch_name_kana: branchInfo.bank_branch_name_kana,
            deposit_type: depositType,
            bank_account_number: bankAccountNumber,
          });
        } else {
          if (failureCallback)
            failureCallback(
              new _fi_FinancialInstitutionError(
                'ゆうちょ記号からゆうちょ支店情報に変換できませんでした',
                'ajax'
              )
            );
          return;
        }
      },
      (err) => {
        if (failureCallback) {
          if (!(err instanceof _fi_FinancialInstitutionError))
            err = new _fi_FinancialInstitutionError(
              err && err.message ? err.message : 'ゆうちょ記号・番号の変換ができませんでした',
              'ajax'
            );
          failureCallback(err);
        }
        return;
      }
    );
  } else {
    if (failureCallback)
      failureCallback(
        new _fi_FinancialInstitutionError('ゆうちょ記号・番号の変換ができませんでした', 'logic')
      );
    return;
  }
};

/**
 * 口座名義人を全銀手順に準拠した半角カナ（および略語）に変換します。
 * @function
 * @param {string} inputStr - 変換対象の口座名義人（全角・半角・記号・漢字混在可）。
 * @param {boolean} [acronymSw=true] - 法人・営業所・事業名の略語変換を行うか（true:略語化あり/false:略語化なし）。
 * @returns {string} 半角カナ・略語化済みの口座名義人（全銀手順で許可される文字のみ）。
 * @throws {Error} 引数が文字列でない場合、未入力の場合、全銀手順で許可されない文字が含まれる場合。
 * @public
 * @example <caption>通常の変換</caption>
 * convertAccountHolderKana('株式会社山田太郎'); // => 'ｶ)ﾔﾏﾀﾞﾀﾛｳ'
 *
 * @example <caption>略語化なし</caption>
 * convertAccountHolderKana('株式会社山田太郎', false); // => 'ｶﾌﾞｼｷｶﾞｲｼﾔﾔﾏﾀﾞﾀﾛｳ'
 *
 * @example <caption>全銀手順で許可されない文字が含まれる場合</caption>
 * try {
 *   convertAccountHolderKana('山田太郎😊');
 * } catch (e) {
 *   alert(e.message); // => '全銀手順の口座名義人として利用できない文字が含まれています'
 * }
 */
const convertAccountHolderKana = (inputStr, acronymSw = true) => {
  if (typeof inputStr !== 'string')
    throw new _fi_FinancialInstitutionError('口座名義人は文字列である必要があります', 'logic');
  if (inputStr.length === 0)
    throw new _fi_FinancialInstitutionError('口座名義人が未入力です', 'logic');
  const _fi_acronym_replace = (targetStr, list, regexpChar, positionSw) => {
    if (targetStr) {
      const charSearch = targetStr.search(regexpChar);
      if (charSearch !== -1) {
        let parenthesisPosition = 0;
        if (positionSw) {
          if (charSearch === 0) {
            parenthesisPosition = 1;
          } else {
            const charMatch = targetStr.match(regexpChar);
            if (targetStr.length === charSearch + charMatch[0].length) {
              parenthesisPosition = 2;
            } else {
              parenthesisPosition = 3;
            }
          }
        }
        return targetStr.replace(regexpChar, (char) => {
          switch (parenthesisPosition) {
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
        return targetStr;
      }
    }
  };
  const inputSbc = _fi_convert_to_single_byte_characters(inputStr);
  const bankKana = inputSbc.replace(_fi_BANK_KANA_LIST_REG, (c) => _fi_BANK_KANA_LIST[c]);
  let acronym = bankKana;
  if (acronymSw) {
    for (let c = 0; c < 3; c++) {
      let list = {};
      let regexpChar = '';
      let positionSw = true;
      switch (c) {
        case 0:
          list = _fi_CORPORATE_ABBREVIATIONS_LIST;
          regexpChar = _fi_CORPORATE_ABBREVIATIONS_LIST_REG;
          break;
        case 1:
          list = _fi_SALES_OFFICES_LIST;
          regexpChar = _fi_SALES_OFFICES_LIST_REG;
          break;
        case 2:
          list = _fi_BUSINESS_LIST;
          regexpChar = _fi_BUSINESS_LIST_REG;
          positionSw = false;
          break;
      }
      acronym = _fi_acronym_replace(acronym, list, regexpChar, positionSw);
    }
  }
  const acronymRegexp = /^[()\-,./0-9A-Zｦ-ﾟ\s]+$/;
  if (!acronymRegexp.test(acronym)) {
    throw new _fi_FinancialInstitutionError(
      '全銀手順の口座名義人として利用できない文字が含まれています',
      'validation'
    );
  }
  return acronym;
};

/**
 * 振込指定日が有効かどうかを判定する非同期関数（コールバック型）。
 * @function
 * @param {string} designateTransferDate - 振込指定日（ISO形式: 'YYYY-MM-DD' など）。
 * @param {boolean} todaySw - 日付限定スイッチ（true:今日以降14日以内かつ平日・営業日かを判定/false:日付範囲判定なし）。
 * @param {(isValid: boolean) => void} callback - 判定結果（有効:true/無効:false）を返すコールバック関数。
 * @returns {void}
 * @throws {Error} 引数の型が不正な場合。
 * @public
 * @description
 * - todaySw=trueの場合、今日（18時以降は翌日扱い）から14日以内かつ平日・営業日（祝日・年末年始（12/31～1/3）除く）かを判定します。
 * - todaySw=falseの場合は、曜日・祝日・年末年始（12/31～1/3）のみ判定します。
 *
 * @example <caption>通常の利用例</caption>
 * isValidTransferDate('2025-09-15', true, (isValid) => {
 *   if (isValid) {
 *     alert('指定日は有効です');
 *   } else {
 *     alert('指定日は無効です');
 *   }
 * });
 *
 * @example <caption>型不正時の例外</caption>
 * try {
 *   isValidTransferDate(20250915, true, () => {});
 * } catch (e) {
 *   alert(e.message); // => '振込指定日は文字列である必要があります'
 * }
 */
const isValidTransferDate = (designateTransferDate, todaySw = false, callback) => {
  if (typeof designateTransferDate !== 'string')
    throw new _fi_FinancialInstitutionError('振込指定日は文字列である必要があります', 'logic');
  if (typeof todaySw !== 'boolean')
    throw new _fi_FinancialInstitutionError(
      '日付限定スイッチはboolean型である必要があります',
      'logic'
    );
  if (typeof callback !== 'function')
    throw new _fi_FinancialInstitutionError('コールバックは関数である必要があります', 'logic');
  if (designateTransferDate.length === 0) return callback(false);
  let now = new Date();
  let checkFlag = true;
  // ISO日付文字列をDateに変換
  const checkDate = new Date(designateTransferDate);
  if (isNaN(checkDate.getTime())) return callback(false);

  // 今日の判定
  const _fi_process = (skipHolidayCb) => {
    if (todaySw) {
      let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // 18時以降は翌日扱い
      if (now.getHours() >= _fi_CUTOFF_HOUR_FOR_NEXT_DAY) {
        today.setDate(today.getDate() + 1);
      }
      // 祝日をスキップ
      const _fi_skipHoliday = (date, cb) => {
        const ymd = date.toISOString().slice(0, 10);
        _fi_getNationalHolidayName(ymd, (name) => {
          if (name) {
            date.setDate(date.getDate() + 1);
            _fi_skipHoliday(date, cb);
          } else {
            cb(date);
          }
        });
      };
      _fi_skipHoliday(today, (validToday) => {
        // checkDateとtodayの差（日数）
        const diffDays = Math.floor((checkDate - validToday) / (1000 * 60 * 60 * 24));
        if (diffDays < _fi_TRANSFER_DATE_MIN_DAYS || diffDays >= _fi_TRANSFER_DATE_MAX_DAYS) {
          checkFlag = false;
        }
        skipHolidayCb();
      });
    } else {
      skipHolidayCb();
    }
  };

  // 曜日・祝日・年末年始判定
  _fi_process(() => {
    const weekday = checkDate.getDay();
    if (weekday === _fi_SUNDAY || weekday === _fi_SATURDAY) {
      checkFlag = false;
    }
    const ymd = checkDate.toISOString().slice(0, 10);
    _fi_getNationalHolidayName(ymd, (name) => {
      if (name) {
        checkFlag = false;
      }
      // 1/1～1/3は不可
      if (checkDate.getMonth() === _fi_JANUARY && _fi_NEW_YEAR_DAYS.includes(checkDate.getDate())) {
        checkFlag = false;
      }
      // 12/31は不可
      if (checkDate.getMonth() === _fi_DECEMBER && checkDate.getDate() === _fi_NEW_YEAR_EVE) {
        checkFlag = false;
      }
      callback(checkFlag);
    });
  });
};

/**
 * 文字列のバイト数（全銀手順基準）を計算します。
 * @function
 * @param {string} inputStr - バイト数計算対象の文字列（全角・半角・記号・漢字混在可）。
 * @returns {number} バイト数（ASCII・半角カナは1バイト、全角カナ・漢字等は2バイト）。
 * @throws {Error} 引数が文字列でない場合、未入力の場合、全銀手順で許可されない文字が含まれる場合。
 * @public
 * @example <caption>通常の利用例</caption>
 * getByteLength('ﾀﾛｳ'); // => 3
 * getByteLength('タロウ'); // => 6
 * getByteLength('山田太郎'); // => 8
 *
 * @example <caption>全銀手順で許可されない文字が含まれる場合</caption>
 * try {
 *   getByteLength('山田😊');
 * } catch (e) {
 *   alert(e.message); // => '全銀手順で許可されない文字が含まれています'
 * }
 */
const getByteLength = (inputStr) => {
  if (typeof inputStr !== 'string')
    throw new _fi_FinancialInstitutionError(
      'バイト数計算対象の文字列は文字列である必要があります',
      'logic'
    );
  if (inputStr.length === 0)
    throw new _fi_FinancialInstitutionError('バイト数計算対象の文字列が未入力です', 'logic');
  if (!_fi_is_zengin_allowed_chars(inputStr))
    throw new _fi_FinancialInstitutionError(
      '全銀手順で許可されない文字が含まれています',
      'validation'
    );
  let bytes = 0;
  for (let c = 0; c < inputStr.length; c++) {
    const code = inputStr.charCodeAt(c);
    // ASCII・半角カナは1バイト
    if (
      (code >= 0x00 && code <= 0x7f) || // ASCII
      (code >= 0xff61 && code <= 0xff9f) // 半角カナ
    ) {
      bytes += 1;
    } else {
      // それ以外（全角カナ・漢字など）は2バイト
      bytes += 2;
    }
  }
  return bytes;
};

/**
 * 文字列を指定したバイト数で切り取る関数（マルチバイト・全銀手順対応）。
 * @function
 * @param {string} inputStr - 切り取り対象の文字列（全角・半角・記号・漢字混在可）。
 * @param {number} byteLength - 切り取りたいバイト数（1以上の整数）。
 * @returns {string} 指定バイト数で切り取った文字列（バイト数超過部分は切り捨て）。
 * @throws {Error} 引数が不正な場合（文字列でない、未入力、バイト数が1未満など）。
 * @public
 * @example <caption>通常の利用例</caption>
 * sliceByByteLength('山田太郎', 6); // => '山田太'
 * sliceByByteLength('ﾀﾛｳ', 2); // => 'ﾀﾛ'
 * sliceByByteLength('タロウ', 4); // => 'タロ'
 *
 * @example <caption>バイト数が1未満の場合</caption>
 * try {
 *   sliceByByteLength('山田太郎', 0);
 * } catch (e) {
 *   alert(e.message); // => '切り取りバイト数が不正です'
 * }
 */
const sliceByByteLength = (inputStr, byteLength) => {
  if (typeof inputStr !== 'string')
    throw new _fi_FinancialInstitutionError(
      'バイト数で切り取りたい文字列は文字列である必要があります',
      'logic'
    );
  if (typeof byteLength !== 'number')
    throw new _fi_FinancialInstitutionError(
      '切り取りたいバイト数は数値である必要があります',
      'logic'
    );
  if (inputStr.length === 0)
    throw new _fi_FinancialInstitutionError('バイト数で切り取りたい文字列が未入力です', 'logic');
  if (byteLength < 1)
    throw new _fi_FinancialInstitutionError('切り取りバイト数が不正です', 'logic');
  let result = '';
  let length = 0;
  for (let charSlice of inputStr) {
    const charSliceByte = getByteLength(charSlice);
    if (length + charSliceByte > byteLength) break;
    result += charSlice;
    length += charSliceByte;
  }
  return result;
};

// 公開
if (typeof window !== 'undefined') {
  window.convertAccountHolderKana = convertAccountHolderKana;
  window.getByteLength = getByteLength;
  window.sliceByByteLength = sliceByByteLength;
}
