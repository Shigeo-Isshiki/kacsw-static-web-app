const assert = require('assert');
const path = require('path');

// ブラウザ公開スタイル準拠
global.window = global;
require(path.join(__dirname, '..', 'src', 'bank-transfer.js'));
const BANK = global.BANK;

if (!BANK) throw new Error('BANK がグローバルに公開されていません');

// normalizeAccountNumber: 正常系 / 全角数字 / エラー系（非数字、長すぎ）
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

// normalizeEdiInfo: 正常系 / カンマ禁止 / 許容外文字
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

console.log('TEST PASS');
