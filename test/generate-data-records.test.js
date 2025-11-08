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

  // local SJIS-equivalent byte length helper (same heuristic as library)
  const sjisByteLength = (s) => {
    if (s == null) return 0;
    const str = String(s);
    let len = 0;
    for (const ch of str) {
      const cp = ch.codePointAt(0);
      if (cp <= 0x7f) len += 1;
      else if (cp >= 0xff61 && cp <= 0xff9f) len += 1;
      else len += 2;
    }
    return len;
  };

  // helper to call generateDataRecords as a promise
  const callGen = (records, fromBankNo) =>
    new Promise((resolve) => {
      try {
        BANK.generateDataRecords(records, fromBankNo || '', (res) => resolve(res));
      } catch (e) {
        resolve({ error: String(e) });
      }
    });

  // Test 1: originBankNo = '9900' (yucho), destinations include 9900 and non-9900
  run('generateDataRecords: origin 9900 with mixed destinations', async () => {
    const records = [
      {
        toBankNo: '9900',
        toBranchNo: '001',
        toAccountType: '1',
        toAccountNumber: '1234567',
        amount: 1000,
        customerName: 'ヤマダタロウ',
        ediInfo: 'EDICODE1',
        reference: 'memo1',
      },
      {
        toBankNo: '0001',
        toBranchNo: '002',
        toAccountType: '1',
        toAccountNumber: '7654321',
        amount: 2000,
        customerName: 'スズキイチロウ',
        ediInfo: 'EDICODE2',
        reference: 'memo2',
      },
    ];
    const res = await callGen(records, '9900');
    if (res && res.error) throw new Error('expected success but got error: ' + JSON.stringify(res));
    assert(res && res.success, 'expected success true');
    if (typeof res.records !== 'string') throw new Error('records should be a single string');
    const lines = res.records.split(/\r?\n/);
    assert.strictEqual(lines.length, 2, 'should produce two records');
    for (const s of lines) {
      if (typeof s !== 'string') throw new Error('record not a string');
      const len = sjisByteLength(s);
      assert.strictEqual(len, 120, 'each record must be 120 bytes');
    }
  });

  // Test 2: originBankNo != '9900' (normal origin)
  run('generateDataRecords: origin non-9900 with normal destinations', async () => {
    const records = [
      {
        toBankNo: '0002',
        toBranchNo: '010',
        toAccountType: '1',
        toAccountNumber: '0001234',
        amount: 500,
        customerName: 'タナカハナコ',
        ediInfo: 'EDI3',
        reference: 'memo3',
      },
      {
        toBankNo: '0003',
        toBranchNo: '011',
        toAccountType: '2',
        toAccountNumber: '0012345',
        amount: 1500,
        customerName: 'サトウジロウ',
        ediInfo: 'EDI4',
        reference: 'memo4',
      },
    ];
    const res = await callGen(records, '0001');
    if (res && res.error) throw new Error('expected success but got error: ' + JSON.stringify(res));
    assert(res && res.success, 'expected success true');
    if (typeof res.records !== 'string') throw new Error('records should be a single string');
    const lines = res.records.split(/\r?\n/);
    assert.strictEqual(lines.length, 2, 'should produce two records');
    for (const s of lines) {
      const len = sjisByteLength(s);
      assert.strictEqual(len, 120, 'each record must be 120 bytes');
    }
  });

  // Test 3: fail-fast on missing toAccountType
  run('generateDataRecords: fail-fast on missing toAccountType', async () => {
    const records = [
      {
        toBankNo: '0002',
        toBranchNo: '010',
        // toAccountType missing
        toAccountNumber: '0001234',
        amount: 500,
        customerName: 'タナカハナコ',
        ediInfo: 'EDI3',
        reference: 'memo3',
      },
    ];
    const res = await callGen(records, '0001');
    if (!res || !res.error) throw new Error('expected error due to missing toAccountType');
    // expect structured error indicating missing field or message
    assert.ok(res.error && /預金種目/.test(res.error) || (res.message && /預金種目/.test(res.message)), 'error should mention 預金種目');
  });

  return failures;
};
