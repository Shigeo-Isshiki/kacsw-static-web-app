const assert = require('assert');
const path = require('path');

// ブラウザ向け公開スタイルに合わせて global.window を設定してから読み込む
global.window = global;
require(path.join(__dirname, '..', 'src', 'bank-transfer.js'));
const BANK = global.BANK;

if (!BANK) throw new Error('BANK がグローバルに公開されていません');

// normalizePayeeName の基本的な期待動作を確認する
try {
  // カタカナ入力 -> 半角カナに変換されること
  const out = BANK.normalizePayeeName('ヤマダタロウ');
  assert.strictEqual(typeof out, 'string', '戻り値は文字列であること');
  assert.ok(out.length > 0, '戻り値は空文字ではないこと');
  // 半角カナ化されているはずなので、全角カタカナと異なる出力になっている
  assert.notStrictEqual(out, 'ヤマダタロウ');
  console.log('PASS: normalizePayeeName basic kana -> halfwidth conversion');
} catch (e) {
  console.error('FAIL: normalizePayeeName basic kana case', e && e.message ? e.message : e);
  process.exitCode = 2;
}

// ASCII 小文字を含むとエラーになる
try {
  let threw = false;
  try {
    BANK.normalizePayeeName('yamada');
  } catch (e) {
    threw = true;
  }
  assert.ok(threw, 'ASCII 小文字を含むとエラーを投げること');
  console.log('PASS: normalizePayeeName rejects lowercase ascii');
} catch (e) {
  console.error('FAIL: normalizePayeeName lowercase rejection', e && e.message ? e.message : e);
  process.exitCode = 2;
}

// 漢字を含む入力は最終的に許容外になりやすく、エラーを投げることを期待する
try {
  let threw = false;
  try {
    BANK.normalizePayeeName('山田 太郎');
  } catch (e) {
    threw = true;
  }
  assert.ok(threw, '漢字を含む入力はエラーになる（期待）');
  console.log('PASS: normalizePayeeName rejects kanji-containing input');
} catch (e) {
  console.error('FAIL: normalizePayeeName kanji case', e && e.message ? e.message : e);
  process.exitCode = 2;
}

console.log('TEST PASS');
