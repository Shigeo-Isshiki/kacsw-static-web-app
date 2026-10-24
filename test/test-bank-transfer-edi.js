const assert = require('assert');

global.window = global;
require('../src/bank-transfer.js');
const BANK = global.BANK;

BANK.getBank = (code, callback) =>
	setTimeout(() => callback({ bankCode: code, bankKana: 'ﾃｽﾄｷﾞﾝｺｳ' }), 0);
BANK.getBranch = (bankCode, code, callback) =>
	setTimeout(() => callback({ branchCode: code, branchKana: 'ﾎﾝﾃﾝ' }), 0);

const header = {
	typeCode: '21',
	requesterCode: '12345',
	requesterName: 'ﾃｽﾄｶｲｼｬ',
	tradeDate: '20261024',
	fromBankNo: '0001',
	fromBranchNo: '001',
	depositType: '普通',
	accountNumber: '1234567',
};
const record = {
	toBankNo: '0005',
	toBranchNo: '123',
	toAccountType: '普通',
	toAccountNumber: '7654321',
	amount: 1000,
	customerName: 'ﾔﾏﾀﾞﾀﾛｳ',
	employeeCode1: '123',
	employeeCode2: '456',
};
const callbackCounts = [];
const invoke = (fn) =>
	new Promise((resolve) => {
		const counter = { calls: 0 };
		callbackCounts.push(counter);
		fn((result) => {
			counter.calls++;
			resolve(result);
		});
	});
const generateRecords = (records, fromBankNo, transferType) =>
	invoke((callback) => {
		if (transferType === undefined) BANK.generateDataRecords(records, fromBankNo, callback);
		else BANK.generateDataRecords(records, fromBankNo, { transferType }, callback);
	});
const assertFailure = (result) => {
	assert.ok(result.error, '失敗時には error があること');
	assert.strictEqual(result.message, result.error, '既存契約の日本語 message があること');
	for (const key of ['success', 'records', 'data', 'content', 'parts']) {
		assert.ok(!Object.hasOwn(result, key), `失敗時に ${key} を返さないこと`);
	}
};
const assertDataError = (result, index, message) => {
	assertFailure(result);
	assert.strictEqual(result.index, index);
	assert.strictEqual(result.error, '例外: ' + message);
};

const run = async () => {
	const validCases = [
		['TEST-123', 'TEST-123'.padEnd(20)],
		['（Ａ）カナ１２３', '(A)ｶﾅ123'.padEnd(20)],
		['A'.repeat(20), 'A'.repeat(20)],
		['A'.repeat(21), 'A'.repeat(20)],
		[' ｶﾞ ', 'ｶﾞ'.padEnd(20)],
		['', ' '.repeat(20)],
		['　 ', ' '.repeat(20)],
		[undefined, ' '.repeat(20)],
		[null, ' '.repeat(20)],
	];
	for (const fromBankNo of ['0001', '9900']) {
		const base = { ...record, toBankNo: fromBankNo === '9900' ? '9900' : '0005' };
		for (const [ediInfo, expected] of validCases) {
			const result = await generateRecords([{ ...base, ediInfo }], fromBankNo);
			assert.strictEqual(result.success, true);
			const line = result.records;
			assert.strictEqual(line.length, 120);
			assert.ok(/^[\x20-\x7e\uff61-\uff9f]+$/.test(line), '全フィールドがSJISで1文字1バイト');
			assert.strictEqual(line.slice(91, 111), expected);
			assert.strictEqual(line.slice(111), '7Y' + ' '.repeat(7));
		}
	}
	console.log(
		'PASS: EDI normal/empty fields remain 20 bytes in 120-byte records (both bank paths)'
	);

	for (const ediInfo of ['A,B', 'A，B', 'A、B', '山田', 'A😀', 'A'.repeat(20) + ',']) {
		let normalizationError;
		assert.throws(
			() => BANK.normalizeEdiInfo(ediInfo),
			(error) => {
				normalizationError = error.message;
				return true;
			}
		);
		for (const fromBankNo of ['0001', '9900']) {
			const base = { ...record, toBankNo: fromBankNo === '9900' ? '9900' : '0005' };
			for (const index of [0, 1, 2]) {
				const records = [base, base, base].map((r, i) => ({
					...r,
					ediInfo: i === index ? ediInfo : 'VALID',
				}));
				const result = await generateRecords(records, fromBankNo, '21');
				assertDataError(result, index, normalizationError);
			}
		}

		const records = [
			{ ...record, ediInfo: 'VALID' },
			{ ...record, ediInfo },
		];
		const callbackResult = await invoke((callback) =>
			BANK.generateZenginData(header, records, callback)
		);
		const asyncResult = await BANK.generateZenginDataAsync(header, records);
		for (const result of [callbackResult, asyncResult]) {
			assertFailure(result);
			assert.strictEqual(result.error, 'データレコードの生成に失敗しました');
			assertDataError(result.detail, 1, normalizationError);
		}
		assert.deepStrictEqual(asyncResult, callbackResult);
	}
	console.log(
		'PASS: rejected EDI aborts all APIs without raw/partial output; error and index preserved'
	);

	for (const typeCode of ['11', '12', '給与振込', '賞与振込']) {
		const records = [{ ...record, ediInfo: '山田,A' }];
		const result = await BANK.generateZenginDataAsync({ ...header, typeCode }, records);
		const withoutEdi = await BANK.generateZenginDataAsync({ ...header, typeCode }, [{ ...record }]);
		assert.strictEqual(result.success, true);
		assert.deepStrictEqual(result, withoutEdi, 'EDIは給与・賞与では無視されること');
		assert.strictEqual(result.parts.data.slice(91, 113), '00000001230000000456  ');
		assert.ok(result.content.split('\r\n').every((line) => line.length === 120));
	}
	console.log(
		'PASS: payroll/bonus ignore invalid EDI and preserve employee fields and record layout'
	);

	const total = await BANK.generateZenginDataAsync(header, [{ ...record, ediInfo: 'TEST' }]);
	assert.strictEqual(total.success, true);
	assert.strictEqual(total.parts.data.slice(91, 113), 'TEST'.padEnd(20) + '7Y');
	assert.strictEqual(total.content.split('\r\n').length, 4);
	assert.ok(total.content.split('\r\n').every((line) => line.length === 120));
	assert.ok(
		callbackCounts.every(({ calls }) => calls === 1),
		'callbackは一度だけ呼ばれること'
	);
	console.log(
		'PASS: valid total transfer preserves complete 120-byte CRLF records; callbacks called once'
	);
};

run().catch((error) => {
	console.error('FAIL: bank-transfer EDI regression', error);
	process.exitCode = 1;
});
