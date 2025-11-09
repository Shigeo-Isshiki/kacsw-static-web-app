const assert = require('assert');
const path = require('path');

// ブラウザ向け公開スタイルに合わせて global.window を設定してから読み込む
global.window = global;
require(path.join(__dirname, '..', 'src', 'bank-transfer.js'));
const BANK = global.BANK;

if (!BANK) throw new Error('BANK がグローバルに公開されていません');

// 外部銀行取得をスタブ化して再現性を確保
BANK.getBank = (q, cb) => cb({ bankCode: '0005', bankName: 'みずほ銀行', bankKana: 'ﾐｽﾞﾎｷﾞﾝｺｳ' });
BANK.getBranch = (bankCode, q, cb) => cb({ branchCode: '123', branchName: '本店', branchKana: 'ﾎﾝﾃﾝ' });

// ヘッダと 1 レコードで generateZenginData を実行
const headerData = {
  typeCode: '11',
  requesterCode: '12345',
  requesterName: 'テストカイシャ',
  tradeDate: '20251109',
  fromBankNo: '0001',
  fromBranchNo: '001',
  depositType: '普通',
  accountNumber: '1234567'
};

// customerName はカタカナにしてエラーを避ける
const records = [
  {
    toBankNo: '0005',
    toBranchNo: '123',
    toAccountType: '普通',
    toAccountNumber: '1234567',
    amount: 1000,
    customerName: 'ヤマダ　タロウ'
  }
];

// generateZenginData はコールバック式
BANK.generateZenginData(headerData, records, (res) => {
  try {
    assert.ok(res && res.success, 'generateZenginData は success:true を返すこと');
    assert.strictEqual(typeof res.content, 'string', 'content は文字列であること');
    assert.ok(res.parts && res.parts.header && res.parts.data, 'parts に header と data が含まれること');
    // header 部分は 120 バイト相当の 文字列長を期待（厳密な SJIS バイト長ではないが形だけ確認）
    assert.strictEqual(res.parts.header.length, 120, 'header は 120 文字列長であること（実装では 120 バイト固定）');
    console.log('TEST PASS');
  } catch (e) {
    console.error('FAIL: generateZenginData integration test', e && e.message ? e.message : e);
    process.exitCode = 2;
  }
});
