/**
 * bank-transfer.js（銀行振込ユーティリティファイル）
 * 銀行振込ユーティリティ（kintone向け、コールバックスタイル）
 *
 * 公開 API (window.BANK に公開):
 *  - getBank(bankCodeOrName, callback)
 *  - getBranch(bankCode, branchCodeOrName, callback)
 *  - convertYucho(kigou, bangou, callback)
 
 *  - loadBankByCode(bankCode, options?, callback)
 *
 * 注意:
 *  - 全ての公開 API はコールバック（単一引数スタイルをサポート）で返します。
 *  - 本ビルドは Web API による検索のみを行い、グローバルな内部キャッシュは保持しません。
 */
/**
 * JSDoc 型定義（簡潔）
 * 詳細なフィールド定義は `docs/bank-transfer.md` を参照してください。
 *
 * @typedef {object} BankResult
 * @typedef {object} BranchResult
 * @typedef {object} ConvertYuchoResult
 * @typedef {object} ErrorResult
 *
 * @callback BankCallback
 * @param {BankResult|ErrorResult} result
 *
 * @callback BranchCallback
 * @param {BranchResult|ErrorResult} result
 *
 * @callback ConvertYuchoCallback
 * @param {ConvertYuchoResult|ErrorResult} result
 *
 * @callback LoadBankByCodeCallback
 * @param {...*} args
 */

/* ============================================================================
 * 内部: 定数と変換テーブル
 *
 * ルール:
 *  - このセクション内の項目は内部実装の詳細です（外部へは公開しません）。
 *  - 変換マップおよび派生マップはここにまとめ、内部ヘルパで利用します。
 * ============================================================================ */
/** @typedef {object} _BT_CONVERT_CHARACTER_LIST
 *  @property {object} halfWidthKana 全角カタカナ→半角カナマップ
 *  @property {object} fullWidthKana 半角カナ→全角カナマップ
 *  @property {object} turbidityKana 濁点/半濁点マップ
 *  @private
 */
/** @type {_BT_CONVERT_CHARACTER_LIST} */
const _BT_CONVERT_CHARACTER_LIST = {
	halfWidthKana: {
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
		ヲ: 'ｦ',
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
		ヺ: 'ｦﾞ',
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
		'　': ' ',
	},
	fullWidthKana: {
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
		' ': '　',
	},
	turbidityKana: {
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
	},
};
// 全角カタカナから半角カタカナへの変換テーブルから生成するマップ（各種変換処理で利用）
const _BT_HALF_WIDTH_KANA_MAP = new Map(Object.entries(_BT_CONVERT_CHARACTER_LIST.halfWidthKana));
// 半角カタカナから全角カタカナへの変換テーブルから生成するマップ（各種変換処理で利用）
const _BT_FULL_WIDTH_KANA_MAP = new Map(Object.entries(_BT_CONVERT_CHARACTER_LIST.fullWidthKana));
// 濁点・半濁点の変換テーブルから生成するマップ（各種変換処理で利用）
const _BT_TURBIDITY_KANA_MAP = new Map(Object.entries(_BT_CONVERT_CHARACTER_LIST.turbidityKana));
/**
 * 法人略語変換用のリスト
 * 漢字及び半角カナ文字から法人略語への変換をサポートします。
 * @typedef {object} _BT_CORPORATE_ABBREVIATIONS_LIST
 */
