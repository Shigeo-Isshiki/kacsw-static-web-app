// Lightweight test runner for convertYucho
// - mocks window.BANK.getBank and getBranch to avoid network
// - verifies accountType 0/1 behavior and an invalid symbol case

const assert = require('assert');

// Provide a global window so src file can attach to it
global.window = {};
// Mock fetch to avoid network calls (the library uses fetch for getBank/getBranch)
global.fetch = (url, opts) => {
  // simple routing for banks/{code}.json and branches/{branch}.json
  const u = String(url || '');
  if (/\/banks\/(\d{4})\.json/.test(u)) {
    // bank payload
    return Promise.resolve({
      ok: true,
      json: async () => ({ code: '9900', name: 'ゆうちょ銀行', kana: 'ﾕｳﾁｮ', url: u, branches_url: u.replace(/banks\/9900.json$/, 'banks/9900/branches.json') }),
    });
  }
  const m = u.match(/\/banks\/(\d{4})\/branches\/(\d{3})\.json/);
  if (m) {
    const branchCode = m[2];
    return Promise.resolve({
      ok: true,
      json: async () => ({ code: branchCode, name: 'テスト支店', kana: 'ﾃｽﾄ' }),
    });
  }
  // fallback
  return Promise.resolve({ ok: true, json: async () => ({}) });
};

// Load the library (it will populate window.BANK)
require('../src/bank-transfer.js');

const BANK = global.window.BANK;
if (!BANK) {
  console.error('window.BANK not found after loading src/bank-transfer.js');
  process.exit(1);
}

// Stub network-dependent functions to deterministic results
BANK.getBank = (bankCode, cb) => {
  // single-arg style: pass bank object
  const out = { bankCode: String(bankCode).padStart(4, '0'), bankName: 'テスト銀行', bankKana: 'ﾃｽﾄ' };
  cb(out);
};

BANK.getBranch = (bankCode, branchCode, cb) => {
  const out = { branchCode: String(branchCode).padStart(3, '0'), branchName: 'テスト支店', branchKana: 'ﾃｽﾄ' };
  cb(out);
};

// Load additional unit tests for normalizePayeeName
const runNormalizePayeeTests = require('./normalize-payee.test.js');
// Load header tests
const runHeaderTests = require('./header.test.js');
// Load generateDataRecords tests
const runDataRecordsTests = require('./generate-data-records.test.js');
// Load generateDataRecords load test
const runDataRecordsLoadTests = require('./generate-data-records-load.test.js');
const runDataRecordsFieldsTests = require('./generate-data-records-fields.test.js');

// Helper to call convertYucho and await result
const callConvert = (kigou, bangou) =>
  new Promise((resolve) => {
    try {
      BANK.convertYucho(kigou, bangou, (res) => {
        resolve(res);
      });
    } catch (e) {
      resolve({ error: String(e) });
    }
  });

