const assert = require('assert');

module.exports = async (BANK) => {
  let failures = 0;

  const run = (name, fn) => {
    try {
      fn();
      console.log(`PASS: ${name}`);
    } catch (e) {
      failures++;
      console.error(`FAIL: ${name}`, e && e.message ? e.message : e);
    }
  };

  const callGen = (records, fromBankNo) =>
    new Promise((resolve) => {
      try {
        BANK.generateDataRecords(records, fromBankNo || '', (res) => resolve(res));
      } catch (e) {
        resolve({ error: String(e) });
      }
    });

  // helper to build expected padded strings
  const pad = (s, len) => {
    const str = String(s || '');
    return str + ' '.repeat(Math.max(0, len - [...str].length));
  };

  run('generateDataRecords: field positions and contents (non-9900)', async () => {
    const rec = {
      toBankNo: '0001',
      toBranchNo: '002',
      toAccountType: '1',
      toAccountNumber: '1234',
      amount: 123,
      customerName: 'ABC',
      ediInfo: 'EDICODE',
    };
    const res = await callGen([rec], '0001');
    if (res && res.error) throw new Error('expected success but got error: ' + JSON.stringify(res));
  const line = res.records.split(/\r?\n/)[0];
    if (!line || typeof line !== 'string') throw new Error('no record string returned');

    // slices based on spec
    const dt = line.substring(0, 1); // dataType
    const toBankNo = line.substring(1, 5);
    const toBankName = line.substring(5, 20);
    const toBranchNo = line.substring(20, 23);
    const toBranchName = line.substring(23, 38);
    const clearing = line.substring(38, 42);
    const dep = line.substring(42, 43);
    const acct = line.substring(43, 50);
    const cust = line.substring(50, 80);
    const amt = line.substring(80, 90);
    const newCode = line.substring(90, 91);
    const edi = line.substring(91, 111);
    const specify = line.substring(111, 112);
    const ident = line.substring(112, 113);
    const dummy = line.substring(113, 120);

    assert.strictEqual(dt, '2');
    assert.strictEqual(toBankNo, '0001');
    // bank/branch kana from stub is 'ﾃｽﾄ' -> padded to 15
    assert.strictEqual(toBankName, pad('ﾃｽﾄ', 15));
    assert.strictEqual(toBranchNo, '002');
    assert.strictEqual(toBranchName, pad('ﾃｽﾄ', 15));
    assert.strictEqual(clearing, ' '.repeat(4));
    assert.strictEqual(dep, '1');
    assert.strictEqual(acct, '0001234');
    assert.strictEqual(cust, pad('ABC', 30));
    assert.strictEqual(amt, '0000000123');
    assert.strictEqual(newCode, '1');
    assert.strictEqual(edi, pad('EDICODE', 20));
    assert.strictEqual(specify, '7');
    assert.strictEqual(ident, 'Y');
    assert.strictEqual(dummy, ' '.repeat(7));
  });

  run('generateDataRecords: yucho-yucho branch name empty (15 spaces)', async () => {
    const rec = {
      toBankNo: '9900',
      toBranchNo: '001',
      toAccountType: '1',
      toAccountNumber: '1234567',
      amount: 1000,
      customerName: 'ABC',
      ediInfo: 'EDIX',
    };
    const res = await callGen([rec], '9900');
    if (res && res.error) throw new Error('expected success but got error: ' + JSON.stringify(res));
  const line = res.records.split(/\r?\n/)[0];
    const toBranchName = line.substring(23, 38);
    assert.strictEqual(toBranchName, ' '.repeat(15));
  });

  run('generateDataRecords: customer name truncation (ASCII boundary)', async () => {
    const longName = 'A'.repeat(31);
    const rec = {
      toBankNo: '0001',
      toBranchNo: '002',
      toAccountType: '1',
      toAccountNumber: '1234567',
      amount: 1000,
      customerName: longName,
      ediInfo: 'EDIX',
    };
    const res = await callGen([rec], '0001');
    if (res && res.error) throw new Error('expected success but got error: ' + JSON.stringify(res));
  const line = res.records.split(/\r?\n/)[0];
    const cust = line.substring(50, 80);
    // should equal first 30 chars of longName
    assert.strictEqual(cust, longName.substring(0, 30));
  });

  run('generateDataRecords: EDI truncation to 20 bytes', async () => {
    const ediLong = 'E'.repeat(25);
    const rec = {
      toBankNo: '0001',
      toBranchNo: '002',
      toAccountType: '1',
      toAccountNumber: '1234567',
      amount: 1000,
      customerName: 'ABC',
      ediInfo: ediLong,
    };
  const res = await callGen([rec], '0001');
    if (res && res.error) throw new Error('expected success but got error: ' + JSON.stringify(res));
  const line = res.records.split(/\r?\n/)[0];
    const edi = line.substring(91, 111);
    assert.strictEqual(edi, ediLong.substring(0, 20));
  });

  run('generateDataRecords: amount overflow (11+ digits) leads to skipped record', async () => {
    const rec = {
      toBankNo: '0001',
      toBranchNo: '002',
      toAccountType: '1',
      toAccountNumber: '1234567',
      amount: 123456789012, // 12 digits
      customerName: 'ABC',
      ediInfo: 'EDIX',
    };
    const res = await callGen([rec], '0001');
    // fail-fast: expect an error to be returned immediately
    assert(res && res.error, 'expected an error for amount overflow');
    assert.strictEqual(String(res.error).indexOf('10桁') !== -1, true, 'error message should mention 10桁');
  });

  return failures;
};
