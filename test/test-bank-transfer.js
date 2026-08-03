const assert = require('assert');
const path = require('path');

// ブラウザ向け公開スタイルに合わせて global.window を設定してから読み込む
global.window = global;
require(path.join(__dirname, '..', 'src', 'bank-transfer.js'));
const BANK = global.BANK;

if (!BANK) throw new Error('BANK がグローバルに公開されていません');

// --- Helpers: default stubs to keep tests deterministic ---
const defaultStubBank = (q, cb) =>
	cb({ bankCode: q || '9999', bankName: 'テスト銀行', bankKana: 'ﾃｽﾄｷﾞﾝｺｳ' });
const defaultStubBranch = (bankCode, q, cb) =>
	cb({ branchCode: q || '000', branchName: '本店', branchKana: 'ﾎﾝﾃﾝ' });

// Install conservative defaults; individual tests may override these
BANK.getBank = defaultStubBank;
BANK.getBranch = defaultStubBranch;

// Also export global shims used by some code paths
global.getBank = defaultStubBank;
global.getBranch = defaultStubBranch;
if (!window.BANK) window.BANK = BANK;
window.BANK.getBank = defaultStubBank;
window.BANK.getBranch = defaultStubBranch;

// ---------------------- normalizeAccountNumber tests ----------------------
try {
	const a1 = BANK.normalizeAccountNumber('1234', 7);
	assert.strictEqual(a1, '0001234', '1234 -> 0001234');
	console.log('PASS: normalizeAccountNumber simple pad');
} catch (e) {
	console.error('FAIL: normalizeAccountNumber simple pad', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	const a2 = BANK.normalizeAccountNumber('１２３４', 7); // 全角数字
	assert.strictEqual(a2, '0001234', '全角数字を半角化してパディング');
	console.log('PASS: normalizeAccountNumber fullwidth digits');
} catch (e) {
	console.error('FAIL: normalizeAccountNumber fullwidth', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	let threw = false;
	try {
		BANK.normalizeAccountNumber('12-34', 7);
	} catch (e) {
		threw = true;
	}
	assert.ok(threw, 'ハイフン混入はエラーになること');
	console.log('PASS: normalizeAccountNumber rejects non-digit');
} catch (e) {
	console.error('FAIL: normalizeAccountNumber non-digit', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	let threw = false;
	try {
		BANK.normalizeAccountNumber('12345678', 7);
	} catch (e) {
		threw = true;
	}
	assert.ok(threw, '7桁を超えるとエラー');
	console.log('PASS: normalizeAccountNumber rejects too long');
} catch (e) {
	console.error('FAIL: normalizeAccountNumber too long', e && e.message ? e.message : e);
	process.exitCode = 2;
}

// ---------------------- normalizePayeeName tests ----------------------
try {
	const out = BANK.normalizePayeeName('ヤマダタロウ');
	assert.strictEqual(typeof out, 'string', '戻り値は文字列であること');
	assert.ok(out.length > 0, '戻り値は空文字ではないこと');
	assert.notStrictEqual(out, 'ヤマダタロウ');
	console.log('PASS: normalizePayeeName basic kana -> halfwidth conversion');
} catch (e) {
	console.error('FAIL: normalizePayeeName basic kana case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	let threw = false;
	try {
		BANK.normalizePayeeName('yamada');
	} catch (e) {
		threw = true;
	}
	assert.ok(threw, 'ASCII 小文字を含むとエラーを投げること');
	console.log('PASS: normalizePayeeName rejects lowercase ascii');
} catch (e) {
	console.error('FAIL: normalizePayeeName lowercase rejection', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	let threw = false;
	try {
		BANK.normalizePayeeName('山田 太郎');
	} catch (e) {
		threw = true;
	}
	assert.ok(threw, '漢字を含む入力はエラーになる（期待）');
	console.log('PASS: normalizePayeeName rejects kanji-containing input');
} catch (e) {
	console.error('FAIL: normalizePayeeName kanji case', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	const out = BANK.normalizePayeeName('か）ねっとぷろてくしょんず');
	assert.strictEqual(typeof out, 'string', '戻り値は文字列であること');
	assert.ok(out.length > 0, '戻り値は空文字ではないこと');
	assert.ok(/\)/.test(out), '全角閉じ括弧は半角閉じ括弧として扱われること');
	console.log('PASS: normalizePayeeName accepts fullwidth closing parenthesis after normalization');
} catch (e) {
	console.error(
		'FAIL: normalizePayeeName fullwidth closing parenthesis normalization',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

try {
	let threw = false;
	try {
		BANK.normalizePayeeName('ｶ)ﾈｯﾄ☆');
	} catch (e) {
		threw = true;
		assert.ok(
			String(e && e.message ? e.message : e).includes('☆'),
			'許容外文字は正規化後ではなく元の文字で表示されること'
		);
	}
	assert.ok(threw, '許容外文字を含むとエラーになること');
	console.log('PASS: normalizePayeeName reports invalid original characters');
} catch (e) {
	console.error(
		'FAIL: normalizePayeeName reports invalid originals',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

// ---------------------- normalizePayeeName skipAbbreviation test ----------------------
try {
	// 全てカタカナで入力すると、略語マップの半角カナキーにマッチして
	// 通常は略語置換が適用されるが、skipAbbreviation:true の場合は適用されないはず
	const src = 'カブシキガイシャテスト';
	const def = BANK.normalizePayeeName(src);
	const skipped = BANK.normalizePayeeName(src, { skipAbbreviation: true });
	assert.notStrictEqual(def, skipped, '略語適用時とスキップ時で出力が変わること');
	// デフォルトでは括弧が付与されるが、skipped には括弧が含まれていないことを確認
	assert.ok(/\(|\)/.test(def), 'デフォルトの出力には括弧が含まれていること');
	assert.ok(!/\(|\)/.test(skipped), 'skipAbbreviation 出力に括弧が含まれていないこと');
	console.log('PASS: normalizePayeeName skipAbbreviation disables abbreviation replacements');
} catch (e) {
	console.error('FAIL: normalizePayeeName skipAbbreviation', e && e.message ? e.message : e);
	process.exitCode = 2;
}

// ---------------------- normalizeEdiInfo tests ----------------------
try {
	const e1 = BANK.normalizeEdiInfo('TEST');
	assert.strictEqual(typeof e1, 'string');
	assert.ok(e1.length > 0, 'normalizeEdiInfo should return a non-empty string');
	console.log('PASS: normalizeEdiInfo basic allowed string');
} catch (e) {
	console.error('FAIL: normalizeEdiInfo basic', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	let threw = false;
	try {
		BANK.normalizeEdiInfo('A,B');
	} catch (e) {
		threw = true;
	}
	assert.ok(threw, 'コンマを含むとエラーになること');
	console.log('PASS: normalizeEdiInfo rejects comma');
} catch (e) {
	console.error('FAIL: normalizeEdiInfo comma', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	let threw = false;
	try {
		BANK.normalizeEdiInfo('山田');
	} catch (e) {
		threw = true;
	}
	assert.ok(threw, '漢字など許容外文字はエラーになること');
	console.log('PASS: normalizeEdiInfo rejects kanji');
} catch (e) {
	console.error('FAIL: normalizeEdiInfo kanji', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	const out = BANK.normalizeEdiInfo('（Ａ）', { padToBytes: false, bytes: 20 });
	assert.strictEqual(out, '(A)', '全角括弧と全角英字は半角化されること');
	console.log('PASS: normalizeEdiInfo normalizes fullwidth symbols to halfwidth');
} catch (e) {
	console.error(
		'FAIL: normalizeEdiInfo normalizes fullwidth symbols',
		e && e.message ? e.message : e
	);
	process.exitCode = 2;
}

// ---------------------- convertYucho & generateDataRecords (stubbed) ----------------------
try {
	const stubBank = (code, cb) =>
		cb({ bankCode: code, bankName: 'テスト銀行', bankKana: 'ﾃｽﾄｷﾞﾝｺｳ' });
	const stubBranch = (bankCode, branch, cb) =>
		cb({ branchCode: branch, branchName: '本店', branchKana: 'ﾎﾝﾃﾝ' });

	// Replace globals for this section to ensure predictable behavior
	global.getBank = stubBank;
	global.getBranch = stubBranch;
	window.BANK.getBank = stubBank;
	window.BANK.getBranch = stubBranch;

	// Test convertYucho
	BANK.convertYucho('12345', '12345671', (err, out) => {
		try {
			assert.strictEqual(err, null, 'convertYucho should not return error for valid kigou/bangou');
			assert.ok(out && typeof out === 'object', 'convertYucho should return an object');
			// Minimum presence checks for expected fields
			const required = [
				'yuchoKigou',
				'yuchoBangou',
				'bankCode',
				'bankName',
				'bankKana',
				'branchCode',
				'branchName',
				'branchKana',
				'accountType',
				'accountNumber',
			];
			for (const k of required) {
				assert.ok(
					out && out[k] != null && out[k] !== '',
					`convertYucho should include non-empty field: ${k}`
				);
			}
			console.log('PASS: convertYucho with stubbed bank/branch (fields present)');

			// generateDataRecords yucho->yucho path
			const records = [
				{
					toBankNo: '9900',
					toBranchNo: '000',
					toAccountType: '普通',
					toAccountNumber: '1234567',
					amount: 1000,
					customerName: 'ヤマダタロウ',
				},
			];

			BANK.generateDataRecords(records, '9900', (gres) => {
				try {
					assert.ok(
						gres && (gres.data || gres.records),
						'generateDataRecords should return data for yucho->yucho path'
					);
					const payload = gres.data || gres.records || '';
					const lines = payload.split('\r\n').filter(Boolean);
					assert.strictEqual(lines.length, 1, 'should produce one data line');
					assert.strictEqual(lines[0].length, 120, 'data line should be 120 characters long');
					console.log('PASS: generateDataRecords yucho->yucho path');
				} catch (e) {
					console.error('FAIL: generateDataRecords', e && e.message ? e.message : e);
					process.exitCode = 2;
				}
			});
		} catch (e) {
			console.error('FAIL: convertYucho', e && e.message ? e.message : e);
			process.exitCode = 2;
		}
	});
} catch (e) {
	console.error('FAIL: convertYucho/test setup', e && e.message ? e.message : e);
	process.exitCode = 2;
}

// ---------------------- generateZenginData integration test ----------------------
try {
	// Override stubs to return a realistic bank for this integration test
	BANK.getBank = (q, cb) => cb({ bankCode: '0005', bankName: 'みずほ銀行', bankKana: 'ﾐｽﾞﾎｷﾞﾝｺｳ' });
	BANK.getBranch = (bankCode, q, cb) =>
		cb({ branchCode: '123', branchName: '本店', branchKana: 'ﾎﾝﾃﾝ' });

	const headerData = {
		typeCode: '11',
		requesterCode: '12345',
		requesterName: 'テストカイシャ',
		tradeDate: '20251109',
		fromBankNo: '0001',
		fromBranchNo: '001',
		depositType: '普通',
		accountNumber: '1234567',
	};

	const records = [
		{
			toBankNo: '0005',
			toBranchNo: '123',
			toAccountType: '普通',
			toAccountNumber: '1234567',
			amount: 1000,
			customerName: 'ヤマダ　タロウ',
		},
	];

	BANK.generateZenginData(headerData, records, (res) => {
		try {
			assert.ok(res && res.success, 'generateZenginData は success:true を返すこと');
			assert.strictEqual(typeof res.content, 'string', 'content は文字列であること');
			assert.ok(
				res.parts && res.parts.header && res.parts.data,
				'parts に header と data が含まれること'
			);
			assert.strictEqual(
				res.parts.header.length,
				120,
				'header は 120 文字列長であること（実装では 120 バイト固定）'
			);
			console.log('PASS: generateZenginData integration test');
		} catch (e) {
			console.error('FAIL: generateZenginData integration test', e && e.message ? e.message : e);
			process.exitCode = 2;
		}
	});
} catch (e) {
	console.error('FAIL: generateZenginData invocation', e && e.message ? e.message : e);
	process.exitCode = 2;
}

// ---------------------- generateHeader smoke test ----------------------
try {
	const headerData = {
		typeCode: '11',
		requesterCode: '1',
		requesterName: 'テストカイシャ',
		tradeDate: '20251109',
		depositType: '普通',
		accountNumber: '1234567',
	};
	BANK.generateHeader(headerData, (res) => {
		try {
			assert.ok(res && res.header, 'generateHeader should return header');
			assert.strictEqual(res.header.length, 120, 'header should be 120 characters long');
			console.log('PASS: generateHeader');
		} catch (err) {
			console.error('FAIL: generateHeader', err && err.message ? err.message : err);
			process.exitCode = 2;
		}
	});
} catch (e) {
	console.error('FAIL: generateHeader invocation', e && e.message ? e.message : e);
	process.exitCode = 2;
}

// ---------------------- parseZenginFile test ----------------------
try {
	const originalDocument = global.document;
	const originalAddEventListener = global.addEventListener;
	const originalRemoveEventListener = global.removeEventListener;

	const makeFixedLine = () => new Array(120).fill(' ');
	const put = (arr, start, text) => {
		for (let i = 0; i < String(text).length; i++) arr[start + i] = String(text).charAt(i);
	};
	const toLine = (arr) => arr.join('');

	const headerArr = makeFixedLine();
	put(headerArr, 0, '1');
	put(headerArr, 1, '11');
	put(headerArr, 3, '0');
	put(headerArr, 4, '1234567890');
	put(headerArr, 14, 'ﾃｽﾄｲﾗｲﾆﾝ');
	put(headerArr, 54, '1108');
	put(headerArr, 58, '0001');
	put(headerArr, 62, 'ﾃｽﾄｷﾞﾝｺｳ');
	put(headerArr, 77, '001');
	put(headerArr, 80, 'ﾎﾝﾃﾝ');
	put(headerArr, 95, '1');
	put(headerArr, 96, '1234567');
	const headerLine = toLine(headerArr);

	const dataArr = makeFixedLine();
	put(dataArr, 0, '2');
	put(dataArr, 1, '0005');
	put(dataArr, 5, 'ﾐｽﾞﾎｷﾞﾝｺｳ');
	put(dataArr, 20, '123');
	put(dataArr, 23, 'ｼﾌﾞﾔ');
	put(dataArr, 42, '1');
	put(dataArr, 43, '7654321');
	put(dataArr, 50, 'ﾔﾏﾀﾞﾀﾛｳ');
	put(dataArr, 80, '0000001000');
	put(dataArr, 91, 'EDI-TEST');
	put(dataArr, 113, '2');
	const dataLine = toLine(dataArr);

	const trailerArr = makeFixedLine();
	put(trailerArr, 0, '8');
	put(trailerArr, 19, '000001');
	put(trailerArr, 25, '000000001000');
	put(trailerArr, 37, '000001');
	put(trailerArr, 43, '000000000500');
	const trailerLine = toLine(trailerArr);

	const content = headerLine + '\r\n' + dataLine + '\r\n' + trailerLine;
	const fakeFile = {
		arrayBuffer: async () => new TextEncoder().encode(content).buffer,
	};

	const body = {
		appendChild(node) {
			node.parentNode = this;
		},
		removeChild(node) {
			node.parentNode = null;
		},
	};

	global.document = {
		body,
		documentElement: body,
		createElement(tag) {
			assert.strictEqual(tag, 'input', 'file picker should create input element');
			const listeners = {};
			return {
				type: '',
				accept: '',
				style: {},
				files: null,
				parentNode: null,
				addEventListener(name, handler) {
					listeners[name] = handler;
				},
				click() {
					this.files = [fakeFile];
					if (listeners.change) listeners.change();
				},
			};
		},
	};
	global.addEventListener = () => {};
	global.removeEventListener = () => {};

	BANK.parseZenginFile({ encoding: 'UTF8', strict: true })
		.then((res) => {
			try {
				assert.ok(res && res.success, 'parseZenginFile should resolve success:true');
				assert.ok(res.headerData, 'headerData should exist');
				assert.ok(res.trailerData, 'trailerData should exist');
				assert.strictEqual(res.headerData.typeCode, '11');
				assert.strictEqual(res.headerData.requesterCode, '1234567890');
				assert.strictEqual(res.headerData.fromBankNo, '0001');
				assert.strictEqual(res.headerData.depositType, '1');
				assert.strictEqual(res.headerData.depositTypeLabel, '普通');
				assert.strictEqual(res.trailerData.processedCount, 1);
				assert.strictEqual(res.trailerData.processedAmount, 1000);
				assert.strictEqual(res.trailerData.failedCount, 1);
				assert.strictEqual(res.trailerData.failedAmount, 500);
				assert.ok(Array.isArray(res.records), 'records should be an array');
				assert.strictEqual(res.records.length, 1, 'one data record should be parsed');
				assert.strictEqual(res.records[0].toBankNo, '0005');
				assert.strictEqual(res.records[0].toBranchNo, '123');
				assert.strictEqual(res.records[0].toAccountType, '普通');
				assert.strictEqual(res.records[0].toAccountNumber, '7654321');
				assert.strictEqual(res.records[0].amount, 1000);
				assert.strictEqual(res.records[0].customerKana, 'ﾔﾏﾀﾞﾀﾛｳ');
				assert.strictEqual(res.records[0].ediInfo.trim(), 'EDI-TEST');
				assert.strictEqual(res.records[0].processResultCode, '2');
				assert.strictEqual(res.records[0].processResultLabel, '氏名相違');
				assert.strictEqual(res.meta.detectedEncoding, 'UTF8');
				console.log('PASS: parseZenginFile parses header and data records');
			} catch (e) {
				console.error('FAIL: parseZenginFile assertions', e && e.message ? e.message : e);
				process.exitCode = 2;
			} finally {
				global.document = originalDocument;
				global.addEventListener = originalAddEventListener;
				global.removeEventListener = originalRemoveEventListener;
			}
		})
		.catch((e) => {
			console.error('FAIL: parseZenginFile invocation', e && e.message ? e.message : e);
			process.exitCode = 2;
			global.document = originalDocument;
			global.addEventListener = originalAddEventListener;
			global.removeEventListener = originalRemoveEventListener;
		});
} catch (e) {
	console.error('FAIL: parseZenginFile setup', e && e.message ? e.message : e);
	process.exitCode = 2;
}

console.log('ALL BANK-TRANSFER TESTS INVOKED');
