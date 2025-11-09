const assert = require('assert');
const path = require('path');
// kintone/ブラウザ公開スタイルに合わせて、テスト環境では global.window をグローバルに設定してから読み込みます
global.window = global;
require(path.join(__dirname, '..', 'src', 'csv-builder'));
const buildCSV = global.CSV && global.CSV.buildCSV ? global.CSV.buildCSV : null;

// カンマ、引用符、改行を含むケースを検証するためのスキーマとデータ
const schema = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '名前' },
  { key: 'bio', label: '備考' },
];

const data = [
  { id: 1, name: '太郎', bio: 'Hello, "friend"\nNewline' },
  { id: 2, name: '花子', bio: 'No comma' },
];

if (!buildCSV) throw new Error('buildCSV がグローバルに公開されていません');
const csv = buildCSV(schema, data, { header: true });

const expected = 'ID,名前,備考\n1,太郎,"Hello, ""friend""\nNewline"\n2,花子,No comma';

assert.strictEqual(csv, expected, `CSV did not match.\nExpected:\n${expected}\n\nGot:\n${csv}`);

console.log('TEST PASS');
