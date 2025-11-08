// test removed

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
    // run trailer tests
    const addGenerateTrailer = await runGenerateTrailerTests(BANK);
    if (addGenerateTrailer && addGenerateTrailer > 0) {
      console.error(`\n${addGenerateTrailer} generate-trailer TEST(S) FAILED`);
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