/** @type {Object} */
const _BT_CORPORATE_ABBREVIATIONS_LIST = {
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
/**
 * 営業所略語変換用のリスト
 * 漢字及び半角カナ文字から営業所略語への変換をサポートします。
 * @typedef {object} _BT_SALES_OFFICES_LIST
 */
/** @type {Object} */
const _BT_SALES_OFFICES_LIST = {
	営業所: 'ｴｲ',
	ｴｲｷﾞﾖｳｼﾖ: 'ｴｲ',
	ｴｲｷﾞﾖｳｼﾞﾖ: 'ｴｲ',
	出張所: 'ｼﾕﾂ',
	ｼﾕﾂﾁﾖｳｼﾖ: 'ｼﾕﾂ',
	ｼﾕﾂﾁﾖｳｼﾞﾖ: 'ｼﾕﾂ',
};
/**
 * 事業略語変換用のリスト
 * 漢字及び半角カナ文字から事業略語への変換をサポートします。
 * @typedef {object} _BT_BUSINESS_LIST
 */
/** @type {Object} */
const _BT_BUSINESS_LIST = {
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

//　内部: 共通ユーティリティ関数群
/**
 * 内部: 値を文字列化します（null/undefined は空文字に）。
 * @private
 * @param {*} v 任意の値
 * @returns {string}
 */
const _bt_toStr = (v) => (v == null ? '' : String(v));

/**
 * 内部: 安全にログを残すユーティリティ。
 * - ブラウザ環境では window.BANK._bt_debugLogs にも保存し、console.debug が使える場合は出力します。
 * @private
 * @param {*} msg ログメッセージ
 */
const _bt_safeLog = (msg) => {
	try {
		if (typeof window !== 'undefined') {
			window.BANK = window.BANK || {};
			window.BANK._bt_debugLogs = window.BANK._bt_debugLogs || [];
			window.BANK._bt_debugLogs.push(String(msg));
		}
	} catch {}
	try {
		if (typeof console !== 'undefined' && typeof console.debug === 'function') console.debug(msg);
	} catch {}
};

/**
 * 文字列が文字列型であることを確認する関数
 * @param {*} str 確認する文字列
 * @returns {boolean} 文字列である = true、文字でない = false
 */
const _bt_checkString = (str) => {
	return typeof str === 'string';
};

/**
 * boolean型であることを確認する関数
 * @param {*} val 確認する値
 * @returns {boolean} boolean型である = true、そうでない = false
 */
const _bt_checkBoolean = (val) => {
	return typeof val === 'boolean';
};

/**
 * 全角数字（U+FF10-U+FF19）を半角数字に変換するユーティリティ。
 * @private
 * @param {string} [str=''] 入力文字列
 * @returns {string} 半角化された文字列
 */
const _bt_toHalfWidthDigits = (str = '') =>
	_bt_toStr(str).replace(/[\uFF10-\uFF19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

/** 指定文字が銀行振込で許容される半角文字集合に含まれるか判定する（内部ユーティリティ）。 */
/**
 * @private
 * @param {string} ch 単一文字
 * @returns {boolean} 許容される文字であれば true
 */
const _bt_isAllowedHalfWidthChar = (ch) => {
	if (!_bt_checkString(ch) || !ch) return false;
	const cp = ch.codePointAt(0);
	// 除外 ASCII 等（Shift_JIS バイトで 27,2B,3A,3F,5C に対応）
	// 0x27=' , 0x2B='+', 0x3A=':', 0x3F='?', 0x5C='\\'
	const disallowedAscii = new Set([0x27, 0x2b, 0x3a, 0x3f, 0x5c]);
	if (cp <= 0x7f && disallowedAscii.has(cp)) return false;

	// 半角カタカナは原則許容。ただし Shift_JIS の A2/A3 に対応する U+FF62/U+FF63 は除外
	if (cp >= 0xff61 && cp <= 0xff9f) {
		if (cp === 0xff62 || cp === 0xff63) return false; // ｢ ｣ を除外
		return true;
	}

	// 数字
	if (cp >= 0x30 && cp <= 0x39) return true;
	// 英大文字
	if (cp >= 0x41 && cp <= 0x5a) return true;
	// スペース、コンマ、スラッシュ、ハイフン、ピリオド、括弧を許容（'?' や '\\' は除外済）
	if (
		cp === 0x20 ||
		cp === 0x2c ||
		cp === 0x2f ||
		cp === 0x2d ||
		cp === 0x2e ||
		cp === 0x28 ||
		cp === 0x29
	)
		return true;
	return false;
};

/**
 * 文字列がすべて許容半角文字のみで構成されているか判定する
 * @param {string} s 入力文字列
 * @returns {boolean}
 */
const _bt_isAllowedHalfWidthString = (s) => {
	if (!_bt_checkString(s)) return false;
	for (const ch of s) {
		if (!_bt_isAllowedHalfWidthChar(ch)) return false;
	}
	return true;
};

/**
 * Shift_JIS 相当のバイト長を簡易計算するヘルパ
 * - ASCII (U+0000..U+007F) および半角カタカナ (U+FF61..U+FF9F) は 1 バイトとカウント
 * - それ以外（全角カタカナ・ひらがな・漢字・全角英数等）は 2 バイトとカウント
 * 注: 実際の Shift_JIS マッピングはさらに細かいが、振込名義の切り詰め用途での簡易実装です。
 * @param {string} s
 * @returns {number} 推定バイト長
 */
const _bt_sjisByteLength = (s) => {
	if (!_bt_checkString(s) || s.length === 0) return 0;
	let len = 0;
	for (const ch of s) {
		const cp = ch.codePointAt(0);
		if (cp <= 0x7f) {
			len += 1;
		} else if (cp >= 0xff61 && cp <= 0xff9f) {
			// 半角カナ
			len += 1;
		} else {
			// それ以外は全角相当として 2 バイト
			len += 2;
		}
	}
	return len;
};

/**
 * Shift_JIS のバイト長で切り詰める（最大バイト数までの先頭部分を返す）
 * @param {string} s
 * @param {number} maxBytes
 * @returns {string}
 */
const _bt_sjisTruncate = (s, maxBytes) => {
	if (!_bt_checkString(s) || maxBytes <= 0) return '';
	let out = '';
	let used = 0;
	for (const ch of s) {
		const cp = ch.codePointAt(0);
		const add = cp <= 0x7f || (cp >= 0xff61 && cp <= 0xff9f) ? 1 : 2;
		if (used + add > maxBytes) break;
		out += ch;
		used += add;
	}
	return out;
};

/** 内部: _bt_invokeCallback — Node 風 / single-arg 両対応のコールバック互換ヘルパ。 */
/**
 * @private
 * @param {Function} cb コールバック関数
 * @param {*} err エラー情報（構造化オブジェクトまたはプリミティブ）
 * @param {*} res 成功時の結果
 */
const _bt_invokeCallback = (cb, err, res) => {
	try {
		if (typeof cb !== 'function') return;
		if ((cb && typeof cb.length === 'number' && cb.length >= 2) || false) {
			// Node 風
			cb(err || null, res || null);
		} else {
			// single-arg スタイル（成功時はオブジェクト、失敗時は { error: '...' }）
			if (err) {
				// err は { success:false, error: '...' } 形式で来る想定
				// もし err が構造化オブジェクトであればそのまま透過する。文字列などの場合は既存互換でラップする。
				if (typeof err === 'object' && err !== null) {
					// code/field/details を含む構造化エラーオブジェクトはそのまま扱う
					if (err.error || err.message || err.code || err.field || err.details) {
						// 正規化: `error`（識別子）と `message`（人向けメッセージ）の両方が存在するようにする
						try {
							if (!err.message) {
								err.message = err.error ? String(err.error) : '';
							}
							if (!err.error) {
								err.error = err.message ? String(err.message) : '';
							}
						} catch (e) {
							// 正規化中のエラーは無視
						}
						cb(err);
					} else {
						// 不明なオブジェクトは文字列化して error/message に格納する
						try {
							const txt = JSON.stringify(err);
							cb({ error: txt, message: txt });
						} catch (e) {
							const txt = String(err);
							cb({ error: txt, message: txt });
						}
					}
				} else {
					// プリミティブ値（文字列/数値 等）は文字列化して error と message の両方に設定する
					const txt = err && err.message ? err.message : String(err);
					cb({ error: txt, message: txt });
				}
			} else if (res) {
				// res は { success:true, bank } 形式のことが多い -> zip-style の期待に合わせて bank オブジェクトを返す
				if (res && res.bank) cb(res.bank);
				else cb(res);
			} else {
				cb(null);
			}
		}
	} catch (e) {
		try {
			_bt_safeLog('[BANK] _bt_invokeCallback error: ' + (e && e.message ? e.message : e));
		} catch {}
	}
};

/** 内部: _bt_enrichError — エラーオブジェクト/値を SDK で使う構造化エラーに変換します。 */
/**
 * @private
 * @param {*} err 既存のエラー（文字列/オブジェクト等）
 * @param {object} [defaults] デフォルト値（例: { code, field, message, details }）
 * @returns {object} 構造化されたエラーオブジェクト（error, message, code?, field?, details? を含む）
 */
const _bt_enrichError = (err, defaults = {}) => {
	try {
		if (err && typeof err === 'object') {
			// 既に構造化されている場合はそのまま返す
			if (err.code || err.field || err.details) return err;
			// err.error / err.message を保持しつつ構造化オブジェクトを構築する
			const message = err.message || err.error || defaults.message || String(err);
			return Object.assign({ error: err.error || message, message: message }, defaults, {
				// details: 既存の details があればマージする
				details: Object.assign({}, defaults.details || {}, err.details || {}),
			});
		}
		// primitive
		const message = err && err.message ? err.message : err ? String(err) : defaults.message || '';
		return Object.assign({ error: message, message: message }, defaults);
	} catch (e) {
		return Object.assign({ error: String(err || e), message: String(err || e) }, defaults);
	}
};

/**
 * イテラブルな文字列集合から正規表現パターンを構築する関数
 * @param {Iterable<string>} keys イテラブルな文字列集合
 * @returns {RegExp} 正規表現のパターン
 */
const _bt_buildPattern = (keys) => {
	try {
		if (!keys) {
			_bt_safeLog('[BANK] _bt_buildPattern: keys is required');
			return /(?:)/g;
		}
		const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		if (!(keys && typeof keys[Symbol.iterator] === 'function')) {
			_bt_safeLog('[BANK] _bt_buildPattern: keys must be an Iterable');
			return /(?:)/g;
		}
		const escapedKeys = [...keys].map(escapeRegExp);
		return new RegExp(escapedKeys.join('|'), 'g');
	} catch (e) {
		try {
			_bt_safeLog('[BANK] _bt_buildPattern error: ' + (e && e.message ? e.message : e));
		} catch {}
		return /(?:)/g;
	}
};

/**
 * 文字列を全角カタカナに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能な文字があった場合にエラーを投げるかどうか
 * @returns {string} 可能な限り全角カタカナに変換した文字列
 * @throws {Error} 変換不能な文字が含まれている場合（throwOnError=true時）
 */
const _bt_toFullWidthKatakana = (str = '', throwOnError = true) => {
	try {
		if (!_bt_checkString(str)) {
			_bt_safeLog('[BANK] _bt_toFullWidthKatakana: input is not a string');
			return str;
		}
		if (!_bt_checkBoolean(throwOnError)) {
			_bt_safeLog('[BANK] _bt_toFullWidthKatakana: throwOnError is not boolean');
			return str;
		}
		if (!str) {
			_bt_safeLog('[BANK] _bt_toFullWidthKatakana: input string is empty');
			return str;
		}
		const fullWidthKanaPattern = _bt_buildPattern(_BT_FULL_WIDTH_KANA_MAP.keys());
		const turbidityKanaPattern = _bt_buildPattern(_BT_TURBIDITY_KANA_MAP.keys());
		let errorChar = null;
		// ひらがな→全角カタカナ
		let work = str.replace(/[\u3041-\u3096]/g, (char) =>
			String.fromCodePoint(char.charCodeAt(0) + 0x60)
		);
		// 半角カタカナ→全角カタカナ
		work = work.replace(fullWidthKanaPattern, (char) => _BT_FULL_WIDTH_KANA_MAP.get(char) ?? char);
		// 合成濁点・半濁点（カ゛→ガ等）を変換
		work = work.replace(turbidityKanaPattern, (pair) => _BT_TURBIDITY_KANA_MAP.get(pair) ?? pair);
		// 変換後に全角カタカナ以外が含まれていればエラー（ただし変換テーブルの値は許容）
		const allowedValues = Object.values(_BT_CONVERT_CHARACTER_LIST.fullWidthKana);
		for (const char of work) {
			const code = char.charCodeAt(0);
			// allowedValuesに含まれるか、全角カタカナ範囲なら許容
			if (!allowedValues.includes(char) && !(code >= 0x30a1 && code <= 0x30fa)) {
				if (throwOnError) {
					errorChar = char;
					break;
				}
			}
		}
		if (errorChar) {
			_bt_safeLog('[BANK] _bt_toFullWidthKatakana: invalid char ' + errorChar);
			return str;
		}
		return work;
	} catch (e) {
		// DevTools の "pause on exceptions" による停止を避けるため、同期的な throw は
		// キャッチして入力文字列を返す。（副作用が心配な場合は個別に見直し可）
		try {
			if (typeof console !== 'undefined' && typeof console.warn === 'function')
				console.warn(
					'[BANK] _bt_toFullWidthKatakana fallback on error',
					e && e.message ? e.message : e
				);
		} catch {}
		return str;
	}
};

/**
 * 文字列を半角カタカナに変換する関数
 * @param {string} str 変換対象の文字列
 * @param {boolean} [throwOnError=true] 変換不能な文字があった場合にエラーを投げるかどうか
 * @returns {string} 可能な限り半角カタカナに変換した文字列
 * @throws {Error} 変換不能な文字が含まれている場合（throwOnError=true時）
 */
const _bt_toHalfWidthKana = (str = '', throwOnError = true) => {
	try {
		if (!_bt_checkString(str)) {
			_bt_safeLog('[BANK] _bt_toHalfWidthKana: input is not a string');
			return str;
		}
		if (!_bt_checkBoolean(throwOnError)) {
			_bt_safeLog('[BANK] _bt_toHalfWidthKana: throwOnError is not boolean');
			return str;
		}
		if (!str) {
			_bt_safeLog('[BANK] _bt_toHalfWidthKana: input string is empty');
			return str;
		}
		// ひらがな→カタカナ変換を追加
		const katakanaStr = _bt_toFullWidthKatakana(str, false);
		// 全角英数字（例: ＵＦＪ）を半角に変換して英字は大文字化する。
		// これにより、例えば 'ミツビシＵＦＪギンコウ' の 'ＵＦＪ' が 'UFJ' になる。
		let asciiNormalized = katakanaStr.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
			String.fromCharCode(c.charCodeAt(0) - 0xfee0)
		);
		// 英小文字が混じる場合は大文字化（銀行名の表記揺れ防止）
		asciiNormalized = asciiNormalized.replace(/[a-z]/g, (c) => c.toUpperCase());
		const halfWidthKanaPattern = _bt_buildPattern(_BT_HALF_WIDTH_KANA_MAP.keys());
		let errorChar = null;
		let result = asciiNormalized.replace(
			halfWidthKanaPattern,
			(char) => _BT_HALF_WIDTH_KANA_MAP.get(char) ?? char
		);
		// 長音記号や類似文字をすべて半角ハイフンに正規化
		// 対象: 全角カタカナ長音 'ー' (U+30FC), 全角ハイフンマイナス '－' (U+FF0D),
		// 半角長音 'ｰ' と各種ダッシュ類
		result = result.replace(/[ー－ｰ‐−–—―─━]/g, '-');
		// 変換後に半角カタカナ以外が含まれていればエラー（ただし変換テーブルの値は許容）
		const allowedValues = Object.values(_BT_CONVERT_CHARACTER_LIST.halfWidthKana).concat('-');
		for (const char of result) {
			if (!allowedValues.includes(char)) {
				if (throwOnError) {
					errorChar = char;
					break;
				}
			}
		}
		if (errorChar) {
			_bt_safeLog('[BANK] _bt_toHalfWidthKana: invalid char ' + errorChar);
			return str;
		}
		return result;
	} catch (e) {
		try {
			if (typeof console !== 'undefined' && typeof console.warn === 'function')
				console.warn(
					'[BANK] _bt_toHalfWidthKana fallback on error',
					e && e.message ? e.message : e
				);
		} catch {}
		return str;
	}
};

/** 内部: _bt_loadBankByCode — 銀行コードから銀行データを取得する内部ローダー（BankKun 互換）。 */
/**
 * @param {string} bankCode 銀行コード
 * @param {object} [options] オプション（{ apiBaseUrl, apiKey, timeout, pathTemplate } 等）
 * @param {LoadBankByCodeCallback} callback 単一引数または Node 風のシグネチャを受け付けるコールバック
 * @private
 */
const _bt_loadBankByCode = (bankCode, options = {}, callback) => {
	try {
		if (typeof options === 'function') {
			callback = options;
			options = {};
		}
		const {
			apiBaseUrl = 'https://bank.teraren.com',
			apiKey,
			timeout = 5000,
			pathTemplate = '/banks/{code}.json',
		} = options;
		const code = _bt_toStr(bankCode).padStart(4, '0');
		const base = apiBaseUrl.replace(/\/$/, '');
		const path = pathTemplate.replace('{code}', code);
		const url = base + path;
		const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
		_bt_safeLog('[BANK] _bt_loadBankByCode: enter');
		const abortController = (function () {
			try {
				if (typeof console !== 'undefined' && typeof console.debug === 'function')
					console.debug('[BANK] _bt_loadBankByCode: attempting to create AbortController');
				return typeof AbortController !== 'undefined' ? new AbortController() : null;
			} catch (e) {
				try {
					if (typeof console !== 'undefined' && typeof console.warn === 'function')
						console.warn(
							'[BANK] _bt_loadBankByCode: AbortController ctor threw',
							e && e.message ? e.message : e
						);
				} catch {}
				return null;
			}
		})();
		let timer = null;
		try {
			if (abortController && typeof abortController.abort === 'function') {
				if (typeof console !== 'undefined' && typeof console.debug === 'function')
					console.debug('[BANK] _bt_loadBankByCode: scheduling abort timer', timeout);
				_bt_safeLog('[BANK] _bt_loadBankByCode: scheduling abort timer ' + timeout);
				timer = setTimeout(() => {
					try {
						if (typeof console !== 'undefined' && typeof console.warn === 'function')
							console.warn('[BANK] _bt_loadBankByCode: abort timer fired');
						_bt_safeLog('[BANK] _bt_loadBankByCode: abort timer fired');
						abortController.abort();
					} catch (e) {
						try {
							if (typeof console !== 'undefined' && typeof console.warn === 'function')
								console.warn(
									'[BANK] _bt_loadBankByCode: abort failed',
									e && e.message ? e.message : e
								);
						} catch {}
					}
				}, timeout);
			}
		} catch {
			timer = null;
		}

		// fetch に signal を渡すと一部環境で同期的に例外が出ることがあるため、
		// まず signal を渡して試行し、同期例外が出たら signal を除いて再試行する
		const _bt_performFetch = (fetchPromise) => {
			try {
				return fetchPromise
					.then((res) => {
						if (!res.ok) {
							return Promise.reject(
								new Error(`銀行情報の取得に失敗しました（HTTPステータス: ${res.status}）`)
							);
						}
						return res.json();
					})
					.then((j) => {
						let bankObj = {
							code: _bt_toStr(j.code).padStart(4, '0'),
							name: _bt_toStr(j.normalize && j.normalize.name ? j.normalize.name : j.name),
							// Use the API's `kana` field only; do NOT fall back to normalize.kana
							kana: _bt_toStr(j.kana || ''),
							url: _bt_toStr(j.url || url),
							branches_url: _bt_toStr(j.branches_url || base + `/banks/${code}/branches.json`),
						};
						// API からの kana を可能な限り半角カナ化＋全角英数字は半角化して大文字化
						try {
							bankObj.kana = _bt_toHalfWidthKana(bankObj.kana, false);
						} catch {}
						try {
							_bt_safeLog('[BANK] _bt_loadBankByCode: fetch success ' + bankObj.code);
						} catch {}
						// キャッシュを保持しないため、受け取ったオブジェクトをそのまま返す
						if (typeof callback === 'function') callback(bankObj);
					})
					.catch((err) => {
						let message = null;
						try {
							if (err && err.name === 'AbortError') {
								message = '取得がタイムアウトしました（指定時間内に応答がありません）';
							} else if (err && err.message) {
								// ブラウザの fetch が失敗すると 'Failed to fetch' や TypeError になることがある
								var m = String(err.message || err);
								if (/failed to fetch/i.test(m) || /network/i.test(m) || err instanceof TypeError) {
									message =
										'銀行情報の取得に失敗しました。ネットワークまたは外部サービスの問題が考えられます。接続を確認してください。';
								} else {
									message = m;
								}
							} else {
								message = '銀行情報の取得中に不明なエラーが発生しました';
							}
						} catch {
							message = '銀行情報の取得中にエラーが発生しました';
						}
						let e = { error: message };
						if (typeof callback === 'function') callback(e);
					})
					.finally(() => {
						if (timer) clearTimeout(timer);
					});
			} catch (syncErr) {
				// 同期例外が発生した場合はコールバックで返す
				let se = { error: syncErr && syncErr.message ? syncErr.message : String(syncErr) };
				if (typeof callback === 'function') callback(se);
			}
		};

		try {
			// signal を渡して試行
			try {
				if (typeof console !== 'undefined' && typeof console.debug === 'function')
					console.debug('[BANK] _bt_loadBankByCode: attempting fetch with signal', url);
			} catch {}
			_bt_safeLog('[BANK] _bt_loadBankByCode: attempting fetch with signal ' + url);
			_bt_performFetch(
				fetch(url, { headers, signal: abortController ? abortController.signal : undefined })
			);
		} catch (e) {
			// 一部環境では fetch に signal を渡すと同期例外が発生することがあるため、
			// signal を除いて再試行する
			try {
				try {
					if (typeof console !== 'undefined' && typeof console.warn === 'function')
						console.warn(
							'[BANK] _bt_loadBankByCode: fetch with signal threw sync exception, retrying without signal',
							e && e.message ? e.message : e
						);
				} catch {}
				_bt_safeLog(
					'[BANK] _bt_loadBankByCode: fetch with signal threw sync exception, retrying without signal ' +
						(e && e.message ? e.message : e)
				);
				if (typeof console !== 'undefined' && typeof console.debug === 'function')
					console.debug('[BANK] _bt_loadBankByCode: attempting fetch without signal', url);
				_bt_safeLog('[BANK] _bt_loadBankByCode: attempting fetch without signal ' + url);
				_bt_performFetch(fetch(url, { headers }));
			} catch (e2) {
				// 最悪同期的に fetch が失敗する場合はエラーハンドリングへ送る
				try {
					if (typeof console !== 'undefined' && typeof console.error === 'function')
						console.error(
							'[BANK] _bt_loadBankByCode: fetch without signal also threw',
							e2 && e2.message ? e2.message : e2
						);
				} catch {}
				_bt_safeLog(
					'[BANK] _bt_loadBankByCode: fetch without signal also threw ' +
						(e2 && e2.message ? e2.message : e2)
				);
				const err = { success: false, error: e2 && e2.message ? e2.message : String(e2) };
				if (typeof callback === 'function') callback(err, null);
				if (timer) clearTimeout(timer);
			}
		}
	} catch (topErr) {
		try {
			if (typeof console !== 'undefined' && typeof console.error === 'function')
				console.error(
					'[BANK] _bt_loadBankByCode: top-level sync error',
					topErr && topErr.message ? topErr.message : topErr
				);
		} catch {}
		if (typeof callback === 'function')
			callback(
				{ success: false, error: topErr && topErr.message ? topErr.message : String(topErr) },
				null
			);
	}
};

/**
 * 内部: 銀行名による検索（BankKun 検索 API を利用）
 * @param {string} name 検索語
 * @param {object} [options]
 * @param {function} callback 単一引数または Node 風のコールバック
 * @private
 */
const _bt_searchBankByName = (name, options = {}, callback) => {
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}
	const { apiBaseUrl = 'https://bank.teraren.com', apiKey, timeout = 5000 } = options;
	const q = _bt_toStr(name).trim();
	if (!q) {
		if (typeof callback === 'function') callback({ success: false, error: '検索語が空です' }, null);
		return;
	}
	const base = apiBaseUrl.replace(/\/$/, '');
	const url = base + '/banks/search.json?name=' + encodeURIComponent(q);
	const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
	const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
	let timer = null;
	if (abortController) timer = setTimeout(() => abortController.abort(), timeout);

	fetch(url, { headers, signal: abortController ? abortController.signal : undefined })
		.then((res) => {
			if (!res.ok)
				return Promise.reject(
					new Error(`銀行名検索の実行に失敗しました（HTTPステータス: ${res.status}）`)
				);
			return res.json();
		})
		.then((arr) => {
			if (!Array.isArray(arr)) return Promise.reject(new Error('検索結果の形式が不正です'));
			if (arr.length === 0) {
				if (typeof callback === 'function')
					callback({ success: false, error: '該当する銀行が見つかりませんでした' }, null);
				return;
			}
			// 単一結果はそのまま採用
			if (arr.length === 1) {
				const j = arr[0];
				const bankObj = {
					code: _bt_toStr(j.code).padStart(4, '0'),
					name: _bt_toStr(j.normalize && j.normalize.name ? j.normalize.name : j.name),
					// Use j.kana only; do not use normalize.kana as a fallback
					kana: _bt_toStr(j.kana || ''),
					url: _bt_toStr(j.url || url),
					branches_url: _bt_toStr(
						j.branches_url || base + `/banks/${_bt_toStr(j.code).padStart(4, '0')}/branches.json`
					),
				};
				try {
					bankObj.kana = _bt_toHalfWidthKana(bankObj.kana, false);
				} catch {}
				try {
					_bt_safeLog('[BANK] _bt_searchBankByName: success ' + bankObj.code);
				} catch {}
				if (typeof callback === 'function') callback(null, { success: true, bank: bankObj });
				return;
			}
			// 複数件: 完全一致を探す（normalize.name / name の両方をチェック）
			const exact = arr.filter((j) => {
				const n1 = _bt_toStr(j.normalize && j.normalize.name ? j.normalize.name : j.name).trim();
				const n2 = _bt_toStr(j.name).trim();
				return n1 === q || n2 === q;
			});
			if (exact.length === 1) {
				const j = exact[0];
				const bankObj = {
					code: _bt_toStr(j.code).padStart(4, '0'),
					name: _bt_toStr(j.normalize && j.normalize.name ? j.normalize.name : j.name),
					kana: _bt_toStr(j.kana || ''),
					url: _bt_toStr(j.url || url),
					branches_url: _bt_toStr(
						j.branches_url || base + `/banks/${_bt_toStr(j.code).padStart(4, '0')}/branches.json`
					),
				};
				try {
					bankObj.kana = _bt_toHalfWidthKana(bankObj.kana, false);
				} catch {}
				if (typeof callback === 'function') callback(null, { success: true, bank: bankObj });
				return;
			}
			if (exact.length > 1) {
				if (typeof callback === 'function')
					callback(
						{
							success: false,
							error: '検索結果が複数あります（完全一致の候補が複数見つかりました）',
						},
						null
					);
				return;
			}
			// 完全一致なし -> エラーとする（仕様）
			if (typeof callback === 'function')
				callback(
					{ success: false, error: '検索結果が複数あります（完全一致する銀行名が見つかりません）' },
					null
				);
		})
		.catch((err) => {
			let message = null;
			try {
				if (err && err.name === 'AbortError')
					message = '検索がタイムアウトしました（指定時間内に応答がありません）';
				else if (err && err.message) {
					const m = String(err.message || err);
					if (/failed to fetch/i.test(m) || /network/i.test(m) || err instanceof TypeError) {
						message =
							'銀行名検索に失敗しました。ネットワークまたは外部サービスの問題が考えられます。接続を確認してください。';
					} else {
						message = m;
					}
				} else message = '銀行名検索中に不明なエラーが発生しました';
			} catch {
				message = '銀行名検索中にエラーが発生しました';
			}
			const e = { success: false, error: message };
			if (typeof callback === 'function') callback(e, null);
		})
		.finally(() => {
			if (timer) clearTimeout(timer);
		});
};

/**
 * Internal: ゆうちょ記号から支店コードと口座種別を決定するルール
 * 成功時は { branchCode, accountType }、失敗時は { error, message } を返す
 * @param {string|number} kigouRaw ゆうちょ記号（任意の形式）
 * @returns {{branchCode:string,accountType:string}|{error:string,message:string}}
 */
const _bt_yuchoKigouToBranch = (kigouRaw) => {
	// 正規化: 全角数字を半角に直し、数字以外を除去
	const kigou = _bt_toHalfWidthDigits(_bt_toStr(kigouRaw)).replace(/[^0-9]/g, '');
	// 前提: 記号は必ず5桁でなければならない（それ以外は処理不能）
	if (!/^[0-9]{5}$/.test(kigou))
		return {
			error: 'invalid_format',
			code: 'kigou.not_5_digits',
			field: 'kigou',
			message: '記号は5桁の数字である必要があります',
			details: { raw: _bt_toStr(kigouRaw), normalized: kigou },
		};

	// 先頭桁ルール: 1桁目は 0 または 1 のみ許可
	if (!/^[01]/.test(kigou.charAt(0)))
		return {
			error: 'invalid_format',
			code: 'kigou.invalid_lead',
			field: 'kigou',
			message: '記号の先頭桁は0または1である必要があります',
			details: { raw: _bt_toStr(kigouRaw), normalized: kigou },
		};

	// ルール専用: ユーザー指定の単一ルールのみを適用します。
	// - 1桁目が 0 の場合: 支店コード = (2桁目)(3桁目) + '9'
	// - 1桁目が 1 の場合: 支店コード = (2桁目)(3桁目) + '8'
	// accountType は先頭桁をそのまま返します（後続の番号変換で利用するため）
	const fd = kigou.charAt(0);
	const accountType = String(fd);
	const d2 = kigou.charAt(1);
	const d3 = kigou.charAt(2);
	// 先頭桁チェックは既に関数冒頭で行っているためここでは想定通り 0/1 のどちらか
	const suffix = fd === '0' ? '9' : '8';
	const branchCode = String((d2 || '0') + (d3 || '0') + suffix).padStart(3, '0');
	return { branchCode: branchCode, accountType: accountType };
};

/** 内部: _bt_generateDataRecordStrings — 整形済みデータレコード配列を全銀120バイトレコード文字列に変換する内部ユーティリティ。 */
/**
 * @private
 * @param {Array<object>} dataRecords 整形済みレコード配列
 * @param {function(result)} callback single-arg スタイルのコールバック（成功: { success:true, records: string[], skipped: Array<{index:number, reason:string}> }）
 */
const _bt_generateDataRecordStrings = (dataRecords, callback) => {
	if (typeof callback !== 'function')
		return { success: false, error: '第二引数はコールバック関数である必要があります' };
	if (!Array.isArray(dataRecords)) {
		_bt_invokeCallback(callback, { error: 'dataRecords は配列である必要があります' }, null);
		return;
	}
	const out = [];
	const skipped = [];

	for (let i = 0; i < dataRecords.length; i++) {
		const r = dataRecords[i] || {};
		try {
			// data type
			const dataType = '2'; // 1 byte

			// 被仕向銀行番号 (4 bytes)
			const toBankNo = _bt_toStr(r.toBankNo || '')
				.replace(/[^0-9]/g, '')
				.padStart(4, '0');
			if (!/^[0-9]{4}$/.test(toBankNo)) {
				_bt_invokeCallback(callback, { error: '被仕向銀行番号が不正', index: i }, null);
				return;
			}

			// 被仕向銀行名 (15 bytes)
			let toBankName = _bt_toStr(r.toBankKana || r.toBankName || '');
			try {
				toBankName = _bt_toHalfWidthKana(toBankName, false);
			} catch (e) {}
			let toBankNameTrunc = _bt_sjisTruncate(toBankName, 15);
			let toBankNameBytes = _bt_sjisByteLength(toBankNameTrunc);
			if (toBankNameBytes < 15)
				toBankNameTrunc = toBankNameTrunc + ' '.repeat(15 - toBankNameBytes);

			// 被仕向支店番号 (3 bytes)
			const toBranchNo = _bt_toStr(r.toBranchNo || '')
				.replace(/[^0-9]/g, '')
				.padStart(3, '0');
			const originBankNo = _bt_toStr(r.originBankNo || '');
			if (!(originBankNo === '9900' && toBankNo === '9900')) {
				if (!/^[0-9]{3}$/.test(toBranchNo)) {
					_bt_invokeCallback(callback, { error: '被仕向支店番号が不正', index: i }, null);
					return;
				}
			}

			// 被仕向支店名 (15 bytes) — yucho-yucho の場合は空白15バイト
			let toBranchNameTrunc = '';
			if (originBankNo === '9900' && toBankNo === '9900') {
				toBranchNameTrunc = ' '.repeat(15);
			} else {
				let toBranchName = _bt_toStr(r.toBranchKana || r.toBranchName || '');
				try {
					toBranchName = _bt_toHalfWidthKana(toBranchName, false);
				} catch (e) {}
				toBranchNameTrunc = _bt_sjisTruncate(toBranchName, 15);
				let toBranchBytes = _bt_sjisByteLength(toBranchNameTrunc);
				if (toBranchBytes < 15)
					toBranchNameTrunc = toBranchNameTrunc + ' '.repeat(15 - toBranchBytes);
			}

			// 手形交換所番号 (4 bytes) — スペース
			const clearing = ' '.repeat(4);

			// 預金種目 (1 byte)
			const dep = _bt_toStr(r.depositType || '9').charAt(0) || '9';

			// 口座番号 (7 bytes)
			const acct = _bt_toStr(r.accountNumber || '')
				.replace(/[^0-9]/g, '')
				.padStart(7, '0');
			if (_bt_sjisByteLength(acct) > 7) {
				_bt_invokeCallback(callback, { error: '口座番号が長すぎる', index: i }, null);
				return;
			}

			// 受取人名 (30 bytes)
			let cust = _bt_toStr(r.customerName || '');
			try {
				cust = _bt_toHalfWidthKana(cust, false);
			} catch (e) {}
			let custTrunc = _bt_sjisTruncate(cust, 30);
			let custBytes = _bt_sjisByteLength(custTrunc);
			if (custBytes < 30) custTrunc = custTrunc + ' '.repeat(30 - custBytes);

			// 振込金額 (10 bytes) — 数値、小数は想定外。
			const amtNum = Number(r.amount || 0);
			if (!Number.isFinite(amtNum) || amtNum < 0) {
				_bt_invokeCallback(callback, { error: '金額が不正', index: i }, null);
				return;
			}
			const amtStr = String(Math.round(amtNum));
			if (amtStr.length > 10) {
				_bt_invokeCallback(callback, { error: '振込金額が10桁を超える', index: i }, null);
				return;
			}
			const amtField = amtStr.padStart(10, '0');

			// 新規コード (1 byte)
			const newCode = '1';

			// EDI情報 (20 bytes) — normalize via public helper so kintone と整合する
			let ediTrunc;
			try {
				// normalizeEdiInfo returns padded string when padToBytes=true
				ediTrunc = normalizeEdiInfo(r.ediInfo || '', { padToBytes: true, bytes: 20 });
			} catch (e) {
				// fallback to raw handling
				let edi = _bt_toStr(r.ediInfo || '');
				try {
					edi = _bt_toHalfWidthKana(edi, false);
				} catch (e) {}
				ediTrunc = _bt_sjisTruncate(edi, 20);
				const ediBytes = _bt_sjisByteLength(ediTrunc);
				if (ediBytes < 20) ediTrunc = ediTrunc + ' '.repeat(20 - ediBytes);
			}

			// 振込指定区分 (1 byte)
			const specify = '7';

			// 識別表示 (1 byte)
			const ident = 'Y';

			// ダミー (7 bytes)
			const dummy = ' '.repeat(7);

			const parts = [
				dataType,
				toBankNo,
				toBankNameTrunc,
				toBranchNo,
				toBranchNameTrunc,
				clearing,
				dep,
				acct,
				custTrunc,
				amtField,
				newCode,
				ediTrunc,
				specify,
				ident,
				dummy,
			];

			const line = parts.join('');
			const totalBytes = _bt_sjisByteLength(line);
			if (totalBytes !== 120) {
				_bt_invokeCallback(
					callback,
					{ error: `生成バイト長が120ではない（${totalBytes}）`, index: i },
					null
				);
				return;
			}
			out.push(line);
		} catch (e) {
			_bt_invokeCallback(
				callback,
				{ error: '例外: ' + (e && e.message ? e.message : String(e)), index: i },
				null
			);
			return;
		}
	}

	// join records into a single string with CRLF between records for compatibility
	const joined = out.join('\r\n');
	_bt_invokeCallback(callback, null, { success: true, records: joined });
};

/** 内部: _bt_generateTrailerString — トレーラ情報を全銀フォーマットの固定長文字列に変換します（内部ユーティリティ）。 */
/**
 * @private
 * @param {object} trailerObj { recordCount: number, totalAmount: number }
 * @returns {string} 120-byte trailer record string
 * @throws {Error} 不正な入力やオーバーフロー時に投げられます
 */
const _bt_generateTrailerString = (trailerObj) => {
	if (!trailerObj || typeof trailerObj !== 'object') {
		throw new Error('trailerObj はオブジェクトである必要があります');
	}
	const recordCount = Number(
		trailerObj.recordCount == null ? trailerObj.count : trailerObj.recordCount
	);
	const totalAmount = Number(
		trailerObj.totalAmount == null ? trailerObj.total : trailerObj.totalAmount
	);
	if (!Number.isFinite(recordCount) || recordCount < 0) {
		throw new Error('不正な件数です');
	}
	if (!Number.isFinite(totalAmount) || totalAmount < 0) {
		throw new Error('不正な合計金額です');
	}
	// check overflow
	if (recordCount > 999999) {
		throw new Error('合計件数が6バイトを超えています');
	}
	const totalAmountRounded = Math.round(totalAmount);
	if (totalAmountRounded > 999999999999) {
		throw new Error('合計金額が12バイトを超えています');
	}

	const dataType = '8';
	const countField = String(recordCount).padStart(6, '0');
	const amtField = String(totalAmountRounded).padStart(12, '0');
	const dummy = ' '.repeat(101);
	const line = dataType + countField + amtField + dummy;
	// validate length (SJIS equivalent)
	if (typeof _bt_sjisByteLength === 'function') {
		const b = _bt_sjisByteLength(line);
		if (b !== 120) {
			throw new Error(`生成したトレーラのバイト長が120ではありません: ${b}`);
		}
	} else if (line.length !== 120) {
		throw new Error(`生成したトレーラの長さが120ではありません: ${line.length}`);
	}
	return line;
};

/**
 * 内部: _bt_generateEndRecordString
 *
 * 概要:
 *  エンドレコード（データ区分 '9' + 119バイトのスペース）を生成して返します。
 *
 * @private
 * @returns {string} 120-byte end record string
 * @throws {Error} 生成に失敗した場合
 */
const _bt_generateEndRecordString = () => {
	const dataType = '9';
	const dummy = ' '.repeat(119);
	const line = dataType + dummy;
	if (typeof _bt_sjisByteLength === 'function') {
		const b = _bt_sjisByteLength(line);
		if (b !== 120) throw new Error(`生成したエンドレコードのバイト長が120ではありません: ${b}`);
	} else if (line.length !== 120) {
		throw new Error(`生成したエンドレコードの長さが120ではありません: ${line.length}`);
	}
	return line;
};

/* ============================================================================
 * 公開 API (エクスポート)
 *
 * ルール:
 *  - 公開関数は依存する内部ヘルパの後に宣言してください。
 *  - 公開シンボルはこのファイルの末尾で `window.BANK` にアタッチしてください。
 * ============================================================================ */
/** 公開: getBank — 銀行コード/銀行名で検索し結果をコールバックで返します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {string} bankCodeOrName 銀行コードまたは銀行名
 * @param {BankCallback} callback single-arg スタイルのコールバック
 */
const getBank = (bankCodeOrName, callback) => {
	// 全角数字を半角化してからトリム（例: '１２３４' -> '1234'）
	const s = _bt_toHalfWidthDigits(_bt_toStr(bankCodeOrName)).trim();
	if (typeof callback !== 'function') {
		// 既存と同じくコールバック必須で早期返却（エラーオブジェクトを返す）
		return { success: false, error: '第二引数はコールバック関数である必要があります' };
	}
	if (!s) {
		// single-arg スタイルでエラーを返す
		_bt_invokeCallback(callback, { error: '検索語が空です' }, null);
		return;
	}

	// 内部で一貫した出力を返すヘルパ
	const _emitBank = (cb, err, bank) => {
		if (err) {
			_bt_invokeCallback(cb, err, null);
			return;
		}
		if (!bank) {
			_bt_invokeCallback(cb, { error: '銀行情報の取得結果が空です' }, null);
			return;
		}
		// bank が { success:true, bank } の形で渡される可能性があるため対応
		const b = bank && bank.bank ? bank.bank : bank;
		let kanaOut = _bt_toStr(b.kana);
		try {
			kanaOut = _bt_toHalfWidthKana(kanaOut, false);
		} catch {}
		_bt_invokeCallback(cb, null, { bankCode: b.code, bankName: b.name, bankKana: kanaOut });
	};

	const digitsOnly = /^[0-9]+$/.test(s);

	if (digitsOnly && s.length <= 4) {
		const key = s.padStart(4, '0');
		_bt_loadBankByCode(key, {}, function (/* flexible args from loader */) {
			// single-arg スタイル
			if (arguments.length === 1) {
				const out = arguments[0];
				if (!out) {
					_emitBank(callback, { error: '銀行情報の取得結果が空です' }, null);
					return;
				}
				if (out && out.error) {
					_emitBank(callback, out, null);
					return;
				}
				const b = out && out.bank ? out.bank : out;
				_emitBank(callback, null, b);
				return;
			}
			// node-style (err, res)
			const err = arguments[0];
			const res = arguments[1];
			if (err) {
				_emitBank(
					callback,
					{ error: err && err.error ? err.error : err && err.message ? err.message : String(err) },
					null
				);
				return;
			}
			if (!res) {
				_emitBank(callback, { error: '銀行情報の取得結果が空です' }, null);
				return;
			}
			if (res && res.success === false) {
				_emitBank(
					callback,
					{
						error:
							res.error ||
							'銀行情報の取得に失敗しました。ネットワークまたは外部サービスの問題が考えられます。接続を確認してください。',
					},
					null
				);
				return;
			}
			if (!res.bank) {
				_emitBank(callback, { error: '銀行データがレスポンスに含まれていません' }, null);
				return;
			}
			_emitBank(callback, null, res.bank);
			return;
		});
		return;
	}

	// 名前検索（非同期）
	_bt_searchBankByName(s, {}, function (/* flexible args from search */) {
		if (arguments.length === 1) {
			const out = arguments[0];
			if (!out) {
				_emitBank(callback, { error: '検索結果が空です' }, null);
				return;
			}
			if (out && out.error) {
				_emitBank(callback, out, null);
				return;
			}
			const b = out && out.bank ? out.bank : out;
			_emitBank(callback, null, b);
			return;
		}
		const err = arguments[0];
		const res = arguments[1];
		if (err) {
			_emitBank(
				callback,
				{ error: err && err.error ? err.error : err && err.message ? err.message : String(err) },
				null
			);
			return;
		}
		if (!res || res.success === false) {
			_emitBank(
				callback,
				{
					error:
						(res && res.error) ||
						'銀行名検索に失敗しました。ネットワークまたは外部サービスの問題が考えられます。接続を確認してください。',
				},
				null
			);
			return;
		}
		_emitBank(callback, null, res.bank);
		return;
	});
	return;
};

/** 公開: getBranch — 支店コード/支店名で検索し結果をコールバックで返します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {string} bankCode 銀行コード
 * @param {string} branchCodeOrName 支店コードまたは支店名
 * @param {BranchCallback} callback single-arg スタイルのコールバック
 */
const getBranch = (bankCode, branchCodeOrName, callback) => {
	if (typeof callback !== 'function') {
		return { success: false, error: '第三引数はコールバック関数である必要があります' };
	}
	// 全角数字を半角化してから処理
	const bCodeRaw = _bt_toHalfWidthDigits(_bt_toStr(bankCode)).trim();
	if (!bCodeRaw) {
		_bt_invokeCallback(callback, { error: '銀行コードが空です' }, null);
		return;
	}
	const bankKey = bCodeRaw.padStart(4, '0');

	// 全角数字を半角化してから処理
	const qRaw = _bt_toHalfWidthDigits(_bt_toStr(branchCodeOrName)).trim();
	if (!qRaw) {
		_bt_invokeCallback(callback, { error: '検索語が空です' }, null);
		return;
	}

	const apiBase = 'https://bank.teraren.com';

	// 支店コード検索: /banks/{bank_code}/branches/{branch_code}.json
	if (/^[0-9]+$/.test(qRaw)) {
		const branchCode = qRaw.padStart(3, '0');
		const url = apiBase.replace(/\/$/, '') + `/banks/${bankKey}/branches/${branchCode}.json`;
		const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
		let timer = null;
		if (abortController) timer = setTimeout(() => abortController.abort(), 5000);
		const perform = () =>
			fetch(url, { signal: abortController ? abortController.signal : undefined })
				.then((res) => {
					if (!res.ok)
						return Promise.reject(new Error(`支店情報の取得に失敗しました（HTTP: ${res.status}）`));
					return res.json();
				})
				.then((j) => {
					if (!j) {
						_bt_invokeCallback(callback, { error: '支店情報が空です' }, null);
						return;
					}
					let kanaOut = _bt_toStr(j.kana);
					try {
						kanaOut = _bt_toHalfWidthKana(kanaOut, false);
					} catch {}
					const out = {
						branchCode: _bt_toStr(j.code).padStart(3, '0'),
						branchName: _bt_toStr(j.name),
						branchKana: kanaOut,
					};
					_bt_invokeCallback(callback, null, out);
				})
				.catch((err) => {
					let message = null;
					try {
						if (err && err.name === 'AbortError')
							message = '取得がタイムアウトしました（指定時間内に応答がありません）';
						else if (err && err.message) {
							const m = String(err.message || err);
							if (/failed to fetch/i.test(m) || /network/i.test(m) || err instanceof TypeError) {
								message =
									'支店データの取得に失敗しました。ネットワークまたは外部サービスの問題が考えられます。接続を確認してください。';
							} else {
								message = m;
							}
						} else message = '支店データ取得中に不明なエラーが発生しました';
					} catch {
						message = '支店データ取得中にエラーが発生しました';
					}
					_bt_invokeCallback(callback, { error: message }, null);
				})
				.finally(() => {
					if (timer) clearTimeout(timer);
				});
		try {
			perform();
		} catch (e) {
			_bt_invokeCallback(callback, { error: '支店データ取得中にエラーが発生しました' }, null);
		}
		return;
	}

	// 支店名検索: /banks/{bank_code}/branches/search.json?name={branch_name}
	const url =
		apiBase.replace(/\/$/, '') +
		`/banks/${bankKey}/branches/search.json?name=` +
		encodeURIComponent(qRaw);
	const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
	let timer = null;
	if (abortController) timer = setTimeout(() => abortController.abort(), 5000);
	try {
		fetch(url, { signal: abortController ? abortController.signal : undefined })
			.then((res) => {
				if (!res.ok)
					return Promise.reject(new Error(`支店検索の実行に失敗しました（HTTP: ${res.status}）`));
				return res.json();
			})
			.then((arr) => {
				if (!Array.isArray(arr)) {
					_bt_invokeCallback(callback, { error: '支店検索のレスポンス形式が不正です' }, null);
					return;
				}
				if (arr.length === 0) {
					_bt_invokeCallback(callback, { error: '該当する支店が見つかりませんでした' }, null);
					return;
				}
				if (arr.length === 1) {
					const j = arr[0];
					let kanaOut = _bt_toStr(j.kana);
					try {
						kanaOut = _bt_toHalfWidthKana(kanaOut, false);
					} catch {}
					const out = {
						branchCode: _bt_toStr(j.code).padStart(3, '0'),
						branchName: _bt_toStr(j.name),
						branchKana: kanaOut,
					};
					_bt_invokeCallback(callback, null, out);
					return;
				}
				// 複数件: 完全一致を探す（name / normalize.name をチェック）
				const exact = arr.filter((j) => {
					const n1 = _bt_toStr(j.normalize && j.normalize.name ? j.normalize.name : '').trim();
					const n2 = _bt_toStr(j.name).trim();
					return n1 === qRaw || n2 === qRaw;
				});
				if (exact.length === 1) {
					const j = exact[0];
					let kanaOut = _bt_toStr(j.kana);
					try {
						kanaOut = _bt_toHalfWidthKana(kanaOut, false);
					} catch {}
					const out = {
						branchCode: _bt_toStr(j.code).padStart(3, '0'),
						branchName: _bt_toStr(j.name),
						branchKana: kanaOut,
					};
					_bt_invokeCallback(callback, null, out);
					return;
				}
				if (exact.length > 1) {
					_bt_invokeCallback(
						callback,
						{ error: '検索結果が複数あります（完全一致の候補が複数見つかりました）' },
						null
					);
					return;
				}
				// 完全一致なし -> 特定不可
				_bt_invokeCallback(callback, { error: '支店が特定できません（候補が複数あります）' }, null);
			})
			.catch((err) => {
				let message = null;
				try {
					if (err && err.name === 'AbortError')
						message = '検索がタイムアウトしました（指定時間内に応答がありません）';
					else if (err && err.message) {
						const m = String(err.message || err);
						if (/failed to fetch/i.test(m) || /network/i.test(m) || err instanceof TypeError) {
							message =
								'支店検索に失敗しました。ネットワークまたは外部サービスの問題が考えられます。接続を確認してください。';
						} else {
							message = m;
						}
					} else message = '支店検索中に不明なエラーが発生しました';
				} catch {
					message = '支店検索中にエラーが発生しました';
				}
				_bt_invokeCallback(callback, { error: message }, null);
			})
			.finally(() => {
				if (timer) clearTimeout(timer);
			});
	} catch (e) {
		_bt_invokeCallback(callback, { error: '支店検索中に例外が発生しました' }, null);
	}
	return;
};

/** 公開: convertYucho — ゆうちょ記号/番号を全銀向け口座情報に正規化してコールバックで返します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {string|number} kigou ゆうちょ記号
 * @param {string|number} bangou ゆうちょ番号
 * @param {ConvertYuchoCallback} callback single-arg スタイルのコールバック
 */
const convertYucho = (kigou, bangou, callback) => {
	// callback 必須の非同期 API に変更
	if (typeof callback !== 'function') {
		return { success: false, error: '第三引数はコールバック関数である必要があります' };
	}

	// 全角数字を半角に直してから数字以外を除去
	const k = _bt_toHalfWidthDigits(_bt_toStr(kigou)).replace(/[^0-9]/g, '');
	const b = _bt_toHalfWidthDigits(_bt_toStr(bangou)).replace(/[^0-9]/g, '');
	// 明確にどちらが不正か判別できるように field を付与して返す
	const missingK = k.length < 1;
	const missingB = b.length < 1;
	if (missingK || missingB) {
		const fld = missingK && missingB ? 'both' : missingK ? 'kigou' : 'bangou';
		const code =
			missingK && missingB ? 'kigou_and_bangou.empty' : missingK ? 'kigou.empty' : 'bangou.empty';
		_bt_invokeCallback(
			callback,
			_bt_enrichError(null, {
				error: 'invalid_format',
				code: code,
				field: fld,
				message: '記号/番号の形式が不正です',
				details: { rawKigou: _bt_toStr(kigou), rawBangou: _bt_toStr(bangou) },
			}),
			null
		);
		return;
	}

	// ベースとなる簡易変換結果
	const bankCode = '9900';

	// 必ず getBank を呼んで銀行情報を取得し、その結果に基づいて支店検索を行う
	try {
		// Prefer any test runtime stubs attached to window.BANK, like other helpers do.
		const _callGetBank = (code, cb) => {
			try {
				if (
					typeof window !== 'undefined' &&
					window.BANK &&
					typeof window.BANK.getBank === 'function'
				)
					return window.BANK.getBank(code, cb);
			} catch (e) {}
			return getBank(code, cb);
		};
		const _callGetBranch = (bankCodeVal, branchVal, cb) => {
			try {
				if (
					typeof window !== 'undefined' &&
					window.BANK &&
					typeof window.BANK.getBranch === 'function'
				)
					return window.BANK.getBranch(bankCodeVal, branchVal, cb);
			} catch (e) {}
			return getBranch(bankCodeVal, branchVal, cb);
		};

		_callGetBank(bankCode, (bankRes) => {
			// bankRes がエラーならそのまま返す（構造化されていない場合は enrich する）
			if (!bankRes || bankRes.error) {
				_bt_invokeCallback(
					callback,
					_bt_enrichError(bankRes, {
						code: 'bank.fetch_failed',
						field: 'bank',
						message: '銀行情報の取得に失敗しました',
						details: { requestedBankCode: bankCode },
					}),
					null
				);
				return;
			}

			// ゆうちょ記号 -> 支店情報（branchCode / accountType）を算出（番号は別途正規化）
			const conv = _bt_yuchoKigouToBranch(k);
			if (!conv || conv.error) {
				// conv の返却は既に構造化されている想定
				_bt_invokeCallback(
					callback,
					_bt_enrichError(conv, {
						code: conv && conv.code ? conv.code : 'kigou.convert_failed',
						field: 'kigou',
						message: conv && conv.message ? conv.message : '記号から支店への変換に失敗しました',
						details: { rawKigou: _bt_toStr(kigou) },
					}),
					null
				);
				return;
			}

			// 口座番号の変換ルール（accountType により処理が異なる）
			// - accountType === '0': ゆうちょ番号は最大6桁。先頭を0埋めして7桁にする。
			// - accountType === '1': ゆうちょ番号は最大8桁で末尾が必ず '1'。8桁に0埋めしてから末尾を除いた先頭7桁を口座番号とする。
			let acctNum = null;
			const acctType = conv && conv.accountType ? String(conv.accountType) : '';
			const rawNum = _bt_toStr(b).replace(/[^0-9]/g, '');
			if (!rawNum) {
				_bt_invokeCallback(
					callback,
					_bt_enrichError(null, {
						error: 'invalid_account',
						code: 'bangou.empty',
						field: 'bangou',
						message: 'ゆうちょ番号が空です',
						details: { rawBangou: _bt_toStr(bangou) },
					}),
					null
				);
				return;
			}
			if (acctType === '0') {
				if (rawNum.length > 6) {
					_bt_invokeCallback(
						callback,
						_bt_enrichError(null, {
							error: 'invalid_account',
							code: 'bangou.too_long',
							field: 'bangou',
							message: 'ゆうちょ番号が長すぎます（最大6桁）',
							details: { rawBangou: _bt_toStr(bangou), accountType: acctType },
						}),
						null
					);
					return;
				}
				acctNum = rawNum.padStart(7, '0');
			} else if (acctType === '1') {
				if (rawNum.length > 8) {
					_bt_invokeCallback(
						callback,
						_bt_enrichError(null, {
							error: 'invalid_account',
							code: 'bangou.too_long',
							field: 'bangou',
							message: 'ゆうちょ番号が長すぎます（最大8桁）',
							details: { rawBangou: _bt_toStr(bangou), accountType: acctType },
						}),
						null
					);
					return;
				}
				const padded8 = rawNum.padStart(8, '0');
				// 仕様上末尾は '1' のはず。満たさない場合はエラーとする。
				if (padded8.charAt(7) !== '1') {
					_bt_invokeCallback(
						callback,
						_bt_enrichError(null, {
							error: 'invalid_account_format',
							code: 'bangou.must_end_with_1',
							field: 'bangou',
							message: 'ゆうちょ番号の末尾は1である必要があります',
							details: { padded: padded8, rawBangou: _bt_toStr(bangou) },
						}),
						null
					);
					return;
				}
				acctNum = padded8.slice(0, 7);
			} else {
				_bt_invokeCallback(
					callback,
					_bt_enrichError(null, {
						error: 'invalid_account_type',
						code: 'kigou.unknown_account_type',
						field: 'kigou',
						message: '不明な口座種別です',
						details: { accountType: acctType },
					}),
					null
				);
				return;
			}

			// 正規化されたゆうちょ記号/番号を先に含める
			const yuchoKigou = k; // 半角化済みの記号
			let yuchoBangou = null; // accountType に応じた0埋め（'0'->6桁, '1'->8桁）
			if (acctType === '0') {
				yuchoBangou = rawNum.padStart(6, '0');
			} else if (acctType === '1') {
				yuchoBangou = rawNum.padStart(8, '0');
			}

			const out = {
				yuchoKigou: yuchoKigou,
				yuchoBangou: yuchoBangou,
				bankCode: bankRes.bankCode || bankCode,
				bankName: bankRes.bankName || '',
				bankKana: bankRes.bankKana || '',
				branchCode: conv.branchCode,
				branchName: '',
				branchKana: '',
				// 表示用の口座種別ラベルに変換して返す（内部処理では acctType を利用）
				accountType: acctType === '0' ? '当座' : acctType === '1' ? '普通' : conv.accountType,
				accountNumber: acctNum,
			};

			// 支店名/かなを取得（支店コード指定）
			_callGetBranch(out.bankCode, out.branchCode, (branchRes) => {
				if (!branchRes || branchRes.error) {
					// 支店が見つからない/エラーの場合はエラーを返す
					_bt_invokeCallback(
						callback,
						_bt_enrichError(branchRes, {
							code: 'branch.fetch_failed',
							field: 'branch',
							message: '支店情報の取得に失敗しました',
							details: { bankCode: out.bankCode, branchCode: out.branchCode },
						}),
						null
					);
					return;
				}
				out.branchName = branchRes.branchName || out.branchName;
				out.branchKana = branchRes.branchKana || out.branchKana;
				_bt_invokeCallback(callback, null, out);
			});
		});
	} catch (e) {
		_bt_invokeCallback(callback, { error: e && e.message ? e.message : String(e) }, null);
	}
};

/**
 * 入力を半角数字に正規化して7桁の0埋め口座番号文字列を返す
 * - 全角数字（ＦＵＬＬＷＩＤＴＨ）も受け付ける
 * - 空文字や数字以外の文字が含まれている場合は Error を投げる
 * @param {string|number} input 入力（全角/半角可）
 * @returns {string} 7桁の0埋めされた口座番号
 * @throws {Error} 数字以外の文字が含まれる、あるいは空の場合
 */
const normalizeAccountNumber = (input) => {
	const s = _bt_toStr(input).trim();
	if (!s) throw new Error('口座番号が空です');
	// 全角数字を半角に変換（既存ユーティリティを利用）
	const normalized = _bt_toHalfWidthDigits(s).replace(/\s+/g, '');
	if (!/^[0-9]+$/.test(normalized)) throw new Error('口座番号は数字のみである必要があります');
	if (normalized.length > 7) throw new Error('口座番号が長すぎます（最大7桁）');
	return normalized.padStart(7, '0');
};

/** 公開: normalizeEdiInfo — EDI 補助情報を銀行提出向けに簡易正規化します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {string} input 入力文字列
 * @param {object} [options] オプション
 * @returns {string} 正規化された文字列
 */
const normalizeEdiInfo = (input, options = {}) => {
	const opt = Object.assign({ padToBytes: false, bytes: 20 }, options || {});
	let s = _bt_toStr(input || '').trim();
	try {
		s = _bt_toHalfWidthKana(s, false);
	} catch (e) {
		// ignore and continue with raw string
	}
	// EDI 特有の禁止文字チェック: コンマは許容しない
	if (/,|，/.test(s)) {
		throw new Error('EDI情報にコンマ(, または ，)は使用できません');
	}

	// validate allowed characters similar to normalizePayeeName
	if (typeof _bt_isAllowedHalfWidthString === 'function') {
		if (!_bt_isAllowedHalfWidthString(s)) {
			const invalidChars = [];
			for (const ch of s) {
				if (typeof _bt_isAllowedHalfWidthChar === 'function') {
					if (!_bt_isAllowedHalfWidthChar(ch) && invalidChars.indexOf(ch) === -1)
						invalidChars.push(ch);
				} else {
					if (ch && ch.charCodeAt(0) > 0x7f && invalidChars.indexOf(ch) === -1)
						invalidChars.push(ch);
				}
			}
			const msg =
				'EDI情報に銀行振込で許容されない文字が含まれています: ' +
				(invalidChars.length ? invalidChars.join(',') : '不明');
			throw new Error(msg);
		}
	}

	// truncate to requested byte length first
	const truncated = _bt_sjisTruncate(s, opt.bytes);
	if (!opt.padToBytes) return truncated;
	const b = _bt_sjisByteLength(truncated);
	if (b < opt.bytes) return truncated + ' '.repeat(opt.bytes - b);
	return truncated;
};

/** 公開: normalizePayeeName — 受取人名を銀行振込向けに正規化して返します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {string} input 口座名義
 * @returns {string} 正規化された口座名義
 */
const normalizePayeeName = (input, options = {}) => {
	const s = _bt_toStr(input).trim();
	if (!s) throw new Error('口座名義が空です');
	// 入力文字列に英小文字が含まれる場合は不正とする（小文字は許容しない）
	if (/[a-z]/.test(s)) throw new Error('口座名義に許容されない小文字が含まれています');
	// オプション: 略語処理をスキップする場合は呼び出し側から
	// { skipAbbreviation: true } を渡すことで略語の強制適用を無効化できる。
	const skipAbbrev = options && options.skipAbbreviation === true;

	// 0) 法人・営業所・事業略語の置換（長いキー順に置換して衝突を避ける）
	// 各略語リストでは "一つだけ" の略語適用に制限する（最初の一致を置換したら以降は同リストの置換を行わない）
	// `work` を try/catch の外で一度宣言しておくことで、後続処理から参照できるようにする
	let work;
	// 状態付き Replacer を用意（最初の一致のみを置換し、以降は no-op）
	// options.parentheses が真の場合、置換位置に応じて括弧を付与するルールを適用する
	const makeStatefulReplacer = (mapObj, options = {}) => {
		const keys = Object.keys(mapObj || {}).sort((a, b) => b.length - a.length);
		if (keys.length === 0) return (str) => str;
		const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// 最初の一致のみ置換するためにグローバルフラグは使わない
		const pattern = new RegExp(keys.map(esc).join('|'));
		let used = false;
		return (str) => {
			if (used) return str;
			let replaced = false;
			const res = str.replace(pattern, function (m, offset, whole) {
				// callback signature: (match, offset, string) when no capture groups
				replaced = true;
				let rep = mapObj[m] || m;
				if (options.parentheses) {
					const start = offset === 0;
					const end = offset + m.length === whole.length;
					if (start && end) {
						// 文字列全体が一致した場合は周囲を()で囲む
						rep = '(' + rep + ')';
					} else if (start) {
						// 先頭にある場合は後ろに ')' を付ける
						rep = rep + ')';
					} else if (end) {
						// 末尾にある場合は前に '(' を付ける
						rep = '(' + rep;
					} else {
						// 中間にある場合は前後に () を付ける
						rep = '(' + rep + ')';
					}
				}
				return rep;
			});
			if (replaced) used = true;
			return res;
		};
	};
	let corpRepl, salesRepl, bizRepl;
	try {
		if (!skipAbbrev) {
			// 企業名・営業所の略語適用では位置に応じた括弧付与を行う
			corpRepl = makeStatefulReplacer(_BT_CORPORATE_ABBREVIATIONS_LIST, { parentheses: true });
			salesRepl = makeStatefulReplacer(_BT_SALES_OFFICES_LIST, { parentheses: true });
			// 事業略語は括弧ルールを適用しない
			bizRepl = makeStatefulReplacer(_BT_BUSINESS_LIST);
			// 原文に含まれる漢字表記等を先に置換（各リストで最初に見つかった1件だけを置換する）
			let pre = s;
			pre = corpRepl(pre);
			pre = salesRepl(pre);
			pre = bizRepl(pre);
			// 続く処理は pre を使う
			// 1) 全角数字を半角化
			work = _bt_toHalfWidthDigits(pre);
		} else {
			// 略語処理をスキップする場合は原文をそのまま次段へ渡す
			work = _bt_toHalfWidthDigits(s);
		}
	} catch (e) {
		// 何らかの理由で置換が失敗したら、入力 s を起点に処理を続行
		work = _bt_toHalfWidthDigits(s);
	}
	// 2) 半角化（かな・英数）の補助
	try {
		work = _bt_toHalfWidthKana(work, false);
	} catch (e) {
		// フォールバック: 元の work を使う
	}
	// 1b) 半角化後の表記（半角カナなど）に対しても略語置換を行う
	try {
		// 半角化後の表記にも略語置換を行うが、呼び出しオプションでスキップ可能
		if (!skipAbbrev) {
			corpRepl =
				corpRepl || makeStatefulReplacer(_BT_CORPORATE_ABBREVIATIONS_LIST, { parentheses: true });
			salesRepl = salesRepl || makeStatefulReplacer(_BT_SALES_OFFICES_LIST, { parentheses: true });
			bizRepl = bizRepl || makeStatefulReplacer(_BT_BUSINESS_LIST);
			work = corpRepl(work);
			work = salesRepl(work);
			work = bizRepl(work);
		}
	} catch (e) {
		// 無視
	}
	// 3) 英小文字は大文字化
	work = work.replace(/[a-z]/g, (c) => c.toUpperCase());

	// 全角カンマ（，）や日本語読点（、）は半角カンマに正規化して許容する
	work = work.replace(/[，、]/g, ',');

	// 4) 検査
	if (_bt_isAllowedHalfWidthString(work)) {
		// 成功時は Shift_JIS 単位で先頭 30 バイトに切り詰めて返す
		const truncated = _bt_sjisTruncate(work, 30);
		return truncated;
	}

	// 5) 許容外文字の列挙して Error を投げる（normalizeAccountNumber と同様の挙動）
	const invalidChars = [];
	for (const ch of work) {
		if (!_bt_isAllowedHalfWidthChar(ch) && invalidChars.indexOf(ch) === -1) invalidChars.push(ch);
	}
	const msg =
		'口座名義に銀行振込で許容されない文字が含まれています: ' +
		(invalidChars.length ? invalidChars.join(',') : '不明');
	// シンプルにメッセージだけを投げる（仕様に合わせる）
	throw new Error(msg);
};

/** 公開: generateHeader — 全銀ヘッダレコードを生成してコールバックで返します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {object} data ヘッダ生成用データ
 * @param {function(result)} callback single-arg スタイルのコールバック
 */
const generateHeader = (data, callback) => {
	// data: {
	//   typeCode, requesterCode, requesterName, tradeDate,
	//   fromBankNo, fromBranchNo, depositType, accountNumber
	// }
	if (typeof callback !== 'function')
		return { success: false, error: '第二引数はコールバック関数である必要があります' };
	try {
		if (!data || typeof data !== 'object') {
			_bt_invokeCallback(callback, { error: 'データがオブジェクトである必要があります' }, null);
			return;
		}

		const TYPE_CODE_MAP = {
			給与振込: '11',
			賞与振込: '12',
			総合振込: '21',
		};
		const DEPOSIT_TYPE_MAP = {
			普通: '1',
			普通預金: '1',
			当座: '2',
			当座預金: '2',
		};

		const dataType = '1';
		const codeClass = '0';

		// typeCode
		let typeCodeRaw = _bt_toStr(data.typeCode || '').trim();
		let typeCode = '';
		if (/^[0-9]{2}$/.test(typeCodeRaw)) typeCode = typeCodeRaw;
		else if (typeCodeRaw) {
			const key = String(typeCodeRaw).toUpperCase();
			if (TYPE_CODE_MAP[key]) typeCode = TYPE_CODE_MAP[key];
		}
		if (!/^[0-9]{2}$/.test(typeCode)) {
			_bt_invokeCallback(callback, { error: '種別コードが不正です' }, null);
			return;
		}

		// requesterCode (10バイト)
		let requesterCode = _bt_toHalfWidthDigits(_bt_toStr(data.requesterCode || '')).replace(
			/[^0-9]/g,
			''
		);
		requesterCode = requesterCode.padStart(10, '0');
		if (_bt_sjisByteLength(requesterCode) > 10) {
			_bt_invokeCallback(callback, { error: '振込依頼人コードが長すぎます（最大10バイト）' }, null);
			return;
		}

		// requesterName (40bytes, SJIS)
		let requesterName = _bt_toStr(data.requesterName || '');
		try {
			requesterName = _bt_toHalfWidthKana(requesterName, false);
		} catch (e) {}
		let reqNameTrunc = _bt_sjisTruncate(requesterName, 40);
		let reqNameBytes = _bt_sjisByteLength(reqNameTrunc);
		if (reqNameBytes < 40) reqNameTrunc = reqNameTrunc + ' '.repeat(40 - reqNameBytes);

		// trade date MMDD
		let trade = '';
		if (data.tradeDate instanceof Date) {
			const m = String(data.tradeDate.getMonth() + 1).padStart(2, '0');
			const d = String(data.tradeDate.getDate()).padStart(2, '0');
			trade = m + d;
		} else {
			// Accept several common string formats:
			// - 'MMDD' (e.g. '1108')
			// - 'YYYYMMDD' (e.g. '20251108')
			// - 'YYYY-MM-DD' or 'YYYY/MM/DD' (kintone date field)
			let s = _bt_toStr(data.tradeDate || '').trim();
			if (/^[0-9]{8}$/.test(s)) {
				// YYYYMMDD -> extract MMDD
				trade = s.slice(4, 6) + s.slice(6, 8);
			} else if (
				/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s) ||
				/^[0-9]{4}\/[0-9]{2}\/[0-9]{2}$/.test(s)
			) {
				// YYYY-MM-DD or YYYY/MM/DD
				trade = s.slice(5, 7) + s.slice(8, 10);
			} else {
				trade = s.replace(/[^0-9]/g, '');
			}
		}
		if (!/^[0-9]{4}$/.test(trade)) {
			_bt_invokeCallback(callback, { error: '取組日は MMDD 形式（4桁）で指定してください' }, null);
			return;
		}
		if (_bt_sjisByteLength(trade) > 4) {
			_bt_invokeCallback(callback, { error: '取組日のバイト長が長すぎます（最大4バイト）' }, null);
			return;
		}

		// helper to prefer window.BANK stubs in tests
		const _callGetBank = (code, cb) => {
			try {
				if (
					typeof window !== 'undefined' &&
					window.BANK &&
					typeof window.BANK.getBank === 'function'
				)
					return window.BANK.getBank(code, cb);
			} catch (e) {}
			return getBank(code, cb);
		};
		const _callGetBranch = (bankCode, branch, cb) => {
			try {
				if (
					typeof window !== 'undefined' &&
					window.BANK &&
					typeof window.BANK.getBranch === 'function'
				)
					return window.BANK.getBranch(bankCode, branch, cb);
			} catch (e) {}
			return getBranch(bankCode, branch, cb);
		};

		// 銀行/支店番号: 公称キーは `fromBankNo` / `fromBranchNo`（仕向を示す）です。
		const rawBankNo = _bt_toStr(data.fromBankNo || '');
		const rawBranchNo = _bt_toStr(data.fromBranchNo || '');

		// fromBankNo (4 bytes)
		const fromBankNo = _bt_toHalfWidthDigits(rawBankNo)
			.replace(/[^0-9]/g, '')
			.padStart(4, '0');
		if (_bt_sjisByteLength(fromBankNo) > 4) {
			_bt_invokeCallback(callback, { error: '仕向銀行番号が長すぎます（最大4バイト）' }, null);
			return;
		}

		// fromBranchNo (3 bytes)
		const fromBranchNo = _bt_toHalfWidthDigits(rawBranchNo)
			.replace(/[^0-9]/g, '')
			.padStart(3, '0');
		if (_bt_sjisByteLength(fromBranchNo) > 3) {
			_bt_invokeCallback(callback, { error: '仕向支店番号が長すぎます（最大3バイト）' }, null);
			return;
		}

		// depositType -> depCode
		let depRaw = _bt_toStr(data.depositType || '').trim();
		let depCode = '';
		if (/^[0-9]{1}$/.test(depRaw)) depCode = depRaw;
		else if (DEPOSIT_TYPE_MAP && DEPOSIT_TYPE_MAP[depRaw]) depCode = DEPOSIT_TYPE_MAP[depRaw];
		else depCode = '9';

		// account number (7 bytes)
		let acct = _bt_toHalfWidthDigits(_bt_toStr(data.accountNumber || ''))
			.replace(/[^0-9]/g, '')
			.padStart(7, '0');
		if (_bt_sjisByteLength(acct) > 7) {
			_bt_invokeCallback(callback, { error: '依頼人の口座番号が長すぎます（最大7バイト）' }, null);
			return;
		}

		const dummy = ' '.repeat(17);

		// resolve bank/branch names asynchronously
		_callGetBank(fromBankNo, (bankRes) => {
			if (!bankRes || bankRes.error) {
				_bt_invokeCallback(callback, { error: '仕向銀行情報を取得できませんでした' }, null);
				return;
			}
			const bankCodeForBranch = bankRes.bankCode || fromBankNo;
			// ヘッダで使用するのは厳密にカナ名 (bankKana) のみ
			const resolvedBankKana = _bt_toStr(bankRes.bankKana || '');
			if (!resolvedBankKana) {
				_bt_invokeCallback(
					callback,
					{ error: '仕向銀行のカナ名(bankKana)が取得できませんでした' },
					null
				);
				return;
			}

			// 共通の組立処理（支店名が確定したら呼ぶ）
			const _assembleWithBranch = (resolvedBranchName) => {
				// ヘッダではカナを使う
				let toBankName = resolvedBankKana;
				let toBranchName = resolvedBranchName || '';
				try {
					toBankName = _bt_toHalfWidthKana(toBankName, false);
				} catch (e) {}
				let toBankNameTrunc = _bt_sjisTruncate(toBankName, 15);
				let toBankNameBytes = _bt_sjisByteLength(toBankNameTrunc);
				if (toBankNameBytes < 15)
					toBankNameTrunc = toBankNameTrunc + ' '.repeat(15 - toBankNameBytes);

				try {
					toBranchName = _bt_toHalfWidthKana(toBranchName, false);
				} catch (e) {}
				let toBranchNameTrunc = _bt_sjisTruncate(toBranchName, 15);
				let toBranchNameBytes = _bt_sjisByteLength(toBranchNameTrunc);
				if (toBranchNameBytes < 15)
					toBranchNameTrunc = toBranchNameTrunc + ' '.repeat(15 - toBranchNameBytes);

				const parts = [
					dataType,
					typeCode,
					codeClass,
					requesterCode,
					reqNameTrunc,
					trade,
					fromBankNo,
					toBankNameTrunc,
					fromBranchNo,
					toBranchNameTrunc,
					depCode,
					acct,
					dummy,
				];
				const line = parts.join('');
				const totalBytes = _bt_sjisByteLength(line);
				if (totalBytes !== 120) {
					_bt_invokeCallback(
						callback,
						{
							error:
								'ヘッダの合計バイト長が 120 バイトではありません（現在: ' +
								totalBytes +
								' バイト）',
						},
						null
					);
					return;
				}
				_bt_invokeCallback(callback, null, { success: true, header: line });
			};

			// ゆうちょ銀行（9900）は、支店情報が口座記号の一部で渡されることがあるため
			// 支店データの取得をスキップして空の支店名で組み立てます。
			if (fromBankNo === '9900') {
				_assembleWithBranch('');
				return;
			}

			_callGetBranch(bankCodeForBranch, fromBranchNo, (branchRes) => {
				if (!branchRes || branchRes.error) {
					_bt_invokeCallback(callback, { error: '仕向支店情報を取得できませんでした' }, null);
					return;
				}
				const resolvedBranchKana = _bt_toStr(branchRes.branchKana || '');
				if (!resolvedBranchKana) {
					_bt_invokeCallback(
						callback,
						{ error: '仕向支店のカナ名(branchKana)が取得できませんでした' },
						null
					);
					return;
				}
				_assembleWithBranch(resolvedBranchKana);
			});
		});
		return;
	} catch (err) {
		_bt_invokeCallback(callback, { error: 'ヘッダ生成に失敗しました' }, null);
	}
};
/** 公開: generateDataRecords — 振込明細配列から全銀データレコード文字列を生成します（詳細: docs/bank-transfer.md）。 */
/** 公開: generateDataRecords — 振込明細配列から全銀データレコード文字列を生成します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {Array<object>} records 振込明細の配列
 * @param {string} [fromBankNo] 仕向金融機関コード
 * @param {function(result)} callback single-arg スタイルのコールバック
 */
const generateDataRecords = (records, fromBankNo = '', callback) => {
	if (typeof callback !== 'function')
		return { success: false, error: '第三引数はコールバック関数である必要があります' };
	if (!Array.isArray(records)) {
		_bt_invokeCallback(callback, { error: 'records は配列である必要があります' }, null);
		return;
	}
	const originBankNo = _bt_toStr(fromBankNo || '').padStart(4, '0');
	const out = [];

	// helper to prefer window.BANK stubs in tests
	const _callGetBank = (code, cb) => {
		try {
			if (typeof window !== 'undefined' && window.BANK && typeof window.BANK.getBank === 'function')
				return window.BANK.getBank(code, cb);
		} catch (e) {}
		return getBank(code, cb);
	};
	const _callGetBranch = (bankCode, branch, cb) => {
		try {
			if (
				typeof window !== 'undefined' &&
				window.BANK &&
				typeof window.BANK.getBranch === 'function'
			)
				return window.BANK.getBranch(bankCode, branch, cb);
		} catch (e) {}
		return getBranch(bankCode, branch, cb);
	};

	// deposit type map (slightly extended compared to header)
	const DEPOSIT_TYPE_MAP_LOCAL = {
		普通: '1',
		普通預金: '1',
		当座: '2',
		当座預金: '2',
		貯蓄: '4',
		貯蓄預金: '4',
	};

	let idx = 0;
	const processNext = () => {
		if (idx >= records.length) {
			// 生成した整形済みレコードを固定長文字列に変換して返す
			_bt_generateDataRecordStrings(out, callback);
			return;
		}
		const i = idx++;
		const r = records[i] || {};
		try {
			const toBankNo = _bt_toHalfWidthDigits(_bt_toStr(r.toBankNo || ''))
				.replace(/[^0-9]/g, '')
				.padStart(4, '0');
			const toBranchNo = _bt_toHalfWidthDigits(_bt_toStr(r.toBranchNo || ''))
				.replace(/[^0-9]/g, '')
				.padStart(3, '0');
			const accountNumber = normalizeAccountNumber(r.toAccountNumber || r.accountNumber || '');
			const amountNum = Number(r.amount || 0);
			if (!Number.isFinite(amountNum) || amountNum < 0) throw new Error('金額が不正です');
			let customerNameRaw = _bt_toStr(r.customerName || r.customerKana || '');
			let customerName;
			try {
				// generateDataRecords の文脈では法人略語を詰めない（データ作成前にすでに略語として処理されているか、略語として処理すべきでない場合があるか不明なため、省略処理を無効化）
				customerName = normalizePayeeName(customerNameRaw, { skipAbbreviation: true });
			} catch (e) {
				_bt_invokeCallback(
					callback,
					{
						error: '受取人名の正規化に失敗しました',
						message: e && e.message ? e.message : String(e),
						index: i,
					},
					null
				);
				return;
			}
			// depositType conversion
			// toAccountType は必須とする（'普通'/'当座'/'貯蓄' などのラベル、または '1'/'2' の1桁コード）
			let depRaw = _bt_toStr(
				r.toAccountType || r.depositType || r.toDepositType || r.deposit || ''
			).trim();
			if (!depRaw) {
				_bt_invokeCallback(
					callback,
					{ error: '預金種目(toAccountType)が指定されていません', index: i },
					null
				);
				return;
			}
			let depCode = '';
			if (/^[0-9]{1}$/.test(depRaw)) depCode = depRaw;
			else if (depRaw && DEPOSIT_TYPE_MAP_LOCAL[depRaw]) depCode = DEPOSIT_TYPE_MAP_LOCAL[depRaw];
			else {
				_bt_invokeCallback(
					callback,
					{ error: '預金種目が不明です', message: depRaw, index: i },
					null
				);
				return;
			}

			// perform bank lookup
			_callGetBank(toBankNo, (bankRes) => {
				if (!bankRes || bankRes.error) {
					_bt_invokeCallback(
						callback,
						{
							error: '被仕向銀行情報を取得できませんでした',
							message: bankRes && bankRes.error ? bankRes.error : undefined,
							index: i,
						},
						null
					);
					return;
				}
				const bankCodeForBranch = bankRes.bankCode || toBankNo;
				const resolvedBankKana = _bt_toStr(bankRes.bankKana || '');
				if (!resolvedBankKana) {
					_bt_invokeCallback(
						callback,
						{ error: '被仕向銀行のカナ名(bankKana)が取得できませんでした', index: i },
						null
					);
					return;
				}
				// if both origin and destination are yucho (9900), skip branch lookup
				if (originBankNo === '9900' && toBankNo === '9900') {
					const rec = {
						_seq: i + 1,
						toBankNo,
						toBranchNo,
						toBankKana: _bt_toHalfWidthKana(resolvedBankKana, false),
						toBranchKana: '',
						ediInfo: _bt_toStr(r.ediInfo || ''),
						depositType: depCode,
						accountNumber,
						amount: Math.round(amountNum),
						customerName,
						reference: _bt_toStr(r.reference || r.remark || r.description || ''),
					};
					if (originBankNo) rec.originBankNo = originBankNo;
					out.push(rec);
					processNext();
					return;
				}
				// otherwise fetch branch
				_callGetBranch(bankCodeForBranch, toBranchNo, (branchRes) => {
					if (!branchRes || branchRes.error) {
						_bt_invokeCallback(
							callback,
							{
								error: '被仕向支店情報を取得できませんでした',
								message: branchRes && branchRes.error ? branchRes.error : undefined,
								index: i,
							},
							null
						);
						return;
					}
					const resolvedBranchKana = _bt_toStr(branchRes.branchKana || '');
					if (!resolvedBranchKana) {
						_bt_invokeCallback(
							callback,
							{ error: '被仕向支店のカナ名(branchKana)が取得できませんでした', index: i },
							null
						);
						return;
					}
					const rec = {
						_seq: i + 1,
						toBankNo,
						toBranchNo,
						toBankKana: _bt_toHalfWidthKana(resolvedBankKana, false),
						toBranchKana: _bt_toHalfWidthKana(resolvedBranchKana, false),
						ediInfo: _bt_toStr(r.ediInfo || ''),
						depositType: depCode,
						accountNumber,
						amount: Math.round(amountNum),
						customerName,
						reference: _bt_toStr(r.reference || r.remark || r.description || ''),
					};
					if (originBankNo) rec.originBankNo = originBankNo;
					out.push(rec);
					processNext();
				});
			});
		} catch (e) {
			_bt_invokeCallback(
				callback,
				{
					error: 'レコードの処理に失敗しました',
					message: e && e.message ? e.message : String(e),
					index: i,
				},
				null
			);
			return;
		}
	};
	processNext();
};

/** 公開: generateTrailer — データレコード配列からトレーラ集計を生成してコールバックで返します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {Array|String} dataRecords dataRecords 配列または CRLF で結合された文字列
 * @param {function(result)} callback single-arg スタイルのコールバック
 */
const generateTrailer = (dataRecords, callback) => {
	if (typeof callback !== 'function')
		return { success: false, error: '第二引数はコールバック関数である必要があります' };

	// Accept either:
	// - string: CRLF-joined records produced by generateDataRecords
	// - array: array of objects with `amount` property
	let recordCount = 0;
	let total = 0;

	if (typeof dataRecords === 'string') {
		const lines = dataRecords.split(/\r?\n/).filter((l) => l && String(l).length > 0);
		for (let idx = 0; idx < lines.length; idx++) {
			const line = lines[idx];
			if (typeof _bt_sjisByteLength === 'function') {
				const b = _bt_sjisByteLength(line);
				if (b !== 120) {
					_bt_invokeCallback(
						callback,
						{ error: 'レコード長が120バイトではありません', index: idx, message: `length=${b}` },
						null
					);
					return;
				}
			}
			const amtField = typeof line.substring === 'function' ? line.substring(80, 90) : '';
			const amtNumStr = (amtField || '').replace(/^0+/, '') || '0';
			if (!/^[0-9]+$/.test(amtNumStr)) {
				_bt_invokeCallback(
					callback,
					{ error: '金額フィールドが数値ではありません', index: idx, message: amtField },
					null
				);
				return;
			}
			const a = Number(amtNumStr);
			if (!Number.isFinite(a) || a < 0) {
				_bt_invokeCallback(
					callback,
					{ error: '不正な金額を含むレコードがあります', index: idx },
					null
				);
				return;
			}
			// 振込金額が 0 のレコードは合計金額には含めるが件数には含めない仕様に変更
			// （要件: 0円は1件に数えない）
			if (a !== 0) {
				recordCount++;
			}
			total += Math.round(a);
		}
	} else if (Array.isArray(dataRecords)) {
		for (let idx = 0; idx < dataRecords.length; idx++) {
			const r = dataRecords[idx] || {};
			const a = Number(r && r.amount ? r.amount : 0);
			if (!Number.isFinite(a) || a < 0) {
				_bt_invokeCallback(
					callback,
					{ error: '不正な金額を含むレコードがあります', index: idx },
					null
				);
				return;
			}
			// 仕様: 金額が0円のレコードは件数に含めない
			if (a !== 0) {
				recordCount++;
			}
			total += Math.round(a);
		}
	} else {
		_bt_invokeCallback(
			callback,
			{ error: 'dataRecords は文字列または配列である必要があります' },
			null
		);
		return;
	}

	const trailer = { recordCount, totalAmount: total };
	// Convert trailer object to fixed-length trailer record string and return that result
	try {
		const line = _bt_generateTrailerString(trailer);
		_bt_invokeCallback(callback, null, { success: true, trailerRecord: line });
		return;
	} catch (e) {
		_bt_invokeCallback(
			callback,
			{ error: 'トレーラの生成に失敗しました', message: e && e.message ? e.message : String(e) },
			null
		);
		return;
	}
};

/** 公開: generateEndRecord — エンドレコードを生成してコールバックで返します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {function(result)} callback single-arg スタイルのコールバック
 */
const generateEndRecord = (callback) => {
	if (typeof callback !== 'function')
		return { success: false, error: '第一引数はコールバック関数である必要があります' };
	try {
		const line = _bt_generateEndRecordString();
		_bt_invokeCallback(callback, null, { success: true, endRecord: line });
		return;
	} catch (e) {
		_bt_invokeCallback(
			callback,
			{
				error: 'エンドレコードの生成に失敗しました',
				message: e && e.message ? e.message : String(e),
			},
			null
		);
		return;
	}
};

/** 公開: generateZenginData — ヘッダ/データ/トレーラ/エンドを組み合わせた全銀ファイル文字列を生成します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {object} headerData ヘッダ生成用データ
 * @param {Array<object>} records 振込明細配列
 * @param {function(result)} callback single-arg スタイルのコールバック
 */
const generateZenginData = (headerData, records, callback) => {
	if (typeof callback !== 'function')
		return { success: false, error: '第三引数はコールバック関数である必要があります' };

	// 1) header
	try {
		generateHeader(headerData, (hres) => {
			if (hres && hres.error) {
				_bt_invokeCallback(
					callback,
					{ error: 'ヘッダレコードの生成に失敗しました', detail: hres },
					null
				);
				return;
			}
			const headerLine = hres && hres.header ? hres.header : '';

			// 2) data records — use fromBankNo from headerData if present
			const fromBankNo = headerData && headerData.fromBankNo ? headerData.fromBankNo : '';
			generateDataRecords(records, fromBankNo, (dres) => {
				if (dres && dres.error) {
					_bt_invokeCallback(
						callback,
						{ error: 'データレコードの生成に失敗しました', detail: dres },
						null
					);
					return;
				}
				const dataJoined = dres && dres.records ? dres.records : '';

				// 3) trailer (accept joined string)
				generateTrailer(dataJoined, (tres) => {
					if (tres && tres.error) {
						_bt_invokeCallback(
							callback,
							{ error: 'トレーラレコードの生成に失敗しました', detail: tres },
							null
						);
						return;
					}
					const trailerLine = tres && tres.trailerRecord ? tres.trailerRecord : '';

					// 4) end record
					generateEndRecord((eres) => {
						if (eres && eres.error) {
							_bt_invokeCallback(
								callback,
								{ error: 'エンドレコードの生成に失敗しました', detail: eres },
								null
							);
							return;
						}
						const endLine = eres && eres.endRecord ? eres.endRecord : '';

						// assemble: header + CRLF + data (already CRLF joined, may contain multiple lines) + CRLF + trailer + CRLF + end
						const parts = {
							header: headerLine,
							data: dataJoined,
							trailer: trailerLine,
							end: endLine,
						};
						// avoid extra empty lines when dataJoined is empty
						const contentPieces = [headerLine];
						if (dataJoined && String(dataJoined).length > 0) contentPieces.push(dataJoined);
						contentPieces.push(trailerLine);
						contentPieces.push(endLine);
						const content = contentPieces.join('\r\n');
						_bt_invokeCallback(callback, null, { success: true, content, parts });
						return;
					});
				});
			});
		});
	} catch (e) {
		_bt_invokeCallback(
			callback,
			{
				error: 'ファイル生成中に例外が発生しました',
				message: e && e.message ? e.message : String(e),
			},
			null
		);
		return;
	}
};

/** 公開: nextBankBusinessDay — 次の銀行営業日を計算してコールバックで返します（詳細: docs/bank-transfer.md）。 */
/**
 * @param {Date|string} [baseDate=new Date()] 基準日時（Date または 日付文字列）
 * @param {number} [cutoffHour=18] 締め時刻（0-23）
 * @param {function(string):void} callback 結果を 'YYYY-MM-DD' 形式で受け取るコールバック（single-arg）
 */
const nextBankBusinessDay = (baseDate = new Date(), cutoffHour = 18, callback) => {
	if (typeof callback !== 'function') {
		throw new Error('callback は関数である必要があります');
	}
	const cutoffHourNum = Number(cutoffHour);
	if (!Number.isInteger(cutoffHourNum) || cutoffHourNum < 0 || cutoffHourNum > 23) {
		throw new Error('締め時刻は0～23の整数である必要があります');
	}

	let targetDate;
	let hasTimeInfo = false;
	if (typeof baseDate === 'string') {
		targetDate = new Date(baseDate);
		hasTimeInfo = /T\d{2}:\d{2}|\d{2}:\d{2}/.test(baseDate);
	} else if (baseDate instanceof Date) {
		targetDate = new Date(baseDate);
		hasTimeInfo =
			targetDate.getHours() !== 0 || targetDate.getMinutes() !== 0 || targetDate.getSeconds() !== 0;
	} else {
		throw new Error('基準日時は日付文字列、またはDate型である必要があります');
	}
	if (isNaN(targetDate.getTime())) {
		throw new Error('基準日時は有効な日付である必要があります');
	}

	// 保存しておく基準日のコピー（時刻情報を含む）
	const baseDateObj = new Date(targetDate);

	// 内部: 国民の祝日判定（コールバック形式）
	const _isNationalHoliday = (date, cb) => {
		// 1948-07-20 以前は祝日法制定前
		if (date < new Date(1948, 6, 20)) {
			cb(false);
			return;
		}
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		const dateStr = `${y}-${m}-${d}`;
		const url = 'https://api.national-holidays.jp/' + dateStr;
		fetch(url)
			.then((res) => {
				if (!res.ok) {
					cb(false);
					return;
				}
				return res.json();
			})
			.then((json) => {
				if (json && typeof json === 'object') {
					if (json.error === 'not_found') {
						cb(false);
						return;
					}
					if (typeof json.date === 'string' && typeof json.name === 'string') {
						cb(true);
						return;
					}
				}
				cb(false);
			})
			.catch(() => {
				// API エラー時は祝日でないと扱う
				cb(false);
			});
	};

	// 汎用: 指定日から最初の営業日を探すヘルパ (startDate を変更せず新しい Date を使う)
	const findNextBusinessFrom = (startDate, cb) => {
		const cur = new Date(startDate);
		const _step = () => {
			const dayOfWeek = cur.getDay();
			const month = cur.getMonth() + 1;
			const day = cur.getDate();
			// 土日
			if (dayOfWeek === 0 || dayOfWeek === 6) {
				cur.setDate(cur.getDate() + 1);
				_step();
				return;
			}
			// 年末年始（銀行の取り扱いに合わせて 12/31〜1/3 を非営業日とする）
			if ((month === 12 && day >= 31) || (month === 1 && day <= 3)) {
				cur.setDate(cur.getDate() + 1);
				_step();
				return;
			}
			// 国民の祝日
			_isNationalHoliday(cur, (isHoliday) => {
				if (isHoliday) {
					cur.setDate(cur.getDate() + 1);
					_step();
				} else {
					const y = cur.getFullYear();
					const mm = String(cur.getMonth() + 1).padStart(2, '0');
					const dd = String(cur.getDate()).padStart(2, '0');
					cb(`${y}-${mm}-${dd}`);
				}
			});
		};
		_step();
	};

	// 判定: 基準日が営業日かどうかをチェックする (callback boolean)
	const _isBusinessDay = (date, cb) => {
		const dow = date.getDay();
		const m = date.getMonth() + 1;
		const d = date.getDate();
		if (dow === 0 || dow === 6) {
			cb(false);
			return;
		}
		if ((m === 12 && d >= 31) || (m === 1 && d <= 3)) {
			cb(false);
			return;
		}
		_isNationalHoliday(date, (isHoliday) => cb(!isHoliday));
	};

	// 基準日の営業性を判定して挙動を分岐する
	_isBusinessDay(baseDateObj, (isBaseBusiness) => {
		if (isBaseBusiness) {
			// 基準日が営業日の場合: 翌営業日 (cutoff 超過なら翌々営業日)
			const offset = hasTimeInfo && baseDateObj.getHours() >= cutoffHourNum ? 2 : 1;
			const start = new Date(baseDateObj);
			start.setDate(start.getDate() + offset);
			findNextBusinessFrom(start, callback);
		} else {
			// 基準日が休業日の場合: 翌営業日の翌営業日を返す
			const after = new Date(baseDateObj);
			after.setDate(after.getDate() + 1);
			// まず翌営業日を求め、その翌日からさらに次の営業日を求める
			findNextBusinessFrom(after, (firstBiz) => {
				// parse firstBiz into Date
				const parts = firstBiz.split('-');
				const d1 = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
				const afterFirst = new Date(d1);
				afterFirst.setDate(afterFirst.getDate() + 1);
				findNextBusinessFrom(afterFirst, callback);
			});
		}
	});
};

// kintone 向けに window に公開します
if (typeof window !== 'undefined') {
	// 利用者向けに簡潔なグローバル名で公開します: window.BANK
	// このビルドでは window.BANK を主要ネームスペースとして利用します（完全移行）。
	window.BANK = window.BANK || {};
	Object.assign(window.BANK, {
		getBank,
		getBranch,
		convertYucho,
		normalizeAccountNumber,
		normalizePayeeName,
		normalizeEdiInfo,
		generateHeader,
		generateDataRecords,
		generateTrailer,
		generateEndRecord,
		generateZenginData,
		nextBankBusinessDay,
	});
}

// CommonJS export for Node/test environments
try {
	if (typeof module !== 'undefined' && module && module.exports) {
		module.exports =
			typeof window !== 'undefined' && window.BANK
				? window.BANK
				: {
						getBank,
						getBranch,
						convertYucho,
						normalizeAccountNumber,
						normalizePayeeName,
						normalizeEdiInfo,
						generateHeader,
						generateDataRecords,
						generateTrailer,
						generateEndRecord,
						generateZenginData,
						nextBankBusinessDay,
					};
	}
} catch (e) {}
