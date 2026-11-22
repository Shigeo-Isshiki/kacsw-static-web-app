// zip-code-address-utils の実API動作テスト（手動実行用。npm test には含めない）
// Usage: node scripts/test-zip-code-address-live.js [デジタルアドレス...]
//   デジタルアドレスは特定の場所につながるためリポジトリに記録せず、引数で渡す。
'use strict';

const zc = require('../src/zip-code-address-utils.js');

// 通常の郵便番号（全国の公開郵便番号）
const NORMAL_ZIP_CODES = [
	'160-0004',
	'060-0002',
	'030-0822',
	'020-0816',
	'981-0935',
	'010-0922',
	'990-0021',
	'963-8045',
	'310-0851',
	'371-0843',
	'338-0003',
	'260-0026',
	'170-0005',
	'221-0825',
	'950-0994',
	'380-0836',
	'400-0064',
	'939-0341',
	'918-8011',
	'420-0856',
	'500-8385',
	'460-0001',
	'514-0003',
	'525-0072',
	'604-0874',
	'542-0012',
	'651-0062',
	'634-0061',
	'640-8319',
	'689-0201',
	'690-0011',
	'700-0807',
	'732-0816',
	'753-0072',
	'762-0083',
	'790-0802',
	'770-0943',
	'780-0870',
	'812-0011',
	'849-0935',
	'852-8104',
	'862-0910',
	'870-0907',
	'880-0007',
	'903-0804',
];

// 複数候補が返り、getAddressByZipCode ではエラーになることを期待する郵便番号
const MULTI_CANDIDATE_ZIP_CODES = new Set(['939-0341', '604-0874']);

// 事業所個別郵便番号
const BIZ_ZIP_CODES = ['320-8508', '920-8557', '890-8517'];

// 1.4.0で追加したAPI未加工キー
const RAW_EXTRA_KEYS = [
	'dgaCode',
	'prefCode',
	'prefKana',
	'prefRoma',
	'cityCode',
	'cityKana',
	'cityRoma',
	'townKana',
	'townRoma',
	'bizKana',
	'bizRoma',
	'apiAddress',
	'corporateNumber',
	'businessNameKana',
	'telNumber',
	'url',
	'longitude',
	'latitude',
	'locations',
	'usage',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const search = (code) => new Promise((resolve) => zc.getAddressByZipCode(code, resolve));

const failures = [];
let passed = 0;

const check = (code, condition, message) => {
	if (condition) return;
	failures.push(`${code}: ${message}`);
};

const verifyCommonResult = (code, result) => {
	check(code, typeof result.apiZipCode === 'string', 'apiZipCodeが文字列ではない');
	check(code, typeof result.prefName === 'string' && result.prefName !== '', 'prefNameが空');
	check(code, typeof result.cityName === 'string' && result.cityName !== '', 'cityNameが空');
	check(code, typeof result.address === 'string' && result.address !== '', 'addressが空');
	for (const key of RAW_EXTRA_KEYS) {
		check(code, key in result, `追加キー${key}がない`);
		check(code, result[key] !== undefined, `追加キー${key}がundefined`);
	}
};

const runCase = async (code, kind) => {
	const result = await search(code);
	await sleep(200);
	if (MULTI_CANDIDATE_ZIP_CODES.has(code)) {
		check(code, !!result.error, '複数候補エラーを期待したが成功した');
		check(
			code,
			typeof result.error === 'string' && result.error.includes('複数'),
			`複数候補エラーの文言が想定外: ${result.error}`
		);
		if (!failures.some((f) => f.startsWith(`${code}:`))) passed++;
		console.log(`EXPECTED-ERROR ${code} (${kind}): ${result.error}`);
		return;
	}
	if (result.error) {
		failures.push(`${code}: ${result.error}`);
		console.log(`FAIL ${code} (${kind}): ${result.error}`);
		return;
	}
	verifyCommonResult(code, result);
	if (kind === 'biz') {
		check(code, typeof result.bizName === 'string' && result.bizName !== '', 'bizNameが空');
		check(code, result.bizKana !== null, 'bizKanaがnull');
	}
	if (kind === 'digital') {
		check(code, result.dgaCode !== null, 'dgaCodeがnull');
	}
	if (failures.some((f) => f.startsWith(`${code}:`))) {
		console.log(`FAIL ${code} (${kind})`);
	} else {
		passed++;
		console.log(`PASS ${code} (${kind}): ${result.prefName}${result.cityName}`);
	}
};

(async () => {
	const digitalAddresses = process.argv.slice(2);
	console.log(
		`通常${NORMAL_ZIP_CODES.length}件（複数候補期待${MULTI_CANDIDATE_ZIP_CODES.size}件を含む）・事業所${BIZ_ZIP_CODES.length}件・デジタルアドレス${digitalAddresses.length}件`
	);
	for (const code of NORMAL_ZIP_CODES) await runCase(code, 'normal');
	for (const code of BIZ_ZIP_CODES) await runCase(code, 'biz');
	for (const code of digitalAddresses) await runCase(code, 'digital');
	if (digitalAddresses.length === 0) {
		console.log('SKIP: デジタルアドレスは引数未指定のため未実行');
	}
	console.log(`\n結果: PASS ${passed} / FAIL ${failures.length}`);
	if (failures.length) {
		for (const failure of failures) console.error('FAIL:', failure);
		process.exitCode = 1;
	}
})();
