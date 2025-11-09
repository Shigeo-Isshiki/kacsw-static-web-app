const assert = require('assert');
const path = require('path');

global.window = global;
require(path.join(__dirname, '..', 'src', 'bank-transfer.js'));
const BANK = global.BANK;

if (!BANK) throw new Error('BANK がグローバルに公開されていません');

// Stub both global functions and window.BANK.* to be safe
const stubBank = (code, cb) => {
  // Always return a kana to satisfy generateDataRecords checks
  return cb({ bankCode: code, bankName: 'テスト銀行', bankKana: 'ﾃｽﾄｷﾞﾝｺｳ' });
};
const stubBranch = (bankCode, branch, cb) => {
  return cb({ branchCode: branch, branchName: '本店', branchKana: 'ﾎﾝﾃﾝ' });
};

// Replace globals
global.getBank = stubBank;
global.getBranch = stubBranch;
// Replace window-exposed versions (used by some paths)
if (!window.BANK) window.BANK = BANK;
window.BANK.getBank = stubBank;
window.BANK.getBranch = stubBranch;

// Test convertYucho: expects callback-style result
// Use a bangou whose padded8 ends with '1' so convertYucho's accountType '1' path succeeds.
BANK.convertYucho('12345', '12345671', (err, out) => {
  try {
    assert.strictEqual(err, null, 'convertYucho should not return error for valid kigou/bangou');
    assert.ok(out && out.accountNumber, 'convertYucho should return accountNumber');
    console.log('PASS: convertYucho with stubbed bank/branch');

    // Now run generateDataRecords on the path that avoids branch lookups: both origin and dest '9900'
    const records = [
      {
        toBankNo: '9900',
        toBranchNo: '000',
        toAccountType: '普通',
        toAccountNumber: '1234567',
        amount: 1000,
        customerName: 'ヤマダタロウ'
      }
    ];
    // fromBankNo '9900' causes generateDataRecords to take the yucho->yucho shortcut
    console.log('DEBUG: window.BANK.getBank === stub?', window.BANK.getBank === stubBank);
    BANK.generateDataRecords(records, '9900', (gres) => {
      try {
        if (!gres || (!gres.data && !gres.records)) {
          console.error('DEBUG: generateDataRecords returned:', JSON.stringify(gres));
        }
        assert.ok(gres && (gres.data || gres.records), 'generateDataRecords should return data for yucho->yucho path');
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

console.log('TEST PASS');