(async () => {
  let failures = 0;

  // Test case 1: accountType '0' (kigou 01234 -> branchCode 129)
  const res1 = await callConvert('01234', '123456');
  try {
    assert(!res1.error, 'expected success for case 1');
    assert.strictEqual(res1.branchCode, '129');
  assert.strictEqual(String(res1.accountType), '当座');
    assert.strictEqual(res1.accountNumber, '0123456');
    assert.strictEqual(res1.branchName, 'テスト支店');
    console.log('PASS: case 1 (accountType 0)');
  } catch (e) {
    failures++;
    console.error('FAIL: case 1', e.message || e);
  }

  // Test case 2: accountType '1' (kigou 11234 -> branchCode 128)
  // use 8-digit number with trailing 1
  const res2 = await callConvert('11234', '12345671');
  try {
    assert(!res2.error, 'expected success for case 2');
    assert.strictEqual(res2.branchCode, '128');
  assert.strictEqual(String(res2.accountType), '普通');
    assert.strictEqual(res2.accountNumber, '1234567');
    assert.strictEqual(res2.branchName, 'テスト支店');
    console.log('PASS: case 2 (accountType 1)');
  } catch (e) {
    failures++;
    console.error('FAIL: case 2', e.message || e);
  }

  // Test case 3: invalid symbol (too short)
  const res3 = await callConvert('123', '0000');
  try {
    assert(res3 && res3.error, 'expected error for invalid symbol');
    // Structured error assertions
    assert.strictEqual(res3.field, 'kigou', 'error.field should indicate kigou');
    assert.strictEqual(res3.code, 'kigou.not_5_digits', 'error.code should indicate not_5_digits');
    assert.ok(res3.message && /5桁/.test(res3.message), 'message should mention 5 digits');
    console.log('PASS: case 3 (invalid symbol, structured error)');
  } catch (e) {
    failures++;
    console.error('FAIL: case 3', e.message || e);
  }

  // Test case 4: missing bangou -> should indicate bangou field
  const res4 = await callConvert('01234', '');
  try {
    assert(res4 && res4.error, 'expected error for missing bangou');
    assert.strictEqual(res4.field, 'bangou', 'error.field should indicate bangou');
    assert.strictEqual(res4.code, 'bangou.empty', 'error.code should be bangou.empty');
    console.log('PASS: case 4 (missing bangou)');
  } catch (e) {
    failures++;
    console.error('FAIL: case 4', e.message || e);
  }

  // Test case 5: accountType '1' but last digit not 1 -> must_end_with_1
  const res5 = await callConvert('11234', '12345670');
  try {
    assert(res5 && res5.error, 'expected error for accountType 1 invalid tail');
    assert.strictEqual(res5.field, 'bangou', 'error.field should indicate bangou');
    assert.strictEqual(res5.code, 'bangou.must_end_with_1', 'error.code should indicate must_end_with_1');
    console.log('PASS: case 5 (accountType 1 tail invalid)');
  } catch (e) {
    failures++;
    console.error('FAIL: case 5', e.message || e);
  }

  // Test case 6: allowed half-width characters per Shift_JIS spec
  try {
  // Use normalizePayeeName: if allowed, it should return a string (possibly truncated) and not throw
  const r1 = (() => { try { return { ok: true, v: BANK.normalizePayeeName('A Z0-') }; } catch (e) { return { ok: false, e }; } })();
  const r2 = (() => { try { return { ok: true, v: BANK.normalizePayeeName('ｱ') }; } catch (e) { return { ok: false, e }; } })();
    assert.strictEqual(r1.ok, true, 'expected ASCII subset string to be allowed');
    assert.strictEqual(r2.ok, true, 'expected half-width katakana ｱ to be allowed');
    console.log('PASS: case 6 (allowed half-width characters)');
  } catch (e) {
    failures++;
    console.error('FAIL: case 6', e.message || e);
  }

  // Test case 7: disallowed character (lowercase 'a' and hiragana 'あ')
  try {
    const t1 = (() => { try { BANK.normalizePayeeName('a'); return false; } catch (e) { return true; } })();
    // normalizePayeeName はひらがなを半角カナ等へ正規化するため、'あ' は許容されて変換されることを期待する
    const r2 = (() => { try { return { ok: true, v: BANK.normalizePayeeName('あ') }; } catch (e) { return { ok: false, e }; } })();
    assert.strictEqual(t1, true, 'lowercase a should not be allowed');
    assert.strictEqual(r2.ok, true, 'hiragana あ should be normalized and allowed');
    console.log('PASS: case 7 (disallowed characters)');
  } catch (e) {
    failures++;
    console.error('FAIL: case 7', e.message || e);
  }

  if (failures === 0) {
    console.log('\nALL TESTS PASSED');
    process.exitCode = 0;
  } else {
    console.error(`\n${failures} TEST(S) FAILED`);
    process.exitCode = 2;
  }
  // run normalize-payee tests and add failures
  try {
    const add = await runNormalizePayeeTests(BANK);
    if (add && add > 0) {
      console.error(`\n${add} normalize-payee TEST(S) FAILED`);
      process.exitCode = 2;
    }
    // run header tests
    const addHeader = await runHeaderTests(BANK);
    if (addHeader && addHeader > 0) {
      console.error(`\n${addHeader} header TEST(S) FAILED`);
      process.exitCode = 2;
    }
    // run data-records tests
    const addDataRecords = await runDataRecordsTests(BANK);
    if (addDataRecords && addDataRecords > 0) {
      console.error(`\n${addDataRecords} generate-data-records TEST(S) FAILED`);
      process.exitCode = 2;
    }
    // run data-records load tests
    const addDataRecordsLoad = await runDataRecordsLoadTests(BANK);
    if (addDataRecordsLoad && addDataRecordsLoad > 0) {
      console.error(`\n${addDataRecordsLoad} generate-data-records-load TEST(S) FAILED`);
      process.exitCode = 2;
    }
    // run data-records field tests
    const addDataRecordsFields = await runDataRecordsFieldsTests(BANK);
    if (addDataRecordsFields && addDataRecordsFields > 0) {
      console.error(`\n${addDataRecordsFields} generate-data-records-fields TEST(S) FAILED`);
      process.exitCode = 2;
    }
    // run additional tests if present
    if (typeof runNormalizePayeeTests.additional === 'function') {
      const add2 = await runNormalizePayeeTests.additional(BANK);
      if (add2 && add2 > 0) {
        console.error(`\n${add2} normalize-payee additional TEST(S) FAILED`);
        process.exitCode = 2;
      }
    }
  } catch (e) {
    console.error('normalize-payee tests crashed', e && e.message ? e.message : e);
    process.exitCode = 2;
  }
})();
