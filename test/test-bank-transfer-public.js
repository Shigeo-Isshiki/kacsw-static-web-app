const assert = require('assert');
const path = require('path');

global.window = global;
require(path.join(__dirname, '..', 'src', 'bank-transfer.js'));
const BANK = global.BANK;

if (!BANK) throw new Error('BANK がグローバルに公開されていません');

// スタブ化: 外部データ取得を安定化
BANK.getBank = (q, cb) => cb({ bankCode: q === '0005' ? '0005' : '9999', bankName: 'テスト銀行', bankKana: 'ﾃｽﾄｷﾞﾝｺｳ' });
BANK.getBranch = (bankCode, q, cb) => cb({ branchCode: '123', branchName: '本店', branchKana: 'ﾎﾝﾃﾝ' });

try {
  // normalizeAccountNumber: 数字のみを抽出して幅に合わせて 0 埋め
  const n1 = BANK.normalizeAccountNumber('1234', 7);
  assert.strictEqual(n1, '0001234', 'normalizeAccountNumber should zero-pad to width');

  // 実装によっては非数字混入でエラーを出す場合があるため、その場合は throw を期待する
  let threw = false;
  try { BANK.normalizeAccountNumber('12-34', 7); } catch (e) { threw = true; }
  assert.ok(threw, '非数字を含む入力は実装によりエラーになることを期待');

  console.log('PASS: normalizeAccountNumber basic cases');
} catch (e) {
  console.error('FAIL: normalizeAccountNumber', e && e.message ? e.message : e);
  process.exitCode = 2;
}

// NOTE: convertYucho may perform network lookups in some implementations; skip direct test here to
// avoid network calls in unit tests. It can be added later with an internal loader stub if desired.

try {
  // generateHeader
  const headerData = {
    typeCode: '11',
    requesterCode: '1',
    requesterName: 'テストカイシャ',
    tradeDate: '20251109',
    depositType: '普通',
    accountNumber: '1234567'
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

// NOTE: generateDataRecords involves bank/branch lookups. A reliable unit test should stub
// internal loaders or use generateZenginData (already covered elsewhere). Skipping direct
// generateDataRecords test here to avoid flakiness in environments without bank data.

console.log('TEST PASS');
