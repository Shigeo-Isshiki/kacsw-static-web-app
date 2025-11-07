const assert = require('assert');

// Exports an async runner that returns number of failures
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

  // Test 1: corp abbreviation at start -> append ')'
  run('normalizePayeeName: corp at start appends )', () => {
    const inStr = 'ｶﾌﾞｼｷｶﾞｲｼﾔABC';
    const out = BANK.normalizePayeeName(inStr);
    assert.strictEqual(out, 'ｶ)ABC');
  });

  // Test 2: corp abbreviation at end -> prepend '('
  run('normalizePayeeName: corp at end prepends (', () => {
    const inStr = 'ABCｶﾌﾞｼｷｶﾞｲｼﾔ';
    const out = BANK.normalizePayeeName(inStr);
    assert.strictEqual(out, 'ABC(ｶ');
  });

  // Test 3: corp abbreviation in middle -> surround with ()
  run('normalizePayeeName: corp in middle surrounds ()', () => {
    const inStr = 'ABCｶﾌﾞｼｷｶﾞｲｼﾔ ﾄｳｷﾖｳｼｼﾔ';
    const out = BANK.normalizePayeeName(inStr);
    // expect whitespace preserved, abbreviation surrounded (space between token preserved)
    assert.strictEqual(out, 'ABC(ｶ) ﾄｳｷﾖｳｼｼﾔ');
  });

  // Test 4: sales office abbreviation behaviors (end)
  run('normalizePayeeName: sales at end prepends (', () => {
    const inStr = 'TOKYO営業所';
    const out = BANK.normalizePayeeName(inStr);
    // 営業所 -> ｴｲ, at end -> prepend (
    assert.strictEqual(out, 'TOKYO(ｴｲ');
  });

  // Test 5: ensure only one abbreviation per list is applied
  run('normalizePayeeName: only first abbreviation per list applied', () => {
    // Use input containing two different corporate-abbrev keys; only the first match should be replaced
    const inStr = '有限会社株式会社XYZ';
    // In this scenario, only one abbreviation per list is applied; since the second token remains in kanji, normalization is expected to fail (invalid chars remain)
    let threw = false;
    try {
      BANK.normalizePayeeName(inStr);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, true, 'expected normalizePayeeName to throw due to remaining non-halfwidth chars');
  });

  return failures;
};

// Additional tests added below
module.exports.additional = async (BANK) => {
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

  // Test A: business longest-first match
  run('normalizePayeeName: business longest-first', () => {
    const inStr = '国民健康保険団体連合会ABC';
    const out = BANK.normalizePayeeName(inStr);
    assert.strictEqual(out, 'ｺｸﾎﾚﾝABC');
  });

  // Test B: fullwidth alnum + business at end -> halfwidth + biz abbrev, allowed
  run('normalizePayeeName: fullwidth alnum + biz abbrev', () => {
    const inStr = 'ＡＢＣ国民健康保険団体連合会';
    const out = BANK.normalizePayeeName(inStr);
    assert.strictEqual(out, 'ABCｺｸﾎﾚﾝ');
  });

  // Test C: post-phase should apply when pre-phase didn't consume the list
  run('normalizePayeeName: post-phase applies if pre did not', () => {
    // Use an input where the kanji form is absent but the halfwidth form exists only after halfwidth conversion.
    // Example: use halfwidth katakana form directly so pre-phase (which runs before kana halfwidthing) won't match a kanji-only key,
    // and post-phase should match the halfwidth-kana key and apply it once.
    const inStr = 'ABCｶﾌﾞｼｷｶﾞｲｼﾔ';
    // Since only one corp abbrev per list is allowed and pre-phase won't match (no kanji), post should replace the halfwidth token.
    const out = BANK.normalizePayeeName(inStr);
    // Expect 'ABC(ｶ' because corp at end => prepend '('
    assert.strictEqual(out, 'ABC(ｶ');
  });

  return failures;
};
