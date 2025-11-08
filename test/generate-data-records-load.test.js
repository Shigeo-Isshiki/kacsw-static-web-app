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

  // helper to call generateDataRecords as a promise
  const callGen = (records, fromBankNo) =>
    new Promise((resolve) => {
      try {
        BANK.generateDataRecords(records, fromBankNo || '', (res) => resolve(res));
      } catch (e) {
        resolve({ error: String(e) });
      }
    });

  // local SJIS-equivalent byte length helper
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

  run('generateDataRecords: large batch 1000 records performance', async () => {
    const N = 1000;
    const recs = new Array(N).fill(0).map((_, i) => {
      // alternate destination banks to trigger branch lookup and yucho behavior
      const toBankNo = i % 3 === 0 ? '9900' : String(100 + (i % 90)).padStart(4, '0');
      const toBranchNo = String((i % 200) + 1).padStart(3, '0');
      return {
        toBankNo,
        toBranchNo,
        toAccountType: i % 2 === 0 ? '1' : '2',
        toAccountNumber: String(1000000 + (i % 900000)).padStart(7, '0'),
        amount: 1000 + (i % 5000),
  // use fullwidth katakana for names to ensure normalizePayeeName accepts them
  customerName: 'ヤマダ' + String(i % 1000),
        ediInfo: 'EDI' + String(i),
        reference: 'ref' + String(i),
      };
    });

    const t0 = Date.now();
    const res = await callGen(recs, '0001');
    const dt = Date.now() - t0;
    console.log(`Large batch generation took ${dt} ms`);
    if (res && res.error) throw new Error('expected success but got error: ' + JSON.stringify(res));
    if (!res || !res.success) throw new Error('expected success true');
    if (typeof res.records !== 'string') throw new Error('records should be a single string');
    const lines = res.records.split(/\r?\n/);
    if (lines.length !== N) throw new Error(`expected ${N} records but got ${lines.length}`);
    // check a sample of records for correctness (not all for speed)
    for (let i = 0; i < N; i += 50) {
      const s = lines[i];
      if (typeof s !== 'string') throw new Error('record not string at index ' + i);
      const len = sjisByteLength(s);
      if (len !== 120) throw new Error(`record ${i} length ${len} != 120`);
    }
  });

  return failures;
};
